# Mockup Generator Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/05-mockup-generator/design.md`
**Status**: Done — all phases ✅ (T1–T16, commits b61d6a9..f120253); Verifier PASS 2026-07-21 (validation.md)

---

## Test Coverage Matrix

> Gerada de codebase + guidelines + spec — confirmar antes de Execute. Guidelines encontradas: `CLAUDE.md` (stack/convenções, sem thresholds de cobertura); `packages/core/vitest.config.ts` (**env `node`** — sem canvas real); precedente `.specs/features/03-backoffice-ui-standardization/tasks.md` (lógica pura = unit; UI/páginas/hooks de dados = build gate). Não há infra de e2e no repo.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Engine — geometria pura (`mockupGeometry.ts`) | unit | Todos os ramos; 1:1 com ENG-03/ENG-05 + clamp/limites (0..1), inverso px↔normalizado | `packages/core/src/mockup/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Engine — canvas (`loadImage`, `composeMockup`) | unit (fake ctx + Image mock) | ENG-01/02/04/06: ordem de desenho, `crossOrigin` antes do `src`, caminho sem-overlay, canvas = resolução do fundo | `packages/core/src/mockup/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Studio — helpers puros (`renderPlan`: `appendImages`, `summarizeUploads`) | unit | APP-04 (preserva ordem/principal) e APP-05 (sucesso parcial) — todos os ramos | `apps/backoffice/src/**/*.test.{ts,tsx}` | `pnpm --filter @nanapin/backoffice test` |
| Hooks de dados (`useMockups`, `useAdminMockups`) + utils de upload | none | Build gate (wrappers finos de supabase/storage; precedente do repo não testa hooks) | — | build gate |
| UI (ArtZoneEditor, dialogs, AdminMockupsPage, MockupPreviewCarousel, integrações em ProductFormDialog/CustomPinPage) | none | Build gate + verificação manual/UAT na validação | — | build gate |
| Migrations (SQL) | none | Build gate + aplicar no Supabase local + checar RLS (anon lê ativos; escrita exige admin) | — | build gate / manual |

**Coverage Expectation:** o núcleo de negócio (engine geométrica + composição + helpers de append/partial-fail) é **unit** obrigatório e cobre ENG-* e APP-04/05 diretamente; camadas de UI/dados seguem **build gate** (sem e2e no repo), com os ACs de COL-*/APP-01..03/06/STR-* verificados por build + walkthrough na validação. Este alvo é coerente com o precedente do backoffice.

## Gate Check Commands

> Geradas do codebase — `pnpm` + Turbo (CLAUDE.md).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick (core) | Após tasks de engine com unit | `pnpm --filter @nanapin/core test` |
| Quick (backoffice) | Após tasks com helpers puros no backoffice | `pnpm --filter @nanapin/backoffice test` |
| Build | Tasks de UI/hook/migration/refactor; fim de fase | `pnpm --filter <pkg> build && pnpm --filter <pkg> lint` |
| Full | Fecho da feature | `pnpm build && pnpm test` (raiz) |

> Nota de lint: `pnpm lint` tem erros **pré-existentes** (`no-explicit-any` em hooks admin — dívida conhecida, CLAUDE.md). O gate Build exige **não introduzir novos** erros vs baseline, não zerar os pré-existentes.

---

## Execution Plan

Fases ordenadas; execução sequencial; uma fase completa antes da próxima.

### Phase 1: Engine (`@nanapin/core/mockup`)
```
T1 → T2 → T3 → T4
```
### Phase 2: Persistência (Supabase)
```
T5 → T6 → T7 → T8
```
### Phase 3: Backoffice — coleção + estúdio
```
T9 → T10 → T11 → T12 → T13
```
### Phase 4: Backoffice — integração no produto
```
T14
```
### Phase 5: Loja — prévia realista
```
T15 → T16
```

---

## Task Breakdown

