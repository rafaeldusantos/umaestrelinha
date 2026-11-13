```json
{
  "schema": "qa-result/v1",
  "verdict": "partial",
  "executed_at": "2026-11-13",
  "branch": "feature/101",
  "duration_min": 0,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "Validation 2: verde, 3 de 3, com as variáveis locais só na linha de comando"
    },
    {
      "name": "lint",
      "command": "—",
      "status": "pass",
      "summary": "Validation 2: store 2/2 e backoffice 23/5, iguais à baseline"
    },
    {
      "name": "test",
      "command": "um workspace por vez, --testTimeout=20000",
      "status": "pass",
      "summary": "22793/22793 (core 5838, store 7262, backoffice 5295, functions 1669, mobile-adm 2729)"
    },
    {
      "name": "e2e",
      "command": "—",
      "status": "skip",
      "summary": "sem rodada E2E"
    }
  ],
  "coverage": {
    "acceptance_total": 19,
    "acceptance_covered": 10,
    "items": [
      { "criterion": "UC-01", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-02", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-03", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "partial" },
      { "criterion": "UC-04", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-01", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-02", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-03", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-04", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "RN-05", "validated_by": { "tc_ref": "TC-CFR-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "RN-06", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "partial" },
      { "criterion": "RN-07", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-01", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-02", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03", "validated_by": { "tc_ref": "TC-FUNC-015", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-05", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-06", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-07", "validated_by": { "tc_ref": "TC-UI-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-08", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "covered" }
    ],
    "missing": []
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-009", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-010", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-011", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-012", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-013", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-014", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-015", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-016", "verdict": "pass" },
    { "tc_ref": "TC-JOURNEY-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-001", "verdict": "pass" },
    { "tc_ref": "TC-UI-002", "verdict": "pass" },
    { "tc_ref": "TC-UI-003", "verdict": "skip" },
    { "tc_ref": "TC-UI-004", "verdict": "skip" },
    { "tc_ref": "TC-UI-005", "verdict": "skip" },
    { "tc_ref": "TC-CFR-001", "verdict": "pass" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" },
    { "tc_ref": "TC-CFR-004", "verdict": "pass" },
    { "tc_ref": "TC-REG-001", "verdict": "skip" }
  ],
  "evidence": [
    { "label": "retest-BUG-001.png", "path": "screenshots/retest-BUG-001.png" },
    { "label": "retest-BUG-001-tentativa-2.png", "path": "screenshots/retest-BUG-001-tentativa-2.png" },
    { "label": "retest-BUG-001-duas-artes.png", "path": "screenshots/retest-BUG-001-duas-artes.png" },
    { "label": "retest-BUG-001-texto-um-motivo.png", "path": "screenshots/retest-BUG-001-texto-um-motivo.png" },
    { "label": "retest-BUG-002.png", "path": "screenshots/retest-BUG-002.png" },
    { "label": "retest-BUG-002-preview-home-0.png", "path": "screenshots/retest-BUG-002-preview-home-0.png" },
    { "label": "retest-BUG-002-dev-busca.png", "path": "screenshots/retest-BUG-002-dev-busca.png" },
    { "label": "retest-BUG-002-dev-c1-produto-1440.png", "path": "screenshots/retest-BUG-002-dev-c1-produto-1440.png" },
    { "label": "CH-01-r2-07-imagem-dois-motivos.png", "path": "screenshots/CH-01-r2-07-imagem-dois-motivos.png" },
    { "label": "CH-01-r2-05-cinco-de-cinco.png", "path": "screenshots/CH-01-r2-05-cinco-de-cinco.png" },
    { "label": "CH-02-r2c-01-adicionar-8082.png", "path": "screenshots/CH-02-r2c-01-adicionar-8082.png" },
    { "label": "CH-02-r2c-02-sacola-8092.png", "path": "screenshots/CH-02-r2c-02-sacola-8092.png" },
    { "label": "CH-02-r2c2-01-sacola-vazia-pingente-menina.png", "path": "screenshots/CH-02-r2c2-01-sacola-vazia-pingente-menina.png" },
    { "label": "CH-05-r2-01-ligada-0-troca-rota.png", "path": "screenshots/CH-05-r2-01-ligada-0-troca-rota.png" },
    { "label": "CH-05-r2-03-desligada-1-carga.png", "path": "screenshots/CH-05-r2-03-desligada-1-carga.png" },
    { "label": "CH-05-r2-04-desligada-1-troca-rota.png", "path": "screenshots/CH-05-r2-04-desligada-1-troca-rota.png" },
    { "label": "CH-05-r2-06-8082-desligada-sem-atributo.png", "path": "screenshots/CH-05-r2-06-8082-desligada-sem-atributo.png" },
    { "label": "CH-05-r2-08-loja-religada-a1.png", "path": "screenshots/CH-05-r2-08-loja-religada-a1.png" },
    { "label": "CH-07-r2-01-reduzido-1440-20s.png", "path": "screenshots/CH-07-r2-01-reduzido-1440-20s.png" },
    { "label": "CH-07-r2-06-reduzido-390-20s.png", "path": "screenshots/CH-07-r2-06-reduzido-390-20s.png" },
    { "label": "CH-07-r2-08-fonte200-390-1.png", "path": "screenshots/CH-07-r2-08-fonte200-390-1.png" },
    { "label": "CH-07-r2-09-zoom200-1440.png", "path": "screenshots/CH-07-r2-09-zoom200-1440.png" },
    { "label": "CH-07-r2-10-zoom200-1440-reduzido-sem-setas.png", "path": "screenshots/CH-07-r2-10-zoom200-1440-reduzido-sem-setas.png" }
  ],
  "issues": {
    "total": 0,
    "by_severity": { "critical": 0, "high": 0, "medium": 0, "low": 0 }
  }
}
```

