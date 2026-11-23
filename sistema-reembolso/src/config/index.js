'use strict';

// =============================================================================
// CONFIGURAÇÕES CENTRALIZADAS DA APLICAÇÃO
// Carrega variáveis de ambiente e define defaults seguros
// =============================================================================

require('dotenv').config();

/**
 * Configuração do ambiente de execução
 */
const config = {
  // Ambiente
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',

  // Banco de dados
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.NODE_ENV === 'test'
      ? (process.env.DB_TEST_NAME || 'sistema_reembolso_test')
      : (process.env.DB_NAME || 'sistema_reembolso'),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    dialect: 'postgres',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
      min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE, 10) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE, 10) || 10000,
    },
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  },

  // JWT / Autenticação
  jwt: {
    secret: process.env.JWT_SECRET || 'desenvolvimento-secret-nao-usar-em-producao',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-nao-usar-em-producao',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Email / SMTP
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    password: process.env.SMTP_PASSWORD || '',
    fromName: process.env.SMTP_FROM_NAME || 'Sistema de Reembolso',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@sistema-reembolso.com.br',
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    ttl: parseInt(process.env.REDIS_TTL, 10) || 3600,
    enabled: process.env.REDIS_ENABLED !== 'false',
  },

  // Upload de arquivos
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || 'image/jpeg,image/png,image/gif,application/pdf').split(','),
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || 'logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
  },

  // CORS
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },

  // Segurança
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  },

  // Paginação
  pagination: {
    defaultPageSize: parseInt(process.env.DEFAULT_PAGE_SIZE, 10) || 20,
    maxPageSize: parseInt(process.env.MAX_PAGE_SIZE, 10) || 100,
  },

  // Regras de negócio de aprovação
  approval: {
    autoApprovalLimit: parseFloat(process.env.AUTO_APPROVAL_LIMIT) || 100.00,
    timeoutDays: parseInt(process.env.APPROVAL_TIMEOUT_DAYS, 10) || 7,
  },

  // Relatórios
  reports: {
    dir: process.env.REPORTS_DIR || 'reports',
  },
};

/**
 * Validação de configurações críticas em produção
 */
if (config.isProduction) {
  const requiredVars = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'DB_PASSWORD',
    'SMTP_USER',
    'SMTP_PASSWORD',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias não definidas em produção: ${missing.join(', ')}`
    );
  }
}

module.exports = config;