### T1: Tipos de domínio do mockup
**What**: Definir `ArtZone`, `ArtZoneShape`, `MockupBlendMode`, `MockupTemplate`.
**Where**: `packages/supabase/src/types/mockup.ts`, reexport em `packages/supabase/src/types/index.ts`
**Depends on**: None · **Reuses**: padrão de `types/settings.ts`, `types/coupon.ts` · **Requirement**: COL-01 (contrato), base de ENG/APP/STR
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Interfaces exportadas conforme design (art_zone normalizado 0..1)
- [ ] Reexport no barrel; `pnpm --filter @nanapin/supabase build` resolve (ou tsc do consumidor)
**Tests**: none · **Gate**: build
**Commit**: `feat(supabase): add mockup template domain types`

### T2: Geometria pura da engine
**What**: `resolveArtZone`, `clampArtZone`, `coverFitTransform` e inversos px↔normalizado (usados pelo ArtZoneEditor) — funções puras.
**Where**: `packages/core/src/mockup/mockupGeometry.ts`, `packages/core/src/mockup/types.ts` (engine: `PxZone`, `ArtTransform`, `ComposeInput`, `ComposeResult`), `mockupGeometry.test.ts`
**Depends on**: T1 · **Reuses**: matemática de `CustomPinPage` (center/radius/scale) · **Requirement**: ENG-03, ENG-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `resolveArtZone(zone,bgW,bgH)` mapeia 0..1→px (circle e ellipse); `clampArtZone` limita a [0,1]
- [ ] `coverFitTransform` retorna baseline cover-fit + aplica `transform` do usuário
- [ ] Testes cobrem círculo, elipse, clamp fora de faixa, cover-fit (arte menor/maior), ida-e-volta px↔normalizado
- [ ] Gate: `pnpm --filter @nanapin/core test`
**Tests**: unit · **Gate**: quick (core)
**Commit**: `feat(core): pure mockup geometry helpers`

### T3: loadImage com crossOrigin
**What**: `loadImage(src)` que seta `img.crossOrigin='anonymous'` **antes** do `src` (anti-tainting).
**Where**: `packages/core/src/mockup/loadImage.ts`, `loadImage.test.ts`
**Depends on**: T1 · **Reuses**: padrões inline de `CustomPinPage.handleImageUpload`, `uploadProductImage.compressImage` · **Requirement**: ENG-02
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Seta `crossOrigin` antes de `src`; resolve no `onload`, rejeita no `onerror`
- [ ] Teste com `Image` mockada asserta ordem (crossOrigin definido antes do src) e resolução/rejeição
- [ ] Gate: `pnpm --filter @nanapin/core test`
**Tests**: unit · **Gate**: quick (core)
**Commit**: `feat(core): crossOrigin-safe image loader`

### T4: composeMockup + barrels
**What**: `composeMockup(input)` (fundo→arte(clip elipse)→overlay blend; canvas na resolução do fundo; `toBlob`/`toDataURL`) + `mockup/index.ts` + reexport no barrel do core.
**Where**: `packages/core/src/mockup/composeMockup.ts`, `packages/core/src/mockup/index.ts`, `packages/core/src/index.ts`, `composeMockup.test.ts`
**Depends on**: T2, T3 · **Reuses**: `generateExportDataUrl` (CustomPinPage), T2, T3 · **Requirement**: ENG-01, ENG-02, ENG-04, ENG-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Compõe na ordem correta usando um `ctx` fake que registra chamadas (drawImage do fundo → clip → drawImage da arte → set `globalCompositeOperation`=blend → drawImage do overlay)
- [ ] Sem `overlay` → não seta blend nem desenha overlay (ENG-04); canvas dimensionado pela resolução do fundo (ENG-06)
- [ ] Teste do caminho de export não lança (contrato) e usa imagens de `loadImage`
- [ ] Gate: `pnpm --filter @nanapin/core test`
**Tests**: unit · **Gate**: quick (core)
**Commit**: `feat(core): mockup canvas compositor`

