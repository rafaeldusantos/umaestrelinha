# Refinamentos do Catálogo — Tasks

**Spec**: [`spec.md`](./spec.md) · **Contexto**: [`../07-product-catalog-admin/context.md`](../07-product-catalog-admin/context.md)
**Status**: **FEATURE FECHADA** — 16/16 tasks (T43–T58)
**Total**: **16 tasks em 3 fases** (T43–T58) — a T52 virou sete ao encontrar o bloqueio de schema

> **Numeração**: continua a global do programa do catálogo (a `13` fechou em T42). A `14` não é parte
> daquele programa, mas reusar a sequência mantém `Txx` sem ambiguidade no repositório.

## Execution Protocol

Implementado com a Skill `tlc-spec-driven` (fluxo Execute + Critical Rules).

> **Convenção do projeto (`CLAUDE.md`)**: sem commits atômicos durante a implementação — os `Commit:`
> abaixo são a mensagem planejada do commit agrupado por fase.

---

## Test Coverage Matrix

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Lógica pura (`toCsv`, `buildDuplicates`, `summaryFacts`, `checklistProgress`) | unit | Todas as branches; 1:1 com as ACs | co-locado `apps/backoffice/src/**/*.test.ts` | `pnpm --filter @nanapin/backoffice test` |
| Camada de dados (`deleteProductsBatch`, diff de categorias em massa) | unit | Asserção **sobre o mock do supabase**: um delete para N ids, e o diff que não reescreve o que não mudou | co-locado | idem |
| Componentes (barra de massa, diálogo de exclusão, painel, grade rápida, inspetor) | unit (RTL) | Comportamento observável das ACs. **Não** snapshot | co-locado `*.test.tsx` | idem |
| Layout (largura total) | unit (RTL) | Asserção de classe — mesma classe de prova que a `12` usou para os 1360 px do estúdio | co-locado | idem |
| Artboard de Categorias (T51) | **none (revisão humana)** | É entrega de desenho; a prova é o aceite do usuário | — | screenshot |

**Baseline na abertura**: lint **36 err / 16 warn**; `tsc` store **0** · backoffice **4**; testes
**1908**. **Medido no fecho**: lint **35 err / 16 warn** · `tsc` **0 · 0** · testes **2034**. O gate é
**"sem erros novos"**.

## Gate Check Commands

| Gate | Quando | Comando |
| ---- | ------ | ------- |
| **quick-bo** | T43–T50, T53–T57 | `pnpm --filter @nanapin/backoffice test` |
| **build** | fim de fase | `pnpm build && pnpm test && pnpm lint` |
| **revisão** | T51 | `get_screenshot` do artboard + aceite do usuário |

---

## Execution Plan

### Fase 1 — A seleção serve para alguma coisa (4 tasks)
```
T43 → T44 → T45 → T46
```

### Fase 2 — Desenho e implementação conversando (4 tasks)
```
T47 → T48 → T49 → T50
```

### Fase 3 — Categorias (8 tasks)
```
T51 → [aceite do usuário] → T52 → T53 → T54 → T55 → T56 → T57 → T58
```

**16 tasks**. A Fase 3 empacota em um lote de ~7 (T52–T58), então executa **inline** — e o usuário
não pediu sub-agentes. A validação independente rodou no modo **standalone** do skill, pelo mesmo
motivo.

---

## Task Breakdown

### Fase 1

#### T43: Barra de massa — `Ativar`, `Pausar`, `Duplicar`

**What**: As três ações diretas da barra. `Ativar`/`Pausar` reusam `updateProductsBatch` e o
`useUndoBuffer`; `Duplicar` monta as cópias como rascunho num único insert.
**Where**: `features/bulk-edit/model/buildDuplicates.ts` + `.test.ts`,
`features/bulk-edit/ui/BulkBar.tsx` + `.test.tsx`, `pages/admin/AdminProductsPage.tsx`
**Requirement**: RFN-01

**Done when**:
- [x] A barra mostra as seis ações e a contagem
- [x] `Ativar`/`Pausar` usam **um** `updateProductsBatch` e oferecem desfazer
- [x] `Duplicar` gera ` (cópia)` com slug livre, `is_active: false`, num insert
- [x] Slug de cópia que colide ganha sufixo até ficar livre
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): barra de massa com ativar, pausar e duplicar`

---

#### T44: Excluir em massa com lista prévia e confirmação em duas etapas

**What**: Diálogo que **lista** os produtos (nome, preço, status), diz quantos são, e exige a palavra
`EXCLUIR`. `deleteProductsBatch` com relato de falha parcial.
**Where**: `features/bulk-edit/ui/BulkDeleteDialog.tsx` + `.test.tsx`,
`entities/product/api/useAdminProducts.ts`
**Depends on**: T43
**Requirement**: RFN-02

**Done when**:
- [x] A primeira etapa lista os selecionados **antes** de qualquer escrita
- [x] Mais de 10 selecionados mostra os 10 primeiros e `e mais X`
- [x] A ação destrutiva só habilita com `EXCLUIR` digitado (aceita minúsculas)
- [x] Cancelar não exclui nada e mantém a seleção
- [x] Falha parcial reporta `X excluídos · Y falharam`
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): excluir em massa com lista prévia e confirmação digitada`

