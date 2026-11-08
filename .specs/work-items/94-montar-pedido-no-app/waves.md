# WI 94 — plano de ondas

Grafo (de `Depende de` / `Habilita` de cada tarefa):

- `01 → 02 → 04 → 05 → 06 → 07 → 08 → 09 → 10`
- `06 ← 03 + 05`
- `07 ← 01 + 06`
- `09 ← 02 + 08`

ONDAS: 01,03 | 02 | 04 | 05 | 06 | 07 | 08 | 09 | 10

## W1: 01, 03
- 01 posse: packages/core/src/proposals/ (a regra da foto da linha, `LINK_WITHOUT_STORE`, barril), o módulo novo de busca em packages/core/src/, packages/core/src/pricing/__tests__/, packages/core/package.json, apps/backoffice/src/entities/product/, apps/backoffice/src/shared/lib/texto.ts, apps/backoffice/src/features/order-proposal/model/copy.ts, apps/backoffice/src/app/__tests__/, apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts, packages/core/CLAUDE.md, supabase/CLAUDE.md
- 03 posse: supabase/functions/customer-parse/, packages/core/src/customers/ (parse.ts, mergeCep.ts, __tests__/, index.ts), supabase/functions/_shared/__tests__/claudeSoNaPorta.test.ts, supabase/config.toml

## W2: 02
- 02 posse: supabase/migrations/ (arquivo novo), supabase/functions/order-proposals/, supabase/functions/_shared/ (cifra), supabase/config.toml, .env.example, packages/core/src/proposals/state.ts e __tests__/, apps/backoffice/src/features/order-proposal/, apps/backoffice/src/pages/admin/, apps/backoffice/src/entities/customer/api/useCustomerSearch.ts, apps/store/src/shared/lib/__tests__/pedidoMontadoSchema.test.ts, apps/store/src/shared/lib/__tests__/observacaoDaPropostaSchema.test.ts, supabase/CLAUDE.md

## W3: 04
- 04 posse: supabase/functions/order-proposals/ (list), apps/mobile-adm/src/ (features/order-proposal/, shared/api/, shared/config/, entities/order/model/pedidosHref.ts, pages/, widgets/, app/App.tsx, app/__tests__/, widgets/tab-bar/, os guardas em shared/lib/__tests__/ e entities/order/api/__tests__/), apps/mobile-adm/src/features/push-notifications/api/portaDeAvisos.ts, apps/mobile-adm/.env.example, apps/mobile-adm/CLAUDE.md

## W4: 05
- 05 posse: apps/mobile-adm/src/ (features/order-proposal/, entities/customer/api/, pages/, app/App.tsx, widgets/tab-bar/, os guardas), apps/mobile-adm/CLAUDE.md

## W5: 06
- 06 posse: apps/mobile-adm/src/features/order-proposal/, os guardas do app, packages/core/CLAUDE.md, supabase/CLAUDE.md

## W6: 07
- 07 posse: apps/mobile-adm/src/ (features/order-proposal/, entities/product/api/, os guardas), apps/backoffice/src/shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts

## W7: 08
- 08 posse: supabase/functions/order-proposals/ (preview), apps/mobile-adm/src/features/order-proposal/, os guardas do app

## W8: 09
- 09 posse: apps/mobile-adm/src/features/order-proposal/, apps/mobile-adm/src/pages/, os guardas do app

## W9: 10
- 10 posse: apps/mobile-adm/src/features/order-proposal/model/, apps/mobile-adm/src/shared/lib/__tests__/, CLAUDE.md (raiz), apps/mobile-adm/CLAUDE.md

Nenhuma dependência relaxada: a 02 precisa do código da regra da foto que a 01 cria, e as tarefas do app compartilham `App.tsx` e os guardas.
