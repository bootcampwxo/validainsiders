'use strict';

// =============================================================================
// CONFIGURAÇÃO GLOBAL DOS TESTES
// Executado pelo Jest antes de cada suite de testes
// =============================================================================

// Silencia logs durante os testes para output mais limpo
jest.mock('../src/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    stream: { write: jest.fn() },
  },
  logAudit: jest.fn(),
  accessLogger: { info: jest.fn() },
  auditLogger: { info: jest.fn() },
}), { virtual: true });

// Variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-minimo-32-chars-aqui-para-testes';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-32-chars-aqui-para-testes';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '1'; // Rounds mínimos para testes serem rápidos

// Timeout global aumentado para testes de integração
jest.setTimeout(30000);
