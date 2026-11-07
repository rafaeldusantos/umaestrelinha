```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-07T19:50:00Z",
  "branch": "feature/92",
  "duration_min": 43,
  "gates": [
    { "name": "build", "command": "pnpm build", "status": "pass", "summary": "PASS — pnpm build exit 0 (env local), Re-Validation 3 de 2026-11-07" },
    { "name": "lint", "command": "npx eslint . (por app)", "status": "pass", "summary": "store 2/2 · backoffice 23/5 · mobile-adm 0/0 — na baseline (25/7)" },
    { "name": "test", "command": "pnpm --filter @estrelinha/<w> exec vitest run --testTimeout=20000 (um workspace por vez)", "status": "pass", "summary": "21326/21326 (store 6997 · backoffice 5118 · functions 1462 na Re-Validation 3; mobile-adm 2375 da Re-Validation 2 e core 5374 da Validation 1, não tocados)" },
    { "name": "e2e", "command": "—", "status": "skip", "summary": "sem rodada E2E" }
  ],
  "coverage": {
    "acceptance_total": 38,
    "acceptance_covered": 33,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-SMOKE-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-SMOKE-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-SMOKE-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.5", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-JOURNEY-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.7", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.8", "validated_by": { "tc_ref": "TC-SMOKE-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.9", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.10", "validated_by": { "tc_ref": "TC-FUNC-021", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-03.11", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.12", "validated_by": { "tc_ref": "TC-JOURNEY-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-INT-002", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-JOURNEY-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-JOURNEY-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.3", "validated_by": { "tc_ref": "TC-JOURNEY-007", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-05.4", "validated_by": { "tc_ref": "TC-FUNC-028", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-FUNC-032", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-06.2", "validated_by": { "tc_ref": "TC-JOURNEY-007", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-02", "validated_by": { "tc_ref": "TC-REG-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-INT-003", "type": "integration" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "RNF-05", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-07", "validated_by": { "tc_ref": "—", "type": "manual" }, "status": "missing" }
    ],
    "missing": ["CA-03.10", "CA-04.1", "RNF-04", "RNF-07"]
  },
  "test_cases": [
    { "tc_ref": "TC-SMOKE-001", "verdict": "pass" },
    { "tc_ref": "TC-SMOKE-002", "verdict": "pass" },
    { "tc_ref": "TC-SMOKE-003", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-004", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-005", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-006", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-007", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-008", "verdict": "pass" },
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
    { "tc_ref": "TC-FUNC-021", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-022", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-023", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-024", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-025", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-026", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-027", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-028", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-029", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-030", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-031", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-032", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-033", "verdict": "pass" },
    { "tc_ref": "TC-INT-003", "verdict": "pass" },
    { "tc_ref": "TC-INT-004", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-REG-002", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-UI-003", "verdict": "pass" },
    { "tc_ref": "TC-UI-004", "verdict": "pass" },
    { "tc_ref": "TC-UI-005", "verdict": "blocked" },
    { "tc_ref": "TC-UI-006", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "RT3-retest-BUG-006-previa-10.png", "path": "screenshots/RT3-retest-BUG-006-previa-10.png" },
    { "label": "RT3-retest-BUG-006-loja-lista.png", "path": "screenshots/RT3-retest-BUG-006-loja-lista.png" },
    { "label": "RT3-retest-BUG-006-previa-20-nao-salvo.png", "path": "screenshots/RT3-retest-BUG-006-previa-20-nao-salvo.png" },
    { "label": "RT3-retest-BUG-006-lua-10-nao-salvo.png", "path": "screenshots/RT3-retest-BUG-006-lua-10-nao-salvo.png" },
    { "label": "RT3-retest-BUG-006-lua-loja.png", "path": "screenshots/RT3-retest-BUG-006-lua-loja.png" },
    { "label": "RT3-retest-BUG-014-loja-0386-390.png", "path": "screenshots/RT3-retest-BUG-014-loja-0386-390.png" },
    { "label": "RT3-retest-BUG-014-painel-0386.png", "path": "screenshots/RT3-retest-BUG-014-painel-0386.png" },
    { "label": "RT3-retest-BUG-014-atelie-0386-390.png", "path": "screenshots/RT3-retest-BUG-014-atelie-0386-390.png" },
    { "label": "RT3-retest-BUG-014-email-0386.png", "path": "screenshots/RT3-retest-BUG-014-email-0386.png" },
    { "label": "RT3-retest-BUG-014-loja-0387-30-390.png", "path": "screenshots/RT3-retest-BUG-014-loja-0387-30-390.png" },
    { "label": "CH-05-r3-01-previa-lista.png", "path": "screenshots/CH-05-r3-01-previa-lista.png" },
    { "label": "CH-05-r3-02-loja-lista-aberta.png", "path": "screenshots/CH-05-r3-02-loja-lista-aberta.png" },
    { "label": "CH-06-r3-01-sacola-corrente-pelo-catalogo.png", "path": "screenshots/CH-06-r3-01-sacola-corrente-pelo-catalogo.png" },
    { "label": "CH-06-r3-05-pedido-0385-painel.png", "path": "screenshots/CH-06-r3-05-pedido-0385-painel.png" },
    { "label": "CH-06-r3-06-adesao-30d-antes.png", "path": "screenshots/CH-06-r3-06-adesao-30d-antes.png" },
    { "label": "CH-06-r3-07-pedido-0365-cancelado.png", "path": "screenshots/CH-06-r3-07-pedido-0365-cancelado.png" },
    { "label": "CH-06-r3-08-adesao-30d-depois.png", "path": "screenshots/CH-06-r3-08-adesao-30d-depois.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 92 · Desconto da compra casada (Compre Junto)

**Gate 3:** confirmado em 2026-11-07

## Resumo

**Veredito:** partial. Nenhum bug fica aberto: o reteste resolveu o BUG-006 e o BUG-014. Mas o design-check (CH-09) não rodou, porque o MCP `claude-design` não tinha escopo de design, e o TC-UI-005 segue `blocked`.

Esta é a rodada de confirmação 3 de 3, sobre `feature/92` HEAD `17ef0715`, com as fix tasks 19 (BUG-014) e 20 (BUG-006). Ela refez os três TC que não tinham passado na rodada 2: o TC-JOURNEY-003 (falhava pelo BUG-006), o TC-FUNC-032 e o TC-UI-005 (os dois estavam `blocked`). Uma pessoa já consegue o seguinte:
- **a dona** lê na prévia da lista a mesma faixa que a loja oferece com aquela joia. Para a QA Correntes a 10 %, a prévia diz "de R$ 80,91 a R$ 125,91", e a loja tem a Veneziana a R$ 80,91 e a Banhada 80 cm a R$ 125,91. A peça esgotada e o adicional avulso saíram do piso, e a faixa também acompanha o percentual digitado e ainda não salvo (BUG-006);
- **a cliente com cupom** vê, depois de o desconto do Compre Junto subir, o cupom recalculado sobre o subtotal novo, e o resumo fecha com o Total em `/pedido/:id`, no painel, no app do ateliê e no e-mail. Isso foi visto em dois pedidos, #0386 e #0387 (BUG-014);
- **a dona** confere na Adesão que uma corrente comprada pelo catálogo, com desconto e sem a marca, conta só como pedido pago e nunca como peça levada junto. Um pedido pago que depois é cancelado sai da Adesão inteiro, com o valor e o desconto concedido descontados ao centavo (TC-FUNC-032).

O que impede o `pass` é só o design-check: as telas "o valor mudou" (checkout e link/Minha conta) e a Confirmação/Minha conta nunca foram conferidas contra o protótipo. O TC-UI-005 é P2, mas o charter CH-09 ficou `not-run`. Para fechar isso, alguém precisa rodar `/design-login` e repetir a sessão.

| TC | Critérios | Bugs novos | Reabertos | Reteste |
| --- | --- | --- | --- | --- |
| pass 55 · fail 0 · blocked 1 · skip 1 (acumulado; rodada 3: pass 2 · fail 0 · blocked 1 · skip 0) | 33 de 38 cobertos | 0 | 0 | resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Como ler as contagens: `test_cases` e a cobertura são **acumulados**. Cada TC traz o veredito da rodada mais recente em que foi refeito: `(r3)` nesta rodada, `(r2)` na anterior, e a rodada 1 nos demais. TC-INT-001, TC-INT-002 e TC-INT-005 seguem sem veredito, porque são `integration` e ficam com o Dev.

## Rodada

- **Ambiente:** loja http://localhost:8082 · painel http://localhost:8083 · ateliê http://localhost:8084 · Supabase local :54441. As edge functions locais foram servidas com as chaves do Mercado Pago, do Resend e do Melhor Envio inválidas de propósito. `*.supabase.co` e `**/g/collect*` ficaram bloqueados por rota
- **Branch / build:** `feature/92` (worktree `store__feature-92`), HEAD `17ef0715`, com as fix tasks 19 (`0dfb0847`, BUG-014) e 20 (`17ef0715`, BUG-006). Dev servers Vite, build não exposto
- **Execução:** Fase 2 em 2026-11-07, das 19:07 às ~19:50 UTC (43 min). O reteste correu das 19:18 às 19:32 UTC (16:18–16:32 BRT)
- **Browser:** Chromium headless (Playwright MCP) · **Viewports:** 390×844 e 1440×900
- **Personas e acesso:**
  - PER-02 e PER-03 → `admin-painel`. Como `QA_ADMIN_PAINEL_*` não estavam definidas, usou-se o usuário de desenvolvimento do `supabase/seed.sql` (seção 5), premissa da thread
  - PER-04 → `cliente-loja` (código pelo Mailpit)
  - PER-07 → convidada anônima `@exemplo.invalid`, só para produzir a massa M-07
- **Massa:** a thread aprovou o pagamento do #0385 no banco local com `apply_payment_approval` (M-07, papel da thread). O CH-06 cancelou pela tela os pedidos de QA #0383 e #0365. O reteste criou o #0386 e o #0387. A Adesão de 30 dias parte agora de 3 pedidos, 5 peças e R$ 356,60

## Gate técnico

- **Validation do Dev:** `qa-report.md`, PASS. É a Re-Validation 3 das fix tasks 19 e 20, de 2026-11-07
- **Rodada E2E:** sem rodada E2E

| Gate | Status | Resumo |
| --- | --- | --- |
| build | pass | `pnpm build` exit 0 (env local) |
| lint | pass | store 2/2 · backoffice 23/5 · mobile-adm 0/0, na baseline (25/7) |
| test | pass | 21326/21326. Na Re-Validation 3: store 6997 · backoffice 5118 · functions 1462. mobile-adm 2375 vem da Re-Validation 2 e core 5374 da Validation 1, os dois sem mudança |
| e2e | skip | sem rodada E2E |

O backoffice tem 7 erros de tipo, os mesmos de `ProposalStateBadge.test.tsx`. Vêm do commit base `4c6e9a16`, fora do WI, e a Re-Validation os registra.

## Cobertura — critério → TC

Os vereditos são acumulados. `(r3)` marca o TC refeito nesta rodada e `(r2)` o refeito na anterior.

| Critério | Fonte | TC | Veredito | Status |
| --- | --- | --- | --- | --- |
| CA-01.1 | prd | TC-SMOKE-003, TC-JOURNEY-003 (r3), TC-FUNC-001 | pass ×3 | covered |
| CA-01.2 | prd | TC-FUNC-002, TC-INT-001 | pass · não executado | partial |
| CA-01.3 | prd | TC-FUNC-003 | pass | covered |
| CA-01.4 | prd | TC-FUNC-004 | pass | covered |
| CA-01.5 | prd | TC-SMOKE-003, TC-JOURNEY-003 (r3), TC-FUNC-005 | pass ×3 | covered |
| CA-02.1 | prd | TC-SMOKE-001, TC-JOURNEY-003 (r3), TC-FUNC-006 (r2), TC-CFR-002 (r2) | pass ×4 | covered |
| CA-02.2 | prd | TC-JOURNEY-001 (r2), TC-FUNC-007 | pass · pass | covered |
| CA-02.3 | prd | TC-FUNC-008 | pass | covered |
| CA-02.4 | prd | TC-SMOKE-002, TC-FUNC-009, TC-FUNC-010 (r2) | pass ×3 | covered |
| CA-02.5 | prd | TC-FUNC-011 | pass | covered |
| CA-03.1 | prd | TC-JOURNEY-001 (r2), TC-FUNC-012 | pass · pass | covered |
| CA-03.2 | prd | TC-FUNC-013, TC-FUNC-014 | pass · pass | covered |
| CA-03.3 | prd | TC-JOURNEY-002, TC-FUNC-015 | pass · pass | covered |
| CA-03.4 | prd | TC-FUNC-015 | pass | covered |
| CA-03.5 | prd | TC-FUNC-010 (r2), TC-FUNC-016 (r2) | pass · pass | covered |
| CA-03.6 | prd | TC-JOURNEY-004 (r2), TC-FUNC-017 | pass · pass. O reteste do BUG-014 mostrou o cupom recalculado sobre o subtotal novo | covered |
| CA-03.7 | prd | TC-JOURNEY-001 (r2), TC-FUNC-018 (r2) | pass · pass | covered |
| CA-03.8 | prd | TC-SMOKE-002, TC-FUNC-019 | pass · pass | covered |
| CA-03.9 | prd | TC-FUNC-020 | pass | covered |
| CA-03.10 | prd | TC-FUNC-021 | skip (r1) | missing |
| CA-03.11 | prd | TC-FUNC-022 | pass | covered |
| CA-03.12 | prd | TC-JOURNEY-005, TC-FUNC-023 | pass · pass | covered |
| CA-04.1 | prd | TC-INT-002 | não executado | missing |
| CA-04.2 | prd | TC-JOURNEY-001 (r2), TC-FUNC-024 (r2) | pass · pass | covered |
| CA-04.3 | prd | TC-JOURNEY-005, TC-JOURNEY-006, TC-FUNC-025, TC-INT-003, TC-CFR-003 | pass ×5 | covered |
| CA-05.1 | prd | TC-JOURNEY-001 (r2), TC-FUNC-026 (r2), TC-FUNC-027 (r2) | pass ×3 | covered |
| CA-05.2 | prd | TC-JOURNEY-004 (r2), TC-FUNC-026 (r2), TC-FUNC-027 (r2), TC-FUNC-028, TC-INT-004 (r2) | pass ×5. O pedido recalculado com cupom fecha nas quatro superfícies (reteste do BUG-014) | covered |
| CA-05.3 | prd | TC-JOURNEY-007, TC-JOURNEY-008 (r2), TC-FUNC-030, TC-FUNC-031 (r2) | pass ×4 | covered |
| CA-05.4 | prd | TC-FUNC-028, TC-FUNC-029 | pass · pass | covered |
| CA-06.1 | prd | TC-FUNC-032 (r3) | pass | covered |
| CA-06.2 | prd | TC-JOURNEY-007, TC-FUNC-033 | pass · pass. A rodada 3 viu também o desconto concedido descontado ao cancelar um pedido pago | covered |
| RNF-01 | prd | TC-JOURNEY-001 (r2), TC-FUNC-009, TC-FUNC-024 (r2) | pass ×3 | covered |
| RNF-02 | prd | TC-REG-001 | pass | covered |
| RNF-03 | prd | TC-INT-003 | pass | covered |
| RNF-04 | prd | TC-INT-005 | não executado | missing |
| RNF-05 | prd | TC-UI-001, TC-UI-002, TC-UI-003 | pass ×3 | covered |
| RNF-06 | prd | TC-CFR-001 | pass | covered |
| RNF-07 | prd | — | — | missing |

**Sem cobertura:**
- CA-03.10: o TC-FUNC-021 ficou em `skip` na rodada 1 e nunca foi refeito, porque a rodada de confirmação só refaz os TC que falharam ou ficaram bloqueados. A Validation o cobre com `cartDiscount.test.ts` e `compreJuntoSacolaECheckout.test.tsx`
- CA-04.1: o TC-INT-002 é `integration` e fica com o Dev. A Validation o cobre com `buyTogetherCharge.test.ts`
- RNF-04: o TC-INT-005 é `integration`. A Validation o cobre com `shoppingParity.test.ts`
- RNF-07: não tem TC por desenho, porque é condição do ambiente
- CA-01.2 está parcial: o TC-INT-001 não foi executado

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CH-05 | PER-02 | — (confirmação) | done | 13 de 13 | pass 1 | 0 | — |
| CH-06 | PER-07 (massa) · PER-02 | Feature (por cenário) | done | 20 de 13. A parte A usou 16, dentro do teto de 20 dela, e a variação do cancelamento foi pedida pela thread | pass 1 | 0 (1 observação) | — |
| CH-09 | PER-01 | — (design-check) | not-run (design: o MCP `claude-design` respondeu `needs_design_scopes`, faltou o `/design-login`) | 0 de 13 | blocked 1 | 0 | — |
| CH-01, CH-02, CH-03, CH-04, CH-07, CH-08 | — | — | not-run (confirmação: todos os TC deles já tinham passado) | 0 | — | — | — |
| Reteste | PER-02, PER-03, PER-04 | — | done | 2 bugs | — | 0 | — |

## CFR

Não rodou. O CH-08 é de confirmação e todos os TC dele já tinham passado. O reteste do BUG-014 mediu `scrollWidth` 390 no app do ateliê e em `/pedido/:id` a 390, sem rolagem horizontal.

## Design-check

- **Protótipo:** Claude Design `69224d8a-17ae-4b1f-a251-a8105b41edc2` ("Pedido - Desconto do Compre Junto"). Nesta sessão ele não foi lido
- **Status:** not-run (design). O MCP `claude-design` recusou com `needs_design_scopes` e pediu `/design-login`. Pela regra do design-check, nada foi conferido de memória, e a massa da sessão não foi produzida
- **Divergências:** nenhuma nova nesta rodada. As D1–D4 da rodada 2 (low) seguem em Sugestões de backlog. TC-UI-005 segue `blocked` nas telas Checkout · o valor mudou, Link / Minha conta · o valor mudou e Confirmação / Minha conta

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada. Nenhum bug fica aberto ao fim da rodada.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | --- | --- | --- | --- | --- |
| BUG-006 | [Painel · aba Compre junto] A prévia da faixa de uma lista inclui o preço de uma peça que a loja não oferece nessa lista — para a dona | reteste (e CH-05) | still-open → resolved | mantida (high) | `screenshots/RT3-retest-BUG-006-previa-10.png` |
| BUG-014 | [Pedido recalculado] Com cupom, depois de o desconto subir, a linha do cupom fica no valor antigo e o resumo não fecha com o Total | reteste | open → resolved | mantida (high) | `screenshots/RT3-retest-BUG-014-loja-0386-390.png` |

Texto proposto para o Histórico do BUG-006: "2026-11-07 · still-open → resolved · A prévia da QA Correntes a 10 % diz 'de R$ 80,91 a R$ 125,91'. A loja tem o piso na Veneziana (R$ 80,91) e o teto na Banhada 80 cm (R$ 125,91), sem a Esgotada e sem o Berloque avulso. Com 20 % digitado e não salvo, a prévia passa a 'de R$ 71,92 a R$ 111,92'. Na QA Pingente Lua, a mesma lista dá 'de R$ 80,91 a R$ 278,91', igual à loja. A frase se repetiu nas 3 leituras do reteste e nas 2 do CH-05 r3 · `screenshots/RT3-retest-BUG-006-previa-10.png`, `screenshots/RT3-retest-BUG-006-loja-lista.png`, `screenshots/CH-05-r3-01-previa-lista.png`"

Texto proposto para o Histórico do BUG-014: "2026-11-07 · open → resolved · No #0386 (15 % → 25 %), as quatro superfícies mostram Subtotal R$ 329,80 · Compre Junto −R$ 17,47 · Cupom −R$ 46,85 · PIX −R$ 18,58 · Frete R$ 19,90 · Total R$ 266,80, e a conta fecha. No banco ficou `discount 46.85` e `total 266.80`. No #0387 (25 % → 30 %), o Total é R$ 264,03 e a conta fecha na loja e no painel · `screenshots/RT3-retest-BUG-014-loja-0386-390.png`, `screenshots/RT3-retest-BUG-014-painel-0386.png`, `screenshots/RT3-retest-BUG-014-atelie-0386-390.png`, `screenshots/RT3-retest-BUG-014-email-0386.png`, `screenshots/RT3-retest-BUG-014-loja-0387-30-390.png`"

**Reteste `blocked`:** nada

## Achados que não viraram bug

- Reteste do BUG-014: o #0381 da rodada 2, recalculado antes do fix, continua gravado com `discount 47.90` e `total 266.80`. É `conforme a fonte`: o pedido gravado é um retrato e não muda (CA-05.4). É massa local anterior ao fix, e o WI não foi publicado. Os pedidos recalculados depois do fix fecham
- Reteste: o aviso "alterações não salvas" (`beforeunload`) aparece ao sair da edição de produtos sem mexer em nada. É `pré-existente`, fora da superfície da mudança e abaixo de `high`, e o `CLAUDE.md` já o registra no QA da feature 85. Vai a Sugestões de backlog
- Reteste: o 429 em `/auth/v1/otp` ao pedir o código duas vezes seguidas é `conforme a fonte`: é o limite do GoTrue
- CH-06: a sacola escreve "Acompanha o QA Pingente Estrela · 10% a menos" na corrente posta pelo catálogo, mas o pedido gravado não leva a marca. É `conforme a fonte`: a frase da sacola explica o desconto (CA-03.4), e a Adesão conta pela marca, que vem só do bloco (CA-06.1)
- CH-06 passo 11: o botão "Conta e saída" não foi achado pelo nome em 1440, e a ação estourou o tempo. Na rodada 2 a saída foi por ele. Isso é do harness, numa sessão já acima do orçamento, sem fonte nem segunda ocorrência, então fica como `intermitente sem segunda ocorrência`

## Perguntas ao produto

nada (rodada de confirmação)

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| --- | --- | --- | --- |
| O painel abre o aviso "alterações não salvas" ao sair da edição de um produto em que nada foi mexido (já registrado no QA da feature 85) | painel, edição de produto | pré-existente | "Alterações não salvas" só quando algo mudou na edição do produto |

As sugestões do `qa-result-2026-11-07.md` (rodada 2) e do `qa-result-2026-11-04.md` (rodada 1) continuam valendo como estão. Entre elas estão D1–D4 do design-check, a gaveta e o checkout com preços diferentes quando a oferta vence o casado, a oferta em "Seu pedido", o motivo do desconto combinado no app e o foco e a ação única no aviso do valor mudado.

## Riscos residuais

- **O BUG-006 está resolvido para três das peças que a loja pula:** a esgotada, o adicional avulso e a própria joia. Duas não foram exercitadas por falta de massa: a peça inativa (fora do ar) e a variação não oferecida, porque na Cartier o teto vem da Banhada. A Re-Validation 3 cobre a regra por teste. Em navegador só se viu metade
- **O recálculo com mais de um desconto só foi visto com cupom.** Ficaram de fora o recálculo com promoção progressiva ou com a oferta do checkout, o "valor mudou" (mais caro) com cupom e o "desconto concedido" da Adesão para um pedido recalculado
- **Ninguém viu um pagamento chegar ao Mercado Pago.** O "cobrado" é o Total gravado, e o valor que o QR traria não foi visto
- **A barra fixa "Levar o conjunto" mediu y 882 numa janela de 844** (CH-03, nas rodadas 1 e 2), sempre depois de redimensionar de 1440 para 390. Ninguém reconferiu abrindo direto em 390
- **Pendência do Dev registrada no `qa-report.md`:** a migration `20261107170000` (BUG-007) está aplicada no banco local por `psql`, fora de `supabase_migrations.schema_migrations`. A ordem de publicação é migration → bundle do app
- **Esta foi a rodada 3 de 3.** O TC-UI-005 só sai de `blocked` com uma sessão de design-check depois do `/design-login`

## Fora da cobertura

- CH-09 `not-run` (design). O TC-UI-005 (P2) segue `blocked` nas telas Checkout · o valor mudou, Link / Minha conta · o valor mudou e Confirmação / Minha conta
- CH-01, CH-02, CH-03, CH-04, CH-07 e CH-08 não rodaram, porque é confirmação e todos os TC deles já tinham passado
- TC-INT-001 (P1), TC-INT-002 (P0) e TC-INT-005 (P2) seguem sem veredito: são `integration` e ficam com o Dev
- TC-FUNC-021 (P1) segue `skip` desde a rodada 1
- CH-05:
  - lista com peça inativa e com variações não oferecidas: sem massa;
  - o teto R$ 125,91 não foi reaberto na loja pelo CH-05, mas o reteste o viu;
  - viewports 1024 e 390 não foram refeitos;
  - a lista "QA Probe Sem Venda", nova na tela, não foi tocada
- CH-06:
  - os períodos de 7 e 90 dias da Adesão não foram refeitos;
  - a variação com o #0383 (com a marca, cancelado sem ter sido pago) não discrimina nada, e quem prova a regra é o #0365;
  - a saída da conta pela tela não aconteceu
- CH-09: a massa (conta `cliente-loja`, pedido PIX pendente, troca de percentual) não foi produzida
- Das rodadas anteriores, sem mudança:
  - TC-JOURNEY-004 e BUG-001 no cartão: o Brick não sobe no local;
  - TC-INT-004 no Mailpit e em 390;
  - CH-08: o aviso longo a 390/200 %;
  - CH-01: o arrasto vertical com toque real;
  - CH-07: fonte a 130 %, giro e rede caindo
- Leitor de tela real, Safari/iOS, Chrome Android, o Android real do ateliê, movimento reduzido, tema escuro e rede lenta
