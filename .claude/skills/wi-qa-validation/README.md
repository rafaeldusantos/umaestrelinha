# wi-qa-validation — QA real-user do Work Item

O último passo do desenvolvimento, nas mãos do Dev: depois da Validation do `wi-workflow`, confere no
ambiente local se um usuário real consegue usar a feature. Conduz o QA do Work Item como esse usuário
usaria: planeja personas, jornadas, charters e casos de teste; executa cada charter no browser real;
retesta os bugs abertos; tria os achados por impacto ao usuário; e registra plano, resultado e bugs em
`qa/`, dentro do Work Item. Uma skill, quatro agents, quatro fases. Tudo local, tudo em disco.

> **Versão:** 4.0.0 · **Licença:** UNLICENSED · **Autor:** Softdesign
> `qa-report` e `qa-execution` de Pedro Nauck.
> A fonte de verdade de comportamento é o [`SKILL.md`](SKILL.md).

Sucessora da `pd-qa-validation` (3.2.0); esta registra só em disco. Os
envelopes `qa-plan/v1`, `qa-result/v1` e `qa-issue/v1` ficam como contrato de QA local
([artefatos.md](references/setup/artefatos.md)).

## O que caracteriza esta skill

|                  |                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quem e onde**  | o **Dev**, no ambiente **local**, com a Validation PASS — automação E2E e ambiente deployed estão fora desta skill                            |
| **Entrada**      | um Work Item da `wi-workflow` em `.specs/work-items/<WI-ID>-<slug>/` — `item.md`, PRD ou costura (`spec.md`/`plan.md`), fontes de design, insumos e bugs abertos, lidos do disco |
| **Régua**        | o usuário real: bug é o que atrapalha uma persona numa jornada, e a severidade sai do impacto nela                                            |
| **Orquestração** | a thread principal lê o disco, abre os gates, fala com o humano e registra; cada fase pesada roda num subagent                                |
| **Estado**       | o que está em `[ITEM_DIR]/qa/` — o cabeçalho de Gate 1 e Gate 3, o `status` dos bugs — e as linhas QA da tabela Gates do `item.md`             |
| **Perguntas**    | as 🔴 do plano e as perguntas ao produto pela página de perguntas da `wi-workflow` (Node ≥ 18); sem página, o gate das perguntas bloqueia      |
| **Browser**      | Playwright MCP headless (`--headless --isolated`), com `playwright-cli` como fallback; uma sessão por vez                                      |
| **Registro**     | nada vale sem o humano ver: o `qa-plan` depois do Gate 1; o `qa-result`, os bugs novos e as transições de `status` depois do Gate 3           |
| **Língua comum** | IDs, personas e contas, bugs, severidade, status e a árvore `qa/` do [contrato de QA](references/shared/contrato-qa.md)                       |
| **Git**          | **o agente não versiona por iniciativa própria**                                                                                              |

## Como usar

**Planejar** — quando o Work Item tem PRD ou costura, mesmo antes de o Dev fechar:

```
/wi-qa-validation planejar o QA do ACME-14
```

**Executar** — depois da Validation (`qa-report.md` PASS), sobre o plano aprovado, com o app no local:

```
/wi-qa-validation executar o QA do ACME-14 em http://localhost:3000
```

**Retestar** — depois que o Dev corrigiu os bugs abertos em `qa/issues/`:

```
/wi-qa-validation retestar os bugs do ACME-14
```

Sem modo, a skill olha o que já está em disco e retoma de onde a rodada parou.

**Rodadas que convergem.** A primeira rodada explora; as seguintes **confirmam** — reteste, os TC que
falharam e o entorno das correções, sem exploração nem pergunta nova. O QA testa a mudança, não redefine o
produto: pergunta ao produto só sobre o que o Work Item muda (no máximo 3 por rodada); o resto vira
**sugestão de backlog**, para um Work Item novo, nunca fix task deste.

## Fluxo

```
PREFLIGHT  sondas · Work Item · [QA_DIR] · o que está em disco
FASE 0     Contexto   thread          item.md · PRD · costura · fontes de design · insumos · bugs abertos · qa-report.md
FASE 1     Plano      wi-qa-planner   personas · jornadas · charters · TC-* · suíte   → perguntas 🔴 (página) → Gate 1
FASE 2     Execução   wi-qa-explorer  × charter, em sequência · wi-qa-retester         → Gate 2
FASE 3     Triagem    wi-qa-triager   BUG-*.md novos · qa-result.md · transições       → Gate 3 → status dos bugs
           perguntas ao produto (página) → decisoes-produto.md, com o destino (WI novo é o padrão)
RODADA 2+  Confirmação  retester + charters com TC fail/blocked, metade do orçamento
```

