# Produtos em destaque, e o painel que não recarrega — Tasks

## Execution Protocol (MANDATORY — do not skip)

Implemente estas tasks com a Skill `tlc-spec-driven`: **ative-a pelo nome** e siga o fluxo de Execute
e as Critical Rules dela. Se a Skill não puder ser ativada, **PARE** e avise.

> ⚠️ **Uma Critical Rule da Skill é SOBREPOSTA pelo `CLAUDE.md` deste repositório**, e o override está
> escrito lá: *"não criar commits atômicos em pequenos pedaços durante a implementação. Aguardar a
> conclusão e gerar os commits completos da implementação de uma vez."* Vale desde a feature `25`,
> com o custo declarado e aceito (perde-se a correspondência 1:1 entre commit e "done when", e o
> `git bisect` passa a apontar para um commit com várias tasks). **Todo o resto da Skill continua
> valendo**, inclusive o gate por task e o Verifier independente ao fim.

**Design**: `.specs/features/50-produtos-em-destaque-e-painel-sem-recarga/design.md`
**Spec**: `.specs/features/50-produtos-em-destaque-e-painel-sem-recarga/spec.md`
**Status**: Implementado — aguardando Verifier independente e commits

## Progresso

**Baseline de entrada**, medida em 2026-09-14 na árvore limpa `6c362bd`, cinco workspaces um por
vez, exit code fora de pipe, **os cinco verdes**: `core` 2321/91 · `store` 3322/215 ·
`backoffice` 2345/136 · `functions` 599/13 · `catalog-import` 512/23 — **9099 em 478**.
(O `CLAUDE.md` dizia 3319/214 no store; o `+3/+1` é do commit `6c362bd` da outra sessão, não desta
feature.)

| Lote | Tasks | Estado | Medido |
| --- | --- | --- | --- |
| 1 — fases 1+2 | T1…T7 | ✅ completo | `core` **2356/92** (+35/+1) · `store` **3371/218** (+49/+3), exit 0 nos dois; `tsc` 0·0; lint 27/6; build verde; `payment/**` intocado |
| 2 — fase 3 | T8…T12 | ✅ completo | `backoffice` **2448/139** (+103/+3 sobre a entrada), exit 0; `core` 2356/92 e `store` 3371/218 **inalterados**; `tsc` 0·0; lint 27/6; `payment/**` intocado |
| 3 — fase 4 | T13…T17 | ✅ completo | `backoffice` **2497/139** (+49/+0 sobre o Lote 2), exit 0; `core` 2356/92 e `store` 3371/218 **remedidos e inalterados**; `tsc` 0·0; `payment/**` intocado |
| 4 — fases 5+6 | T18…T21 | ✅ completo | **os CINCO workspaces medidos**, um por vez, exit code fora de pipe: `backoffice` **2522/140** (+25/+1 sobre o Lote 3) · `store` **3371/218** · `core` **2356/92** · `functions` **599/13** · `catalog-import` **512/23**, os cinco exit 0 — **9360 em 486**. `tsc` 0·0; lint **27/6**; `pnpm build` verde nos dois apps; `payment/**` intocado (`git diff --name-only` = 0) |

**Delta da feature inteira**, sobre a entrada medida (9099/478): **+261 em três workspaces** —
`backoffice` +177/+4, `store` +49/+3, `core` +35/+1. `functions` e `catalog-import` não foram tocados
e foram remedidos, idênticos.

**Três escolhas do Lote 4 registradas**: (1) o que **acende** na lista é derivado da **assinatura de
conteúdo** de cada linha, e não do clique — uma luz disparada pelo clique acenderia também quando o
banco recusasse, e é a derivação que dá `ANI-08` de graça (releitura com o mesmo conteúdo produz a
mesma assinatura, e nada pisca); (2) a **saída da linha é de opacidade**, sem animar altura — animar
altura exigiria medi-la, e jsdom devolve 0 para toda medida de layout, então a asserção seria proxy
de proxy; (3) o guarda do movimento tem **escopo literal de oito arquivos**, porque o painel carrega
~50 classes de transição de antes desta feature e um guarda que nasce reprovando cinquenta vezes é um
guarda que alguém desliga — a dívida está registrada no `CLAUDE.md` da raiz.

> **Duas classes ANTIGAS ganharam o par `motion-reduce:` no caminho**, e estão declaradas aqui porque
> são edições fora do que as ACs pediam: a aba Computador/Celular de `AdminMenuPage.tsx` e o botão
> "Remover esta seção da Home" de `HomeSectionEditor.tsx`. As duas moram em arquivos que esta feature
> já possuía e que entraram no escopo do guarda; deixá-las sem par obrigaria a excluir os arquivos da
> régua, que é pior.

> **Os commits da feature ficam para DEPOIS do Verifier.** O `CLAUDE.md` manda gerá-los de uma vez ao
> fim; gerá-los antes da verificação independente seria commitar trabalho não verificado, e o Verifier
> pode produzir tasks de conserto. Ordem: T18…T21 → Verifier → (consertos, se houver) → commits.

