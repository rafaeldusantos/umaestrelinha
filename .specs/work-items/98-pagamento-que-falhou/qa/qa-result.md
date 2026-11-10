```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-10T11:59:00Z",
  "branch": "master (árvore de trabalho com o WI 98 sem commit, fix tasks até 21)",
  "duration_min": 5,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "PASS — pnpm build exit 0 (3/3)"
    },
    {
      "name": "lint",
      "command": "—",
      "status": "pass",
      "summary": "PASS — store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 (era 1/0)"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<workspace> test --testTimeout=20000 (um workspace por vez)",
      "status": "pass",
      "summary": "22492/22492"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 55,
    "acceptance_covered": 44,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-SEC-003", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.3", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.4", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.5", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-05.6", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.7", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.8", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2a", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2b", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3a", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-INT-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5a", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-03.5b", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.7", "validated_by": { "tc_ref": "TC-INT-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.8", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.9", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.16", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.10", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.11", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.12", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.13", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.14", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.15", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.1a", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.2", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.3", "validated_by": { "tc_ref": "TC-INT-004", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-06.4", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.5", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.6", "validated_by": { "tc_ref": "TC-INT-009", "type": "integration" }, "status": "partial" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-FUNC-027", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-08", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-09", "validated_by": { "tc_ref": "TC-FUNC-026", "type": "e2e" }, "status": "covered" }
    ],
    "missing": ["CA-01.4", "CA-05.5", "CA-03.5a", "CA-06.3"]
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "blocked" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
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
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-027", "verdict": "pass" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "blocked" },
    { "tc_ref": "TC-INT-002", "verdict": "pass" },
    { "tc_ref": "TC-INT-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-004", "verdict": "blocked" },
    { "tc_ref": "TC-INT-005", "verdict": "blocked" },
    { "tc_ref": "TC-INT-006", "verdict": "pass" },
    { "tc_ref": "TC-INT-007", "verdict": "blocked" },
    { "tc_ref": "TC-INT-008", "verdict": "pass" },
    { "tc_ref": "TC-INT-009", "verdict": "blocked" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "retest-BUG-010.png", "path": "screenshots/retest-BUG-010.png" },
    { "label": "retest-BUG-013.png", "path": "screenshots/retest-BUG-013.png" },
    { "label": "retest-r3-QA-P1-conta.png", "path": "screenshots/retest-r3-QA-P1-conta.png" },
    { "label": "retest-r3-QA-P1-pedido-0563.png", "path": "screenshots/retest-r3-QA-P1-pedido-0563.png" },
    { "label": "retest-r3-novo-rota-pagamento-0563.png", "path": "screenshots/retest-r3-novo-rota-pagamento-0563.png" },
    { "label": "retest-r3-BUG-012-320-200.png", "path": "screenshots/retest-r3-BUG-012-320-200.png" },
    { "label": "retest-r3-BUG-011-0579.png", "path": "screenshots/retest-r3-BUG-011-0579.png" },
    { "label": "retest-r3-registrar-320-200.png", "path": "screenshots/retest-r3-registrar-320-200.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 98 · O pagamento que falhou: pagar de novo na loja, e o pago por fora registrado no painel

**Gate 3:** confirmado em 2026-11-10 (sob o pedido do humano de seguir até o QA sem parar)

> Rodada 3 (confirmação, só reteste). Os resultados da rodada 2 (confirmação) e da rodada 1 (exploração), as
> duas com Gate 3 confirmado em 2026-11-10, estão preservados no fim deste arquivo, em **Histórico — rodada 2**
> e **Histórico — rodada 1**.

## Resumo

**Veredito:** partial — nenhum bug aberto ao fim da rodada e nenhum TC P0 falha, mas TC P0 (TC-JOURNEY-002,
TC-INT-005) e P1 seguem `blocked` pelo ambiente desde a rodada 1, e TC-FUNC-023 segue `blocked` por falta de massa

A rodada de confirmação retestou os dois bugs que a rodada 2 deixou abertos, depois das fix tasks 20 e 21, e
conferiu o entorno pedido: a decisão QA-P1 (tarefa 19), o link de cartão em 320 (BUG-012) e o registro sem e-mail
(BUG-011/BUG-006). Os dois estão resolvidos: na tela "Registrar pagamento", o "Limpar data" e o botão da data têm
44 px de altura e largura em 390 e em 320 (BUG-010); no pedido, o e-mail de quem registrou quebra dentro da linha,
no bloco "Registrado à mão" e no Histórico, a 390 com a fonte a 200 % (BUG-013). A cliente com pedido de pagamento
combinado (#0563) vê, em `/conta` e no pedido, "O pagamento deste pedido é combinado comigo" com o WhatsApp, sem
valor e sem "Gerar novo PIX", e o PIX vencido cobrado pela loja continua oferecendo "Gerar novo PIX". O foco vai ao
título do pedido depois de registrar, e a frase do aviso pulado é coerente com o histórico.

O que o entorno achou, nenhum como bug: o rótulo "Comprovantes" faz a tela de registrar rolar de lado em 320 com a
fonte a 200 % (N-1); o botão "Em Separação" do pedido passa 0,56 px da borda a 390/200 % (N-2, o resto do estouro
pré-existente da rodada 1); e quem abre à mão a rota de pagamento de um pedido combinado lê "falha do lado do banco",
o valor e "Tentar gerar o código de novo" (N-3) — nenhuma tela leva a essa rota nesse estado e nada é cobrado. Os
três ficam abaixo de high e nenhum é regressão desta rodada: vão a Sugestões de backlog.

Decide o veredito `partial`: nenhum bug fica aberto e nenhum TC P0 falha, mas a cobrança real pelo Mercado Pago
(TC-JOURNEY-002, TC-INT-005), os e-mails e o TC-FUNC-023 sem massa seguem `blocked` e impedem `pass`.

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 40 · fail 0 · blocked 8 · skip 0 | 44 de 55 cobertos (7 parciais, 4 sem cobertura) | 0 | 0 | resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Os vereditos de TC são o estado consolidado: os 2 TC que falhavam na rodada 2 (TC-UI-001 e TC-CFR-003) foram
reconferidos pelo reteste dos bugs deles e passam; os outros 46 levam o veredito da rodada 2, sem nova execução.

## Rodada

- **Ambiente:** loja `http://localhost:8082`, painel `http://localhost:8083`, Supabase local;
  `*.supabase.co`, `accounts.google.com` e `**/g/collect*` abortados por rota; nenhum cartão digitado;
  "Entrar com Google" não usado; WhatsApp não clicado
- **Branch / build:** master, árvore de trabalho com o WI 98 sem commit (fix tasks até 21) · `pnpm dev` (build
  não exposto)
- **Execução:** 2026-11-10, 08:54 → 08:59 BRT (11:54 → 11:59 UTC, 5 min)
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewports:** 390 × 844 e
  320 × 568; fonte da raiz a 100/130/200 %
- **Personas e acesso:** PER-01 → conta `admin`; PER-03 → conta `cliente`

## Gate técnico