# Resultado de QA — 101 · Faixa de avisos no topo da loja (textos ou imagens que se alternam)

**Gate 3:** confirmado em 2026-11-13

## Resumo

**Veredito:** partial. Nenhum bug fica aberto e os dois da rodada 1 foram resolvidos, mas o TC-FUNC-011 (P0) ficou
`blocked` e o CH-06 (design-check) não rodou.

Esta é a rodada de confirmação: ela fecha o que a rodada 1 abriu. O reteste resolveu os dois bugs `high`. No painel,
a Adri vê juntas as pendências do aviso de imagem (BUG-001). Na loja, a faixa ligada aparece a partir da primeira
troca de rota, mesmo quando a página de entrada veio marcada "sem faixa" (BUG-002). Isso foi visto no build servido e
no dev, pelo mesmo caminho do bug. Parte das lacunas da rodada 1 também fechou. Desligar a faixa devolve a loja sem
vão nem vaga, e religar devolve os quatro avisos (TC-FUNC-009). O caso simétrico do BUG-002 também foi testado: com a
faixa desligada e a página marcada "com faixa", a vaga some na primeira troca de rota (TC-FUNC-010). Com movimento
reduzido, a faixa não gira em 1440 nem em 390 (TC-CFR-003). Com a fonte a 130 % e a 200 % no celular, os links ficam
inteiros e alcançáveis (TC-CFR-004). A reordenação da lista confere na prévia (TC-FUNC-005). O Tab que pulou o link
uma vez na rodada 1 não se repetiu em 6 tentativas.

Uma coisa ficou sem prova: a faixa ausente no checkout alcançado pela sacola (passo 2 do TC-FUNC-011, P0). Em três
sessões e quatro peças, inclusive peças com estoque e sem opção, "Adicionar à sacola" não pôs nada na sacola. Isso
não é regressão deste Work Item: o diff não toca arquivo de sacola, checkout, produto nem aviso (conferido por `git diff --name-only master...HEAD`), e o master (:8092) também não deu
retorno ao toque. Também não está provado que seja defeito do produto, e não do ambiente local (rotas abortadas,
headless, console e rede não lidos). Por isso o TC fica `blocked`, e não vira bug. O ponto vai a Riscos com o próximo
passo.