**Consequência do Lote 1 que o Lote 2 herda** (esperada, e é `DST-01` valendo): tirar
`product_carousel` de `COMING_SOON` derruba **3 casos** de
`apps/backoffice/src/features/home-composition/ui/HomeBlockTray.test.tsx`, que asseriam o "em breve".
O backoffice ficou em **2342 passando / 3 reprovando em 2345**. As três asserções são **viradas**
(a bandeja passa a oferecer o bloco), nunca removidas — pertence a T10/T12.

**Duas escolhas do Lote 3 registradas**: (1) o modo da leitura (`'inicial' | 'revalidar'`) é um
**tipo só**, em `apps/backoffice/src/shared/lib/fetchMode.ts` — dois nomes para o mesmo modo seriam o
"defeito 01" no tamanho de um tipo, e o terceiro hook nasceria com um terceiro nome; (2) os dois
`fetch` passaram a receber argumento, e por isso `onClick={fetchSections}` / `onRetry={fetchCategories}`
viraram setas: passar a função direto entregaria o `MouseEvent` como **modo**, e `'[object
MouseEvent]' !== 'inicial'` faria o "Tentar de novo" revalidar em silêncio, sem esqueleto.

**Duas escolhas do Lote 1 registradas**: (1) as recusas por item usam o `ordinal` masculino de `core`
("2º item"), porque escrever um `ordinalF` novo seria a terceira cópia da mesma palavra; (2) a vaga
do `slider` mantém `min-w-[220px]` a partir de `md` — sem isso o item de flex encolhe até o
min-content e os 12 cards se espremem em vez de rolar.

---

## Test Coverage Matrix

> Gerada do código, das guidelines do projeto e da spec — confirmar antes do Execute. **Guidelines
> encontradas**: `CLAUDE.md` (raiz — seções *Os guardas* e *Baselines*), `apps/store/CLAUDE.md`,
> `apps/backoffice/CLAUDE.md`, `packages/core/CLAUDE.md`, `.specs/LESSONS.md` (36 lições
> confirmadas), `apps/{store,backoffice}/vitest.config.ts`, `packages/core/vitest.config.ts`,
> `.github/workflows/ci.yml`.

| Camada | Tipo de teste | Expectativa de cobertura | Padrão de local | Comando |
| --- | --- | --- | --- | --- |
| Domínio puro (`packages/core/src/home/**`) | unit | **Todos os ramos, 1:1 com as ACs**; cada caso de borda listado tem um caso. Recusa é `string \| null` e cada motivo é asserido pelo **texto** (`L-036`) | `packages/core/src/home/__tests__/*.test.ts` | `pnpm --filter @estrelinha/core test` |
| Acesso a dado da loja (`entities/*/api`) | unit com dublê | Caminho feliz + erro + `enabled` desligado. O dublê **precisa enxergar o filtro**, senão a regra fica inauditável | `apps/store/src/entities/**/__tests__/*.test.ts` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| Widget da loja | unit de componente | Toda AC que jsdom alcança: presença, atributo, ordem, `aria-*`, classe por **token exato**. Metade celular **e** metade `md` com asserção positiva (`L-029`) | `apps/store/src/widgets/**/__tests__/*.test.tsx` | idem |
| Guarda de varredura de disco | unit | **Âncora de contagem obrigatória** (`L-021`) + **sensor** provando que a mutação reprova. Régua recusa hífen depois do token (`L-034`) | `apps/*/src/**/__tests__/*.test.ts` | do workspace dono do guarda |
| Hook de dado do painel | unit com dublê | Caminho feliz, falha de leitura, falha de gravação, **ordem de resposta fora de sequência** | `apps/backoffice/src/entities/**/*.test.ts` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| Tela do painel | unit de componente | Cada AC de `VIV-*`/`ANI-*` que jsdom alcança, inclusive **identidade de nó** (o iframe é o mesmo elemento) | `apps/backoffice/src/{pages,features,shared}/**/*.test.tsx` | idem |
| Migration | none | **Nenhuma nesta feature** — e `DST-23` é a asserção de que continua assim | — | gate de build |

**Piso, não teto**: nenhum arquivo novo pode ser menos rigoroso que o vizinho que ele copia
(`HeroCarouselEditor.test.tsx`, `carousel.test.ts`, `HomeSectionList.test.tsx`).

## Gate Check Commands

> Extraídos do repositório — confirmar antes do Execute. **Todo comando de teste roda com o exit code
> capturado FORA de pipe** (`pnpm … test; echo $?`), porque `| tail` devolve o código do `tail`.

