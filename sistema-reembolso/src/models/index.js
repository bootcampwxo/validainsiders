'use strict';

// =============================================================================
// MODELS AUXILIARES: CategoriaDespesa, CentroCusto, ItemDespesa,
//                    Comprovante, Aprovacao, Pagamento, Notificacao,
//                    ConfiguracaoSistema, TokenRefresh, PoliticaAprovacao,
//                    Relatorio, Auditoria
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');

// =============================================================================
// MODEL: CATEGORIA DESPESA
// =============================================================================
class CategoriaDespesa extends Model {
  static associate(models) {
    CategoriaDespesa.belongsTo(models.CategoriaDespesa, {
      as: 'categoriaPai',
      foreignKey: 'categoriaPaiId',
    });
    CategoriaDespesa.hasMany(models.CategoriaDespesa, {
      as: 'subcategorias',
      foreignKey: 'categoriaPaiId',
    });
    CategoriaDespesa.hasMany(models.SolicitacaoReembolso, {
      as: 'solicitacoes',
      foreignKey: 'categoriaId',
    });
    CategoriaDespesa.hasMany(models.ItemDespesa, {
      as: 'itens',
      foreignKey: 'categoriaId',
    });
  }
}

CategoriaDespesa.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nome: {
    type: DataTypes.STRING(100), allowNull: false,
    validate: { notEmpty: { msg: 'Nome da categoria não pode ser vazio' } },
  },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  codigo: { type: DataTypes.STRING(20), allowNull: true, unique: true },
  icone: { type: DataTypes.STRING(50), allowNull: true },
  cor: {
    type: DataTypes.STRING(7), allowNull: true,
    validate: { is: { args: /^#[0-9A-Fa-f]{6}$/, msg: 'Cor deve estar no formato hexadecimal (#RRGGBB)' } },
  },
  limitePadrao: {
    type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'limite_padrao',
    validate: { min: { args: [0], msg: 'Limite não pode ser negativo' } },
  },
  requerComprovante: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true, field: 'requer_comprovante' },
  requerJustificativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'requer_justificativa' },
  categoriaPaiId: { type: DataTypes.UUID, allowNull: true, field: 'categoria_pai_id' },
  ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ordem: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  sequelize, modelName: 'CategoriaDespesa', tableName: 'categorias_despesa',
  underscored: true, timestamps: true, paranoid: false,
  scopes: { ativa: { where: { ativa: true } } },
});

// =============================================================================
// MODEL: CENTRO DE CUSTO
// =============================================================================
class CentroCusto extends Model {
  static associate(models) {
    CentroCusto.belongsTo(models.Usuario, {
      as: 'responsavel',
      foreignKey: 'responsavelId',
    });
    CentroCusto.hasMany(models.SolicitacaoReembolso, {
      as: 'solicitacoes',
      foreignKey: 'centroCustoId',
    });
  }
}

CentroCusto.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  codigo: {
    type: DataTypes.STRING(20), allowNull: false, unique: true,
    validate: { notEmpty: { msg: 'Código do centro de custo não pode ser vazio' } },
  },
  nome: {
    type: DataTypes.STRING(150), allowNull: false,
    validate: { notEmpty: { msg: 'Nome do centro de custo não pode ser vazio' } },
  },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  responsavelId: { type: DataTypes.UUID, allowNull: true, field: 'responsavel_id' },
  orcamentoMensal: {
    type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'orcamento_mensal',
    validate: { min: { args: [0], msg: 'Orçamento mensal não pode ser negativo' } },
  },
  orcamentoAnual: {
    type: DataTypes.DECIMAL(15, 2), allowNull: true, field: 'orcamento_anual',
    validate: { min: { args: [0], msg: 'Orçamento anual não pode ser negativo' } },
  },
  ativo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  sequelize, modelName: 'CentroCusto', tableName: 'centros_custo',
  underscored: true, timestamps: true,
  scopes: { ativo: { where: { ativo: true } } },
});

