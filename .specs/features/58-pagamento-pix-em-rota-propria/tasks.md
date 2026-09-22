# 58 · Pagamento PIX em rota própria — Tasks

**Spec**: `spec.md` · **Design**: `design.md`

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec. Diretrizes encontradas: `CLAUDE.md` (raiz),
> `apps/store/CLAUDE.md`, `packages/core/CLAUDE.md`, `supabase/CLAUDE.md`, `DESIGN.md`,
> `apps/store/vitest.config.ts`, `apps/backoffice/vitest.config.ts`.

| Camada | Tipo de teste | Expectativa de cobertura | Local | Comando |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core`) | unit | Toda AC que a camada responde + toda borda listada; módulo alcançável pelo Deno com `.ts` explícito | `packages/core/src/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Edge functions | unit de `handlers.ts` (`AD-004`) | Caminho feliz + cada recusa; nunca pelo `index.ts` | `supabase/functions/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/functions test` |
| Loja — páginas, hooks e UI | component (RTL/jsdom) | Um caso por AC; forma por **token exato** (`L-034`), nunca `toContain` de prefixo | `apps/store/src/**/__tests__/*` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Painel | component | Um caso por AC tocada | `apps/backoffice/src/**/__tests__/*` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Guardas de disco e de migration | unit que lê arquivo do disco | **Âncora dupla** (arquivos lidos + a forma encontrada) e **sensor por mutação** em cada asserção; remover comentário com CRLF **e** LF | `apps/store/src/shared/lib/__tests__/*` | store |
| Gravação no banco | probe real | `AD-012`: tipo escrito à mão é afirmação — provar com escrita de verdade contra o banco local | — | `supabase db query` / inserção real |
| Layout e medida | **nenhum em jsdom** | jsdom devolve 0 para layout; vai para a prova em navegador, registrada em `validation.md` | — | Chromium, 390×844 e 1440 |

**Gate de cada task**: a suíte do(s) workspace(s) que ela toca, com exit code **fora de pipe**. O gate
de qualquer task que mexa em `apps/backoffice` ou em `packages/core` **inclui a suíte da loja** — os
guardas de lá varrem os dois apps (custou três features seguidas: `51`, `53`, `55`).

---

## Fase 1 — O número do pedido tem dono

### T01 · `formatOrderNumber` em `packages/core/src/orders`

- **Faz**: módulo puro, sem import nenhum, exportado por `@estrelinha/core/orders`.
- **Cobre**: `PIX-P4-03`, `PIX-P4-04`.
- **Done when**: `format.test.ts` cobre dígito puro (`0244` → `#0244`), legado (`NS-169`, `NP-…`),
  valor que já tem `#` (não duplica), vazio e `null`; `pnpm --filter @estrelinha/core test` verde.

### T02 · Migration da sequência + guarda de schema

- **Faz**: `supabase/migrations/<ts>_58-order-number-sequence.sql` — `create sequence if not exists
  orders_number_seq start with 170` + `default lpad(nextval(…)::text, 4, '0')` em
  `orders.order_number`. Aditiva, idempotente, **sem escrita de dado**.
- **Cobre**: `PIX-P4-01`, `PIX-P4-02`.
- **Done when**: `orderNumberSchema.test.ts` lê a migration do disco e assere sequência, número
  inicial, `lpad(…,4,'0')`, ausência de `insert/update/delete` e a permanência do índice único —
  **cada asserção com sensor por mutação**; `supabase db reset` aplica sem erro.

### T03 · A edge function para de cunhar número

- **Faz**: `supabase/functions/checkout/handlers.ts` deixa de mandar `order_number` e perde
  `sufixoAleatorio`.
- **Cobre**: `PIX-P4-01`, `PIX-P4-02`.
- **Done when**: `createOrder.test.ts` **inverte** a régua — deixa de exigir `/^NP-/` e passa a
  exigir que a linha gravada **não** traga `order_number` (o banco é o dono). Sem a inversão, o
  teste ficaria verde a favor do comportamento que a feature remove (lição da `41`).

### T04 · As superfícies passam a citar o número pelo dono

- **Faz**: `/pedido/:id` (loja), lista e detalhe do painel, e
  `supabase/functions/send-notification/render/vars.ts` chamam `formatOrderNumber`; import relativo
  com `.ts` explícito no lado Deno.
- **Cobre**: `PIX-P4-03`, `PIX-P4-04`.
- **Done when**: `numeroDoPedidoComDonoUnico.test.ts` recusa `#` colado à mão (interpolação e
  concatenação) fora do dono, **com a metade positiva** — os três consumidores chamam o formatador;
  âncora dupla; suítes de store, backoffice e functions verdes.

### T05 · A busca do painel aceita as três grafias

- **Faz**: o termo perde o `#` antes de virar filtro.
- **Cobre**: `PIX-P4-05`.
- **Done when**: `orderList.test.ts` prova `#0244`, `0244` e `244` achando o mesmo pedido, e que a
  busca por outras colunas não regride.

---

## Fase 2 — A rota do pagamento

### T06 · `widgets/checkout-header`

- **Faz**: extrai `CheckoutHeader` de `pages/CheckoutPage.tsx` para widget com barrel.
- **Cobre**: pré-requisito de `PIX-P1-02`.
- **Done when**: o checkout renderiza idêntico (nenhuma asserção existente muda) e o widget tem teste
  próprio de marca + "Ambiente seguro".

### T07 · `usePixPayment` — a máquina, sem UI

- **Faz**: move timer, Realtime, a pergunta de 5s da convidada, copiar e regenerar de
  `PixPayment.tsx` para `features/order-payment/model/usePixPayment.ts`, com o estado discriminado
  por literal de **string** (`strictNullChecks: false` não estreita booleano).
