```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-14T14:49:00Z",
  "branch": "feature/100",
  "duration_min": 19,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "exit 0, com env de placeholder na linha de comando (Re-Validation 3)"
    },
    {
      "name": "lint",
      "command": "npx eslint . (store, backoffice)",
      "status": "pass",
      "summary": "store 2/2 · backoffice 23/5, igual à baseline (Re-Validation 3)"
    },
    {
      "name": "test",
      "command": "pnpm --filter @estrelinha/<w> test --testTimeout=20000 (core, store, backoffice, mobile-adm, functions)",
      "status": "pass",
      "summary": "23621/23621 (soma da tabela da Re-Validation 3; backoffice remedida: 1 caso de AdminCampaignFormPage.test.tsx, do WI 102, falhou na 1ª volta e passou isolado e na suíte remedida)"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 18,
    "acceptance_covered": 8,
    "items": [
      { "criterion": "UC-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-02", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-03", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-02", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-03", "validated_by": { "tc_ref": "TC-JOURNEY-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-04", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-05", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-06", "validated_by": { "tc_ref": "TC-REG-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-07", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-08", "validated_by": { "tc_ref": "TC-PERSONA-001", "type": "manual" }, "status": "partial" },
      { "criterion": "CA-01", "validated_by": { "tc_ref": "TC-REG-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02", "validated_by": { "tc_ref": "TC-CFR-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-04", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-05", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-06", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-07", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "partial" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-SMOKE-001", "verdict": "pass" },
    { "tc_ref": "TC-SMOKE-002", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "skip" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-005", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-006", "verdict": "skip" },
    { "tc_ref": "TC-CFR-003", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-002", "verdict": "pass" },
    { "tc_ref": "TC-PERSONA-001", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "retest-BUG-005-computador.png", "path": "screenshots/retest-BUG-005-computador.png" },
    { "label": "retest-BUG-005-computador-vitrine.png", "path": "screenshots/retest-BUG-005-computador-vitrine.png" },
    { "label": "retest-BUG-005-computador-declaracao.png", "path": "screenshots/retest-BUG-005-computador-declaracao.png" },
    { "label": "retest-BUG-005-celular.png", "path": "screenshots/retest-BUG-005-celular.png" },
    { "label": "retest-BUG-005-padrao-nao-salvo.png", "path": "screenshots/retest-BUG-005-padrao-nao-salvo.png" },
    { "label": "retest-BUG-005-admin-home-previa.png", "path": "screenshots/retest-BUG-005-admin-home-previa.png" },
    { "label": "CH-07-01-previa-celular-bf-1440.png", "path": "screenshots/CH-07-01-previa-celular-bf-1440.png" },
    { "label": "CH-07-02-previa-computador-bf-1440.png", "path": "screenshots/CH-07-02-previa-computador-bf-1440.png" },
    { "label": "CH-06-01-sacola-1440-wt.png", "path": "screenshots/CH-06-01-sacola-1440-wt.png" },
    { "label": "CH-06-01-sacola-1440-ref.png", "path": "screenshots/CH-06-01-sacola-1440-ref.png" },
    { "label": "CH-06-02-sacola-390-wt.png", "path": "screenshots/CH-06-02-sacola-390-wt.png" },
    { "label": "CH-06-02-sacola-390-ref.png", "path": "screenshots/CH-06-02-sacola-390-ref.png" },
    { "label": "CH-06-03-checkout-390-wt.png", "path": "screenshots/CH-06-03-checkout-390-wt.png" },
    { "label": "CH-06-03-checkout-390-ref.png", "path": "screenshots/CH-06-03-checkout-390-ref.png" },
    { "label": "CH-06-04-checkout-1440-wt.png", "path": "screenshots/CH-06-04-checkout-1440-wt.png" },
    { "label": "CH-06-04-checkout-1440-ref.png", "path": "screenshots/CH-06-04-checkout-1440-ref.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 100 · Perfil de estilo da loja (Padrão e Black Friday), com a chave no painel

**Gate 3:** confirmado em 2026-11-14

## Resumo

**Veredito:** partial — nenhum bug aberto (o BUG-005 foi resolvido no reteste, e TC-REG-001 e TC-UI-001 passaram), mas
CH-01..CH-05 e CH-08 não rodaram nesta rodada, e três TC P0 (TC-FUNC-002, TC-JOURNEY-001, TC-PERSONA-001) seguem em
`skip` desde a rodada 1.

Esta é a rodada 3, de confirmação, sobre `41f85963` (fix T10, BUG-005). Ela fecha os dois TC que a rodada 2 deixou em
`fail` e `blocked`. A dona agora confere a loja antes de ligar. "Ver a loja com este perfil" abre a Home completa no
perfil marcado, com banners, vitrines, preços e a faixa de declaração, em "Computador" e em "Celular". São as mesmas
8 seções da Home publicada. Com o Padrão marcado sem salvar, a prévia mostra a mesma Home em ardósia. Isso se viu 4 de
4 no reteste e de novo no CH-07, com o console sem erro e a rede do iframe sem 4xx/5xx. O BUG-005 vai a `resolved`.

A cliente que volta encontra a loja de sempre. A sacola com a peça e o checkout, em 390 e 1440, têm os mesmos valores
computados da loja de antes do WI, contagens incluídas. Somando as três rodadas, nenhuma tela medida no Padrão difere
da referência (Home, menu, categoria, produto, 404, `/conta`, `/pedido/:id`, sacola vazia e com peça, checkout). O
TC-REG-001 (P0) passa, e com ele CA-01 e RN-06 ficam `covered`.

Nenhum bug novo. O único achado da rodada, "Adicionar à sacola" da barra fixa em 390 sem efeito, acontece igual na
loja de antes do WI. Não é regressão do WI 100 e vai a Sugestões de backlog. O veredito é `partial`, e não `pass`,
pela regra: charters que não rodaram nesta rodada e P0 sem veredito próprio. A volta ao Padrão conferida na loja
(J-02, TC-FUNC-002 e TC-JOURNEY-001) e a leitura completa da Bia (TC-PERSONA-001) nunca tiveram veredito. Se o humano
aceitar os vereditos herdados e esses `skip`, não há bug aberto que prenda o WI.

| TC                                   | Critérios        | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------ | ---------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 17 · fail 0 · blocked 0 · skip 7 | 8 de 18 cobertos | 0          | 0         | resolved 1 · still-open 0 · cannot-reproduce 0 · blocked 0 |

Nesta rodada as sessões conferiram TC-REG-001 (CH-06) e TC-UI-001 (CH-07), e o reteste conferiu o BUG-005. Os outros 22
vereditos vêm da rodada 2 (`qa-result-2026-11-14-r2.md`), que por sua vez herdou parte deles da rodada 1. Nenhum deles
foi refeito.

## Rodada

- **Ambiente:** loja http://localhost:8182 · painel http://localhost:8183/admin · loja de antes do WI (commit-base)
  http://localhost:8092 (CH-06). A `functions serve` é desta rodada, com chaves externas inválidas ("Registro da
  rodada 3" no test-plan)
- **Branch / build:** `feature/100` @ `41f85963` (fix T10, BUG-005), dev servers do worktree
- **Execução:** reteste 11:30 → 11:49 no relógio do shell (aproximado; UTC−3 assumido, 14:30 → 14:49 UTC) (19 min). Os
  logs de CH-06 e CH-07 não registram hora, e o `executed_at` e a duração são os do reteste
- **Browser:** Chromium (agent-browser 0.39.1) · **Viewports:** 390 × 844 e 1440 × 900. Na prévia, "Computador" é
  1024 × 768 a 60 % e "Celular" é 390 × 844 a 55 %
- **Personas e acesso:** PER-01 Adri → `admin-loja` (CH-07, reteste) · PER-04 Lúcia → `anonima` (CH-06; a sacola e o
  checkout não pedem login, e a `cliente-qa` não foi usada)
- **Massa:** S0 (chave ausente) no CH-06, só lido. S1 (Black Friday salvo) no CH-07 e no reteste, só lido. Nenhum Salvar
  foi clicado e nenhum dado fora de `appearance` foi ajustado. A thread devolve S0 (chave ausente) ao fim. O M1 `#0613`
  segue no banco local, sem uso nesta rodada

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — Re-Validation 3 PASS, de 2026-11-14 (HEAD `41f85963`)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo                                                                                                  |
| ----- | ------ | ------------------------------------------------------------------------------------------------------- |
| build | pass   | `pnpm build` exit 0 (env de placeholder na linha de comando)                                             |
| lint  | pass   | store 2/2 · backoffice 23/5, igual à baseline                                                            |
| test  | pass   | 23621/23621 nos cinco workspaces (backoffice remedida: 1 caso do WI 102 instável na 1ª volta, 0 falho)  |
| e2e   | skip   | sem rodada E2E                                                                                           |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| UC-01 | prd | TC-FUNC-001, TC-FUNC-003, TC-FUNC-008, TC-FUNC-013, TC-JOURNEY-001, TC-SMOKE-002 | pass, pass, pass, pass, skip, pass | partial |
| UC-02 | prd | TC-FUNC-002, TC-JOURNEY-001 | skip, skip | partial |
| UC-03 | prd | TC-FUNC-005, TC-UI-001 | skip, pass | partial |
| RN-01 | prd | TC-FUNC-001, TC-FUNC-009, TC-FUNC-010, TC-REG-001, TC-JOURNEY-002, TC-PERSONA-001, TC-UI-002 | pass, pass, pass, pass, pass, skip, pass | partial |
| RN-02 | prd | TC-FUNC-004 | skip | partial |
| RN-03 | prd | TC-CFR-002, TC-PERSONA-001, TC-JOURNEY-002 | pass, skip, pass | partial |
| RN-04 | prd | TC-FUNC-001, TC-FUNC-007, TC-FUNC-008, TC-CFR-001 | pass, pass, pass, pass | covered |
| RN-05 | prd | TC-FUNC-003 | pass | covered |
| RN-06 | prd | TC-FUNC-011, TC-REG-001, TC-UI-002 | pass, pass, pass | covered |
| RN-07 | prd | TC-FUNC-012 | pass | covered |
| RN-08 | prd | TC-PERSONA-001, TC-JOURNEY-002, TC-REG-001 | skip, pass, pass | partial |
| CA-01 | prd | TC-REG-001, TC-SMOKE-001 | pass, pass | covered |
| CA-02 | prd | TC-CFR-001 | pass | covered |
| CA-03 | prd | TC-FUNC-002, TC-JOURNEY-001 | skip, skip | partial |
| CA-04 | prd | TC-CFR-002 | pass | covered |
| CA-05 | prd | TC-FUNC-004 | skip | partial |
| CA-06 | prd | TC-FUNC-012 | pass | covered |
| CA-07 | prd | TC-FUNC-005, TC-FUNC-006 | skip, skip | partial |