---

#### T45: Exportar CSV compatível com o importador

**What**: `toCsv(rows, columns)` puro, com as colunas que o `CsvImportDialog` aceita; download no
navegador.
**Where**: `features/bulk-edit/model/exportCsv.ts` + `.test.ts`, `AdminProductsPage.tsx`
**Depends on**: T43
**Requirement**: RFN-03

**Done when**:
- [x] As colunas são exatamente as que o importador lê (conferido no `CsvImportDialog`)
- [x] Campo com vírgula, aspas ou quebra de linha é escapado por RFC 4180
- [x] Produto com grade exporta `base_price`, não a faixa
- [x] Só os selecionados entram
- [x] Test count: ≥ 10 testes passam

**Commit**: `feat(backoffice): exportar selecionados em CSV relegível pelo importador`

---

#### T46: Painel de massa — Categorias e Agendar

**What**: Campo Categorias (`Adicionar`/`Remover`/`Substituir`) e o modo `Agendar` no Status. A
escrita de categorias usa o **diff** de `product_categories`, não reescrita.
**Where**: `features/bulk-edit/ui/BulkEditPanel.tsx`, `features/bulk-edit/model/applyCategories.ts`
+ `.test.ts`, `AdminProductsPage.tsx`
**Depends on**: T43
**Requirement**: RFN-04

**Done when**:
- [x] Os três modos de categoria aparecem e chegam ao `buildBulkPatch`
- [x] `Substituir` avisa na prévia que remove as atuais
- [x] `Agendar` exige data e grava `is_active: false` + `scheduled_at`
- [x] O diff não emite escrita para vínculo que não mudou
- [x] Test count: ≥ 12 testes passam

**Commit**: `feat(backoffice): edição em massa de categorias e agendamento`

---

### Fase 2

#### T47: Grade rápida com coluna de imagem

**What**: Coluna `imagem` antes de `Nome`, usando `uploadProductImages` da aba Mídia; miniatura na
célula com remover; a URL entra em `images` do produto criado.
**Where**: `features/quick-grid/model/quickGrid.ts`, `pages/admin/AdminQuickGridPage.tsx` + testes
**Requirement**: RFN-05

**Done when**:
- [x] A coluna existe, na posição do artboard
- [x] O envio reusa a validação da lib (tipo, 8 MB, WebP 1600 px) — sem segundo caminho
- [x] A linha criada leva `images: [{url, alt, source:'upload'}]`
- [x] Falha de upload não impede criar a linha sem imagem, e nomeia o motivo
- [x] Test count: ≥ 10 testes passam

**Commit**: `feat(backoffice): grade rápida com imagem por linha`

---

#### T48: Aba Geral — coluna central e `Descartar` com confirmação

**What**: Contador `N / 70` no nome, `N selecionadas` em Categorias, rótulo `SUGERIDAS` nas tags, e
o diálogo de confirmação do `Descartar`.
**Where**: `pages/admin/AdminProductFormPage.tsx`, `features/product-form/ui/{TagInput,ProductFormHeader}.tsx` + testes
**Requirement**: RFN-06, RFN-08 (parte)

**Done when**:
- [x] O contador do nome mostra `32 / 70` para um nome de 32 caracteres
- [x] O card Categorias mostra `3 selecionadas`
- [x] As sugestões de tag vêm sob o rótulo `SUGERIDAS — MAIS USADAS`
- [x] `Descartar` abre confirmação e **não** apaga antes do aceite
- [x] Test count: ≥ 10 testes passam

**Commit**: `feat(backoffice): aba Geral alinhada ao desenho e descartar com confirmação`

---

#### T49: Inspetor — checklist, Resumo e Prévia

**What**: Badge `N de M` + barra de progresso + ação por item no checklist; Resumo com faixa de
preço, variações, estoque somado, imagens e peso; `Prévia na loja` com `Abrir ↗`; rótulos de
Publicação.
**Where**: `features/product-form/ui/{PublishChecklist,StorefrontPreview}.tsx`,
`features/product-form/model/summaryFacts.ts` + `.test.ts`, `AdminProductFormPage.tsx` + testes
**Depends on**: T48
**Requirement**: RFN-07

