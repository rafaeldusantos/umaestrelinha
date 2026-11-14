# Plano de ondas — WI 100

Grafo (de `Depende de`): 01 → 02, 01 → 04, 01 → 05, 01 → 07, 02 → 06, 02 → 07; 03 independente.

ONDAS: 01,03 | 02,04,05 | 06,07

## W1: 01, 03
- 01 posse: packages/core/src/appearance/, packages/core/src/hooks/useStoreSettings.ts, packages/core/src/hooks/ (o hook novo e o barrel de hooks), packages/core/package.json, packages/core/tsconfig.json, packages/supabase/src/types/settings.ts, apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts, os aliases `@estrelinha/core/appearance` (tsconfig.base.json e os vite/vitest config dos apps, se o alias for por subpath explícito)
- 03 posse: packages/ui/src/brand/BrandSvg.tsx, apps/store/src/shared/ui/brand/__tests__/

## W2: 02, 04, 05
- 02 posse: packages/ui/src/tokens/, apps/store/tailwind.config.ts, apps/store/src/app/App.css, apps/store/src/test/paletteFromSource.ts, apps/store/src/shared/lib/__tests__/palette.test.ts, apps/store/src/shared/lib/__tests__/contrast.test.ts, apps/store/src/shared/lib/__tests__/fieldBorder.test.ts, apps/store/src/shared/lib/__tests__/importOrder.test.ts, apps/store/src/app/__tests__/brandAssets.test.ts, apps/store/src/shared/lib/__tests__/perfilComDonoUnico.test.ts (novo)
- 04 posse: packages/core/src/page/head.ts, packages/core/src/page/serve.ts, packages/core/src/page/__tests__/, apps/store/server/page.ts, apps/store/server/__tests__/page.test.ts
- 05 posse: apps/store/src/shared/lib/ (só o arquivo novo do utilitário da carga e o teste dele), apps/store/src/widgets/announcement-bar/model/useAnnouncementBar.ts, apps/store/src/app/App.tsx, apps/store/src/app/ (os arquivos novos do aplicador e do recebedor, e os testes deles)

## W3: 06, 07
- 06 posse: apps/store/src/entities/product/ui/ProductCard.tsx, apps/store/src/entities/product/ui/__tests__/ProductCardSurface.test.tsx, apps/store/src/pages/ProductPage.tsx (só o selo da galeria) e o teste dele, apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx e o teste dele, o arquivo do chip de desconto (H4) e o teste dele, apps/store/src/widgets/instagram-invite/ui/InstagramInviteSheet.tsx, apps/store/src/widgets/cookie-notice/ui/CookieNotice.tsx, apps/store/src/shared/lib/__tests__/accentText.test.ts
- 07 posse: apps/backoffice/src/features/style-profile/, apps/backoffice/src/features/settings/ui/StoreDataSection.tsx, apps/backoffice/src/pages/admin/AdminSettingsPage.test.tsx, apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts, apps/backoffice/src/shared/lib/__tests__/folgaDoPalco.test.ts

Nenhuma dependência relaxada. Observação de medição: dentro de uma onda as suítes inteiras da loja podem ver arquivos da tarefa vizinha em andamento; a verificação de cada tarefa roda os testes dos arquivos dela, e a suíte inteira roda no fecho de cada onda.