// =============================================================================
// MODEL: ITEM DESPESA
// =============================================================================
class ItemDespesa extends Model {
  /**
   * Calcula o valor total do item
   */
  calcularTotal() {
    return parseFloat(this.quantidade) * parseFloat(this.valorUnitario);
  }

  static associate(models) {
    ItemDespesa.belongsTo(models.SolicitacaoReembolso, {
      as: 'solicitacao',
      foreignKey: 'solicitacaoId',
    });
    ItemDespesa.belongsTo(models.CategoriaDespesa, {
      as: 'categoria',
      foreignKey: 'categoriaId',
    });
    ItemDespesa.hasMany(models.Comprovante, {
      as: 'comprovantes',
      foreignKey: 'itemDespesaId',
    });
  }
}

ItemDespesa.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  solicitacaoId: { type: DataTypes.UUID, allowNull: false, field: 'solicitacao_id' },
  categoriaId: { type: DataTypes.UUID, allowNull: false, field: 'categoria_id' },
  descricao: {
    type: DataTypes.STRING(300), allowNull: false,
    validate: { notEmpty: { msg: 'Descrição do item não pode ser vazia' } },
  },
  dataDespesa: {
    type: DataTypes.DATEONLY, allowNull: false, field: 'data_despesa',
    validate: { isDate: { msg: 'Data da despesa inválida' } },
  },
  quantidade: {
    type: DataTypes.DECIMAL(10, 3), allowNull: false, defaultValue: 1.000,
    validate: { min: { args: [0.001], msg: 'Quantidade deve ser maior que zero' } },
  },
  valorUnitario: {
    type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'valor_unitario',
    validate: { min: { args: [0.01], msg: 'Valor unitário deve ser maior que zero' } },
  },
  valorTotal: {
    type: DataTypes.DECIMAL(12, 2), allowNull: false, field: 'valor_total',
  },
  moeda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'BRL' },
  fornecedor: { type: DataTypes.STRING(150), allowNull: true },
  cnpjFornecedor: { type: DataTypes.STRING(18), allowNull: true, field: 'cnpj_fornecedor' },
  numeroNotaFiscal: { type: DataTypes.STRING(50), allowNull: true, field: 'numero_nota_fiscal' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
  metadados: { type: DataTypes.JSONB, allowNull: true, defaultValue: {} },
}, {
  sequelize, modelName: 'ItemDespesa', tableName: 'itens_despesa',
  underscored: true, timestamps: true,
  hooks: {
    // Calcula automaticamente o valor total antes de salvar
    beforeSave: (item) => {
      item.valorTotal = parseFloat(item.quantidade) * parseFloat(item.valorUnitario);
    },
  },
});

// =============================================================================
// MODEL: COMPROVANTE
// =============================================================================
class Comprovante extends Model {
  /**
   * Verifica se o arquivo é uma imagem
   */
  ehImagem() {
    return this.tipoMime.startsWith('image/');
  }

  /**
   * Verifica se o arquivo é um PDF
   */
  ehPDF() {
    return this.tipoMime === 'application/pdf';
  }

  static associate(models) {
    Comprovante.belongsTo(models.SolicitacaoReembolso, {
      as: 'solicitacao',
      foreignKey: 'solicitacaoId',
    });
    Comprovante.belongsTo(models.ItemDespesa, {
      as: 'itemDespesa',
      foreignKey: 'itemDespesaId',
    });
    Comprovante.belongsTo(models.Usuario, {
      as: 'enviadoPor',
      foreignKey: 'enviadoPorId',
    });
  }
}

