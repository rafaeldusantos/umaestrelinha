# Mockup Generator — Design

**Spec**: `.specs/features/05-mockup-generator/spec.md`
**Context**: `.specs/features/05-mockup-generator/context.md`
**Status**: Draft

Abordagem macro **confirmada no discovery** (context.md D1–D4): engine própria em canvas, templates
prontos fatiados em fundo+overlay, saída anexada ao `images[]`, realismo frente+elipse. Este design
detalha os componentes; as escolhas internas (split geometria/canvas, buckets, testes) estão em
**Tech Decisions**.

---

## Architecture Overview

Uma **engine pura compartilhada** (`@nanapin/core/mockup`) faz toda a composição em canvas e é
consumida pelos dois apps. Um **template** = fundo + overlay opcional + art-zone (elipse normalizada)
+ blend, persistido em `mockup_templates` (RLS: leitura pública, escrita admin). O **Admin** cria a
coleção e aplica uma arte a N templates, gerando renders que sobem para `product-images` e são
anexados ao `images[]` do produto. A **Loja** lê os templates ativos e compõe a arte chapada do
cliente client-side (só exibição).

```mermaid
graph TD
    subgraph core["@nanapin/core/mockup (engine pura)"]
        GEO[mockupGeometry.ts<br/>normalizado→px, cover-fit, elipse — puro]
        LI[loadImage.ts<br/>crossOrigin=anonymous]
        CM[composeMockup.ts<br/>fundo→arte(clip)→overlay blend]
        GEO --> CM
        LI --> CM
    end
    subgraph db["Supabase"]
        MT[(mockup_templates<br/>RLS: read público / write admin)]
        BKT[[bucket mockup-templates<br/>fundo+overlay]]
        PIMG[[bucket product-images<br/>renders finais]]
    end
    subgraph bo["apps/backoffice"]
        AMP[AdminMockupsPage /admin/mockups] --> AZE[ArtZoneEditor]
        AMP --> MTD[MockupTemplateDialog] --> UAM[uploadMockupAsset] --> BKT
        MTD --> UAM2[useAdminMockups CRUD] --> MT
        PFD[ProductFormDialog] --> MSD[MockupStudioDialog]
        MSD --> CM
        MSD --> UIB[uploadImageBlob] --> PIMG
        MSD -->|append URLs| PFD
    end
    subgraph st["apps/store"]
        CPP[CustomPinPage] -->|arte chapada| MPC[MockupPreviewCarousel]
        MPC --> UM[useMockups ativos] --> MT
        MPC --> CM
    end
    CM -.usa.-> MT
```

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| Lógica de canvas (clip circular, `drawImage`, export 2×) | `apps/store/src/pages/CustomPinPage.tsx:139-371` (`drawCanvas`/`generateExportDataUrl`) | Extrair a essência para `composeMockup`; a página passa a consumir a engine e a fornecer a arte chapada à prévia |
| Upload comprimido → Storage | `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts` | Refatorar: extrair `uploadImageBlob(blob)` (compress ≤1200 WebP) reutilizado por `uploadProductImage` **e** pelos renders de mockup |
| Padrão de hook admin CRUD | `apps/backoffice/src/entities/product/api/useAdminProducts.ts` | Molde de `useAdminMockups` (useState + supabase + `fetch`/create/update/delete) |
| Padrão de hook compartilhado (React Query + default-on-error) | `packages/core/src/hooks/useStoreSettings.ts` | Molde de `useMockups()` (ativos; erro → `[]` para não quebrar a loja) |
| Shared UI do admin | `apps/backoffice/src/shared/ui` (`PageHeader`, `FormCard`, `EmptyState`, `AdminTable`) | Compõem `AdminMockupsPage` (decisão STATE.md [2026-07-20]) |
| Seção de imagens + estado `imageUrls` | `apps/backoffice/src/features/product-form/ui/ProductFormDialog.tsx:197-270` | `MockupStudioDialog` recebe/retorna via callback que faz `setImageUrls(prev => [...prev, ...urls])` |
| Pointer math de drag (mouse/touch, scaleRatio) | `CustomPinPage.tsx:270-316` | Reaproveitar no `ArtZoneEditor` (arrastar/redimensionar a elipse) |
| Migration/RLS `has_role` + trigger updated_at | `supabase/migrations/20260414121021_*.sql:179-220`, `..._create_store_settings.sql` | Molde da migration de `mockup_templates` |
| Bucket público + policies | `supabase/migrations/20260415095816_create_product_images_bucket.sql` | Molde do bucket `mockup-templates` (mas **escrita admin**, não authenticated) |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Supabase Storage | `mockup-templates` (assets de template) + `product-images` (renders, já existente). URLs públicas com CORS `*` → `crossOrigin` no `loadImage` |
| `mockup_templates` (DB) | `useMockups` (loja, anon, `is_active=true`) e `useAdminMockups` (admin, tudo) via `@nanapin/supabase/client` |
| Produto | Renders anexados ao `DbProduct.images[]` pelo fluxo existente do `ProductFormDialog` (nenhum campo novo no produto) |
| `AdminLayout` nav + `App.tsx` rotas | Novo item "Mockups" + rota `/admin/mockups` |

