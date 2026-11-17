```json
{
  "schema": "qa-result/v1",
  "verdict": "fail",
  "executed_at": "2026-11-17",
  "branch": "feature/103",
  "duration_min": 0,
  "gates": [
    {
      "name": "build",
      "command": "build de apps/store e apps/backoffice (vite), com VITE_SUPABASE_URL/VITE_SUPABASE_PUBLISHABLE_KEY do Supabase local",
      "status": "pass",
      "summary": "PASS na segunda tentativa; a primeira falhou por apps/store/.env ausente no worktree (ambiente, sem tocar código)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (apps/store, apps/backoffice)",
      "status": "pass",
      "summary": "store 2 erros/2 warnings e backoffice 23 erros/5 warnings, iguais ao baseline; nenhum novo"
    },
    {
      "name": "test",
      "command": "vitest por workspace (core, store, backoffice, functions), --testTimeout=20000",
      "status": "pass",
      "summary": "21343/21343"
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
    "acceptance_covered": 25,
    "items": [
      { "criterion": "CA-01.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.2", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.3", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.4", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-01.5", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-01.6", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-02.1", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.2", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-02.3", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.4", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.5", "validated_by": { "tc_ref": "TC-FUNC-014", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02.6", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.1", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.2", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-03.3", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-03.4", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.5", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03.6", "validated_by": { "tc_ref": "TC-FUNC-020", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.1", "validated_by": { "tc_ref": "TC-FUNC-016", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.2", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.3", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.4", "validated_by": { "tc_ref": "TC-FUNC-018", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04.5", "validated_by": { "tc_ref": "TC-FUNC-019", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-04.6", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05.1", "validated_by": { "tc_ref": "TC-JOURNEY-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05.2", "validated_by": { "tc_ref": "TC-SEC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-06.1", "validated_by": { "tc_ref": "TC-SEC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-02", "validated_by": { "tc_ref": "TC-FUNC-008", "type": "e2e" }, "status": "missing" },
      { "criterion": "RNF-03", "validated_by": { "tc_ref": "TC-JOURNEY-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "RNF-04", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-05", "validated_by": { "tc_ref": "TC-CFR-003", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-06", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" },
      { "criterion": "RNF-07", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "RNF-08", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" }
    ],
    "missing": ["CA-01.6", "CA-04.5", "RNF-02"]
  },
  "test_cases": [
    { "tc_ref": "TC-JOURNEY-001", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-FUNC-007", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-008", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "fail", "bug_ref": "BUG-006" },
    { "tc_ref": "TC-FUNC-017", "verdict": "fail", "bug_ref": "BUG-005" },
    { "tc_ref": "TC-FUNC-018", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-019", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-020", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-021", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "fail", "bug_ref": "BUG-003" },
    { "tc_ref": "TC-UI-002", "verdict": "blocked" },
    { "tc_ref": "TC-SEC-001", "verdict": "pass" },
    { "tc_ref": "TC-SEC-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "fail", "bug_ref": "BUG-004" },
    { "tc_ref": "TC-CFR-002", "verdict": "fail", "bug_ref": "BUG-003" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "CH-01-09-editor-sem-recibo-salvo.png", "url": "screenshots/CH-01-09-editor-sem-recibo-salvo.png" },
    { "label": "CH-01-10-loja-bloco-salvo-390.png", "url": "screenshots/CH-01-10-loja-bloco-salvo-390.png" },
    { "label": "CH-04-06-b2-salvo-sem-recibo.png", "url": "screenshots/CH-04-06-b2-salvo-sem-recibo.png" },
    { "label": "CH-05-01-editor-salvo-p-nb.png", "url": "screenshots/CH-05-01-editor-salvo-p-nb.png" },
    { "label": "CH-01-01-linha-sem-campanha.png", "url": "screenshots/CH-01-01-linha-sem-campanha.png" },
    { "label": "CH-04-02-b2-ligado-no-ar.png", "url": "screenshots/CH-04-02-b2-ligado-no-ar.png" },
    { "label": "CH-04-07-linha-b2-natal-agendada.png", "url": "screenshots/CH-04-07-linha-b2-natal-agendada.png" },
    { "label": "CH-06-02-linha-b1-desligada.png", "url": "screenshots/CH-06-02-linha-b1-desligada.png" },
    { "label": "CH-06-04-linha-b3-agendada.png", "url": "screenshots/CH-06-04-linha-b3-agendada.png" },
    { "label": "CH-06-14-linha-b3-encerrada.png", "url": "screenshots/CH-06-14-linha-b3-encerrada.png" },
    { "label": "CH-02-02-corpo-rola-de-lado-390.png", "url": "screenshots/CH-02-02-corpo-rola-de-lado-390.png" },
    { "label": "CH-02-03-fileira-passada-390.png", "url": "screenshots/CH-02-03-fileira-passada-390.png" },
    { "label": "CH-07-02-home-390-200.png", "url": "screenshots/CH-07-02-home-390-200.png" },
    { "label": "CH-07-01-editor-390-200.png", "url": "screenshots/CH-07-01-editor-390-200.png" },
    { "label": "CH-05-08-editor-sem-leitura-campanha.png", "url": "screenshots/CH-05-08-editor-sem-leitura-campanha.png" },
    { "label": "CH-05-07-editor-apagada-contagem.png", "url": "screenshots/CH-05-07-editor-apagada-contagem.png" },
    { "label": "CH-05-06-loja-sem-fora-e-apag-390.png", "url": "screenshots/CH-05-06-loja-sem-fora-e-apag-390.png" },
    { "label": "CH-01-02-loja-sem-bloco-390.png", "url": "screenshots/CH-01-02-loja-sem-bloco-390.png" },
    { "label": "CH-01-05-busca-peca-fora.png", "url": "screenshots/CH-01-05-busca-peca-fora.png" },
    { "label": "CH-01-08-previa-rascunho-ordem.png", "url": "screenshots/CH-01-08-previa-rascunho-ordem.png" },
    { "label": "CH-02-01-bloco-390.png", "url": "screenshots/CH-02-01-bloco-390.png" },
    { "label": "CH-02-04-peca-p1-390.png", "url": "screenshots/CH-02-04-peca-p1-390.png" },
    { "label": "CH-06-05-loja-antes-t0-390.png", "url": "screenshots/CH-06-05-loja-antes-t0-390.png" },
    { "label": "CH-06-07-loja-toquio-t0-390.png", "url": "screenshots/CH-06-07-loja-toquio-t0-390.png" },
    { "label": "CH-06-08-loja-brasilia-t0-390.png", "url": "screenshots/CH-06-08-loja-brasilia-t0-390.png" },
    { "label": "CH-06-10-linha-b3-em-vigencia.png", "url": "screenshots/CH-06-10-linha-b3-em-vigencia.png" },
    { "label": "CH-06-12-loja-brasilia-fim-390.png", "url": "screenshots/CH-06-12-loja-brasilia-fim-390.png" },
    { "label": "CH-03b-01-conta-logada.png", "url": "screenshots/CH-03b-01-conta-logada.png" },
    { "label": "CH-03b-02-home-b1-logada.png", "url": "screenshots/CH-03b-02-home-b1-logada.png" },
    { "label": "CH-03b-04-page-logada.png", "url": "screenshots/CH-03b-04-page-logada.png" },
    { "label": "CH-03b-05-ofertas-logada.png", "url": "screenshots/CH-03b-05-ofertas-logada.png" },
    { "label": "CH-03b-06-sacola-logada.png", "url": "screenshots/CH-03b-06-sacola-logada.png" },
    { "label": "CH-03b-07-previa-celular.png", "url": "screenshots/CH-03b-07-previa-celular.png" },
    { "label": "CH-03b-08-previa-computador.png", "url": "screenshots/CH-03b-08-previa-computador.png" },
    { "label": "CH-03-03-ofertas-anon.png", "url": "screenshots/CH-03-03-ofertas-anon.png" },
    { "label": "CH-03-04-ma-anon.png", "url": "screenshots/CH-03-04-ma-anon.png" },
    { "label": "CH-03-05-sacola-anon.png", "url": "screenshots/CH-03-05-sacola-anon.png" }
  ],
  "issues": {
    "total": 6,
    "by_severity": { "critical": 0, "high": 3, "medium": 3, "low": 0 }
  }
}
```

