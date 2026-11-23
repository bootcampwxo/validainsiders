'use strict';

// =============================================================================
// USUARIO SERVICE
// Lógica de negócio para gerenciamento de usuários
// =============================================================================

const crypto = require('crypto');
const { Usuario, PERFIS } = require('../models/Usuario');
const usuarioRepository = require('../repositories/UsuarioRepository');
const { auditoriaRepository } = require('../repositories/index');
const { notificacaoService } = require('./NotificacaoService');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

/**
 * @class UsuarioService
 * @description Serviço com toda a lógica de negócio de usuários
 */
class UsuarioService {
  /**
   * Lista usuários com filtros e paginação
   * @param {Object} filtros - Filtros de busca
   * @param {Object} usuarioLogado - Usuário realizando a busca
   * @returns {Promise<Object>}
   */
  async listar(filtros, usuarioLogado) {
    // Colaboradores só podem ver seus colegas do mesmo departamento
    if (usuarioLogado.perfil === PERFIS.COLABORADOR) {
      filtros.departamento = usuarioLogado.departamento;
    }

    // Gestores podem ver seus subordinados e colegas do departamento
    if (usuarioLogado.perfil === PERFIS.GESTOR) {
      filtros.departamento = filtros.departamento || usuarioLogado.departamento;
    }

    return usuarioRepository.findWithFilters(filtros);
  }

  /**
   * Busca usuário por ID com validação de permissão
   * @param {string} id - UUID do usuário
   * @param {Object} usuarioLogado - Usuário realizando a busca
   * @returns {Promise<Usuario>}
   */
  async buscarPorId(id, usuarioLogado) {
    // Usuários não-admin só podem ver seus próprios dados ou da hierarquia
    if (!usuarioLogado.temPerfil(PERFIS.ADMIN, PERFIS.GESTOR, PERFIS.FINANCEIRO)) {
      if (id !== usuarioLogado.id) {
        throw new AppError('Acesso negado. Você não pode visualizar dados de outros usuários.', 403);
      }
    }

    const usuario = await usuarioRepository.findById(id, {
      attributes: { exclude: ['senhaHash', 'tokenResetSenha', 'tokenResetExpira'] },
      include: [{
        model: Usuario,
        as: 'gestor',
        attributes: ['id', 'nome', 'email', 'cargo'],
        required: false,
      }],
    });

    if (!usuario) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    return usuario;
  }

