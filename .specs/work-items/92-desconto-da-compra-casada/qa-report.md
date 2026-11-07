# WI 92 · Desconto da compra casada — Validation Report

**Date**: 2026-11-03
**Run by**: Validation (Dev)
**Source**: `prd.md` (r1 + handoff) + `spec.md` + `tasks/01..08`
**Árvore**: worktree `store__feature-92`, branch `feature/92`, HEAD `4f563e5d` (os 8 commits das tarefas + o complemento do `AD-073` e do probe `02-lista`)

---

## Re-Validation 3 — fix tasks da rodada 2 da QA (2026-11-07)

**Veredito: PASS.** Fix tasks 19 (BUG-014, commit `0dfb0847`) e 20 (BUG-006, commit `17ef0715`), todas as 20 tarefas `done`. Medido no conjunto dos workspaces tocados (functions, backoffice) e na loja, cujos guardas varrem o painel; um workspace por vez, exit fora de pipe, `--testTimeout=20000`.

| Medida | Resultado | Validation 2 → agora |
| --- | --- | --- |
| testes functions | 1462 em 40, exit 0 | 1461/40 → 1462/40 |
| testes backoffice | 5118 em 282, exit 0 | 5117/282 → 5118/282 |
| testes store | 6997 em 373, exit 0 | idêntico |
| tipos store | 0 | idêntico |
| tipos backoffice | 7, os mesmos de `ProposalStateBadge.test.tsx` (commit base `4c6e9a16`, fora do WI) | idêntico |
| lint | backoffice 23/5 · store 2/2 | na baseline 25/7 |
| build | `pnpm build` exit 0 | idêntico |

mobile-adm e `packages/core` não foram tocados pelas fix tasks 19 e 20 e não foram remedidos (seguem 2375/149 e 5374/219). Sem migration nova. Os bugs BUG-006 e BUG-014 seguem `open`/`still-open` até o reteste da QA.

## Re-Validation 2 — fix tasks da rodada 1 da QA (2026-11-07)

**Árvore**: worktree `store__feature-92`, branch `feature/92`, HEAD `b48ee26d` (10 commits de fix task sobre `4f563e5d`: T09 `328b79d4`, T10 `26dc651a`, T11 `4328db26`, T14 `8d93ff35`, T12 `8417cd6b`, T13 `d7c37d4b`, T17 `54f78935`, T18 `d521da6b`, T15 `5f20e4f5`, T16 `b48ee26d`). Tarefas 01–18 todas `done`.
**Escopo**: os workspaces que as fix tasks tocaram — store, backoffice, mobile-adm e functions. `packages/core` não foi tocado (`git diff --name-only 4f563e5d..HEAD` sem `packages/`) e não foi remedido: segue em 5374/219 da Validation 1.

| Medida | Resultado | Contra a Validation 1 |
| --- | --- | --- |
| testes store | 373 arquivos · **6997** passed · exit 0 | 6976/371 → 6997/373 (+21/+2) |
| testes backoffice | 282 · **5117** passed · exit 0 | 5115/282 → 5117/282 (+2) |
| testes mobile-adm | 149 · **2375** passed · exit 0 | 2371/149 → 2375/149 (+4) |
| testes functions | 40 · **1461** passed · exit 0 | 1460/40 → 1461/40 (+1) |
| tipos store app · store server · mobile-adm | 0 · 0 · 0 | igual |
| tipos backoffice | 7 — os mesmos 7 de `ProposalStateBadge.test.tsx` (commit base `4c6e9a16`, alheio ao WI) | igual |
| lint | store 2/2 · backoffice 23/5 · mobile-adm 0/0 | igual (baseline 25/7) |
| `pnpm build` | exit 0 (env local) | igual |

Comando: `pnpm --filter @estrelinha/<w> exec vitest run --testTimeout=20000`, um workspace por vez, exit capturado fora de pipe.

**Migration nova das fix tasks**: `supabase/migrations/20261107170000_pedido-montado-desconto-na-lista-de-pedidos.sql` (T11, BUG-007 — `order_list` passa a expor `manual_discount`, coluna acrescentada ao fim, aditiva). No banco local a view já tem a coluna, mas a versão **não está em `supabase_migrations.schema_migrations`** (aplicada por `psql`, não por `migration up`). Ordem de publicação: migration → bundle do app do ateliê. Não vai à produção sem pedido explícito.

