# Revisão — Design (rodada 2)

Veredito: APROVADO

Os sete achados da rodada 1 foram incorporados. R1, R2, R4, R5, R6 e R7 estão resolvidos. A correção
de R3 ficou errada (ver R1 abaixo), mas o erro é barato e o `tsc` do gate o pega, por isso é menor.
Os outros achados também são polimento.

## Achados

### R1 — `<div ref={faixa.ref}>` também não compila: a correção de R3 (r1) repete o TS2322 (menor)
- Onde: `design.md`, *Loja — widgets/category-list*: "O rolador é `<div>`, e não o `<ul>`, por dois motivos: o hook devolve `MutableRefObject<HTMLElement | null>`, que não é atribuível ao `ref` de um `<ul>` (`HTMLUListElement`, TS2322 — R3)…"; `apps/store/src/shared/lib/useOverflowAffordance.ts`: `ref: MutableRefObject<HTMLElement | null>`.
- Problema: o motivo vale também para o `<div>`, porque `HTMLDivElement` exige `align`, que `HTMLElement` não tem. Medi com o `@types/react` do repositório (arquivo de teste no scratchpad, `tsc --noEmit`):
  - `<div ref={ref}>`: **TS2322**, "Property 'align' is missing in type 'HTMLElement' but required in type 'HTMLDivElement'".
  - `<ul ref={ref}>`: **TS2322** ("missing … compact, type").
  - `<nav ref={ref}>`: **compila**. Em `React.JSX.IntrinsicElements`, `nav` é tipado `HTMLElement`, e é por isso que o `Header` funciona.
- Cenário: a task sai escrita como no design, e `npx tsc --noEmit -p apps/store/tsconfig.app.json` sai de 0 para 1 (o `pnpm build` não pega). O design apresenta como resolvido um defeito que continua lá.
- Sugestão: fazer do rolador um elemento tipado `HTMLElement`. `<nav aria-label="Categorias">` serve, e uma fileira de links para coleções é navegação. Outra saída é um cast explícito e comentado. Generalizar o hook (`useOverflowAffordance<T extends HTMLElement>`) também resolve, mas mexe no dono compartilhado. Qualquer que seja a escolha, o texto do design deve trocar a justificativa. O `<ul>` como `firstElementChild` continua valendo.

### R2 — A conta de "7 visíveis em 1440" parte de um container de 1200px que o preset não tem (menor)
- Onde: `design.md`, Gutter: "Conta de 1440: 1200 − 96 = 1104 ÷ (148 + 8) ≈ 7,07 ⇒ **7 visíveis** com 8 itens". A premissa vem da tabela de medidas da spec ("container de 1200px").
- Problema: em `packages/ui/tailwind.preset.ts:13-19`, `container` é `center`, `padding: 1rem`, `screens: { "2xl": "1280px" }`. Em 1440 ele mede **1280**, não 1200. Com `md:px-12` sobram 1280 − 96 = **1184**: 7 itens inteiros (1092) e cerca de 92px (≈ 62%) do 8º. A conclusão ("7 visíveis com 8 itens, e a seta direita acesa") ainda vale. A aritmética não vale, e um 8º item mostrado em 62% pode ser lido como "8 visíveis" na prova em navegador.
- Cenário: a prova do item 3 de *O que só o navegador prova* mede 7,6 itens e ninguém sabe se isso é defeito ou é o desenho. Alguém pode "consertar" o gutter para bater o número de 1200.
- Sugestão: refazer a conta com 1280 e declarar o 8º parcial como esperado (é o convite à seta). Se a prancheta exige 1200 de fato, declarar `md:max-w-[1200px]` e o motivo, já que nenhum outro bloco da Home usa essa largura (`ProductCarousel.tsx:163` usa `container`).

