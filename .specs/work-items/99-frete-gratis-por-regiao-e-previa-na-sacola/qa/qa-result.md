```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-14T19:00:00Z",
  "branch": "feature/99",
  "duration_min": 55,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "3/3 com as VITE_* do Supabase local na env (Validation 2)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (store)",
      "status": "pass",
      "summary": "store 2 erros / 2 warnings, igual à baseline (Validation 2; backoffice e mobile-adm não remedidos)"
    },
    {
      "name": "test",
      "command": "vitest run --testTimeout=20000 --maxWorkers=2 (store, Validation 2); core, functions, backoffice e mobile-adm da Validation 1",
      "status": "pass",
      "summary": "23580/23580"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 26,
    "acceptance_covered": 13,
    "items": [
      { "criterion": "CA-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-02", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-06", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-07", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-08", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-09", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-10", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-11", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-12", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-13", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-14", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-15", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-16", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-17", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-18", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-19", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-20", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-21", "validated_by": { "tc_ref": "TC-INT-001", "type": "integration" }, "status": "partial" },
      { "criterion": "CA-22", "validated_by": { "tc_ref": "TC-CFR-003", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-23", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-24", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-25", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-26", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" }
    ],
    "missing": ["CA-05", "CA-10"]
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-009", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-010", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-017", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-018", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-019", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-020", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "skip" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "blocked" },
    { "tc_ref": "TC-UI-002", "verdict": "blocked" },
    { "tc_ref": "TC-UI-003", "verdict": "blocked" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "CH-01-r2-01-sacola-vazia-apos-adicionar.png", "path": "screenshots/CH-01-r2-01-sacola-vazia-apos-adicionar.png" },
    { "label": "CH-01-r2b-03-gaveta-sp-liberado-390.png", "path": "screenshots/CH-01-r2b-03-gaveta-sp-liberado-390.png" },
    { "label": "CH-01-r2b-04-checkout-sp-390.png", "path": "screenshots/CH-01-r2b-04-checkout-sp-390.png" },
    { "label": "CH-01-r2c-01-checkout-sp-entrega-resumo-390.png", "path": "screenshots/CH-01-r2c-01-checkout-sp-entrega-resumo-390.png" },
    { "label": "CH-03-r2-19-checkout-pac-segunda-ida.png", "path": "screenshots/CH-03-r2-19-checkout-pac-segunda-ida.png" },
    { "label": "CH-03-r2-25-checkout-cep-nao-encontrado.png", "path": "screenshots/CH-03-r2-25-checkout-cep-nao-encontrado.png" },
    { "label": "CH-08-r2-01-sem-cep-100.png", "path": "screenshots/CH-08-r2-01-sem-cep-100.png" },
    { "label": "retest-r2-BUG-001-ida1-retirada.png", "path": "screenshots/retest-r2-BUG-001-ida1-retirada.png" },
    { "label": "retest-r2-BUG-001.png", "path": "screenshots/retest-r2-BUG-001.png" },
    { "label": "retest-r2-BUG-001-recarregado.png", "path": "screenshots/retest-r2-BUG-001-recarregado.png" },
    { "label": "retest-r2-BUG-001-tentativa2.png", "path": "screenshots/retest-r2-BUG-001-tentativa2.png" },
    { "label": "retest-r2-BUG-001-sedex.png", "path": "screenshots/retest-r2-BUG-001-sedex.png" },
    { "label": "retest-r2-BUG-002-checkout.png", "path": "screenshots/retest-r2-BUG-002-checkout.png" },
    { "label": "retest-r2-BUG-002-pedido-montado.png", "path": "screenshots/retest-r2-BUG-002-pedido-montado.png" },
    { "label": "retest-r2-BUG-003-007.png", "path": "screenshots/retest-r2-BUG-003-007.png" },
    { "label": "retest-r2-BUG-003-retirada.png", "path": "screenshots/retest-r2-BUG-003-retirada.png" },
    { "label": "retest-r2-BUG-004-abaixo.png", "path": "screenshots/retest-r2-BUG-004-abaixo.png" },
    { "label": "retest-r2-BUG-004-liberado.png", "path": "screenshots/retest-r2-BUG-004-liberado.png" },
    { "label": "retest-r2-BUG-004-ba.png", "path": "screenshots/retest-r2-BUG-004-ba.png" },
    { "label": "retest-r2-BUG-004-1440.png", "path": "screenshots/retest-r2-BUG-004-1440.png" },
    { "label": "retest-r2-BUG-005.png", "path": "screenshots/retest-r2-BUG-005.png" },
    { "label": "retest-r2-BUG-006.png", "path": "screenshots/retest-r2-BUG-006.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 99 · Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

**Gate 3:** confirmado em 2026-11-14

## Resumo

**Veredito:** partial. Nenhum bug fica aberto, mas o design-check (CH-07) não rodou: as fontes de design estavam
ilegíveis. Com isso, TC-UI-001, TC-UI-002 (P1) e TC-UI-003 ficam `blocked`. O TC-FUNC-006 (P0) também não terminou:
falta o RS.

Esta é a rodada de confirmação (rodada 2) depois das fix tasks 12, 13 e 14. Rodaram o reteste dos 7 bugs abertos e
os charters que tinham TC `fail` ou `blocked` na rodada 1: CH-01, CH-03, CH-07 e CH-08. O reteste dá os 7 como
`resolved`:

- BUG-001 (critical): a rua do endereço salvo segura em três idas ao checkout e depois de recarregar.
- BUG-002 (high): o CEP não localizado limpa Rua, Bairro, Cidade e UF, no checkout e no pedido montado.
- BUG-003 a BUG-007 (low): o rodapé tem 266 px, o balão do ⓘ fica a 12 px de cada borda, a faixa liberada tem 42 px,
  o ícone do botão tem 20 px e o espaço da linha recolhida é de 10 px.

O CH-03 e o CH-08 confirmam o BUG-001 e o BUG-003 pelos próprios TC: TC-JOURNEY-003 e TC-CFR-001 passam. Nenhuma
sessão viu regressão nem achado novo `critical` ou `high`. Por isso, nenhum bug novo.

Hoje, Teresa vai e volta da sacola ao checkout sem perder o endereço salvo. Cida corrige o CEP sem herdar o endereço
de outra cidade. Luana, em São Paulo, vê o frete grátis liberado na gaveta e chega ao checkout com o CEP, o
endereço, o PAC "Grátis" e o mesmo Total no preço cheio. A diferença de R$ 39,19 é o Desconto PIX do meio
pré-marcado, conforme a decisão Q1. Três coisas a rodada **não** prova:

- **TC-FUNC-006, RS:** em duas rodadas, ninguém viu o Rio Grande do Sul pelo caso (gaveta, ⓘ "Porto Alegre/RS, região
  Sul" e checkout), nem a gaveta em 1440. O reteste do BUG-005 viu a faixa liberada com 90010-000, mas só a faixa.
- **TC-UI-001, TC-UI-002 e TC-UI-003:** não foram conferidos contra o protótipo. As correções de layout foram medidas
  contra os valores que os bugs registraram na rodada 1, não contra o desenho.
- **TC-FUNC-008, passo 1** (CEP da gaveta diferente do salvo): não rodou em nenhuma das duas rodadas.

| TC                                    | Critérios         | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | ----------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 20 · fail 0 · blocked 3 · skip 7 | 13 de 26 cobertos | 0          | 0         | resolved 7 · still-open 0 · cannot-reproduce 0 · blocked 0 |

## Rodada

- **Ambiente:** loja http://localhost:8092, o dev server do worktree `store__feature-99`. As portas 8082 e 8083 servem
  outro checkout. Supabase local (API 54441, Mailpit 54444); functions servidas do worktree com chaves externas
  inválidas. O painel não subiu: nenhum charter de confirmação o usa
- **Branch / build:** `feature/99`, com o HEAD nas fix tasks 12 (`868da880`), 13 (`50c65d4d`) e 14 (`429d32dd`). É
  o dev server, não o build de produção; o build não está exposto
- **Execução:** 2026-11-14, das 15:05 às 16:00 (-03:00), cerca de 55 min. O cabeçalho do `retest.md` registra das
  12:11 às 12:24, no relógio do retester
- **Browser:** Chromium headless (playwright-cli 0.1.24) · **Viewports:** 390 × 844 em todas as sessões; 1440 × 900
  no checkout do CH-01 (continuação 2) e no reteste do BUG-003 e do BUG-004. Fonte da raiz a 100 % e a 200 % (CH-03,
  CH-08)
- **Personas e acesso:**
  - PER-01 Luana → `anonima` (CH-01, CH-07, CH-08). Os bugs da sacola foram retestados com a conta
    `cliente-salvador` (`QA_CLIENTE_SALVADOR_USUARIO`), por causa do charter em paralelo
  - PER-02 Cida → `cliente-salvador` (reteste do BUG-002) e o link `QA_PEDIDO_MONTADO_LINK`, com o host trocado
    para 8092
  - PER-04 Teresa → `cliente-com-endereco` (`QA_CLIENTE_COM_ENDERECO_USUARIO`) (CH-03, reteste do BUG-001)
  - PER-03 Adri → sem sessão nesta rodada

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — PASS, da Validation 2, de 2026-11-14 (a revalidação das fix
  tasks 12–14, que só remediu `apps/store`)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build`: 3/3 com as `VITE_*` do Supabase local na env (Validation 2) |
