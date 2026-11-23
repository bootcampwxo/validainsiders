'use strict';

// =============================================================================
// ROUTER PRINCIPAL - TODAS AS ROTAS DA API
// =============================================================================

const express = require('express');
const router = express.Router();

const { autenticar, autorizar, paginacao } = require('../middlewares/index');
const { PERFIS } = require('../models/Usuario');

// Controllers
const { authController, validacoesLogin } = require('../controllers/AuthController');
const { usuarioController, validacoesCriar: validUsuarioCriar, validacoesAtualizar: validUsuarioAtualizar, validacoesTrocarSenha } = require('../controllers/UsuarioController');
const { solicitacaoController, validacoesCriar: validSolCriar, validacoesAcaoAprovacao, validacoesRejeitar, upload } = require('../controllers/SolicitacaoController');
const { pagamentoController, categoriaController, centroCustoController, notificacaoController, auditoriaController, relatorioController } = require('../controllers/index');

// =============================================================================
// ROTAS DE AUTENTICAÇÃO (públicas)
// =============================================================================

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autenticar usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, senha]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: admin@empresa.com.br
 *               senha:
 *                 type: string
 *                 example: Senha@123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/auth/login', validacoesLogin, authController.login.bind(authController));
router.post('/auth/refresh', authController.refresh.bind(authController));
router.post('/auth/solicitar-reset', authController.solicitarReset.bind(authController));
router.post('/auth/redefinir-senha', authController.redefinirSenha.bind(authController));

// Rotas autenticadas de autenticação
router.post('/auth/logout', autenticar, authController.logout.bind(authController));
router.post('/auth/logout-todos', autenticar, authController.logoutTodos.bind(authController));

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Dados do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 */
router.get('/auth/me', autenticar, authController.me.bind(authController));

// =============================================================================
// ROTAS DE USUÁRIOS
// =============================================================================

/**
 * @swagger
 * /usuarios:
 *   get:
 *     summary: Lista usuários com filtros e paginação
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *         description: Busca por nome, email ou matrícula
 *       - in: query
 *         name: perfil
 *         schema: { type: string, enum: [ADMIN, GESTOR, APROVADOR, FINANCEIRO, COLABORADOR] }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: tamanho
 *         schema: { type: integer, default: 20 }
 */
router.get('/usuarios', autenticar, paginacao, usuarioController.listar.bind(usuarioController));
router.get('/usuarios/estatisticas', autenticar, autorizar(PERFIS.ADMIN), usuarioController.getEstatisticas.bind(usuarioController));
router.get('/usuarios/departamentos', autenticar, usuarioController.getDepartamentos.bind(usuarioController));

/**
 * @swagger
 * /usuarios/{id}:
 *   get:
 *     summary: Busca usuário por ID
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 */
router.get('/usuarios/:id', autenticar, usuarioController.buscarPorId.bind(usuarioController));

/**
 * @swagger
 * /usuarios:
 *   post:
 *     summary: Cria novo usuário (apenas admin)
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 */
router.post('/usuarios', autenticar, autorizar(PERFIS.ADMIN), validUsuarioCriar, usuarioController.criar.bind(usuarioController));

/**
 * @swagger
 * /usuarios/{id}:
 *   put:
 *     summary: Atualiza dados do usuário
 *     tags: [Usuários]
 */
router.put('/usuarios/:id', autenticar, validUsuarioAtualizar, usuarioController.atualizar.bind(usuarioController));
router.patch('/usuarios/:id/desativar', autenticar, autorizar(PERFIS.ADMIN), usuarioController.desativar.bind(usuarioController));
router.patch('/usuarios/:id/reativar', autenticar, autorizar(PERFIS.ADMIN), usuarioController.reativar.bind(usuarioController));
router.put('/usuarios/:id/senha', autenticar, validacoesTrocarSenha, usuarioController.trocarSenha.bind(usuarioController));

// =============================================================================
// ROTAS DE SOLICITAÇÕES DE REEMBOLSO
// =============================================================================