### R3 — O `cruzar` "no molde literal" é a terceira escrita de "fora do ar" na mesma pasta (menor)
- Onde: `design.md`, *Painel — CategoryListEditor*: "O `nome` e o estado saem de um `cruzar(item, categories)` **no molde literal de `CollectionRowsEditor.tsx:60-93`**".
- Problema: `cruzar` é privado em `CollectionRowsEditor.tsx`, e `CollectionFeatureEditor.tsx` tem o seu `foraDoAr`. O editor novo copiaria a regra pela terceira vez em `features/home-composition/ui`. O design garante a coerência só por casos de teste nos quatro estados. Isso pega uma cópia que diverge hoje, mas não impede a divergência depois. O "melhor ainda" de R2 (r1), que pedia reaproveitar a resolução, não foi adotado nem respondido.
- Cenário: alguém muda "desativada" num editor (por exemplo, passa a considerar `active == null`) e esquece a outra cópia. A linha do painel e a loja voltam a discordar, e nada acusa.
- Sugestão: extrair o `cruzar` para `features/home-composition/model/` (camada estritamente abaixo da `ui`, `AD-033`), devolvendo `{ nome, estado }`, e fazer os dois editores lerem dele. Se a extração ficar fora do escopo, registrá-la como dívida no fecho, junto com a do `soltar`.

### R4 — `categoryListLabel` é um dono só, mas os dois lados passam entradas diferentes quando há `alt` (menor)
- Onde: `design.md`, `categoryListItem` chama `categoryListLabel(item.title, resolved.label)`, e `resolved.label` = `item.alt?.trim() || categoria.name` (`useResolvedHome.ts`, `useAdminResolvedHome.ts`). O editor chama `categoryListLabel(item.title, nome)` com `nome` = `categoria.name`. *Tech Decisions* declara: "Limitação declarada: um `alt` gravado por escrita direta viraria rótulo".
- Problema: a limitação está declarada só do lado da loja. Com um `alt` gravado (e `toDraftItems`/`toNewItems` o preservam), a loja e a prévia mostram o `alt`, e a linha fechada do painel mostra o nome da coleção. A função é uma só, mas a precedência título > `alt` > nome vale só de um lado.
- Cenário: é raro (exige escrita direta), mas é justamente o caso que a linha do painel existe para explicar.
- Sugestão: o editor passa `item.alt?.trim() || nome` como segundo argumento, com a mesma precedência dos dois lados. Outra saída é declarar a divergência no editor também. Um caso de teste no editor fixa a escolha.