| lint  | pass   | store com 2 erros e 2 warnings, igual à baseline (`npx eslint .`, Validation 2). Backoffice (23/5) e mobile-adm (0/0) não foram remedidos: os números são da Validation 1 |
| test  | pass   | 23580/23580. A store tem 7646 (Validation 2, `--maxWorkers=2`, exit 0); core 6091, functions 1711, backoffice 5398 e mobile-adm 2734 são da Validation 1, não remedidos (o diff das fix tasks só toca `apps/store`) |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01 | prd (97) | TC-FUNC-001, TC-UI-002 | pass (r1) · blocked | partial |
| CA-02 | prd (97) | TC-FUNC-001 | pass (r1) | covered |
| CA-03 | prd (97) | TC-FUNC-002 | pass (r1) | covered |
| CA-04 | prd (97) | TC-FUNC-003, TC-JOURNEY-001 | pass (r1) · pass (r1), com o mesmo meio de pagamento (Q1) | covered |
| CA-05 | prd (97) | TC-FUNC-004, TC-UI-002 | skip (r1) · blocked | missing |
| CA-06 | prd (97) | TC-FUNC-006, TC-FUNC-015, TC-FUNC-019 | skip (passos 1–3 em SP conferidos) · pass (r1) · pass (r1) | partial |
| CA-07 | prd (97) | TC-FUNC-011, TC-JOURNEY-003 | pass (r1) · pass | covered |
| CA-08 | prd (97, com M-06 do 99) | TC-CFR-001, TC-UI-002 | pass · blocked | partial |
| CA-09 | prd (97) | TC-FUNC-007, TC-FUNC-008, TC-JOURNEY-001, TC-UI-003 | pass (r1) · skip (passo 2 conferido) · pass (r1) · blocked | partial |
| CA-10 | prd (97) | TC-FUNC-009 | skip (r1) | missing |
| CA-11 | prd (97) | TC-FUNC-010 | skip (r1, passos 1–2 conferidos) | partial |
| CA-12 | prd (97) | TC-FUNC-017 | skip (r1, passo 1 conferido) | partial |
| CA-13 | prd (97) | TC-CFR-002 | pass (r1) | covered |
| CA-14 | prd (99) | TC-FUNC-005, TC-UI-001 | pass (r1) · blocked | partial |
| CA-15 | prd (99) | TC-FUNC-012, TC-JOURNEY-002, TC-UI-001 | pass (r1) · pass (r1) · blocked | partial |
| CA-16 | prd (99) | TC-FUNC-006, TC-JOURNEY-001, TC-UI-001 | skip (SP conferido, RS não) · pass (r1) · blocked | partial |
| CA-17 | prd (99) | TC-FUNC-013, TC-JOURNEY-002, TC-UI-001 | pass (r1) · pass (r1) · blocked | partial |
| CA-18 | prd (99) | TC-FUNC-014 | pass (r1) | covered |
| CA-19 | prd (99) | TC-FUNC-019 | pass (r1) | covered |
| CA-20 | prd (99) | TC-FUNC-018 | pass (r1) | covered |
| CA-21 | prd (99) | TC-INT-001 | skip (r1, passos 1–2 conferidos; a prova no servidor são os testes de handler do Dev) | partial |
| CA-22 | prd (99) | TC-CFR-003 | pass (r1) | covered |
| CA-23 | prd (99) | TC-CFR-001 | pass (266 px ≤ 270) | covered |
| CA-24 | prd (99) | TC-FUNC-020 | pass (r1) | covered |
| CA-25 | prd (99) | TC-FUNC-015 | pass (r1) | covered |
| CA-26 | prd (99) | TC-FUNC-016 | pass (r1) | covered |