  /**
   * Cria novo usuário no sistema
   * @param {Object} dados - Dados do usuário
   * @param {Object} usuarioLogado - Administrador criando o usuário
   * @returns {Promise<Usuario>}
   */
  async criar(dados, usuarioLogado) {
    // Verifica permissão: apenas ADMIN pode criar usuários
    if (!usuarioLogado.temPerfil(PERFIS.ADMIN)) {
      throw new AppError('Apenas administradores podem criar usuários.', 403);
    }

    // Verifica e-mail duplicado
    const emailExiste = await usuarioRepository.findByEmail(dados.email);
    if (emailExiste) {
      throw new AppError('Este e-mail já está cadastrado no sistema.', 409);
    }

    // Verifica CPF duplicado
    if (dados.cpf) {
      const cpfExiste = await usuarioRepository.findByCPF(dados.cpf);
      if (cpfExiste) {
        throw new AppError('Este CPF já está cadastrado no sistema.', 409);
      }
    }

    // Verifica matrícula duplicada
    if (dados.matricula) {
      const matriculaExiste = await usuarioRepository.findByMatricula(dados.matricula);
      if (matriculaExiste) {
        throw new AppError('Esta matrícula já está cadastrada no sistema.', 409);
      }
    }

    // Define senha temporária
    const senhaTemporaria = this._gerarSenhaTemporaria();

    const novoUsuario = await usuarioRepository.create({
      ...dados,
      senhaHash: senhaTemporaria, // Será hasheada pelo hook beforeCreate
      primeiroAcesso: true,
    });

    // Envia e-mail de boas-vindas com senha temporária
    try {
      await notificacaoService.enviarBoasVindas(novoUsuario, senhaTemporaria);
    } catch (emailError) {
      logger.error('Erro ao enviar e-mail de boas-vindas:', { error: emailError.message });
      // Não falha a criação por erro de e-mail
    }

    // Registra auditoria
    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'CRIAR_USUARIO',
      tabela: 'usuarios',
      registroId: novoUsuario.id,
      dadosNovos: { email: novoUsuario.email, perfil: novoUsuario.perfil, nome: novoUsuario.nome },
      descricao: `Usuário ${novoUsuario.nome} (${novoUsuario.email}) criado por ${usuarioLogado.nome}`,
    });

    logger.info('Usuário criado com sucesso', { usuarioId: novoUsuario.id, email: novoUsuario.email });

    // Retorna sem a senha hash
    const { senhaHash, ...dadosRetorno } = novoUsuario.toJSON();
    return dadosRetorno;
  }

  /**
   * Atualiza dados de um usuário
   * @param {string} id - UUID do usuário
   * @param {Object} dados - Dados a atualizar
   * @param {Object} usuarioLogado - Usuário fazendo a atualização
   * @returns {Promise<Usuario>}
   */
  async atualizar(id, dados, usuarioLogado) {
    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    // Verifica permissão
    const ehProprioUsuario = id === usuarioLogado.id;
    const ehAdmin = usuarioLogado.temPerfil(PERFIS.ADMIN);

    if (!ehProprioUsuario && !ehAdmin) {
      throw new AppError('Você não tem permissão para atualizar este usuário.', 403);
    }

    // Campos que apenas admin pode alterar
    const camposRestritosAdmin = ['perfil', 'limiteAprovacao', 'ativo', 'gestorId'];
    const tentandoAlterarRestrito = camposRestritosAdmin.some(campo => dados[campo] !== undefined);

    if (tentandoAlterarRestrito && !ehAdmin) {
      throw new AppError('Você não tem permissão para alterar estes campos.', 403);
    }

    // Verifica e-mail duplicado (se alterando)
    if (dados.email && dados.email !== usuario.email) {
      const emailExiste = await usuarioRepository.findByEmail(dados.email);
      if (emailExiste) {
        throw new AppError('Este e-mail já está cadastrado.', 409);
      }
    }

    const dadosAnteriores = usuario.toJSON();

    // Não permite alterar senha por aqui (use trocarSenha)
    delete dados.senhaHash;
    delete dados.senha;

    await usuario.update(dados);

    // Registra auditoria
    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'ATUALIZAR_USUARIO',
      tabela: 'usuarios',
      registroId: id,
      dadosAnteriores: { nome: dadosAnteriores.nome, email: dadosAnteriores.email, perfil: dadosAnteriores.perfil },
      dadosNovos: { nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
      descricao: `Dados do usuário ${usuario.nome} atualizados`,
    });

    return usuario;
  }

  /**
   * Desativa um usuário (soft delete funcional)
   * @param {string} id - UUID do usuário
   * @param {Object} usuarioLogado - Admin realizando a operação
   */
  async desativar(id, usuarioLogado) {
    if (!usuarioLogado.temPerfil(PERFIS.ADMIN)) {
      throw new AppError('Apenas administradores podem desativar usuários.', 403);
    }

    if (id === usuarioLogado.id) {
      throw new AppError('Você não pode desativar sua própria conta.', 400);
    }

    const usuario = await usuarioRepository.findById(id);
    if (!usuario) {
      throw new AppError('Usuário não encontrado.', 404);
    }

    await usuario.update({ ativo: false });

    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'DESATIVAR_USUARIO',
      tabela: 'usuarios',
      registroId: id,
      descricao: `Usuário ${usuario.nome} desativado por ${usuarioLogado.nome}`,
    });
  }

  /**
   * Reativa um usuário
   * @param {string} id
   * @param {Object} usuarioLogado
   */
  async reativar(id, usuarioLogado) {
    if (!usuarioLogado.temPerfil(PERFIS.ADMIN)) {
      throw new AppError('Apenas administradores podem reativar usuários.', 403);
    }

    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);

    await usuario.update({ ativo: true });

    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'REATIVAR_USUARIO',
      tabela: 'usuarios',
      registroId: id,
      descricao: `Usuário ${usuario.nome} reativado por ${usuarioLogado.nome}`,
    });
  }

  /**
   * Troca a senha do usuário com validação
   * @param {string} id - UUID do usuário
   * @param {string} senhaAtual - Senha atual
   * @param {string} novaSenha - Nova senha
   * @param {Object} usuarioLogado - Usuário fazendo a troca
   */
  async trocarSenha(id, senhaAtual, novaSenha, usuarioLogado) {
    // Usuário só pode trocar a própria senha (admin pode forçar sem validar atual)
    const ehProprioUsuario = id === usuarioLogado.id;
    const ehAdmin = usuarioLogado.temPerfil(PERFIS.ADMIN);

    if (!ehProprioUsuario && !ehAdmin) {
      throw new AppError('Você não pode trocar a senha de outro usuário.', 403);
    }

    const usuario = await usuarioRepository.findById(id);
    if (!usuario) throw new AppError('Usuário não encontrado.', 404);

    // Valida senha atual (exceto para admin fazendo reset)
    if (ehProprioUsuario) {
      const senhaCorreta = await usuario.verificarSenha(senhaAtual);
      if (!senhaCorreta) {
        throw new AppError('Senha atual incorreta.', 400);
      }
    }

    // Valida complexidade da nova senha
    this._validarComplexidadeSenha(novaSenha);

    await usuario.update({
      senhaHash: novaSenha, // Hook beforeUpdate fará o hash
      primeiroAcesso: false,
    });

    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'TROCAR_SENHA',
      tabela: 'usuarios',
      registroId: id,
      descricao: `Senha do usuário ${usuario.nome} alterada`,
    });
  }

  /**
   * Solicita reset de senha via e-mail
   * @param {string} email - E-mail do usuário
   */
  async solicitarResetSenha(email) {
    const usuario = await usuarioRepository.findByEmail(email);

    if (!usuario) {
      // Retorna sucesso mesmo se o e-mail não existir (evita enumeração)
      logger.info('Reset de senha solicitado para e-mail não cadastrado:', { email });
      return;
    }

    if (!usuario.ativo) {
      throw new AppError('Esta conta está desativada. Entre em contato com o suporte.', 400);
    }

    // Gera token de reset com expiração de 2 horas
    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await usuario.update({
      tokenResetSenha: token,
      tokenResetExpira: expira,
    });

    // Envia e-mail com link de reset
    await notificacaoService.enviarResetSenha(usuario, token);

    logger.info('Reset de senha solicitado', { usuarioId: usuario.id, email });
  }

  /**
   * Redefine a senha usando token de reset
   * @param {string} token - Token recebido por e-mail
   * @param {string} novaSenha - Nova senha
   */
  async redefinirSenha(token, novaSenha) {
    const usuario = await usuarioRepository.findByTokenReset(token);

    if (!usuario) {
      throw new AppError('Token inválido ou expirado. Solicite um novo reset de senha.', 400);
    }

    this._validarComplexidadeSenha(novaSenha);

    await usuario.update({
      senhaHash: novaSenha,
      tokenResetSenha: null,
      tokenResetExpira: null,
      primeiroAcesso: false,
      tentativasLogin: 0,
      bloqueadoAte: null,
    });

    await auditoriaRepository.registrar({
      usuarioId: usuario.id,
      acao: 'REDEFINIR_SENHA',
      tabela: 'usuarios',
      registroId: usuario.id,
      descricao: 'Senha redefinida via token de reset',
    });
  }

  /**
   * Obtém estatísticas do sistema de usuários
   * @returns {Promise<Object>}
   */
  async getEstatisticas() {
    const [porPerfil, totalAtivos, totalInativos] = await Promise.all([
      usuarioRepository.getEstatisticasPorPerfil(),
      usuarioRepository.count({ ativo: true }),
      usuarioRepository.count({ ativo: false }),
    ]);

    return {
      totalAtivos,
      totalInativos,
      total: totalAtivos + totalInativos,
      porPerfil,
    };
  }

  /**
   * Gera uma senha temporária segura
   * @returns {string}
   * @private
   */
  _gerarSenhaTemporaria() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
    let senha = '';
    for (let i = 0; i < 12; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  }

  /**
   * Valida a complexidade de uma senha
   * @param {string} senha
   * @private
   */
  _validarComplexidadeSenha(senha) {
    if (!senha || senha.length < 8) {
      throw new AppError('A senha deve ter pelo menos 8 caracteres.', 400);
    }
    if (!/[A-Z]/.test(senha)) {
      throw new AppError('A senha deve conter pelo menos uma letra maiúscula.', 400);
    }
    if (!/[a-z]/.test(senha)) {
      throw new AppError('A senha deve conter pelo menos uma letra minúscula.', 400);
    }
    if (!/[0-9]/.test(senha)) {
      throw new AppError('A senha deve conter pelo menos um número.', 400);
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(senha)) {
      throw new AppError('A senha deve conter pelo menos um caractere especial.', 400);
    }
  }
}

// Exporta instância singleton
const usuarioService = new UsuarioService();
module.exports = { usuarioService };