# Resultado de QA — 103 · Joias em oferta configurável — título, descrição, campanha e peças escolhidas

**Gate 3:** confirmado em 2026-11-17

## Resumo

**Veredito:** fail — dois TC P0 falharam (TC-FUNC-006, TC-JOURNEY-001) por um bug `high` aberto (BUG-001), e há mais dois `high` abertos (BUG-002, BUG-003)

A rodada percorreu as cinco jornadas com as três personas, em oito charters (o CH-03 em duas partes). O que o
Work Item promete se cumpre de ponta a ponta: a dona escolhe a campanha, escreve o título e a descrição, escolhe
e ordena as peças, confere na prévia e vê o bloco na loja com as palavras e a ordem dela; o bloco preparado para
uma campanha agendada entra sozinho no início e sai no fim pelo relógio do banco, em três fusos; a trava "um
bloco por campanha" segura no servidor sem perder o rascunho; peças tiradas, despublicadas, apagadas ou que a
campanha não barateia somem da loja sem substituta; e, com a sessão de admin aberta, a loja e a prévia mostram
só a campanha em vigência (UC-06), igual à visitante.

O que a dona não consegue hoje é **confiar no que o painel diz sobre o próprio trabalho**: ao gravar o bloco com
peças, o editor não dá "Salvo" e continua "Alterações não salvas" (BUG-001); e a linha do bloco que não aparece
na loja diz "No ar" ao lado do aviso de que ele não aparece (BUG-002). Para a cliente no celular, a Home rola de
lado na fileira das peças escolhidas (BUG-003). Há ainda três de fricção: o editor a 200 % de fonte no celular
empurra o Salvar para fora da tela (BUG-004), a falha da leitura das peças deixa "Conferindo…" sem fim (BUG-005),
e a peça apagada sai da contagem "N das M saíram do ar" (BUG-006).

