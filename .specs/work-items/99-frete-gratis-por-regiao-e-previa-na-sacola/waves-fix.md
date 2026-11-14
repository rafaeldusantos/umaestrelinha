ONDAS: 12,13,14
- 12 posse: apps/store/src/features/checkout/ui/DeliveryBlock.tsx, apps/store/src/features/checkout/ui/__tests__/, apps/store/src/features/checkout/model/checkoutStore.ts, apps/store/src/features/checkout/model/__tests__/, apps/store/src/pages/__tests__/ (CheckoutPage*, ProposalCheckoutPage, checkoutSobreviveAVoltaDaAba)
- 13 posse: apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx, apps/store/src/widgets/cart-drawer/ui/CartShipping.tsx, apps/store/src/widgets/cart-drawer/ui/__tests__/ (CartDrawer, sacolaComFrete, sacolaMedida)
- 14 posse: apps/store/src/widgets/cart-drawer/ui/FreeShippingBand.tsx, apps/store/src/widgets/cart-drawer/ui/__tests__/FreeShippingBand.test.tsx, apps/store/src/shared/ui/InfoTip.tsx, apps/store/src/shared/ui/__tests__/InfoTip*.test.tsx

Uma onda só: as três fix tasks têm posse disjunta (checkout › Entrega; rodapé da gaveta; faixa e ⓘ da gaveta), nenhum
fix depende de outro e nenhuma toca algo global (config, migração, tipos compartilhados, package.json, estilos globais,
rotas, provider). Ordem dentro da onda pela severidade: 12 (critical/high) · 13 (low) · 14 (low).
