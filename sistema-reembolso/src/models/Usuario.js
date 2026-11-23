'use strict';

// =============================================================================
// MODEL: USUARIO
// Representa um usuário do sistema com todos os seus atributos
// =============================================================================

const { DataTypes, Model } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database');
const config = require('../config');

/**
 * Perfis disponíveis no sistema
 */
const PERFIS = {
  ADMIN: 'ADMIN',
  GESTOR: 'GESTOR',
  APROVADOR: 'APROVADOR',
  FINANCEIRO: 'FINANCEIRO',
  COLABORADOR: 'COLABORADOR',
};

/**
 * @class Usuario
 * @extends Model
 * @description Modelo de usuário do sistema de reembolso
 */
class Usuario extends Model {
  /**
   * Verifica se a senha fornecida corresponde ao hash armazenado
   * @param {string} senha - Senha em texto puro para verificar
   * @returns {Promise<boolean>} true se a senha está correta
   */
  async verificarSenha(senha) {
    return bcrypt.compare(senha, this.senhaHash);
  }

  /**
   * Verifica se o usuário está bloqueado por tentativas de login
   * @returns {boolean} true se o usuário está atualmente bloqueado
   */
  estaBloqueado() {
    if (!this.bloqueadoAte) return false;
    return new Date() < new Date(this.bloqueadoAte);
  }

  /**
   * Incrementa o contador de tentativas de login falhas
   * Bloqueia o usuário após 5 tentativas por 30 minutos
   */
  async registrarTentativaFalha() {
    this.tentativasLogin = (this.tentativasLogin || 0) + 1;

    if (this.tentativasLogin >= 5) {
      const bloqueioMinutos = 30;
      this.bloqueadoAte = new Date(Date.now() + bloqueioMinutos * 60 * 1000);
    }

    await this.save({ fields: ['tentativasLogin', 'bloqueadoAte'] });
  }

  /**
   * Reseta as tentativas de login após login bem-sucedido
   */
  async resetarTentativasLogin() {
    this.tentativasLogin = 0;
    this.bloqueadoAte = null;
    this.ultimoLogin = new Date();
    await this.save({ fields: ['tentativasLogin', 'bloqueadoAte', 'ultimoLogin'] });
  }

  /**
   * Verifica se o usuário tem um perfil específico
   * @param {...string} perfis - Perfis a verificar
   * @returns {boolean}
   */
  temPerfil(...perfis) {
    return perfis.includes(this.perfil);
  }

  /**
   * Verifica se o usuário pode aprovar um determinado valor
   * @param {number} valor - Valor a ser aprovado
   * @returns {boolean}
   */
  podeAprovar(valor) {
    if (!this.temPerfil(PERFIS.APROVADOR, PERFIS.GESTOR, PERFIS.ADMIN, PERFIS.FINANCEIRO)) {
      return false;
    }
    if (!this.limiteAprovacao) return true; // Sem limite = ilimitado para admin
    return parseFloat(valor) <= parseFloat(this.limiteAprovacao);
  }

  /**
   * Retorna representação segura do usuário (sem dados sensíveis)
   * @returns {Object} Dados públicos do usuário
   */
  toJSON() {
    const values = super.toJSON();
    // Remove dados sensíveis da serialização padrão
    delete values.senhaHash;
    delete values.tokenResetSenha;
    delete values.tokenResetExpira;
    return values;
  }