Decidem o veredito: TC-FUNC-006 e TC-JOURNEY-001 (P0) em `fail` por BUG-001, e três bugs `high` abertos.

| TC                                    | Critérios       | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | --------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 21 · fail 7 · blocked 1 · skip 3 | 25 de 35 cobertos (7 parciais, 3 sem execução) | 6 | 0 | resolved 0 · still-open 0 · cannot-reproduce 0 · blocked 0 |

## Rodada

- **Ambiente:** loja http://localhost:8082 · painel http://localhost:8083 · Supabase local (API 127.0.0.1:54441)
- **Branch / build:** feature/103, worktree `store__feature-103` (a Validation mediu HEAD `18d70244`; as sessões
  não expõem o build)
- **Execução:** rodada 1 (exploração), 2026-11-17 — início, fim e duração não informados no briefing
  (`duration_min: 0` = não informado); o CH-06 registra a virada entre 00:11 e 00:31 de Brasília
- **Browser:** Chromium (agent-browser 0.39.1, headless) · **Viewports:** 390 × 844, 1440 × 900; prévia
  Celular 390 × 844 e Computador 1024 × 768; fonte da raiz a 100 %, 130 % e 200 % (CH-07); fusos
  America/Sao_Paulo, Asia/Tokyo e America/Manaus (CH-06)
