# 66 — Design

Telas do painel no Paper, arquivo **Uma Estrelinha**, página **"66 · Filtros de produto — painel"**:
grupos e valores (1440), marcar em massa (1440), blocos no produto e na categoria, e o editor do
grupo em 390px. A loja **não** foi desenhada: os blocos novos entram no `CategoryFiltersPanel` que
já existe, no lugar onde o "Universo" morava, com os mesmos chips.

## A lógica em uma tela

```
                 ┌──────────────── PAINEL ────────────────┐
 filter_groups ──┤ /admin/filtros         (grupos, valores) │
 filter_values ──┤ /admin/filtros/:valor  (marcar em massa) │
 product_filter_values ── formulário do produto (bloco)     │
 category_hidden_filter_groups ── formulário da categoria   │
                 └────────────────────────────────────────┘
                                   │  (RLS: leitura pública só do que é ativo)
                 ┌──────────────── core/filters ──────────┐
                 │ rules.ts   limites, slug, reservadas,   │ ← painel recusa, banco recusa igual
                 │            recusas (string | null)      │
                 │ facets.ts  quais blocos, quais valores, │ ← loja (categoria e busca)
                 │            contagens, quem passa        │
                 │ url.ts     estado ⇄ URLSearchParams      │ ← loja
                 └────────────────────────────────────────┘
                                   │
                 ┌──────────────── LOJA ──────────────────┐
                 │ useFilterCatalog()  grupos+valores ativos│
                 │ produto chega com filter_value_ids[]     │
                 │ CategoryPage / SearchPage → painel+sheet │
                 └────────────────────────────────────────┘
```

**A regra de quem passa** (`facets.ts`):

```
passa(produto) =
     sistema(produto)                               // preço, estoque, desconto, novidade
  ∧  ∀ grupo com seleção S:  produto.valores ∩ S ≠ ∅  // E entre grupos, OU dentro

contagem(valor v do grupo G) =
  |{ p na base : sistema(p) ∧ ∀ grupo H ≠ G com seleção: p ∩ S_H ≠ ∅ ∧ v ∈ p.valores }|
  // faceta disjuntiva: a seleção do PRÓPRIO grupo não entra na conta do seu valor

blocosVisíveis(base, escondidos) =
  grupos ativos, fora de `escondidos`, com ≥1 valor presente em algum produto da base
valoresVisíveis(grupo, base) = valores com ≥1 produto da base   // ordem = sort_order
```

`base` é a coleção (categoria) ou o resultado da busca. Tudo roda no navegador, sobre a lista que a
página já carrega inteira (`useProducts`/`useAllProducts` — a rolagem infinita da `32` é janela de
render, não de rede). 702 produtos × poucas marcações cada: custo desprezível, e nenhuma ida nova ao
banco por toque.

---

## Dados (uma migration: `2026101812xxxx_66-filtros-de-produto.sql`)

```sql
create table if not exists public.filter_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    check (slug not in ('q','ordem','preco','estoque','desconto','novidades','pagina','gclid','fbclid')
           and slug not like 'utm\_%'),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.filter_values (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.filter_groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  slug text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  sort_order integer not null default 0,
  unique (group_id, slug)
);

create table if not exists public.product_filter_values (
  product_id uuid not null references public.products(id) on delete cascade,
  value_id   uuid not null references public.filter_values(id) on delete cascade,
  primary key (product_id, value_id)
);
create index if not exists product_filter_values_value_idx on public.product_filter_values(value_id);

create table if not exists public.category_hidden_filter_groups (
  category_id uuid not null references public.categories(id) on delete cascade,
  group_id    uuid not null references public.filter_groups(id) on delete cascade,
  primary key (category_id, group_id)
);
```

- **Tetos de contagem (12 grupos, 60 valores)** ficam em `core` e no painel, **não** em trigger: o
  `check` de linha não conta, e um trigger de contagem para um painel de uma pessoa é peso sem
  ganho. Declarado como cópia **não** espelhada no banco; o guarda compara só o que o banco tem.
