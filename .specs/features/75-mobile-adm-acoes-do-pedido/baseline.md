# 75 — Baseline de entrada (T01, `01-baseline-e-medicao`)

Medida em **2026-10-24**, worktree `store-75-mobile-adm-acoes-do-pedido`, branch
`feat/75-mobile-adm-acoes-do-pedido` sobre `2a285bab` (merge da `74` em `feature/mobile-adm`), com a
árvore parada: `git status` sem nada em `apps/`, `packages/`, `supabase/` ou `tools/`
(`git diff --stat HEAD -- apps packages supabase tools` vazio). Só havia `.specs/` alterado
(`BACKLOG.md`, `STATE.md`, `spec.md`, e `design.md`/`tasks.md` da `75` novos). Um workspace por vez,
exit code capturado **fora de pipe** (saída redirecionada para arquivo e `$?` lido depois), e
`--testTimeout=20000` **sem o `--`** nos seis.

## Suítes

| Workspace | Comando | Arquivos | Testes | Exit |
| --- | --- | --- | --- | --- |
| store | `pnpm --filter @estrelinha/store test --testTimeout=20000` | 319 | 5852 | 0 |
| backoffice | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` | 210 | 3671 | 0 |
| mobile-adm | `pnpm --filter @estrelinha/mobile-adm test --testTimeout=20000` | 61 | 811 | 0 |
| core | `pnpm --filter @estrelinha/core test --testTimeout=20000` | 158 | 4016 | 0 |
| functions | `pnpm --filter @estrelinha/functions test --testTimeout=20000` | 21 | 957 | 0 |
| catalog-import | `pnpm --filter @estrelinha/catalog-import test --testTimeout=20000` | 23 | 512 | 0 |
| **Total** | | **792** | **15819** | |

Bate **exatamente** com a linha *Testes* do `CLAUDE.md` raiz (15819 em 792, workspace por workspace,
remedida depois do QA da `74`).

## Tipos

| Projeto | Erros | Exit |
| --- | --- | --- |
| `apps/store/tsconfig.app.json` | 0 | 0 |
| `apps/store/tsconfig.server.json` | 0 | 0 |
| `apps/backoffice/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.app.json` | 0 | 0 |
| `apps/mobile-adm/tsconfig.node.json` | 0 | 0 |
| `tools/catalog-import/tsconfig.json` | 0 | 0 |
| `packages/core/tsconfig.json` | **11** (herdados) | 2 |

Os 11 de `packages/core` são os do `CLAUDE.md`, arquivo por arquivo: `home/__tests__/carousel` 5,
`pickHomeBanners` 1, `pickHomeCollections` 1, `sitemap/__tests__/urls` 2 e
`packages/supabase/src/client.ts` 2. Um erro novo em qualquer projeto acima, ou um 12º em `core`, é
regressão da `75`.

## Lint (`npx eslint .` em cada app)

| App | Erros / warnings | Exit |
| --- | --- | --- |
| store | 2 / 2 | 1 |
| backoffice | 23 / 5 | 1 |
| mobile-adm | 0 / 0 | 0 |
| **Total** | **25 / 7** | |

Bate com a linha *Lint* do `CLAUDE.md` raiz.

## Leitura

A tabela do `CLAUDE.md` **não está envelhecida**: as três medidas batem. Nenhuma divergência a
declarar. O gate da `75` compara contra estes números.

## Pontos de comparação gravados antes de mover (T12, T30, `MAA-27`)

SHA-256 no `2a285bab`:

| Arquivo | SHA-256 |
| --- | --- |
| `apps/backoffice/src/entities/order/api/useAdminOrders.test.ts` | `f69d4fe1b58b539af92179d95ffae6dfc027f38528178825c6fcf8f2811d2440` |
| `apps/backoffice/src/entities/order/api/notifyOrder.test.ts` | `924b1b644bcc057587f5a5b1a6e2fa49d28d2fbd7835a015c77a715f3e2af85b` |
| `apps/backoffice/src/features/order-list/model/__tests__/orderList.test.ts` | `0290000da2b33b894287c2c08bea22de8e085486599641f689d55c88e470d798` |
| `apps/backoffice/src/app/__tests__/regrasDoPedidoNoCore.test.ts` | `78a32a2ec4b28c560bff0a4859df1578d5bc4e85023a6d980d1e99626e98df68` |
| `apps/backoffice/src/features/order-list/model/chargeMaterial.ts` | `8c1ba31e445760e8a9bb6b0b6b99416606946462608f0bdd03b73d3793edecfa` |
| `apps/backoffice/src/entities/order/api/useAdminOrders.ts` | `57114e07ee20d7bfbd6d2898610bfba256db8ea6c71290926abb5587b8a9ab9f` |

`git diff HEAD -- apps/backoffice/src/entities/order/api/useAdminOrders.test.ts` vazio na abertura.

### O texto de `chargeMaterial.ts` (antes de subir para `core`)

- `chargeMaterialText(row, now?)`: primeiro nome = `(customer_name ?? '').trim().split(/\s+/)[0] || 'Oi'`.
  - `material_enviado`: "Oi, {nome}! Aqui é a Adri, da Uma Estrelinha. Vi que você já postou o
    material do pedido {formatOrderNumber}. Assim que ele chegar aqui eu te aviso e começo a peça.
    Qualquer dúvida, é só me chamar."
  - demais: "Oi, {nome}! Aqui é a Adri, da Uma Estrelinha. Estou com o seu pedido {formatOrderNumber}
    guardado, esperando o material chegar para começar.{quando} Se precisar de ajuda para preparar ou
    postar, me conta que eu te explico com calma. Sem pressa nenhuma." — `{quando}` = " Ele foi feito
    faz um tempinho, então queria saber se está tudo bem por aí." só quando
    `queueAge(queueSince(row), now).tier === 'stale'`.
  - Depende de `queueSince` de `@/entities/order/api/orderQuery` (do painel) — subir para `core` leva
    essa dependência junto ou a recebe por parâmetro.
- `chargeMaterialUrl(row, phone?, now?)`: `normalizeBrPhone(phone)` ⇒ `https://wa.me/{n}?text=…`, sem
  número ⇒ `https://wa.me/?text=…`. `whatsappNumber` é reexport de `normalizeBrPhone`.
