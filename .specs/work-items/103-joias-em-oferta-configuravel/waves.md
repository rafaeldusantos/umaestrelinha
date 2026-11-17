# Ondas — 103

ONDAS: 01 | 02 | 03 | 04

Grafo: 01→02→03→04

Sem paralelismo seguro: a 01 e a 02 editam `apps/store/src/entities/product/lib/mapProduct.ts` e `apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts` e criam migration de numeração sequencial; a 03 consome o contrato de `core` e a coluna que a 02 cria; a 04 consome o hook das peças escolhidas que a 03 cria. Nenhuma dependência relaxada.

## W1: 01
- 01 posse: supabase/migrations/ (uma migration nova, das views de vigência), apps/store/src/entities/campaign/, apps/store/src/entities/product/lib/mapProduct.ts, apps/store/src/entities/product/lib/__tests__/, apps/store/src/entities/product/api/useOfferProducts.ts, apps/store/src/entities/product/api/__tests__/, apps/store/src/shared/lib/__tests__/campanhasSchema.test.ts, apps/store/src/shared/lib/__tests__/campanhaVigenciaParidade.test.ts, .specs/work-items/103-joias-em-oferta-configuravel/probes/

## W2: 02
- 02 posse: supabase/migrations/ (uma migration nova, da coluna e dos índices), packages/core/src/home/, packages/core/src/campaigns/, packages/supabase/src/types/home.ts, apps/store/src/entities/home/, apps/store/src/widgets/campaign-offers/, apps/store/src/widgets/home-renderer/, apps/store/src/entities/product/lib/mapProduct.ts, apps/store/src/entities/campaign/__tests__/campanhaNaLoja.test.ts, apps/store/src/shared/lib/__tests__/homeSections.test.ts, apps/store/src/shared/lib/__tests__/accentText.test.ts, apps/store/src/pages/__tests__/, apps/backoffice/src/entities/home/api/useAdminHomeSections.ts (só a linha de `campaign_id` no `mapSection`), apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx, .specs/work-items/102-desconto-de-campanha/spec.md (só as notas de H-10/I-10), .specs/work-items/103-joias-em-oferta-configuravel/probes/

## W3: 03
- 03 posse: apps/backoffice/src/features/home-composition/ (menos ui/HomeSectionRow.tsx, ui/HomeSectionList.tsx, ui/HomeBlockTray.tsx e os testes deles), apps/backoffice/src/entities/campaign/, apps/backoffice/src/entities/product/, apps/backoffice/src/entities/home/, apps/backoffice/src/pages/admin/AdminHomePage.tsx, apps/backoffice/src/pages/admin/AdminHomePage.test.tsx, apps/backoffice/src/shared/lib/__tests__/, packages/core/src/product-search/, .specs/work-items/103-joias-em-oferta-configuravel/probes/

## W4: 04
- 04 posse: apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx, apps/backoffice/src/features/home-composition/ui/HomeSectionList.tsx, apps/backoffice/src/features/home-composition/ui/HomeBlockTray.tsx, os testes desses três (o da bandeja a 02 já inverteu), apps/backoffice/src/features/home-composition/model/useAdminResolvedHome.ts (e o teste dele)