| Nível | Quando usar | Comando |
| --- | --- | --- |
| **Quick — core** | Task que só mexe em `packages/core` | `pnpm --filter @estrelinha/core test` |
| **Quick — loja** | Task que mexe em `apps/store` | `pnpm --filter @estrelinha/store test --testTimeout=20000` |
| **Quick — painel** | Task que mexe em `apps/backoffice` | `pnpm --filter @estrelinha/backoffice test --testTimeout=20000` |
| **Full** | Fim de fase que cruza workspace | os três acima, **um por vez** (suítes concorrentes saturam a máquina e produzem timeout de 5 s em teste que varre disco) |
| **Build** | Fim de fase e fecho | `npx tsc --noEmit -p apps/store/tsconfig.app.json` · `… apps/backoffice/tsconfig.app.json` · `pnpm build` · `pnpm lint` (baseline **27/6**) |

> ⚠️ `--testTimeout=20000` **não é preferência**: sem ele, os guardas que varrem disco cruzam o teto
> padrão de 5 s sob contenção e reprovam **por timeout, nunca por asserção** — e o arquivo que reprova
> muda a cada execução. Antes de investigar qualquer reprovação, confira se a mensagem diz
> `Test timed out in 5000ms` **no log completo**, não no resumo.

---

## Execution Plan

### Fase 1 — O vocabulário em `core` (3)

```
T1 → T2 → T3
```

### Fase 2 — A loja desenha (4)

```
T4 → T5 → T6 → T7
```

### Fase 3 — O painel edita (5)

```
T8 → T9 → T10 → T11 → T12
```

### Fase 4 — O painel para de recarregar (5)

```
T13 → T14 → T15 → T16 → T17
```

### Fase 5 — Movimento (3)

```
T18 → T19 → T20
```

### Fase 6 — Fecho (1)

```
T21
```

---

## Task Breakdown

### T1: O vocabulário do bloco em `core`

**What**: `FEATURED_PRODUCTS_MAX`, `HomeFeaturedDisplay`, `featuredDisplay` e
`featuredProductsRefusal`, com teste.
**Where**: `packages/core/src/home/featured.ts` (novo) · `__tests__/featured.test.ts` (novo) ·
`index.ts` (export)
**Depends on**: None
**Reuses**: `heroCarouselWidth` e `heroCarouselSlidesRefusal` (`carousel.ts`) como molde; `ordinal`
de `core`
**Requirement**: DST-07, DST-08, DST-09, DST-10, DST-11

**Done when**:
- [ ] `featuredDisplay` devolve `slider` para `undefined`, `null`, `''` e `'bananas'`; `grid` só para `'grid'`
- [ ] `featuredProductsRefusal` cobre, **na ordem**: título vazio → lista vazia → 13º item → item sem `product_id` → id repetido
- [ ] Cada motivo é asserido pelo **texto**, e o do teto **nomeia o 12** (`L-036`)
- [ ] O arquivo não importa React, Supabase nem Deno
- [ ] Gate quick — core passa

**Tests**: unit · **Gate**: quick — core

---

### T2: O catálogo passa a oferecer o bloco

**What**: `config.display` no tipo, rótulo **"Produtos em destaque"**, saída de `COMING_SOON`, e o
guarda invertido.
**Where**: `packages/core/src/home/types.ts` · `catalog.ts` · `__tests__/catalog.test.ts`
**Depends on**: T1
**Reuses**: a tabela `LABELS`/`COMING_SOON` existente
**Requirement**: DST-01, DST-23

**Done when**:
- [ ] `sectionMeta('product_carousel')` devolve `label: 'Produtos em destaque'`, `comingSoon: false`, `limit: null`, `unique: false`
- [ ] `catalog.test.ts` **inverte** a asserção: os `comingSoon` passam a ser `['category_grid']` — a asserção antiga não é apagada, é virada
- [ ] A âncora de contagem da varredura de pureza sobe de 9 para **10** arquivos (`L-021`)
- [ ] `HOME_SECTION_TYPES` **não muda** de conteúdo nem de ordem
- [ ] Gate quick — core passa

**Tests**: unit · **Gate**: quick — core

---

### T3: O motivo de "não vai aparecer" do bloco

**What**: `EMPTY_SOURCE_REASON.product_carousel` passa a falar de **produto escolhido**, com teste
nos dois ramos.
**Where**: `packages/core/src/home/resolve.ts` · `__tests__/resolve.test.ts`
**Depends on**: T2
**Reuses**: `todosForaDoAr`, que já existe e **não muda**
**Requirement**: DST-20

**Done when**:
- [ ] Seção ativa, sem itens ⇒ `renders: false` e a frase "nenhum produto escolhido"
- [ ] Seção ativa, 3 itens curados e os 3 devolvendo `null` ⇒ a frase "os 3 itens escolhidos saíram do ar" e `droppedCount: 3`
- [ ] Seção **desligada** com itens ⇒ o motivo é `Desligada:` (a precedência não muda)
- [ ] Gate quick — core passa

**Tests**: unit · **Gate**: quick — core

---

### T4: A consulta dos produtos escolhidos