- **Validation do Dev:** `.specs/work-items/98-pagamento-que-falhou/qa-report.md` — PASS, de 2026-11-10
  (rodada 4, depois das fix tasks 10–21)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build` exit 0 (3/3) |
| lint  | pass   | store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 — o relatório não traz o comando |
| test  | pass   | 22492/22492, um workspace por vez (o `Summary` do relatório; a tabela por workspace da rodada 4 soma 22570 — ver Riscos residuais) |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.2 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.3 | prd | TC-FUNC-024 | pass | covered |
| CA-01.4 | prd | TC-INT-007 | blocked | missing |
| CA-01.5 | prd | TC-INT-006 | pass (só o valor exibido) | covered |
| CA-01.6 | prd | TC-INT-006 | pass (só o valor exibido; QA-P1 conferida no entorno do reteste) | covered |
| CA-02.1 | prd | TC-FUNC-019 | pass | covered |
| CA-02.2 | prd | TC-FUNC-019 | pass | covered |
| CA-02.3 | prd | TC-FUNC-019, TC-FUNC-020 | pass · pass | covered |
| CA-02.4 | prd | TC-FUNC-021, TC-FUNC-017, TC-SEC-003 | pass | covered |
| CA-05.1 | prd | TC-FUNC-014 | pass | covered |
| CA-05.2 | prd | TC-JOURNEY-002, TC-SEC-002 | blocked · pass | partial |
| CA-05.3 | prd | TC-JOURNEY-002, TC-INT-006 | blocked · pass | partial |
| CA-05.4 | prd | TC-FUNC-015 | pass | covered |
| CA-05.5 | prd | TC-INT-005 | blocked | missing |
| CA-05.6 | prd | TC-FUNC-016, TC-SEC-002 | pass | covered |
| CA-05.7 | prd | TC-FUNC-017 | pass | covered |
| CA-05.8 | prd | TC-INT-008 | pass | covered |
| CA-03.1 | prd | TC-FUNC-001 | pass | covered |
| CA-03.2 | prd | TC-FUNC-002, TC-FUNC-004, TC-JOURNEY-001 | pass | covered |
| CA-03.2a | prd | TC-FUNC-002 | pass | covered |
| CA-03.2b | prd | TC-FUNC-002, TC-FUNC-003 | pass | covered |
| CA-03.3 | prd | TC-JOURNEY-001 | pass (registro sem e-mail no #0579 no entorno) | covered |
| CA-03.3a | prd | TC-FUNC-006 | pass | covered |
| CA-03.4 | prd | TC-INT-003 | pass (estoque; cupom não relido) | covered |
| CA-03.5 | prd | TC-FUNC-005 | pass | covered |
| CA-03.5a | prd | TC-INT-007 | blocked | missing |
| CA-03.5b | prd | TC-FUNC-013 | pass | covered |
| CA-03.6 | prd | TC-FUNC-007, TC-JOURNEY-001 | pass · pass | covered |
| CA-03.7 | prd | TC-INT-002 | pass | covered |
| CA-03.8 | prd | TC-INT-001, TC-JOURNEY-001 | blocked · pass | partial |
| CA-03.9 | prd | TC-FUNC-010, TC-FUNC-011, TC-REG-001 | pass | covered |
| CA-03.16 | prd | TC-FUNC-012, TC-FUNC-023 | pass · blocked (BUG-005 sem massa) | partial |
| CA-03.10 | prd | TC-FUNC-004 | pass | covered |
| CA-03.11 | prd | TC-FUNC-008, TC-INT-002, TC-INT-003 | pass | covered |
| CA-03.12 | prd | TC-FUNC-009 | pass | covered |
| CA-03.13 | prd | TC-FUNC-009 | pass | covered |
| CA-03.14 | prd | TC-FUNC-008 | pass | covered |
| CA-03.15 | prd | TC-INT-008 | pass | covered |
| CA-04.1 | prd | TC-FUNC-007 | pass | covered |
| CA-04.2 | prd | TC-SEC-001 | pass | covered |
| CA-04.3 | prd | TC-FUNC-022 | pass | covered |
| CA-06.1 | prd | TC-INT-008 | pass | covered |
| CA-06.1a | prd | TC-INT-008 | pass | covered |
| CA-06.2 | prd | TC-INT-008 | pass | covered |
| CA-06.3 | prd | TC-INT-004, TC-INT-007 | blocked | missing |
| CA-06.4 | prd | TC-FUNC-013 | pass | covered |
| CA-06.5 | prd | TC-FUNC-024 | pass | covered |
| CA-06.6 | prd | TC-INT-009, TC-FUNC-025, TC-INT-004 | blocked · pass · blocked | partial |
| RNF-01 | prd | TC-FUNC-022, TC-JOURNEY-001, TC-INT-002 | pass | covered |
| RNF-03 | prd | TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001, TC-JOURNEY-001, TC-CFR-003 | pass (reteste BUG-010) · pass · pass (reteste BUG-013; ressalva N-2, pré-existente) | covered |
| RNF-06 | prd | TC-FUNC-027 | pass | covered |
| RNF-08 | prd | TC-FUNC-007, TC-FUNC-026 | pass | covered |
| RNF-09 | prd | TC-FUNC-026 | pass | covered |

**Sem cobertura:**
- CA-01.4 — o código PIX novo não se cria no local (Mercado Pago com chave inválida); TC-INT-007 `blocked`
- CA-05.5 — a cobrança pelo link de cartão não foi feita (chaves externas inválidas no servidor); TC-INT-005 `blocked`
- CA-03.5a — o fechamento da cobrança aberta acontece no Mercado Pago e não é visível na tela; TC-INT-007 `blocked`
- CA-06.3 — idem, no cancelamento; TC-INT-004 e TC-INT-007 `blocked`

**Nota de triagem:** TC-UI-001 passa: o reteste do BUG-010 mede todo botão da tela de registrar com pelo menos
44 px em 390 e 320 a 100 % (as condições do TC); N-1 aparece só em 320 com a fonte a 200 %, fora delas.
TC-CFR-003 passa com ressalva: o bloco Pagamento e o Histórico cabem em 390 a 100/130/200 % e a tela de registrar
cabe em 390 a 200 %; o documento do pedido a 200 % mede 391 por 0,56 px do botão "Em Separação" (N-2), o mesmo
estouro pré-existente que a rodada 1 já tratou como sugestão de backlog e que não reprovou o TC lá.

## Sessões

Nenhuma sessão de charter nesta rodada: a confirmação foi só o reteste (`retest.md`, rodada 3), sem charter novo
nem exploração.

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| reteste | PER-01, PER-03 | — | done | 2 bugs × 2 tentativas + 5 conferências de entorno | reconferidos 2: pass 2 | 3 (N-1, N-2, N-3) | — |

## CFR

Não rodou como charter nesta rodada (só reteste). O que o reteste mediu: os alvos da data em 390 e 320 a
100/130/200 % (BUG-010, ok), o pedido a 390 com a fonte a 100/130/200 % (BUG-013, ok; N-2), a tela de registrar
em 320 a 200 % (N-1), o link de cartão em 320/390 a 100/200 % (BUG-012, ok) e o foco depois de registrar (BUG-011,
ok).

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01 | ok (alvos ≥ 44 px em 390 e 320; foco no `H1` do pedido) | — |
| Responsividade        | J-01, J-02, J-04, J-05 | ok nas metas dos TC; ressalvas fora delas: 320 a 200 % na tela de registrar (N-1) e 0,56 px pré-existente no pedido a 390/200 % (N-2) | — |
| Performance percebida | — | não medida nesta rodada | — |
| Segurança visível     | J-05 | ok (a rota de pagamento do pedido combinado só recebeu a recusa 409; nada cobrado) | — |

## Design-check

- **Protótipo:** sem protótipo no Work Item (decisão do humano: seguir sem design)
- **Status:** not-run (sem fonte de design)
- **Divergências:** 0 — nenhuma

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-010 | [Registrar pagamento] Botão da data (40 px) e "Limpar data" (36 px) abaixo de 44 px no celular | reteste | still-open → resolved | mantida (medium) | `screenshots/retest-BUG-010.png` |
| BUG-013 | [Pedido · bloco Pagamento e Histórico] O e-mail de quem registrou não quebra e faz o pedido rolar de lado em 390 com a fonte a 200 % — para a dona | reteste | open → resolved | mantida (medium) | `screenshots/retest-BUG-013.png` |

Linhas do Histórico a gravar no Gate 3 (uma por bug, rodada 2026-11-10 r3):
- BUG-010 — `still-open → resolved` · reteste, 2 de 2 tentativas (#0579 e #0553): "Limpar data" 44 × 44 em 390 e
  em 320 (`h-11 w-11 shrink-0`), o botão da data 244 × 44 (390) e 174 × 44 (320); 57,2 × 57,2 a 130 % e 88 × 88 a
  200 %
- BUG-013 — `open → resolved` · reteste, 3 de 3 pedidos (#0549, #0550, #0579): a 390/200 % o e-mail quebra no
  Histórico (termina em x = 309, 200 px de altura) e no bloco "Registrado à mão" (x = 309, 80 px); eram 506 e 426.
  O documento ainda mede 391 pelo botão "Em Separação" (N-2, outra peça, pré-existente)

**Reteste `blocked`:** nada

## Achados que não viraram bug

- N-1 (o rótulo "Comprovantes" leva a tela de registrar a 389 px em 320 × 568 com a fonte a 200 %; o "Abrir menu"
  do topo mede 40 × 88) — defeito low sem regressão: em 320 a 100/130 % e em 390 a 200 % a tela cabe; 320 a
  200 % fica fora das condições do TC-UI-001 (320 a 100 %) e do TC-CFR-003 (390), não foi medido antes e não há
  sinal de que as fix tasks 20–21 o trouxeram; 1 de 1 medição. Régua da confirmação → Sugestões de backlog
  (`polimento`; o "Abrir menu" é o cabeçalho do painel, `pré-existente`)
- N-2 (o botão "Em Separação" da linha "Outro status" passa 0,56 px da borda a 390/200 %, `scrollX` 1) — a mesma
  causa da sugestão de backlog da rodada 1 "O pedido a 200 % em 390 rola 36 px de lado" (`pré-existente`; a
  rodada 2 já registrou "o botão 'Em Separação' … passando 1 px da borda continua como sugestão da rodada 1").
  Não é regressão: o que restou depois do BUG-013 é a parte que não é deste Work Item. Fica na sugestão existente,
  com a medida atualizada abaixo
- N-3 (aberta à mão, `/pedido/<#0563>/pagamento` chama `create-payment` → 409 `order_without_store_charge` e diz
  "A falha foi do lado do banco", mostra "R$ 10,00 · valor do pedido, ainda não cobrado" e "Tentar gerar o código de
  novo") — defeito low sem regressão: o esperado tem fonte (decisão QA-P1, tarefa 19), mas nenhuma tela leva a
  essa rota nesse estado (`/conta` e o pedido mostram a mensagem da decisão), o servidor recusa e nada é cobrado;
  antes da tarefa 19 a mesma rota tentava gerar o PIX de R$ 10,00, que é o que a decisão proibiu — a recusa
  melhorou o resultado e deixou a frase errada. 1 de 1. Régua da confirmação → Sugestões de backlog
  (`polimento`); sobe para medium se algum e-mail ou link antigo levar à rota (ver Riscos residuais)
