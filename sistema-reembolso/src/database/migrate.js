'use strict';

// =============================================================================
// RUNNER DE MIGRATIONS
// Executa migrations de banco de dados de forma controlada e com log
// =============================================================================

const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { sequelize } = require('../config/database');
const { logger } = require('../config/logger');
const { QueryInterface } = require('sequelize');

/**
 * Tabela de controle de migrations executadas
 */
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Garante que a tabela de controle de migrations existe
 */
const ensureMigrationsTable = async () => {
  const qi = sequelize.getQueryInterface();
  const tables = await qi.showAllTables();

  if (!tables.includes(MIGRATIONS_TABLE)) {
    await qi.createTable(MIGRATIONS_TABLE, {
      id: {
        type: sequelize.constructor.DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      nome: {
        type: sequelize.constructor.DataTypes.STRING(255),
        allowNull: false,
        unique: true,
      },
      executada_em: {
        type: sequelize.constructor.DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.constructor.DataTypes.NOW,
      },
    });
    logger.info('Tabela de controle de migrations criada');
  }
};

/**
 * Retorna lista de migrations já executadas
 */
const getMigrationsExecutadas = async () => {
  const [results] = await sequelize.query(
    `SELECT nome FROM ${MIGRATIONS_TABLE} ORDER BY nome ASC`
  );
  return results.map(r => r.nome);
};

/**
 * Registra uma migration como executada
 */
const registrarMigration = async (nome) => {
  await sequelize.query(
    `INSERT INTO ${MIGRATIONS_TABLE} (nome, executada_em) VALUES (:nome, NOW())`,
    { replacements: { nome } }
  );
};

/**
 * Remove o registro de uma migration (rollback)
 */
const removerMigration = async (nome) => {
  await sequelize.query(
    `DELETE FROM ${MIGRATIONS_TABLE} WHERE nome = :nome`,
    { replacements: { nome } }
  );
};

/**
 * Executa todas as migrations pendentes
 */
const runMigrations = async () => {
  const migrationsDir = path.join(__dirname, 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.warn('Diretório de migrations não encontrado:', migrationsDir);
    return;
  }

  // Carrega arquivos de migration em ordem
  const arquivos = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .sort();

  if (arquivos.length === 0) {
    logger.info('Nenhuma migration encontrada');
    return;
  }

  await ensureMigrationsTable();
  const executadas = await getMigrationsExecutadas();
  const pendentes = arquivos.filter(f => !executadas.includes(f));

  if (pendentes.length === 0) {
    logger.info('Banco de dados atualizado. Nenhuma migration pendente.');
    return;
  }

  logger.info(`Executando ${pendentes.length} migration(s) pendente(s)...`);

  for (const arquivo of pendentes) {
    const caminhoArquivo = path.join(migrationsDir, arquivo);
    const migration = require(caminhoArquivo);

    try {
      logger.info(`Executando migration: ${arquivo}`);
      const transaction = await sequelize.transaction();

      try {
        await migration.up(sequelize.getQueryInterface(), sequelize);
        await registrarMigration(arquivo);
        await transaction.commit();
        logger.info(`Migration executada com sucesso: ${arquivo}`);
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error(`Erro ao executar migration ${arquivo}:`, {
        error: error.message,
        stack: error.stack,
      });
      process.exit(1);
    }
  }

  logger.info('Todas as migrations foram executadas com sucesso!');
};

/**
 * Reverte a última migration executada
 */
const rollbackMigration = async () => {
  await ensureMigrationsTable();
  const executadas = await getMigrationsExecutadas();

  if (executadas.length === 0) {
    logger.info('Nenhuma migration para reverter');
    return;
  }

  const ultima = executadas[executadas.length - 1];
  const caminhoArquivo = path.join(__dirname, 'migrations', ultima);

  if (!fs.existsSync(caminhoArquivo)) {
    logger.error(`Arquivo de migration não encontrado: ${ultima}`);
    process.exit(1);
  }

  const migration = require(caminhoArquivo);

  if (!migration.down) {
    logger.error(`Migration ${ultima} não possui função de rollback (down)`);
    process.exit(1);
  }

  try {
    logger.info(`Revertendo migration: ${ultima}`);
    const transaction = await sequelize.transaction();

    try {
      await migration.down(sequelize.getQueryInterface(), sequelize);
      await removerMigration(ultima);
      await transaction.commit();
      logger.info(`Migration revertida com sucesso: ${ultima}`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error(`Erro ao reverter migration ${ultima}:`, {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Execução via CLI
const comando = process.argv[2];

(async () => {
  try {
    await sequelize.authenticate();

    if (comando === 'rollback') {
      await rollbackMigration();
    } else {
      await runMigrations();
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Erro fatal ao executar migrations:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
})();

module.exports = { runMigrations, rollbackMigration };
