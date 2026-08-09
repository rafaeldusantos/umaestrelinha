# Mockup Generator Validation

**Date**: 2026-07-21
**Spec**: `.specs/features/05-mockup-generator/spec.md`
**Diff range**: `b61d6a9~1..HEAD` (17 contiguous commits, HEAD=`f120253`)
**Verifier**: independent sub-agent (author ≠ verifier; coverage re-derived independently, evidence-or-zero)

Scope note: per the approved **Test Coverage Matrix** (`tasks.md`), unit tests cover the engine
(`mockupGeometry`, `loadImage`, `composeMockup`) and the pure `renderPlan` helpers only. All UI
(dialogs, editor, page, carousel, ProductForm/CustomPin integrations), data hooks, upload utils and
SQL migrations are **build-gate / manual** by design (no e2e infra in the repo). Evidence-or-zero was
applied to the unit-tested ACs (ENG-01..06, APP-04, APP-05); the remaining ACs were verified by code
inspection against the design + the passing build gate.

---

## Task Completion

| Task | Status | Notes |
| ---- | ------ | ----- |
| T1 Domain types (`types/mockup.ts`) | ✅ Done | `ArtZone`/`MockupBlendMode`/`MockupTemplate` match design; reexported in barrel |
| T2 Pure geometry (`mockupGeometry.ts`) | ✅ Done | unit-tested (11 tests) |
| T3 `loadImage` crossOrigin | ✅ Done | unit-tested (3 tests) |
| T4 `composeMockup` + barrels | ✅ Done | unit-tested (5 tests) |
| T5 Bucket migration | ✅ Done | public read / admin-only write (`has_role`) — inspected |
| T6 Table migration + RLS | ✅ Done | SELECT `USING(true)`, ALL admin `has_role`, `updated_at` trigger — inspected |
| T7 `useMockups` (store) | ✅ Done | active-only, `sort_order`, error→`[]` — inspected |
| T8 `useAdminMockups` + `uploadMockupAsset` | ✅ Done | CRUD + asset cleanup on remove; raw upload preserves alpha — inspected |
| T9 Extract `uploadImageBlob` | ✅ Done | `uploadProductImage` delegates, behavior preserved — diff inspected |
| T10 `ArtZoneEditor` | ✅ Done | drag move/rx/ry/rotate → `clampArtZone` normalized emit — inspected |
| T11 `MockupTemplateDialog` | ✅ Done | bg(req)+overlay(opt)+zone+blend+active; live sample-art preview — inspected |
| T12 `MockupStudioDialog` + `renderPlan` | ✅ Done | helpers unit-tested (9 tests); dialog inspected |
| T13 `AdminMockupsPage` + route + nav | ✅ Done | shared UI, EmptyState, `/admin/mockups`, nav item — inspected |
| T14 ProductFormDialog integration | ✅ Done | button opens studio; `onGenerated` uses `appendImages`; payload unchanged — diff inspected |
| T15 `MockupPreviewCarousel` (store) | ✅ Done | composes active templates client-side; empty→null — inspected |
| T16 "Prévia real" tab in CustomPinPage | ✅ Done | tab renders carousel; download/cart unchanged — diff inspected |

All 16 tasks done. Note: range also contains follow-up `221d690 fix(backoffice): memoize active
mockup templates list` (`useMemo` in MockupStudioDialog) — benign, no AC impact.

---

## Spec-Anchored Acceptance Criteria

### Unit-tested ACs (evidence-or-zero)

