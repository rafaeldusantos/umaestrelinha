```json
{
  "schema": "qa-result/v1",
  "verdict": "pass",
  "executed_at": "2026-11-03T11:05:00Z",
  "branch": "feature/WI-01",
  "duration_min": 35,
  "gates": [
    {
      "name": "build",
      "command": "pnpm --filter @estrelinha/{store,backoffice,mobile-adm} build",
      "status": "pass",
      "summary": "exit 0 nos três apps (com as envs locais no ambiente; o worktree não tem .env)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (por app)",
      "status": "pass",
      "summary": "contra o baseline: backoffice 23/5 · store 2/2 · mobile-adm 0/0 (25/7, idêntico)"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<w> test --testTimeout=20000 (um workspace por vez)",
      "status": "pass",
      "summary": "21534/21534 na Validation de fechamento; Validation 14 (fix task 20, 2026-11-03): backoffice 5086/5086, store 6901/6901"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 65,
    "acceptance_covered": 42,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-SMOKE-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-JOURNEY-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-031", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-FUNC-032", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-FUNC-033", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-FUNC-040", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.7", "validated_by": { "tc_ref": "TC-FUNC-034", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-035", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-FUNC-031", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-JOURNEY-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-JOURNEY-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.5", "validated_by": { "tc_ref": "TC-FUNC-036", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.6", "validated_by": { "tc_ref": "TC-FUNC-039", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.7", "validated_by": { "tc_ref": "TC-FUNC-037", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.8", "validated_by": { "tc_ref": "TC-INT-002", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-02.9", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.7", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.8", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.10", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.11", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-03.12", "validated_by": { "tc_ref": "TC-CFR-005", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-03.13", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.14", "validated_by": { "tc_ref": "TC-SMOKE-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.15", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-SMOKE-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-SMOKE-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.4", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.5", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.6", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.7", "validated_by": { "tc_ref": "TC-JOURNEY-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.8", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-04.9", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.3", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.4", "validated_by": { "tc_ref": "TC-FUNC-023", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-FUNC-041", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-06.2", "validated_by": { "tc_ref": "TC-FUNC-042", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-06.3", "validated_by": { "tc_ref": "TC-INT-004", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-06.4", "validated_by": { "tc_ref": "TC-FUNC-041", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-06.5", "validated_by": { "tc_ref": "TC-INT-004", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-07.1", "validated_by": { "tc_ref": "TC-FUNC-021", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-07.2", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-07.3", "validated_by": { "tc_ref": "TC-FUNC-022", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-08.1", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-08.2", "validated_by": { "tc_ref": "TC-INT-005", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-09.1", "validated_by": { "tc_ref": "TC-JOURNEY-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-09.2", "validated_by": { "tc_ref": "TC-FUNC-027", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-09.3", "validated_by": { "tc_ref": "TC-FUNC-026", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-09.4", "validated_by": { "tc_ref": "TC-FUNC-028", "type": "integration" }, "status": "missing" },
      { "criterion": "CA-09.5", "validated_by": { "tc_ref": "TC-FUNC-024", "type": "e2e" }, "status": "partial" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-02", "validated_by": { "tc_ref": "TC-CFR-003", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-INT-006", "type": "integration" }, "status": "missing" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-05", "validated_by": { "tc_ref": "TC-CFR-004", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-07", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "partial" }
    ],
    "missing": ["CA-02.8", "CA-06.3", "CA-06.5", "CA-08.1", "CA-08.2", "CA-09.4", "RNF-03"]
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-036", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-UI-003", "verdict": "pass" },
    { "tc_ref": "TC-UI-004", "verdict": "pass" },
    { "tc_ref": "TC-UI-005", "verdict": "pass" },
    { "tc_ref": "TC-UI-006", "verdict": "blocked" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "R2-CH-01-02-falta-escolha.png", "path": "screenshots/R2-CH-01-02-falta-escolha.png" },
    { "label": "R2-CH-01-03-conjunto-completo.png", "path": "screenshots/R2-CH-01-03-conjunto-completo.png" },
    { "label": "R2-CH-01-04-gaveta-conjunto.png", "path": "screenshots/R2-CH-01-04-gaveta-conjunto.png" },
    { "label": "R2-CH-02-02-limite-pingente.png", "path": "screenshots/R2-CH-02-02-limite-pingente.png" },
    { "label": "R2-CH-02-04-sacola.png", "path": "screenshots/R2-CH-02-04-sacola.png" },
    { "label": "R2-CH-03-04-busca-propria-joia.png", "path": "screenshots/R2-CH-03-04-busca-propria-joia.png" },
    { "label": "R2-CH-03-06-m04-sem-acento.png", "path": "screenshots/R2-CH-03-06-m04-sem-acento.png" },
    { "label": "R2-CH-03-08-editor-390.png", "path": "screenshots/R2-CH-03-08-editor-390.png" },
    { "label": "R2-CH-07-390-m01-final.png", "path": "screenshots/R2-CH-07-390-m01-final.png" },
    { "label": "R2-CH-07-390-m04-final.png", "path": "screenshots/R2-CH-07-390-m04-final.png" },
    { "label": "R2-CH-07-total-anunciado-720.png", "path": "screenshots/R2-CH-07-total-anunciado-720.png" },
    { "label": "R2-CH-08-05-gaveta-390-acompanha.png", "path": "screenshots/R2-CH-08-05-gaveta-390-acompanha.png" },
    { "label": "R2-CH-08-07-indice-1440.png", "path": "screenshots/R2-CH-08-07-indice-1440.png" },
    { "label": "R2-CH-08-10-adesao-1440-90d.png", "path": "screenshots/R2-CH-08-10-adesao-1440-90d.png" },
    { "label": "R2-CH-08-12-aba-produto-m01-1440.png", "path": "screenshots/R2-CH-08-12-aba-produto-m01-1440.png" },
    { "label": "R2-CH-08-13-folha-390.png", "path": "screenshots/R2-CH-08-13-folha-390.png" },
    { "label": "R2-CH-08-15-formula-1440.png", "path": "screenshots/R2-CH-08-15-formula-1440.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — WI-01 · Compre Junto na página do produto · rodada 2 (confirmação)

**Gate 3:** confirmado em 2026-11-03 (Têmis, pela política do humano — QA local)

## Resumo

**Veredito:** pass — os 10 TC que falharam na rodada 1 e foram reconferidos passam, nenhum regrediu, e não há achado novo `critical` nem `high`

A rodada de confirmação rodou os cinco charters que tinham TC `fail` na rodada 1: CH-01, CH-02, CH-03, CH-07
e CH-08. Conferiu esses TC e o entorno das 13 correções. Os 13 bugs (BUG-001 a BUG-013) já estavam
`resolved`, cada um retestado e confirmado no Gate 3, bug a bug, durante as correções. Não houve
`wi-qa-retester` nesta rodada.

O que uma pessoa consegue fazer hoje, confirmado em navegador:

- **Marina (390), monta o conjunto.** Monta pingente, corrente e berloque, e a página diz o que falta só
  depois de ela tentar levar, com o eixo em minúscula ("Escolha o cor da qa."). Rola até a primeira peça
  incompleta e não deixa entrar nada pela metade.
- **Marina, leva o conjunto.** A sacola recebe exatamente o total do bloco (R$ 424,70 = subtotal), com
  "Acompanha o QA Pingente Estrela" e o traço dourado.
- **A gravação acima do limite** bloqueia o conjunto com o aviso previsto, nas duas peças.
- **Helena (leitor de tela).** Ouve o novo total a cada marca e a falta pelo `alert`, e o foco vai à
  primeira peça a escolher.
- **Com rede lenta,** o bloco chega junto com o produto e não empurra mais o botão de compra.
- **Adri** vê "É esta joia" ao buscar a própria peça, com ou sem acento. O índice, o editor de lista e a aba
  do produto seguem o protótipo.

O veredito não chega a `partial`, e a razão é a regra:

- o único TC sem veredito positivo é o TC-UI-006, `blocked` por massa — e ele é **P2**, enquanto só P0/P1
  `blocked` puxa o veredito para `partial`;
- CH-04, CH-05 e CH-06 não rodaram porque todos os TC deles passaram (ou ficaram `skip`) na rodada 1, que
  é o desenho da confirmação, não uma sessão que faltou.

Se o humano ler "charter que não rodou" ao pé da letra, o veredito vira `partial`. Nada mais muda.

| TC                                    | Critérios                                            | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | ---------------------------------------------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 10 · fail 0 · blocked 1 · skip 0 | 42 de 65 cobertos (16 parciais, 7 sem TC executado) | 0          | 0         | sem reteste nesta rodada (os 13 bugs já `resolved`)        |

## Rodada

- **Ambiente:** loja http://localhost:8082 · painel http://localhost:8083 · Supabase local (:54441), com `*.supabase.co` e `**/g/collect*` bloqueados por rota
- **Branch / build:** feature/WI-01, worktree `store__feature-WI-01`, HEAD f9167d9d · dev servers Vite (não build de produção)
- **Execução:** 2026-11-03, de ~07:30 a ~08:05 (horário de Brasília), ~35 min
- **Browser:** Chromium headless (Playwright MCP), versão não registrada · **Viewports:** 390 × 844, 720 × 450 (1440 a 200 %), 1440 × 900
- **Personas e acesso:** PER-01 Marina e PER-03 Helena → `anonima`; PER-02 Adri → `admin-painel` (sem valor de credencial). PER-04 Sônia sem sessão: o charter dela (CH-05) não entrou na confirmação
- **Desvios de ambiente:** dev server em vez de build; rede lenta simulada por atraso de 1,8 s em `/rest/v1/`; zoom 200 % simulado por viewport 720 × 450; nenhum pedido criado (instrução da rodada)

## Gate técnico

- **Validation do Dev:** `qa-report.md` — PASS. Fechamento de 2026-11-02 e Validation 14 (fix task 20, BUG-013) de 2026-11-03
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm --filter @estrelinha/{store,backoffice,mobile-adm} build`, exit 0 nos três (env local no ambiente) |
| lint  | pass   | `npx eslint .` por app: backoffice 23/5 · store 2/2 · mobile-adm 0/0, igual ao baseline |
| test  | pass   | 21534/21534 no fechamento; Validation 14: backoffice 5086/5086, store 6901/6901 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