**What**: `useProductsByIds`, com teste.
**Where**: `apps/store/src/entities/product/api/useProductsByIds.ts` (novo) ·
`__tests__/useProductsByIds.test.ts` (novo) · barrel de `entities/product`
**Depends on**: None
**Reuses**: `PRODUCT_CARD_SELECT`, `listingWindow`, `mapDbToProduct`, `ProductQueryError`
**Requirement**: DST-04, DST-17

**Done when**:
- [ ] Pede `PRODUCT_CARD_SELECT` e filtra por `.in('id', ids)` — **o dublê registra o filtro** e o teste assere os ids
- [ ] `ids` vazio ⇒ a consulta **não sai** (`enabled: false`)
- [ ] Chave de React Query é **ordenada**: `['a','b']` e `['b','a']` produzem a mesma chave
- [ ] Erro do PostgREST vira `ProductQueryError` (não lista vazia)
- [ ] Gate quick — loja passa

**Tests**: unit · **Gate**: quick — loja

---

### T5: As três formas da fileira de produtos

**What**: `ProductCarousel` ganha `layout: 'row' | 'slider' | 'grid'` (padrão `'row'`), mais o guarda
das classes.
**Where**: `apps/store/src/widgets/product-carousel/ui/ProductCarousel.tsx` ·
`__tests__/ProductCarouselLayout.test.tsx` (novo)
**Depends on**: None
**Reuses**: as classes de vaga que já existem; `TONES`
**Requirement**: DST-05, DST-06

**Done when**:
- [ ] `row` mantém **exatamente** a string de classes de hoje — asserida por token exato, e `HomeCollectionRow.test.tsx` segue verde sem edição
- [ ] `slider`: fita no celular **e** a partir de `md` (asserção **positiva** nas duas metades, `L-029`); as setas existem
- [ ] `grid`: `grid-cols-2` no celular **e** `md:grid-cols-4`; **sem** `overflow-x-auto`; as setas **não** são renderizadas
- [ ] As três formas saem de **um mapa só** no arquivo (âncora: o guarda acha as três)
- [ ] Régua de token recusa hífen depois do token (`L-034`)
- [ ] Gate quick — loja passa

**Tests**: unit · **Gate**: quick — loja

---

### T6: O bloco Produtos em destaque

**What**: o widget que lê a curadoria, busca os produtos, reordena e delega.
**Where**: `apps/store/src/widgets/featured-products/{index.ts,ui/FeaturedProducts.tsx,ui/__tests__/FeaturedProducts.test.tsx}` (novos)
**Depends on**: T1, T4, T5
**Reuses**: `ProductCarousel`, `featuredDisplay`
**Requirement**: DST-04, DST-17, DST-21, DST-22

**Done when**:
- [ ] Com a resposta **fora de ordem**, os cards saem na ordem da curadoria (`DST-22`) — a fixture devolve invertido de propósito
- [ ] Produto que não volta da consulta simplesmente não desenha, e os outros ficam
- [ ] `isLoading` ⇒ esqueletos no número de ids (`DST-21`), com `aria-busy`
- [ ] Consulta em erro ⇒ o widget devolve `null` e **nada é lançado** (`DST-17`)
- [ ] `config.display: 'grid'` chega como `layout="grid"` no `ProductCarousel`; ausente chega como `"slider"`
- [ ] Título e descrição saem de `config.title`/`config.subtitle`
- [ ] Gate quick — loja passa

**Tests**: unit · **Gate**: quick — loja

---

### T7: A Home desenha o bloco

**What**: `product_carousel` deixa de ser `null` no registro, provado **pela página**, não por uma
árvore montada no teste.
**Where**: `apps/store/src/widgets/home-renderer/ui/sectionRenderers.tsx` ·
`__tests__/HomeRenderer.test.tsx`
**Depends on**: T6
**Reuses**: o molde do `hero_carousel` na linha de baixo
**Requirement**: DST-04

**Done when**:
- [ ] Renderizando o `HomeRenderer` **de verdade** com uma seção `product_carousel` ativa e itens, o bloco aparece — apagar a linha do registro reprova (`teste não monta a árvore que prova`)
- [ ] `category_grid` **continua** `null` e continua sendo pulado sem quebrar a página
- [ ] Seção sem item não desenha moldura nem espaçamento
- [ ] Gate quick — loja passa

**Tests**: unit · **Gate**: quick — loja

---

### T8: O rascunho carrega o slug (e não o grava)

**What**: `DraftItem.product_slug` como campo **de tela**, `toNewItems` removendo os dois campos de
tela, `applyDraft` copiando, e o guarda das sete colunas.
**Where**: `apps/backoffice/src/features/home-composition/model/sectionDraft.ts` ·
`model/__tests__/{applyDraft.test.ts,toNewItems.test.ts}`
**Depends on**: None
**Reuses**: o padrão da `key`, que já é campo de tela
**Requirement**: DST-24

