/**
 * ============================================================
 * security.middleware.js - Middlewares de segurança
 * ============================================================
 * Implementa:
 * 1. Rate limiting por IP
 * 2. Sanitização de headers de resposta
 * 3. Logging de requisições suspeitas
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ─── Rate Limiter Principal ───────────────────────────────────────────────────

/**
 * Rate limiter para o endpoint /trace.
 * Limite padrão: 5 requisições por minuto por IP.
 * Configurável via variáveis de ambiente.
 */
const traceLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 1 minuto
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
  
  // Mensagem de erro padronizada
  message: {
    error: 'Muitas requisições',
    message: 'Limite de requisições excedido. Tente novamente em 1 minuto.',
    retryAfter: '60 segundos',
  },
  
  // Headers padronizados (RFC 6585)
  standardHeaders: true,
  legacyHeaders: false,
  
  // Log quando rate limit é atingido
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit atingido`, {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('User-Agent')?.substring(0, 100),
    });
    res.status(options.statusCode).json(options.message);
  },
  
  // Identificação por IP (usa X-Forwarded-For se atrás de proxy)
  keyGenerator: (req) => {
    return req.ip || req.connection.remoteAddress || 'unknown';
  },
});

// ─── Rate Limiter Geral ───────────────────────────────────────────────────────

/**
 * Rate limiter mais permissivo para outros endpoints.
 */
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // 60 req/min para endpoints de leitura
  message: {
    error: 'Muitas requisições',
    message: 'Limite de requisições excedido.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Middleware de Logging de Requisições ─────────────────────────────────────

/**
 * Loga todas as requisições de forma segura.
 * Não loga body completo para evitar vazamento de dados.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration_ms: duration,
      // Não loga IP completo em produção (privacidade)
      ip: process.env.NODE_ENV === 'development' ? req.ip : '[hidden]',
    });
  });
  
  next();
}

/**
 * Middleware para rejeitar requests com Content-Type incorreto
 * nos endpoints que esperam JSON.
 */
function requireJson(req, res, next) {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(415).json({
      error: 'Tipo de conteúdo inválido',
      message: 'Use Content-Type: application/json',
    });
  }
  next();
}

module.exports = { traceLimiter, generalLimiter, requestLogger, requireJson };
