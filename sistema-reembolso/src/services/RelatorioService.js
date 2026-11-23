'use strict';

// =============================================================================
// RELATORIO SERVICE
// Geração de relatórios em PDF, Excel e CSV
// =============================================================================

const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const solicitacaoRepository = require('../repositories/SolicitacaoRepository');
const { relatorioRepository, pagamentoRepository, categoriaRepository, centroCustoRepository, auditoriaRepository } = require('../repositories/index');
const { logger } = require('../config/logger');
const { AppError } = require('../utils/errors');
const config = require('../config');

// Garantir diretório de relatórios
const reportsDir = path.resolve(config.reports.dir);
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

/**
 * @class RelatorioService
 * @description Geração e gerenciamento de relatórios
 */
class RelatorioService {
  /**
   * Gera relatório de despesas por período
   * @param {Object} parametros - Parâmetros do relatório
   * @param {Object} usuarioLogado
   */
  async gerarPorPeriodo(parametros, usuarioLogado) {
    const { dataInicio, dataFim, formato = 'PDF', categoriaId, centroCustoId } = parametros;

    if (!dataInicio || !dataFim) {
      throw new AppError('Data de início e fim são obrigatórias.', 400);
    }

    // Cria registro do relatório como "processando"
    const relatorio = await relatorioRepository.create({
      tipo: 'DESPESAS_POR_PERIODO',
      nome: `Despesas ${dataInicio} a ${dataFim}`,
      parametros,
      formato,
      geradoPorId: usuarioLogado.id,
      status: 'PROCESSANDO',
      expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000), // Expira em 24h
    });

    // Busca dados
    const { rows } = await solicitacaoRepository.findWithFilters({
      dataInicio,
      dataFim,
      categoriaId,
      centroCustoId,
      status: ['APROVADA', 'EM_PAGAMENTO', 'PAGA'],
      pageSize: 1000,
    });

    // Gera o arquivo conforme o formato
    let caminhoArquivo;
    try {
      switch (formato.toUpperCase()) {
        case 'PDF':
          caminhoArquivo = await this._gerarPDF(relatorio.id, rows, `Relatório de Despesas\n${dataInicio} a ${dataFim}`);
          break;
        case 'XLSX':
          caminhoArquivo = await this._gerarXLSX(relatorio.id, rows, 'Despesas por Período');
          break;
        case 'CSV':
          caminhoArquivo = await this._gerarCSV(relatorio.id, rows);
          break;
        default:
          throw new AppError('Formato de relatório inválido. Use PDF, XLSX ou CSV.', 400);
      }

      const stat = fs.statSync(caminhoArquivo);
      await relatorio.update({
        status: 'CONCLUIDO',
        caminhoArquivo,
        tamanhoArquivo: stat.size,
      });

      logger.info('Relatório gerado com sucesso', { relatorioId: relatorio.id, formato });
    } catch (error) {
      await relatorio.update({ status: 'FALHOU', erro: error.message });
      logger.error('Erro ao gerar relatório:', { error: error.message, relatorioId: relatorio.id });
      throw new AppError('Erro ao gerar relatório. Tente novamente.', 500);
    }