| Criterion (WHEN X THEN Y) | Spec-defined outcome | `file:line` + assertion | Result |
| ------------------------- | -------------------- | ----------------------- | ------ |
| ENG-01 — compose draws bg → art clipped in art-zone → overlay with `globalCompositeOperation=blendMode`; returns `{canvas, toBlob, toDataURL}` | order bg<save<ellipse<clip<translate<art<restore<overlay, blend set after art & before overlay; concrete draw args | `composeMockup.test.ts:92-100` — chained `expect(bgIdx).toBeLessThan(saveIdx)` … `expect(gcoIdx).toBeLessThan(overlayIdx)`; `:103` `toEqual([background,0,0,800,600])`; `:105` ellipse `toEqual([400,300,200,150,0,0,Math.PI*2])`; `:109` gco `toEqual(['screen'])`; `:181` `toMatch(/^data:image\/png/)`; `:183` toBlob resolves | ✅ PASS |
| ENG-02 — imgs via `loadImage` (crossOrigin before src) → `toDataURL`/`toBlob` no `SecurityError` | crossOrigin='anonymous' captured **at the moment src is set** (ordering); export does not throw | `loadImage.test.ts:41` — `expect(lastImage.crossOriginWhenSrcSet).toBe('anonymous')` (negative-ordering proof); `composeMockup.test.ts:177` `expect(background.crossOrigin).toBe('anonymous')`, `:181-183` export doesn't throw | ✅ PASS |
| ENG-03 — art-zone circle/ellipse normalized 0..1 → maps to bg px and clips | cx/rx by width, cy/ry by height; shape+rotation preserved | `mockupGeometry.test.ts:21` circle `toEqual({cx:200,cy:200,rx:100,ry:100,…})`; `:31` ellipse non-square `toEqual({cx:400,cy:200,rx:200,ry:50,rotation:30})`; clip tied to compose `composeMockup.test.ts:105` | ✅ PASS |
| ENG-04 — no overlay → compose bg+art, no blend layer, no error | exactly 2 `drawImage`; no `globalCompositeOperation` set | `composeMockup.test.ts:120` — `expect(drawCount).toBe(2)`; `:121` `expect(methods).not.toContain('set globalCompositeOperation')` | ✅ PASS |
| ENG-05 — art smaller/larger than zone → cover-fit default + user transform over baseline | cover uses **max** ratio; user scale multiplies baseline; offset/rotation passed through | `mockupGeometry.test.ts:77` smaller `toEqual({scale:4,…})`; `:83` larger `.toBe(0.5)`; `:89` non-uniform `.toBe(2)` (max); `:100` user transform `toEqual({scale:6,dx:10,dy:-5,rotation:30})`; tied to compose `:108` art args `toEqual([art,-200,-200,400,400])` | ✅ PASS |
| ENG-06 — canvas at **natural** resolution of bg | canvas.width/height = bg naturalWidth/naturalHeight (not CSS width/height) | `composeMockup.test.ts:140` — `expect(result.canvas.width).toBe(1234)`; `:141` `expect(result.canvas.height).toBe(567)` (natural≠css to prove source) | ✅ PASS |
| APP-04 — append renders preserve existing images/order (primary=first unchanged), add at end; if none, first render is primary | `[a,b]+[c,d]=[a,b,c,d]`, `[0]='a'`; `[]+[x,y]=[x,y]`, `[0]='x'`; no input mutation | `renderPlan.test.ts:9` `toEqual(['a','b','c','d'])`, `:10` `[0].toBe('a')`; `:15` `toEqual(['x','y'])`, `:16` `[0].toBe('x')`; `:20` empty-added no-op; `:27-28` no mutation | ✅ PASS |
| APP-05 — partial upload failure → append successes, report failures, no UI freeze | non-null urls kept **in order**; `failed` = null count | `renderPlan.test.ts:36` `toEqual({urls:['u1','u2'],failed:1})`; `:40` intercalated `failed:2`; `:44` all-fail `{urls:[],failed:2}`; `:48` all-ok `failed:0`; `:52` empty `{urls:[],failed:0}` | ✅ PASS |

**Unit-tested status**: ✅ 8/8 ACs matched the spec-defined outcome. 0 spec-precision gaps.

### Build-gate / inspection ACs (per approved matrix — NOT test gaps)

