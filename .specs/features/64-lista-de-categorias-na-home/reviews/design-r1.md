# Revisão — Design (rodada 1)

Veredito: REPROVADO

## Achados

### R1 — O rótulo do item fechado no painel é uma segunda escrita da regra que a Abordagem A pôs em `core` (importante)
- Onde: `design.md`, *Painel — CategoryListEditor*, item **fechado**: "rótulo efetivo (`categoryListItem`-equivalente: `title || nome atual da coleção || label_snapshot`)". Compare com *Abordagens consideradas*, linha C: "recusada — dois donos, e a linha do painel divergiria da loja".
- Problema: o design escolhe a Abordagem A justamente para que "o rótulo é o título ou o nome da coleção" tenha um dono só, e depois manda o editor recalcular a mesma regra à mão, chamando-a pelo nome de "equivalente". O editor não tem um `ResolvedItem` para passar a `categoryListItem` (`SectionEditorProps` em `sectionEditors.tsx` não traz seção resolvida; o rascunho é cruzado com o catálogo localmente, como faz `cruzar` em `CollectionRowsEditor.tsx:60`), então a função de `core` desenhada não serve a esse consumidor. A cópia da tela também já diverge da de `core`: ignora `alt` (que `resolved.label` = `alt || name` considera, e `toDraftItems` preserva `alt` vindo do banco) e acrescenta `label_snapshot`, que a loja nunca lê.
- Cenário: um item com `alt` gravado por escrita direta, ou uma mudança futura de aparo ou precedência num lado só, faz a linha do painel dizer "Cinzas" enquanto a loja (e a prévia) mostra outra coisa. É o "defeito 01" no tamanho de um campo, e nada acusa.
- Sugestão: separar em `core/home/categoryList.ts` uma função pura de rótulo que receba primitivos (por exemplo `categoryListLabel(title, nomeVivo)`), usada **tanto** por `categoryListItem` quanto pelo editor. A precedência título > `alt` > nome tem de valer igual nos dois lados, ou a decisão sobre o `alt` tem de ser declarada nos dois. O caso órfão (`label_snapshot`) fica como ramo de aviso, separado do rótulo.

### R2 — Item que aponta para coleção DESATIVADA não tem onde morar no painel (importante)
- Onde: `spec.md` A-12 ("Item cuja coleção foi apagada **ou desativada** — a loja pula o item; o painel o **nomeia**"); `design.md`, item fechado: só "Coleção · <nome>" **ou** "o aviso de órfão 'A coleção <snapshot> foi apagada…'".
- Problema: o design cobre só o órfão (`category_id` nulo). Para `category_id` preenchido com `active === false` (ou ausente do catálogo), a loja pula o item (`resolveItem` → `null`), mas a linha do editor mostraria "Coleção · Penas" como se estivesse no ar. Os vizinhos já distinguem os três estados (apagada, sumida do catálogo, desativada): `CollectionRowsEditor.tsx:60-93` (`cruzar`) e `CollectionFeatureEditor.tsx` (`foraDoAr`). O design cita o `CollectionFeatureEditor` como molde do seletor, mas não do aviso.
- Cenário: a dona desativa "Penas" em Categorias. A loja some com o círculo, o editor mostra o item normal, e só a linha da seção diz "N itens saíram do ar" (e só quando **todos** saíram). Ela não descobre **qual** item sumiu, que é exatamente o que A-12 pede.
- Sugestão: no item fechado, adotar os três estados do `cruzar`/`foraDoAr` existentes (apagada · sumida · "desativada em Categorias — não aparece na loja") e declarar o texto de cada um. Melhor ainda: reaproveitar a mesma resolução do rascunho em vez de escrever uma quarta.

### R3 — `<ul ref={faixa.ref}>` não compila com o tipo do hook (menor)
- Onde: `design.md`, *Loja — widgets/category-list*: "trilho `<ul ref={faixa.ref}>`"; `apps/store/src/shared/lib/useOverflowAffordance.ts`: `ref: MutableRefObject<HTMLElement | null>`.
- Problema: `RefObject<HTMLUListElement>` exige `current: HTMLUListElement | null`, e `HTMLElement` não é atribuível a ele (faltam `compact`/`type`), o que dá TS2322. O único consumidor de hoje põe o ref num `<nav>`, que é `HTMLElement` puro. Além disso, o hook observa `el.firstElementChild`, que no desenho é o primeiro `<li>` e não uma fila que cresce. Funciona por causa da `chave` (`items.length`), mas não pelo motivo que o hook documenta.
- Cenário: a baseline de tipos é 0 · 0 · 0. A task sai escrita como no design, e o `tsc` reprova (o `build` não pega).
- Sugestão: pôr o ref num `<div>` rolável que envolva o `<ul>`, o que também devolve ao `ResizeObserver` o filho que cresce. Outra saída é declarar o cast. Escrever isso no design.

