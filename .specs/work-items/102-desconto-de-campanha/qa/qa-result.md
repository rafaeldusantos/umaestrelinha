```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-13T22:37:00Z",
  "branch": "feature/102",
  "duration_min": 13,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build (com as variáveis públicas do Supabase local na linha de comando)",
      "status": "pass",
      "summary": "Tasks: 3 successful, 3 total (Re-Validation 3, HEAD 1f0d6dbb)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (por app)",
      "status": "pass",
      "summary": "store 2 erros / 2 avisos · backoffice 23 / 5 · mobile-adm 0 / 0 — iguais ao baseline"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<w> test --testTimeout=20000 (um workspace por vez)",
      "status": "pass",
      "summary": "core 5873/5873 · functions 1705/1705 · store 7394/7394 · backoffice 5360/5360 · mobile-adm 2734/2734 — os cinco com exit 0"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 25,
    "acceptance_covered": 24,
    "items": [
      { "criterion": "CA-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-07", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-08", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-09", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-10", "validated_by": { "tc_ref": "TC-INT-001", "type": "integration" }, "status": "covered" },
      { "criterion": "CA-11", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-12", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-13", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-14", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-15", "validated_by": { "tc_ref": "TC-UI-003", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-16", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-17", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-01", "validated_by": { "tc_ref": "TC-FUNC-021", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-02", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-03", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-04", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-05", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-06", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-07", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "R-08", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" }
    ],
    "missing": []
  },
  "test_cases": [
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
    { "tc_ref": "TC-FUNC-020", "verdict": "fail" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-INT-001", "verdict": "pass" },
    { "tc_ref": "TC-INT-002", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "skip" },
    { "tc_ref": "TC-UI-003", "verdict": "pass" },
    { "tc_ref": "TC-UI-004", "verdict": "fail" },
    { "tc_ref": "TC-UI-005", "verdict": "skip" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "retest-r3-BUG-002.png", "path": "screenshots/retest-r3-BUG-002.png" },
    { "label": "retest-r3-BUG-002-pedido-0609.png", "path": "screenshots/retest-r3-BUG-002-pedido-0609.png" },
    { "label": "retest-r3-BUG-002-pdp-390.png", "path": "screenshots/retest-r3-BUG-002-pdp-390.png" },
    { "label": "retest-r3-BUG-002-ofertas-390.png", "path": "screenshots/retest-r3-BUG-002-ofertas-390.png" },
    { "label": "retest-r3-BUG-002-painel-produto.png", "path": "screenshots/retest-r3-BUG-002-painel-produto.png" },
    { "label": "retest-r3-BUG-007.png", "path": "screenshots/retest-r3-BUG-007.png" },
    { "label": "retest-r3-BUG-007-desfeito-15.png", "path": "screenshots/retest-r3-BUG-007-desfeito-15.png" },
    { "label": "retest-r3-BUG-007-desfeito-2.png", "path": "screenshots/retest-r3-BUG-007-desfeito-2.png" },
    { "label": "retest-r3-BUG-008.png", "path": "screenshots/retest-r3-BUG-008.png" },
    { "label": "retest-r3-BUG-008-sacola-mc-me-qa10.png", "path": "screenshots/retest-r3-BUG-008-sacola-mc-me-qa10.png" },
    { "label": "retest-r3-BUG-008-checkout-1440.png", "path": "screenshots/retest-r3-BUG-008-checkout-1440.png" },
    { "label": "retest-r3-BUG-008-so-mc-recusado-390.png", "path": "screenshots/retest-r3-BUG-008-so-mc-recusado-390.png" },
    { "label": "retest-r3-BUG-009.png", "path": "screenshots/retest-r3-BUG-009.png" },
    { "label": "retest-r3-BUG-009-admin-0610.png", "path": "screenshots/retest-r3-BUG-009-admin-0610.png" },
    { "label": "retest-r3-BUG-009-pedido-0611.png", "path": "screenshots/retest-r3-BUG-009-pedido-0611.png" },
    { "label": "CH-02-r3-03-nova-campanha-390.png", "path": "screenshots/CH-02-r3-03-nova-campanha-390.png" },
    { "label": "CH-02-r3-04-nova-campanha-390-fonte200.png", "path": "screenshots/CH-02-r3-04-nova-campanha-390-fonte200.png" },
    { "label": "CH-02-r3-06-editar-natal-390-fonte200.png", "path": "screenshots/CH-02-r3-06-editar-natal-390-fonte200.png" },
    { "label": "CH-03-r3-01-ofertas-menor-preco-390.png", "path": "screenshots/CH-03-r3-01-ofertas-menor-preco-390.png" },
    { "label": "CH-03-r3-03-colecao-ate-360-390.png", "path": "screenshots/CH-03-r3-03-colecao-ate-360-390.png" },
    { "label": "CH-04-r3-05-pedido-0612-conjunto.png", "path": "screenshots/CH-04-r3-05-pedido-0612-conjunto.png" },
    { "label": "CH-04-r3-06-ma-qa10-recusa-390.png", "path": "screenshots/CH-04-r3-06-ma-qa10-recusa-390.png" },
    { "label": "CH-04-r3-08-checkout-ma-qafrete-1440.png", "path": "screenshots/CH-04-r3-08-checkout-ma-qafrete-1440.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 102 · Campanhas de desconto (rodada 3, confirmação)

**Gate 3:** confirmado em 2026-11-13 (humano, pela recomendação: BUG-002 `resolved`, a tela do pedido no painel vai a Sugestões de backlog)

## Resumo

**Veredito:** partial. Nenhum bug fica aberto se o Gate 3 aceitar o BUG-002 como `resolved`. Nenhum TC P0 falhou. O
design-check (CH-07) segue sem rodar, e o TC-UI-002 (P1) continua sem veredito.

A rodada de confirmação fechou os quatro bugs que estavam abertos:

- **Desfazer do lote (BUG-007):** o aviso do lote de campanha traz "Desfazer", e ele devolve as quatro peças de M-G
  a "Natal · 15%", duas vezes
- **Cupom na peça com "de/por" (BUG-008):** o cupom `QA10` é recusado na sacola só com a M-C ("Este cupom não vale
  para peças da Dia das Mães.") e, com a M-E junto, desconta só a M-E (−R$ 34,00) na sacola, no checkout e no pedido
- **Pedido com promoção (BUG-009):** o pedido com promoção progressiva traz o "Desconto PIX", e as linhas fecham o
  total na loja e no painel
- **Preço da peça com "de/por" (BUG-002):** a M-C sai a R$ 336,60 "de R$ 374,00" no painel do produto, na página, em
  `/ofertas`, na sacola, no checkout, no pedido da loja e no feed. O resíduo da rodada 2 ("de R$ 349,90" no pedido da
  loja) sumiu

Os pedaços que faltavam do CA-16 e do CA-17 rodaram. O `QAFRETE` zera o frete com a M-A, e o `qa10` em minúsculas é
recusado com o motivo. O Compre Junto M-E → M-A cobra a M-A pelo preço de campanha, sem desconto de conjunto, até o
pedido #0612. Hoje uma pessoa de verdade consegue pôr a campanha no ar e marcar peças em lote, com caminho de volta.
A cliente acha a oferta pelo celular e paga, com cupom, promoção ou Compre Junto, o que a tela mostrou, com um
pedido gravado que fecha linha a linha.

Dois pontos pedem a atenção do Gate 3:

- **O pedido no painel mostra a M-C com R$ 349,90 riscado**, contra "de R$ 374,00" na loja. A triagem lê isso como
  fora do Esperado do BUG-002 e o leva a Sugestões de backlog (ver Transições propostas). Se o Gate 3 entender que a
  tela de pedido do painel está no Esperado, o BUG-002 fica `still-open` (high), e o veredito vira `fail`
- **O formulário de campanha rola de lado no celular com a fonte a 200 %** (CH-02 A-1, TC-UI-004 `fail`). É uma
  falha do CA-15 na superfície da mudança, mas é `medium` e não é regressão: o TC nunca tinha rodado. Pela regra da
  confirmação, vai a Sugestões de backlog. O WI fecha sem cumprir essa metade do CA-15, a não ser que o humano a
  traga para cá

| TC                                    | Critérios         | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | ----------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 29 · fail 2 · blocked 0 · skip 2 | 24 de 25 cobertos | 0          | 0         | resolved 3 · still-open 1 · cannot-reproduce 0 · blocked 0 |

O reteste deu o BUG-002 como `still-open`. A triagem propõe `resolved` (ver Transições propostas). Com a proposta
da triagem, a conta fica em resolved 4 · still-open 0.

## Rodada

- **Ambiente:** loja `http://localhost:8092`, painel `http://localhost:8093/admin`, Supabase local
  `http://127.0.0.1:54441`
