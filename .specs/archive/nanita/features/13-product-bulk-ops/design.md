# Listagem v2 e Operações em Lote — Design

**Spec:** [`spec.md`](./spec.md) · **Contexto:** [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status:** Draft
**Desenho:** Paper, arquivo **Nanapin**, página **Backoffice - Produtos** — artboards
*Produtos — listagem v2*, *Produtos — edição em massa*, *Produtos — grade rápida*.

> **Feature 4 de 4** (`AD-009`). `features/bulk-edit`, `features/quick-grid` e `useAdminProducts` foram
> **movidos** do design da [`07`](../07-product-catalog-admin/design.md), sem reescrita.

---

## Pré-condições vindas da `07`

| Da `07` | O que é | Consumido por |
| ------- | ------- | ------------- |
| Tipos de `@nanapin/supabase` alinhados ao schema novo | `product_variants`, `options`, `stock_policy` | `useAdminProducts` |
| `@nanapin/core/pricing` — `priceRange`, `cartesian` | faixa da coluna Preço · grade da grade rápida | `AdminProductsPage`, `buildInsertBatch` |
| `@nanapin/core/formatters` + `shared/ui/inputs` | máscaras pt-BR (`AD-010`) | edição inline, grade rápida |
| `@nanapin/core/media` — `primaryImage` | thumb da coluna Produto | `AdminProductsPage` |
| Regra `PST-10` (variação ativa + `options` vazio = grade incompleta) | origem do badge | coluna Produto |

---

## Approach — a listagem é problema de dados, não de UI

O artboard parece uma reforma visual. Não é.

| Hoje | Desenhado |
| ---- | --------- |
| `select('*, categories(name)')` sem `range` nem `count` | `1–25 de 160`, com `count` real |
| filtro, ordenação e paginação em `useMemo` sobre o array inteiro | filtro e ordenação no banco |
| contagem por status calculada no cliente (quando existe) | contagem **por visão** (`Sem imagem 7`, `Sem SEO 3`) |
| `createProduct` em laço, cada um chamando `fetchProducts()` | um `insert` em lote + um refetch |

Por isso `T38` vem antes de tudo e é a única task da feature que não tem tela: sem a camada de dados,
cada coluna nova do desenho é mais um campo trazido para a memória do navegador. **A ordem aqui é o
guarda-corpo** — construir a UI primeiro tornaria a correção de dados uma refatoração posterior que
provavelmente não aconteceria.

---

## Components

### `useAdminProducts` (estendido, PLS-01, PLS-08)

- **Location**: `entities/product/api/useAdminProducts.ts`
- **Mudanças**: `fetchProducts({ page, pageSize, search, filters, sort })` com
  `select('...', { count: 'exact' })` e `.range()`; `createProductsBatch(rows)`;
  `updateProductsBatch(patches)`; variações por `select('*, product_variants(*), product_categories(category_id)')`
- **Cuidado**: hoje `createProduct` chama `fetchProducts()` no fim ([`useAdminProducts.ts:61-65`](../../../apps/backoffice/src/entities/product/api/useAdminProducts.ts#L61-L65)) e a
  importação chama em laço ([`AdminProductsPage.tsx:86-90`](../../../apps/backoffice/src/pages/admin/AdminProductsPage.tsx#L86-L90)) — as versões `Batch` existem para matar esse padrão.
- **Atrito de merge**: a [`11`](../11-product-form-v2/design.md) (T21) também toca este arquivo, mas só
  o **lê**. Esta feature manda na assinatura; a `11` adapta a chamada.

### `features/product-list` (PLS-02, PLS-03, PLS-04, PLS-09)

- **Location**: `apps/backoffice/src/features/product-list/`
- **Interfaces**:
  - `useSavedViews()` — visões padrão fixas em código + as do usuário em `localStorage` (A22)
  - `useInlineEdit(row, field)` — abre input na célula; `Enter` salva, `Tab` avança, `Esc` cancela
- **Colunas** (do artboard): Produto (thumb, nome, contagem de variações, slug, badges) · Categorias ·
  Preço (faixa + `N preços`) · Estoque (`sempre disponível` quando `stock_policy: none`) · Status ·
  Atualizado
- **Célula de preço com variações**: **desabilitada com explicação**. Desabilitar em silêncio lê como
  bug; a explicação é parte do requisito, não polimento.
- **Reuses**: `AdminTable`, `Pagination` (com `paginationItems.ts` já testado), `EmptyState`, `Skeletons`

### `features/bulk-edit` (PLS-05, PLS-06)

- **Location**: `apps/backoffice/src/features/bulk-edit/` (`ui/BulkEditPanel.tsx`,
  `model/buildBulkPatch.ts`, `model/useUndoBuffer.ts`)
- **Interfaces**:
  - `buildBulkPatch(selection: AdminProduct[], fields: BulkFields): { patches: Patch[]; ignored: Ignored[]; preview: ImpactPreview }` — **pura**, é o que os testes exercitam
  - `useUndoBuffer(ttlMs = 30_000)` — guarda o snapshot anterior em memória e expõe `undo()`
- **Nota** (A23): o desfazer é um segundo `update` com o snapshot, não `undo` transacional — Postgres não
  oferece undo de transação commitada. Por isso o desfazer tem prazo e **some no reload**: o buffer vive
  em memória, e fingir durabilidade seria pior que não oferecer.
- **Ids capturados na seleção**, não o filtro reavaliado — reavaliar na hora de aplicar mudaria o alvo
  debaixo do admin.

### `features/quick-grid` + `AdminQuickGridPage` (PLS-07, PLS-08)

- **Location**: `apps/backoffice/src/features/quick-grid/`, rota `/admin/produtos/grade-rapida`
- **Interfaces**:
  - `parseClipboardGrid(text: string, columns: ColumnId[]): GridRow[]` — pura; TSV do Excel → linhas
  - `validateRow(row, defaults, existingSlugs): RowError[]` — pura
  - `buildInsertBatch(rows, defaults): { products: ProductInsert[]; variants: VariantInsert[] }` — pura
- **Escrita**: um `insert` de produtos + um `insert` de variações + **um** refetch (PLS-08)
- **Teto**: 200 linhas por lote, com aviso explícito (A24)
- **As três funções são puras de propósito**: é onde mora toda a regra que pode errar em silêncio
  (interpretação de preço colado, herança de padrão, cruzamento de eixos). Testá-las sem montar a
  planilha é o que torna a task viável.

### Migration de limpeza (VAR-13)

- **Location**: `supabase/migrations/<ts>_drop-legacy-product-columns.sql`
- **Barreira**: é a única peça do programa que exige as **três** outras features fechadas (A25). O
  `Depends on: T41` do `tasks.md` é a dependência técnica; a de programa é mais forte e está declarada
  no topo daquele arquivo.

---

## Error Handling Strategy

| Situação | Tratamento |
| -------- | ---------- |
| Edição inline em produto com variações | Célula desabilitada **com explicação** de que o preço vive na grade |
| Operação em massa com falha parcial | Relata `X alterados · Y falharam`; o desfazer cobre **só** os alterados |
| Filtro mudou entre a seleção e a aplicação | Opera sobre os ids capturados na seleção |
| Desfazer expirado ou página recarregada | Buffer some; a operação vira definitiva. Sem falsa promessa de durabilidade |
| Colar 500 linhas na grade rápida | Limita a 200 **com aviso**, em vez de travar a aba |
| Linha da grade rápida com slug colidindo | Erro nomeia a URL em conflito |
| Linha inválida no lote | Cria só as válidas; as inválidas ficam na tela para correção |

---

## Risks & Concerns

| Risco | Mitigação |
| ----- | --------- |
| Construir a UI antes da camada de dados | *Approach*: T38 primeiro, e é a única task sem tela. Depois vira refatoração que não acontece |
| Merge com a `11` em `useAdminProducts.ts` | Declarado nos dois designs: esta feature manda na assinatura |
| T42 rodar cedo e quebrar a `11` | Barreira declarada em A25, no topo do `tasks.md` e no `Done when` da própria task |
| Aritmética de reajuste errar em silêncio | `buildBulkPatch` é puro e testado contra cálculo manual de 3 linhas conhecidas; a prévia de impacto é conferível pelo admin antes de aplicar |
| Desfazer parecer transacional | A23: prazo de 30 s, some no reload — a UI não promete o que o banco não entrega |
| `no-explicit-any` da baseline | T38 reescreve `useAdminProducts.ts`, um dos arquivos da dívida. Reduzir a contagem é bem-vindo, **não** é requisito do gate |

---

## Tech Decisions

| Decisão | Alternativa descartada | Por quê |
| ------- | ---------------------- | ------- |
| Paginação e filtro no servidor | Manter em memória e só paginar a exibição | O desenho pede contagem por visão sobre o catálogo inteiro; em memória isso obriga a trazer tudo, sempre |
| Visões salvas em `localStorage` | Tabela + RLS | A22. Preferência de tela para poucos operadores não justifica schema |
| Desfazer por snapshot com TTL | `undo` transacional | Impossível após commit. Snapshot é a única forma honesta |
| Funções puras para parse/validação/batch | Lógica dentro da planilha | É onde a regra erra em silêncio; fora do componente, é testável sem montar a grade |
| Um insert em lote + um refetch | Laço de `createProduct` | É literalmente o defeito 16 que esta feature corrige |

---

## Rastreabilidade design → spec

| Componente | Requisitos |
| ---------- | ---------- |
| `useAdminProducts` (estendido) | PLS-01, PLS-08 |
| `features/product-list` + `AdminProductsPage` v2 | PLS-02, PLS-03, PLS-04, PLS-09 |
| `features/bulk-edit` | PLS-05, PLS-06 |
| `features/quick-grid` + `AdminQuickGridPage` | PLS-07 |
| Migration de limpeza + tipos | VAR-13 |

**10 de 10 requisitos desta feature têm componente.**
