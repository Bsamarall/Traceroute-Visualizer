/**
 * ============================================================
 * logger.js - Sistema de logging com Winston
 * ============================================================
 * Configura logs estruturados para desenvolvimento e produção.
 * Importante: nunca loga dados sensíveis como IPs de usuários
 * ou informações pessoalmente identificáveis de forma desnecessária.
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Garante que o diretório de logs existe
const LOG_DIR = path.resolve('./logs');
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Formato customizado para o console (legível para humanos)
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Formato para arquivos (JSON estruturado para análise)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  
  transports: [
    // Console - apenas em desenvolvimento
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test',
    }),
    
    // Arquivo de erros
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3,
    }),
    
    // Arquivo de logs gerais
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

module.exports = logger;
