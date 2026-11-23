# Laboratório Completo — Framework .Bob de Ponta a Ponta: Crédito Consignado (13 modos, 2 sprints, custo e deploy no Colima)

> **PDLC** = *Product Development Life Cycle* (Ciclo de Vida de Desenvolvimento
> de Produto) — o conjunto de fases que um produto atravessa da ideia ao
> lançamento (e à manutenção pós-lançamento).

## Sobre este laboratório

Este é um laboratório prático (**lab**), guiado passo a passo, que usa um
cenário realista — um módulo de **simulação e contratação de crédito
consignado** — para você exercitar, com as próprias mãos, **todos os 13
modos** do Framework .Bob (incluindo o módulo bônus 🔧 Engenheiro de Produto,
que só entra em cena depois do release), em um cenário de **produto
completo**, não de uma história isolada:

- As **4 histórias do backlog**, organizadas em **2 sprints reais**.
- O modo **🎨 Designer** de ponta a ponta: especificação de design antes do
  código (Modo A) e revisão da UI implementada depois (Modo B), com o portão
  de design bloqueando o Planejador de Sprint quando não aprovado —
  exatamente como o framework se comporta hoje.
- Uma **estimativa de custo por papel** em cada planejamento de sprint — você
  será questionado pelo valor/hora de Desenvolvedor, Arquiteto, Testador,
  Segurança e Product Owner antes de qualquer cálculo.
