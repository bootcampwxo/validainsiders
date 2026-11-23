'use strict';

// =============================================================================
// CONFIGURAÇÃO DO WINSTON LOGGER
// Sistema de logging estruturado com rotação de arquivos
// =============================================================================

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
const config = require('./index');

// Garantir que o diretório de logs existe
const logDir = path.resolve(config.logging.dir);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

/**
 * Formato personalizado para logs estruturados em JSON
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Formato legível para desenvolvimento
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0
      ? `\n${JSON.stringify(meta, null, 2)}`
      : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

/**
 * Transporte para arquivo de erros (apenas erros críticos)
 */
const errorTransport = new DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  level: 'error',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: logFormat,
  zippedArchive: true,
});

/**
 * Transporte para arquivo de logs combinados (todos os níveis)
 */
const combinedTransport = new DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: logFormat,
  zippedArchive: true,
});

/**
 * Transporte para arquivo de acesso HTTP
 */
const accessTransport = new DailyRotateFile({
  filename: path.join(logDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: config.logging.maxFiles,
  format: logFormat,
  zippedArchive: true,
});

/**
 * Transporte para auditoria de ações sensíveis
 */
const auditTransport = new DailyRotateFile({
  filename: path.join(logDir, 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: config.logging.maxSize,
  maxFiles: '30d', // Manter auditoria por mais tempo
  format: logFormat,
  zippedArchive: true,
});

// Configuração dos transportes por ambiente
const transports = [errorTransport, combinedTransport];

if (!config.isTest) {
  transports.push(
    new winston.transports.Console({
      format: config.isDevelopment ? devFormat : logFormat,
      silent: config.isTest,
    })
  );
}

/**
 * Logger principal da aplicação
 */
const logger = winston.createLogger({
  level: config.logging.level,
  transports,
  exitOnError: false,
});

/**
 * Logger especializado para requisições HTTP
 */
const accessLogger = winston.createLogger({
  level: 'info',
  transports: [accessTransport],
  exitOnError: false,
});

/**
 * Logger especializado para auditoria
 */
const auditLogger = winston.createLogger({
  level: 'info',
  transports: [
    auditTransport,
    ...(config.isDevelopment ? [new winston.transports.Console({
      format: devFormat,
    })] : []),
  ],
  exitOnError: false,
});

/**
 * Registra evento de auditoria com contexto completo
 * @param {string} action - Ação realizada
 * @param {Object} context - Contexto da ação
 * @param {string} context.userId - ID do usuário
 * @param {string} context.resourceType - Tipo do recurso afetado
 * @param {string} context.resourceId - ID do recurso afetado
 * @param {Object} context.changes - Mudanças realizadas
 * @param {string} context.ip - IP do requisitante
 * @param {string} context.userAgent - User-agent do cliente
 */
const logAudit = (action, context = {}) => {
  auditLogger.info(action, {
    audit: true,
    action,
    timestamp: new Date().toISOString(),
    ...context,
  });
};

/**
 * Stream para integração com morgan (logging HTTP)
 */
logger.stream = {
  write: (message) => {
    accessLogger.info(message.trim());
  },
};

module.exports = {
  logger,
  accessLogger,
  auditLogger,
  logAudit,
};