Veredito marcado `r2` quando reconferido nesta rodada. Os outros vêm da rodada 1 (`qa-result-2026-11-02.md`):
os TC deles passaram e nenhuma correção os tocou.

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-SMOKE-003, TC-FUNC-029, TC-JOURNEY-003, TC-UI-004 | pass (TC-UI-004 r2) | covered |
| CA-01.2 | prd | TC-FUNC-030, TC-JOURNEY-003 | pass | covered |
| CA-01.3 | prd | TC-FUNC-031 | pass | covered |
| CA-01.4 | prd | TC-FUNC-032 | pass | covered |
| CA-01.5 | prd | TC-FUNC-033, TC-FUNC-021 | pass | covered |
| CA-01.6 | prd | TC-FUNC-040 | pass | covered |
| CA-01.7 | prd | TC-FUNC-034 | pass | covered |
| CA-02.1 | prd | TC-FUNC-035, TC-UI-005 | pass (TC-UI-005 r2) | covered |
| CA-02.2 | prd | TC-FUNC-031 | pass | covered |
| CA-02.3 | prd | TC-JOURNEY-003 | pass | covered |
| CA-02.4 | prd | TC-FUNC-038, TC-JOURNEY-003 | pass | covered |
| CA-02.5 | prd | TC-FUNC-036 | pass (r2) | covered |
| CA-02.6 | prd | TC-FUNC-039 | pass | covered |
| CA-02.7 | prd | TC-FUNC-037, TC-FUNC-021 | pass | covered |
| CA-02.8 | prd | TC-INT-002 | não executado (Dev) | missing |
| CA-02.9 | prd | TC-FUNC-020 | pass | covered |
| CA-03.1 | prd | TC-FUNC-001, TC-FUNC-020 | pass | covered |
| CA-03.2 | prd | TC-SMOKE-001, TC-FUNC-002 | pass · skip | partial |
| CA-03.3 | prd | TC-FUNC-003, TC-JOURNEY-001 | pass | covered |
| CA-03.4 | prd | TC-FUNC-004, TC-FUNC-011 | pass · skip | partial |
| CA-03.5 | prd | TC-FUNC-004 | pass | covered |
| CA-03.6 | prd | TC-FUNC-005 | pass (r2) | covered |
| CA-03.7 | prd | TC-FUNC-006, TC-JOURNEY-001 | pass | covered |
| CA-03.8 | prd | TC-FUNC-007 | pass | covered |
| CA-03.10 | prd | TC-FUNC-008, TC-FUNC-009 | pass | covered |
| CA-03.11 | prd | TC-CFR-001 | pass | covered |
| CA-03.12 | prd | TC-CFR-005 | pass | covered |
| CA-03.13 | prd | TC-FUNC-009 | pass | covered |
| CA-03.14 | prd | TC-FUNC-010, TC-SMOKE-001, TC-UI-001 | pass (TC-UI-001 r2) | covered |
| CA-03.15 | prd | TC-FUNC-011 | skip | partial |
| CA-04.1 | prd | TC-SMOKE-002, TC-FUNC-012, TC-FUNC-013, TC-JOURNEY-001, TC-JOURNEY-005 | pass · skip | partial |
| CA-04.2 | prd | TC-SMOKE-002, TC-FUNC-012, TC-JOURNEY-001 | pass · skip | partial |
| CA-04.3 | prd | TC-FUNC-014 | pass (r2) | covered |
| CA-04.4 | prd | TC-FUNC-015 | pass | covered |
| CA-04.5 | prd | TC-INT-001, TC-JOURNEY-002 | pass | covered |
| CA-04.6 | prd | TC-FUNC-023, TC-JOURNEY-002 | pass | covered |
| CA-04.7 | prd | TC-JOURNEY-005 | pass | covered |
| CA-04.8 | prd | TC-FUNC-016 | skip | partial |
| CA-04.9 | prd | TC-FUNC-017, TC-JOURNEY-001, TC-UI-002 | pass (TC-UI-002 r2) | covered |
| CA-05.1 | prd | TC-FUNC-018, TC-FUNC-013, TC-UI-002 | skip · pass (TC-UI-002 r2) | partial |
| CA-05.2 | prd | TC-FUNC-019, TC-JOURNEY-002 | skip · pass | partial |
| CA-05.3 | prd | TC-FUNC-015 | pass | covered |
| CA-05.4 | prd | TC-FUNC-023, TC-INT-003 | pass · não executado (Dev) | partial |
| CA-06.1 | prd | TC-FUNC-041, TC-JOURNEY-006, TC-INT-004 | pass · não executado (Dev) | partial |
| CA-06.2 | prd | TC-FUNC-042 | pass | covered |
| CA-06.3 | prd | TC-INT-004 | não executado (Dev) | missing |
| CA-06.4 | prd | TC-FUNC-041, TC-FUNC-042, TC-FUNC-043, TC-UI-006 | pass · blocked (TC-UI-006 r2, massa) | partial |
| CA-06.5 | prd | TC-INT-004 | não executado (Dev) | missing |
| CA-07.1 | prd | TC-FUNC-021 | pass | covered |
| CA-07.2 | prd | TC-FUNC-001, TC-REG-001 | pass · skip | partial |
| CA-07.3 | prd | TC-FUNC-022 | pass | covered |
| CA-08.1 | prd | TC-INT-005 | não executado (Dev) | missing |
| CA-08.2 | prd | TC-INT-005 | não executado (Dev) | missing |
| CA-09.1 | prd | TC-JOURNEY-004, TC-FUNC-024, TC-FUNC-025, TC-UI-003 | pass · skip (TC-FUNC-025) · pass (TC-UI-003 r2) | partial |
| CA-09.2 | prd | TC-FUNC-027 | pass | covered |
| CA-09.3 | prd | TC-FUNC-026 | skip | partial |
| CA-09.4 | prd | TC-FUNC-028 | não executado (Dev) | missing |
| CA-09.5 | prd | TC-FUNC-024, TC-FUNC-025 | pass · skip | partial |
| RNF-01 | prd | TC-CFR-001, TC-JOURNEY-001 | pass | covered |
| RNF-02 | prd | TC-CFR-003 | pass (r2) | covered |
| RNF-03 | prd | TC-INT-006 | não executado (Dev) | missing |
| RNF-04 | prd | TC-FUNC-004, TC-FUNC-023, TC-JOURNEY-002 | pass | covered |
| RNF-05 | prd | TC-CFR-004 | pass | covered |
| RNF-06 | prd | TC-CFR-002 | pass (r2) | covered |
| RNF-07 | prd | TC-SEC-001, TC-INT-007 | pass · não executado (Dev) | partial |