- **Personas e acesso:** PER-01 → `admin-loja` (CH-01, CH-04, CH-05, CH-06, CH-07) e `admin-loja-2` (CH-08);
  PER-02 → `anonima` (CH-02); PER-03 → `admin-loja` no painel e na loja (CH-03) e `anonima` para a régua

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — PASS, de 2026-11-16
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | loja e painel PASS na segunda tentativa (a primeira falhou por `.env` ausente no worktree — ambiente) |
| lint  | pass   | store 2/2 e backoffice 23/5, iguais ao baseline; nenhum novo |
| test  | pass   | 21343/21343 (core 6240 · store 7854 · backoffice 5538 · functions 1711), exit 0 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| CA-01.1 | prd | TC-FUNC-005, TC-JOURNEY-001 | pass · fail (BUG-001) | covered |
| CA-01.2 | prd | TC-FUNC-006 | fail (BUG-001) | covered |
| CA-01.3 | prd | TC-FUNC-003 | pass | covered |
| CA-01.4 | prd | TC-FUNC-003, TC-FUNC-008 | pass · skip | partial |
| CA-01.5 | prd | TC-FUNC-013 | pass | covered |
| CA-01.6 | prd | TC-FUNC-007 | skip | missing |
| CA-02.1 | prd | TC-FUNC-002, TC-FUNC-021 | pass | covered |
| CA-02.2 | prd | TC-JOURNEY-001, TC-FUNC-008, TC-FUNC-012, TC-JOURNEY-003, TC-FUNC-021 | fail (BUG-001) · skip · pass | partial |
| CA-02.3 | prd | TC-FUNC-006, TC-FUNC-012, TC-FUNC-021 | fail (BUG-001) · pass — selo contraditório em BUG-002 | covered |
| CA-02.4 | prd | TC-FUNC-001, TC-FUNC-009 | pass — selo contraditório em BUG-002 | covered |
| CA-02.5 | prd | TC-FUNC-014 | pass | covered |
| CA-02.6 | prd | TC-FUNC-010, TC-FUNC-013 | pass | covered |
| CA-03.1 | prd | TC-FUNC-004 | pass | covered |
| CA-03.2 | prd | TC-FUNC-005, TC-FUNC-008, TC-JOURNEY-002 | pass · skip | partial |
| CA-03.3 | prd | TC-FUNC-007, TC-UI-001 | skip · fail (BUG-003) | partial |
| CA-03.4 | prd | TC-FUNC-004 | pass | covered |
| CA-03.5 | prd | TC-FUNC-003 | pass | covered |
| CA-03.6 | prd | TC-FUNC-020 | pass | covered |
| CA-04.1 | prd | TC-FUNC-016 | fail (BUG-006) | covered |
| CA-04.2 | prd | TC-FUNC-015 | pass | covered |
| CA-04.3 | prd | TC-FUNC-015, TC-FUNC-016, TC-FUNC-017 | pass · fail (BUG-006) · fail (BUG-005) | covered |
| CA-04.4 | prd | TC-FUNC-018 | pass | covered |
| CA-04.5 | prd | TC-FUNC-019 | skip | missing |
| CA-04.6 | prd | TC-FUNC-003, TC-FUNC-008, TC-FUNC-019 | pass · skip | partial |
| CA-05.1 | prd | TC-FUNC-005, TC-JOURNEY-001 | pass · fail (BUG-001) | covered |
| CA-05.2 | prd | TC-FUNC-011, TC-SEC-002 | pass | covered |
| CA-06.1 | prd | TC-SEC-001, TC-SEC-002, TC-REG-001 | pass | covered |
| RNF-01 | prd | TC-FUNC-001, TC-CFR-002 | pass · fail (BUG-003) | covered |
| RNF-02 | prd | TC-FUNC-008 | skip | missing |
| RNF-03 | prd | TC-JOURNEY-003, TC-SEC-001 | pass | covered |
| RNF-04 | prd | TC-UI-001, TC-CFR-001, TC-CFR-002 | fail (BUG-003, BUG-004) | covered |
| RNF-05 | prd | TC-CFR-003 | pass | covered |
| RNF-06 | prd | TC-FUNC-007, TC-CFR-002 | skip · fail (BUG-003) | partial |
| RNF-07 | prd | TC-CFR-001 | fail (BUG-004) | covered |
| RNF-08 | prd | TC-FUNC-007, TC-CFR-001 | skip · fail (BUG-004) | partial |

**Sem cobertura:**

- CA-01.6 — TC-FUNC-007 não rodou (orçamento do CH-01). Evidência parcial fora de TC: o CH-07 (passo 04) viu a
  recusa do título com 61 caracteres ao salvar, como alerta, com o motivo e o número; descrição 161 e a 13ª peça
  não foram tentadas