- Consumidores hoje: `features/order-list/index.ts`, `AdminOrdersPage.tsx`, `AdminOrderPage.tsx`,
  `entities/order/api/orderQuery.ts`, `orderList.test.ts` e `packages/core/src/notifications/__tests__/copy.test.ts`.

### As sequências de escrita do painel (`useAdminOrders.ts`)

- `updateStatus(id, status, note?)` (linhas 122–143): `from` vem de
  `orders.find(o => o.id === id)?.status` (**o cache da lista**, linha 123) → `update({ status })` →
  `insert` em `order_status_history` com `from_status: currentOrder?.status ?? null` →
  `notifyOrder(id, 'order_status_changed')` → `fetchOrders()` + `fetchStatusCounts()`.
- `cancelOrder` (linha 145): mesma leitura do `from` pelo cache (linha 146).
- `addTrackingCode(id, trackingCode, carrier)` (linhas 164–174): `update({ tracking_code,
  shipping_carrier: carrier })` → `notifyOrder(id, 'order_status_changed')` → `fetchOrders()` (sem
  `fetchStatusCounts`).
- `setMaterialStatus(id, status)` (linhas 183–206): RPC `set_material_status` → resultado `{ ok,
  reason }` → `notifyOrder(id, 'material_status_changed')` → `fetchOrders()` + `fetchStatusCounts()`.
- **`shipping_carrier` com o campo vazio**: `AdminOrderPage.tsx:109` chama
  `addTrackingCode(order.id, tracking.trim(), carrier.trim())` — com a transportadora em branco o
  painel grava **string vazia**, não `null`.

## Banco local (para os probes da T29)

Medido em 2026-10-24 contra `supabase_db_uma-estrelinha-store` (`public.orders`, 54 pedidos):

| status | material_status | retirada | rastreio | payment_status | pedidos |
| --- | --- | --- | --- | --- | --- |
| cancelled | aguardando_material | não | não | cancelled | 1 |
| delivered | nao_aplicavel | — | não | approved | 3 |
| delivered | nao_aplicavel | — | sim | approved | 21 |
| paid | aguardando_material | — | não | approved | 12 |
| pending | aguardando_material | não | não | approved | 1 |
| pending | aguardando_material | não | não | cancelled / expired / rejected | 1 / 1 / 2 |
| pending | material_enviado | não | não | approved | 1 |
| pending | nao_aplicavel | não / — | não | approved / expired / rejected | 2 / 4 / 1 |
| shipped | nao_aplicavel | — | não / sim | approved | 1 / 3 |

(`—` em retirada = `shipping_service_id` nulo.)

O que **não existe** no banco local e a T29 precisa semear (`P75-…`): `material_recebido`,
`em_producao`, `separating`, `processing`, um `paid` + `material_enviado`, e uma retirada
(`shipping_service_id = 'retirada'`). Dos 24 com rastreio, **todos** têm `shipping_carrier` nulo
(vieram do importador) — nenhum com string vazia. 53 de 54 têm `customer_phone`.

## Edge runtime local (R7, TQ3)

- `POST /functions/v1/send-notification` sem auth responde **503** com
  `{"message":"name resolution failed"}` — **não** o `401` de worker vivo.
- **Não há container `supabase_edge_runtime_uma-estrelinha-store`** (nem parado: `docker ps -a` só
  mostra `supabase_edge_runtime_ProductDock`, de outro projeto). As outras 12 peças da instância
  estão de pé há 2 dias. Sem container, não há `Mounts` a registrar.
- **Não houve reinício.** A condição (2) da TQ3 — o 503 citar um arquivo que existe no disco — não
  se cumpre: o 503 é do Kong não resolvendo o host do edge runtime, não um bind-mount obsoleto.
  Fica para quem orquestra decidir antes da T29 (que depende de `send-notification` viva): subir o
  edge runtime exige `supabase stop` (sem `--all`) + `supabase start`, que derruba a instância das
  outras sessões e, se sair do worktree, monta as functions de um diretório que será removido depois
  do merge.

Logs brutos da medição: `/private/tmp/claude-503/-Users-rafael-santos-Projetos-uma-estrelinha-store/ae28b1b8-258f-44bc-af5f-95a235a2a95a/scratchpad/b75/`.