| TC                                     | Critérios         | Bugs novos | Reabertos | Reteste                                                    |
| -------------------------------------- | ----------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 20 · fail 0 · blocked 1 · skip 6  | 10 de 19 cobertos (9 parciais, 0 sem cobertura) | 0 | 0 | resolved 2 · still-open 0 · cannot-reproduce 0 · blocked 0 |

A contagem de TC é acumulada. O que esta rodada não conferiu mantém o veredito da rodada 1 (ver
`qa-result-2026-11-13-r1.md`). Só nesta rodada: pass 6 (TC-FUNC-002, 005, 009, 010, TC-CFR-003 e 004), blocked 1
(TC-FUNC-011), skip 1 (TC-UI-003).

## Rodada

- **Ambiente:** loja http://localhost:8082 (dev) · build servido http://localhost:4173 (`vite preview`, CH-05,
  CH-07 e o reteste do BUG-002) · painel http://localhost:8083/admin · referência master http://localhost:8092 (só
  leitura) · Supabase local (API 54441)
- **Branch / build:** `feature/101` no worktree `store__feature-101`, HEAD `f649a843` (T05 `0d547f0d` e T06
  `f649a843`). O build não é exposto na tela
- **Execução:** rodada 2 (confirmação), 2026-11-13. O reteste foi das 15:18 às 15:25. O início e o fim da Fase 2
  não foram informados, então `duration_min` ficou sem medida
- **Browser:** Chromium headless, pelo agent-browser 0.39.1 (CH-01, CH-02 e o reteste do BUG-001) e pelo
  playwright-cli 0.1.24 (CH-05, CH-07 e o reteste do BUG-002) · **Viewports:** 390 × 844, 1440 × 900 e 720 × 450
  (zoom de 200 % simulado)
- **Personas e acesso:** PER-01 → `admin-loja` (`QA_ADMIN_LOJA_*`) · PER-02, PER-03 → `anonima`
- **Paridade:** `*.supabase.co` e `**/g/collect*` foram abortados por rota em todas as sessões. O documento marcado
  (`data-faixa`) foi servido por `context.route` + `route.fulfill`, só para o documento, com `local-network-access`
  (Q-02). Não há cache da Vercel. A fonte do sistema foi simulada pela raiz e o zoom, pelo viewport

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md`, Validation 2, PASS, de 2026-11-13
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build`, verde 3 de 3 (as variáveis locais só na linha de comando) |
| lint  | pass   | store 2/2 e backoffice 23/5, iguais à baseline |
| test  | pass   | 22793/22793 nos cinco workspaces |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte | TC | Veredito | Status |
| -------- | ----- | -- | -------- | ------ |
| UC-01 | prd | TC-FUNC-011, 012, 013, 014, 016, TC-JOURNEY-001, TC-UI-001, TC-UI-002, TC-CFR-003, TC-FUNC-008 | TC-FUNC-011 blocked · TC-FUNC-008 skip · os demais pass | partial |
| UC-02 | prd | TC-FUNC-002, TC-FUNC-015, TC-UI-004 | pass (r2) · pass · skip | partial |
| UC-03 | prd | TC-FUNC-001 a 008, TC-UI-005 | 001, 002, 003, 005, 006, 007 pass · 004, 008 e TC-UI-005 skip | partial |
| UC-04 | prd | TC-FUNC-009, TC-UI-003 | pass (r2) · skip | partial |
| RN-01 | prd | TC-FUNC-011 | blocked (os passos 1 e 3 conferem; o checkout pela sacola não foi alcançado) | partial |
| RN-02 | prd | TC-CFR-001, TC-FUNC-010 | pass · pass (r2) | covered |
| RN-03 | prd | TC-FUNC-007 | pass | covered |
| RN-04 | prd | TC-CFR-002 | pass | covered |
| RN-05 | prd | TC-CFR-003 | pass (r2) | covered |
| RN-06 | prd | TC-FUNC-012, TC-REG-001 | pass · skip | partial |
| RN-07 | prd | TC-UI-001, TC-CFR-004 | pass · pass (r2) | covered |
| CA-01 | prd | TC-FUNC-011, TC-JOURNEY-001, TC-FUNC-001 | blocked · pass · pass | partial |
| CA-02 | prd | TC-FUNC-012, TC-FUNC-016, TC-CFR-003 | pass · pass · pass (r2) | covered |
| CA-03 | prd | TC-FUNC-015 | pass | covered |
| CA-04 | prd | TC-FUNC-003, TC-FUNC-004, TC-FUNC-013 | pass · skip · pass | partial |
| CA-05 | prd | TC-UI-003, TC-FUNC-009 | skip (só o estrutural: nada acima do `<header>`, y = 0) · pass (r2) | partial |
| CA-06 | prd | TC-CFR-001 | pass (r1, uma medida por condição) | covered |
| CA-07 | prd | TC-UI-001, TC-UI-002, TC-FUNC-016, TC-CFR-004 | pass · pass · pass · pass (r2) | covered |
| CA-08 | prd | TC-FUNC-010, TC-FUNC-007 | pass (r2) · pass | covered |