`(r1)` marca o veredito que vem da rodada 1 (`qa-result-2026-11-14-rodada-1.md`), de TC cujo charter não rodou
nesta confirmação.

**Sem cobertura:**

- **CA-05:** o TC-FUNC-004 não rodou em nenhuma das duas rodadas (orçamento). O TC-UI-002 ficou `blocked` com o
  design-check. Recolher e reabrir a lista foi visto só no entorno (reteste do BUG-007; CH-08, passo 05), fora de TC.
- **CA-10:** o TC-FUNC-009 não rodou em nenhuma das duas rodadas. Precisa da fixture B e do orçamento do CH-03.

A queda de 18 para 13 critérios cobertos vem dos três TC-UI, que passaram de `fail` (rodada 1) a `blocked`: o
design-check não abriu as fontes. Não é regressão do produto.

**Notas de veredito:**

- **TC-FUNC-006 (P0) — `skip`, não `blocked`:** as três sessões do CH-01 o marcaram `blocked`, mas o motivo nas três
  é o orçamento. Na primeira, o A-1 foi fechado depois como condução do driver. Pela regra dos vereditos, isso é
  `skip`: `blocked` é credencial, massa ou outro bug. O que foi conferido em SP a 390:
  - passo 1: liberado, sem barra; PAC "Grátis" com o R$ 21,40 riscado (`line-through` conferido); SEDEX cobrado;
    Total R$ 559,80;
  - passo 2: o ⓘ com "Entrega em São Paulo/SP, região Sudeste…";
  - passo 3: o checkout com o CEP trazido, o PAC "Grátis" marcado e o mesmo Total no preço cheio. O checkout também
    foi visto a 1440.

  Falta o passo 4 (90010-000) e a gaveta a 1440.