- CA-04.5 — TC-FUNC-019 não rodou (orçamento do CH-05)
- RNF-02 — TC-FUNC-008 passos 3–4 (bloqueio de produtos) não rodaram (orçamento do CH-02)

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 | Feature | done | 97 de 70 | pass 5 · fail 2 · skip 1 | 2 | BUG-001, BUG-002 |
| CH-02 | PER-02 | Feature | done | 52 de 50 | pass 1 · fail 1 · skip 1 | 1 | BUG-003 |
| CH-03 (parte 1) | PER-03 | Feature | done — TC-SEC-001 `blocked` (login na loja não confirmado), TC-SEC-002 `skip`; superados pela parte 2 | ~72 de 70 | pass 1 · blocked 1 · skip 1 | 1 | — |
| CH-03 (parte 2) | PER-03 | Feature | done — redespacho de TC-SEC-001 e TC-SEC-002 | ~93 comandos de 50 (~45 ações de persona) | pass 2 | 0 | — |
| CH-08 | PER-01 | — | done | 36 de 25 | blocked 1 (reclassificado na triagem; a sessão deu `fail`) | 3 | — |
| CH-05 | PER-01 | Interrupt | done | ~190 comandos (~70 de interação) de 70 | pass 3 · fail 2 · skip 1 | 2 | BUG-005, BUG-006, BUG-001 |
| CH-04 | PER-01 | Multi-Tab | done | ~68 de 70 | pass 6 | 2 | BUG-002, BUG-001 |
| CH-06 | PER-01 | Locale | done | ~79 de 70 | pass 2 | 0 | BUG-002 (ocorrências) |
| CH-07 | PER-01 · anonima | — | done | 37 de 35 | pass 1 · fail 2 | 2 | BUG-004, BUG-003 |

Contagem por TC já consolidada: TC-SEC-001 vale `pass` da parte 2 do CH-03 (redespacho com o insumo que faltou na
parte 1). TC-UI-002 passou de `fail` (sessão) a `blocked` na triagem — ver Design-check.

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01, J-02 | fricção — editor a 200 % estoura a tela; rótulos, radiogroup e recusa como alerta ok; título e descrição do bloco inteiros a 200 % | BUG-004 |
| Responsividade        | J-01, J-02 | falha — a Home rola de lado em 390 (100 % e 200 %); o editor rola de lado só a 200 % | BUG-003, BUG-004 |
| Performance percebida | J-02 | ok — FCP 404 ms, CLS 0 em rede rápida; rede lenta (vagas por peça) não medida | — |
| Segurança visível     | J-05 | ok — com sessão de admin, loja e prévia só com a campanha em vigência (TC-SEC-001, TC-SEC-002) | — |

## Design-check

- **Fonte de design:** artifact `SQehnBNiiQmbnjkY3QQpbq` (só os padrões adotados em D-01), lido pela cópia
  decodificada do bundle — o link parou na verificação Cloudflare; sem CSS (só estrutura, texto e ícone)
- **Status:** done
- **Divergências:** 0 bugs.
  - D1 — contador "n/limite" em vez de "n / teto": desvio declarado (spec.md I-06)
  - D2 — sem recusa ao digitar e campo sem `maxLength`: conforme I-06 (recusa ao salvar). A recusa ao salvar não
    foi provocada pelo CH-08 (massa só leitura); por isso TC-UI-002 fica `blocked`, não `fail`. O contador sem
    estado de erro acima do teto vai a Sugestões de backlog
  - D3 — "Remover a Nª peça" com lixeira em vez de "Tirar" com ×: conforme o PRD (CA-03.2 diz "remover") e o
    molde "Produtos em destaque" (D-01)

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 2 · Fricção 4 (1 com subida para `high`) · Cosmético 0
Por severidade: critical 0 · high 3 · medium 3 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-001 | Dano à confiança | high | P1 | [Editor do bloco] Gravar com peça acrescentada não dá "Salvo" e segue "Alterações não salvas" | PER-01 · J-01, passo 8 (J-03, passo 4) | TC-FUNC-006 (e TC-JOURNEY-001) |
| BUG-002 | Dano à confiança | high | P1 | [Home do painel] Linha do bloco Joias em oferta diz "No ar" quando ele não aparece na loja | PER-01 · J-01, passo 1 (J-03, passos 2 e 5) | — (TC-FUNC-001/009/012/021 passaram no texto) |
| BUG-003 | Fricção, subida por J-02 P0 | high | P1 | [Home da loja] No celular a página rola de lado na fileira de Joias em oferta — visitante | PER-02 · J-02, passo 2 | TC-UI-001 (e TC-CFR-002) |
| BUG-004 | Fricção | medium | P2 | [Editor do bloco] Fonte a 200 % no celular empurra "Salvar seção" para fora da tela | PER-01 (condição do CFR) · J-01, passo 8 | TC-CFR-001 |
| BUG-005 | Fricção | medium | P2 | [Editor do bloco] Falha ao ler as peças da campanha deixa "Conferindo…" sem fim, sem aviso | PER-01 · J-04, ramo J-04a | TC-FUNC-017 |
| BUG-006 | Fricção | medium | P2 | [Home do painel] Peça escolhida apagada fica fora da contagem "N das M saíram do ar" | PER-01 · J-04, passo 4 | TC-FUNC-016 |