**Bugs**: BUG-001..013 seguem `open` — o reteste é da rodada de confirmação da QA. P-01 (`qa/decisoes-produto.md`) segue para um WI novo.

**Veredito: PASS.**

---

## Test Results

Um workspace por vez, `pnpm --filter <w> exec vitest run --testTimeout=20000`, exit capturado fora de pipe.

| Workspace | Test Files | Tests | Exit |
| --- | --- | --- | --- |
| `@estrelinha/core` | 219 passed (219) | 5374 passed (5374) | 0 |
| `@estrelinha/store` | 371 passed (371) | 6976 passed (6976) | 0 |
| `@estrelinha/backoffice` | 282 passed (282) | 5115 passed (5115) | 0 |
| `@estrelinha/mobile-adm` | 149 passed (149) | 2371 passed (2371) | 0 |
| `@estrelinha/functions` | 40 passed (40) | 1460 passed (1460) | 0 |

**Summary**: 21296 passed, 0 failed, 0 skipped (catalog-import não foi tocado pela fila e não roda).

Contra a baseline do fecho do WI-01 (`CLAUDE.md` › Baselines): core 5310/213 → 5374/219 · store 6865/364 → 6976/371 · backoffice 5043/280 → 5115/282 · mobile-adm 2365/148 → 2371/149 · functions 1439/39 → 1460/40. A diferença inclui o que entrou na `master` depois do WI-01 (os fix tasks 08–20 do WI-01 e `4c6e9a16`), não só este WI.

**Integração no ambiente local (Supabase :54441):**
- `probes/01-desconto-do-adicional.sh` — 11 `ok` (T01; o `check` 1–50 e a gravação do painel por HTTP).
- `probes/02-desconto-no-pedido.sh` — 8 `ok` (T04; as colunas novas gravadas pela `checkout`).
- `probes/03-cobranca-no-runtime.sh` — **4 `ok`, exit 0, executado nesta Validation** (a T04 o deixou escrito e não executado): `supabase functions serve` com um `--env-file` de valores inválidos para todas as chaves externas; o `create-payment` sobe no runtime local (prova do D-12), grava o total da tela com o desconto casado (413,80 / 31,67), dá 422 `buy_together_price_changed` quando o percentual cai e não cria order no Mercado Pago. Saída em `probes/03-cobranca-no-runtime.saida.txt`. O runtime foi encerrado ao fim (`docker ps -a` sem o container `edge_runtime` deste projeto).
- `probes/05-adesao.sh` (T08) e `.specs/features/74-mobile-adm-pedidos/probes/02-lista.sh` (T07, saída em `probes/07-lista-do-app.saida.txt`) — passaram na tarefa.

## Build & Lint

**Build**: PASS — `pnpm build` exit 0 (com `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` locais no ambiente; o worktree não tem `.env` nos apps).