- **TC-FUNC-008 (P1) — `skip`, não `pass`:** a sessão deu `pass`. O passo 2 (CEP igual ao salvo) confere em três
  idas e depois de recarregar. O passo 1 (01310-100, diferente do salvo; o salvo não pode entrar) não rodou nesta
  rodada nem na rodada 1. Pela mesma regra, o caso fica `skip`, com o passo 2 conferido. O BUG-001, que mora no
  passo 2, está `resolved` pelo reteste.
- **TC-JOURNEY-003 (P1) — `pass`:** os passos 1 a 4 conferem. O caminho de abandono e a variação de teclado não
  foram refeitos: são ramo e variação, não passos do caso.
- **TC-UI-001, TC-UI-002 e TC-UI-003 — `blocked` (design):**
  - o MCP do Claude Design respondeu `needs_design_scopes`;
  - a cópia publicada da Sacola v2 respondeu 403 (challenge);
  - a cópia migrada do checkout parou em "A network check stopped this artifact from loading."
- **TC-CFR-002 e TC-CFR-003:** o CH-08 não os refez (fora da confirmação) e eles mantêm o `pass` da rodada 1.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 (+ continuação, + continuação 2) | PER-01 Luana | Feature (confirmação, sem tour) | done. O orçamento acabou nas três; o RS e a gaveta em 1440 ficaram fora | 25 de 25 · 30 de 30 · 25 de 25 | skip 1 (TC-FUNC-006; as sessões disseram `blocked`) | 1 (A-1, fechado como condução) | — |
| CH-03 | PER-04 Teresa | Back-Button (confirmação) | done | 25 de 25 | pass 1 · skip 1 (TC-FUNC-008 reclassificado na triagem) | 0 (1 sugestão de backlog) | — |
| CH-07 | PER-01 Luana | — (design-check) | not-run (design): o MCP do Claude Design sem o escopo `user:design:read`; os links publicados com 403 ou bloqueados pelo network check | 7 de 25 | blocked 3 | 0 | — |
| CH-08 | PER-01 Luana | — (cfr) | done | 18 de 18 | pass 1 (TC-CFR-002 e 003 fora da confirmação) | 0 | — |
| Reteste | PER-04 · PER-02 · PER-01 | — | done | — | — | 1 (N-1) | BUG-001..007 `resolved` |
| CH-02, CH-04, CH-05, CH-06 | — | — | not-run (confirmação): todos os TC deles deram `pass` ou `skip` na rodada 1 | — | — | — | — |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01 | ok. O ⓘ tem o nome "Sobre o frete grátis"; a `progressbar` tem nome; as opções são `radio` num `radiogroup`; os alvos do rodapé têm ≥ 44 px de altura. A exceção é o "Trocar CEP", com 20 px visíveis e a área ampliada, o mesmo da rodada 1 | — |
| Responsividade        | J-01 | ok. O rodapé recolhido mede 266 px a 100 % (≤ 270); aberto, 374 px. A 200 %, recolhido, 442 px sem rolar; aberto, 608 px, rolando por dentro sem corte. Nenhuma nota abaixo do Total; a gaveta não rola de lado. O documento rola 45 px pelo cabeçalho a 200 %, o que é pré-existente | — |
| Performance percebida | — | não rodou nesta rodada (ok na rodada 1) | — |
| Segurança visível     | — | não rodou (nenhum TC da categoria no plano) | — |