**Sem cobertura:** nada. Nenhum critério ficou sem TC executado. Os parciais têm o motivo em Fora da cobertura.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-01 | PER-01 Adri | — (confirmação) | done | 30 de 25 | pass 2 | 0 | — |
| CH-02 | PER-02 Bia | — (confirmação) | done (TC-FUNC-011 blocked: a sacola não recebeu a peça) | 31 de 25 | blocked 1 | 1 | — |
| CH-02 (continuação) | PER-02 Bia | — | done (TC-FUNC-011 blocked) | 21 de 20 | blocked 1 | 1 (o mesmo) | — |
| CH-02 (continuação 2) | PER-02 Bia | — | blocked (massa: nenhuma peça entra na sacola) | 22 de 20 | blocked 1 | 1 (o mesmo) | — |
| CH-03 | PER-04 Rodrigo | — | not-run (os TC conferidos passaram na r1; a confirmação não o redespacha) | — | — | — | — |
| CH-04 | PER-01 Adri | — | not-run (não redespachado na confirmação; TC-FUNC-004 e 008 seguem skip da r1) | — | — | — | — |
| CH-05 | PER-01 Adri | — (confirmação) | done | 52 de 30 | pass 2 · skip 1 | 0 | — |
| CH-06 | PER-01 Adri | — | not-run (design: o MCP do Claude Design segue sem escopo, precisa de `/design-login`) | 0 de 50 | skip 2 | 0 | — |
| CH-07 | PER-03 Marta | — | done | 15 de 18 | pass 2 | 1 | — |
| Reteste | PER-01 Adri · PER-02 Bia | — | done | — | — | 1 (N-1) | BUG-001, BUG-002 resolved |

O veredito do TC-CFR-004 é `pass`, não o `fail` da sessão. A sessão marcou `fail` por uma variação (zoom de 200 % em
1440). O observado ali é o que a costura pede (ver Achados que não viraram bug). Os passos 1 e 2 do TC cumprem as
metas da faixa.

## CFR