### T5: Migration — bucket mockup-templates
**What**: Bucket público `mockup-templates` com escrita **admin-only** (`has_role`).
**Where**: `supabase/migrations/<ts>_create_mockup_templates_bucket.sql`
**Depends on**: None · **Reuses**: `20260415095816_create_product_images_bucket.sql` (molde), padrão `has_role` · **Requirement**: COL-01 (assets)
**Tools**: MCP: `supabase` (se autenticado; senão aplicar SQL no editor/local) · Skill: `supabase`
**Done when**:
- [ ] Bucket criado (public read); INSERT/UPDATE/DELETE exigem `has_role(auth.uid(),'admin')`
- [ ] Aplicado no Supabase local; upload anônimo negado, admin permitido
**Tests**: none · **Gate**: build / manual
**Commit**: `feat(supabase): mockup-templates storage bucket`

### T6: Migration — tabela mockup_templates
**What**: Tabela + RLS (leitura pública, escrita admin) + trigger `updated_at`.
**Where**: `supabase/migrations/<ts>_create_mockup_templates_table.sql`
**Depends on**: None · **Reuses**: `..._create_store_settings.sql` (RLS/trigger), `has_role` · **Requirement**: COL-01
**Tools**: MCP: `supabase` (se autenticado) · Skill: `supabase`
**Done when**:
- [ ] Tabela conforme design (art_zone jsonb, blend_mode default 'multiply', is_active, sort_order)
- [ ] RLS: SELECT `USING (true)`; ALL admin `has_role`; trigger updated_at
- [ ] Aplicado local; anon faz SELECT; INSERT anon negado, admin ok
**Tests**: none · **Gate**: build / manual
**Commit**: `feat(supabase): mockup_templates table + scoped RLS`

### T7: Hook useMockups (loja)
**What**: `useMockups()` React Query lendo templates **ativos** (ordem `sort_order`), erro → `[]`.
**Where**: `packages/core/src/hooks/useMockups.ts`, reexport no barrel do core
**Depends on**: T1 · **Reuses**: `useStoreSettings` (molde React Query + default-on-error) · **Requirement**: STR-02 (base), APP-02 (base)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Query `['mockup_templates','active']`, filtra `is_active`, ordena por `sort_order`
- [ ] Erro/tabela ausente → `[]` (não quebra a loja)
- [ ] Gate: build (`@nanapin/core` + consumidor)
**Tests**: none · **Gate**: build
**Commit**: `feat(core): useMockups active-templates hook`

### T8: Entity backoffice — useAdminMockups + uploadMockupAsset
**What**: CRUD de templates (molde `useAdminProducts`) + upload de asset (fundo/overlay) ao bucket `mockup-templates` **sem recompressão destrutiva** (preserva alpha do overlay).
**Where**: `apps/backoffice/src/entities/mockup/{api/useAdminMockups.ts,lib/uploadMockupAsset.ts,index.ts}`
**Depends on**: T1 · **Reuses**: `useAdminProducts` (molde), `supabase.storage` · **Requirement**: COL-04 (dados), COL-02 (upload)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `useAdminMockups` → `{ templates, loading, fetch, create, update, remove }` (remove também apaga assets do bucket)
- [ ] `uploadMockupAsset(file, kind)` sobe PNG cru (overlay) / imagem (fundo) e devolve URL pública
- [ ] Gate: build
**Tests**: none · **Gate**: build
**Commit**: `feat(backoffice): admin mockup templates data layer`

### T9: Refactor uploadImageBlob
**What**: Extrair `uploadImageBlob(blob)` (compress ≤1200 WebP + upload em `product-images/products`); `uploadProductImage(file)` passa a delegar.
**Where**: `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts`
**Depends on**: None · **Reuses**: `compressImage` existente (aceitar `Blob`) · **Requirement**: APP-03 (upload de render)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `compressImage` aceita `Blob`; `uploadImageBlob(blob)` exportada; `uploadProductImage` delega sem mudar comportamento
- [ ] Gate: build (`@nanapin/backoffice`)
**Tests**: none · **Gate**: build
**Commit**: `refactor(backoffice): extract uploadImageBlob`

