'use strict';

// =============================================================================
// USUARIO CONTROLLER
// CRUD completo de usuários com validações
// =============================================================================

const { body, param, query } = require('express-validator');
const { usuarioService } = require('../services/UsuarioService');
const { validar } = require('../middlewares/index');

/**
 * Validações de entrada para criação de usuário
 */
const validacoesCriar = [
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório')
    .isLength({ min: 2, max: 150 }).withMessage('Nome deve ter entre 2 e 150 caracteres'),
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
  body('perfil').optional().isIn(['ADMIN', 'GESTOR', 'APROVADOR', 'FINANCEIRO', 'COLABORADOR'])
    .withMessage('Perfil inválido'),
  body('departamento').optional().isLength({ max: 100 }),
  body('cargo').optional().isLength({ max: 100 }),
  body('matricula').optional().isLength({ max: 50 }),
  body('cpf').optional().matches(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/).withMessage('CPF inválido (formato: 000.000.000-00)'),
  body('limiteAprovacao').optional().isFloat({ min: 0 }).withMessage('Limite de aprovação inválido'),
  validar,
];

/**
 * Validações para atualização
 */
const validacoesAtualizar = [
  body('nome').optional().trim().isLength({ min: 2, max: 150 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('departamento').optional().isLength({ max: 100 }),
  body('cargo').optional().isLength({ max: 100 }),
  body('telefone').optional().isMobilePhone('pt-BR'),
  validar,
];

/**
 * Validações para troca de senha
 */
const validacoesTrocarSenha = [
  body('senhaAtual').notEmpty().withMessage('Senha atual é obrigatória'),
  body('novaSenha').isLength({ min: 8 }).withMessage('Nova senha deve ter pelo menos 8 caracteres'),
  body('confirmarSenha').custom((value, { req }) => {
    if (value !== req.body.novaSenha) throw new Error('Confirmação de senha não confere');
    return true;
  }),
  validar,
];

/**
 * @class UsuarioController
 */
class UsuarioController {
  /**
   * GET /usuarios
   * Lista usuários com filtros e paginação
   */
  async listar(req, res, next) {
    try {
      const filtros = {
        busca: req.query.busca,
        perfil: req.query.perfil,
        departamento: req.query.departamento,
        ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined,
        gestorId: req.query.gestorId,
        page: req.paginacao.page,
        pageSize: req.paginacao.pageSize,
      };

      const resultado = await usuarioService.listar(filtros, req.usuarioLogado);

      res.json({
        sucesso: true,
        dados: resultado.rows,
        paginacao: {
          total: resultado.count,
          pagina: resultado.currentPage,
          tamanhoPagina: resultado.pageSize,
          totalPaginas: resultado.totalPages,
          temProxima: resultado.hasNextPage,
          temAnterior: resultado.hasPrevPage,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /usuarios/:id
   * Busca usuário por ID
   */
  async buscarPorId(req, res, next) {
    try {
      const usuario = await usuarioService.buscarPorId(req.params.id, req.usuarioLogado);
      res.json({ sucesso: true, dados: usuario });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /usuarios
   * Cria novo usuário (apenas admin)
   */
  async criar(req, res, next) {
    try {
      const usuario = await usuarioService.criar(req.body, req.usuarioLogado);
      res.status(201).json({
        sucesso: true,
        mensagem: 'Usuário criado com sucesso. As credenciais foram enviadas por e-mail.',
        dados: usuario,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /usuarios/:id
   * Atualiza dados do usuário
   */
  async atualizar(req, res, next) {
    try {
      const usuario = await usuarioService.atualizar(req.params.id, req.body, req.usuarioLogado);
      res.json({
        sucesso: true,
        mensagem: 'Usuário atualizado com sucesso.',
        dados: usuario,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /usuarios/:id/desativar
   * Desativa um usuário
   */
  async desativar(req, res, next) {
    try {
      await usuarioService.desativar(req.params.id, req.usuarioLogado);
      res.json({ sucesso: true, mensagem: 'Usuário desativado com sucesso.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /usuarios/:id/reativar
   * Reativa um usuário desativado
   */
  async reativar(req, res, next) {
    try {
      await usuarioService.reativar(req.params.id, req.usuarioLogado);
      res.json({ sucesso: true, mensagem: 'Usuário reativado com sucesso.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /usuarios/:id/senha
   * Troca a senha do usuário
   */
  async trocarSenha(req, res, next) {
    try {
      const { senhaAtual, novaSenha } = req.body;
      await usuarioService.trocarSenha(req.params.id, senhaAtual, novaSenha, req.usuarioLogado);
      res.json({ sucesso: true, mensagem: 'Senha alterada com sucesso.' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /usuarios/estatisticas
   * Retorna estatísticas de usuários (apenas admin)
   */
  async getEstatisticas(req, res, next) {
    try {
      const stats = await usuarioService.getEstatisticas();
      res.json({ sucesso: true, dados: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /usuarios/departamentos
   * Lista departamentos disponíveis
   */
  async getDepartamentos(req, res, next) {
    try {
      const departamentos = await require('../repositories/UsuarioRepository').listDepartamentos();
      res.json({ sucesso: true, dados: departamentos });
    } catch (error) {
      next(error);
    }
  }
}

const usuarioController = new UsuarioController();

module.exports = {
  usuarioController,
  validacoesCriar,
  validacoesAtualizar,
  validacoesTrocarSenha,
};