- **Unicidade do nome** (sem maiúscula/acento) fica em `core`; o banco garante a do `slug`, que é a
  que quebra a loja.
- **RLS** — molde da `24`: `enable row level security` nas quatro; leitura pública
  (`to anon, authenticated`) de grupo `is_active`, de valor cujo grupo é ativo, de marcação cujo
  valor é de grupo ativo **e** cujo produto é ativo, e de `category_hidden_filter_groups` inteira;
  escrita `to authenticated` com `has_role(auth.uid(),'admin')` no `using` **e** no `with check`.
- **Nenhuma escrita de dado** na migration: a feature nasce sem grupo nenhum (dívida de operação,
  como `39`/`41`/`50`/`64`).
- `tags` **não muda**.

Guarda `productFiltersSchema.test.ts` (store `shared/lib/__tests__`, molde de
`categoryListSchema.test.ts`): `if not exists` nas quatro; os dois `check` de 40 com o número
**importado** de `@estrelinha/core/filters`; a lista de reservadas do `check` igual a
`RESERVED_FILTER_KEYS` (bidirecional, prefixo `utm_` incluso); as quatro cascatas; `with check` em
toda policy de escrita; nenhum `grant` a `anon`; nenhuma escrita de dado. `mutar()` que lança.

---

## `packages/core/src/filters/` (novo, `.ts` explícito desde o primeiro import)

| Arquivo | Exporta | Quem consome |
| --- | --- | --- |
| `types.ts` | `FilterGroup`, `FilterValue`, `FilterCatalog`, `FilterSelection = Record<groupSlug, valueSlug[]>` | todos |
| `rules.ts` | `FILTER_NAME_MAX = 40`, `FILTER_GROUPS_MAX = 12`, `FILTER_VALUES_MAX = 60`, `RESERVED_FILTER_KEYS`, `isReservedFilterKey(k)` (prefixo `utm_`), `filterSlug(nome)`, `groupRefusal(draft, outros) : string \| null`, `valueRefusal(draft, irmãos) : string \| null` | painel (recusa), store (url), guarda do banco |
| `facets.ts` | `visibleGroups(catalog, base, hiddenGroupIds)`, `passesSelection(product, selection, catalog)`, `facetCounts(catalog, base, selection, systemPass)` | store (categoria, busca) |
| `url.ts` | `parseFilterParams(params, catalog, bounds)` → estado; `writeFilterParams(params, estado, bounds)` → params (preserva o que não é filtro) | store |

Veredito como `string | null` (`strictNullChecks: false` — ver `CLAUDE.md`). `filterSlug` reusa a
mesma dobra de acento do slug de categoria? **Não**: `core` não alcança `apps/backoffice/shared/lib/texto`.
`filterSlug` nasce em `core` e o guarda da `51` (`buscaDeProdutoComDonoUnico`) acusa só a cadeia que
**termina** no acento — slug continua depois (hífen), então não é acusado. Conferir no gate.

O produto da loja ganha `filter_value_ids: string[]` (do embed `product_filter_values(value_id)`),
e `facets.ts` trabalha por **id**; a URL trabalha por **slug**, e `url.ts` traduz pelo catálogo.

---

## Painel (`apps/backoffice`)