- **Cobre**: `PIX-P1-03`, `PIX-P1-04`, `PIX-P1-07`, `PIX-P2-01`, `PIX-P2-02`, `PIX-P2-03`.
- **Done when**: com relógio falso, `slow` é `false` aos 7,9s e `true` aos 8s; timeout vira `failed`;
  expiração vira `expired`; `generate` reusa o mesmo `orderId`; aprovação por Realtime **e** por
  poll viram `approved`.

### T08 · `PaymentProgress` — os dois passos nomeados

- **Faz**: componente único consumido pelas duas páginas.
- **Cobre**: `PIX-P1-01`, `PIX-P1-07`.
- **Done when**: o passo 1 ativo não marca o 2; o passo 2 ativo mostra o 1 concluído **com o número
  do pedido**; `slow` acrescenta a linha sem remover os passos; nenhuma barra de progresso.

### T09 · `PixSurface` — pronto, expirado, falha, confirmado

- **Faz**: o desenho dos quatro estados, conforme os boards 58 C/D/E/F.
- **Cobre**: `PIX-P1-03`, `PIX-P2-01`, `PIX-P2-03`, `PIX-P2-04`, `PIX-P2-05`.
- **Done when**: cada estado tem caso; o tempo é `ink` acima de 5 min e `primary` abaixo, por token
  exato; nenhuma classe de vermelho nem de `animate-pulse`; cada estado tem **uma** pílula cheia.

### T10 · A rota `/pedido/:id/pagamento`

- **Faz**: `pages/OrderPaymentPage.tsx`, rota `lazy` fora do `StoreLayout`, entrada em
  `NON_INDEXABLE_PATHS`, âncoras de contagem dos guardas de rota atualizadas.
- **Cobre**: `PIX-P1-03`, `PIX-P1-04`, `PIX-P1-05`, `PIX-P1-06`, `PIX-P2-04`.
- **Done when**: aprovado, cancelado e cartão redirecionam para `/pedido/:id`; pedido inexistente cai
  na recusa existente; a tela não contém o CTA do checkout nem os blocos; `sitemapRoutes`,
  `routeSplitting` e `routes` verdes com as contagens novas.

---

## Fase 3 — O checkout entrega o bastão

### T11 · O CTA vira tela de progresso e navega

- **Faz**: `CheckoutPage` renderiza `PaymentProgress` enquanto cria o pedido e navega para a rota
  nova; `PaymentBlock` deixa de trocar o bloco 3 pela superfície do PIX; a limpeza de carrinho migra
  para a página de pagamento **com o recorte** de `PIX-P1-08`.
- **Cobre**: `PIX-P1-01`, `PIX-P1-02`, `PIX-P1-05`, `PIX-P1-08`.
- **Done when**: asserção de **ordem** — `navigate` acontece antes de qualquer `create-payment`;
  falha de criação volta ao checkout com carrinho e rascunho intactos; `NeedsOtpError` continua no
  desafio; pagar pedido de outro rascunho **não** limpa o carrinho; o caminho de **cartão** fica sem
  uma linha alterada.

### T12 · `/pedido/:id` pendente ganha "Pagar com PIX"

- **Cobre**: `PIX-P3-01`, `PIX-P3-02`, `PIX-P3-03`.
- **Done when**: pendente + PIX mostra o botão levando à rota; "Acompanhar pedido" é contorno e a
  tela tem **uma** pílula cheia; pedido pago não tem o botão.

### T13 · `/conta` linka, e `PixPayment` é apagado

- **Faz**: o diálogo de `/conta` vira link para a rota; `features/checkout/ui/PixPayment.tsx` sai do
  disco e do barrel.
- **Cobre**: `PIX-P3-04`.
- **Done when**: `pagamentoComDonoUnico.test.ts` recusa qualquer superfície de PIX fora de
  `features/order-payment` e o retorno de `PixPayment.tsx`, com a metade positiva (o dono chama
  `useCreatePayment`); `/conta` não monta pagamento nenhum.

---

## Fase 4 — Prova e fecho

### T14 · Prova real (banco + navegador)

- **Faz**: dois pedidos criados de verdade no banco local (números `0170` e `0171`); percurso
  completo em Chromium a 390×844 e 1440, com os cinco estados forçados por interceptação; escreve
  `validation.md` com as medidas.
- **Cobre**: `PIX-P4-01`, `PIX-P4-02` e a lista *O que só o navegador prova*.

### T15 · Baselines, decisões e commits

- **Faz**: mede os cinco workspaces **um por vez**, com exit code fora de pipe; atualiza as baselines
  do `CLAUDE.md`, o `apps/store/CLAUDE.md`, e registra `AD-042` (a superfície de pagamento tem um
  dono, e é a rota) e `AD-043` (o número do pedido é do banco) na `STATE.md`; fecha `BL-031`.
- **Done when**: nenhuma regressão contra a baseline de entrada **medida na hora**, `tsc` em 0 nos
  dois apps, `pnpm build` verde, e `packages/core/src/payment/**` com zero arquivos alterados.

---

## Dependências

```
T01 ─┬─ T04 ── T05
T02 ─┴─ T03
T06 ── T08 ─┬─ T10 ── T11 ── T12 ── T13 ── T14 ── T15
T07 ── T09 ─┘
```

- T01 e T02 são independentes entre si e abrem a fase 1.
- T06/T07 podem correr antes de T08/T09; T10 depende de T08 e T09.
- T11 depende de T10 (a rota precisa existir antes de alguém navegar para ela).
- T14 depende de tudo; T15 fecha.

**Total: 15 tasks.**