| Categoria | Jornadas | Resultado | Bugs |
| --------- | -------- | --------- | ---- |
| Acessibilidade | J-04 | ok. Com movimento reduzido, nenhuma troca em 20 s (1440 e 390), e a seta troca na hora. Ligar a redução com a página aberta para o giro. O Tab vai seta → link → seta nas 6 tentativas, inclusive no instante da troca. Abaixo de 768 px (390, ou zoom de 200 % em 1440), sem setas e com redução, só o A1 é alcançável: é conforme a costura e vai a Sugestões de backlog | — |
| Responsividade | J-04, J-02 | ok na faixa. Com a raiz a 130 %, 68 px; a 200 %, 104 px, com 3 linhas no A1 e no A2, nada cortado e o cabeçalho sem cobrir a faixa (Q-01). A 200 % o produto rola para o lado (scrollWidth 435), por um bloco do cabeçalho e pelo "Compartilhar", fora da faixa: é pré-existente e vai a Sugestões de backlog. No zoom de 200 % em 1440, não há rolagem lateral | — |
| Performance percebida | J-02 | não refeita na confirmação (ok na r1, TC-CFR-001). Nas trocas de rota do CH-05, nenhuma entrada nova de `layout-shift` | — |
| Segurança visível | J-01 | não refeita na confirmação (ok na r1) | — |

## Design-check

- **Protótipo:** Claude Design, projeto `4abe021d-…`, arquivos `Black Friday - Home.html` e `Painel - Campanhas,
  faixa e perfil.html`
- **Status:** not-run (o MCP do Claude Design segue sem os escopos `user:design:*`; é preciso rodar `/design-login`
  e repetir o CH-06)
- **Divergências:** nenhuma conferida

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 0 · Dano à confiança 0 · Fricção 0 · Cosmético 0
Por severidade: critical 0 · high 0 · medium 0 · low 0

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |

nada. Na confirmação, vira bug só o que regrediu ou o achado novo `critical` ou `high`, e nenhum achado da rodada é
uma coisa nem outra.

**Reabertos:** nada

## Lotes de correção sugeridos

nada. Nenhum bug fica aberto ao fim da rodada.

## Transições propostas

| Bug | Título (do arquivo, letra por letra) | Origem | De → para | Severidade | Evidência |
| --- | ------------------------------------ | ------ | --------- | ---------- | --------- |
| BUG-001 | [Aviso de imagem] Falta do texto alternativo só aparece depois das duas artes — a dona | reteste (e CH-01, TC-FUNC-002 pass) | open → resolved | mantida (high) | `screenshots/retest-BUG-001.png`, `screenshots/retest-BUG-001-tentativa-2.png`, `screenshots/retest-BUG-001-duas-artes.png`, `screenshots/CH-01-r2-07-imagem-dois-motivos.png` |
| BUG-002 | [Faixa da loja] Ligada, não aparece ao navegar a partir de página servida sem ela — a cliente | reteste (e CH-05, passo 01) | open → resolved | mantida (high) | `screenshots/retest-BUG-002.png`, `screenshots/retest-BUG-002-preview-home-0.png`, `screenshots/retest-BUG-002-dev-busca.png`, `screenshots/retest-BUG-002-dev-c1-produto-1440.png`, `screenshots/CH-05-r2-01-ligada-0-troca-rota.png` |

Texto para o **Histórico**:

- **BUG-001:** "Rodada 2 (confirmação), 2026-11-13: open → resolved. Depois da T06 (`f649a843`), com só a arte do
  computador enviada e o alternativo vazio, o painel mostra juntos 'envie a arte do celular' e 'Descreva a arte…', com
  o Salvar desabilitado. Visto 2 de 2 no reteste e 1 vez no CH-01. Evidência: `screenshots/retest-BUG-001.png`,
  `screenshots/retest-BUG-001-tentativa-2.png`."
- **BUG-002:** "Rodada 2 (confirmação), 2026-11-13: open → resolved. Da página de entrada marcada `\"0\"`, a faixa
  aparece a partir da primeira troca de rota e continua nas páginas seguintes. Visto 5 de 5 no reteste (:4173 e
  :8082, inclusive o caminho exato do bug) e 1 vez no CH-05. A T05 não mudou código de produção, e a causa provável
  da rodada 1 é o método de interceptação. Evidência: `screenshots/retest-BUG-002-dev-busca.png`."

Nota para o Gate 3: como a T05 não alterou o produto, o humano pode preferir fechar o BUG-002 como
`cannot-reproduce`. A proposta segue o veredito do retester, `resolved`, porque o esperado foi visto mais de duas
vezes, com o entorno funcionando.

