# pd-workflow — Work Item por costura, com ou sem plataforma

Conduz um Work Item do insumo à Validation: uma skill, seis agents, **uma pipeline com até três
entradas**. O que muda entre um Work Item com PRD, um que nasce de uma descoberta e um que vai direto ao
plano é o que alimenta a costura — daí em diante o caminho é o mesmo. Funciona **com e sem o
ProductDock**: em projeto ligado à plataforma, fala pela CLI `productdock`; sem plataforma, guarda todo o
estado em disco, em `.specs/`.

> **Versão:** 4.0.0 · **Licença:** CC-BY-4.0 · base conceitual em CC-BY-4.0 por github.com/felipfr.
> A fonte de verdade de comportamento é o [`SKILL.md`](SKILL.md).

## O que caracteriza esta skill

|                   |                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**       | `productdock` (a plataforma, pela CLI, **obrigatória** no projeto ligado; o MCP não é plano B) ou `local` (só o disco). Detectado uma vez por sessão e gravado no `PROJECT.md` — [backend.md](references/setup/backend.md) |
| **Entradas**      | **com PRD** · **sem PRD** (bug, incident, dívida, melhoria pequena) · **por descoberta**, só no `local` (`pd-discovery` rascunha o PRD)                                                                               |
| **Levantamento**  | `pd-design-lookup` por fonte + `pd-code-lookup` por repositório, em paralelo. Fonte de design: os links da seção UI/UX do PRD, os do Work Item e as fontes `fixo` do `PROJECT.md`. Sem fonte e com tela, pergunta     |
| **Conferência**   | três na thread principal: fronteira · cobertura · o que os lookups não resolveram                                                                                                                                     |
| **Gate**          | página web local de perguntas — no `productdock`, com fallback inline no CLI; no `local`, obrigatória nos gates de review técnico                                                                                     |
| **Costura**       | `spec.md` (com PRD) ou `plan.md` (sem PRD) — registro datado                                                                                                                                                          |
| **Tarefa**        | uma tela (ou agregado), caminho completo de ponta a ponta — nunca quebrada por camada                                                                                                                                 |
| **Auditoria**     | `pd-task-audit`, adversarial, independente do contexto que escreveu a fila                                                                                                                                            |
| **Implementação** | `pd-impl-task` por tarefa + `pd-impl-review` sobre o diff; no `local`, por ondas paralelas                                                                                                                            |
| **Git**           | **o agente não versiona por iniciativa própria** — só a pedido ou com confirmação                                                                                                                                     |

## Os dois backends

|                         | `productdock`                                                                 | `local`                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Como se detecta         | `productdock.json` com `project.id` (no diretório ou acima)                   | `.specs/work-items/` ou `.specs/project/PROJECT.md`                      |
| Raiz                    | `.productdock/`                                                               | `.specs/`                                                                |
| Estado                  | na plataforma; em disco, só a costura e a fila                                | `item.md`, a costura e a linha `**Status:**` de cada tarefa              |
| Entradas                | com PRD · sem PRD (roteadas por `uses_plan`)                                  | com PRD (inclusive texto colado) · por descoberta · sem PRD              |
| PRD Tech Review         | handoff antecipado; negócio vai ao PM; rodadas convergentes; modo autônomo pelo `productdock watch` | um gate pela página; o `prd.md` é editado com Histórico de revisões; `prd-review.md` por rodada |
| Fluxo curto             | Fluxo Rápido, validado pelo servidor                                          | sugestão de `entrada: plano`                                             |
| Fila                    | sequencial                                                                    | por ondas (`waves.md`)                                                   |
| Bugs abertos            | os do Work Item na plataforma                                                 | `qa/issues/BUG-*.md`                                                     |
| Fim da Validation       | handoff manual de QA (o card vai a "Aguardando Testes")                       | `fase: done` e a oferta do commit dos artefatos                          |