**Done when**:
- [x] Checklist com 4 de 6 mostra `4 de 6` e barra em ~67%
- [x] Item pendente mostra `Ir →`; o de SEO mostra `Gerar`
- [x] Resumo mostra **faixa** `R$ 14,90 – 18,40` para produto com grade, e preço único sem grade
- [x] Resumo mostra `6 · 1 pausada`, `84 un.`, `3 · 2 de mockup` e o peso
- [x] `Prévia na loja` tem `Abrir ↗` apontando para `/produto/<slug>` da loja
- [x] Rótulos: `Destaque na home`, `Selo "Novo"`, `Drop programado`
- [x] Test count: ≥ 14 testes passam

**Commit**: `feat(backoffice): inspetor do produto com progresso, faixa de preço e prévia na loja`

---

#### T50: Largura total da listagem e do detalhe

**What**: Remover `max-w-6xl mx-auto`; conferir que a tabela e as três faixas do formulário respiram.
**Where**: `pages/admin/AdminProductFormPage.tsx`, `pages/admin/AdminProductsPage.tsx`,
`widgets/admin-layout` (se o `max-w` estiver lá) + teste
**Requirement**: RFN-08 (parte)

**Done when**:
- [x] `max-w-6xl` não existe mais no formulário nem na listagem
- [x] O inspetor segue com largura própria (a coluna da direita não estica sem limite)
- [x] Test count: ≥ 3 testes passam

**Commit**: `feat(backoffice): listagem e detalhe de produto ocupam a largura da tela`

---

### Fase 3

#### T51: Artboard de Categorias no Paper

**What**: Desenhar listagem + inspetor de Categorias na página **Backoffice - Produtos**, com os
tokens Nanita e a linguagem da *listagem v2*.
**Where**: Paper (arquivo Nanapin)
**Requirement**: RFN-09 (desenho)
**Tests**: none · **Gate**: revisão

**Done when**:
- [x] O artboard existe e usa os tokens do arquivo
- [x] Cobre: busca, contagem por categoria, árvore pai/filho, seleção, barra de massa e o inspetor
- [x] Screenshot entregue ao usuário **antes** da implementação

**Commit**: `design(backoffice): artboard da tela de categorias`

**Aceite**: usuário aprovou em 2026-08-01, com dois cortes de escopo decididos na mesma conversa —
`Mesclar` **fora** (destrutiva demais para entrar de carona; o artboard foi corrigido para não
mostrar o que não existe) e modo **Reordenar com arraste dentro do mesmo pai** **dentro**.

---

> ### A T52 virou sete tasks
>
> A T52 foi escrita como uma task só, presumindo que a tela era um problema de UI. **Não era.** A
> tabela `categories` **não tem** `parent_id`, `banner_url` nem `color_accent` — nenhuma migration
> jamais as criou — enquanto `DbCategory`, `CategoryFormDialog`, `useAdminCategories`,
> `CategoryMultiSelect` e a loja **todos** leem e escrevem essas colunas. Reproduzido contra o banco
> local com o payload exato do formulário:
>
> ```
> POST /rest/v1/categories → {"code":"PGRST204",
>   "message":"Could not find the 'banner_url' column of 'categories' in the schema cache"}
> ```
>
> Ou seja: **toda criação e toda edição de categoria falha hoje**, e a árvore de `useAdminCategories`
> sempre devolve tudo como raiz. A migration da T52 não é escopo novo — é o schema alcançando o que o
> código inteiro já acredita. Sem ela, nada do artboard tem onde se apoiar.

---

#### T52: Migration — as colunas que o código já assume

**What**: `parent_id`, `banner_url`, `color_accent`, `updated_at` em `categories`, mais a view
`category_product_counts` que dá a contagem **no servidor** a partir de `product_categories`.
**Where**: `supabase/migrations/20260801150000_categories-hierarchy-and-counts.sql`
**Depends on**: T51 + aceite
**Requirement**: RFN-09 · **Tests**: none (DDL) · **Gate**: build

**Done when**:
- [x] `parent_id uuid references categories(id) on delete set null`, com índice e `check (parent_id <> id)`
- [x] `banner_url text`, `color_accent text`, `updated_at timestamptz` + trigger `update_updated_at_column`
- [x] View `category_product_counts (category_id, product_count)` com `security_invoker = true`
- [x] O payload que hoje devolve PGRST204 passa a gravar

**Commit**: `feat(db): hierarquia e contagem de categorias`

---

#### T53: `useAdminCategories` v2 — contagem do servidor

**What**: Trocar `products(count)` (FK legado `products.category_id`) pela view, e expor
`updateCategoriesBatch` para a barra de massa e `moveCategory` para o arraste.
**Where**: `entities/category/api/useAdminCategories.ts` + `.test.ts`
**Depends on**: T52 · **Requirement**: RFN-09 · **Tests**: unit · **Gate**: quick-bo

**Done when**:
- [x] A contagem vem de `category_product_counts`, não de `products(count)`
- [x] `updateCategoriesBatch` faz **um** update para N ids
- [x] Falha de leitura da contagem deixa a lista utilizável com contagem zero

