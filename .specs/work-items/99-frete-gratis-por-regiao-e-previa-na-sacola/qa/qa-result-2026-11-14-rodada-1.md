```json
{
  "schema": "qa-result/v1",
  "verdict": "fail",
  "executed_at": "2026-11-14T09:17:00-03:00",
  "branch": "feature/99",
  "duration_min": 55,
  "gates": [
    {
      "name": "build",
      "command": "pnpm build",
      "status": "pass",
      "summary": "3/3 tarefas OK com as VITE_* do Supabase local na env"
    },
    {
      "name": "lint",
      "command": "npx eslint . (em cada app)",
      "status": "pass",
      "summary": "store 2/2 · backoffice 23/5 · mobile-adm 0/0 — igual à baseline"
    },
    {
      "name": "test",
      "command": "vitest por workspace (core, functions, store, backoffice, mobile-adm), --testTimeout=20000; store com --maxWorkers=2",
      "status": "pass",
      "summary": "23569/23569"
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
    "acceptance_covered": 18,
    "items": [
      { "criterion": "CA-01", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-02", "validated_by": { "tc_ref": "TC-FUNC-001", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-03", "validated_by": { "tc_ref": "TC-FUNC-002", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-04", "validated_by": { "tc_ref": "TC-FUNC-003", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-05", "validated_by": { "tc_ref": "TC-FUNC-004", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-06", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-07", "validated_by": { "tc_ref": "TC-FUNC-011", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-08", "validated_by": { "tc_ref": "TC-CFR-001", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-09", "validated_by": { "tc_ref": "TC-FUNC-007", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-10", "validated_by": { "tc_ref": "TC-FUNC-009", "type": "e2e" }, "status": "missing" },
      { "criterion": "CA-11", "validated_by": { "tc_ref": "TC-FUNC-010", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-12", "validated_by": { "tc_ref": "TC-FUNC-017", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-13", "validated_by": { "tc_ref": "TC-CFR-002", "type": "manual" }, "status": "covered" },
      { "criterion": "CA-14", "validated_by": { "tc_ref": "TC-FUNC-005", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-15", "validated_by": { "tc_ref": "TC-FUNC-012", "type": "e2e" }, "status": "covered" },
      { "criterion": "CA-16", "validated_by": { "tc_ref": "TC-FUNC-006", "type": "e2e" }, "status": "partial" },
      { "criterion": "CA-17", "validated_by": { "tc_ref": "TC-FUNC-013", "type": "e2e" }, "status": "covered" },
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
    "missing": ["CA-10"]
  },
  "test_cases": [
    { "tc_ref": "TC-FUNC-001", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-002", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-003", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-004", "verdict": "skip" },
    { "tc_ref": "TC-FUNC-005", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-006", "verdict": "blocked" },
    { "tc_ref": "TC-FUNC-007", "verdict": "pass" },
    { "tc_ref": "TC-FUNC-008", "verdict": "fail", "bug_ref": "BUG-001" },
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
    { "tc_ref": "TC-JOURNEY-003", "verdict": "fail", "bug_ref": "BUG-001" },
    { "tc_ref": "TC-UI-001", "verdict": "fail", "bug_ref": "BUG-004" },
    { "tc_ref": "TC-UI-002", "verdict": "fail", "bug_ref": "BUG-006" },
    { "tc_ref": "TC-UI-003", "verdict": "skip" },
    { "tc_ref": "TC-CFR-001", "verdict": "fail", "bug_ref": "BUG-003" },
    { "tc_ref": "TC-CFR-002", "verdict": "pass" },
    { "tc_ref": "TC-CFR-003", "verdict": "pass" }
  ],
  "evidence": [
    { "label": "CH-03-06-checkout-retirada.png", "path": "screenshots/CH-03-06-checkout-retirada.png" },
    { "label": "CH-03-07-checkout-pac.png", "path": "screenshots/CH-03-07-checkout-pac.png" },
    { "label": "CH-03-08-checkout-recarregado.png", "path": "screenshots/CH-03-08-checkout-recarregado.png" },
    { "label": "CH-03c-08-checkout-pac-sem-recarregar.png", "path": "screenshots/CH-03c-08-checkout-pac-sem-recarregar.png" },
    { "label": "CH-02-07-checkout-ba-endereco.png", "path": "screenshots/CH-02-07-checkout-ba-endereco.png" },
    { "label": "CH-06d-01-sp-pac-gratis.png", "path": "screenshots/CH-06d-01-sp-pac-gratis.png" },
    { "label": "CH-07-05-frete-recolhido.png", "path": "screenshots/CH-07-05-frete-recolhido.png" },
    { "label": "CH-07-02-balao-info.png", "path": "screenshots/CH-07-02-balao-info.png" },
    { "label": "CH-07-06-liberado-balao.png", "path": "screenshots/CH-07-06-liberado-balao.png" },
    { "label": "CH-08-05-balao-390.png", "path": "screenshots/CH-08-05-balao-390.png" },
    { "label": "CH-07-01-abaixo-sem-cep.png", "path": "screenshots/CH-07-01-abaixo-sem-cep.png" },
    { "label": "CH-01-01-faltam.png", "path": "screenshots/CH-01-01-faltam.png" },
    { "label": "CH-01-02-balao-regra.png", "path": "screenshots/CH-01-02-balao-regra.png" },
    { "label": "CH-01-04-liberado-sp.png", "path": "screenshots/CH-01-04-liberado-sp.png" },
    { "label": "CH-01c-01-liberado-balao-sp.png", "path": "screenshots/CH-01c-01-liberado-balao-sp.png" },
    { "label": "CH-01c-02-checkout-entrega-trazido.png", "path": "screenshots/CH-01c-02-checkout-entrega-trazido.png" },
    { "label": "CH-01c-03-checkout-resumo-cartao.png", "path": "screenshots/CH-01c-03-checkout-resumo-cartao.png" },
    { "label": "CH-02-03-ba-acima-tooltip.png", "path": "screenshots/CH-02-03-ba-acima-tooltip.png" },
    { "label": "CH-02-04-sem-cep-acima-tooltip.png", "path": "screenshots/CH-02-04-sem-cep-acima-tooltip.png" },
    { "label": "CH-02-05-checkout-ba-pac.png", "path": "screenshots/CH-02-05-checkout-ba-pac.png" },
    { "label": "CH-02-06-checkout-resumo-ba.png", "path": "screenshots/CH-02-06-checkout-resumo-ba.png" },
    { "label": "CH-05-05-recusa-sem-regiao.png", "path": "screenshots/CH-05-05-recusa-sem-regiao.png" },
    { "label": "CH-05-07-sul-sudeste-salvo.png", "path": "screenshots/CH-05-07-sul-sudeste-salvo.png" },
    { "label": "CH-05-08-ac-so-sul-sudeste.png", "path": "screenshots/CH-05-08-ac-so-sul-sudeste.png" },
    { "label": "CH-05-09-sp-liberado.png", "path": "screenshots/CH-05-09-sp-liberado.png" },
    { "label": "CH-06d-02-salvador-pac-cobrado.png", "path": "screenshots/CH-06d-02-salvador-pac-cobrado.png" },
    { "label": "CH-06d-03-pagamento-cpf.png", "path": "screenshots/CH-06d-03-pagamento-cpf.png" }
  ],
  "issues": {
    "total": 7,
    "by_severity": { "critical": 1, "high": 1, "medium": 0, "low": 5 }
  }
}
```

