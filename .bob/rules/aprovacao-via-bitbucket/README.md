---
author: Framework .Bob (Sicoob)
---

# Aprovação de Portões via Bitbucket (opcional, complementar à Regra 06)

## Objetivo
Descrever um modelo **opcional** para tornar a aprovação de portões (`.bob/rules/06-portoes-aprovacao-humana.md`) um evento nativo do Bitbucket — um Pull Request pequeno e revisado por grupo, em vez de um humano editando `Status: APPROVED` à mão em `gates/<CHAVE_DO_ITEM>/*.md`. Isso torna a aprovação auditável (histórico de review do Bitbucket) e permite que cada grupo de usuários só precise revisar/aprovar os portões da sua própria função.

Esta regra **não substitui** a Regra 06. Times que preferem continuar editando `gates/*.md` manualmente podem seguir fazendo isso — o modelo abaixo é para times que já trabalham via Pull Request no Bitbucket e querem que a revisão do PR *seja* a aprovação do portão, sem um passo manual duplicado.

## O que muda em relação ao fluxo atual
Hoje, só existe **um PR por sprint** (na etapa `05-pr`); todas as fases anteriores (`00-discovery` a `04-sprintplan`) vivem apenas como markdown na branch de trabalho, sem revisão do Bitbucket. Neste modelo, **cada fase/portão vira um PR próprio**, pequeno, tocando só a pasta daquela fase.

## Padrão de branches
Para cada item de trabalho (`<CHAVE_DO_ITEM>`, ex.: `FEAT-simulacao-consignado`):

1. Crie uma branch de integração a partir de `main`: `feature/<CHAVE_DO_ITEM>`
   - Esta branch nunca é mergeada direto em `main` — ela acumula as fases aprovadas até a etapa `05-pr`.
2. Para cada fase, crie uma branch filha nomeada com o slug exato do portão:
   `feature/<CHAVE_DO_ITEM>/<gate-slug>`, onde `<gate-slug>` é um destes:
   `00-discovery`, `00-resourcing`, `01-prd`, `02-backlog`, `03-adr`, `03-design`, `04-sprintplan`, `05-pr`, `06-release-ready`.
3. Abra um PR de `feature/<CHAVE_DO_ITEM>/<gate-slug>` → `feature/<CHAVE_DO_ITEM>`, tocando **só** a pasta daquela fase (ex.: `prd/`, `architecture/adr/`, `design/`).
4. O merge desse PR (após aprovação do grupo dono via CODEOWNERS) **é** o evento de aprovação do portão.
5. Quando `05-pr` (o PR de código) estiver pronto, abra o PR final `feature/<CHAVE_DO_ITEM>` → `main` — este é o PR de código normal já existente hoje, sujeito aos mesmos donos de código (`src/`, `tests/`, etc.).

A nomenclatura da branch filha (`<gate-slug>` exato) é o que permite à automação (ver seção "Sincronização automática" abaixo) identificar a qual arquivo `gates/<CHAVE_DO_ITEM>/<gate-slug>.md` aquele PR corresponde.

## Groups do Bitbucket sugeridos (a criar)
Seu workspace ainda não tem grupos por papel — a tabela abaixo propõe um mapeamento 1:1 (ou próximo) com os modos do `.bob`, para servir de ponto de partida. Ajuste os nomes/slugs à convenção do seu workspace.

| Modo `.bob` (slug) | Grupo sugerido | Portão(ões) que aprova | Pasta(s) principal(is) |
|---|---|---|---|
| `discovery` (Descoberta) | `time-descoberta` | `00-discovery` | `discovery/` |
| `product-owner` | `time-produto` | `00-resourcing`, `01-prd`, `02-backlog` | `prd/`, `backlog/` |
| `architect` | `time-arquitetura` | `03-adr` | `architecture/` |
| `designer` | `time-design` | `03-design` | `design/` |
| `sprint-planner` | `time-entrega` | `04-sprintplan` | `delivery/` |
| `developer` | `time-dev` | `05-pr` (código) | `src/`, `app/`, `product-engineering/` |
| `tester` (QA) | `time-qa` | `05-pr` (testes) | `tests/` |
| `security` | `time-seguranca` | `05-pr` (itens sensíveis — auth, dados, crypto, infra) | `security/` e pontos de gatilho de `.bob/rules-security/01-seguranca.md` |
| `doc-writer` | `time-docs` | `05-pr` (documentação) | `docs/` |
| `revisor-qualidade` + `governanca` | `time-governanca` | `06-release-ready` | (transversal — sign-off final) |
| `product-engineer` | `time-produto-eng` | fora do fluxo principal de portões (incidentes/otimização pós-release) | `product-engineering/` |

