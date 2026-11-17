```json
{
  "schema": "qa-result/v1",
  "verdict": "pass",
  "executed_at": "2026-11-17",
  "branch": "feature/103",
  "duration_min": 0,
  "gates": [
    {
      "name": "build",
      "command": "pnpm --filter @estrelinha/store build · pnpm --filter @estrelinha/backoffice build (com VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY do Supabase local e VITE_STORE_URL)",
      "status": "pass",
      "summary": "PASS na loja e no painel (Validation 2)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (apps/store, apps/backoffice)",
      "status": "pass",
      "summary": "store 2 erros/2 warnings e backoffice 23 erros/5 warnings, iguais ao baseline; nenhum novo"
    },
    {
      "name": "test",
      "command": "pnpm --filter <workspace> test --testTimeout=20000 (backoffice, store, core, functions)",
      "status": "pass",
      "summary": "21363/21363"
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
    { "tc_ref": "TC-CFR-001", "verdict": "fail", "bug_ref": "BUG-007" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "CH-07-r2-02-shift-tab-foco-coberto-200.png", "url": "screenshots/CH-07-r2-02-shift-tab-foco-coberto-200.png" },
    { "label": "CH-07-r2-01-tab-frente-foco-visivel-200.png", "url": "screenshots/CH-07-r2-01-tab-frente-foco-visivel-200.png" },
    { "label": "retest-r2-BUG-004-salvar-sobre-pecas.png", "url": "screenshots/retest-r2-BUG-004-salvar-sobre-pecas.png" },
    { "label": "CH-07-r2-03-home-390-200.png", "url": "screenshots/CH-07-r2-03-home-390-200.png" },
    { "label": "CH-01-r2-01-salvo-com-peca.png", "url": "screenshots/CH-01-r2-01-salvo-com-peca.png" },
    { "label": "CH-01-r2-02-salvo-sem-peca.png", "url": "screenshots/CH-01-r2-02-salvo-sem-peca.png" },
    { "label": "CH-02-r2-01-fileira-passada-390.png", "url": "screenshots/CH-02-r2-01-fileira-passada-390.png" },
    { "label": "CH-02-r2-02-fita-1440.png", "url": "screenshots/CH-02-r2-02-fita-1440.png" },
    { "label": "CH-02-r2-03-sem-produtos-1440.png", "url": "screenshots/CH-02-r2-03-sem-produtos-1440.png" },
    { "label": "CH-05-r2-01-linha-2-das-5.png", "url": "screenshots/CH-05-r2-01-linha-2-das-5.png" },
    { "label": "CH-05-r2-02-loja-3-pecas-390.png", "url": "screenshots/CH-05-r2-02-loja-3-pecas-390.png" },
    { "label": "CH-05-r2-03-editor-apagada-nomeada.png", "url": "screenshots/CH-05-r2-03-editor-apagada-nomeada.png" },
    { "label": "CH-05-r2-04-previa-so-cartoes.png", "url": "screenshots/CH-05-r2-04-previa-so-cartoes.png" },
    { "label": "CH-05-r2-05-editor-falha-leitura.png", "url": "screenshots/CH-05-r2-05-editor-falha-leitura.png" },
    { "label": "CH-05-r2-06-loja-p-fora-volta-390.png", "url": "screenshots/CH-05-r2-06-loja-p-fora-volta-390.png" },
    { "label": "CH-08-r2-02-recusa-ao-salvar-61.png", "url": "screenshots/CH-08-r2-02-recusa-ao-salvar-61.png" },
    { "label": "CH-08-r2-03-home-apos-cancelar-1.png", "url": "screenshots/CH-08-r2-03-home-apos-cancelar-1.png" },
    { "label": "retest-r2-BUG-001.png", "url": "screenshots/retest-r2-BUG-001.png" },
    { "label": "retest-r2-BUG-001-2.png", "url": "screenshots/retest-r2-BUG-001-2.png" },
    { "label": "retest-r2-BUG-002.png", "url": "screenshots/retest-r2-BUG-002.png" },
    { "label": "retest-r2-BUG-003.png", "url": "screenshots/retest-r2-BUG-003.png" },
    { "label": "retest-r2-BUG-003-390-100.png", "url": "screenshots/retest-r2-BUG-003-390-100.png" },
    { "label": "retest-r2-BUG-003-390-200.png", "url": "screenshots/retest-r2-BUG-003-390-200.png" },
    { "label": "retest-r2-BUG-004.png", "url": "screenshots/retest-r2-BUG-004.png" },
    { "label": "retest-r2-BUG-004-salvar-200.png", "url": "screenshots/retest-r2-BUG-004-salvar-200.png" },
    { "label": "retest-r2-BUG-005.png", "url": "screenshots/retest-r2-BUG-005.png" },
    { "label": "retest-r2-BUG-006.png", "url": "screenshots/retest-r2-BUG-006.png" }
  ],
  "issues": {
    "total": 1,
    "by_severity": { "critical": 0, "high": 0, "medium": 1, "low": 0 }
  }
}
```