Critério do PRD que cada um quebra: BUG-001 → CA-01.2 · BUG-002 → CA-02.3, CA-02.4 · BUG-003 → RNF-04 (e CA-03.3)
· BUG-004 → RNF-04 · BUG-005 → CA-04.3 · BUG-006 → CA-04.1.

**Reabertos:** nada

## Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-001, BUG-004 | editor do bloco "Joias em oferta" · barra do topo do editor (indicador de alterações e "Salvar seção") | mesmo componente na mesma tela | high |
| L2 | BUG-002, BUG-006 | Home do painel · linha do bloco "Joias em oferta" | mesmo componente na mesma tela (estado e avisos da linha) | high |
| L3 | BUG-003 | Home da loja · bloco "Joias em oferta" — fileira das peças escolhidas | sozinho | high |
| L4 | BUG-005 | editor do bloco "Joias em oferta" · Peças escolhidas (conferência das peças marcadas) | sozinho | medium |

## Transições propostas

sem bugs abertos no Work Item e nenhuma reabertura.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- "No ar" na linha de bloco que não aparece (CH-01 A-2, CH-04 A-1, CH-06 passos 04, 08, 19) — juntos em BUG-002 (mesma causa observável); o "intermitente" do CH-01 caiu com 6 reproduções nas outras sessões
- Sem "Salvo" ao gravar com peças (CH-04 A-2, CH-05 passo 02) — duplicado de BUG-001 (ocorrências listadas)
- Rolagem horizontal da Home a 390 no CFR (CH-07 passos 07–08) — duplicado de BUG-003 (ocorrências listadas)
- Título e descrição aceitam passar do teto, sem recusa ao digitar (CH-08 A-1) — conforme a fonte: spec.md I-06 (sem `maxLength`, recusa ao salvar); a recusa ao salvar existe (CH-07 passo 04). O contador sem estado de erro vai a Sugestões de backlog
- Contador "n/limite" em vez de "n / teto" (CH-08 D1) — conforme a fonte: desvio declarado em I-06
- "Remover a Nª peça" com lixeira em vez de "Tirar" com × (CH-08 A-2) — conforme a fonte: PRD CA-03.2 ("posição, nome e remover") e o molde "Produtos em destaque" (D-01)
- A prévia da Home mostra o rascunho cancelado até recarregar (CH-08 A-3) — intermitente sem segunda ocorrência (1 de 1, sem screenshot); vai a Riscos residuais
- Toque no meio do cartão de P-1 não abriu a peça (CH-02 Debrief) — intermitente sem segunda ocorrência; vai a Riscos residuais
- Campanha desligada não aparece para marcar peças na aba de preço (CH-03 A-1) — spec-gap, cadastro da WI 102 (fora deste WI); vai a Sugestões de backlog
- "Salvar seção" com 40 px de altura a 390 (CH-07 A-2) — defeito pré-existente abaixo de `high` (barra comum aos editores da Home; sem screenshot); vai a Sugestões de backlog
- Clicar no bloco da bandeja já cria o bloco, mesmo com Cancelar (CH-04 Debrief) — conforme a fonte: PRD CA-02.4 e spec.md F2
- Home aberta antes ou durante a vigência não atualiza sem recarregar (CH-06 passos 12 e 17) — conforme a fonte: test-plan, pergunta 🟡 sobre CA-02.2 (não exige atualizar sem recarregar)
- "Adicionar à sacola" sem retorno ao clique, só com Enter (CH-03 partes 1 e 2) — spec-gap pré-existente (sacola, fora deste WI), não confirmado como defeito do produto (clique headless); vai a Sugestões de backlog e a Riscos residuais
- Os demais spec-gaps das sessões — classificados em Sugestões de backlog

## Perguntas ao produto

