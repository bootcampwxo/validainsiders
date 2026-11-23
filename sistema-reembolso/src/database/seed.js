'use strict';

// =============================================================================
// SEED DO BANCO DE DADOS
// Popula o banco com dados iniciais para funcionamento do sistema
// =============================================================================

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { sequelize, testConnection } = require('../config/database');
const { logger } = require('../config/logger');
const config = require('../config');

// Importa e registra os models
const { Usuario, PERFIS } = require('../models/Usuario');
const {
  CategoriaDespesa, CentroCusto, ConfiguracaoSistema,
  PoliticaAprovacao,
} = require('../models/index');

/**
 * Dados iniciais de categorias de despesa
 */
const categoriasSeed = [
  { nome: 'Alimentação', codigo: 'ALIM', icone: '🍽️', cor: '#059669', ordem: 1, limitePadrao: 150.00, requerComprovante: true },
  { nome: 'Transporte', codigo: 'TRAN', icone: '🚗', cor: '#1a56db', ordem: 2, limitePadrao: 300.00, requerComprovante: true },
  { nome: 'Hospedagem', codigo: 'HOSP', icone: '🏨', cor: '#7c3aed', ordem: 3, requerComprovante: true },
  { nome: 'Combustível', codigo: 'COMB', icone: '⛽', cor: '#d97706', ordem: 4, limitePadrao: 400.00, requerComprovante: true },
  { nome: 'Material de Escritório', codigo: 'MESC', icone: '📎', cor: '#6b7280', ordem: 5, requerComprovante: false },
  { nome: 'Educação e Treinamento', codigo: 'EDUC', icone: '📚', cor: '#0891b2', ordem: 6, requerComprovante: true },
  { nome: 'Saúde', codigo: 'SAUD', icone: '💊', cor: '#dc2626', ordem: 7, requerComprovante: true },
  { nome: 'Entretenimento Corporativo', codigo: 'ENCO', icone: '🎉', cor: '#db2777', ordem: 8, limitePadrao: 500.00, requerComprovante: true, requerJustificativa: true },
  { nome: 'Viagem Internacional', codigo: 'VINT', icone: '✈️', cor: '#ea580c', ordem: 9, requerComprovante: true, requerJustificativa: true },
  { nome: 'Telecom e Internet', codigo: 'TELC', icone: '📡', cor: '#16a34a', ordem: 10, requerComprovante: false },
  { nome: 'Manutenção', codigo: 'MANU', icone: '🔧', cor: '#78716c', ordem: 11, requerComprovante: true },
  { nome: 'Software e Licenças', codigo: 'SOFT', icone: '💻', cor: '#4f46e5', ordem: 12, requerComprovante: true },
  { nome: 'Outros', codigo: 'OUTR', icone: '📦', cor: '#9ca3af', ordem: 99, requerComprovante: false },
];

/**
 * Dados iniciais de centros de custo
 */
const centrosCustoSeed = [
  { codigo: 'CC-TI', nome: 'Tecnologia da Informação', orcamentoMensal: 50000.00, orcamentoAnual: 600000.00 },
  { codigo: 'CC-RH', nome: 'Recursos Humanos', orcamentoMensal: 20000.00, orcamentoAnual: 240000.00 },
  { codigo: 'CC-COM', nome: 'Comercial e Vendas', orcamentoMensal: 80000.00, orcamentoAnual: 960000.00 },
  { codigo: 'CC-MKT', nome: 'Marketing', orcamentoMensal: 30000.00, orcamentoAnual: 360000.00 },
  { codigo: 'CC-FIN', nome: 'Financeiro', orcamentoMensal: 15000.00, orcamentoAnual: 180000.00 },
  { codigo: 'CC-DIR', nome: 'Diretoria', orcamentoMensal: 100000.00, orcamentoAnual: 1200000.00 },
  { codigo: 'CC-OPS', nome: 'Operações', orcamentoMensal: 60000.00, orcamentoAnual: 720000.00 },
  { codigo: 'CC-LOG', nome: 'Logística', orcamentoMensal: 40000.00, orcamentoAnual: 480000.00 },
];

/**
 * Configurações iniciais do sistema
 */
