'use strict';

// =============================================================================
// CONTROLLERS AUXILIARES
// PagamentoController, CategoriaController, CentroCustoController,
// NotificacaoController, AuditoriaController, RelatorioController
// =============================================================================

const { body } = require('express-validator');
const { validar } = require('../middlewares/index');
const { pagamentoRepository, categoriaRepository, centroCustoRepository, notificacaoRepository, auditoriaRepository } = require('../repositories/index');
const { relatorioService } = require('../services/RelatorioService');
const { notificacaoService } = require('../services/NotificacaoService');
const { AppError } = require('../utils/errors');
const path = require('path');
const fs = require('fs');

// =============================================================================
// PAGAMENTO CONTROLLER
// =============================================================================
class PagamentoController {
  /**
   * GET /pagamentos
   * Lista pagamentos com filtros
   */
  async listar(req, res, next) {
    try {
      const filtros = {
        status: req.query.status,
        formaPagamento: req.query.formaPagamento,
        numeroLote: req.query.numeroLote,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim,
        page: req.paginacao.page,
        pageSize: req.paginacao.pageSize,
      };
      const resultado = await pagamentoRepository.findWithFilters(filtros);
      res.json({
        sucesso: true, dados: resultado.rows,
        paginacao: { total: resultado.count, pagina: resultado.currentPage, totalPaginas: resultado.totalPages },
      });
    } catch (error) { next(error); }
  }

  /**
   * POST /pagamentos
   * Registra pagamento de uma solicitação aprovada
   */
  async registrar(req, res, next) {
    try {
      const { solicitacaoId, formaPagamento, dadosBancarios, observacoes, dataAgendamento } = req.body;

      // Verifica se a solicitação existe e está aprovada
      const { SolicitacaoReembolso } = require('../models/SolicitacaoReembolso');
      const solicitacao = await SolicitacaoReembolso.findByPk(solicitacaoId);

      if (!solicitacao) throw new AppError('Solicitação não encontrada.', 404);
      if (solicitacao.status !== 'APROVADA') {
        throw new AppError('Apenas solicitações aprovadas podem ser pagas.', 400);
      }

      const pagamento = await pagamentoRepository.create({
        solicitacaoId,
        valor: solicitacao.valorTotal,
        formaPagamento: formaPagamento || 'PIX',
        dadosBancarios: dadosBancarios || solicitacao.dadosBancarios,
        status: 'AGENDADO',
        dataAgendamento: dataAgendamento || new Date(),
        processadoPorId: req.usuarioLogado.id,
        observacoes,
      });

      // Atualiza status da solicitação
      await solicitacao.update({ status: 'EM_PAGAMENTO' });

      res.status(201).json({ sucesso: true, mensagem: 'Pagamento registrado.', dados: pagamento });
    } catch (error) { next(error); }
  }

  /**
   * PATCH /pagamentos/:id/confirmar
   * Confirma a realização do pagamento
   */
  async confirmar(req, res, next) {
    try {
      const { codigoTransacao, observacoes } = req.body;
      const pagamento = await pagamentoRepository.findById(req.params.id, {
        include: [{ model: require('../models/SolicitacaoReembolso').SolicitacaoReembolso, as: 'solicitacao' }],
      });

      if (!pagamento) throw new AppError('Pagamento não encontrado.', 404);
      if (pagamento.status !== 'AGENDADO' && pagamento.status !== 'PROCESSANDO') {
        throw new AppError('Este pagamento não pode ser confirmado.', 400);
      }

      await pagamento.update({
        status: 'CONCLUIDO',
        dataPagamento: new Date(),
        codigoTransacao,
        observacoes,
      });

      // Atualiza solicitação para PAGA
      if (pagamento.solicitacao) {
        await pagamento.solicitacao.update({
          status: 'PAGA',
          dataPagamento: new Date(),
        });
        await notificacaoService.notificarPagamento(pagamento.solicitacao, pagamento);
      }

      res.json({ sucesso: true, mensagem: 'Pagamento confirmado.', dados: pagamento });
    } catch (error) { next(error); }
  }

