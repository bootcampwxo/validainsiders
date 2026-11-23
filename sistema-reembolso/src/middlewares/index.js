'use strict';

// =============================================================================
// MIDDLEWARES CENTRALIZADOS
// Autenticação JWT, autorização por perfil, tratamento de erros e validação
// =============================================================================

const { logger } = require('../config/logger');
const { authService } = require('../services/AuthService');
const usuarioRepository = require('../repositories/UsuarioRepository');
const { AppError, ValidationError } = require('../utils/errors');
const { validationResult } = require('express-validator');
const { PERFIS } = require('../models/Usuario');

// =============================================================================
// MIDDLEWARE DE AUTENTICAÇÃO JWT
// =============================================================================

/**
 * Verifica o token JWT no header Authorization
 * Injeta req.usuarioLogado com os dados do usuário autenticado
 */
const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token de autenticação não fornecido.', 401);
    }

    const token = authHeader.split(' ')[1];
    const payload = authService.verificarAccessToken(token);

    // Carrega os dados atualizados do usuário do banco (evita usar dados stale do token)
    const usuario = await usuarioRepository.findById(payload.sub, {
      attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
    });

    if (!usuario) {
      throw new AppError('Usuário não encontrado.', 401);
    }

    if (!usuario.ativo) {
      throw new AppError('Conta desativada.', 403);
    }

    req.usuarioLogado = usuario;
    req.tokenPayload = payload;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware de autenticação opcional (não falha se não houver token)
 * Usado em rotas públicas que podem ter comportamento diferente para autenticados
 */
const autenticarOpcional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = authService.verificarAccessToken(token);
      const usuario = await usuarioRepository.findById(payload.sub, {
        attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
      });
      if (usuario && usuario.ativo) {
        req.usuarioLogado = usuario;
      }
    }
    next();
  } catch {
    next(); // Silencia erros na autenticação opcional
  }
};

// =============================================================================
// MIDDLEWARE DE AUTORIZAÇÃO POR PERFIL
// =============================================================================

/**
 * Factory: cria middleware que permite apenas os perfis especificados
 * @param {...string} perfisPermitidos - Perfis que têm acesso à rota
 * @returns {Function} Middleware Express
 *
 * @example
 * router.delete('/usuarios/:id', autenticar, autorizar('ADMIN'), controller.deletar);
 */
const autorizar = (...perfisPermitidos) => {
  return (req, res, next) => {
    if (!req.usuarioLogado) {
      return next(new AppError('Autenticação necessária.', 401));
    }

    if (!req.usuarioLogado.temPerfil(...perfisPermitidos)) {
      logger.warn('Acesso negado por perfil insuficiente', {
        usuarioId: req.usuarioLogado.id,
        perfil: req.usuarioLogado.perfil,
        perfisRequeridos: perfisPermitidos,
        rota: req.path,
      });
      return next(new AppError(
        `Acesso negado. Perfis permitidos: ${perfisPermitidos.join(', ')}.`,
        403
      ));
    }

    next();
  };
};

/**
 * Permite acesso apenas ao próprio usuário ou a admins
 * Espera :id na rota como UUID do usuário alvo
 */
const autorizarProprioOuAdmin = (req, res, next) => {
  if (!req.usuarioLogado) {
    return next(new AppError('Autenticação necessária.', 401));
  }

  const isProprioUsuario = req.params.id === req.usuarioLogado.id;
  const isAdmin = req.usuarioLogado.temPerfil(PERFIS.ADMIN);

  if (!isProprioUsuario && !isAdmin) {
    return next(new AppError('Acesso negado. Você só pode acessar seus próprios dados.', 403));
  }

  next();
};

// =============================================================================
// MIDDLEWARE DE TRATAMENTO DE ERROS GLOBAL
// =============================================================================

/**
 * Handler central de erros da API
 * Deve ser o último middleware registrado no Express
 */