**Done when**:
- [ ] `toNewItems` devolve **exatamente** as sete colunas — teste de igualdade de chaves com âncora (`Object.keys(...).sort()`), e um sensor que prova que acrescentar um oitavo campo reprova
- [ ] `applyDraft` leva `product_slug` para o `HomeSectionItem` da prévia
- [ ] `itemsChanged` **não** acusa mudança quando só o `product_slug` difere (ele não é dado gravado)
- [ ] `toDraftItems` semeia `product_slug` a partir de `item.product_slug`
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T9: O seletor de peças

**What**: `ProductPicker` — busca em memória e acrescenta ao fim da lista.
**Where**: `apps/backoffice/src/features/home-composition/ui/{ProductPicker.tsx,ProductPicker.test.tsx}` (novos)
**Depends on**: T8
**Reuses**: a lista que `useAdminProducts` já carrega; `Input` do shadcn
**Requirement**: DST-03, DST-09

**Done when**:
- [ ] Digitar filtra por nome, **sem acento e sem caixa** ("colar" acha "Colar de Cinzas")
- [ ] Produto já escolhido aparece **desabilitado**, dizendo que já está no bloco (`DST-09` na tela)
- [ ] Acrescentar emite um `DraftItem` com `product_id`, `product_slug` e `label_snapshot` **congelado**
- [ ] Busca sem resultado mostra o vazio explicando, não uma lista em branco
- [ ] O seletor **não desenha vitrine** (`AD-019`): sem card, sem grade de miniatura
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T10: O editor do bloco

**What**: `FeaturedProductsEditor` + registro em `SECTION_EDITORS` + `featuredProductsRefusal` ligado
em `sectionRefusals`.
**Where**: `apps/backoffice/src/features/home-composition/ui/{FeaturedProductsEditor.tsx,FeaturedProductsEditor.test.tsx}` (novos) ·
`ui/sectionEditors.tsx` · `model/sectionRefusals.ts`
**Depends on**: T1, T8, T9
**Reuses**: `HeroCarouselEditor` como molde (arraste nativo, `FormCard`, ordinal)
**Requirement**: DST-02, DST-07, DST-08, DST-09, DST-11, DST-18

**Done when**:
- [ ] Os três cartões existem, na ordem: Conteúdo → Apresentação → Peças escolhidas
- [ ] O par `Slider`/`Grade` usa `aria-pressed`, e cada opção diz em uma linha o que faz
- [ ] Trocar de apresentação **não mexe na lista** (`DST-18`) — asserido sobre os itens, não sobre a classe
- [ ] Remover e reordenar por arraste funcionam, e o contador diz `n de 12`
- [ ] A recusa vem de `featuredProductsRefusal` — **nenhuma frase de regra é redigida neste arquivo** (o guarda é a leitura do `sectionRefusals.ts`)
- [ ] Salvar com título vazio, com lista vazia e com 13 itens mostra o motivo **e preserva o preenchido**
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T11: O painel diz a verdade sobre produto fora do ar

**What**: `useAdminResolvedHome` passa a receber `products` e a recusar `is_active === false`.
**Where**: `apps/backoffice/src/features/home-composition/model/useAdminResolvedHome.ts` ·
`useAdminResolvedHome.test.ts`
**Depends on**: T2
**Reuses**: o ramo de categoria, que já faz exatamente isto
**Requirement**: DST-16, DST-20

**Done when**:
- [ ] Item com `product_id` de produto `is_active: false` ⇒ `null` e entra em `droppedCount`
- [ ] Item com produto ativo ⇒ resolve, com `label` do `alt`, do `label_snapshot` ou do slug, nessa ordem
- [ ] Produto **ausente** da lista (apagado) ⇒ `null`, e o `label_snapshot` continua sendo o que nomeia a perda
- [ ] O ramo de **categoria** não muda de comportamento (sensor: um caso de categoria inativa continua reprovando se o ramo for afrouxado)
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T12: A fiação da página com o editor novo

**What**: `EditorProduct` ganha `slug` e `is_active`; `AdminHomePage` passa `products` para o editor,
para o seletor e para `useAdminResolvedHome`; `previaUnica` ganha o sensor do arquivo novo.
**Where**: `apps/backoffice/src/features/home-composition/ui/sectionEditors.tsx` ·
`pages/admin/AdminHomePage.tsx` · `features/home-composition/__tests__/previaUnica.test.ts` ·
`AdminHomePage.test.tsx`
**Depends on**: T10, T11
**Reuses**: `useAdminProducts`, já chamado pela página
**Requirement**: DST-02, DST-16, DST-24

**Done when**:
- [ ] `tsc` verde nos dois apps depois do campo novo no tipo compartilhado (é ele quem acha todos os construtores, inclusive nos testes)
- [ ] Abrindo `/admin/home/:id` de uma seção `product_carousel`, o editor novo monta com a lista de produtos
- [ ] `previaUnica.test.ts` ganha um sensor que prova que a régua **alcança** `FeaturedProductsEditor.tsx` — e o arquivo real passa
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T13: A releitura das seções para de apagar a tela

**What**: `fetchSections(modo)` + token de sequência + erro que não esvazia.
**Where**: `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts` ·
`useAdminHomeSections.test.ts`
**Depends on**: None
**Reuses**: a estrutura de hoje — nada de React Query
**Requirement**: VIV-01, VIV-07, VIV-08

