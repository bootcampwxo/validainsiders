'use strict';

// =============================================================================
// TESTES UNITÁRIOS - SOLICITACAO SERVICE
// =============================================================================

// Mocks devem vir ANTES de qualquer require que carregue os módulos reais
jest.mock('../../src/repositories/SolicitacaoRepository');
jest.mock('../../src/repositories/index');

jest.mock('../../src/models/SolicitacaoReembolso', () => ({
  SolicitacaoReembolso: {},
  STATUS_SOLICITACAO: {
    RASCUNHO: 'RASCUNHO', SUBMETIDA: 'SUBMETIDA', EM_ANALISE: 'EM_ANALISE',
    APROVADA: 'APROVADA', REJEITADA: 'REJEITADA', CANCELADA: 'CANCELADA',
    EM_PAGAMENTO: 'EM_PAGAMENTO', PAGA: 'PAGA', DEVOLVIDA: 'DEVOLVIDA',
  },
  PRIORIDADES: { BAIXA: 'BAIXA', NORMAL: 'NORMAL', ALTA: 'ALTA', URGENTE: 'URGENTE' },
}));

jest.mock('../../src/models/index', () => ({
  STATUS_APROVACAO: {
    PENDENTE: 'PENDENTE', APROVADO: 'APROVADO', REJEITADO: 'REJEITADO',
    DEVOLVIDO: 'DEVOLVIDO', EXPIRADO: 'EXPIRADO',
  },
  Aprovacao: {}, CategoriaDespesa: {}, CentroCusto: {}, ItemDespesa: {},
  Comprovante: {}, Pagamento: {}, Notificacao: {},
}));

jest.mock('../../src/models/Usuario', () => ({
  Usuario: { findByPk: jest.fn().mockResolvedValue({ gestorId: 'uuid-gestor' }) },
  PERFIS: {
    ADMIN: 'ADMIN', GESTOR: 'GESTOR', APROVADOR: 'APROVADOR',
    FINANCEIRO: 'FINANCEIRO', COLABORADOR: 'COLABORADOR',
  },
}));