    return relatorio;
  }

  /**
   * Gera relatório de despesas por categoria
   * @param {Object} parametros
   * @param {Object} usuarioLogado
   */
  async gerarPorCategoria(parametros, usuarioLogado) {
    const { dataInicio, dataFim, formato = 'PDF' } = parametros;

    const dados = await solicitacaoRepository.getRankingCategorias({ dataInicio, dataFim });

    const relatorio = await relatorioRepository.create({
      tipo: 'DESPESAS_POR_CATEGORIA',
      nome: `Despesas por Categoria`,
      parametros,
      formato,
      geradoPorId: usuarioLogado.id,
      status: 'PROCESSANDO',
      expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const linhas = dados.map(d => ({
      Categoria: d.nome,
      'Quantidade de Solicitações': d.quantidade,
      'Valor Total (R$)': parseFloat(d.valor_total).toFixed(2),
      'Valor Médio (R$)': parseFloat(d.valor_medio).toFixed(2),
    }));

    let caminhoArquivo;
    if (formato === 'XLSX') {
      caminhoArquivo = await this._gerarXLSXSimples(relatorio.id, linhas, 'Despesas por Categoria');
    } else if (formato === 'CSV') {
      caminhoArquivo = await this._gerarCSVSimples(relatorio.id, linhas);
    } else {
      caminhoArquivo = await this._gerarPDFSimples(relatorio.id, linhas, 'Relatório por Categoria', dados);
    }

    const stat = fs.statSync(caminhoArquivo);
    await relatorio.update({ status: 'CONCLUIDO', caminhoArquivo, tamanhoArquivo: stat.size });

    return relatorio;
  }

  /**
   * Gera resumo executivo
   * @param {Object} parametros
   * @param {Object} usuarioLogado
   */
  async gerarResumoExecutivo(parametros, usuarioLogado) {
    const { dataInicio, dataFim } = parametros;

    const [totais, evolucao, ranking, centroCustos] = await Promise.all([
      solicitacaoRepository.getDashboardTotais({ dataInicio, dataFim }),
      solicitacaoRepository.getEvolucaoMensal(6),
      solicitacaoRepository.getRankingCategorias(),
      centroCustoRepository.getRelatorioOrcamento(),
    ]);

    const relatorio = await relatorioRepository.create({
      tipo: 'RESUMO_EXECUTIVO',
      nome: 'Resumo Executivo',
      parametros,
      formato: 'PDF',
      geradoPorId: usuarioLogado.id,
      status: 'PROCESSANDO',
      expiraEm: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const caminhoArquivo = await this._gerarResumoExecutivoPDF(
      relatorio.id,
      { totais, evolucao, ranking, centroCustos },
      parametros
    );

    const stat = fs.statSync(caminhoArquivo);
    await relatorio.update({ status: 'CONCLUIDO', caminhoArquivo, tamanhoArquivo: stat.size });

    return relatorio;
  }

  /**
   * Lista relatórios gerados com filtros
   */
  async listar(filtros, usuarioLogado) {
    // Usuário comum só vê seus relatórios
    if (!usuarioLogado.temPerfil('ADMIN', 'FINANCEIRO', 'GESTOR')) {
      filtros.geradoPorId = usuarioLogado.id;
    }
    return relatorioRepository.findWithFilters(filtros);
  }

  /**
   * Obtém caminho do arquivo para download
   * @param {string} id - UUID do relatório
   * @param {Object} usuarioLogado
   */
  async obterArquivo(id, usuarioLogado) {
    const relatorio = await relatorioRepository.findById(id);
    if (!relatorio) throw new AppError('Relatório não encontrado.', 404);

    if (relatorio.geradoPorId !== usuarioLogado.id &&
        !usuarioLogado.temPerfil('ADMIN', 'FINANCEIRO')) {
      throw new AppError('Você não tem permissão para baixar este relatório.', 403);
    }

    if (relatorio.status !== 'CONCLUIDO') {
      throw new AppError('Relatório ainda não foi concluído.', 400);
    }

    if (!fs.existsSync(relatorio.caminhoArquivo)) {
      throw new AppError('Arquivo do relatório não encontrado. Gere-o novamente.', 404);
    }

    return relatorio;
  }

  /**
   * Gera PDF de lista de solicitações
   * @private
   */
  async _gerarPDF(id, solicitacoes, titulo) {
    const nomeArquivo = `relatorio-${id}.pdf`;
    const caminho = path.join(reportsDir, nomeArquivo);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(caminho);

      doc.pipe(stream);

      // Cabeçalho
      doc.fontSize(18).font('Helvetica-Bold').text('SISTEMA DE REEMBOLSO DE DESPESAS', { align: 'center' });
      doc.fontSize(14).font('Helvetica').text(titulo, { align: 'center' });
      doc.moveDown();
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'right' });
      doc.moveDown();

      // Tabela de dados
      const colunas = ['Número', 'Data', 'Título', 'Solicitante', 'Valor (R$)', 'Status'];
      const larguras = [80, 70, 150, 100, 70, 80];
      let x = 50;
      let y = doc.y;

      // Cabeçalho da tabela
      doc.rect(50, y, 550, 20).fill('#1a56db');
      doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
      colunas.forEach((col, i) => {
        doc.text(col, x, y + 5, { width: larguras[i] });
        x += larguras[i];
      });
      doc.fillColor('black');
      y += 20;

      // Linhas de dados
      let totalValor = 0;
      solicitacoes.forEach((s, idx) => {
        x = 50;
        const bgColor = idx % 2 === 0 ? '#f8f9fa' : 'white';
        doc.rect(50, y, 550, 18).fill(bgColor).stroke('#e5e7eb');
        doc.fillColor('#1f2328').fontSize(8).font('Helvetica');

        const linha = [
          s.numero || '-',
          s.dataDespesa ? new Date(s.dataDespesa).toLocaleDateString('pt-BR') : '-',
          (s.titulo || '').substring(0, 25),
          (s.solicitante?.nome || '').substring(0, 15),
          parseFloat(s.valorTotal || 0).toFixed(2),
          s.status || '-',
        ];

        linha.forEach((val, i) => {
          doc.text(String(val), x + 2, y + 4, { width: larguras[i] - 4 });
          x += larguras[i];
        });

        totalValor += parseFloat(s.valorTotal || 0);
        y += 18;

        // Nova página se necessário
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
      });

      // Rodapé com total
      doc.moveDown(2);
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`Total: R$ ${totalValor.toFixed(2)}`, { align: 'right' });
      doc.text(`${solicitacoes.length} registro(s) encontrado(s)`, { align: 'left' });

      doc.end();

      stream.on('finish', () => resolve(caminho));
      stream.on('error', reject);
    });
  }

  /**
   * Gera XLSX de solicitações
   * @private
   */
  async _gerarXLSX(id, solicitacoes, nomePlanilha) {
    const nomeArquivo = `relatorio-${id}.xlsx`;
    const caminho = path.join(reportsDir, nomeArquivo);

    const dados = solicitacoes.map(s => ({
      'Número': s.numero,
      'Título': s.titulo,
      'Data da Despesa': s.dataDespesa,
      'Solicitante': s.solicitante?.nome || '-',
      'Departamento': s.solicitante?.departamento || '-',
      'Categoria': s.categoria?.nome || '-',
      'Centro de Custo': s.centroCusto?.nome || '-',
      'Valor Total (R$)': parseFloat(s.valorTotal || 0),
      'Moeda': s.moeda,
      'Status': s.status,
      'Data Submissão': s.dataSubmissao,
      'Data Aprovação': s.dataAprovacao,
      'Data Pagamento': s.dataPagamento,
      'Projeto': s.projeto || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomePlanilha);
    XLSX.writeFile(wb, caminho);

    return caminho;
  }

  /**
   * Gera CSV de solicitações
   * @private
   */
  async _gerarCSV(id, solicitacoes) {
    const nomeArquivo = `relatorio-${id}.csv`;
    const caminho = path.join(reportsDir, nomeArquivo);

    const dados = solicitacoes.map(s => ({
      numero: s.numero,
      titulo: s.titulo,
      data_despesa: s.dataDespesa,
      solicitante: s.solicitante?.nome || '',
      categoria: s.categoria?.nome || '',
      valor_total: parseFloat(s.valorTotal || 0).toFixed(2),
      status: s.status,
    }));

    const fields = ['numero', 'titulo', 'data_despesa', 'solicitante', 'categoria', 'valor_total', 'status'];
    const opts = { fields, delimiter: ';' };
    const csv = new (require('json2csv').Parser)(opts).parse(dados);
    fs.writeFileSync(caminho, '\uFEFF' + csv); // BOM para Excel reconhecer UTF-8

    return caminho;
  }

  /**
   * Gera XLSX simples (dados tabelados)
   * @private
   */
  async _gerarXLSXSimples(id, linhas, nomePlanilha) {
    const nomeArquivo = `relatorio-${id}.xlsx`;
    const caminho = path.join(reportsDir, nomeArquivo);
    const ws = XLSX.utils.json_to_sheet(linhas);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nomePlanilha);
    XLSX.writeFile(wb, caminho);
    return caminho;
  }

  /**
   * Gera CSV simples
   * @private
   */
  async _gerarCSVSimples(id, linhas) {
    const nomeArquivo = `relatorio-${id}.csv`;
    const caminho = path.join(reportsDir, nomeArquivo);
    if (linhas.length === 0) {
      fs.writeFileSync(caminho, 'Sem dados');
      return caminho;
    }
    const fields = Object.keys(linhas[0]);
    const csv = new (require('json2csv').Parser)({ fields, delimiter: ';' }).parse(linhas);
    fs.writeFileSync(caminho, '\uFEFF' + csv);
    return caminho;
  }

  /**
   * Gera PDF simples de dados tabelados
   * @private
   */
  async _gerarPDFSimples(id, linhas, titulo) {
    const nomeArquivo = `relatorio-${id}.pdf`;
    const caminho = path.join(reportsDir, nomeArquivo);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(caminho);
      doc.pipe(stream);

      doc.fontSize(16).font('Helvetica-Bold').text(titulo, { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
      doc.moveDown();

      linhas.forEach(linha => {
        Object.entries(linha).forEach(([key, val]) => {
          doc.text(`${key}: ${val}`);
        });
        doc.moveDown(0.5);
      });

      doc.end();
      stream.on('finish', () => resolve(caminho));
      stream.on('error', reject);
    });
  }

  /**
   * Gera PDF de resumo executivo
   * @private
   */
  async _gerarResumoExecutivoPDF(id, dados, parametros) {
    const nomeArquivo = `resumo-executivo-${id}.pdf`;
    const caminho = path.join(reportsDir, nomeArquivo);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(caminho);
      doc.pipe(stream);

      // Título
      doc.fontSize(20).font('Helvetica-Bold').text('RESUMO EXECUTIVO', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Sistema de Reembolso de Despesas', { align: 'center' });
      doc.moveDown();

      // KPIs principais
      const totais = dados.totais[0] || {};
      doc.fontSize(14).font('Helvetica-Bold').text('Indicadores Principais');
      doc.moveDown(0.5);

      const kpis = [
        ['Total de Solicitações', totais.total_solicitacoes || 0],
        ['Aguardando Aprovação', totais.aguardando_aprovacao || 0],
        ['Valor Total (R$)', parseFloat(totais.valor_total || 0).toFixed(2)],
        ['Valor Pago (R$)', parseFloat(totais.valor_pago || 0).toFixed(2)],
        ['Aprovadas', totais.aprovadas || 0],
        ['Rejeitadas', totais.rejeitadas || 0],
      ];

      kpis.forEach(([label, value]) => {
        doc.fontSize(10).font('Helvetica-Bold').text(`${label}: `, { continued: true });
        doc.font('Helvetica').text(String(value));
      });

      doc.moveDown();

      // Top categorias
      doc.fontSize(14).font('Helvetica-Bold').text('Top 5 Categorias');
      doc.moveDown(0.5);
      dados.ranking.slice(0, 5).forEach((c, i) => {
        doc.fontSize(10).font('Helvetica')
          .text(`${i + 1}. ${c.nome}: R$ ${parseFloat(c.valor_total || 0).toFixed(2)} (${c.quantidade} solicitações)`);
      });

      doc.end();
      stream.on('finish', () => resolve(caminho));
      stream.on('error', reject);
    });
  }
}

const relatorioService = new RelatorioService();
module.exports = { relatorioService };
