# Backoffice UI Standardization Design

**Spec**: `.specs/features/03-backoffice-ui-standardization/spec.md`
**Status**: Approved (layout/scope/tokens confirmados com o usuário via perguntas iniciais)

---

## Architecture Overview

Camada nova de componentes de apresentação em `apps/backoffice/src/shared/ui/`, consumida por
todas as páginas (`pages/admin/*`) e pelo `widgets/admin-layout`. Nenhuma lógica de dados muda:
os hooks `useAdmin*` e React Query continuam idênticos; as páginas só trocam markup/classes.

```mermaid
graph TD
    subgraph shared/ui [novos - apresentação]
      PH[PageHeader]
      FC[FormCard]
      SC[StatCard]
      AT[AdminTable]
      PG[Pagination]
      ES[EmptyState]
      SK[TableSkeleton]
      FG[FieldGroup]
    end
    UI[(@nanapin/ui: Card, Table, Skeleton, Sheet)]
    PH --> UI
    FC --> UI
    AT --> UI
    AT --> PG
    AT --> ES
    SK --> UI
    Pages[pages/admin/*] --> PH & FC & SC & AT & ES & SK & FG
    Layout[widgets/admin-layout] --> UI
    Pages --> Hooks[(useAdmin* / React Query - inalterados)]
```

**Approach (confirmado):** layout de produto em duas colunas; criar shared components e migrar
todas as páginas; padronizar tokens shadcn. Alternativas (coluna única / só a tela de produto /
manter tokens) foram apresentadas e descartadas nas perguntas iniciais.

---

## Code Reuse Analysis

### Existing Components to Leverage

