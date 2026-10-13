# 64 · Lista de categorias na Home — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implemente estas tarefas com a skill `tlc-spec-driven`: **ative-a pelo nome e siga o fluxo Execute e
as Critical Rules dela.** Não procure os arquivos da skill por caminho. A skill é a fonte do fluxo
completo (ciclo por tarefa, delegação a sub-agentes, revisão de adequação, Verifier, sensor de
discriminação).

**Se a skill não puder ser ativada, PARE e avise o usuário — não prossiga sem ela.**

> **Sobreposições do projeto e do orquestrador** (valem acima da skill):
> - **Nenhum commit por tarefa.** O `CLAUDE.md` (`BL-012`) e o orquestrador mandam commitar só na
>   etapa COMMIT, de uma vez. O campo **Commit** de cada tarefa é a mensagem planejada, não uma ação.
> - Árvore **compartilhada**: há mudanças de outras sessões não commitadas (a `63` inteira). Não
>   tocar em arquivo fora do **Where** de cada tarefa; nunca `git stash`.
> - Toda medição de suíte: **um workspace por vez**, exit code **fora de pipe**, `--testTimeout=20000`
>   nos dois apps, **sem** `--` antes da flag.

---

**Design**: `.specs/features/64-lista-de-categorias-na-home/design.md` (r2, aprovado em `reviews/design-r2.md`)
**Status**: Implementada (T01–T17) — aguarda Verifier independente e commit

---

## Test Coverage Matrix

