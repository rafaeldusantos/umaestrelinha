# wi-workflow — Work Item por costura, 100% local

Conduz um Work Item do insumo à Validation, inteiro no repositório: uma skill, seis agents, **uma
pipeline com três entradas**. O que muda entre um Work Item com PRD, um que nasce de uma descoberta e um
que vai direto ao plano é o que alimenta a costura — daí em diante o caminho é o mesmo.

> **Versão:** 4.0.0 · **Licença:** CC-BY-4.0 · base conceitual em CC-BY-4.0 por github.com/felipfr.
> Derivada da pd-workflow do ProductDock, agora sem dependência de serviço externo: o estado mora em
> `.specs/`, a mesma raiz da `tlc-spec-driven`. A fonte de verdade de comportamento é o
> [`SKILL.md`](SKILL.md).

## O que caracteriza esta skill

|                   |                                                                                                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Estado**        | em disco, e só três coisas: o `item.md` (tipo, entrada, fase, gates), a costura e a linha `**Status:**` de cada tarefa. Nada de `STATE.md`, nada de índice da fila                                                   |
| **Entradas**      | **PRD** (arquivo, caminho, URL ou texto colado — salvo fiel como `prd.md`) · **descoberta** (`wi-discovery` escreve o rascunho do PRD) · **plano** (bug, incident, dívida, improvement pequeno)                      |
| **Levantamento**  | `wi-design-lookup` por fonte + `wi-code-lookup` por repositório, em paralelo. A fonte de design: os links do `item.md` › Insumos, a seção "Expectativas de UI/UX" do `prd.md` e as fontes `fixo` do `PROJECT.md`     |
| **Conferência**   | três na thread principal: fronteira · cobertura · o que os lookups não resolveram                                                                                                                                     |
| **Review técnico**| **só pela página web** (`templates/handoff-ui/`). Sem Node ≥ 18 ou sem porta, o gate **bloqueia**; inline no chat só a pedido explícito do humano                                                                     |
| **Costura**       | `spec.md` (com PRD) ou `plan.md` (sem PRD) — registro datado                                                                                                                                                           |
| **Tarefa**        | uma tela (ou agregado), caminho completo de ponta a ponta — nunca quebrada por camada                                                                                                                                 |
| **Auditoria**     | `wi-task-audit`, adversarial, independente do contexto que escreveu a fila                                                                                                                                            |
| **Implementação** | `wi-impl-task` por tarefa + `wi-impl-review` sobre o diff                                                                                                                                                              |
| **Git**           | **o agente não versiona por iniciativa própria** — só a pedido ou com confirmação                                                                                                                                     |

## Instalação

```bash
# a skill (a pasta inteira, templates/handoff-ui/ incluída)
cp -R skills/wi-workflow ~/.claude/skills/

# os agents do catálogo
cp agents/wi-*.md ~/.claude/agents/
```

Por projeto, em vez de por máquina: `.claude/skills/` e `.claude/agents/` na raiz do repositório
(Copilot: `.github/skills/` e `.github/agents/`).

> ⚠️ **A skill não traz os agents.** Copiar a pasta da skill não instala os agents; eles são arquivos
> separados. Sem eles, a skill bloqueia — de propósito: fazer a descoberta, o lookup e a auditoria na
> thread principal estoura o contexto e destrói a independência da auditoria.

## Pré-requisitos

**1. Os seis agents do catálogo**, em `~/.claude/agents/` ou `.claude/agents/` (Copilot:
`.github/agents/`):

`wi-discovery` · `wi-design-lookup` · `wi-code-lookup` · `wi-task-audit` · `wi-impl-task` · `wi-impl-review`

Faltando algum, a sonda bloqueia e diz: _"copie `agents/wi-*.md` deste pacote para `~/.claude/agents/`"_.

**2. Node ≥ 18 e a pasta `templates/handoff-ui/`** — para a **página de perguntas**, que é obrigatória
nos gates de review técnico. Faltando um dos dois, ou sem porta livre na faixa (8477–8484 por padrão),
o gate **bloqueia**: a skill diz como resolver (instalar Node ≥ 18, liberar a faixa de portas, rodar de
novo) e para. Não cai para o chat sozinha.

