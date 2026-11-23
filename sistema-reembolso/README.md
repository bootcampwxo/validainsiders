# Sistema de Reembolso de Despesas

> API RESTful completa construída com Node.js + PostgreSQL para gerenciamento robusto de reembolsos corporativos.

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Setup](#instalação-e-setup)
- [Configuração](#configuração)
- [Executando a Aplicação](#executando-a-aplicação)
- [Endpoints da API](#endpoints-da-api)
- [Perfis de Usuário](#perfis-de-usuário)
- [Fluxo de Aprovação](#fluxo-de-aprovação)
- [Testes](#testes)
- [Deploy em Produção](#deploy-em-produção)
- [Monitoramento e Logs](#monitoramento-e-logs)

---

## Visão Geral

Sistema completo de reembolso de despesas corporativas com:

| Funcionalidade | Descrição |
|---|---|
| **Autenticação JWT** | Login seguro com refresh token e proteção contra brute-force |
| **5 Perfis de Usuário** | Admin, Gestor, Aprovador, Financeiro, Colaborador |
| **Fluxo Multinível** | Aprovação configurável por políticas (valor/categoria) |
| **Upload de Comprovantes** | PDF e imagens com validação de tamanho/tipo |
| **Relatórios** | PDF, Excel e CSV com dados consolidados |
| **Auditoria Completa** | Log de todas as ações do sistema |
| **Notificações** | E-mail e in-app para cada etapa do fluxo |
| **Documentação Swagger** | API totalmente documentada e interativa |

---

## Arquitetura

```
sistema-reembolso/
├── src/
│   ├── config/           # Configurações (DB, logger, swagger)
│   ├── models/           # Models Sequelize (ORM)
│   ├── repositories/     # Camada de acesso a dados (Repository Pattern)
│   ├── services/         # Lógica de negócio (Service Layer)
│   ├── controllers/      # Controladores HTTP (Express)
│   ├── middlewares/      # Auth, validação, rate limiting, erros
│   ├── routes/           # Definição de rotas
│   ├── database/         # Migrations e seeds
│   ├── utils/            # Utilitários (AppError, helpers)
│   ├── app.js            # Configuração do Express
│   └── server.js         # Entry point do servidor
├── tests/
│   ├── unit/             # Testes unitários dos services
│   └── integration/      # Testes de integração dos endpoints
├── uploads/              # Arquivos enviados (auto-criado)
├── logs/                 # Arquivos de log (auto-criado)
├── reports/              # Relatórios gerados (auto-criado)
└── package.json
```

### Padrão de Camadas

```
HTTP Request → Router → Middleware (Auth/Validação) → Controller → Service → Repository → Database
```

---

## Pré-requisitos

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14
- **npm** >= 9.0.0
- **Redis** >= 7 (opcional, para cache)

---

## Instalação e Setup

### 1. Clone o repositório e instale as dependências

```bash
cd sistema-reembolso
npm install
```

### 2. Crie o banco de dados PostgreSQL

```sql
-- Acesse o psql ou use pgAdmin
CREATE DATABASE sistema_reembolso;
CREATE DATABASE sistema_reembolso_test;  -- para testes
```

### 3. Configure as variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env com suas configurações
```

### 4. Execute as migrations

```bash
npm run migrate
```

### 5. Execute o seed (dados iniciais)

```bash
npm run seed
```

### 6. Inicie o servidor

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

Acesse:
- **API**: http://localhost:3000/api
- **Documentação**: http://localhost:3000/api/docs
- **Health Check**: http://localhost:3000/health

---

## Configuração

Todas as configurações são via variáveis de ambiente (arquivo `.env`):

### Banco de Dados

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_reembolso
DB_USER=postgres
DB_PASSWORD=sua_senha_aqui
```

### JWT (Autenticação)

```env
JWT_SECRET=chave-secreta-minimo-32-chars-aqui
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=outra-chave-secreta-para-refresh
JWT_REFRESH_EXPIRES_IN=7d
```

### E-mail (SMTP)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@email.com
SMTP_PASSWORD=senha-de-app-do-gmail
```

> **Dica Gmail**: Use Senha de App (não a senha principal). Ative em Conta Google → Segurança → Verificação em 2 etapas → Senhas de app.

---

## Executando a Aplicação

### Comandos disponíveis

```bash
npm run dev        # Desenvolvimento com nodemon
npm start          # Produção
npm run migrate    # Executar migrations pendentes
npm run migrate:rollback  # Reverter última migration
npm run seed       # Popula banco com dados iniciais
npm test           # Todos os testes
npm run test:unit  # Apenas testes unitários
npm run test:integration  # Apenas testes de integração
npm run test:coverage     # Relatório de cobertura
```

---

## Endpoints da API

### Autenticação

| Método | Endpoint | Descrição | Auth? |
|--------|----------|-----------|-------|
| `POST` | `/api/auth/login` | Login com e-mail e senha | ❌ |
| `POST` | `/api/auth/refresh` | Renova access token | ❌ |
| `POST` | `/api/auth/logout` | Revoga sessão atual | ✅ |
| `POST` | `/api/auth/logout-todos` | Revoga todas as sessões | ✅ |
| `GET`  | `/api/auth/me` | Dados do usuário logado | ✅ |
| `POST` | `/api/auth/solicitar-reset` | Solicita reset de senha | ❌ |
| `POST` | `/api/auth/redefinir-senha` | Redefine senha via token | ❌ |

### Usuários

| Método | Endpoint | Descrição | Perfis |
|--------|----------|-----------|--------|
| `GET` | `/api/usuarios` | Lista usuários | Todos |
| `GET` | `/api/usuarios/:id` | Busca usuário | Todos |
| `POST` | `/api/usuarios` | Cria usuário | Admin |
| `PUT` | `/api/usuarios/:id` | Atualiza usuário | Admin / Próprio |
| `PATCH` | `/api/usuarios/:id/desativar` | Desativa usuário | Admin |
| `PATCH` | `/api/usuarios/:id/reativar` | Reativa usuário | Admin |
| `PUT` | `/api/usuarios/:id/senha` | Troca senha | Admin / Próprio |

### Solicitações de Reembolso

| Método | Endpoint | Descrição | Perfis |
|--------|----------|-----------|--------|
| `GET` | `/api/solicitacoes` | Lista solicitações | Todos |
| `GET` | `/api/solicitacoes/dashboard` | Dashboard resumido | Todos |
| `GET` | `/api/solicitacoes/:id` | Detalhes completos | Todos* |
| `POST` | `/api/solicitacoes` | Cria solicitação | Todos |
| `PUT` | `/api/solicitacoes/:id` | Atualiza rascunho | Solicitante |
| `PATCH` | `/api/solicitacoes/:id/submeter` | Submete para aprovação | Solicitante |
| `PATCH` | `/api/solicitacoes/:id/aprovar` | Aprova | Aprovador/Gestor/Admin |
| `PATCH` | `/api/solicitacoes/:id/rejeitar` | Rejeita | Aprovador/Gestor/Admin |
| `PATCH` | `/api/solicitacoes/:id/devolver` | Devolve para ajuste | Aprovador/Gestor/Admin |
| `PATCH` | `/api/solicitacoes/:id/cancelar` | Cancela | Solicitante/Admin |
| `POST` | `/api/solicitacoes/:id/comprovantes` | Upload de comprovante | Solicitante |
| `GET` | `/api/solicitacoes/:id/comprovantes` | Lista comprovantes | Todos* |

### Pagamentos

| Método | Endpoint | Descrição | Perfis |
|--------|----------|-----------|--------|
| `GET` | `/api/pagamentos` | Lista pagamentos | Admin/Financeiro |
| `POST` | `/api/pagamentos` | Registra pagamento | Admin/Financeiro |
| `PATCH` | `/api/pagamentos/:id/confirmar` | Confirma pagamento | Admin/Financeiro |
| `GET` | `/api/pagamentos/totais` | Totais por forma | Admin/Financeiro |

### Relatórios

| Método | Endpoint | Descrição | Perfis |
|--------|----------|-----------|--------|
| `GET` | `/api/relatorios` | Lista relatórios gerados | Todos |
| `POST` | `/api/relatorios/por-periodo` | Gera relatório por período | Admin/Financeiro/Gestor |
| `POST` | `/api/relatorios/por-categoria` | Gera relatório por categoria | Admin/Financeiro/Gestor |
| `POST` | `/api/relatorios/resumo-executivo` | Gera resumo executivo | Admin/Financeiro |
| `GET` | `/api/relatorios/:id/download` | Download do relatório | Dono/Admin |

---

## Perfis de Usuário

| Perfil | Descrição | Permissões Principais |
|--------|-----------|----------------------|
| `ADMIN` | Administrador do sistema | Acesso total |
| `GESTOR` | Gestor de equipe | Criar/Aprovar/Ver equipe |
| `APROVADOR` | Aprovador de despesas | Aprovar/Rejeitar/Devolver |
| `FINANCEIRO` | Equipe financeira | Processar pagamentos, relatórios |
| `COLABORADOR` | Colaborador comum | Criar/Submeter próprias solicitações |

---

## Fluxo de Aprovação

```
[Rascunho] → [Submetida] → [Em Análise] → [Aprovada] → [Em Pagamento] → [Paga]
                               ↓
                           [Rejeitada]
                               ↓
                           [Devolvida] → (Solicitante ajusta) → [Submetida]
```

### Status Possíveis

| Status | Descrição |
|--------|-----------|
| `RASCUNHO` | Sendo elaborada pelo solicitante |
| `SUBMETIDA` | Aguardando primeiro aprovador |
| `EM_ANALISE` | Em análise (nível 2+ de aprovação) |
| `APROVADA` | Aprovada, aguardando pagamento |
| `REJEITADA` | Rejeitada em algum nível |
| `CANCELADA` | Cancelada pelo solicitante |
| `EM_PAGAMENTO` | Pagamento em processamento |
| `PAGA` | Reembolso efetuado |
| `DEVOLVIDA` | Devolvida para ajuste |

---

## Exemplo de Uso da API

### 1. Fazer Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@empresa.com.br", "senha": "Admin@123"}'
```

Resposta:
```json
{
  "sucesso": true,
  "dados": {
    "usuario": {"id": "...", "nome": "Administrador", "perfil": "ADMIN"},
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "primeiroAcesso": false
  }
}
```

### 2. Criar Solicitação de Reembolso

```bash
curl -X POST http://localhost:3000/api/solicitacoes \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Almoço com cliente - Proposta Projeto X",
    "categoriaId": "uuid-categoria-alimentacao",
    "dataDespesa": "2024-01-15",
    "valorTotal": 125.50,
    "projeto": "Projeto Alpha",
    "observacoes": "Almoço com João da empresa ABC"
  }'
```

### 3. Submeter para Aprovação

```bash
curl -X PATCH http://localhost:3000/api/solicitacoes/{id}/submeter \
  -H "Authorization: Bearer {accessToken}"
```

### 4. Aprovar (como Aprovador)

```bash
curl -X PATCH http://localhost:3000/api/solicitacoes/{id}/aprovar \
  -H "Authorization: Bearer {tokenAprovador}" \
  -H "Content-Type: application/json" \
  -d '{"comentario": "Despesa justificada e dentro do limite."}'
```

---

## Testes

### Executar todos os testes

```bash
npm test
```

### Relatório de cobertura

```bash
npm run test:coverage
# Abre coverage/lcov-report/index.html
```

### Estrutura dos testes

```
tests/
├── unit/
│   ├── AuthService.test.js       # Testes de autenticação
│   ├── UsuarioService.test.js    # Testes de usuários
│   └── SolicitacaoService.test.js # Testes de solicitações
└── integration/
    └── auth.test.js              # Testes de integração HTTP
```

---

## Deploy em Produção

### Docker (recomendado)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - postgres
  postgres:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: sistema_reembolso
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: sua_senha
volumes:
  pgdata:
```

### Variáveis obrigatórias em Produção

```env
NODE_ENV=production
JWT_SECRET=chave-de-producao-muito-segura-minimo-64-chars
JWT_REFRESH_SECRET=outra-chave-de-producao-muito-segura
DB_PASSWORD=senha-forte-do-postgres
SMTP_USER=email@empresa.com
SMTP_PASSWORD=senha-smtp
```

---

## Monitoramento e Logs

Os logs são salvos automaticamente em `logs/`:

| Arquivo | Conteúdo |
|---------|----------|
| `combined-YYYY-MM-DD.log` | Todos os logs |
| `error-YYYY-MM-DD.log` | Apenas erros |
| `access-YYYY-MM-DD.log` | Logs de acesso HTTP |
| `audit-YYYY-MM-DD.log` | Auditoria de ações |

Logs são rotacionados diariamente e mantidos por 14 dias (audit: 30 dias).

---

## Credenciais de Teste (após seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Admin | `admin@empresa.com.br` | `Admin@123` |
| Gestor | `maria.gestora@empresa.com.br` | `Senha@123` |
| Aprovador | `carlos.aprovador@empresa.com.br` | `Senha@123` |
| Financeiro | `ana.financeiro@empresa.com.br` | `Senha@123` |
| Colaborador | `joao.colaborador@empresa.com.br` | `Senha@123` |

---

*Gerado com apoio do IBM Bob*
