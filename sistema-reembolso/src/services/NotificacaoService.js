'use strict';

// =============================================================================
// NOTIFICACAO SERVICE
// Envio de notificações por e-mail e in-app
// =============================================================================

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { notificacaoRepository } = require('../repositories/index');
const usuarioRepository = require('../repositories/UsuarioRepository');
const { logger } = require('../config/logger');
const config = require('../config');

/**
 * @class NotificacaoService
 * @description Serviço de notificações com suporte a e-mail e in-app
 */
class NotificacaoService {
  constructor() {
    this._transporter = null;
    this._inicializarTransporter();
  }

  /**
   * Inicializa o transporter SMTP
   * @private
   */
  _inicializarTransporter() {
    if (!config.email.user) {
      logger.warn('SMTP não configurado. E-mails não serão enviados.');
      return;
    }

    this._transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
      tls: { rejectUnauthorized: false },
    });

    // Verifica conexão em desenvolvimento
    if (config.isDevelopment) {
      this._transporter.verify()
        .then(() => logger.info('SMTP configurado e funcionando'))
        .catch(err => logger.warn('SMTP: erro de verificação', { error: err.message }));
    }
  }

  /**
   * Envia e-mail de boas-vindas para novo usuário
   * @param {Object} usuario - Dados do usuário
   * @param {string} senhaTemporaria - Senha temporária gerada
   */
  async enviarBoasVindas(usuario, senhaTemporaria) {
    const assunto = `Bem-vindo ao Sistema de Reembolso - Acesso Criado`;
    const html = this._templateBoasVindas(usuario.nome, usuario.email, senhaTemporaria);

    await this._enviarEmail(usuario.email, assunto, html);

    await this._criarNotificacaoInApp({
      usuarioId: usuario.id,
      tipo: 'SISTEMA',
      titulo: 'Bem-vindo ao Sistema de Reembolso',
      mensagem: `Olá ${usuario.nome}! Sua conta foi criada. Acesse o sistema para definir sua senha.`,
    });

    logger.info('E-mail de boas-vindas enviado', { usuarioId: usuario.id, email: usuario.email });
  }

  /**
   * Envia e-mail de reset de senha
   * @param {Object} usuario
   * @param {string} token
   */
  async enviarResetSenha(usuario, token) {
    const link = `${config.cors.origin}/reset-senha?token=${token}`;
    const assunto = 'Redefinição de Senha - Sistema de Reembolso';
    const html = this._templateResetSenha(usuario.nome, link);

    await this._enviarEmail(usuario.email, assunto, html);
    logger.info('E-mail de reset de senha enviado', { usuarioId: usuario.id });
  }

  /**
   * Notifica aprovador sobre aprovação pendente
   * @param {Object} solicitacao - Dados da solicitação
   * @param {string} aprovadorId - ID do aprovador a notificar
   */
  async notificarAprovadorPendente(solicitacao, aprovadorId) {
    const aprovador = await usuarioRepository.findById(aprovadorId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!aprovador) return;

    const assunto = `Aprovação Pendente: ${solicitacao.numero}`;
    const html = this._templateAprovacaoPendente(
      aprovador.nome,
      solicitacao.numero,
      solicitacao.titulo,
      solicitacao.valorTotal,
      solicitacao.solicitante?.nome || 'Solicitante'
    );

    await Promise.all([
      this._enviarEmail(aprovador.email, assunto, html),
      this._criarNotificacaoInApp({
        usuarioId: aprovadorId,
        tipo: 'APROVACAO_PENDENTE',
        titulo: `Aprovação pendente: ${solicitacao.numero}`,
        mensagem: `Você tem uma aprovação pendente. ${solicitacao.titulo} - R$ ${parseFloat(solicitacao.valorTotal).toFixed(2)}`,
        solicitacaoId: solicitacao.id,
        dados: { numero: solicitacao.numero, valor: solicitacao.valorTotal },
      }),
    ]);
  }

  /**
   * Notifica solicitante sobre aprovação final
   * @param {Object} solicitacao
   */
  async notificarAprovacaoFinal(solicitacao) {
    const solicitante = await usuarioRepository.findById(solicitacao.solicitanteId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!solicitante) return;

    const assunto = `Solicitação Aprovada: ${solicitacao.numero}`;
    const html = this._templateSolicitacaoAprovada(
      solicitante.nome,
      solicitacao.numero,
      solicitacao.titulo,
      solicitacao.valorTotal
    );

    await Promise.all([
      this._enviarEmail(solicitante.email, assunto, html),
      this._criarNotificacaoInApp({
        usuarioId: solicitante.id,
        tipo: 'SOLICITACAO_APROVADA',
        titulo: `Solicitação aprovada! ${solicitacao.numero}`,
        mensagem: `Sua solicitação "${solicitacao.titulo}" foi aprovada. O reembolso de R$ ${parseFloat(solicitacao.valorTotal).toFixed(2)} será processado em breve.`,
        solicitacaoId: solicitacao.id,
      }),
    ]);
  }

  /**
   * Notifica solicitante sobre rejeição
   * @param {Object} solicitacao
   * @param {string} justificativa
   */
  async notificarRejeicao(solicitacao, justificativa) {
    const solicitante = await usuarioRepository.findById(solicitacao.solicitanteId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!solicitante) return;

    const assunto = `Solicitação Rejeitada: ${solicitacao.numero}`;
    const html = this._templateSolicitacaoRejeitada(
      solicitante.nome,
      solicitacao.numero,
      solicitacao.titulo,
      justificativa
    );

    await Promise.all([
      this._enviarEmail(solicitante.email, assunto, html),
      this._criarNotificacaoInApp({
        usuarioId: solicitante.id,
        tipo: 'SOLICITACAO_REJEITADA',
        titulo: `Solicitação rejeitada: ${solicitacao.numero}`,
        mensagem: `Sua solicitação "${solicitacao.titulo}" foi rejeitada. Motivo: ${justificativa}`,
        solicitacaoId: solicitacao.id,
      }),
    ]);
  }

  /**
   * Notifica solicitante sobre devolução para ajuste
   * @param {Object} solicitacao
   * @param {string} comentario
   */
  async notificarDevolucao(solicitacao, comentario) {
    const solicitante = await usuarioRepository.findById(solicitacao.solicitanteId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!solicitante) return;

    const html = this._templateDevolucao(
      solicitante.nome,
      solicitacao.numero,
      solicitacao.titulo,
      comentario
    );

    await Promise.all([
      this._enviarEmail(solicitante.email, `Solicitação Devolvida para Ajuste: ${solicitacao.numero}`, html),
      this._criarNotificacaoInApp({
        usuarioId: solicitante.id,
        tipo: 'SOLICITACAO_DEVOLVIDA',
        titulo: `Solicitação devolvida: ${solicitacao.numero}`,
        mensagem: `Sua solicitação "${solicitacao.titulo}" foi devolvida para ajuste: ${comentario}`,
        solicitacaoId: solicitacao.id,
      }),
    ]);
  }

  /**
   * Notifica sobre pagamento processado
   * @param {Object} solicitacao
   * @param {Object} pagamento
   */
  async notificarPagamento(solicitacao, pagamento) {
    const solicitante = await usuarioRepository.findById(solicitacao.solicitanteId, {
      attributes: ['id', 'nome', 'email'],
    });

    if (!solicitante) return;

    const html = this._templatePagamento(
      solicitante.nome,
      solicitacao.numero,
      pagamento.valor,
      pagamento.formaPagamento,
      pagamento.dataPagamento
    );

    await Promise.all([
      this._enviarEmail(solicitante.email, `Reembolso Processado: ${solicitacao.numero}`, html),
      this._criarNotificacaoInApp({
        usuarioId: solicitante.id,
        tipo: 'PAGAMENTO_PROCESSADO',
        titulo: `Reembolso pago! ${solicitacao.numero}`,
        mensagem: `Seu reembolso de R$ ${parseFloat(pagamento.valor).toFixed(2)} foi processado via ${pagamento.formaPagamento}.`,
        solicitacaoId: solicitacao.id,
      }),
    ]);
  }

  /**
   * Envia lembretes de aprovações pendentes
   */
  async enviarLembretes(solicitacoes) {
    for (const solicitacao of solicitacoes) {
      for (const aprovacao of solicitacao.aprovacoes || []) {
        if (aprovacao.status === 'PENDENTE' && aprovacao.aprovador) {
          const html = this._templateLembreteAprovacao(
            aprovacao.aprovador.nome,
            solicitacao.numero,
            solicitacao.titulo
          );
          await this._enviarEmail(
            aprovacao.aprovador.email,
            `[LEMBRETE] Aprovação Pendente: ${solicitacao.numero}`,
            html
          );

          await this._criarNotificacaoInApp({
            usuarioId: aprovacao.aprovadorId,
            tipo: 'LEMBRETE_APROVACAO',
            titulo: `Lembrete: Aprovação pendente ${solicitacao.numero}`,
            mensagem: `Você tem uma aprovação pendente há mais de 48h para: ${solicitacao.titulo}`,
            solicitacaoId: solicitacao.id,
          });
        }
      }
    }
  }

  /**
   * Envia e-mail via SMTP
   * @private
   */
  async _enviarEmail(para, assunto, html) {
    if (!this._transporter) {
      logger.warn('Transporter SMTP não disponível. E-mail não enviado.', { para, assunto });
      return;
    }

    try {
      const info = await this._transporter.sendMail({
        from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
        to: para,
        subject: assunto,
        html,
      });
      logger.info('E-mail enviado com sucesso', { messageId: info.messageId, para, assunto });
    } catch (error) {
      logger.error('Erro ao enviar e-mail:', { error: error.message, para, assunto });
      // Não propaga o erro para não interromper o fluxo principal
    }
  }

  /**
   * Cria notificação in-app no banco de dados
   * @private
   */
  async _criarNotificacaoInApp(dados) {
    try {
      await notificacaoRepository.create({
        ...dados,
        canal: 'IN_APP',
        enviada: true,
        enviadaEm: new Date(),
      });
    } catch (error) {
      logger.error('Erro ao criar notificação in-app:', { error: error.message });
    }
  }

  // =========================================================================
  // TEMPLATES DE E-MAIL (HTML inline)
  // =========================================================================

  _estiloBase() {
    return `
      body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
      .header { background: #1a56db; color: white; padding: 24px; text-align: center; }
      .header h1 { margin: 0; font-size: 20px; }
      .body { padding: 32px; color: #333; line-height: 1.6; }
      .info-box { background: #f8f9fa; border-left: 4px solid #1a56db; padding: 16px; margin: 16px 0; border-radius: 4px; }
      .btn { display: inline-block; background: #1a56db; color: white; text-decoration: none; padding: 12px 24px; border-radius: 6px; margin: 16px 0; font-weight: bold; }
      .footer { background: #f8f9fa; padding: 16px; text-align: center; color: #666; font-size: 12px; }
    `;
  }

  _templateBoasVindas(nome, email, senhaTemporaria) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header"><h1>🎉 Bem-vindo ao Sistema de Reembolso</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Sua conta foi criada com sucesso. Utilize as credenciais abaixo para o seu primeiro acesso:</p>
          <div class="info-box">
            <p><strong>E-mail:</strong> ${email}</p>
            <p><strong>Senha temporária:</strong> <code>${senhaTemporaria}</code></p>
          </div>
          <p>⚠️ Por segurança, você será solicitado a trocar a senha no primeiro acesso.</p>
          <a href="${config.cors.origin}/login" class="btn">Acessar o Sistema</a>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas | Este é um e-mail automático.</div>
      </div>
    </body></html>`;
  }

  _templateResetSenha(nome, link) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header"><h1>🔑 Redefinição de Senha</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
          <p>Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>2 horas</strong>.</p>
          <a href="${link}" class="btn">Redefinir Senha</a>
          <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas | Este é um e-mail automático.</div>
      </div>
    </body></html>`;
  }

  _templateAprovacaoPendente(aprovadorNome, numero, titulo, valor, solicitanteNome) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header"><h1>📋 Aprovação Pendente</h1></div>
        <div class="body">
          <p>Olá, <strong>${aprovadorNome}</strong>!</p>
          <p>Você tem uma solicitação de reembolso aguardando sua aprovação:</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Título:</strong> ${titulo}</p>
            <p><strong>Solicitante:</strong> ${solicitanteNome}</p>
            <p><strong>Valor:</strong> R$ ${parseFloat(valor).toFixed(2)}</p>
          </div>
          <a href="${config.cors.origin}/aprovacoes/${numero}" class="btn">Revisar Solicitação</a>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas | Este é um e-mail automático.</div>
      </div>
    </body></html>`;
  }

  _templateSolicitacaoAprovada(nome, numero, titulo, valor) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header" style="background:#059669"><h1>✅ Solicitação Aprovada!</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Sua solicitação de reembolso foi <strong>aprovada</strong>!</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Título:</strong> ${titulo}</p>
            <p><strong>Valor aprovado:</strong> R$ ${parseFloat(valor).toFixed(2)}</p>
          </div>
          <p>O pagamento será processado pela equipe financeira em breve.</p>
          <a href="${config.cors.origin}/solicitacoes/${numero}" class="btn">Ver Detalhes</a>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas</div>
      </div>
    </body></html>`;
  }

  _templateSolicitacaoRejeitada(nome, numero, titulo, justificativa) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header" style="background:#dc2626"><h1>❌ Solicitação Rejeitada</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Infelizmente sua solicitação de reembolso foi <strong>rejeitada</strong>.</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Título:</strong> ${titulo}</p>
            <p><strong>Motivo:</strong> ${justificativa}</p>
          </div>
          <p>Em caso de dúvidas, entre em contato com seu gestor ou com a equipe financeira.</p>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas</div>
      </div>
    </body></html>`;
  }

  _templateDevolucao(nome, numero, titulo, comentario) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header" style="background:#d97706"><h1>↩️ Solicitação Devolvida para Ajuste</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Sua solicitação foi devolvida para que você faça os ajustes necessários.</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Comentário do aprovador:</strong> ${comentario}</p>
          </div>
          <p>Acesse o sistema para fazer as correções e resubmeter.</p>
          <a href="${config.cors.origin}/solicitacoes/${numero}/editar" class="btn">Ajustar Solicitação</a>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas</div>
      </div>
    </body></html>`;
  }

  _templatePagamento(nome, numero, valor, forma, data) {
    const dataFormatada = data ? new Date(data).toLocaleDateString('pt-BR') : 'Em breve';
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header" style="background:#059669"><h1>💰 Reembolso Pago!</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Seu reembolso foi processado com sucesso!</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Valor:</strong> R$ ${parseFloat(valor).toFixed(2)}</p>
            <p><strong>Forma de pagamento:</strong> ${forma.replace(/_/g, ' ')}</p>
            <p><strong>Data:</strong> ${dataFormatada}</p>
          </div>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas</div>
      </div>
    </body></html>`;
  }

  _templateLembreteAprovacao(nome, numero, titulo) {
    return `<!DOCTYPE html><html><head><style>${this._estiloBase()}</style></head><body>
      <div class="container">
        <div class="header" style="background:#d97706"><h1>⏰ Lembrete de Aprovação Pendente</h1></div>
        <div class="body">
          <p>Olá, <strong>${nome}</strong>!</p>
          <p>Este é um lembrete de que você possui uma aprovação pendente há mais de 48 horas:</p>
          <div class="info-box">
            <p><strong>Número:</strong> ${numero}</p>
            <p><strong>Título:</strong> ${titulo}</p>
          </div>
          <a href="${config.cors.origin}/aprovacoes" class="btn">Revisar Aprovações</a>
        </div>
        <div class="footer">Sistema de Reembolso de Despesas</div>
      </div>
    </body></html>`;
  }
}

const notificacaoService = new NotificacaoService();
module.exports = { notificacaoService };
