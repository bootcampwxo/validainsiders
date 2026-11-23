'use strict';

// =============================================================================
// CONFIGURAÇÃO DO BANCO DE DADOS COM SEQUELIZE
// Instância singleton do Sequelize com suporte a PostgreSQL
// =============================================================================

const { Sequelize } = require('sequelize');
const config = require('./index');
const { logger } = require('./logger');

/**
 * Instância única do Sequelize (Singleton)
 */
let sequelizeInstance = null;

/**
 * Cria e retorna a instância do Sequelize
 * @returns {Sequelize} Instância configurada do Sequelize
 */
const getSequelizeInstance = () => {
  if (sequelizeInstance) {
    return sequelizeInstance;
  }

  const dbConfig = config.database;

  sequelizeInstance = new Sequelize(
    dbConfig.name,
    dbConfig.username,
    dbConfig.password,
    {
      host: dbConfig.host,
      port: dbConfig.port,
      dialect: dbConfig.dialect,
      pool: dbConfig.pool,
      dialectOptions: dbConfig.ssl ? { ssl: dbConfig.ssl } : {},
      logging: dbConfig.logging
        ? (sql) => logger.debug('SQL Query:', { sql })
        : false,
      define: {
        // Converte nomes de tabelas para snake_case automaticamente
        underscored: true,
        // Adiciona timestamps created_at e updated_at
        timestamps: true,
        // Não deleta fisicamente os registros (soft delete)
        paranoid: false,
      },
      timezone: '-03:00', // Horário de Brasília
    }
  );

  return sequelizeInstance;
};

/**
 * Instância global do Sequelize
 */
const sequelize = getSequelizeInstance();

/**
 * Testa a conexão com o banco de dados
 * @returns {Promise<boolean>} true se a conexão foi estabelecida com sucesso
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Conexão com PostgreSQL estabelecida com sucesso', {
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
    });
    return true;
  } catch (error) {
    logger.error('Erro ao conectar com PostgreSQL', {
      error: error.message,
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
    });
    throw error;
  }
};

/**
 * Fecha a conexão com o banco de dados
 * @returns {Promise<void>}
 */
const closeConnection = async () => {
  try {
    await sequelize.close();
    logger.info('Conexão com PostgreSQL fechada');
  } catch (error) {
    logger.error('Erro ao fechar conexão com PostgreSQL', { error: error.message });
  }
};

module.exports = {
  sequelize,
  testConnection,
  closeConnection,
  Sequelize,
};
