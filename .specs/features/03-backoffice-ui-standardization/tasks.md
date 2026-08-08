# Backoffice UI Standardization Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path.

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/03-backoffice-ui-standardization/design.md`
**Status**: In Progress

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec. Guidelines found: `CLAUDE.md` (stack/conventions; sem thresholds de cobertura). Infra de teste: vitest + @testing-library/react + jsdom (hoisted no root; store/core já usam). Backoffice não tinha testes — T1 adiciona a config.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica pura de UI (`getPageItems`, `isNavActive`, `onSort` callback) | unit | Todos os ramos; 1:1 com ACs de COMP-02/COMP-05/LAYOUT-01 + edge cases (limites, não-sortable, prefixo) | `apps/backoffice/src/**/*.{test,spec}.{ts,tsx}` | `pnpm --filter @nanapin/backoffice test` |
| Componentes de apresentação (PageHeader, FormCard, StatCard, EmptyState, FieldGroup, AdminTable, Pagination, Skeletons) | unit (render) | Render com props representativas: presença de título/valor/empty-state; callbacks disparam | idem | `pnpm --filter @nanapin/backoffice test` |
| Páginas admin (migrações) | none | Build gate (visual/integração; ACs verificados por build + navegação manual) | — | build gate |
| Config (vitest/setup) | none | Build gate | — | build gate |
| Product form (reescrita de layout) | none | Build gate + verificação manual; lógica/payload preservados (sem função pura nova) | — | build gate |

**Coverage Expectation:** lógica pura e callbacks = unit obrigatório; render de componentes = smoke unit (não-shallow: asserta saída real, não tautologia); páginas/product-form = build gate (não há como unit-testar layout/tema sem mock pesado dos hooks — fora do teto do spec).

## Gate Check Commands

> Generated from codebase — `pnpm` + Turbo (ver CLAUDE.md).

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Após tasks com testes unit | `pnpm --filter @nanapin/backoffice test` |
| Full | Igual ao Quick (sem e2e/integration no escopo) | `pnpm --filter @nanapin/backoffice test` |
| Build | Fim de fase, ou tasks de config/página/product-form | `pnpm --filter @nanapin/backoffice build && pnpm --filter @nanapin/backoffice lint` |

> Nota de lint: `pnpm lint` tem erros **pré-existentes** de `no-explicit-any` nos hooks admin (dívida conhecida, ver CLAUDE.md). O gate Build exige **não introduzir novos** erros — comparar com a baseline, não zerar os pré-existentes.

---

## Execution Plan

### Phase 1: Infra de teste + componentes-folha
```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```
### Phase 2: Componentes compostos + barrel
```
T8 → T9 → T10
```
### Phase 3: Tela de produto (duas colunas)
```
T11 → T12
```
### Phase 4: AdminLayout
```
T13 → T14
```
### Phase 5a: Migração — páginas de tabela/métrica
```
T15 → T16 → T17 → T18 → T19
```
### Phase 5b: Migração — páginas de card/formulário
```
T20 → T21 → T22 → T23
```

---

## Task Breakdown

### T1: Configurar vitest no backoffice
**What**: Adicionar `vitest.config.ts` e `src/test/setup.ts` espelhando o store.
**Where**: `apps/backoffice/vitest.config.ts`, `apps/backoffice/src/test/setup.ts`
**Depends on**: None · **Reuses**: `apps/store/vitest.config.ts`, `apps/store/src/test/setup.ts` · **Requirement**: infra (habilita COMP-*/LAYOUT tests)
**Tools**: MCP: NONE · Skill: NONE
**Done when**:
- [ ] `vitest.config.ts` com jsdom, globals, setupFiles, aliases `@`/`@nanapin/*`
- [ ] `setup.ts` importa jest-dom e mock de matchMedia
- [ ] `pnpm --filter @nanapin/backoffice test` roda (passWithNoTests) sem erro
**Tests**: none · **Gate**: build

### T2: EmptyState
**What**: Componente de estado vazio.
**Where**: `apps/backoffice/src/shared/ui/EmptyState.tsx`, `EmptyState.test.tsx`
**Depends on**: T1 · **Reuses**: `cn`, lucide · **Requirement**: COMP-03 (parcial), edge "lista vazia"
**Done when**:
- [ ] Renderiza `message`, e `hint`/`icon`/`action` quando fornecidos
- [ ] Teste asserta texto da mensagem e presença do hint/ação
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`
**Tests**: unit · **Gate**: quick

### T3: PageHeader
**What**: Cabeçalho de página padrão.
**Where**: `apps/backoffice/src/shared/ui/PageHeader.tsx`, `PageHeader.test.tsx`
**Depends on**: T1 · **Reuses**: `Button`, `cn` · **Requirement**: COMP-01
**Done when**:
- [ ] Renderiza título; subtítulo/ações/ícone só quando passados; botão voltar chama `backTo`
- [ ] Testes: título presente; sem subtítulo→não renderiza subtítulo; clique em voltar dispara callback
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T4: FormCard
**What**: Card de seção de formulário.
**Where**: `apps/backoffice/src/shared/ui/FormCard.tsx`, `FormCard.test.tsx`
**Depends on**: T1 · **Reuses**: `Card*` · **Requirement**: COMP-06
**Done when**:
- [ ] Envolve children no `Card`; header com title/description só quando passados
- [ ] Testes: children renderizados; título presente/ausente conforme prop
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T5: StatCard
**What**: Card de métrica.
**Where**: `apps/backoffice/src/shared/ui/StatCard.tsx`, `StatCard.test.tsx`
**Depends on**: T1 · **Reuses**: `Card`, `cn` · **Requirement**: COMP-04
**Done when**:
- [ ] Renderiza label, value, ícone; subtitle quando passado
- [ ] Testes: label e value presentes; subtitle condicional
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T6: FieldGroup + ToggleField
**What**: Campo com label/hint e linha com switch.
**Where**: `apps/backoffice/src/shared/ui/FieldGroup.tsx`, `FieldGroup.test.tsx`
**Depends on**: T1 · **Reuses**: `Label`, `Switch` (promove de AdminSettingsPage) · **Requirement**: MIG-04 (base)
**Done when**:
- [ ] `FieldGroup` renderiza label, children e hint condicional; `ToggleField` chama `onChange`
- [ ] Testes: label/hint; toggle dispara callback com novo valor
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T7: Skeletons
**What**: `TableSkeleton` e `CardSkeleton`.
**Where**: `apps/backoffice/src/shared/ui/Skeletons.tsx`, `Skeletons.test.tsx`
**Depends on**: T1 · **Reuses**: `Skeleton` de `@nanapin/ui` · **Requirement**: COMP (loading)
**Done when**:
- [ ] `TableSkeleton` renderiza `rows`×`cols` placeholders
- [ ] Teste: nº de linhas de placeholder = `rows`
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T8: Pagination + getPageItems
**What**: Rodapé de paginação e função pura de janela/elipse.
**Where**: `apps/backoffice/src/shared/ui/Pagination.tsx`, `Pagination.test.tsx`
**Depends on**: T1 · **Reuses**: lógica de `AdminProductsPage.tsx:225-236`, `Button` · **Requirement**: COMP-05, edge limites
**Done when**:
- [ ] `getPageItems(page,totalPages)` exportada, pura, com elipses corretas
- [ ] Prev/next desabilitados em page=1 / page=totalPages
- [ ] Testes: casos 1 pág, muitas págs (elipse), limites → `onPageChange` não é chamado além dos limites
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T9: AdminTable
**What**: Tabela padronizada (header, zebra, sort opcional, empty-state, footer).
**Where**: `apps/backoffice/src/shared/ui/AdminTable.tsx`, `AdminTable.test.tsx`
**Depends on**: T2, T8 · **Reuses**: `EmptyState`, `Pagination`, lucide, `cn` · **Requirement**: COMP-02, COMP-03, COMP-07, edge não-sortable
**Done when**:
- [ ] Renderiza colunas/linhas via `cell`; zebra por índice
- [ ] Clique em coluna `sortable` chama `onSort(key)`; coluna não-sortable NÃO chama `onSort`
- [ ] `data` vazio → renderiza `EmptyState` (mensagem), sem linhas
- [ ] Testes: render de células; onSort disparado só em sortable; empty-state em lista vazia
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T10: Barrel shared/ui
**What**: `index.ts` reexportando os componentes.
**Where**: `apps/backoffice/src/shared/ui/index.ts`
**Depends on**: T2–T9 · **Reuses**: — · **Requirement**: COMP (public API)
**Done when**:
- [ ] Exporta PageHeader, FormCard, StatCard, AdminTable, Pagination, EmptyState, TableSkeleton, CardSkeleton, FieldGroup, ToggleField
- [ ] Gate: build (import resolve)
**Tests**: none · **Gate**: build

### T11: Reescrever AdminProductFormPage em duas colunas
**What**: Layout duas colunas (conteúdo em FormCards + lateral sticky Publicação/Resumo), largura cheia, TabsList com fundo. Lógica/estado/handlers/payload inalterados.
**Where**: `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx` (modify)
**Depends on**: T3, T4, T10 · **Reuses**: `PageHeader`, `FormCard`, cálculo de margem existente · **Requirement**: PROD-01..06, edge custo=0 / <lg empilha
**Done when**:
- [ ] Grid `lg:grid-cols-3` (conteúdo `col-span-2` + lateral sticky)
- [ ] Cada seção em `FormCard` com fundo; TabsList estilizada (não transparente); aba "Publicação" removida (migrada p/ lateral)
- [ ] Resumo mostra margem via fórmula atual; custo=0 → sem margem
- [ ] Upload/remover/reordenar imagens e submit idênticos (mesmo payload)
- [ ] Gate: build + lint (sem novos erros)
**Tests**: none (build gate; layout/tema verificados por build+manual) · **Gate**: build

### T12: Remover ProductForm legado
**What**: Excluir `features/product-form/ui/ProductForm.tsx` (e barrel se aplicável) se não houver importadores.
**Where**: `apps/backoffice/src/features/product-form/ui/ProductForm.tsx`, `features/product-form/index.ts`
**Depends on**: T11 · **Reuses**: — · **Requirement**: dívida (assumption)
**Done when**:
- [ ] Grep confirma ausência de importadores de `ProductForm`
- [ ] Arquivo removido; barrel ajustado; build ok
- [ ] Gate: build
**Tests**: none · **Gate**: build

### T13: isNavActive + active-state por prefixo
**What**: Helper puro de rota ativa e uso no `AdminLayout`.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` (modify), `admin-layout.test.ts`
**Depends on**: T1 · **Reuses**: — · **Requirement**: LAYOUT-01
**Done when**:
- [ ] `isNavActive(pathname,to)` exportada: exato para `/admin`, prefixo para os demais
- [ ] Testes: `/admin/produtos/novo`→"Produtos" ativo; `/admin` não ativa "Produtos"; `/admin` exato ativa Dashboard
- [ ] Layout usa o helper
- [ ] Gate: test
**Tests**: unit · **Gate**: quick

### T14: Menu mobile (drawer)
**What**: Drawer navegável no mobile via `Sheet`.
**Where**: `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx` (modify)
**Depends on**: T13 · **Reuses**: `Sheet*` de `@nanapin/ui` · **Requirement**: LAYOUT-02, LAYOUT-03
**Done when**:
- [ ] Botão hambúrguer no header mobile abre `Sheet` com os `navItems`
- [ ] Navegar fecha o drawer
- [ ] Gate: build
**Tests**: none · **Gate**: build

### T15: Migrar Dashboard
**What**: `PageHeader`, `StatCard`, "Últimos Pedidos" via `AdminTable`; tokens shadcn.
**Where**: `apps/backoffice/src/pages/admin/AdminDashboard.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-03, MIG-06
**Done when**: [ ] usa PageHeader/StatCard/AdminTable · [ ] sem `nana-*` de superfície · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T16: Migrar AdminProductsPage
**What**: `PageHeader` + `AdminTable` (sort/paginação via props) + `Pagination`; tokens shadcn.
**Where**: `apps/backoffice/src/pages/admin/AdminProductsPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-06, COMP-07
**Done when**: [ ] sort por nome/preço/estoque preservado · [ ] paginação preservada · [ ] filtros intactos · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T17: Migrar AdminOrdersPage
**Where**: `apps/backoffice/src/pages/admin/AdminOrdersPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-06
**Done when**: [ ] PageHeader + AdminTable (badges/ações/cupom/rastreio) · [ ] filtros/paginação intactos · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T18: Migrar AdminClientsPage
**Where**: `apps/backoffice/src/pages/admin/AdminClientsPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-06
**Done when**: [ ] PageHeader + AdminTable + EmptyState · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T19: Migrar AdminAbandonedCartsPage
**Where**: `apps/backoffice/src/pages/admin/AdminAbandonedCartsPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-03, MIG-06
**Done when**: [ ] PageHeader + StatCard + AdminTable + EmptyState · [ ] remover MetricCard local · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T20: Migrar AdminCategoriesPage
**Where**: `apps/backoffice/src/pages/admin/AdminCategoriesPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-06
**Done when**: [ ] PageHeader · [ ] cards de item em tokens shadcn · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T21: Migrar AdminCollectionsPage
**Where**: `apps/backoffice/src/pages/admin/AdminCollectionsPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-06
**Done when**: [ ] PageHeader · [ ] cards em tokens shadcn · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T22: Migrar AdminCouponsPage (+ toast)
**What**: `PageHeader`, `StatCard`, `AdminTable`; trocar `sonner` por `@nanapin/ui/hooks/use-toast`.
**Where**: `apps/backoffice/src/pages/admin/AdminCouponsPage.tsx` (modify)
**Depends on**: T10 · **Requirement**: MIG-01, MIG-02, MIG-03, MIG-05, MIG-06
**Done when**: [ ] toasts via use-toast · [ ] StatCard/AdminTable · [ ] dialog/CRUD intactos · [ ] build+lint ok
**Tests**: none · **Gate**: build

### T23: Migrar AdminSettingsPage
**What**: `PageHeader`, cada aba em `FormCard`, campos via `FieldGroup`/`ToggleField` compartilhados; tokens shadcn.
**Where**: `apps/backoffice/src/pages/admin/AdminSettingsPage.tsx` (modify)
**Depends on**: T6, T10 · **Requirement**: MIG-01, MIG-04, MIG-06
**Done when**: [ ] usa FormCard + FieldGroup compartilhados · [ ] remover Field/ToggleField locais · [ ] save por aba intacto · [ ] build+lint ok
**Tests**: none · **Gate**: build

---

## Phase Execution Map
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5a → Phase 5b
P1:  T1→T2→T3→T4→T5→T6→T7
P2:  T8→T9→T10
P3:  T11→T12
P4:  T13→T14
P5a: T15→T16→T17→T18→T19
P5b: T20→T21→T22→T23
```

## Task Granularity Check
| Task | Scope | Status |
| ---- | ----- | ------ |
| T1 | 2 config files | ✅ |
| T2–T7 | 1 componente-folha (+teste) cada | ✅ |
| T8 | 1 componente + 1 fn pura | ✅ |
| T9 | 1 componente | ✅ |
| T10 | 1 barrel | ✅ |
| T11 | 1 página (reescrita de layout) | ✅ cohesivo |
| T12 | 1 remoção | ✅ |
| T13 | 1 helper + uso | ✅ |
| T14 | 1 feature (drawer) 1 arquivo | ✅ |
| T15–T23 | 1 página cada | ✅ |

## Diagram-Definition Cross-Check
| Task | Depends On (body) | Diagram | Status |
| ---- | ----------------- | ------- | ------ |
| T1 | None | início P1 | ✅ |
| T2–T7 | T1 | P1 encadeado | ✅ |
| T8 | T1 | P2 | ✅ |
| T9 | T2, T8 | P2 (após T8; T2 mesma feature) | ✅ (deps para trás) |
| T10 | T2–T9 | P2 fim | ✅ |
| T11 | T3, T4, T10 | P3 | ✅ |
| T12 | T11 | P3 | ✅ |
| T13 | T1 | P4 | ✅ |
| T14 | T13 | P4 | ✅ |
| T15–T19 | T10 | P5a | ✅ |
| T20–T23 | T10 (T23 tb T6) | P5b | ✅ |

## Test Co-location Validation
| Task | Layer | Matrix Requires | Task Says | Status |
| ---- | ----- | --------------- | --------- | ------ |
| T1 | config | none | none | ✅ |
| T2–T7 | componente apresentação | unit | unit | ✅ |
| T8 | lógica pura + componente | unit | unit | ✅ |
| T9 | componente + callback | unit | unit | ✅ |
| T10 | barrel | none | none | ✅ |
| T11 | página/layout | none (build) | none | ✅ |
| T12 | remoção | none | none | ✅ |
| T13 | lógica pura (rota) | unit | unit | ✅ |
| T14 | página/layout | none (build) | none | ✅ |
| T15–T23 | página | none (build) | none | ✅ |

Todas as validações ✅ — pronto para Execute.

## Task Verification Standards
Cada task segue `Done when` + `Tests` + `Gate`. Gate quick = `pnpm --filter @nanapin/backoffice test`; build = `build && lint` (sem novos erros vs baseline). Um commit atômico por task.