CA-01 e RN-06 passaram a `covered` com o TC-REG-001. UC-03 segue `partial` só pelo TC-FUNC-005 em `skip`. O reteste do
BUG-005 viu o essencial dele (Padrão marcado sem salvar, a prévia em ardósia; "Fechar" sem mudar o card), mas isso não
é veredito de TC. UC-02, CA-03, RN-02, CA-05 e CA-07 seguem só com TC em `skip`, `partial` pelo mesmo motivo das
rodadas 1 e 2.

**Sem cobertura:** nada

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-06 | PER-04 Lúcia | Feature | done (confirmação: só a parte `blocked` do TC-REG-001, sacola com peça e checkout) | 18 de 35 | pass 1 · skip 1 | 1 (A-1, anterior ao WI) | — |
| CH-07 | PER-01 Adri | — (design-check) | done (confirmação: só o TC-UI-001; régua = log da rodada 2, MCP do Claude Design sem acesso) | 26 de 25 (+2 de encerramento) | pass 1 · skip 1 | 0 | — |
| Reteste | PER-01 Adri | — | done | — | — | 0 | resolved: BUG-005 |
| CH-01 | PER-01 Adri | Feature | not-run (confirmação: sem TC `fail`/`blocked` na rodada 2; vereditos herdados) | — | — | — | — |
| CH-02 | PER-01 Adri | Back-Button | not-run (confirmação: sem TC `fail`/`blocked` na rodada 2; vereditos herdados) | — | — | — | — |
| CH-03 | PER-03 Rodrigo | Interrupt | not-run (confirmação: TC pass na rodada 2) | — | — | — | — |
| CH-04 | PER-02 Bia | Feature | not-run (confirmação: TC pass/skip na rodada 2) | — | — | — | — |
| CH-05 | PER-01 Adri | Network | not-run (confirmação: TC pass na rodada 2) | — | — | — | — |
| CH-08 | PER-05 Marta | — (CFR) | not-run (confirmação: TC pass na rodada 1) | — | — | — | — |

