# Backend — onde o registro do QA mora

A skill descreve a rodada em termos de **operações**. Quem executa cada uma é o backend do projeto:
`productdock` ([pd-sync/qa.md](../pd-sync/qa.md), que fala com a plataforma pela CLI) ou `local`
([local.md](local.md), só o disco). O núcleo nunca chama a plataforma nem grava registro fora de `[QA_DIR]`
por conta própria: cita a operação, e o backend diz o que ela faz.

---

## Detecção

Uma vez por sessão, no preflight, antes de qualquer outra coisa, **nesta ordem** — a primeira que valer
decide:

1. `PROJECT.md` existe (em `.productdock/project/` ou `.specs/project/`) e declara o backend numa linha
   `backend: productdock` ou `backend: local`, em início de linha ⇒ vale o declarado. "backend" em prosa
   não conta; confira lendo o arquivo
2. `productdock.json` no diretório de trabalho **ou num diretório acima**, com `project.id` ⇒ `productdock`.
   Sem como olhar acima do diretório de trabalho, vale o que o diretório de trabalho mostra
3. `productdock.json` sem `project`, ou pasta `.productdock/` sem `productdock.json` ⇒ o projeto parece do
   ProductDock mas não está ligado: **pergunte**, recomendando `productdock` e o `link` do bootstrap
   ([sync.md](../pd-sync/sync.md#bootstrap))
4. Pasta `.specs/work-items/` ou `.specs/project/PROJECT.md` ⇒ `local`
5. Nenhum marcador ⇒ **pergunte uma vez** ("este projeto usa o ProductDock?"), recomendando `local`

Regras:

- **Nunca** detecte por "a CLI está instalada".
- `.specs/` sozinha não é marcador: outras skills usam `.specs/` — por isso o item 4 olha `work-items/` e
  `PROJECT.md`.
- `backend: productdock` sem sessão da CLI ⇒ **bloqueie** e conduza o bootstrap
  ([sync.md](../pd-sync/sync.md#sonda-de-canal)). Nunca caia para `local`, nunca use o MCP como plano B,
  nunca grave "para sincronizar depois".
- **Anuncie** o backend numa linha no início da sessão (`Backend: productdock` · `Backend: local`, e de onde
  veio).
- Esta skill não escreve o `PROJECT.md` e nunca grava a linha `backend:` — ela é da `pd-workflow`. Quando a
  detecção precisou perguntar, a resposta vale para a sessão, e você diz que a `pd-workflow` registra o
  `backend:` no `PROJECT.md`.

## Raízes

| | `productdock` | `local` |
|---|---|---|
| `[RAIZ]` | `.productdock/` | `.specs/` |
| `PROJECT.md` | `.productdock/project/PROJECT.md` | `.specs/project/PROJECT.md` |
| `[ITEM_DIR]` | `.productdock/work-items/[WI-ID]-[name]/` | `.specs/work-items/[WI-ID]-[slug]/` |
| `[QA_DIR]` | `[ITEM_DIR]/qa/` | `[ITEM_DIR]/qa/` |
| Pasta temporária | `<scratchpad>/pd/<WI-ID>/` ([a pasta de envio](../pd-sync/sync.md#a-pasta-de-envio)) | `<scratchpad>/wi/<WI-ID>/` ([local.md](local.md#a-pasta-temporária)) |

Fora do Claude Code, a pasta temporária é a mesma subpasta (`pd/<WI-ID>/` · `wi/<WI-ID>/`) no diretório
temporário do sistema (`$TMPDIR`, `/tmp`, `%TEMP%`). **Nunca** fica em `[ITEM_DIR]`.

## Operações

O núcleo cita estes nomes, sempre em `código`. A coluna de cada backend resume; o procedimento completo
está em [local.md](local.md#as-operações-no-local) e em [pd-sync/qa.md](../pd-sync/qa.md).

| Operação | Quando | `local` | `productdock` |
|---|---|---|---|
| `canal.sondar` | início da sessão | nada | sonda de canal da CLI, sonda de versões, bootstrap |
| `item.titulo` | preflight, `[ITEM_DIR]` não existe | pergunta o título, em bloco com a Fase 0 | o título que a plataforma devolve |
| `qa.estado` | preflight | cabeçalho `**Gate 1:**` do test-plan e `**Gate 3:**` do `qa-result.md` | `qa-plan` entre os artefatos já submetidos; `qa-result.md` em disco; conferência do escopo |
| `contexto.ler` | Fase 0 | `[ITEM_DIR]` do disco: `item.md`, Insumos, fontes de design | fase, PRD, protótipos, anexos e bugs abertos da plataforma → pasta temporária; bug aberto sem arquivo é **materializado** em `issues/` |
| `bugs.todos` | Fase 3, antes de despachar o triager | nada: `issues/` já é a fonte | todos os bugs do Work Item; o que não tem arquivo é materializado em `issues/` |
| `plano.registrar` | Gate 1 aprovado | `**Gate 1:** aprovado em <data>` no cabeçalho + linha em `item.md` › Gates | publica o `qa-plan` |
| `perguntas.registrar` | gate de perguntas fechado | linha em `item.md` › Gates | nada |
| `evidencia.enviar` | Gate 3 confirmado | nada: o caminho em `screenshots/` basta | sobe cada screenshot e regrava o `evidence[].url` |
| `resultado.registrar` | Gate 3 confirmado | `**Gate 3:** confirmado em <data>` + linha em `item.md` › Gates | publica o `qa-result` |
| `bug.registrar` | Gate 3, por bug novo e por bug transicionado | nada: o `BUG-NNN.md` gravado já é o registro | publica o `qa-issue` |
| `temporaria.limpar` | fim do Gate 3, com tudo conferido | opcional: apague ou deixe | apague a pasta de envio |

Toda operação é da **thread principal**. Nenhum subagent executa operação de backend, lê `pd-sync/` ou fala
com a plataforma: eles leem e escrevem disco, pelos caminhos do briefing.

Depois de cada operação que registra, confira o efeito — [local.md](local.md#conferir-o-que-foi-gravado) ·
[pd-sync/qa.md](../pd-sync/qa.md#conferir-o-efeito) — e diga ao humano, por caminho, o que ficou registrado
e o que não.

## O que cada backend habilita

| | `productdock` | `local` |
|---|---|---|
| Canal | a CLI `productdock`, obrigatória; sem sessão, bloqueia | nenhum: só o disco |
| Sonda de versões da skill e dos agents | sim | não |
| Título e insumos do Work Item | plataforma (PRD, protótipos, anexos) + disco | disco (`item.md` › Insumos, `prd.md`, `PROJECT.md`) + a mensagem |
| Bugs abertos do Work Item | plataforma, materializada em `issues/` | `issues/` |
| Estado dos Gates 1 e 3 | plataforma (`qa-plan` submetido) + existência do `qa-result.md` | cabeçalho `**Gate N:**` em disco |
| Perguntas do QA (🔴 do plano, ao produto) | uma mensagem no chat, no formato `Q-NN`/`P-NN` | pela página de perguntas; sem página, o gate bloqueia |
| Registro dos Gates 1 e 3 | publicação na plataforma; nenhuma linha de estado à parte | cabeçalho do artefato + linha em `item.md` › Gates |
| Evidência | só PNG, JPEG, GIF e WEBP sobem; trace e vídeo ficam em disco | tudo vale pelo caminho relativo a `qa/` |
| Fim da rodada sem bug aberto | o Dev move o card na UI; o eng. de QA segue com a `pd-workflow-qa` | o desenvolvimento está fechado; automação E2E e deployed ficam fora |
