/**
 * ============================================================
 * index.js - Ponto de entrada do servidor Express
 * ============================================================
 * Traceroute Visualizer Backend v1.0.0
 *
 * Configura e inicia o servidor Express com todos os middlewares
 * de segurança, rotas e tratamento de erros.
 *
 * Ordem dos middlewares (importa para segurança):
 * 1. Helmet (headers HTTP seguros)
 * 2. CORS (controle de origem)
 * 3. Body parser (com limite de tamanho)
 * 4. Rate limiting
 * 5. Request logging
 * 6. Rotas
 * 7. Error handler global
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const logger = require('./utils/logger');
const traceRoutes = require('./routes/trace.routes');
const {
  traceLimiter,
  generalLimiter,
  requestLogger,
  requireJson,
} = require('./middleware/security.middleware');

// Inicializa o banco de dados ao importar
require('./db/database');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middlewares de Segurança ─────────────────────────────────────────────────

/**
 * Helmet: configura headers HTTP para mitigar ataques comuns.
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: DENY
 * - Content-Security-Policy
 * - etc.
 */
app.use(helmet());

/**
 * CORS: permite apenas a origem do frontend configurada.
 * Em desenvolvimento permite localhost:5173 (Vite).
 */
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigin === '*' || origin === allowedOrigin) {
      return callback(null, true);
    }
    logger.warn(`CORS bloqueado para origem: ${origin}`);
    callback(new Error('Origem não permitida pelo CORS'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
}));

/**
 * Body parser JSON com limite de tamanho para prevenir ataques
 * de payload gigante (DoS via body).
 */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// ─── Logging de Requisições ───────────────────────────────────────────────────

app.use(requestLogger);

// ─── Rate Limiting ────────────────────────────────────────────────────────────

// Rate limiting específico para trace (operação pesada)
app.use('/api/trace', traceLimiter);

// Rate limiting geral para outros endpoints
app.use('/api', generalLimiter);

// ─── Validação de Content-Type ────────────────────────────────────────────────

app.use('/api', requireJson);

// ─── Rotas da API ─────────────────────────────────────────────────────────────

app.use('/api', traceRoutes);

// Rota raiz para verificar se o servidor está online
app.get('/', (req, res) => {
  res.json({
    name: 'Traceroute Visualizer API',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      trace: 'POST /api/trace',
      history: 'GET /api/history',
      health: 'GET /api/health',
    },
  });
});

// ─── Rota não encontrada (404) ────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({
    error: 'Rota não encontrada',
    path: req.path,
  });
});

// ─── Handler Global de Erros ──────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // Erros de CORS já logados pelo middleware
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ error: 'Origem não permitida' });
  }

  // Log sem expor stack trace ao cliente
  logger.error('Erro não tratado', {
    message: err.message,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Tente novamente',
  });
});

// ─── Inicialização do Servidor ────────────────────────────────────────────────

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor iniciado na porta ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    origin: allowedOrigin,
  });
});

// Graceful shutdown: fecha conexões abertas ao encerrar
process.on('SIGTERM', () => {
  logger.info('SIGTERM recebido. Encerrando servidor...');
  server.close(() => {
    logger.info('Servidor encerrado.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recebido. Encerrando servidor...');
  server.close(() => {
    process.exit(0);
  });
});

module.exports = app;