### R4 — `imagePriority(0)` dá `fetchpriority="high"` a um círculo de 80px logo abaixo do LCP (menor)
- Onde: `design.md` "`loading`/`fetchPriority` de `imagePriority(index)` (LCT-06)"; `core/media/rendition.ts:180` (índice 0 ⇒ `fetchPriority: 'high'`, e o comentário diz que "mais de um `high` dilui a dica"); `HeroCarousel.tsx:100-105` recusa `imagePriority` por descrever uma grade.
- Problema: a spec manda usar `imagePriority`, e o design segue. Mas o bloco nasce logo abaixo do Banner principal, cujo primeiro slide já é `high`, e o risco de diluir a dica não está em *Risks*. A grafia também está errada para o React 18.3 (`fetchPriority` avisa; o projeto usa o spread minúsculo `fetchpriority`, como em `ProductCard.tsx:143-150`).
- Cenário: o LCP do hero piora com o bloco ligado, e só a medição do item 6 de *O que só o navegador prova* acusa.
- Sugestão: registrar o risco em *Risks & Concerns*, ligado à medição de LCP, e escrever a grafia do spread. Se a medição mostrar perda, decidir a exceção com `SPEC_DEVIATION`.

### R5 — Posição das setas sub-especificada (menor)
- Onde: `design.md` "`cn(TAP_44, 'absolute top-[52px] hidden md:flex … h-9 w-9 …')` — centradas na altura do círculo de 104".
- Problema: `top-[52px]` sem `-translate-y-1/2` põe o **topo** do disco de 36px em 52, e o centro cai em 70, não no meio do círculo. `left`/`right` não estão definidos, e não se diz se a seta sobrepõe o primeiro ou o último item (o que tira área de clique do link).
- Cenário: as setas saem desalinhadas, e o defeito só aparece em navegador.
- Sugestão: `top-[52px] -translate-y-1/2` (molde `HeroCarousel.tsx:175`, `top-1/2 -translate-y-1/2`), com a âncora horizontal e a sobreposição declaradas.

### R6 — Item resolvido sem imagem não tem comportamento definido na loja (menor)
- Onde: `design.md`, `categoryListItem` (`imageUrl: item.image_url?.trim() || null`); widget (`renditionUrl(url, 208)`).
- Problema: a gravação pelo painel exige imagem (LCT-19), mas a prévia mostra o **rascunho** (LCT-40), e nele o item recém-adicionado ainda não tem foto. O mesmo vale para uma linha gravada por escrita direta. `categoryListItem` devolve o item com `imageUrl: null`, e o widget passaria `null` a `renditionUrl`/`src`. O design não diz se o item é pulado ou se desenha a vaga vazia com o rótulo.
- Cenário: a prévia mostra um link com rótulo e um `<img>` sem `src` (ou com `src="null"`) enquanto a dona monta o item.
- Sugestão: decidir e escrever. Uma saída é a vaga vazia com o rótulo, do mesmo jeito que LCT-36, sem montar `<img>`. A outra é `categoryListItem` → `null`, que conta como "saiu do ar". Neste caso, avaliar o efeito sobre `droppedCount` durante a edição.

### R7 — Local do guarda novo não declarado (menor)
- Onde: `design.md`, *Guardas tocados*: "**novo** `categoryListSchema.test.ts`".
- Problema: o design não diz em que suíte o guarda mora. O molde citado (`googleShoppingSchema`) fica em `apps/store/src/shared/lib/__tests__`, e o `CLAUDE.md` explica que é ali que os guardas de migration rodam.
- Sugestão: fixar o caminho (`apps/store/src/shared/lib/__tests__/categoryListSchema.test.ts`) e a âncora dupla (arquivo lido + número extraído).

