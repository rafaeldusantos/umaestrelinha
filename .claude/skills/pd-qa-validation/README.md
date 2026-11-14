# pd-qa-validation — QA real-user do Work Item

A validação real-user do Dev, ainda na etapa de desenvolvimento: depois da Validation da `pd-workflow`
(build, lint, testes) e antes de o trabalho ir para o QA, confere no ambiente local se um usuário real
consegue usar a feature. Funciona **com e sem ProductDock**. Conduz o QA do Work Item como esse usuário
usaria: planeja personas, jornadas, charters e casos de teste; executa cada charter no browser real; retesta
os bugs abertos; tria os achados por impacto ao usuário; e registra plano, resultado e bugs. Uma skill,
quatro agents, quatro fases.

> **Versão:** 4.0.0 · **Licença:** UNLICENSED · **Autor:** Softdesign
> `qa-report` e `qa-execution` de Pedro Nauck.
> A fonte de verdade de comportamento é o [`SKILL.md`](SKILL.md).

Sucessora de `pd-qa-report` e `pd-qa-execution` (2.0.1), que planejavam e executavam em paralelo, sem
trocar artefatos. Os envelopes `qa-plan/v1`, `qa-result/v1` e `qa-issue/v1` não mudaram.

## O que caracteriza esta skill

|                  |                                                                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Quem e onde**  | o **Dev**, no ambiente **local**, com a Validation PASS — o deployed é da automação E2E (com ProductDock, `pd-workflow-qa`, do eng. de QA)    |
| **Backend**      | detectado no início da sessão: `productdock` (a plataforma, pela CLI `productdock`, obrigatória — sem MCP como plano B) ou `local` (só o disco, em `.specs/`) |
| **Entrada**      | um Work Item — PRD ou costura (`spec.md`/`plan.md`), fontes de design, insumos e bugs abertos, lidos do backend                               |
| **Régua**        | o usuário real: bug é o que atrapalha uma persona numa jornada, e a severidade sai do impacto nela                                            |
| **Orquestração** | a thread principal lê o Work Item, abre os gates, fala com o humano e registra; cada fase pesada roda num subagent                            |
| **Estado**       | o que está em `[ITEM_DIR]/qa/` e o estado dos gates no backend (plataforma, ou cabeçalho do artefato no `local`) — sem arquivo de estado à parte |
| **Browser**      | `agent-browser` 0.39+ (headless, snapshot só do que é interativo, um browser por charter), com `playwright-cli` e o Playwright MCP como fallback; charters em lotes paralelos por conta |
| **Registro**     | nada vale sem o humano ver: o `qa-plan` depois do Gate 1; `qa-result`, bugs e transições depois do Gate 3. No `productdock`, registrar é publicar na aba Qualidade |
| **Perguntas**    | no formato `Q-NN`/`P-NN`: no `productdock`, numa mensagem no chat; no `local`, pela página de perguntas da `pd-workflow`                        |
| **Língua comum** | IDs, personas e contas, bugs, severidade e a árvore `qa/` do [contrato de QA](references/shared/contrato-qa.md), igual no `pd-workflow-qa`    |
| **Git**          | **o agente não versiona por iniciativa própria**                                                                                              |

## Como usar

**Planejar** — quando o Work Item tem PRD ou costura, mesmo antes de o Dev fechar:

```
/pd-qa-validation planejar o QA do PROD-58
```

**Executar** — depois da Validation (`qa-report.md` PASS), sobre o plano aprovado, com o app no local:

```
/pd-qa-validation executar o QA do PROD-58 em http://localhost:3000
```

**Retestar** — depois que o Dev corrigiu os bugs abertos:

```
/pd-qa-validation retestar os bugs do PROD-58
```

Sem modo, a skill olha o que já está em disco e retoma de onde a rodada parou.

**Rodadas que convergem.** A primeira rodada explora; as seguintes **confirmam** — reteste, os TC que
falharam e o entorno das correções, sem exploração nem pergunta nova. O QA testa a mudança, não redefine o
produto: pergunta ao produto só sobre o que o Work Item muda (no máximo 3 por rodada); o resto vira
**sugestão de backlog**, para um Work Item novo, nunca fix task deste.

## Fluxo

```
PREFLIGHT  backend · sondas · Work Item · [QA_DIR] · estado dos gates · o que está em disco
FASE 0     Contexto   thread          PRD · costura · fontes de design · insumos · bugs abertos · qa-report.md
FASE 1     Plano      pd-qa-planner   personas · jornadas · charters · TC-* · suíte   → Gate 1 → qa-plan registrado
FASE 2     Execução   pd-qa-explorer  × charter, em lotes por conta · pd-qa-retester   → Gate 2
FASE 3     Triagem    pd-qa-triager   BUG-*.md novos · qa-result.md · transições       → Gate 3 → resultado e bugs registrados
           respostas às perguntas ao produto → decisoes-produto.md, com o destino (WI novo é o padrão)
RODADA 2+  Confirmação  retester + charters com TC fail/blocked, metade do orçamento
```

