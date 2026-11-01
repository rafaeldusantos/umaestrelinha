# Artefatos — envelopes, onde cada arquivo mora e quem escreve

O registro do QA é o que está em `[QA_DIR]`. Não existe outro lugar para onde ele "sobe": escrever o arquivo
é registrar, e o humano vê antes de valer (Regra 7). Os três envelopes — `qa-plan/v1`, `qa-result/v1` e
`qa-issue/v1` — ficam porque são a língua comum com uma automação E2E, quando houver
([contrato de QA](../shared/contrato-qa.md)): quem lê `qa/` lê o envelope, sem precisar entender o texto.

---

## Onde cada arquivo mora, e quem escreve

| Arquivo                                   | Quem escreve                                    | Quando                    | Vale como registro                                     |
| ----------------------------------------- | ----------------------------------------------- | ------------------------- | ------------------------------------------------------ |
| `test-plans/<feature>-test-plan.md`       | `wi-qa-planner`                                 | Fase 1                    | com `**Gate 1:** aprovado em <data>` no cabeçalho      |
| `test-plans/personas.md` · `journeys/` · `charters/` · `<suite>-regression.md` | `wi-qa-planner` | Fase 1     | junto com o test-plan                                  |
| `test-cases/<TC-ID>.md`                   | `wi-qa-planner` · a automação E2E acrescenta e atualiza o bloco Automação | Fase 1 | junto com o test-plan                     |
| `sessions/CH-NN-<slug>.md`                | `wi-qa-explorer`                                | Fase 2                    | é log: vale ao ser escrito                             |
| `retest.md`                               | `wi-qa-retester`                                | Fase 2                    | é log: o **veredito** do reteste; o `status` do BUG só muda no Gate 3 |
| `screenshots/`                            | `wi-qa-explorer` · `wi-qa-retester`             | Fase 2                    | é a evidência, citada por caminho                      |
| `issues/BUG-NNN.md` (novo)                | `wi-qa-triager`                                 | Fase 3                    | depois do Gate 3                                       |
| `issues/BUG-NNN.md` (campo `status` e **Histórico** de bug existente) | **a thread principal** | Gate 3    | ao ser gravado — só com o de acordo do humano          |
| `qa-result.md`                            | `wi-qa-triager`                                 | Fase 3                    | com `**Gate 3:** confirmado em <data>` no cabeçalho    |
| `decisoes-produto.md`                     | a thread principal                              | depois do gate das perguntas ao produto | ao ser gravado                           |
| `e2e/`                                    | a automação E2E, quando houver                  | fora desta skill          | esta skill só lê                                       |

Fora de `[QA_DIR]`, esta skill só escreve **uma linha por gate fechado** na tabela **Gates** do
`[ITEM_DIR]/item.md` (Gate 1, gate das perguntas do plano, Gate 3, gate das perguntas ao produto). Não muda
`fase:` nem nenhum outro campo do `item.md` — ele é da `wi-workflow`. Sem `item.md` (Work Item que não
nasceu pela `wi-workflow`), o cabeçalho do test-plan e do `qa-result.md` é o registro, e você diz isso.

```markdown
| QA · Gate 1 — plano | 2026-10-31 | aprovado · 24 TC · qa/test-plans/sso-test-plan.md |
| QA · Gate 3 — veredito | 2026-11-02 | fail · 3 bugs novos · 1 resolved · qa/qa-result.md |
```

## A pasta temporária