## CFR

não rodou nesta rodada. O CH-08 tem os dois TC em `pass` desde a rodada 1, e o resultado de CFR daquela rodada vale
(`qa-result-2026-11-14-r1.md` › CFR). A fix T10 tocou a leitura da Home na prévia (`packages/core` `home/preview.ts`,
`apps/store`, `apps/backoffice`), não as cores nem a primeira pintura.

## Design-check

- **Protótipo:** Claude Design `4abe021d-d77e-4fe7-affd-524180315fa3`, `Painel - Campanhas, faixa e perfil.html` ›
  Configurações · perfil de estilo (modal da prévia). A fonte **não foi relida** nesta sessão, porque o MCP respondeu
  `needs_design_scopes`. A régua foi o log da rodada 2, que a leu pelo MCP
- **Status:** done (só o TC-UI-001, de confirmação)
- **Divergências:** nenhuma nova. A D1 da rodada 2 (a prévia sem os blocos da Home) não se reproduziu. Os resíduos
  `low` do card seguem nas Sugestões de backlog da rodada 2

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

nada

**Reabertos:** nada

## Lotes de correção sugeridos

nada — sem bug aberto ao fim da rodada.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-005 | [Prévia do perfil] A prévia mostra a Home sem banners, vitrine nem produtos — a dona | reteste | open → resolved | mantida (high) | `screenshots/retest-BUG-005-computador.png` · `screenshots/retest-BUG-005-computador-vitrine.png` · `screenshots/retest-BUG-005-celular.png` |