A única mudança de status em relação à rodada 1 é **CA-06.4**, de `covered` a `partial`. O TC-UI-006, que
deu `fail` na rodada 1 (BUG-013), ficou `blocked` aqui por falta de massa.

**Sem cobertura:**

- CA-02.8 — conversão do Compre Junto antigo: só TC-INT-002 (probe do Dev)
- CA-06.3, CA-06.5 — régua do relatório e peças pela quantidade da linha: só TC-INT-004 (Dev)
- CA-08.1, CA-08.2 — eventos do GA4: só TC-INT-005 (Dev, num build servido)
- CA-09.4 — forma desconhecida tratada como "Na linha": só TC-FUNC-028 (Dev)
- RNF-03 — preço anunciado ao Google: só TC-INT-006 (Dev)

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 Marina | — (confirmação) | done | 24 de 25 | pass 2 | 0 | — |
| CH-02 | PER-01 Marina | Money (só TC-FUNC-014) | done | 17 de 25 | pass 1 | 0 (2 observações) | — |
| CH-03 | PER-02 Adri | Garbage (valor limite) | done | 18 de 25 | pass 1 | 0 (3 observações) | — |
| CH-04 | PER-02 Adri | — | not-run (confirmação: todos os TC passaram na rodada 1) | — | — | — | — |
| CH-05 | PER-04 Sônia | — | not-run (confirmação: TC pass ou skip na rodada 1) | — | — | — | — |
| CH-06 | PER-03 Helena | — | not-run (confirmação: TC pass ou skip na rodada 1) | — | — | — | — |
| CH-07 | PER-03 Helena | — (cfr) | done | 5 de 18 | pass 2 | 0 (3 observações) | — |
| CH-08 | PER-02 Adri | — (design-check) | done | 20 de 25 | pass 5 · blocked 1 | 0 (2 observações) | — |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01     | ok: o total é anunciado em `role=status` a cada marca e esvaziado ao desmarcar; a falta, em `alert`; o foco vai à primeira peça a escolher (BUG-002 se sustenta) | — |
| Responsividade        | J-01, J-03 | ok no bloco (390, 720, 1440 sem rolagem lateral). Fricção no editor de lista do painel em 390 (nomes cortados; vai ao backlog) | — |
| Performance percebida | J-01     | ok no bloco: botão e "Em estoque" não se movem quando o bloco chega (BUG-001 se sustenta). O CLS de ~0,9 com rede lenta vem do rodapé da página e se repete igual na joia sem Compre Junto (M-04): é pré-existente | — |
| Segurança visível     | J-03     | ok: `/admin/compre-junto` e a URL da lista, deslogada, levam ao login (CH-03 passo 12) | — |