# Resultado de QA — 103 · Joias em oferta configurável — título, descrição, campanha e peças escolhidas

**Gate 3:** confirmado em 2026-11-17

## Resumo

**Veredito:** pass. Nenhum TC P0 falhou e não há bug `critical` ou `high` aberto. Os seis bugs da rodada 1 estão
`resolved`. Fica aberto um `medium` novo (BUG-007), uma regressão da correção do BUG-004, que faz o TC-CFR-001
(P1) falhar.

A rodada 2 foi de confirmação. O reteste conferiu os seis bugs da rodada 1, e os seis estão corrigidos, cada um
com duas tentativas e o entorno conferido. Os charters CH-01, CH-02, CH-05, CH-07 e CH-08 voltaram aos TC que
tinham falhado ou ficado sem veredito na rodada 1. Os charters CH-03, CH-04 e CH-06 passaram em todos os TC na
rodada 1 e não rodaram de novo: o veredito deles continua valendo. Hoje a dona grava o bloco com peças e vê
"Salvo". A linha da Home do painel só diz "No ar" para o bloco que a loja mostra. A peça apagada entra na conta
"N das M saíram do ar". A falha de leitura das peças é dita com "Tentar de novo", sem tirar nenhuma peça. A
cliente no celular passa a fileira sem a página rolar de lado. A recusa do título com 61 caracteres ao salvar
apareceu como alerta, com o motivo e o número (TC-UI-002).

O que piorou está no editor a 200 % no celular. A barra do topo agora quebra linha e não estoura mais a largura
(BUG-004 corrigido). Só que ela continua grudada no topo e passou a ter 345 px de altura. Com o cabeçalho do
painel, cobre 54 % da tela: o foco dos controles das peças fica escondido ao voltar com Shift+Tab, e o toque
nesses controles pode cair no "Salvar seção" (BUG-007, `medium`). O RNF-04 ("o editor continua usável a 200 %")
segue sem ser cumprido, agora por outro motivo.

Pela regra, o veredito é `pass`: não há bug `critical` ou `high` aberto, nenhum TC P0 falhou e nenhum TC P0 ou
P1 ficou `blocked`. Mesmo assim, ficam pendências que pesam: o BUG-007 (TC-CFR-001 P1 em `fail`), o TC-FUNC-007
(P1) sem execução nas duas rodadas, o que deixa o CA-01.6 sem caso executado, e dois riscos que vale fechar antes
de integrar (ver Riscos residuais).

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 30 · fail 1 · blocked 0 · skip 1 | 31 de 35 cobertos (3 parciais, 1 sem execução) | 1 | 0 | resolved 6 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Contagem de TC: 11 conferidos nesta rodada (pass 9 · fail 1 · skip 1). Os outros 21 levam o veredito da rodada 1,
todos `pass`.

## Rodada

- **Ambiente:** loja http://localhost:8082 · painel http://localhost:8083 · Supabase local (API 127.0.0.1:54441)
- **Branch / build:** feature/103, worktree `store__feature-103`, depois das fix tasks 05–08 (commits `65d16a85`,
  `f414a988`, `845e8bfa`, `e09d6b71`). As sessões não expõem o build
- **Execução:** rodada 2 (confirmação), 2026-11-17. O reteste foi das 01:36 às 01:43. O briefing não informou o
  início e o fim das sessões (`duration_min: 0` = não informado)
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewports:** 390 × 844 e 1440 × 900, com a fonte da
  raiz a 100 %, 130 % e 200 % (CH-07 e reteste). Prévia em Celular e Computador (CH-05)
