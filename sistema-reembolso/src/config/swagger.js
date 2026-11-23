'use strict';

// =============================================================================
// SWAGGER / OPENAPI DOCUMENTATION
// Configuração completa da documentação interativa da API
// =============================================================================

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { version } = require('../../package.json');

/**
 * Definição completa da especificação OpenAPI 3.0
 */
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'API do Sistema de Reembolso de Despesas',
    version,
    description: `
# Sistema de Reembolso de Despesas

API RESTful completa para gerenciamento de reembolsos corporativos.

## Funcionalidades

- **Autenticação JWT** com refresh token e proteção contra brute-force
- **Gestão de usuários** com múltiplos perfis (Admin, Gestor, Aprovador, Financeiro, Colaborador)
- **Fluxo de aprovação multinível** configurável por políticas
- **Upload de comprovantes** (PDF, imagens)
- **Relatórios e analytics** em PDF, Excel e CSV
- **Auditoria completa** de todas as ações
- **Notificações** por e-mail e in-app

## Autenticação

Use o endpoint \`POST /auth/login\` para obter o \`accessToken\` e então inclua no header:
\`\`\`
Authorization: Bearer {accessToken}
\`\`\`

## Paginação

Todos os endpoints de listagem suportam:
- \`pagina\` (default: 1)
- \`tamanho\` (default: 20, máximo: 100)

## Formato de Resposta

Todas as respostas seguem o padrão:
\`\`\`json
{
  "sucesso": true,
  "mensagem": "Descrição",
  "dados": {},
  "paginacao": {
    "total": 100,
    "pagina": 1,
    "tamanhoPagina": 20,
    "totalPaginas": 5
  }
}
\`\`\`
    `,
    contact: {
      name: 'Suporte Técnico',
      email: 'suporte@sistema-reembolso.com.br',
    },
    license: {
      name: 'MIT',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'Servidor da API',
    },
    {
      url: 'http://localhost:3000/api',
      description: 'Desenvolvimento local',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Token JWT obtido via POST /auth/login',
      },
    },
    schemas: {
      // ---- Usuário ----
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'João da Silva' },
          email: { type: 'string', format: 'email', example: 'joao@empresa.com.br' },
          perfil: {
            type: 'string',
            enum: ['ADMIN', 'GESTOR', 'APROVADOR', 'FINANCEIRO', 'COLABORADOR'],
          },
          departamento: { type: 'string', example: 'Tecnologia' },
          cargo: { type: 'string', example: 'Analista Sênior' },
          matricula: { type: 'string', example: 'TEC-001' },
          ativo: { type: 'boolean' },
          limiteAprovacao: { type: 'number', example: 5000.00 },
          ultimoLogin: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ---- Solicitação ----
      SolicitacaoReembolso: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          numero: { type: 'string', example: 'REE-2024-000001' },
          titulo: { type: 'string', example: 'Despesas de viagem - Reunião SP' },
          descricao: { type: 'string' },
          status: {
            type: 'string',
            enum: ['RASCUNHO', 'SUBMETIDA', 'EM_ANALISE', 'APROVADA', 'REJEITADA', 'CANCELADA', 'EM_PAGAMENTO', 'PAGA', 'DEVOLVIDA'],
          },
          valorTotal: { type: 'number', format: 'float', example: 450.00 },
          moeda: { type: 'string', example: 'BRL' },
          dataDespesa: { type: 'string', format: 'date', example: '2024-01-15' },
          prioridade: { type: 'string', enum: ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'] },
          solicitante: { $ref: '#/components/schemas/Usuario' },
          categoria: { $ref: '#/components/schemas/CategoriaDespesa' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },

      // ---- Criar Solicitação ----
      CriarSolicitacao: {
        type: 'object',
        required: ['titulo', 'categoriaId', 'dataDespesa'],
        properties: {
          titulo: { type: 'string', minLength: 5, maxLength: 200, example: 'Almoço com cliente' },
          descricao: { type: 'string', example: 'Almoço de negócios para apresentação de proposta' },
          categoriaId: { type: 'string', format: 'uuid' },
          centroCustoId: { type: 'string', format: 'uuid' },
          dataDespesa: { type: 'string', format: 'date', example: '2024-01-15' },
          valorTotal: { type: 'number', minimum: 0.01, example: 125.50 },
          moeda: { type: 'string', default: 'BRL', example: 'BRL' },
          prioridade: { type: 'string', enum: ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE'], default: 'NORMAL' },
          projeto: { type: 'string', example: 'Projeto Alpha' },
          observacoes: { type: 'string' },
          itens: {
            type: 'array',
            items: { $ref: '#/components/schemas/ItemDespesa' },
          },
        },
      },

      // ---- Item Despesa ----
      ItemDespesa: {
        type: 'object',
        required: ['descricao', 'categoriaId', 'dataDespesa', 'valorUnitario'],
        properties: {
          descricao: { type: 'string', example: 'Táxi aeroporto' },
          categoriaId: { type: 'string', format: 'uuid' },
          dataDespesa: { type: 'string', format: 'date' },
          quantidade: { type: 'number', default: 1, example: 1 },
          valorUnitario: { type: 'number', minimum: 0.01, example: 85.00 },
          fornecedor: { type: 'string', example: '99 App' },
          numeroNotaFiscal: { type: 'string' },
          observacoes: { type: 'string' },
        },
      },

      // ---- Categoria ----
      CategoriaDespesa: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nome: { type: 'string', example: 'Alimentação' },
          codigo: { type: 'string', example: 'ALIM' },
          icone: { type: 'string', example: '🍽️' },
          cor: { type: 'string', example: '#059669' },
          limitePadrao: { type: 'number', example: 100.00 },
          requerComprovante: { type: 'boolean' },
        },
      },

      // ---- Aprovação ----
      Aprovacao: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          nivel: { type: 'integer', example: 1 },
          status: {
            type: 'string',
            enum: ['PENDENTE', 'APROVADO', 'REJEITADO', 'DEVOLVIDO', 'EXPIRADO'],
          },
          comentario: { type: 'string' },
          dataLimite: { type: 'string', format: 'date-time' },
          dataAcao: { type: 'string', format: 'date-time' },
          aprovador: { $ref: '#/components/schemas/Usuario' },
        },
      },

      // ---- Pagamento ----
      Pagamento: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          valor: { type: 'number', example: 450.00 },
          formaPagamento: {
            type: 'string',
            enum: ['TRANSFERENCIA_BANCARIA', 'PIX', 'BOLETO', 'CHEQUE', 'DINHEIRO', 'VALE_REFEICAO', 'CARTAO_CORPORATIVO'],
          },
          status: {
            type: 'string',
            enum: ['AGENDADO', 'PROCESSANDO', 'CONCLUIDO', 'FALHOU', 'CANCELADO', 'ESTORNADO'],
          },
          dataPagamento: { type: 'string', format: 'date-time' },
          codigoTransacao: { type: 'string' },
        },
      },

      // ---- Resposta de Erro ----
      Erro: {
        type: 'object',
        properties: {
          sucesso: { type: 'boolean', example: false },
          mensagem: { type: 'string', example: 'Descrição do erro' },
          code: { type: 'string', example: 'NOT_FOUND' },
          erros: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                campo: { type: 'string' },
                mensagem: { type: 'string' },
              },
            },
          },
        },
      },

      // ---- Paginação ----
      Paginacao: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 100 },
          pagina: { type: 'integer', example: 1 },
          tamanhoPagina: { type: 'integer', example: 20 },
          totalPaginas: { type: 'integer', example: 5 },
          temProxima: { type: 'boolean' },
          temAnterior: { type: 'boolean' },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: 'Autenticação necessária',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
          },
        },
      },
      Forbidden: {
        description: 'Acesso negado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
          },
        },
      },
      NotFound: {
        description: 'Recurso não encontrado',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
          },
        },
      },
      ValidationError: {
        description: 'Dados de entrada inválidos',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Erro' },
          },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  tags: [
    { name: 'Autenticação', description: 'Login, logout, reset de senha e tokens' },
    { name: 'Usuários', description: 'CRUD de usuários e gerenciamento de perfis' },
    { name: 'Solicitações', description: 'Criar e gerenciar solicitações de reembolso' },
    { name: 'Pagamentos', description: 'Processar e confirmar pagamentos de reembolsos' },
    { name: 'Categorias', description: 'Categorias de despesa' },
    { name: 'Centros de Custo', description: 'Gerenciar centros de custo e orçamentos' },
    { name: 'Relatórios', description: 'Gerar e baixar relatórios em PDF/Excel/CSV' },
    { name: 'Notificações', description: 'Notificações in-app do usuário' },
    { name: 'Auditoria', description: 'Trilha de auditoria do sistema (apenas admin)' },
  ],
};

const options = {
  definition: swaggerDefinition,
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

/**
 * Configura as rotas de documentação Swagger no app Express
 * @param {Express} app - Instância do Express
 */
const setupSwagger = (app) => {
  // Serve a UI do Swagger
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: `
      .swagger-ui .topbar { background-color: #1a56db; }
      .swagger-ui .topbar .download-url-wrapper { display: none; }
      .swagger-ui .info .title { font-size: 2em; }
    `,
    customSiteTitle: 'API Reembolso - Documentação',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    },
  }));

  // Serve a spec JSON bruta (útil para clientes Swagger)
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = { setupSwagger, swaggerSpec };