Comprovante.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  solicitacaoId: { type: DataTypes.UUID, allowNull: true, field: 'solicitacao_id' },
  itemDespesaId: { type: DataTypes.UUID, allowNull: true, field: 'item_despesa_id' },
  nomeOriginal: { type: DataTypes.STRING(255), allowNull: false, field: 'nome_original' },
  nomeArmazenado: { type: DataTypes.STRING(255), allowNull: false, field: 'nome_armazenado' },
  caminho: { type: DataTypes.STRING(500), allowNull: false },
  tipoMime: { type: DataTypes.STRING(100), allowNull: false, field: 'tipo_mime' },
  tamanho: {
    type: DataTypes.INTEGER, allowNull: false,
    validate: { min: { args: [1], msg: 'Tamanho do arquivo deve ser maior que zero' } },
  },
  hashMd5: { type: DataTypes.STRING(32), allowNull: true, field: 'hash_md5' },
  enviadoPorId: { type: DataTypes.UUID, allowNull: false, field: 'enviado_por_id' },
  descricao: { type: DataTypes.STRING(300), allowNull: true },
}, {
  sequelize, modelName: 'Comprovante', tableName: 'comprovantes',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: APROVACAO
// =============================================================================
const STATUS_APROVACAO = {
  PENDENTE: 'PENDENTE',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO',
  DEVOLVIDO: 'DEVOLVIDO',
  EXPIRADO: 'EXPIRADO',
};

class Aprovacao extends Model {
  /**
   * Verifica se a aprovação está pendente
   */
  estaPendente() {
    return this.status === STATUS_APROVACAO.PENDENTE;
  }

  /**
   * Verifica se o prazo expirou
   */
  expirou() {
    if (!this.dataLimite) return false;
    return new Date() > new Date(this.dataLimite);
  }

  static associate(models) {
    Aprovacao.belongsTo(models.SolicitacaoReembolso, {
      as: 'solicitacao',
      foreignKey: 'solicitacaoId',
    });
    Aprovacao.belongsTo(models.Usuario, {
      as: 'aprovador',
      foreignKey: 'aprovadorId',
    });
    Aprovacao.belongsTo(models.Usuario, {
      as: 'delegadoPor',
      foreignKey: 'delegadoPorId',
    });
  }
}

Aprovacao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  solicitacaoId: { type: DataTypes.UUID, allowNull: false, field: 'solicitacao_id' },
  aprovadorId: { type: DataTypes.UUID, allowNull: false, field: 'aprovador_id' },
  nivel: { type: DataTypes.INTEGER, allowNull: false },
  status: {
    type: DataTypes.ENUM(...Object.values(STATUS_APROVACAO)),
    allowNull: false, defaultValue: STATUS_APROVACAO.PENDENTE,
  },
  comentario: { type: DataTypes.TEXT, allowNull: true },
  dataLimite: { type: DataTypes.DATE, allowNull: true, field: 'data_limite' },
  dataAcao: { type: DataTypes.DATE, allowNull: true, field: 'data_acao' },
  ipAprovacao: { type: DataTypes.STRING(45), allowNull: true, field: 'ip_aprovacao' },
  delegadoPorId: { type: DataTypes.UUID, allowNull: true, field: 'delegado_por_id' },
}, {
  sequelize, modelName: 'Aprovacao', tableName: 'aprovacoes',
  underscored: true, timestamps: true,
  scopes: { pendente: { where: { status: STATUS_APROVACAO.PENDENTE } } },
});

// =============================================================================
// MODEL: PAGAMENTO
// =============================================================================
const STATUS_PAGAMENTO = {
  AGENDADO: 'AGENDADO',
  PROCESSANDO: 'PROCESSANDO',
  CONCLUIDO: 'CONCLUIDO',
  FALHOU: 'FALHOU',
  CANCELADO: 'CANCELADO',
  ESTORNADO: 'ESTORNADO',
};

const FORMAS_PAGAMENTO = {
  TRANSFERENCIA_BANCARIA: 'TRANSFERENCIA_BANCARIA',
  PIX: 'PIX',
  BOLETO: 'BOLETO',
  CHEQUE: 'CHEQUE',
  DINHEIRO: 'DINHEIRO',
  VALE_REFEICAO: 'VALE_REFEICAO',
  CARTAO_CORPORATIVO: 'CARTAO_CORPORATIVO',
};