O que não é registro mora **fora do repositório**: no Claude Code, `<scratchpad>/wi/<WI-ID>/`; fora dele,
`wi/<WI-ID>/` no diretório temporário do sistema (`$TMPDIR`, `/tmp`, `%TEMP%`). Vai para lá o
`handoff.json` e o `answers.json` da [página de perguntas](gates.md#perguntas-pela-página), e arquivo
baixado de uma URL que o humano informou como insumo. **Nunca** vai a `[ITEM_DIR]`. Apague ao fechar a
fase, ou deixe — é temporária.

## Envelopes

Cada artefato tem o envelope ` ```json ` **no topo do arquivo**, e o texto humano logo depois. Copie a
forma, troque os valores. Todo enum é minúsculo, exceto `priority`. Envelope e corpo dizem a mesma coisa:
o envelope não é resumo opcional, é o que a automação E2E lê.

### `qa-plan/v1` — Fase 1, aprovado no Gate 1

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
    "Exploração por charter no browser real, uma persona por sessão",
    "E2E (Playwright) pedido à automação p/ fluxos P0/P1",
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
Mantenha-os estáveis entre rodadas.

O envelope não tem campo de estado. **Rascunho até o Gate 1**: o planner escreve `**Gate 1:** pendente`
no cabeçalho do corpo, e só a thread principal troca para `aprovado em <data>`, com o de acordo do humano.
Redespacho em `revisar` volta a `pendente`.

### `qa-result/v1` — Fase 3, confirmado no Gate 3, um por rodada

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
  "evidence": [{ "label": "sso-redirect.png", "path": "screenshots/sso-redirect.png" }],
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

`evidence[].path` é o caminho da screenshot **relativo a `qa/`** (`screenshots/<arquivo>.png`), de um
arquivo que existe; `label` é o nome do arquivo. Trace e vídeo também valem, pelo caminho.

**Rascunho até o Gate 3**: o triager escreve `**Gate 3:** pendente` no cabeçalho do corpo; a thread
principal troca para `confirmado em <data>`.

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
- `status` ∈ `{open, still-open, resolved, cannot-reproduce}`
- `tc_ref` é opcional; quando presente, reusa um `cases[].id` do `qa-plan`

**A identidade do bug é `id` + `title`.** Depois do Gate 3 que o registrou, nenhum dos dois muda: reteste e
reabertura mexem no `status` e no **Histórico** do mesmo arquivo, não criam outro. Numere pelo maior
`BUG-N` de `[QA_DIR]/issues/` — o próximo livre; a numeração é uma só no Work Item, inclusive para os bugs
que a automação E2E escrever ali.

## O `status` do bug

| `status`           | O que diz                                                                 | Conta como aberto | Quem decide          | Quem grava                     |
| ------------------ | ------------------------------------------------------------------------- | ----------------- | -------------------- | ------------------------------ |
| `open`             | bug novo, ou reaberto: o sintoma voltou depois de `resolved` ou `cannot-reproduce` | **sim**  | `wi-qa-triager`      | o triager no bug novo · a thread principal na reabertura, no Gate 3 |
| `still-open`       | o reteste viu o bug acontecer de novo, depois de uma correção             | **sim**           | `wi-qa-retester`     | a thread principal, no Gate 3  |
| `resolved`         | o reteste viu o esperado acontecer, duas vezes, com o entorno funcionando | não               | `wi-qa-retester`     | a thread principal, no Gate 3  |
| `cannot-reproduce` | os passos não levam ao estado do bug, e o humano confirmou fechar assim   | não               | `wi-qa-retester` propõe, o humano confirma | a thread principal, no Gate 3 |

Regras:

1. **Nenhum subagent muda o `status` de bug existente.** O retester decide o veredito e o escreve no
   `retest.md`; o triager propõe as transições (reteste e reaberturas) no relatório e no `qa-result.md`;
   **a thread principal grava**, no Gate 3, com o de acordo do humano: o `status` no envelope e uma linha no
   **Histórico** do corpo, com a rodada, o de → para, o que se viu e a evidência
2. Reteste `blocked` não muda o `status` — vai ao relatório como pendência
3. "Bugs abertos" do Work Item = os `issues/BUG-*.md` com `status` `open` ou `still-open`. É isso que a
   `wi-workflow` lê para as fix tasks, e é isso que o próximo reteste reconfere
4. Bug que o humano tira da lista no Gate 3 não vira registro: a thread principal **apaga** o arquivo
   (era rascunho) e anota em **Achados que não viraram bug** do `qa-result.md`: o título, a sessão e
   `descartado no Gate 3 — <motivo>`. A triagem seguinte não o reabre por conta própria

## Conferir o que foi gravado

Depois de cada gravação de gate, confira no disco o que mudou — o cabeçalho do test-plan ou do
`qa-result.md`, o `status` de cada bug transicionado, a linha nova do `item.md` — e diga ao humano, por
caminho, o que ficou registrado.