const configuracoesSeed = [
  { chave: 'SISTEMA_NOME', valor: 'Sistema de Reembolso de Despesas', tipo: 'STRING', descricao: 'Nome do sistema', grupo: 'SISTEMA' },
  { chave: 'SISTEMA_EMPRESA', valor: 'Sua Empresa Ltda.', tipo: 'STRING', descricao: 'Nome da empresa', grupo: 'SISTEMA' },
  { chave: 'LIMITE_AUTO_APROVACAO', valor: '100.00', tipo: 'NUMBER', descricao: 'Valor máximo para aprovação automática (R$)', grupo: 'APROVACAO' },
  { chave: 'PRAZO_APROVACAO_DIAS', valor: '7', tipo: 'NUMBER', descricao: 'Prazo em dias para aprovação antes de expirar', grupo: 'APROVACAO' },
  { chave: 'MAX_COMPROVANTES_POR_SOLICITACAO', valor: '10', tipo: 'NUMBER', descricao: 'Número máximo de comprovantes por solicitação', grupo: 'UPLOAD' },
  { chave: 'MOEDA_PADRAO', valor: 'BRL', tipo: 'STRING', descricao: 'Moeda padrão do sistema', grupo: 'SISTEMA' },
  { chave: 'NOTIFICACOES_EMAIL_ATIVO', valor: 'true', tipo: 'BOOLEAN', descricao: 'Ativa envio de notificações por e-mail', grupo: 'NOTIFICACOES' },
  { chave: 'LEMBRETE_APROVACAO_HORAS', valor: '48', tipo: 'NUMBER', descricao: 'Horas sem ação para enviar lembrete ao aprovador', grupo: 'NOTIFICACOES' },
  { chave: 'POLITICA_SENHA_MINIMO_CHARS', valor: '8', tipo: 'NUMBER', descricao: 'Tamanho mínimo de senha', grupo: 'SEGURANCA' },
  { chave: 'MAX_TENTATIVAS_LOGIN', valor: '5', tipo: 'NUMBER', descricao: 'Máximo de tentativas antes de bloquear conta', grupo: 'SEGURANCA' },
  { chave: 'PERIODO_BLOQUEIO_MINUTOS', valor: '30', tipo: 'NUMBER', descricao: 'Tempo de bloqueio após exceder tentativas (minutos)', grupo: 'SEGURANCA' },
  { chave: 'RELATORIO_EXPIRACAO_HORAS', valor: '24', tipo: 'NUMBER', descricao: 'Horas de validade de um relatório gerado', grupo: 'RELATORIOS' },
];

/**
 * Usuários iniciais do sistema
 */
const usuariosSeed = async () => {
  const bcryptRounds = config.security.bcryptRounds;

  return [
    {
      nome: 'Administrador do Sistema',
      email: 'admin@empresa.com.br',
      senhaHash: await bcrypt.hash('Admin@123', bcryptRounds),
      perfil: PERFIS.ADMIN,
      departamento: 'TI',
      cargo: 'Administrador',
      matricula: 'ADM-001',
      ativo: true,
      primeiroAcesso: false,
      limiteAprovacao: 999999.99,
    },
    {
      nome: 'Maria Gestora',
      email: 'maria.gestora@empresa.com.br',
      senhaHash: await bcrypt.hash('Senha@123', bcryptRounds),
      perfil: PERFIS.GESTOR,
      departamento: 'Comercial',
      cargo: 'Gestora Comercial',
      matricula: 'COM-001',
      ativo: true,
      primeiroAcesso: false,
      limiteAprovacao: 10000.00,
    },
    {
      nome: 'Carlos Aprovador',
      email: 'carlos.aprovador@empresa.com.br',
      senhaHash: await bcrypt.hash('Senha@123', bcryptRounds),
      perfil: PERFIS.APROVADOR,
      departamento: 'Financeiro',
      cargo: 'Analista Financeiro Sênior',
      matricula: 'FIN-001',
      ativo: true,
      primeiroAcesso: false,
      limiteAprovacao: 5000.00,
    },
    {
      nome: 'Ana Financeiro',
      email: 'ana.financeiro@empresa.com.br',
      senhaHash: await bcrypt.hash('Senha@123', bcryptRounds),
      perfil: PERFIS.FINANCEIRO,
      departamento: 'Financeiro',
      cargo: 'Coordenadora Financeira',
      matricula: 'FIN-002',
      ativo: true,
      primeiroAcesso: false,
    },
    {
      nome: 'João Colaborador',
      email: 'joao.colaborador@empresa.com.br',
      senhaHash: await bcrypt.hash('Senha@123', bcryptRounds),
      perfil: PERFIS.COLABORADOR,
      departamento: 'Comercial',
      cargo: 'Consultor de Vendas',
      matricula: 'COM-002',
      ativo: true,
      primeiroAcesso: false,
    },
    {
      nome: 'Pedro Colaborador',
      email: 'pedro.colaborador@empresa.com.br',
      senhaHash: await bcrypt.hash('Senha@123', bcryptRounds),
      perfil: PERFIS.COLABORADOR,
      departamento: 'TI',
      cargo: 'Desenvolvedor',
      matricula: 'TI-001',
      ativo: true,
      primeiroAcesso: false,
    },
  ];
};