/**
 * @swagger
 * /solicitacoes:
 *   get:
 *     summary: Lista solicitações com filtros e paginação
 *     tags: [Solicitações]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [RASCUNHO, SUBMETIDA, EM_ANALISE, APROVADA, REJEITADA, CANCELADA, EM_PAGAMENTO, PAGA, DEVOLVIDA]
 *       - in: query
 *         name: dataInicio
 *         schema: { type: string, format: date }
 *         description: Data inicial (YYYY-MM-DD)
 *       - in: query
 *         name: dataFim
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: busca
 *         schema: { type: string }
 *         description: Busca por número, título ou projeto
 *       - in: query
 *         name: valorMin
 *         schema: { type: number }
 *       - in: query
 *         name: valorMax
 *         schema: { type: number }
 *       - in: query
 *         name: pagina
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: tamanho
 *         schema: { type: integer, default: 20 }
 */
router.get('/solicitacoes', autenticar, paginacao, solicitacaoController.listar.bind(solicitacaoController));
router.get('/solicitacoes/dashboard', autenticar, solicitacaoController.getDashboard.bind(solicitacaoController));
router.get('/solicitacoes/admin/totais', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.GESTOR), solicitacaoController.getAdminTotais.bind(solicitacaoController));

/**
 * @swagger
 * /solicitacoes/{id}:
 *   get:
 *     summary: Busca solicitação completa por ID
 *     tags: [Solicitações]
 *     security:
 *       - bearerAuth: []
 */
router.get('/solicitacoes/:id', autenticar, solicitacaoController.buscarPorId.bind(solicitacaoController));

/**
 * @swagger
 * /solicitacoes:
 *   post:
 *     summary: Cria nova solicitação de reembolso
 *     tags: [Solicitações]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CriarSolicitacao'
 */
router.post('/solicitacoes', autenticar, validSolCriar, solicitacaoController.criar.bind(solicitacaoController));
router.put('/solicitacoes/:id', autenticar, solicitacaoController.atualizar.bind(solicitacaoController));

// Ações de fluxo
router.patch('/solicitacoes/:id/submeter', autenticar, solicitacaoController.submeter.bind(solicitacaoController));
router.patch('/solicitacoes/:id/aprovar', autenticar, autorizar(PERFIS.APROVADOR, PERFIS.GESTOR, PERFIS.ADMIN, PERFIS.FINANCEIRO), validacoesAcaoAprovacao, solicitacaoController.aprovar.bind(solicitacaoController));
router.patch('/solicitacoes/:id/rejeitar', autenticar, autorizar(PERFIS.APROVADOR, PERFIS.GESTOR, PERFIS.ADMIN), validacoesRejeitar, solicitacaoController.rejeitar.bind(solicitacaoController));
router.patch('/solicitacoes/:id/devolver', autenticar, autorizar(PERFIS.APROVADOR, PERFIS.GESTOR, PERFIS.ADMIN), validacoesAcaoAprovacao, solicitacaoController.devolver.bind(solicitacaoController));
router.patch('/solicitacoes/:id/cancelar', autenticar, solicitacaoController.cancelar.bind(solicitacaoController));

// Upload de comprovantes
router.post('/solicitacoes/:id/comprovantes', autenticar, upload.array('arquivos', 10), solicitacaoController.uploadComprovante.bind(solicitacaoController));
router.get('/solicitacoes/:id/comprovantes', autenticar, solicitacaoController.listarComprovantes.bind(solicitacaoController));

// =============================================================================
// ROTAS DE PAGAMENTOS
// =============================================================================

/**
 * @swagger
 * /pagamentos:
 *   get:
 *     summary: Lista pagamentos
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 */
router.get('/pagamentos', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO), paginacao, pagamentoController.listar.bind(pagamentoController));
router.post('/pagamentos', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO), pagamentoController.registrar.bind(pagamentoController));
router.patch('/pagamentos/:id/confirmar', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO), pagamentoController.confirmar.bind(pagamentoController));
router.get('/pagamentos/totais', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO), pagamentoController.getTotais.bind(pagamentoController));

// =============================================================================
// ROTAS DE CATEGORIAS
// =============================================================================

