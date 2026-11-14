# 99 · Validation 2 (Re-Validation das fix tasks da QA rodada 1) — 2026-11-14

**Status**: PASS

Fix tasks 12 (`868da880`, BUG-001/002), 13 (`50c65d4d`, BUG-003/006/007) e 14 (`429d32dd`, BUG-004/005), todas `done`,
só em `apps/store`. Os bugs seguem `open` até o reteste da QA (rodada de confirmação).

| Gate | Resultado | Antes (Validation 1) | Situação |
| ---- | --------- | -------------------- | -------- |
| Testes store | **7646 / 413**, exit 0 (`vitest run --testTimeout=20000 --maxWorkers=2`, fora de pipe) | 7635 / 413 | verde (+11 casos das fix tasks) |
| Tipos | store 0 · `tsconfig.server.json` 0 | 0 · 0 | sem erro novo |
| Lint | store 2 erros / 2 warnings (`npx eslint .`) | 2/2 | igual à baseline |
| Build | `pnpm build` 3/3 com as `VITE_*` do Supabase local na env | 3/3 | verde |

Os outros workspaces não foram tocados pelas fix tasks (diff `3dcd8bf6..429d32dd` só em `apps/store`) e não foram
remedidos.

---

# 99 · Validation 1 — 2026-11-14

**Status**: PASS

**Veredito: PASS** (com uma ressalva de ambiente registrada, sem fix task).

Branch `feature/99` (worktree `store__feature-99`), 11 commits sobre `master` (`8500acb9`..`3dcd8bf6`), um por tarefa.
Todas as tarefas `done`. Um workspace por vez, exit code fora de pipe, `--testTimeout=20000` sem o `--`.

## Gates

| Gate | Resultado | Baseline | Situação |
| ---- | --------- | -------- | -------- |
| Testes core | **6091 / 253**, exit 0 | 5718/238 (WI 98) | verde |
| Testes functions | **1711 / 49**, exit 0 | 1669/46 | verde |
| Testes store | **7635 / 413** todos passando; exit 1 em 3 de 3 execuções com o paralelismo padrão por **1 erro não tratado** `[vitest-worker]: Timeout calling "onTaskUpdate"`; **exit 0** com `--maxWorkers=2` (7635/413, 234 s) | 7188/382 | verde (ver Ressalva) |
| Testes backoffice | **5398 / 307**, exit 0 | 5266/297 | verde |
| Testes mobile-adm | **2734 / 176**, exit 0 | 2729/175 | verde |
| Tipos | store 0 · backoffice 7 · mobile-adm 0 · `tsconfig.server.json` 0 · core 11 | 0 · 7 · 0 · 0 · 11 | sem erro novo (os 7 do painel são os de `ProposalStateBadge.test.tsx`, herdados; os 11 de core, herdados) |
| Lint | store 2/2 · backoffice 23/5 · mobile-adm 0/0 | 2/2 · 23/5 · 0/0 | igual à baseline |
| Build | `pnpm build` **3/3 tarefas OK** com as `VITE_*` do Supabase local na env | — | verde |
| `packages/core/src/payment/**` | `git diff --name-only master..HEAD` vazio | — | intocado |
| Migration | `20261130150000_99-frete-gratis-por-regiao.sql` aplicada **só no banco local** (54442); `store_settings.shipping.free_shipping_regions` = `["sul","sudeste","centro-oeste","nordeste","norte"]` | — | ok |

**A primeira execução da build reprovou por ambiente**, não por código: o worktree não tem `apps/*/.env`, e o
`%VITE_SUPABASE_URL%` do `apps/store/index.html` chega cru ao `decodeURI` do Vite (`URI malformed`). Com as variáveis
do Supabase local na env, verde.

### Ressalva — o timeout do worker na suíte da loja

- Na `master` (`76c51acb`), a mesma suíte fechou **exit 0** (7468/406) numa execução.
- Na branch, o erro saiu nas três execuções com o paralelismo padrão, com todos os 7635 casos verdes; com
  `--maxWorkers=2`, exit 0.
- O arquivo que segura o worker é `apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts` (AST do repositório
  inteiro, síncrono, **não tocado por este WI**): ~20 s isolado nas duas árvores, 47 s na suíte cheia da `master` e
  106 s na da branch — acima do teto de RPC do worker. A branch tem 7 arquivos de teste a mais na loja (+167 casos), que
  aumentam a contenção.
- O `CLAUDE.md` raiz já registra o mesmo erro como contenção em 2026-11-09. O CI roda com `--concurrency=1` num runner
  de 2 vCPU (poucos workers), onde ele não se manifestou até aqui. **Classificação: config-issue anterior ao WI, agravado
  pela suíte maior — sem fix task neste WI**; candidato a dívida: dividir o `marcacaoSoPorAcao` ou ler a AST de forma
  assíncrona.

## Cobertura dos critérios