nada

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| A faixa de avisos diz "Black Friday · novembro inteiro com joias em oferta" com a Black Friday encerrada e o bloco logo abaixo em "Dia das Mães" (CH-01, CH-02, CH-03) | Home da loja, página da peça e prévia · faixa de avisos (WI 101) | pré-existente | Faixa de avisos acompanha a campanha em vigência |
| O login do painel cai no Dashboard em vez de voltar à página pedida (CH-01) | painel · `/admin/login` | pré-existente | Login do painel volta à página de onde a dona saiu |
| A busca de peças sem resultado sugere trocar a palavra, sem lembrar que só mostra as marcadas na campanha (CH-01) | editor do bloco · Peças escolhidas | polimento | Busca de peças do bloco explica o recorte da campanha quando não acha |
| Acima de 60/160, o contador fica na cor normal, sem estado de erro nem `aria-invalid`, até salvar (CH-08) | editor do bloco · Conteúdo | polimento | Contador do título e da descrição do bloco marca o estouro ao digitar |
| Depois de "Salvo", o aviso "…saiu da lista." + "A remoção vale quando você salvar." continua na tela até recarregar (CH-05) | editor do bloco · Peças escolhidas | polimento | Aviso das peças que saíram some depois de salvar |
| Cancelar ou sair pelo menu com "Alterações não salvas" não pede confirmação (CH-05, CH-07) | editores da Home do painel | pré-existente | Confirmar ao sair do editor da Home com alterações não salvas |
| "Salvar seção" com 40 px de altura a 390, abaixo do alvo de 44 px (CH-07) | editores da Home · barra do topo | pré-existente | Alvo de toque de 44 px na barra Salvar/Cancelar dos editores da Home |
| Bloco sem campanha com todas as campanhas ocupadas pede "Escolha uma campanha" sem dizer que não há campanha livre (CH-04) | editor do bloco · Campanha | polimento | Editor do bloco diz quando não há campanha livre |
| Bloco de campanha sem nenhuma peça marcada aparece na loja (selo, título, cartão de percentual) enquanto o editor diz "Sem peça marcada, o bloco não tem o que mostrar." (CH-06) | Home da loja · editor do bloco · Campanha | polimento | Alinhar o aviso do editor e a loja para campanha sem peça marcada |
| O diálogo "Apagar a campanha?" não avisa que um bloco da Home usa a campanha (CH-04) | `/admin/campanhas` (WI 102) | pré-existente | Apagar campanha avisa os blocos da Home que a usam |
| Campanha desligada não aparece na aba "Preços & variações" da peça para marcação (CH-03) | `/admin/produtos` · Preços & variações (WI 102) | pré-existente | Marcar peças numa campanha ainda desligada |
| No seletor de data da campanha, clicar no dia selecionado o desmarca e o calendário não fecha com Esc (CH-03) | `/admin/campanhas` (WI 102) | pré-existente | Seletor de data da campanha fecha com Esc e não desmarca o dia |
| Campos de hora e minuto da campanha só aceitam dígito a dígito (CH-06) | `/admin/campanhas` (WI 102) | pré-existente | Campos de hora da campanha aceitam colar e digitar |
| Campanha encerrada, mas ainda ligada, impede religar outra cuja vigência cruza a dela (CH-06) | cadastro de campanhas (WI 102) | pré-existente | Campanha encerrada não bloqueia ligar outra |
| "Adicionar à sacola" não responde ao clique na página da peça, só a foco + Enter (CH-03, duas sessões, headless) | loja · página da peça | pré-existente | Conferir "Adicionar à sacola" que não responde ao clique |
| A dona logada não acha "Sair" na loja a 390 (nem em `/conta`, nem no menu) (CH-03) | loja · `/conta` e menu | pré-existente | Sair da conta na loja pelo celular |
| A prévia em "Computador", com o painel a 390, fica em escala de 5 % (CH-03) | painel · prévia da Home | polimento | Prévia em Computador legível no painel estreito |
| Interruptores de blocos repetidos têm o mesmo nome acessível ("Desligar Joias em oferta") (CH-07) | painel · lista da Home | pré-existente | Nome acessível do interruptor distingue blocos repetidos |
| Setas das fileiras da Home com 40 × 40 px a 390 e "Anterior" habilitada no início (CH-02, medido uma vez) | Home da loja · fileiras com setas | pré-existente | Setas das fileiras da Home com 44 px e estado no início |

## Evidências não enviadas

nada

## Riscos residuais

