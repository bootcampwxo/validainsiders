'use strict';

// =============================================================================
// TESTES UNITÁRIOS - USUARIO SERVICE
// =============================================================================

jest.mock('../../src/repositories/UsuarioRepository');
jest.mock('../../src/repositories/index');
jest.mock('../../src/services/NotificacaoService', () => ({
  notificacaoService: { enviarBoasVindas: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('../../src/config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

const { usuarioService } = require('../../src/services/UsuarioService');
const usuarioRepository = require('../../src/repositories/UsuarioRepository');
const { auditoriaRepository } = require('../../src/repositories/index');
const { AppError } = require('../../src/utils/errors');

describe('UsuarioService', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  // ---- CRIAR ----
  describe('criar()', () => {
    const adminLogado = {
      id: 'uuid-admin',
      nome: 'Admin',
      perfil: 'ADMIN',
      temPerfil: jest.fn().mockReturnValue(true),
    };

    const dadosUsuario = {
      nome: 'Maria Souza',
      email: 'maria@empresa.com.br',
      perfil: 'COLABORADOR',
      departamento: 'RH',
    };

    it('deve criar usuário com sucesso', async () => {
      usuarioRepository.findByEmail.mockResolvedValue(null);
      usuarioRepository.findByCPF.mockResolvedValue(null);
      usuarioRepository.findByMatricula.mockResolvedValue(null);
      usuarioRepository.create.mockResolvedValue({
        id: 'uuid-novo-usuario',
        ...dadosUsuario,
        toJSON: () => ({ id: 'uuid-novo-usuario', ...dadosUsuario }),
      });
      auditoriaRepository.registrar.mockResolvedValue(undefined);

      const resultado = await usuarioService.criar(dadosUsuario, adminLogado);

      expect(resultado).toBeDefined();
      expect(usuarioRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: dadosUsuario.email,
          primeiroAcesso: true,
        })
      );
    });

    it('deve lançar AppError 403 quando não é admin', async () => {
      const naoAdmin = { ...adminLogado, temPerfil: jest.fn().mockReturnValue(false) };

      await expect(
        usuarioService.criar(dadosUsuario, naoAdmin)
      ).rejects.toMatchObject({ statusCode: 403 });

      expect(usuarioRepository.create).not.toHaveBeenCalled();
    });

    it('deve lançar AppError 409 para e-mail duplicado', async () => {
      usuarioRepository.findByEmail.mockResolvedValue({ id: 'outro-usuario' });

      await expect(
        usuarioService.criar(dadosUsuario, adminLogado)
      ).rejects.toMatchObject({ statusCode: 409 });
    });

    it('deve lançar AppError 409 para CPF duplicado', async () => {
      usuarioRepository.findByEmail.mockResolvedValue(null);
      usuarioRepository.findByCPF.mockResolvedValue({ id: 'outro-usuario' });

      await expect(
        usuarioService.criar({ ...dadosUsuario, cpf: '123.456.789-00' }, adminLogado)
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  // ---- DESATIVAR ----
  describe('desativar()', () => {
    const adminLogado = {
      id: 'uuid-admin',
      nome: 'Admin',
      temPerfil: jest.fn().mockReturnValue(true),
    };

    it('deve desativar usuário com sucesso', async () => {
      const mockUsuario = {
        id: 'uuid-outro',
        nome: 'Outro',
        update: jest.fn().mockResolvedValue(undefined),
      };
      usuarioRepository.findById.mockResolvedValue(mockUsuario);
      auditoriaRepository.registrar.mockResolvedValue(undefined);

      await usuarioService.desativar('uuid-outro', adminLogado);

      expect(mockUsuario.update).toHaveBeenCalledWith({ ativo: false });
    });

    it('deve lançar AppError quando admin tenta desativar a si mesmo', async () => {
      const adminLogadoComId = { ...adminLogado, id: 'uuid-admin' };

      await expect(
        usuarioService.desativar('uuid-admin', adminLogadoComId)
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('deve lançar AppError 404 quando usuário não encontrado', async () => {
      usuarioRepository.findById.mockResolvedValue(null);

      await expect(
        usuarioService.desativar('uuid-inexistente', adminLogado)
      ).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  // ---- VALIDAÇÃO DE SENHA ----
  describe('_validarComplexidadeSenha()', () => {
    it('deve aceitar senha com todos os critérios', () => {
      expect(() => {
        usuarioService._validarComplexidadeSenha('Senha@123');
      }).not.toThrow();
    });

    it('deve rejeitar senha muito curta', () => {
      expect(() => {
        usuarioService._validarComplexidadeSenha('S@1');
      }).toThrow(AppError);
    });

    it('deve rejeitar senha sem maiúscula', () => {
      expect(() => {
        usuarioService._validarComplexidadeSenha('senha@123');
      }).toThrow(AppError);
    });

    it('deve rejeitar senha sem caractere especial', () => {
      expect(() => {
        usuarioService._validarComplexidadeSenha('Senha1234');
      }).toThrow(AppError);
    });

    it('deve rejeitar senha sem número', () => {
      expect(() => {
        usuarioService._validarComplexidadeSenha('Senha@abc');
      }).toThrow(AppError);
    });
  });
});
