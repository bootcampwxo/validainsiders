---
author: Framework .Bob (Sicoob)
---

# Detecção e Clone Automático de Projeto Existente (aplica-se a todos os modos)

## Objetivo
Evitar que o desenvolvedor precise sair da IDE para rodar `git clone`
manualmente sempre que quiser retomar um projeto que já existe no Bitbucket.
Qualquer modo — não só o 🔮 Oráculo — deve reconhecer quando o desenvolvedor
está pedindo para trabalhar num projeto pelo nome e, se a pasta aberta não
for já esse projeto, verificar e clonar sozinho antes de prosseguir com o
pedido original.

## Quando esta regra se aplica
Sempre que o desenvolvedor mencionar, em qualquer modo, que quer
trabalhar/mexer/abrir um projeto por nome (ex.: "quero trabalhar no projeto
consignado-digital", "preciso mexer no X", "abre o projeto Y") — e a pasta
atualmente aberta no Bob-IDE não for já esse projeto.

## Como confirmar se já está no projeto certo
Antes de fazer qualquer coisa, confira:
- O nome da pasta raiz aberta bate com o nome mencionado, **e**
- Se for um repositório git, `git remote -v` aponta para
  `bitbucket.org/bobplace/<nome>` (ou o workspace equivalente, se o
  desenvolvedor tiver informado outro).

Se as duas condições baterem, não faça nada — já está no lugar certo,
prossiga direto com o pedido original do desenvolvedor.

## Se não estiver no projeto certo
1. Tente clonar diretamente, sempre com `--quiet`, e sempre julgue
   sucesso/falha pelo **código de saída** do comando (`$LASTEXITCODE` no
   PowerShell / `$?` no bash), nunca pela simples presença de texto em
   stderr — mesmo cuidado do 🔮 Oráculo: o git escreve mensagens normais de
   progresso em stderr mesmo em clones bem-sucedidos.
   ```
   git clone --quiet https://bitbucket.org/bobplace/<nome>.git <nome>
   ```
2. **Clonou com sucesso**: o clone cria `<nome>/` como **subpasta** da pasta
   atualmente aberta no editor — a raiz do editor em si não muda sozinha.
   Se, por algum motivo, a raiz aberta já for `<nome>/` (ex.: o desenvolvedor
   já tinha aberto uma pasta vazia com esse nome antes de pedir), prossiga
   direto com o pedido original, sem pausar. **No caso normal (raiz aberta
   é a pasta-pai, `<nome>/` é subpasta dela), PARE aqui**: numa única
   mensagem, informe que o projeto foi clonado em `<nome>/` e peça para
   abrir essa pasta (File > Open Folder) e repetir o pedido original depois
   de abri-la. NUNCA crie os arquivos do pedido original com caminho
   relativo à pasta atual antes disso (ex.: escrever em
   `architecture/constituicao.md` em vez de `<nome>/architecture/constituicao.md`)
   — isso cria os arquivos fora do projeto clonado, um bug real já
   observado neste framework.
3. **Falhou por repositório não encontrado** (erro tipo "repository not
   found" ou HTTP 404): informe que esse projeto ainda não existe no
   Bitbucket, e sugira trocar manualmente para o modo 🔮 Oráculo para criá-lo
   do zero. Não tente criar o repositório você mesmo — bootstrap de projeto
   novo é exclusividade do Oráculo.
4. **Falhou por falta de credencial** (pede login interativo, ou erro de
   autenticação/permissão): pare e explique que é preciso ter a API token
   pessoal do Bitbucket configurada no git da máquina (usuário
   `x-bitbucket-api-token-auth`, senha a API token — nunca o e-mail/senha da
   conta). Nunca peça a senha/token no chat, nunca tente autenticar por
   conta própria.
5. **Qualquer outro erro**: pare e reporte o erro exato (código de saída +
   mensagem), sem tentar contornar sozinho.

## O que esta regra NÃO faz
Não substitui o 🔮 Oráculo — ele continua sendo o único modo que faz
bootstrap de um projeto **novo** do zero (clona o esqueleto do framework,
não o projeto do desenvolvedor). Esta regra cobre só o caso de **retomar**
um projeto que já existe, a partir de qualquer modo — inclusive o próprio
Oráculo, que também deve checar isso antes de assumir que é um projeto novo.

## Workspace assumido
Assume o mesmo workspace fixo `bobplace` usado em todo o framework (ver 🔮
Oráculo). Se o projeto pretendido estiver em outro workspace, o
desenvolvedor deve informar a URL completa em vez do nome curto.