Sem marcador nenhum, a skill pergunta uma vez se o projeto usa o ProductDock, recomendando `local`. O que
cada backend habilita, linha a linha, está em
[backend.md](references/setup/backend.md#o-que-cada-backend-habilita).

## Pré-requisitos

**1. Só no `productdock`: a CLI do ProductDock autenticada** — pré-requisito **externo** à skill. Sem
sessão ela **bloqueia a fase** e conduz o bootstrap (e **não** usa o MCP como plano B, nem cai para o
`local`):

1. `npm install -g @softdesignbrasil/productdock-cli` (ou `npx @softdesignbrasil/productdock-cli`).
   A forma canônica é `productdock`; a sonda tenta as **duas** antes de declarar "não instalada".
2. **`productdock login`** — uma vez por máquina. OAuth 2.1 + PKCE no navegador.
3. **`productdock link`** — uma vez por repositório. Escreve o `productdock.json` de onde sai o escopo.
4. `productdock doctor` para conferir.

Detalhe em [pd-sync/sync.md](references/pd-sync/sync.md#bootstrap).

**2. Os agents do catálogo:**

`pd-design-lookup` · `pd-code-lookup` · `pd-task-audit` · `pd-impl-task` · `pd-impl-review` · e, só no
`local`, `pd-discovery`

```bash
npx @softdesignbrasil/ai-tools install agents --platform claude   # todos de uma vez
productdock agent install <nome>                                  # no productdock, um por agent
```

> ⚠️ **A skill não traz os agents.** Instalar a skill — por qualquer canal — não instala os agents; eles
> são artefatos separados. Sem eles, a skill bloqueia — de propósito: fazer a descoberta, o lookup e a
> auditoria na thread principal estoura o contexto e destrói a independência da auditoria. No Cursor a
> CLI não instala agents.

**3. Node ≥ 18 e a pasta `templates/handoff-ui/`** — para a **página** de perguntas dos gates. Faltando
um dos dois: no `productdock`, o gate acontece inline no CLI e a fase segue; no `local`, o gate
**bloqueia** e a skill diz como resolver — inline só a pedido explícito do humano. Node também roda o
`scripts/estado.cjs`, que lê o disco da retomada num JSON só; sem Node, a skill lê os arquivos à mão.

> Os canais — `productdock skill install pd-workflow` e `npx @softdesignbrasil/ai-tools install skill
> pd-workflow` — copiam a pasta inteira da skill, `templates/handoff-ui/` e `scripts/` incluídos.

**4. Só no `productdock`, e só para o Tech Review autônomo: `productdock watch`** — o comando da CLI que
atende os pedidos de Tech Review do projeto no terminal do desenvolvedor. É ele que cria a cópia
descartável do código, copia para ela esta skill instalada e abre as duas sessões do
[modo autônomo](references/discovery/prd-review-autonomo.md). Sem ele, o Tech Review segue pelo
interativo, na IDE.

**5. Só no `productdock`: versões em dia (opcional, não bloqueia)** — no início da sessão a skill confere
se há versão nova da `pd-workflow` ou dos agents dela. Havendo, avisa numa linha e segue com a instalada.
Instalações pelo `ai-tools` não têm versão registrada e não geram aviso.

**6. Opcional — o `PROJECT.md`.** Se outra ferramenta já o escreveu, a skill **não o sobrescreve**:
acrescenta, com o humano, a linha `backend:` e as seções **Topologia** e **Fontes de design** que
faltarem. Ver [project.md](references/setup/project.md).

## Fluxo

```
BACKEND → SONDAS → PROJECT.md → WORK ITEM (item.ler) → BUGS ABERTOS → PREFLIGHT DE DISCO
       → roteia: [productdock] por `uses_plan` · [local] pelo pedido, gravado no item.md

  [local] por descoberta → (feature sem PRD nem documento de requisito)
    pd-discovery → discovery.md + rascunho de prd.md → ⛔ GATE DA DESCOBERTA → segue como "com PRD"

  com PRD → prd.md → PRD TECH REVIEW (cada achado com `owner`: pm · tech · tech_prd_edit)
             [productdock] handoff antecipado; só pm e tech_prd_edit vão ao PM; pm blocking ⛔ espera o PM
             [local]       ⛔ gate pela página; respostas aplicadas ao prd.md e às Decisões → prd-review.md
    → INSUMOS DO WI (sempre; insumo de escopo, não fonte de design)
    → FONTE DE DESIGN (UI/UX do PRD + os links do WI + fontes `fixo`; sem fonte + tela ⇒ pergunta)
    → DESIGN LOOKUP + CODE LOOKUP → 3 CONFERÊNCIAS
    → ⛔ HANDOFF → COSTURA (spec.md)

  sem PRD → (bug · incident · technical_debt · melhoria pequena em fluxo curto)
    INSUMOS → comportamentos C-01, C-02… → FONTE DE DESIGN (vazio + tela ⇒ pergunta)
    → DESIGN LOOKUP (só com fonte) + CODE LOOKUP → COBERTURA → COSTURA (plan.md, com seção Design)
    → perguntas: [productdock] junto do plano e da fila · [local] ⛔ página antes, se houver

  todas → ⛔ FATIAMENTO → tasks/ ([local] + waves.md) → AUDITORIA → ⛔ GATE DA EXECUÇÃO
        → CORRIDA DA FILA → VALIDATION

Validation PASS → [productdock] handoff manual de QA · [local] fase: done e oferta de commit
                → nos dois, a oferta da pd-qa-validation
Bug aberto do Work Item → fix task ao fim de tasks/ → ⛔ GATE DA EXECUÇÃO → corrida → reteste da QA
```

| Etapa                    | Goal                                                                                                                                                         | Artefato                                                      | Referência                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Backend**              | detectar, anunciar e executar cada operação no backend do projeto                                                                                            | `PROJECT.md` › `backend:`                                     | [backend.md](references/setup/backend.md) · [local.md](references/setup/local.md) |
| **Descoberta** (local)   | código + conhecimento do domínio viram diagnóstico, rascunho de PRD, premissas e perguntas                                                                   | `discovery.md` + `prd.md` (rascunho)                          | [descoberta.md](references/discovery/descoberta.md)                               |
| **PRD Tech Review**      | parecer técnico retriado por `owner`; no `productdock`, técnico fecha no handoff antecipado e só negócio vai ao PM; no `local`, respostas vão ao `prd.md` ou às **Decisões** | `productdock`: threads no PRD · `local`: `prd-review.md`      | [prd-review.md](references/discovery/prd-review.md)                               |
| **Tech Review autônomo** | o mesmo parecer, a pedido do `productdock watch`: sem perguntas e sem handoff; negócio e premissas ao PM, técnico pendente para a Spec; envio único         | threads no PRD + pendências                                   | [prd-review-autonomo.md](references/discovery/prd-review-autonomo.md)             |
| **Lookup**               | o que o design mostra e o que o código já tem                                                                                                                | —                                                             | [lookup.md](references/discovery/lookup.md)                                       |
| **Handoff**              | o que exige decisão do humano                                                                                                                                | —                                                             | [handoff.md](references/discovery/handoff.md)                                     |
| **Costura (com PRD)**    | o registro datado do que se descobriu e decidiu                                                                                                              | `spec.md`                                                     | [spec.md](references/seam/spec.md)                                                |
| **Costura (sem PRD)**    | o mesmo papel, alimentado só pelo código                                                                                                                     | `plan.md`                                                     | [plan.md](references/seam/plan.md)                                                |
| **Fatiamento**           | uma tarefa por tela, ordenada; no `local`, com o plano de ondas                                                                                              | `tasks/` (+ `waves.md`)                                       | [tasks.md](references/planning/tasks.md) · [task.md](references/planning/task.md) |
| **Corrida da fila**      | implementar com teste antes do código, revisão por tarefa                                                                                                    | `local`: `**Status:**` de cada tarefa                         | [queue.md](references/execution/queue.md) · [tdd.md](references/execution/tdd.md) |
| **Validation**           | build + lint + testes + cobertura                                                                                                                            | `qa-report.md`                                                | [validation.md](references/execution/validation.md)                               |
| **Bugs abertos**         | cada bug aberto do Work Item vira fix task; reteste e `resolved` são da QA                                                                                   | `tasks/` (uma por lote)                                       | [validation.md](references/execution/validation.md)                               |

> **No `productdock`, a coluna do Kanban avança automaticamente (forward-only):** a mudança de fase move
> a coluna e define o responsável — `specify`→Refino Técnico, `implement`→Desenvolvimento. Nunca regride
> uma posição movida manualmente; o handoff de QA (→ `review`) é sempre **manual**.

> **Fluxo curto para melhoria pequena.** O agente **sugere**; quem decide é o humano. No `productdock` é
> o **Fluxo Rápido** (PROD-144), por Work Item, validado pelo servidor; no `local`, a `entrada: plano` no
> lugar da descoberta. Confirmado, a skill grava; recusado, segue a entrada padrão e não insiste.

## Os tipos de gate

**Gate de decisão** — o agente encerra o turno e espera: sugestão do fluxo curto · gate da descoberta
(`local`) · gate do PM (`owner: pm`, `productdock`) · Tech Review e handoff · perguntas do plano ·
fatiamento · fix tasks dos bugs abertos · **a execução da fila** · início da corrida (até onde ir) · árvore
suja no preflight.

> **A página e o inline.** No `productdock`, a página é preferida e o inline no CLI é o fallback. No
> `local`, a página é obrigatória nos gates de review técnico; inline só quando o humano pede
> explicitamente nesta conversa ("responde no chat", "sem página"). Nos dois, o gate nunca se pula e
> nenhum `Default` se aplica em silêncio. Aprovar a fila e autorizar a execução acontecem no chat.

> **Aprovar a fila não autoriza escrever código.** Escrita e auditada a fila, a skill imprime o bloco de
> finalização (_"nada foi executado · nada foi commitado"_) e **para**. A corrida começa num pedido do
> humano — e a autorização vale se vier explícita, inclusive junto da aprovação ("aprovado, pode
> executar"). É o gate que marca a troca de natureza do trabalho: da pasta do Work Item para o
> repositório.

**Oferta** — o agente propõe e segue sem travar: `git add -N` só dos arquivos que a tarefa criou
(recusável) · no `local`, o commit dos artefatos do Work Item ao fechar uma fase.

**Parada** — não é "posso continuar?", é "não dá para continuar": agents faltando · `productdock` sem
sessão da CLI · Work Item sem PRD na entrada com PRD (`productdock`) ou PRD ilegível (`local`) · Node ou
porta faltando num gate de review técnico (`local`) · `tasks/` que já existe (salvo com bugs abertos) ·
subagent que parou · auditoria com veredito _"a fila não serve"_.

## Cerimônia proporcional à fila

O que escala com o tamanho da fila se apaga quando a fila é de uma tarefa — não por atalho, mas porque
não há objeto a conferir:

|                     | com PRD (ou descoberta) | sem PRD, fila ≥ 2                        | sem PRD, fila de 1                            |
| ------------------- | ----------------------- | ---------------------------------------- | --------------------------------------------- |
| gates antes da fila, no `productdock` | 2–3 (antecipado, havendo item · handoff · fatiamento) | 1 (perguntas a ratificar + plano + fila) | **1** (perguntas a ratificar + plano + fila)  |
| gates antes da fila, no `local` | com PRD: 1–2 pela página (Tech Review, havendo item · handoff, havendo item) + 1 da fila; por descoberta: 2–3 pela página (descoberta · Tech Review · handoff) + 1 da fila | 0–1 pela página (perguntas do plano, havendo) + 1 (plano + fila) | 0–1 pela página + **1** (plano + fila) |
| gate da execução    | 1                       | 1                                        | 1 — pode vir junto da aprovação, se explícito |
| `pd-task-audit`     | sim                     | sim                                      | **não roda**                                  |

## Estrutura de artefatos

```
[RAIZ]/                         .productdock/ no productdock · .specs/ no local
├── project/PROJECT.md          backend + instruções do sistema + Topologia + Fontes de design (+ comandos e ambiente local)
└── work-items/[WI-ID]-[name]/
    ├── item.md                 local: a ficha — tipo, entrada, fase, Insumos, Gates
    ├── discovery.md            local: relatório do pd-discovery — só na entrada por descoberta
    ├── prd.md                  cópia fiel do PRD (no local, também colado ou gerado pela descoberta)
    ├── prd-review.md           local: parecer do PRD Tech Review + respostas, por rodada
    ├── spec.md                 a costura, entrada com PRD
    ├── plan.md                 a costura, entrada sem PRD
    ├── tasks/<nn>-<slug>.md    uma tarefa por arquivo (no local, com **Status:** no topo)
    ├── waves.md                local: o plano de ondas
    ├── qa-report.md            relatório da Validation
    └── qa/                     da pd-qa-validation
```

**`[WI-ID]`** — no `productdock`, o prefixo do projeto (`PROD-58`); no `local`, o que o humano der (chave
de Jira `ACME-14`, issue `#123`) ou, sem ID, o próximo `WI-NN` sequencial. No `local`, a skill nunca lê nem
escreve `.specs/features/`, que pode ser de outra ferramenta.

`PROJECT.md` tem a linha `backend:` e duas seções que o lookup consome — **Topologia** (o ponteiro de onde
os repositórios se descobrem) e **Fontes de design** (onde o comportamento das telas está desenhado, com
`nenhuma` como resposta legítima). Ver [project.md](references/setup/project.md).

Duas seções **opcionais**, por repositório, servem à corrida da fila: **Comandos de verificação** (o que o
arquivo de instruções não declara e o humano confirmou: conferir tipos, rodar um arquivo de teste,
verificação mínima) e **Ambiente local** (o banco ou serviço local em que o que só a execução prova roda
de verdade). O preflight da corrida completa as duas quando fazem falta: sugere os comandos a partir do
que o repositório expõe e só grava o que o humano confirmar, e pede que ele suba o ambiente local, que a
skill nunca sobe. No mesmo preflight a skill captura o **baseline de tipos**: cada tarefa roda os testes
por fatia e confere tipos **uma vez, no fim**, contra esse baseline, e não duas vezes contra zero.

**O contexto da tarefa é o custo dela.** O `pd-impl-task` grava a saída de teste e de tipos num arquivo
fora do repositório e lê dela só as falhas e o resumo, lê código por trecho e restaura o check de mutação
por cópia, nunca pelo Git.

**Fonte de design.** Com PRD, a skill lê os links da seção "Expectativas de UI/UX" do PRD — só ela conta
como link do PRD — e os links do Work Item: no `productdock`, os protótipos cadastrados na aba Refinamento,
lidos **sempre** e reconciliados com os do PRD pela URL (o link do PRD que saiu do cadastro vira pergunta
antes dos lookups); no `local`, os links de design que o humano informou em `item.md` › Insumos. As fontes
`fixo` do `PROJECT.md` seguem valendo junto. Sem PRD, os links do Work Item. A skill dispara um
`pd-design-lookup` por fonte. Sem fonte nenhuma e com escopo que toca tela, pergunta ao humano como
prosseguir — inclusive sob `nenhuma`; sem tela, segue sem design lookup. Ferramenta fora de `figma`,
`claude_design` e `link` é pergunta ao humano, e a mecânica respondida vai para o `PROJECT.md`.

**Insumos do Work Item.** Nas entradas a skill lê **sempre** os insumos — no `productdock`, os anexos da
aba Anexos; no `local`, os arquivos e URLs que o humano listou —: com PRD, antes do lookup; sem PRD, antes
de numerar os comportamentos. São insumo de escopo — o que dizem vai ao `escopo` do `pd-code-lookup` —, e
imagem **não** é fonte de design. O que se baixa fica na **pasta temporária**, fora do repositório, nunca
na pasta do Work Item; por isso a costura registra, no bloco **Anexos consultados**, o que se tirou de cada
insumo — ou `nada`, com o porquê. Lista vazia é sucesso.

## Retomada entre sessões

**Uma tabela de retomada, em sinais**, no preflight do [`SKILL.md`](SKILL.md): de onde vem cada sinal é do
backend — no `local`, o `item.md` e as linhas `**Status:**` ([local.md](references/setup/local.md#sinais-da-retomada));
no `productdock`, o estado de fase da plataforma ([pd-sync/workflow.md](references/pd-sync/workflow.md#sinais-da-retomada)).

**Antes da costura:** no `productdock`, sessão perdida recomeça o Work Item — os gates aprovados estão na
plataforma; no `local`, retoma pela `fase:` do `item.md`, e gate já registrado na tabela **Gates** não se
reabre. **Depois da costura**, retoma no fatiamento lendo o `spec.md` ou o `plan.md`, sem refazer lookup
nem reabrir handoff.

**Subagent interrompido não se retoma.** Limite de uso ou erro de API no meio de uma tarefa deixam a
tarefa `in-progress` e a corrida parada, à espera do humano. Mandando seguir, a tarefa recomeça com um
`pd-impl-task` novo, que parte do que ficou na árvore (`retomada: sim`) — retomar a conversa fria relê o
contexto inteiro a preço de escrita de cache. Pelo mesmo motivo, a correção pedida pela revisão vai a um
subagent novo quando a sessão parou entre a implementação e o veredito, e a Validation recomenda rodar a
`pd-qa-validation` numa sessão nova.

**Retomada com bugs abertos.** A skill lê os bugs abertos do Work Item **antes** da tabela do preflight,
lista `BUG-N`, título e severidade, e leva os bugs sem fix task ao fim de `tasks/`, agrupados em lotes por
tela ou componente — mesmo com a fila escrita ou o `qa-report.md` PASS em disco, e sempre atrás do gate
da execução. A skill **não** marca o bug como `resolved`: o reteste é da QA.

## Uso

```
"Iniciar work item PROD-58"                                      (productdock)
"Iniciar work item ACME-14 a partir de docs/prd-exportacao.md"   (local, entrada com PRD)
"Novo work item: exportar relatório de pedidos em CSV"          (local, feature sem PRD ⇒ descoberta)
"Bug: o filtro de data ignora o fuso"                            (entrada sem PRD ⇒ plano)
"Levantar impacto"                                               (dispara os lookups)
"Fatiar em tarefas"
"Aprovado, pode executar"  /  "Implemente a tarefa 03"
"Validar"
"Corrigir os bugs abertos do PROD-58"
"Retomar trabalho"
"Responde no chat, sem página"                                   (local: único jeito de levar o gate inline)
```

## Compatibilidade

- **IDEs:** VS Code (Copilot), Cursor, Claude Code.
- **Backend `productdock`:** a CLI é obrigatória, com `productdock login` já executado, e é a mesma em
  todas as IDEs. O MCP é opcional e **não** a substitui.
- **Backend `local`:** nenhum serviço externo; Node ≥ 18 é obrigatório para a página dos gates de review
  técnico.
- **Agents:** instalados pela CLI (`productdock agent install`) ou pelo `ai-tools` (Claude Code:
  `.claude/agents/`; Copilot: `.github/agents/`).
- **Git:** o agente **não versiona por iniciativa própria**. Nenhum `commit`, `branch` nem `push` sem o
  humano pedir ou confirmar. Exceção nomeada: `git add -N -- <os arquivos que a tarefa criou>`, que não
  commita e é o que dá recorte ao `git diff` para a revisão adversarial — nunca `git add -N .`, que em
  árvore compartilhada registra arquivo de outra sessão ou de outra tarefa.
- **QA:** a `pd-qa-validation` é a skill irmã, e lê a pasta do Work Item do disco. No `productdock`, a
  automação E2E do eng. de QA é a `pd-workflow-qa`.