  /**
   * GET /pagamentos/totais
   * Totais de pagamentos por forma de pagamento
   */
  async getTotais(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;
      const totais = await pagamentoRepository.getTotaisPorForma(
        dataInicio || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        dataFim || new Date()
      );
      res.json({ sucesso: true, dados: totais });
    } catch (error) { next(error); }
  }
}

// =============================================================================
// CATEGORIA CONTROLLER
// =============================================================================
class CategoriaController {
  async listar(req, res, next) {
    try {
      const filtros = { busca: req.query.busca, ativa: req.query.ativa !== undefined ? req.query.ativa === 'true' : undefined, page: req.paginacao?.page || 1, pageSize: req.paginacao?.pageSize || 100 };
      const resultado = await categoriaRepository.findWithFilters(filtros);
      res.json({ sucesso: true, dados: resultado.rows, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }

  async listarHierarquia(req, res, next) {
    try {
      const categorias = await categoriaRepository.findHierarquia();
      res.json({ sucesso: true, dados: categorias });
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const categoria = await categoriaRepository.findById(req.params.id);
      if (!categoria) throw new AppError('Categoria não encontrada.', 404);
      res.json({ sucesso: true, dados: categoria });
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const categoria = await categoriaRepository.create(req.body);
      res.status(201).json({ sucesso: true, mensagem: 'Categoria criada.', dados: categoria });
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const categoria = await categoriaRepository.updateById(req.params.id, req.body);
      if (!categoria) throw new AppError('Categoria não encontrada.', 404);
      res.json({ sucesso: true, mensagem: 'Categoria atualizada.', dados: categoria });
    } catch (error) { next(error); }
  }

  async desativar(req, res, next) {
    try {
      await categoriaRepository.updateById(req.params.id, { ativa: false });
      res.json({ sucesso: true, mensagem: 'Categoria desativada.' });
    } catch (error) { next(error); }
  }
}

// =============================================================================
// CENTRO DE CUSTO CONTROLLER
// =============================================================================
class CentroCustoController {
  async listar(req, res, next) {
    try {
      const filtros = { busca: req.query.busca, ativo: req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined, page: req.paginacao?.page || 1, pageSize: req.paginacao?.pageSize || 50 };
      const resultado = await centroCustoRepository.findWithFilters(filtros);
      res.json({ sucesso: true, dados: resultado.rows, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const centro = await centroCustoRepository.findById(req.params.id);
      if (!centro) throw new AppError('Centro de custo não encontrado.', 404);
      res.json({ sucesso: true, dados: centro });
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      // Verifica código duplicado
      const existente = await centroCustoRepository.findByCodigo(req.body.codigo);
      if (existente) throw new AppError('Código de centro de custo já existe.', 409);
      const centro = await centroCustoRepository.create(req.body);
      res.status(201).json({ sucesso: true, mensagem: 'Centro de custo criado.', dados: centro });
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const centro = await centroCustoRepository.updateById(req.params.id, req.body);
      if (!centro) throw new AppError('Centro de custo não encontrado.', 404);
      res.json({ sucesso: true, mensagem: 'Centro de custo atualizado.', dados: centro });
    } catch (error) { next(error); }
  }

  async getRelatorioOrcamento(req, res, next) {
    try {
      const { ano = new Date().getFullYear() } = req.query;
      const relatorio = await centroCustoRepository.getRelatorioOrcamento(parseInt(ano));
      res.json({ sucesso: true, dados: relatorio });
    } catch (error) { next(error); }
  }
}

// =============================================================================
// NOTIFICACAO CONTROLLER
// =============================================================================
class NotificacaoController {
  async listarMinhas(req, res, next) {
    try {
      const { page = 1, pageSize = 20 } = req.query;
      const resultado = await notificacaoRepository.findPaginated({
        where: { usuarioId: req.usuarioLogado.id },
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        order: [['createdAt', 'DESC']],
      });
      const naoLidas = await notificacaoRepository.countNaoLidas(req.usuarioLogado.id);
      res.json({ sucesso: true, dados: resultado.rows, naoLidas, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }

  async marcarComoLidas(req, res, next) {
    try {
      const { ids } = req.body;
      if (ids && ids.length > 0) {
        await notificacaoRepository.marcarComoLidas(ids, req.usuarioLogado.id);
      } else {
        await notificacaoRepository.marcarTodasComoLidas(req.usuarioLogado.id);
      }
      res.json({ sucesso: true, mensagem: 'Notificações marcadas como lidas.' });
    } catch (error) { next(error); }
  }

  async countNaoLidas(req, res, next) {
    try {
      const count = await notificacaoRepository.countNaoLidas(req.usuarioLogado.id);
      res.json({ sucesso: true, dados: { count } });
    } catch (error) { next(error); }
  }
}

// =============================================================================
// AUDITORIA CONTROLLER
// =============================================================================
class AuditoriaController {
  async listar(req, res, next) {
    try {
      const filtros = {
        usuarioId: req.query.usuarioId,
        acao: req.query.acao,
        tabela: req.query.tabela,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim,
        page: req.paginacao?.page || 1,
        pageSize: req.paginacao?.pageSize || 20,
      };
      const resultado = await auditoriaRepository.findWithFilters(filtros);
      res.json({ sucesso: true, dados: resultado.rows, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }

  async getHistoricoRegistro(req, res, next) {
    try {
      const { tabela, registroId } = req.params;
      const resultado = await auditoriaRepository.findHistoricoRegistro(
        tabela, registroId, { page: req.paginacao?.page, pageSize: req.paginacao?.pageSize }
      );
      res.json({ sucesso: true, dados: resultado.rows, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }
}

// =============================================================================
// RELATORIO CONTROLLER
// =============================================================================
class RelatorioController {
  async gerarPorPeriodo(req, res, next) {
    try {
      const relatorio = await relatorioService.gerarPorPeriodo(req.body, req.usuarioLogado);
      res.status(202).json({ sucesso: true, mensagem: 'Relatório em geração.', dados: relatorio });
    } catch (error) { next(error); }
  }

  async gerarPorCategoria(req, res, next) {
    try {
      const relatorio = await relatorioService.gerarPorCategoria(req.body, req.usuarioLogado);
      res.status(202).json({ sucesso: true, dados: relatorio });
    } catch (error) { next(error); }
  }

  async gerarResumoExecutivo(req, res, next) {
    try {
      const relatorio = await relatorioService.gerarResumoExecutivo(req.body, req.usuarioLogado);
      res.status(202).json({ sucesso: true, dados: relatorio });
    } catch (error) { next(error); }
  }

  async listar(req, res, next) {
    try {
      const filtros = { tipo: req.query.tipo, status: req.query.status, page: req.paginacao?.page || 1, pageSize: req.paginacao?.pageSize || 20 };
      const resultado = await relatorioService.listar(filtros, req.usuarioLogado);
      res.json({ sucesso: true, dados: resultado.rows, paginacao: { total: resultado.count } });
    } catch (error) { next(error); }
  }

  async download(req, res, next) {
    try {
      const relatorio = await relatorioService.obterArquivo(req.params.id, req.usuarioLogado);
      const extensao = relatorio.formato.toLowerCase();
      const nomeArquivo = `${relatorio.nome.replace(/\s/g, '-')}.${extensao}`;
      res.setHeader('Content-Disposition', `attachment; filename="${nomeArquivo}"`);
      res.setHeader('Content-Type', relatorio.formato === 'PDF' ? 'application/pdf' : relatorio.formato === 'XLSX' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
      res.download(relatorio.caminhoArquivo, nomeArquivo);
    } catch (error) { next(error); }
  }
}

// Exporta instâncias de todos os controllers
module.exports = {
  pagamentoController: new PagamentoController(),
  categoriaController: new CategoriaController(),
  centroCustoController: new CentroCustoController(),
  notificacaoController: new NotificacaoController(),
  auditoriaController: new AuditoriaController(),
  relatorioController: new RelatorioController(),
};