  /**
   * Associações com outros models
   * @param {Object} models - Referências a todos os models
   */
  static associate(models) {
    // Um usuário tem um gestor (auto-relacionamento)
    Usuario.belongsTo(models.Usuario, {
      as: 'gestor',
      foreignKey: 'gestorId',
    });

    // Um usuário tem muitos subordinados
    Usuario.hasMany(models.Usuario, {
      as: 'subordinados',
      foreignKey: 'gestorId',
    });

    // Um usuário pode criar muitas solicitações
    Usuario.hasMany(models.SolicitacaoReembolso, {
      as: 'solicitacoes',
      foreignKey: 'solicitanteId',
    });

    // Um usuário pode ser responsável por centros de custo
    Usuario.hasMany(models.CentroCusto, {
      as: 'centrosCusto',
      foreignKey: 'responsavelId',
    });

    // Um usuário pode ter muitas aprovações pendentes
    Usuario.hasMany(models.Aprovacao, {
      as: 'aprovacoes',
      foreignKey: 'aprovadorId',
    });

    // Um usuário pode ter muitas notificações
    Usuario.hasMany(models.Notificacao, {
      as: 'notificacoes',
      foreignKey: 'usuarioId',
    });

    // Um usuário pode ter muitos tokens de refresh
    Usuario.hasMany(models.TokenRefresh, {
      as: 'tokensRefresh',
      foreignKey: 'usuarioId',
    });
  }
}

// Inicialização do modelo com Sequelize
Usuario.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      comment: 'Identificador único do usuário',
    },
    nome: {
      type: DataTypes.STRING(150),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Nome não pode ser vazio' },
        len: { args: [2, 150], msg: 'Nome deve ter entre 2 e 150 caracteres' },
      },
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: { msg: 'Este e-mail já está cadastrado' },
      validate: {
        isEmail: { msg: 'E-mail inválido' },
        notEmpty: { msg: 'E-mail não pode ser vazio' },
      },
      set(value) {
        this.setDataValue('email', value ? value.toLowerCase().trim() : value);
      },
    },
    senhaHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'senha_hash',
    },
    perfil: {
      type: DataTypes.ENUM(...Object.values(PERFIS)),
      allowNull: false,
      defaultValue: PERFIS.COLABORADOR,
      validate: {
        isIn: {
          args: [Object.values(PERFIS)],
          msg: 'Perfil inválido',
        },
      },
    },
    departamento: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    cargo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    matricula: {
      type: DataTypes.STRING(50),
      allowNull: true,
      unique: { msg: 'Esta matrícula já está cadastrada' },
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      validate: {
        // Valida formatos de telefone brasileiro
        is: {
          args: /^(\+55)?[\s.-]?\(?[1-9]{2}\)?[\s.-]?[0-9]{4,5}[\s.-]?[0-9]{4}$/,
          msg: 'Formato de telefone inválido',
        },
      },
    },
    cpf: {
      type: DataTypes.STRING(14),
      allowNull: true,
      unique: { msg: 'Este CPF já está cadastrado' },
    },
    limiteAprovacao: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0.00,
      field: 'limite_aprovacao',
      validate: {
        min: { args: [0], msg: 'Limite de aprovação não pode ser negativo' },
      },
    },
    gestorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'gestor_id',
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    primeiroAcesso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'primeiro_acesso',
    },
    ultimoLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'ultimo_login',
    },
    tentativasLogin: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'tentativas_login',
    },
    bloqueadoAte: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'bloqueado_ate',
    },
    tokenResetSenha: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'token_reset_senha',
    },
    tokenResetExpira: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'token_reset_expira',
    },
    avatarUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'avatar_url',
    },
    configuracoes: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: 'Usuario',
    tableName: 'usuarios',
    underscored: true,
    timestamps: true,
    paranoid: true, // Soft delete
    hooks: {
      /**
       * Faz hash da senha antes de criar o usuário
       */
      beforeCreate: async (usuario) => {
        if (usuario.senhaHash) {
          usuario.senhaHash = await bcrypt.hash(
            usuario.senhaHash,
            config.security.bcryptRounds
          );
        }
      },
      /**
       * Faz hash da nova senha antes de atualizar (somente se mudou)
       */
      beforeUpdate: async (usuario) => {
        if (usuario.changed('senhaHash')) {
          usuario.senhaHash = await bcrypt.hash(
            usuario.senhaHash,
            config.security.bcryptRounds
          );
        }
      },
    },
    scopes: {
      ativo: { where: { ativo: true } },
      aprovadores: { where: { perfil: [PERFIS.APROVADOR, PERFIS.GESTOR, PERFIS.ADMIN, PERFIS.FINANCEIRO] } },
    },
  }
);

module.exports = { Usuario, PERFIS };
