'use strict';

// =============================================================================
// MODEL: SOLICITACAO REEMBOLSO
// Representa uma solicitação de reembolso de despesas
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Status possíveis de uma solicitação
 */
const STATUS_SOLICITACAO = {
  RASCUNHO: 'RASCUNHO',
  SUBMETIDA: 'SUBMETIDA',
  EM_ANALISE: 'EM_ANALISE',
  APROVADA: 'APROVADA',
  REJEITADA: 'REJEITADA',
  CANCELADA: 'CANCELADA',
  EM_PAGAMENTO: 'EM_PAGAMENTO',
  PAGA: 'PAGA',
  DEVOLVIDA: 'DEVOLVIDA',
};

/**
 * Prioridades disponíveis
 */
const PRIORIDADES = {
  BAIXA: 'BAIXA',
  NORMAL: 'NORMAL',
  ALTA: 'ALTA',
  URGENTE: 'URGENTE',
};

/**
 * @class SolicitacaoReembolso
 * @extends Model
 */
class SolicitacaoReembolso extends Model {
  /**
   * Verifica se a solicitação pode ser editada pelo solicitante
   * @returns {boolean}
   */
  podeEditar() {
    return [STATUS_SOLICITACAO.RASCUNHO, STATUS_SOLICITACAO.DEVOLVIDA].includes(this.status);
  }

  /**
   * Verifica se a solicitação pode ser submetida para aprovação
   * @returns {boolean}
   */
  podeSubmeter() {
    return [STATUS_SOLICITACAO.RASCUNHO, STATUS_SOLICITACAO.DEVOLVIDA].includes(this.status);
  }

  /**
   * Verifica se a solicitação pode ser cancelada
   * @returns {boolean}
   */
  podeCancelar() {
    return [
      STATUS_SOLICITACAO.RASCUNHO,
      STATUS_SOLICITACAO.SUBMETIDA,
      STATUS_SOLICITACAO.EM_ANALISE,
      STATUS_SOLICITACAO.DEVOLVIDA,
    ].includes(this.status);
  }

  /**
   * Verifica se está aguardando aprovação
   * @returns {boolean}
   */
  aguardandoAprovacao() {
    return [STATUS_SOLICITACAO.SUBMETIDA, STATUS_SOLICITACAO.EM_ANALISE].includes(this.status);
  }

  /**
   * Verifica se o fluxo de aprovação está completo
   * @returns {boolean}
   */
  aprovacaoCompleta() {
    return this.nivelAprovacaoAtual >= this.nivelAprovacaoTotal;
  }

  /**
   * Calcula o valor em BRL (considerando câmbio)
   * @returns {number}
   */
  getValorEmBRL() {
    if (this.moeda === 'BRL') return parseFloat(this.valorTotal);
    return parseFloat(this.valorTotal) * parseFloat(this.taxaCambio || 1);
  }

  /**
   * Associações com outros models
   * @param {Object} models
   */
  static associate(models) {
    SolicitacaoReembolso.belongsTo(models.Usuario, {
      as: 'solicitante',
      foreignKey: 'solicitanteId',
    });

    SolicitacaoReembolso.belongsTo(models.CategoriaDespesa, {
      as: 'categoria',
      foreignKey: 'categoriaId',
    });

    SolicitacaoReembolso.belongsTo(models.CentroCusto, {
      as: 'centroCusto',
      foreignKey: 'centroCustoId',
    });

    SolicitacaoReembolso.hasMany(models.ItemDespesa, {
      as: 'itens',
      foreignKey: 'solicitacaoId',
    });

    SolicitacaoReembolso.hasMany(models.Comprovante, {
      as: 'comprovantes',
      foreignKey: 'solicitacaoId',
    });

    SolicitacaoReembolso.hasMany(models.Aprovacao, {
      as: 'aprovacoes',
      foreignKey: 'solicitacaoId',
    });

    SolicitacaoReembolso.hasMany(models.Pagamento, {
      as: 'pagamentos',
      foreignKey: 'solicitacaoId',
    });

    SolicitacaoReembolso.hasMany(models.Notificacao, {
      as: 'notificacoes',
      foreignKey: 'solicitacaoId',
    });
  }
}

SolicitacaoReembolso.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      comment: 'Número sequencial da solicitação',
    },
    titulo: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Título não pode ser vazio' },
        len: { args: [5, 200], msg: 'Título deve ter entre 5 e 200 caracteres' },
      },
    },
    descricao: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(STATUS_SOLICITACAO)),
      allowNull: false,
      defaultValue: STATUS_SOLICITACAO.RASCUNHO,
    },
    solicitanteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'solicitante_id',
    },
    categoriaId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'categoria_id',
    },
    centroCustoId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'centro_custo_id',
    },
    valorTotal: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0.00,
      field: 'valor_total',
      validate: {
        min: { args: [0.01], msg: 'Valor total deve ser maior que zero' },
      },
    },
    moeda: {
      type: DataTypes.STRING(3),
      allowNull: false,
      defaultValue: 'BRL',
      validate: {
        len: { args: [3, 3], msg: 'Código de moeda deve ter exatamente 3 caracteres' },
      },
    },
    taxaCambio: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      defaultValue: 1.000000,
      field: 'taxa_cambio',
    },
    valorConvertido: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      field: 'valor_convertido',
    },
    dataDespesa: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'data_despesa',
      validate: {
        isDate: { msg: 'Data da despesa inválida' },
        dataNaoFutura(value) {
          if (new Date(value) > new Date()) {
            throw new Error('Data da despesa não pode ser futura');
          }
        },
      },
    },
    dataSubmissao: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'data_submissao',
    },
    dataAprovacao: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'data_aprovacao',
    },
    dataPagamento: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'data_pagamento',
    },
    nivelAprovacaoAtual: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'nivel_aprovacao_atual',
    },
    nivelAprovacaoTotal: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'nivel_aprovacao_total',
    },
    justificativaRejeicao: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'justificativa_rejeicao',
    },
    observacoes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dadosBancarios: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'dados_bancarios',
    },
    metadados: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
    prioridade: {
      type: DataTypes.ENUM(...Object.values(PRIORIDADES)),
      allowNull: false,
      defaultValue: PRIORIDADES.NORMAL,
    },
    viagemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'viagem_id',
    },
    projeto: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'SolicitacaoReembolso',
    tableName: 'solicitacoes_reembolso',
    underscored: true,
    timestamps: true,
    paranoid: true,
  }
);

module.exports = { SolicitacaoReembolso, STATUS_SOLICITACAO, PRIORIDADES };
