'use strict';

// =============================================================================
// TESTES UNITÁRIOS - AUTH SERVICE
// =============================================================================

jest.mock('../../src/repositories/UsuarioRepository');
jest.mock('../../src/repositories/index');
jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const jwt = require('jsonwebtoken');
const { authService } = require('../../src/services/AuthService');
const usuarioRepository = require('../../src/repositories/UsuarioRepository');
const { tokenRefreshRepository, auditoriaRepository } = require('../../src/repositories/index');
const { AppError } = require('../../src/utils/errors');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- LOGIN ----
  describe('login()', () => {
    const mockUsuario = {
      id: 'uuid-usuario-1',
      email: 'joao@empresa.com.br',
      nome: 'João Silva',
      perfil: 'COLABORADOR',
      ativo: true,
      primeiroAcesso: false,
      departamento: 'TI',
      tentativasLogin: 0,
      bloqueadoAte: null,
      estaBloqueado: jest.fn().mockReturnValue(false),
      verificarSenha: jest.fn().mockResolvedValue(true),
      resetarTentativasLogin: jest.fn().mockResolvedValue(undefined),
      registrarTentativaFalha: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn().mockReturnValue({
        id: 'uuid-usuario-1', email: 'joao@empresa.com.br', nome: 'João Silva',
        perfil: 'COLABORADOR', ativo: true,
      }),
    };

    it('deve realizar login com sucesso e retornar tokens', async () => {
      usuarioRepository.findByEmail.mockResolvedValue(mockUsuario);
      tokenRefreshRepository.create.mockResolvedValue({ id: 'token-id', token: 'refresh-token' });
      auditoriaRepository.registrar.mockResolvedValue(undefined);

      const resultado = await authService.login('joao@empresa.com.br', 'Senha@123', { ip: '127.0.0.1' });

      expect(resultado).toHaveProperty('accessToken');
      expect(resultado).toHaveProperty('refreshToken');
      expect(resultado).toHaveProperty('usuario');
      expect(resultado.usuario).not.toHaveProperty('senhaHash');
      expect(mockUsuario.verificarSenha).toHaveBeenCalledWith('Senha@123');
      expect(mockUsuario.resetarTentativasLogin).toHaveBeenCalled();
    });

    it('deve lançar AppError 401 quando usuário não existe', async () => {
      usuarioRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login('naoexiste@empresa.com.br', 'senha123')
      ).rejects.toThrow(AppError);

      await expect(
        authService.login('naoexiste@empresa.com.br', 'senha123')
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('deve lançar AppError 403 quando usuário está inativo', async () => {
      const usuarioInativo = { ...mockUsuario, ativo: false };
      usuarioRepository.findByEmail.mockResolvedValue(usuarioInativo);

      await expect(
        authService.login('joao@empresa.com.br', 'Senha@123')
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('deve lançar AppError 429 quando usuário está bloqueado', async () => {
      const usuarioBloqueado = {
        ...mockUsuario,
        estaBloqueado: jest.fn().mockReturnValue(true),
        bloqueadoAte: new Date(Date.now() + 30 * 60 * 1000),
      };
      usuarioRepository.findByEmail.mockResolvedValue(usuarioBloqueado);

      await expect(
        authService.login('joao@empresa.com.br', 'Senha@123')
      ).rejects.toMatchObject({ statusCode: 429 });
    });

    it('deve registrar tentativa falha quando senha está incorreta', async () => {
      const usuarioSenhaErrada = {
        ...mockUsuario,
        verificarSenha: jest.fn().mockResolvedValue(false),
      };
      usuarioRepository.findByEmail.mockResolvedValue(usuarioSenhaErrada);

      await expect(
        authService.login('joao@empresa.com.br', 'SenhaErrada')
      ).rejects.toMatchObject({ statusCode: 401 });

      expect(usuarioSenhaErrada.registrarTentativaFalha).toHaveBeenCalled();
    });
  });

  // ---- VERIFICAR TOKEN ----
  describe('verificarAccessToken()', () => {
    it('deve verificar token JWT válido e retornar payload', () => {
      const payload = { sub: 'uuid-1', email: 'test@test.com', perfil: 'COLABORADOR' };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'desenvolvimento-secret-nao-usar-em-producao', {
        expiresIn: '1h',
        issuer: 'sistema-reembolso',
        audience: 'api',
      });

      const decoded = authService.verificarAccessToken(token);
      expect(decoded.sub).toBe('uuid-1');
      expect(decoded.email).toBe('test@test.com');
    });

    it('deve lançar AppError 401 para token inválido', () => {
      expect(() => {
        authService.verificarAccessToken('token.invalido.aqui');
      }).toThrow(AppError);
    });

    it('deve lançar AppError 401 para token expirado', () => {
      const payload = { sub: 'uuid-1', email: 'test@test.com' };
      const token = jwt.sign(payload, process.env.JWT_SECRET || 'desenvolvimento-secret-nao-usar-em-producao', {
        expiresIn: '-1s', // Já expirado
        issuer: 'sistema-reembolso',
        audience: 'api',
      });

      expect(() => {
        authService.verificarAccessToken(token);
      }).toThrow(AppError);
    });
  });

  // ---- LOGOUT ----
  describe('logout()', () => {
    it('deve revogar o refresh token no logout', async () => {
      const mockToken = {
        id: 'token-id',
        usuarioId: 'uuid-1',
        update: jest.fn().mockResolvedValue(undefined),
      };
      tokenRefreshRepository.findByToken.mockResolvedValue(mockToken);
      auditoriaRepository.registrar.mockResolvedValue(undefined);

      await authService.logout('refresh-token-string', 'uuid-1');

      expect(mockToken.update).toHaveBeenCalledWith(
        expect.objectContaining({ revogado: true })
      );
    });
  });
});