Usabilidade, compatibilidade e recuperação de erro, e toda a J-02, não foram remedidas: passaram na rodada 1,
e a confirmação só refaz os TC que falharam.

## Design-check

- **Protótipo:** Claude Design (Loja e Backoffice). **Não foi reaberto nesta rodada.** A régua foi o
  Esperado dos BUG-003, 005–008 e 010–013 e a coluna "design" da tabela D1–D37 da rodada 1
- **Status:** done (confirmação)
- **Divergências:** 0 novas ou reabertas. A Adesão com venda (recorte por joia e por lista) ficou de fora,
  `blocked` por massa

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC  |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | --- |

nada

**Reabertos:** nada — nenhuma das 13 correções voltou: cada TC que dependia delas passou, e o entorno conferido se manteve.

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada.

## Transições propostas

Sem bugs abertos no Work Item e nenhuma reabertura. Os 13 bugs seguem `resolved`, gravados nos Gates 3 por bug de 2026-11-02 e 2026-11-03.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- CH-02 O-1 (a A-1 da rodada 1) — com a gravação da corrente acima do limite, o total cai a R$ 279,90 e a barra segue "Conjunto · 2 peças" — spec-gap já respondido: P-01 de `decisoes-produto.md`, destino `WI novo`
- CH-02 O-2 e a N-1 do reteste do BUG-004 — "Essa combinação está indisponível no momento." e o botão "Indisponível" com a gravação acima do limite. Pré-existente: igual em 415af2b5 e sem conjunto. Vai às Sugestões de backlog
- CH-03 O-1 e a N-1 do reteste do BUG-011 — no editor de lista em 390, os nomes das peças saem cortados em "QA ..." (38 px). Não é regressão: nenhum TC que passava falhou. É medium na superfície da mudança, e na confirmação não vira bug (regra da rodada). Vai às Sugestões de backlog, com o risco abaixo
- CH-03 O-2 e o passo 12 do CH-08 — o formulário do produto abre com "Alterações não salvas" e pede confirmação de saída sem nenhuma edição — pré-existente, já nas Sugestões de backlog da rodada 1 ("Rascunho do produto sem 'Alterações não salvas' ao abrir")
- CH-03 O-3 — a busca do adicional na aba do produto abre 20 resultados sem digitar — pré-existente, já nas Sugestões de backlog da rodada 1 ("Busca de peça do painel só a partir de 2 letras")
- CH-07, observação 1 — CLS de ~0,9 na carga lenta, com o rodapé e o `MAIN` como fontes, igual na M-04 — pré-existente da página do produto. Vai às Sugestões de backlog
- CH-07, observação 2 — com escolha faltando, o foco vai agora à primeira peça a escolher — conforme a fonte. A sugestão de backlog da rodada 1, "Levar o foco à primeira opção que falta escolher", parece atendida; o humano pode tirá-la da lista
- CH-07, observação 3 — ao desmarcar, o nome acessível da caixa guarda a variação escolhida. Não é achado: a escolha fica preservada e volta ao marcar de novo
- CH-08, observação 1 — o alerta "Falta uma escolha em N peças…" fica abaixo do bloco, fora do rodapé do total — conforme a fonte, decidido na triagem da rodada 1 (CH-08 A-2). A concordância no plural ("Elas estão marcadas acima.") é coerente com N > 1
- CH-01, observação — depois da primeira tentativa, a marca de "já tentou" fica ligada até recarregar — conforme a fonte (no protótipo, `tentou` é estado da página)
- Retestes de 2026-11-02, primeiro clique sem marcar (BUG-005) e Esc que não fechou o diálogo (BUG-006) — intermitente sem segunda ocorrência: não reproduziram nos retestes, e não apareceram nesta rodada

