'use strict';

// =============================================================================
// SOLICITACAO SERVICE
// Lógica de negócio para solicitações de reembolso
// =============================================================================

const { sequelize } = require('../config/database');
const solicitacaoRepository = require('../repositories/SolicitacaoRepository');
const {
  aprovacaoRepository,
  auditoriaRepository,
  itemDespesaRepository,
  comprovanteRepository,
  politicaAprovacaoRepository,
  notificacaoRepository,
} = require('../repositories/index');
const { notificacaoService } = require('./NotificacaoService');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');
const { PERFIS } = require('../models/Usuario');
const { STATUS_SOLICITACAO } = require('../models/SolicitacaoReembolso');
const { STATUS_APROVACAO } = require('../models/index');
const config = require('../config');

/**
 * @class SolicitacaoService
 * @description Serviço com toda a lógica de negócio de solicitações de reembolso
 */
class SolicitacaoService {
  /**
   * Lista solicitações com filtros e controle de visibilidade por perfil
   * @param {Object} filtros - Filtros de busca
   * @param {Object} usuarioLogado - Usuário realizando a busca
   * @returns {Promise<Object>}
   */
  async listar(filtros, usuarioLogado) {
    // Define escopo de visibilidade por perfil
    if (usuarioLogado.perfil === PERFIS.COLABORADOR) {
      // Colaborador só vê suas próprias solicitações
      filtros.solicitanteId = usuarioLogado.id;
    } else if (usuarioLogado.perfil === PERFIS.APROVADOR) {
      // Aprovador vê suas aprovações pendentes ou todas (conforme filtro)
      if (!filtros.solicitanteId) {
        filtros.aprovadorId = usuarioLogado.id;
      }
    }
    // Admin, Financeiro e Gestor veem todas (com filtros opcionais)

    return solicitacaoRepository.findWithFilters(filtros);
  }

  /**
   * Busca solicitação completa por ID com verificação de acesso
   * @param {string} id - UUID da solicitação
   * @param {Object} usuarioLogado
   * @returns {Promise<SolicitacaoReembolso>}
   */
  async buscarPorId(id, usuarioLogado) {
    const solicitacao = await solicitacaoRepository.findByIdCompleto(id);

    if (!solicitacao) {
      throw new AppError('Solicitação não encontrada.', 404);
    }

    // Verifica permissão de visualização
    this._verificarPermissaoVisualizacao(solicitacao, usuarioLogado);

    return solicitacao;
  }

  /**
   * Cria nova solicitação de reembolso em rascunho
   * @param {Object} dados - Dados da solicitação
   * @param {Object} usuarioLogado - Solicitante
   * @returns {Promise<SolicitacaoReembolso>}
   */
  async criar(dados, usuarioLogado) {
    const transaction = await sequelize.transaction();

    try {
      // Gera número sequencial único
      const numero = await solicitacaoRepository.gerarNumero();

      // Cria a solicitação principal
      const solicitacao = await solicitacaoRepository.create({
        ...dados,
        numero,
        solicitanteId: usuarioLogado.id,
        status: STATUS_SOLICITACAO.RASCUNHO,
        valorTotal: dados.itens
          ? dados.itens.reduce((acc, item) => acc + (item.quantidade || 1) * item.valorUnitario, 0)
          : dados.valorTotal || 0,
      }, { transaction });

      // Cria os itens de despesa se fornecidos
      if (dados.itens && dados.itens.length > 0) {
        await Promise.all(dados.itens.map(item =>
          itemDespesaRepository.create({
            ...item,
            solicitacaoId: solicitacao.id,
            valorTotal: (item.quantidade || 1) * item.valorUnitario,
          }, { transaction })
        ));
      }

      await transaction.commit();

      // Registra auditoria
      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'CRIAR_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: solicitacao.id,
        dadosNovos: { numero: solicitacao.numero, titulo: solicitacao.titulo, valorTotal: solicitacao.valorTotal },
        descricao: `Solicitação ${solicitacao.numero} criada por ${usuarioLogado.nome}`,
      });

