'use strict';

// =============================================================================
// TESTES DE INTEGRAÇÃO - API DE AUTENTICAÇÃO
// Testa os endpoints HTTP reais com banco de dados em memória/mock
// =============================================================================

// ---- Mocks devem ser declarados ANTES de qualquer require ----

// Mock do banco de dados — evita conexão real ao PostgreSQL
jest.mock('../../src/config/database', () => ({
  sequelize: {
    authenticate: jest.fn().mockResolvedValue(true),
    close: jest.fn().mockResolvedValue(undefined),
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
    define: jest.fn().mockReturnValue({}),
    query: jest.fn().mockResolvedValue([[], {}]),
    QueryTypes: { SELECT: 'SELECT' },
    constructor: { DataTypes: {} },
  },
  testConnection: jest.fn().mockResolvedValue(true),
  Sequelize: require('sequelize').Sequelize,
}));

// Mock dos models para evitar que o Sequelize tente se conectar ao banco
jest.mock('../../src/models/Usuario', () => ({
  Usuario: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    associate: jest.fn(),
    init: jest.fn(),
  },
  PERFIS: {
    ADMIN: 'ADMIN', GESTOR: 'GESTOR', APROVADOR: 'APROVADOR',
    FINANCEIRO: 'FINANCEIRO', COLABORADOR: 'COLABORADOR',
  },
}));

jest.mock('../../src/models/SolicitacaoReembolso', () => ({
  SolicitacaoReembolso: {
    findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn(),
    create: jest.fn(), update: jest.fn(), associate: jest.fn(), init: jest.fn(),
  },
  STATUS_SOLICITACAO: {
    RASCUNHO: 'RASCUNHO', SUBMETIDA: 'SUBMETIDA', EM_ANALISE: 'EM_ANALISE',
    APROVADA: 'APROVADA', REJEITADA: 'REJEITADA', CANCELADA: 'CANCELADA',
    EM_PAGAMENTO: 'EM_PAGAMENTO', PAGA: 'PAGA', DEVOLVIDA: 'DEVOLVIDA',
  },
  PRIORIDADES: { BAIXA: 'BAIXA', NORMAL: 'NORMAL', ALTA: 'ALTA', URGENTE: 'URGENTE' },
}));

jest.mock('../../src/models/index', () => ({
  CategoriaDespesa: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  CentroCusto: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  ItemDespesa: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Comprovante: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Aprovacao: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Pagamento: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Notificacao: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  ConfiguracaoSistema: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  TokenRefresh: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  PoliticaAprovacao: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Relatorio: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  Auditoria: { findByPk: jest.fn(), associate: jest.fn(), init: jest.fn() },
  STATUS_APROVACAO: {
    PENDENTE: 'PENDENTE', APROVADO: 'APROVADO', REJEITADO: 'REJEITADO',
    DEVOLVIDO: 'DEVOLVIDO', EXPIRADO: 'EXPIRADO',
  },
  STATUS_PAGAMENTO: { AGENDADO: 'AGENDADO', PROCESSANDO: 'PROCESSANDO', CONCLUIDO: 'CONCLUIDO' },
  FORMAS_PAGAMENTO: { PIX: 'PIX', TRANSFERENCIA_BANCARIA: 'TRANSFERENCIA_BANCARIA' },
  TIPOS_NOTIFICACAO: { SISTEMA: 'SISTEMA' },
}));

// Mock dos repositories
jest.mock('../../src/repositories/UsuarioRepository');
jest.mock('../../src/repositories/index');

jest.mock('../../src/config/logger', () => ({
  logger: {
    info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
    stream: { write: jest.fn() },
  },
  logAudit: jest.fn(),
  accessLogger: { info: jest.fn() },
  auditLogger: { info: jest.fn() },
}));

const request = require('supertest');
const usuarioRepository = require('../../src/repositories/UsuarioRepository');
const { tokenRefreshRepository, auditoriaRepository } = require('../../src/repositories/index');

// Carrega a app após os mocks
const { createApp } = require('../../src/app');

let app;

beforeAll(() => {
  app = createApp();
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('POST /api/auth/login', () => {
  const mockUsuario = {
    id: 'uuid-usuario-test',
    email: 'admin@empresa.com.br',
    nome: 'Admin Teste',
    perfil: 'ADMIN',
    ativo: true,
    primeiroAcesso: false,
    departamento: 'TI',
    tentativasLogin: 0,
    bloqueadoAte: null,
    estaBloqueado: jest.fn().mockReturnValue(false),
    verificarSenha: jest.fn().mockResolvedValue(true),
    resetarTentativasLogin: jest.fn().mockResolvedValue(undefined),
    registrarTentativaFalha: jest.fn().mockResolvedValue(undefined),
    toJSON: jest.fn().mockReturnValue({
      id: 'uuid-usuario-test',
      email: 'admin@empresa.com.br',
      nome: 'Admin Teste',
      perfil: 'ADMIN',
      ativo: true,
    }),
  };

  it('deve retornar 200 e tokens para credenciais válidas', async () => {
    usuarioRepository.findByEmail.mockResolvedValue(mockUsuario);
    tokenRefreshRepository.create.mockResolvedValue({ token: 'refresh-token-teste' });
    auditoriaRepository.registrar.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@empresa.com.br', senha: 'Senha@123' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.sucesso).toBe(true);
    expect(response.body.dados).toHaveProperty('accessToken');
    expect(response.body.dados).toHaveProperty('usuario');
    expect(response.body.dados.usuario).not.toHaveProperty('senhaHash');
  });

  it('deve retornar 401 para credenciais inválidas', async () => {
    usuarioRepository.findByEmail.mockResolvedValue(null);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'invalido@empresa.com.br', senha: 'senha-errada' })
      .expect(401);

    expect(response.body.sucesso).toBe(false);
  });

  it('deve retornar 422 para payload inválido (sem e-mail)', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ senha: 'senha123' })
      .expect(422);

    expect(response.body.sucesso).toBe(false);
    expect(response.body).toHaveProperty('erros');
  });

  it('deve retornar 422 para e-mail com formato inválido', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'email-invalido', senha: 'senha123' })
      .expect(422);

    expect(response.body.sucesso).toBe(false);
  });
});

describe('GET /api/auth/me', () => {
  it('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .expect(401);

    expect(response.body.sucesso).toBe(false);
  });

  it('deve retornar 401 com token inválido', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-invalido-aqui')
      .expect(401);

    expect(response.body.sucesso).toBe(false);
  });
});

describe('GET /health', () => {
  it('deve retornar status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('uptime');
  });
});

describe('404 - Rota não encontrada', () => {
  it('deve retornar 404 para rota inexistente', async () => {
    const response = await request(app)
      .get('/api/rota-que-nao-existe')
      .expect(404);

    expect(response.body.sucesso).toBe(false);
    expect(response.body.code).toBe('ROUTE_NOT_FOUND');
  });
});