| Component | Location | How to Use |
| --------- | -------- | ---------- |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` | `packages/ui/src/card.tsx` | Base do `FormCard` e `StatCard` |
| `Table*` | `packages/ui/src/table.tsx` | Base do `AdminTable` |
| `Skeleton` | `packages/ui/src/skeleton.tsx` | Base do `TableSkeleton`/`CardSkeleton` |
| `Sheet*` | `packages/ui/src/sheet.tsx` | Drawer mobile do `AdminLayout` |
| `Button`, `Input`, `Label`, `Select`, `Switch`, `Badge`, `Tabs` | `packages/ui/*` | Reuso direto (já em uso) |
| Lógica de sort/paginação | `pages/admin/AdminProductsPage.tsx:37-77,220-241` | Extrair para `AdminTable`/`Pagination` sem alterar comportamento |
| Cálculo de margem | `pages/admin/AdminProductFormPage.tsx:133` | Reusar na coluna "Resumo" |
| `Field`/`ToggleField` | `pages/admin/AdminSettingsPage.tsx:303-332` | Promover para `FieldGroup`/`ToggleField` compartilhados |
| `formatPrice` | `@nanapin/core/formatters` | Reuso |
| `cn` | `@nanapin/ui/lib/utils` | Composição de classes |

### Integration Points

| System | Integration Method |
| ------ | ------------------ |
| Hooks admin (`useAdmin*`) | Consumidos pelas páginas exatamente como hoje; componentes só recebem dados via props |
| Rotas (`react-router-dom`) | `AdminLayout` usa `useLocation` para active-state por prefixo |
| Vitest (novo no backoffice) | `vitest.config.ts` + `src/test/setup.ts` espelhando o store; deps hoisted no root |

---

## Components

### PageHeader
- **Purpose**: Cabeçalho padrão de página (título + subtítulo + ações + ícone).
- **Location**: `apps/backoffice/src/shared/ui/PageHeader.tsx`
- **Interfaces**:
  - `PageHeader({ title, subtitle?, actions?, icon?, backTo? })`
  - `title: string`, `subtitle?: string`, `actions?: ReactNode`, `icon?: LucideIcon`, `backTo?: () => void`
  - Título: `font-heading text-2xl font-bold text-foreground`; ações à direita (flex justify-between).
- **Reuses**: `Button` (botão voltar quando `backTo`), `cn`.

### FormCard
- **Purpose**: Seção de formulário em card com header opcional.
- **Location**: `apps/backoffice/src/shared/ui/FormCard.tsx`
- **Interfaces**: `FormCard({ title?, description?, footer?, className?, children })`
- **Reuses**: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`.

### StatCard
- **Purpose**: Card de métrica (ícone + label + valor + subtítulo/accent).
- **Location**: `apps/backoffice/src/shared/ui/StatCard.tsx`
- **Interfaces**: `StatCard({ label, value, icon, accent?, subtitle? })`
  - `label: string`, `value: string | number`, `icon: LucideIcon`, `accent?: string` (classe de cor), `subtitle?: string`
- **Reuses**: `Card`, `cn`. Substitui `entities/stats/ui/StatsCard`, `MetricCard` (Abandonados) e cards inline (Cupons).

### AdminTable
- **Purpose**: Tabela padronizada com header, zebra, sort opcional, empty-state e footer de paginação.
- **Location**: `apps/backoffice/src/shared/ui/AdminTable.tsx`
- **Interfaces**:
  ```ts
  interface AdminColumn<T> {
    key: string
    header: ReactNode
    align?: 'left' | 'center' | 'right'
    sortable?: boolean
    cell: (row: T, index: number) => ReactNode
  }
  interface AdminTableProps<T> {
    columns: AdminColumn<T>[]
    data: T[]
    rowKey: (row: T) => string
    sortKey?: string | null
    sortDir?: 'asc' | 'desc'
    onSort?: (key: string) => void
    empty?: { icon?: LucideIcon; message: string; hint?: string }
    footer?: ReactNode   // slot para Pagination / contador
    zebra?: boolean      // default true
  }
  ```
  - Header `bg-muted/50`, `text-xs font-semibold uppercase text-muted-foreground`; zebra `bg-muted/30`.
  - Coluna `sortable` renderiza indicador (ArrowUp/Down/UpDown) conforme `sortKey`/`sortDir` e chama `onSort(key)` no clique. Coluna não-sortable é inerte.
  - `data.length === 0` → renderiza `EmptyState` (via `empty`) no lugar do `<tbody>`.
- **Reuses**: `EmptyState`, ícones lucide, `cn`. (Usa `<table>` nativo para preservar exatamente o layout atual; `@nanapin/ui/table` fica para casos simples.)

### Pagination
- **Purpose**: Rodapé de navegação de páginas com elipse.
- **Location**: `apps/backoffice/src/shared/ui/Pagination.tsx`
- **Interfaces**: `Pagination({ page, totalPages, onPageChange, className? })`
  - Lógica de janela+elipse extraída de `AdminProductsPage.tsx:225-236` (função pura `getPageItems(page, totalPages): (number|'ellipsis')[]` exportada para teste).
  - Prev/next desabilitados nos limites.
- **Reuses**: `Button`, ícones `ChevronLeft/Right`.

### EmptyState
- **Purpose**: Estado vazio padronizado.
- **Location**: `apps/backoffice/src/shared/ui/EmptyState.tsx`
- **Interfaces**: `EmptyState({ icon?, message, hint?, action? })`
- **Reuses**: `cn`, lucide.

### TableSkeleton / CardSkeleton
- **Purpose**: Placeholders de carregamento.
- **Location**: `apps/backoffice/src/shared/ui/Skeletons.tsx`
- **Interfaces**: `TableSkeleton({ rows?, cols? })`, `CardSkeleton()`
- **Reuses**: `Skeleton` de `@nanapin/ui`.

### FieldGroup / ToggleField
- **Purpose**: Label + campo + hint; e linha com switch.
- **Location**: `apps/backoffice/src/shared/ui/FieldGroup.tsx`
- **Interfaces**: `FieldGroup({ label, hint?, htmlFor?, children })`, `ToggleField({ label, description?, checked, onChange })`
- **Reuses**: `Label`, `Switch`. Promove os componentes locais de `AdminSettingsPage`.

### shared/ui barrel
- **Location**: `apps/backoffice/src/shared/ui/index.ts` — reexporta os componentes acima (public API do slice).

### AdminLayout (modificação)
- **Location**: `apps/backoffice/src/widgets/admin-layout/ui/AdminLayout.tsx`
- **Mudanças**:
  - Helper puro `isNavActive(pathname, to): boolean` — exato para `/admin`, prefixo para os demais (exportado para teste).
  - Drawer mobile via `Sheet` com os mesmos `navItems`; botão hambúrguer no header mobile; fecha ao navegar.
  - Migrar classes `nana-*` de superfície para tokens shadcn onde aplicável (manter gradiente do logo).

### AdminProductFormPage (reescrita de layout)
- **Location**: `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx`
- **Mudanças** (somente JSX/classes; estado e handlers idênticos):
  - Container largura cheia (`w-full max-w-6xl`), `PageHeader` com voltar + ações Salvar/Cancelar.
  - Grid `lg:grid-cols-3`: coluna principal (`lg:col-span-2`) com `Tabs` + `FormCard` por seção; coluna lateral (`lg:col-span-1`, `lg:sticky lg:top-6`) com `FormCard` "Publicação" (switches + agendamento, migrados da aba) e `FormCard` "Resumo" (preço/margem via cálculo existente, contagem de imagens/variações).
  - `TabsList` estilizada com fundo (pílulas), não transparente. Remover aba "Publicação".

---

## Data Models

Nenhum modelo novo. Tipos são genéricos de UI (`AdminColumn<T>`, props). Sem alteração de schema.

---

## Error Handling Strategy

| Error Scenario | Handling | User Impact |
| -------------- | -------- | ----------- |
| Lista vazia em tabela | `AdminTable` renderiza `EmptyState` | Mensagem amigável, sem tabela vazia |
| custo = 0 no Resumo | Guarda `cost > 0` antes de calcular margem | Margem oculta, sem NaN |
| Clique em coluna não-sortable | `onSort` só é chamado se `sortable` | Nenhum efeito, sem erro |
| Falha ao salvar produto | Toast destrutivo (comportamento atual mantido) | Igual a hoje |

---

## Risks & Concerns

| Concern | Location (file:line) | Impact | Mitigation |
| ------- | -------------------- | ------ | ---------- |
| Dualidade de tokens gera drift visual | várias páginas | Inconsistência de cor/tema | Migração página a página para tokens shadcn (P2) |
| Sort/paginação embutidos na página de produtos | `AdminProductsPage.tsx:37-77` | Regressão ao extrair | Extrair lógica pura (`getPageItems`) com testes; manter estado na página, passar via props ao `AdminTable` |
| Backoffice sem infra de teste | `apps/backoffice` (sem vitest.config) | Não há gate | Tarefa fundacional adiciona `vitest.config.ts` + `setup.ts` espelhando o store |
| `ProductForm.tsx` legado pode ter importadores | `features/product-form/ui/ProductForm.tsx` | Quebra ao remover | Grep de importadores antes de remover; se houver, não remover |
| Radix `Tabs` com conteúdo em `Card` | product form | `TabsContent` desmonta ao trocar aba; estado do form vive na página (ok) | Estado permanece no componente pai; nenhuma perda ao alternar abas |
| `nana-*` ainda usado por componentes da loja e badges | tabelas (ex. cupom `nana-violet`) | Remoção ampla demais | Escopo = superfície/texto/borda das páginas admin; accents de marca (`nana-violet` em badge, gradiente) preservados |

---

## Tech Decisions (only non-obvious ones)

| Decision | Choice | Rationale |
| -------- | ------ | --------- |
| Base da `AdminTable` | `<table>` nativo (não `@nanapin/ui/table`) | Preserva 1:1 o layout/zebra/paddings atuais; menor risco de regressão |
| Onde vive o estado de sort/página | Continua na página; `AdminTable`/`Pagination` são controlados via props | Mantém hooks/filtros intactos; componentes puros e testáveis |
| Tokens | shadcn nas páginas admin (decisão do usuário) | Mapeiam para as mesmas cores warm-cream do design v3; reduz inconsistência interna |
| Escopo da migração de `nana-*` | Só superfícies/texto/borda das páginas; manter accents de marca e gradiente | Evita regressão de identidade |
| Testes | Unit sobre lógica pura + render de componentes (jsdom + Testing Library); ACs visuais via build/manual | Backoffice não tinha testes; foco no que é determinístico |

> **Conformidade com STATE.md `## Decisions`:** a decisão [2026-04-16] (design system v3 / paleta warm
> cream global) é respeitada — tokens shadcn apontam para os mesmos valores em `styles.css`/`tailwind.preset.ts`;
> não há mudança de paleta. Nenhuma decisão ativa é superseded.
