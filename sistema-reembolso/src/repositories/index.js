'use strict';

// =============================================================================
// REPOSITORIES AUXILIARES
// AuditoriaRepository, NotificacaoRepository, AprovacaoRepository,
// CategoriaRepository, CentroCustoRepository, PagamentoRepository
// =============================================================================

const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const {
  Auditoria,
  Notificacao,
  Aprovacao,
  CategoriaDespesa,
  CentroCusto,
  Pagamento,
  ItemDespesa,
  Comprovante,
  TokenRefresh,
  PoliticaAprovacao,
  Relatorio,
  ConfiguracaoSistema,
  STATUS_APROVACAO,
  STATUS_PAGAMENTO,
} = require('../models/index');
const { Usuario } = require('../models/Usuario');
const { SolicitacaoReembolso } = require('../models/SolicitacaoReembolso');

// =============================================================================
// AUDITORIA REPOSITORY
// =============================================================================
class AuditoriaRepository extends BaseRepository {
  constructor() { super(Auditoria); }

  /**
   * Registra evento de auditoria
   */
  async registrar({ usuarioId, acao, tabela, registroId, dadosAnteriores, dadosNovos, ip, userAgent, descricao }) {
    return Auditoria.create({
      usuarioId,
      acao,
      tabela,
      registroId,
      dadosAnteriores,
      dadosNovos,
      ip,
      userAgent,
      descricao,
    });
  }

  /**
   * Busca histórico de um registro específico
   */
  async findHistoricoRegistro(tabela, registroId, { page = 1, pageSize = 20 } = {}) {
    return this.findPaginated({
      where: { tabela, registroId },
      page, pageSize,
      order: [['createdAt', 'DESC']],
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'nome', 'email'],
        required: false,
      }],
    });
  }

  /**
   * Busca auditoria com filtros
   */
  async findWithFilters({ usuarioId, acao, tabela, dataInicio, dataFim, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (usuarioId) where.usuarioId = usuarioId;
    if (acao) where.acao = { [Op.iLike]: `%${acao}%` };
    if (tabela) where.tabela = tabela;
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt[Op.gte] = dataInicio;
      if (dataFim) where.createdAt[Op.lte] = dataFim;
    }
    return this.findPaginated({
      where, page, pageSize,
      order: [['createdAt', 'DESC']],
    });
  }
}

// =============================================================================
// NOTIFICACAO REPOSITORY
// =============================================================================
class NotificacaoRepository extends BaseRepository {
  constructor() { super(Notificacao); }