      logger.info('Solicitação criada', { solicitacaoId: solicitacao.id, numero: solicitacao.numero });

      return solicitacaoRepository.findByIdCompleto(solicitacao.id);
    } catch (error) {
      await transaction.rollback();
      logger.error('Erro ao criar solicitação:', { error: error.message });
      throw error;
    }
  }

  /**
   * Atualiza solicitação em rascunho
   * @param {string} id
   * @param {Object} dados
   * @param {Object} usuarioLogado
   */
  async atualizar(id, dados, usuarioLogado) {
    const solicitacao = await solicitacaoRepository.findById(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    // Apenas o próprio solicitante pode editar
    if (solicitacao.solicitanteId !== usuarioLogado.id) {
      throw new AppError('Você não tem permissão para editar esta solicitação.', 403);
    }

    // Apenas rascunho ou devolvida pode ser editada
    if (!solicitacao.podeEditar()) {
      throw new AppError(
        `Solicitações com status "${solicitacao.status}" não podem ser editadas.`,
        400
      );
    }

    const transaction = await sequelize.transaction();
    try {
      // Recalcula valor total se itens forem atualizados
      if (dados.itens) {
        // Remove itens antigos e recria
        await itemDespesaRepository.updateWhere(
          { solicitacaoId: id },
          { deletedAt: new Date() },
          { transaction }
        );

        await Promise.all(dados.itens.map(item =>
          itemDespesaRepository.create({
            ...item,
            solicitacaoId: id,
            valorTotal: (item.quantidade || 1) * item.valorUnitario,
          }, { transaction })
        ));

        dados.valorTotal = dados.itens.reduce(
          (acc, item) => acc + (item.quantidade || 1) * item.valorUnitario, 0
        );
      }

      await solicitacao.update(dados, { transaction });
      await transaction.commit();

      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'ATUALIZAR_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: id,
        descricao: `Solicitação ${solicitacao.numero} atualizada`,
      });

      return solicitacaoRepository.findByIdCompleto(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Submete a solicitação para aprovação, montando o fluxo de aprovação
   * @param {string} id
   * @param {Object} usuarioLogado
   */
  async submeter(id, usuarioLogado) {
    const solicitacao = await solicitacaoRepository.findByIdCompleto(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    if (solicitacao.solicitanteId !== usuarioLogado.id) {
      throw new AppError('Apenas o solicitante pode submeter esta solicitação.', 403);
    }

    if (!solicitacao.podeSubmeter()) {
      throw new AppError(`Solicitação com status "${solicitacao.status}" não pode ser submetida.`, 400);
    }

    // Verifica se tem pelo menos um item ou valor definido
    if (!solicitacao.valorTotal || parseFloat(solicitacao.valorTotal) <= 0) {
      throw new AppError('Solicitação deve ter valor total maior que zero.', 400);
    }

    // Monta fluxo de aprovação baseado na política
    const niveis = await this._montarFluxoAprovacao(solicitacao);

    if (niveis.length === 0) {
      throw new AppError('Nenhum aprovador disponível para esta solicitação.', 400);
    }

    const transaction = await sequelize.transaction();
    try {
      // Atualiza status e informações de submissão
      await solicitacao.update({
        status: STATUS_SOLICITACAO.SUBMETIDA,
        dataSubmissao: new Date(),
        nivelAprovacaoAtual: 1,
        nivelAprovacaoTotal: niveis.length,
      }, { transaction });

      // Cria registros de aprovação para cada nível (apenas nível 1 fica PENDENTE)
      await Promise.all(niveis.map((nivel, index) =>
        aprovacaoRepository.create({
          solicitacaoId: id,
          aprovadorId: nivel.aprovadorId,
          nivel: index + 1,
          status: index === 0 ? STATUS_APROVACAO.PENDENTE : 'AGUARDANDO',
          dataLimite: this._calcularDataLimite(config.approval.timeoutDays),
        }, { transaction })
      ));

      await transaction.commit();

      // Notifica o primeiro aprovador
      await notificacaoService.notificarAprovadorPendente(solicitacao, niveis[0].aprovadorId);

      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'SUBMETER_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: id,
        descricao: `Solicitação ${solicitacao.numero} submetida para aprovação por ${usuarioLogado.nome}`,
      });

      logger.info('Solicitação submetida para aprovação', {
        solicitacaoId: id,
        numero: solicitacao.numero,
        niveis: niveis.length,
      });

      return solicitacaoRepository.findByIdCompleto(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Aprova uma solicitação no nível atual
   * @param {string} id - UUID da solicitação
   * @param {string} comentario - Comentário do aprovador
   * @param {Object} usuarioLogado - Aprovador
   * @param {string} ip - IP da aprovação
   */
  async aprovar(id, comentario, usuarioLogado, ip) {
    const solicitacao = await solicitacaoRepository.findByIdCompleto(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    if (!solicitacao.aguardandoAprovacao()) {
      throw new AppError(`Solicitação com status "${solicitacao.status}" não está aguardando aprovação.`, 400);
    }

    // Busca aprovação pendente deste aprovador
    const aprovacao = await aprovacaoRepository.findPendenteParaAprovador(id, usuarioLogado.id);
    if (!aprovacao) {
      throw new AppError('Você não tem aprovação pendente para esta solicitação.', 403);
    }

    const transaction = await sequelize.transaction();
    try {
      // Registra a aprovação
      await aprovacao.update({
        status: STATUS_APROVACAO.APROVADO,
        comentario,
        dataAcao: new Date(),
        ipAprovacao: ip,
      }, { transaction });

      // Verifica se foi o último nível
      const novoNivel = solicitacao.nivelAprovacaoAtual + 1;
      const aprovacaoCompleta = novoNivel > solicitacao.nivelAprovacaoTotal;

      if (aprovacaoCompleta) {
        // Aprovação final: muda status para APROVADA
        await solicitacao.update({
          status: STATUS_SOLICITACAO.APROVADA,
          dataAprovacao: new Date(),
          nivelAprovacaoAtual: solicitacao.nivelAprovacaoTotal,
        }, { transaction });
      } else {
        // Próximo nível: ativa a aprovação do próximo aprovador
        await solicitacao.update({
          status: STATUS_SOLICITACAO.EM_ANALISE,
          nivelAprovacaoAtual: novoNivel,
        }, { transaction });

        // Ativa a aprovação do próximo nível
        await aprovacaoRepository.updateWhere(
          { solicitacaoId: id, nivel: novoNivel },
          { status: STATUS_APROVACAO.PENDENTE },
          { transaction }
        );
      }

      await transaction.commit();

      // Notificações pós-commit
      if (aprovacaoCompleta) {
        await notificacaoService.notificarAprovacaoFinal(solicitacao);
      } else {
        // Notifica próximo aprovador
        const proximaAprovacao = await aprovacaoRepository.findOne(
          { solicitacaoId: id, nivel: novoNivel }
        );
        if (proximaAprovacao) {
          await notificacaoService.notificarAprovadorPendente(solicitacao, proximaAprovacao.aprovadorId);
        }
      }

      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'APROVAR_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: id,
        dadosNovos: { status: aprovacaoCompleta ? 'APROVADA' : 'EM_ANALISE', nivel: solicitacao.nivelAprovacaoAtual },
        ip,
        descricao: `Solicitação ${solicitacao.numero} aprovada (nível ${aprovacao.nivel}) por ${usuarioLogado.nome}`,
      });

      return solicitacaoRepository.findByIdCompleto(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Rejeita uma solicitação
   * @param {string} id
   * @param {string} justificativa - Motivo obrigatório
   * @param {Object} usuarioLogado
   * @param {string} ip
   */
  async rejeitar(id, justificativa, usuarioLogado, ip) {
    if (!justificativa || justificativa.trim().length < 10) {
      throw new AppError('Justificativa de rejeição deve ter pelo menos 10 caracteres.', 400);
    }

    const solicitacao = await solicitacaoRepository.findByIdCompleto(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    if (!solicitacao.aguardandoAprovacao()) {
      throw new AppError('Esta solicitação não está aguardando aprovação.', 400);
    }

    const aprovacao = await aprovacaoRepository.findPendenteParaAprovador(id, usuarioLogado.id);
    if (!aprovacao) {
      throw new AppError('Você não tem aprovação pendente para esta solicitação.', 403);
    }

    const transaction = await sequelize.transaction();
    try {
      await aprovacao.update({
        status: STATUS_APROVACAO.REJEITADO,
        comentario: justificativa,
        dataAcao: new Date(),
        ipAprovacao: ip,
      }, { transaction });

      await solicitacao.update({
        status: STATUS_SOLICITACAO.REJEITADA,
        justificativaRejeicao: justificativa,
      }, { transaction });

      await transaction.commit();

      // Notifica o solicitante
      await notificacaoService.notificarRejeicao(solicitacao, justificativa);

      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'REJEITAR_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: id,
        dadosNovos: { justificativa },
        ip,
        descricao: `Solicitação ${solicitacao.numero} rejeitada por ${usuarioLogado.nome}: ${justificativa}`,
      });

      return solicitacaoRepository.findByIdCompleto(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Devolve a solicitação para ajuste pelo solicitante
   * @param {string} id
   * @param {string} comentario
   * @param {Object} usuarioLogado
   * @param {string} ip
   */
  async devolver(id, comentario, usuarioLogado, ip) {
    const solicitacao = await solicitacaoRepository.findByIdCompleto(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    if (!solicitacao.aguardandoAprovacao()) {
      throw new AppError('Esta solicitação não está aguardando aprovação.', 400);
    }

    const aprovacao = await aprovacaoRepository.findPendenteParaAprovador(id, usuarioLogado.id);
    if (!aprovacao) {
      throw new AppError('Você não tem aprovação pendente para esta solicitação.', 403);
    }

    const transaction = await sequelize.transaction();
    try {
      await aprovacao.update({
        status: STATUS_APROVACAO.DEVOLVIDO,
        comentario,
        dataAcao: new Date(),
        ipAprovacao: ip,
      }, { transaction });

      // Reseta o fluxo e devolve para o solicitante ajustar
      await solicitacao.update({
        status: STATUS_SOLICITACAO.DEVOLVIDA,
        nivelAprovacaoAtual: 0,
      }, { transaction });

      await transaction.commit();

      await notificacaoService.notificarDevolucao(solicitacao, comentario);

      await auditoriaRepository.registrar({
        usuarioId: usuarioLogado.id,
        acao: 'DEVOLVER_SOLICITACAO',
        tabela: 'solicitacoes_reembolso',
        registroId: id,
        ip,
        descricao: `Solicitação ${solicitacao.numero} devolvida por ${usuarioLogado.nome}: ${comentario}`,
      });

      return solicitacaoRepository.findByIdCompleto(id);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Cancela uma solicitação pelo próprio solicitante
   * @param {string} id
   * @param {string} motivo
   * @param {Object} usuarioLogado
   */
  async cancelar(id, motivo, usuarioLogado) {
    const solicitacao = await solicitacaoRepository.findById(id);
    if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);

    if (solicitacao.solicitanteId !== usuarioLogado.id &&
        !usuarioLogado.temPerfil(PERFIS.ADMIN)) {
      throw new AppError('Você não tem permissão para cancelar esta solicitação.', 403);
    }

    if (!solicitacao.podeCancelar()) {
      throw new AppError(`Solicitação com status "${solicitacao.status}" não pode ser cancelada.`, 400);
    }

    await solicitacao.update({
      status: STATUS_SOLICITACAO.CANCELADA,
      justificativaRejeicao: motivo,
    });

    await auditoriaRepository.registrar({
      usuarioId: usuarioLogado.id,
      acao: 'CANCELAR_SOLICITACAO',
      tabela: 'solicitacoes_reembolso',
      registroId: id,
      descricao: `Solicitação ${solicitacao.numero} cancelada: ${motivo}`,
    });

    return solicitacao;
  }

  /**
   * Obtém resumo dashboard do usuário logado
   * @param {Object} usuarioLogado
   * @returns {Promise<Object>}
   */
  async getDashboard(usuarioLogado) {
    const [resumo, evolucao, ranking] = await Promise.all([
      solicitacaoRepository.getResumoSolicitante(usuarioLogado.id),
      solicitacaoRepository.getEvolucaoMensal(6),
      solicitacaoRepository.getRankingCategorias(),
    ]);

    let aprovacoesPendentes = 0;
    if (usuarioLogado.perfil !== PERFIS.COLABORADOR) {
      aprovacoesPendentes = await aprovacaoRepository.countPendentesByAprovador(usuarioLogado.id);
    }

    return { resumo, evolucao, ranking, aprovacoesPendentes };
  }

  /**
   * Monta o fluxo de aprovação baseado nas políticas configuradas
   * @param {SolicitacaoReembolso} solicitacao
   * @returns {Promise<Array<{nivel: number, aprovadorId: string}>>}
   * @private
   */
  async _montarFluxoAprovacao(solicitacao) {
    // Busca políticas aplicáveis (ordenadas por prioridade)
    const politicas = await politicaAprovacaoRepository.findAplicaveis(
      solicitacao.valorTotal,
      solicitacao.categoriaId
    );

    if (politicas.length > 0) {
      // Usa a política de maior prioridade
      const politica = politicas[0];
      return politica.niveis; // Array de {nivel, aprovadorId}
    }

    // Fallback: usa o gestor do solicitante
    const { Usuario } = require('../models/Usuario');
    const solicitante = await Usuario.findByPk(solicitacao.solicitanteId, {
      attributes: ['gestorId'],
    });

    if (solicitante?.gestorId) {
      return [{ nivel: 1, aprovadorId: solicitante.gestorId }];
    }

    // Sem fluxo configurado: busca qualquer aprovador/admin
    const aprovadores = await require('../repositories/UsuarioRepository').findAprovadoresParaValor(
      solicitacao.valorTotal
    );

    if (aprovadores.length > 0) {
      return [{ nivel: 1, aprovadorId: aprovadores[0].id }];
    }

    return [];
  }

  /**
   * Calcula data limite para aprovação
   * @param {number} dias
   * @returns {Date}
   * @private
   */
  _calcularDataLimite(dias) {
    const data = new Date();
    data.setDate(data.getDate() + dias);
    return data;
  }

  /**
   * Verifica se o usuário pode visualizar a solicitação
   * @param {SolicitacaoReembolso} solicitacao
   * @param {Object} usuarioLogado
   * @private
   */
  _verificarPermissaoVisualizacao(solicitacao, usuarioLogado) {
    if (usuarioLogado.temPerfil(PERFIS.ADMIN, PERFIS.FINANCEIRO)) return;

    // Solicitante pode ver a própria solicitação
    if (solicitacao.solicitanteId === usuarioLogado.id) return;

    // Aprovador pode ver se tem aprovação nela
    if (usuarioLogado.perfil === PERFIS.APROVADOR || usuarioLogado.perfil === PERFIS.GESTOR) {
      const temAprovacao = solicitacao.aprovacoes?.some(
        a => a.aprovadorId === usuarioLogado.id
      );
      if (temAprovacao) return;
    }

    throw new AppError('Você não tem permissão para visualizar esta solicitação.', 403);
  }
}

const solicitacaoService = new SolicitacaoService();
module.exports = { solicitacaoService };