**Reteste `blocked`:** nada

## Achados que não viraram bug

- CH-02 A-1 (as três sessões; 6 de 6 toques em 4 peças, inclusive com estoque e sem opção): "Adicionar à sacola" não
  dá retorno e a sacola abre vazia. **Não é regressão.** O passo 2 do TC-FUNC-011 nunca passou (foi skip na r1). O
  diff do WI na loja acrescenta a faixa ao `StoreLayout` e mexe em `shared/lib/useScrollDirection.ts`,
  `shared/lib/storeChrome.ts`, `server/page.ts` e `scripts/shell.mjs`; nenhum deles é de sacola, produto ou aviso. No master (:8092), o toque
  também não deu retorno. **Não é defeito provado do produto.** A causa pode estar no ambiente (as rotas abortadas
  `*.supabase.co`, o headless), e o console e a rede não foram lidos depois do toque. Vai como pendência de ambiente
  ou de massa: TC-FUNC-011 `blocked`, com o próximo passo em Riscos residuais
- CH-07 A-1: no zoom de 200 % em 1440 (720 px), a faixa fica sem setas, e com movimento reduzido só o A1 é
  alcançável. É `conforme a fonte`: a costura diz "Setas: … visíveis a partir de 768 px" (spec › Design › A faixa na
  loja), e 720 está abaixo disso. É o mesmo comportamento que o TC-CFR-003 espera em 390. A variação do TC-CFR-004
  ("setas alcançáveis" a 720) contradiz a costura e pede ajuste do plano (`wi-qa-planner` em `revisar`). O que isso
  custa à Marta (com redução, abaixo de 768, os avisos 2 a 4 ficam inalcançáveis) é `spec-gap` e vai a Sugestões de
  backlog. Não é regressão: o TC-CFR-004 foi skip na r1
- CH-07: com a raiz a 200 % em 390, o produto rola para o lado (scrollWidth 435), por um bloco do cabeçalho (right
  392) e pelo botão "Compartilhar" (right 423). A faixa termina em 390. É pré-existente e fora da superfície da
  mudança (o charter põe o resto da página como pré-existente). Abaixo de `high`, vai a Sugestões de backlog