A J-02, a recuperação de erro e as variações a 130 % e com cupom do TC-CFR-001 não rodaram, por ser rodada de
confirmação e por orçamento.

## Design-check

- **Protótipo:**
  - Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html`: ilegível. O MCP respondeu `needs_design_scopes`, e a
    cópia publicada `claude.ai/artifact/2yUJyqwYr6tipVWQEh8xdd` respondeu 403.
  - `69224d8a-…` (checkout): a cópia migrada `claude.ai/code/artifact/41e4046b-…` foi bloqueada pelo network check.
- **Status:** not-run (design). A sessão não conferiu de memória, nem pelos valores dos bugs nem pelas screenshots
  da rodada 1. Para destravar: `/design-login`, ou uma fonte legível (o CSS e o JSX exportados, ou imagens dos frames).
- **Divergências:** 0. Não houve comparação. Os valores esperados de BUG-003..007, lidos do protótipo na rodada 1,
  foram medidos pelo reteste.

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC  |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | --- |

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-001 | [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta | reteste (e CH-03, TC-JOURNEY-003) | open → resolved | mantida (critical) | `screenshots/retest-r2-BUG-001.png` · `screenshots/retest-r2-BUG-001-tentativa2.png` · `screenshots/retest-r2-BUG-001-recarregado.png` · `screenshots/retest-r2-BUG-001-sedex.png` · `screenshots/CH-03-r2-19-checkout-pac-segunda-ida.png` |
| BUG-002 | [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior | reteste | open → resolved | mantida (high) | `screenshots/retest-r2-BUG-002-checkout.png` · `screenshots/retest-r2-BUG-002-pedido-montado.png` |
| BUG-003 | [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px | reteste (e CH-08, TC-CFR-001) | open → resolved | mantida (low) | `screenshots/retest-r2-BUG-003-007.png` · `screenshots/retest-r2-BUG-003-retirada.png` |
| BUG-004 | [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta | reteste | open → resolved | mantida (low) | `screenshots/retest-r2-BUG-004-abaixo.png` · `screenshots/retest-r2-BUG-004-liberado.png` · `screenshots/retest-r2-BUG-004-ba.png` · `screenshots/retest-r2-BUG-004-1440.png` |
| BUG-005 | [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px | reteste | open → resolved | mantida (low) | `screenshots/retest-r2-BUG-005.png` |
| BUG-006 | [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px | reteste | open → resolved | mantida (low) | `screenshots/retest-r2-BUG-006.png` |
| BUG-007 | [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px | reteste | open → resolved | mantida (low) | `screenshots/retest-r2-BUG-003-007.png` · `screenshots/retest-r2-BUG-003-retirada.png` |

**Reteste `blocked`:** nada

## Achados que não viraram bug

- **CH-01 A-1: "Adicionar à sacola" sem efeito** (`screenshots/CH-01-r2-01-sacola-vazia-apos-adicionar.png`).
  Fechado na continuação como condução, não produto:
  - o clique do driver falhou com "element is outside of the viewport";
  - com a página rolada, o mesmo botão põe a peça na sacola (CH-01 continuação, passos 05–06; e em todas as demais
    sessões).

  O atrito de fundo, o botão fora da dobra a 390, já é a Sugestão de backlog da rodada 1 ("'Adicionar à sacola'
  visível e tocável sem rolar no celular").
- **CH-01 (continuações): o Resumo do checkout mostra R$ 520,61 e a gaveta, R$ 559,80.** `conforme a fonte`
  (`decisoes-produto.md`, Q1: o "mesmo Total" vale com o mesmo meio de pagamento). No preço cheio, os dois dão
  R$ 559,80. A diferença é o Desconto PIX (7 %) de R$ 39,19 do meio pré-marcado.
- **Reteste N-1: "[Checkout · Entrega] Ao abrir o bloco com o endereço salvo, o CEP aparece sem hífen ('90010000')"**
  (PER-04, J-05, passo 3; 2 de 2).
  - É defeito `low` (Cosmético): o resumo recolhido diz "CEP 90010-000", o CEP está certo, e nada atrapalha concluir.
  - Não é regressão: o log do CH-03 da rodada 1 já o registra (passos 23–24), e o CH-03 desta rodada o viu de novo
    (passos 23–24).
  - Na confirmação, só regressão ou achado `critical`/`high` vira bug: vai a Sugestões de backlog.
  - Não há screenshot do bloco aberto.
- **CH-03, passo 25: com um CEP não localizado no checkout, o Número e o Complemento do endereço anterior ficam no
  formulário** enquanto Rua, Bairro, Cidade e UF esvaziam (`screenshots/CH-03-r2-25-checkout-cep-nao-encontrado.png`).
  `spec-gap`:
  - nenhuma fonte define o que acontece com o Número e o Complemento;
  - o esperado do BUG-002 e a `spec.md` falam de Rua, Bairro, Cidade e UF;
  - o formulário fica aberto e pede a rua à mão.

  Rodada de confirmação: vai a Sugestões de backlog.
- **CH-08: o "Trocar CEP" com 20 px visíveis, a área ampliada ≥ 37 px e os 44 px não confirmados.** Já está nos
  Riscos residuais da rodada 1, sem mudança. Não é achado novo.
- **CH-08: a página do produto no 8092 montou o conteúdo com atraso** (uma ocorrência; o primeiro snapshot veio só
  com o rodapé e os cookies). É ambiente (dev server), `intermitente sem segunda ocorrência`.

## Perguntas ao produto

nada — rodada de confirmação.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Com o endereço salvo trazido para o checkout, "Alterar" abre o bloco com o campo CEP sem a máscara: mostra "90010000", e não "90010-000". O placeholder é "00000-000", e o CEP vindo da sacola sem endereço salvo aparece com hífen | checkout › Entrega, campo CEP (endereço salvo) | pré-existente (já presente na rodada 1, antes das fix tasks; o reteste não pôde dizer se é anterior ao WI) | Máscara do CEP no endereço salvo aberto no checkout |
| Trocar o CEP no checkout por um que a busca não localiza esvazia Rua, Bairro, Cidade e UF, mas mantém o Número e o Complemento do endereço anterior ("1234", "apto 501"). A cliente pode enviar o número de outro endereço sem perceber | checkout › Entrega, troca de CEP | polimento | Definir o que acontece com o Número e o Complemento quando o CEP muda no checkout |

As sugestões da rodada 1 (`qa-result-2026-11-14-rodada-1.md`) continuam valendo e não se repetem aqui.

## Riscos residuais

- **CA-05 e CA-10 em `missing`:** o TC-FUNC-004 (CA-05) e o TC-FUNC-009 (CA-10) não rodaram em nenhuma das duas rodadas; o TC-UI-002 (a outra prova do CA-05) ficou `blocked` com o CH-07. Os dois critérios seguem cobertos só pelos testes de componente da Validation.
- **CA-16 no Sul:** o TC-FUNC-006 nunca rodou com 90010-000 (gaveta, ⓘ "Entrega em Porto Alegre/RS, região Sul…" e
  checkout), em duas rodadas. A única leitura do Sul liberado é a faixa de 42 px no entorno do reteste do BUG-005. A
  paridade gaveta × checkout para o RS, e a gaveta em 1440, não estão provadas na tela.
- **Layout contra o protótipo:** BUG-003..007 foram dados como `resolved` medindo os valores que os bugs registraram
  ao ler o protótipo na rodada 1. Nesta rodada, nenhuma tela foi comparada com o desenho (CH-07 not-run). Se o
  protótipo mudou, ou se há divergência fora desses cinco componentes (a faixa acima sem CEP, a faixa fora, o
  checkout › Entrega no TC-UI-003), ela não foi vista.
- **TC-FUNC-008, passo 1:** o checkout com um CEP da gaveta diferente do endereço salvo nunca rodou. É justamente o
  caminho em que "o salvo não entra", vizinho do BUG-001, cuja correção mexeu nessa decisão.
- **O endereço de entrega depois das correções:** o BUG-001 e o BUG-002 mexeram no mesmo ponto: a busca do CEP
  preenchendo ou limpando o endereço. O reteste e o CH-03 cobriram retirada → PAC, PAC → SEDEX, recarregar e quatro
  trocas de CEP. Ficaram fora a ordem PAC → retirada, voltar → avançar → voltar, e o Número e o Complemento que ficam
  com o CEP não localizado (ver Sugestões de backlog).
- **O 40020-000 não é localizável:** a ViaCEP responde `{"erro": true}` (reteste do BUG-002). Então o "Não
  localizamos esse CEP" está certo. Mas o ⓘ com "Para Salvador/BA", num CEP fora da região que a busca localiza,
  continua sem ser visto em duas rodadas.
- **Gate técnico:** só a suíte da loja foi remedida na Validation 2. Os outros workspaces valem pela Validation 1,
  coerente com o diff das fix tasks, que só toca `apps/store`.
- **Ambiente:** só Chromium headless, o dev server e não o build, e a cotação interceptada (preço e prazo fixos). A
  fonte a 200 % foi simulada pela raiz do documento.

## Fora da cobertura

- **CH-02, CH-04, CH-05, CH-06:** não rodaram, pela regra da confirmação: todos os TC deles deram `pass` ou `skip` na
  rodada 1. Continuam sem veredito de execução completa:
  - TC-FUNC-004 (recolher e reabrir a lista);
  - TC-FUNC-009 (fixture B, quantidade, faixa cruzada, resposta sem SEDEX);
  - TC-FUNC-010 passos 3–4;
  - TC-FUNC-017 passos 2–3;
  - TC-INT-001 passo 3 (o pedido montado que nasce).
- **TC-FUNC-006:** ficaram fora, por orçamento nas três sessões do CH-01:
  - o passo 4 (90010-000, Porto Alegre/RS);
  - a gaveta em 1440 × 900;
  - o Total com "cartão" escolhido (a comparação foi pelo preço cheio do Resumo);
  - o riscado do R$ 21,40 no checkout, conferido por estilo só na gaveta.
- **TC-FUNC-008 passo 1** (01310-100 com conta), TC-FUNC-020, TC-FUNC-009 e TC-FUNC-011 no CH-03. Também a troca na
  ordem PAC → retirada, voltar → avançar → voltar, a variação de teclado em 1440 do TC-JOURNEY-003 e sair da conta
  pela tela: orçamento.
- **CH-07 inteiro:** TC-UI-001, TC-UI-002 e TC-UI-003, e o entorno das correções em FreeShippingBand, InfoTip,
  CartDrawer e CartShipping contra o desenho. As fontes de design estavam ilegíveis.
- **TC-CFR-001:** as variações a 130 % e com cupom, e as screenshots dos estados recolhido (100 % e 200 %) e aberto a
  200 %. A prova é a medida do DOM. O balão do ⓘ no entorno do CH-08 também ficou fora (o reteste do BUG-004 o
  cobriu). J-02, performance percebida e recuperação de erro no CFR: rodada de confirmação.
- **Personas:** PER-03 Adri não teve sessão. PER-02 Cida só apareceu no reteste do BUG-002.
- **Jornadas:** J-02, J-03 e J-04 não foram percorridas nesta rodada. A J-04 não chegou ao objetivo (o pedido nascer)
  em nenhuma das duas rodadas.
- **Browsers e assistivas:** Safari, Firefox, Android real e leitor de tela real ficaram fora. Só o Chromium do
  driver.