**Commit**: `feat(backoffice): contagem de categorias no servidor`

---

#### T54: Domínio puro da árvore — `categoryTree.ts`

**What**: `buildCategoryTree` (linhas com `depth`, `ownCount`, `totalCount` = própria + filhas),
`filterCategoryRows` (busca por nome/slug + as visões Todas/Na vitrine/Ocultas/Sem produto),
`cascadeSelection` (marcar pai marca as filhas) e `reorderWithinParent`.
**Where**: `features/category-list/model/categoryTree.ts` + `.test.ts`
**Depends on**: T53 · **Requirement**: RFN-09 · **Tests**: unit · **Gate**: quick-bo

**Done when**:
- [x] Pai mostra `totalCount` = próprios + das filhas; filha mostra só o próprio
- [x] Busca casa nome **e** slug, e mantém o pai visível quando só a filha casa
- [x] `cascadeSelection` inclui as filhas do pai marcado
- [x] `reorderWithinParent` recusa mover para outro pai
- [x] Ciclo em `parent_id` não trava a construção da árvore

**Commit**: `feat(backoffice): domínio da árvore de categorias`

---

#### T55: Tabela em árvore com seleção e visibilidade inline

**What**: `CategoryTable` — linhas pai/filha com conector, caret, contagem, e o **interruptor** de
`active` editável sem abrir o inspetor.
**Where**: `features/category-list/ui/CategoryTable.tsx` + `.test.tsx`
**Depends on**: T54 · **Requirement**: RFN-09 · **Tests**: unit (RTL) · **Gate**: quick-bo

**Done when**:
- [x] Clicar no interruptor grava `active` sem abrir o inspetor
- [x] O caret expande/colapsa e as filhas somem/aparecem
- [x] Clicar na linha seleciona a categoria para o inspetor

**Commit**: `feat(backoffice): tabela em árvore de categorias`

---

#### T56: Inspetor de categoria

**What**: Painel docado: nome, URL, categoria pai, descrição, capa, e os dois interruptores
(`Mostrar na vitrine`, `Destacar na home`), com rodapé Cancelar/Salvar.
**Where**: `features/category-list/ui/CategoryInspector.tsx` + `.test.tsx`
**Depends on**: T55 · **Requirement**: RFN-09 · **Tests**: unit (RTL) · **Gate**: quick-bo

**Done when**:
- [x] `Salvar` grava e o PGRST204 de hoje não volta
- [x] O seletor de pai não oferece a própria categoria nem uma filha dela
- [x] `Cancelar` com alteração pendente não grava nada

**Commit**: `feat(backoffice): inspetor de categoria`

---

#### T57: Barra de massa e exclusão que nomeia o estrago

**What**: `Mover para…`, `Mostrar`, `Ocultar`, `Excluir` (+ `Limpar`). A exclusão diz **quantos
produtos** ficam sem a categoria e **quantas subcategorias** vão junto, antes de apagar.
**Where**: `features/category-list/ui/CategoryBulkBar.tsx`, `CategoryDeleteDialog.tsx` + testes
**Depends on**: T56 · **Requirement**: RFN-09 · **Tests**: unit (RTL) · **Gate**: quick-bo

**Done when**:
- [x] Excluir nomeia a contagem de produtos afetados e das subcategorias, e exige confirmação
- [x] `Mostrar`/`Ocultar` usam **um** `updateCategoriesBatch`
- [x] `Mesclar` **não** existe (corte de escopo do aceite da T51)

**Commit**: `feat(backoffice): barra de massa de categorias`

---

#### T58: Modo Reordenar e montagem da página

**What**: O botão `Reordenar` liga o modo de arraste (alça por linha, só dentro do mesmo pai,
gravando `sort_order`); `AdminCategoriesPage` compõe cabeçalho, visões, filtros, tabela e inspetor.
**Where**: `pages/admin/AdminCategoriesPage.tsx` + `.test.tsx`, `features/category-list/index.ts`
**Depends on**: T57 · **Requirement**: RFN-09 · **Tests**: unit (RTL) · **Gate**: build

**Done when**:
- [x] Fora do modo Reordenar não há alça de arraste
- [x] Soltar numa posição do **mesmo** pai grava `sort_order`; em outro pai, recusa
- [x] A página monta com tabela + inspetor e o `CategoryFormDialog` legado sai do caminho
- [x] Test count somado T53–T58: ≥ 12 testes passam

**Commit**: `feat(backoffice): tela de categorias v2`

---

## Phase Execution Map

```
Fase 1: T43 → T44 → T45 → T46
Fase 2: T47 → T48 → T49 → T50
Fase 3: T51 → [aceite] → T52 → T53 → T54 → T55 → T56 → T57 → T58
```