- Reteste N-1: no aviso de texto, as recusas aparecem uma de cada vez (primeiro "escreva o trecho em destaque ou o
  texto…", e só depois "Sem destino, o rótulo do link não aparece."). É achado novo `low` na confirmação e
  decisão registrada (implement-log › T06: "O aviso de texto continua com um motivo só"). Não é regressão: o
  TC-FUNC-004 foi skip na r1. O Salvar fica desabilitado e nada errado é gravado. Vai a Sugestões de backlog
  (polimento)
- CH-07 (risco da r1): o Tab pulando o link do aviso em 1440 não se repetiu (0 de 6 nesta rodada; 1 de 8 no total).
  É `intermitente sem segunda ocorrência` e sai dos riscos
- CH-01, passo 03: logo depois de "Subir o aviso 2", um snapshot ainda trazia o A2 na prévia, e o seguinte já trazia
  o A1. É a prévia atualizando, e a sessão não registrou como achado
- CH-05, passo 05: depois do voltar, o `<header>` ficou em y = −64. É o cabeçalho recolhido pela rolagem restaurada,
  não a faixa; a sessão não registrou como achado

## Perguntas ao produto

nada. Na rodada de confirmação, todo `spec-gap` vai a Sugestões de backlog.

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| Abaixo de 768 px (celular, ou zoom de 200 % no computador), com movimento reduzido, só o primeiro aviso é alcançável; sem redução, o aviso gira sem seta para voltar | loja › todas as páginas com faixa · faixa de avisos da loja | mudança (rodada de confirmação: vai a backlog, sem pergunta) | Faixa: alcançar todos os avisos sem setas, com movimento reduzido |
| No aviso de texto, as recusas aparecem uma de cada vez (o motivo do destino só depois do trecho), ao contrário do aviso de imagem | painel › Faixa de avisos · aviso de texto | polimento | Painel: o aviso de texto mostra todas as recusas de uma vez |
| Com a fonte do sistema a 200 % no celular, a página de produto rola para o lado, por um bloco do cabeçalho e pelo "Compartilhar" | loja › produto · cabeçalho e botão "Compartilhar" | pré-existente | Loja: produto sem rolagem lateral com a fonte a 200 % no celular |

As sugestões da rodada 1 continuam em `qa-result-2026-11-13-r1.md` e não se repetem aqui.

## Riscos residuais

- **A sacola (TC-FUNC-011, P0):** em três sessões, nenhuma peça entrou na sacola no :8082, e o master também não deu
  retorno. Se isso acontecer fora deste ambiente, é defeito anterior ao WI do nível Bloqueia a conclusão (ninguém
  compra pelo celular) e merece um Work Item ou hotfix próprio, fora do 101. O próximo passo é ler a sacola do :8092
  depois do toque, ler o console e a rede logo depois de "Adicionar à sacola", nos dois servidores, e repetir sem as
  rotas de aborto, num browser comum, se o ambiente permitir. Até lá, a faixa ausente no checkout pela sacola não
  está provada no navegador. Há a prova estrutural da Validation (`StoreLayoutFaixa.test.tsx`, RN-01)
- **O BUG-002 foi resolvido sem mudança no produto.** A hipótese é que o método de interceptação da r1 falhou. No
  ambiente real, a regra H-03 só se prova num preview da Vercel, com o cache
- **O zoom de 200 % foi simulado pelo viewport** (720 × 450, sem `deviceScaleFactor` 2), não pelo Ctrl + do navegador
- **A medida local não representa a produção:** sem a função na Vercel, sem cache (`HIT`) e sem o prazo real de
  5 min e 1 h (CA-08). O CLS (CA-06) é a medida única por condição da r1

## Fora da cobertura

- CH-06 (design-check) not-run: TC-UI-004 e TC-UI-005 sem veredito. O MCP do Claude Design segue sem escopo, e é
  preciso rodar `/design-login`
- TC-FUNC-011 (P0): o passo 2 (checkout pela sacola, sem faixa) e a variação "voltar do checkout" ficaram blocked,
  porque a sacola não recebe a peça. As variações 404, `/pagar-com-cartao` e `/politica-de-privacidade` não foram
  conferidas por orçamento (não dependem da sacola). Também ficaram sem conferir 1440 × 900, o console e a rede
  depois do toque, e o teste sem as rotas de aborto
- TC-UI-003 (a captura comparada com o :8092, Home e categoria, em 390 e 1440): orçamento do CH-05. Só o estrutural
  em 390 foi conferido
- TC-FUNC-009: o passo 3 (produto e rolagem com a faixa desligada) e a variação "lista vazia com o interruptor
  ligado": orçamento
- TC-FUNC-010: o passo 5 (`"1"` com a faixa ligada), a variação `/checkout` com `"1"`, o caso simétrico no :8082 e
  uma terceira página depois da troca: orçamento
- TC-FUNC-005: reordenar arrastando e pelo teclado, e a ordem salva vista na loja (a sessão não grava)
- TC-FUNC-002: os passos 3 e 4 não foram refeitos (passaram na r1)
- TC-FUNC-004, TC-FUNC-008 e TC-REG-001: seguem skip da r1. O CH-03 e o CH-04 não foram redespachados na confirmação
- TC-CFR-003, passo 4: as screenshots a cada 50 ms foram substituídas por valores computados a cada ~40 ms
- TC-CFR-004: as setas ≥ 44 px a 200 % em 1440 não são mensuráveis (abaixo de 768, não há setas, conforme a costura)
- Tema escuro, Safari, Firefox, Safari iOS, Chrome Android e leitor de tela real
- Contraste no segundo perfil de estilo (o WI 100 não existe ainda)
