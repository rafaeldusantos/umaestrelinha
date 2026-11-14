# 99 · Plano de ondas

ONDAS: 01,02 | 03,04 | 05,06,07,08 | 09 | 10 | 11

## Grafo

- 03 ← 01
- 04 ← 01
- 05 ← 01 + 03
- 06 ← 01 + 03
- 07 ← 01 + 03
- 08 ← 01 + 02
- 09 ← 03 + 06 + 08
- 10 ← 06 + 09
- 11 ← 01..10

## W1: 01, 02
- 01 posse: packages/core/src/shipping/region.ts, packages/core/src/shipping/freeShipping.ts, packages/core/src/shipping/index.ts, packages/core/src/shipping/__tests__/
- 02 posse: apps/store/src/shared/ui/InfoTip.tsx, apps/store/src/shared/ui/__tests__/InfoTip.test.tsx

## W2: 03, 04
- 03 posse: packages/supabase/src/types/settings.ts, supabase/migrations/ (só o arquivo novo da 99), packages/core/src/hooks/useFreeShipping.ts, packages/core/src/hooks/__tests__/useFreeShipping.test.ts, packages/core/src/constants.ts, packages/core/src/__tests__/constants.test.ts, apps/store/src/app/RuntimeSettingsLoader.tsx, apps/store/src/entities/cart/model/cartStore.ts, apps/store/src/entities/cart/model/__tests__/cartStore.test.ts, apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts
- 04 posse: packages/core/src/proposals/pricing.ts, packages/core/src/proposals/__tests__/pricing.test.ts, supabase/functions/checkout/proposal.ts, supabase/functions/checkout/__tests__/proposal.test.ts, supabase/functions/mercado-pago/handlers.ts, supabase/functions/mercado-pago/__tests__/proposalCharge.test.ts, apps/store/src/pages/ProposalCheckoutPage.tsx, apps/store/src/pages/__tests__/ProposalCheckoutPage.test.tsx

## W3: 05, 06, 07, 08
- 05 posse: apps/backoffice/src/features/settings/ui/ShippingMaterialSection.tsx, apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx, apps/store/src/shared/lib/__tests__/freeShippingSingleOwner.test.ts
- 06 posse: apps/store/src/features/checkout/lib/deliveryOptions.ts, apps/store/src/features/checkout/lib/__tests__/deliveryOptions.test.ts, apps/store/src/features/checkout/ui/ShippingOptionCard.tsx, apps/store/src/features/checkout/ui/DeliveryBlock.tsx, apps/store/src/features/checkout/ui/OrderSummary.tsx, apps/store/src/features/checkout/ui/__tests__/, apps/store/src/features/checkout/model/checkoutStore.ts, apps/store/src/features/checkout/model/__tests__/, apps/store/src/features/checkout/index.ts
- 07 posse: apps/store/src/widgets/home-sections/ui/TrustBar.tsx, apps/store/src/widgets/home-sections/ui/__tests__/, apps/store/src/features/auth/ui/AuthOverlay.tsx, apps/store/src/features/auth/ui/__tests__/, apps/store/src/features/shipping-calc/
- 08 posse: apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx, apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx

## W4: 09
- 09 posse: apps/store/src/widgets/cart-drawer/, apps/store/src/entities/cart/model/useCartPromotion.ts, apps/store/src/entities/cart/model/__tests__/useCartPromotion.test.ts, apps/store/src/pages/__tests__/CheckoutPage.test.tsx, apps/store/src/pages/__tests__/compreJuntoSacolaECheckout.test.tsx, apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx, apps/store/src/test/checkoutCampanha.test.tsx, apps/store/src/test/checkoutResumoCampanha.test.tsx

## W5: 10
- 10 posse: apps/store/src/features/checkout/ui/DeliveryBlock.tsx, apps/store/src/features/checkout/ui/__tests__/DeliveryBlockDaSacola.test.tsx, apps/store/src/pages/__tests__/CheckoutPage.test.tsx, apps/store/src/pages/__tests__/checkoutSobreviveAVoltaDaAba.test.tsx

## W6: 11
- 11 posse: apps/store/src/test/sacolaECheckoutMesmoTotal.test.tsx, CLAUDE.md, apps/store/CLAUDE.md, apps/backoffice/CLAUDE.md, packages/core/CLAUDE.md, supabase/CLAUDE.md

Dependências relaxadas: nenhuma.
