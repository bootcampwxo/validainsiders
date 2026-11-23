'use strict';

// =============================================================================
// SOLICITACAO CONTROLLER
// Endpoints completos para gerenciamento de solicitações de reembolso
// =============================================================================

const { body, param } = require('express-validator');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { solicitacaoService } = require('../services/SolicitacaoService');
const { comprovanteRepository } = require('../repositories/index');
const { validar } = require('../middlewares/index');
const { AppError } = require('../utils/errors');
const config = require('../config');
const fs = require('fs');

// Configuração do Multer para upload de comprovantes
const uploadDir = path.resolve(config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  destination: (req, file, cb) => {
    const subdir = path.join(uploadDir, req.params.id || 'temp');
    if (!fs.existsSync(subdir)) fs.mkdirSync(subdir, { recursive: true });
    cb(null, subdir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nome = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, nome);
  },
});

const fileFilter = (req, file, cb) => {
  if (config.upload.allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(`Tipo de arquivo não permitido: ${file.mimetype}`, 415), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: config.upload.maxSize },
});

/**
 * Validações para criação de solicitação
 */
const validacoesCriar = [
  body('titulo').trim().notEmpty().withMessage('Título é obrigatório')
    .isLength({ min: 5, max: 200 }).withMessage('Título deve ter entre 5 e 200 caracteres'),
  body('categoriaId').isUUID().withMessage('Categoria inválida'),
  body('dataDespesa').isISO8601().withMessage('Data da despesa inválida')
    .custom(value => {
      if (new Date(value) > new Date()) throw new Error('Data não pode ser futura');
      return true;
    }),
  body('valorTotal').optional().isFloat({ min: 0.01 }).withMessage('Valor total deve ser maior que zero'),
  body('moeda').optional().isLength({ min: 3, max: 3 }).withMessage('Código de moeda deve ter 3 caracteres'),
  body('itens').optional().isArray({ min: 1 }).withMessage('Pelo menos um item é necessário'),
  body('itens.*.descricao').optional().notEmpty().withMessage('Descrição do item é obrigatória'),
  body('itens.*.valorUnitario').optional().isFloat({ min: 0.01 }).withMessage('Valor unitário inválido'),
  validar,
];

/**
 * Validações para ação de aprovação/rejeição
 */
const validacoesAcaoAprovacao = [
  body('comentario').optional().isLength({ max: 1000 }),
  validar,
];

const validacoesRejeitar = [
  body('justificativa').trim().notEmpty().withMessage('Justificativa é obrigatória')
    .isLength({ min: 10, max: 1000 }).withMessage('Justificativa deve ter entre 10 e 1000 caracteres'),
  validar,
];

/**
 * @class SolicitacaoController
 */