| Etapa     | O que faz                                                        | Saída                                    | Referência                                        |
| --------- | ---------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- |
| Backend   | detecção, raízes, operações e o que cada backend habilita       | —                                        | [backend.md](references/setup/backend.md)         |
| Local     | quem escreve cada arquivo, cabeçalhos de gate, conferir o gravado | —                                      | [local.md](references/setup/local.md)             |
| ProductDock | sonda e bootstrap da CLI, comandos, envio, evidência           | —                                        | [sync.md](references/pd-sync/sync.md) · [qa.md](references/pd-sync/qa.md) |
| Workspace | resolver Work Item e `[QA_DIR]`, envelopes, status dos bugs, retomada | —                                   | [workspace.md](references/setup/workspace.md)     |
| Gates     | gate técnico, Gates 1–3, perguntas, anúncio entre fases          | —                                        | [gates.md](references/setup/gates.md)             |
| Fase 0    | ler o Work Item e localizar a costura e a Validation             | lista `fontes`; bugs abertos em `issues/` | [context.md](references/context/context.md)      |
| Fase 1    | planejar o QA                                                    | `test-plans/`, `test-cases/`             | [plan.md](references/plan/plan.md)                |
| Fase 2    | executar os charters e retestar                                  | `sessions/`, `retest.md`, `screenshots/` | [execution.md](references/execution/execution.md) |
| Fase 3    | triar e registrar                                                | `issues/BUG-NNN.md`, `qa-result.md`      | [triage.md](references/triage/triage.md)          |

## Os agents

| Agent            | Fase | O que faz                                                                        |
| ---------------- | ---- | -------------------------------------------------------------------------------- |
| `pd-qa-planner`  | 1    | escreve o plano e os casos a partir do Work Item em disco                        |
| `pd-qa-explorer` | 2    | conduz a sessão exploratória de um charter no browser, como a persona            |
| `pd-qa-retester` | 2    | reproduz os bugs abertos e decide `resolved` · `still-open` · `cannot-reproduce` · `blocked` |
| `pd-qa-triager`  | 3    | deduplica, aplica severidade, numera, escreve os bugs novos e o resultado da rodada e propõe as transições |

Nenhum agent fala com a plataforma nem muda o status de bug existente: as operações de backend e as
gravações do Gate 3 são da thread principal.

Os quatro começam sem os `CLAUDE.md` do projeto (`omitClaudeMd`): o que o explorer e o retester precisam
do projeto chega pelo campo `ambiente` do briefing, que o planner escreve a partir das instruções do
projeto. O explorer e o retester herdam as tools da sessão — o MCP de design tem o nome que cada time deu —,
menos as que nunca usam (`disallowedTools`).

```bash
npx @softdesignbrasil/ai-tools install agents --platform claude   # todos de uma vez
productdock agent install <nome>                                  # com ProductDock, um por agent
```

## Organização dos arquivos

O arquivo com o nome da fase (`context.md`, `plan.md`, `execution.md`, `triage.md`) é o procedimento da
thread principal: briefing, gate e o que fazer com o relatório. Os demais arquivos da pasta são o
conhecimento que o agent daquela fase lê, passado no campo `referências`. `pd-sync/` só é lido quando o
backend é `productdock`. `templates/` espelha as fases.

```
references/
  shared/     contrato-qa.md   (cópia idêntica no pd-workflow-qa e no workflow-qa-e2e)
  setup/      backend.md · local.md · workspace.md · gates.md
  pd-sync/    sync.md · qa.md
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
pd-workflow (Validation PASS) ──► pd-qa-validation (Dev, local) ──► QA ──► automação E2E (pd-workflow-qa, deployed)
        ▲                                │  plano · personas · bugs                     │ automação · BUG-NNN
        └──────── fix tasks ◄────────────┴────────────── bugs abertos ◄────────────────┘
```

- **`pd-workflow`** — vem antes e é dona do `[ITEM_DIR]`, da costura e do `qa-report.md` (no `local`,
  também do `item.md` e da página de perguntas). Os bugs abertos — desta skill e do E2E — voltam ao Dev por
  ela, como fix tasks; o reteste no local e o `resolved` voltam para cá. Decisão de produto não é fix task: só
  entra no Work Item com destino `escopo deste WI`, como mudança de escopo na costura.
- **`pd-workflow-qa`** — vem depois, com o eng. de QA, quando há ProductDock. Deriva os cenários dos `TC-*`
  com `e2e`, usa as personas e contas do plano, marca `existing` nos casos que automatizou e escreve os bugs
  do deployed em `qa/issues/`, na mesma numeração. O `qa-e2e-report.md` dele alimenta o gate `e2e` do
  `qa-result`. Sem automação E2E, o gate `e2e` vai `skip`.