# Resultado de QA — 99 · Frete grátis por região (Sul e Sudeste) e a prévia de frete na sacola

**Gate 3:** confirmado em 2026-11-14 (humano: "ok", no chat do orquestrador)

## Resumo

**Veredito:** fail. A rodada deixa 2 bugs abertos que bastam para o fail:

- BUG-001, `critical`: na segunda ida da sacola ao checkout, a rua do endereço salvo é trocada.
- BUG-002, `high`: trocar para um CEP que a busca não localiza mantém o endereço do CEP anterior.

A rodada percorreu os oito charters, com 12 sessões (três charters com continuação). A regra da região se comportou como
a fonte pede em todas as superfícies que anunciam ou concedem frete grátis:

- Fora do Sul e do Sudeste, nenhuma tela disse "liberado" nem zerou o frete, nem sem CEP.
- O checkout cobrou o mesmo PAC que a gaveta.
- Trocar SP → BA no checkout desfez o "Grátis" sem recarregar.
- O cupom de frete grátis vale em qualquer região.
- O painel recusa ligar sem região, e Sul + Sudeste vale na loja sem deploy.
- No pedido montado, o PAC sai grátis para SP e cobrado para Salvador.

A prévia de frete na sacola também se sustenta: as mesmas opções, prazos e valores, nenhuma cotação a mais ao abrir o
checkout, e a Entrega abrindo com o CEP, o endereço da busca, a opção da gaveta e o foco no Número.

Uma pessoa de verdade consegue hoje saber o frete e o frete grátis na sacola e chegar ao checkout sem redigitar. Duas
coisas falham:

- **A cliente com endereço salvo** (BUG-001): se ela vai ao checkout, volta à sacola e muda a forma de envio, o bloco
  Entrega, recolhido, passa a mostrar outra rua com o número e o complemento dela. O pedido sairia para o endereço
  errado sem ela perceber.