**Mapeamento real usado no workspace de teste `bobplace`** (grupos já criados, nomes divergem da convenção `time-x` sugerida acima — ajuste o `.bitbucket/CODEOWNERS` e o `ROLE_GROUPS=(...)` de `provisionar-repo-bitbucket.sh` de acordo):

| Grupo sugerido acima | Grupo real criado | Slug amigável (usar no `CODEOWNERS`) |
|---|---|---|
| `time-descoberta` | `Bob-Descoberta` | `bob-descoberta` |
| `time-produto` | `Bob-ProductOwner` | `bob-productowner` |
| `time-arquitetura` | `Bob-Arquiteto` | `bob-arquiteto` |
| `time-design` | `Bob-Designer` | `bob-designer` |
| `time-entrega` | `Bob-PlanejadorSprint` | `bob-planejadorsprint` |
| `time-dev` | `Bob-Desenvolvedor` | `bob-desenvolvedor` |
| `time-qa` | `BobTestadorQA` | `bobtestadorqa` |
| `time-seguranca` | `BobSeguranca` | `bobseguranca` |
| `time-docs` | `BobRedatorDoc` | `bobredatordoc` |
| `time-governanca` (split em 2) | `BobGovernanca` + `BobRevisorQA` | `bobgovernanca`, `bobrevisorqa` |
| `time-produto-eng` | `BobEngenheiroProduto` | `bobengenheiroproduto` |

**Atenção:** o slug amigável (kebab-case do nome) é o que o `CODEOWNERS` usa; a API de permissões (`permissions-config/groups`, usada pelo script de provisionamento) usa o UUID do grupo — propósitos diferentes, não troque um pelo outro.

Crie estes grupos em **Workspace settings → User groups**, adicione as pessoas correspondentes, e use os handles (`@sua-workspace/slug-amigavel-do-grupo`) no arquivo `CODEOWNERS` (modelo já preenchido para `bobplace` em `.bitbucket/CODEOWNERS`).

## CODEOWNERS + branch permissions (OBRIGATÓRIO para este modelo funcionar)
1. Preencha `.bitbucket/CODEOWNERS` (modelo já incluso neste framework, já preenchido com os grupos reais de `bobplace`) substituindo `@sua-workspace/...` pelos handles reais dos grupos criados acima. Isso só **adiciona automaticamente** os reviewers certos em cada PR — não bloqueia nada sozinho.
   - **Pegadinha confirmada por teste real (PR de verdade)**: o CODEOWNERS usa o **slug amigável** do grupo (nome em minúsculas, espaços viram hífen), **não** o UUID — o oposto do que a API de permissões exige. Sempre valide com uma PR de teste ao usar isso em outro workspace.
2. Em **Repository settings → Branch restrictions** (ou, melhor, no nível de Project) → **Add a branch restriction**, para `feature/*` (ou, no mínimo, `feature/*/*`) e para `main`:
   - Aba **"Branch permissions"** → **Write access**: **"Only specific people or groups have write access"** e não liste ninguém (ou só um admin de emergência) — é isso que bloqueia push direto e obriga passar por Pull Request.
   - Aba **"Merge settings"** → Merge checks: **"Minimum number of approvals"** ≥ `1`.
   - Ainda em "Merge settings" → Merge conditions: **"Prevent a merge with unresolved merge checks"** (Premium) — sem isso, os merge checks acima são só aviso, não bloqueio.

**Ressalva sobre CODEOWNERS**: o Bitbucket não tem um checkbox nativo "exigir aprovação de um code owner" (diferente do GitHub). O que bloqueia o merge é o "Minimum number of approvals" acima; o CODEOWNERS só garante que a pessoa certa foi convidada como reviewer. Tecnicamente qualquer aprovação conta pro mínimo — enforcement mais rígido exigiria um app de terceiros.

