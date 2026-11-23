'use strict';

// =============================================================================
// AUTH CONTROLLER
// Endpoints de autenticação: login, refresh, logout, reset de senha
// =============================================================================

const { body } = require('express-validator');
const { authService } = require('../services/AuthService');
const { validar } = require('../middlewares/index');

/**
 * Validações para o endpoint de login
 */
const validacoesLogin = [
  body('email').isEmail().normalizeEmail().withMessage('E-mail inválido'),
  body('senha').notEmpty().withMessage('Senha é obrigatória'),
  validar,
];

/**
 * @class AuthController
 */
class AuthController {
  /**
   * POST /auth/login
   * Autentica o usuário e retorna tokens JWT
   */
  async login(req, res, next) {
    try {
      const { email, senha } = req.body;
      const reqInfo = {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      };

      const resultado = await authService.login(email, senha, reqInfo);

      // Cookie seguro para o refresh token
      res.cookie('refreshToken', resultado.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        path: '/api/auth',
      });

      res.json({
        sucesso: true,
        mensagem: 'Login realizado com sucesso.',
        dados: {
          usuario: resultado.usuario,
          accessToken: resultado.accessToken,
          primeiroAcesso: resultado.primeiroAcesso,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/refresh
   * Renova o access token usando refresh token
   */
  async refresh(req, res, next) {
    try {
      // Aceita token no cookie ou no body
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          sucesso: false,
          mensagem: 'Refresh token não fornecido.',
        });
      }

      const { accessToken, refreshToken: novoRefreshToken } = await authService.renovarToken(
        refreshToken,
        { ip: req.ip, userAgent: req.get('User-Agent') }
      );

      // Renova o cookie
      res.cookie('refreshToken', novoRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth',
      });

      res.json({
        sucesso: true,
        dados: { accessToken },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout
   * Revoga o refresh token e invalida a sessão
   */
  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await authService.logout(refreshToken, req.usuarioLogado.id);

      // Limpa o cookie
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.json({
        sucesso: true,
        mensagem: 'Logout realizado com sucesso.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/logout-todos
   * Revoga todos os tokens (logout em todos os dispositivos)
   */
  async logoutTodos(req, res, next) {
    try {
      await authService.logoutTodos(req.usuarioLogado.id);
      res.clearCookie('refreshToken', { path: '/api/auth' });

      res.json({
        sucesso: true,
        mensagem: 'Logout realizado em todos os dispositivos.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /auth/me
   * Retorna os dados do usuário autenticado
   */
  async me(req, res) {
    res.json({
      sucesso: true,
      dados: req.usuarioLogado,
    });
  }

  /**
   * POST /auth/solicitar-reset
   * Envia e-mail de reset de senha
   */
  async solicitarReset(req, res, next) {
    try {
      const { email } = req.body;
      const { usuarioService } = require('../services/UsuarioService');
      await usuarioService.solicitarResetSenha(email);

      // Resposta genérica (não revela se o e-mail existe)
      res.json({
        sucesso: true,
        mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções em breve.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /auth/redefinir-senha
   * Redefine a senha usando o token recebido por e-mail
   */
  async redefinirSenha(req, res, next) {
    try {
      const { token, novaSenha } = req.body;
      const { usuarioService } = require('../services/UsuarioService');
      await usuarioService.redefinirSenha(token, novaSenha);

      res.json({
        sucesso: true,
        mensagem: 'Senha redefinida com sucesso. Faça login com sua nova senha.',
      });
    } catch (error) {
      next(error);
    }
  }
}

const authController = new AuthController();

module.exports = {
  authController,
  validacoesLogin,
};