**Done when**:
- [ ] `'inicial'` liga `loading`; `'revalidar'` **não** liga — asserido nos dois sentidos
- [ ] Toda escrita (`createSection`, `updateSectionConfig`, `setSectionActive`, `deleteSection`, `reorderSectionsTo`, `curateSection`) relê em modo `'revalidar'` — **um caso por porta** (`L-010`)
- [ ] Falha de leitura na revalidação grava `error` e **mantém** as linhas; na inicial, esvazia (comportamento de hoje)
- [ ] Duas releituras em voo: a resposta da **primeira**, chegando por último, é **descartada** — teste com resolução fora de ordem
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T14: A releitura das categorias para de apagar a tela

**What**: o mesmo em `useAdminCategories`.
**Where**: `apps/backoffice/src/entities/category/api/useAdminCategories.ts` + teste
**Depends on**: None
**Reuses**: o desenho de T13, literalmente — dois desenhos diferentes para o mesmo problema seriam o "defeito 01"
**Requirement**: VIV-02, VIV-07, VIV-08

**Done when**:
- [ ] `updateCategory` e `updateSortOrders` releem em `'revalidar'` — um caso por porta
- [ ] As telas que **não** são desta feature (Categorias, Produtos) continuam verdes sem edição de teste
- [ ] Token de sequência com caso de resposta fora de ordem
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T15: O cabeçalho do formulário aprende a dizer "Salvo"

**What**: `justSaved` no `FormPageHeader`, no fim da fila de ações, com transição e `motion-reduce`.
**Where**: `apps/backoffice/src/shared/ui/FormPageHeader.tsx` · `FormPageHeader.test.tsx`
**Depends on**: None
**Reuses**: o selo `Alterações não salvas` que já existe; a convenção `motion-reduce:` da loja
**Requirement**: VIV-05, VIV-06, ANI-01, ANI-02, ANI-05

**Done when**:
- [ ] `justSaved` mostra `Salvo` **na mesma posição** do selo de pendência, no fim da fila
- [ ] `isDirty` e `justSaved` juntos ⇒ vence a pendência (mexeu depois de salvar)
- [ ] A classe de transição existe **e** tem o par `motion-reduce:transition-none` (asserção de literal, `L-036`)
- [ ] As duas telas de Descontos **não mudam**: sem o prop, o cabeçalho é o de hoje
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T16: `/admin/home` para de recarregar

**What**: esqueleto só na primeira carga, editor que fica aberto ao salvar, `Salvo` com timer, iframe
que não remonta.
**Where**: `apps/backoffice/src/pages/admin/AdminHomePage.tsx` · `AdminHomePage.test.tsx` ·
`features/home-composition/ui/HomeSectionEditor.tsx`
**Depends on**: T13, T15
**Reuses**: `HomeLivePreview`, montado fora do ramo do editor desde a feature `25`
**Requirement**: VIV-01, VIV-03, VIV-05, VIV-06, VIV-12

**Done when**:
- [ ] Depois de uma gravação, **o mesmo nó `<iframe>`** continua na árvore — asserido por **identidade de elemento** (guardar a referência antes e comparar depois), não por presença
- [ ] Salvar **não navega**: a URL continua em `/admin/home/:id` e o formulário continua montado
- [ ] O selo vira `Salvo` e volta a sumir; mexer num campo devolve a pendência
- [ ] O esqueleto aparece na primeira carga e **não** depois de salvar
- [ ] A semeadura única do rascunho vira asserção: uma revalidação com o editor aberto **não** sobrescreve o que foi digitado (`R-05`)
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T17: `/admin/menu` para de recarregar

**What**: o mesmo na tela do menu, mais o par `Salvando… → Salvo` no cabeçalho.
**Where**: `apps/backoffice/src/pages/admin/AdminMenuPage.tsx` · `AdminMenuPage.test.tsx`
**Depends on**: T14, T15
**Reuses**: o selo `salvando` que a `47` já pôs no cabeçalho (`FOCO-33`)
**Requirement**: VIV-02, VIV-03, VIV-04

**Done when**:
- [ ] Ligar uma categoria mantém **o mesmo nó `<iframe>`** e não devolve o esqueleto
- [ ] O selo `Salvando…` some com transição e dá lugar a `Salvo` por ~2 s
- [ ] O alternador Computador/Celular continua governando lista, contagem, editores e prévia (`NAV-37` intacto)
- [ ] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T18: A lista de seções ganha movimento

**What**: linha recém-gravada acende; seção entra e sai com transição, **em paralelo** com a
requisição.
**Where**: `apps/backoffice/src/features/home-composition/ui/{HomeSectionList.tsx,HomeSectionRow.tsx}` ·
`HomeSectionList.test.tsx`
**Depends on**: T16
**Reuses**: `animate-fade-in` do preset; a convenção `motion-reduce:`
**Requirement**: ANI-03, ANI-04, ANI-07

