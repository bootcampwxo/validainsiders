'use strict';

// =============================================================================
// AUTH SERVICE
// Autenticação, autorização e gerenciamento de tokens JWT
// =============================================================================

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const usuarioRepository = require('../repositories/UsuarioRepository');
const { tokenRefreshRepository, auditoriaRepository } = require('../repositories/index');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * @class AuthService
 * @description Serviço de autenticação com JWT e refresh tokens
 */
class AuthService {
  /**
   * Realiza login do usuário com e-mail e senha
   * @param {string} email - E-mail do usuário
   * @param {string} senha - Senha em texto puro
   * @param {Object} reqInfo - Informações da requisição (ip, userAgent)
   * @returns {Promise<{usuario: Object, accessToken: string, refreshToken: string}>}
   */
  async login(email, senha, { ip, userAgent } = {}) {
    // Busca o usuário com todos os dados (incluindo senhaHash)
    const usuario = await usuarioRepository.findByEmail(email);

    if (!usuario) {
      // Log de tentativa sem revelar que o usuário não existe
      logger.warn('Tentativa de login com e-mail não cadastrado', { email, ip });
      throw new AppError('Credenciais inválidas.', 401);
    }

    // Verifica se a conta está ativa
    if (!usuario.ativo) {
      logger.warn('Tentativa de login em conta inativa', { usuarioId: usuario.id, ip });
      throw new AppError('Conta desativada. Entre em contato com o suporte.', 403);
    }

    // Verifica se está bloqueado por tentativas excessivas
    if (usuario.estaBloqueado()) {
      const minutosRestantes = Math.ceil(
        (new Date(usuario.bloqueadoAte) - new Date()) / 60000
      );
      logger.warn('Tentativa de login em conta bloqueada', { usuarioId: usuario.id, ip });
      throw new AppError(
        `Conta temporariamente bloqueada. Tente novamente em ${minutosRestantes} minuto(s).`,
        429
      );
    }

    // Verifica a senha
    const senhaCorreta = await usuario.verificarSenha(senha);
    if (!senhaCorreta) {
      await usuario.registrarTentativaFalha();
      logger.warn('Senha incorreta', {
        usuarioId: usuario.id,
        tentativas: usuario.tentativasLogin,
        ip,
      });
      throw new AppError('Credenciais inválidas.', 401);
    }

    // Login bem-sucedido: reseta contadores e atualiza último login
    await usuario.resetarTentativasLogin();

    // Gera tokens
    const { accessToken, refreshToken } = await this._gerarTokens(usuario, ip, userAgent);

    // Registra auditoria de login
    await auditoriaRepository.registrar({
      usuarioId: usuario.id,
      acao: 'LOGIN',
      tabela: 'usuarios',
      registroId: usuario.id,
      ip,
      userAgent,
      descricao: `Login bem-sucedido: ${usuario.nome} (${usuario.email})`,
    });

    logger.info('Login realizado com sucesso', { usuarioId: usuario.id, email: usuario.email });

    return {
      usuario: this._sanitizarUsuario(usuario),
      accessToken,
      refreshToken,
      primeiroAcesso: usuario.primeiroAcesso,
    };
  }