- **Quem corrige o CEP** no checkout ou no pedido montado (BUG-002): se o CEP novo não é localizado pela busca, fica com
  o endereço de outra cidade nos campos.

Os outros 5 bugs são cosméticos:

- a gaveta contra o protótipo v2: o balão do ⓘ, a altura da faixa liberada, o ícone do botão, o espaçamento da linha
  recolhida;
- o rodapé de 276 px contra o teto de 270 px do CA-23.

O Total do checkout chega 7 % menor que o da gaveta, porque o PIX vem pré-marcado. Com o cartão, os dois Totais batem
centavo a centavo. Nenhuma fonte diz qual meio de pagamento o "mesmo Total" pressupõe: vai à Pergunta 1, não é bug.

| TC                                    | Critérios      | Bugs novos | Reabertos | Reteste                                                    |
| ------------------------------------- | -------------- | ---------- | --------- | ---------------------------------------------------------- |
| pass 18 · fail 5 · blocked 1 · skip 6 | 18 de 26 cobertos | 7       | 0         | resolved 0 · still-open 0 · cannot-reproduce 0 · blocked 0 |

## Rodada

- **Ambiente:** loja http://localhost:8082 · painel http://localhost:8083 · Supabase local (API 54441, Mailpit 54444) ·
  edge functions servidas do worktree com chaves externas inválidas
- **Branch / build:** `feature/99` (worktree `store__feature-99`), dev server (não o build de produção); build não
  exposto
- **Execução:** 2026-11-14, das 09:17 às 10:09 (horário de Brasília), 13 sessões em 6 lotes — cerca de 55 min
- **Browser:** Chromium headless (playwright-cli 0.1.24; o CH-05 começou no agent-browser) · **Viewports:** 390 × 844
  e 1440 × 900; fonte da raiz a 100 % e 200 %
- **Personas e acesso:**
  - PER-01 Luana → `anonima`
  - PER-02 Cida → `cliente-salvador` (`QA_CLIENTE_SALVADOR_USUARIO`; no CH-06 continuação 2, o link `QA_PEDIDO_MONTADO_LINK`, sem login)
  - PER-03 Adri → `admin-loja` (`QA_ADMIN_LOJA_*`)
  - PER-04 Teresa → `cliente-com-endereco` (`QA_CLIENTE_COM_ENDERECO_USUARIO`)

## Gate técnico

- **Validation do Dev:** `[ITEM_DIR]/qa-report.md` — PASS, de 2026-11-14 (ressalva de ambiente: o timeout do worker na
  suíte da loja com o paralelismo padrão, exit 0 com `--maxWorkers=2`)
- **Rodada E2E:** sem rodada E2E

| Gate  | Status | Resumo |
| ----- | ------ | ------ |
| build | pass   | `pnpm build` 3/3 tarefas OK com as `VITE_*` do Supabase local na env |
| lint  | pass   | store 2/2 · backoffice 23/5 · mobile-adm 0/0, igual à baseline (`npx eslint .` em cada app) |
| test  | pass   | 23569/23569: core 6091 · functions 1711 · store 7635 · backoffice 5398 · mobile-adm 2734 |
| e2e   | skip   | sem rodada E2E |

## Cobertura — critério → TC

