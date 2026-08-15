# 25 · Prévia real da Home — tasks

**14 tasks em 5 fases.** Sub-agentes **não** são usados nesta feature: a sessão proíbe despachar
agentes sem pedido explícito, então as tasks correm em linha e o Verifier roda como passe
independente (`validate.md`, fallback standalone) depois do fecho.

**Commits**: agrupados no fim (decisão do usuário, fecha `BL-012` pelo lado do `CLAUDE.md`). Nenhum
commit por task.

---

## Fase 1 — O contrato, em `core`

### T1 · `preview.ts` em `@estrelinha/core/home`
- `PREVIEW_SOURCE`, `PREVIEW_PARAM`, `PREVIEW_DEBOUNCE_MS`, `PreviewMessage`
- `isPreviewWindow`, `parsePreviewMessage`, `previewScale`
- entra no barrel
- **Verifica**: `preview.test.ts` cobre `PRV-01`, `PRV-04` e a escala; `catalog.test.ts` segue verde
  (módulo puro, sem React/Supabase)

## Fase 2 — A loja

### T2 · `useHomeSections` ganha `enabled`
- **Verifica**: com `enabled: false` nenhuma consulta sai (`PRV-02 AC 1`)

### T3 · `useHomePreview`
- detecta o modo, faz o aperto de mão, guarda `sections` e `highlightId`, filtra remetente
- **Verifica**: `PRV-03`, `PRV-04`; `sections` inicial é `[]` e **não** o piso (`PRV-03 AC 3`)

### T4 · `HomeRenderer` em modo prévia
- prop opcional `preview`; com ela, invólucro `data-home-section-id` + contorno + etiqueta
- **Verifica**: `PRV-06`; **modo normal com DOM inalterado** e `homeComposition.test.tsx` sem perder
  asserção

### T5 · `HomePage` e `App.tsx`
- a página escolhe a fonte; o `App` não monta `AbandonedCartTracker` em modo prévia
- clique capturado, sem navegação, devolve `select`
- **Verifica**: `PRV-01`, `PRV-02 AC 2`, `PRV-05`

## Fase 3 — A ponte, no painel

### T6 · `shared/lib/storeOrigin.ts`
- único leitor de `VITE_STORE_URL`; `storeUrl.ts` passa a importar `STORE_URL` de lá
- **Verifica**: `storeOrigin()` devolve só a origem; sem env devolve `null`; `SlugField.test.tsx`
  segue verde (o caminho ancorado continua existindo)

### T7 · `usePreviewBridge`
- envia `draft` (debounce) e `highlight` (sem debounce) com `targetOrigin` exato; recebe `ready` e
  `select` com dupla checagem de remetente
- **Verifica**: `PRV-07`, `PRV-08`, `PRV-09 AC 2`, `PRV-10`

### T8 · `HomeSectionEditor` reporta o rascunho
- `onDraftChange?: (draft: SectionSaveDraft) => void`
- **Verifica**: digitar dispara com o valor corrente; não dispara ao montar sem alteração

## Fase 4 — O palco e o layout

### T9 · `HomeLivePreview`
- barra (`390 × 844 · 100%`, recarregar, abrir), alternador Celular/Computador, iframe escalado,
  estado vazio sem env
- **Verifica**: `PRV-14`, `PRV-15`, `PRV-17`; trocar dispositivo não muda o `src`

### T10 · `AdminHomePage` invertida
- `grid-cols-[380px_minmax(0,1fr)]`, rail primeiro; rascunho da seção aberta; hover → `highlight`;
  `select` → navegar; abas mantidas abaixo de `lg`
- **Verifica**: `PRV-12`, `PRV-13` (identidade do nó do iframe), `PRV-11`, `PRV-16`

### T11 · `HomeSectionRow` no rail de 380
- palavra de estado passa a `sr-only`
- **Verifica**: `HomeSectionList.test.tsx` segue verde

## Fase 5 — Remoção e fecho

### T12 · Apagar o segundo desenho
- `HomePreview.tsx`, `HomePreview.test.tsx`, export do barrel
- guarda novo: nenhum arquivo de `features/home-composition` renderiza tipo de seção
- **Verifica**: `PRV-18`

### T13 · Configuração e documentação
- `apps/backoffice/.env.example` ganha `VITE_STORE_URL`
- `CLAUDE.md`: bloco da Home, guardas, convenção de commits (`BL-012`)
- `.specs/STATE.md`: `AD-019` (a prévia é a loja) + handoff; `BACKLOG.md`: `BL-012` fechado,
  `BL-013` novo (`frame-ancestors` em produção)

### T14 · Gate e commits
- por workspace, exit code capturado de verdade; `git diff --name-only … -- packages/core/src/payment`
  vazio; lint contra a baseline de 30/8; `tsc` 0/0
- commits agrupados