class Pagamento extends Model {
  static associate(models) {
    Pagamento.belongsTo(models.SolicitacaoReembolso, {
      as: 'solicitacao',
      foreignKey: 'solicitacaoId',
    });
    Pagamento.belongsTo(models.Usuario, {
      as: 'processadoPor',
      foreignKey: 'processadoPorId',
    });
  }
}

Pagamento.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  solicitacaoId: { type: DataTypes.UUID, allowNull: false, field: 'solicitacao_id' },
  numeroLote: { type: DataTypes.STRING(50), allowNull: true, field: 'numero_lote' },
  valor: {
    type: DataTypes.DECIMAL(12, 2), allowNull: false,
    validate: { min: { args: [0.01], msg: 'Valor do pagamento deve ser maior que zero' } },
  },
  formaPagamento: {
    type: DataTypes.ENUM(...Object.values(FORMAS_PAGAMENTO)),
    allowNull: false, defaultValue: FORMAS_PAGAMENTO.PIX, field: 'forma_pagamento',
  },
  dadosBancarios: { type: DataTypes.JSONB, allowNull: true, field: 'dados_bancarios' },
  status: {
    type: DataTypes.ENUM(...Object.values(STATUS_PAGAMENTO)),
    allowNull: false, defaultValue: STATUS_PAGAMENTO.AGENDADO,
  },
  dataAgendamento: { type: DataTypes.DATE, allowNull: true, field: 'data_agendamento' },
  dataPagamento: { type: DataTypes.DATE, allowNull: true, field: 'data_pagamento' },
  comprovantePagamento: { type: DataTypes.STRING(500), allowNull: true, field: 'comprovante_pagamento' },
  codigoTransacao: { type: DataTypes.STRING(100), allowNull: true, field: 'codigo_transacao' },
  processadoPorId: { type: DataTypes.UUID, allowNull: true, field: 'processado_por_id' },
  observacoes: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize, modelName: 'Pagamento', tableName: 'pagamentos',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: NOTIFICACAO
// =============================================================================
const TIPOS_NOTIFICACAO = {
  SOLICITACAO_CRIADA: 'SOLICITACAO_CRIADA',
  SOLICITACAO_SUBMETIDA: 'SOLICITACAO_SUBMETIDA',
  APROVACAO_PENDENTE: 'APROVACAO_PENDENTE',
  SOLICITACAO_APROVADA: 'SOLICITACAO_APROVADA',
  SOLICITACAO_REJEITADA: 'SOLICITACAO_REJEITADA',
  SOLICITACAO_DEVOLVIDA: 'SOLICITACAO_DEVOLVIDA',
  PAGAMENTO_PROCESSADO: 'PAGAMENTO_PROCESSADO',
  LEMBRETE_APROVACAO: 'LEMBRETE_APROVACAO',
  VENCIMENTO_PRAZO: 'VENCIMENTO_PRAZO',
  SISTEMA: 'SISTEMA',
};

class Notificacao extends Model {
  static associate(models) {
    Notificacao.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'usuarioId',
    });
    Notificacao.belongsTo(models.SolicitacaoReembolso, {
      as: 'solicitacao',
      foreignKey: 'solicitacaoId',
    });
  }
}

Notificacao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
  tipo: {
    type: DataTypes.ENUM(...Object.values(TIPOS_NOTIFICACAO)),
    allowNull: false,
  },
  titulo: { type: DataTypes.STRING(200), allowNull: false },
  mensagem: { type: DataTypes.TEXT, allowNull: false },
  dados: { type: DataTypes.JSONB, allowNull: true },
  lida: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  lidaEm: { type: DataTypes.DATE, allowNull: true, field: 'lida_em' },
  canal: {
    type: DataTypes.ENUM('EMAIL', 'PUSH', 'SMS', 'IN_APP'),
    allowNull: false, defaultValue: 'IN_APP',
  },
  enviada: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  enviadaEm: { type: DataTypes.DATE, allowNull: true, field: 'enviada_em' },
  erroEnvio: { type: DataTypes.TEXT, allowNull: true, field: 'erro_envio' },
  solicitacaoId: { type: DataTypes.UUID, allowNull: true, field: 'solicitacao_id' },
}, {
  sequelize, modelName: 'Notificacao', tableName: 'notificacoes',
  underscored: true, timestamps: true,
  scopes: { naoLida: { where: { lida: false } } },
});

