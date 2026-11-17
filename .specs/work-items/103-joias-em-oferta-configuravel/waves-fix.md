ONDAS: 05,07 | 06 | 08
- 05 posse: apps/backoffice/src/features/home-composition/ui/HomeSectionEditor.tsx, apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx, apps/backoffice/src/shared/ui/FormPageHeader.tsx
- 07 posse: apps/store/src/widgets/campaign-offers/, apps/store/src/widgets/product-carousel/
- 06 posse: apps/backoffice/src/features/home-composition/ui/HomeSectionRow.tsx, apps/backoffice/src/features/home-composition/ui/HomeSectionList.tsx, apps/backoffice/src/entities/campaign/api/campaignMarks.ts, apps/backoffice/src/entities/campaign/model/campaignPieces.ts
- 08 posse: apps/backoffice/src/entities/campaign/api/campaignMarks.ts, apps/backoffice/src/features/home-composition/ui/CampaignOffersEditor.tsx

Por que não é tudo paralelo:
- onda 1 (05 ‖ 07): os dois high sem arquivo em comum — 05 no editor do painel, 07 na loja.
- onda 2 (06, sozinha, depois da 05): também high, mas o BUG-006 aparece na linha E no editor, e a 06 não pode cair no `CampaignOffersEditor.tsx` ao mesmo tempo que a 05; na dúvida, sequência.
- onda 3 (08, sozinha, por último): divide `CampaignOffersEditor.tsx` com a 05 e `entities/campaign/api/campaignMarks.ts` com a 06; é medium, a menor severidade.