---

## Components

### 1. Engine `@nanapin/core/mockup`
- **Purpose**: Composição pura de arte sobre template, reutilizável nos dois apps.
- **Location**: `packages/core/src/mockup/{types.ts,mockupGeometry.ts,loadImage.ts,composeMockup.ts,index.ts}` (+ reexport em `packages/core/src/index.ts`).
- **Interfaces**:
  - `loadImage(src: string): Promise<HTMLImageElement>` — seta `img.crossOrigin='anonymous'` **antes** do `src`; resolve no `onload`, rejeita no `onerror`.
  - `resolveArtZone(zone: ArtZone, bgW: number, bgH: number): PxZone` — normalizado 0..1 → px (puro).
  - `coverFitTransform(artW, artH, zone: PxZone, t?: Partial<ArtTransform>): { scale, dx, dy, rotation }` — baseline cover-fit + ajustes do usuário (puro).
  - `clampArtZone(zone: ArtZone): ArtZone` — clampa cx/cy/rx/ry a [0,1] (puro).
  - `composeMockup(input: ComposeInput): ComposeResult` — desenha fundo → `save`+clip(elipse) → arte (transform) → `restore` → overlay (`globalCompositeOperation=blendMode`); canvas na resolução do fundo. Retorna `{ canvas, toBlob, toDataURL }`.
- **Dependencies**: DOM (`document.createElement('canvas')`, `Image`). Sem libs novas.
- **Reuses**: lógica de `CustomPinPage.generateExportDataUrl`.

### 2. Migration A — bucket `mockup-templates`
- **Purpose**: Armazenar assets (fundo/overlay) dos templates.
- **Location**: `supabase/migrations/<ts>_create_mockup_templates_bucket.sql`
- **Conteúdo**: `insert into storage.buckets ('mockup-templates', public=true)`; policy SELECT `to public`; policies INSERT/UPDATE/DELETE **`to authenticated using (bucket_id='mockup-templates' and public.has_role(auth.uid(),'admin'))`** (escopo admin — conforme AD [2026-07-18], diferente do bucket product-images legado).

### 3. Migration B — tabela `mockup_templates`
- **Purpose**: Metadados dos templates.
- **Location**: `supabase/migrations/<ts>_create_mockup_templates_table.sql`
- **Conteúdo**: tabela (ver Data Models); `ENABLE ROW LEVEL SECURITY`; policy SELECT `USING (true)` (loja anon lê); policy ALL admin `has_role`; trigger `updated_at` (molde store_settings). Sem seed (templates entram via admin).

### 4. Tipos `packages/supabase/src/types/mockup.ts`
- **Purpose**: Contratos de `ArtZone`/`MockupTemplate`/`ComposeInput` compartilhados.
- **Location**: novo arquivo + reexport em `packages/supabase/src/types/index.ts` (subpath `@nanapin/supabase/types/mockup`).

### 5. Backoffice entity `entities/mockup`
- **Purpose**: Dados + upload de assets de template.
- **Location**: `apps/backoffice/src/entities/mockup/{api/useAdminMockups.ts,lib/uploadMockupAsset.ts,index.ts}`
- **Interfaces**: `useAdminMockups()` → `{ templates, loading, fetch, create, update, remove }` (molde `useAdminProducts`, ordena por `sort_order`); `uploadMockupAsset(file, kind:'background'|'overlay'): Promise<string|null>` (sobe ao bucket `mockup-templates`, sem compressão destrutiva do overlay — preservar transparência PNG).
- **Reuses**: `useAdminProducts` (molde), `supabase.storage`.

### 6. Refactor `uploadProductImage.ts`
- **Purpose**: Reuso do pipeline de compress+upload para `Blob`.
- **Location**: `apps/backoffice/src/features/product-form/lib/uploadProductImage.ts`
- **Mudança**: `compressImage` passa a aceitar `Blob` (File já é Blob); novo `uploadImageBlob(blob): Promise<string|null>` faz compress ≤1200 WebP + upload em `product-images/products`; `uploadProductImage(file)` delega a `uploadImageBlob`. Renders de mockup usam `uploadImageBlob`.