| Critério | Fonte     | TC | Veredito | Status |
| -------- | --------- | -- | -------- | ------ |
| CA-01 | prd (97) | TC-FUNC-001, TC-UI-002 | pass · fail (BUG-006) | covered |
| CA-02 | prd (97) | TC-FUNC-001 | pass | covered |
| CA-03 | prd (97) | TC-FUNC-002 | pass | covered |
| CA-04 | prd (97) | TC-FUNC-003, TC-JOURNEY-001 | pass · pass (com o mesmo meio de pagamento; ver Pergunta 1) | covered |
| CA-05 | prd (97) | TC-FUNC-004, TC-UI-002 | skip · fail (BUG-007) | partial |
| CA-06 | prd (97) | TC-FUNC-006, TC-FUNC-015, TC-FUNC-019 | blocked · pass · pass | partial |
| CA-07 | prd (97) | TC-FUNC-011, TC-JOURNEY-003 | pass · fail (BUG-001) | covered |
| CA-08 | prd (97, com M-06 do 99) | TC-CFR-001, TC-UI-002 | fail (BUG-003) · fail (BUG-006); nenhuma nota abaixo do Total em nenhum estado medido | covered |
| CA-09 | prd (97) | TC-FUNC-007, TC-FUNC-008, TC-JOURNEY-001, TC-UI-003 | pass · fail (BUG-001) · pass · skip | partial |
| CA-10 | prd (97) | TC-FUNC-009 | skip | missing |
| CA-11 | prd (97) | TC-FUNC-010 | skip (passos 1–2 conferidos) | partial |
| CA-12 | prd (97) | TC-FUNC-017 | skip (passo 1 conferido) | partial |
| CA-13 | prd (97) | TC-CFR-002 | pass | covered |
| CA-14 | prd (99) | TC-FUNC-005, TC-UI-001 | pass · fail (BUG-004) | covered |
| CA-15 | prd (99) | TC-FUNC-012, TC-JOURNEY-002, TC-UI-001 | pass · pass · fail (BUG-004) | covered |
| CA-16 | prd (99) | TC-FUNC-006, TC-JOURNEY-001, TC-UI-001 | blocked · pass · fail (BUG-005) | partial |
| CA-17 | prd (99) | TC-FUNC-013, TC-JOURNEY-002, TC-UI-001 | pass · pass · fail (BUG-004) | covered |
| CA-18 | prd (99) | TC-FUNC-014 | pass | covered |
| CA-19 | prd (99) | TC-FUNC-019 | pass | covered |
| CA-20 | prd (99) | TC-FUNC-018 | pass | covered |
| CA-21 | prd (99) | TC-INT-001 | skip (passos 1–2 conferidos; a prova no servidor são os testes de handler do Dev) | partial |
| CA-22 | prd (99) | TC-CFR-003 | pass | covered |
| CA-23 | prd (99) | TC-CFR-001 | fail (BUG-003) | covered |
| CA-24 | prd (99) | TC-FUNC-020 | pass | covered |
| CA-25 | prd (99) | TC-FUNC-015 | pass | covered |
| CA-26 | prd (99) | TC-FUNC-016 | pass | covered |

**Sem cobertura:**

- CA-10: o TC-FUNC-009 não rodou nas duas sessões do CH-03, porque o orçamento acabou antes da fixture B. Ficaram sem
  verificação a quantidade mudando depois do cálculo, a faixa cruzada e a resposta sem SEDEX.

**Notas de veredito:**

- **TC-FUNC-003 e TC-JOURNEY-001:** as sessões deram fail pela diferença do PIX pré-marcado.
  - A fonte (CA-04) pede o mesmo Total "com a mesma opção, cupom e promoção" e não fala de meio de pagamento.
  - Com o mesmo meio (cartão), o Total bate centavo a centavo.
  - O veredito fica pass, condicionado à Pergunta 1. Se a resposta mudar o esperado, o fail volta, como WI novo.
- **TC-FUNC-001:** pass pela continuação. O fail da primeira sessão era o dígito indo ao botão "Calcular", não ao campo:
  foi método do explorador.
- **TC-FUNC-013:** pass.
  - A linha neutra, o frete somado e o mesmo PAC no checkout conferem.
  - O ⓘ sem a cidade segue D-10 ("a busca falhando, o ⓘ e o cabeçalho saem sem a cidade"): o 40020-000 não foi
    localizado pela busca em nenhuma tela.
  - O ⓘ com "Para Salvador/BA" fica em Fora da cobertura.
- **TC-CFR-003:** pass pela meta "balão dentro da gaveta". A distância de 12 px das bordas é o BUG-004.

## Sessões

| Charter | Persona | Tour | Status | Ações | TC | Achados | Bugs |
| ------- | ------- | ---- | ------ | ----- | -- | ------- | ---- |
| CH-05 | PER-03 Adri | Multi-Tab | done | ~57 de 50 | pass 2 · fail 0 | 0 (2 spec-gaps) | — |
| CH-01 (+ continuação) | PER-01 Luana | Feature | done (orçamento esgotado nas duas; RS e 1440 fora) | 50 de 50 · 49 de 50 | pass 6 · fail 0 · blocked 1 · skip 1 (final) | 2 (1 spec-gap, 1 não reproduziu) | — |
| CH-02 | PER-02 Cida | Money | done | 52 de 50 | pass 6 · fail 0 (final) | 2 | BUG-002 |
| CH-03 (+ continuação) | PER-04 Teresa | Back-Button | done (orçamento esgotado nas duas) | 61 de 50 · 50 de 50 | pass 2 · fail 2 · skip 1 | 1 (2 de 2) | BUG-001 |
| CH-06 (+ continuação, + continuação 2) | PER-02 Cida | Money | done (o pedido não nasceu: login caro, depois CPF do pagador fora da massa) | 50 · 50 · 30 de 30 | skip 2 | 0 (1 spec-gap) | BUG-002 (ocorrência) |
| CH-04 | PER-01 Luana | Network | done | 25 de 25 | skip 1 | 0 (1 spec-gap) | — |
| CH-07 | PER-01 Luana | — (design-check) | done (parcial: dois desenhos da faixa e o checkout fora) | ~67 de 50 | pass 0 · fail 2 · skip 1 | 5 | BUG-004, BUG-005, BUG-006, BUG-007, BUG-003 (ocorrência) |
| CH-08 | PER-01 Luana | — (cfr) | done (J-02 fora) | 35 de 35 | pass 2 · fail 1 | 1 | BUG-003, BUG-004 (ocorrência) |