// =============================================================================
// MODEL: CONFIGURACAO SISTEMA
// =============================================================================
class ConfiguracaoSistema extends Model {
  /**
   * Retorna o valor convertido para o tipo correto
   */
  getValorTipado() {
    if (!this.valor) return null;
    switch (this.tipo) {
      case 'NUMBER': return parseFloat(this.valor);
      case 'BOOLEAN': return this.valor === 'true' || this.valor === '1';
      case 'JSON': try { return JSON.parse(this.valor); } catch { return this.valor; }
      case 'DATE': return new Date(this.valor);
      default: return this.valor;
    }
  }
}

ConfiguracaoSistema.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  chave: {
    type: DataTypes.STRING(100), allowNull: false, unique: true,
    validate: { notEmpty: { msg: 'Chave não pode ser vazia' } },
  },
  valor: { type: DataTypes.TEXT, allowNull: true },
  tipo: {
    type: DataTypes.ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'DATE'),
    allowNull: false, defaultValue: 'STRING',
  },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  grupo: { type: DataTypes.STRING(50), allowNull: true },
  editavel: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  sequelize, modelName: 'ConfiguracaoSistema', tableName: 'configuracoes_sistema',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: TOKEN REFRESH
// =============================================================================
class TokenRefresh extends Model {
  /**
   * Verifica se o token expirou
   */
  expirou() {
    return new Date() > new Date(this.expiraEm);
  }

  /**
   * Verifica se o token é válido (não revogado e não expirado)
   */
  ehValido() {
    return !this.revogado && !this.expirou();
  }

  static associate(models) {
    TokenRefresh.belongsTo(models.Usuario, {
      as: 'usuario',
      foreignKey: 'usuarioId',
    });
  }
}

TokenRefresh.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuarioId: { type: DataTypes.UUID, allowNull: false, field: 'usuario_id' },
  token: { type: DataTypes.TEXT, allowNull: false, unique: true },
  expiraEm: { type: DataTypes.DATE, allowNull: false, field: 'expira_em' },
  ip: { type: DataTypes.STRING(45), allowNull: true },
  userAgent: { type: DataTypes.TEXT, allowNull: true, field: 'user_agent' },
  revogado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  revogadoEm: { type: DataTypes.DATE, allowNull: true, field: 'revogado_em' },
}, {
  sequelize, modelName: 'TokenRefresh', tableName: 'tokens_refresh',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: POLITICA APROVACAO
// =============================================================================
class PoliticaAprovacao extends Model {
  /**
   * Verifica se a política se aplica a um dado valor e categoria
   */
  seAplica(valor, categoriaId) {
    if (!this.ativa) return false;
    if (this.categoriaId && this.categoriaId !== categoriaId) return false;
    if (this.valorMinimo && parseFloat(valor) < parseFloat(this.valorMinimo)) return false;
    if (this.valorMaximo && parseFloat(valor) > parseFloat(this.valorMaximo)) return false;
    return true;
  }

  static associate(models) {
    PoliticaAprovacao.belongsTo(models.CategoriaDespesa, {
      as: 'categoria',
      foreignKey: 'categoriaId',
    });
  }
}

PoliticaAprovacao.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nome: {
    type: DataTypes.STRING(100), allowNull: false,
    validate: { notEmpty: { msg: 'Nome da política não pode ser vazio' } },
  },
  descricao: { type: DataTypes.TEXT, allowNull: true },
  categoriaId: { type: DataTypes.UUID, allowNull: true, field: 'categoria_id' },
  valorMinimo: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'valor_minimo' },
  valorMaximo: { type: DataTypes.DECIMAL(12, 2), allowNull: true, field: 'valor_maximo' },
  niveis: {
    type: DataTypes.JSONB, allowNull: false,
    validate: { notNull: { msg: 'Configuração de níveis é obrigatória' } },
  },
  ativa: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  prioridade: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  sequelize, modelName: 'PoliticaAprovacao', tableName: 'politicas_aprovacao',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: RELATORIO