- **Branch / build:** `feature/102`, worktree `store__feature-102`, HEAD `1f0d6dbb` (depois das fix tasks 16–19:
  `9f05e2b2`, `faec01fd`, `39a59748`, `1f0d6dbb`), Vite de dev
- **Execução:** 2026-11-13, à noite. L1: reteste (19:24 → 19:37, horário de Brasília) e CH-03. L2: CH-02 e CH-04. Só
  o reteste registrou horário, e `executed_at` e `duration_min` do envelope são os dele. A primeira tentativa do L1
  achou a loja em branco por um defeito de ambiente da thread (variáveis do Vite mal passadas). Os artefatos dela
  foram apagados e o L1 foi refeito: não é achado do produto
- **Browser:** Chromium headless (agent-browser 0.39.1) · **Viewports:** 390 × 844 e 1440 × 900; fonte da raiz a
  200 % no CH-02 (painel)
- **Personas e acesso:** PER-01 Adri → `admin-loja` (conta de dev do seed); PER-02 Marina e PER-03 Helena →
  `anonima`. PER-04 Rosa sem sessão nesta rodada

## Gate técnico

- **Validation do Dev:** `.specs/work-items/102-desconto-de-campanha/qa-report.md`, Re-Validation 3, PASS, de
  2026-11-13 (HEAD `1f0d6dbb`)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | Tasks 3 successful, 3 total (com as variáveis públicas do local) |