jest.mock('../../src/services/NotificacaoService', () => ({
  notificacaoService: {
    notificarAprovadorPendente: jest.fn().mockResolvedValue(undefined),
    notificarAprovacaoFinal: jest.fn().mockResolvedValue(undefined),
    notificarRejeicao: jest.fn().mockResolvedValue(undefined),
    notificarDevolucao: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.mock('../../src/config/database', () => ({
  sequelize: {
    transaction: jest.fn().mockResolvedValue({
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    }),
  },
}));

const { solicitacaoService } = require('../../src/services/SolicitacaoService');
const solicitacaoRepository = require('../../src/repositories/SolicitacaoRepository');
const { aprovacaoRepository, auditoriaRepository, itemDespesaRepository, politicaAprovacaoRepository } = require('../../src/repositories/index');
const { AppError } = require('../../src/utils/errors');

describe('SolicitacaoService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ---- LISTAR ----
  describe('listar()', () => {
    it('deve limitar visibilidade de colaborador às suas próprias solicitações', async () => {
      const colaborador = { id: 'uuid-col', perfil: 'COLABORADOR' };
      solicitacaoRepository.findWithFilters.mockResolvedValue({ rows: [], count: 0, currentPage: 1, totalPages: 0, pageSize: 20 });

      await solicitacaoService.listar({}, colaborador);

      expect(solicitacaoRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ solicitanteId: 'uuid-col' })
      );
    });

    it('deve permitir admin ver todas as solicitações sem restrição', async () => {
      const admin = { id: 'uuid-admin', perfil: 'ADMIN' };
      solicitacaoRepository.findWithFilters.mockResolvedValue({ rows: [], count: 0, currentPage: 1, totalPages: 0, pageSize: 20 });

      await solicitacaoService.listar({}, admin);

      expect(solicitacaoRepository.findWithFilters).toHaveBeenCalledWith(
        expect.not.objectContaining({ solicitanteId: expect.anything() })
      );
    });
  });

  // ---- SUBMETER ----
  describe('submeter()', () => {
    const solicitante = {
      id: 'uuid-sol',
      perfil: 'COLABORADOR',
      nome: 'João',
      gestorId: 'uuid-gestor',
    };

    const mockSolicitacao = {
      id: 'uuid-solicitacao',
      numero: 'REE-2024-000001',
      titulo: 'Despesas de viagem',
      valorTotal: 500.00,
      moeda: 'BRL',
      categoriaId: 'uuid-categoria',
      solicitanteId: 'uuid-sol',
      status: 'RASCUNHO',
      dataSubmissao: null,
      nivelAprovacaoAtual: 0,
      nivelAprovacaoTotal: 1,
      podeSubmeter: jest.fn().mockReturnValue(true),
      aguardandoAprovacao: jest.fn().mockReturnValue(false),
      update: jest.fn().mockResolvedValue(undefined),
      aprovacoes: [],
      solicitante: { nome: 'João', email: 'joao@empresa.com.br' },
    };

    it('deve submeter solicitação com sucesso', async () => {
      solicitacaoRepository.findByIdCompleto.mockResolvedValue(mockSolicitacao);
      politicaAprovacaoRepository.findAplicaveis.mockResolvedValue([]);
      aprovacaoRepository.create.mockResolvedValue({});
      auditoriaRepository.registrar.mockResolvedValue(undefined);
      solicitacaoRepository.findById.mockResolvedValue({
        ...mockSolicitacao,
        gestorId: 'uuid-gestor',
      });

      // Mock para buscar o solicitante e encontrar seu gestor
      jest.mock('../../src/models/Usuario', () => ({
        Usuario: { findByPk: jest.fn().mockResolvedValue({ gestorId: 'uuid-gestor' }) },
        PERFIS: { COLABORADOR: 'COLABORADOR' },
      }));

      // A submissão exige que o valor seja > 0
      await expect(
        solicitacaoService.submeter('uuid-solicitacao', solicitante)
      ).resolves.toBeDefined();
    });

    it('deve lançar AppError quando solicitação não está em status submissível', async () => {
      const solicitacaoRejeitada = {
        ...mockSolicitacao,
        status: 'REJEITADA',
        podeSubmeter: jest.fn().mockReturnValue(false),
      };
      solicitacaoRepository.findByIdCompleto.mockResolvedValue(solicitacaoRejeitada);

      await expect(
        solicitacaoService.submeter('uuid-solicitacao', solicitante)
      ).rejects.toThrow(AppError);
    });

    it('deve lançar AppError 403 quando solicitante não é o dono', async () => {
      const outraSolicitacao = {
        ...mockSolicitacao,
        solicitanteId: 'uuid-outro',
      };
      solicitacaoRepository.findByIdCompleto.mockResolvedValue(outraSolicitacao);

      await expect(
        solicitacaoService.submeter('uuid-solicitacao', solicitante)
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  // ---- REJEITAR ----
  describe('rejeitar()', () => {
    it('deve lançar AppError quando justificativa é muito curta', async () => {
      await expect(
        solicitacaoService.rejeitar('uuid', 'Curta', {}, '127.0.0.1')
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve lançar AppError 404 quando solicitação não existe', async () => {
      solicitacaoRepository.findByIdCompleto.mockResolvedValue(null);

      await expect(
        solicitacaoService.rejeitar('uuid', 'Justificativa longa suficiente', {}, '127.0.0.1')
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ---- DASHBOARD ----
  describe('getDashboard()', () => {
    it('deve retornar dashboard com dados consolidados', async () => {
      solicitacaoRepository.getResumoSolicitante.mockResolvedValue([]);
      solicitacaoRepository.getEvolucaoMensal.mockResolvedValue([]);
      solicitacaoRepository.getRankingCategorias.mockResolvedValue([]);
      aprovacaoRepository.countPendentesByAprovador.mockResolvedValue(0);

      const usuario = { id: 'uuid-col', perfil: 'COLABORADOR' };
      const resultado = await solicitacaoService.getDashboard(usuario);

      expect(resultado).toHaveProperty('resumo');
      expect(resultado).toHaveProperty('evolucao');
      expect(resultado).toHaveProperty('ranking');
      expect(resultado).toHaveProperty('aprovacoesPendentes');
    });
  });
});