**Importante sobre planos**: no Bitbucket Free, branch permissions e a exigência de aprovação de code owners **não funcionam em repositórios privados** — só em públicos. "Prevent a merge with unresolved merge checks", "Reset approvals when the source branch is modified" e "Keep approvals if there is no change to the diff" são exclusivos do plano Premium (ícone de diamante) — se aparecerem acinzentados mesmo num workspace Premium, confira **Workspace settings → Plan details** antes de considerar a proteção real.

## Criação automática de repositórios (Oráculo) + branch permissions de Projeto
Hoje, quando o modo 🔮 Oráculo cria um projeto novo, ele só prepara o repositório **localmente** por padrão — a criação do repositório remoto e a permissão dos grupos são uma operação separada, com dono e risco diferentes:

### Parte 1 — Setup único, feito por um humano (uma vez por workspace)
1. Crie os Groups da tabela acima, com as pessoas certas em cada um.
2. Crie um **Project** no Bitbucket (Workspace settings → Projects) que vai agrupar todos os repositórios deste framework.
3. Configure as **branch restrictions no nível do Project** (Project → More actions (…) → Settings → Branch restrictions → Add a branch restriction), reproduzindo, para *qualquer repositório* dentro dele, as mesmas configurações descritas na seção anterior.

   Isso é o que faz um repositório novo, criado dentro desse Project, **herdar** a proteção automaticamente — o equivalente Bitbucket do Organization Ruleset do GitHub.

Sem essa parte configurada, não habilite a Parte 2 abaixo.

### Parte 2 — Criação do repositório em si (pode ser automatizada)
Com a Parte 1 já em vigor, criar o repositório remoto (dentro do Project certo) e adicionar os grupos com permissão é uma operação mecânica e de baixo risco. O script `governanca/scripts/provisionar-repo-bitbucket.sh` (equivalente `Provisionar-RepoBitbucket.ps1` para Windows) faz isso via a REST API v2.0 do Bitbucket Cloud:

```
./provisionar-repo-bitbucket.sh <nome-do-projeto> <sua-workspace> <CHAVE-DO-PROJECT>
```

Pré-requisitos: uma **API token com escopo** do Bitbucket (Configurações pessoais → API tokens → "Create API token with scopes" — os antigos *App passwords* foram descontinuados), com os escopos `Repositories: Admin` (criar repositório) e `Permissions: Write` (adicionar os grupos), exportada como `BITBUCKET_EMAIL`/`BITBUCKET_API_TOKEN` (ou cadastrada via o comando "Bob Marketplace: Set Bitbucket Workspace Token").

O script cria o repositório, associa ao Project informado, configura o `origin` local, e adiciona cada grupo com permissão `write`. **Não mexe em branch restrictions nem em CODEOWNERS**, e nunca dá `git push` sozinho.

## Sincronização automática do arquivo de portão (opcional)
O equivalente do `sync-gate-status.yml` do GitHub Actions, aqui, é uma pipeline customizada no `bitbucket-pipelines.yml` (incluso neste esqueleto como modelo). Ela roda quando um PR de fase é mergeado e atualiza `gates/<CHAVE>/<gate-slug>.md` para `Status: APPROVED`, preenchendo `Owner`/`Reviewed At`/`Notes`, com commit direto na branch de integração.

Este `bitbucket-pipelines.yml` é um modelo de referência, não testado em produção — valide antes de habilitar como check obrigatório.

## O que este modelo NÃO resolve
Restringir **quais modos** (`custom_modes.yaml`) uma pessoa pode *usar* no editor não é um controle do Bitbucket — é uma questão de instalação/distribuição do Bob-IDE (hoje, via as Collections deste Marketplace), não de permissão de repositório. Este modelo garante **quem pode aprovar/mergear** cada fase, não quem pode *invocar* um modo específico na IDE.

## Relação com a Regra 06
- O layout de `gates/<CHAVE_DO_ITEM>/*.md` e o formato `Status/Owner/Reviewed At/Notes` continuam os mesmos.
- A ordem e obrigatoriedade dos portões continuam as definidas na Regra 06.
- A única mudança é a **origem do evento de aprovação**: edição manual (Regra 06, padrão) ou merge de PR revisado por CODEOWNERS (esta regra, opcional).
