# Menu de navegação da loja — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute
flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of
truth for the full flow (per-task cycle, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

> **Modo de execução deste projeto**: sub-agents **não** são despachados nesta sessão (restrição do
> harness). Execução inline, uma task por vez, e a verificação final roda em **modo standalone** —
> o mesmo modo usado nas features `13` e `14`.

---

**Design**: `.specs/features/16-menu-navegacao-loja/design.md`
**Status**: Done (21/21)

---

## Test Coverage Matrix

> Gerada do codebase + `CLAUDE.md` + spec. Guidelines encontradas: `CLAUDE.md` (raiz — convenção de
> mobile-first, gate "sem erros novos", `tsc` como prova de tipo), `.specs/STATE.md` (`AD-002`,
> `AD-012`), amostragem de 10 arquivos de teste em `packages/core`, `apps/store`, `apps/backoffice`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Domínio puro (`@nanapin/core/menu`) | unit | Todos os ramos; 1:1 com as ACs; **todo edge case listado** tem teste | `packages/core/src/menu/*.test.ts` | `pnpm --filter @nanapin/core test` |
| Domínio puro (backoffice `features/*/model`) | unit | Todos os ramos; 1:1 com as ACs | `apps/backoffice/src/features/**/model/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Hooks de dados (`entities/*/api`) | unit (client mockado) | Caminho feliz + erro + forma do payload | `apps/{store,backoffice}/src/entities/**/__tests__/*.test.ts(x)` | `pnpm --filter @nanapin/{store,backoffice} test` |
| Widgets / UI da loja | unit (RTL) | Toda AC de comportamento da story; estados vazio e de erro | `apps/store/src/widgets/**/__tests__/*.test.tsx` | `pnpm --filter @nanapin/store test` |
| Páginas do backoffice | unit (RTL) | Toda AC da story; recusa de limite; persistência chamada com o payload certo | `apps/backoffice/src/pages/admin/*.test.tsx` | `pnpm --filter @nanapin/backoffice test` |
| Migration / schema | none — **probe HTTP obrigatório** (`AD-012`) | `PATCH` real contra o banco local retorna 204, não `PGRST204` | `supabase/migrations/*.sql` | probe `curl` (ver T2) |
| Tipos / barrels / config | none — gate de build | — | — | `tsc --noEmit` |
| Prova visual (boards) | manual/Playwright | 390×844 **e** 1440; sem scroll horizontal; alvos ≥ 44px | — | `playwright-cli` skill |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| **quick** | Task com testes de um pacote só | `pnpm --filter @nanapin/<pkg> test` |
| **full** | Task que cruza pacotes | `pnpm test` |
| **build** | Fecho de fase | `pnpm test` + `pnpm lint` + `npx tsc --noEmit -p apps/store/tsconfig.app.json` + `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` |

**Baselines a bater** (de `CLAUDE.md`, remedidas no fecho):
`lint` **33 err / 9 warn** (backoffice 29/7 · store 4/2) — gate é "sem erros novos", e a T1 deve
**derrubar** o número. `tsc` **store 0 · backoffice 0** — qualquer erro é novo.

---

## Execution Plan

### Phase 1: Limpeza, schema e domínio

```
T1 → T2 → T3 → T4 → T5 → T6 → T7
```

### Phase 2: A loja lê a árvore

```
T8 → T9 → T10 → T11
```

### Phase 3: Curadoria no backoffice

```
T12 → T13 → T14 → T15 → T16
```

### Phase 4: As superfícies do menu

```
T17 → T18 → T19 → T20 → T21
```

---

## Task Breakdown

### T1: Remover Coleções do produto

**What**: Apagar a ilha de Coleções — tela, hook, formulário, sorter, rota, item de nav e os dois tipos.
**Where**: `apps/backoffice/src/entities/collection/`, `apps/backoffice/src/features/collection-form/`,
`apps/backoffice/src/pages/admin/AdminCollectionsPage.tsx`, `apps/backoffice/src/app/App.tsx`,
`apps/backoffice/src/widgets/admin-layout/model/navItems.ts`, `packages/supabase/src/types/index.ts`
**Depends on**: None
**Reuses**: —
**Requirement**: MENU-21, MENU-22, MENU-23

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `grep -ri "collection" apps/ packages/` não retorna nenhuma linha
- [ ] Não existe rota `/admin/colecoes` nem item "Coleções" em `navGroups`
- [ ] `npx tsc --noEmit` de ambos os apps: 0 erros
- [ ] `pnpm lint` **não sobe** em relação a 33 err / 9 warn (esperado: cair)
- [ ] Backlog "categoria automática (conjunto por regra)" anotado no `spec.md` (já em Out of Scope)

**Tests**: none (camada "tipos/barrels" — gate de build; nenhum teste cobria Coleções)
**Gate**: build
**Commit**: `refactor(backoffice): coleções sai — a palavra já era da categoria`

---

### T2: Migration `show_in_menu` + `menu_promo`, provada por probe

**What**: Criar as duas colunas com backfill dos quatro universos, e **provar por HTTP** que gravam.
**Where**: `supabase/migrations/20260803120000_16-store-menu.sql`
**Depends on**: None
**Reuses**: padrão de `20260801150000_categories-hierarchy-and-counts.sql` (`add column if not exists`,
CHECK em statement próprio e nomeado)
**Requirement**: base de MENU-05, MENU-24

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [ ] `show_in_menu boolean not null default false` e `menu_promo jsonb` existem em `public.categories`
- [ ] Backfill marcou `anime`, `kpop`, `games`, `filmes` quando ativos; no-op se ausentes
- [ ] `supabase db reset` roda limpo do zero
- [ ] **Probe `AD-012` (bloqueante)**: `PATCH /rest/v1/categories?id=eq.<id>` gravando as **duas**
      colunas devolve **204**, não `PGRST204`; e `GET` confirma o valor gravado
- [ ] Probe registrado na task com o comando e a resposta

**Tests**: none — a prova desta camada é o probe HTTP, não vitest (matriz: "Migration / schema")
**Gate**: build
**Commit**: `feat(db): categoria ganha vaga no menu e card promocional`

---

### T3: Tipos alcançam o schema

**What**: `DbCategory` e `Category` ganham `show_in_menu`, `menu_promo` e `active`; nasce `MenuPromo`.
**Where**: `packages/supabase/src/types/index.ts`
**Depends on**: T2
**Reuses**: as interfaces existentes no mesmo arquivo
**Requirement**: base de MENU-24; mitiga o risco "admin logado vê categoria inativa"

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `DbCategory` e `Category` declaram `show_in_menu: boolean`, `menu_promo: MenuPromo | null`
- [ ] `Category` (loja) declara `active: boolean` — a filtragem deixa de depender só de RLS
- [ ] `MenuPromo` exportado com `category_id` obrigatório e `badge`/`title`/`subtitle` opcionais
- [ ] Comentário no arquivo: tipo escrito à mão é afirmação — a coluna foi provada na T2 (`AD-012`)
- [ ] `npx tsc --noEmit` de ambos os apps: 0 erros

**Tests**: none (camada "tipos" — gate de build)
**Gate**: build
**Commit**: incluído no commit da T4 (tipo sozinho não é entrega verificável)

---

### T4: `@nanapin/core/menu` — ordenação e caminho

**What**: Nasce o pacote de domínio com `bySortOrder`, `ancestorsOf` e `pathLabel`.
**Where**: `packages/core/src/menu/{index.ts,menu.ts,__tests__/menu.test.ts}`, `packages/core/package.json` (export)
**Depends on**: T3
**Reuses**: `bySortOrder` de `apps/backoffice/.../categoryTree.ts:33` (movido para cá);
guarda de ciclo de `apps/store/.../categoryTrail.ts` (`MAX_DEPTH`)
**Requirement**: MENU-01

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `bySortOrder` ordena por `sort_order` asc e desempata por `name.localeCompare`
- [ ] `ancestorsOf` sobe a cadeia com guarda de ciclo e de pai inexistente
- [ ] `pathLabel` devolve `Bottons › Anime`
- [ ] Teste do empate real do banco: `Bottons`(0) e `Academia`(0) saem em ordem determinística
- [ ] Teste de ciclo: `a → b → a` termina sem laço
- [ ] `categoryTree.ts` importa `bySortOrder` do core; seus testes seguem verdes
- [ ] Gate: `pnpm --filter @nanapin/core test` e `pnpm --filter @nanapin/backoffice test`

**Tests**: unit
**Gate**: full
**Commit**: `feat(core): o menu vira domínio — ordem determinística e caminho na árvore`

---

### T5: `menuEntries`, `slotsUsed`, `canEnterMenu`

**What**: A regra de o que é uma entrada de menu e quantas cabem.
**Where**: `packages/core/src/menu/menu.ts`, `__tests__/menu.test.ts`
**Depends on**: T4
**Reuses**: `bySortOrder`, `ancestorsOf` da T4
**Requirement**: MENU-05, MENU-06, MENU-10, MENU-14

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `MENU_SLOT_LIMIT = 4` exportado
- [ ] `menuEntries` devolve só as `show_in_menu && active`, ordenadas, com `children` ativas e `path`
- [ ] Entrada marcada mas **inativa** não aparece (MENU-10)
- [ ] Entrada em qualquer profundidade é aceita (filha de "Bottons" entra)
- [ ] `canEnterMenu` devolve `{ ok: false, reason }` na 5ª (MENU-06) e `{ ok: true }` na 4ª
- [ ] Edge: lista vazia → `[]`; todas inativas → `[]`
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): quatro vagas, e quem entra nelas`

---

### T6: `resolvePromo`

**What**: Validar o jsonb do card e resolver o destino — ou devolver `null`.
**Where**: `packages/core/src/menu/menu.ts`, `__tests__/menu.test.ts`
**Depends on**: T5
**Reuses**: `menuEntries`; view `category_product_counts` é lida por quem chama, não aqui
**Requirement**: MENU-25, MENU-26, MENU-27

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `title`/`subtitle` vazios caem no nome e na descrição do destino (MENU-25)
- [ ] Destino apagado → `null`; destino **inativo** → `null` (MENU-26)
- [ ] jsonb malformado (string, array, objeto sem `category_id`) → `null`, sem lançar
- [ ] Promo apontando para a **própria** categoria é aceita (edge case da spec)
- [ ] `href` é `/colecao/<slug do destino>`
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): card promocional aponta para categoria de verdade`

---

### T7: `descendantIds`

**What**: A descendência completa de uma categoria, para o roll-up da vitrine.
**Where**: `packages/core/src/menu/menu.ts`, `__tests__/menu.test.ts`
**Depends on**: T4
**Reuses**: guarda de ciclo da T4
**Requirement**: MENU-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Devolve a categoria **e** toda a descendência, recursivamente (neta inclusa)
- [ ] Folha devolve só o próprio id
- [ ] Ciclo `a → b → a` termina; nó tratado como folha, sem laço (edge case da spec)
- [ ] Órfã (pai inexistente) não quebra a varredura
- [ ] Sem duplicatas no retorno
- [ ] Gate: `pnpm --filter @nanapin/core test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(core): a página do universo alcança as filhas`

---

### T8: Uma só subida de árvore nos dois apps

**What**: `categoryTrail` (loja) e `categoryPaths` (backoffice) passam a delegar ao core; `categoryPaths`
muda de casa para `entities/category/lib/`.
**Where**: `apps/store/src/entities/category/lib/categoryTrail.ts`,
`apps/backoffice/src/{features/product-form/model → entities/category/lib}/categoryPaths.ts`
**Depends on**: T4
**Reuses**: `ancestorsOf` / `pathLabel` do core
**Requirement**: risco "três cópias da subida de árvore" do `design.md`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Nenhuma das duas reimplementa a subida de pais — ambas chamam o core
- [ ] Os testes existentes de `categoryTrail` seguem verdes **sem alteração** (é a rede de regressão)
- [ ] `CategoryMultiSelect` importa de `entities/category`, não de `features/product-form/model`
- [ ] Nenhum import feature→feature novo
- [ ] Gate: `pnpm test`

**Tests**: unit (os existentes provam a delegação)
**Gate**: full
**Commit**: `refactor: uma subida de árvore só, no core`

---

### T9: `useCategories` carrega o menu · nasce `useMenu`

**What**: A consulta da loja traz as colunas novas e `active`; `useMenu` entrega `MenuEntry[]`.
**Where**: `apps/store/src/entities/category/api/{useCategories.ts,useMenu.ts}`,
`apps/store/src/entities/category/index.ts`
**Depends on**: T5, T6
**Reuses**: mesma `queryKey ['categories']` — sem segundo fetch; `menuEntries` + `resolvePromo`
**Requirement**: MENU-04

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `useCategories` mapeia `show_in_menu`, `menu_promo` e `active`; **forma pública inalterada** para
      os 8 consumidores atuais
- [ ] `useMenu()` devolve `{ entries }` derivado da mesma query, sem requisição extra
- [ ] Erro na consulta → `entries: []` (MENU-04), sem lançar
- [ ] Teste: falha de query devolve lista vazia; sucesso devolve só as marcadas e ativas
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): a loja passa a enxergar o menu`

---

### T10: Só raízes na grade, no rodapé e na busca

**What**: Os quatro consumidores que listam categoria "de topo" param de misturar filha.
**Where**: `apps/store/src/widgets/footer/ui/Footer.tsx`,
`apps/store/src/widgets/category-grid/ui/CategoryGrid.tsx`,
`apps/store/src/features/search/ui/{SearchDropdown,SearchOverlay}.tsx`
**Depends on**: T9
**Reuses**: `bySortOrder` do core para a ordenação determinística
**Requirement**: MENU-01, MENU-02

**Tests**: unit
**Gate**: quick

**Done when**:
- [ ] Os quatro filtram `parent_id === null` antes do `slice`
- [ ] Ordenação usa `bySortOrder` — "Academia" nunca precede "Bottons" por empate
- [ ] Teste com a árvore real (`Bottons › {Academia, Anime, …}`): a grade mostra **só** "Bottons"
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Commit**: `fix(store): a vitrine para de misturar universo e subcategoria`

---

### T11: Roll-up de produtos na página do universo

**What**: `/colecao/:slug` passa a incluir os produtos de toda a descendência.
**Where**: `apps/store/src/entities/product/api/useProducts.ts`
**Depends on**: T7, T9
**Reuses**: `descendantIds`; a consulta `.in('category_id', …)` que já existe
**Requirement**: MENU-03

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `useProducts(slug)` resolve a descendência e consulta `product_categories` com **uma** `.in()`
- [ ] Produto vinculado a pai **e** filha aparece **uma vez** só
- [ ] Categoria folha continua com o mesmo resultado de antes (sem regressão)
- [ ] Sem N+1: contagem de chamadas ao client é asseverada no teste
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `fix(store): a página do universo mostra o que está nas filhas`

---

### T12: `useAdminCategories` enxerga o menu

**What**: As duas colunas entram no `CATEGORY_SELECT`, e a falha de leitura vira estado explícito.
**Where**: `apps/backoffice/src/entities/category/api/useAdminCategories.ts`
**Depends on**: T3
**Reuses**: `CATEGORY_SELECT` existente
**Requirement**: MENU-07; risco "erro engolido em silêncio" do `design.md`

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `CATEGORY_SELECT` inclui `show_in_menu` e `menu_promo`, nomeadas (não `*`)
- [ ] O hook expõe `error` — falha de leitura deixa de ser indistinguível de "lista vazia"
- [ ] Consumidores atuais (`AdminCategoriesPage`, `AdminProductFormPage`) seguem verdes
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit
**Gate**: quick
**Commit**: incluído no commit da T16

---

### T13: `MenuSlotList` — as quatro vagas

**What**: A lista de categorias com switch de vaga, arraste de ordem, caminho e estado "inativa".
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuSlotList.tsx` + teste
**Depends on**: T5, T12
**Reuses**: `reorderWithinParent`, `canEnterMenu`, `pathLabel`, `Switch` de `@nanapin/ui`
**Requirement**: MENU-05, MENU-06, MENU-07, MENU-08, MENU-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Cada linha mostra nome, caminho (`Bottons › Anime`), nº de subcategorias e o switch
- [ ] Ligar a 5ª é **recusado** com o motivo e **não** chama o save (MENU-06)
- [ ] Arraste chama `updateSortOrders` com **só as linhas alteradas** (MENU-08)
- [ ] Categoria inativa aparece rotulada "não aparece na loja" (MENU-10)
- [ ] Faixas fixas "Crie o Seu" e "Sobre" renderizam travadas e fora da contagem (MENU-09)
- [ ] Alvos de toque e foco de teclado no switch e no handle de arraste
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(backoffice): quatro vagas no topo, e o admin decide quem ocupa`

---

### T14: `MenuBarPreview` — a barra antes da cliente ver

**What**: Prévia esquemática da barra do topo com as entradas marcadas + as duas fixas.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuBarPreview.tsx` + teste
**Depends on**: T13
**Reuses**: `menuEntries`; tokens `--nana-*` do backoffice (**não** os `nanita-*` da loja)
**Requirement**: MENU-09

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Renderiza as entradas na ordem do menu, seguidas de "Crie o Seu" e "Sobre"
- [ ] Menu vazio → prévia mostra só as duas fixas, com aviso
- [ ] Não importa nada de `apps/store`
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit
**Gate**: quick
**Commit**: incluído no commit da T16

---

### T15: `MenuPromoEditor`

**What**: Editor do card: destino (categoria), selo e textos opcionais.
**Where**: `apps/backoffice/src/features/store-menu/ui/MenuPromoEditor.tsx` + teste
**Depends on**: T6, T13
**Reuses**: `resolvePromo`, `category_product_counts` (via `product_count` do hook), `Select`/`Input`
**Requirement**: MENU-24, MENU-25, MENU-26

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Ativar o card **exige** destino; sem destino o save é bloqueado com o motivo (MENU-24)
- [ ] Título e texto vazios mostram o valor herdado do destino como placeholder (MENU-25)
- [ ] Destino inválido (apagado/inativo) é sinalizado na tela (MENU-26)
- [ ] Contagem do destino ("12 produtos") vem do `product_count`, sem query nova
- [ ] Payload gravado é exatamente `{ category_id, badge?, title?, subtitle? }`
- [ ] Gate: `pnpm --filter @nanapin/backoffice test`

**Tests**: unit
**Gate**: quick
**Commit**: incluído no commit da T16

---

### T16: `AdminMenuPage` + rota + navegação

**What**: A página que compõe os três blocos, sua rota e o item na sidebar.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx` + teste,
`apps/backoffice/src/app/App.tsx`, `apps/backoffice/src/widgets/admin-layout/model/navItems.ts`
**Depends on**: T13, T14, T15
**Reuses**: `PageHeader`, `FormCard`, `useAdminCategories`
**Requirement**: MENU-05, MENU-07, MENU-09, MENU-10

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] Rota `/admin/menu` sob `RequireAdmin`, logo após `/admin/categorias`
- [ ] Item "Menu da loja" (ícone `Menu`) no grupo **Catálogo**, depois de Categorias
- [ ] Aviso na tela: a ordem também vale para o rodapé e a grade da home
- [ ] Subcategorias em **leitura**, com link para `/admin/categorias`
- [ ] Erro de leitura tem superfície explícita com recarregar — **não** repete o `[]` mudo
- [ ] Teste de página: ligar 4, recusar a 5ª, reordenar, salvar promo — todos com o payload asseverado
- [ ] Gate: `pnpm test` + `pnpm lint` + `tsc` dos dois apps

**Tests**: unit (RTL)
**Gate**: build
**Commit**: `feat(backoffice): a tela onde o menu da loja é decidido`

---

### T17: `MegaMenu` (board 1QB-0)

**What**: O painel do desktop — coluna de filhas, "Ver todos", "Em alta" e card promo.
**Where**: `apps/store/src/widgets/header/ui/MegaMenu.tsx` + teste
**Depends on**: T9
**Reuses**: `useMenu`, `useProducts`, `ProductCard`, tokens `nanita-*`
**Requirement**: MENU-11, MENU-12, MENU-13, MENU-14, MENU-15

**Tools**: MCP: `paper` (valores exatos) · Skill: NONE

**Done when**:
- [ ] Hover na entrada com filhas abre o painel; `pointerleave` do conjunto fecha (MENU-11, MENU-15)
- [ ] Foco de teclado abre; `Esc` fecha **devolvendo o foco** à entrada (MENU-12)
- [ ] Até 3 produtos `is_featured` sob "Em alta" (MENU-13)
- [ ] Entrada sem filhas **e** sem promo é link direto, sem painel (MENU-14)
- [ ] Paleta traduzida para `nanita-*` — sem `#1A0F2E`, `#FF3B7F` nem `Lilita One` no código
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): o topo abre o universo inteiro`

---

### T18: `menuUiStore` + `MobileMenu` (board 1SF-0)

**What**: A folha de tela cheia do celular e o store efêmero que a abre.
**Where**: `apps/store/src/entities/category/model/menuUiStore.ts`,
`apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx` + teste, barrels
**Depends on**: T9
**Reuses**: `Sheet`, `useSearchUiStore`, `useAuthUiStore`; molde do `cartUiStore`
**Requirement**: MENU-16, MENU-17, MENU-18, MENU-19, MENU-20

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Folha com logo, fechar, gatilho de busca, acordeões, "Crie o Seu", "Sobre", atalhos e promo (MENU-16)
- [ ] Abrir um universo **recolhe** o outro (MENU-17)
- [ ] Busca fecha a folha e abre o overlay — **nenhum** segundo input de busca (MENU-18)
- [ ] "Conta" deslogada fecha a folha e abre o overlay de auth, sem navegar (MENU-19)
- [ ] `menuUiStore` é Zustand **efêmero**, fora do storage — com o porquê comentado
- [ ] Alvos ≥ 44px asseverados no teste (MENU-20)
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): o menu do celular vira tela, não gaveta espremida`

---

### T19: `Header` integra as duas superfícies

**What**: O header monta `MegaMenu` no desktop e dispara a folha no celular; o acordeão inline morre.
**Where**: `apps/store/src/widgets/header/ui/Header.tsx`,
`apps/store/src/widgets/header/ui/__tests__/Header.test.tsx`
**Depends on**: T17, T18
**Reuses**: `useMenu`, `menuUiStore`
**Requirement**: MENU-04, MENU-16

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [ ] `.slice(0, 4)` some — as entradas vêm de `useMenu`
- [ ] O bloco `AnimatePresence` do acordeão inline (linhas 118–195) é removido
- [ ] Botão de menu abre a folha via `menuUiStore`
- [ ] Falha de consulta → só "Crie o Seu" e "Sobre" (MENU-04), com teste
- [ ] O teste "o menu mobile abre a busca em tela cheia" **muda de casa** para `MobileMenu.test.tsx`
      com a mesma asserção — não é apagado
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): o header entrega o menu que o admin montou`

---

### T20: Card promocional nas duas superfícies

**What**: A quarta coluna do painel e a faixa da folha, ambas a partir de `resolvePromo`.
**Where**: `apps/store/src/widgets/header/ui/MegaMenu.tsx`,
`apps/store/src/widgets/mobile-menu/ui/MobileMenu.tsx` + testes
**Depends on**: T17, T18
**Reuses**: `resolvePromo`
**Requirement**: MENU-27, MENU-28

**Tools**: MCP: `paper` · Skill: NONE

**Done when**:
- [ ] Promo nula → painel sem a 4ª coluna e folha sem faixa, **sem espaço reservado** (MENU-27)
- [ ] Destino inativo/apagado → card não renderiza (MENU-26, ponta da loja)
- [ ] Card leva a `/colecao/<slug do destino>` (MENU-28)
- [ ] Faixa mobile não briga com a `MobileNav` (respeita o `safe-area`)
- [ ] Gate: `pnpm --filter @nanapin/store test`

**Tests**: unit
**Gate**: quick
**Commit**: `feat(store): o menu ganha vitrine`

---

### T21: Prova visual e memória do projeto

**What**: Provar os dois boards em viewport real e registrar o que virou convenção.
**Where**: `CLAUDE.md`, `.specs/STATE.md` (`AD-014`), `.specs/features/16-.../spec.md` (traceability)
**Depends on**: T16, T19, T20
**Reuses**: skill `playwright-cli`
**Requirement**: MENU-20 + Success Criteria

**Tools**: MCP: NONE · Skill: `playwright-cli`, `run`

**Done when**:
- [ ] Captura em **390×844**: folha do menu conforme `1SF-0`, sem scroll horizontal no body
- [ ] Captura em **1440**: barra com os universos + fixas e painel conforme `1QB-0`
- [ ] Probe final: a ordem que o header recebe **não** começa por "Bottons · Academia"
- [ ] `AD-014` em `.specs/STATE.md`: conjunto de produtos = categoria; Coleções removida
- [ ] Baselines de `lint` **remedidas** e atualizadas no `CLAUDE.md`
- [ ] Traceability do `spec.md` fechada: 28/28 mapeadas
- [ ] Gate: `pnpm test` + `pnpm lint` + `tsc` dos dois apps

**Tests**: manual/Playwright (matriz: "Prova visual")
**Gate**: build
**Commit**: `docs: fecha a 16 — menu da loja, com a régua remedida`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T1 → T2 → T3 → T4 → T5 → T6 → T7
Phase 2:  T8 → T9 → T10 → T11
Phase 3:  T12 → T13 → T14 → T15 → T16
Phase 4:  T17 → T18 → T19 → T20 → T21
```

---

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 Remover Coleções | 1 remoção coesa (ilha fechada, zero importadores) | ✅ |
| T2 Migration | 1 migration | ✅ |
| T3 Tipos | 1 arquivo | ✅ |
| T4 core: ordem + caminho | 3 funções coesas, 1 arquivo | ✅ |
| T5 core: entradas + vagas | 3 funções coesas, mesmo arquivo | ✅ |
| T6 core: `resolvePromo` | 1 função | ✅ |
| T7 core: `descendantIds` | 1 função | ✅ |
| T8 Delegação da subida de árvore | 2 arquivos, 1 conceito | ✅ |
| T9 `useCategories` + `useMenu` | 2 hooks, mesma query | ✅ |
| T10 Filtro de raiz | 4 arquivos, **mesma linha de mudança** | ⚠️ OK — coeso |
| T11 Roll-up | 1 função | ✅ |
| T12 `useAdminCategories` | 1 arquivo | ✅ |
| T13 `MenuSlotList` | 1 componente | ✅ |
| T14 `MenuBarPreview` | 1 componente | ✅ |
| T15 `MenuPromoEditor` | 1 componente | ✅ |
| T16 `AdminMenuPage` + wiring | 1 página + rota + nav | ✅ |
| T17 `MegaMenu` | 1 componente | ✅ |
| T18 `MobileMenu` + store | 1 componente + 1 store | ✅ |
| T19 `Header` | 1 arquivo | ✅ |
| T20 Card promo | 2 componentes, 1 conceito | ⚠️ OK — coeso |
| T21 Prova + memória | fecho | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | início da P1 | ✅ |
| T2 | None | após T1 (ordem, não dependência) | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | T3 | T3 → T4 | ✅ |
| T5 | T4 | T4 → T5 | ✅ |
| T6 | T5 | T5 → T6 | ✅ |
| T7 | T4 | T6 → T7 (mesma fase, T4 anterior) | ✅ |
| T8 | T4 | P1 → P2 | ✅ |
| T9 | T5, T6 | P1 → P2 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T7, T9 | T10 → T11 (T7, T9 anteriores) | ✅ |
| T12 | T3 | P1 → P3 | ✅ |
| T13 | T5, T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T6, T13 | T14 → T15 (T6, T13 anteriores) | ✅ |
| T16 | T13, T14, T15 | T15 → T16 | ✅ |
| T17 | T9 | P2 → P4 | ✅ |
| T18 | T9 | P2 → P4 | ✅ |
| T19 | T17, T18 | T18 → T19 | ✅ |
| T20 | T17, T18 | T19 → T20 | ✅ |
| T21 | T16, T19, T20 | T20 → T21 | ✅ |

Nenhuma task depende de fase posterior. ✅

---

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Tipos/barrels (remoção) | none — gate de build | none | ✅ |
| T2 | Migration/schema | none — **probe HTTP** | none + probe | ✅ |
| T3 | Tipos | none — gate de build | none | ✅ |
| T4 | Domínio puro (core) | unit, 1:1 ACs + edge cases | unit | ✅ |
| T5 | Domínio puro (core) | unit | unit | ✅ |
| T6 | Domínio puro (core) | unit | unit | ✅ |
| T7 | Domínio puro (core) | unit | unit | ✅ |
| T8 | Domínio (2 apps) | unit | unit | ✅ |
| T9 | Hooks de dados | unit | unit | ✅ |
| T10 | Widgets/UI da loja | unit | unit | ✅ |
| T11 | Hooks de dados | unit | unit | ✅ |
| T12 | Hooks de dados | unit | unit | ✅ |
| T13 | UI backoffice | unit | unit | ✅ |
| T14 | UI backoffice | unit | unit | ✅ |
| T15 | UI backoffice | unit | unit | ✅ |
| T16 | Página backoffice | unit (RTL) | unit | ✅ |
| T17 | Widget da loja | unit | unit | ✅ |
| T18 | Widget da loja | unit | unit | ✅ |
| T19 | Widget da loja | unit | unit | ✅ |
| T20 | Widget da loja | unit | unit | ✅ |
| T21 | Prova visual | manual/Playwright | manual/Playwright | ✅ |

Nenhuma violação. Nenhum `Tests: none` justificado por "testado em outra task".

---

## Requirement Coverage

| Requirement | Task(s) |
| --- | --- |
| MENU-01 | T4, T10 |
| MENU-02 | T10 |
| MENU-03 | T7, T11 |
| MENU-04 | T9, T19 |
| MENU-05 | T5, T13, T16 |
| MENU-06 | T5, T13 |
| MENU-07 | T12, T13, T16 |
| MENU-08 | T13 |
| MENU-09 | T13, T14, T16 |
| MENU-10 | T5, T13, T16 |
| MENU-11 | T17 |
| MENU-12 | T17 |
| MENU-13 | T17 |
| MENU-14 | T5, T17 |
| MENU-15 | T17 |
| MENU-16 | T18, T19 |
| MENU-17 | T18 |
| MENU-18 | T18 |
| MENU-19 | T18 |
| MENU-20 | T18, T21 |
| MENU-21 | T1 |
| MENU-22 | T1 |
| MENU-23 | T1 |
| MENU-24 | T15 |
| MENU-25 | T6, T15 |
| MENU-26 | T6, T15, T20 |
| MENU-27 | T6, T20 |
| MENU-28 | T20 |

**Coverage: 28 total, 28 mapeadas, 0 sem task.** ✅