- Um **deploy real**: a aplicação gerada é containerizada e efetivamente
  colocada no ar no [Colima](https://colima.run), rodando no seu Mac.

**O que você vai aprender**: como cada modo do framework se encaixa no ciclo
de vida do produto, o que cada um produz, por que a ordem entre eles importa
(inclusive as dependências de portão entre eles), e como os portões de
aprovação humana impedem a IA de avançar sem supervisão — em um cenário
completo o suficiente para parecer um produto de verdade, do PRD ao `curl`
respondendo em `localhost`.

**Formato de cada módulo deste lab**: Objetivo → Conceitos e siglas usados →
Pré-requisitos → Passo a passo → Artefato(s) gerado(s) → Ponto de
verificação (checkpoint) → Portão de aprovação (quando existir).

**Duração estimada**: 6 a 10 horas se você seguir os 27 módulos com calma,
lendo as explicações — divida em sessões por Sprint (ver índice abaixo), não
precisa ser feito de uma vez só.

> Precisa de algo bem mais curto — por exemplo, para uma **apresentação
> executiva com demonstração ao vivo**? Use
> [`GUIA-DEMO-EXECUTIVA-CREDITO-CONSIGNADO.md`](GUIA-DEMO-EXECUTIVA-CREDITO-CONSIGNADO.md)
> — a mesma jornada, reduzida a ~30 minutos, passando por 12 dos 13 modos
> com 1 história só.

**Diferença em relação à skill `fluxo-guiado-e2e`**: aquela skill
(`.bob/skills/fluxo-guiado-e2e/`) orquestra a sequência inteira sozinha,
trocando de contexto automaticamente. Este lab é o oposto de propósito: você
troca de módulo manualmente a cada etapa, para **observar e validar** o
comportamento individual de cada um — é um roteiro de teste, não um atalho
de produtividade.

> Pré-requisitos de estação (instalar os 13 modos + bloqueio de conteúdo
> sensível) e o passo a passo detalhado do módulo Oráculo já estão
> documentados em [`GUIA-CRIAR-APP-DO-ZERO.md`](GUIA-CRIAR-APP-DO-ZERO.md) —
> este lab assume que sua estação já está pronta e foca no **conteúdo de
> teste** de cada módulo.

### Índice por sessão (pontos de pausa sugeridos)

| Sessão | Módulos | Conteúdo |
|---|---|---|
| 1 | 0 a 6 | Bootstrap até a especificação de design (Oráculo → Designer Modo A) |
| 2 | 7 a 14 | Sprint 1 completa (Histórias 1 e 2, com custo, revisão de UI e PR) |
| 3 | 15 a 22 | Sprint 2 completa (Histórias 3 e 4) |
| 4 | 23 a 26 | Containerização, deploy real no Colima, release e incidente bônus |

---

## Glossário (siglas e termos usados neste lab)

Consulte esta tabela sempre que encontrar uma sigla desconhecida — cada uma
também é explicada por extenso na primeira vez que aparece dentro de cada
módulo.

| Sigla / termo | Significado |
|---|---|
| **PDLC** | *Product Development Life Cycle* — Ciclo de Vida de Desenvolvimento de Produto |
| **MVP** | *Minimum Viable Product* — Produto Mínimo Viável (menor versão que já entrega valor real) |
| **PRD** | *Product Requirements Document* — Documento de Requisitos de Produto |
| **ADR** | *Architecture Decision Record* — Registro de Decisão de Arquitetura |
| **TDD** | *Test-Driven Development* — Desenvolvimento Orientado a Testes (escrever o teste antes/junto do código) |
| **QA** | *Quality Assurance* — Garantia de Qualidade |
| **CVE** | *Common Vulnerabilities and Exposures* — Vulnerabilidades e Exposições Comuns (catálogo público de falhas de segurança conhecidas) |
| **STRIDE** | Modelo de ameaças que categoriza riscos em 6 tipos: *Spoofing* (falsificação de identidade), *Tampering* (adulteração), *Repudiation* (repúdio/negação de autoria), *Information Disclosure* (vazamento de informação), *Denial of Service* (negação de serviço), *Elevation of Privilege* (elevação de privilégio) |
| **Gherkin** | Linguagem estruturada para critérios de aceite, no formato **Dado / Quando / Então** (*Given / When / Then*) |
| **I/O** | *Input/Output* — Entrada e Saída (ex.: chamada de rede, leitura de arquivo, banco de dados) |
| **API** | *Application Programming Interface* — Interface de Programação de Aplicações |
| **UI** | *User Interface* — Interface do Usuário (a tela que a pessoa vê e usa) |
| **PR** | *Pull Request* — solicitação de revisão e integração de código |
| **TS** | *Technical Support* — caso/ticket de suporte técnico, aberto por um cliente |
| **E2E** | *End-to-End* — Ponta a Ponta (do início ao fim de um fluxo) |
| **SDD** | *Spec-Driven Development* — Desenvolvimento Orientado a Especificação (a especificação/constituição vem antes do código e tem autoridade sobre ele) |
| **RNF** | Requisito Não Funcional (performance, confiabilidade, custo — em oposição a "o que o sistema faz") |
| **LGPD** | Lei Geral de Proteção de Dados (Lei federal nº 13.709/2018) |
| **Bacen** | Banco Central do Brasil |
| **CMN** | Conselho Monetário Nacional |
| **PLD/FT** | Prevenção à Lavagem de Dinheiro e ao Financiamento do Terrorismo |
| **CET** | Custo Efetivo Total (todos os encargos de um empréstimo, não só a taxa de juros nominal) |
| **INSS** | Instituto Nacional do Seguro Social |
| **CLT** | Consolidação das Leis do Trabalho |
| **CPF** | Cadastro de Pessoas Físicas (documento de identificação fiscal do cidadão brasileiro) |
| **Carbon Design System** | Sistema de design de código aberto mantido pela IBM, com componentes de UI prontos e padronizados |
| **Token de design** | Valor nomeado e reutilizável (cor, espaçamento, tipografia) que substitui um valor "hardcoded" no código, garantindo consistência visual |
| **WCAG 2.1 AA** | *Web Content Accessibility Guidelines*, nível AA — o padrão de acessibilidade web adotado como critério mínimo de aceite para interfaces neste laboratório |
| **Valor/hora** | Quanto custa uma hora de trabalho de um papel específico — a unidade básica usada para transformar estimativa de esforço (Story Points) em estimativa de custo em reais |
| **Container** | Um processo isolado que empacota a aplicação junto com tudo que ela precisa para rodar, de forma que funcione igual em qualquer máquina |
| **Imagem (Docker image)** | O "molde" read-only a partir do qual um container é criado — construído a partir de um `Dockerfile` |
| **Dockerfile** | Arquivo de texto com as instruções para construir uma imagem Docker, passo a passo |
| **Colima** | *Container Linux on Mac* — ferramenta que roda uma VM Linux leve no seu Mac e expõe um daemon Docker, sem precisar do Docker Desktop |
| **Docker context** | Configuração que diz ao CLI do `docker` para qual daemon ele deve enviar os comandos — o Colima cria e ativa automaticamente um context chamado `colima` |
| **Smoke test** | Teste rápido e superficial (ex.: uma chamada HTTP simples) só para confirmar que o sistema está "vivo" e respondendo |
| **TypeScript** | Superset do JavaScript com tipagem estática, usado no backend deste laboratório |

---

## Por que crédito consignado como cenário

Crédito consignado (empréstimo com desconto direto em folha de pagamento,
para servidores públicos, aposentados/pensionistas do **INSS** e empregados
**CLT** com convênio) é um bom cenário de laboratório porque força o
framework a lidar com quatro coisas ao mesmo tempo: dados financeiros e
pessoais sensíveis (**LGPD**), regras de negócio numéricas que exigem
**TDD** de verdade (cálculo de parcela, margem consignável, **CET**),
integração com um sistema externo (folha de pagamento/**INSS**), e
exigências regulatórias reais (**Bacen**) que dão conteúdo concreto para os
módulos Segurança e Governança — em vez de um "to-do list" genérico sem
substância.

## Stack técnica deste laboratório (decisão fixada)

Para que a Parte de deploy tenha comandos **exatos e copiáveis**, este
laboratório fixa uma stack concreta — trate-a como a decisão que o módulo
Arquiteto vai tomar no Módulo 5 (ADR):

- **Backend**: Node.js 20 (LTS) + TypeScript + Express.
- **Testes**: Jest (unitário e integração).
- **Frontend**: HTML/CSS/JS estático em `public/`, estilizado com o CSS
  pré-compilado do Carbon Design System via CDN
  (`https://unpkg.com/carbon-components/css/carbon-components.min.css`) —
  sem toolchain de build de frontend, para manter o container simples.
- **Persistência**: em memória (um `Map` em processo) — sem banco de dados,
  consistente com o uso de mocks para tudo que é externo no **MVP**, e para
  manter o deploy em **um único container**.
- **Servidor único**: o mesmo processo Express serve a API (`/api/...`) e os
  arquivos estáticos do frontend — um único `Dockerfile`, uma única imagem,
  um único container.

Se seu time já tem uma stack padrão diferente, adapte os nomes de arquivo
dos exemplos abaixo — a lógica do laboratório continua a mesma.

## Chave do item de trabalho

Todo trabalho rastreado pelo framework precisa de uma **Chave do Item de
Trabalho** (ver `.bob/rules/06-portoes-aprovacao-humana.md`) — um
identificador único que amarra PRD, backlog, ADR, design, portões e código
de uma mesma funcionalidade. Neste lab, use:

```
FEAT-simulacao-consignado
```

Se `gates/CURRENT_WORK_ITEM.md` existir no seu projeto, escreva essa chave
nele antes de começar:

```bash
echo "WorkItem: FEAT-simulacao-consignado" > gates/CURRENT_WORK_ITEM.md
```

---

## Módulo 0 — 🔮 Oráculo (bootstrap do projeto)

### Objetivo do módulo
O Oráculo é o **ponto de entrada** do framework: o único módulo usado antes
de qualquer outro, responsável por criar a estrutura inicial do projeto do
zero (clonar o esqueleto, montar as pastas, inicializar o controle de
versão) para que os outros 12 módulos tenham onde trabalhar.

### Conceitos e siglas desta etapa
- **Bootstrap**: processo de inicialização mínima que prepara tudo para o
  restante do sistema funcionar.

### Pré-requisitos
- Os 13 modos já instalados no seletor de modos da sua IDE (ver
  [`GUIA-CRIAR-APP-DO-ZERO.md`](GUIA-CRIAR-APP-DO-ZERO.md), Parte 1).
- IDE aberta na pasta-pai onde o novo projeto deve nascer.

### Passo a passo
1. Mude para o módulo **🔮 Oráculo** no seletor de modos.
2. Quando ele perguntar o nome do projeto, responda:
   ```
   credito-consignado
   ```
3. Deixe o Oráculo clonar o framework, montar o esqueleto e rodar o `git
   init` inicial (ver `GUIA-CRIAR-APP-DO-ZERO.md` para o detalhe técnico
   completo dessa etapa).
4. Quando ele perguntar a descrição curta do projeto, responda:
   ```
   Módulo de simulação e contratação de crédito consignado (desconto em
   folha) para servidores públicos e aposentados/pensionistas do INSS.
   ```

### Artefato(s) gerado(s)
- A pasta `credito-consignado/` completa, com `.bob/rules/` (regras
  centrais) e `.bob/rules-<papel>/` (subpastas específicas por papel) já
  dentro dela.
- Um único commit Git: `chore: bootstrap inicial via Oráculo`.

### Ponto de verificação (checkpoint)
- [ ] `credito-consignado/.bob/rules-<papel>/` existe com 10 subpastas
      (`architect`, `designer`, `developer`, `discovery-vision`,
      `docs-writer`, `product-engineer`, `product-owner`, `security`,
      `sprint-planner`, `tester`) — os outros 3 modos (Oráculo, Governança,
      Revisor de Qualidade) usam as regras centrais em `.bob/rules/`, sem
      subpasta própria.
- [ ] `git log` dentro do projeto novo mostra **só** o commit de bootstrap.
- [ ] O Oráculo terminou te instruindo a trocar manualmente para o módulo
      🏛️ Governança — ele nunca troca de módulo sozinho, nem pula etapas.

### Portão de aprovação
Não há portão nesta etapa.

---

## Módulo 1 — 🏛️ Governança (constituição do projeto)

### Objetivo do módulo
Este módulo implementa a ideia de **SDD** (*Spec-Driven Development*): antes
de qualquer PRD, ADR ou linha de código, o time (humano + IA) escreve os
princípios **não-negociáveis** do projeto — a "constituição". Ela é escrita
**uma vez**, muda raramente, e qualquer artefato posterior que a contradiga é
automaticamente um problema CRÍTICO, nunca um detalhe menor.

### Conceitos e siglas desta etapa
- **TDD**, **CET**, **LGPD**, **CMN**, **Bacen**, **CVE** — ver Glossário.

### Pré-requisitos
- Módulo 0 (Oráculo) concluído.

### Passo a passo
1. Mude para o módulo **🏛️ Governança**.
2. Digite exatamente esta mensagem:
   ```
   estabelecer a constituição do projeto (princípios de engenharia, qualidade, arquitetura e segurança)
   ```
3. O módulo vai perguntar os princípios não-negociáveis do projeto. Responda
   (ou adapte) com algo assim:
   - **Engenharia**: **TDD** obrigatório para toda regra de cálculo
     financeiro (parcela, **CET**, margem consignável); cobertura mínima de
     80% em módulos de cálculo; nenhuma dependência nova sem justificativa
     explícita.
   - **Qualidade**: Definição de Pronto (`.bob/rules/03-definicao-de-pronto.md`)
     vale para toda história; nenhuma história fecha sem critério de aceite
     testado **e**, se tocar interface, sem a revisão de UI do Designer
     aprovada.
   - **Arquitetura**: backend em Node.js 20/TypeScript/Express, frontend
     estático com Carbon Design System via CDN; separação estrita entre o
     motor de cálculo (puro, sem **I/O**) e a camada de integração com folha
     de pagamento/**INSS**; deploy em container único (Docker), sem
     dependências de banco de dados no MVP; nenhum dado de contracheque
     persiste fora do armazenamento criptografado do domínio.
   - **Segurança e conformidade**: dados de renda, margem consignável e
     **CPF** são dados pessoais sensíveis sob a **LGPD** — nunca em log,
     nunca em texto claro; conformidade com a Resolução **CMN** nº
     4.658/2018 e com a Circular **Bacen** nº 3.978/2020 (**PLD/FT**) sempre
     que a feature tocar dados de cliente ou transação financeira; revisão
     de **CVE** obrigatória em qualquer mudança de autenticação ou
     integração externa.
   - **Governança**: mudanças na constituição seguem versionamento
     semântico (`.bob/rules/08-constituicao-do-projeto.md`); qualquer
     conflito entre um artefato e a constituição é achado automaticamente
     CRÍTICO.

### Artefato(s) gerado(s)
- `architecture/constituicao.md`, com `Versão: 1.0.0` e a data de hoje.

### Ponto de verificação (checkpoint)
- [ ] `architecture/constituicao.md` existe, sem placeholders como
      `<NOME_DO_PROJETO>`.
- [ ] A versão semântica (`1.0.0`) e a data de ratificação estão presentes.
- [ ] A stack técnica (Node.js/TypeScript/Express + Carbon + container
      único) está registrada como princípio de arquitetura.

### Portão de aprovação
Não há portão formal para a constituição em si — ela é a autoridade máxima
que os portões seguintes vão respeitar.

---

## Módulo 2 — 🔍 Descoberta (escopo do MVP)

### Objetivo do módulo
Antes de escrever qualquer requisito formal, este módulo define **o que**
vale a pena construir: o escopo do **MVP**, quem são os concorrentes, e que
recursos o time precisa.

### Conceitos e siglas desta etapa
- **MVP** — ver Glossário.

### Pré-requisitos
- Módulo 1 (Governança) concluído — a constituição existe.

### Passo a passo
1. Mude para o módulo **🔍 Descoberta**.
2. Peça:
   ```
   Preciso de um brief de descoberta para o MVP de simulação de crédito consignado (FEAT-simulacao-consignado): escopo de MVP, análise competitiva e plano de recursos.
   ```
3. Revise o conteúdo gerado:
   - **`discovery/mvp-scope.md`**: dentro do escopo — simular parcela e
     **CET**, consultar margem consignável (mock), gerar proposta e enviar
     para assinatura eletrônica, acompanhar status. Fora do escopo —
     portabilidade, refinanciamento, seguro prestamista como produto
     separado.
   - **`discovery/competitive-landscape.md`**: concorrentes reais do mercado
     brasileiro de consignado (bancos públicos, C6 Bank, Banco Pan, BMG,
     Facta Financeira).
   - **`discovery/resourcing-plan.md`**: plano de recursos mínimo (1
     desenvolvedor full-stack, 1 **QA**, revisão de segurança pontual).

### Artefato(s) gerado(s)
- `discovery/mvp-scope.md`, `discovery/competitive-landscape.md`,
  `discovery/resourcing-plan.md`.

### Ponto de verificação (checkpoint)
- [ ] Os três arquivos citam o cenário de crédito consignado
      especificamente.
- [ ] O que está fora do escopo do MVP está tão claro quanto o que está
      dentro.
- [ ] O próprio módulo já criou `gates/FEAT-simulacao-consignado/00-discovery.md`
      sozinho, com `Status: PENDING`, e parou pedindo sua aprovação — você
      não precisou rodar `mkdir`/`cp` nem criar o arquivo na mão. Se ele não
      criou, é um desvio da regra `.bob/rules/06-portoes-aprovacao-humana.md`
      ("Regra de criação de pasta": se `gates/` não existir, o agente cria).

### Portão de aprovação
O módulo cria o portão sozinho — não é uma tarefa sua. Aprove editando
`gates/FEAT-simulacao-consignado/00-discovery.md`: `Status: APPROVED`,
preencha `Owner` e `Reviewed At`.

---

## Módulo 3 — 📊 Product Owner: PRD

### Objetivo do módulo
Transformar o brief de descoberta em um **PRD** formal.

### Conceitos e siglas desta etapa
- **PRD** — ver Glossário.

### Pré-requisitos
- Módulo 2 concluído, com `00-discovery.md` aprovado.

### Passo a passo
1. Mude para o módulo **📊 Product Owner**.
2. Peça:
   ```
   Escreva o PRD de FEAT-simulacao-consignado a partir do brief de descoberta aprovado.
   ```
3. Revise `prd/FEAT-simulacao-consignado.md`:
   - **Declaração do problema**: hoje o cliente precisa ir à agência ou
     ligar para simular um consignado; o processo é lento e não mostra a
     margem disponível em tempo real.
   - **Usuários-alvo**: servidor público, aposentado/pensionista **INSS**,
     empregado **CLT** com convênio.
   - **Objetivos (mensuráveis)**: simulação em menos de 5 segundos; taxa de
     conversão simulação→proposta ≥ 15%; zero incidentes de exposição de
     dados de renda/**CPF** em log.
   - **Não-objetivos**: portabilidade, refinanciamento.
   - **Suposições & restrições**: integração com folha/**INSS** via mock no
     **MVP**; margem consignável máxima de 35% — **valide o percentual real
     aplicável ao seu convênio antes de produção; isso é um exemplo de
     teste, não orientação regulatória real**.
   - **Riscos**: dependência da integração real com o provedor de folha;
     risco regulatório se o cálculo de **CET** estiver incorreto.

### Artefato(s) gerado(s)
- `prd/FEAT-simulacao-consignado.md` + entrada no índice `prd.md`.

### Ponto de verificação (checkpoint)
- [ ] O PRD cita objetivos **mensuráveis**.
- [ ] Os não-objetivos estão explícitos.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/01-prd.md` — o módulo já cria o
arquivo (`Status: PENDING`) sozinho ao terminar o PRD.

---

## Módulo 4 — 📊 Product Owner: Backlog

### Objetivo do módulo
Quebrar o PRD em histórias de usuário pequenas, testáveis e priorizadas.

### Conceitos e siglas desta etapa
- **Gherkin** — ver Glossário. **P0/P1/P2**: níveis de prioridade.
- **Toca interface**: campo obrigatório em cada história desde a auditoria
  de coerência do modo Designer — sinaliza, já no backlog, se aquele item
  precisa de especificação de design antes do desenvolvimento.

### Pré-requisitos
- Módulo 3 concluído, com `01-prd.md` aprovado.

### Passo a passo
1. Ainda no módulo **📊 Product Owner**, peça:
   ```
   Quebre o PRD de FEAT-simulacao-consignado em histórias com critérios de aceite (Gherkin). Marque o campo "Toca interface" em cada história.
   ```
2. Revise as 4 histórias geradas em `backlog/FEAT-simulacao-consignado.md`:

**História 1 — Simular parcela e CET**
- Como servidor público, eu quero simular o valor da parcela e o **CET**
  informando o valor desejado e o prazo, para que eu possa decidir se
  contrato o crédito antes de enviar qualquer dado sensível.
- Prioridade: P0 — Story Points (Dias): 3 — Dependências: nenhuma —
  **Toca interface: Sim**
- Critérios de Aceite (**Gherkin**):
  - Cenário: simulação dentro da margem consignável
    - Dado que o cliente tem margem consignável de R$ 500,00
    - Quando ele simula uma parcela de R$ 300,00 em 24 meses
    - Então o sistema exibe o **CET** e o valor total a pagar
  - Cenário: simulação acima da margem consignável
    - Dado que o cliente tem margem consignável de R$ 200,00
    - Quando ele simula uma parcela de R$ 300,00
    - Então o sistema recusa a simulação e explica o motivo

**História 2 — Consultar margem consignável**
- Como servidor público, eu quero consultar minha margem consignável
  disponível, para que eu saiba quanto ainda posso comprometer da minha
  folha.
- Prioridade: P0 — Story Points (Dias): 2 — Dependências: mock da
  integração com folha/**INSS** — **Toca interface: Sim**
- Critérios de Aceite (**Gherkin**):
  - Cenário: consulta bem-sucedida
    - Dado um **CPF** válido e cadastrado no convênio
    - Quando o cliente consulta a margem
    - Então o sistema retorna o valor disponível sem expor dados de renda
      em log

**História 3 — Enviar proposta para assinatura eletrônica**
- Como servidor público, eu quero enviar minha proposta de crédito para
  assinatura eletrônica, para que eu conclua a contratação sem ir à
  agência.
- Prioridade: P1 — Story Points (Dias): 5 — Dependências: História 1 —
  **Toca interface: Sim**
- Critérios de Aceite (**Gherkin**):
  - Cenário: proposta enviada com sucesso
    - Dado uma simulação aprovada
    - Quando o cliente confirma os dados e assina eletronicamente
    - Então a proposta muda de status para "Em Análise" e um protocolo é
      gerado

**História 4 — Acompanhar status da proposta**
- Como servidor público, eu quero acompanhar o status da minha proposta,
  para que eu saiba se ela foi aprovada, recusada ou está em análise.
- Prioridade: P1 — Story Points (Dias): 2 — Dependências: História 3 —
  **Toca interface: Sim**

### Artefato(s) gerado(s)
- `backlog/FEAT-simulacao-consignado.md` (4 histórias) + entrada no índice
  `backlog.md`.

### Ponto de verificação (checkpoint)
- [ ] Cada história tem pelo menos um cenário **Gherkin** completo.
- [ ] Todas as 4 histórias têm o campo **Toca interface** preenchido (as 4
      são "Sim" neste cenário, já que todas têm uma tela associada).
- [ ] As dependências entre histórias estão explícitas.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/02-backlog.md` — o módulo já cria o
arquivo (`Status: PENDING`) sozinho ao terminar o backlog.

---

## Módulo 5 — 🏗️ Arquiteto: ADR

### Objetivo do módulo
Registrar formalmente a decisão técnica de como o motor de cálculo
financeiro e a stack do MVP vão ser desenhados.

### Conceitos e siglas desta etapa
- **ADR**, **RNF** — ver Glossário.

### Pré-requisitos
- Módulo 4 concluído, com `02-backlog.md` aprovado.

### Passo a passo
1. Mude para o módulo **🏗️ Arquiteto**.
2. Peça:
   ```
   Registre um ADR para a decisão de arquitetura do motor de cálculo de crédito consignado (FEAT-simulacao-consignado), incluindo a stack (Node.js/TypeScript/Express, frontend estático com Carbon via CDN) e a estratégia de deploy em container único.
   ```
3. Revise `architecture/adr/ADR-0001-motor-de-calculo-consignado.md`:
   - **Contexto**: precisamos calcular parcela, **CET** e validar margem
     consignável de forma determinística e testável, e depois integrar com
     um provedor externo de folha/**INSS** que ainda não está disponível
     para o **MVP**.
   - **Decisão**: isolar o motor de cálculo como módulo puro (sem **I/O**),
     recebendo margem/valor/prazo e devolvendo parcela + **CET**; a
     consulta de margem via integração externa fica atrás de uma interface
     (`MargemConsignavelProvider`), com um mock determinístico no **MVP**;
     backend em Node.js 20/TypeScript/Express servindo também o frontend
     estático (Carbon via CDN) no mesmo processo; persistência em memória;
     empacotamento em um único container Docker.
   - **Alternativas consideradas**: (A) calcular a parcela dentro do
     próprio endpoint de **API** — mais rápido, mas difícil de testar
     isoladamente; (B) motor de cálculo como serviço externo separado —
     mais desacoplado, mas complexidade operacional desnecessária para o
     **MVP**. Optou-se por um módulo puro dentro do mesmo serviço.
   - **Consequências**: prós — 100% testável com **TDD**, deploy simples
     (uma imagem, um container); contras — precisa de disciplina para não
     vazar **I/O** para dentro do módulo puro, e persistência em memória não
     sobrevive a um restart do container (aceitável no MVP).
   - **Impacto em RNFs**: performance (cálculo em memória, <10ms);
     confiabilidade (motor de cálculo sem dependência externa); custo
     (nenhum adicional no MVP).
   - **Considerações de segurança**: a interface `MargemConsignavelProvider`
     nunca deve logar **CPF** ou valor de renda.

### Artefato(s) gerado(s)
- `architecture/adr/ADR-0001-motor-de-calculo-consignado.md`.

### Ponto de verificação (checkpoint)
- [ ] O ADR lista pelo menos duas alternativas consideradas.
- [ ] As considerações de segurança estão presentes.
- [ ] A stack (Node.js/TypeScript/Express + Carbon + container único) está
      registrada como parte da decisão.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/03-adr.md` — o módulo já cria o
arquivo (`Status: PENDING`) sozinho ao terminar o ADR.

---

## Módulo 6 — 🎨 Designer (Modo A — Especificar)

### Objetivo do módulo
Produzir a especificação de design das 4 telas da feature — antes de
qualquer linha de interface ser implementada — e abrir o portão de design
que o Planejador de Sprint (próximo módulo) vai exigir aprovado antes de
sequenciar o desenvolvimento de qualquer história marcada "Toca interface:
Sim".

### Conceitos e siglas desta etapa
- **Token de design**, **WCAG 2.1 AA** — ver Glossário.
- **Matriz de estados**: tabela que garante que todo componente que carrega
  ou envia dados tenha seu comportamento definido para vazio, carregando,
  erro, sucesso, parcial, desabilitado e sem permissão — não só o "caminho
  feliz".

### Importando o manual de identidade visual (se o seu produto tiver marca própria)

O Designer segue a regra "identidade não se aproxima, se referencia"
(`.bob/rules-designer/01-designer.md`): logo, ícone, paleta de cores e
tipografia oficiais **sempre vêm de arquivo versionado no repositório** —
ele nunca desenha um logo à mão, nunca aproxima com CSS/texto estilizado, e
nunca gera um ícone com IA. A pré-checagem obrigatória do Módulo A inspeciona
o repositório procurando esses arquivos (item "Assets de marca") **antes**
de propor qualquer coisa.

Por isso, se o seu produto tem identidade visual própria, importe o manual
**antes** de rodar este módulo — não durante nem depois:

1. O bootstrap do Oráculo (Módulo 0) já cria a pasta `brand/` na raiz do
   projeto, com subpastas `logos/`, `paleta-de-cores/`, `tipografia/` e
   `icones/` (ver `brand/README.md`). Coloque ali os arquivos oficiais:
   logo (SVG/PNG em alta resolução), paleta de cores (hex oficiais),
   arquivos de tipografia/licença de fonte, ícones oficiais, e o PDF/link
   do manual de marca em si, se existir.
2. Faça commit dessa pasta **antes** de mudar para o módulo Designer — a
   pré-checagem só encontra o que já está versionado, não o que está solto
   no seu Desktop ou num link externo.
3. No prompt do passo 2 abaixo, cite explicitamente que os assets estão em
   `brand/` para garantir que a pré-checagem os encontre e os referencie na
   especificação, em vez de propor uma identidade genérica.

Se o seu produto **não** tem marca própria ainda — como este laboratório,
que usa Carbon Design System puro — pule esta parte: `brand/` fica só com o
`README.md`, e o Designer vai declarar no inventário que não há assets de
marca, seguindo apenas com os tokens do design system escolhido.

### Pré-requisitos
- Módulo 4 (Backlog) concluído, com as 4 histórias marcadas "Toca
  interface: Sim".
- Módulo 5 (ADR) concluído — a stack de UI (Carbon Design System via CDN)
  já está decidida.
- Se aplicável ao seu produto: o manual de identidade visual já importado e
  commitado, conforme a seção acima.

### Passo a passo
1. Mude para o módulo **🎨 Designer**.
2. Peça:
   ```
   Especifique o design de FEAT-simulacao-consignado (Modo A): as 4 telas do backlog aprovado (simular parcela e CET, consultar margem consignável, enviar proposta para assinatura eletrônica, acompanhar status da proposta). Estamos usando Carbon Design System via CDN — inventarie o que já existe no projeto antes de propor qualquer coisa nova.
   ```
3. Confirme que o módulo faz a **pré-checagem obrigatória** (inventário do
   que já existe) antes de propor qualquer coisa nova — nesta primeira spec
   do projeto, o inventário deve mostrar "nenhum componente customizado
   ainda, Carbon Design System puro via CDN", sem inventar tokens que não
   existem.
4. Revise `design/FEAT-simulacao-consignado/design-spec.md`:
   - **Fluxo de usuário**: da simulação (sem login) até a consulta de
     status (com protocolo).
   - **Inventário de componentes**: `TextInput`, `NumberInput`, `Button`,
     `InlineNotification`, `Tag`, `DataTable` (todos do Carbon, reutilizados
     — nenhum componente novo justificado nesta versão).
   - **Matriz de estados**: preenchida para as 4 telas, nenhuma célula
     vazia (ex.: tela de status — vazio: "nenhuma proposta enviada ainda";
     erro: "não foi possível consultar o status agora"; sucesso: exibe o
     status atual e a data da última atualização).
   - **Acessibilidade**: checklist WCAG 2.1 AA completo.
   - **Perguntas em aberto** (se houver): ex. texto exato da mensagem de
     recusa por margem insuficiente, se não estiver decidido — sinalizado
     explicitamente, nunca um "TBD" silencioso.
5. Confirme que `design/design-system.md` foi criado (primeira vez que o
   projeto registra um design system).

### Artefato(s) gerado(s)
- `design/FEAT-simulacao-consignado/design-spec.md`
- `design/design-system.md`
- `gates/FEAT-simulacao-consignado/03-design.md` (`Status: PENDING`)

### Ponto de verificação (checkpoint)
- [ ] Se você importou um manual de identidade visual, a especificação
      referencia os arquivos reais (caminho no repositório) — não recriou
      logo/cor/ícone por aproximação.
- [ ] A matriz de estados não tem nenhuma célula vazia para as 4 telas.
- [ ] Nenhum "TBD"/"lorem ipsum" nos textos de interface — pendências reais
      viraram Perguntas em Aberto.
- [ ] O checklist de acessibilidade WCAG 2.1 AA está completo.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/03-design.md` (`Status: APPROVED`).
**O Planejador de Sprint recusa sequenciar o desenvolvimento das histórias
sem esse portão aprovado** — é exatamente esse comportamento (fechado na
auditoria de coerência entre Product Owner/Sprint Planner e o modo Designer)
que este laboratório valida.

---

## Módulo 7 — 📋 Planejador de Sprint: Sprint 1 + estimativa de custo

### Objetivo do módulo
Planejar a primeira fatia executável (Histórias 1 e 2) **e** produzir uma
estimativa de custo real da sprint, papel por papel, a partir do valor/hora
de cada pessoa envolvida.

### Conceitos e siglas desta etapa
Nenhuma sigla nova — reutiliza os conceitos já vistos (backlog, ADR, design
spec, valor/hora).

### Pré-requisitos
- Módulo 5 (ADR) concluído, com `03-adr.md` aprovado.
- Módulo 6 (Designer, Modo A) concluído, com `03-design.md` aprovado.

### Passo a passo
1. Mude para o módulo **📋 Planejador de Sprint**.
2. Peça, no mesmo pedido, o plano **e** a estimativa de custo:
   ```
   Planeje a Sprint 1 de FEAT-simulacao-consignado com as Histórias 1 (simular parcela e CET) e 2 (consultar margem consignável) do backlog aprovado.

   Monte também uma estimativa de custo desta sprint: para cada papel envolvido (Product Owner, Arquiteto, Desenvolvedor, Testador, Segurança), pergunte o valor/hora antes de calcular qualquer coisa. Considere 1 Story Point = 8 horas de trabalho. Multiplique horas estimadas por valor/hora de cada papel e apresente o custo total da sprint, com o detalhamento por papel em uma tabela.
   ```
3. **O módulo deve parar e perguntar o valor/hora de cada papel** antes de
   calcular — se ele arriscar um número sem perguntar, corrija
   explicitamente: "não invente valores, me pergunte o valor/hora de cada
   papel antes de calcular."
4. Quando ele perguntar, responda com estes valores (sugestão de mercado
   para teste — ajuste como quiser):

   | Papel | Valor/hora sugerido |
   |---|---:|
   | Product Owner | R$ 130,00 |
   | Arquiteto | R$ 180,00 |
   | Desenvolvedor | R$ 120,00 |
   | Testador (QA) | R$ 90,00 |
   | Segurança | R$ 150,00 |

5. Revise a tabela de custo gerada — deve cruzar horas × valor/hora de cada
   papel e somar um total. Confirme também que o módulo checou o campo
   "Toca interface" das duas histórias e tratou `03-design.md` como
   dependência já satisfeita (aprovada no Módulo 6), não como bloqueio.

### Artefato(s) gerado(s)
- `delivery/sprint-plan.md`, bloco Sprint 1: as duas histórias quebradas em
  tarefas técnicas, mais uma seção de estimativa de custo.

Exemplo do que esperar na seção de custo:

```markdown
### Estimativa de custo — Sprint 1

| Papel | Horas estimadas | Valor/hora | Subtotal |
|---|---:|---:|---:|
| Product Owner | 4h | R$ 130,00 | R$ 520,00 |
| Arquiteto | 4h | R$ 180,00 | R$ 720,00 |
| Desenvolvedor | 40h (5 pontos) | R$ 120,00 | R$ 4.800,00 |
| Testador (QA) | 16h (2 pontos) | R$ 90,00 | R$ 1.440,00 |
| Segurança | 8h | R$ 150,00 | R$ 1.200,00 |
| **Total** | | | **R$ 8.680,00** |
```

### Ponto de verificação (checkpoint)
- [ ] O módulo **perguntou** o valor/hora de cada papel antes de calcular.
- [ ] A tabela de custo cruza horas × valor/hora corretamente.
- [ ] As Histórias 1 e 2 (só essas duas) aparecem quebradas em tarefas
      técnicas.

### Portão de aprovação
Se seu fluxo usa esse portão (opcional), peça ao módulo para criá-lo — ele
gera `gates/FEAT-simulacao-consignado/04-sprintplan-sprint1.md` sozinho
(`Status: PENDING`). Só falta você aprovar.

---

## Módulo 8 — 👨‍💻 Desenvolvedor: História 1 (simular parcela e CET)

### Objetivo do módulo
Implementar o motor de cálculo de parcela/CET com TDD, seguindo o ADR **e a
especificação de design aprovada**, e montar a primeira versão do servidor
Express + frontend estático.

### Conceitos e siglas desta etapa
- **TDD** — ver Glossário, aqui aplicado na prática: o teste é escrito
  antes ou junto da implementação, nunca depois "para cumprir tabela".

### Pré-requisitos
- Módulo 7 concluído.

### Passo a passo
1. Mude para o módulo **👨‍💻 Desenvolvedor**.
2. Peça:
   ```
   Implemente a História 1 (simular parcela e CET) de FEAT-simulacao-consignado com TDD, seguindo o ADR-0001 e a especificação de design aprovada (design/FEAT-simulacao-consignado/design-spec.md). Use Node.js + TypeScript + Express, com o motor de cálculo em um módulo puro (sem I/O), e um endpoint `/api/simular`. Crie também `/api/health` retornando 200 OK, e `public/index.html` com o formulário de simulação usando os componentes Carbon listados na spec.
   ```
3. Observe e confirme o comportamento esperado:
   - Ele deve **inspecionar o repositório primeiro** — não adiciona
     bibliotecas sem justificar.
   - Deve escrever teste antes (ou junto) da implementação — ex.:
     `testa_calculo_parcela_dentro_da_margem`,
     `testa_calculo_parcela_acima_da_margem_deve_recusar`,
     `testa_cet_com_juros_compostos`.
   - Deve manter o motor de cálculo puro (sem chamada de rede).
   - A tela de simulação deve usar exclusivamente os componentes Carbon
     listados na especificação de design — não deve inventar um componente
     novo sem justificar.
   - Deve reportar ao final: arquivos alterados, comandos para rodar os
     testes, e confirmar que nenhuma dependência nova foi adicionada sem
     justificativa.

### Artefato(s) gerado(s) (estrutura esperada)
```
credito-consignado/
├── src/
│   ├── motor-calculo.ts       # função pura: calcularParcela(valor, prazo, margem)
│   ├── server.ts              # Express: /api/health, /api/simular
├── public/
│   └── index.html             # formulário de simulação, classes Carbon
├── tests/unit/
│   └── motor-calculo.test.ts
├── package.json
└── tsconfig.json
```

### Ponto de verificação (checkpoint)
- [ ] `npm test` roda e os testes de `motor-calculo.test.ts` passam.
- [ ] `motor-calculo.ts` não importa nada de rede/HTTP.
- [ ] `public/index.html` referencia o CSS do Carbon via `<link>` e usa só
      os componentes listados na spec de design.
- [ ] Cada cenário **Gherkin** da História 1 tem um teste automatizado
      correspondente.

### Portão de aprovação
Não há portão nesta etapa — a validação acontece no Testador, no Designer
(Modo B) e na revisão holística mais adiante.

---

## Módulo 9 — 👨‍💻 Desenvolvedor: História 2 (consultar margem consignável)

### Objetivo do módulo
Implementar a consulta de margem consignável via um provider mockado, atrás
de uma interface — exatamente como o ADR-0001 decidiu.

### Pré-requisitos
- Módulo 8 concluído.

### Passo a passo
1. Ainda no módulo **👨‍💻 Desenvolvedor**, peça:
   ```
   Implemente a História 2 (consultar margem consignável) de FEAT-simulacao-consignado com TDD, seguindo a especificação de design aprovada. Crie a interface MargemConsignavelProvider e uma implementação mock determinística, e o endpoint `/api/margem`. Nunca logue CPF ou valor de renda.
   ```
2. Confirme que o CPF/renda não aparecem em nenhum `console.log`/logger no
   código gerado.

### Artefato(s) gerado(s)
```
src/
├── margem-provider.ts   # interface MargemConsignavelProvider + MockMargemProvider
tests/unit/
└── margem-provider.test.ts
```
- `server.ts` atualizado com o endpoint `/api/margem`.

### Ponto de verificação (checkpoint)
- [ ] Nenhuma ocorrência de CPF ou renda em texto claro em qualquer
      `console.log`/logger.
- [ ] O endpoint `/api/margem` retorna o valor disponível sem expor dados
      de renda na resposta.

### Portão de aprovação
Não há portão nesta etapa.

---

## Módulo 10 — 🧪 Testador (QA): Sprint 1

### Objetivo do módulo
Validar de forma independente as Histórias 1 e 2, com foco nos casos de
borda que o Desenvolvedor pode não ter pensado.

### Conceitos e siglas desta etapa
- **QA** — ver Glossário.

### Pré-requisitos
- Módulo 9 concluído, com testes passando localmente.

### Passo a passo
1. Mude para o módulo **🧪 Testador (QA)**.
2. Peça:
   ```
   Valide os critérios de aceite das Histórias 1 e 2 de FEAT-simulacao-consignado e amplie a cobertura de testes, incluindo casos de borda. Escreva os testes novos como arquivos reais em tests/unit/ e tests/integration/ — não descreva os casos apenas em texto/relatório.
   ```
3. Confirme que o módulo entrega:
   - Mapeamento explícito de cada cenário **Gherkin** para um teste real.
   - Testes de borda: margem exatamente no limite (R$ 0,00 de sobra), prazo
     mínimo/máximo permitido, valor simulado negativo ou zero.
   - Um teste de integração para `/api/margem` em `tests/integration/`
     (fronteira: chama o provider) — distinto dos testes unitários do
     motor de cálculo.
   - Evidência de teste documentada: comando executado, resultado,
     cobertura resultante.
   - Confirmação explícita de que a cobertura do motor de cálculo atinge os
     80%+ definidos na constituição.
   - **Os arquivos de teste acima existem de fato no repositório.** Se a
     resposta vier só como um relatório de cobertura sem tocar nenhum
     arquivo em `tests/`, é um desvio — peça explicitamente "crie os
     arquivos de teste, não descreva-os apenas".

### Artefato(s) gerado(s)
- Testes adicionais em `tests/unit/` e `tests/integration/` + evidência de
  teste documentada.

### Ponto de verificação (checkpoint)
- [ ] Cobertura relatada do motor de cálculo ≥ 80%.
- [ ] Existe teste de integração para `/api/margem`.
- [ ] Existe pelo menos um teste para cada caso de borda citado acima.
- [ ] Os arquivos de teste citados na resposta existem de fato no
      repositório (`git status`/`ls tests/`) — não é um relatório de
      cobertura sem os arquivos correspondentes. Esse é um desvio real
      observado neste laboratório: o módulo pode responder só com texto de
      "evidência" sem escrever nada em `tests/`; se isso acontecer, peça
      explicitamente para ele criar os arquivos antes de seguir.

### Portão de aprovação
Não há portão dedicado — entra como insumo da revisão holística (Módulo 13).

---

## Módulo 11 — 🔒 Segurança: Sprint 1

### Objetivo do módulo
Avaliar riscos de segurança e conformidade regulatória cobrindo as
Histórias 1 e 2 — em um produto financeiro, isso não é opcional.

### Conceitos e siglas desta etapa
- **STRIDE**, **CVE**, **LGPD**, **CMN**, **Bacen**, **PLD/FT** — ver
  Glossário.

### Pré-requisitos
- Módulo 10 concluído.

### Passo a passo
1. Mude para o módulo **🔒 Segurança**.
2. Peça:
   ```
   Faça a revisão de segurança da Sprint 1 de FEAT-simulacao-consignado (Histórias 1 e 2): modelo de ameaças, revisão de CVE e notas de conformidade.
   ```
3. Confirme os três artefatos em `security/`:
   - **`threat-model.md`**: ativos (CPF, renda, margem); limites de
     confiança (cliente ↔ API pública; API ↔ `MargemConsignavelProvider`);
     ameaças (vazamento de CPF/renda em log; manipulação do valor de
     margem no cliente); mitigações (nunca logar campos sensíveis;
     validação de margem sempre recalculada no servidor).
   - **`cve-review.md`**: revisão das dependências usadas na implementação,
     com decisão explícita (bloquear/aceitar com mitigação/não aplicável).
   - **`compliance-notes.md`**: conformidade com LGPD, Resolução CMN nº
     4.658/2018 e Circular Bacen nº 3.978/2020 — reforçando que este é um
     exercício de teste, não orientação regulatória real.

### Artefato(s) gerado(s)
- `security/threat-model.md`, `security/cve-review.md`,
  `security/compliance-notes.md`.

### Ponto de verificação (checkpoint)
- [ ] O modelo de ameaças lista impacto **e** probabilidade para cada
      ameaça.
- [ ] A decisão da revisão de CVE é explícita.

### Portão de aprovação
Não há portão dedicado — insumo da revisão holística.

---

## Módulo 12 — 🎨 Designer (Modo B — Revisar): UI da Sprint 1

### Objetivo do módulo
Validar a UI implementada nas Histórias 1 e 2 contra a especificação
aprovada no Módulo 6 — fechando o ciclo do modo Designer antes da revisão
final.

### Pré-requisitos
- Módulo 8 e 9 (Desenvolvedor) concluídos, com a tela de simulação e a
  consulta de margem implementadas.

### Passo a passo
1. Mude para o módulo **🎨 Designer**.
2. Peça:
   ```
   Revise a UI implementada da Sprint 1 de FEAT-simulacao-consignado (Modo B) contra a especificação aprovada.
   ```
3. Confirme que o módulo abre a interface de verdade (ou declara
   explicitamente que não conseguiu executá-la — nunca finge a verificação
   visual) e valida as 7 dimensões: tokens, componentes, estados,
   hierarquia/layout, responsividade, acessibilidade e conteúdo.
4. Se houver achados CRÍTICOS ou ALTOS (ex.: cor hardcoded em vez de token,
   estado de erro da simulação não implementado), roteie a correção para o
   modo indicado (Designer para tokens/estilo, Desenvolvedor para lógica) e
   peça para reexecutar a revisão até ficar limpa.

### Artefato(s) gerado(s)
- `design/FEAT-simulacao-consignado/revisao-de-ui.md`, com veredito **UI
  APROVADA** ou **BLOQUEADA**.

### Ponto de verificação (checkpoint)
- [ ] O veredito é explícito.
- [ ] Nenhum achado CRÍTICO ou ALTO fica sem solução antes de seguir.

### Portão de aprovação
Não há portão de arquivo dedicado — o veredito **UI APROVADA** é
pré-condição para o Módulo 13 (Revisor de Qualidade).

---

## Módulo 13 — 🔍 Revisor de Qualidade: Sprint 1

### Objetivo do módulo
Fazer a última verificação antes do PR — avaliando o item de trabalho como
um todo (PRD, backlog, ADR, design, código, testes, segurança e
documentação), procurando inconsistências entre eles.

### Conceitos e siglas desta etapa
- **PR** — ver Glossário.

### Pré-requisitos
- Módulos 8 a 12 concluídos, com veredito **UI APROVADA** no Módulo 12.

### Passo a passo
1. Mude para o módulo **🔍 Revisor de Qualidade**.
2. Peça:
   ```
   Faça a revisão final holística da Sprint 1 de FEAT-simulacao-consignado (Histórias 1 e 2) antes do PR.
   ```
3. O módulo deve validar, nesta ordem
   (`.bob/skills/revisao-final-holistica/`):
   1. Conflitos/quebras.
   2. Consistência arquitetural — segue o ADR-0001?
   3. Alinhamento com requisitos — todo critério de aceite coberto por
      teste?
   4. Conformidade constitucional — algum princípio MUST violado? Isso é
      automaticamente CRÍTICO.
   5. Cobertura de testes e documentação.
   6. **Conformidade de design** — o veredito do Módulo 12 (`UI APROVADA`)
      existe e está limpo?
4. **Teste proposital de robustez**: peça a revisão mesmo sabendo que a
   integração real com folha/INSS ainda é um mock — confirme que o módulo
   **não** aprova a feature como "pronta para produção" sem sinalizar isso
   como suposição/risco explícito.

### Artefato(s) gerado(s)
- Veredito explícito: **PRONTO PARA PR** ou **BLOQUEADO**.

### Ponto de verificação (checkpoint)
- [ ] O veredito é explícito.
- [ ] A dimensão de conformidade de design foi verificada, não pulada.

### Portão de aprovação
O veredito **é** o portão de facto — nenhum achado CRÍTICO/ALTO sem solução
antes de seguir.

---

## Módulo 14 — 📝 Documentação + PR da Sprint 1

### Objetivo do módulo
Gerar a especificação técnica a partir do código real implementado e
consolidar tudo em um rascunho de PR.

### Pré-requisitos
- Módulo 13 concluído, com veredito **PRONTO PARA PR**.

### Passo a passo
1. Mude para o módulo **📝 Redator de Documentação**. Peça:
   ```
   Gere a especificação técnica da Sprint 1 de FEAT-simulacao-consignado a partir do código implementado (Histórias 1 e 2).
   ```
2. Confirme `docs/simulacao-consignado-technical-spec.md`: operações
   suportadas, formatos de requisição/resposta (com CPF/renda
   mascarados/fictícios nos exemplos), tratamento de erros.
3. Volte para o módulo **👨‍💻 Desenvolvedor**. Peça:
   ```
   Abra o rascunho de PR da Sprint 1 de FEAT-simulacao-consignado.
   ```
4. Confirme `pr/FEAT-simulacao-consignado-sprint1-pr-draft.md`: o que
   mudou, escopo dentro/fora, como verificar, cobertura de critérios de
   aceite, risco/rollback, e link para a estimativa de custo da Sprint 1
   (Módulo 7) como contexto de esforço.

### Artefato(s) gerado(s)
- `docs/simulacao-consignado-technical-spec.md`,
  `pr/FEAT-simulacao-consignado-sprint1-pr-draft.md`.

### Ponto de verificação (checkpoint)
- [ ] A especificação técnica reflete o comportamento **real**
      implementado, não o planejado.
- [ ] Nenhum dado real de CPF/renda aparece nos exemplos.
- [ ] O rascunho de PR linka o backlog e a estimativa de custo da Sprint 1.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/05-pr-sprint1.md` — o módulo já cria
o arquivo (`Status: PENDING`) sozinho ao abrir o rascunho de PR.

---

## Módulo 15 — 📋 Planejador de Sprint: Sprint 2 + custo acumulado

### Objetivo do módulo
Planejar a segunda fatia (Histórias 3 e 4) e estender a estimativa de custo
para o total acumulado do projeto.

### Pré-requisitos
- Módulo 14 concluído.

### Passo a passo
1. Ainda/novamente no módulo **📋 Planejador de Sprint**, peça:
   ```
   Planeje a Sprint 2 de FEAT-simulacao-consignado com as Histórias 3 (enviar proposta) e 4 (acompanhar status). Monte a estimativa de custo do mesmo jeito da Sprint 1 — pergunte o valor/hora de cada papel antes de calcular (pode reusar os valores da Sprint 1, se eu confirmar).
   ```
2. Confirme os valores da Sprint 1 quando perguntado, ou informe novos.
3. Peça explicitamente o **custo acumulado do projeto** (Sprint 1 + Sprint
   2) se o módulo não somar sozinho.

### Artefato(s) gerado(s)
- `delivery/sprint-plan.md`, bloco Sprint 2 + tabela de custo acumulado.

### Ponto de verificação (checkpoint)
- [ ] A tabela de custo da Sprint 2 existe.
- [ ] O total combinado (Sprint 1 + Sprint 2) foi calculado corretamente.

### Portão de aprovação
Se usado (opcional), peça ao módulo para criá-lo — ele gera
`gates/FEAT-simulacao-consignado/04-sprintplan-sprint2.md` sozinho
(`Status: PENDING`). Só falta você aprovar.

---

## Módulo 16 — 👨‍💻 Desenvolvedor: História 3 (enviar proposta para assinatura eletrônica)

### Passo a passo
Peça:
```
Implemente a História 3 (enviar proposta para assinatura eletrônica) de FEAT-simulacao-consignado com TDD, seguindo a especificação de design aprovada. Crie o endpoint `/api/proposta` (POST) que recebe uma simulação aprovada, gera um protocolo único, e muda o status para "Em Análise". Armazene em memória (Map), sem banco de dados.
```

### Artefato(s) gerado(s)
- `src/proposta-store.ts` (armazenamento em memória isolado do handler
  HTTP), endpoint `POST /api/proposta`, testes correspondentes.

### Ponto de verificação (checkpoint)
- [ ] `POST /api/proposta` retorna um protocolo único.
- [ ] O armazenamento em memória está isolado em um módulo próprio.

### Portão de aprovação
Não há portão nesta etapa.

---

## Módulo 17 — 👨‍💻 Desenvolvedor: História 4 (acompanhar status da proposta)

### Passo a passo
Peça:
```
Implemente a História 4 (acompanhar status da proposta) de FEAT-simulacao-consignado com TDD, seguindo a especificação de design aprovada. Crie o endpoint `/api/proposta/:protocolo/status` (GET).
```

### Artefato(s) gerado(s)
- Endpoint `GET /api/proposta/:protocolo/status`, testes correspondentes,
  tela de status em `public/` usando os componentes Carbon da spec.

### Ponto de verificação (checkpoint)
- [ ] Consultar um protocolo inexistente retorna um erro claro (404), não
      uma exceção não tratada.

### Portão de aprovação
Não há portão nesta etapa.

---

## Módulo 18 — 🧪 Testador (QA): Sprint 2

### Passo a passo
Peça:
```
Valide os critérios de aceite das Histórias 3 e 4 de FEAT-simulacao-consignado e amplie a cobertura de testes, incluindo casos de borda (protocolo inexistente, proposta duplicada, simulação não aprovada tentando gerar proposta). Escreva os testes novos como arquivos reais em tests/unit/ e tests/integration/ — não descreva os casos apenas em texto/relatório.
```

### Artefato(s) gerado(s)
- Testes adicionais em `tests/unit/` e `tests/integration/` + evidência de
  teste.

### Ponto de verificação (checkpoint)
- [ ] Existe teste cobrindo o fluxo completo História 1 → 3 → 4 (simular →
      propor → consultar status) como teste de integração de ponta a ponta.
- [ ] Os arquivos de teste citados na resposta existem de fato no
      repositório — mesmo desvio possível do Módulo 10 (ver nota lá):
      relatório de cobertura sem arquivo correspondente em `tests/`.

### Portão de aprovação
Não há portão dedicado — insumo da revisão holística.

---

## Módulo 19 — 🔒 Segurança: Sprint 2

### Passo a passo
Peça:
```
Faça a revisão de segurança da Sprint 2 de FEAT-simulacao-consignado (Histórias 3 e 4): atualize o modelo de ameaças (inclua replay de proposta já assinada), revisão de CVE e notas de conformidade.
```

### Artefato(s) gerado(s)
- `security/threat-model.md`, `security/cve-review.md`,
  `security/compliance-notes.md` atualizados.

### Ponto de verificação (checkpoint)
- [ ] O modelo de ameaças atualizado inclui a ameaça de replay de proposta
      (já prevista no ADR-0001) e a mitigação (protocolo único e
      idempotente).

### Portão de aprovação
Não há portão dedicado.

---

## Módulo 20 — 🎨 Designer (Modo B — Revisar): UI da Sprint 2

### Passo a passo
Mude para o módulo **🎨 Designer** e peça:
```
Revise a UI implementada da Sprint 2 de FEAT-simulacao-consignado (Modo B) — telas de envio de proposta e acompanhamento de status — contra a especificação aprovada.
```
Mesmo processo do Módulo 12: abrir a interface de verdade, validar as 7
dimensões, registrar achados por severidade, e não liberar com CRÍTICO/ALTO
em aberto.

### Artefato(s) gerado(s)
- `design/FEAT-simulacao-consignado/revisao-de-ui.md` atualizado, com
  veredito **UI APROVADA** ou **BLOQUEADA** cobrindo as 4 telas.

### Ponto de verificação (checkpoint)
- [ ] O veredito cobre as telas da Sprint 2 (proposta e status), não só as
      da Sprint 1.

### Portão de aprovação
Não há portão de arquivo dedicado.

---

## Módulo 21 — 🔍 Revisor de Qualidade: Sprint 2

### Passo a passo
Peça:
```
Faça a revisão final holística da Sprint 2 de FEAT-simulacao-consignado (Histórias 3 e 4) antes do PR. Confirme que o backlog inteiro (Históricas 1 a 4) está coberto de ponta a ponta.
```

### Artefato(s) gerado(s)
- Veredito explícito, confirmando que **todas as 4 histórias** do backlog
  estão implementadas, testadas e com UI aprovada.

### Ponto de verificação (checkpoint)
- [ ] O veredito confirma as 4 histórias, não só as da Sprint 2.

### Portão de aprovação
O veredito é o portão de facto.

---

## Módulo 22 — 📝 Documentação + PR da Sprint 2

### Passo a passo
1. Mude para **📝 Redator de Documentação**: atualize
   `docs/simulacao-consignado-technical-spec.md` cobrindo as 4 operações
   completas (simular, consultar margem, enviar proposta, consultar
   status).
2. Volte para **👨‍💻 Desenvolvedor**: abra
   `pr/FEAT-simulacao-consignado-sprint2-pr-draft.md`.

### Artefato(s) gerado(s)
- `docs/simulacao-consignado-technical-spec.md` (atualizado),
  `pr/FEAT-simulacao-consignado-sprint2-pr-draft.md`.

### Portão de aprovação
Aprove `gates/FEAT-simulacao-consignado/05-pr-sprint2.md` — o módulo já cria
o arquivo (`Status: PENDING`) sozinho ao abrir o rascunho de PR.

---

## Módulo 23 — 👨‍💻 Desenvolvedor: containerização

### Objetivo do módulo
Empacotar a aplicação (backend Express + frontend estático) em uma imagem
Docker de produção, pronta para rodar em qualquer motor Docker — incluindo
o Colima.

### Pré-requisitos
- Módulo 22 concluído (backlog inteiro implementado, PR da Sprint 2
  aprovado).

### Passo a passo
1. Mude para o módulo **👨‍💻 Desenvolvedor**.
2. Peça:
   ```
   Crie o Dockerfile de produção para FEAT-simulacao-consignado: build multi-stage (compila o TypeScript, depois copia só o resultado para uma imagem final enxuta), expõe a porta 3000, e o servidor Express serve tanto a API quanto os arquivos estáticos de public/. Crie também um .dockerignore e um docker-compose.yml simples para rodar localmente.
   ```
3. Revise o `Dockerfile` gerado contra o exemplo de referência abaixo.

### Artefato(s) gerado(s) — exemplo de referência

`Dockerfile`:
```dockerfile
# Etapa 1: build (compila TypeScript)
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build

# Etapa 2: imagem final (só o necessário para rodar)
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY public ./public
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

`.dockerignore`:
```
node_modules
dist
tests
*.md
.git
```

`docker-compose.yml`:
```yaml
services:
  credito-consignado:
    build: .
    image: credito-consignado:mvp
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
```

### Ponto de verificação (checkpoint)
- [ ] O `Dockerfile` usa build multi-stage.
- [ ] A porta exposta (`EXPOSE`) bate com a porta que o `server.ts` escuta.
- [ ] `.dockerignore` existe e exclui `node_modules`/`dist` locais.

### Portão de aprovação
Não há portão dedicado.

---

## Módulo 24 — Deploy real no Colima

### Objetivo do módulo
Colocar a aplicação de fato no ar em um container, rodando localmente no
seu Mac via Colima.

### Pré-requisitos
- Módulo 23 concluído (`Dockerfile` existe).
- macOS 13 ou mais recente, [Homebrew](https://brew.sh) instalado.

### 24.1 — Instalar o Colima e o cliente Docker
```bash
brew install colima docker docker-compose
colima version
docker --version
```
**Checkpoint**: ambos os comandos retornam uma versão, sem "command not
found".

### 24.2 — Iniciar o Colima
```bash
colima start --cpu 2 --memory 4 --disk 20
colima status
docker context ls
docker run hello-world
```
Saída esperada de `colima status` (aproximada):
```
INFO[0000] colima is running using QEMU
INFO[0000] arch: aarch64
INFO[0000] runtime: docker
INFO[0000] mountType: sshfs
```
**Checkpoint**: `colima status` mostra `runtime: docker`; `docker context
ls` mostra `colima` como context ativo (`*`); `docker run hello-world`
imprime a mensagem de sucesso.

> **Se `hello-world` falhar com erro de conexão**: rode `docker context use
> colima` manualmente; se persistir, `colima stop && colima start`.

### 24.3 — Build da imagem
```bash
cd credito-consignado
docker build -t credito-consignado:mvp .
docker images | grep credito-consignado
```
**Checkpoint**: build termina sem erro; `docker images` lista a tag `mvp`.

### 24.4 — Rodar o container
```bash
# Opção A
docker run -d --name credito-consignado -p 3000:3000 credito-consignado:mvp
# Opção B
docker compose up -d
```
**Checkpoint**: `docker ps` lista o container com status `Up`.

### 24.5 — Smoke test
```bash
# Health check
curl -i http://localhost:3000/api/health

# Simulação dentro da margem
curl -s -X POST http://localhost:3000/api/simular \
  -H "Content-Type: application/json" \
  -d '{"valorParcela": 300, "prazoMeses": 24, "margemDisponivel": 500}' | jq

# Simulação acima da margem
curl -s -X POST http://localhost:3000/api/simular \
  -H "Content-Type: application/json" \
  -d '{"valorParcela": 300, "prazoMeses": 24, "margemDisponivel": 200}' | jq

# Consulta de margem
curl -s "http://localhost:3000/api/margem?cpf=12345678900" | jq

# Fluxo completo (propor + consultar status)
PROTOCOLO=$(curl -s -X POST http://localhost:3000/api/proposta \
  -H "Content-Type: application/json" \
  -d '{"valorParcela": 300, "prazoMeses": 24, "cpf": "12345678900"}' | jq -r '.protocolo')
echo "Protocolo gerado: $PROTOCOLO"
curl -s "http://localhost:3000/api/proposta/$PROTOCOLO/status" | jq
```
Abra também `http://localhost:3000` no navegador — deve carregar
`public/index.html` estilizado com Carbon Design System.

**Checkpoint**: os 4 endpoints respondem como esperado; o frontend carrega
com o visual do Carbon; nenhuma resposta expõe CPF/renda em texto.

### 24.6 — Logs e troubleshooting
```bash
docker logs -f credito-consignado
```

| Sintoma | Causa provável | Solução |
|---|---|---|
| `Cannot connect to the Docker daemon` | Colima não está rodando | `colima start`, depois `docker context use colima` |
| Porta 3000 já em uso | Outro processo/container na porta | `docker ps` + `docker stop <nome>`, ou use `-p 3001:3000` |
| Build falha em `npm ci` | `package-lock.json` ausente/desatualizado | `npm install` local para gerar/atualizar o lockfile, depois refaça o build |
| Container sobe e morre na hora | Erro na inicialização do servidor | `docker logs credito-consignado` (sem `-f`) |
| `curl` retorna conexão recusada | Container ainda subindo, ou porta não mapeada | Aguarde alguns segundos; confirme com `docker ps` |

### 24.7 — Parar e limpar (opcional)
```bash
docker stop credito-consignado && docker rm credito-consignado
# ou
docker compose down
# opcional: libera CPU/memória do Mac
colima stop
```

### Portão de aprovação
Não há portão dedicado para o deploy em si.

---

## Módulo 25 — Release (opcional)

### Objetivo do módulo
Um último checkpoint humano antes do merge/deploy final.

### Pré-requisitos
- Módulos 0 a 24 concluídos.

### Passo a passo
1. Confirme que todos os portões anteriores estão `APPROVED`:
   `00-discovery.md`, `01-prd.md`, `02-backlog.md`, `03-adr.md`,
   `03-design.md`, `04-sprintplan-sprint1.md` (se usado),
   `04-sprintplan-sprint2.md` (se usado), `05-pr-sprint1.md`,
   `05-pr-sprint2.md`.
2. Crie `gates/FEAT-simulacao-consignado/06-release-ready.md` a partir de
   `gates/_modelos/modelo-portao.md`. **Diferente dos outros portões deste
   guia, este é mesmo manual**: não existe uma skill dedicada que produza um
   artefato antes dele (ele não nasce "depois de gerar X", como os demais) —
   é um checkpoint humano final, por design (`.bob/rules/06-portoes-aprovacao-humana.md`).

### Artefato(s) gerado(s)
- `gates/FEAT-simulacao-consignado/06-release-ready.md`.

### Ponto de verificação (checkpoint)
- [ ] Todos os portões anteriores estão `APPROVED` antes de aprovar este.

### Portão de aprovação
`06-release-ready.md` — opcional, use-o só se seu fluxo exige sign-off
final explícito.

---

## Módulo 26 — 🔧 Engenheiro de Produto (cenário bônus: incidente em produção)

### Objetivo do módulo
Este é o **único módulo fora da sequência linear** — só entra em cena
depois do release, quando um cliente real relata um problema. Ele existe
para tratar a causa raiz de um incidente sem expor código-fonte ao cliente,
e para devolver a correção ao módulo Desenvolvedor de forma rastreável.

### Conceitos e siglas desta etapa
- **TS** (*Technical Support*): identificador de caso/ticket de suporte,
  usado aqui como `TS0001234`.

### Pré-requisitos
- Módulos 0 a 25 concluídos (a feature já está em produção/no ar no
  Colima).

### Passo a passo
1. Mude para o módulo **🔧 Engenheiro de Produto**.
2. Simule um caso de incidente, pedindo:
   ```
   Cliente TS0001234 reclama que a simulação de crédito consignado calculou uma parcela maior do que o esperado para um empréstimo de R$ 10.000 em 24 meses. Investigue e documente.
   ```
3. Confirme os artefatos gerados em `product-engineering/TS0001234/`:
   - `issue-summary.md`: resumo do caso, **sem** expor código-fonte ao
     cliente.
   - `investigation-prompt.md` e `internal-analysis.md`: investigação
     técnica interna.
   - `root-cause-and-fix.md`: causa raiz (ex.: "juros compostos aplicados
     sobre a base errada no arredondamento da última parcela") e a
     correção proposta.
   - `defect.md`: passos de reprodução, esperado vs. real, plano de
     validação.
4. Depois de `defect.md` estar pronto, volte ao módulo **👨‍💻 Desenvolvedor**
   e peça a correção — fechando o ciclo completo: incidente → causa raiz →
   correção → novo teste → nova revisão de qualidade → novo PR.
5. **Opcional, para fechar o ciclo até o ambiente real**: depois de aplicar
   a correção, reconstrua e reinicie o container (`docker build -t
   credito-consignado:mvp .` + `docker restart credito-consignado`, ver
   Módulo 24) e repita o smoke test do endpoint `/api/simular` com os
   mesmos valores do incidente, confirmando que o resultado corrigido
   aparece de verdade no container rodando.

### Artefato(s) gerado(s)
- `product-engineering/TS0001234/issue-summary.md`,
  `investigation-prompt.md`, `internal-analysis.md`,
  `root-cause-and-fix.md`, `defect.md`.

### Ponto de verificação (checkpoint)
- [ ] `issue-summary.md` (voltado ao cliente) **não** contém trecho de
      código-fonte ou detalhe de implementação.
- [ ] `defect.md` tem passos de reprodução claros o suficiente para o
      Desenvolvedor agir sem perguntar mais nada.

### Portão de aprovação
Não há portão dedicado — a correção volta a passar pelos portões normais de
desenvolvimento/teste/qualidade/PR ao reabrir o ciclo.

---

## Checklist final — todos os 27 módulos exercitados

- [ ] 0 — 🔮 Oráculo — bootstrap do projeto `credito-consignado`
- [ ] 1 — 🏛️ Governança — `architecture/constituicao.md` (v1.0.0), incluindo a stack técnica
- [ ] 2 — 🔍 Descoberta — 3 arquivos de discovery + portão `00-discovery.md`
- [ ] 3 — 📊 Product Owner (PRD) — `prd/FEAT-simulacao-consignado.md` + portão `01-prd.md`
- [ ] 4 — 📊 Product Owner (Backlog) — 4 histórias, todas com "Toca interface: Sim" + portão `02-backlog.md`
- [ ] 5 — 🏗️ Arquiteto — ADR-0001 (incl. stack) + portão `03-adr.md`
- [ ] 6 — 🎨 Designer (Modo A) — `design-spec.md`, `design-system.md` + portão `03-design.md`
- [ ] 7 — 📋 Planejador de Sprint — Sprint 1 planejada **com estimativa de custo por papel** (valor/hora perguntado, não presumido)
- [ ] 8-9 — 👨‍💻 Desenvolvedor — Histórias 1 e 2 implementadas com TDD, contra a spec de design
- [ ] 10 — 🧪 Testador — Sprint 1 validada, cobertura 80%+
- [ ] 11 — 🔒 Segurança — Sprint 1 revisada (threat model, CVE, conformidade)
- [ ] 12 — 🎨 Designer (Modo B) — UI da Sprint 1 revisada, veredito UI APROVADA
- [ ] 13 — 🔍 Revisor de Qualidade — Sprint 1, veredito PRONTO PARA PR (6 dimensões, incl. design)
- [ ] 14 — 📝 Documentação + PR Sprint 1 — spec técnica + PR + portão `05-pr-sprint1.md`
- [ ] 15 — 📋 Planejador de Sprint — Sprint 2 planejada com custo + total acumulado
- [ ] 16-17 — 👨‍💻 Desenvolvedor — Histórias 3 e 4 implementadas com TDD
- [ ] 18 — 🧪 Testador — Sprint 2 validada, incl. teste E2E do fluxo completo
- [ ] 19 — 🔒 Segurança — Sprint 2 revisada (incl. ameaça de replay)
- [ ] 20 — 🎨 Designer (Modo B) — UI da Sprint 2 revisada
- [ ] 21 — 🔍 Revisor de Qualidade — Sprint 2, confirma as 4 histórias de ponta a ponta
- [ ] 22 — 📝 Documentação + PR Sprint 2 — spec técnica atualizada + PR + portão `05-pr-sprint2.md`
- [ ] 23 — 👨‍💻 Desenvolvedor — `Dockerfile`, `.dockerignore`, `docker-compose.yml`
- [ ] 24 — Deploy real no Colima — instalado, imagem construída, container no ar, smoke test dos 4 endpoints + frontend confirmados
- [ ] 25 — Release (opcional) — portão `06-release-ready.md`
- [ ] 26 — 🔧 Engenheiro de Produto — caso `TS0001234`, `issue-summary.md` (sem código-fonte), `root-cause-and-fix.md`, `defect.md`, reabrindo o ciclo no Desenvolvedor

Se todos os itens acima passarem, os 13 modos do framework, os 9 portões de
aprovação (incluindo o portão condicional de design), o ciclo completo de
2 sprints com estimativa de custo, e o ciclo de incidente/correção foram
exercitados de ponta a ponta (**E2E**) com um cenário de negócio realista —
terminando com uma aplicação de fato rodando em container no seu Mac.

---

## Nota de responsabilidade

Todo o conteúdo numérico e regulatório deste laboratório (valores/hora
sugeridos, percentuais de margem consignável, resoluções e circulares
citadas) é **ilustrativo, para fins de teste do framework** — não é
orientação jurídica, contábil, regulatória ou de precificação real de
mercado. Antes de usar qualquer parte deste cenário em um produto real,
valide as normas vigentes com a área jurídica/compliance e com o
convênio/provedor de folha de pagamento envolvido. O `Dockerfile`/
`docker-compose.yml` de exemplo também são um ponto de partida de
laboratório, não um hardening de produção (não incluem, por exemplo,
usuário não-root no container, scanning de imagem, ou segredos geridos via
vault).