## CFR

| Categoria             | Jornadas | Resultado | Bugs |
| --------------------- | -------- | --------- | ---- |
| Acessibilidade        | J-01 | ok. Toque, nome acessível do ⓘ, `aria-expanded`, `role=tooltip` e alvos ≥ 44 px conferidos. Teclado e Esc não rodados | — |
| Responsividade        | J-01 | fricção: a 390, o rodapé recolhido mede 276 px, acima do teto de 270. A 200 %, sem corte e sem rolagem lateral da gaveta. A 1440, só sem CEP | BUG-003 |
| Performance percebida | J-01 | ok. Com a cotação interceptada, as opções aparecem na primeira leitura; o "calculando" não se provoca | — |
| Segurança visível     | — | não rodada (nenhum TC da categoria no plano) | — |

J-02 inteira e a recuperação de erro (CEP inválido) não rodaram no CH-08, por orçamento.

## Design-check

- **Protótipo:** Claude Design `4abe021d-…` › `Black Friday - Sacola v2.html` (gaveta: faixa abaixo e liberada, ⓘ,
  rodapé sem CEP, opções, frete recolhido, CEP inválido). O `69224d8a-…` › `Sacola - Prévia de frete.html` foi lido,
  mas não comparado
- **Status:** done, parcial. Ficaram fora por orçamento: a faixa acima sem CEP, a faixa fora (40020-000), o checkout ›
  Entrega (TC-UI-003) e 1440
- **Divergências:** 4 bugs, um por componente, mais 1 leitura isolada:
  - BUG-004: balão do ⓘ;
  - BUG-005: faixa liberada;
  - BUG-006: ícone do "Finalizar Pedido";
  - BUG-007: linha do frete recolhido;
  - a borda do "Tem um cupom?" (`#e6e0d5` × `#e6dfd4`) teve uma leitura só e não virou bug.

## Bugs novos

Por nível: Bloqueia a conclusão 0 · Perda de dados 1 · Dano à confiança 1 · Fricção 0 · Cosmético 5
Por severidade: critical 1 · high 1 · medium 0 · low 5

| Bug | Nível | Severidade | Prioridade | Título | Persona · jornada, passo | TC |
| --- | ----- | ---------- | ---------- | ------ | ------------------------ | -- |
| BUG-001 | Perda de dados | critical | P0 | [Checkout · Entrega] Na segunda ida da sacola, a rua do endereço salvo é trocada — cliente com conta | PER-04 Teresa · J-05, passo 3 | TC-FUNC-008 |
| BUG-002 | Dano à confiança | high | P1 | [Entrega] Trocar para um CEP não localizado mantém a rua e a cidade do CEP anterior | PER-02 Cida · J-02 ramo J-02a; J-04, Entrega | — |
| BUG-003 | Cosmético | low | P3 | [Sacola · rodapé] Com o frete escolhido, o rodapé mede 276 px no celular e passa do teto de 270 px | PER-01 Luana · J-01, passo 3 | TC-CFR-001 |
| BUG-004 | Cosmético | low | P3 | [Sacola · ⓘ do frete grátis] O balão abre com 288 px preso ao ⓘ, e não a 12 px de cada borda da gaveta | PER-01 Luana · J-01, passo 2 | TC-UI-001 |
| BUG-005 | Cosmético | low | P3 | [Sacola · faixa do frete grátis] A faixa “Frete grátis liberado” mede 40 px, o protótipo pede 42 px | PER-01 Luana · J-01, passo 3 | TC-UI-001 |
| BUG-006 | Cosmético | low | P3 | [Sacola · Finalizar Pedido] O ícone da sacola no botão tem 16 px, o protótipo pede 20 px | PER-01 Luana · J-01, passo 5 | TC-UI-002 |
| BUG-007 | Cosmético | low | P3 | [Sacola · frete escolhido] A linha recolhida do frete usa 12 px entre ícone, texto e valor, não 10 px | PER-01 Luana · J-01, passo 4 | TC-UI-002 |

**Reabertos:** nada

## Lotes de correção sugeridos

