'use strict';

// =============================================================================
// BASE REPOSITORY
// Classe base com operações CRUD genéricas para todos os repositórios
// =============================================================================

const { Op } = require('sequelize');
const config = require('../config');

/**
 * @class BaseRepository
 * @description Repositório base com operações CRUD e paginação genéricas
 */
class BaseRepository {
  /**
   * @param {Model} model - Modelo Sequelize
   */
  constructor(model) {
    this.model = model;
  }

  /**
   * Busca um registro pelo ID
   * @param {string} id - UUID do registro
   * @param {Object} options - Opções adicionais (include, attributes, etc.)
   * @returns {Promise<Model|null>}
   */
  async findById(id, options = {}) {
    return this.model.findByPk(id, options);
  }

  /**
   * Busca um único registro por critério
   * @param {Object} where - Critério de busca
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Model|null>}
   */
  async findOne(where, options = {}) {
    return this.model.findOne({ where, ...options });
  }

  /**
   * Busca todos os registros que atendem ao critério
   * @param {Object} where - Critério de busca
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Model[]>}
   */
  async findAll(where = {}, options = {}) {
    return this.model.findAll({ where, ...options });
  }

  /**
   * Busca com paginação e filtros
   * @param {Object} params - Parâmetros de busca
   * @param {number} params.page - Número da página (1-indexed)
   * @param {number} params.pageSize - Tamanho da página
   * @param {Object} params.where - Filtros
   * @param {Array} params.order - Ordenação
   * @param {Array} params.include - Associações a incluir
   * @param {Array} params.attributes - Atributos a retornar
   * @returns {Promise<{rows: Model[], count: number, totalPages: number, currentPage: number}>}
   */
  async findPaginated({
    page = 1,
    pageSize = config.pagination.defaultPageSize,
    where = {},
    order = [['createdAt', 'DESC']],
    include = [],
    attributes,
  } = {}) {
    // Limita o tamanho máximo da página
    const size = Math.min(pageSize, config.pagination.maxPageSize);
    const offset = (page - 1) * size;

    const { rows, count } = await this.model.findAndCountAll({
      where,
      order,
      include,
      attributes,
      limit: size,
      offset,
      distinct: include.length > 0, // Necessário para contagem correta com JOINs
    });

    return {
      rows,
      count,
      totalPages: Math.ceil(count / size),
      currentPage: parseInt(page, 10),
      pageSize: size,
      hasNextPage: page < Math.ceil(count / size),
      hasPrevPage: page > 1,
    };
  }

  /**
   * Cria um novo registro
   * @param {Object} data - Dados do registro
   * @param {Object} options - Opções adicionais (transaction, etc.)
   * @returns {Promise<Model>}
   */
  async create(data, options = {}) {
    return this.model.create(data, options);
  }

  /**
   * Cria múltiplos registros em lote
   * @param {Object[]} data - Array de dados
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Model[]>}
   */
  async bulkCreate(data, options = {}) {
    return this.model.bulkCreate(data, options);
  }

  /**
   * Atualiza um registro pelo ID
   * @param {string} id - UUID do registro
   * @param {Object} data - Dados a atualizar
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Model|null>}
   */
  async updateById(id, data, options = {}) {
    const registro = await this.findById(id);
    if (!registro) return null;
    return registro.update(data, options);
  }

  /**
   * Atualiza registros por critério
   * @param {Object} where - Critério
   * @param {Object} data - Dados a atualizar
   * @param {Object} options - Opções adicionais
   * @returns {Promise<[number, Model[]]>}
   */
  async updateWhere(where, data, options = {}) {
    return this.model.update(data, { where, returning: true, ...options });
  }

  /**
   * Remove um registro pelo ID (soft delete se paranoid=true)
   * @param {string} id - UUID do registro
   * @param {Object} options - Opções adicionais
   * @returns {Promise<boolean>}
   */
  async deleteById(id, options = {}) {
    const registro = await this.findById(id);
    if (!registro) return false;
    await registro.destroy(options);
    return true;
  }

  /**
   * Conta registros por critério
   * @param {Object} where - Critério de busca
   * @returns {Promise<number>}
   */
  async count(where = {}) {
    return this.model.count({ where });
  }

  /**
   * Verifica se existe um registro com o critério
   * @param {Object} where - Critério de busca
   * @returns {Promise<boolean>}
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Obtém a soma de um campo numérico
   * @param {string} campo - Nome do campo
   * @param {Object} where - Filtros
   * @returns {Promise<number>}
   */
  async sum(campo, where = {}) {
    const result = await this.model.sum(campo, { where });
    return result || 0;
  }

  /**
   * Obtém a média de um campo numérico
   * @param {string} campo - Nome do campo
   * @param {Object} where - Filtros
   * @returns {Promise<number>}
   */
  async avg(campo, where = {}) {
    const result = await this.model.aggregate(campo, 'avg', { where });
    return result || 0;
  }

  /**
   * Busca ou cria um registro
   * @param {Object} where - Critério de busca
   * @param {Object} defaults - Dados padrão para criação
   * @returns {Promise<[Model, boolean]>} [registro, foiCriado]
   */
  async findOrCreate(where, defaults = {}) {
    return this.model.findOrCreate({ where, defaults });
  }

  /**
   * Executa uma query SQL raw com segurança
   * @param {string} sql - Query SQL com parâmetros nomeados
   * @param {Object} replacements - Valores para substituição
   * @param {string} type - Tipo de query (SELECT, INSERT, etc.)
   * @returns {Promise<any>}
   */
  async rawQuery(sql, replacements = {}, type = 'SELECT') {
    const { sequelize } = this.model;
    const [results] = await sequelize.query(sql, {
      replacements,
      type: sequelize.QueryTypes[type],
    });
    return results;
  }
}

module.exports = BaseRepository;
