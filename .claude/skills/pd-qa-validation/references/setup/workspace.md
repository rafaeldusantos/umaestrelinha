# Workspace — Work Item, `[QA_DIR]`, envelopes e retomada

Onde a rodada escreve, a forma do que ela escreve, como ela sabe onde parou, e como os subagents acham as
referências da skill. As raízes de cada backend estão em [backend.md](backend.md#raízes).

---

## Resolver o Work Item e `[ITEM_DIR]`

Todo QA desta skill é de um Work Item. A primeira que valer decide:

1. **A chave na mensagem** (`PROD-58`, `ACME-14`, `#123`) — vale ela
2. **Uma pasta só** em `[RAIZ]/work-items/` — vale ela; diga qual foi
3. **`[local]`** **Uma só com `fase: validation` ou `fase: done`** no `item.md` — vale ela; diga qual foi
4. **Nenhuma, ou mais de uma** ⇒ pergunte a chave. Não escolha por conta. **`[local]`** Recomende a de
   `item.md` mais recente

`[ITEM_DIR]` = `[RAIZ]/work-items/[WI-ID]-[name]/`. A chave casa com o começo do nome da pasta em
`work-items/`, com ou sem prefixo de projeto e sem diferenciar maiúsculas: `98` casa `98-pagamento-que-falhou`;
`PROD-285` casa `PROD-285-…`. Mais de uma pasta casando ⇒ pergunte.

A pasta não existe (o Work Item não passou pela `pd-workflow` nesta máquina) ⇒ o título vem do backend:
`item.titulo` ([backend.md](backend.md#operações)). Crie `[ITEM_DIR]` só com `qa/` dentro.

**`[local]`** A pasta existe e não tem `item.md` (o Work Item não nasceu pela `pd-workflow`) ⇒ siga com o
que houver em `[ITEM_DIR]`; o registro dos gates fica só no cabeçalho do test-plan e do `qa-result.md`, e você
diz isso.

**Esta skill nunca cria o `item.md`**, em nenhum backend. Não existe `STATE.md`: o estado do Work Item é o do
backend (`qa.estado`) e o que está em disco.

## `[QA_DIR]`

`[QA_DIR]` = `[ITEM_DIR]/qa/`, sempre. **Crie/verifique antes de despachar qualquer fase**, e diga ao
humano o caminho.

Em `[ITEM_DIR]` esta skill **só lê**: `prd.md`, `spec.md` ou `plan.md`, `qa-report.md` (e, no `local`, o
`item.md`) — fora o que as operações de backend registram ([backend.md](backend.md#operações)). Em
`[QA_DIR]/e2e/` não toca — é da automação E2E. O `qa-report.md` (da Validation) e o `qa-result.md` (desta
skill) são artefatos diferentes: não confunda nem sobrescreva.

## Envelopes

Cada artefato tem o envelope ` ```json ` **no topo do arquivo**, e o texto humano logo depois. Copie a forma,
troque os valores. Todo enum é minúsculo, exceto `priority`. Envelope e corpo dizem a mesma coisa: o envelope
não é resumo opcional, é o que a automação E2E — e, no `productdock`, a plataforma — lê. A forma é contrato
nos dois backends: não muda aqui ([contrato de QA](../shared/contrato-qa.md)).

### `qa-plan/v1` — Fase 1, registrado no Gate 1

```json
{
  "schema": "qa-plan/v1",
  "title": "Plano de QA — SSO com Azure AD",
  "summary": {
    "total_cases": 24,
    "by_priority": { "P0": 6, "P1": 10, "P2": 8, "P3": 0 }
  },
  "acceptance_criteria_covered": 12,
  "strategy": [
    "E2E (Playwright) p/ fluxos P0/P1",
    "Integração p/ roles e claims",
    "Manual p/ consentimento e UAT"
  ],
  "cases": [
    {
      "id": "TC-FUNC-001",
      "title": "Login SSO redireciona ao Azure AD e retorna sessão",
      "priority": "P0",
      "type": "functional",
      "automation": { "target": "e2e", "status": "existing" }
    }
  ]
}
```

- `cases[].type` ∈ `{functional, ui, regression, smoke, persona, journey, charter, tour, cfr, integration, security}`
- `cases[].priority` ∈ `{P0, P1, P2, P3}`
- `cases[].automation.target` ∈ `{e2e, integration, manual}`
- `cases[].automation.status` ∈ `{existing, missing, blocked, na}`

`cases[].id` é a semente de todo o resto: o `tc_ref` do `qa-result` e do `qa-issue` **reusa** esses IDs.
Mantenha-os estáveis entre rodadas. O envelope não tem campo de estado: o Gate 1 se registra por
`plano.registrar` (**`[local]`** com o cabeçalho `**Gate 1:**` — [local.md](local.md#onde-cada-arquivo-mora)).

### `qa-result/v1` — Fase 3, registrado no Gate 3, um por rodada

```json
{
  "schema": "qa-result/v1",
  "verdict": "pass",
  "executed_at": "2026-06-21T14:32:00Z",
  "branch": "feature/sso-azure-ad",
  "duration_min": 14,
  "gates": [
    { "name": "build", "command": "pnpm build", "status": "pass", "summary": "ok" },
    { "name": "lint", "command": "pnpm lint", "status": "pass", "summary": "0 erros" },
    { "name": "test", "command": "pnpm test", "status": "pass", "summary": "142/142" },
    { "name": "e2e", "command": "pnpm e2e --grep @sso", "status": "pass", "summary": "8/8" }
  ],
  "coverage": {
    "acceptance_total": 12,
    "acceptance_covered": 12,
    "items": [
      {
        "criterion": "P1-AC01",
        "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" },
        "status": "covered"
      }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-002", "verdict": "fail", "bug_ref": "BUG-001" }
  ],
  "evidence": [{ "label": "sso-redirect.png", "url": "screenshots/sso-redirect.png" }],
  "issues": {
    "total": 2,
    "by_severity": { "critical": 0, "high": 1, "medium": 1, "low": 0 }
  }
}
```

- `verdict` ∈ `{pass, fail, partial}`
- `gates[].status` ∈ `{pass, fail, skip}`
- `coverage.items[].status` ∈ `{covered, partial, missing}`
- `test_cases[].verdict` ∈ `{pass, fail, blocked, skip}`

`gates` copia o que já rodou — esta skill não roda build nem teste: `build`, `lint` e `test` da Validation
(`qa-report.md`); `e2e` da rodada de automação E2E, quando houver (`qa/e2e/qa-e2e-report.md`). Gate sem
fonte vai `skip` com `command: "—"` e o `summary` dizendo qual fonte faltou. `coverage.items[]` tem **um
item por critério**, com o ID do critério na fonte (o do PRD, ou o `C-nn` do `plan.md` na entrada sem PRD);
`validated_by` aponta o TC de maior prioridade que o cobre, e `type` é o `automation.target` dele (`e2e` ·
`integration` · `manual`).

`evidence[].url` é, em disco, o caminho da evidência **relativo a `qa/`** (`screenshots/<arquivo>.png`), de um
arquivo que existe; `label` é o nome do arquivo. Trace e vídeo também valem, pelo caminho. **`[productdock]`**
`evidencia.enviar` sobe cada arquivo e regrava o valor antes do registro
([pd-sync/qa.md](../pd-sync/qa.md#evidência)).

### `qa-issue/v1` — um por bug

```json
{
  "schema": "qa-issue/v1",
  "id": "BUG-001",
  "title": "Logout federado não invalida sessão no IdP",
  "severity": "high",
  "priority": "P1",
  "type": "functional",
  "status": "open",
  "tc_ref": "TC-FUNC-007"
}
```

- `id` casa `^BUG-\d+$`
- `severity` ∈ `{critical, high, medium, low}`
- `priority` ∈ `{P0, P1, P2, P3}`
- `type` ∈ `{functional, ui, regression, smoke, persona, journey, charter, tour, cfr, integration, security}`
- `status` ∈ `{open, resolved, invalid}`
- `tc_ref` é opcional; quando presente, reusa um `cases[].id` do `qa-plan`

**A identidade do bug é `id` + `title`.** Depois do registro, nenhum dos dois muda: reteste e reabertura
mexem no `status` e no **Histórico** do mesmo arquivo, não criam outro. Reusar um número para outro defeito
é proibido. Numere pelo maior `BUG-N` de `[QA_DIR]/issues/` — o próximo livre; a numeração é uma só no Work
Item, inclusive para os bugs que a automação E2E escrever ali. **`[productdock]`** `bugs.todos` traz antes os
bugs que só existem na plataforma para `issues/`.

**Arquivos antigos.** O `status` gravado no envelope só é `open`, `resolved` ou `invalid`; `still-open` e
`cannot-reproduce` são vereditos do reteste ([O status do bug](#o-status-do-bug)). Arquivo antigo que traz um
deles **como `status`** se lê de forma tolerante: `still-open` conta como `open`; `cannot-reproduce` conta como
`resolved` — alguém já o fechou assim. Evidência com a chave `path` vale como `url`. A primeira gravação
daquele arquivo reescreve no formato atual.

## O status do bug

| `status`   | O que diz                                                                 | Conta como aberto | Quem decide          | Quem grava                     |
| ---------- | ------------------------------------------------------------------------- | ----------------- | -------------------- | ------------------------------ |
| `open`     | bug novo; reaberto (o sintoma voltou depois de `resolved`); ou retestado sem fechar | **sim** | `pd-qa-triager` no novo · `pd-qa-retester` no veredito | o triager no bug novo · a thread principal na reabertura, no Gate 3 |
| `resolved` | o reteste viu o esperado acontecer, duas vezes, com o entorno funcionando; ou `cannot-reproduce` que o humano fechou | não | `pd-qa-retester` propõe; o humano confirma no Gate 3 | a thread principal, no Gate 3 |
| `invalid`  | alguém já decidiu que não é bug                                           | não               | o time, fora desta skill | ninguém aqui — chega pelo backend |

O veredito do reteste vai ao `retest.md` e, no Gate 3, à linha do **Histórico** do bug:

| Veredito           | O `status` fica                                                             |
| ------------------ | --------------------------------------------------------------------------- |
| `resolved`         | `resolved`                                                                  |
| `still-open`       | `open` — o bug segue aberto, sem reenvio; não conta em `issues`, mas entra no veredito e no corpo |
| `cannot-reproduce` | `open`, salvo se o humano fechar no Gate 3: aí `resolved`, com `cannot-reproduce, fechado pelo humano` no Histórico; sem isso, volta ao próximo reteste |
| `blocked`          | como está — vai ao relatório como pendência                                 |

O veredito nunca se grava como `status`: o veredito `cannot-reproduce` deixa o bug `open` até o humano
fechá-lo no Gate 3.

Regras:

1. **Nenhum subagent muda o `status` de bug existente.** Os agents só escrevem arquivos **novos**. O retester
   decide o veredito e o escreve no `retest.md`; o triager propõe as transições (reteste e reaberturas) no
   relatório e no `qa-result.md`; **a thread principal grava**, no Gate 3, com o de acordo do humano: o
   `status` no envelope e uma linha no **Histórico** do corpo, com a rodada, o de → para, o que se viu e a
   evidência
2. "Bugs abertos do Work Item" = os `issues/BUG-*.md` com `status: open`. É isso que a `pd-workflow` lê para
   as fix tasks, e é isso que o próximo reteste reconfere
3. Bug que o humano tira da lista no Gate 3 não vira registro: a thread principal **apaga** o arquivo (era
   rascunho) e anota em **Achados que não viraram bug** do `qa-result.md`: o título, a sessão e
   `descartado no Gate 3 — <motivo>`. A triagem seguinte não o reabre por conta própria
4. `invalid` é de bug que já estava registrado: não se reabre; o achado igual vai a **Achados que não viraram bug** do `qa-result.md` como `invalid em BUG-N` (não a Perguntas ao produto)

## O que está em disco

O que já existe em `[QA_DIR]`, e o estado dos gates que `qa.estado` devolve
([backend.md](backend.md#operações)), dizem de onde a rodada começa. A **listagem** de `[QA_DIR]` basta: o
nome de `sessions/CH-NN-*.md` diz que o charter rodou, e o conteúdo dos logs é do triager — não os abra.

Com a `pd-workflow` instalada (em `.claude/skills/pd-workflow/`, `~/.claude/skills/pd-workflow/` ou
`.github/skills/pd-workflow/`) e Node ≥ 18, `node <pd-workflow>/scripts/estado.cjs <ITEM_DIR>` devolve esses
fatos num JSON (o bloco `qa` e os `bugs`) — atalho para a listagem, não pré-requisito. Ele só lê o disco: não
é rodar a aplicação. **`[productdock]`** `gate1` e `gate3` vêm `null`: valem os de `qa.estado`.

**`[local]`** Com mais de uma linha `**Gate 3:**` no mesmo `qa-result.md`, vale a última do arquivo.

Com modo pedido pelo humano, vale o pedido — salvo quando ele cai numa fase já registrada (`planejar` com o
Gate 1 fechado; `executar` com a rodada fechada). Aí **não refaça**: mostre o estado numa linha e pergunte o
que o humano quer — revisar o plano (`pd-qa-planner` em modo `revisar`, com o que mudou), rodada de
confirmação, só o reteste, ou nada. Essa pergunta é direta, no chat, fora do formato `Q-NN`/`P-NN`. Sem modo
pedido, **a primeira linha que bater decide**:

| Sinal                                                                     | O que fazer                                                                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| rodada fechada — **`[local]`** `qa-result.md` com `**Gate 3:** confirmado` (na última linha `**Gate 3:**`); **`[productdock]`** `qa-result.md` existe ([qa.md](../pd-sync/qa.md#qaestado)) | mostre o veredito e ofereça a **rodada de confirmação** — ou só o **reteste**, sem TC a reconferir |
| **`[local]`** `qa-result.md` com `**Gate 3:** pendente`                   | Gate 3 pendente: reapresente o resultado e peça o de acordo                                  |
| `sessions/` com logs, sem `qa-result.md`                                  | **retomar a Fase 2**: rode só os charters sem log de sessão; depois a Fase 3                  |
| test-plan com o Gate 1 fechado                                            | plano aprovado e registrado: **Fase 2**                                                      |
| test-plan com o Gate 1 pendente                                           | Gate 1 pendente: reapresente o resumo do plano e peça o aprovado                              |
| nada                                                                      | **Fase 1**                                                                                   |

| Modo pedido  | Exige                                                     | Faltando                                                | Já registrado                     |
| ------------ | --------------------------------------------------------- | ------------------------------------------------------- | --------------------------------- |
| `planejar`   | —                                                         | —                                                       | Gate 1 fechado ⇒ pergunte (acima) |
| `executar`   | test-plan com charters                                    | ofereça planejar antes; não execute sem plano           | rodada fechada ⇒ pergunte (acima) |
| `retestar`   | bug aberto — `issues/BUG-*.md` com `status: open`, depois de `contexto.ler` | diga que não há bug aberto e encerre  | —                                 |

## Rodada de confirmação

A primeira rodada sobre um plano **explora**. Toda rodada seguinte — depois das fix tasks, numa build nova —
**confirma**: ela existe para fechar o que a anterior abriu, não para achar coisa nova. Explorar de novo a
cada correção é o que transforma QA em loop: cada rodada acha um `spec-gap`, cada resposta vira código, e o
código novo é explorado na rodada seguinte.

| Roda                                                                                                              | Não roda                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `pd-qa-retester` com os bugs abertos                                                                              | charter cujos TC passaram todos na rodada anterior                                        |
| `pd-qa-explorer` só nos charters com TC `fail` ou `blocked` na rodada anterior, com `rodada: confirmação` — confere esses TC e o entorno das correções, metade do orçamento | exploração por tour, edge cases novos, CFR e `design-check` completos                      |
| charter de critério que entrou por `escopo deste WI` em `decisoes-produto.md` — depois do planner em `revisar`    | pergunta ao produto: `spec-gap` da confirmação é sempre sugestão de backlog               |

Na confirmação vira bug só o que **regrediu** (TC que passava e agora falha) e o achado novo `critical` ou
`high`; o resto é sugestão de backlog. O humano pode pedir exploração completa de novo — uma build muito
diferente, um escopo que mudou —, e aí é rodada de exploração; você não a propõe por padrão.

**Antes de rodar:** os logs de sessão da rodada anterior vão para `sessions/<data>/`, o `retest.md` para
`retest-<data>.md` e o `qa-result.md` anterior para `qa-result-<data>.md`. Pergunte antes de mover — é o
histórico do QA.

## Retomar

Sessão nova com `[QA_DIR]` populado:

1. Refaça as sondas e a Fase 0 (`canal.sondar`, `qa.estado`, `contexto.ler`) — é barata, o disco pode ter
   mudado, e a pasta temporária não sobrevive à sessão
2. **Anuncie** o que achou — plano e o estado do Gate 1, charters com e sem sessão, bugs abertos, o que falta
3. Retome pela tabela acima. **Não** redespache charter que já tem log de sessão — e **não abra** esses logs:
   o nome do arquivo em `sessions/` basta. O conteúdo é do `pd-qa-triager`, que o lê do disco; ler log na
   thread principal é o que estoura o contexto da rodada
4. O humano mudou um insumo de fase anterior (escopo novo, PRD revisado) ⇒ não é retomada: é Fase 1 de
   novo, em modo `revisar`, e os charters afetados perdem o log de sessão

## Caminhos da skill instalada

Os subagents leem referências e templates da skill, não da sua memória. Passe os caminhos **absolutos** no
briefing, resolvidos a partir de onde esta skill está instalada — em geral
`.claude/skills/pd-qa-validation/`, `~/.claude/skills/pd-qa-validation/` ou
`.github/skills/pd-qa-validation/`.

Não achando o caminho, cada agent procura nesses lugares. Não achando nem assim, segue sem a referência e
diz isso no relatório — é degradação, não aborto.