| lint  | pass   | store 2 / 2 · backoffice 23 / 5 · mobile-adm 0 / 0, iguais ao baseline |
| test  | pass   | core 5873/5873 · functions 1705/1705 · store 7394/7394 · backoffice 5360/5360 · mobile-adm 2734/2734, todos exit 0 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

Vereditos marcados "(r1)" ou "(r2)" vêm de rodadas anteriores, de TC que não rodaram de novo porque tinham passado.

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01 | prd | TC-FUNC-001, TC-FUNC-003, TC-JOURNEY-003 | pass (r1) · pass (r2) · pass (r2) | covered |
| CA-02 | prd | TC-FUNC-002 | pass (r2) | covered |
| CA-03 | prd | TC-FUNC-004, TC-FUNC-005, TC-JOURNEY-001, TC-JOURNEY-002 | pass (r2) · pass (r2) · pass (r1) · pass (r2; pedidos #0609–#0611 do reteste fecham) | covered |
| CA-04 | prd | TC-FUNC-006, TC-FUNC-009 | pass (r1) · pass (r1) | covered |
| CA-05 | prd | TC-FUNC-003, TC-FUNC-007 | pass (r2) · pass (r2) | covered |
| CA-06 | prd | TC-FUNC-003, TC-FUNC-008 | pass (r2) · pass (reteste do BUG-002: R$ 336,60 "de R$ 374,00" na loja e no pedido da loja) | covered |
| CA-07 | prd | TC-FUNC-009 | pass (r1) | covered |
| CA-08 | prd | TC-FUNC-010 | pass (r2) | covered |
| CA-09 | prd | TC-FUNC-011, TC-FUNC-012 | pass (r2) · pass (r1) | covered |
| CA-10 | prd | TC-INT-001 | pass (r1); feed da M-C `374.00` / `336.60` no reteste do BUG-002 | covered |
| CA-11 | prd | TC-UI-001 | pass (r2) | covered |
| CA-12 | prd | TC-FUNC-013 | pass (r1) | covered |
| CA-13 | prd | TC-INT-002, TC-FUNC-005 | pass (r1) · pass (r2) | covered |
| CA-14 | prd | TC-FUNC-002, TC-UI-002 | pass (r2) · skip (CH-07 not-run) | partial |
| CA-15 | prd | TC-UI-003, TC-UI-004 | pass (r1) · fail, sem bug (CH-02 A-1, Sugestões de backlog) | covered |
| CA-16 | prd | TC-FUNC-014, TC-FUNC-015 | pass (reteste do BUG-008: M-C + M-E, só a M-E desconta) · pass (CH-04 e reteste do BUG-008) | covered |
| CA-17 | prd | TC-FUNC-016 | pass (promoção na r2; Compre Junto no CH-04, pedido #0612) | covered |
| R-01 | prd | TC-FUNC-021 | pass (reteste do BUG-007; o CH-02 não o executou) | covered |
| R-02 | prd | TC-FUNC-017 | pass (r1) | covered |
| R-03 | prd | TC-FUNC-011 | pass (r2) | covered |
| R-04 | prd | TC-FUNC-018, TC-FUNC-012 | pass (r2) · pass (r1) | covered |
| R-05 | prd | TC-FUNC-019 | pass (r1) | covered |
| R-06 | prd | TC-FUNC-020 | fail, sem bug (o cartão da M-B, já em Sugestões de backlog na r2) | covered |
| R-07 | prd | TC-FUNC-004 | pass (r2) | covered |
| R-08 | prd | TC-FUNC-009 | pass (r1) | covered |

**Sem cobertura:** nada `missing`. CA-14 fica `partial`: o selo contra o protótipo (TC-UI-002) não rodou, porque o
design-check está `not-run`.

**TC `fail` sem `bug_ref`** (os dois abaixo do corte da confirmação, nenhum é regressão):

- **TC-FUNC-020 (P2):** mesmo resultado da r2. O cartão da M-B mostra R$ 373,15 e ordena e filtra pela variação de
  R$ 325,55. Já está em Sugestões de backlog desde a r2
- **TC-UI-004 (P1):** primeira execução. Lista, nova e edição passam em 390 com a fonte normal, e a lista passa a
  200 %. O formulário (nova e edição) rola de lado a 200 %: 538 px numa tela de 390, com "Salvar campanha" mais de
  metade fora. É `medium` (Fricção, J-02 é P1), e vai a Sugestões de backlog. O passo 4 (aba Preço e estoque) não
  rodou

**TC-FUNC-021 `pass` pelo reteste:** o reteste do BUG-007 percorreu o lote "Natal: 10%" com o "Desfazer", e o
filtro por campanha e percentual antes e depois. O CH-02 não o executou (orçamento). O que ficou sem rodar está em
Fora da cobertura.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| Reteste | PER-01 Adri, PER-03 Helena | — | done (4 bugs, 3 pedidos) | — | — | 0 no entorno | — |
| CH-02 | PER-01 Adri | confirmação, painel em 390 / 200 % | done (parcial: orçamento acabou em TC-UI-004) | ~28 de 25 | fail 1 · skip 1 | 1 (A-1, backlog) | — |
| CH-03 | PER-02 Marina | Feature (confirmação) | done | 23 de 25 | fail 1 | 0 | — |
| CH-04 | PER-03 Helena | Money (confirmação) | done | 32 de 35 | pass 2 | 0 | — |
| CH-01 | PER-01 Adri | Feature | not-run (confirmação: todos os TC passaram antes) | — | — | — | — |
| CH-05 | PER-01 Adri | Money | not-run (confirmação: todos os TC passaram antes) | — | — | — | — |
| CH-06 | PER-01 Adri | Multi-Tab | not-run (confirmação: todos os TC passaram antes) | — | — | — | — |
| CH-07 | PER-01 Adri | — | not-run (design: o MCP do Claude Design segue sem escopo, `needs_design_scopes`; precisa de `/design-login` do humano) | — | skip 2 | — | — |
| CH-08 | PER-04 Rosa | — | not-run (confirmação: todos os TC passaram antes) | — | — | — | — |

## CFR

O charter de CFR (CH-08) não rodou: os TC dele passaram na rodada 1. O que a rodada viu de CFR veio do CH-02:

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-02 (painel a 200 %) | fricção: o formulário de campanha rola de lado com a fonte a 200 % (A-1, Sugestões de backlog) | — |
| Responsividade        | J-02 em 390; J-03, J-04 em 390 | ok com a fonte normal: lista, nova e edição de campanha sem rolagem lateral. O interruptor "Campanha ligada" tem 44 × 24 px (Sugestões de backlog). Loja em 390 sem achado | — |
| Performance percebida | — | não reavaliada | — |
| Segurança visível     | — | não avaliada | — |

## Design-check

- **Protótipo:** Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`
- **Status:** not-run. O MCP do Claude Design recusa com `needs_design_scopes`. Precisa de `/design-login` feito por
  um humano e de relançar o CH-07
- **Divergências:** 0 conferidas

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada: sem bug aberto ao fim da rodada, com as transições propostas.

Se o Gate 3 mantiver o BUG-002 `still-open`, ele é um lote sozinho:

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-002 | Painel · Pedido, lista "Itens" (o riscado da M-C) | sozinho: só esta tela mostra o "de" errado | high |

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-002 | [Preço de campanha] Peça com “de/por” leva os 10 % sobre o “por”: R$ 314,91 em vez de R$ 336,60 | reteste (a triagem diverge do retester) | still-open → resolved | mantida (high) | `screenshots/retest-r3-BUG-002-pedido-0609.png`, `screenshots/retest-r3-BUG-002-pdp-390.png`, `screenshots/retest-r3-BUG-002-ofertas-390.png`, `screenshots/retest-r3-BUG-002-painel-produto.png`, `screenshots/retest-r3-BUG-002.png` |
| BUG-007 | [Edição em massa · campanha] O aviso do lote não tem “Desfazer” — a dona não volta um lote errado | reteste | open → resolved | mantida | `screenshots/retest-r3-BUG-007.png`, `screenshots/retest-r3-BUG-007-desfeito-15.png`, `screenshots/retest-r3-BUG-007-desfeito-2.png` |
| BUG-008 | [Cupom] QA10 desconta a peça de campanha que tem “de/por” — sacola, checkout e pedido | reteste | open → resolved | mantida | `screenshots/retest-r3-BUG-008.png`, `screenshots/retest-r3-BUG-008-so-mc-recusado-390.png`, `screenshots/retest-r3-BUG-008-sacola-mc-me-qa10.png`, `screenshots/retest-r3-BUG-008-checkout-1440.png` |
| BUG-009 | [Pedido] Com promoção progressiva, o resumo omite o “Desconto PIX” e as linhas não fecham o total | reteste | open → resolved | mantida | `screenshots/retest-r3-BUG-009.png`, `screenshots/retest-r3-BUG-009-admin-0610.png`, `screenshots/retest-r3-BUG-009-pedido-0611.png` |

**Por que o BUG-002 vai a `resolved`, contra o `still-open` do retester:**

1. **O Esperado não inclui a tela de pedido do painel.** Ele pede R$ 336,60 com "De R$ 374,00" "igual no painel
   (topo e tabela), no cartão, na página, na sacola, no checkout, no pedido e no feed do Google". Nessa frase, "no
   painel (topo e tabela)" é o cartão da campanha no produto. "No pedido" é o `/pedido/:id` da loja, o passo 4 do
   bug. A tela, o componente e as URLs do Ambiente do bug também não citam `/admin/pedidos/:id`. Todas as superfícies
   do Esperado estão certas nesta rodada, e a da rodada 2 (o pedido da loja) também
2. **O que o painel mostra não é o defeito do bug.** O pedido #0609 no painel mostra a M-C com R$ 349,90 riscado e
   R$ 336,60. Na mesma tela: Subtotal R$ 689,90 (349,90 + 340,00), Desconto de campanha −R$ 13,30, Total R$ 617,52.
   O riscado é o preço de sempre da linha, antes da campanha, e fecha com o resumo da própria tela. Na rodada 1, o
   mesmo componente mostrou a M-A como "R$ 385,00 / R$ 308,00" (CH-06, pedido #0603). Nada é cobrado errado, e a
   dona não vê dois números que se contradizem na tela dela
3. **O que sobra é uma escolha de qual "cheio" o painel mostra para peça com "de/por".** A cliente vê R$ 374,00, a
   dona vê R$ 349,90. A fonte não decide isso: o CA-13 diz "o cheio", sem dizer qual numa peça com "de/por". Também
   não é `critical` nem `high`, nem regressão provada: a tela de pedido do painel nunca tinha sido vista com a M-C.
   Pela regra da confirmação, vai a Sugestões de backlog

**Alternativa, se o Gate 3 ler "no pedido" como a loja e o painel:** BUG-002 `still-open → still-open`, mantida high.
Histórico: "2026-11-13 r3 · still-open · loja, sacola, checkout, `/pedido` e feed certos (R$ 336,60 'de R$ 374,00');
o pedido no painel (#0609, #0610) mostra a M-C com R$ 349,90 riscado". Lote L1 acima, e veredito `fail`.

**Texto proposto para o Histórico:**

- BUG-002: "2026-11-13 r3 · resolved · R$ 336,60 'de R$ 374,00' no painel do produto, na página, em `/ofertas`, na
  sacola, no checkout, no pedido da loja (#0609, #0610) e no feed. O riscado R$ 349,90 do pedido no painel é o preço
  de sempre da linha, fecha com o Subtotal da tela e ficou fora do Esperado (Sugestões de backlog). Gate 3 da r3"
- BUG-007: "2026-11-13 r3 · resolved · o aviso do lote 'Natal: 10%' traz 'Desfazer'; duas vezes as quatro peças de
  M-G voltaram a 'Natal · 15%', e o filtro 'Natal · 10%' ficou vazio"
- BUG-008: "2026-11-13 r3 · resolved · só a M-C: QA10 recusado com 'Este cupom não vale para peças da Dia das Mães.';
  M-C + M-E: −R$ 34,00 só na M-E, na sacola, no checkout e no pedido #0609 (loja e painel)"
- BUG-009: "2026-11-13 r3 · resolved · pedidos #0610 e #0611 com 'Desconto PIX', e as linhas fecham o total na loja e
  no painel"

**Reteste `blocked`:** nada

## Achados que não viraram bug

- Reteste do BUG-002, pedido no painel (#0609, #0610): a M-C aparece com R$ 349,90 riscado, e a loja mostra "de
  R$ 374,00". `spec-gap`: a fonte não diz qual "cheio" o pedido do painel mostra numa peça com "de/por". Está fora
  do Esperado do BUG-002 e vai a Sugestões de backlog
- CH-02 A-1 (formulário de campanha rolando de lado em 390 com a fonte a 200 %): defeito com fonte (CA-15, RN-15),
  `medium`. É Fricção: a dona salva rolando de lado, e a J-02 é P1, então a severidade não sobe. A persona que usa
  fonte a 200 % (PER-04) é da loja, não do painel. Não é regressão (o TC-UI-004 nunca tinha rodado) e fica abaixo do
  corte da confirmação. Vai a Sugestões de backlog
- CH-02, interruptor "Campanha ligada" com 44 × 24 px: abaixo do corte da confirmação. Vai a Sugestões de backlog
- CH-03, TC-FUNC-020 (cartão da M-B fora da ordem e do teto do filtro): já em Sugestões de backlog na rodada 2
  ("Cartão mostra o preço da variação que ordena e abre a página")
- CH-03 Debrief (o aviso de cookies cobre o cartão da M-C em 390 até ser fechado): fora da Mudança. Vai a Sugestões
  de backlog como `pré-existente`
- CH-04 Debrief (a recusa do cupom aparece só como aviso flutuante): já em Sugestões de backlog na rodada 1 ("Recusa
  do cupom sempre dentro da sacola")
- CH-04 Debrief (a sacola continua cheia depois do pedido #0612 pendente): já em Sugestões de backlog na rodada 1
  ("Sacola continua cheia depois do pedido criado")
- Reteste, observação no #0610: as linhas das peças comuns no pedido da loja já trazem a promoção ("de R$ 680,00 por
  R$ 612,00"), e o checkout mostra "R$ 680,00". O total fecha. Já era assim no #0608 da r2, então não é regressão.
  Vai a Sugestões de backlog como `polimento`
- Reteste do BUG-007 (o primeiro "Desfazer" não foi alcançado a tempo): limite da automação. O botão ficou visível
  por ~9 s. Não é achado
- Reteste do BUG-009 (o e-mail do pedido não chegou ao Mailpit): `conforme a fonte`. O e-mail só sai com o pagamento
  aprovado, e o PIX não se conclui no ambiente
- L1, primeira tentativa (loja em branco): defeito de ambiente da thread (variáveis do Vite). Os artefatos foram
  apagados e a rodada refeita. Não é achado

## Perguntas ao produto

nada (rodada de confirmação)

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Com a fonte a 200 % em 390, o formulário de campanha rola de lado (538 px): "Salvar campanha" fica mais de metade fora da tela, e "Adicionar", os presets de cor, "Tirar {p}%" e "Apagar campanha" passam da borda. Os campos de hora mostram 90 de 183 px. Falha do CA-15 (TC-UI-004); se o humano quiser o CA-15 inteiro neste WI, é o candidato a trazer de volta | Painel · Campanhas, nova e edição (CH-02, passos 04 e 06) | defeito `medium` da mudança, abaixo do corte da confirmação | Formulário de campanha sem rolagem lateral com fonte grande no celular |
| O interruptor "Campanha ligada" tem 44 × 24 px, abaixo dos 44 px de altura do alvo de toque. Não foi medido se o rótulo também liga o interruptor | Painel · Campanhas, nova e edição (CH-02, passos 03 e 05) | polimento | Interruptor "Campanha ligada" com alvo de toque de 44 px |
| No pedido do painel, a peça com "de/por" aparece com o preço de sempre riscado (R$ 349,90), e o pedido da loja mostra o "de" (R$ 374,00). A tela do painel fecha com o próprio Subtotal | Painel · Pedido, lista "Itens" (reteste do BUG-002, #0609 e #0610) | polimento | Pedido no painel mostra o mesmo "de" que a cliente viu |
| No pedido da loja com promoção progressiva, as linhas das peças comuns já mostram o preço com a promoção ("de R$ 680,00 por R$ 612,00"), e o checkout mostra a linha sem ela. O total fecha | Loja · `/pedido/:id`, linhas das peças (reteste do BUG-009, #0610; já assim no #0608 da r2) | polimento | Linhas do pedido com a mesma composição do checkout |
| Em 390, o aviso de cookies cobre o cartão de peça até ser fechado | Loja · `/ofertas` e listagens, aviso de cookies (CH-03, passo 02) | pré-existente | Aviso de cookies sem cobrir o conteúdo no celular |

## Riscos residuais

- **Se o Gate 3 discordar sobre o BUG-002,** o veredito vira `fail`, com um bug high `still-open` numa tela que a
  cliente não vê
- **CA-15 fica cumprido só em parte.** O painel em 390 passa com a fonte normal e quebra a 200 % no formulário. A aba
  Preço e estoque, a lista de produtos com o filtro e a edição em massa em 390 não foram medidas, nem a 100 % nem a
  200 %. A mesma quebra pode existir lá
- **O Desfazer foi provado em parte.** O Desfazer do lote "Natal: 10%" funciona. Não foram vistos o Desfazer para
  "sem campanha", o "Tirar da Natal" em lote, nem as marcações voltando junto com campos do produto num mesmo lote
- **O cupom nas outras peças de campanha:** a M-C e a M-A recusam o cupom. A M-B e a M-D não foram conferidas com
  cupom
- **O e-mail do pedido** não foi conferido com campanha, cupom e promoção: ele só sai com o pagamento aprovado
- **O toque foi simulado** pelo Chromium headless, sem um celular real
- **O ramo de recusa do TC-FUNC-017** ("Um desconto deste pedido mudou. Nada foi cobrado.") continua sem prova, como
  nas rodadas anteriores

## Fora da cobertura

- CH-01, CH-05, CH-06 e CH-08: not-run pela regra da confirmação (todos os TC passaram antes). Os vereditos vêm das
  rodadas 1 e 2
- CH-07 (design-check): not-run por `design` (`needs_design_scopes`). TC-UI-002 (P1) e TC-UI-005 (P2) sem execução;
  retomar depois de `/design-login`
- TC-UI-004, sem execução: o passo 4 (aba Preço e estoque em 390), o filtro e a coluna de campanha da lista de
  produtos em 390 e a 200 %, e a variação "recusa longa". Console e rede não coletados no passo do achado
- TC-FUNC-021: o CH-02 não o executou (orçamento). O reteste do BUG-007 cobriu o lote e o Desfazer. Ficaram fora o
  "Desfazer — sem campanha" (a massa não permite mexer em outras peças), o "Tirar da Natal" em lote, o duplo clique,
  a edição em massa em 390 e o passo 6
- TC-FUNC-015: a variação "cupom com valor mínimo" (não há cupom com mínimo na massa). O pedido com `QAFRETE` não foi
  criado (o TC termina no checkout)
- TC-FUNC-016: a variação "oferta leve também" com peça de campanha. O Compre Junto de M-E não tem desconto de
  conjunto, então "o desconto do conjunto só nas comuns" não pôde ser visto
- CH-04: o entorno do BUG-008 com a M-C não foi refeito na sessão (feito no reteste)
- TC-FUNC-020: as variações "maior preço" e "limites da régua"
- CH-03: o mini-carrinho com a M-C, o bloco "Joias em oferta" da Home e o viewport 1440
- Reteste do BUG-009: o e-mail do pedido, que não chega sem pagamento aprovado
- Fonte a 200 %: só no painel (CH-02), simulada pelo `font-size` da raiz
- Personas: PER-04 Rosa sem sessão nesta rodada
- Browsers: só Chromium headless
- Horário: só o reteste registrou início e fim; `executed_at` e `duration_min` do envelope são os dele