- **Dois Dano à confiança na mesma área (J-01/J-03, painel):** BUG-001 e BUG-002 são os dois indicadores de
  estado que a dona lê — "Salvo" e "No ar" — dizendo o contrário do que aconteceu. Juntos dizem que o painel
  ainda não é confiável para a dona saber, sem ir à loja, se gravou e se o bloco está no ar
- **Rolagem horizontal em 390 nas duas superfícies** (BUG-003 na loja, BUG-004 no editor): fricção repetida do
  mesmo tipo; vale reconferir as duas em 320 × 568 e com 4+ peças depois da correção
- **Prévia com rascunho cancelado** (CH-08 A-3, 1 de 1, sem screenshot): depois de Cancelar o editor, a prévia
  da Home mostrou o título descartado até recarregar. Se confirmado, é `high` (a dona duvida se cancelou ou
  gravou). Reproduzir de estado limpo, com screenshot, no próximo charter
- **"Adicionar à sacola" sem retorno ao clique** (CH-03, duas sessões, headless; com Enter funciona): fora do
  WI e possivelmente artefato do clique automatizado — mas, se for real, bloqueia a compra. Conferir num browser
  com toque/clique real
- **Toque no meio do cartão não abriu a peça** (CH-02, 1 vez): pode ser o mesmo padrão de clique headless
- **Rede lenta não medida:** vagas reservadas por peça e salto da fileira ao carregar (TC-UI-001 passo 1,
  TC-CFR-002 passo 1, RNF-01 carregando) — o driver não atrasa resposta
- **TC-UI-002 contra I-06:** os passos 2 e 3 do caso esperam o formato "n / teto" e a recusa ao digitar, que a
  costura trocou (I-06); o caso precisa de revisão pelo planejamento (`ajusta o plano`)
- **D-04 (dívida conhecida):** com sessão de admin, a loja mostra peça despublicada — fora deste WI, não medido

## Fora da cobertura

- TC-FUNC-007 (P1) inteiro — limites 60/160/12 e Cancelar (orçamento do CH-01); só a recusa do título com 61 ao
  salvar foi vista, fora de TC, no CH-07
- TC-FUNC-008 (P0) passos 3–4 — bloqueio de produtos, RNF-02 — e a variação 1440 (orçamento do CH-02)
- TC-FUNC-019 (P1) — só os cartões de percentual sem peças valendo (orçamento do CH-05)
- TC-UI-002 (P2) — recusa ao salvar não provocada (massa só leitura do CH-08); foco de subir/descer
- TC-UI-001 passos 1 (rede lenta) e 3 (1440 × 900, fita com setas) — driver e orçamento
- TC-REG-001 passo 2 — a página de P-AGE vista pela visitante (slug não achado); a régua usou o preço cadastrado
- TC-SEC-001 variação "sair e reabrir a Home" — o "Sair" da loja não foi achado; duas abas logada × anônima
- TC-SEC-002 variações "recarregar a prévia" e "tela cheia"; peças de Natal nas fileiras (nenhuma está nelas)
- TC-FUNC-005 passos 3 (arrastar) e 5 (remover e escolher de novo); prévia em Computador
- Variações não feitas: TC-FUNC-001 (religar, loja 1440), TC-FUNC-010 (mover B-1), TC-FUNC-011 (voltar a campanha
  em vigência livre — não havia na massa), TC-FUNC-013 (recarregar a aba B), TC-FUNC-015 (Cancelar e reabrir),
  TC-FUNC-016 (republicar e ver P-FORA voltar), TC-FUNC-017 (sem rede), TC-FUNC-018 (`/ofertas`), TC-FUNC-020
  (ida e volta), TC-JOURNEY-001 e TC-JOURNEY-002 (1440)
- CFR: só teclado (ordem de Tab, foco visível, mover peça), movimento reduzido, 320 × 568, 768 × 1024 e 1440 no
  editor e na Home, leitor de tela real, Safari e Firefox
- Edge cases de rascunho: recarregar e voltar do browser com alteração não salva, colar título com aspas curvas
  e travessão, fechar a aba com remoção pendente
- Os cartões de 10 % no bloco da virada (C-VIR sem peças, como o charter a define)
- Personas: todas rodaram; usuário de tecnologia assistiva sem persona própria (só pelo CFR)