### T10: ArtZoneEditor
**What**: Editor interativo da elipse sobre o preview do fundo (mover/redimensionar/rotacionar), emitindo `ArtZone` normalizado; prévia via `composeMockup`.
**Where**: `apps/backoffice/src/features/mockup-studio/ui/ArtZoneEditor.tsx`
**Depends on**: T2, T4 · **Reuses**: pointer math de `CustomPinPage:270-316`, helpers puros de T2, `composeMockup` · **Requirement**: COL-03, COL-05 (parcial)
**Tools**: MCP: NONE · Skill: `motion` (opcional, handles) · **Done when**:
- [ ] Arrasta centro/handles → atualiza `ArtZone` (via helpers testados de T2); emite normalizado
- [ ] Gate: build
**Tests**: none (lógica pura testada em T2) · **Gate**: build
**Commit**: `feat(backoffice): art-zone ellipse editor`

### T11: MockupTemplateDialog
**What**: Criar/editar template — upload fundo (obrigatório)+overlay (opcional), nome, `blend_mode`, `is_active`, `sort_order`, `ArtZoneEditor` e prévia ao vivo; salva via `useAdminMockups`.
**Where**: `apps/backoffice/src/features/mockup-studio/ui/MockupTemplateDialog.tsx`
**Depends on**: T8, T10, T4 · **Reuses**: `Dialog`/`Input`/`Select`/`Switch`, `FormCard`, `uploadMockupAsset`, `composeMockup` · **Requirement**: COL-02, COL-05
**Tools**: MCP: NONE · Skill: `ui-ux-pro-max` (opcional) · **Done when**:
- [ ] Cria template com fundo+overlay+zona+blend+ativo; edita existente; prévia realista com arte de amostra
- [ ] Gate: build
**Tests**: none · **Gate**: build
**Commit**: `feat(backoffice): mockup template create/edit dialog`