/**
 * @swagger
 * /categorias:
 *   get:
 *     summary: Lista categorias de despesa
 *     tags: [Categorias]
 */
router.get('/categorias', autenticar, paginacao, categoriaController.listar.bind(categoriaController));
router.get('/categorias/hierarquia', autenticar, categoriaController.listarHierarquia.bind(categoriaController));
router.get('/categorias/:id', autenticar, categoriaController.buscarPorId.bind(categoriaController));
router.post('/categorias', autenticar, autorizar(PERFIS.ADMIN), categoriaController.criar.bind(categoriaController));
router.put('/categorias/:id', autenticar, autorizar(PERFIS.ADMIN), categoriaController.atualizar.bind(categoriaController));
router.patch('/categorias/:id/desativar', autenticar, autorizar(PERFIS.ADMIN), categoriaController.desativar.bind(categoriaController));

// =============================================================================
// ROTAS DE CENTROS DE CUSTO
// =============================================================================

/**
 * @swagger
 * /centros-custo:
 *   get:
 *     summary: Lista centros de custo
 *     tags: [Centros de Custo]
 */
router.get('/centros-custo', autenticar, paginacao, centroCustoController.listar.bind(centroCustoController));
router.get('/centros-custo/orcamento', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.GESTOR), centroCustoController.getRelatorioOrcamento.bind(centroCustoController));
router.get('/centros-custo/:id', autenticar, centroCustoController.buscarPorId.bind(centroCustoController));
router.post('/centros-custo', autenticar, autorizar(PERFIS.ADMIN), centroCustoController.criar.bind(centroCustoController));
router.put('/centros-custo/:id', autenticar, autorizar(PERFIS.ADMIN, PERFIS.GESTOR), centroCustoController.atualizar.bind(centroCustoController));

// =============================================================================
// ROTAS DE NOTIFICAÇÕES
// =============================================================================

/**
 * @swagger
 * /notificacoes:
 *   get:
 *     summary: Lista notificações do usuário logado
 *     tags: [Notificações]
 *     security:
 *       - bearerAuth: []
 */
router.get('/notificacoes', autenticar, notificacaoController.listarMinhas.bind(notificacaoController));
router.get('/notificacoes/count', autenticar, notificacaoController.countNaoLidas.bind(notificacaoController));
router.post('/notificacoes/marcar-lidas', autenticar, notificacaoController.marcarComoLidas.bind(notificacaoController));

// =============================================================================
// ROTAS DE AUDITORIA (apenas admin)
// =============================================================================

/**
 * @swagger
 * /auditoria:
 *   get:
 *     summary: Lista registros de auditoria
 *     tags: [Auditoria]
 *     security:
 *       - bearerAuth: []
 */
router.get('/auditoria', autenticar, autorizar(PERFIS.ADMIN), paginacao, auditoriaController.listar.bind(auditoriaController));
router.get('/auditoria/:tabela/:registroId', autenticar, autorizar(PERFIS.ADMIN), paginacao, auditoriaController.getHistoricoRegistro.bind(auditoriaController));

// =============================================================================
// ROTAS DE RELATÓRIOS
// =============================================================================

/**
 * @swagger
 * /relatorios:
 *   get:
 *     summary: Lista relatórios gerados
 *     tags: [Relatórios]
 *     security:
 *       - bearerAuth: []
 */
router.get('/relatorios', autenticar, paginacao, relatorioController.listar.bind(relatorioController));
router.post('/relatorios/por-periodo', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.GESTOR), relatorioController.gerarPorPeriodo.bind(relatorioController));
router.post('/relatorios/por-categoria', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO, PERFIS.GESTOR), relatorioController.gerarPorCategoria.bind(relatorioController));
router.post('/relatorios/resumo-executivo', autenticar, autorizar(PERFIS.ADMIN, PERFIS.FINANCEIRO), relatorioController.gerarResumoExecutivo.bind(relatorioController));
router.get('/relatorios/:id/download', autenticar, relatorioController.download.bind(relatorioController));

module.exports = router;