  /**
   * Busca notificações não lidas de um usuário
   */
  async findNaoLidas(usuarioId) {
    return Notificacao.findAll({
      where: { usuarioId, lida: false },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Conta notificações não lidas
   */
  async countNaoLidas(usuarioId) {
    return Notificacao.count({ where: { usuarioId, lida: false } });
  }

  /**
   * Marca notificações como lidas
   */
  async marcarComoLidas(ids, usuarioId) {
    return Notificacao.update(
      { lida: true, lidaEm: new Date() },
      { where: { id: { [Op.in]: ids }, usuarioId } }
    );
  }

  /**
   * Marca todas as notificações de um usuário como lidas
   */
  async marcarTodasComoLidas(usuarioId) {
    return Notificacao.update(
      { lida: true, lidaEm: new Date() },
      { where: { usuarioId, lida: false } }
    );
  }

  /**
   * Busca notificações pendentes de envio por canal
   */
  async findPendentesEnvio(canal, limite = 50) {
    return Notificacao.findAll({
      where: { canal, enviada: false, erroEnvio: null },
      limit: limite,
      order: [['createdAt', 'ASC']],
      include: [
        { model: Usuario, as: 'usuario', attributes: ['id', 'nome', 'email'] },
      ],
    });
  }

  /**
   * Registra resultado do envio
   */
  async registrarResultadoEnvio(id, sucesso, erro = null) {
    return Notificacao.update(
      { enviada: sucesso, enviadaEm: sucesso ? new Date() : null, erroEnvio: erro },
      { where: { id } }
    );
  }
}

// =============================================================================
// APROVACAO REPOSITORY
// =============================================================================
class AprovacaoRepository extends BaseRepository {
  constructor() { super(Aprovacao); }

  /**
   * Busca aprovação pendente de uma solicitação para um aprovador
   */
  async findPendenteParaAprovador(solicitacaoId, aprovadorId) {
    return Aprovacao.findOne({
      where: { solicitacaoId, aprovadorId, status: STATUS_APROVACAO.PENDENTE },
    });
  }

  /**
   * Busca todas as aprovações de uma solicitação ordenadas por nível
   */
  async findBySolicitacao(solicitacaoId) {
    return Aprovacao.findAll({
      where: { solicitacaoId },
      include: [
        { model: Usuario, as: 'aprovador', attributes: ['id', 'nome', 'email', 'cargo', 'avatarUrl'] },
      ],
      order: [['nivel', 'ASC']],
    });
  }

  /**
   * Busca aprovações pendentes de um aprovador com paginação
   */
  async findPendentesDoAprovador(aprovadorId, { page = 1, pageSize = 20 } = {}) {
    return this.findPaginated({
      where: { aprovadorId, status: STATUS_APROVACAO.PENDENTE },
      page, pageSize,
      order: [['createdAt', 'ASC']], // Mais antigas primeiro
      include: [
        {
          model: SolicitacaoReembolso,
          as: 'solicitacao',
          include: [
            { model: Usuario, as: 'solicitante', attributes: ['id', 'nome', 'email', 'departamento'] },
            { model: CategoriaDespesa, as: 'categoria', attributes: ['id', 'nome', 'icone', 'cor'] },
          ],
        },
      ],
    });
  }

  /**
   * Conta aprovações pendentes por aprovador
   */
  async countPendentesByAprovador(aprovadorId) {
    return Aprovacao.count({ where: { aprovadorId, status: STATUS_APROVACAO.PENDENTE } });
  }

  /**
   * Busca aprovações expiradas para processar
   */
  async findExpiradas() {
    return Aprovacao.findAll({
      where: {
        status: STATUS_APROVACAO.PENDENTE,
        dataLimite: { [Op.lt]: new Date() },
      },
      include: [
        { model: SolicitacaoReembolso, as: 'solicitacao' },
        { model: Usuario, as: 'aprovador', attributes: ['id', 'nome', 'email'] },
      ],
    });
  }
}

// =============================================================================
// CATEGORIA REPOSITORY
// =============================================================================
class CategoriaRepository extends BaseRepository {
  constructor() { super(CategoriaDespesa); }

  /**
   * Busca categorias ativas em hierarquia
   */
  async findHierarquia() {
    return CategoriaDespesa.findAll({
      where: { ativa: true, categoriaPaiId: null },
      include: [{
        model: CategoriaDespesa,
        as: 'subcategorias',
        where: { ativa: true },
        required: false,
        order: [['ordem', 'ASC']],
      }],
      order: [['ordem', 'ASC']],
    });
  }

  /**
   * Busca categoria pelo código
   */
  async findByCodigo(codigo) {
    return CategoriaDespesa.findOne({ where: { codigo } });
  }

  /**
   * Busca categorias com filtros e paginação
   */
  async findWithFilters({ busca, ativa, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (busca) where.nome = { [Op.iLike]: `%${busca}%` };
    if (ativa !== undefined) where.ativa = ativa;
    return this.findPaginated({ where, page, pageSize, order: [['ordem', 'ASC'], ['nome', 'ASC']] });
  }
}

// =============================================================================
// CENTRO CUSTO REPOSITORY
// =============================================================================
class CentroCustoRepository extends BaseRepository {
  constructor() { super(CentroCusto); }

  /**
   * Busca centro de custo pelo código
   */
  async findByCodigo(codigo) {
    return CentroCusto.findOne({ where: { codigo } });
  }

  /**
   * Busca centros de custo com filtros
   */
  async findWithFilters({ busca, ativo, responsavelId, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { codigo: { [Op.iLike]: `%${busca}%` } },
      ];
    }
    if (ativo !== undefined) where.ativo = ativo;
    if (responsavelId) where.responsavelId = responsavelId;
    return this.findPaginated({
      where, page, pageSize,
      order: [['codigo', 'ASC']],
      include: [{ model: Usuario, as: 'responsavel', attributes: ['id', 'nome', 'email'], required: false }],
    });
  }

  /**
   * Obtém relatório de utilização do orçamento
   */
  async getRelatorioOrcamento(ano = new Date().getFullYear()) {
    return this.rawQuery(`
      SELECT
        cc.id,
        cc.codigo,
        cc.nome,
        cc.orcamento_mensal,
        cc.orcamento_anual,
        COALESCE(SUM(s.valor_total) FILTER (
          WHERE EXTRACT(YEAR FROM s.created_at) = :ano
          AND s.status NOT IN ('REJEITADA', 'CANCELADA', 'RASCUNHO')
          AND s.deleted_at IS NULL
        ), 0) as total_utilizado
      FROM centros_custo cc
      LEFT JOIN solicitacoes_reembolso s ON s.centro_custo_id = cc.id
      WHERE cc.ativo = true
      GROUP BY cc.id, cc.codigo, cc.nome, cc.orcamento_mensal, cc.orcamento_anual
      ORDER BY cc.codigo
    `, { ano });
  }
}

// =============================================================================
// PAGAMENTO REPOSITORY
// =============================================================================
class PagamentoRepository extends BaseRepository {
  constructor() { super(Pagamento); }

  /**
   * Busca pagamentos com filtros e paginação
   */
  async findWithFilters({
    status, formaPagamento, processadoPorId, dataInicio, dataFim,
    numeroLote, page = 1, pageSize = 20,
  } = {}) {
    const where = {};
    if (status) where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    if (formaPagamento) where.formaPagamento = formaPagamento;
    if (processadoPorId) where.processadoPorId = processadoPorId;
    if (numeroLote) where.numeroLote = { [Op.iLike]: `%${numeroLote}%` };
    if (dataInicio || dataFim) {
      where.dataPagamento = {};
      if (dataInicio) where.dataPagamento[Op.gte] = dataInicio;
      if (dataFim) where.dataPagamento[Op.lte] = dataFim;
    }
    return this.findPaginated({
      where, page, pageSize,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: SolicitacaoReembolso,
          as: 'solicitacao',
          include: [{ model: Usuario, as: 'solicitante', attributes: ['id', 'nome', 'email'] }],
        },
        { model: Usuario, as: 'processadoPor', attributes: ['id', 'nome'] },
      ],
    });
  }

  /**
   * Obtém total de pagamentos por forma de pagamento
   */
  async getTotaisPorForma(dataInicio, dataFim) {
    return this.rawQuery(`
      SELECT
        forma_pagamento,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor), 0) as total
      FROM pagamentos
      WHERE status = 'CONCLUIDO'
        AND data_pagamento BETWEEN :dataInicio AND :dataFim
      GROUP BY forma_pagamento
      ORDER BY total DESC
    `, { dataInicio, dataFim });
  }
}

// =============================================================================
// TOKEN REFRESH REPOSITORY
// =============================================================================
class TokenRefreshRepository extends BaseRepository {
  constructor() { super(TokenRefresh); }