| Criterion | Evidence (code inspection) | Result |
| --------- | -------------------------- | ------ |
| COL-01 — table+bucket, RLS public read / admin write | `..._table.sql:9-20` cols match design; `:24-28` SELECT `USING(true)`; `:30-36` ALL admin `has_role`; `:48-52` `updated_at` trigger. `..._bucket.sql:8-10` public bucket; `:13-15` public read; `:17-43` insert/update/delete admin-only `has_role` | ✅ build-gate |
| COL-02 — create template (bg req/overlay opt/name/blend/active/order) → upload assets + persist | `MockupTemplateDialog.tsx:115-134,142-161`; `uploadMockupAsset.ts:13-40` raw upload (no destructive recompression → alpha preserved) | ✅ build-gate |
| COL-03 — drag ellipse → save geometry normalized 0..1 | `ArtZoneEditor.tsx:51-85` drag modes; `:84` `onChange(clampArtZone(next))` | ✅ build-gate |
| COL-04 — editor open → live realistic preview via `composeMockup` | `ArtZoneEditor.tsx:105-118` compose preview; `MockupTemplateDialog.tsx:33-62` sample art, `:243-250` wiring | ✅ build-gate |
| COL-05 — edit/toggle/reorder/delete reflected; delete removes bucket assets | `useAdminMockups.ts:35-51` (remove deletes bg+overlay via `deleteMockupAsset`); `AdminMockupsPage.tsx:29-40`; `uploadMockupAsset.ts:42-47` | ✅ build-gate |
| COL-06 — `/admin/mockups` uses shared components + shadcn tokens, in nav | `AdminMockupsPage.tsx:5,98-124` (PageHeader/AdminTable/EmptyState); `AdminLayout.tsx:11` nav item; `App.tsx:44` route under `RequireAdmin` | ✅ build-gate |
| APP-01 — studio from ProductForm images → art as new upload OR existing product image | `ProductFormDialog.tsx` diff (button→`MockupStudioDialog productImages={imageUrls}`); `MockupStudioDialog.tsx:132-153,227-257` | ✅ build-gate |
| APP-02 — select 1..n **active** templates + per-template adjust → preview each | `MockupStudioDialog.tsx:92-93` (`useMockups` active), `:155-158` toggle, `:43-89` per-template preview+sliders | ✅ build-gate |
| APP-03 — Generate → compose at bg res, upload each Blob to `product-images`, append URLs | `MockupStudioDialog.tsx:160-212` (compose→`toBlob`→`uploadImageBlob`→`onGenerated`); `uploadProductImage.ts` `uploadImageBlob` (compress ≤1200 WebP → `product-images/products`) | ✅ build-gate |
| APP-06 — save after generating → payload persists `images[]` incl. renders, no other field changed | `ProductFormDialog.tsx` diff adds only `studioOpen` state + button + dialog; `onGenerated` appends via `appendImages`; **submit/payload logic untouched** | ✅ build-gate |
| STR-01 — "Prévia real" composes flat art (`generateExportDataUrl`) on active templates, carousel, client-side | `CustomPinPage.tsx` diff (tab + `MockupPreviewCarousel artDataUrl={generateExportDataUrl()}`); `MockupPreviewCarousel.tsx:15-100` | ✅ build-gate |
| STR-02 — no active templates → hide preview, no error | `MockupPreviewCarousel.tsx:70` `if ((templates ?? []).length === 0) return null`; `CustomPinPage` `hasMockups` guard; `useMockups` error→`[]` | ✅ build-gate |
| STR-03 — export/add-to-cart still deliver **flat art**, not composite | Diff grep of `CustomPinPage.tsx`: the ONLY changed line touching the 3 protected fns is `+ <MockupPreviewCarousel artDataUrl={generateExportDataUrl()} />` (a call). `handleExport`/`handleAddToCart`/`generateExportDataUrl` definitions & logic **unchanged** | ✅ build-gate |

**Overall AC status**: ✅ 8/8 unit-tested ACs matched spec outcome; 13/13 build-gate ACs confirmed by inspection + passing build.

---

## Discrimination Sensor

Method: mutate one committed feature file in place → run only the covering package test → confirm
kill → `git checkout -- <file>`. No stash/reset/branch-checkout. Working tree verified unchanged after
(only foreign WIP + untracked `.specs/mockup-generator/` remain, identical to baseline).