**Done when**:
- [x] A linha gravada ganha o marcador por ~1,2 s e o perde — com o timer limpo no desmonte (sem `act` warning)
- [x] Remover marca a linha como saindo **no clique**, e a chamada de remoção sai **no mesmo tique** — asserido pela ordem: a função de remoção já foi chamada enquanto a classe de saída está na linha (`ANI-07`)
- [x] Remoção que **falha** desfaz o estado de saída e mostra o motivo
- [x] Nenhuma classe de animação entra sem par `motion-reduce:`
- [x] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T19: O guarda do movimento

**What**: teste de varredura que recusa classe de transição/animação sem par `motion-reduce:` nos
arquivos do painel tocados por esta feature.
**Where**: `apps/backoffice/src/shared/lib/__tests__/animacaoRespeitaMovimento.test.ts` (novo)
**Depends on**: T18
**Reuses**: o molde de `freeShippingSingleOwner.test.ts` (removedor de comentário com CRLF **e** LF,
âncora dupla, sensores)
**Requirement**: ANI-05

**Done when**:
- [x] **Âncora dupla**: o número de arquivos lidos **e** o número de classes de animação encontradas são asseridos acima de zero (`L-021`)
- [x] Sensor: uma classe de transição sem par **reprova**; a mesma com par **passa**
- [x] Sensor de comentário: a prosa que explica a regra não é acusada, com CRLF e com LF (`L-031`)
- [x] Régua por token exato, recusando hífen depois do token (`L-034`)
- [x] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T20: O interruptor responde na hora

**What**: `VIV-10` — ligar/desligar seção é otimista, com volta em caso de falha.
**Where**: `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts` ·
`useAdminHomeSections.test.ts` · `HomeSectionList.test.tsx`
**Depends on**: T13, T18
**Reuses**: `setSectionActive`, que já manda `{ id, active }` e nada mais
**Requirement**: VIV-10

**Done when**:
- [x] O estado da linha muda **antes** da resposta do servidor
- [x] Falha devolve o estado anterior **e** mostra a mensagem do banco (inclusive o `23514` da última seção ativa, `DST-19`)
- [x] A revalidação que chega depois não "pisca" o interruptor de volta e de novo
- [x] Gate quick — painel passa

**Tests**: unit · **Gate**: quick — painel

---

### T21: Fecho — baselines, documentação e commits

**What**: medir, escrever e commitar.
**Where**: `CLAUDE.md` (raiz) · `apps/backoffice/CLAUDE.md` · `apps/store/CLAUDE.md` ·
`packages/core/CLAUDE.md` · `.specs/STATE.md` (Handoff)
**Depends on**: T20
**Reuses**: o formato de fecho das features `47`, `48` e `49`
**Requirement**: todos (rastreabilidade)

**Done when**:
- [x] Os **cinco** workspaces medidos **um por vez**, com exit code capturado fora de pipe, e a tabela de baselines atualizada com o número **medido** (nunca somado)
- [x] `npx tsc --noEmit` nos dois apps: **0 · 0**; `pnpm lint` em **27/6**; `pnpm build` verde nos dois
- [x] `git diff --name-only` prova que `packages/core/src/payment/**` não teve uma linha alterada
- [x] A tabela *Os guardas* da raiz ganha as três linhas novas; a de *O "defeito 01"* ganha a linha da feature `50`
- [x] `apps/store/CLAUDE.md` documenta as três formas do `ProductCarousel`; `apps/backoffice/CLAUDE.md`, o editor novo e a regra do `'revalidar'`
- [x] O *Estado conhecido* registra: **o bloco nasce inexistente** — a Adri precisa acrescentá-lo, escolher as peças e ligar —, e as pendências de prova em navegador
- [ ] Commits gerados **de uma vez**, ao fim (override do `CLAUDE.md`), com o rodapé de atribuição —
      **PENDENTE POR DECISÃO**: eles saem depois do Verifier independente, senão seria commitar
      trabalho não verificado. Tudo o mais da T21 está feito.

**Tests**: none (documentação) · **Gate**: build

---

## Phase Execution Map

```
Fase 1 → Fase 2 → Fase 3 → Fase 4 → Fase 5 → Fase 6

Fase 1:  T1 ──→ T2 ──→ T3
Fase 2:  T4 ──→ T5 ──→ T6 ──→ T7
Fase 3:  T8 ──→ T9 ──→ T10 ──→ T11 ──→ T12
Fase 4:  T13 ──→ T14 ──→ T15 ──→ T16 ──→ T17
Fase 5:  T18 ──→ T19 ──→ T20
Fase 6:  T21
```

**Empacotamento (~7 tasks por lote, fases inteiras):** Fase 1+2 = **7** · Fase 3 = **5** ·
Fase 4 = **5** · Fase 5+6 = **4**. Quatro lotes — logo, o Execute **oferece** sub-agentes, e só
dispara com aceite.

---

## Task Granularity Check

