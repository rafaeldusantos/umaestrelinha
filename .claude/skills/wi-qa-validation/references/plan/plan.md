# Fase 1 — Plano de QA

Transformar o Work Item num plano que uma pessoa — ou um subagent — executa sem adivinhar: **quem** usa
(personas), **para quê** (jornadas), **como explorar** (charters) e **o que conferir** (casos `TC-*`). O
`cases[].id` que sai daqui é a semente de todo `tc_ref` das fases seguintes.

Quem planeja é o `wi-qa-planner`. Você monta o briefing, leva as perguntas 🔴 ao humano pela página, abre
o Gate 1 e registra a aprovação.

---

## 1. Escopo

| O humano pediu                                  | `escopo`      | O planner entrega                                                         |
| ----------------------------------------------- | ------------- | ------------------------------------------------------------------------- |
| plano de QA, ou nada específico                 | `completo`    | personas, jornadas, charters (inclui CFR e design), TC, suíte smoke       |
| regressão, "o que retestar depois do fix"       | `regressão`   | suíte de regressão sobre os TC existentes, mais os TC que o fix exige     |
| smoke, sanity                                   | `smoke`       | só a suíte smoke, a partir dos TC existentes ou dos fluxos P0             |
| foco numa área ("só o checkout", "só mobile")   | `completo` + `foco: <texto>` | o mesmo, restrito à área                                   |

## 2. Montar o briefing

| Campo         | O que passar                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| `wi`          | a chave e o `tipo` do Work Item, do `item.md` (`feature`, `bug`, `improvement`…)                                     |
| `qa_dir`      | `[QA_DIR]`                                                                                                           |
| `fontes`      | a lista da [Fase 0](../context/context.md#3-o-que-a-fase-0-entrega)                                                  |
| `escopo`      | `completo` · `regressão` · `smoke`, e o `foco` quando houver                                                         |
| `modo`        | `criar` — ou `revisar`, quando já existe plano em `test-plans/` (Gate 1 com ajustes, insumo novo)                    |
| `respostas`   | só no redespacho: o que o humano respondeu ou pediu ajustar                                                          |
| `referências` | caminhos de `references/plan/{personas,journeys,test-cases,regression}.md` e `references/execution/{charters,tours,edge-cases,cfr,design-check}.md` |
| `templates`   | caminho da pasta `templates/plan/`                                                                                   |

Não cole o PRD, a costura nem as fontes de design: o planner lê os caminhos de `fontes`.

## 3. Ler o relatório

O planner devolve:

- contagens — personas, jornadas, charters, TC por prioridade e por `automation.target`
- **a tabela de cobertura**: cada critério da fonte → os TC que o cobrem, e os critérios sem TC
- perguntas 🔴 🟡 🟢 — cada 🔴 com 2 a 3 sugestões e o que a resposta muda no plano, pronta para virar item
  da página
- os arquivos escritos

Critério sem TC não é falha do planner quando ele diz por quê (fora do escopo pedido, depende de
integração que o QA manual não alcança): leve ao humano no Gate 1 assim mesmo.

Confira duas coisas antes do Gate 1:

- **O número de charters** cabe no teto do tamanho da costura
  ([charters.md](../execution/charters.md#quantos-charters)). Passou sem o planner dizer por quê ⇒
  redespache em `revisar` pedindo o corte
- **As perguntas de produto saem aqui.** As 🔴 vão pela página antes da aprovação; as 🟡 e 🟢, no chat,
  junto com o pedido de aprovação — e recomende ao humano decidir agora as que mudam comportamento: a
  resposta no Gate 1 custa um TC; a mesma pergunta na execução custa uma rodada

## 4. Gate 1 e o registro

Ver [gates.md](../setup/gates.md#gate-1). Perguntas 🔴 ⇒ a página primeiro, depois um redespacho em
`revisar` com as respostas. Aprovado o plano, registre como diz
[artefatos.md](../setup/artefatos.md#qa-planv1--fase-1-aprovado-no-gate-1): o cabeçalho do test-plan passa
a `**Gate 1:** aprovado em <data>` e o `item.md` ganha a linha do gate.

O envelope está no topo do test-plan, escrito pelo planner. **Não o edite à mão**: ajuste de conteúdo é
redespacho em `revisar`. JSON inválido ou enum fora da lista é exceção — corrija o campo, diga ao humano
qual, e siga.

## Modo `planejar`

Encerra depois do registro do Gate 1. Diga onde o plano está, quantos TC pedem automação E2E (`e2e` +
`missing` — o insumo de uma automação E2E, quando houver, fora desta skill), e que a execução é um pedido
separado — quando a Validation do Dev passar.