**3. Opcional — `.specs/project/PROJECT.md`.** Se a `tlc-spec-driven` já o criou, a skill **não o
sobrescreve**: acrescenta, com o humano, as seções **Topologia** e **Fontes de design** que faltarem. Ver
[project.md](references/setup/project.md).

## Fluxo

```
SONDAS (agents · Node + handoff-ui) → ITEM.MD (lê ou cria) → BUGS ABERTOS (qa/issues/BUG-*.md) → PREFLIGHT DE DISCO
       → roteia pelo pedido e pelo que existe em disco → grava `tipo` e `entrada` no item.md

  entrada: descoberta → (feature sem PRD nem documento de requisito)
    wi-discovery → discovery.md + rascunho de prd.md → ⛔ GATE DA DESCOBERTA (web) → segue como "prd"

  entrada: prd → (PRD ou documento de requisito; colado é salvo como prd.md)
    prd.md → PRD TECH REVIEW (cada achado com `owner`: negocio · tech · tech_prd_edit · none)
           → ⛔ GATE DO PRD TECH REVIEW (web) → respostas aplicadas ao prd.md / Decisões → prd-review.md
    → INSUMOS (item.md › Insumos, sempre; insumo de escopo, não fonte de design)
    → FONTE DE DESIGN (Insumos + UI/UX do prd.md + fontes `fixo`; sem fonte + tela ⇒ pergunta)
    → DESIGN LOOKUP + CODE LOOKUP → 3 CONFERÊNCIAS
    → ⛔ HANDOFF (web) → COSTURA (spec.md)

  entrada: plano → (bug · incident · technical_debt · improvement pequeno aceito sem PRD)
    INSUMOS → comportamentos C-01, C-02… → FONTE DE DESIGN (vazio + tela ⇒ pergunta)
    → DESIGN LOOKUP (só com fonte) + CODE LOOKUP → COBERTURA
    → COSTURA (plan.md) → ⛔ PERGUNTAS DO PLANO (web, só se houver)

  todas → ⛔ FATIAMENTO (chat) → tasks/ → AUDITORIA → ⛔ GATE DA EXECUÇÃO (chat)
        → CORRIDA DA FILA → VALIDATION

Validation PASS → oferece a wi-qa-validation; fase: done
Bug aberto em qa/issues/ → fix task ao fim de tasks/ → ⛔ GATE DA EXECUÇÃO → corrida → reteste da QA
```

| Etapa                    | Goal                                                                                                         | Artefato                                     | Referência                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------------- |
| **Estado local**         | o `item.md`, o status das tarefas e os bugs abertos — o que substitui qualquer painel                        | `item.md`                                    | [estado.md](references/setup/estado.md)                                           |
| **Descoberta**           | código + conhecimento do domínio viram diagnóstico, rascunho de PRD, premissas e perguntas                   | `discovery.md` + `prd.md` (rascunho)         | [SKILL.md](SKILL.md) · agent `wi-discovery`                                       |
| **PRD Tech Review**      | parecer técnico retriado pela natureza da decisão; respostas da página vão ao `prd.md` ou às **Decisões**     | `prd-review.md` (+ edição do `prd.md`)       | [prd-review.md](references/discovery/prd-review.md)                               |
| **Lookup**               | o que o design mostra e o que o código já tem                                                                | —                                            | [lookup.md](references/discovery/lookup.md)                                       |
| **Análise de código**    | o levantamento que alimenta o plano, sem PRD                                                                 | —                                            | [code-analysis.md](references/discovery/code-analysis.md)                         |
| **Handoff**              | o que exige decisão do humano, pela página                                                                   | —                                            | [handoff.md](references/discovery/handoff.md)                                     |
| **Costura (com PRD)**    | o registro datado do que se descobriu e decidiu                                                              | `spec.md`                                    | [spec.md](references/seam/spec.md)                                                |
| **Costura (sem PRD)**    | o mesmo papel, alimentado só pelo código                                                                     | `plan.md`                                    | [plan.md](references/seam/plan.md)                                                |
| **Fatiamento**           | uma tarefa por tela, ordenada                                                                                | `tasks/`                                     | [tasks.md](references/planning/tasks.md) · [task.md](references/planning/task.md) |
| **Corrida da fila**      | implementar com teste antes do código, revisão por tarefa                                                    | `**Status:**` de cada tarefa                 | [queue.md](references/execution/queue.md) · [tdd.md](references/execution/tdd.md) |
| **Validation**           | build + lint + testes + cobertura                                                                            | `qa-report.md`                               | [validation.md](references/execution/validation.md)                               |
| **Bugs abertos**         | cada `qa/issues/BUG-*.md` com `status: open` vira fix task; reteste e `resolved` são da QA                    | `tasks/` (uma por lote)                      | [validation.md](references/execution/validation.md)                               |