| Lote | Bugs | Tela · componente | Por que juntos | Maior severidade |
| ---- | ---- | ----------------- | -------------- | ---------------- |
| L1 | BUG-001, BUG-002 | Checkout (e Pedido montado) · bloco Entrega — endereço de entrega | Mesmo componente na mesma tela. Nos dois, Rua, Bairro, Cidade e UF não correspondem ao que deveriam depois de uma mudança de CEP ou de escolha: a busca do CEP sobrescreve a rua salva, ou deixa de limpar a do CEP anterior | critical |
| L2 | BUG-003, BUG-006, BUG-007 | Sacola (gaveta) · rodapé da sacola | Mesmo componente na mesma tela. A linha do frete escolhido (BUG-007) compõe a altura medida no BUG-003 | low |
| L3 | BUG-004, BUG-005 | Sacola (gaveta) · faixa do frete grátis | Mesmo componente na mesma tela: o balão do ⓘ e a altura da faixa liberada, os dois contra `bf-sacola-v2.css` | low |

## Transições propostas

sem bugs abertos no Work Item e nenhuma reabertura

**Reteste `blocked`:** nada

## Achados que não viraram bug

- **CH-01 A-1 e CH-01 (continuação) A-1** — o checkout chega com o PIX pré-marcado e o Total 7 % menor que o da gaveta
  (R$ 585,62 × R$ 629,70); com o cartão, bate. Classificação: `spec-gap` (classe `mudança`), que vai à Pergunta 1.
- **CH-01 A-2** — "CEP inválido" preso depois do oitavo dígito. Classificação: `conforme a fonte`.
  - Com o dígito digitado no campo, o erro some (continuação, passo 05).
  - A primeira ocorrência foi o dígito indo ao botão "Calcular" focado: método do explorador.
- **CH-02 A-1** — com 40020-000, o ⓘ diz "Para este CEP" e não "Para Salvador/BA". Classificação: `conforme a fonte`
  (D-10: "a busca falhando, o ⓘ e o cabeçalho saem sem a cidade").
  - O 40020-000 não foi localizado pela busca em nenhuma tela: o cabeçalho da gaveta saiu sem a cidade, e o checkout e o
    pedido montado disseram "Não localizamos esse CEP".
  - O ⓘ com a cidade num CEP fora que a busca localiza fica em Fora da cobertura.
- **CH-06 (continuação), spec-gap "endereço de SP com o CEP de Salvador no pedido montado"** — `duplicado de BUG-002`,
  incorporado como ocorrência.
- **CH-08, TC-CFR-003 passo 4: o balão ancorado no ⓘ (86 / 16 px)** — `duplicado de BUG-004`.
- **CH-08 A-1, a mesma medida do rodapé recolhido que a CH-07 registrou em Fora da cobertura (276 px)** — `duplicado de
  BUG-003`.
- **CH-07 A-4: borda do "Tem um cupom?" `#e6e0d5` × `#e6dfd4`** — `intermitente sem segunda ocorrência`. Foi uma leitura
  só, e o tom é invisível a olho nu.
- **CH-07, spec-gap "a lista Complete o frete grátis, que a v2 não desenha"** — `conforme a fonte` (RN-20: sem CEP, como
  hoje; com CEP fora, some, o que o TC-FUNC-016 confirmou).
- **CH-03: o aviso de login não anuncia frete grátis** — `conforme a fonte` (CA-24 vale "quando anunciam").
- **CH-04: depois da falha na gaveta, o checkout cai no "frete padrão" da loja** — `conforme a fonte`. O CA-11 vale na
  gaveta, e o checkout segue como hoje (SHP-05, fora do escopo).
- **CH-04, spec-gap "a gaveta recota sozinha ao reabrir depois de uma falha"** — `spec-gap` (polimento), que vai a
  Sugestões de backlog.
- **CH-02: "Não localizamos esse CEP" com 39999-999 no checkout** — `conforme a fonte` (CEP fictício de borda).
- **CH-05 e notas da thread: a interceptação da cotação no agent-browser sem CORS** — ambiente, não defeito (registrado
  no Ambiente do plano). Preço e prazo das fixtures não são achado.
- **Atritos anteriores ao WI vistos em várias sessões** — `pré-existente`, fora da superfície da mudança e abaixo de
  `high`; vão a Sugestões de backlog. São eles:
  - o convite do Instagram na Home;
  - "Adicionar à sacola" fora da dobra a 390;
  - o aviso de cookies escondendo o `main` da árvore de acessibilidade;
  - a Faixa de avisos com texto fixo;
  - o login do painel caindo no Dashboard;
  - os dois "Remover …" quase iguais na gaveta;
  - a rolagem lateral de 45 px do cabeçalho a 200 %.

## Perguntas ao produto