- **Personas e acesso:** PER-01 → `admin-loja` (CH-01, CH-05, CH-07), `admin-loja-2` (CH-08) e `admin-loja-3`
  (reteste). PER-02 → `anonima` (CH-02, a loja no CH-05 e no CH-07, e o reteste). PER-03 não rodou nesta rodada
  (CH-03 passou na rodada 1)

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — Validation 2 PASS, de 2026-11-17
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | loja e painel PASS, com o `.env` do Supabase local |
| lint  | pass   | store 2/2 e backoffice 23/5, iguais ao baseline; nenhum novo |
| test  | pass   | 21363/21363 (backoffice 5557 · store 7855 · core 6240 · functions 1711), exit 0 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

O veredito de cada TC é o desta rodada, quando foi conferido, ou o da rodada 1, quando não foi. "r2" marca os
conferidos agora.

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-005, TC-JOURNEY-001 (r2) | pass | covered |
| CA-01.2 | prd | TC-FUNC-006 (r2) | pass | covered |
| CA-01.3 | prd | TC-FUNC-003 | pass | covered |
| CA-01.4 | prd | TC-FUNC-003, TC-FUNC-008 (r2) | pass | covered |
| CA-01.5 | prd | TC-FUNC-013 | pass | covered |
| CA-01.6 | prd | TC-FUNC-007 (r2) | skip | missing |
| CA-02.1 | prd | TC-FUNC-002, TC-FUNC-021 | pass | covered |
| CA-02.2 | prd | TC-JOURNEY-001 (r2), TC-FUNC-008 (r2), TC-FUNC-012, TC-JOURNEY-003, TC-FUNC-021 | pass | covered |
| CA-02.3 | prd | TC-FUNC-006 (r2), TC-FUNC-012, TC-FUNC-021 | pass (selo da linha confirmado no reteste do BUG-002) | covered |
| CA-02.4 | prd | TC-FUNC-001, TC-FUNC-009 | pass | covered |
| CA-02.5 | prd | TC-FUNC-014 | pass | covered |
| CA-02.6 | prd | TC-FUNC-010, TC-FUNC-013 | pass | covered |
| CA-03.1 | prd | TC-FUNC-004 | pass | covered |
| CA-03.2 | prd | TC-FUNC-005, TC-FUNC-008 (r2), TC-JOURNEY-002 | pass | covered |
| CA-03.3 | prd | TC-FUNC-007 (r2), TC-UI-001 (r2) | skip · pass | partial |
| CA-03.4 | prd | TC-FUNC-004 | pass | covered |
| CA-03.5 | prd | TC-FUNC-003 | pass | covered |
| CA-03.6 | prd | TC-FUNC-020 | pass | covered |
| CA-04.1 | prd | TC-FUNC-016 (r2) | pass | covered |
| CA-04.2 | prd | TC-FUNC-015 | pass | covered |
| CA-04.3 | prd | TC-FUNC-015, TC-FUNC-016 (r2), TC-FUNC-017 (r2) | pass | covered |
| CA-04.4 | prd | TC-FUNC-018 | pass | covered |
| CA-04.5 | prd | TC-FUNC-019 (r2) | pass | covered |
| CA-04.6 | prd | TC-FUNC-003, TC-FUNC-008 (r2), TC-FUNC-019 (r2) | pass | covered |
| CA-05.1 | prd | TC-FUNC-005, TC-JOURNEY-001 (r2) | pass | covered |
| CA-05.2 | prd | TC-FUNC-011, TC-SEC-002 | pass | covered |
| CA-06.1 | prd | TC-SEC-001, TC-SEC-002, TC-REG-001 | pass | covered |
| RNF-01 | prd | TC-FUNC-001, TC-CFR-002 (r2) | pass | covered |
| RNF-02 | prd | TC-FUNC-008 (r2) | pass (ressalva: a fileira estava em esqueleto no instante medido; ver Riscos) | covered |
| RNF-03 | prd | TC-JOURNEY-003, TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001 (r2), TC-CFR-001 (r2), TC-CFR-002 (r2) | pass · fail (BUG-007) · pass | covered |
| RNF-05 | prd | TC-CFR-003 | pass | covered |
| RNF-06 | prd | TC-FUNC-007 (r2), TC-CFR-002 (r2) | skip · pass | partial |
| RNF-07 | prd | TC-CFR-001 (r2) | fail (BUG-007; a parte "não desenha vitrine" passou na rodada 1) | covered |
| RNF-08 | prd | TC-FUNC-007 (r2), TC-CFR-001 (r2) | skip · fail (BUG-007) | partial |

**Sem cobertura:**