class SolicitacaoController {
  /**
   * GET /solicitacoes
   * Lista solicitações com filtros e paginação
   */
  async listar(req, res, next) {
    try {
      const filtros = {
        solicitanteId: req.query.solicitanteId,
        categoriaId: req.query.categoriaId,
        centroCustoId: req.query.centroCustoId,
        status: req.query.status,
        prioridade: req.query.prioridade,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim,
        valorMin: req.query.valorMin ? parseFloat(req.query.valorMin) : undefined,
        valorMax: req.query.valorMax ? parseFloat(req.query.valorMax) : undefined,
        busca: req.query.busca,
        page: req.paginacao.page,
        pageSize: req.paginacao.pageSize,
      };

      const resultado = await solicitacaoService.listar(filtros, req.usuarioLogado);

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
   * GET /solicitacoes/:id
   * Busca solicitação completa por ID
   */
  async buscarPorId(req, res, next) {
    try {
      const solicitacao = await solicitacaoService.buscarPorId(req.params.id, req.usuarioLogado);
      res.json({ sucesso: true, dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /solicitacoes
   * Cria nova solicitação de reembolso
   */
  async criar(req, res, next) {
    try {
      const solicitacao = await solicitacaoService.criar(req.body, req.usuarioLogado);
      res.status(201).json({
        sucesso: true,
        mensagem: 'Solicitação criada com sucesso.',
        dados: solicitacao,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /solicitacoes/:id
   * Atualiza solicitação em rascunho
   */
  async atualizar(req, res, next) {
    try {
      const solicitacao = await solicitacaoService.atualizar(req.params.id, req.body, req.usuarioLogado);
      res.json({ sucesso: true, mensagem: 'Solicitação atualizada.', dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /solicitacoes/:id/submeter
   * Submete a solicitação para aprovação
   */
  async submeter(req, res, next) {
    try {
      const solicitacao = await solicitacaoService.submeter(req.params.id, req.usuarioLogado);
      res.json({
        sucesso: true,
        mensagem: 'Solicitação submetida para aprovação.',
        dados: solicitacao,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /solicitacoes/:id/aprovar
   * Aprova a solicitação (aprovador/gestor)
   */
  async aprovar(req, res, next) {
    try {
      const { comentario } = req.body;
      const solicitacao = await solicitacaoService.aprovar(
        req.params.id,
        comentario,
        req.usuarioLogado,
        req.ip
      );
      res.json({ sucesso: true, mensagem: 'Solicitação aprovada.', dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /solicitacoes/:id/rejeitar
   * Rejeita a solicitação com justificativa
   */
  async rejeitar(req, res, next) {
    try {
      const { justificativa } = req.body;
      const solicitacao = await solicitacaoService.rejeitar(
        req.params.id,
        justificativa,
        req.usuarioLogado,
        req.ip
      );
      res.json({ sucesso: true, mensagem: 'Solicitação rejeitada.', dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /solicitacoes/:id/devolver
   * Devolve a solicitação para ajuste
   */
  async devolver(req, res, next) {
    try {
      const { comentario } = req.body;
      const solicitacao = await solicitacaoService.devolver(
        req.params.id,
        comentario,
        req.usuarioLogado,
        req.ip
      );
      res.json({ sucesso: true, mensagem: 'Solicitação devolvida para ajuste.', dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /solicitacoes/:id/cancelar
   * Cancela a solicitação
   */
  async cancelar(req, res, next) {
    try {
      const { motivo } = req.body;
      const solicitacao = await solicitacaoService.cancelar(req.params.id, motivo, req.usuarioLogado);
      res.json({ sucesso: true, mensagem: 'Solicitação cancelada.', dados: solicitacao });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /solicitacoes/:id/comprovantes
   * Faz upload de comprovante(s) para a solicitação
   */
  async uploadComprovante(req, res, next) {
    try {
      if (!req.file && !req.files?.length) {
        throw new AppError('Nenhum arquivo enviado.', 400);
      }

      const arquivos = req.files || [req.file];
      const comprovantes = [];

      for (const arquivo of arquivos) {
        const comprovante = await comprovanteRepository.create({
          solicitacaoId: req.params.id,
          itemDespesaId: req.body.itemDespesaId || null,
          nomeOriginal: arquivo.originalname,
          nomeArmazenado: arquivo.filename,
          caminho: arquivo.path,
          tipoMime: arquivo.mimetype,
          tamanho: arquivo.size,
          enviadoPorId: req.usuarioLogado.id,
          descricao: req.body.descricao || null,
        });
        comprovantes.push(comprovante);
      }

      res.status(201).json({
        sucesso: true,
        mensagem: `${comprovantes.length} comprovante(s) enviado(s) com sucesso.`,
        dados: comprovantes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /solicitacoes/:id/comprovantes
   * Lista comprovantes da solicitação
   */
  async listarComprovantes(req, res, next) {
    try {
      const comprovantes = await comprovanteRepository.findBySolicitacao(req.params.id);
      res.json({ sucesso: true, dados: comprovantes });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /solicitacoes/dashboard
   * Dashboard resumido para o usuário logado
   */
  async getDashboard(req, res, next) {
    try {
      const dashboard = await solicitacaoService.getDashboard(req.usuarioLogado);
      res.json({ sucesso: true, dados: dashboard });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /solicitacoes/admin/totais
   * Totais globais para admin/financeiro
   */
  async getAdminTotais(req, res, next) {
    try {
      const { dataInicio, dataFim } = req.query;
      const solicitacaoRepository = require('../repositories/SolicitacaoRepository');
      const totais = await solicitacaoRepository.getDashboardTotais({ dataInicio, dataFim });
      res.json({ sucesso: true, dados: totais[0] || {} });
    } catch (error) {
      next(error);
    }
  }
}

const solicitacaoController = new SolicitacaoController();

module.exports = {
  solicitacaoController,
  validacoesCriar,
  validacoesAcaoAprovacao,
  validacoesRejeitar,
  upload,
};