  /**
   * Renova o access token usando o refresh token
   * @param {string} refreshTokenStr - Refresh token armazenado
   * @param {Object} reqInfo - Informações da requisição
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   */
  async renovarToken(refreshTokenStr, { ip, userAgent } = {}) {
    // Busca o token no banco
    const tokenRecord = await tokenRefreshRepository.findByToken(refreshTokenStr);

    if (!tokenRecord) {
      throw new AppError('Refresh token inválido.', 401);
    }

    if (tokenRecord.revogado) {
      logger.warn('Tentativa de uso de refresh token revogado', {
        tokenId: tokenRecord.id,
        usuarioId: tokenRecord.usuarioId,
        ip,
      });
      // Possível roubo de token: revoga todos os tokens do usuário
      await tokenRefreshRepository.revogarPorUsuario(tokenRecord.usuarioId);
      throw new AppError('Token inválido. Faça login novamente.', 401);
    }

    if (tokenRecord.expirou()) {
      throw new AppError('Sessão expirada. Faça login novamente.', 401);
    }

    // Busca usuário
    const usuario = await usuarioRepository.findById(tokenRecord.usuarioId);
    if (!usuario || !usuario.ativo) {
      throw new AppError('Usuário inativo ou não encontrado.', 401);
    }

    // Revoga o token antigo (rotation: um token = um uso)
    await tokenRecord.update({ revogado: true, revogadoEm: new Date() });

    // Gera novos tokens
    const { accessToken, refreshToken } = await this._gerarTokens(usuario, ip, userAgent);

    return { accessToken, refreshToken };
  }

  /**
   * Realiza logout revogando o refresh token
   * @param {string} refreshTokenStr - Token a revogar
   * @param {string} usuarioId - ID do usuário
   */
  async logout(refreshTokenStr, usuarioId) {
    if (refreshTokenStr) {
      const tokenRecord = await tokenRefreshRepository.findByToken(refreshTokenStr);
      if (tokenRecord && tokenRecord.usuarioId === usuarioId) {
        await tokenRecord.update({ revogado: true, revogadoEm: new Date() });
      }
    }

    await auditoriaRepository.registrar({
      usuarioId,
      acao: 'LOGOUT',
      tabela: 'usuarios',
      registroId: usuarioId,
      descricao: 'Logout realizado',
    });

    logger.info('Logout realizado', { usuarioId });
  }

  /**
   * Revoga todos os tokens de um usuário (logout em todos os dispositivos)
   * @param {string} usuarioId
   */
  async logoutTodos(usuarioId) {
    await tokenRefreshRepository.revogarPorUsuario(usuarioId);

    await auditoriaRepository.registrar({
      usuarioId,
      acao: 'LOGOUT_TODOS',
      tabela: 'usuarios',
      registroId: usuarioId,
      descricao: 'Logout realizado em todos os dispositivos',
    });
  }

  /**
   * Verifica e decodifica um access token JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload decodificado
   */
  verificarAccessToken(token) {
    try {
      return jwt.verify(token, config.jwt.secret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token expirado. Renove sua sessão.', 401);
      }
      throw new AppError('Token inválido.', 401);
    }
  }

  /**
   * Gera access token e refresh token para um usuário
   * @param {Usuario} usuario - Instância do model
   * @param {string} ip - IP da requisição
   * @param {string} userAgent - User-agent do cliente
   * @returns {Promise<{accessToken: string, refreshToken: string}>}
   * @private
   */
  async _gerarTokens(usuario, ip, userAgent) {
    // Payload do access token (curta duração)
    const payload = {
      sub: usuario.id,
      email: usuario.email,
      nome: usuario.nome,
      perfil: usuario.perfil,
      departamento: usuario.departamento,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'sistema-reembolso',
      audience: 'api',
    });

    // Gera refresh token opaco (armazenado no banco)
    const refreshTokenStr = crypto.randomBytes(64).toString('hex');
    const expiraEm = new Date();
    expiraEm.setDate(expiraEm.getDate() + 7); // 7 dias

    await tokenRefreshRepository.create({
      usuarioId: usuario.id,
      token: refreshTokenStr,
      expiraEm,
      ip,
      userAgent,
    });

    return { accessToken, refreshToken: refreshTokenStr };
  }

  /**
   * Remove campos sensíveis do objeto usuário
   * @param {Usuario} usuario
   * @returns {Object}
   * @private
   */
  _sanitizarUsuario(usuario) {
    const dados = usuario.toJSON ? usuario.toJSON() : { ...usuario };
    delete dados.senhaHash;
    delete dados.tokenResetSenha;
    delete dados.tokenResetExpira;
    return dados;
  }
}

const authService = new AuthService();
module.exports = { authService };