## Conferido sem achado
- **R1 (r1)**: `categoryListLabel(title, collectionName)` é a função pura em `core`, chamada por `categoryListItem` e pela linha fechada do editor. Nenhuma tela escreve `title || nome`. Resta o detalhe do `alt` (R4 acima).
- **R2 (r1)**: os quatro estados da linha fechada (não escolhida · apagada · desativada · no ar) batem com os ramos de `cruzar` em `CollectionRowsEditor.tsx:60-93` (sem id e sem snapshot; sem id com snapshot; id ausente do catálogo; `active === false`) e com a regra de `resolveItem` nos dois apps.
- **R4 (r1)**: o widget repassa só `loading`, e `imagePriority(0)` devolve `{ loading: 'eager', fetchPriority: 'high', animateIn: false }` (`rendition.ts:180-183`). A omissão é deliberada e tem caso de teste. O risco ficou registrado em *Risks*.
- **R5 (r1)**: `top-[52px] -translate-y-1/2`, `left-1`/`right-1` na raia de `md:px-12` e o `<h2>` fora do envolvedor `relative`. `TAP_44` (`touchTarget.ts:29-30`) só traz transformações em `before:`, então o `-translate-y-1/2` da seta não colide com ele, e `cn(TAP_44, 'absolute …')` segue a ordem de `HeroCarousel.tsx:175`.
- **R6 (r1)**: o item sem imagem desenha a vaga vazia do mesmo tamanho, sem `<img src="">`. `categoryListItem` devolve `imageUrl: null` e não `null` para o item, então `droppedCount` não conta o rascunho em edição.
- **R7 (r1)**: o guarda fica em `apps/store/src/shared/lib/__tests__/categoryListSchema.test.ts`, ao lado de `googleShoppingSchema.test.ts`, que existe nesse diretório.
- `resolveHomeSections` (`resolve.ts:144-201`) recebe o item cru e o `ResolvedItem` no laço dos curados (`:161-165`). O pós-processamento por tipo cabe ali, e `null` cai em `droppedCount`. `category_grid` está em `SOURCE_DRIVEN` (`:89`) e em `EMPTY_SOURCE_REASON` (`:118`, com a frase de hoje, que o design troca). `ResolvedItem.categoryId` existe (`:14`). O import entre `categoryList.ts` e `resolve.ts` é só de tipo de um lado e de valor do outro, então não cria ciclo em tempo de execução.
- `catalog.ts`: `COMING_SOON = ['category_grid']` (`:140`) e `LIMITS` sem o tipo (`:123`). As asserções a inverter existem como o design diz: `core/home/__tests__/catalog.test.ts` (`expect(emBreve).toEqual(['category_grid'])`), `HomeRenderer.test.tsx:95` e `HomeBlockTray.test.tsx:68-69,104,121`. O caso de `HomeRenderer.test.tsx:107-115` (seção `category_grid` sem itens) continua verde, porque `resolveHomeSections` a esconde antes do registro.
- `sectionRenderers.tsx:70` (`category_grid: null`) e o molde `items.length ? … : null` de `product_carousel`/`hero_carousel` estão como descritos.
- `SectionEditorProps` (`sectionEditors.tsx:54-64`) não traz seção resolvida, o que confirma a necessidade do cruzamento local. `refusal?: (config, items: readonly DraftItem[])` aceita a composição `categoryListRefusal ?? configRefusal('category_grid', …)`, e `configRefusal` (`core/home/refusals.ts:165-182`) não cobra nada de um tipo sem `LIMITS` nem `image_url`.
- `featured.ts` é molde fiel: assinatura `(config, items: readonly Partial<HomeSectionItem>[])`, imports com `.ts`, `ordinal` de `carousel.ts:96`. `ordinalF` existe só em `sectionRefusals.ts:42`, e o plano de movê-lo para `core` com reexport não cria um segundo dono.
- `uploadHomeImage(file, slot?)` (`lib/uploadHomeImage.ts:81`) devolve `{ url, error, warning }`, e `SlotSpec` existe (`layout.ts:7`).
- `renditionUrl`/`renditionSrcSet(url, widths)` (`rendition.ts:126,147`) aceitam `[80, 104, 160, 208]`: o grampo vai de 1 a 2500 e a rendição é `resize=contain`, coerente com a vaga quadrada.
- A escrita: `curateSection` monta o `insert` coluna a coluna (`useAdminHomeSections.ts:293-304`) e `toNewItems` remove só `key`/`product_slug` (`sectionDraft.ts:86-87`). A passagem de sete para oito colunas e o caso do payload estão corretos. `applyDraft` → `parsePreviewMessage` (`core/home/preview.ts:106-126`) passa `HomeSection[]` sem lista de campos, então `title` chega à prévia (LCT-40) sem tocar no canal.
- `mapItem` existe nos dois apps (`apps/store/src/entities/home/api/useHomeSections.ts:31` e `apps/backoffice/src/entities/home/api/useAdminHomeSections.ts:62`), e `DbHomeSectionItem` está em `packages/supabase/src/types/home.ts`.
- A migration: o último prefixo da árvore é `20261011120000_63-retirada.sql`, e `20261012120000` é posterior e único hoje. É aditiva e idempotente, sem dado e sem `grant`.
- Rastreabilidade: as 40 ACs têm onde morar. As duas divergências da spec (LCT-29, quem assere "em breve"; LCT-32, suavização por CSS) estão declaradas, com `SPEC_DEVIATION` na segunda. Nada no design passa do escopo da spec.

## Resposta do autor

- **R1**: aplicado — o rolador é `<nav ref aria-label="Categorias">`, o mesmo elemento do `Header`.
- **R2**: aplicado — a conta parte de 1280px: 7 inteiros e ~62% do 8º, declarado como esperado.
- **R3**: aceito como dívida — a cópia do `cruzar` segue o molde e entra na lista de dívidas do fecho; extrair tocaria dois editores fora do escopo.
- **R4**: já resolvido na r2 — o editor chama `categoryListLabel(item, nome)` com o **item**, e a função lê `item.alt`; a precedência título > `alt` > nome é a mesma nos dois lados.
