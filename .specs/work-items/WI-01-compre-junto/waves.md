# WI-01 · plano de ondas

Grafo (de `Depende de` / `Habilita`): 01→02, 01→03, 01→07, 03→04, 03→07, 04→05, 05→06 (a 06 também usa a página da 01).

ONDAS: 01 | 02,03 | 04,07 | 05 | 06

## W1: 01
- 01 posse: supabase/migrations/ (migration nova das tabelas do Compre Junto), supabase/CLAUDE.md, packages/core/src/buy-together/ (arquivos e barrel index.ts), packages/core/package.json, packages/core/CLAUDE.md, packages/supabase/src/types/index.ts, apps/backoffice/src/features/buy-together-lists/, apps/backoffice/src/pages/admin/ (página de Listas), apps/backoffice/src/app/App.tsx, apps/backoffice/src/widgets/admin-layout/model/navItems.ts e seus testes, apps/backoffice/CLAUDE.md, apps/store/src/shared/lib/__tests__/ (guarda de schema novo)

## W2: 02, 03
- 02 posse: supabase/migrations/ (migration de conversão, arquivo próprio), apps/backoffice/src/pages/admin/AdminProductFormPage.tsx, apps/backoffice/src/features/product-form/, apps/backoffice/src/entities/product/api/useAdminProducts.ts, fixture buy_together_ids do painel (useProductForm.test.ts), apps/backoffice/CLAUDE.md
- 03 posse: packages/core/src/buy-together/ (só arquivos NOVOS e os exports acrescentados ao barrel), apps/store/src/entities/product/ (ui, model, lib, api, index.ts, inclusive lib/__tests__/cardSelect.test.ts, de onde sai o fixture buy_together_ids), apps/store/src/pages/ProductPage.tsx, apps/store/CLAUDE.md. A 03 emite view_item_list e select_item do bloco com os helpers existentes de core/analytics e shared/lib/analytics, sem editá-los
- observação: 02 e 03 não dividem arquivo (painel × loja/core; o fixture `cardSelect.test.ts` é da 03); o `apps/backoffice/CLAUDE.md` é só da 02 nesta onda; a 03 só acrescenta a `core/buy-together`, cujo barrel nasceu na 01 (onda anterior).

## W3: 04, 07
- 04 posse: apps/store/src/entities/cart/, apps/store/src/entities/product/model/useProductPurchase.tsx, apps/store/src/entities/product/ui/{ProductInfo,EngravingField}.tsx, apps/store/src/widgets/product-buy-bar/, apps/store/src/widgets/cart-drawer/, apps/store/src/pages/ProductPage.tsx, packages/core/src/analytics/ e apps/store/src/shared/lib/analytics/ (só o add_to_cart; a exibição e a escolha do bloco são da 03), apps/store/CLAUDE.md
- 07 posse: packages/core/src/buy-together/settings.ts (arquivo novo) e o export dele, a pasta do bloco em apps/store/src/entities/product/ui/ (somente os arquivos do bloco e os novos), apps/backoffice/src/pages/admin/ (página de Listas, só o cartão da forma) e features/buy-together-lists/, apps/backoffice/CLAUDE.md
- 07 NÃO toca: ProductInfo, ProductPage, ProductBuyBar, cartStore, useProductPurchase, core/analytics, apps/store/CLAUDE.md. A 04 NÃO toca a pasta do bloco nem a página do painel.

## W4: 05
- 05 posse: supabase/migrations/ (colunas de order_items), supabase/functions/checkout/, apps/store/src/features/checkout/lib/buildOrderPayload.ts, apps/store/src/entities/order/, apps/backoffice/src/pages/admin/AdminOrderPage.tsx, apps/backoffice/src/entities/order/api/useAdminOrder.ts, packages/supabase/src/types/index.ts, supabase/CLAUDE.md, apps/store/CLAUDE.md, guardas novos em apps/store/src/shared/lib/__tests__/

## W5: 06
- 06 posse: supabase/migrations/ (RPC do relatório), apps/backoffice/src/pages/admin/ (aba Adesão), apps/backoffice/src/features/ (relatório), apps/backoffice/src/app/App.tsx, navItems.ts, apps/store/src/shared/lib/__tests__/marcacaoSoPorAcao.test.ts, CLAUDE.md (raiz), .specs/STATE.md, apps/store/CLAUDE.md, apps/backoffice/CLAUDE.md

relaxada: nenhuma.