// =============================================================================
class Relatorio extends Model {
  static associate(models) {
    Relatorio.belongsTo(models.Usuario, {
      as: 'geradoPor',
      foreignKey: 'geradoPorId',
    });
  }
}

Relatorio.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tipo: {
    type: DataTypes.ENUM(
      'DESPESAS_POR_PERIODO', 'DESPESAS_POR_CATEGORIA', 'DESPESAS_POR_USUARIO',
      'DESPESAS_POR_CENTRO_CUSTO', 'FLUXO_APROVACAO', 'PAGAMENTOS',
      'RESUMO_EXECUTIVO', 'AUDITORIA', 'PERSONALIZADO'
    ),
    allowNull: false,
  },
  nome: { type: DataTypes.STRING(200), allowNull: false },
  parametros: { type: DataTypes.JSONB, allowNull: true },
  formato: {
    type: DataTypes.ENUM('PDF', 'XLSX', 'CSV', 'JSON'),
    allowNull: false, defaultValue: 'PDF',
  },
  caminhoArquivo: { type: DataTypes.STRING(500), allowNull: true, field: 'caminho_arquivo' },
  status: {
    type: DataTypes.ENUM('PROCESSANDO', 'CONCLUIDO', 'FALHOU'),
    allowNull: false, defaultValue: 'PROCESSANDO',
  },
  geradoPorId: { type: DataTypes.UUID, allowNull: false, field: 'gerado_por_id' },
  erro: { type: DataTypes.TEXT, allowNull: true },
  tamanhoArquivo: { type: DataTypes.INTEGER, allowNull: true, field: 'tamanho_arquivo' },
  expiraEm: { type: DataTypes.DATE, allowNull: true, field: 'expira_em' },
}, {
  sequelize, modelName: 'Relatorio', tableName: 'relatorios',
  underscored: true, timestamps: true,
});

// =============================================================================
// MODEL: AUDITORIA
// =============================================================================
class Auditoria extends Model {}

Auditoria.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  usuarioId: { type: DataTypes.UUID, allowNull: true, field: 'usuario_id' },
  acao: { type: DataTypes.STRING(100), allowNull: false },
  tabela: { type: DataTypes.STRING(100), allowNull: true },
  registroId: { type: DataTypes.STRING(100), allowNull: true, field: 'registro_id' },
  dadosAnteriores: { type: DataTypes.JSONB, allowNull: true, field: 'dados_anteriores' },
  dadosNovos: { type: DataTypes.JSONB, allowNull: true, field: 'dados_novos' },
  ip: { type: DataTypes.STRING(45), allowNull: true },
  userAgent: { type: DataTypes.TEXT, allowNull: true, field: 'user_agent' },
  descricao: { type: DataTypes.TEXT, allowNull: true },
}, {
  sequelize, modelName: 'Auditoria', tableName: 'auditoria',
  underscored: true, timestamps: true,
});

module.exports = {
  CategoriaDespesa,
  CentroCusto,
  ItemDespesa,
  Comprovante,
  Aprovacao,
  Pagamento,
  Notificacao,
  ConfiguracaoSistema,
  TokenRefresh,
  PoliticaAprovacao,
  Relatorio,
  Auditoria,
  STATUS_APROVACAO,
  STATUS_PAGAMENTO,
  FORMAS_PAGAMENTO,
  TIPOS_NOTIFICACAO,
};