> **Sugestão de plano para improvement.** Improvement sem PRD cujo escopo cabe em poucas telas ou
> arquivos: o agente pode **sugerir** `entrada: plano` em vez de `descoberta`, com a justificativa, e
> para. Confirmado, grava no `item.md`; recusado, segue a descoberta e não insiste. A troca inversa — o
> levantamento desmente a entrada sem PRD (contrato público, regra de negócio sem dono, decisão de produto
> aberta) — para antes do `plan.md`, mostra a evidência e pergunta.

## Os gates

**Gate de review técnico — pela página web, e só por ela.** O `handoff.json` + `server.cjs` de
`templates/handoff-ui/` abrem uma página local; o humano responde lá, e as respostas voltam como
`answers.json` na pasta temporária.

| Gate                       | Quando                                                       | O que leva                                                                |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **da descoberta**          | depois do `wi-discovery`                                     | premissas (ratificar) + perguntas                                         |
| **do PRD Tech Review**     | depois da retriagem do parecer, antes do lookup              | **todos** os findings que não são `none` — de negócio e técnicos          |
| **principal (handoff)**    | entre o lookup e a costura                                   | premissa falsa, divergência, nomenclatura, fronteira, UC órfão, incerteza |
| **das perguntas do plano** | entrada sem PRD, antes de apresentar plano + fila            | as perguntas a ratificar do `plan.md` (só se houver)                      |

> **Inline no chat só a pedido.** Sem Node, sem porta, timeout ou erro do servidor, o gate bloqueia e a
> skill diz como resolver. Os mesmos itens vão inline **só quando o humano pede explicitamente nesta
> conversa** ("responde no chat", "sem página"). Silêncio ou "pode seguir" não é pedido.

**Gate de decisão no chat** — o agente encerra o turno e espera: sugestão de `entrada: plano` ·
fatiamento · fix tasks dos bugs abertos · **a execução da fila** · início da corrida (até onde ir) ·
árvore suja no preflight.