**Tipos** (`npx tsc --noEmit -p …`):
- store `tsconfig.app.json`: 0 · store `tsconfig.server.json`: 0 · mobile-adm: 0
- core: 11 — **os mesmos 11 herdados** da baseline (`home/__tests__/carousel` 5, `pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2, `packages/supabase/src/client.ts` 2)
- backoffice: 7 — **pré-existentes, não deste WI**: todos em `apps/backoffice/src/features/order-proposal/ui/__tests__/ProposalStateBadge.test.tsx` (`describe`/`it`/`expect` sem tipos), arquivo que nasceu no commit base `4c6e9a16` ("melhorias ui listagem de propostas") e que nenhum commit deste WI toca (`git log -- <arquivo>` só devolve `4c6e9a16`). Registrados pelas tarefas 01, 03 e 04 como alheios. Não reprovam a Validation; ficam como dívida da `master`.

**Lint** (`npx eslint .` por app): store 2 erros / 2 warnings · backoffice 23 / 5 · mobile-adm 0 / 0 — **idênticos à baseline** (25/7).

## Acceptance Criteria Coverage

| ID | Critério (resumo) | Teste | Result | Status |
| --- | --- | --- | --- | --- |
| CA-01.1 | campo por adicional; vazio = sem desconto | `AdminProductFormPage.compreJunto.test.tsx`; `addons.test.ts` | PASS | COVERED |
| CA-01.2 | recusa fora de 1–50/não inteiro, também no banco | `core/buy-together/__tests__/rules.test.ts`; `compreJuntoDescontoSchema.test.ts`; `probes/01` | PASS | COVERED |
| CA-01.3 | mudar só o percentual grava | `addons.test.ts`; `persistAddons.test.ts` | PASS | COVERED |
| CA-01.4 | gravar uma joia não muda outra | `persistAddons.test.ts` (recorte por `product_id`) | PASS | COVERED |
| CA-01.5 | prévia "R$ X" e faixa | `AdminProductFormPage.compreJunto.test.tsx` | PASS | COVERED |
| CA-02.1 | "de/por" e "N% a menos levando junto" | `BuyTogetherDesconto.test.tsx` | PASS | COVERED |
| CA-02.2 | linha do desconto, total descontado, PIX | `BuyTogetherDesconto.test.tsx`; `total.test.ts` | PASS | COVERED |
| CA-02.3 | nota "vale com a joia no mesmo pedido" | `BuyTogetherDesconto.test.tsx` | PASS | COVERED |
| CA-02.4 | bloco = sacola sem promoção nem cupom | `core/buy-together/__tests__/blocoIgualSacola.test.ts` | PASS | COVERED |
| CA-02.5 | barra fixa com o total descontado | `ProductPageLevarConjunto.test.tsx` | PASS | COVERED |
| CA-03.1 | percentual sobre a variação, por item | `buyTogetherDiscount.test.ts` | PASS | COVERED |
| CA-03.2 | uma unidade por unidade da joia | `buyTogetherDiscount.test.ts`; `cartDiscount.test.ts` | PASS | COVERED |
| CA-03.3 | tirar a joia tira o desconto; frase da volta | `compreJuntoSacolaECheckout.test.tsx` | PASS | COVERED |
| CA-03.4 | peça pelo catálogo ganha desconto | `compreJuntoSacolaECheckout.test.tsx` | PASS | COVERED |
| CA-03.5 | promoção/bump: vale o menor | `buyTogetherDiscount.test.ts` | PASS | COVERED |
| CA-03.6 | acumula com o cupom; descartado só quando desconta | `buyTogetherDiscount.test.ts` | PASS | COVERED |
| CA-03.7 | PIX depois | `buyTogetherDiscount.test.ts` | PASS | COVERED |
| CA-03.8 | "de/por" e a linha na gaveta e no checkout | `compreJuntoSacolaECheckout.test.tsx` | PASS | COVERED |
| CA-03.9 | maior percentual; avulsa antes da lista | `cartDiscount.test.ts`; `buyTogetherDiscount.test.ts` | PASS | COVERED |
| CA-03.10 | par recíproco pela marca | `cartDiscount.test.ts`; `compreJuntoSacolaECheckout.test.tsx` | PASS | COVERED |
| CA-03.11 | variação escondida / não liberada | `cartDiscount.test.ts` | PASS | COVERED |
| CA-03.12 | a sacola relê o percentual | `useCartBuyTogether.test.tsx`; `compreJuntoSacolaECheckout.test.tsx` | PASS | COVERED |
| CA-04.1 | recalcula pelo banco; ignora corpo e marca forjados | `mercado-pago/__tests__/buyTogetherCharge.test.ts` | PASS | COVERED |
| CA-04.2 | sacola = checkout = cobrança, ao centavo | `displayedEqualsCharged.test.ts`; `probes/03` (runtime) | PASS | COVERED |
| CA-04.3 | coluna do teto; 422 só quando mais caro; as duas telas | `buyTogetherCharge.test.ts`; `handlers.test.ts`; `CheckoutPage.test.tsx`; `OrderPaymentPage.test.tsx`; `probes/03` | PASS | COVERED |
| CA-05.1 | linha guarda cheio e cobrado | `buyTogetherCharge.test.ts`; `probes/02` | PASS | COVERED |
| CA-05.2 | confirmação, conta e e-mail com o resumo que fecha | `orders/__tests__/summary.test.ts`; `OrderItemsSummary.test.tsx`; `send-notification/__tests__/render.test.ts` | PASS | COVERED |
| CA-05.3 | painel e app com a mesma composição | `AdminOrderPage.desconto.test.tsx`; `pedidoDescontoCompreJunto.test.tsx` | PASS | COVERED |
| CA-05.4 | pedido feito não muda | `summary.test.ts` (o pedido é snapshot; pedido antigo no formato de antes) | PASS | COVERED |
| CA-06.1 | conta pela marca | `compreJuntoAdesaoSchema.test.ts`; `probes/05` | PASS | COVERED |
| CA-06.2 | valor líquido e "desconto concedido" | `compreJuntoAdesaoSchema.test.ts`; `AdminBuyTogetherAdoption.test.tsx`; `probes/05` | PASS | COVERED |
| RNF-01 | exibido = cobrado pela mesma função | `displayedEqualsCharged.test.ts` | PASS | COVERED |
| RNF-02 | sem a entrada, saída idêntica | `buyTogetherDiscount.test.ts` (objeto inteiro); `pricing/orderBump/progressive` sem uma linha alterada | PASS | COVERED |
| RNF-03 | alcançável pelo Deno | `purity.test.ts`; `summaryDenoReach.test.ts`; `manualDiscount.test.ts` (grafo); `probes/03` (boot real) | PASS | COVERED |
| RNF-04 | feed e JSON-LD sem mudança | `shoppingParity.test.ts` (intocado, verde) | PASS | COVERED |
| RNF-05 | 390×844 sem rolagem horizontal | estrutura (`minmax(0,1fr)`, `relative` no invólucro do `sr-only`) nos testes de componente; a medida em navegador fica para a QA (jsdom não mede layout); os protótipos foram medidos em 390/1440 | PASS (estrutura) | COVERED — medida real na QA |
| RNF-06 | tom memorial | `tomDoCompreJunto.test.ts` ampliado (D-09) | PASS | COVERED |
| RNF-07 | migration aditiva, só local | `compreJuntoDescontoSchema.test.ts`, `compreJuntoAdesaoSchema.test.ts`; migrations `20261107130000`..`20261107160000` aplicadas só no local | PASS | COVERED |

**Coverage**: 38/38 critérios cobertos (100%). Nada em `Fica fora` (a fila cobriu todo UC).

## Afirmações caducadas na corrida

| Tarefa fechada | A afirmação | Quem a tornou falsa | Ainda verdadeiro no comportamento? |
| --- | --- | --- | --- |
| — (documentação) | `packages/core/CLAUDE.md` avisa que `core/pricing/index.ts`/`grid.ts` têm `import type` de pacote e que `mercado-pago` não sobe no runtime local (e `supabase/CLAUDE.md` › Edge functions, o mesmo aviso) | T03 (D-12: os tipos foram para `core/pricing/types.ts`) | não — o `create-payment` sobe no local (`probes/03`). Os dois avisos ficam para atualizar no fecho da documentação |

## Observações para a QA (não reprovam)

- **Ordem das linhas no resumo**: a loja (`OrderItemsSummary`) e o app põem Frete antes dos descontos; o painel do pedido (T06, premissa 3) põe os descontos e o PIX antes do Frete, seguindo o recorte de design da tarefa. As linhas e os valores são os mesmos (CA-05.3 "a mesma composição"); a ordem difere entre painel e loja.
- **"Desconto da oferta"** é o rótulo escolhido para o desconto do order bump no resumo (T05, premissa 4).
- **O painel mostra o preço da unidade** com "de/por" (cheio da unidade riscado), enquanto a loja mostra o total da linha (T06, premissa 1).
- **Pedido antigo no painel e no app**: rótulos passam a vir de `core` ("Desconto PIX" no lugar de "Desconto Pix"/"Desconto do Pix"; a linha "Promoção" do app ao lado do subtotal líquido saiu — o defeito L-014).
- **CA-03.2 numa lista** (T03, premissa 4): cada unidade de joia dá UMA unidade de desconto por adicional; numa lista com duas peças diferentes na sacola, só a de maior preço recebe.
- **Par recíproco com as duas marcadas** (T03, premissa 6): recebe a de menor preço cheio, como sem marca.
- **Leitura de `product_buy_together` falhando no `create-payment`** ⇒ 500 antes do Mercado Pago (T04, premissa 7), em vez de cobrar a preço cheio.
- A medida em navegador (390×844 e 1440) das telas reais fica para a `wi-qa-validation`.

## Failures & Fix Tasks

nenhuma.

## Overall Verdict

**Status**: PASS

- [x] Todos os testes passam (0 falhas, 5 workspaces)
- [x] Build e lint passam (lint e tipos na baseline; os 7 erros de tipo do backoffice são anteriores ao WI)
- [x] Todo critério de aceite das unidades de escopo que a fila cobre está COVERED
- [x] Nenhum critério está MISSING ou FAILING
- [x] Sem bug aberto da QA (`qa/issues/` não existe)
