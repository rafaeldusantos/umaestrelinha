# WI 92 · Plano de ondas

ONDAS: 01 | 02,03 | 04 | 05,08 | 06,07

Grafo (de `Depende de` / `Habilita` de cada tarefa):
- 01 → 02 (coluna, `AddonConfig.discountPercent` e a função do preço com desconto)
- 01 → 03 (idem)
- 02 → 04 (`bundleTotal` com desconto, para a paridade bloco = sacola)
- 03 → 04 (a entrada e a saída do desconto casado em `resolveOrderPricing`, a regra, `core/pricing` sem `import type` de pacote)
- 04 → 05 · 04 → 07 · 04 → 08 (as colunas novas do pedido e `unit_price` = cobrado)
- 05 → 06 · 05 → 07 (a regra única do resumo em `core/orders`)

## W1: 01
- 01 posse: supabase/migrations/ (a migration nova de `discount_percent`), packages/core/src/buy-together/rules.ts, packages/core/src/buy-together/<folha nova da função do preço com desconto>, packages/core/src/buy-together/index.ts, packages/core/src/buy-together/availability.ts, packages/core/src/buy-together/__tests__/, packages/supabase/src/types/buyTogether.ts, apps/backoffice/src/features/product-form/, apps/backoffice/src/features/buy-together-lists/api/useBuyTogetherLists.ts, apps/backoffice/src/pages/admin/AdminProductFormPage.compreJunto.test.tsx, apps/store/src/shared/lib/__tests__/<guarda de schema nova>

## W2: 02, 03
- 02 posse: packages/core/src/buy-together/total.ts, packages/core/src/buy-together/__tests__/total.test.ts, apps/store/src/entities/product/, apps/store/src/widgets/product-buy-bar/, apps/store/src/pages/__tests__/ProductPageBuyTogether.test.tsx
- 03 posse: packages/core/src/payment/, packages/core/src/pricing/, packages/core/src/buy-together/<folha nova da regra do desconto casado>, packages/core/src/buy-together/index.ts, packages/core/src/buy-together/availability.ts, packages/core/src/buy-together/__tests__/purity.test.ts, apps/store/src/entities/cart/, apps/store/src/widgets/cart-drawer/, apps/store/src/features/checkout/model/useCheckoutTotals.ts, apps/store/src/features/checkout/ui/OrderSummary.tsx, .specs/STATE.md
- 02 não toca o barrel `index.ts` nem `purity.test.ts` (são da 03 nesta onda); 03 não toca `total.ts` nem `entities/product/`.

## W3: 04
- 04 posse: supabase/migrations/ (a migration nova de `orders`/`order_items`), supabase/functions/checkout/, supabase/functions/mercado-pago/, packages/supabase/src/types/index.ts, apps/store/src/features/checkout/lib/, apps/store/src/features/checkout/api/useCreatePayment.ts, apps/store/src/features/order-payment/, packages/core/src/payment/__tests__/displayedEqualsCharged.test.ts, packages/core/src/buy-together/__tests__/<teste novo de paridade bloco = sacola>, .specs/work-items/92-desconto-da-compra-casada/probes/

## W4: 05, 08
- 05 posse: packages/core/src/orders/<folha nova do resumo>, packages/core/src/orders/__tests__/, apps/store/src/entities/order/, supabase/functions/send-notification/
- 08 posse: supabase/migrations/ (a migration nova da RPC `buy_together_adoption`), apps/backoffice/src/features/buy-together-adoption/, apps/backoffice/src/pages/admin/AdminBuyTogetherAdoption*, apps/store/src/shared/lib/__tests__/compreJuntoAdesaoSchema.test.ts, .specs/work-items/92-desconto-da-compra-casada/probes/05-adesao*
- 05 não cria migration; 08 é a única migration da onda.

## W5: 06, 07
- 06 posse: apps/backoffice/src/pages/admin/AdminOrderPage.tsx, apps/backoffice/src/pages/admin/AdminOrderPage*.test.tsx, apps/store/src/entities/product/ui/__tests__/tomDoCompreJunto.test.ts
- 07 posse: supabase/migrations/ (a migration nova que recria `order_list`), apps/mobile-adm/src/entities/order/, apps/mobile-adm/src/widgets/order-detail/, .specs/features/74-mobile-adm-pedidos/probes/02-lista.ts
- 07 é a única migration da onda; 06 só CITA `send-notification/render/layout.ts` na âncora do guarda, sem editar.

Migrations: cada tarefa usa o maior prefixo existente em `supabase/migrations/` + 1 hora; nunca duas migrations do WI na mesma onda.
Nenhuma dependência relaxada.