### T12: MockupStudioDialog (+ renderPlan puro)
**What**: Aplicar arte a N templates ativos, ajustar posição, **Gerar** (compose→`uploadImageBlob`) e devolver URLs via `onGenerated`; helpers puros `appendImages` (preserva ordem/principal) e `summarizeUploads` (sucesso parcial).
**Where**: `apps/backoffice/src/features/mockup-studio/ui/MockupStudioDialog.tsx`, `apps/backoffice/src/features/mockup-studio/lib/renderPlan.ts`, `renderPlan.test.ts`
**Depends on**: T4, T7, T9 · **Reuses**: `useMockups` (ativos), `composeMockup`, `uploadImageBlob`, sliders de `CustomPinPage` · **Requirement**: APP-01, APP-02, APP-03, APP-04, APP-05
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Escolhe arte (upload novo OU `productImages`); seleciona N templates ativos; ajusta escala/offset; prévia por template
- [ ] "Gerar" compõe cada template, faz upload e chama `onGenerated(urls)`; falha parcial anexa sucessos + toast
- [ ] `appendImages`/`summarizeUploads` puros e testados (ordem/principal preservadas; contagem ok/falha)
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`
**Tests**: unit (helpers) · **Gate**: quick (backoffice)
**Commit**: `feat(backoffice): mockup studio apply-to-product dialog`

### T13: AdminMockupsPage + rota + nav
**What**: Página `/admin/mockups` (lista com thumb/nome/ativo/ordem/ações, `EmptyState`, "Novo mockup" → `MockupTemplateDialog`), rota e item de nav; barrel da feature.
**Where**: `apps/backoffice/src/pages/admin/AdminMockupsPage.tsx`, `apps/backoffice/src/features/mockup-studio/index.ts`, `apps/backoffice/src/app/App.tsx` (rota), `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` (navItems)
**Depends on**: T8, T11 · **Reuses**: `PageHeader`, `AdminTable`/cards, `EmptyState` (shared/ui), `useAdminMockups` · **Requirement**: COL-04, COL-06
**Tools**: MCP: NONE · Skill: `ui-ux-pro-max` (opcional) · **Done when**:
- [ ] Lista templates; criar/editar/ativar/excluir; vazio → `EmptyState`; tokens shadcn
- [ ] Rota `/admin/mockups` protegida por `RequireAdmin`; item "Mockups" no menu (desktop+mobile)
- [ ] Gate: build + lint (sem novos erros)
**Tests**: none · **Gate**: build
**Commit**: `feat(backoffice): admin mockups collection page`

### T14: Integração "Gerar mockup" no ProductFormDialog
**What**: Botão "Gerar mockup" na seção de imagens abre `MockupStudioDialog`; `onGenerated` anexa URLs em `imageUrls` (preserva ordem/principal). Payload/submit inalterados.
**Where**: `apps/backoffice/src/features/product-form/ui/ProductFormDialog.tsx`
**Depends on**: T12 · **Reuses**: estado `imageUrls`, `MockupStudioDialog`, `appendImages` · **Requirement**: APP-04, APP-06
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] Botão abre o estúdio com `productImages={imageUrls}`; renders anexados ao final (principal intacta)
- [ ] Submit monta o mesmo payload (só `images[]` cresce); nenhum outro campo alterado
- [ ] Gate: build
**Tests**: none · **Gate**: build
**Commit**: `feat(backoffice): generate mockups from product form`

### T15: MockupPreviewCarousel (loja)
**What**: Componente que recebe a arte chapada (dataURL), compõe nos templates ativos (downscale de preview) e exibe em carrossel; coleção vazia → render nulo.
**Where**: `apps/store/src/features/mockup-preview/ui/MockupPreviewCarousel.tsx`, `apps/store/src/features/mockup-preview/index.ts`
**Depends on**: T4, T7 · **Reuses**: `@nanapin/ui/carousel`, `useMockups`, `composeMockup` · **Requirement**: STR-01, STR-02
**Tools**: MCP: NONE · Skill: `frontend-design` (opcional) · **Done when**:
- [ ] Compõe a arte nos templates ativos e exibe carrossel; sem templates ativos → nada/aviso
- [ ] Gate: build (`@nanapin/store`)
**Tests**: none · **Gate**: build
**Commit**: `feat(store): realistic mockup preview carousel`

### T16: Aba "Prévia real" no CustomPinPage
**What**: Toggle/aba no card do canvas que renderiza `MockupPreviewCarousel` com `generateExportDataUrl()`; download/carrinho **inalterados** (arte chapada).
**Where**: `apps/store/src/pages/CustomPinPage.tsx`
**Depends on**: T15 · **Reuses**: `generateExportDataUrl`, `MockupPreviewCarousel` · **Requirement**: STR-01, STR-03
**Tools**: MCP: NONE · Skill: NONE · **Done when**:
- [ ] Aba "Prévia real" mostra a arte atual nos templates; `handleExport`/`handleAddToCart` seguem entregando a arte chapada
- [ ] Gate: build (`@nanapin/store`)
**Tests**: none · **Gate**: build
**Commit**: `feat(store): real preview tab in custom pin builder`

---

## Phase Execution Map
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

P1:  T1 → T2 ─┐
        └→ T3 ─┴→ T4
P2:  T5   T6   T7(→T1)   T8(→T1)
P3:  T9 → T10(→T2,T4) → T11(→T8,T10,T4) → T12(→T4,T7,T9) → T13(→T8,T11)
P4:  T14(→T12)
P5:  T15(→T4,T7) → T16(→T15)
```
Execução estritamente sequencial; um agente/worker por vez, uma task por vez.

