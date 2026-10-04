# 59 · Minha Conta V2 — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Commits**: a convenção do `CLAUDE.md` sobrepõe a da skill — **nenhum commit por task**; os
> commits da implementação saem juntos ao fim (`BL-012`, fechado em 2026-08-15).

---

**Design**: `.specs/features/59-minha-conta-v2/design.md`
**Status**: Done

---

## Test Coverage Matrix

> Gerada do código, das diretrizes e da spec. Diretrizes encontradas: `CLAUDE.md` (raiz) e o
> `CLAUDE.md` de cada módulo — guardas que leem o fonte do disco com âncora de contagem, prova de
> banco por probe e não por mock (`AD-012`), asserção sobre o literal (`L-036`), metade mobile **e**
> desktop com asserção positiva (`L-029`); `vitest.config.ts` dos workspaces (sem limiar de
> cobertura).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura em `core/orders` | unit | todos os ramos; 1:1 com as ACs; todo edge case listado | `packages/core/src/orders/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Migration | guarda que lê o `.sql` do disco + probe SQL no banco local | uma régua por comando (`L-033`), sensor por mutação em cada asserção, âncora de contagem | `apps/store/src/shared/lib/__tests__/*Schema.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Edge function (`handlers.ts`) | unit com os dublês de `_shared/testing` | caminho feliz + recusa + falha; o dublê precisa **enxergar** o filtro que a régua mede | `supabase/functions/checkout/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Hooks de dados (`entities/*/api`) | unit (client dublado) | consulta certa, erro distinto de vazio, forma devolvida | `apps/store/src/entities/**/__tests__/*.test.ts(x)` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Componentes e páginas da loja | component (RTL) | cada AC visível com asserção no literal; estados vazio/erro/carregando; alvo de toque por token exato; **a página real monta a árvore** | `apps/store/src/**/__tests__/*.test.tsx` | idem |
| Tokens de cor | guarda existente (`palette`, `contrast`, `accentText`, `arbitraryTextColor`) | passam sem afrouxar | `apps/store/src/shared/lib/__tests__` | idem |
| Layout em viewport | navegador (Playwright, dev server) | 390×844 e 1440×900, zero rolagem horizontal | — | prova manual registrada em `validation.md` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick (core) | tasks só de `packages/core` | `pnpm --filter @estrelinha/core test` |
| Quick (functions) | tasks só de `supabase/functions` | `pnpm --filter @estrelinha/functions test` |
| Full (store) | toda task que toca `apps/store` ou migration | `pnpm --filter @estrelinha/store test --testTimeout=20000` + `npx tsc --noEmit -p apps/store/tsconfig.app.json` |
| Build | fim de fase e fecho | os cinco workspaces um por vez, exit code fora de pipe, `pnpm lint`, `tsc` nos três, `pnpm build` |

---

## Execution Plan

### Phase 1: Regras puras em `core` (4)

```
T01 → T02 → T03 → T04
```

### Phase 2: Banco e servidor (3)

```
T05 → T06 → T07
```

### Phase 3: Dados e peças da loja (8)

```
T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15
```

### Phase 4: O detalhe do pedido (3)

```
T16 → T17 → T18
```

### Phase 5: A lista da conta (4)

```
T19 → T20 → T21 → T22
```

### Phase 6: Meus dados (5)

```
T23 → T24 → T25 → T26 → T27
```

### Phase 7: Acabamentos (1)

```
T28
```

---

## Task Breakdown

### T01: `orderSituation` — a régua do selo

**What**: função pura com as 9 regras, rótulos, tons e o detalhe de data.
**Where**: `packages/core/src/orders/situation.ts` (+ export no barrel)
**Depends on**: None
**Requirement**: SIT-01..10, SIT-12
**Done when**:
- [x] um caso por regra (9) + a ordem entre regras que competem (cancelado com pagamento aprovado; reembolsado com `shipped` = "A caminho"? não — `shipped` vem antes; caso escrito)
- [x] valor fora do vocabulário → "Aguardando pagamento", sem lançar (SIT-10)
- [x] `situationDetail`: "· chega até 8 out", " em 12 ago" pelo primeiro `delivered`, `null` sem fonte
- [x] imports relativos com `.ts`; `purity` de `core` passa
**Tests**: unit · **Gate**: quick (core)

> **Resultado**: `situation.ts` (+ `formatShortDate`/`calendarParts`/`firstEventAt`, fuso fixo `America/Sao_Paulo`, coluna `date` lida sem fuso) e `situation.test.ts` (33). Não havia guarda de pureza para `core/orders`: nasceu `orders/__tests__/purity.test.ts` (8), e o barrel passou a usar `.ts` em todo especificador. Core 2459/97 → 2500/99.

### T02: `podeGerarNovoPix` e `pagamentoPerdido`

**Where**: `packages/core/src/orders/repix.ts`
**Depends on**: T01
**Requirement**: PEN-03, PEN-04, PEN-05
**Done when**:
- [x] 6d23h oferece, 7d1min não oferece; `expired` e `rejected`; cartão nunca; cancelado nunca; pago nunca
- [x] `repixDeadline` = `created_at + 7d`; `REPIX_WINDOW_DAYS = 7` exportado
**Tests**: unit · **Gate**: quick (core)

> **Resultado**: `repix.ts` (`podeGerarNovoPix`, `pagamentoPerdido`, `repixDeadline`, `REPIX_WINDOW_DAYS`) e `repix.test.ts` (17), incluindo a exclusão mútua das duas ofertas em toda a janela. Exatamente 7 dias ainda oferece ("até").

### T03: `orderJourney` — etapas e datas

**Where**: `packages/core/src/orders/journey.ts`
**Depends on**: T02
**Requirement**: DET-05..08, LIN-05
**Done when**:
- [x] etapas com e sem material; estado `complete/current/future` em cada status
- [x] data de cada etapa pela fonte certa, **primeiro** evento quando há dois (edge case), `null` sem fonte, nunca `updated_at`
- [x] cancelado → `kind: 'cancelled'` com a data do evento `cancelled` ou `null`
**Tests**: unit · **Gate**: quick (core)

> **Resultado**: `journey.ts` (`orderJourney`, `JOURNEY_STEP_LABELS`; `StatusEvent` e `firstEventAt` vêm de `situation.ts` com `.ts`) e `journey.test.ts` (21). Etapa posterior concluída implica as anteriores (pedido importado entregue sem `paid_at`).

### T04: `parcelTrackingUrl`

**Where**: `packages/core/src/orders/tracking.ts`
**Depends on**: T03
**Requirement**: DET-03
**Done when**: código aparado e em maiúsculas; vazio → `null`; `encodeURIComponent`; teste ✅
**Tests**: unit · **Gate**: quick (core)

> **Resultado**: `tracking.ts` (`parcelTrackingUrl`, `PARCEL_TRACKING_BASE_URL`) e `tracking.test.ts` (4). O formato do Melhor Rastreio segue premissa a conferir em navegador. Fase 1: core 2459/97 → **2542/102**.

### T05: Migration `59` + guarda + probe

**Where**: `supabase/migrations/20261004120000_59-minha-conta.sql`, `apps/store/src/shared/lib/__tests__/minhaContaSchema.test.ts`
**Depends on**: T04
**Requirement**: LIN-01..03, DAD-06, DAD-07, NUM-01..03
**Done when**:
- [x] guarda com uma régua por comando: função (`security definer`, `search_path = ''`, sem `note`/`created_by` no retorno, filtro por `auth.uid()`, `revoke` de `anon`/`public`, `grant` a `authenticated`); gatilho (os três campos, as duas saídas de admin/service role, `before update`); índice único **parcial**; renumeração recortada por `like 'NP-%'`, por `created_at`, sem tocar `NS-%`
- [x] sensor por mutação em cada régua (o `mutar()` lança quando a mutação não muda nada)
- [x] probe SQL no banco local, **se o Docker estiver de pé**: cliente não altera e-mail/CPF, admin altera, função devolve zero linhas para pedido alheio. Se não estiver, registrado em `validation.md` como pendência
**Tests**: guarda + probe · **Gate**: full (store)

> **Resultado**: migration aplicada À MÃO no banco local (só o container do DB foi religado; o local não tinha a `52` nem a `57` aplicadas, então `migration up` arrastaria as duas), reaplicada para provar idempotência e registrada em `schema_migrations`. Probe numa transação com rollback: a cliente não troca e-mail, `user_id` nem CPF preenchido (`42501`); troca nome e telefone; preenche CPF vazio uma vez; admin e service role trocam e-mail e CPF; a função devolve 0 linhas para pedido alheio e para inexistente, e à dona só `status` + `created_at` em ordem; `anon` sem `execute`; segundo padrão recusado pelo índice; renumeração `NP-` em ordem de criação, segunda passada inalterada, 35 `NS-` intactos. Guarda `minhaContaSchema.test.ts` (53). **SPEC_DEVIATION** (comentada no `.sql`): o gatilho tem uma TERCEIRA saída, `current_user` fora de `authenticated`/`anon` (manutenção direta e função `security definer` do dono), e por isso a função do gatilho NÃO é `security definer` — régua com sensor. Store 3791/232 → 3844/233, tsc 0.

### T06: `get-order` devolve `status_events`

**Where**: `supabase/functions/checkout/handlers.ts`, `__tests__/getOrder*.test.ts`
**Depends on**: T05
**Requirement**: LIN-04
**Done when**: eventos em ordem, só `status`+`at`; recusa continua sem eventos; o dublê enxerga a tabela e o filtro por `order_id` ✅
**Tests**: unit · **Gate**: quick (functions)

> **Resultado**: `eventosDoPedido` em `handlers.ts` (ordena em JS; falha → `[]`) e +5 casos em `getOrder.test.ts`. O dublê compartilhado ganhou, de forma aditiva, `lists` em forma de função (vê todos os `.eq()` e o `select`), o 3º argumento `eqs` nas fixtures de linha e `.or()` registrado no update (+3 casos em `_shared/testing/__tests__/fakes.test.ts`). Mutantes de coluna do filtro e de ordenação, mortos.

### T07: `persistirConveniencias` — CPF só quando vazio; primeiro endereço padrão

**Where**: `supabase/functions/checkout/handlers.ts`
**Depends on**: T06
**Requirement**: DAD-05, DAD-06, DAD-08
**Done when**: CPF gravado com filtro "vazio"; telefone segue gravado; endereço nasce `is_default` só sem padrão; falha continua sem derrubar o pedido ✅
**Tests**: unit · **Gate**: quick (functions)

> **Resultado**: CPF e telefone viraram updates irmãos (o filtro `cpf.is.null,cpf.eq.` no mesmo update travaria o WhatsApp de quem já tem CPF); o endereço lê o padrão por `customer_id` + `is_default` antes de inserir. A asserção antiga de `createOrder.test.ts` (CPF + telefone num update só) foi **reescrita sem perder valor nenhum** — os mesmos `cpf`, `phone` e `eq`, agora em dois registros — e ganhou 5 vizinhas. 5 mutantes reinjetados, 5 mortos por asserção.

### T08: Tokens de situação

**Where**: `apps/store/src/app/App.css`, `apps/store/tailwind.config.ts`
**Depends on**: T07
**Requirement**: SIT-13
**Done when**: `wait`, `wait-soft`, `alert`, `alert-soft`, `done`, `done-soft` nos dois arquivos; `palette`, `contrast`, `accentText` passam sem edição de régua ✅
**Tests**: guarda existente · **Gate**: full (store)

> **Resultado**: os seis tokens em `App.css` e `tailwind.config.ts`. Nenhuma régua afrouxada; as duas listas MEDIDAS cresceram: `PALETA` de `palette.test.ts` (+12) e um bloco novo em `contrast.test.ts` (+17: os cinco pares do selo, os três textos sobre as três superfícies claras, os três fundos como "nunca texto"). Menor razão medida: `wait` sobre `ground-deep`, 6,40:1.

### T09: `useOrder` com eventos; tipos; erro da lista

**Where**: `apps/store/src/entities/order/api/useOrder.ts`, `useOrders.ts`
**Depends on**: T08
**Requirement**: LIN-01, LIN-04, LST-08
**Done when**: sessão chama a RPC e funde `status_events`; RPC falhando → `[]`; convidada lê do `get-order`; `useOrdersByCustomerId` lança em erro ✅
**Tests**: unit · **Gate**: full (store)

> **Resultado**: `OrderDetail` ganhou `status_events` e os campos do detalhe; `lerEventos` (RPC → `{status, at}`, erro/lançamento → `[]`); convidada normaliza `status_events ?? []`; `useOrdersByCustomerId` lança. `useOrder.test.tsx` +7 e as SEIS asserções antigas `toEqual(PEDIDO)` ficaram MAIS estritas (`toEqual(LIDO)`, pedido + eventos) — o mock ganhou `rpc`; `useOrders.test.tsx` +4 (`LST-08`, com o par inverso). Único consumidor da lista: `AccountPage` (dubla o hook), verde.

### T10: `OrderSituationBadge` + guarda de dono único

**Where**: `apps/store/src/entities/order/ui/OrderSituationBadge.tsx`, `shared/lib/__tests__/situacaoComDonoUnico.test.ts`
**Depends on**: T09
**Requirement**: SIT-11, SIT-12, SIT-13
**Done when**: um caso por tom (classes por token exato); o guarda recusa um mapa de rótulos de status (`'Pendente'`, `'Enviado'`… como valor de objeto indexado por status) em `apps/store/**` fora de `core`, com âncora e sensor ✅
**Tests**: component + guarda · **Gate**: full (store)

> **Resultado**: `OrderSituationBadge` (12 casos) e `situacaoComDonoUnico.test.ts` (11: duas formas — entrada de mapa e `case` —, âncora dupla com a régua casando ≥ 9 entradas no dono em `core`, removedor com CRLF/LF/glob, sensor da tabela antiga linha a linha, inverso). Opção (a): `statusConfig` SAIU de `AccountPage.tsx`, que passou a desenhar `OrderSituationBadge` (5 casos dela verdes, sem edição). Mutação: a `AccountPage` do `HEAD` reinjetada derruba 2 casos do guarda. Zero allowlist.

### T11: `OrderJourney` substitui `OrderTimeline` na loja

**Where**: `apps/store/src/entities/order/ui/OrderJourney.tsx` (+ apagar `OrderTimeline.tsx` e seu teste da loja)
**Depends on**: T10
**Requirement**: DET-05..08, CNF-06 (forma por estado, herdado)
**Done when**: as asserções de forma do `OrderTimeline.test.tsx` reaparecem no teste novo (`data-state`, `aria-current`, disco por estado); queda de contagem declarada ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `OrderJourney` (23 casos) substitui a `OrderTimeline` da loja; `OrderTimeline.tsx` e o teste dela (14) APAGADOS — líquido +9. Os 14 reaparecem marcados "(herdado)": ordem, estado por status ×4, `aria-current` único, sem pagamento, data do pagamento, janela, janela de um dia, sem janela, cancelado sem trilha, forma do disco sem cor, check × miolo, paleta. `OrderConfirmationPage` troca o import (mínimo) e 2 casos `CNF-04` foram INVERTIDOS para a jornada (5 etapas + `aria-current` + "Previsão: entre 4 e 6 ago"; e sem janela) — cada um ganhou asserção. Painel intocado.

### T12: `OrderTrackingCard`

**Where**: `apps/store/src/entities/order/ui/OrderTrackingCard.tsx`
**Depends on**: T11
**Requirement**: DET-03, DET-04
**Done when**: não renderiza sem código; "Copiar" chama a área de transferência e avisa; "Acompanhar entrega" abre `parcelTrackingUrl` em nova aba com `rel`; alvos ≥ 44 ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `OrderTrackingCard` + 13 casos: 4 entradas vazias não renderizam; código aparado/maiúsculo; transportadora opcional; `href` = `parcelTrackingUrl`, `_blank`, `noopener noreferrer`; `min-h-11` nos dois; copiar → `toast.success` (Sonner), recusa e área ausente → `toast.error` sem lançar.

### T13: `OrderItemsSummary`

**Where**: `apps/store/src/entities/order/ui/OrderItemsSummary.tsx`
**Depends on**: T12
**Requirement**: DET-10, ACB-01
**Done when**: opções unidas sem separador solto; gravação; resumo que **soma** (`L-014`), com cupom e desconto PIX quando houver ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `OrderItemsSummary` + `lib/itemDetailLine.ts` (14 casos). Resumo = subtotal + frete − cupom − desconto PIX = total, provado pela soma das linhas (promoção NÃO vira linha: já está no subtotal, `L-014`); frete zero = "Grátis"; sem foto = quadrado neutro. `OrderItem` ganhou `variant_label` (a coluna existe).

### T14: `OrderPaymentDelivery`

**Where**: `apps/store/src/entities/order/ui/OrderPaymentDelivery.tsx`
**Depends on**: T13
**Requirement**: DET-11
**Done when**: rótulo para `pix`, `card`, `credit_card`, `boleto`, `manual`; data de aprovação; endereço em linhas com o CEP inteiro numa linha ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `OrderPaymentDelivery` + `lib/paymentDelivery.ts` (12 casos): os cinco rótulos e o desconhecido; "Aprovado em 2 out" por `formatShortDate`; linhas sem vírgula/barra sobrando; CEP por `maskCep` em `whitespace-nowrap`; sem endereço, sem bloco de entrega.

### T15: `whatsappHref` + `OrderHelp`

**Where**: `apps/store/src/shared/lib/whatsapp.ts`, `widgets/order-help/`
**Depends on**: T14
**Requirement**: DET-12
**Done when**: `null` abaixo de 10 dígitos; mensagem com `formatOrderNumber`; bloco some sem número ✅
**Tests**: unit + component · **Gate**: full (store)

> **Resultado**: `shared/lib/whatsapp.ts` (`whatsappHref`, `MIN_DIGITOS_WHATSAPP`, 10 casos) e `widgets/order-help` (`OrderHelp` + `lib/orderHelpMessage.ts`, 6 casos). Fase 3: store 3844/233 → **3971/240**, tsc 0, lint store 2/2 (os helpers puros saíram dos arquivos de UI para não somar avisos de Fast Refresh).

### T16: `OrderMaterialBlock` — portão de sessão, código vazio, âncora

**Where**: `apps/store/src/widgets/order-material/ui/OrderMaterialBlock.tsx`
**Depends on**: T15
**Requirement**: MAT-01, MAT-03..06, DET-09
**Done when**: sem sessão não monta o formulário e mostra o WhatsApp; vazio recusa sem chamar a mutação; texto digitado sobrevive à recusa; `id="material"` ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `OrderMaterialBlock` ganhou `variant: 'bloco' | 'acao'` (o estado do topo "Envie o seu material" com os literais do Paper), `orderNumber`, portão de sessão por `useAuthContext` (sem sessão: "Para informar o código, fale com a gente" + WhatsApp, num subcomponente que só monta nesse caso) e `id="material"` nas duas formas; no modo do topo, vazio recusa ANTES da mutação com "Informe o código de rastreio.". +13 casos (17 → 30); o arquivo de teste ganhou os dublês de sessão e de `store_settings` (setup, nenhuma asserção tocada). **SPEC_DEVIATION** (no código): o bloco de baixo mantém a copy da feature 22 ("Registre o código…", "Registrar", "Digite o código…") porque os casos vivos dela a assertam. 2 mutantes (recusa local, portão de sessão), 2 mortos.

### T17: `OrderActionPanel`

**Where**: `apps/store/src/widgets/order-action/`
**Depends on**: T16
**Requirement**: DET-02, PEN-02..04 (no detalhe), MAT-01
**Done when**: um caso por estado (material · PIX pendente · PIX novo · pagamento perdido · cancelado · nenhum), e só um por vez ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `widgets/order-action` — `lib/orderActionState.ts` (decisão pura com o relógio injetado + `ACAO_PRIMARIA`, 13 casos) e `ui/OrderActionPanel.tsx` (9 casos, cada um prova que só o título do seu estado está na tela). Material = `OrderMaterialBlock variant="acao"`; cancelado = `OrderJourney` (dono único do texto do cancelamento). O prazo "até 11 de outubro" é `deadlineLabel`, que mora em `entities/order/lib/orderMeta.ts` (dois widgets o leem). O painel recebe `paymentHref` da página.

### T18: `/pedido/:id` reescrita como o detalhe

**Where**: `apps/store/src/pages/OrderConfirmationPage.tsx` (+ teste)
**Depends on**: T17
**Requirement**: DET-01..12
**Done when**: ordem dos blocos; os casos vivos de `CNF-03/05`, `STO-01`, feature 49 e `PIX-P3` continuam verdes **sem afrouxar**; o caso da timeline de 4 estágios é **invertido** para a jornada (`CNF-04` revogado no design); `pagamentoComDonoUnico` e `numeroDoPedidoComDonoUnico` verdes ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: página reescrita na ordem do design (cabeçalho · estado do topo · rastreio · jornada · material · peças · pagamento/entrega · ajuda · as duas ações). Os 35 casos antigos verdes **sem edição de asserção**; o arquivo ganhou o dublê de `store_settings` (a ajuda lê o WhatsApp) e +15 casos (`DET-01..04`, `DET-08`, `DET-10..12`, a ordem e a regra de uma pílula cheia nos estados novos). `entities/order/lib/orderMeta.ts` (`piecesLabel`, `orderDateLabel`, +4 casos). **SPEC_DEVIATION** (no código): o título continua "É nosso!"/"Pedido registrado" e o número fica na linha "PEDIDO #N · PAGO EM …" — `CNF-03` (`getByText(/NP-4821/)`, número uma vez só) e `PIX-P4-03` (literal em caixa alta "PEDIDO #N") impedem o "Pedido {número}" do `DET-01` sem afrouxá-los. Guardas de dono único verdes. 4 mutantes, 4 mortos.

> **Ajuste do orquestrador depois do lote 4 (DET-01, decisão do usuário em 2026-10-04):** o `SPEC_DEVIATION` do título saiu. O h1 passou a ser "Pedido {formatOrderNumber}" e a frase calorosa virou subtítulo por etapa (`confirmationHeadline` em `entities/order/lib/orderMeta.ts`: "É nosso!" pago e no ateliê, "Pedido registrado" sem pagamento, nada depois de enviado/entregue/cancelado/reembolsado); a promessa de e-mail do `STO-01` anda junto com o subtítulo. Cinco casos antigos **invertidos** (cabeçalho de pé, os dois de `PIX-P4-03`, a data do pagamento agora em "Aprovado em 27 jul", o não-pago agora em "Pedido registrado") — cada um ganhou asserção — e +5 casos por etapa na página, +5 na régua. Mutante (tirar o recorte de `shipped`) morto por 2 asserções.

### T19: `accountAttention`

**Where**: `apps/store/src/entities/order/lib/attention.ts`
**Depends on**: T18
**Requirement**: PEN-01..07
**Done when**: um caso por tipo; ordem pagamento → material e mais antigo primeiro; cancelado não gera pendência ✅
**Tests**: unit · **Gate**: full (store)

> **Resultado**: `entities/order/lib/attention.ts` (`accountAttention`, `AttentionItem` com `deadline` e `pieceName`) + 14 casos: os quatro tipos, 6d23h × 7d1min, recortes do material (sem peça que exige, não pago, já postado), cancelado nunca, a ordem do `PEN-06` (pagamento — pendente, expirado, perdido — antes de material, mais antigo primeiro) e o vazio.

### T20: `AttentionList`

**Where**: `apps/store/src/widgets/order-attention/`
**Depends on**: T19
**Requirement**: PEN-01..04, PEN-07
**Done when**: literais de título e botão por tipo; destino de cada botão; bloco ausente sem pendência ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `widgets/order-attention` (`AttentionList({ orders, now? })`) + 11 casos: literais e destinos por tipo (`orderPaymentPath`, `/pedido/:id#material`, `MATERIAL_GUIDE_PATH`, WhatsApp com `whatsappHref`), alvo de 44px em todo botão, `grid-cols-1` × `lg:grid-cols-2`, e o bloco inteiro ausente sem pendência.

### T21: `OrderList` (linhas no celular, colunas no `lg`)

**Where**: `apps/store/src/widgets/order-list/`
**Depends on**: T20
**Requirement**: LST-02, LST-03, LST-06, LST-07, LST-08, LST-10 (colunas)
**Done when**: linha inteira é link para `/pedido/:id`; `truncate` no título; plural de peças; vazio, esqueleto e erro com "Tentar de novo"; asserção positiva no celular **e** no `lg` (`L-029`) ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `widgets/order-list` (`OrderList({ orders, isLoading, isError, onRetry })`) + 11 casos. UMA árvore para os dois tamanhos (`grid-template-areas` muda no `lg`), com asserção positiva nas duas grades e no cabeçalho `hidden lg:grid`; `minmax(0,1fr)` na trilha do número; quadrado neutro sem foto; esqueleto de 3 linhas sem texto; erro com "Tentar de novo". Store após T21: 4084/246 verde.

### T22: `/conta` reescrita + rota `/conta/dados`

**Where**: `apps/store/src/pages/AccountPage.tsx`, `app/App.tsx`, `packages/core/src/routes/routes.ts` (`NON_INDEXABLE_PATHS`)
**Depends on**: T21
**Requirement**: LST-01, LST-04, LST-05, LST-09, LST-10
**Done when**: saudação com avatar `shrink-0` e e-mail `truncate`; abas com `aria-current`; coluna lateral no `lg`; sem sessão abre o login; `sitemapRoutes`, `reservedSlugs`, `routeSplitting`, `routing` verdes ✅
**Tests**: component · **Gate**: full (store) + quick (core)

> **Resultado**: `AccountPage` reescrita (uma árvore: `aside` com saudação, `nav` que é abas no celular e lista lateral no `lg`, ajuda; coluna principal com `AttentionList` + `OrderList` ou o painel provisório de "Meus dados" — nome, e-mail, "Sair da conta"). `/conta/dados` como rota irmã auto-fechada; `NON_INDEXABLE_PATHS` +1. Âncoras de contagem subidas ao número verdadeiro: `sitemapRoutes` 23 → 24, `core/routes` 8 → 9 exclusões; `routing` +1; `AccountPage.test.tsx` 5 → 24 (os 5 antigos sem edição de asserção; o dublê da consulta ganhou `isLoading`/`isError`/`refetch` com os padrões de antes). `text-green-600` saiu (`SIT-13`). ⚠️ **2 asserções vermelhas, de propósito e reportadas**: as metades positivas de `pagamentoComDonoUnico` ("`/conta` LINKA…") e `numeroDoPedidoComDonoUnico` ("a loja, em /conta") leem `pages/AccountPage.tsx`, e o link do pagamento e o número agora moram em `widgets/order-attention` e `widgets/order-list` — o guarda NÃO foi editado (decisão pendente).

### T23: `updateCustomerProfile` no contexto de auth + régua do perfil

**Where**: `packages/auth/src/AuthContext.tsx`, `apps/store/src/features/edit-profile/model/profileRefusal.ts`
**Depends on**: T22
**Requirement**: DAD-02, DAD-03
**Done when**: grava `name` + `phone` (só dígitos) com checagem de linhas afetadas, `full_name` no auth, contexto atualizado; régua recusa nome < 2 e telefone fora de 10–11 dígitos, com a frase de cada motivo ✅
**Tests**: unit (régua) · **Gate**: full (store)

> **Resultado**: `updateCustomerProfile({ name, phone })` (update + `.select()`; zero linhas ou erro → "Não foi possível salvar agora. Tente de novo."; depois `full_name` no auth e o contexto) e `patchCustomer(patch)` (o CPF gravado fora do contexto) em `AuthContext.tsx`; `Customer` passou a ser exportado. `updateDisplayName` intocado (os casos dele esperam sucesso com `data: null`). `features/edit-profile/model/profileRefusal.ts` (14 casos) e +4 em `features/auth/__tests__/authContext.test.tsx` (o `.select()` provado por ORDEM de chamada, não presença). Probe SQL como `authenticated` (rollback): nome+telefone gravam 1 linha, e-mail recusado com `42501`. Store 4116/246 → 4134/247; tsc 0 · 0.

### T24: `useCepLookup` muda para `entities/address`

**Where**: `apps/store/src/entities/address/api/useCepLookup.ts` (+ reexport em `features/checkout`)
**Depends on**: T23
**Requirement**: DAD-07
**Done when**: checkout continua verde sem editar teste; o teste do hook mudou de casa com ele (contagem igual) ✅
**Tests**: unit · **Gate**: full (store)

> **Resultado**: hook e teste (7 casos) movidos para `entities/address/api/`, barrel do slice exporta; `features/checkout/api/useCepLookup.ts` virou reexport puro — `DeliveryBlock` e os dublês de `DeliveryBlock.test`/`CheckoutPage.test` seguem no endereço de sempre, nenhum arquivo do checkout editado. Checkout + endereço: 19 arquivos / 462 casos verdes.

### T25: `ProfileCard` (dados pessoais + CPF uma vez)

**Where**: `apps/store/src/features/edit-profile/ui/ProfileCard.tsx`
**Depends on**: T24
**Requirement**: DAD-01..05, DAD-09
**Done when**: leitura × edição; e-mail com cadeado e literal; CPF mascarado travado × vazio editável (via `useSaveCustomerCpf`); falha mantém o digitado ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `features/edit-profile/ui/ProfileCard.tsx` (+ `lib/hiddenDocument.ts`, barrel) e 16 casos: leitura, "Editar" de 44px, e-mail e documento travados com cadeado e literais nos dois modos, CPF/CNPJ mascarados, CPF vazio com máscara e "Salvar CPF" pelo hook REAL (dublê no client), recusa do banco sem vazar a mensagem crua, recusas por campo via `aria-describedby`, falha mantendo o digitado. 4 mutantes; o que sobreviveu (a conferência local do dígito verificador) era DUPLICATA da que `useSaveCustomerCpf` já faz antes da rede — removida em vez de testada. Store → 4150/248.

### T26: `AddressCard`

**Where**: `apps/store/src/features/edit-address/ui/AddressCard.tsx`
**Depends on**: T25
**Requirement**: DAD-07, DAD-08, DAD-09
**Done when**: mostra o padrão ou "Nenhum endereço salvo"; edita com máscara e lookup; grava via `useSaveAddress`; aviso literal; `saved: false` mantém o formulário ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `features/edit-address/ui/AddressCard.tsx` + `model/addressRefusal.ts` (13 casos) + 10 casos do cartão. Linhas pelo dono que já existia (`addressLines`, `entities/order`); CEP só é consultado quando DIGITADO (abrir com o salvo não sobrescreve a rua); salvo → `setQueryData` + invalidação de `DEFAULT_ADDRESS_KEY` (o caixa lê o mesmo cache). **SPEC_DEVIATION** (no código): formulário próprio em vez do do checkout (acoplado ao `checkoutStore`). 5 mutantes; o sobrevivente (`toUpperCase` ao gravar) duplicava o do campo — removido. Store → 4173/250.

### T27: `AccountDataPanel` montado na página

**Where**: `apps/store/src/pages/AccountPage.tsx`
**Depends on**: T26
**Requirement**: DAD-01
**Done when**: `/conta/dados` monta os dois cards e "Sair da conta", **pela página real** (teste não remonta a árvore) ✅
**Tests**: component · **Gate**: full (store)

> **Resultado**: `AccountDataPanel` em `AccountPage.tsx` substitui o painel provisório — região "Dados pessoais" abraçando `ProfileCard`, `AddressCard` e o "Sair da conta" de 48px (`lg:hidden`); `updateCustomerProfile`/`patchCustomer` descem do contexto. +4 casos em `AccountPage.test.tsx` pela página real (dublês só em `useDefaultAddress` e `useSaveCustomerCpf`); os 24 de antes verdes sem edição de asserção. 4 mutantes de fiação, 4 mortos. Store → 4181/250 (+4 desta task; +4 de outra sessão entre as medições).

### T28: Acabamentos — bolha do WhatsApp e movimento

**Where**: `widgets/whatsapp-float`, páginas novas
**Depends on**: T27
**Requirement**: ACB-02, ACB-03
**Done when**: espaço reservado no fim das duas páginas; animações novas com par `motion-reduce:` ✅
**Tests**: component · **Gate**: build

> **Resultado**: `WHATSAPP_FLOAT_CLEARANCE = 'pb-36 md:pb-24'` em `widgets/whatsapp-float/lib/clearance.ts` (dono: a bolha), aplicado à `AccountPage` (as duas abas; `py` virou `pt`). No detalhe a bolha NÃO EXISTE (`WhatsAppFloat` já devolve `null` em `/pedido/`), então não há folga a reservar — a ausência ficou presa por teste (`/pedido/:id` e `/pedido/:id/pagamento`). Régua relacional no teste da bolha (`bottom-20`/`md:bottom-6`/`h-14` × a folga). Movimento: tudo que a feature criou já tinha par; as duas transições antigas do `OrderMaterialBlock` (agora no detalhe) ganharam `motion-reduce:transition-none`. Store → **4186/250**, tsc 0 · 0, lint store 2/2 · backoffice 24/4.

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7

Phase 1:  T01 → T02 → T03 → T04
Phase 2:  T05 → T06 → T07
Phase 3:  T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15
Phase 4:  T16 → T17 → T18
Phase 5:  T19 → T20 → T21 → T22
Phase 6:  T23 → T24 → T25 → T26 → T27
Phase 7:  T28
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T01–T04 | 1 função pura cada | ✅ |
| T05 | 1 migration (4 comandos coesos) + o guarda dela | ⚠️ coeso — o guarda mede exatamente o arquivo |
| T06, T07 | 1 função do handler cada | ✅ |
| T08 | 1 par de arquivos de token | ✅ |
| T09 | 2 hooks do mesmo slice | ⚠️ coeso |
| T10 | 1 componente + o guarda dele | ⚠️ coeso |
| T11–T17 | 1 componente/widget cada | ✅ |
| T18, T22, T27 | 1 página cada | ✅ |
| T19–T21, T23–T26 | 1 função/componente cada | ✅ |
| T28 | 2 ajustes de folga | ⚠️ coeso |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
| --- | --- | --- | --- |
| T01 | — | início da fase 1 | ✅ |
| T02..T04 | anterior | encadeado | ✅ |
| T05 | T04 | início da fase 2 | ✅ |
| T06, T07 | anterior | encadeado | ✅ |
| T08 | T07 | início da fase 3 | ✅ |
| T09..T15 | anterior | encadeado | ✅ |
| T16 | T15 | início da fase 4 | ✅ |
| T17, T18 | anterior | encadeado | ✅ |
| T19 | T18 | início da fase 5 | ✅ |
| T20..T22 | anterior | encadeado | ✅ |
| T23 | T22 | início da fase 6 | ✅ |
| T24..T27 | anterior | encadeado | ✅ |
| T28 | T27 | fase 7 | ✅ |

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01–T04 | regra pura `core` | unit | unit | ✅ |
| T05 | migration | guarda + probe | guarda + probe | ✅ |
| T06, T07 | edge function | unit | unit | ✅ |
| T08 | tokens | guarda existente | guarda existente | ✅ |
| T09 | hooks | unit | unit | ✅ |
| T10–T18, T20–T22, T25–T28 | componentes/páginas | component | component | ✅ |
| T19 | lib de `entities` | unit | unit | ✅ |
| T23 | contexto + régua | unit | unit (régua) | ✅ — `packages/auth` não tem runner; o método é fino e a regra mora na régua testada |
| T24 | hook movido | unit | unit | ✅ |