- CA-01.6: o TC-FUNC-007 não rodou em nenhuma das duas rodadas, por orçamento do CH-01. Fora de TC, há evidência
  parcial. Nesta rodada, o CH-08 (TC-UI-002) viu a recusa do título com 61 caracteres ao salvar, como alerta,
  com o motivo e o número, e sem gravar (`screenshots/CH-08-r2-02-recusa-ao-salvar-61.png`). A descrição com 161
  caracteres, a 13ª peça e o Cancelar não foram tentados

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 (r2) | PER-01 | Feature (confirmação) | done | 43 de 35 | pass 2 · skip 1 | 1 | — (A-1 intermitente, risco) |
| CH-02 (r2) | PER-02 | Feature (confirmação) | done | 25 de 25 | pass 2 | 0 | — |
| CH-05 (r2) | PER-01 | Interrupt | done | 45 de 45 | pass 3 | 0 (1 nota no Debrief) | — |
| CH-07 (r2) | PER-01 · anonima | — | done | 62 comandos de 25 (~15 de interação) | pass 1 · fail 1 | 1 | BUG-007 |
| CH-08 (r2) | PER-01 | — | done | 18 de 20 | pass 1 | 1 | — |
| CH-03 | PER-03 | — | not-run (passou em todos os TC na rodada 1; vale aquele veredito) | — | — | — | — |
| CH-04 | PER-01 | — | not-run (passou em todos os TC na rodada 1; vale aquele veredito) | — | — | — | — |
| CH-06 | PER-01 | — | not-run (passou em todos os TC na rodada 1; vale aquele veredito) | — | — | — | — |
| Reteste | PER-01 · PER-02 | — | done | — | — | 3 no entorno (N-1, N-2, N-3) | BUG-007 (N-1) |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01 | fricção: a 200 %, o foco de subir, descer e remover fica debaixo da barra fixa ao voltar com Shift+Tab | BUG-007 |
| Responsividade        | J-01, J-02 | fricção no editor: sem rolagem lateral nas três fontes, mas a barra fixa cobre 54 % da tela a 200 %. Na Home, o bloco cabe em 390 a 100 % e a 200 %; a rolagem de 44 px a 200 % vem do cabeçalho da loja e de "Decorativos" (pré-existente) | BUG-007 |
| Performance percebida | — | não rodou (confirmação); rede lenta segue sem medir | — |
| Segurança visível     | J-05 | ok na rodada 1 (CH-03); não refeito | — |

## Design-check

- **Fonte de design:** artifact `SQehnBNiiQmbnjkY3QQpbq` (só os padrões de D-01), lido pela cópia decodificada
  da rodada 1
- **Status:** done (confirmação: TC-UI-002)
- **Divergências:** 0 bugs. A recusa ao salvar existe e segue a decisão I-06. O contador "61/60" sem estado de
  erro, igual ao da rodada 1, é `low` e vai a Sugestões de backlog (já estava lá)

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 1 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 1 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-007 | Fricção | medium | P2 | [Editor do bloco] A 200 % no celular, a barra fixa do topo cobre a lista de peças e o foco | PER-01 (condição do CFR: 200 % no celular) · J-01, ordenar as peças | TC-CFR-001 |

O BUG-007 quebra o RNF-04 ("o editor continua usável com a fonte do sistema a 200 %").

**Por que o BUG-007 vira bug numa rodada de confirmação.** Nesta rodada, só vira bug o que regrediu e o achado
novo `critical` ou `high`. O BUG-007 é `medium`, mas é regressão, e regressão causada pela correção do BUG-004.
Na rodada 1, a barra do topo não quebrava linha e não cobria a lista: os controles das peças estavam ao alcance
a 200 % (CH-07 da rodada 1, passo 02). Na rodada 2, a barra quebra linha, mede 345 px, segue grudada no topo e
cobre esses controles. Duas sessões viram isso, cada uma 2 de 2. O defeito está na superfície que o Work Item
muda, contraria um critério com fonte (RNF-04) e faz o TC-CFR-001 falhar. Não é `spec-gap`, nem pré-existente,
nem achado de exploração nova. Por isso não vai a backlog.

Também não é reabertura do BUG-004. O sintoma dele (rolagem lateral e "Salvar seção" fora da tela) não voltou: o
documento mede 390 px nas três fontes.

**Reabertos:** nada

## Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-007 | editor do bloco "Joias em oferta" · barra do topo do editor (Cancelar e "Salvar seção") | sozinho. Na rodada 1, a barra se mostrou comum aos editores da Home. Vale o Dev conferir os outros editores a 200 % depois da correção | medium |

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | Veredito | Status proposto | Severidade | Evidência |
| --- | ------------------------------------ | ------ | -------- | --------------- | ---------- | --------- |
| BUG-001 | [Editor do bloco] Gravar com peça acrescentada não dá "Salvo" e segue "Alterações não salvas" | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-001.png`, `screenshots/retest-r2-BUG-001-2.png` |
| BUG-002 | [Home do painel] Linha do bloco Joias em oferta diz "No ar" quando ele não aparece na loja | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-002.png` |
| BUG-003 | [Home da loja] No celular a página rola de lado na fileira de Joias em oferta — visitante | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-003.png`, `screenshots/retest-r2-BUG-003-390-100.png`, `screenshots/retest-r2-BUG-003-390-200.png` |
| BUG-004 | [Editor do bloco] Fonte a 200 % no celular empurra "Salvar seção" para fora da tela | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-004.png`, `screenshots/retest-r2-BUG-004-salvar-200.png` |
| BUG-005 | [Editor do bloco] Falha ao ler as peças da campanha deixa "Conferindo…" sem fim, sem aviso | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-005.png` |
| BUG-006 | [Home do painel] Peça escolhida apagada fica fora da contagem "N das M saíram do ar" | reteste | resolved | open → resolved | mantida | `screenshots/retest-r2-BUG-006.png` |

Os vereditos `resolved` também se confirmaram nas sessões: CH-01 (BUG-001), CH-02 e CH-07 (BUG-003), CH-05
(BUG-005 e BUG-006) e CH-07 (BUG-004). Pelas sessões, nenhum bug resolvido voltou.

Notas para o Histórico. No BUG-002, o reteste não exercitou o estado "sem campanha", porque a massa não permitia
criar bloco novo. No BUG-004, a correção deu origem ao BUG-007.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- A barra fixa a 200 % cobre as peças e recebe o toque (N-1 do reteste) e esconde o foco ao voltar com Shift+Tab
  (CH-07 r2, A-1): mesma causa observável, juntados num bug só, o BUG-007, com as duas ocorrências
- Salvar logo depois de remover uma peça não deu "Salvo" no primeiro clique (CH-01 r2, A-1, `screenshots/CH-01-r2-02-salvo-sem-peca.png`):
  intermitente sem segunda ocorrência. Foi 1 de 1, com os cliques disparados em sequência imediata pelo driver,
  sem console e sem rede lidos. Há contraprova: remover e salvar deu "Salvo" no reteste do BUG-001 (a 1440 e a
  390 com fonte 200 %) e no CH-05 r2, passos 07 e 12. O sintoma também difere do BUG-001: não fica "Alterações
  não salvas". Não é reabertura. Vai a Riscos residuais
- A Home a 200 % rola 44 px de lado pelo cabeçalho da loja e pelas setas de "Decorativos" (N-2 do reteste, CH-07
  r2, passos 10–11): defeito pré-existente e fora da superfície da mudança. O bloco fica em 0–390, e `/ofertas`,
  onde o bloco não existe, rola 552 px. Abaixo de `high`, vai a Sugestões de backlog
- A mensagem de falha da conferência termina com "ler as peças da campanha: TypeError: Failed to fetch" (N-3 do
  reteste, CH-05 r2, passo 09): achado novo `low`. A mensagem certa e o "Tentar de novo" estão lá, e o TC-FUNC-017
  passa. Não é regressão, então na confirmação vai a Sugestões de backlog
- O contador do título fica em "61/60" sem estado de erro depois da recusa (CH-08 r2, A-1): `low` e não é
  regressão, porque a rodada 1 viu o mesmo. Já estava em Sugestões de backlog da rodada 1 e segue lá
- Esqueleto da fileira com a leitura de produtos bloqueada (CH-02 r2, passo 05, ressalva do TC-FUNC-008): o fim
  não foi observado. Ficou visto só no instante logo depois de recarregar, e não há evidência de que fique preso.
  Vai a Riscos residuais
- A prévia mostra o título cancelado (A-3 da rodada 1): não reproduzível com a massa desta rodada. O B-3, de
  campanha encerrada, não aparece na prévia, e a tentativa não prova nem desmente nada. Segue como intermitente
  sem segunda ocorrência, em Riscos residuais

## Perguntas ao produto

nada. A rodada de confirmação não faz pergunta ao produto.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Com a fonte a 200 % em 390, a Home rola 44 px de lado pelo grupo de ações do cabeçalho da loja (até x 426), pelas setas da fileira "Decorativos" (até x 395) e pelo halo do WhatsApp (até x 414). `/ofertas` rola 552 px pelo "Ver em uma coluna" (reteste N-2, CH-07 r2) | loja · cabeçalho, fileira "Decorativos", `/ofertas` | pré-existente | Loja sem rolagem lateral com a fonte a 200 % no celular |
| A mensagem "Não foi possível conferir as peças da campanha…" termina com o texto técnico "ler as peças da campanha: TypeError: Failed to fetch" (reteste N-3, CH-05 r2) | editor do bloco · Peças escolhidas (aviso de falha da conferência) | polimento | Aviso de falha do editor sem texto técnico do erro |
| Acima de 60/160, o contador fica em cinza, sem estado de erro nem campo marcado inválido, mesmo depois da recusa ao salvar (CH-08 r2 A-1; reiterado da rodada 1) | editor do bloco · Conteúdo | polimento | Contador do título e da descrição do bloco marca o estouro ao digitar |

As sugestões da rodada 1 continuam valendo como estão em `qa-result-2026-11-17-rodada-1.md`. Não se repetem aqui,
exceto a do contador, que esta rodada viu de novo.

## Evidências não enviadas

nada

## Riscos residuais

- **Salvar logo depois de remover sem recibo** (CH-01 r2, A-1; 1 de 1; `screenshots/CH-01-r2-02-salvo-sem-peca.png`).
  Se reproduzir, é `high` na área do BUG-001: a dona não sabe se a peça saiu. Há contraprova em três leituras
  (reteste e CH-05 r2). Para fechar, remover e salvar em sequência imediata, duas vezes de estado limpo, lendo o
  console e a rede
- **Esqueleto da fileira com produtos bloqueados** (CH-02 r2, passo 05; TC-FUNC-008 passo 3). A Home e os
  cartões ficaram de pé (RNF-02), mas a área da fileira mostrava "Algumas das peças em oferta", as setas e vagas
  em esqueleto, quando o esperado é a fileira sumir. Não se viu se o esqueleto fica preso. A Validation já tinha
  deixado esse caso como "Não conferido" na loja. Conferência curta: bloquear, recarregar, esperar cerca de 10 s
  e olhar
- **Prévia com rascunho cancelado** (A-3 da rodada 1, 1 de 1, sem screenshot). Não reproduzível com o B-3. Se
  confirmado, é `high`. Precisa de um bloco que apareça na prévia (o B-1)
- **Barra fixa compartilhada:** pela rodada 1, a barra do topo é comum aos editores da Home. Os outros editores
  podem ter, a 200 %, a mesma cobertura do BUG-007. Não foi medido
- **TC-FUNC-007 sem execução nas duas rodadas:** o CA-01.6 fica sem caso executado. Só a recusa do título com 61
  caracteres foi vista, fora de TC
- **Rede lenta não medida** (TC-UI-001 passo 1, TC-CFR-002): o driver não atrasa resposta

## Fora da cobertura

- CH-03, CH-04 e CH-06 não rodaram nesta rodada, por regra da confirmação: passaram em todos os TC na rodada 1, e
  aquele veredito vale
- TC-FUNC-007 (P1) inteiro (título com 61, descrição com 161, 13ª peça e Cancelar), por orçamento do CH-01 r2.
  Na massa de B-2, a 13ª peça nem seria alcançável
- TC-JOURNEY-001 passo 6 (a loja como visitante) e TC-FUNC-006 passos 2–3 (a linha e reabrir): não reconferidos.
  Passaram na rodada 1
- TC-FUNC-008 passo 4 (tirar o bloqueio e recarregar) e o fim do passo 3 (se o esqueleto some), por orçamento
- TC-CFR-001: rótulos (snapshot), recusa com 61 caracteres como alerta, Tab do título ao Salvar e foco no seletor
  de campanha não foram refeitos. Passaram na rodada 1, exceto o que o BUG-004 cobria
- TC-CFR-002: rede lenta, 320 × 568 e 1440 × 900
- TC-UI-002: a lista com subir, descer e remover (B-3 sem peças) e a recusa da descrição com 161
- O "Tentar de novo" com a leitura ainda bloqueada: não se viu se a falha volta a ser dita (CH-05 r2)
- BUG-002 no estado "sem campanha": a massa não permitia criar bloco novo
- Persona PER-03 sem sessão nesta rodada (o CH-03 passou na rodada 1)
- Engines além do Chromium, leitor de tela real