/**
 * Política de aprovação padrão
 */
const politicasSeed = (gestorId) => [
  {
    nome: 'Aprovação Simples (até R$ 500)',
    descricao: 'Despesas de até R$ 500 requerem apenas 1 nível de aprovação',
    valorMinimo: 0.01,
    valorMaximo: 500.00,
    niveis: [{ nivel: 1, aprovadorId: gestorId }],
    ativa: true,
    prioridade: 10,
  },
  {
    nome: 'Aprovação Dupla (R$ 500 a R$ 2.000)',
    descricao: 'Despesas entre R$ 500 e R$ 2.000 requerem 2 níveis de aprovação',
    valorMinimo: 500.01,
    valorMaximo: 2000.00,
    niveis: [
      { nivel: 1, aprovadorId: gestorId },
      { nivel: 2, aprovadorId: gestorId },
    ],
    ativa: true,
    prioridade: 5,
  },
];

/**
 * Função principal de seed
 */
const runSeed = async () => {
  try {
    logger.info('Iniciando seed do banco de dados...');
    await testConnection();

    // 1. Categorias de despesa
    logger.info('Criando categorias de despesa...');
    for (const categoria of categoriasSeed) {
      const [cat] = await CategoriaDespesa.findOrCreate({
        where: { codigo: categoria.codigo },
        defaults: categoria,
      });
      if (cat.wasBuilt) logger.info(`  Categoria criada: ${categoria.nome}`);
    }

    // 2. Centros de custo
    logger.info('Criando centros de custo...');
    for (const centro of centrosCustoSeed) {
      const [cc] = await CentroCusto.findOrCreate({
        where: { codigo: centro.codigo },
        defaults: centro,
      });
    }

    // 3. Configurações do sistema
    logger.info('Criando configurações do sistema...');
    for (const cfg of configuracoesSeed) {
      await ConfiguracaoSistema.findOrCreate({
        where: { chave: cfg.chave },
        defaults: cfg,
      });
    }

    // 4. Usuários
    logger.info('Criando usuários iniciais...');
    const usuarios = await usuariosSeed();
    const usuariosCriados = {};

    for (const usuario of usuarios) {
      const [u, criado] = await Usuario.findOrCreate({
        where: { email: usuario.email },
        defaults: usuario,
      });
      usuariosCriados[usuario.email] = u;
      if (criado) logger.info(`  Usuário criado: ${usuario.nome} (${usuario.email})`);
    }

    // 5. Atualiza relações de gestor (gestora lidera o colaborador)
    const gestor = usuariosCriados['maria.gestora@empresa.com.br'];
    const colaborador = usuariosCriados['joao.colaborador@empresa.com.br'];
    if (gestor && colaborador && !colaborador.gestorId) {
      await colaborador.update({ gestorId: gestor.id });
    }

    // 6. Políticas de aprovação (usando gestor como aprovador)
    if (gestor) {
      logger.info('Criando políticas de aprovação...');
      const politicas = politicasSeed(gestor.id);
      for (const politica of politicas) {
        const existente = await PoliticaAprovacao.findOne({ where: { nome: politica.nome } });
        if (!existente) {
          await PoliticaAprovacao.create(politica);
          logger.info(`  Política criada: ${politica.nome}`);
        }
      }
    }

    logger.info('');
    logger.info('✅ Seed concluído com sucesso!');
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('USUÁRIOS CRIADOS (use essas credenciais para testar):');
    logger.info('='.repeat(60));
    logger.info('Admin:        admin@empresa.com.br         | Admin@123');
    logger.info('Gestor:       maria.gestora@empresa.com.br | Senha@123');
    logger.info('Aprovador:    carlos.aprovador@empresa.com.br | Senha@123');
    logger.info('Financeiro:   ana.financeiro@empresa.com.br | Senha@123');
    logger.info('Colaborador:  joao.colaborador@empresa.com.br | Senha@123');
    logger.info('='.repeat(60));
    logger.info('');
    logger.info('Documentação: http://localhost:3000/api/docs');
    logger.info('');

  } catch (error) {
    logger.error('Erro ao executar seed:', { error: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
};

runSeed();
