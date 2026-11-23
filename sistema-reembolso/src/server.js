'use strict';

// =============================================================================
// SERVIDOR HTTP - ENTRY POINT DA APLICAÇÃO
// Inicializa conexão com banco, jobs agendados e servidor HTTP
// =============================================================================

require('dotenv').config();

const http = require('http');
const { createApp } = require('./app');
const { testConnection, closeConnection } = require('./config/database');
const { logger } = require('./config/logger');
const config = require('./config/index');

// Importa e inicializa todos os models para o Sequelize registrar as associações
const { Usuario, PERFIS } = require('./models/Usuario');
const { SolicitacaoReembolso } = require('./models/SolicitacaoReembolso');
const {
  CategoriaDespesa, CentroCusto, ItemDespesa, Comprovante,
  Aprovacao, Pagamento, Notificacao, ConfiguracaoSistema,
  TokenRefresh, PoliticaAprovacao, Relatorio, Auditoria,
} = require('./models/index');

// Configura todas as associações entre models
const models = {
  Usuario, SolicitacaoReembolso, CategoriaDespesa, CentroCusto,
  ItemDespesa, Comprovante, Aprovacao, Pagamento, Notificacao,
  ConfiguracaoSistema, TokenRefresh, PoliticaAprovacao, Relatorio, Auditoria,
};

// Inicializa associações
Object.values(models).forEach(model => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

logger.info('Associações entre models configuradas');

/**
 * Inicializa e inicia o servidor HTTP
 */
const startServer = async () => {
  try {
    // 1. Verifica conexão com o banco de dados
    logger.info('Verificando conexão com o banco de dados...');
    await testConnection();

    // 2. Cria a aplicação Express
    const app = createApp();
    const server = http.createServer(app);

    // 3. Configura graceful shutdown
    const shutdown = async (signal) => {
      logger.info(`${signal} recebido. Iniciando graceful shutdown...`);

      server.close(async () => {
        logger.info('Servidor HTTP fechado');

        try {
          await closeConnection();
          logger.info('Conexão com banco de dados fechada');
          process.exit(0);
        } catch (error) {
          logger.error('Erro durante shutdown:', { error: error.message });
          process.exit(1);
        }
      });

      // Força encerramento após 30s se necessário
      setTimeout(() => {
        logger.error('Forçando encerramento após timeout de 30s');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // 4. Handler de erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('Exceção não capturada:', { error: error.message, stack: error.stack });
      if (!config.isDevelopment) {
        process.exit(1);
      }
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Promise rejeitada não tratada:', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    // 5. Inicia o servidor
    server.listen(config.port, () => {
      logger.info('='.repeat(60));
      logger.info('🚀 SISTEMA DE REEMBOLSO DE DESPESAS - INICIADO');
      logger.info('='.repeat(60));
      logger.info(`Ambiente:    ${config.env}`);
      logger.info(`Porta:       ${config.port}`);
      logger.info(`Banco:       ${config.database.host}:${config.database.port}/${config.database.name}`);
      logger.info(`API:         http://localhost:${config.port}/api`);
      logger.info(`Docs:        http://localhost:${config.port}/api/docs`);
      logger.info(`Health:      http://localhost:${config.port}/health`);
      logger.info('='.repeat(60));
    });

    return server;
  } catch (error) {
    logger.error('ERRO FATAL ao iniciar o servidor:', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

// Inicia o servidor se este arquivo for o entry point
if (require.main === module) {
  startServer();
}

module.exports = { startServer };