  async findByToken(token) {
    return TokenRefresh.findOne({ where: { token } });
  }

  async revogarPorUsuario(usuarioId) {
    return TokenRefresh.update(
      { revogado: true, revogadoEm: new Date() },
      { where: { usuarioId, revogado: false } }
    );
  }

  async limparExpirados() {
    const deletados = await TokenRefresh.destroy({
      where: { expiraEm: { [Op.lt]: new Date() } },
    });
    return deletados;
  }
}

// =============================================================================
// POLITICA APROVACAO REPOSITORY
// =============================================================================
class PoliticaAprovacaoRepository extends BaseRepository {
  constructor() { super(PoliticaAprovacao); }

  /**
   * Busca políticas aplicáveis a um valor e categoria, ordenadas por prioridade
   */
  async findAplicaveis(valor, categoriaId) {
    return PoliticaAprovacao.findAll({
      where: {
        ativa: true,
        [Op.or]: [
          { categoriaId: null },
          { categoriaId },
        ],
        [Op.or]: [
          { valorMinimo: null, valorMaximo: null },
          { valorMinimo: { [Op.lte]: valor }, valorMaximo: null },
          { valorMinimo: null, valorMaximo: { [Op.gte]: valor } },
          { valorMinimo: { [Op.lte]: valor }, valorMaximo: { [Op.gte]: valor } },
        ],
      },
      order: [['prioridade', 'DESC']],
    });
  }
}

// =============================================================================
// RELATORIO REPOSITORY
// =============================================================================
class RelatorioRepository extends BaseRepository {
  constructor() { super(Relatorio); }