| # | Comportamento observado | Pergunta | Critério · charter | Por que decide a jornada |
| - | ----------------------- | -------- | ------------------ | ------------------------ |
| 1 | A gaveta mostra o Total sem desconto de meio de pagamento (R$ 629,70, com o PAC grátis). Ao chegar, o checkout já traz o PIX marcado sem toque, com "Desconto PIX (7%) −R$ 44,08" e Total R$ 585,62 ("Resumo · 3 itens · frete grátis R$ 585,62", "Pagar R$ 585,62 com PIX"). Com o cartão, o Total do checkout é R$ 629,70, igual ao da gaveta | O "mesmo Total" da sacola e do checkout (CA-04) é com o mesmo meio de pagamento? Ou a gaveta deve mostrar o Total que o checkout vai mostrar ao chegar, com o PIX que ele pré-marca? **Recomendação:** manter como está. A gaveta não escolhe meio de pagamento, e a Validation (T11) provou a paridade "sem PIX escolhido". Destino `ajusta o plano`: TC-FUNC-003 e TC-JOURNEY-001 passam a dizer "com o mesmo meio de pagamento". Se a Adri quiser o "no PIX" na gaveta, o destino é `WI novo` | CA-04 (PRD 97), RN-04; CA-16 · CH-01 · TC-FUNC-003, TC-JOURNEY-001 | O objetivo da J-01 (P0) é chegar ao checkout com o mesmo Total. O plano põe "Totais diferentes" como o maior risco da rodada. A resposta diz se a J-01 está pronta ou se falta trabalho |

## Sugestões de backlog

| Comportamento | Onde | Classe | Título sugerido para o Work Item |
| ------------- | ---- | ------ | -------------------------------- |
| A 390 × 844, no topo da página, o único "Adicionar à sacola" (barra fixa) fica fora da área visível. O toque não adiciona nada e não dá retorno; só funciona depois de rolar (8 sessões) | página do produto, barra fixa | pré-existente | "Adicionar à sacola" visível e tocável sem rolar no celular |
| Um convite do Instagram abre por cima da loja na entrada e engole o primeiro toque na Sacola | Home | pré-existente | Convite do Instagram sem interceptar o primeiro toque na loja |
| Com o aviso de cookies aberto, o `main` da página do produto some da árvore de acessibilidade até "Aceitar" | página do produto, aviso de cookies | pré-existente | Aviso de cookies sem esconder a página de quem navega pelo nome acessível |
| A Faixa de avisos tem um aviso de texto fixo de frete grátis que aparece seja qual for a configuração do frete, enquanto o painel diz "Quando desligado, a loja não anuncia frete grátis em nenhuma tela" | loja, Faixa de avisos; painel, Frete e Material | pré-existente | Faixa de avisos coerente com a configuração do frete grátis (ou ajuste da ajuda do painel) |
| Login do painel por link profundo (`/admin/configuracoes/frete-e-material`) leva ao Dashboard, não à página pedida | painel, login | pré-existente | Login do painel volta à página pedida |
| Na gaveta, o botão de diminuir a quantidade e o de tirar da sacola têm nomes acessíveis quase iguais ("Remover <peça>" × "Remover <peça> da sacola") | gaveta da sacola, linha da peça | pré-existente | Nomes acessíveis distintos para diminuir e remover na sacola |
| A 200 %, o documento rola 45 px de lado pelo cabeçalho da loja | cabeçalho da loja | pré-existente | Cabeçalho da loja sem rolagem lateral com a fonte a 200 % |
| Ao voltar do checkout e reabrir a gaveta depois de uma falha da cotação, a gaveta recota sozinha e troca o alerta pelas opções, sem o "Tentar de novo". Nenhuma fonte define isso; o efeito é bom | gaveta da sacola, frete | polimento | Definir e registrar a recotação da sacola ao reabrir depois de falha |

## Riscos residuais

- **BUG-001 (critical):** o gatilho não foi isolado (a segunda ida em si, retirada → PAC, ou PAC → retirada), e não se
  conferiu se o endereço salvo na conta também mudou. A correção precisa de reteste nas três variações.
- **Dois defeitos no endereço de entrega** (BUG-001 e BUG-002), um em J-05 e outro em J-02/J-04, apontam para o mesmo
  ponto frágil: a busca do CEP preenchendo o endereço quando o CEP muda ou volta. Vale um reteste dirigido do bloco
  Entrega inteiro, e não só dos dois passos.
- **O CEP da massa (40020-000), que é o do PRD, não foi localizado pela busca do endereço em nenhuma tela.** Por isso o ⓘ
  com "Para Salvador/BA" (UC-09) nunca foi visto. Se o 40020-000 for localizável, a mensagem "Não localizamos esse CEP"
  e o ⓘ sem a cidade são defeitos. A sessão registrou `GET … → 200`, e a ViaCEP responde 200 também quando não acha o
  CEP. Para a próxima rodada, recomenda-se um CEP de Salvador que a busca localize (`ajusta o plano`).