- Entorno sem achado: QA-P1 em `/conta` e em `/pedido/<#0563>` (ok), o par do PIX vencido cobrado pela loja
  (#0560, ok), `/pagar-com-cartao` em 320 e 390 a 100/200 % (BUG-012, ok), o registro sem e-mail no #0579 com foco
  no `H1` e frase coerente com o histórico (BUG-011/BUG-006, ok) — `conforme a fonte`

## Perguntas ao produto

nada — rodada de confirmação; a decisão QA-P1 (`decisoes-produto.md`) já está decidida e aplicada

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Aberta pelo endereço, a rota de pagamento de um pedido de pagamento combinado (#0563) diz "falha do lado do banco", mostra o valor e oferece "Tentar gerar o código de novo", em vez da mensagem da decisão QA-P1; o servidor recusa (409) e nada é cobrado | loja, Pagamento do pedido (`/pedido/:id/pagamento`) | polimento | Rota de pagamento do pedido combinado mostra "combinado comigo" com o WhatsApp, sem valor nem nova tentativa |
| O rótulo "Comprovantes" faz a tela rolar de lado (389 px) em 320 × 568 com a fonte a 200 % | painel, Registrar pagamento, campo Comprovantes | polimento | Campo Comprovantes sem rolagem lateral em 320 com a fonte grande |
| O botão "Abrir menu" do topo mede 40 × 88 em 320 a 200 % (largura abaixo de 44) | painel, cabeçalho no celular | pré-existente | Alvo de 44 px no "Abrir menu" do painel no celular |
| O pedido a 390 com a fonte a 200 % ainda rola 1 px de lado pelo botão "Em Separação" (`whitespace-nowrap`, 309,56 px) — atualiza a sugestão da rodada 1 (eram 36 px; o resto veio do BUG-013, resolvido) | painel, Pedido, linha "Outro status" | pré-existente | Pedido do painel sem rolagem lateral com a fonte a 200 % |

As sugestões das rodadas 1 e 2 continuam valendo como estão nos históricos abaixo.

## Riscos residuais

- N-3: se algum e-mail já enviado (ou um link antigo, guardado pela cliente) apontar para `/pedido/<id>/pagamento`
  de um pedido de pagamento combinado, a cliente lê que o banco falhou e é convidada a tentar de novo — o que
  contradiz a decisão QA-P1. Não foi conferido se algum e-mail da loja leva a essa rota. Se levar, o achado sobe
  para medium e pede fix task
- N-1 e N-2 foram medidos uma vez (N-1) e em 3 pedidos (N-2) só por script, sem imagem própria de N-2; o
  "Desfazer registro", o "Gerar link" e os comprovantes do bloco Pagamento a 200 % continuam sem medida isolada
- O BUG-006 (rede cortada depois de confirmar sem e-mail) não foi refeito com a rede cortada nesta rodada — só o
  caminho feliz do registro sem e-mail
- No #0579, registrado nesta rodada, não foi conferido se o link de cartão dele foi revogado pelo registro
- BUG-005 segue `cannot-reproduce` desde a rodada 2, provado só por teste (tarefa 13)
- Gate `test`: o `Summary` do `qa-report.md` rodada 4 (22492) não bate com a soma da tabela por workspace
  (5718 + 1669 + 7188 + 5266 + 2729 = 22570); copiado o `Summary`, como manda o contrato
- Os vereditos de TC desta rodada vêm do reteste dos passos dos bugs e do entorno, não de uma nova execução dos
  TC inteiros

## Fora da cobertura

- Nenhum charter rodou nesta rodada; só os TC dos dois bugs retestados foram reconferidos
- TC-JOURNEY-002 (P0) e TC-INT-005 (P0): pagar no Brick pelo link de cartão — chaves externas inválidas no
  servidor; seguem `blocked` desde a rodada 1
- TC-JOURNEY-003, TC-INT-007: o PIX novo e o fechamento da cobrança anterior — Mercado Pago local `UNAUTHORIZED`
- TC-INT-001, TC-INT-004, TC-INT-009: e-mails às clientes (Resend com chave inválida) e o evento "Pedido
  cancelado" desligado
- TC-FUNC-023: sem pedido da `cliente` em Separando com pagamento pendente (BUG-005 `cannot-reproduce`)
- PIX vencido de checkout comum dentro do prazo na conta `cliente` para o par da QA-P1 — sem massa; conferido com o
  pedido montado #0560
- 1440, o app do ateliê (`:8084`) e a loja anônima não foram abertos nesta rodada
- Fonte do sistema real, leitor de tela real, Android/iPhone real e a câmera tirando a foto — fora do navegador
  da sessão

---

## Histórico — rodada 2 (confirmação)

Preservado sem alteração de conteúdo (os títulos desceram um nível). Envelope original da rodada 2:

```text
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-10T11:20:00Z",
  "branch": "master (árvore de trabalho com o WI 98 sem commit, fix tasks 10–18)",
  "duration_min": 7,
  "gates": [
    { "name": "build", "command": "pnpm build", "status": "pass", "summary": "PASS — pnpm build exit 0 (3/3)" },
    { "name": "lint", "command": "—", "status": "pass", "summary": "PASS — store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 (era 1/0)" },
    { "name": "test", "command": "pnpm --filter @estrelinha/<workspace> test --testTimeout=20000 (um workspace por vez)", "status": "pass", "summary": "22492/22492" },
    { "name": "e2e", "command": "—", "status": "skip", "summary": "sem rodada E2E" }
  ],
  "coverage": {
    "acceptance_total": 55,
    "acceptance_covered": 44,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-SEC-003", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.3", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.4", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.5", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-05.6", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.7", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.8", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2a", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2b", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3a", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-INT-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5a", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-03.5b", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.7", "validated_by": { "tc_ref": "TC-INT-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.8", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.9", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.16", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.10", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.11", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.12", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.13", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.14", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.15", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.1a", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.2", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.3", "validated_by": { "tc_ref": "TC-INT-004", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-06.4", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.5", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.6", "validated_by": { "tc_ref": "TC-INT-009", "type": "integration" }, "status": "partial" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-FUNC-027", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-08", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-09", "validated_by": { "tc_ref": "TC-FUNC-026", "type": "e2e" }, "status": "covered" }
    ],
    "missing": ["CA-01.4", "CA-05.5", "CA-03.5a", "CA-06.3"]
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "blocked" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
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
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-027", "verdict": "pass" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "blocked" },
    { "tc_ref": "TC-INT-002", "verdict": "pass" },
    { "tc_ref": "TC-INT-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-004", "verdict": "blocked" },
    { "tc_ref": "TC-INT-005", "verdict": "blocked" },
    { "tc_ref": "TC-INT-006", "verdict": "pass" },
    { "tc_ref": "TC-INT-007", "verdict": "blocked" },
    { "tc_ref": "TC-INT-008", "verdict": "pass" },
    { "tc_ref": "TC-INT-009", "verdict": "blocked" },
    { "tc_ref": "TC-UI-001", "verdict": "fail", "bug_ref": "BUG-010" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "fail", "bug_ref": "BUG-013" }
  ],
  "evidence": [
    { "label": "retest-BUG-001.png", "path": "screenshots/retest-BUG-001.png" },
    { "label": "retest-BUG-002.png", "path": "screenshots/retest-BUG-002.png" },
    { "label": "retest-BUG-003.png", "path": "screenshots/retest-BUG-003.png" },
    { "label": "retest-BUG-004.png", "path": "screenshots/retest-BUG-004.png" },
    { "label": "retest-BUG-005.png", "path": "screenshots/retest-BUG-005.png" },
    { "label": "retest-BUG-006.png", "path": "screenshots/retest-BUG-006.png" },
    { "label": "retest-BUG-007.png", "path": "screenshots/retest-BUG-007.png" },
    { "label": "retest-BUG-008.png", "path": "screenshots/retest-BUG-008.png" },
    { "label": "retest-BUG-009.png", "path": "screenshots/retest-BUG-009.png" },
    { "label": "retest-BUG-010.png", "path": "screenshots/retest-BUG-010.png" },
    { "label": "retest-BUG-011.png", "path": "screenshots/retest-BUG-011.png" },
    { "label": "retest-BUG-012.png", "path": "screenshots/retest-BUG-012.png" },
    { "label": "retest-novo-historico-200.png", "path": "screenshots/retest-novo-historico-200.png" }
  ],
  "issues": {
    "total": 1,
    "by_severity": { "critical": 0, "high": 0, "medium": 1, "low": 0 }
  }
}
```

### Resultado de QA — rodada 2

**Gate 3:** confirmado em 2026-11-10 (sob o pedido do humano de seguir até o QA sem parar)

> Rodada 2 (confirmação, só reteste). O resultado da rodada 1 (exploração, Gate 3 confirmado em 2026-11-10)
> está preservado no fim deste arquivo, em **Histórico — rodada 1**.

### Resumo

**Veredito:** partial — nenhum bug critical ou high aberto e o TC P0 TC-JOURNEY-001 passa, mas TC P0
(TC-JOURNEY-002, TC-INT-005) e P1 seguem `blocked` pelo ambiente desde a rodada 1, e TC-FUNC-023 ficou
`blocked` por falta de massa

A rodada de confirmação retestou os 12 bugs abertos depois das fix tasks 10–18, no painel e na loja locais,
em 390, 320 e 1440 e com a fonte a 100/200 %. Dez estão resolvidos: a Adri, no celular, anexa os comprovantes
em qualquer ordem e em várias escolhas e o registro os grava (BUG-001); o desfazer deixa na página a
observação, os comprovantes e o motivo (BUG-002), não oferece mais "Enviar agora" do "Pagamento aprovado"
(BUG-003) e não aparece no pedido pago duas vezes (BUG-004); a frase do aviso pulado diz a verdade quando a
anotação falha (BUG-006); a cliente vê o cartão em análise como "ainda não foi confirmado" (BUG-007); o bloco
mostra só o meio informado (BUG-008) e o histórico diz quem registrou (BUG-009); o foco vai ao título do pedido
depois de registrar e de desfazer (BUG-011); e o link de cartão cabe em 320 a 200 % (BUG-012).

O que ainda não está bom: o "Limpar data" ganhou altura mas encolheu de largura e mede 40 × 44 (BUG-010,
`still-open`); e o conserto do BUG-009 trouxe uma linha nova no histórico cujo e-mail não quebra, levando o
pedido a rolar de lado em 390 com a fonte a 200 % (BUG-013, novo, medium). O BUG-005 não pôde ser reproduzido:
o estado de partida (pedido da cliente em Separando sem pagamento) não existe mais na massa nem se cria pela
interface; o conserto está provado só por teste (tarefa 13).

Decide o veredito `partial`: os bugs abertos ao fim são dois medium, e nenhum TC P0 falha, mas TC P0/P1
`blocked` (cobrança real pelo Mercado Pago, e-mails, e o TC-FUNC-023 sem massa) impedem `pass`.

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 38 · fail 2 · blocked 8 · skip 0 | 44 de 55 cobertos (7 parciais, 4 sem cobertura) | 1 | 0 | resolved 10 · still-open 1 · cannot-reproduce 1 · blocked 0 |

Os vereditos de TC são o estado consolidado: os 11 TC que falharam na rodada 1 foram reconferidos pelo reteste
dos bugs deles (8 passam, 2 falham, 1 `blocked`); os outros 37 levam o veredito da rodada 1, sem nova execução.

### Rodada

- **Ambiente:** loja `http://localhost:8082`, painel `http://localhost:8083`, Supabase local;
  `*.supabase.co`, `accounts.google.com` e `**/g/collect*` abortados por rota; nenhum cartão digitado
- **Branch / build:** master, árvore de trabalho com o WI 98 sem commit (fix tasks 10–18) · `pnpm dev` (build
  não exposto)
- **Execução:** 2026-11-10, 08:13 → 08:20 BRT (11:13 → 11:20 UTC, 7 min). Uma tentativa anterior, 07:16–07:18
  BRT, deixou 11 bugs `blocked` por falta de login e não conta como resultado
- **Browser:** Chromium (Playwright MCP), versão não registrada · **Viewports:** 390 × 844, 320 × 568,
  1440 × 900; fonte da raiz a 100/130/200 %
- **Personas e acesso:** PER-01 e PER-02 → conta `admin`; PER-03 → conta `cliente`; PER-04 → sem conta
  (anônima)

### Gate técnico

- **Validation do Dev:** `.specs/work-items/98-pagamento-que-falhou/qa-report.md` — PASS, de 2026-11-10
  (rodada 3, depois das fix tasks 10–17)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build` exit 0 (3/3) |
| lint  | pass   | store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 — o relatório não traz o comando |
| test  | pass   | 22492/22492, um workspace por vez (o `Summary` do relatório; a tabela por workspace da rodada 3 soma 22544 — ver Riscos residuais) |
| e2e   | skip   | sem rodada E2E |

A Validation rodada 3 cobre as tarefas 10–17; a tarefa 18 (o título do link de cartão em 320) não aparece no
relatório — o BUG-012 foi conferido em navegador pelo reteste.

### Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.2 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.3 | prd | TC-FUNC-024 | pass | covered |
| CA-01.4 | prd | TC-INT-007 | blocked | missing |
| CA-01.5 | prd | TC-INT-006 | pass (só o valor exibido) | covered |
| CA-01.6 | prd | TC-INT-006 | pass (só o valor exibido) | covered |
| CA-02.1 | prd | TC-FUNC-019 | pass (reteste BUG-007) | covered |
| CA-02.2 | prd | TC-FUNC-019 | pass (reteste BUG-007) | covered |
| CA-02.3 | prd | TC-FUNC-019, TC-FUNC-020 | pass · pass | covered |
| CA-02.4 | prd | TC-FUNC-021, TC-FUNC-017, TC-SEC-003 | pass | covered |
| CA-05.1 | prd | TC-FUNC-014 | pass | covered |
| CA-05.2 | prd | TC-JOURNEY-002, TC-SEC-002 | blocked · pass | partial |
| CA-05.3 | prd | TC-JOURNEY-002, TC-INT-006 | blocked · pass | partial |
| CA-05.4 | prd | TC-FUNC-015 | pass | covered |
| CA-05.5 | prd | TC-INT-005 | blocked | missing |
| CA-05.6 | prd | TC-FUNC-016, TC-SEC-002 | pass | covered |
| CA-05.7 | prd | TC-FUNC-017 | pass | covered |
| CA-05.8 | prd | TC-INT-008 | pass | covered |
| CA-03.1 | prd | TC-FUNC-001 | pass | covered |
| CA-03.2 | prd | TC-FUNC-002, TC-FUNC-004, TC-JOURNEY-001 | pass · pass (reteste BUG-001) · pass (reteste BUG-001) | covered |
| CA-03.2a | prd | TC-FUNC-002 | pass | covered |
| CA-03.2b | prd | TC-FUNC-002, TC-FUNC-003 | pass | covered |
| CA-03.3 | prd | TC-JOURNEY-001 | pass (reteste BUG-001, BUG-011) | covered |
| CA-03.3a | prd | TC-FUNC-006 | pass | covered |
| CA-03.4 | prd | TC-INT-003 | pass (estoque; cupom não relido) | covered |
| CA-03.5 | prd | TC-FUNC-005 | pass | covered |
| CA-03.5a | prd | TC-INT-007 | blocked | missing |
| CA-03.5b | prd | TC-FUNC-013 | pass | covered |
| CA-03.6 | prd | TC-FUNC-007, TC-JOURNEY-001 | pass (reteste BUG-008, BUG-009) · pass | covered |
| CA-03.7 | prd | TC-INT-002 | pass | covered |
| CA-03.8 | prd | TC-INT-001, TC-JOURNEY-001 | blocked · pass | partial |
| CA-03.9 | prd | TC-FUNC-010, TC-FUNC-011, TC-REG-001 | pass | covered |
| CA-03.16 | prd | TC-FUNC-012, TC-FUNC-023 | pass · blocked (BUG-005 sem massa) | partial |
| CA-03.10 | prd | TC-FUNC-004 | pass (reteste BUG-001) | covered |
| CA-03.11 | prd | TC-FUNC-008, TC-INT-002, TC-INT-003 | pass (reteste BUG-002) · pass · pass | covered |
| CA-03.12 | prd | TC-FUNC-009 | pass (reteste BUG-004) | covered |
| CA-03.13 | prd | TC-FUNC-009 | pass (reteste BUG-004) | covered |
| CA-03.14 | prd | TC-FUNC-008 | pass (reteste BUG-002, BUG-003) | covered |
| CA-03.15 | prd | TC-INT-008 | pass | covered |
| CA-04.1 | prd | TC-FUNC-007 | pass (reteste BUG-008) | covered |
| CA-04.2 | prd | TC-SEC-001 | pass | covered |
| CA-04.3 | prd | TC-FUNC-022 | pass | covered |
| CA-06.1 | prd | TC-INT-008 | pass | covered |
| CA-06.1a | prd | TC-INT-008 | pass | covered |
| CA-06.2 | prd | TC-INT-008 | pass | covered |
| CA-06.3 | prd | TC-INT-004, TC-INT-007 | blocked | missing |
| CA-06.4 | prd | TC-FUNC-013 | pass | covered |
| CA-06.5 | prd | TC-FUNC-024 | pass | covered |
| CA-06.6 | prd | TC-INT-009, TC-FUNC-025, TC-INT-004 | blocked · pass · blocked | partial |
| RNF-01 | prd | TC-FUNC-022, TC-JOURNEY-001, TC-INT-002 | pass | covered |
| RNF-03 | prd | TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001, TC-JOURNEY-001, TC-CFR-003 | fail (BUG-010) · pass · fail (BUG-013) | covered |
| RNF-06 | prd | TC-FUNC-027 | pass | covered |
| RNF-08 | prd | TC-FUNC-007, TC-FUNC-026 | pass (reteste BUG-008) · pass | covered |
| RNF-09 | prd | TC-FUNC-026 | pass | covered |

**Sem cobertura:**
- CA-01.4 — o código PIX novo não se cria no local (Mercado Pago com chave inválida); TC-INT-007 `blocked`
- CA-05.5 — a cobrança pelo link de cartão não foi feita (chaves externas inválidas no servidor); TC-INT-005 `blocked`
- CA-03.5a — o fechamento da cobrança aberta acontece no Mercado Pago e não é visível na tela; TC-INT-007 `blocked`
- CA-06.3 — idem, no cancelamento; TC-INT-004 e TC-INT-007 `blocked`

**Nota de triagem:** um TC que falhou na rodada 1 passa aqui quando todos os bugs que o reprovavam foram
retestados `resolved` — o reteste refaz os passos desses bugs, não o TC inteiro. TC-FUNC-004 passa com a
ressalva de NOVO-02 (ver Achados que não viraram bug). TC-FUNC-023 vai de `fail` a `blocked`: o reteste não
achou o estado de partida. TC-CFR-003 continua `fail`, agora por BUG-013 (e por BUG-010 na tela de registrar).

### Sessões

Nenhuma sessão de charter nesta rodada: a confirmação foi só o reteste (`retest.md`), sem charter novo nem
exploração.

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| reteste | PER-01, PER-02, PER-03, PER-04 | — | done | 12 bugs × 2 tentativas | reconferidos 11: pass 8 · fail 2 · blocked 1 | 2 (NOVO-01, NOVO-02) | BUG-013 |

### CFR

Não rodou como charter nesta rodada (só reteste). O que o reteste mediu: alvos da data em 390 e 320 (BUG-010,
fricção), o foco depois de registrar e de desfazer (BUG-011, ok), o link de cartão em 320/390 a 100/200 %
(BUG-012, ok), a frase com a rede cortada (BUG-006, ok) e o pedido a 390/200 % (BUG-013, fricção).

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01, J-02 | fricção (alvo 40 × 44); foco ok | BUG-010 |
| Responsividade        | J-01, J-02, J-04 | fricção no pedido a 390/200 %; link de cartão ok | BUG-013 |
| Performance percebida | — | não medida nesta rodada | — |
| Segurança visível     | — | não medida nesta rodada | — |

### Design-check

- **Protótipo:** sem protótipo no Work Item (decisão do humano: seguir sem design)
- **Status:** not-run (sem fonte de design)
- **Divergências:** 0 — nenhuma

### Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 1 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 1 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-013 | Fricção | medium | P2 | [Pedido · bloco Pagamento e Histórico] O e-mail de quem registrou não quebra e faz o pedido rolar de lado em 390 com a fonte a 200 % — para a dona | PER-01 · J-01 passo 5, J-02 passo 1 | TC-CFR-003 |

BUG-013 vira bug numa rodada de confirmação por ser **regressão** trazida pelo conserto do BUG-009 (tarefa 14):
a linha do histórico com o autor não existia na rodada 1 e leva o documento de 426 a 506 px a 200 %. Os 426 da
rodada 1 (CH-07, passo 07, "causa não isolada", classificados como pré-existentes) batem com o "Registrado por"
do bloco "Registrado à mão" — superfície deste Work Item, por isso no mesmo bug.

**Reabertos:** nada

### Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-010 | Registrar pagamento · campo Data do pagamento ("Limpar data") | sozinho: componente próprio; segunda volta do mesmo alvo | medium |
| L2 | BUG-013 | Pedido · bloco Pagamento ("Registrado à mão") e Histórico, o e-mail de quem registrou | sozinho: outra tela; o mesmo dado (o e-mail sem quebra) nos dois pontos da mesma tela | medium |

### Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-001 | [Registrar pagamento] Comprovante escolhido depois de mexer na tela não entra, e o registro grava sem ele | reteste | open → resolved | mantida (critical) | `screenshots/retest-BUG-001.png` |
| BUG-002 | [Pedido] Depois de desfazer o registro, a observação e os comprovantes somem da página — para a dona | reteste | open → resolved | mantida (critical) | `screenshots/retest-BUG-002.png` |
| BUG-003 | [Pedido · Histórico] Pedido desfeito para Pendente ainda oferece mandar "Pagamento aprovado" à cliente | reteste | open → resolved | mantida (high) | `screenshots/retest-BUG-003.png` |
| BUG-004 | [Pedido · bloco Pagamento] "Desfazer registro" oferecido no pedido pago duas vezes, que a loja também recebeu | reteste | open → resolved | mantida (high) | `screenshots/retest-BUG-004.png` |
| BUG-005 | [Pagamento do pedido] Endereço de pagamento de pedido já em produção sem pagamento tenta gerar um PIX | reteste | open → cannot-reproduce | mantida (high) | `screenshots/retest-BUG-005.png` |
| BUG-006 | [Registrar pagamento] Com a rede caindo após confirmar sem e-mail, a tela diz "anotado no histórico" e não anotou | reteste | open → resolved | mantida (high) | `screenshots/retest-BUG-006.png` |
| BUG-007 | [Pedido e Minha conta] Cartão com tentativa ainda sem resposta aparece como "não foi concluído" — para a cliente | reteste | open → resolved | mantida (medium) | `screenshots/retest-BUG-007.png` |
| BUG-008 | [Pedido · bloco Pagamento] Registro à mão mostra "Método: pix" ao lado do meio informado — para a dona | reteste | open → resolved | mantida (medium) | `screenshots/retest-BUG-008.png` |
| BUG-009 | [Pedido · Histórico] A linha "Pagamento registrado manualmente" não diz quem registrou | reteste | open → resolved | mantida (medium) | `screenshots/retest-BUG-009.png` |
| BUG-010 | [Registrar pagamento] Botão da data (40 px) e "Limpar data" (36 px) abaixo de 44 px no celular | reteste | open → still-open | mantida (medium) | `screenshots/retest-BUG-010.png` |
| BUG-011 | [Registrar pagamento] Depois de confirmar o registro, o foco cai no início da página — para quem usa teclado | reteste | open → resolved | mantida (medium) | `screenshots/retest-BUG-011.png` |
| BUG-012 | [Pagamento com cartão] Cabeçalho "Ambiente seguro" faz a página rolar de lado em 320 px com fonte grande | reteste | open → resolved | mantida (low) | `screenshots/retest-BUG-012.png` |

Linhas do Histórico a gravar no Gate 3 (uma por bug, rodada 2026-11-10 r2):
- BUG-001..004, 006..009, 011, 012 — `open → resolved` · reteste: o que `retest.md` registra para cada um,
  2 de 2 tentativas
- BUG-005 — `open → cannot-reproduce` · reteste: a rota volta a `/pedido/<id>` sem chamar functions, mas o
  pedido #0557 já está `separating / approved` e nenhum pedido da `cliente` está em Separando sem pagamento;
  pela interface o estado não se cria mais. Conserto provado por teste de página e de handler (tarefa 13), não
  em navegador
- BUG-010 — `open → still-open` · reteste: alturas consertadas (botão da data 44, "Limpar data" 44, `h-11`),
  mas o "Limpar data" tem `w-11` e encolhe na linha flexível para 40 px de largura em 390 (40,5) e em 320
  (40): alvo 40 × 44

**Reteste `blocked`:** nada

### Achados que não viraram bug

- NOVO-01 (o e-mail de "Registrado por" sem quebra faz o pedido rolar de lado a 390/200 %) — virou BUG-013
- NOVO-02 (a) o GIF entra na lista com "…gif não é JPG, PNG, WebP, HEIC ou PDF." — `conforme a rodada 1`:
  já era assim na rodada 1 (CH-01, passo 07: "O GIF aparece com … (role alert)"), não é regressão; o GIF não é
  gravado, o "Registrar pagamento" fica desabilitado enquanto ele está na lista
- NOVO-02 (b) acima de 3, o excedente entra na lista com "São no máximo 3 comprovantes por pagamento." e o
  botão desabilitado — `conforme a decisão da tarefa 10` (decisão 2, mantida pelo Dev) e já assim na rodada 1
  (CH-01, passo 11: "os quatro nomes e 'São no máximo 3…'"). A letra da tarefa diz "a tela recusa o
  excedente"; a divergência é do Dev e vai ao Gate 3 como registro, não como bug
- NOVO-02 (c) com o GIF e o excedente juntos, o alerta passa a ser só o do teto e o motivo do GIF some,
  embora ele continue na lista — `spec-gap` (polimento): nasce da soma da tarefa 10, nada é gravado errado, e
  na rodada de confirmação Fricção que não regrediu TC vai a **Sugestões de backlog**
- Rodada 1, Sugestão de backlog "O pedido a 200 % em 390 rola 36 px de lado — pré-existente" — a causa
  principal está agora isolada no "Registrado por" do bloco "Registrado à mão" e entra no BUG-013; o botão "Em
  Separação" do "Próximo passo" passando 1 px da borda continua como sugestão da rodada 1

### Perguntas ao produto

nada — rodada de confirmação

### Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Com um arquivo de tipo recusado e mais de 3 comprovantes na lista, o alerta mostra só o teto e o motivo do arquivo recusado some, embora ele continue listado e o botão siga desabilitado | painel, Registrar pagamento, campo Comprovantes | polimento | Mostrar todos os motivos de recusa dos comprovantes ao mesmo tempo |
| O arquivo de tipo recusado e o excedente acima de 3 aparecem na lista como escolhidos | painel, Registrar pagamento, campo Comprovantes | polimento | Não listar como escolhido o comprovante recusado |

### Riscos residuais

- BUG-005 `cannot-reproduce` sem prova em navegador: a rota de pagamento de um pedido em Separando sem pagamento
  só está provada por teste (tarefa 13). O estado não se cria pela interface, mas pode existir por dado (pedido
  avançado antes do WI, import, outra superfície). Para provar, criar no banco local um pedido da `cliente` em
  `separating` com pagamento `pending` e abrir `/pedido/<id>/pagamento`
- BUG-010 voltou na segunda volta do conserto — fricção repetida no mesmo controle da tela "Registrar
  pagamento" (rodada 1 já registrou quatro defeitos nessa tela); o reteste precisa medir altura **e** largura
- BUG-013 mostra que a rodada 1 classificou como pré-existente um estouro desta mudança ("causa não isolada");
  as medidas do bloco Pagamento a 200 % (alvos de "Desfazer registro", "Gerar link", comprovantes) continuam
  sem medida isolada
- NOVO-02 sem imagem do estado intermediário (só relato); TC-FUNC-004 passa com essa ressalva, e os casos de
  10 MB + 1 byte não foram refeitos depois da tarefa 10
- Gate `test`: o `Summary` do `qa-report.md` (22492) não bate com a soma da tabela por workspace da rodada 3
  (5709 + 1664 + 7181 + 5261 + 2729 = 22544); copiado o `Summary`, como manda o contrato. A tarefa 18 não está
  na Validation
- Os vereditos de TC que passaram da rodada 1 para esta vêm do reteste dos passos dos bugs, não de uma nova
  execução dos TC inteiros (TC-JOURNEY-001 inclusive)

### Fora da cobertura

- Nenhum charter rodou nesta rodada; os TC sem bug na rodada 1 não foram reexecutados
- TC-JOURNEY-002 (P0) e TC-INT-005 (P0): pagar no Brick pelo link de cartão — chaves externas inválidas no
  servidor; seguem `blocked` desde a rodada 1
- TC-JOURNEY-003, TC-INT-007: o PIX novo e o fechamento da cobrança anterior — Mercado Pago local `UNAUTHORIZED`
- TC-INT-001, TC-INT-004, TC-INT-009: e-mails às clientes (Resend com chave inválida, não chegam ao Mailpit) e o
  evento "Pedido cancelado" desligado
- TC-FUNC-023: sem pedido da `cliente` em Separando com pagamento pendente (BUG-005 `cannot-reproduce`)
- O app do ateliê (`:8084`) não foi aberto nesta rodada
- Fonte do sistema real, leitor de tela real, Android/iPhone real e a câmera tirando a foto — fora do navegador
  da sessão

---

## Histórico — rodada 1 (exploração)

Preservado sem alteração de conteúdo (os títulos desceram um nível). Envelope original da rodada 1:

```text
{
  "schema": "qa-result/v1",
  "verdict": "fail",
  "executed_at": "2026-11-10T08:46:00Z",
  "branch": "master (árvore de trabalho com o WI 98 sem commit)",
  "duration_min": 184,
  "gates": [
    { "name": "build", "command": "pnpm build", "status": "pass", "summary": "PASS — pnpm build exit 0 (3/3)" },
    { "name": "lint", "command": "—", "status": "pass", "summary": "PASS — store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 (era 1/0)" },
    { "name": "test", "command": "pnpm --filter @estrelinha/<workspace> test --testTimeout=20000 (um workspace por vez)", "status": "pass", "summary": "22492/22492" },
    { "name": "e2e", "command": "—", "status": "skip", "summary": "sem rodada E2E" }
  ],
  "coverage": {
    "acceptance_total": 55,
    "acceptance_covered": 45,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-SEC-003", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.3", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.4", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.5", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-05.6", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.7", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.8", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2a", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2b", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3a", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-INT-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5a", "validated_by": { "tc_ref": "TC-INT-007", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-03.5b", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.7", "validated_by": { "tc_ref": "TC-INT-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.8", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.9", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.16", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.10", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.11", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.12", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.13", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.14", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.15", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.1a", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.2", "validated_by": { "tc_ref": "TC-INT-008", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-06.3", "validated_by": { "tc_ref": "TC-INT-004", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-06.4", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.5", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.6", "validated_by": { "tc_ref": "TC-INT-009", "type": "integration" }, "status": "partial" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-FUNC-027", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-08", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-09", "validated_by": { "tc_ref": "TC-FUNC-026", "type": "e2e" }, "status": "covered" }
    ],
    "missing": ["CA-01.4", "CA-05.5", "CA-03.5a", "CA-06.3"]
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "blocked" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "fail", "bug_ref": "BUG-008" },
    { "tc_ref": "TC-FUNC-008", "verdict": "fail", "bug_ref": "BUG-002" },
    { "tc_ref": "TC-FUNC-009", "verdict": "fail", "bug_ref": "BUG-004" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-017", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-018", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-019", "verdict": "fail", "bug_ref": "BUG-007" },
    { "tc_ref": "TC-FUNC-020", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "fail", "bug_ref": "BUG-005" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-027", "verdict": "pass" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-SEC-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "blocked" },
    { "tc_ref": "TC-INT-002", "verdict": "pass" },
    { "tc_ref": "TC-INT-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-004", "verdict": "blocked" },
    { "tc_ref": "TC-INT-005", "verdict": "blocked" },
    { "tc_ref": "TC-INT-006", "verdict": "pass" },
    { "tc_ref": "TC-INT-007", "verdict": "blocked" },
    { "tc_ref": "TC-INT-008", "verdict": "pass" },
    { "tc_ref": "TC-INT-009", "verdict": "blocked" },
    { "tc_ref": "TC-UI-001", "verdict": "fail", "bug_ref": "BUG-010" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-CFR-002", "verdict": "fail", "bug_ref": "BUG-011" },
    { "tc_ref": "TC-CFR-003", "verdict": "fail", "bug_ref": "BUG-010" }
  ],
  "evidence": [
    { "label": "CH-01-07-bloco-sem-comprovantes.png", "path": "screenshots/CH-01-07-bloco-sem-comprovantes.png" },
    { "label": "CH-01-09-primeira-escolha-listada.png", "path": "screenshots/CH-01-09-primeira-escolha-listada.png" },
    { "label": "CH-01-12-segunda-escolha-ignorada.png", "path": "screenshots/CH-01-12-segunda-escolha-ignorada.png" },
    { "label": "CH-01-17-320.png", "path": "screenshots/CH-01-17-320.png" },
    { "label": "CH-01-18-offline.png", "path": "screenshots/CH-01-18-offline.png" },
    { "label": "CH-01-19-controle-historico-com-aviso-pulado.png", "path": "screenshots/CH-01-19-controle-historico-com-aviso-pulado.png" },
    { "label": "CH-02-01-link-vivo.png", "path": "screenshots/CH-02-01-link-vivo.png" },
    { "label": "CH-02-05-pedido-pago.png", "path": "screenshots/CH-02-05-pedido-pago.png" },
    { "label": "CH-02-06-pedido-cancelado.png", "path": "screenshots/CH-02-06-pedido-cancelado.png" },
    { "label": "CH-02-12-320-fonte-200.png", "path": "screenshots/CH-02-12-320-fonte-200.png" },
    { "label": "CH-03-12-depois-do-desfazer.png", "path": "screenshots/CH-03-12-depois-do-desfazer.png" },
    { "label": "CH-03b-02-link-assinado-anonimo-dentro-da-validade.png", "path": "screenshots/CH-03b-02-link-assinado-anonimo-dentro-da-validade.png" },
    { "label": "CH-03b-03-selo-0576.png", "path": "screenshots/CH-03b-03-selo-0576.png" },
    { "label": "CH-03b-04-link-expirado-anonimo.png", "path": "screenshots/CH-03b-04-link-expirado-anonimo.png" },
    { "label": "CH-03b-08-desfazer-oferecido-no-pago-duas-vezes.png", "path": "screenshots/CH-03b-08-desfazer-oferecido-no-pago-duas-vezes.png" },
    { "label": "CH-03b-09-cliente-link-expirado.png", "path": "screenshots/CH-03b-09-cliente-link-expirado.png" },
    { "label": "CH-04-01-conta-pendencias.png", "path": "screenshots/CH-04-01-conta-pendencias.png" },
    { "label": "CH-04-03-m4-cartao-pendente.png", "path": "screenshots/CH-04-03-m4-cartao-pendente.png" },
    { "label": "CH-04-08-m10-separando-selo-pix-expirado.png", "path": "screenshots/CH-04-08-m10-separando-selo-pix-expirado.png" },
    { "label": "CH-04-09-m10-pagamento-tenta-gerar.png", "path": "screenshots/CH-04-09-m10-pagamento-tenta-gerar.png" },
    { "label": "CH-07-01-registrar-390-fonte-200.png", "path": "screenshots/CH-07-01-registrar-390-fonte-200.png" },
    { "label": "CH-07-03-pedido-registrado-390-fonte-200.png", "path": "screenshots/CH-07-03-pedido-registrado-390-fonte-200.png" }
  ],
  "issues": {
    "total": 12,
    "by_severity": { "critical": 2, "high": 4, "medium": 5, "low": 1 }
  }
}
```

### Resultado de QA — rodada 1

**Gate 3:** confirmado em 2026-11-10 (sob o pedido do humano de seguir até o QA sem parar)

### Resumo

**Veredito:** fail — dois bugs critical e quatro high abertos, e o TC P0 TC-JOURNEY-001 falhou (o comprovante não entra no registro pelo celular)

A rodada exploratória percorreu as sete jornadas com as quatro personas, em nove sessões (CH-01..CH-07 e as
partes 2 de CH-03 e CH-05), no painel, na loja e no app do ateliê, em 390, 320 e 1440 e com a fonte a 130/200 %.
O que funciona: os caminhos até Pago passam todos pelo registro (nenhum não pago vira Pago sem registro, o lote
deixa de fora e conta), o registro concorrente em duas abas é recusado, o comprovante só abre para a admin e o
link expira em 5 minutos, o link de cartão abre o pedido certo sem login, só o último vale e pedido pago ou
cancelado não oferece pagar, a cliente encontra em cada pedido que falhou uma saída coerente e em tom memorial,
a venda do Dashboard entra e sai pela data informada, o estoque baixa e volta, e o cancelamento automático
pegou só os pedidos certos (A e H) com a marca no histórico.

O que uma pessoa de verdade não consegue fazer hoje: a Adri, no celular, preenchendo na ordem natural, **não
consegue anexar o comprovante** — o arquivo não entra e o registro grava sem ele (BUG-001). Ao **desfazer** um
registro, a observação e os comprovantes somem da página, ao contrário do que o diálogo promete (BUG-002); o
histórico continua oferecendo mandar "Pagamento aprovado" a um pedido Pendente (BUG-003); e o "Desfazer" é
oferecido num pedido que a loja também recebeu (BUG-004). Do lado da cliente, o endereço de pagamento de um
pedido já em produção sem pagamento tenta gerar um PIX (BUG-005).

Decidem o veredito os dois critical (BUG-001, BUG-002), os quatro high (BUG-003..006) e o TC-JOURNEY-001 P0 em
`fail`. Sete TC ficaram `blocked` pelo ambiente — Mercado Pago com chaves inválidas, e-mail que não chega ao
Mailpit, evento "Pedido cancelado" desligado —, o que sozinho já levaria a `partial`.

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 30 · fail 11 · blocked 7 · skip 0 | 45 de 55 cobertos (6 parciais, 4 sem cobertura) | 12 | 0 | resolved 0 · still-open 0 · cannot-reproduce 0 · blocked 0 |

### Rodada

- **Ambiente:** loja `http://localhost:8082`, painel `http://localhost:8083`, app do ateliê
  `http://localhost:8084`, Supabase local (API :54441); `*.supabase.co` e `**/g/collect*` bloqueados
- **Branch / build:** master, árvore de trabalho com o WI 98 sem commit · `pnpm dev` (build não exposto)
- **Execução:** 2026-11-10, ~05:42 → ~08:46 UTC (184 min) — aproximado pelos horários gravados nos logs (02h42
  do primeiro registro de CH-01 a 05h46 do registro de CH-05 parte 2, horário de Brasília); a parte 2 de CH-03
  releu um link ~1h30 depois de gerado, sem hora absoluta registrada
- **Browser:** Chromium (Playwright MCP, headless), versão não registrada · **Viewports:** 390 × 844, 320 × 568,
  1280 × 720, 1440 × 900; fonte da raiz a 100/130/200 %
- **Personas e acesso:** PER-01 e PER-02 → conta `admin`; PER-03 → conta `cliente`; PER-04 → sem conta
  (anônima) e, numa variação, `cliente`

### Gate técnico

- **Validation do Dev:** `.specs/work-items/98-pagamento-que-falhou/qa-report.md` — PASS, de 2026-11-10 (rodada 2)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build` exit 0 (3/3) |
| lint  | pass   | store 2/2 · backoffice 23/5 (baseline) · mobile-adm 0/0 — o relatório não traz o comando |
| test  | pass   | 22492/22492, um workspace por vez |
| e2e   | skip   | sem rodada E2E |

### Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.2 | prd | TC-FUNC-018, TC-JOURNEY-003 | pass · blocked | partial |
| CA-01.3 | prd | TC-FUNC-024 | pass | covered |
| CA-01.4 | prd | TC-INT-007 | blocked | missing |
| CA-01.5 | prd | TC-INT-006 | pass (só o valor exibido) | covered |
| CA-01.6 | prd | TC-INT-006 | pass (só o valor exibido) | covered |
| CA-02.1 | prd | TC-FUNC-019 | fail (BUG-007) | covered |
| CA-02.2 | prd | TC-FUNC-019 | fail (BUG-007) | covered |
| CA-02.3 | prd | TC-FUNC-019, TC-FUNC-020 | fail (BUG-007) · pass | covered |
| CA-02.4 | prd | TC-FUNC-021, TC-FUNC-017, TC-SEC-003 | pass | covered |
| CA-05.1 | prd | TC-FUNC-014 | pass | covered |
| CA-05.2 | prd | TC-JOURNEY-002, TC-SEC-002 | blocked · pass | partial |
| CA-05.3 | prd | TC-JOURNEY-002, TC-INT-006 | blocked · pass | partial |
| CA-05.4 | prd | TC-FUNC-015 | pass | covered |
| CA-05.5 | prd | TC-INT-005 | blocked | missing |
| CA-05.6 | prd | TC-FUNC-016, TC-SEC-002 | pass | covered |
| CA-05.7 | prd | TC-FUNC-017 | pass | covered |
| CA-05.8 | prd | TC-INT-008 | pass | covered |
| CA-03.1 | prd | TC-FUNC-001 | pass | covered |
| CA-03.2 | prd | TC-FUNC-002, TC-FUNC-004, TC-JOURNEY-001 | pass · fail (BUG-001) | covered |
| CA-03.2a | prd | TC-FUNC-002 | pass | covered |
| CA-03.2b | prd | TC-FUNC-002, TC-FUNC-003 | pass | covered |
| CA-03.3 | prd | TC-JOURNEY-001 | fail (BUG-001) | covered |
| CA-03.3a | prd | TC-FUNC-006 | pass | covered |
| CA-03.4 | prd | TC-INT-003 | pass (estoque; cupom não relido) | covered |
| CA-03.5 | prd | TC-FUNC-005 | pass | covered |
| CA-03.5a | prd | TC-INT-007 | blocked | missing |
| CA-03.5b | prd | TC-FUNC-013 | pass | covered |
| CA-03.6 | prd | TC-FUNC-007, TC-JOURNEY-001 | fail (BUG-008, BUG-009) · fail (BUG-001) | covered |
| CA-03.7 | prd | TC-INT-002 | pass | covered |
| CA-03.8 | prd | TC-INT-001, TC-JOURNEY-001 | blocked · fail (BUG-001) | partial |
| CA-03.9 | prd | TC-FUNC-010, TC-FUNC-011, TC-REG-001 | pass | covered |
| CA-03.16 | prd | TC-FUNC-012, TC-FUNC-023 | pass · fail (BUG-005) | covered |
| CA-03.10 | prd | TC-FUNC-004 | fail (BUG-001) | covered |
| CA-03.11 | prd | TC-FUNC-008, TC-INT-002, TC-INT-003 | fail (BUG-002) · pass · pass | covered |
| CA-03.12 | prd | TC-FUNC-009 | fail (BUG-004) | covered |
| CA-03.13 | prd | TC-FUNC-009 | fail (BUG-004) | covered |
| CA-03.14 | prd | TC-FUNC-008 | fail (BUG-002; BUG-003) | covered |
| CA-03.15 | prd | TC-INT-008 | pass | covered |
| CA-04.1 | prd | TC-FUNC-007 | fail (BUG-008) | covered |
| CA-04.2 | prd | TC-SEC-001 | pass | covered |
| CA-04.3 | prd | TC-FUNC-022 | pass | covered |
| CA-06.1 | prd | TC-INT-008 | pass | covered |
| CA-06.1a | prd | TC-INT-008 | pass | covered |
| CA-06.2 | prd | TC-INT-008 | pass | covered |
| CA-06.3 | prd | TC-INT-004, TC-INT-007 | blocked | missing |
| CA-06.4 | prd | TC-FUNC-013 | pass | covered |
| CA-06.5 | prd | TC-FUNC-024 | pass | covered |
| CA-06.6 | prd | TC-INT-009, TC-FUNC-025, TC-INT-004 | blocked · pass · blocked | partial |
| RNF-01 | prd | TC-FUNC-022, TC-JOURNEY-001, TC-INT-002 | pass · fail (BUG-001) · pass | covered |
| RNF-03 | prd | TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001, TC-JOURNEY-001, TC-CFR-003 | fail (BUG-010) · fail (BUG-001) · fail (BUG-010) | covered |
| RNF-06 | prd | TC-FUNC-027 | pass | covered |
| RNF-08 | prd | TC-FUNC-007, TC-FUNC-026 | fail (BUG-008) · pass | covered |
| RNF-09 | prd | TC-FUNC-026 | pass | covered |

**Sem cobertura:**
- CA-01.4 — o código PIX novo não se cria no local (Mercado Pago com chave inválida); TC-INT-007 `blocked`
- CA-05.5 — a cobrança pelo link de cartão não foi feita (Brick carregou com chave pública de produção; servidor com chaves inválidas); TC-INT-005 `blocked`
- CA-03.5a — o fechamento da cobrança aberta acontece no Mercado Pago e não é visível na tela; TC-INT-007 `blocked`
- CA-06.3 — idem, no cancelamento; TC-INT-004 e TC-INT-007 `blocked`

**Nota de triagem:** TC-FUNC-007 saiu da sessão CH-03 como `pass`; a triagem o levou a `fail`, porque o "Método:
pix" ao lado do meio informado (BUG-008) e o histórico sem o autor (BUG-009) ferem os passos dele. Os TC que a
parte 1 de CH-03 e de CH-05 deixou `skip`/`blocked` por orçamento levam o veredito da parte 2, que existiu para
completá-los.

### Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 | Garbage | done | 48 de 50 | pass 4 · fail 3 · blocked 1 | 4 | BUG-001, BUG-006, BUG-009, BUG-010 |
| CH-02 | PER-04 | Money | done | ~46 de 50 | pass 5 · blocked 2 | 1 | BUG-012 |
| CH-03 | PER-02 | Multi-Tab | done | 50 de 50 | pass 3 · fail 1 · blocked 1 · skip 3 | 3 | BUG-002, BUG-003, BUG-008 |
| CH-03 (parte 2) | PER-02 | Multi-Tab | done | ~34 de 35 | pass 3 · fail 1 | 1 | BUG-004 |
| CH-04 | PER-03 | Feature | done | 50 de 50 | pass 7 · fail 2 · blocked 2 | 2 | BUG-005, BUG-007 |
| CH-05 | PER-02 | Back-Button | done | 50 de 50 | pass 3 · skip 4 | 0 | — |
| CH-05 (parte 2) | PER-02 | Back-Button | done | 35 de 35 | pass 3 · blocked 1 | 0 | — |
| CH-06 | PER-01 | Feature | done | 25 de 25 | pass 3 · blocked 1 | 0 | — |
| CH-07 | PER-01 | — (CFR) | done | 33 de 35 | fail 3 | 3 | BUG-001, BUG-010, BUG-011 |

### CFR

| Categoria             | Jornadas   | Resultado | Bugs |
| --------------------- | ---------- | --------- | ---- |
| Acessibilidade        | J-01, J-02 | fricção (J-01) · ok (J-02: teclado, foco no Motivo e no H1, movimento reduzido) | BUG-010, BUG-011 |
| Responsividade        | J-01, J-02, J-04, J-05 | ok nas telas novas em 390/1440 a 100/130/200 %; fricção em 320 a 200 % no link de cartão | BUG-012 |
| Performance percebida | J-01, J-02 | ok (botão trava em 46 ms; volta ao pedido em ~0,9 s com 3 comprovantes) | — |
| Segurança visível     | J-02, J-04, J-05 | ok (comprovante só para a admin, link de 5 min; link de cartão sem dado pessoal; observação e comprovante nunca na loja) | — |
| Usabilidade           | J-01 | falha (comprovantes escolhidos por último somem) | BUG-001 |
| Recuperação de erro   | J-01, J-02 | ok no desfazer offline e no Esc do portão; o aviso pulado com a rede caindo, falha | BUG-006 |

### Design-check

- **Protótipo:** sem protótipo no Work Item (decisão do humano: seguir sem design)
- **Status:** not-run (sem fonte de design)
- **Divergências:** 0 — nenhuma

### Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 2 · Dano à confiança 5 · Fricção 4 · Cosmético 1
Por severidade: critical 2 · high 4 · medium 5 · low 1

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-001 | Perda de dados | critical | P0 | [Registrar pagamento] Comprovante escolhido depois de mexer na tela não entra, e o registro grava sem ele | PER-01 · J-01, passos 3 e 5 | TC-JOURNEY-001 |
| BUG-002 | Perda de dados | critical | P0 | [Pedido] Depois de desfazer o registro, a observação e os comprovantes somem da página — para a dona | PER-02 · J-02, passos 3–4 | TC-FUNC-008 |
| BUG-003 | Dano à confiança | high | P1 | [Pedido · Histórico] Pedido desfeito para Pendente ainda oferece mandar "Pagamento aprovado" à cliente | PER-02 · J-02, passo 4 | TC-FUNC-008 |
| BUG-004 | Dano à confiança | high | P1 | [Pedido · bloco Pagamento] "Desfazer registro" oferecido no pedido pago duas vezes, que a loja também recebeu | PER-02 · J-02, passo 3 | TC-FUNC-009 |
| BUG-005 | Dano à confiança | high | P1 | [Pagamento do pedido] Endereço de pagamento de pedido já em produção sem pagamento tenta gerar um PIX | PER-03 · J-05, passo 5 | TC-FUNC-023 |
| BUG-006 | Dano à confiança | high | P1 | [Registrar pagamento] Com a rede caindo após confirmar sem e-mail, a tela diz "anotado no histórico" e não anotou | PER-01 · J-01, passo 5 | — |
| BUG-007 | Dano à confiança (desce um degrau) | medium | P2 | [Pedido e Minha conta] Cartão com tentativa ainda sem resposta aparece como "não foi concluído" — para a cliente | PER-03 · J-05, passos 1 e 3 | TC-FUNC-019 |
| BUG-008 | Fricção | medium | P2 | [Pedido · bloco Pagamento] Registro à mão mostra "Método: pix" ao lado do meio informado — para a dona | PER-02 · J-02, passo 1 | TC-FUNC-007 |
| BUG-009 | Fricção | medium | P2 | [Pedido · Histórico] A linha "Pagamento registrado manualmente" não diz quem registrou | PER-02 · J-01 passo 5, J-02 passo 1 | TC-JOURNEY-001 |
| BUG-010 | Fricção | medium | P2 | [Registrar pagamento] Botão da data (40 px) e "Limpar data" (36 px) abaixo de 44 px no celular | PER-01 · J-01, passo 3 | TC-UI-001 |
| BUG-011 | Fricção | medium | P2 | [Registrar pagamento] Depois de confirmar o registro, o foco cai no início da página — para quem usa teclado | PER-01 · J-01, passo 5 | TC-CFR-002 |
| BUG-012 | Cosmético | low | P3 | [Pagamento com cartão] Cabeçalho "Ambiente seguro" faz a página rolar de lado em 320 px com fonte grande | PER-04 · J-04, passo 1 | — |

**Reabertos:** nada

### Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-001 | Registrar pagamento · campo Comprovantes | sozinho: componente próprio, o defeito mais grave da rodada | critical |
| L2 | BUG-002, BUG-003, BUG-004 | Pedido · bloco Pagamento e Histórico, em torno do "Desfazer registro" | mesma tela, mesma origem aparente: o que o desfazer oferece e o que ele deixa na página | critical |
| L3 | BUG-006, BUG-011 | Registrar pagamento · portão "Registrar o pagamento" e a volta ao pedido | mesmo componente: o que acontece depois de confirmar (o aviso e o foco) | high |
| L4 | BUG-005 | Pagamento do pedido (loja) · a rota aberta pelo endereço | sozinho: outra app, outra tela | high |
| L5 | BUG-008, BUG-009 | Pedido · bloco Pagamento e Histórico, a leitura do registro manual | mesma tela, mesma origem aparente: como o registro é exibido (meio e autor) | medium |
| L6 | BUG-010 | Registrar pagamento · campo Data do pagamento | sozinho: componente próprio | medium |
| L7 | BUG-007 | Pedido (loja) e Minha conta · aviso do pagamento do cartão | sozinho: outra app | medium |
| L8 | BUG-012 | Pagamento com cartão · cabeçalho | sozinho: outra tela | low |

### Transições propostas

sem bugs abertos no Work Item e nenhuma reabertura

**Reteste `blocked`:** nada

### Achados que não viraram bug

- CH-07 A-1 (comprovantes escolhidos depois de meio e observação somem) — `duplicado de BUG-001` (mesmo sintoma, mesmo campo; juntado como ocorrência)
- CH-07 A-3 (botões de data abaixo de 44 px) — `duplicado de BUG-010`
- CH-07 A-2 (foco no `<body>` depois de registrar) — virou BUG-011; a sessão o marcou "intermitente 1 de 1", mas a medida é inequívoca e não houve observação divergente
- CH-03: "Situação: Expirado" no pagamento depois do desfazer — `conforme a fonte` (CA-03.11: o pagamento volta ao estado anterior ao registro; o estado antes do registro do #0564 não foi lido)
- CH-01: "Registrar pagamento" no fim da página no celular, "Avançar mesmo assim" no topo — `spec-gap` (polimento)
- CH-01: "Limpar data" mostra "Agora" mas a hora digitada continua; grava a hora de agora — `spec-gap` (polimento)
- CH-01/CH-03: "Registrado por" mostra o e-mail da conta, não um nome — `spec-gap` (polimento)
- CH-01/CH-05: o bloco Pagamento mostra o método cru ("pix", "card") em pedidos sem registro à mão — `spec-gap` (pré-existente)
- CH-02: a tela do link de pedido já pago não oferece saída — `spec-gap` (polimento)
- CH-02: o cabeçalho de `/pagar-com-cartao` em 390 não tem "Ajuda no WhatsApp" — `spec-gap` (pré-existente)
- CH-02: as telas de situação do link mantêm o título "Pagamento com cartão" — `spec-gap` (polimento)
- CH-03: a recusa da aba B diz "aprovado" quando o outro pagamento foi um registro à mão — `spec-gap` (polimento)
- CH-03: desfazer sem motivo deixa o botão desabilitado sem frase dizendo o que falta — `spec-gap` (polimento)
- CH-03: o calendário da data não fecha ao escolher o dia e cobre "Comprovantes" — `spec-gap` (polimento)
- CH-03: a busca de Produtos não acha a variação — `spec-gap` (pré-existente)
- CH-03 parte 2: "Situação: Expirado" acima do selo "Pago depois de cancelado" — `spec-gap` (polimento; proposto como mudança, mas não decide a jornada: o selo diz o que fazer)
- CH-03 parte 2: o HEIC baixa abrindo uma aba em branco — `spec-gap` (polimento)
- CH-03 parte 2: a recusa do desfazer na aba desatualizada some em menos de 3 s — `spec-gap` (polimento)
- CH-04: selo "PIX expirado" em pedido em Separando sem pagamento — `spec-gap` (pré-existente)
- CH-04: a falha do PIX mostra o erro técnico cru, em inglês — `spec-gap` (pré-existente)
- CH-04: as mensagens pré-preenchidas do WhatsApp começam com "Olá!" — `spec-gap` (polimento)
- CH-04: pedido de cartão nunca cobrado diz "Aguardando a confirmação do pagamento" — `spec-gap` (pré-existente)
- CH-04: pedido pago por fora diz "É nosso!… O comprovante foi enviado para <e-mail>" sem saber se o e-mail saiu — `spec-gap` (pré-existente)
- CH-04: pedido gravado fora da loja (#0563) aparece nas pendências com R$ 10,00 e "Gerar novo PIX" — `spec-gap` (mudança → Perguntas ao produto)
- CH-05: "Marcar como pago aqui não cobra ninguém" acima de um botão que agora leva ao registro — `spec-gap` (polimento)
- CH-05: registrar vindo de "Outro status → Enviado/Entregue" para em Pago, sem lembrar o destino escolhido — `spec-gap` (polimento)
- CH-05 parte 2: histórico "Em Separação → Em Separação · Pagamento registrado manualmente" — `spec-gap` (polimento)
- CH-05 parte 2: o cancelamento não diz se a cobrança aberta foi fechada — `spec-gap` (polimento)
- CH-05 parte 2: um "—" solto ao lado do status no cabeçalho do pedido — `spec-gap` (pré-existente)
- CH-06: no app, "PIX · Aprovado" acima de "Registrado à mão · Meio: Transferência" — `spec-gap` (polimento)
- CH-06: pedido já cancelado continua oferecendo "Cancelar pedido" — `spec-gap` (pré-existente)
- CH-07: depois da falha de rede no desfazer, o foco fica no contêiner do diálogo — `spec-gap` (polimento)
- CH-07: o X dos diálogos se chama "Close", em inglês — `spec-gap` (pré-existente)
- CH-07: o pedido a 200 % em 390 rola 36 px (o botão "Em Separação" do próximo passo, não tocado pela mudança) — `spec-gap` (pré-existente)
- CH-02 e outras: o Brick carregou com chave pública de produção do `.env` local — observação de ambiente, não defeito do WI

### Perguntas ao produto

| #   | Comportamento observado | Pergunta | Critério · charter | Por que decide a jornada |
| --- | ----------------------- | -------- | ------------------ | ------------------------ |
| 1 | O pedido gravado fora da loja (#0563, total gravado R$ 10,00, diferente de itens + frete) aparece nas pendências da cliente com "R$ 10,00" e "Gerar novo PIX" | Para um pedido gravado fora da loja, a cliente deve ver e poder gerar um PIX novo — e por qual valor? Ou ele não deve oferecer pagar de novo e deve levar ao WhatsApp? | CA-01.6 · CH-04 | A cliente decide pagar pelo valor que lê; se o valor exibido não é o que será cobrado (CA-01.6 proíbe cobrar o gravado), ela paga outro valor ou é recusada no meio do pagamento |

### Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| "Registrar pagamento" fica no fim da página no celular (2.403 de 2.489 px), "Avançar mesmo assim" no topo | painel, Pedido, 390 | polimento | Pôr "Registrar pagamento" ao alcance no topo do pedido no celular |
| "Limpar data" troca a data por "Agora" e mantém a hora digitada; grava a hora de agora | painel, Registrar pagamento | polimento | Limpar a data limpa também a hora do pagamento |
| "Registrado por" mostra o e-mail da conta, não o nome | painel, bloco Pagamento | polimento | Mostrar o nome de quem registrou o pagamento |
| Método de pagamento cru ("pix", "card") no bloco Pagamento | painel, bloco Pagamento | pré-existente | Rótulo do método de pagamento pelo nome no pedido do painel |
| Link de cartão de pedido pago sem saída nenhuma | loja, `/pagar-com-cartao` | polimento | Saída para o pedido ou o WhatsApp na tela de link de pedido pago |
| Sem "Ajuda no WhatsApp" no cabeçalho de `/pagar-com-cartao` em 390 | loja, `/pagar-com-cartao` | pré-existente | Ajuda pelo WhatsApp no cabeçalho do pagamento no celular |
| Título "Pagamento com cartão" acima de "não há nada a pagar" | loja, `/pagar-com-cartao` | polimento | Título das telas de situação do link de cartão |
| A recusa da aba desatualizada fala em "aprovado" quando foi outro registro à mão | painel, Registrar pagamento | polimento | Frase da recusa do registro concorrente conforme quem pagou |
| Desfazer sem motivo: botão desabilitado sem dizer o que falta | painel, diálogo do desfazer | polimento | Dizer que o motivo é obrigatório no desfazer |
| O calendário da data não fecha ao escolher o dia e cobre "Comprovantes" | painel, Registrar pagamento | polimento | Fechar o calendário ao escolher o dia |
| A busca de Produtos não acha pelo nome da variação | painel, Produtos | pré-existente | Busca de produto pelo nome da variação |
| "Situação: Expirado" acima do selo "Pago depois de cancelado" | painel, bloco Pagamento | polimento | Situação do pagamento coerente com o selo de pagamento a devolver |
| O HEIC baixa abrindo uma aba em branco que fica aberta | painel, bloco Pagamento | polimento | Baixar o comprovante HEIC sem abrir aba vazia |
| A recusa do desfazer na aba desatualizada some em menos de 3 s | painel, Pedido | polimento | Manter visível a recusa do desfazer na aba desatualizada |
| Selo "PIX expirado" em pedido em Separando sem pagamento | loja, Pedido e Minha conta | pré-existente | Selo do pedido avançado sem pagamento na loja |
| Erro técnico cru, em inglês, na falha do PIX | loja, Pagamento do pedido | pré-existente | Esconder o erro técnico do meio de pagamento da cliente |
| Mensagens do WhatsApp começam com "Olá!" | loja, convites do WhatsApp | polimento | Mensagem pré-preenchida do WhatsApp sem exclamação |
| Cartão nunca cobrado diz "Aguardando a confirmação do pagamento" | loja, Pedido | pré-existente | Texto do pedido de cartão nunca cobrado |
| Pago por fora diz "O comprovante foi enviado para <e-mail>" sem saber se saiu | loja, Pedido | pré-existente | Confirmação do pedido pago por fora sem afirmar e-mail enviado |
| "Marcar como pago aqui não cobra ninguém" acima do botão que leva ao registro | painel, Pedido, próximo passo | polimento | Texto do "Avançar mesmo assim" de pedido não pago |
| Registrar vindo de "Outro status → Enviado" para em Pago sem lembrar o destino | painel, Pedido | polimento | Lembrar o destino escolhido depois do registro |
| Histórico "Em Separação → Em Separação" no registro de pedido já avançado | painel, Histórico | polimento | Linha do registro sem transição para o mesmo status |
| O cancelamento não diz se a cobrança aberta foi fechada | painel, diálogo de cancelar | polimento | Dizer no cancelamento o que aconteceu com a cobrança aberta |
| "—" solto ao lado do status no cabeçalho do pedido | painel, Pedido | pré-existente | Tirar o traço solto do cabeçalho do pedido |
| "PIX · Aprovado" acima de "Registrado à mão · Transferência" no app | app do ateliê, Pedido | polimento | Um meio só no bloco de valores do app |
| "Cancelar pedido" num pedido já cancelado | painel, Pedido | pré-existente | Esconder "Cancelar pedido" em pedido cancelado |
| Foco no contêiner do diálogo depois da falha do desfazer | painel, diálogo do desfazer | polimento | Foco no botão depois de falha no desfazer |
| O X dos diálogos se chama "Close" | painel, diálogos | pré-existente | Nome do botão de fechar dos diálogos em português |
| O pedido a 200 % em 390 rola 36 px de lado | painel, Pedido | pré-existente | Pedido do painel sem rolagem lateral com a fonte a 200 % |
| O cadastro do produto pede "sair da página?" sem nada editado | painel, Produto | pré-existente | Não pedir confirmação de saída sem edição no cadastro do produto |

### Riscos residuais

- **Vários defeitos na mesma jornada J-02** (conferir e desfazer): BUG-002 (critical), BUG-003 e BUG-004 (high) — o desfazer não está pronto para a dona; corrigi-los juntos (L2) e retestar a jornada inteira
- **Defeitos repetidos na tela "Registrar pagamento"**: BUG-001, BUG-006, BUG-010, BUG-011 — sinal de que a tela pede revisão de conjunto, não só quatro remendos
- BUG-001 tem o gatilho não isolado: em 1440 (CH-03) um PNG escolhido depois de outros campos entrou. O reteste precisa cobrir 390 e 1440, na ordem natural e com segunda escolha, e o seletor de verdade num Android (galeria e câmera)
- BUG-006 depende do instante do corte de rede; o corte no meio do envio de um comprovante grande não foi testado (o navegador da sessão não limita a rede)
- TC-INT-003: o uso do cupom não foi relido depois de registrar e desfazer (nenhum pedido livre com cupom); só o estoque foi provado
- A cobrança real (PIX novo, cartão pelo link, fechamento da cobrança aberta) e os e-mails não foram vistos em navegador — dependem dos probes 06, 07, 09 e 10 da Validation
- A chave pública do Mercado Pago no `.env` local da loja é de produção (o Brick carregou); nenhum cartão foi digitado — observação de ambiente
- A sessão CH-03 parte 2 fechou o navegador com a sessão admin ativa, e a CH-05 parte 2 abriu a tela do Google com o e-mail de teste no login da cliente (sem senha digitada) — conferir o perfil do navegador antes da próxima rodada

### Fora da cobertura

- TC-JOURNEY-002 (passos 3–4), TC-INT-005: pagar no Brick — chaves externas inválidas no servidor, chave pública de produção no Brick; não se digitou cartão
- TC-JOURNEY-003 (passo 3), TC-INT-007: o QR do PIX novo e o fechamento da cobrança anterior — Mercado Pago local responde `UNAUTHORIZED`
- TC-INT-001, TC-INT-009 e o e-mail de TC-INT-004: os e-mails às clientes saem pelo Resend com chave inválida e não chegam ao Mailpit; o par de pedidos do TC-INT-009 não existia
- TC-INT-004: o evento "Pedido cancelado" está desligado no ambiente — o diálogo não tem a caixa de aviso; o pedido cancelado não foi visto como cliente (a loja entra por código de e-mail, que não chega)
- TC-INT-006 passos 2–4 e TC-SEC-003 passo 2: chamada direta às functions — com os probes 06/07 da Validation
- TC-FUNC-026 passo 3 e variação M9 (desfazer com o app aberto; pago pela loja no app) — orçamento
- TC-FUNC-009 passo 4 na forma do TC (avançar para Separando na aba B e desfazer na A) e a variação Enviado/Entregue — sem massa livre
- TC-FUNC-012 em Enviado e Entregue — sem massa
- TC-FUNC-016 "antigo aberto antes" e TC-FUNC-017/TC-SEC-003 "cancelado com a tela aberta" — exigem a thread mudar dado durante a sessão
- TC-FUNC-018 "último dia", TC-FUNC-021 "cancelado com o QR aberto" — massa específica / ação da admin
- TC-CFR-001 passo 2 (rede cortada no confirmar do registro) e o registro inteiro só pelo teclado — orçamento
- Medidas do bloco Pagamento (alvos de "Desfazer registro", "Gerar link", comprovantes) a 100/130/200 % — não isoladas
- O painel em 390 nas telas de pedido de CH-03, CH-05 e CH-06 (vistas a 1280/1440)
- Viewport 320 × 568, movimento reduzido e rede lenta na loja (CH-04); rede lenta em todas as sessões (o navegador não limita)
- Paisagem (844 × 390), teclado virtual aberto, arrastar arquivo em 1440, extensão trocada, fuso `America/Manaus` — orçamento
- Fonte do sistema real, leitor de tela real, Android/iPhone real e a câmera tirando a foto — fora do navegador da sessão
- Rajada de 30 códigos de link (feita com 12); abrir o WhatsApp de fato (o `wa.me` foi conferido, não seguido)
