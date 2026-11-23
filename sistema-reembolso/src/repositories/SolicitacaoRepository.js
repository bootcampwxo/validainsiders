'use strict';

// =============================================================================
// SOLICITACAO REPOSITORY
// Operações de acesso a dados para Solicitações de Reembolso
// =============================================================================

const { Op, fn, col, literal } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { SolicitacaoReembolso, STATUS_SOLICITACAO } = require('../models/SolicitacaoReembolso');
const {
  CategoriaDespesa,
  CentroCusto,
  ItemDespesa,
  Comprovante,
  Aprovacao,
  Pagamento,
} = require('../models/index');
const { Usuario } = require('../models/Usuario');

/**
 * @class SolicitacaoRepository
 * @extends BaseRepository
 */
class SolicitacaoRepository extends BaseRepository {
  constructor() {
    super(SolicitacaoReembolso);
  }

  /**
   * Busca solicitação completa com todos os relacionamentos
   * @param {string} id - UUID da solicitação
   * @returns {Promise<SolicitacaoReembolso|null>}
   */
  async findByIdCompleto(id) {
    return SolicitacaoReembolso.findByPk(id, {
      include: [
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['id', 'nome', 'email', 'departamento', 'cargo', 'avatarUrl'],
        },
        { model: CategoriaDespesa, as: 'categoria', attributes: ['id', 'nome', 'icone', 'cor'] },
        { model: CentroCusto, as: 'centroCusto', attributes: ['id', 'codigo', 'nome'] },
        {
          model: ItemDespesa,
          as: 'itens',
          include: [
            { model: CategoriaDespesa, as: 'categoria', attributes: ['id', 'nome', 'icone'] },
            { model: Comprovante, as: 'comprovantes' },
          ],
          order: [['dataDespesa', 'ASC']],
        },
        {
          model: Comprovante,
          as: 'comprovantes',
          include: [
            { model: Usuario, as: 'enviadoPor', attributes: ['id', 'nome'] },
          ],
        },
        {
          model: Aprovacao,
          as: 'aprovacoes',
          include: [
            {
              model: Usuario,
              as: 'aprovador',
              attributes: ['id', 'nome', 'email', 'cargo', 'avatarUrl'],
            },
          ],
          order: [['nivel', 'ASC']],
        },
        {
          model: Pagamento,
          as: 'pagamentos',
          include: [
            { model: Usuario, as: 'processadoPor', attributes: ['id', 'nome'] },
          ],
        },
      ],
    });
  }

  /**
   * Busca solicitações pelo número
   * @param {string} numero - Número da solicitação (ex: REE-2024-000001)
   * @returns {Promise<SolicitacaoReembolso|null>}
   */
  async findByNumero(numero) {
    return SolicitacaoReembolso.findOne({ where: { numero } });
  }

  /**
   * Busca solicitações com filtros avançados e paginação
   */
  async findWithFilters({
    solicitanteId,
    categoriaId,
    centroCustoId,
    status,
    prioridade,
    dataInicio,
    dataFim,
    valorMin,
    valorMax,
    busca,
    aprovadorId, // Buscar pendentes de um aprovador específico
    page = 1,
    pageSize = 20,
    order = [['createdAt', 'DESC']],
  } = {}) {
    const where = {};
    const includeAprovacao = [];

    if (solicitanteId) where.solicitanteId = solicitanteId;
    if (categoriaId) where.categoriaId = categoriaId;
    if (centroCustoId) where.centroCustoId = centroCustoId;
    if (prioridade) where.prioridade = prioridade;

    // Filtro por status (único ou array)
    if (status) {
      where.status = Array.isArray(status) ? { [Op.in]: status } : status;
    }

    // Filtro por período da despesa
    if (dataInicio || dataFim) {
      where.dataDespesa = {};
      if (dataInicio) where.dataDespesa[Op.gte] = dataInicio;
      if (dataFim) where.dataDespesa[Op.lte] = dataFim;
    }

    // Filtro por faixa de valor
    if (valorMin || valorMax) {
      where.valorTotal = {};
      if (valorMin) where.valorTotal[Op.gte] = valorMin;
      if (valorMax) where.valorTotal[Op.lte] = valorMax;
    }

    // Busca por texto
    if (busca) {
      where[Op.or] = [
        { titulo: { [Op.iLike]: `%${busca}%` } },
        { numero: { [Op.iLike]: `%${busca}%` } },
        { projeto: { [Op.iLike]: `%${busca}%` } },
      ];
    }

    // Filtro por aprovador (mostra solicitações pendentes de aprovação por ele)
    if (aprovadorId) {
      includeAprovacao.push({
        model: Aprovacao,
        as: 'aprovacoes',
        where: { aprovadorId, status: 'PENDENTE' },
        required: true,
      });
    }

    return this.findPaginated({
      where,
      page,
      pageSize,
      order,
      include: [
        {
          model: Usuario,
          as: 'solicitante',
          attributes: ['id', 'nome', 'email', 'departamento'],
        },
        { model: CategoriaDespesa, as: 'categoria', attributes: ['id', 'nome', 'icone', 'cor'] },
        { model: CentroCusto, as: 'centroCusto', attributes: ['id', 'codigo', 'nome'] },
        ...includeAprovacao,
      ],
    });
  }

  /**
   * Gera o próximo número sequencial de solicitação
   * @param {number} ano - Ano para o número
   * @returns {Promise<string>}
   */
  async gerarNumero(ano = new Date().getFullYear()) {
    const prefixo = `REE-${ano}-`;
    const [result] = await this.rawQuery(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 10) AS INTEGER)), 0) + 1 as proximo
      FROM solicitacoes_reembolso
      WHERE numero LIKE :prefixo
        AND deleted_at IS NULL
    `, { prefixo: `${prefixo}%` });

    const numero = String(result?.proximo || 1).padStart(6, '0');
    return `${prefixo}${numero}`;
  }

  /**
   * Obtém resumo de totais por status para um solicitante
   * @param {string} solicitanteId
   * @returns {Promise<Object>}
   */
  async getResumoSolicitante(solicitanteId) {
    return this.rawQuery(`
      SELECT
        status,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor_total
      FROM solicitacoes_reembolso
      WHERE solicitante_id = :solicitanteId
        AND deleted_at IS NULL
      GROUP BY status
    `, { solicitanteId });
  }

  /**
   * Obtém dashboard de totais gerais (para admin/financeiro)
   * @param {Object} filtros - Filtros opcionais de período
   * @returns {Promise<Object>}
   */
  async getDashboardTotais(filtros = {}) {
    const condicoes = ["deleted_at IS NULL"];
    const params = {};

    if (filtros.dataInicio) {
      condicoes.push("created_at >= :dataInicio");
      params.dataInicio = filtros.dataInicio;
    }
    if (filtros.dataFim) {
      condicoes.push("created_at <= :dataFim");
      params.dataFim = filtros.dataFim;
    }

    const where = condicoes.join(' AND ');

    return this.rawQuery(`
      SELECT
        COUNT(*) as total_solicitacoes,
        COUNT(*) FILTER (WHERE status = 'SUBMETIDA') as aguardando_aprovacao,
        COUNT(*) FILTER (WHERE status = 'EM_ANALISE') as em_analise,
        COUNT(*) FILTER (WHERE status = 'APROVADA') as aprovadas,
        COUNT(*) FILTER (WHERE status = 'REJEITADA') as rejeitadas,
        COUNT(*) FILTER (WHERE status = 'PAGA') as pagas,
        COALESCE(SUM(valor_total) FILTER (WHERE status NOT IN ('REJEITADA', 'CANCELADA')), 0) as valor_total,
        COALESCE(SUM(valor_total) FILTER (WHERE status = 'PAGA'), 0) as valor_pago,
        COALESCE(SUM(valor_total) FILTER (WHERE status = 'APROVADA'), 0) as valor_aprovado_pendente
      FROM solicitacoes_reembolso
      WHERE ${where}
    `, params);
  }

  /**
   * Obtém evolução mensal de solicitações
   * @param {number} meses - Número de meses para retroceder
   * @returns {Promise<Object[]>}
   */
  async getEvolucaoMensal(meses = 12) {
    return this.rawQuery(`
      SELECT
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as quantidade,
        COALESCE(SUM(valor_total), 0) as valor_total,
        COUNT(*) FILTER (WHERE status = 'PAGA') as pagas,
        COUNT(*) FILTER (WHERE status = 'REJEITADA') as rejeitadas
      FROM solicitacoes_reembolso
      WHERE created_at >= NOW() - INTERVAL '${meses} months'
        AND deleted_at IS NULL
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes ASC
    `);
  }

  /**
   * Obtém ranking de categorias mais usadas
   * @param {Object} filtros
   * @returns {Promise<Object[]>}
   */
  async getRankingCategorias(filtros = {}) {
    return this.rawQuery(`
      SELECT
        c.id,
        c.nome,
        c.icone,
        c.cor,
        COUNT(s.id) as quantidade,
        COALESCE(SUM(s.valor_total), 0) as valor_total,
        COALESCE(AVG(s.valor_total), 0) as valor_medio
      FROM categorias_despesa c
      LEFT JOIN solicitacoes_reembolso s ON s.categoria_id = c.id
        AND s.deleted_at IS NULL
        AND s.status NOT IN ('REJEITADA', 'CANCELADA')
      WHERE c.ativa = true
      GROUP BY c.id, c.nome, c.icone, c.cor
      ORDER BY valor_total DESC
      LIMIT 10
    `);
  }

  /**
   * Busca solicitações que precisam de lembrete de aprovação
   * (aprovações pendentes há mais de N dias)
   * @param {number} dias - Dias de tolerância
   * @returns {Promise<SolicitacaoReembolso[]>}
   */
  async findParaLembrete(dias = 2) {
    return SolicitacaoReembolso.findAll({
      where: {
        status: { [Op.in]: [STATUS_SOLICITACAO.SUBMETIDA, STATUS_SOLICITACAO.EM_ANALISE] },
        dataSubmissao: { [Op.lte]: new Date(Date.now() - dias * 24 * 60 * 60 * 1000) },
      },
      include: [
        { model: Usuario, as: 'solicitante', attributes: ['id', 'nome', 'email'] },
        {
          model: Aprovacao,
          as: 'aprovacoes',
          where: { status: 'PENDENTE' },
          include: [
            { model: Usuario, as: 'aprovador', attributes: ['id', 'nome', 'email'] },
          ],
        },
      ],
    });
  }
}

module.exports = new SolicitacaoRepository();
