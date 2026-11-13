# WI 101 · Plano de ondas

Grafo (de `Depende de` / `Habilita` de cada tarefa):

- `01 → 02` (o servidor pergunta à regra de `core/announcements`)
- `01 → 04` (o painel recusa e manda o rascunho pela regra e pelo canal de `core/announcements`)
- `01 → 03` e `02 → 03` (a loja lê a regra e o atributo `data-faixa` que o servidor grava)

ONDAS: 01 | 02,04 | 03

## W1: 01
- 01 posse: packages/core/src/announcements/, packages/core/package.json, packages/core/src/home/refusals.ts, packages/core/src/home/__tests__/refusals.test.ts, packages/core/src/menu/refusals.ts, packages/core/src/menu/__tests__/, packages/core/src/hooks/useStoreSettings.ts, packages/supabase/src/types/settings.ts, apps/store/src/shared/lib/__tests__/storeSettingsDefaults.test.ts, apps/backoffice/src/features/home-composition/model/, packages/core/CLAUDE.md

## W2: 02, 04
- 02 posse: packages/core/src/page/, apps/store/server/, apps/store/scripts/, apps/store/vercel.json, apps/store/src/app/__tests__/paginasFixasServidas.test.ts, apps/store/src/shared/lib/__tests__/vercelRedirects.test.ts, apps/store/CLAUDE.md
- 04 posse: apps/backoffice/src/pages/admin/AdminAnnouncementBar*, apps/backoffice/src/features/announcement-bar/, apps/backoffice/src/app/App.tsx, apps/backoffice/src/widgets/admin-layout/model/, apps/backoffice/src/features/home-composition/__tests__/previaUnica.test.ts, apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts, apps/backoffice/CLAUDE.md

## W3: 03
- 03 posse: apps/store/src/widgets/announcement-bar/, apps/store/src/widgets/hero-carousel/, apps/store/src/shared/lib/ (menos __tests__/storeSettingsDefaults.test.ts e __tests__/vercelRedirects.test.ts), apps/store/src/widgets/store-layout/, apps/store/src/widgets/header/, apps/store/src/app/__tests__/ (menos paginasFixasServidas.test.ts), apps/store/CLAUDE.md

Nenhuma dependência relaxada. A 04 não depende da 03: ela consome só o canal de prévia e a regra da 01, e prova a ponte com o iframe dublado; o recebedor da loja nasce na 03.