| # | File:line | Mutation | Test run | Killed? |
| - | --------- | -------- | -------- | ------- |
| 1 | `mockupGeometry.ts:12` | `ry: zone.ry * bgH` → `* bgW` (axis flip) | `mockupGeometry.test.ts` | ✅ Killed (2 failed: ellipse map + round-trip) |
| 2 | `composeMockup.ts:43` | removed `ctx.globalCompositeOperation = …` set | `composeMockup.test.ts` | ✅ Killed (2 failed: ENG-01 order + multiply-default) |
| 3 | `loadImage.ts:7` | moved `img.crossOrigin='anonymous'` to AFTER `img.src=src` | `loadImage.test.ts` | ✅ Killed (1 failed: ENG-02 ordering) |
| 4 | `renderPlan.ts:9` | `appendImages` prepend `[...added, ...existing]` | `renderPlan.test.ts` | ✅ Killed (1 failed: APP-04 order/primary) |
| 5 | `renderPlan.ts:17` | `summarizeUploads` filter `u !== null` → `u === null` | `renderPlan.test.ts` | ✅ Killed (4 failed: APP-05 counts) |

**Sensor depth**: lightweight (5 behavior-level mutations, one per unit-tested seam across all 4 test files).
**Result**: 5/5 killed — ✅ PASS. Tests are discriminating for the mutated behaviors.

---

## Code Quality

| Principle | Status |
| --------- | ------ |
| Minimum code (no features beyond spec) | ✅ pure helpers minimal; dialogs scoped to their AC |
| Surgical changes (no unrelated edits) | ✅ `uploadProductImage` refactor keeps behavior (delegates to `uploadImageBlob`); CustomPin/ProductForm diffs add only the new path |
| No scope creep | ✅ |
| Matches existing patterns | ✅ `useMockups`←`useStoreSettings`; `useAdminMockups`←`useAdminProducts`; migrations←`store_settings` |
| Spec-anchored outcome check (asserted values match spec) | ✅ all 8 unit ACs assert exact spec values |
| Per-layer Coverage Expectation met (engine 1:1 ACs; helpers cover APP-04/05) | ✅ matches approved matrix |
| Every test maps to a spec requirement — no unclaimed tests | ✅ 4 files → ENG-01..06 / APP-04 / APP-05 only |
| Documented guidelines followed | ✅ `CLAUDE.md` (stack/conventions) + `tasks.md` Test Coverage Matrix |

Minor observations (within design intent, not defects): `mockup_templates.blend_mode` and `art_zone`
are free `text`/`jsonb` without DB CHECK/schema constraints — bounds are enforced client-side
(`clampArtZone`, curated blend `Select`), consistent with `design.md` SQL. No action required.

---

## Edge Cases

- [x] Template without overlay → bg+art, no blend, no error (ENG-04) — tested `composeMockup.test.ts:113-122`
- [x] Image fails to load → `composeMockup`/`loadImage` reject, UI shows error, no crash — `loadImage.test.ts:54-58` (rejection); UI try/catch `MockupStudioDialog`, `MockupPreviewCarousel` (inspection)
- [x] `toDataURL` of Storage asset without crossOrigin would `SecurityError`; `loadImage` prevents it — negative ordering test `loadImage.test.ts:38-46`
- [x] Empty collection → Admin `EmptyState`, Store hides preview — `AdminMockupsPage.tsx:111-121`, `MockupPreviewCarousel.tsx:70`
- [x] Deleted template later → already-attached product image persists (independent copy in `product-images`, no FK) — by design; confirmed in delete AlertDialog copy
- [x] art-zone values outside 0..1 → clamped before save — tested `mockupGeometry.test.ts:54-71`; `ArtZoneEditor` emits `clampArtZone`
- [x] Product without images + render appended → render becomes primary — tested `renderPlan.test.ts:13-17`
- [x] Very high-res bg → export respects bg resolution, no upscale — tested ENG-06 `composeMockup.test.ts:136-142`