### 7. Backoffice feature `mockup-studio`
- **Location**: `apps/backoffice/src/features/mockup-studio/ui/{ArtZoneEditor,MockupTemplateDialog,MockupStudioDialog}.tsx` (+ `index.ts`)
- **ArtZoneEditor**: canvas/overlay sobre o preview do fundo; arrasta centro (mover), handle de borda (rx/ry), handle de rotação; emite `ArtZone` normalizado. Reusa pointer math do CustomPinPage.
- **MockupTemplateDialog**: criar/editar template — upload fundo (obrigatório) + overlay (opcional) via `uploadMockupAsset`, nome, `blend_mode` (select curado), `is_active`, `sort_order`, `ArtZoneEditor`, e **prévia ao vivo** via `composeMockup` com arte de amostra. Salva via `useAdminMockups`.
- **MockupStudioDialog**: recebe `{ productImages: string[], onGenerated: (urls) => void }`. Passos: (1) escolher arte (novo upload OU `productImages`); (2) selecionar N templates ativos + ajustar escala/offset por template (sliders, molde CustomPinPage); (3) prévia; (4) **Gerar** → por template `composeMockup(...).toBlob()` → `uploadImageBlob` → coleta URLs; sucesso parcial reportado por toast; chama `onGenerated(urls)`.

### 8. Backoffice page `AdminMockupsPage` + rota/nav
- **Location**: `apps/backoffice/src/pages/admin/AdminMockupsPage.tsx`; rota em `apps/backoffice/src/app/App.tsx`; item em `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` (`navItems`, ícone `ImagePlus`/`Sparkles`).
- **Conteúdo**: `PageHeader` + lista (cards/`AdminTable`) com thumb, nome, ativo, ordem, ações (editar/ativar/excluir); `EmptyState` quando vazio; botão "Novo mockup" abre `MockupTemplateDialog`. Tokens shadcn.

### 9. Integração `ProductFormDialog`
- **Location**: `apps/backoffice/src/features/product-form/ui/ProductFormDialog.tsx`
- **Mudança**: botão **"Gerar mockup"** na seção de imagens abre `MockupStudioDialog` com `productImages={imageUrls}`; `onGenerated={urls => setImageUrls(prev => [...prev, ...urls])}`. Nenhuma mudança no payload/submit (APP-06).

### 10. Store feature `mockup-preview`
- **Location**: `apps/store/src/features/mockup-preview/ui/MockupPreviewCarousel.tsx` (+ `index.ts`)
- **Interfaces**: `<MockupPreviewCarousel artDataUrl={string} />` — carrega templates ativos via `useMockups`, compõe a arte (downscale de preview) via `composeMockup`, exibe carrossel. Coleção vazia → render nulo/aviso.
- **Reuses**: `@nanapin/ui/carousel`, `composeMockup`, `useMockups`.

### 11. Store `useMockups` + integração `CustomPinPage`
- **Location**: `packages/core/src/hooks/useMockups.ts` (reexport no barrel); `apps/store/src/pages/CustomPinPage.tsx`
- **useMockups**: React Query `['mockup_templates','active']`, `is_active=true` ordenado por `sort_order`; erro → `[]` (molde useStoreSettings).
- **CustomPinPage**: nova aba/toggle "Prévia real" no card do canvas → `MockupPreviewCarousel artDataUrl={generateExportDataUrl()}`. `handleExport`/`handleAddToCart` **inalterados** (arte chapada — STR-03).

---

## Data Models

```typescript
// packages/supabase/src/types/mockup.ts
export type ArtZoneShape = 'circle' | 'ellipse'
export type MockupBlendMode = 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'normal'

export interface ArtZone {
  shape: ArtZoneShape
  cx: number; cy: number        // centro normalizado 0..1
  rx: number; ry: number        // raios normalizados 0..1 (circle: rx=ry)
  rotation: number              // graus
}

export interface MockupTemplate {
  id: string
  name: string
  background_url: string
  overlay_url: string | null
  art_zone: ArtZone
  blend_mode: MockupBlendMode
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

// engine
export interface ArtTransform { scale: number; offsetX: number; offsetY: number; rotation: number }
export interface ComposeInput {
  background: HTMLImageElement
  art: HTMLImageElement
  overlay?: HTMLImageElement | null
  artZone: ArtZone
  transform?: Partial<ArtTransform>
  blendMode?: MockupBlendMode
}
export interface ComposeResult {
  canvas: HTMLCanvasElement
  toBlob: (type?: string, quality?: number) => Promise<Blob>
  toDataURL: (type?: string, quality?: number) => string
}
```