| Peça | Onde | Nota |
| --- | --- | --- |
| Rota `/admin/filtros` e `/admin/filtros/:groupId/valores/:valueId` | `App.tsx`, dentro do `RequireAdmin` | `rotasSobGuarda`, `navItems`, `focusRoutes` |
| Item "Filtros da loja" no grupo **Catálogo**, depois de Categorias | `widgets/admin-layout/model/navItems.ts` | ícone `SlidersHorizontal` |
| `entities/filter/api/` | `useAdminFilterCatalog()` (grupos + valores + contagem de marcações por valor via `product_filter_values(count)`), mutações de grupo/valor/ordem | `fetchX(modo)` de `shared/lib/fetchMode.ts` — revalidar **não** pisca esqueleto (`50`) |
| `pages/admin/AdminFiltersPage.tsx` | lista de grupos (esquerda) + editor do grupo selecionado (direita); no celular, lista → editor com voltar | molde de Configurações por seções (`55`) |
| `features/filter-editor/` | `GroupForm`, `ValueList` (arrastar, renomear inline, remover com confirmação) | recusas de `core`; contador `CharCounter` |
| `features/filter-bulk-assign/` | `BulkAssignPanel`: busca (`dobrarTexto`), categoria, "marcados/não", tag (P2), caixas, barra fixa "Marcar N / Remover de N" | `upsert(..., { ignoreDuplicates: true })` e `delete().eq('value_id').in('product_id', ids)` — **uma** chamada cada |
| `features/product-form/ui/FilterValuesCard.tsx` | bloco "Filtros da loja" na aba Geral | estado em `useProductForm`; gravação em `persistProduct.ts` **depois** do produto, molde de `product_faqs` (diff: apaga as que saíram, insere as novas) |
| `features/category-form/ui/CategoryFilterGroups.tsx` | seção "Filtros nesta categoria" com interruptor por grupo | interruptor desligado = linha em `category_hidden_filter_groups` |

## Loja (`apps/store`)

| Peça | Onde | Nota |
| --- | --- | --- |
| `entities/filter/api/useFilterCatalog.ts` | grupos ativos + valores, `staleTime` longo, chave `['filter-catalog']` | falha ⇒ catálogo vazio, nunca erro na tela (FLT-26) |
| `useCategoryHiddenGroups(categoryId)` | ou embutido no `useCategories` | **preferir o embed na árvore** (`categoryTreeSingleOwner` exige `from('categories')` só em `useCategories.ts`) |
| `PRODUCT_SELECT` e `PRODUCT_CARD_SELECT` + `product_filter_values(value_id)` | `entities/product/lib/mapProduct.ts` | `cardSelect.test.ts` e o mapper: `filter_value_ids` vira `[]` quando ausente |
| `features/category-filters/model/filters.ts` | `CategoryFilters` perde `tags` e ganha `selection: FilterSelection`; `filterProducts` delega a `passesSelection`; `collectTags`/`toggleTag` **apagados** | FLT-44 |
| `CategoryFiltersPanel` | um `<section>` por bloco visível, chips multi-seleção com contagem, "Ver todos (N)" no sheet | `TAP_44` no sheet; `whitespace-nowrap` no chip |
| `useFilterUrlState(catalog, bounds)` | `shared/lib` ou no slice | `useSearchParams` + `replace: true`; preserva `q`, `utm_*` |
| `SearchPage` | ganha o botão "Filtrar" + sheet/sidebar | base = resultado da busca, sem esconder |

Guarda `filtroSemTag.test.ts` (store): nenhum arquivo de `features/category-filters/**`,
`pages/CategoryPage.tsx` e `pages/SearchPage.tsx` lê `.tags`; `collectTags`/`toggleTag` não voltam.
Âncora dupla e sensor de comentário (CRLF/LF).

---

## Riscos medidos antes de começar

1. **`PRODUCT_CARD_SELECT` muda** → o embed novo atravessa RLS: com o grupo **inativo**, a policy
   esconde a marcação e o produto chega com `[]` — que é o comportamento certo. Provar por probe HTTP
   contra o banco local (`AD-012`), não por mock.
2. **Contagem com `product_filter_values(count)`** no painel: confirmar a forma de agregação do
   PostgREST na versão local antes de escrever o hook.
3. **`vi.mock` totais** das páginas de categoria e busca (`L-030`): listar antes de afirmar que nada
   quebra ao acrescentar `useFilterCatalog`.
4. **O sheet hoje aplica ao vivo ou no CTA?** Conferir em `CategoryFiltersSheet.tsx` antes de escrever
   a sincronização com a URL — a URL só muda quando o estado da página muda.