## Perguntas ao produto

nada — rodada de confirmação. Seguem do Gate 3 anterior: P-01 (`WI novo`), P-02 (`nada`) e P-03 (`pendente`).

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Em 390, cada linha de "Peças da lista" corta o nome em "QA ..." (38 px), porque as setas e a lixeira tomam a largura; o "a partir de" quebra em três linhas. Com nomes reais, todas viram "Cor..." | Painel · editor de lista do Compre Junto, 390 (CH-03 passo 10; reteste do BUG-011) | fora da régua da confirmação: defeito medium na superfície da mudança, sem regressão provada | Nome legível das peças no editor de lista em 390 |
| Com a gravação acima do limite, a coluna diz "Essa combinação está indisponível no momento." e o botão vira "Indisponível", ao lado do alerta da gravação. Isso também mostra que o aviso de combinação indisponível é **alcançável**, ao contrário do que a sugestão da rodada 1 supunha | Loja · página do produto (CH-02 passo 04; reteste do BUG-004) | pré-existente | Bloqueio por gravação acima do limite fala da gravação, não de "indisponível" |
| Com rede lenta, a página do produto tem CLS de ~0,9 em 390 e 1440: o rodapé sobe e desce com o esqueleto da página, que é mais curto que ela. Igual com e sem Compre Junto | Loja · página do produto, carregamento (CH-07 passos 01–03) | pré-existente | Esqueleto da página do produto sem salto do rodapé |