## Task Granularity Check
| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 1 arquivo de tipos | ✅ |
| T2 | 1 módulo puro (+teste) | ✅ |
| T3 | 1 função (+teste) | ✅ |
| T4 | 1 função + barrels (+teste) | ✅ cohesivo |
| T5 | 1 migration | ✅ |
| T6 | 1 migration | ✅ |
| T7 | 1 hook | ✅ |
| T8 | 1 hook + 1 util (mesma entity) | ✅ cohesivo |
| T9 | 1 refactor de util | ✅ |
| T10 | 1 componente | ✅ |
| T11 | 1 componente (dialog) | ✅ |
| T12 | 1 dialog + 1 lib pura (+teste) | ✅ cohesivo |
| T13 | 1 página + rota/nav | ✅ cohesivo |
| T14 | 1 integração (1 arquivo) | ✅ |
| T15 | 1 componente | ✅ |
| T16 | 1 integração (1 arquivo) | ✅ |

## Diagram-Definition Cross-Check
| Task | Depends On (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | raiz P1 | ✅ |
| T2 | T1 | T1→T2 | ✅ |
| T3 | T1 | T1→T3 | ✅ |
| T4 | T2, T3 | T2→T4, T3→T4 | ✅ |
| T5 | None | raiz P2 | ✅ |
| T6 | None | raiz P2 | ✅ |
| T7 | T1 | T7→T1 (backward) | ✅ |
| T8 | T1 | T8→T1 (backward) | ✅ |
| T9 | None | raiz P3 | ✅ |
| T10 | T2, T4 | T10→T2,T4 (backward) | ✅ |
| T11 | T8, T10, T4 | setas presentes | ✅ |
| T12 | T4, T7, T9 | setas presentes | ✅ |
| T13 | T8, T11 | setas presentes | ✅ |
| T14 | T12 | T14→T12 | ✅ |
| T15 | T4, T7 | setas presentes | ✅ |
| T16 | T15 | T15→T16 | ✅ |

Todas as deps apontam para trás ou mesma fase. ✅

## Test Co-location Validation
| Task | Layer criado/modificado | Matrix Requires | Task Says | Status |
| ---- | ----------------------- | --------------- | --------- | ------ |
| T1 | tipos | none | none | ✅ |
| T2 | engine geometria pura | unit | unit | ✅ |
| T3 | engine canvas (loadImage) | unit | unit | ✅ |
| T4 | engine canvas (compose) | unit | unit | ✅ |
| T5 | migration | none | none | ✅ |
| T6 | migration | none | none | ✅ |
| T7 | hook de dados | none | none | ✅ |
| T8 | hook + util | none | none | ✅ |
| T9 | util | none | none | ✅ |
| T10 | UI (lógica pura em T2) | none | none | ✅ |
| T11 | UI | none | none | ✅ |
| T12 | UI + lib pura | unit | unit | ✅ |
| T13 | página | none | none | ✅ |
| T14 | integração UI | none | none | ✅ |
| T15 | UI | none | none | ✅ |
| T16 | integração UI | none | none | ✅ |

Todas ✅ — pronto para Execute.

## Requirement Coverage
21/21 mapeados: ENG-01/04/06→T4; ENG-02→T3,T4; ENG-03/05→T2,T4 · COL-01→T5,T6; COL-02→T8,T11; COL-03→T10; COL-04→T8,T13; COL-05→T10,T11; COL-06→T13 · APP-01/02/03→T12; APP-04→T12,T14; APP-05→T12; APP-06→T14 · STR-01→T15,T16; STR-02→T7,T15; STR-03→T16.

## Task Verification Standards
Cada task segue `Done when` + `Tests` + `Gate`. Quick(core)=`pnpm --filter @nanapin/core test`; Quick(backoffice)=`pnpm --filter @nanapin/backoffice test`; Build=`build && lint` (sem novos erros vs baseline). Um commit atômico por task.