| Critério | Teste existe | Passa | Status |
| -------- | ------------ | ----- | ------ |
| RN-13 (região, rótulo) | `packages/core/src/shipping/__tests__/region.test.ts` (T01) | sim | COVERED |
| RN-14, RN-15, CA-19 (estado, ausente/vazio) | `freeShipping.test.ts`, `storeSettingsDefaults.test.ts`, `useFreeShipping.test.ts` (T01, T03) | sim | COVERED |
| RN-16, CA-21 (pedido montado no servidor) | `proposals/__tests__/pricing.test.ts`, `checkout/__tests__/proposal.test.ts`, `mercado-pago/__tests__/proposalCharge.test.ts` (T04) | sim | COVERED |
| RN-19 (base da faixa) | `pricing.test.ts`, `deliveryOptions.test.ts`, `sacolaComFrete.test.tsx` (T04, T06, T09) | sim | COVERED |
| UC-12, CA-20 (painel) | `AdminSettingsPage.test.tsx` (T05) | sim | COVERED |
| UC-10, CA-16/17/18 (checkout) | `DeliveryBlock.test.tsx`, `OrderSummary.test.tsx`, `deliveryOptions.test.ts` (T06) | sim | COVERED |
| UC-11, CA-24 (superfícies) | `TrustBar`, `AuthOverlay`, `ShippingCalc` (T07) | sim | COVERED |
| M-01, M-02, UC-07..09, CA-14, CA-15, RN-17 (faixa) | `FreeShippingBand.test.tsx` (T08) | sim | COVERED |
| M-03, CA-22 comportamento (ⓘ) | `InfoTip.test.tsx` (T02) | sim | COVERED |
| UC-01..03, UC-05, UC-06, M-04..M-07, CA-01..08, CA-10..12, CA-25, CA-26, RN-18, RN-20 (gaveta) | `sacolaComFrete.test.tsx`, `CartDrawer*.test.tsx`, `useCartPromotion.test.ts` (T09) | sim | COVERED |
| UC-04, CA-09 (checkout recebendo) | `DeliveryBlockDaSacola.test.tsx` (T10) | sim | COVERED |
| CA-04, CA-16, CA-17 (paridade) | `apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx` (T11) | sim | COVERED |
| CA-13 (390×844 e 1440×900, sem rolagem, alvos de 44px, rodapé na tela) | não (jsdom) | — | **DEFERRED → QA em navegador** |
| CA-22 (o balão dentro da largura da gaveta em 390×844) | não (jsdom) | — | **DEFERRED → QA em navegador** |
| CA-23 (rodapé ≤ 270 px a 100 %; a 200 % rola por dentro sem cortar CEP nem valor) | parcial (sem nota abaixo do Total: T09) | sim | **DEFERRED → QA em navegador** (a medida) |

As três medidas são da QA real-user (CFR em navegador), sobre a gaveta montada; a T09 deixou os estados alcançáveis.

## Bugs abertos da QA

Nenhum (`qa/` ainda não existe).

## Premissas da corrida (do `implement-log.md`)

- **T01** — a frase do ⓘ é `freeShippingRuleText(config)` em `freeShipping.ts` (o `region.ts` fica sem import); lista
  com só slugs inválidos fica vazia ⇒ inativo (o lado que não concede); o `INATIVO` ganhou os campos novos congelados.
- **T02** — o clique de mouse fixa o balão, toque/Enter alternam; o foco junto de um `pointerdown` não abre; o Radix não
  move o foco; clicar no próprio balão no computador o fecha (perda de foco).
- **T03** — `DEFAULT_SHIPPING.free_shipping_regions` é lista literal em `packages/supabase` conferida contra `core` (evita
  ciclo entre pacotes); a ordem gravada é a de `core` (`sul … norte`); o tipo é `string[]`; `constants.ts` importa só a
  folha `region.ts` (a function `admin-users` alcança esse grafo).
- **T04** — `proposalPricing` zera por `granted`; a function normaliza o CEP uma vez e usa o mesmo para decidir e gravar;
  o `create-payment` usa `order.address_zip`.
- **T05** — o aviso de recusa usa o motivo como título; as caixas ficam na ordem Norte…Sul na tela; salvar grava sempre
  `free_shipping_regions` (a linha antiga passa a ter as cinco por escrito).
- **T06** — o cartão de opção passou a `role="radio"`/`aria-checked` e "PAC · Correios" também no checkout (seletores
  de teste ajustados, nenhuma asserção de comportamento); o resumo "Frete escolhido" e a linha do `OrderSummary` seguem
  "Correios PAC" (o nome do serviço fica escrito de dois jeitos).
- **T07** — a `TrustBar` mantém a base de hoje ("grátis acima de R$ 450") e acrescenta " · para <região>"; a linha da
  página do produto fica sob o título e não depende do CEP.
- **T08** — a faixa recebe o `cep` para nomear a região do balão por `regionOfCep`; `place` tem a forma de
  `CepLookupResult`; a frase da regra vem de `useShippingSettings` dentro da faixa.
- **T09** — a lógica do frete da gaveta é o hook `widgets/cart-drawer/model/useCartShipping.ts`; a sacola com peças é o
  `FilledCart` interno (as consultas só rodam com a gaveta aberta); com CEP completo no rascunho a gaveta abre no
  resultado; **a mais barata só é marcada quando o CEP foi calculado na gaveta** (`cepOrigin === 'sacola'`); com a
  cotação em falha, a gaveta nunca apaga escolha vinda do checkout nem o "Frete padrão".
- **T10** — a opção da gaveta que sumiu é desfeita só com `cepOrigin === 'sacola'` e nunca a retirada; "mesmo CEP" por
  `stripCep`; o foco no Número uma vez por montagem, também quando o bloco abre depois do Contato; sem a busca, a linha
  diz só "Trazido da sua sacola".
- **T11** — paridade montando a gaveta e o checkout reais em sequência no mesmo `QueryClient`, sem PIX escolhido; o WI 99
  registrado no `CLAUDE.md` raiz no formato do WI 98.

**Caducou:** nada registrado pelos agentes.
