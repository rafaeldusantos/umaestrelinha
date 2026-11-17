ONDAS: 03 | 04
- 03 posse: apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx, apps/backoffice/src/features/store-menu/ui/MenuLivePreview.tsx, apps/backoffice/src/pages/admin/AdminMenuPage.tsx, apps/backoffice/src/features/store-menu/model/ (documentOps.ts, useMenuPreviewBridge.ts — só consumo), e os testes deles
- 04 posse: apps/backoffice/src/features/store-menu/ui/MenuLabelColorField.tsx, apps/backoffice/src/features/store-menu/ui/MenuItemEditor.tsx (estado corBarra/corFolha), e os testes deles
- 03 | 04 em sequência: as duas dividem `MenuItemEditor.tsx` (e o teste dele); a 03 (BUG-001, high) vem antes pela severidade.