> Gerada do código, das diretrizes do projeto e da spec — confirmar antes do Execute. Diretrizes
> encontradas: `CLAUDE.md` (raiz: *Os guardas*, *Baselines*, regras de leitura de teste),
> `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`,
> `apps/store/vitest.config.ts`, `apps/backoffice/vitest.config.ts`. Amostras: `core/home/__tests__/featured.test.ts`,
> `core/home/__tests__/resolve.test.ts`, `core/home/__tests__/catalog.test.ts`,
> `store/widgets/featured-products/ui/__tests__/FeaturedProducts.test.tsx`,
> `store/widgets/hero-carousel/ui/__tests__/*`, `store/shared/lib/__tests__/googleShoppingSchema.test.ts`,
> `backoffice/.../model/__tests__/toNewItems.test.ts`, `backoffice/.../ui/HeroCarouselEditor.test.tsx`.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Regra pura (`packages/core/src/home/**`) | unit | todos os ramos; 1:1 às ACs; cada edge case listado; **asserções que discriminam** (verdadeiras só no mundo certo) | `packages/core/src/home/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Migration / schema | unit (guarda que lê o `.sql` do disco) | âncora dupla (arquivo lido + número extraído); `mutar()` que **lança** sem alvo; sensor por mutação em cada asserção | `apps/store/src/shared/lib/__tests__/*Schema.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Mapeamento de leitura/escrita (hooks `entities/home`) | unit (dublê do client) | o campo novo chega ao `HomeSectionItem`; o payload do `insert` em **igualdade exata** | `apps/*/src/entities/home/api/**/*.test.ts(x)` | store / backoffice test |
| Widget da loja | unit (RTL/jsdom) | cada AC de loja e cada edge case alcançável em jsdom; classes por **token exato** com asserção positiva no celular **e** no `md` (`L-029`, `L-034`); o que jsdom não mede vai para a prova em navegador | `apps/store/src/widgets/category-list/ui/__tests__/*.test.tsx` | store test |
| Registro de renderers / editores | unit | o tipo tem componente; o teste que assere o contrário é **invertido**, não apagado | `HomeRenderer.test.tsx`, `HomeBlockTray.test.tsx` | store / backoffice test |
| Editor do painel | unit (RTL) | cada AC de painel; recusas antes de qualquer escrita; **a página/registro real monta o editor** (`teste-nao-monta-a-arvore-que-prova`) | `apps/backoffice/src/features/home-composition/ui/*.test.tsx` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Banco real | integration (probe HTTP/SQL contra o Supabase local) | `title` de 28 grava, de 29 recusa; o editor grava `title` de verdade (`AD-012`) | registro em `validation.md` | `supabase db reset` + `curl` em `:54441` |
| Layout real | UAT em navegador | 390×844 e 1440×900; A-14 (alfa); sem rolagem horizontal do `body`; setas; prévia sem recarregar | registro em `validation.md` | Playwright / Chrome (ver *O que só o navegador prova*, design) |

## Gate Check Commands

> Gerado do código — confirmar antes do Execute.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick (core) | tarefas só de `packages/core` | `pnpm --filter @estrelinha/core test` |
| Quick (store) | tarefas da loja | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Quick (backoffice) | tarefas do painel | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Tipos | toda tarefa que muda TS | `npx tsc --noEmit -p apps/store/tsconfig.app.json` **e** `npx tsc --noEmit -p apps/backoffice/tsconfig.app.json` (0 · 0) |
| Full | fim de cada fase | os três workspaces acima, **um por vez**, exit code capturado fora de pipe |
| Build | fim da feature | `pnpm lint` (≤ 26/7) · os dois `tsc` (0 · 0) · `pnpm build` · os **cinco** workspaces (inclui `estrelinha/functions` e `estrelinha/catalog-import`, remedidos) · `git diff --name-only -- packages/core/src/payment` vazio |

> **Mudança em `packages/core` tem gate de TRÊS workspaces** (core, store, backoffice) — os guardas
> da loja varrem os dois apps (lição da `46`, `51`, `53`, `55`).

**Baseline de entrada** (medir com a árvore parada **antes** da T01; a tabela do `CLAUDE.md` diz
store 4672/273 · backoffice 3145/174 · core 2757/114 · functions 969/21 · catalog-import 512/23).

---

## Execution Plan

### Phase 1: O dado e a regra (`core` + banco)

```
T01 → T02 → T03 → T04 → T05 → T06
```

### Phase 2: A loja

```
T07 → T08 → T09
```

### Phase 3: O painel

```
T10 → T11 → T12 → T13 → T14
```

### Phase 4: Provas e fecho

```
T15 → T16 → T17
```

---

## Task Breakdown

### T01: `01-migration-coluna-title`

**What**: migration que acrescenta `home_section_items.title text` com `check (≤ 28)`, e o guarda que a compara com `core`.
**Where**: `supabase/migrations/20261012120000_64-lista-de-categorias.sql` (novo) · `apps/store/src/shared/lib/__tests__/categoryListSchema.test.ts` (novo) · `packages/core/src/home/categoryList.ts` (novo, **só** com `CATEGORY_LIST_ITEM_TITLE_MAX`; a T05 o completa) · `packages/core/src/home/index.ts` (barrel)
**Depends on**: None
**Reuses**: `googleShoppingSchema.test.ts` (molde do guarda), `20260906120000_41-banner-principal-da-home.sql` (molde de `add column if not exists`)
**Requirement**: LCT-26, LCT-27

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] Prefixo `20261012120000` conferido como **único** em `supabase/migrations/` antes de criar.
- [x] `add column if not exists title text`; constraint `home_section_items_title_len` criada de forma idempotente (`do $$ … if not exists … pg_constraint …`); `comment on column` dizendo por que não é `alt` nem `label_snapshot`; **sem** `insert`/`update`/`delete`, **sem** `grant`.
- [x] O guarda lê o `.sql` do disco e assere: a coluna existe com `if not exists`; o número do `check` é **igual** a `CATEGORY_LIST_ITEM_TITLE_MAX` (importado de `estrelinha/core/home` — por isso a constante nasce **nesta** tarefa, num `categoryList.ts` só com ela); nenhum `grant … anon`; nenhuma escrita de dado.
- [x] Âncora dupla (arquivo lido **e** número extraído) e `mutar()` que **lança** quando a mutação não muda nada; um sensor por asserção (sem `if not exists`, 29 no lugar de 28, `grant … to anon`, um `insert`).
- [x] Quick (store) passa; `tsc` store 0.

**Tests**: unit · **Gate**: quick (store)
**Commit**: `feat(64): coluna title em home_section_items`

---

### T02: `02-title-no-tipo-e-na-leitura-da-loja`

**What**: `title` em `HomeSectionItem` (core), em `DbHomeSectionItem` (supabase types) e no `mapItem` da loja.
**Where**: `packages/core/src/home/types.ts` · `packages/supabase/src/types/home.ts` · `apps/store/src/entities/home/api/useHomeSections.ts` · `apps/store/src/entities/home/api/__tests__/useHomeSections.test.tsx`
**Depends on**: T01
**Reuses**: o padrão de `image_mobile_url` (feature 41) nos três arquivos
**Requirement**: LCT-28

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `HomeSectionItem.title?: string | null` com o comentário do porquê (design, *Data Models*).
- [x] `mapItem` da loja devolve `title: row.title ?? null`; caso de teste com `title` preenchido **e** caso com a coluna ausente (→ `null`).
- [x] Quick (store) passa; `tsc` store e backoffice 0 · 0.

**Tests**: unit · **Gate**: quick (store) + tipos
**Commit**: `feat(64): title chega ao HomeSectionItem da loja`

---

### T03: `03-title-na-leitura-e-gravacao-do-painel`

**What**: `title` no `mapItem` do painel, em `NewHomeSectionItem` e na lista de colunas do `insert` de `curateSection`.
**Where**: `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts` · `apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts`
**Depends on**: T02
**Reuses**: o teste de payload existente (`escritas('home_section_items')`)
**Requirement**: LCT-28 (e o risco `curateSection` do design)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `curateSection` grava `title: item.title ?? null`; o teste do `insert` assere o payload em **igualdade exata**, com `title`.
- [x] Sensor: apagar a linha `title:` do `insert` reprova o teste (mutação reinjetada à mão e restaurada; registrar no corpo da tarefa).
  - **Registro (2026-10-11):** linha `title: item.title ?? null,` removida de `curateSection` ⇒ `useAdminHomeSections.test.ts` reprovou **1 caso por asserção** (`grava as linhas com as MESMAS chaves…`, diff do `toEqual`), 44 verdes; arquivo restaurado da cópia com SHA-256 conferido igual.
- [x] `mapItem` do painel lê `title`; caso de teste.
- [x] Quick (backoffice) passa; `tsc` backoffice 0.

**Tests**: unit · **Gate**: quick (backoffice) + tipos
**Commit**: `feat(64): o painel lê e grava title`

---

### T04: `04-ordinal-feminino-em-core`

**What**: `ordinalF` nasce em `core/home/carousel.ts`, ao lado de `ordinal`; o `ordinalF` do painel passa a reexportá-lo.
**Where**: `packages/core/src/home/carousel.ts` · `packages/core/src/home/__tests__/carousel.test.ts` · `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts` · `apps/backoffice/src/features/home-composition/model/__tests__/sectionRefusals.test.ts` (novo)
**Depends on**: None
**Reuses**: `ordinal`
**Requirement**: LCT-19 (frases "A 3ª categoria…")

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `ordinalF(3) === '3ª'`; caso em `carousel.test.ts`.
- [x] `sectionRefusals.ts` exporta `ordinalF` **reexportando** o de `core`; a asserção `toBe` de identidade (não `toEqual`) mora em `apps/backoffice/src/features/home-composition/model/__tests__/sectionRefusals.test.ts` (**novo**, criado nesta tarefa; a T11 acrescenta casos nele).
- [x] Quick (core) e quick (backoffice) passam; `tsc` 0 · 0.

**Tests**: unit · **Gate**: quick (core + backoffice)
**Commit**: `refactor(64): ordinalF mora em core`

---

### T05: `05-regra-da-lista-de-categorias`

**What**: `core/home/categoryList.ts` completo — constantes, `categoryListLabel`, `categoryListItem`, `categoryListRefusal` — exportado pelo barrel.
**Where**: `packages/core/src/home/categoryList.ts` · `packages/core/src/home/index.ts` · `packages/core/src/home/__tests__/categoryList.test.ts` (novo)
**Depends on**: T01, T02, T04
**Reuses**: `featured.ts` (molde), `layout.ts` (`SlotSpec`), `ordinalF`
**Requirement**: LCT-02, LCT-12, LCT-16, LCT-17, LCT-19, LCT-20, LCT-30, LCT-39

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Constantes `CATEGORY_LIST_MAX_ITEMS = 24`, `CATEGORY_LIST_ITEM_TITLE_MAX = 28`, `CATEGORY_LIST_TITLE_MAX = 60`, `CATEGORY_LIST_ART = { width: 800, height: 800 }`; imports relativos com `.ts`.
- [x] `categoryListLabel`: título aparado vence; vazio/espaço ⇒ `alt`; vazio ⇒ nome (precedência título > `alt` > nome, um caso por degrau).
- [x] `categoryListItem`: destino de produto ou endereço ⇒ `null`; coleção ⇒ `label` pela função acima, `imageUrl` **só** de `image_url` (caso que dá `banner_url` à coleção resolvida e prova que ele **não** aparece), `imageMobileUrl: null`, `description: null`; imagem vazia ⇒ `imageUrl: null`.
- [x] `categoryListRefusal`: título da seção > 60; lista de 25 recusada com a frase do teto; por item, **na ordem** sem imagem → sem coleção (com e sem `label_snapshot`) → título > 28; lista vazia ⇒ `null`; 24 itens válidos ⇒ `null`. As frases asseridas **literalmente** ("A 3ª categoria está sem imagem.", "A 3ª categoria está sem coleção.").
- [x] Quick (core) passa.

**Tests**: unit · **Gate**: quick (core)
**Commit**: `feat(64): a regra da lista de categorias em core`

---

### T06: `06-resolucao-aplica-a-regra`

**What**: `resolveHomeSections` passa cada item curado de `category_grid` por `categoryListItem`, e o motivo de seção vazia muda.
**Where**: `packages/core/src/home/resolve.ts` · `packages/core/src/home/__tests__/resolve.test.ts`
**Depends on**: T05
**Reuses**: o laço dos curados e `droppedCount` existentes
**Requirement**: LCT-01, LCT-02, LCT-11, LCT-12, LCT-24, LCT-39

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Com um `resolveItem` dublê que devolve `label: 'Cinzas'` e `imageUrl: <banner>`: o item resolvido sai com o **título** quando há, com `'Cinzas'` quando não há, e com a imagem **do item**.
- [x] Item com destino de produto numa seção `category_grid` conta em `droppedCount`; o mesmo item numa `banner_grid` **não** é afetado (prova de que o pós-processamento é por tipo).
- [x] Zero itens ⇒ `hiddenReason === 'Não vai aparecer: nenhuma categoria escolhida.'`; todos órfãos ⇒ a frase de `todosForaDoAr`; seção desligada ⇒ `DESLIGADA`.
- [x] Ordem por `position` preservada.
- [x] Quick (core), quick (store) e quick (backoffice) passam (três workspaces — o resolvedor é lido pelos dois apps).

**Tests**: unit · **Gate**: full
**Commit**: `feat(64): resolveHomeSections aplica a regra da lista`

---

### T07: `07-widget-da-fileira`

**What**: `widgets/category-list` — seção, título opcional, rolador `<nav>`, `<ul>` de itens, item-link com vaga e rótulo.
**Where**: `apps/store/src/widgets/category-list/index.ts` · `apps/store/src/widgets/category-list/ui/CategoryList.tsx` · `apps/store/src/widgets/category-list/ui/__tests__/CategoryList.test.tsx` (novos)
**Depends on**: T06
**Reuses**: `useOverflowAffordance` (ref no `<nav>`), `renditionUrl`/`renditionSrcSet`/`imagePriority`, `Link`
**Requirement**: LCT-01..LCT-10, LCT-13, LCT-35, LCT-36, LCT-37, LCT-40

**Tools**: MCP: NONE · Skill: `frontend-design` (só para conferir tokens contra `DESIGN.md`)

**Done when**:
- [x] Itens na ordem recebida; cada um é **um** link para `item.href` com nome acessível = rótulo; `<img alt="">`.
- [x] Vaga: tokens exatos `h-20 w-20 md:h-[104px] md:w-[104px] object-contain` (positivos no celular **e** no `md`) e **ausência** de `bg-*`, `border*`, `shadow*`, `rounded-*`, `overflow-hidden`, `clip-path` (régua por token exato).
- [x] `src`/`srcSet`/`sizes` do dono de rendição; `loading` de `imagePriority(index)`; o primeiro `<img>` **não** tem `fetchpriority` (asserção de ausência).
- [x] `<h2>` só com `config.title` não vazio; título de espaços ⇒ nenhum cabeçalho.
- [x] Rolador: `<nav aria-label="Categorias">` com `overflow-x-auto snap-x snap-mandatory`; `<li>` com `snap-start shrink-0 w-24 md:w-[148px]`; primeiro `<li>` com `ml-auto`, último com `mr-auto`; **ausência** de `justify-center` no `<ul>`.
- [x] Rótulo com `line-clamp-2`, `text-center`, `[overflow-wrap:anywhere]`, `text-estrelinha-ink`.
- [x] Item sem `imageUrl`: vaga do mesmo tamanho, **sem** `<img>`, rótulo visível. `onError` da imagem: a vaga fica e o rótulo fica.
- [x] Nenhuma opacidade zero / `invisible` / animação de entrada no arquivo.
- [x] Quick (store) passa; `tsc` store 0.

**Tests**: unit · **Gate**: quick (store) + tipos
**Commit**: `feat(64): o widget da lista de categorias`

---

### T08: `08-setas-no-computador`

**What**: as duas setas do widget, pelo estado de `useOverflowAffordance`.
**Where**: `apps/store/src/widgets/category-list/ui/CategoryList.tsx` · `.../__tests__/CategoryList.test.tsx`
**Depends on**: T07
**Reuses**: o molde do teste do `Header` (medidas fixadas à mão no nó: `scrollWidth`, `clientWidth`, `scrollLeft`), `TAP_44`
**Requirement**: LCT-31..LCT-34, LCT-38

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Cabe (medidas iguais) ⇒ nenhuma seta. Começo ⇒ só "Próximas categorias". Meio ⇒ as duas. Fim ⇒ só "Categorias anteriores".
- [x] Clique escreve `scrollLeft` (±0,8 da janela) — assere o valor.
- [x] Classe da seta: `cn(TAP_44, …)` com `absolute`, `top-[52px]`, `-translate-y-1/2`, `hidden md:flex`, `h-9 w-9`; `alvoDeToqueNaoRoubaPosicao` verde.
- [x] `scroll-smooth motion-reduce:scroll-auto` no rolador; `md:px-12`.
- [x] Duas instâncias do widget na mesma árvore têm estados de seta independentes.
- [x] Quick (store) passa; `tsc` store 0.

**Tests**: unit · **Gate**: quick (store) + tipos
**Commit**: `feat(64): setas da lista de categorias no computador`

---

### T09: `09-registro-da-loja`

**What**: `category_grid` → `CategoryList` no registro de renderers, com o teste invertido.
**Where**: `apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx` · `apps/store/src/widgets/home-renderer/ui/__tests__/HomeRenderer.test.tsx`
**Depends on**: T08
**Reuses**: o padrão do `product_carousel`
**Requirement**: LCT-01, LCT-11

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] O caso que asseria `HOME_SECTION_RENDERERS.category_grid` nulo é **invertido**: tem componente; e a Home renderizada (`HomeRenderer` real, com seção e itens) mostra os links dos círculos na posição da seção; seção sem itens resolvidos não renderiza nada.
- [x] O caso "tipo sem renderer é pulado" (`HomeRenderer.test.tsx:106-110`) usava `category_grid` como fixture e passaria a ser verdadeiro nos dois mundos (`tasks-r1` R3): a fixture vira um **tipo desconhecido** (linha gravada por versão mais nova), com asserção de que ele **não tem entrada** no registro e de que a Home renderiza as outras seções.
- [x] Comentário do registro atualizado (não há mais tipo do catálogo sem renderer).
- [x] `heroCarouselSemOpacidadeZero`, `renditionSingleOwner`, `homeComposition` verdes.
- [x] **Full** store passa.

**Tests**: unit · **Gate**: quick (store) + tipos
**Commit**: `feat(64): a Home desenha a lista de categorias`

---

### T10: `10-title-no-rascunho`

**What**: `title` em `DraftItem`, `emptyDraftItem`, `toDraftItems`, `toNewItems` (mantido) e `applyDraft`.
**Where**: `apps/backoffice/src/features/home-composition/model/sectionDraft.ts` · `.../model/__tests__/toNewItems.test.ts` · `.../model/__tests__/applyDraft.test.ts`
**Depends on**: T03
**Reuses**: o padrão de `image_mobile_url`
**Requirement**: LCT-28, LCT-40

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `toNewItems.test.ts`: a lista **literal** passa de sete para **oito** colunas; régua continua igualdade de chaves; âncora "o rascunho tem exatamente dez campos" (oito + dois de tela).
- [x] `applyDraft` leva `title` à prévia (caso novo).
- [x] `toDraftItems` lê `title` do banco; `emptyDraftItem` nasce com `title: null`.
- [x] Quick (backoffice) passa; `tsc` backoffice 0.

**Tests**: unit · **Gate**: quick (backoffice) + tipos
**Commit**: `feat(64): o rascunho da Home carrega title`

---

### T11: `11-recusa-do-editor`

**What**: `categoryListRefusal` do painel = `core` + `configRefusal('category_grid', …)`.
**Where**: `apps/backoffice/src/features/home-composition/model/sectionRefusals.ts` · `.../model/__tests__/sectionRefusals.test.ts` (criado na T04)
**Depends on**: T05, T10
**Reuses**: o molde `productCarouselRefusal`
**Requirement**: LCT-19, LCT-20

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] A função não redige regra: um caso prova que a recusa de `core` chega intacta (sem imagem, sem coleção, 25 itens) e que rascunho válido devolve `null`.
- [x] Quick (backoffice) passa.

**Tests**: unit · **Gate**: quick (backoffice)
**Commit**: `feat(64): a recusa da lista de categorias no painel`

---

### T12: `12-editor-da-lista`

**What**: `CategoryListEditor` — título da seção, lista recolhível, `cruzar` de quatro estados, imagem, coleção, título do item, adicionar com teto, arrasto.
**Where**: `apps/backoffice/src/features/home-composition/ui/CategoryListEditor.tsx` · `.../ui/CategoryListEditor.test.tsx` (novos) · `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` (escopo + âncoras, se o editor tiver `transition-*`)
**Depends on**: T11
**Reuses**: `HeroCarouselEditor` (estrutura, `soltar`, recados), `CollectionRowsEditor` (`cruzar`), `CollectionFeatureEditor` (`<select>` + snapshot), `uploadHomeImage(file, CATEGORY_LIST_ART)`, `CharCounter`, `categoryListLabel`
**Requirement**: LCT-15..LCT-23, LCT-25

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Título da seção: `maxLength` e `CharCounter` leem `CATEGORY_LIST_TITLE_MAX`; apoio literal "Vazio, a fileira aparece sem título.".
- [x] Lista vazia: parágrafo explicativo + "Adicionar categoria". Item novo nasce **aberto**; só um aberto por vez.
- [x] Item aberto, nesta ordem: Imagem (orientação **literal** da LCT-17; aviso de proporção mostrado sem recusar; falha de envio vira recado e **não** muda o rascunho) · "Leva para a coleção" (só ativas, por `sort_order`; desativada aparece "(fora do ar)"; escolher congela `label_snapshot` no mesmo `onItemsChange`) · "Título embaixo do círculo" (`maxLength`/contador de `CATEGORY_LIST_ITEM_TITLE_MAX`, apoio "Vazio, usa o nome da coleção.") · "Remover categoria".
- [x] Item fechado: miniatura `object-contain` sem `rounded-full`; rótulo de `categoryListLabel(item, nome)`; um caso **por estado** do `cruzar` (não escolhida · apagada · desativada · no ar) com o texto do design.
- [x] 24 itens ⇒ "Adicionar categoria" indisponível **e** o motivo "Até 24 categorias por bloco." visível.
- [x] Arrasto reordena (`dragStart`/`drop`) e a ordem chega a `onItemsChange`.
- [x] Nenhum `snap-*`, `scroll-snap` ou `<iframe>` no arquivo; `previaUnica.test.ts` verde **sem edição de régua**.
- [x] Toda classe `transition-*`/`animate-*` com par `motion-reduce:`; se houver, o arquivo entra no escopo literal de `animacaoRespeitaMovimento` com as âncoras subidas **nesta** tarefa.
- [x] Quick (backoffice) passa; `tsc` backoffice 0.

**Tests**: unit · **Gate**: quick (backoffice) + tipos
**Commit**: `feat(64): o editor da lista de categorias`

---

### T13: `13-catalogo-libera-o-bloco`

**What**: rótulo "Lista de categorias" e `COMING_SOON = []`, com os dois guardas que dependem do catálogo invertidos **na mesma tarefa**.
**Where**: `packages/core/src/home/catalog.ts` · `packages/core/src/home/__tests__/catalog.test.ts` · `apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx`
**Depends on**: T12
**Reuses**: o comentário-molde do `product_carousel` em `LIMITS`/`COMING_SOON`
**Requirement**: LCT-14, LCT-29, LCT-30

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `sectionMeta('category_grid')` ⇒ `{ label: 'Lista de categorias', comingSoon: false, limit: null, unique: false }`.
- [x] O caso "a grade de coleções é o ÚNICO `comingSoon`" é **invertido** para "nenhum tipo está em breve" (`emBreve` igual a `[]`), sem ser apagado; `LIMITS` sem `category_grid`, com asserção.
- [x] `homeSections.test.ts` (store) verde **sem edição**.
- [x] `catalog.test.ts:156` (a lista dos tipos "prontos") passa a conter os **onze**, por extenso.
- [x] `HomeBlockTray.test.tsx` **invertido**: "Lista de categorias" habilitado, sem "em breve"; nenhum bloco esmaecido (os casos das linhas 60-121 reescritos para o novo sujeito, sem perder asserção).
- [x] Por que **aqui** e não na Fase 1 (`tasks-r1` R1): a bandeja só deve oferecer o bloco quando o editor existe — o componente nasce na T12 e a entrada em `SECTION_EDITORS` na T14, então **entre T13 e T14** a bandeja oferece um bloco que abre sem editor; as duas são consecutivas no mesmo lote, a suíte fica verde e nenhum estado intermediário é publicado (`tasks-r2` R2); e `HomeRenderer.test.tsx` lê o registro de renderers, não o catálogo, então não depende desta tarefa. Nenhuma suíte fica vermelha entre tarefas.
- [x] Quick (core), quick (store) e quick (backoffice) passam — **verdes**, sem reprovação esperada.

**Tests**: unit · **Gate**: full
**Commit**: `feat(64): o catálogo oferece a Lista de categorias`

---

### T14: `14-registro-do-painel`

**What**: o editor no registro, a recusa provada pelo `HomeSectionEditor` real, o resumo e o ícone da linha, e o motivo de seção vazia no painel.
**Where**: `.../ui/sectionEditors.tsx` · `.../ui/CategoryListEditor.test.tsx` (casos pelo `HomeSectionEditor`, molde de `FeaturedProductsEditor.test.tsx`) · `.../ui/HomeSectionRow.tsx` · `.../model/useAdminResolvedHome.test.ts` · `.../ui/HomeSectionList.test.tsx` (se o resumo/motivo for asserido lá) · `apps/backoffice/src/entities/home/api/useAdminHomeSections.test.ts` (caso de `createSection('category_grid')`)
**Depends on**: T13
**Reuses**: o registro do `product_carousel`
**Requirement**: LCT-14, LCT-15, LCT-24

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] `SECTION_EDITORS.category_grid = { Body: CategoryListEditor, refusal: categoryListRefusal }`.
- [x] **A recusa ao salvar pelo `HomeSectionEditor` real** (`tasks-r1` R2, LCT-19, LCT-20): com um item sem imagem, clicar em salvar mostra "A 1ª categoria está sem imagem.", **nenhuma** escrita chega ao dublê (`curateSection`/`update` não chamados) e o rascunho continua na tela; idem sem coleção; idem com 25 itens (o teto também na gravação). Sensor: remover `refusal:` da entrada em `SECTION_EDITORS` reprova esses casos (mutação reinjetada e restaurada).
- [x] **LCT-15** (`tasks-r1` R7): acrescentar o bloco pela bandeja cria a seção com `active: false` e sem itens (caso de `createSection` com `category_grid` em `useAdminHomeSections.test.ts`), e o editor abre com "Título da seção" vazio, a lista vazia e "Adicionar categoria".
- [x] `HomeSectionRow` (`tasks-r1` R5): ícone trocado de `LayoutGrid` para `CircleDot` (o `GalleryHorizontal` já é do `hero_carousel`); `case 'category_grid'` no resumo da linha dizendo "N categorias" — sem ele a linha cai no padrão e diz "automático" para um bloco que nunca é derivado. Caso de teste do resumo.
- [x] `useAdminResolvedHome` com seção `category_grid` sem itens ⇒ "Não vai aparecer: nenhuma categoria escolhida."; com item de coleção desativada ⇒ `droppedCount` 1.
- [x] Teste pela **página/registro real** (não um editor montado à mão): abrir a seção pela `HomeSectionEditor` monta o `CategoryListEditor`.
- [x] **Full** backoffice passa.

**Sensor (registrado na execução)**: a entrada `category_grid` de `SECTION_EDITORS` foi reinjetada sem `refusal:` e a suíte do editor rodou — **4 casos caíram por asserção** (a identidade do registro e as três recusas pelo casco: sem imagem, sem coleção, acima do teto), 32 seguiram verdes; arquivo restaurado e SHA-256 conferido igual.

**Tests**: unit · **Gate**: full (backoffice) + tipos
**Commit**: `feat(64): o painel oferece e edita a lista de categorias`

---

### T15: `15-probe-no-banco-local`

**What**: provar a gravação contra o Supabase local (`AD-012`).
**Where**: registro em `.specs/features/64-lista-de-categorias-na-home/validation.md` (seção do autor)
**Depends on**: T14
**Reuses**: `supabase start` (faixa 54440–54449; **nunca** `stop --all`)
**Requirement**: LCT-26 (Independent Test do P1 · dado), LCT-28

**Tools**: MCP: NONE · Skill: `supabase`

**Done when**:
- [x] A migration se aplica ao banco local sem erro (`migration up`, sem `db reset` — só ela estava pendente, e o reset apagaria o catálogo local); reaplicar não falha (idempotência).
- [x] `insert` com `title` de 28 caracteres ⇒ 201; de 29 ⇒ violação de `check`.
- [x] Leitura anônima de `home_section_items` traz `title`.
- [x] Saídas reais coladas no registro. Se o Docker não subir, registrar **por quê** e o que ficou sem prova — não declarar provado.

**Tests**: integration · **Gate**: full
**Commit**: — (só registro)

---

### T16: `16-prova-em-navegador`

**What**: as seis provas de *O que só o navegador prova* (design), incluindo A-14.
**Where**: registro em `validation.md`; artefatos no scratchpad
**Depends on**: T15
**Reuses**: memória `prova-em-navegador-sem-docker` (interceptação de `/rest/v1/`; conferir o bundle **servido** antes de medir)
**Requirement**: LCT-05, LCT-08, LCT-09, LCT-10, LCT-24, LCT-31..LCT-34, LCT-37, A-14, Success Criteria

**Tools**: MCP: `claude-in-chrome` (ou Playwright) · Skill: `playwright-cli`

**Done when**:
- [x] A-14: PNG circular transparente enviado pelo painel; o objeto gravado e a rendição servida **mantêm alfa**; na loja só o círculo aparece. Se o alfa cair, **abrir tarefa de conserto** no upload antes de seguir (não é dívida).
- [x] 390×844: `document.body.scrollWidth === 390`; ~3,5 itens visíveis; 4º cortado.
- [x] 1440: 7 inteiros + parte do 8º com 8 itens; setas conforme estado; com 4 itens, centrada e sem setas.
- [x] Título de 28 sem espaço em 2 linhas; itens alinhados pelo topo.
- [x] Painel: acrescentar o bloco, 3 artes, salvar — prévia muda sem recarregar o iframe (identidade do nó).
- [x] LCP da Home com e sem o bloco (confirma a decisão de R4).

> **Defeito achado por esta prova, consertado na mesma tarefa**: o recuo final do rolador ficava fora da área rolável (em 1440 com 8 itens a seta rolava 8px; em 390 o último item encostava na borda). Teste novo em `CategoryList.test.tsx` (reprovou antes), `<ul>` com `w-max min-w-full`, remedido em navegador: 56px em 1440 e 16px de recuo em 390. Detalhe em `validation.md`.

**Tests**: UAT · **Gate**: full
**Commit**: — (só registro)

---

### T17: `17-baselines-e-documentacao`

**What**: medir os cinco workspaces, lint, tipos, build; atualizar baselines e os `CLAUDE.md` tocados; registrar dívidas.
**Where**: `CLAUDE.md` (raiz: baselines, numeração "a `64` está…", guardas, *O que espera decisão da dona*, dívidas) · `apps/store/CLAUDE.md` · `apps/backoffice/CLAUDE.md` · `packages/core/CLAUDE.md` · `.specs/STATE.md` (handoff)
**Depends on**: T16
**Reuses**: o formato das entradas de baseline das features `50`/`63`
**Requirement**: Success Criteria (nenhum guarda afrouxado; `payment/**` intacto)

**Tools**: MCP: NONE · Skill: NONE

**Done when**:
- [x] Os cinco workspaces medidos **um por vez**, exit code fora de pipe; delta **contra a baseline de entrada medida**, não contra a tabela.
- [x] Lint ≤ 26/7; `tsc` 0 · 0; `pnpm build` verde; `git diff --name-only -- packages/core/src/payment` vazio.
- [x] Guarda novo (`categoryListSchema`) na tabela *Os guardas*; os três guardas invertidos registrados.
- [x] Dívidas registradas: a cópia do `cruzar` (`design-r2` R3), a sexta cópia do arrasto `soltar`, o `config.limit` que corta qualquer tipo, o widget morto `widgets/category-grid`.
- [x] A tabela *Requirement Traceability* da `spec.md` atualizada ID a ID a partir da deste arquivo, com o status final (`tasks-r1` R6).
- [x] "Espera decisão da dona": o bloco nasce inexistente — acrescentar, subir artes, escolher coleções, ligar.

**Tests**: none · **Gate**: build
**Commit**: `docs(64): baselines, guardas e dívidas da lista de categorias`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4

Phase 1:  T01 ──→ T02 ──→ T03 ──→ T04 ──→ T05 ──→ T06
Phase 2:  T07 ──→ T08 ──→ T09
Phase 3:  T10 ──→ T11 ──→ T12 ──→ T13 ──→ T14
Phase 4:  T15 ──→ T16 ──→ T17
```

17 tarefas ⇒ três lotes de fases inteiras: **[Fase 1]** (6) · **[Fases 2 + 3]** (8) · **[Fase 4]** (3). Toda fase termina verde.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T01 | 1 migration + o guarda dela | ⚠️ coesos (o guarda só existe com a migration) |
| T02 | 1 campo em 3 arquivos da mesma cadeia de leitura | ⚠️ coeso |
| T03 | 1 hook | ✅ |
| T04 | 1 função + reexport | ✅ |
| T05 | 1 módulo puro | ✅ |
| T06 | 1 função | ✅ |
| T07 | 1 componente | ✅ |
| T08 | 1 comportamento no mesmo componente | ✅ |
| T09 | 1 entrada de registro | ✅ |
| T10 | 1 módulo de rascunho | ✅ |
| T11 | 1 função | ✅ |
| T12 | 1 componente | ✅ |
| T13 | catálogo + os dois guardas que o leem | ⚠️ coeso (inverter na mesma tarefa é o que mantém a suíte verde) |
| T14 | registro + recusa pelo editor real + resumo/ícone da linha | ⚠️ coeso (fiação do mesmo tipo) |
| T15 | 1 probe | ✅ |
| T16 | 1 UAT | ✅ |
| T17 | fecho | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T01 | — | início da Fase 1 | ✅ |
| T02 | T01 | T01 → T02 | ✅ |
| T03 | T02 | T02 → T03 | ✅ |
| T04 | — | na Fase 1, depois de T03 (ordem sequencial, sem dependência) | ✅ |
| T05 | T01, T02, T04 | todos antes na Fase 1 | ✅ |
| T06 | T05 | T05 → T06 | ✅ |
| T07 | T06 | Fase 1 → Fase 2 | ✅ |
| T08 | T07 | T07 → T08 | ✅ |
| T09 | T08 | T08 → T09 | ✅ |
| T10 | T03 | Fase 1 → Fase 3 | ✅ |
| T11 | T05, T10 | Fase 1; T10 → T11 | ✅ |
| T12 | T11 | T11 → T12 | ✅ |
| T13 | T12 | T12 → T13 | ✅ |
| T14 | T13 | T13 → T14 | ✅ |
| T15 | T14 | Fase 3 → Fase 4 | ✅ |
| T16 | T15 | T15 → T16 | ✅ |
| T17 | T16 | T16 → T17 | ✅ |

Nenhuma dependência aponta para fase posterior.

## Test Co-location Validation

| Task | Camada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T01 | migration/schema | unit (guarda) | unit | ✅ |
| T02 | tipos + mapeamento da loja | unit | unit | ✅ |
| T03 | mapeamento/gravação do painel | unit | unit | ✅ |
| T04 | regra pura | unit | unit | ✅ |
| T05 | regra pura | unit | unit | ✅ |
| T06 | regra pura | unit | unit | ✅ |
| T07 | widget | unit | unit | ✅ |
| T08 | widget | unit | unit | ✅ |
| T09 | registro | unit | unit | ✅ |
| T10 | rascunho | unit | unit | ✅ |
| T11 | recusa | unit | unit | ✅ |
| T12 | editor | unit | unit | ✅ |
| T13 | regra pura (catálogo) + bandeja | unit | unit | ✅ |
| T14 | registro do painel | unit | unit | ✅ |
| T15 | banco real | integration | integration | ✅ |
| T16 | layout real | UAT | UAT | ✅ |
| T17 | documentação | none | none | ✅ |

## Requirement Traceability

| ID | Tasks |
| --- | --- |
| LCT-01 | T06, T07, T09 |
| LCT-02 | T05, T06, T07 |
| LCT-03 | T07 |
| LCT-04 | T07 |
| LCT-05 | T07, T16 |
| LCT-06 | T07, T16 |
| LCT-07 | T07 |
| LCT-08 | T07, T16 |
| LCT-09 | T07, T16 |
| LCT-10 | T07, T16 |
| LCT-11 | T06, T09 |
| LCT-12 | T05, T06 |
| LCT-13 | T07, T09 |
| LCT-14 | T13 |
| LCT-15 | T12, T14 |
| LCT-16 | T05, T12 |
| LCT-17 | T05, T12 |
| LCT-18 | T12 |
| LCT-19 | T04, T05, T11, T14 |
| LCT-20 | T05, T11, T12, T14 |
| LCT-21 | T12 |
| LCT-22 | T12 |
| LCT-23 | T12, T16 |
| LCT-24 | T06, T14, T16 |
| LCT-25 | T12 |
| LCT-26 | T01, T15 |
| LCT-27 | T01, T05 |
| LCT-28 | T02, T03, T10, T15 |
| LCT-29 | T13 |
| LCT-30 | T05, T13 |
| LCT-31 | T08, T16 |
| LCT-32 | T08 |
| LCT-33 | T08, T16 |
| LCT-34 | T08, T16 |
| LCT-35 | T07 |
| LCT-36 | T07 |
| LCT-37 | T07, T16 |
| LCT-38 | T08 |
| LCT-39 | T05, T06 |
| LCT-40 | T07, T10 |

40 de 40 mapeadas, uma linha por ID (`tasks-r1` R6). A T17 copia esta coluna para a tabela *Requirement Traceability* da `spec.md`, com o status de cada ID ao fechar.

## Ferramentas

MCPs: `claude-in-chrome` (T16). Skills: `supabase` (T01, T15), `playwright-cli` (T16), `frontend-design` (T07, só conferência de tokens). As demais tarefas não precisam de ferramenta além de leitura/edição/testes.