  async findWithFilters({ geradoPorId, tipo, status, page = 1, pageSize = 20 } = {}) {
    const where = {};
    if (geradoPorId) where.geradoPorId = geradoPorId;
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    return this.findPaginated({
      where, page, pageSize,
      order: [['createdAt', 'DESC']],
      include: [{ model: Usuario, as: 'geradoPor', attributes: ['id', 'nome'] }],
    });
  }

  async limparExpirados() {
    return Relatorio.destroy({
      where: {
        expiraEm: { [Op.lt]: new Date() },
        status: 'CONCLUIDO',
      },
    });
  }
}

// =============================================================================
// CONFIGURACAO REPOSITORY
// =============================================================================
class ConfiguracaoRepository extends BaseRepository {
  constructor() { super(ConfiguracaoSistema); }

  async getByChave(chave) {
    const config = await ConfiguracaoSistema.findOne({ where: { chave } });
    return config ? config.getValorTipado() : null;
  }

  async setByChave(chave, valor, tipo = 'STRING') {
    const valorStr = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
    const [config] = await ConfiguracaoSistema.findOrCreate({
      where: { chave },
      defaults: { chave, valor: valorStr, tipo },
    });
    if (config.valor !== valorStr) {
      config.valor = valorStr;
      await config.save();
    }
    return config;
  }

  async getByGrupo(grupo) {
    const configs = await ConfiguracaoSistema.findAll({ where: { grupo } });
    return configs.reduce((acc, c) => {
      acc[c.chave] = c.getValorTipado();
      return acc;
    }, {});
  }
}

// =============================================================================
// ITEM DESPESA REPOSITORY
// =============================================================================
class ItemDespesaRepository extends BaseRepository {
  constructor() { super(ItemDespesa); }

  async findBySolicitacao(solicitacaoId) {
    return ItemDespesa.findAll({
      where: { solicitacaoId },
      include: [
        { model: CategoriaDespesa, as: 'categoria', attributes: ['id', 'nome', 'icone'] },
        { model: Comprovante, as: 'comprovantes' },
      ],
      order: [['dataDespesa', 'ASC']],
    });
  }
}

// =============================================================================
// COMPROVANTE REPOSITORY
// =============================================================================
class ComprovanteRepository extends BaseRepository {
  constructor() { super(Comprovante); }

  async findBySolicitacao(solicitacaoId) {
    return Comprovante.findAll({
      where: { solicitacaoId },
      include: [{ model: Usuario, as: 'enviadoPor', attributes: ['id', 'nome'] }],
      order: [['createdAt', 'DESC']],
    });
  }

  async findByItemDespesa(itemDespesaId) {
    return Comprovante.findAll({
      where: { itemDespesaId },
      include: [{ model: Usuario, as: 'enviadoPor', attributes: ['id', 'nome'] }],
    });
  }
}

// Exporta instâncias singleton de todos os repositórios
module.exports = {
  auditoriaRepository: new AuditoriaRepository(),
  notificacaoRepository: new NotificacaoRepository(),
  aprovacaoRepository: new AprovacaoRepository(),
  categoriaRepository: new CategoriaRepository(),
  centroCustoRepository: new CentroCustoRepository(),
  pagamentoRepository: new PagamentoRepository(),
  tokenRefreshRepository: new TokenRefreshRepository(),
  politicaAprovacaoRepository: new PoliticaAprovacaoRepository(),
  relatorioRepository: new RelatorioRepository(),
  configuracaoRepository: new ConfiguracaoRepository(),
  itemDespesaRepository: new ItemDespesaRepository(),
  comprovanteRepository: new ComprovanteRepository(),
};