## Riscos residuais

- **O nome cortado no editor de lista em 390** é medium e mora numa tela que este Work Item criou. Ficou fora
  da régua da confirmação só porque não regrediu um TC. O retester o atribuiu a antes da correção do
  BUG-011, mas essa correção mexeu no `ListItemRow.tsx`, e a origem não está provada. Se o celular for caminho
  real da Adri para montar listas, vale promovê-lo a bug neste Gate
- **A Adesão com venda** (o cartão do recorte, o alternador e as colunas, TC-UI-006) não tem prova nesta
  rodada. Foi conferida só no reteste do BUG-013, com a massa M-08 temporária, já apagada
- **Dois TC P0 seguem em `skip` desde a rodada 1** e não entraram na confirmação: TC-FUNC-002 (desmarcar um
  de dois adicionais) e TC-FUNC-012 (os 3 adicionais, 4 linhas)
- **Nenhum pedido foi criado nesta rodada.** O valor cobrado e o "acompanha" no pedido seguem provados só
  pela rodada 1 (#0327), antes das 13 correções. Duas delas mexeram no caminho da sacola: BUG-004 e BUG-008.
  A sacola conferida aqui bate com o total do bloco
- **As medições não usaram as condições reais.** Rede lenta e zoom foram simulados, e o anúncio ao leitor de
  tela foi lido pela região viva, não por um leitor real

## Fora da cobertura

- CH-04, CH-05 e CH-06 — `not-run` pelo desenho da confirmação: os TC deles tiveram `pass` ou `skip` na
  rodada 1. Por isso a PER-04 Sônia não tem sessão nesta rodada
- TC dos charters que rodaram e passaram na rodada 1 — não reexecutados; vale o veredito da rodada 1:
  - CH-01: os demais TC do charter
  - CH-02: TC-JOURNEY-002, TC-FUNC-008/009/012/016/018/019/023, TC-INT-001
  - CH-03: TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-029/030/031/035/038/039/040, TC-SEC-001, TC-PERSONA-002
- TC sem veredito positivo:
  - TC P0 em `skip` desde a rodada 1: TC-FUNC-002, TC-FUNC-012
  - TC P1 em `skip` desde a rodada 1: TC-FUNC-011, 016, 018, 019, 026, TC-REG-001
  - TC P2 `blocked` nesta rodada: TC-UI-006
- TC de integração com o Dev, não rodados nas sessões: TC-FUNC-028, TC-INT-002 a TC-INT-007
- Na loja:
  - checkout, PIX, confirmação e painel do pedido (instrução de não criar pedido);
  - J-02 inteira no CFR;
  - fonte do sistema a 130/200 %, 320 e 768 px, movimento reduzido e tema escuro;
  - as formas "Em folha" e "Com fórmula" em 390 a 200 %
- No painel e no design-check:
  - a aba do produto em 390;
  - índice vazio, peça fora do ar no editor, recusas da 13ª peça e do 4º adicional no design-check;
  - a conferência na loja depois de editar uma lista (nada foi gravado)
- Leitor de tela real, Slow 4G real, Safari/iOS, Chrome Android e Firefox — só o Chromium do driver rodou