| Etapa     | O que faz                                                          | Saída                                    | Referência                                        |
| --------- | ------------------------------------------------------------------ | ---------------------------------------- | ------------------------------------------------- |
| Artefatos | envelopes, onde cada arquivo mora, quem escreve, `status` dos bugs | —                                        | [artefatos.md](references/setup/artefatos.md)     |
| Workspace | resolver Work Item e `[QA_DIR]`, decidir de onde a rodada começa   | —                                        | [workspace.md](references/setup/workspace.md)     |
| Gates     | gate técnico, Gates 1–3, página de perguntas, anúncio entre fases  | —                                        | [gates.md](references/setup/gates.md)             |
| Fase 0    | ler o Work Item do disco e localizar a costura e a Validation      | a lista `fontes` dos briefings           | [context.md](references/context/context.md)       |
| Fase 1    | planejar o QA                                                      | `test-plans/`, `test-cases/`             | [plan.md](references/plan/plan.md)                |
| Fase 2    | executar os charters e retestar                                    | `sessions/`, `retest.md`, `screenshots/` | [execution.md](references/execution/execution.md) |
| Fase 3    | triar e registrar                                                  | `issues/BUG-NNN.md`, `qa-result.md`      | [triage.md](references/triage/triage.md)          |

## Os agents

| Agent            | Fase | O que faz                                                                                     |
| ---------------- | ---- | --------------------------------------------------------------------------------------------- |
| `wi-qa-planner`  | 1    | escreve o plano e os casos a partir do Work Item em disco                                     |
| `wi-qa-explorer` | 2    | conduz a sessão exploratória de um charter no browser, como a persona                         |
| `wi-qa-retester` | 2    | reproduz os bugs abertos e decide o veredito: `resolved` · `still-open` · `cannot-reproduce` |
| `wi-qa-triager`  | 3    | deduplica, aplica severidade, numera, escreve os bugs novos e o resultado, propõe transições  |

Nenhum agent grava o `status` de bug existente: quem grava é a thread principal, no Gate 3.

Instalação: copie `agents/wi-qa-*.md` deste pacote para `~/.claude/agents/` (ou `.claude/agents/` no
projeto; no Copilot, `.github/agents/`). Instalar a skill não instala os agents.

## Organização dos arquivos

O arquivo com o nome da fase (`context.md`, `plan.md`, `execution.md`, `triage.md`) é o procedimento da
thread principal: briefing, gate e o que fazer com o relatório. Os demais arquivos da pasta são o
conhecimento que o agent daquela fase lê, passado no campo `referências`. `templates/` espelha as fases.

```
references/
  shared/     contrato-qa.md   (a língua comum com uma automação E2E)
  setup/      artefatos.md · workspace.md · gates.md
  context/    context.md
  plan/       plan.md · personas.md · journeys.md · test-cases.md · regression.md
  execution/  execution.md · charters.md · tours.md · edge-cases.md · cfr.md · design-check.md · browser.md
  triage/     triage.md · severity.md · bug-writing.md · checklist.md
templates/
  plan/       test-plan.md · personas.md · journey.md · charter.md · test-case.md · regression-suite.md
  execution/  session-log.md · retest.md
  triage/     bug.md · qa-result.md
```

## Relação com as outras skills

```
wi-workflow (Validation PASS) ──► wi-qa-validation (Dev, local) ──► desenvolvimento fechado
        ▲                                │  plano · personas · bugs em qa/
        └──────── fix tasks ◄────────────┴── bugs abertos (open · still-open) em qa/issues/
```

- **`wi-workflow`** — vem antes e é dono do `[ITEM_DIR]`, do `item.md`, da costura e do `qa-report.md`. Os
  bugs abertos — desta skill e de uma automação E2E — voltam ao Dev por ele, como fix tasks; o reteste no
  local e o `resolved` voltam para cá. Decisão de produto não é fix task: só entra no Work Item com destino
  `escopo deste WI`, como mudança de escopo na costura. A página de perguntas é dele.
- **Automação E2E** — fora desta skill e opcional; quando houver uma skill de E2E instalada, ela lê `qa/`
  pelo contrato de QA: deriva os cenários dos `TC-*` com `e2e`, usa as personas e contas do plano, marca
  `existing` nos casos que automatizou e escreve os bugs dela em `qa/issues/`, na mesma numeração.