## Conferido sem achado
- `category_grid` existe no `check`, em `catalog.ts` (`LABELS`, `COMING_SOON = ['category_grid']`), em `resolve.ts` (`SOURCE_DRIVEN`, `EMPTY_SOURCE_REASON`), em `sectionRenderers.tsx:70` (`null`) e em `HomeSectionRow.tsx:54` (`LayoutGrid`), como o design descreve.
- A correção que o design faz da LCT-29 está certa: quem assere "em breve" é `core/home/__tests__/catalog.test.ts:144-155`, e `homeSections.test.ts` não tem régua de `comingSoon`. A divergência da spec está declarada em *Risks*.
- `resolveHomeSections` recebe o item cru e o `ResolvedItem`, e o pós-processamento por tipo no laço dos curados alimenta `droppedCount`/`todosForaDoAr` sem mudança. Os dois `resolveItem` fazem `alt || name` e `image_url || banner_url` (`useResolvedHome.ts:63-68`, `useAdminResolvedHome.ts:102-103`), e os dois `derive` devolvem `[]` para o tipo.
- O risco do `config.limit`, que corta qualquer tipo (`HOME-42`), está declarado e não é mexido.
- `curateSection` lista colunas à mão (`useAdminHomeSections.ts:293-304`) e `toNewItems` remove só os campos de tela; a passagem de 7 para 8 colunas em `toNewItems.test.ts` está correta. `applyDraft` precisa carregar `title` para a prévia, e o design prevê isso.
- `ordinal` existe em `core/home/carousel.ts:96` e `ordinalF` só no painel (`sectionRefusals.ts`). O plano de criar `ordinalF` em `core` e reexportá-lo no painel não cria um segundo dono.
- `featured.ts` é molde legítimo: recusa `string | null`, teto como recusa e não `config.limit`, imports com `.ts`.
- `aspectRatioWarning`/`SlotSpec` (`refusals.ts`, `layout.ts`) e `uploadHomeImage(file, slot?)` existem como descritos. O upload aceita PNG/JPG/WebP (`ACCEPTED_TYPES`).
- Existem com a forma citada: o select de coleção que congela o `label_snapshot` no mesmo gesto (`CollectionFeatureEditor.tsx:42-68`) e o arrasto `soltar` (`HeroCarouselEditor.tsx:97-107`).
- `useOverflowAffordance` expõe `ref`/`antes`/`depois`/`rolar(±1)` a 0,8 da janela. A suavização fica no CSS (`scroll-smooth motion-reduce:scroll-auto`), e a `SPEC_DEVIATION` sobre a LCT-32 está declarada.
- `TAP_44` vai primeiro no `cn(...)`, na ordem que `alvoDeToqueNaoRoubaPosicao` exige (molde `HeroCarousel.tsx:175`).
- `renditionUrl`/`renditionSrcSet(url, widths)`/`imagePriority` existem em `core/media` com essas assinaturas.
- A coluna nova é coberta pelas policies e grants por tabela da 24, sem grant novo. A migration é aditiva, idempotente e com prefixo posterior a `20261011120000_63-retirada.sql`.
- A prévia continua sendo a loja (`AD-019`): o editor não desenha a fileira, e `previaUnica.test.ts` (as réguas de `snap-x`/`scroll-snap` e de tipo no palco) segue sem edição.
- As 40 ACs têm onde morar no design. Fora R2, nada no design passa do escopo da spec.

## Resposta do autor

Todos os achados foram aplicados em `design.md` (status "Draft r2"); nenhum foi recusado.

- **R1**: `categoryListLabel(item, nome)` em `core/home/categoryList.ts`, com precedência título > `alt` > nome, chamada por `categoryListItem` e pela linha fechada do editor. O `label_snapshot` saiu do rótulo e ficou só como ramo de aviso.
- **R2**: o editor usa um `cruzar` no molde de `CollectionRowsEditor.tsx:60-93`, com quatro estados (não escolhida · apagada · desativada · no ar) e o texto de cada um declarado.
- **R3**: o ref vai num `<div>` rolável cujo primeiro filho é o `<ul>`, que também devolve ao `ResizeObserver` o filho que cresce.
- **R4**: o widget repassa só `loading`; `fetchPriority` não é escrito. O risco está em *Risks*, ligado à medição de LCP, e o desvio de forma da LCT-06 está declarado.
- **R5**: `top-[52px] -translate-y-1/2`, cada seta numa raia de 48px (`md:px-12` no rolador). Nas pontas, nenhuma seta cobre item; o `<h2>` fica fora do envolvedor `relative`.
- **R6**: item sem imagem desenha a vaga vazia com o rótulo, como a LCT-36, sem `<img>`. A alternativa (`null` → "saiu do ar") foi recusada porque inflaria o `droppedCount` durante a edição.
- **R7**: o caminho é `apps/store/src/shared/lib/__tests__/categoryListSchema.test.ts`, com âncora dupla.