| Task | Escopo | Status |
| --- | --- | --- |
| T1 | 1 módulo puro + teste | ✅ |
| T2 | 2 arquivos coesos (tipo + catálogo) | ✅ |
| T3 | 1 constante + teste | ✅ |
| T4 | 1 hook | ✅ |
| T5 | 1 componente (prop nova) + guarda | ✅ |
| T6 | 1 widget | ✅ |
| T7 | 1 linha de registro + teste de fiação | ✅ |
| T8 | 1 modelo de rascunho + guarda | ✅ |
| T9 | 1 componente | ✅ |
| T10 | 1 editor + 2 registros de uma linha | ✅ |
| T11 | 1 hook | ✅ |
| T12 | fiação de 1 página + 1 tipo | ✅ |
| T13 | 1 hook | ✅ |
| T14 | 1 hook | ✅ |
| T15 | 1 componente | ✅ |
| T16 | 1 página | ✅ |
| T17 | 1 página | ✅ |
| T18 | 2 componentes irmãos, mesma mudança | ✅ |
| T19 | 1 guarda | ✅ |
| T20 | 1 função do hook + a linha que a consome | ✅ |
| T21 | documentação + commits | ✅ |

---

## Diagram-Definition Cross-Check

| Task | Depends on (corpo) | Diagrama | Status |
| --- | --- | --- | --- |
| T1 | None | início da Fase 1 | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | T2 | T2 → T3 | ✅ |
| T4 | None | início da Fase 2 | ✅ |
| T5 | None | T4 → T5 (ordem, não dependência) | ✅ |
| T6 | T1, T4, T5 | T5 → T6, e T1 em fase anterior | ✅ |
| T7 | T6 | T6 → T7 | ✅ |
| T8 | None | início da Fase 3 | ✅ |
| T9 | T8 | T8 → T9 | ✅ |
| T10 | T1, T8, T9 | T9 → T10, T1/T8 anteriores | ✅ |
| T11 | T2 | fase anterior | ✅ |
| T12 | T10, T11 | T11 → T12 | ✅ |
| T13 | None | início da Fase 4 | ✅ |
| T14 | None | T13 → T14 (ordem) | ✅ |
| T15 | None | T14 → T15 (ordem) | ✅ |
| T16 | T13, T15 | T15 → T16 | ✅ |
| T17 | T14, T15 | T16 → T17, T14/T15 anteriores | ✅ |
| T18 | T16 | fase anterior | ✅ |
| T19 | T18 | T18 → T19 | ✅ |
| T20 | T13, T18 | T19 → T20 (ordem), T13/T18 anteriores | ✅ |
| T21 | T20 | T20 → T21 | ✅ |

Nenhuma dependência aponta para frente.

---

## Test Co-location Validation

| Task | Camada criada/alterada | Matriz exige | Task diz | Status |
| --- | --- | --- | --- | --- |
| T1 | Domínio puro (`core/home`) | unit | unit | ✅ |
| T2 | Domínio puro + guarda | unit | unit | ✅ |
| T3 | Domínio puro | unit | unit | ✅ |
| T4 | Acesso a dado da loja | unit com dublê | unit | ✅ |
| T5 | Widget da loja + guarda | unit | unit | ✅ |
| T6 | Widget da loja | unit | unit | ✅ |
| T7 | Widget da loja (registro) | unit | unit | ✅ |
| T8 | Modelo do painel + guarda | unit | unit | ✅ |
| T9 | Tela do painel | unit | unit | ✅ |
| T10 | Tela do painel | unit | unit | ✅ |
| T11 | Hook de dado do painel | unit | unit | ✅ |
| T12 | Tela do painel + guarda | unit | unit | ✅ |
| T13 | Hook de dado do painel | unit | unit | ✅ |
| T14 | Hook de dado do painel | unit | unit | ✅ |
| T15 | Tela do painel | unit | unit | ✅ |
| T16 | Tela do painel | unit | unit | ✅ |
| T17 | Tela do painel | unit | unit | ✅ |
| T18 | Tela do painel | unit | unit | ✅ |
| T19 | Guarda de varredura | unit | unit | ✅ |
| T20 | Hook + tela | unit | unit | ✅ |
| T21 | Documentação | none | none | ✅ |

**Zero violações.** Nenhuma task produz código sem prova, e nenhuma difere a prova para a task
seguinte.

---

## Ferramentas por task

- **MCP**: nenhum é necessário. O `supabase` MCP **não está autorizado nesta sessão** e não é preciso:
  esta feature não tem migration, e a prova de banco que ela exigiria já é coberta por teste de
  dublê. Se o Execute precisar de probe contra o Postgres local, o caminho é o CLI (`supabase db
  query --linked` só para o hospedado; local, `psql` na porta 54342).
- **Skills**: `tlc-spec-driven` (obrigatória, o fluxo inteiro). `playwright-cli` **no fecho**, para a
  prova em navegador em 390×844 e 1440, que é o que jsdom não mede.
