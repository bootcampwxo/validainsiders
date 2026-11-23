'use strict';

// =============================================================================
// APP EXPRESS - CONFIGURAÇÃO PRINCIPAL
// Registra todos os middlewares, rotas e documentação
// =============================================================================

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const config = require('./config/index');
const { logger } = require('./config/logger');
const { setupSwagger } = require('./config/swagger');
const routes = require('./routes/index');
const { errorHandler, requestLogger, securityHeaders, healthCheck } = require('./middlewares/index');

/**
 * Cria e configura a aplicação Express
 * @returns {express.Application}
 */
const createApp = () => {
  const app = express();

  // ---- Trust proxy (necessário em produção atrás de nginx/load balancer) ----
  if (config.isProduction) {
    app.set('trust proxy', 1);
  }

  // =========================================================================
  // SEGURANÇA
  // =========================================================================

  // Helmet: headers de segurança HTTP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],  // Permite inline styles do Swagger UI
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Permite scripts inline do Swagger
        imgSrc: ["'self'", 'data:'],
      },
    },
    crossOriginEmbedderPolicy: false, // Necessário para Swagger UI
  }));

  // Headers customizados
  app.use(securityHeaders);

  // CORS - permite apenas o frontend configurado
  app.use(cors({
    origin: (origin, callback) => {
      // Permite requisições sem origin (Postman, curl) em desenvolvimento
      if (!origin && config.isDevelopment) return callback(null, true);

      const origensPermitidas = Array.isArray(config.cors.origin)
        ? config.cors.origin
        : [config.cors.origin];

      if (!origin || origensPermitidas.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin não permitida: ${origin}`));
      }
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Rate Limiting: limita requests por IP
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      sucesso: false,
      mensagem: 'Muitas requisições. Por favor, aguarde antes de tentar novamente.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Rate limit mais restrito para autenticação
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    message: {
      sucesso: false,
      mensagem: 'Muitas tentativas de login. Aguarde 15 minutos.',
      code: 'AUTH_RATE_LIMIT',
    },
  });

  app.use('/api', limiter);
  app.use('/api/auth/login', authLimiter);

  // =========================================================================
  // PARSING
  // =========================================================================

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // =========================================================================
  // LOGGING
  // =========================================================================

  if (!config.isTest) {
    // Morgan para logs de acesso HTTP
    app.use(morgan('combined', { stream: logger.stream }));
    // Logger customizado com contexto do usuário
    app.use(requestLogger);
  }

  // =========================================================================
  // COMPRESSÃO
  // =========================================================================
  app.use(compression());

  // =========================================================================
  // ARQUIVOS ESTÁTICOS
  // =========================================================================
  app.use('/uploads', express.static(path.resolve(config.upload.dir)));

  // =========================================================================
  // HEALTH CHECK
  // =========================================================================
  app.get('/health', healthCheck);
  app.get('/api/health', healthCheck);

  // =========================================================================
  // DOCUMENTAÇÃO SWAGGER
  // =========================================================================
  if (!config.isTest) {
    setupSwagger(app);
  }

  // =========================================================================
  // ROTAS DA API
  // =========================================================================
  app.use('/api', routes);

  // =========================================================================
  // 404 - Rota não encontrada
  // =========================================================================
  app.use((req, res) => {
    res.status(404).json({
      sucesso: false,
      mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}`,
      code: 'ROUTE_NOT_FOUND',
    });
  });

  // =========================================================================
  // HANDLER GLOBAL DE ERROS (deve ser o último middleware)
  // =========================================================================
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
