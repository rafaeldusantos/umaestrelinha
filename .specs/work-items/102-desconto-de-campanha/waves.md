# WI 102 · plano de ondas

ONDAS: 01 | 02,04 | 03,05,06,07 | 08,09

## Grafo

- `02 ← 01` (entities/campaign do painel, core/campaigns)
- `03 ← 01` (porta de escrita em lote; links "Ver as peças")
- `04 ← 01` (tabelas e leitura pública, core/campaigns)
- `05 ← 01 + 04` (core/campaigns; preço efetivo, entities/campaign da loja, selo em linha)
- `06 ← 01 + 04`
- `07 ← 01 + 04`
- `08 ← 01 + 05` (`supabase/functions/_shared/campaigns.ts`); depois de 06 só por posse de arquivo (`core/page/serve.ts`, `apps/store/server/page.ts`)
- `09 ← 01 + 05` (`resolveOrderPricing` com `campaign`, `couponRefusal`, `_shared/campaigns.ts`)

A 03 está na W3, e não na W2, só por posse de arquivo: ela e a 02 editariam `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts`.

## W1: 01
- 01 posse: supabase/migrations/ (prefixo a partir de 20261130120000), packages/core/src/campaigns/, packages/supabase/src/types/campaign.ts, packages/supabase/src/types/index.ts, apps/backoffice/src/entities/campaign/, apps/backoffice/src/pages/admin/AdminCampaigns*, apps/backoffice/src/features/campaign-form/, apps/backoffice/src/shared/ui/ (campo de data e hora), apps/backoffice/src/widgets/admin-layout/model/navItems.ts, apps/backoffice/src/app/App.tsx, apps/backoffice/src/**/__tests__ dos guardas de rota e movimento, apps/store/src/shared/lib/__tests__/ (guardas novos de schema e paridade; marcacaoSoPorAcao.test.ts), .specs/work-items/102-desconto-de-campanha/probes/

## W2: 02, 04
- 02 posse: apps/backoffice/src/features/product-form/, apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts
- 04 posse: apps/store/src/entities/campaign/, apps/store/src/entities/product/ (mapProduct, ProductCard, ColorPreview, ProductInfo, o selo), apps/store/src/features/category-filters/, apps/store/src/features/search/, apps/store/src/features/abandoned-cart/, apps/store/src/shared/lib/analytics/, apps/store/src/widgets/product-buy-bar/, apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx, apps/store/src/shared/lib/__tests__/ (guardas novos do selo e da vigência na loja), apps/store/src/entities/product/lib/__tests__/

## W3: 03, 05, 06, 07
- 03 posse: apps/backoffice/src/features/bulk-edit/, apps/backoffice/src/features/product-list/, apps/backoffice/src/entities/product/api/productQuery.ts, apps/backoffice/src/entities/product/api/useAdminProducts.ts, apps/backoffice/src/pages/admin/AdminProductsPage.tsx, apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts
- 05 posse: packages/core/src/payment/, packages/core/src/coupons/, packages/core/src/buy-together/, packages/core/src/hooks/useCoupons.ts, packages/core/src/shipping/quotePayload.ts, packages/core/src/orders/summary.ts, packages/supabase/src/types/ (arquivos de pedido), supabase/migrations/ (prefixo a partir de 20261130130000), supabase/functions/checkout/, supabase/functions/mercado-pago/, supabase/functions/_shared/campaigns.ts, supabase/functions/send-notification/, apps/store/src/entities/cart/, apps/store/src/features/checkout/, apps/store/src/widgets/cart-drawer/ (menos CrossSell.tsx), apps/store/src/entities/order/, apps/mobile-adm/src/entities/order/model/linha.ts, apps/backoffice/src/pages/admin/AdminOrderPage.tsx (só a linha do desconto de campanha no resumo), apps/store/src/features/checkout/lib/__tests__/
- 06 posse: packages/core/src/page/, packages/core/src/routes/, packages/core/src/seo/, packages/core/src/sitemap/, apps/store/server/, apps/store/src/app/App.tsx, apps/store/src/pages/ (página nova de ofertas), apps/store/vercel.json, apps/store/CLAUDE.md, apps/store/src/app/__tests__/, apps/store/src/pages/__tests__/
- 07 posse: packages/core/src/home/, supabase/migrations/ (prefixo a partir de 20261130140000), apps/store/src/widgets/ (widget novo do bloco e o renderer da Home), apps/backoffice/src/features/home-composition/, apps/store/src/shared/lib/__tests__/homeSections.test.ts
- 03 relaxada: depende só da 01; está na W3 por posse de `animacaoRespeitaMovimento.test.ts` com a 02, não por código.
- 07 relaxada: a 07 não edita `animacaoRespeitaMovimento.test.ts` (posse da 03 nesta onda); o par `motion-reduce:` vai na linha e a lacuna de escopo do guarda é registrada no retorno.

## W4: 08, 09
- 08 posse: packages/core/src/shopping/, packages/core/src/page/serve.ts, apps/store/server/page.ts, apps/store/server/__tests__/, supabase/functions/google-feed/
- 09 posse: supabase/functions/order-proposals/, supabase/functions/checkout/proposal.ts, packages/core/src/proposals/, apps/backoffice/src/features/order-proposal/, apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts, apps/mobile-adm/src/features/order-proposal/
- 08 relaxada: depende da 06 só por posse de `core/page/serve.ts` e `apps/store/server/page.ts`; o ramo `/ofertas` já está fixado nas Decisões do spec.md (T6) e a 08 não precisa do código da 06 para verificar.