Texto sugerido para o Histórico, de 2026-11-14, rodada 3 (confirmação):

- BUG-005: resolved — reteste sobre `feature/100` @ `41f85963` (fix T10). A prévia carrega
  `http://localhost:8182/?preview=1&home=publicada` e mostra a Home completa entre o cabeçalho e o rodapé: banners,
  faixa de vantagens, categorias, coleções, as vitrines com produtos e preços e a faixa de declaração. São as mesmas
  8 seções da Home publicada, em Black Friday. Visto em "Computador" (2 tentativas, a 2ª após recarregar o painel), em
  "Celular" e de volta em "Computador", 4 de 4. Padrão marcado sem salvar: a mesma Home em ardósia. Console sem erro,
  rede do iframe sem 4xx/5xx (`home_sections` → 200). Confirmado também pelo CH-07 (rodada 3), passos 02–03.
  Evidência: `screenshots/retest-BUG-005-computador.png`, `screenshots/retest-BUG-005-celular.png`,
  `screenshots/CH-07-02-previa-computador-bf-1440.png`

**Reteste `blocked`:** nada

## Achados que não viraram bug

- CH-06 A-1 — "Adicionar à sacola" da barra fixa do produto em 390 não põe a peça na sacola, sem aviso (1 vez no
  worktree e 1 na loja de antes nesta rodada, 4 na rodada 2, nas duas lojas). **Anterior ao WI 100**: a loja de antes
  (`:8092`, commit-base) faz igual, então não é regressão. Na confirmação, só regressão ou achado novo `critical`/`high`
  vira bug, e este já aparecia nas rodadas 1 e 2. Foi para Sugestões de backlog (pré-existente). A sessão propôs
  `high`. Para quem compra pelo celular, o impacto pode ser de bloqueio, e isso vai a Riscos residuais
- CH-06, debrief — depois de "Fechar aviso de cookies" (sem aceitar), a preferência gravada no browser ficou com
  estatísticas ligadas. Fora da superfície do WI 100 (o aviso de cookies não muda com o perfil), não investigado e não
  comparado com a loja de antes. Foi para Sugestões de backlog (pré-existente)