**SQL (Migration B):**
```sql
create table if not exists public.mockup_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  background_url text not null,
  overlay_url text,
  art_zone jsonb not null,
  blend_mode text not null default 'multiply',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```
**Relationships**: independente de `products` — os renders viram cópias em `product-images` referenciadas por `products.images[]` (sem FK; excluir template não afeta imagens já geradas).

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Imagem (fundo/overlay/arte) não carrega | `loadImage` rejeita → `composeMockup` propaga | Toast de erro; prévia/geração não trava |
| `toDataURL/toBlob` tainted (asset sem CORS) | Prevenido por `crossOrigin` no `loadImage` (ENG-02) | Nenhum; validado em browser na fase de validação |
| Parte dos uploads de render falha | Anexa os sucessos, reporta falhas | Toast "X de N gerados"; UI segue (APP-05) |
| Template sem overlay | Composição fundo+arte, sem blend | Prévia normal (ENG-04) |
| Coleção vazia | Admin: `EmptyState`; Loja: prévia oculta | Sem erro (edge cases) |
| Fundo enorme na prévia da loja | Downscale para tamanho de preview | Prévia fluida; render admin usa compress ≤1200 no upload |
| Excluir template já usado | Imagem no produto persiste (cópia) | Nenhum |

---

## Risks & Concerns

| Concern | Location | Impact | Mitigation |
| ------- | -------- | ------ | ---------- |
| `@nanapin/core` vitest é `environment: 'node'` (sem canvas) | `packages/core/vitest.config.ts:5` | `composeMockup` não roda em teste node | **Split**: geometria pura em `mockupGeometry.ts` (testes node) + contrato de `composeMockup` via **fake ctx** capturando chamadas (ordem, blend, sem-overlay); render pixel-perfect fica p/ validação em browser |
| Canvas tainting se Storage não enviar CORS `*` | Storage público supabase | `toDataURL` lança `SecurityError` | `crossOrigin='anonymous'` no `loadImage` (ENG-02); manter URLs no domínio público padrão; teste manual de export na validação |
| `generateExportDataUrl` é privado no `CustomPinPage` (727 linhas, monolito) | `apps/store/src/pages/CustomPinPage.tsx` | Acoplamento ao adicionar prévia | Prévia extraída para `features/mockup-preview`; a página só chama `generateExportDataUrl()` e passa a dataURL |
| Memória/latência compondo fundos 4700×3300 na loja ao vivo | engine | Travar a aba de prévia | Downscale de preview; compor sob demanda (aba), não a cada frame |
| Overlay comprimido perde transparência | `uploadMockupAsset` | Overlay sem alpha quebra o realismo | Overlay sobe como **PNG sem recompressão destrutiva** (não passa pelo pipeline WebP de produto) |
| RLS: anon precisa ler templates ativos | Migration B | Loja não carrega prévia | Policy SELECT `USING (true)`; validar leitura como anon no Supabase local |
| Boundary FSD (features→features) | store/backoffice | Warn de `eslint-plugin-boundaries` | Prévia consome engine de `@nanapin/core` (shared), não outra feature; estúdio no `product-form` fica coeso (mesma feature) |

> None hidden — todos com mitigação.

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Local da engine | `@nanapin/core/mockup` | Único código de composição p/ os 2 apps; core já hospeda cross-app utils/hooks |
| Testabilidade | Geometria pura (node) + `composeMockup` via fake ctx | core roda vitest `node`; evita dependência de canvas real/jsdom |
| Bucket dos renders | Reusar `product-images` (não novo bucket) | Renders **são** imagens de produto; consistência com o fluxo atual |
| Bucket dos templates | Novo `mockup-templates`, escrita admin | Assets são de curadoria admin; RLS escopada (AD [2026-07-18]) |
| Compressão | Renders passam por compress ≤1200 WebP (reuso); **overlays** sobem PNG cru | Renders = fotos de produto (leves); overlay precisa de alpha |
| art-zone | Elipse normalizada 0..1 (cobre círculo e leve ângulo) | Realismo v1 (D4); resolução-independente |
| Blend | `globalCompositeOperation` + 1 overlay, set curado no admin | Suficiente p/ botton; multicamada é fase futura |
| Prévia da loja | Só exibição; download/carrinho seguem chapados | Correção de domínio (T6/STR-03) |
| Hook da loja | React Query com erro→`[]` | Não quebrar a loja se a tabela faltar (molde useStoreSettings) |

> Decisões de nível de projeto (RLS escopada, mockup=exibição, engine canvas própria) já registradas em `.specs/STATE.md` `## Decisions` [2026-07-20]. As demais são feature-local.
