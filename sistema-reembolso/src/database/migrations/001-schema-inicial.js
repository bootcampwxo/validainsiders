'use strict';

// =============================================================================
// MIGRATION: CRIAÇÃO DAS TABELAS PRINCIPAIS DO SISTEMA
// Versão: 001 - Schema inicial completo
// =============================================================================

const { QueryInterface, DataTypes } = require('sequelize');

module.exports = {
  /**
   * Executa a migration (cria as tabelas)
   * @param {QueryInterface} queryInterface
   */
  up: async (queryInterface) => {
    // -----------------------------------------------------------------
    // TABELA: usuarios
    // Armazena todos os usuários do sistema com seus dados e permissões
    // -----------------------------------------------------------------
    await queryInterface.createTable('usuarios', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
        comment: 'Identificador único do usuário (UUID)',
      },
      nome: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Nome completo do usuário',
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        comment: 'Endereço de e-mail único do usuário',
      },
      senha_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Hash bcrypt da senha do usuário',
      },
      perfil: {
        type: DataTypes.ENUM(
          'ADMIN',           // Administrador do sistema
          'GESTOR',          // Gestor de equipe/departamento
          'APROVADOR',       // Aprovador de despesas
          'FINANCEIRO',      // Equipe financeira
          'COLABORADOR'      // Colaborador comum
        ),
        allowNull: false,
        defaultValue: 'COLABORADOR',
        comment: 'Perfil de acesso do usuário no sistema',
      },
      departamento: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Departamento do usuário na empresa',
      },
      cargo: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Cargo do usuário na empresa',
      },
      matricula: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
        comment: 'Matrícula do colaborador na empresa',
      },
      telefone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Telefone de contato do usuário',
      },
      cpf: {
        type: DataTypes.STRING(14),
        allowNull: true,
        unique: true,
        comment: 'CPF do usuário (formato: 000.000.000-00)',
      },
      limite_aprovacao: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        defaultValue: 0.00,
        comment: 'Limite de valor que este usuário pode aprovar',
      },
      gestor_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Referência ao gestor imediato do usuário',
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica se o usuário está ativo no sistema',
      },
      primeiro_acesso: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica se o usuário ainda não definiu sua senha',
      },
      ultimo_login: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data e hora do último login bem-sucedido',
      },
      tentativas_login: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Número de tentativas de login falhas consecutivas',
      },
      bloqueado_ate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora até quando o usuário está bloqueado',
      },
      token_reset_senha: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Token para reset de senha',
      },
      token_reset_expira: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data de expiração do token de reset de senha',
      },
      avatar_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL do avatar/foto do usuário',
      },
      configuracoes: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Configurações pessoais do usuário em JSON',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete - data de exclusão lógica',
      },
    });

    // Índices para a tabela usuarios
    await queryInterface.addIndex('usuarios', ['email'], { name: 'idx_usuarios_email' });
    await queryInterface.addIndex('usuarios', ['cpf'], { name: 'idx_usuarios_cpf' });
    await queryInterface.addIndex('usuarios', ['matricula'], { name: 'idx_usuarios_matricula' });
    await queryInterface.addIndex('usuarios', ['perfil'], { name: 'idx_usuarios_perfil' });
    await queryInterface.addIndex('usuarios', ['departamento'], { name: 'idx_usuarios_departamento' });
    await queryInterface.addIndex('usuarios', ['gestor_id'], { name: 'idx_usuarios_gestor_id' });
    await queryInterface.addIndex('usuarios', ['ativo'], { name: 'idx_usuarios_ativo' });

    // -----------------------------------------------------------------
    // TABELA: categorias_despesa
    // Categorias para classificação das despesas
    // -----------------------------------------------------------------
    await queryInterface.createTable('categorias_despesa', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Nome da categoria de despesa',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição detalhada da categoria',
      },
      codigo: {
        type: DataTypes.STRING(20),
        allowNull: true,
        unique: true,
        comment: 'Código contábil da categoria',
      },
      icone: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Ícone representativo da categoria',
      },
      cor: {
        type: DataTypes.STRING(7),
        allowNull: true,
        comment: 'Cor hexadecimal para representação visual',
      },
      limite_padrao: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Limite padrão por solicitação nesta categoria',
      },
      requer_comprovante: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica se requer comprovante obrigatório',
      },
      requer_justificativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica se requer justificativa detalhada',
      },
      categoria_pai_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'categorias_despesa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Categoria pai para hierarquia de categorias',
      },
      ativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ordem: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Ordem de exibição',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('categorias_despesa', ['nome'], { name: 'idx_categorias_nome' });
    await queryInterface.addIndex('categorias_despesa', ['codigo'], { name: 'idx_categorias_codigo' });
    await queryInterface.addIndex('categorias_despesa', ['ativa'], { name: 'idx_categorias_ativa' });

    // -----------------------------------------------------------------
    // TABELA: centros_custo
    // Centros de custo para alocação das despesas
    // -----------------------------------------------------------------
    await queryInterface.createTable('centros_custo', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Código único do centro de custo',
      },
      nome: {
        type: DataTypes.STRING(150),
        allowNull: false,
        comment: 'Nome do centro de custo',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      responsavel_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Responsável pelo centro de custo',
      },
      orcamento_mensal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Orçamento mensal disponível',
      },
      orcamento_anual: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Orçamento anual disponível',
      },
      ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('centros_custo', ['codigo'], { name: 'idx_centros_custo_codigo' });
    await queryInterface.addIndex('centros_custo', ['responsavel_id'], { name: 'idx_centros_custo_responsavel' });

    // -----------------------------------------------------------------
    // TABELA: solicitacoes_reembolso
    // Tabela principal do sistema - registra todas as solicitações
    // -----------------------------------------------------------------
    await queryInterface.createTable('solicitacoes_reembolso', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      numero: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'Número sequencial da solicitação (ex: REE-2024-000001)',
      },
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Título/descrição resumida da solicitação',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição detalhada da solicitação',
      },
      status: {
        type: DataTypes.ENUM(
          'RASCUNHO',          // Em elaboração pelo solicitante
          'SUBMETIDA',         // Submetida para aprovação
          'EM_ANALISE',        // Em análise pelo aprovador
          'APROVADA',          // Aprovada pelo fluxo completo
          'REJEITADA',         // Rejeitada em algum nível
          'CANCELADA',         // Cancelada pelo solicitante
          'EM_PAGAMENTO',      // Aprovada e em processo de pagamento
          'PAGA',              // Reembolso efetuado
          'DEVOLVIDA'          // Devolvida para ajuste pelo solicitante
        ),
        allowNull: false,
        defaultValue: 'RASCUNHO',
        comment: 'Status atual da solicitação',
      },
      solicitante_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Usuário que criou a solicitação',
      },
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'categorias_despesa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Categoria principal da despesa',
      },
      centro_custo_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'centros_custo',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Centro de custo para alocação',
      },
      valor_total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Valor total da solicitação',
      },
      moeda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
        comment: 'Moeda da despesa (código ISO 4217)',
      },
      taxa_cambio: {
        type: DataTypes.DECIMAL(10, 6),
        allowNull: true,
        defaultValue: 1.000000,
        comment: 'Taxa de câmbio usada para conversão (se moeda estrangeira)',
      },
      valor_convertido: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Valor convertido para BRL',
      },
      data_despesa: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Data em que a despesa foi realizada',
      },
      data_submissao: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora em que foi submetida para aprovação',
      },
      data_aprovacao: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora da aprovação final',
      },
      data_pagamento: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora em que o reembolso foi pago',
      },
      nivel_aprovacao_atual: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Nível atual no fluxo de aprovação (0 = não iniciado)',
      },
      nivel_aprovacao_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Total de níveis necessários para aprovação',
      },
      justificativa_rejeicao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Motivo da rejeição (preenchido quando rejeitada)',
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Observações adicionais do solicitante',
      },
      dados_bancarios: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Dados bancários para pagamento do reembolso',
      },
      metadados: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadados adicionais em formato JSON',
      },
      prioridade: {
        type: DataTypes.ENUM('BAIXA', 'NORMAL', 'ALTA', 'URGENTE'),
        allowNull: false,
        defaultValue: 'NORMAL',
        comment: 'Prioridade de processamento',
      },
      viagem_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Referência à viagem associada (se aplicável)',
      },
      projeto: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Projeto ou cliente associado à despesa',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });

    // Índices para solicitacoes_reembolso
    await queryInterface.addIndex('solicitacoes_reembolso', ['numero'], { name: 'idx_solicitacoes_numero' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['status'], { name: 'idx_solicitacoes_status' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['solicitante_id'], { name: 'idx_solicitacoes_solicitante' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['categoria_id'], { name: 'idx_solicitacoes_categoria' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['centro_custo_id'], { name: 'idx_solicitacoes_centro_custo' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['data_despesa'], { name: 'idx_solicitacoes_data_despesa' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['data_submissao'], { name: 'idx_solicitacoes_data_submissao' });
    await queryInterface.addIndex('solicitacoes_reembolso', ['prioridade'], { name: 'idx_solicitacoes_prioridade' });

    // -----------------------------------------------------------------
    // TABELA: itens_despesa
    // Itens individuais de cada solicitação de reembolso
    // -----------------------------------------------------------------
    await queryInterface.createTable('itens_despesa', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      solicitacao_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'solicitacoes_reembolso',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Solicitação a qual este item pertence',
      },
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'categorias_despesa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      descricao: {
        type: DataTypes.STRING(300),
        allowNull: false,
        comment: 'Descrição do item de despesa',
      },
      data_despesa: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        comment: 'Data da despesa individual',
      },
      quantidade: {
        type: DataTypes.DECIMAL(10, 3),
        allowNull: false,
        defaultValue: 1.000,
        comment: 'Quantidade (para km rodados, diárias, etc.)',
      },
      valor_unitario: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Valor unitário do item',
      },
      valor_total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Valor total calculado (quantidade * valor_unitario)',
      },
      moeda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'BRL',
      },
      fornecedor: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Nome do fornecedor/estabelecimento',
      },
      cnpj_fornecedor: {
        type: DataTypes.STRING(18),
        allowNull: true,
        comment: 'CNPJ do fornecedor',
      },
      numero_nota_fiscal: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número da nota fiscal ou recibo',
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      metadados: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Metadados específicos do tipo de despesa (km, etc.)',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('itens_despesa', ['solicitacao_id'], { name: 'idx_itens_solicitacao' });
    await queryInterface.addIndex('itens_despesa', ['categoria_id'], { name: 'idx_itens_categoria' });
    await queryInterface.addIndex('itens_despesa', ['data_despesa'], { name: 'idx_itens_data' });

    // -----------------------------------------------------------------
    // TABELA: comprovantes
    // Arquivos comprobatórios das despesas
    // -----------------------------------------------------------------
    await queryInterface.createTable('comprovantes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      solicitacao_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'solicitacoes_reembolso',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      item_despesa_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'itens_despesa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      nome_original: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nome original do arquivo enviado',
      },
      nome_armazenado: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Nome do arquivo no sistema de armazenamento',
      },
      caminho: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Caminho relativo do arquivo no servidor',
      },
      tipo_mime: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Tipo MIME do arquivo',
      },
      tamanho: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Tamanho do arquivo em bytes',
      },
      hash_md5: {
        type: DataTypes.STRING(32),
        allowNull: true,
        comment: 'Hash MD5 para verificação de integridade',
      },
      enviado_por_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      descricao: {
        type: DataTypes.STRING(300),
        allowNull: true,
        comment: 'Descrição do comprovante',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('comprovantes', ['solicitacao_id'], { name: 'idx_comprovantes_solicitacao' });
    await queryInterface.addIndex('comprovantes', ['item_despesa_id'], { name: 'idx_comprovantes_item' });

    // -----------------------------------------------------------------
    // TABELA: aprovacoes
    // Registra cada etapa do fluxo de aprovação
    // -----------------------------------------------------------------
    await queryInterface.createTable('aprovacoes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      solicitacao_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'solicitacoes_reembolso',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      aprovador_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Usuário responsável por esta aprovação',
      },
      nivel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Nível no fluxo de aprovação (1, 2, 3...)',
      },
      status: {
        type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'DEVOLVIDO', 'EXPIRADO'),
        allowNull: false,
        defaultValue: 'PENDENTE',
        comment: 'Status desta etapa de aprovação',
      },
      comentario: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentário/justificativa do aprovador',
      },
      data_limite: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Prazo para esta aprovação',
      },
      data_acao: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data/hora em que a ação foi tomada',
      },
      ip_aprovacao: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'IP de onde a aprovação foi feita',
      },
      delegado_por_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Usuário original que delegou esta aprovação',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('aprovacoes', ['solicitacao_id'], { name: 'idx_aprovacoes_solicitacao' });
    await queryInterface.addIndex('aprovacoes', ['aprovador_id'], { name: 'idx_aprovacoes_aprovador' });
    await queryInterface.addIndex('aprovacoes', ['status'], { name: 'idx_aprovacoes_status' });
    await queryInterface.addIndex('aprovacoes', ['nivel'], { name: 'idx_aprovacoes_nivel' });

    // -----------------------------------------------------------------
    // TABELA: pagamentos
    // Registra os pagamentos/reembolsos efetuados
    // -----------------------------------------------------------------
    await queryInterface.createTable('pagamentos', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      solicitacao_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'solicitacoes_reembolso',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      numero_lote: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Número do lote de pagamento (vários pagamentos juntos)',
      },
      valor: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        comment: 'Valor do pagamento',
      },
      forma_pagamento: {
        type: DataTypes.ENUM(
          'TRANSFERENCIA_BANCARIA',
          'PIX',
          'BOLETO',
          'CHEQUE',
          'DINHEIRO',
          'VALE_REFEICAO',
          'CARTAO_CORPORATIVO'
        ),
        allowNull: false,
        defaultValue: 'PIX',
        comment: 'Forma de pagamento utilizada',
      },
      dados_bancarios: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Dados bancários utilizados para o pagamento',
      },
      status: {
        type: DataTypes.ENUM('AGENDADO', 'PROCESSANDO', 'CONCLUIDO', 'FALHOU', 'CANCELADO', 'ESTORNADO'),
        allowNull: false,
        defaultValue: 'AGENDADO',
      },
      data_agendamento: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      data_pagamento: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data efetiva de pagamento',
      },
      comprovante_pagamento: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Referência ao comprovante de pagamento',
      },
      codigo_transacao: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Código de transação bancária ou PIX',
      },
      processado_por_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Usuário financeiro que processou o pagamento',
      },
      observacoes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('pagamentos', ['solicitacao_id'], { name: 'idx_pagamentos_solicitacao' });
    await queryInterface.addIndex('pagamentos', ['status'], { name: 'idx_pagamentos_status' });
    await queryInterface.addIndex('pagamentos', ['numero_lote'], { name: 'idx_pagamentos_lote' });
    await queryInterface.addIndex('pagamentos', ['data_pagamento'], { name: 'idx_pagamentos_data' });

    // -----------------------------------------------------------------
    // TABELA: auditoria
    // Log de todas as ações realizadas no sistema
    // -----------------------------------------------------------------
    await queryInterface.createTable('auditoria', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'Usuário que realizou a ação (null = sistema)',
      },
      acao: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Ação realizada (ex: CRIAR_SOLICITACAO, APROVAR, REJEITAR)',
      },
      tabela: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Tabela afetada pela ação',
      },
      registro_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'ID do registro afetado',
      },
      dados_anteriores: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Estado dos dados antes da alteração',
      },
      dados_novos: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Estado dos dados após a alteração',
      },
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Endereço IP do usuário',
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'User-Agent do navegador/cliente',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição legível da ação',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('auditoria', ['usuario_id'], { name: 'idx_auditoria_usuario' });
    await queryInterface.addIndex('auditoria', ['acao'], { name: 'idx_auditoria_acao' });
    await queryInterface.addIndex('auditoria', ['tabela', 'registro_id'], { name: 'idx_auditoria_registro' });
    await queryInterface.addIndex('auditoria', ['created_at'], { name: 'idx_auditoria_data' });

    // -----------------------------------------------------------------
    // TABELA: notificacoes
    // Notificações enviadas para os usuários
    // -----------------------------------------------------------------
    await queryInterface.createTable('notificacoes', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Destinatário da notificação',
      },
      tipo: {
        type: DataTypes.ENUM(
          'SOLICITACAO_CRIADA',
          'SOLICITACAO_SUBMETIDA',
          'APROVACAO_PENDENTE',
          'SOLICITACAO_APROVADA',
          'SOLICITACAO_REJEITADA',
          'SOLICITACAO_DEVOLVIDA',
          'PAGAMENTO_PROCESSADO',
          'LEMBRETE_APROVACAO',
          'VENCIMENTO_PRAZO',
          'SISTEMA'
        ),
        allowNull: false,
        comment: 'Tipo da notificação',
      },
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      mensagem: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      dados: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Dados adicionais da notificação em JSON',
      },
      lida: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      lida_em: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      canal: {
        type: DataTypes.ENUM('EMAIL', 'PUSH', 'SMS', 'IN_APP'),
        allowNull: false,
        defaultValue: 'IN_APP',
        comment: 'Canal pelo qual a notificação foi enviada',
      },
      enviada: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      enviada_em: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      erro_envio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro caso o envio falhe',
      },
      solicitacao_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'solicitacoes_reembolso',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('notificacoes', ['usuario_id'], { name: 'idx_notificacoes_usuario' });
    await queryInterface.addIndex('notificacoes', ['lida'], { name: 'idx_notificacoes_lida' });
    await queryInterface.addIndex('notificacoes', ['tipo'], { name: 'idx_notificacoes_tipo' });
    await queryInterface.addIndex('notificacoes', ['created_at'], { name: 'idx_notificacoes_data' });

    // -----------------------------------------------------------------
    // TABELA: configuracoes_sistema
    // Configurações globais do sistema
    // -----------------------------------------------------------------
    await queryInterface.createTable('configuracoes_sistema', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      chave: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Chave única da configuração',
      },
      valor: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Valor da configuração',
      },
      tipo: {
        type: DataTypes.ENUM('STRING', 'NUMBER', 'BOOLEAN', 'JSON', 'DATE'),
        allowNull: false,
        defaultValue: 'STRING',
        comment: 'Tipo do valor para parsing correto',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição da configuração',
      },
      grupo: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Grupo de configurações relacionadas',
      },
      editavel: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Indica se pode ser editada pela interface administrativa',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('configuracoes_sistema', ['chave'], { name: 'idx_config_chave' });
    await queryInterface.addIndex('configuracoes_sistema', ['grupo'], { name: 'idx_config_grupo' });

    // -----------------------------------------------------------------
    // TABELA: tokens_refresh
    // Gerenciamento de tokens de refresh para autenticação
    // -----------------------------------------------------------------
    await queryInterface.createTable('tokens_refresh', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      usuario_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
        unique: true,
        comment: 'Token de refresh JWT',
      },
      expira_em: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Data/hora de expiração do token',
      },
      ip: {
        type: DataTypes.STRING(45),
        allowNull: true,
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      revogado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica se o token foi revogado/invalidado',
      },
      revogado_em: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('tokens_refresh', ['usuario_id'], { name: 'idx_tokens_usuario' });
    await queryInterface.addIndex('tokens_refresh', ['token'], { name: 'idx_tokens_token' });
    await queryInterface.addIndex('tokens_refresh', ['expira_em'], { name: 'idx_tokens_expiracao' });

    // -----------------------------------------------------------------
    // TABELA: politicas_aprovacao
    // Define as políticas/fluxos de aprovação por categoria/valor
    // -----------------------------------------------------------------
    await queryInterface.createTable('politicas_aprovacao', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      nome: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Nome da política de aprovação',
      },
      descricao: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      categoria_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'categorias_despesa',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Categoria a qual esta política se aplica (null = todas)',
      },
      valor_minimo: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Valor mínimo para aplicação desta política',
      },
      valor_maximo: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        comment: 'Valor máximo para aplicação desta política',
      },
      niveis: {
        type: DataTypes.JSONB,
        allowNull: false,
        comment: 'Configuração dos níveis de aprovação em JSON',
      },
      ativa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      prioridade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Prioridade quando múltiplas políticas se aplicam',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('politicas_aprovacao', ['categoria_id'], { name: 'idx_politicas_categoria' });
    await queryInterface.addIndex('politicas_aprovacao', ['ativa'], { name: 'idx_politicas_ativa' });

    // -----------------------------------------------------------------
    // TABELA: relatorios
    // Metadados e cache de relatórios gerados
    // -----------------------------------------------------------------
    await queryInterface.createTable('relatorios', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      tipo: {
        type: DataTypes.ENUM(
          'DESPESAS_POR_PERIODO',
          'DESPESAS_POR_CATEGORIA',
          'DESPESAS_POR_USUARIO',
          'DESPESAS_POR_CENTRO_CUSTO',
          'FLUXO_APROVACAO',
          'PAGAMENTOS',
          'RESUMO_EXECUTIVO',
          'AUDITORIA',
          'PERSONALIZADO'
        ),
        allowNull: false,
      },
      nome: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      parametros: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Parâmetros utilizados para gerar o relatório',
      },
      formato: {
        type: DataTypes.ENUM('PDF', 'XLSX', 'CSV', 'JSON'),
        allowNull: false,
        defaultValue: 'PDF',
      },
      caminho_arquivo: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Caminho do arquivo gerado',
      },
      status: {
        type: DataTypes.ENUM('PROCESSANDO', 'CONCLUIDO', 'FALHOU'),
        allowNull: false,
        defaultValue: 'PROCESSANDO',
      },
      gerado_por_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'usuarios',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      erro: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensagem de erro caso a geração falhe',
      },
      tamanho_arquivo: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expira_em: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Data de expiração do arquivo gerado',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    });

    await queryInterface.addIndex('relatorios', ['gerado_por_id'], { name: 'idx_relatorios_usuario' });
    await queryInterface.addIndex('relatorios', ['tipo'], { name: 'idx_relatorios_tipo' });
    await queryInterface.addIndex('relatorios', ['status'], { name: 'idx_relatorios_status' });
    await queryInterface.addIndex('relatorios', ['created_at'], { name: 'idx_relatorios_data' });
  },

  /**
   * Reverte a migration (remove as tabelas na ordem inversa)
   * @param {QueryInterface} queryInterface
   */
  down: async (queryInterface) => {
    await queryInterface.dropTable('relatorios');
    await queryInterface.dropTable('politicas_aprovacao');
    await queryInterface.dropTable('tokens_refresh');
    await queryInterface.dropTable('configuracoes_sistema');
    await queryInterface.dropTable('notificacoes');
    await queryInterface.dropTable('auditoria');
    await queryInterface.dropTable('pagamentos');
    await queryInterface.dropTable('aprovacoes');
    await queryInterface.dropTable('comprovantes');
    await queryInterface.dropTable('itens_despesa');
    await queryInterface.dropTable('solicitacoes_reembolso');
    await queryInterface.dropTable('centros_custo');
    await queryInterface.dropTable('categorias_despesa');
    await queryInterface.dropTable('usuarios');
  },
};