const errorHandler = (err, req, res, next) => {
  // Log do erro com contexto da requisição
  logger.error('Erro na requisição:', {
    error: err.message,
    statusCode: err.statusCode,
    stack: err.isOperational ? undefined : err.stack,
    method: req.method,
    path: req.path,
    usuarioId: req.usuarioLogado?.id,
    ip: req.ip,
    body: req.method !== 'GET' ? req.body : undefined,
  });

  // ---- Erros de validação do express-validator ----
  if (err instanceof ValidationError) {
    return res.status(422).json({
      sucesso: false,
      mensagem: err.message,
      erros: err.errors,
      code: 'VALIDATION_ERROR',
    });
  }

  // ---- Erros operacionais da aplicação (AppError) ----
  if (err.isOperational) {
    return res.status(err.statusCode || 500).json({
      sucesso: false,
      mensagem: err.message,
      details: err.details,
      code: err.code,
    });
  }

  // ---- Erros do Sequelize ----
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const erros = err.errors?.map(e => ({ campo: e.path, mensagem: e.message })) || [];
    return res.status(422).json({
      sucesso: false,
      mensagem: 'Erro de validação de dados.',
      erros,
      code: 'DB_VALIDATION_ERROR',
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      sucesso: false,
      mensagem: 'Operação inválida: registro relacionado não encontrado ou restrição violada.',
      code: 'FK_CONSTRAINT',
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro no banco de dados.',
      code: 'DB_ERROR',
    });
  }

  // ---- Erros JWT ----
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token inválido.',
      code: 'INVALID_TOKEN',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      sucesso: false,
      mensagem: 'Token expirado.',
      code: 'TOKEN_EXPIRED',
    });
  }

  // ---- Erros de Multer (upload) ----
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      sucesso: false,
      mensagem: `Arquivo muito grande. Tamanho máximo permitido: ${Math.round(require('../config').upload.maxSize / 1024 / 1024)}MB.`,
      code: 'FILE_TOO_LARGE',
    });
  }

  // ---- Erros inesperados (não-operacionais) ----
  // Log mais detalhado para erros de programação
  logger.error('ERRO CRÍTICO (não-operacional):', {
    error: err.message,
    stack: err.stack,
    name: err.name,
  });

  const env = require('../config').env;
  return res.status(500).json({
    sucesso: false,
    mensagem: 'Erro interno do servidor.',
    code: 'INTERNAL_ERROR',
    // Expõe detalhes apenas em desenvolvimento
    ...(env === 'development' ? { debug: err.message, stack: err.stack } : {}),
  });
};

// =============================================================================
// MIDDLEWARE DE VALIDAÇÃO com express-validator
// =============================================================================

/**
 * Verifica resultado de validações do express-validator
 * Lança ValidationError se houver campos inválidos
 */
const validar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const erros = errors.array().map(e => ({
      campo: e.path,
      mensagem: e.msg,
      valor: e.value,
    }));
    throw new ValidationError('Dados de entrada inválidos.', erros);
  }
  next();
};

// =============================================================================
// MIDDLEWARE DE LOG DE REQUISIÇÕES
// =============================================================================

/**
 * Loga informações sobre cada requisição HTTP
 */
const requestLogger = (req, res, next) => {
  const inicio = Date.now();

  res.on('finish', () => {
    const duracao = Date.now() - inicio;
    logger.info('Requisição HTTP', {
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      duracao: `${duracao}ms`,
      ip: req.ip,
      usuarioId: req.usuarioLogado?.id,
      userAgent: req.get('User-Agent'),
    });
  });

  next();
};

// =============================================================================
// MIDDLEWARE DE PAGINAÇÃO
// =============================================================================

/**
 * Extrai e normaliza parâmetros de paginação da query string
 * Injeta req.paginacao com page, pageSize e offset
 */
const paginacao = (req, res, next) => {
  const { pagina = '1', tamanho = '20' } = req.query;
  const page = Math.max(1, parseInt(pagina, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(tamanho, 10) || 20));

  req.paginacao = { page, pageSize, offset: (page - 1) * pageSize };
  next();
};

// =============================================================================
// MIDDLEWARE DE HEADERS DE SEGURANÇA ADICIONAIS
// =============================================================================

/**
 * Adiciona headers de segurança customizados além do Helmet
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Sistema', 'Reembolso');
  next();
};

/**
 * Responde a requisições de health check
 */
const healthCheck = (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    versao: require('../../package.json').version,
  });
};

module.exports = {
  autenticar,
  autenticarOpcional,
  autorizar,
  autorizarProprioOuAdmin,
  errorHandler,
  validar,
  requestLogger,
  paginacao,
  securityHeaders,
  healthCheck,
  PERFIS,
};