> **Aprovar a fila não autoriza escrever código.** Escrita e auditada a fila, a skill imprime o bloco de
> finalização (_"nada foi executado · nada foi commitado"_) e **para**. A corrida começa num pedido do
> humano — e a autorização vale se vier explícita, inclusive junto da aprovação ("aprovado, pode
> executar"). É o gate que marca a troca de natureza do trabalho: da pasta do Work Item para o
> repositório.

Cada gate fechado ganha uma linha na tabela **Gates** do `item.md`.

**Oferta** — o agente propõe e segue sem travar: `git add -N` só dos arquivos que a tarefa criou
(recusável) · git commit dos artefatos ao fim da Validation.

**Parada** — não é "posso continuar?", é "não dá para continuar": agents faltando · Node ou porta
faltando num gate de review técnico · entrada com PRD sem PRD legível · `tasks/` que já existe (salvo com
bugs abertos em `qa/issues/`) · subagent que parou · auditoria com veredito _"a fila não serve"_.

## Cerimônia proporcional à fila

O que escala com o tamanho da fila se apaga quando a fila é de uma tarefa — não por atalho, mas porque
não há objeto a conferir:

|                     | com PRD (ou descoberta) | sem PRD, fila ≥ 2                        | sem PRD, fila de 1                            |
| ------------------- | ----------------------- | ---------------------------------------- | --------------------------------------------- |
| gates antes da fila | 2–4                     | 1 (perguntas a ratificar + plano + fila) | **1** (perguntas a ratificar + plano + fila)  |
| gate da execução    | 1                       | 1                                        | 1 — pode vir junto da aprovação, se explícito |
| `wi-task-audit`     | sim                     | sim                                      | **não roda**                                  |

## Estrutura de artefatos

```
.specs/
├── project/PROJECT.md          instruções do sistema + Topologia + Fontes de design (+ comandos e ambiente local)
└── work-items/<WI-ID>-<slug>/
    ├── item.md                 a ficha do Work Item: tipo, entrada, fase, Insumos, Gates
    ├── discovery.md            relatório do wi-discovery — só na entrada por descoberta
    ├── prd.md                  o PRD: cópia fiel, colado, ou gerado pela descoberta
    ├── prd-review.md           parecer do PRD Tech Review + respostas da página
    ├── spec.md                 a costura, entrada com PRD
    ├── plan.md                 a costura, entrada sem PRD
    ├── tasks/<nn>-<slug>.md    uma tarefa por arquivo, com **Status:** pending | in-progress | done no topo
    ├── qa-report.md            relatório da Validation
    └── qa/                     da wi-qa-validation
```

**`<WI-ID>`** é o que o humano der (chave de Jira `ACME-14`, issue `#123`); sem ID, a skill gera o
próximo sequencial `WI-NN` olhando `.specs/work-items/`. O slug sai do título, em kebab-case:
`.specs/work-items/WI-03-exportar-relatorio/`. A `wi-workflow` nunca lê nem escreve `.specs/features/`
— é da `tlc-spec-driven`.

**`item.md`** nasce no primeiro turno, depois do roteamento, e é a fonte de verdade de `tipo`,
`entrada` e `fase`. Cada mudança de fase é uma edição da linha `fase:`; cada gate fechado, uma linha na
tabela **Gates**. Ver [estado.md](references/setup/estado.md).

`PROJECT.md` tem duas seções que o lookup consome — **Topologia** (o ponteiro de onde os repositórios se
descobrem) e **Fontes de design** (onde o comportamento das telas está desenhado, com `nenhuma` como
resposta legítima). Ver [project.md](references/setup/project.md).

Duas seções **opcionais**, por repositório, servem à corrida da fila: **Comandos de verificação** (o que o
arquivo de instruções não declara e o humano confirmou: conferir tipos, rodar um arquivo de teste,
verificação mínima) e **Ambiente local** (o banco ou serviço local em que o que só a execução prova roda
de verdade). O preflight da corrida completa as duas quando fazem falta: sugere os comandos a partir do
que o repositório expõe e só grava o que o humano confirmar, e pede que ele suba o ambiente local, que a
skill nunca sobe. No mesmo preflight a skill captura o **baseline de tipos**: cada tarefa roda os testes
por fatia e confere tipos **uma vez, no fim**, contra esse baseline, e não duas vezes contra zero.

**O contexto da tarefa é o custo dela.** O `wi-impl-task` grava a saída de teste e de tipos num arquivo
fora do repositório e lê dela só as falhas e o resumo, lê código por trecho e restaura o check de mutação
por cópia, nunca pelo Git.

**Fonte de design.** Os links de design que o humano informou (em `item.md` › Insumos), os da seção
"Expectativas de UI/UX" do `prd.md` e as fontes `fixo` do `PROJECT.md`. A skill dispara um
`wi-design-lookup` por fonte. Sem fonte nenhuma e com escopo que toca tela, pergunta ao humano como
prosseguir — inclusive sob `nenhuma`; sem tela, segue sem design lookup. Tipo de fonte fora de `figma`,
`claude_design` e `link` é pergunta ao humano, e a mecânica respondida vai para o `PROJECT.md`.

**Insumos.** Nas três entradas a skill lê **sempre** os arquivos e URLs que o humano listou no pedido e
os de `item.md` › Insumos — imagem, PDF, CSV, planilha —: antes do lookup, ou antes de numerar os
comportamentos. São insumo de escopo — o que dizem vai ao `escopo` do `wi-code-lookup` —, e imagem
anexada **não** é fonte de design. O que se baixa de URL fica na **pasta temporária**
(`<scratchpad>/wi/<WI-ID>/` no Claude Code; fora dele, o temporário do sistema), nunca na pasta do Work
Item; por isso a costura registra, no bloco **Anexos consultados**, o que se tirou de cada insumo — ou
`nada`, com o porquê. Sem insumo nenhum, segue sem reclamar.

## Retomada entre sessões

**O estado em disco é o `item.md`, a costura e o status das tarefas — nada mais.** Sessão perdida antes
da costura retoma pela `fase:` do `item.md` e pelo que existe na pasta (`discovery.md`, `prd-review.md`):
gate já registrado na tabela **Gates** não se reabre. Depois da costura, retoma no fatiamento lendo o
`spec.md` ou o `plan.md`, sem refazer lookup nem reabrir handoff. Com a fila escrita, a corrida retoma
pela primeira tarefa que não está `done`.

**Subagent interrompido não se retoma.** Limite de uso ou erro de API no meio de uma tarefa deixam a
tarefa `in-progress` e a corrida parada, à espera do humano. Mandando seguir, a tarefa recomeça com um
`wi-impl-task` novo, que parte do que ficou na árvore (`retomada: sim`) — retomar a conversa fria relê o
contexto inteiro a preço de escrita de cache. Pelo mesmo motivo, a correção pedida pela revisão vai a um
subagent novo quando a sessão parou entre a implementação e o veredito, e a Validation recomenda rodar a
`wi-qa-validation` numa sessão nova.

**Retomada com bugs abertos.** Os bugs são os `qa/issues/BUG-NNN.md` com `status: open` ou
`still-open`. Havendo algum, a skill os lista **antes** da tabela do preflight — `BUG-NNN`, título e
severidade — e leva os bugs sem fix task ao fim de `tasks/`, agrupados em lotes por tela ou componente,
mesmo com a fila escrita ou o `qa-report.md` PASS em disco, e sempre atrás do gate da execução. A skill
**não** marca o bug como `resolved`: o reteste é da QA (`wi-qa-validation`).

## Uso

```
"Iniciar work item ACME-14 a partir de docs/prd-exportacao.md"   (entrada com PRD)
"Novo work item: exportar relatório de pedidos em CSV"          (feature sem PRD ⇒ descoberta)
"Segue o PRD colado abaixo: …"                                   (salvo como prd.md)
"Bug: o filtro de data ignora o fuso"                            (entrada sem PRD ⇒ plano)
"Levantar impacto"                                               (dispara os lookups)
"Fatiar em tarefas"
"Aprovado, pode executar"  /  "Implemente a tarefa 03"
"Validar"
"Corrigir os bugs abertos do WI-03"
"Retomar trabalho"
"Responde no chat, sem página"                                   (único jeito de levar o gate inline)
```

## Compatibilidade

- **Claude Code:** skill em `~/.claude/skills/wi-workflow/` (ou `.claude/skills/`), agents em
  `~/.claude/agents/` (ou `.claude/agents/`).
- **Copilot (VS Code):** skill em `.github/skills/wi-workflow/`, agents em `.github/agents/`.
- **Node ≥ 18:** obrigatório para a página dos gates de review técnico.
- **Git:** o agente **não versiona por iniciativa própria**. Nenhum `commit`, `branch` nem `push` sem o
  humano pedir ou confirmar. Exceção nomeada: `git add -N -- <os arquivos que a tarefa criou>`, que não
  commita e é o que dá recorte ao `git diff` para a revisão adversarial — nunca `git add -N .`, que em
  árvore compartilhada registra arquivo de outra sessão ou de outra tarefa.
- **QA:** a `wi-qa-validation` é a skill irmã, e lê esta pasta do disco. Automação E2E fica fora desta
  skill; quando houver uma skill de E2E instalada, ela lê `qa/` pelo contrato de QA.
