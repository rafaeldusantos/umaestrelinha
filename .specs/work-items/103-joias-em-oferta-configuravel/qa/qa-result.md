```json
{
  "schema": "qa-result/v1",
  "verdict": "pass",
  "executed_at": "2026-11-17",
  "branch": "feature/103",
  "duration_min": 20,
  "gates": [
    {
      "name": "build",
      "command": "pnpm --filter @estrelinha/backoffice build (env do Supabase local) · loja: pnpm --filter @estrelinha/store build da Validation 2, não tocada pela T09",
      "status": "pass",
      "summary": "PASS no painel (Validation 3); loja PASS na Validation 2"
    },
    {
      "name": "lint",
      "command": "npx eslint . (apps/backoffice; apps/store na Validation 2)",
      "status": "pass",
      "summary": "backoffice 23 erros/5 warnings e store 2/2, iguais ao baseline; nenhum novo"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/backoffice test --testTimeout=20000 (Validation 3); store, core e functions da Validation 2, não tocados pela T09",
      "status": "pass",
      "summary": "21372/21372"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 35,
    "acceptance_covered": 31,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.5", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.6", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.4", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.5", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.6", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-SEC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-02", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-JOURNEY-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-05", "validated_by": { "tc_ref": "TC-CFR-003", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" },
      { "criterion": "RNF-07", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-08", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" }
    ],
    "missing": ["CA-01.6"]
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-008", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-017", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-018", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-019", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-020", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "CH-07-r3-01-shift-tab-foco-200.png", "url": "screenshots/CH-07-r3-01-shift-tab-foco-200.png" },
    { "label": "CH-07-r3-02-recusa-61-alerta-200.png", "url": "screenshots/CH-07-r3-02-recusa-61-alerta-200.png" },
    { "label": "CH-07-r3-03-barra-grudada-130.png", "url": "screenshots/CH-07-r3-03-barra-grudada-130.png" },
    { "label": "CH-07-r3-04-lista-livre-200.png", "url": "screenshots/CH-07-r3-04-lista-livre-200.png" },
    { "label": "retest-r3-BUG-007.png", "url": "screenshots/retest-r3-BUG-007.png" },
    { "label": "retest-r3-BUG-007-toque-remove.png", "url": "screenshots/retest-r3-BUG-007-toque-remove.png" },
    { "label": "retest-r3-BUG-007-2.png", "url": "screenshots/retest-r3-BUG-007-2.png" },
    { "label": "retest-r3-BUG-007-salvar-200.png", "url": "screenshots/retest-r3-BUG-007-salvar-200.png" },
    { "label": "retest-r3-BUG-007-390-100-gruda.png", "url": "screenshots/retest-r3-BUG-007-390-100-gruda.png" },
    { "label": "retest-r3-BUG-007-390-130-gruda.png", "url": "screenshots/retest-r3-BUG-007-390-130-gruda.png" },
    { "label": "retest-r3-BUG-007-1440-100-gruda.png", "url": "screenshots/retest-r3-BUG-007-1440-100-gruda.png" },
    { "label": "retest-r3-BUG-007-busca-sob-cabecalho-200.png", "url": "screenshots/retest-r3-BUG-007-busca-sob-cabecalho-200.png" },
    { "label": "retest-r3-BUG-007-produtos-destaque-rola-lado-200.png", "url": "screenshots/retest-r3-BUG-007-produtos-destaque-rola-lado-200.png" },
    { "label": "retest-r3-BUG-007-produtos-destaque-200.png", "url": "screenshots/retest-r3-BUG-007-produtos-destaque-200.png" },
    { "label": "retest-r3-BUG-007-cupom-rola-lado-200.png", "url": "screenshots/retest-r3-BUG-007-cupom-rola-lado-200.png" },
    { "label": "retest-r3-BUG-007-promocao-salvar-200.png", "url": "screenshots/retest-r3-BUG-007-promocao-salvar-200.png" },
    { "label": "retest-r3-BUG-007-promocao-rola-lado-200.png", "url": "screenshots/retest-r3-BUG-007-promocao-rola-lado-200.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 103 · Joias em oferta configurável — título, descrição, campanha e peças escolhidas

**Gate 3:** confirmado em 2026-11-17

## Resumo

**Veredito:** pass — o BUG-007 está corrigido (reteste 2 de 2 e TC-CFR-001 inteiro em `pass`), nenhum bug novo, nenhum TC P0 em `fail` e nenhum P0/P1 `blocked`.

A rodada 3 foi de confirmação, depois da fix task 09 (commit `656bb5ce`, a barra do topo do editor só gruda
enquanto cabe em 1/4 da janela). Rodaram só o reteste do BUG-007 e o CH-07, o único charter com TC em `fail` na
rodada 2. Os demais charters não rodaram, por regra da confirmação: os vereditos deles são os da rodada 2 (ou da
rodada 1, quando a rodada 2 também não os conferiu), e o TC-FUNC-007 segue `skip` desde a rodada 1.

Hoje, com a fonte do sistema a 200 % num celular de 390 px, a dona ordena e remove as peças do bloco pelo toque e
pelo teclado. O controle que recebe o foco fica à vista, o toque cai no próprio botão e não mais no "Salvar
seção", e ela grava e vê "Salvo". A 100 % e a 130 %, a barra continua grudada, porque cabe. Girar e redimensionar
a tela sem recarregar não deixa a barra presa em nenhum estado. O documento mede 390 px nas três fontes, e a
rolagem lateral do BUG-004 não voltou. A recusa do título com 61 caracteres a 200 % sai como alerta, com o motivo
e o número, e nada é gravado.

O reteste trouxe quatro achados de entorno (N-1 a N-4). Nenhum vira bug: nenhum é regressão deste Work Item e
todos são `medium`. Na rodada de confirmação, só vira bug a regressão ou o achado novo `critical` ou `high`. O
N-1 (o cabeçalho do painel cobre o campo "Acrescentar uma peça" com o foco, a 200 %) acontece no editor deste
Work Item e toca o RNF-04, mas a causa é o cabeçalho do painel, que o Work Item não muda. Ele existia antes da
correção e aparece igual no editor de "Produtos em destaque". A razão completa está em Achados que não viraram
bug. Os quatro vão a Sugestões de backlog.

| TC                                    | Critérios                                      | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | ---------------------------------------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 31 · fail 0 · blocked 0 · skip 1 | 31 de 35 cobertos (3 parciais, 1 sem execução) | 0          | 0         | resolved 1 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Contagem de TC: 1 conferido nesta rodada (TC-CFR-001, `pass`). O TC-CFR-002 e o TC-CFR-003 ficaram `skip` no
CH-07 r3, por orçamento, e levam o `pass` da rodada 2. Os outros 29 levam o veredito das rodadas anteriores:
28 `pass` e o TC-FUNC-007 `skip`.

## Rodada

- **Ambiente:** painel http://localhost:8083 · loja http://localhost:8082 (não usada nesta rodada) · Supabase
  local; `**/*.supabase.co/**` e `**/g/collect*` abortados
- **Branch / build:** branch local `feature/103` em `656bb5ce` (fix task 09), servida em dev pelo worktree
  `store__feature-103`. As sessões não expõem o build
- **Execução:** 2026-11-17, 02:10 → 02:30, horário local (20 min). Reteste das 02:18 às 02:23
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewports:** 390 × 844, 844 × 390 e 1440 × 900, com
  a fonte da raiz a 100 %, 130 % e 200 % (font-size do `html`, sem zoom)
- **Personas e acesso:** PER-01 → `admin-loja` (CH-07 r3) e `admin-loja-2` (reteste). PER-02 e PER-03 sem
  sessão nesta rodada

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — Validation 3 PASS, de 2026-11-17 (commit `656bb5ce`; só
  `apps/backoffice` foi refeito, o único workspace que a T09 tocou)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | painel PASS na Validation 3; loja PASS na Validation 2, não tocada pela T09 |
| lint  | pass   | backoffice 23/5 e store 2/2, iguais ao baseline; nenhum novo |
| test  | pass   | 21372/21372: backoffice 5566 (Validation 3, +9 testes da T09) · store 7855 · core 6240 · functions 1711 (Validation 2, não tocados) |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

O veredito de cada TC é o desta rodada, quando foi conferido, ou o da última rodada que o conferiu. "r3" marca
o conferido agora.

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-005, TC-JOURNEY-001 | pass | covered |
| CA-01.2 | prd | TC-FUNC-006 | pass | covered |
| CA-01.3 | prd | TC-FUNC-003 | pass | covered |
| CA-01.4 | prd | TC-FUNC-003, TC-FUNC-008 | pass | covered |
| CA-01.5 | prd | TC-FUNC-013 | pass | covered |
| CA-01.6 | prd | TC-FUNC-007 | skip | missing |
| CA-02.1 | prd | TC-FUNC-002, TC-FUNC-021 | pass | covered |
| CA-02.2 | prd | TC-JOURNEY-001, TC-FUNC-008, TC-FUNC-012, TC-JOURNEY-003, TC-FUNC-021 | pass | covered |
| CA-02.3 | prd | TC-FUNC-006, TC-FUNC-012, TC-FUNC-021 | pass | covered |
| CA-02.4 | prd | TC-FUNC-001, TC-FUNC-009 | pass | covered |
| CA-02.5 | prd | TC-FUNC-014 | pass | covered |
| CA-02.6 | prd | TC-FUNC-010, TC-FUNC-013 | pass | covered |
| CA-03.1 | prd | TC-FUNC-004 | pass | covered |
| CA-03.2 | prd | TC-FUNC-005, TC-FUNC-008, TC-JOURNEY-002 | pass | covered |
| CA-03.3 | prd | TC-FUNC-007, TC-UI-001 | skip · pass | partial |
| CA-03.4 | prd | TC-FUNC-004 | pass | covered |
| CA-03.5 | prd | TC-FUNC-003 | pass | covered |
| CA-03.6 | prd | TC-FUNC-020 | pass | covered |
| CA-04.1 | prd | TC-FUNC-016 | pass | covered |
| CA-04.2 | prd | TC-FUNC-015 | pass | covered |
| CA-04.3 | prd | TC-FUNC-015, TC-FUNC-016, TC-FUNC-017 | pass | covered |
| CA-04.4 | prd | TC-FUNC-018 | pass | covered |
| CA-04.5 | prd | TC-FUNC-019 | pass | covered |
| CA-04.6 | prd | TC-FUNC-003, TC-FUNC-008, TC-FUNC-019 | pass | covered |
| CA-05.1 | prd | TC-FUNC-005, TC-JOURNEY-001 | pass | covered |
| CA-05.2 | prd | TC-FUNC-011, TC-SEC-002 | pass | covered |
| CA-06.1 | prd | TC-SEC-001, TC-SEC-002, TC-REG-001 | pass | covered |
| RNF-01 | prd | TC-FUNC-001, TC-CFR-002 | pass | covered |
| RNF-02 | prd | TC-FUNC-008 | pass (ressalva da rodada 2: a fileira estava em esqueleto no instante medido; ver Riscos) | covered |
| RNF-03 | prd | TC-JOURNEY-003, TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001, TC-CFR-001 (r3), TC-CFR-002 | pass · pass · pass (o N-1, pré-existente, fica em Riscos) | covered |
| RNF-05 | prd | TC-CFR-003 | pass | covered |
| RNF-06 | prd | TC-FUNC-007, TC-CFR-002 | skip · pass | partial |
| RNF-07 | prd | TC-CFR-001 (r3) | pass | covered |
| RNF-08 | prd | TC-FUNC-007, TC-CFR-001 (r3) | skip · pass | partial |

**Sem cobertura:**

- CA-01.6: o TC-FUNC-007 não rodou em nenhuma das três rodadas. Fora de TC, a recusa do título com 61 caracteres
  foi vista de novo nesta rodada, a 200 %, como alerta, com o motivo e o número, e sem gravar
  (`screenshots/CH-07-r3-02-recusa-61-alerta-200.png`). A descrição com 161 caracteres, a 13ª peça e o Cancelar
  dessas recusas seguem sem tentativa

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-07 (r3) | PER-01 | — | done | 18 de 18 | pass 1 · skip 2 | 0 | — |
| Reteste | PER-01 | — | done | — | — | 4 no entorno (N-1 a N-4) | — |
| CH-01 | PER-01 | — | not-run (sem TC fail ou blocked na rodada 2; vale aquele veredito) | — | — | — | — |
| CH-02 | PER-02 | — | not-run (idem) | — | — | — | — |
| CH-03 | PER-03 | — | not-run (passou em todos os TC na rodada 1; vale aquele veredito) | — | — | — | — |
| CH-04 | PER-01 | — | not-run (idem) | — | — | — | — |
| CH-05 | PER-01 | — | not-run (sem TC fail ou blocked na rodada 2; vale aquele veredito) | — | — | — | — |
| CH-06 | PER-01 | — | not-run (passou em todos os TC na rodada 1; vale aquele veredito) | — | — | — | — |
| CH-08 | PER-01 | — | not-run (sem TC fail ou blocked na rodada 2; vale aquele veredito) | — | — | — | — |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01 | ok: a 200 %, os 13 focos do Tab e os do Shift+Tab nas peças ficam à vista, e a recusa sai como alerta. Dos 64 focáveis do editor, 63 ficam à vista ao receber foco. O 64º é o N-1, coberto pelo cabeçalho do painel (pré-existente, Sugestões de backlog) | — |
| Responsividade        | J-01 | ok: o editor mede 390 px a 100 %, 130 % e 200 %. A barra gruda quando cabe e solta quando não cabe, a 390 × 844, 844 × 390 e 1440 × 900, sem ficar presa ao girar | — |
| Performance percebida | — | não rodou (confirmação) | — |
| Segurança visível     | J-05 | ok na rodada 1 (CH-03); não refeito | — |

## Design-check

- **Fonte de design:** artifact `SQehnBNiiQmbnjkY3QQpbq` (só os padrões de D-01)
- **Status:** not-run (o CH-08 passou na rodada 2 e não rodou nesta confirmação)
- **Divergências:** 0 — nenhuma nova. O contador "61/60" sem estado de erro segue em Sugestões de backlog da
  rodada 2

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada, se a transição do BUG-007 for aceita no Gate 3.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | Veredito | Status proposto | Severidade | Evidência |
| --- | ------------------------------------ | ------ | -------- | --------------- | ---------- | --------- |
| BUG-007 | [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco | reteste | resolved | open → resolved | mantida | `screenshots/retest-r3-BUG-007.png`, `screenshots/retest-r3-BUG-007-toque-remove.png`, `screenshots/retest-r3-BUG-007-2.png` |

O `resolved` também se confirmou na sessão: o CH-07 r3 passou o TC-CFR-001 inteiro, com o Shift+Tab da repro do
BUG-007 (`screenshots/CH-07-r3-01-shift-tab-foco-200.png`).

Nota para o Histórico do BUG-007: resolvido pela fix task 09 (`656bb5ce`). Reteste de 2026-11-17 (rodada 3),
2 de 2 tentativas. A 200 % em 390 × 844, a barra (345 px) deixa de grudar e rola com a página. O foco do
Shift+Tab fica à vista em y 378–466, e o toque nos 7 controles das peças cai no próprio controle. A 100 % e a
130 % a barra segue grudada (73 px e 162 px). O BUG-004 não voltou: o documento mede 390 px nas três fontes.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- **N-1 do reteste.** No editor do bloco, a 200 % em 390 × 844, voltar com Shift+Tab para o campo "Acrescentar
  uma peça" deixa o campo em y 0–80, debaixo do cabeçalho fixo do painel (y 0–112). Não é bug deste Work
  Item: é defeito pré-existente, fora da superfície da mudança e abaixo de `high`. Vai a Sugestões de
  backlog. As razões:
  1. Quem cobre o campo é o cabeçalho do painel, que o WI 103 não muda. A costura muda o editor do bloco, e a
     fix task 09 mexeu só na barra do topo do editor. O charter CH-07 diz, em Fora do escopo: "mesmo na mesma
     tela, o que não mudou neste WI é `pré-existente`".
  2. Não é regressão. O cabeçalho de 112 px já estava grudado nas rodadas 1 e 2: entra nos 457 px do BUG-007. O
     commit `656bb5ce` só reduziu a área fixa de 457 px para 112 px. Antes dele, o mesmo foco ficaria debaixo
     das duas barras. A falta de `scroll-padding-top` é do documento do painel.
  3. O sintoma aparece igual no editor de "Produtos em destaque", que o Work Item não toca: dois itens da lista
     ficam sob o cabeçalho.
  4. O impacto é Fricção (`medium`), como propôs o retester. A dona digita num campo que não vê, mas os
     resultados aparecem logo abaixo e ela conclui. Acontece só a 390 px com a fonte a 200 %, que é condição do
     CFR. Pelo mesmo argumento do BUG-004 e do BUG-007, não sobe um degrau por J-01 ser P0. Rodada de
     confirmação com achado `medium` que não é regressão vai a backlog.

  O RNF-04 ("o editor continua usável com a fonte do sistema a 200 %") é o critério que este achado toca. Se o
  humano quiser que o RNF-04 cubra também o cabeçalho do painel, pode promovê-lo no Gate 3. O padrão é Work
  Item novo.
- **N-2 do reteste.** O editor de "Produtos em destaque", a 200 % em 390 px, rola 149 px de lado (539 px) pelos
  textos de ajuda que não quebram linha. Defeito pré-existente, em tela fora do WI 103, `medium`. Vai a
  Sugestões de backlog. A barra do editor está certa ali (não gruda, "Salvar seção" inteiro)
- **N-3 do reteste.** O formulário "Novo cupom", a 200 % em 390 px, rola de lado (448 px) pelo seletor "% off ·
  Valor fixo · Frete grátis". Defeito pré-existente, fora do WI 103, `medium`. Vai a Sugestões de backlog
- **N-4 do reteste.** O formulário "Nova promoção", a 200 % em 390 px, corta "Salvar promoção" 8 px na borda e
  rola de lado (605 px; 401 px a 130 %), pelo rótulo do botão e pelo seletor de alcance. É defeito
  pré-existente, fora do WI 103, `medium`, e vai a Sugestões de backlog. Não é reabertura do BUG-004: o
  sintoma parece com o dele, mas está em outra tela. No editor do bloco, o "Salvar seção" segue inteiro
- **Barra a 345 px grudada logo depois de subir a fonte, até a primeira rolagem** (CH-07 r3, Fora da cobertura,
  e nota do reteste: o estado anterior dura um quadro). O reteste mediu depois do quadro seguinte e não viu
  estado preso nas duas sequências de girar e redimensionar. Não vira bug. O carregamento já a 200 % fica em
  Riscos residuais

## Perguntas ao produto

nada. A rodada de confirmação não faz pergunta ao produto.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| A 200 % em 390 px, o campo que recebe o foco ao voltar com Shift+Tab para debaixo do cabeçalho fixo do painel (y 0–112). Visto no campo "Acrescentar uma peça" do editor "Joias em oferta" e em itens da lista do editor "Produtos em destaque". O documento não tem `scroll-padding-top` (reteste r3, N-1) | painel · cabeçalho fixo do painel, sobre os editores da Home | pré-existente | Foco do teclado nunca fica debaixo do cabeçalho fixo do painel |
| A 200 % em 390 px, o editor rola 149 px de lado (539 px) pelos textos de ajuda "6 de 12 · arraste para trocar de ordem" e "no celular, 2 por linha na grade", que não quebram linha (reteste r3, N-2) | painel · editor "Produtos em destaque" | pré-existente | Editor de Produtos em destaque sem rolagem lateral com a fonte a 200 % |
| A 200 % em 390 px, o formulário rola de lado (448 px) pelo seletor "% off · Valor fixo · Frete grátis", com "Frete grátis" parte fora da tela (reteste r3, N-3) | painel · Novo cupom, seletor de tipo de desconto | pré-existente | Novo cupom sem rolagem lateral com a fonte a 200 % |
| A 200 % em 390 px, "Salvar promoção" passa 8 px da borda e o formulário rola de lado (605 px) pelo seletor de alcance e pelo "+ Adicionar categoria". A 130 %, rola até 401 px (reteste r3, N-4) | painel · Nova promoção, barra do topo e seção de alcance | pré-existente | Nova promoção com "Salvar promoção" inteiro e sem rolagem lateral com a fonte a 200 % |

As três últimas podem virar um Work Item só ("Formulários do painel sem rolagem lateral com a fonte a 200 % no
celular"). Quem decide é o humano. As sugestões das rodadas 1 e 2 continuam valendo como estão em
`qa-result-2026-11-17-rodada-1.md` e `qa-result-2026-11-17-rodada-2.md`, e não se repetem aqui.

## Evidências não enviadas

nada

## Riscos residuais

- **RNF-04 e o cabeçalho do painel (N-1).** O editor deste Work Item tem 1 focável de 64 que fica coberto a 200 %,
  por causa de um componente que o Work Item não muda. O RNF-04 conta como coberto, porque o TC-CFR-001 passou e
  a dona conclui. Fica como risco até a sugestão de backlog ser decidida
- **Salvar logo depois de remover sem recibo** (CH-01 r2, A-1; 1 de 1; `screenshots/CH-01-r2-02-salvo-sem-peca.png`).
  Segue sem segunda ocorrência. Nesta rodada, a 200 %, reordenar e salvar deu "Salvo" duas vezes. Remover
  pelo toque foi descartado com Cancelar, sem gravar. Remover e salvar em sequência imediata não foi
  tentado. Se reproduzir, é `high`, na área do BUG-001
- **Esqueleto da fileira com produtos bloqueados** (CH-02 r2, passo 05; TC-FUNC-008 passo 3). Não se viu se o
  esqueleto fica preso. Não foi refeito
- **Prévia com rascunho cancelado** (A-3 da rodada 1; 1 de 1, sem screenshot). Não foi refeito. Se confirmado, é
  `high`
- **TC-FUNC-007 sem execução nas três rodadas:** o CA-01.6 fica sem caso executado. Só a recusa do título com 61
  caracteres foi vista (rodadas 2 e 3), fora do TC
- **Fonte a 200 % já no carregamento:** a sessão aumentou a fonte com o editor aberto. O estado da barra quando a
  página já abre a 200 % não foi medido isoladamente
- **Rede lenta não medida** (TC-UI-001 passo 1, TC-CFR-002): o driver não atrasa resposta

O risco "barra fixa compartilhada" da rodada 2 fecha nesta rodada. O reteste mediu a barra nos editores
"Produtos em destaque", "Novo cupom" e "Nova promoção" a 200 %: em nenhum deles ela gruda (345 px). O que
apareceu nessas telas foi rolagem lateral por outros elementos (N-2 a N-4).

## Fora da cobertura

- CH-01, CH-02, CH-03, CH-04, CH-05, CH-06 e CH-08 não rodaram nesta rodada, por regra da confirmação (sem TC
  `fail` ou `blocked` na rodada anterior). Vale o veredito da última rodada que os conferiu
- TC-CFR-002 e TC-CFR-003 ficaram `skip` no CH-07 r3, porque o orçamento de 18 ações foi gasto no TC-CFR-001.
  Levam o `pass` da rodada 2
- TC-FUNC-007 (P1) inteiro: título com 61, descrição com 161, 13ª peça e Cancelar. Está sem execução desde a
  rodada 1
- Variação "movimento reduzido" do TC-CFR-001 (a linha que acende ao salvar): exigiria salvar B-1, e o CH-07 r3
  não salvou para não mexer na massa
- Fonte a 200 % aplicada antes do carregamento da página
- PER-02 e PER-03 sem sessão nesta rodada. A loja (J-02) e a sessão de admin na loja (J-05) não foram refeitas
- As jornadas J-02 a J-05 não foram percorridas nesta rodada (vale o veredito anterior)
- Engines além do Chromium; leitor de tela real
- O que ficou fora nas rodadas 1 e 2 segue como está em `qa-result-2026-11-17-rodada-1.md` e
  `qa-result-2026-11-17-rodada-2.md`