- **CA-21 (o servidor cobrando o frete no pedido montado)** fica provado só pelos testes de handler do Dev. Na tela,
  falta o Total do pedido que nasce: o pedido não nasceu nas três sessões. O caso do CEP 40020-000 com a UF SP herdada
  (BUG-002) também não teve o Total do pedido lido.
- **Painel em duas abas:** depois do salvar na primeira aba, a segunda ficou com o estado velho, sem aviso. O salvar a
  partir dela não foi tentado.
- **O "Trocar CEP"** tem a área de toque confirmada em ≥ 37 px. Os 44 px não foram confirmados.
- **Fricção repetida fora da mudança:** "Adicionar à sacola" fora da dobra a 390 apareceu em 8 sessões e consumiu
  ~10–15 ações de cada uma. É sinal de redesenho da página do produto no celular (ver Sugestões de backlog).
- **Ambiente da rodada:**
  - Só Chromium headless, com a cotação do Melhor Envio interceptada (preço e prazo fixos).
  - O dev server, não o build.
  - A fonte a 200 % foi simulada pela raiz do documento: o que é `px` fixo não cresce.

## Fora da cobertura

- **TC-INT-001 passo 3:** o Total do pedido montado que nasce, na tela de pagamento e em `/conta`.
  - Não foi alcançado em três sessões: na primeira, o login consumiu o orçamento; depois, faltou o CPF do pagador na
    massa.
  - Os passos 1 e 2 passaram.
  - A prova do servidor (RN-16/CA-21) são os testes de handler do Dev (`qa-report.md`, COVERED). O caso fica `skip`
    por massa e orçamento.
- **TC-FUNC-017 passos 2 e 3:** seguir ao pagamento e ver a gaveta intacta depois do pedido montado. Ficaram fora por
  orçamento.
- **TC-FUNC-006 passo 4 (RS 90010-000 acima da faixa) e a comparação em 1440 × 900:** `blocked` por orçamento nas duas
  sessões do CH-01.
- **TC-FUNC-004** (recolher e reabrir a lista), **TC-FUNC-003 passo 3** (SEDEX dos dois lados) e o **"Trocar CEP" do
  CH-01:** orçamento.
- **TC-FUNC-009 inteiro** (fixture B, quantidade, faixa cruzada, resposta sem SEDEX), **TC-FUNC-008 passo 1**
  (01310-100 com conta), **o ramo J-05a** e **o teclado em 1440** do TC-JOURNEY-003: orçamento.
- **TC-FUNC-010:** o toque em "Tentar de novo" e a resposta `[]` com 90010-000 (passos 3 e 4). Também ficaram fora a
  falha com o frete já escolhido (D-21), o offline no meio do cálculo e o recarregar com a falha na tela.
- **TC-FUNC-012 passo 3** (checkout sem CEP), **TC-FUNC-015 passo 2** (checkout com o QAFRETE), **TC-FUNC-016 passo 3**
  e a prova pela rede de que o catálogo não é buscado, **a borda 40000-000**, **a J-02 direto da gaveta com a BA** e
  **o caminho de abandono da J-02:** orçamento.
- **TC-UI-003** (checkout › Entrega contra o protótipo), **a faixa acima sem CEP**, **a faixa fora (40020-000)** e **o
  design-check em 1440:** orçamento.
- **O ⓘ com a cidade para um CEP fora da região que a busca localiza:** não exercitado (ver Riscos residuais).
- **TC-CFR-001:** as opções abertas a 200 %, a fonte a 130 % e o rodapé com o cupom. **TC-CFR-002:** 1440 com o frete
  calculado, 320 × 568 e 90010-000. **TC-CFR-003:** ponteiro, Tab, foco visível, Esc, o segundo toque e a faixa fora.
  Também a J-02 inteira no CFR e a recuperação de erro: orçamento.
- **Painel:** a faixa em zero com o interruptor ligado, salvar em duas abas, voltar com alterações não salvas, o duplo
  clique em "Salvar" e a seção a 390 × 844: orçamento.
- **O "calculando"** (resposta lenta da cotação): não se provoca com a interceptação usada.
- **Leitor de tela real, Safari, Firefox e Android real:** só o Chromium do driver.
- **Personas:** as quatro rodaram. Ficou sem sessão a persona "em recuperação", fora do plano.
- **Jornadas:** J-04 não chegou ao objetivo (o pedido não nasceu). J-05 parou no BUG-001. O caminho de abandono da J-02
  não rodou.
