# Workspace — Work Item, `[QA_DIR]` e retomada

Onde a rodada escreve, como ela sabe onde parou, e como os subagents acham as referências da skill.

---

## Resolver o Work Item e `[ITEM_DIR]`

Todo QA desta skill é de um Work Item. `[ITEM_DIR]` = `.specs/work-items/<WI-ID>-<slug>/`. A primeira que
valer decide:

1. **A chave na mensagem** (`ACME-14`, `#123`, `WI-03`) — vale ela
2. **Uma pasta só** em `.specs/work-items/` — vale ela; diga qual foi
3. **Uma só com `fase: validation` ou `fase: done`** no `item.md` — vale ela; diga qual foi
4. **Nenhuma, ou mais de uma** ⇒ pergunte a chave, recomendando a de `item.md` mais recente. Não escolha
   por conta

O match com a pasta é pelo prefixo `<WI-ID>-`, sem diferenciar maiúsculas.

A pasta existe e não tem `item.md` (o Work Item não nasceu pela `wi-workflow`) ⇒ siga com o que houver em
`[ITEM_DIR]`; o registro dos gates fica só no cabeçalho do test-plan e do `qa-result.md`, e você diz isso.
**Não crie o `item.md`** — ele é da `wi-workflow`.

A pasta não existe ⇒ o Work Item não passou pela `wi-workflow` nesta máquina: pergunte, em bloco com o
resto da Fase 0, o título (para o slug, em kebab-case) e onde está o que foi pedido. Crie `[ITEM_DIR]` só
com `qa/` dentro.

Não existe `STATE.md`: o estado do Work Item é o `item.md`, a costura, o status das tarefas e o que está em
`[QA_DIR]`.

## `[QA_DIR]`

`[QA_DIR]` = `[ITEM_DIR]/qa/`, sempre. **Crie/verifique antes de despachar qualquer fase**, e diga ao
humano o caminho.

Em `[ITEM_DIR]` esta skill **só lê** — `item.md`, `prd.md`, `spec.md` ou `plan.md`, `qa-report.md` —, com
uma exceção: a linha de cada gate fechado na tabela **Gates** do `item.md`
([artefatos.md](artefatos.md#onde-cada-arquivo-mora-e-quem-escreve)). Em `[QA_DIR]/e2e/` não toca — é da
automação E2E, quando houver. O `qa-report.md` (da Validation) e o `qa-result.md` (desta skill) são
artefatos diferentes: não confunda nem sobrescreva.

## O que está em disco

O que já existe em `[QA_DIR]` diz de onde a rodada começa. Com modo pedido pelo humano, vale o pedido —
mas confira a linha correspondente para não refazer fase pronta. Sem modo pedido, **a primeira linha que
bater decide**:

| O que está em `[QA_DIR]`                                                  | O que fazer                                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `qa-result.md` com `**Gate 3:** confirmado`                                | rodada fechada: mostre o veredito e ofereça a **rodada de confirmação** — ou só o **reteste**, sem TC a reconferir |
| `qa-result.md` com `**Gate 3:** pendente`                                  | Gate 3 pendente: reapresente o resultado e peça o de acordo                                  |
| `sessions/` com logs, sem `qa-result.md`                                  | **retomar a Fase 2**: rode só os charters sem log de sessão; depois a Fase 3                  |
| test-plan com `**Gate 1:** aprovado`                                       | plano aprovado: **Fase 2**                                                                   |
| test-plan com `**Gate 1:** pendente`                                       | Gate 1 pendente: reapresente o resumo do plano e peça o aprovado                              |
| nada                                                                      | **Fase 1**                                                                                   |

| Modo pedido  | Exige                                                     | Faltando                                                |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------- |
| `planejar`   | —                                                         | —                                                       |
| `executar`   | test-plan com charters                                    | ofereça planejar antes; não execute sem plano           |
| `retestar`   | bug aberto — `issues/BUG-*.md` com `status` `open` ou `still-open` | diga que não há bug aberto e encerre           |

## Rodada de confirmação

A primeira rodada sobre um plano **explora**. Toda rodada seguinte — depois das fix tasks, numa build nova —
**confirma**: ela existe para fechar o que a anterior abriu, não para achar coisa nova. Explorar de novo a
cada correção é o que transforma QA em loop: cada rodada acha um `spec-gap`, cada resposta vira código, e o
código novo é explorado na rodada seguinte.

| Roda                                                                                                              | Não roda                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `wi-qa-retester` com os bugs `open` e `still-open`                                                                | charter cujos TC passaram todos na rodada anterior                                        |
| `wi-qa-explorer` só nos charters com TC `fail` ou `blocked` na rodada anterior, com `rodada: confirmação` — confere esses TC e o entorno das correções, metade do orçamento | exploração por tour, edge cases novos, CFR e `design-check` completos                      |
| charter de critério que entrou por `escopo deste WI` em `decisoes-produto.md` — depois do planner em `revisar`    | pergunta ao produto: `spec-gap` da confirmação é sempre sugestão de backlog               |

Na confirmação vira bug só o que **regrediu** (TC que passava e agora falha) e o achado novo `critical` ou
`high`; o resto é sugestão de backlog. O humano pode pedir exploração completa de novo — uma build muito
diferente, um escopo que mudou —, e aí é rodada de exploração; você não a propõe por padrão.

**Antes de rodar:** os logs de sessão da rodada anterior vão para `sessions/<data>/`, o `retest.md` para
`retest-<data>.md` e o `qa-result.md` anterior para `qa-result-<data>.md`. Pergunte antes de mover — é o
histórico do QA.

## Retomar

Sessão nova com `[QA_DIR]` populado:

1. Refaça as sondas e a leitura da Fase 0 — é barata e o disco pode ter mudado
2. **Anuncie** o que achou — plano e o estado do Gate 1, charters com e sem sessão, bugs abertos, o que falta
3. Retome pela tabela acima. **Não** redespache charter que já tem log de sessão
4. O humano mudou um insumo de fase anterior (escopo novo, PRD revisado) ⇒ não é retomada: é Fase 1 de
   novo, em modo `revisar`, e os charters afetados perdem o log de sessão

## Caminhos da skill instalada

Os subagents leem referências e templates da skill, não da sua memória. Passe os caminhos **absolutos** no
briefing, resolvidos a partir de onde esta skill está instalada — em geral
`.claude/skills/wi-qa-validation/`, `~/.claude/skills/wi-qa-validation/` ou
`.github/skills/wi-qa-validation/`.

Não achando o caminho, cada agent procura nesses lugares. Não achando nem assim, segue sem a referência e
diz isso no relatório — é degradação, não aborto.