- CH-06, passo 06 — o e-mail incompleto no checkout não mostra erro ao sair do campo, igual nas duas lojas.
  **spec-gap**, pré-existente, já nas Sugestões de backlog de `qa-result-2026-11-14-r1.md` ("O checkout diz o que
  corrigir no e-mail de contato"). Não foi repetido

## Perguntas ao produto

nada

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Em 390 × 844, "Adicionar à sacola" da barra fixa do produto não põe a peça na sacola, sem aviso; a gaveta abre vazia. Em 1440, o botão do bloco principal funciona. É igual na loja de antes do WI 100 (6 reproduções nas rodadas 2 e 3, duas peças) | loja · produto, barra fixa no celular | pré-existente | A cliente põe a peça na sacola pela barra fixa do produto no celular |
| Depois de "Fechar aviso de cookies", sem aceitar, a preferência gravada no browser fica com estatísticas ligadas (não investigado; não comparado com a loja de antes) | loja · aviso de cookies | pré-existente | Fechar o aviso de cookies não liga as estatísticas sem consentimento |

## Riscos residuais

- **Três casos P0 sem execução desde a rodada 1** (TC-FUNC-002, TC-JOURNEY-001, TC-PERSONA-001), sem bug ligado: o veredito `partial` foi confirmado no Gate 3 (rodada 3) com eles em `skip`. Fica para o humano decidir na integração se pede uma rodada extra só para eles.
- **"Adicionar à sacola" pela barra fixa em 390** (CH-06 A-1; rodada 2, CH-06 passo 03; rodada 1, CH-04 A-2 e CH-08
  passo 06). O que a rodada 2 chamou de "sem evidência clara" agora tem 6 reproduções, nas duas lojas, num ambiente
  sem outra sessão servindo as functions. Se for real fora do local, a cliente no celular não consegue comprar pela
  página do produto. É anterior ao WI 100, e a prioridade do Work Item novo é do humano
- **O aviso de cookies** (CH-06, debrief): se "Fechar" grava estatísticas ligadas, é consentimento que a cliente não
  deu. Não investigado
- **P0 sem veredito em três rodadas:** a volta ao Padrão conferida na loja (J-02 · TC-FUNC-002, TC-JOURNEY-001) só foi
  vista no card e numa aba nova. A leitura completa da Bia em 1440 e na gaveta de material (TC-PERSONA-001) não foi
  feita. O pass do WI depende de o humano aceitar esses `skip`
- **As prévias da faixa e do menu** seguem com a Home vazia, segundo a Validation (`qa-report.md` › Re-Validation 3,
  "Fora de escopo, registrado"): é o mesmo sintoma do BUG-005 noutras telas do painel (`AnnouncementLivePreview`,
  `MenuLivePreview`). Nenhuma sessão desta skill as abriu
- **O foco ao fechar a prévia com Esc** (rodada 1, CH-02 A-1, 1 de 1) e o percurso só-teclado (TC-CFR-003) seguem sem
  segunda leitura

## Fora da cobertura

- CH-01, CH-02, CH-03, CH-04, CH-05 e CH-08 não rodaram nesta rodada (confirmação). TC-FUNC-002, TC-JOURNEY-001,
  TC-PERSONA-001 (P0), TC-FUNC-004, TC-FUNC-005, TC-FUNC-006 (P1) e TC-CFR-003 (P2) seguem em `skip`, como nas rodadas 1
  e 2
- PER-02 Bia, PER-03 Rodrigo e PER-05 Marta sem sessão nesta rodada
- CH-06: a borda de erro (`field`) no checkout, porque sair do campo não mostra erro nas duas lojas e enviar o
  formulário não é permitido; a barra do frete grátis com valor perto do limite; a causa do A-1 (caixa-preta)
- CH-07: a fonte de design não foi relida (MCP do Claude Design sem permissão; régua = log da rodada 2); os valores do
  card não foram medidos de novo; o card em 1024 e em 390 × 844; o TC-UI-002 (a Home avulsa) não foi refeito
- Outros engines (Safari, Firefox, aparelhos reais), leitor de tela real, a função `api/page` e o cache de borda real
  da Vercel: fora do ambiente local
