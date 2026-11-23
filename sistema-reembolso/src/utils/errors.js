'use strict';

// =============================================================================
// UTILITÁRIOS DE ERRO
// Classes de erros customizados para tratamento estruturado
// =============================================================================

/**
 * @class AppError
 * @description Erro de aplicação com código HTTP e detalhes estruturados
 */
class AppError extends Error {
  /**
   * @param {string} message - Mensagem de erro legível
   * @param {number} statusCode - Código HTTP (400, 401, 403, 404, 409, 422, 500)
   * @param {Object} details - Detalhes adicionais opcionais
   * @param {string} code - Código de erro interno (ex: USUARIO_NAO_ENCONTRADO)
   */
  constructor(message, statusCode = 500, details = null, code = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
    this.isOperational = true; // Distingue de erros de programação
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * @class ValidationError
 * @description Erro de validação com lista de campos inválidos
 */
class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 422, errors, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * @class NotFoundError
 * @description Erro de recurso não encontrado
 */
class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado.`, 404, null, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * @class UnauthorizedError
 * @description Erro de autenticação
 */
class UnauthorizedError extends AppError {
  constructor(message = 'Autenticação necessária.') {
    super(message, 401, null, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

/**
 * @class ForbiddenError
 * @description Erro de autorização
 */
class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado.') {
    super(message, 403, null, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * @class ConflictError
 * @description Erro de conflito de dados (duplicidade)
 */
class ConflictError extends AppError {
  constructor(message = 'Conflito de dados.') {
    super(message, 409, null, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
};
