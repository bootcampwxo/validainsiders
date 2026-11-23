'use strict';

// =============================================================================
// USUARIO REPOSITORY
// Operações de acesso a dados para o modelo Usuario
// =============================================================================

const { Op } = require('sequelize');
const BaseRepository = require('./BaseRepository');
const { Usuario } = require('../models/Usuario');

/**
 * @class UsuarioRepository
 * @extends BaseRepository
 */
class UsuarioRepository extends BaseRepository {
  constructor() {
    super(Usuario);
  }

  /**
   * Busca usuário pelo e-mail com todos os dados (incluindo senha hash)
   * @param {string} email - E-mail do usuário
   * @returns {Promise<Usuario|null>}
   */
  async findByEmail(email) {
    return Usuario.findOne({
      where: { email: email.toLowerCase().trim() },
    });
  }

  /**
   * Busca usuário pelo CPF
   * @param {string} cpf - CPF no formato 000.000.000-00
   * @returns {Promise<Usuario|null>}
   */
  async findByCPF(cpf) {
    return Usuario.findOne({ where: { cpf } });
  }

  /**
   * Busca usuário pela matrícula
   * @param {string} matricula
   * @returns {Promise<Usuario|null>}
   */
  async findByMatricula(matricula) {
    return Usuario.findOne({ where: { matricula } });
  }

  /**
   * Busca usuário pelo token de reset de senha
   * @param {string} token
   * @returns {Promise<Usuario|null>}
   */
  async findByTokenReset(token) {
    return Usuario.findOne({
      where: {
        tokenResetSenha: token,
        tokenResetExpira: { [Op.gt]: new Date() }, // Token ainda não expirou
      },
    });
  }

  /**
   * Busca usuários com paginação e filtros avançados
   * @param {Object} filtros
   * @param {string} filtros.busca - Busca por nome, email ou matrícula
   * @param {string} filtros.perfil - Filtrar por perfil
   * @param {string} filtros.departamento - Filtrar por departamento
   * @param {boolean} filtros.ativo - Filtrar por status ativo
   * @param {number} filtros.page
   * @param {number} filtros.pageSize
   * @returns {Promise<Object>}
   */
  async findWithFilters({
    busca,
    perfil,
    departamento,
    ativo,
    gestorId,
    page = 1,
    pageSize = 20,
    order = [['nome', 'ASC']],
  } = {}) {
    const where = {};

    // Busca por texto em múltiplos campos
    if (busca) {
      where[Op.or] = [
        { nome: { [Op.iLike]: `%${busca}%` } },
        { email: { [Op.iLike]: `%${busca}%` } },
        { matricula: { [Op.iLike]: `%${busca}%` } },
        { departamento: { [Op.iLike]: `%${busca}%` } },
      ];
    }

    if (perfil) where.perfil = perfil;
    if (departamento) where.departamento = { [Op.iLike]: `%${departamento}%` };
    if (ativo !== undefined) where.ativo = ativo;
    if (gestorId) where.gestorId = gestorId;

    return this.findPaginated({
      where,
      page,
      pageSize,
      order,
      include: [
        {
          model: Usuario,
          as: 'gestor',
          attributes: ['id', 'nome', 'email', 'cargo'],
          required: false,
        },
      ],
      attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
    });
  }

  /**
   * Busca subordinados diretos de um gestor
   * @param {string} gestorId - ID do gestor
   * @returns {Promise<Usuario[]>}
   */
  async findSubordinados(gestorId) {
    return Usuario.findAll({
      where: { gestorId, ativo: true },
      attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
      order: [['nome', 'ASC']],
    });
  }

  /**
   * Busca usuários aptos a aprovar um determinado valor
   * @param {number} valor - Valor a ser aprovado
   * @returns {Promise<Usuario[]>}
   */
  async findAprovadoresParaValor(valor) {
    return Usuario.findAll({
      where: {
        ativo: true,
        perfil: { [Op.in]: ['APROVADOR', 'GESTOR', 'ADMIN', 'FINANCEIRO'] },
        [Op.or]: [
          { limiteAprovacao: null },
          { limiteAprovacao: { [Op.gte]: valor } },
        ],
      },
      attributes: ['id', 'nome', 'email', 'perfil', 'limiteAprovacao'],
      order: [['nome', 'ASC']],
    });
  }

  /**
   * Obtém estatísticas de usuários por perfil
   * @returns {Promise<Object[]>}
   */
  async getEstatisticasPorPerfil() {
    return this.rawQuery(`
      SELECT
        perfil,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE ativo = true) as ativos,
        COUNT(*) FILTER (WHERE ativo = false) as inativos
      FROM usuarios
      WHERE deleted_at IS NULL
      GROUP BY perfil
      ORDER BY perfil
    `);
  }

  /**
   * Busca usuários de um departamento específico
   * @param {string} departamento
   * @returns {Promise<Usuario[]>}
   */
  async findByDepartamento(departamento) {
    return Usuario.findAll({
      where: { departamento, ativo: true },
      attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
      order: [['nome', 'ASC']],
    });
  }

  /**
   * Lista departamentos distintos
   * @returns {Promise<string[]>}
   */
  async listDepartamentos() {
    const results = await this.rawQuery(`
      SELECT DISTINCT departamento
      FROM usuarios
      WHERE departamento IS NOT NULL
        AND deleted_at IS NULL
        AND ativo = true
      ORDER BY departamento
    `);
    return results.map(r => r.departamento);
  }

  /**
   * Atualiza o último login do usuário
   * @param {string} id - ID do usuário
   * @returns {Promise<void>}
   */
  async updateUltimoLogin(id) {
    await Usuario.update(
      { ultimoLogin: new Date(), tentativasLogin: 0, bloqueadoAte: null },
      { where: { id } }
    );
  }
}

module.exports = new UsuarioRepository();