All spec edge cases handled.

---

## Gate Check

- **Commands** (scoped to avoid foreign-WIP interference):
  - `pnpm --filter @nanapin/core test` → **92 passed**, 0 failed, 0 skipped (6 files)
  - `pnpm --filter @nanapin/backoffice test` → **49 passed**, 0 failed, 0 skipped (10 files)
  - `pnpm --filter @nanapin/backoffice build` → ✅ green (3622 modules)
  - `npx tsc --noEmit -p apps/backoffice` → ✅ exit 0
  - `pnpm --filter @nanapin/store build` → ✅ green (3133 modules)
  - `npx tsc --noEmit -p apps/store` → ✅ exit 0 (no new errors in `features/mockup-preview/**` or `CustomPinPage.tsx`)
- **Test count before feature**: core 73, backoffice 40 (113 total)
- **Test count after feature**: core 92, backoffice 49 (141 total)
- **Delta**: **+28** (core +19: geometry 11 / loadImage 3 / compose 5; backoffice +9: renderPlan)
- **Skipped tests**: none
- **Failures**: none
- **Test integrity**: no existing test weakened, skipped, or deleted; new tests only.

(Note: `pnpm lint` has **pre-existing** `no-explicit-any` errors in admin hooks — documented debt in
`CLAUDE.md`/`tasks.md`; not a regression of this feature. Builds transpile+typecheck green.)

---

## Requirement Traceability Update

| Requirement | Previous | New |
| ----------- | -------- | --- |
| ENG-01 | Pending | ✅ Verified |
| ENG-02 | Pending | ✅ Verified |
| ENG-03 | Pending | ✅ Verified |
| ENG-04 | Pending | ✅ Verified |
| ENG-05 | Pending | ✅ Verified |
| ENG-06 | Pending | ✅ Verified |
| COL-01 | Pending | ✅ Verified (build-gate) |
| COL-02 | Pending | ✅ Verified (build-gate) |
| COL-03 | Pending | ✅ Verified (build-gate) |
| COL-04 | Pending | ✅ Verified (build-gate) |
| COL-05 | Pending | ✅ Verified (build-gate) |
| COL-06 | Pending | ✅ Verified (build-gate) |
| APP-01 | Pending | ✅ Verified (build-gate) |
| APP-02 | Pending | ✅ Verified (build-gate) |
| APP-03 | Pending | ✅ Verified (build-gate) |
| APP-04 | Pending | ✅ Verified |
| APP-05 | Pending | ✅ Verified |
| APP-06 | Pending | ✅ Verified (build-gate) |
| STR-01 | Pending | ✅ Verified (build-gate) |
| STR-02 | Pending | ✅ Verified (build-gate) |
| STR-03 | Pending | ✅ Verified (build-gate) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 8/8 unit-tested ACs matched the spec-defined outcome; 0 spec-precision gaps. 13/13 UI/build-gate ACs confirmed by code inspection + passing build.
**Sensor**: 5/5 mutations killed.
**Gate**: core 92 passed, backoffice 49 passed; both apps build + typecheck green (+28 tests, none skipped).

**What works**:
- Engine (`@nanapin/core/mockup`): geometry (normalized↔px, cover-fit, clamp), crossOrigin-safe `loadImage`, and `composeMockup` draw order / blend / no-overlay path / natural-resolution canvas — all directly asserted and mutation-verified.
- Studio helpers (`appendImages`, `summarizeUploads`): append-preserving-order and partial-failure accounting — directly asserted and mutation-verified.
- Admin collection + studio, product-form integration, and store "Prévia real" tab match the design; RLS is public-read/admin-write; STR-03 flat-art invariant confirmed unchanged in the diff.

**Issues found**: none.

**Next steps**: none required. Optional (non-blocking) hardening ideas, not gaps: add a DB CHECK on
`blend_mode` and browser-level (real-canvas) export/tainting checks — both explicitly out of the
approved unit matrix and deferred to manual/UAT.
