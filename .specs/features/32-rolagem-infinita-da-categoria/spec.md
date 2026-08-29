# 32 — Rolagem infinita da listagem de categoria

**Escopo:** Medium (3 arquivos novos, 3 alterados; nenhuma decisão de arquitetura nova). Sem
`design.md`, sem `tasks.md`.

> **Registro retroativo, e vale dizer por quê.** O código foi implementado em **2026-08-17** e ficou
> na árvore sem commit até **2026-08-29**, quando esta spec foi escrita a partir dele. A ordem
> normal do projeto é a inversa; o que aqui se documenta é o que o código faz, conferido linha a
> linha, não uma intenção anterior a ele. A `31` ficou sem spec nenhuma e o número seguiu consumido
> — esta existe para a `32` não repetir aquilo.

## Problema

A `CategoryPage` montava **todos** os produtos da coleção de uma vez. Em `joias-afetivas` isso são
**508 `ProductCard`** num único commit do React, num público que é **~90% celular**. Não é o peso da
rede (esse é o `BL-00X`, e continua aberto) — é o custo de DOM e de layout, que aparece justamente
no aparelho mais fraco.

Havia um segundo defeito, da mesma família do `BUG-20260809`: **a listagem só tinha dois estados**.
Enquanto a consulta corria, `visible.length` era `0` e a página exibia *"Nenhuma joia com esses
filtros."* — mandando a cliente mexer num filtro que ela não tocou. O `BUG-20260809` já tinha
separado **vazio** de **falha**; faltava separar **carregando**.

## Fora de escopo

| Item | Por quê |
| --- | --- |
| Paginação de **rede** | `BL-00X`. A consulta continua trazendo a coleção inteira e continua presa ao teto de 1.000 linhas do PostgREST (`BL-008`). Paginar no servidor obriga a mover filtro, ordenação e contagem junto — senão a faixa de preço passa a descrever só as páginas baixadas e "menor preço" ordena um pedaço |
| Tirar `description` do `select` da listagem | `BL-00X` item 1: a busca pontua por ela (peso 5 em `searchProducts.ts`). Cortar degradaria a relevância **em silêncio** |
| Página numerada ou `?page=` na URL | Entre as três saídas que o `BL-00X` listava (numerada, "carregar mais", scroll infinito), esta feature implementa a terceira. A URL não ganha estado: rolagem não é endereço |
| Virtualização da grade | A janela resolve o custo medido sem trazer dependência nova nem quebrar `Ctrl+F` |

## Requisitos

**LST-01** — A listagem SHALL montar no máximo `PRODUCTS_PER_PAGE` (**24**) cards por vez, e SHALL
abrir a leva seguinte por rolagem ou por ação manual. 24 fecha fileira nas três grades da página (2,
3 e 4 colunas), então nenhuma leva enche pela metade.

**LST-02** — A contagem do cabeçalho SHALL descrever a **coleção filtrada inteira**, nunca a janela.
Quem pagina é o DOM; "60 produtos encontrados" com 24 montados é a leitura correta.

**LST-03** — Quando a lista exibida mudar de identidade — coleção, ordenação ou filtros — a janela
SHALL voltar à primeira leva. Manter a contagem faria um filtro novo abrir já rolado, mostrando o fim
de uma lista que a cliente nunca viu.

**LST-04** — A régua de `LST-03` SHALL ser **valor**, não identidade de referência. Uma chave
`string` recém-construída porém igual SHALL NOT reancorar.

> **Esta é a cicatriz da feature, e o requisito existe por causa dela.** A primeira versão recebia o
> próprio array de produtos e comparava por identidade. Funciona enquanto o `data` do React Query
> for referencialmente estável e **explode em "Too many re-renders"** no instante em que alguém
> devolve um array novo a cada render — `routing.test.tsx` faz exatamente isso
> (`useProducts: () => ({ data: [] })`), e um literal ali derrubava a rota inteira. Como a
> reancoragem é `setState` durante o render, régua de identidade é laço infinito esperando um
> consumidor descuidado.

**LST-05** — `visibleCount` SHALL ser limitado ao total corrente, e `hasMore` SHALL ser falso quando
a janela alcançar o total. Filtrar de 100 para 5 com a janela em 30 SHALL NOT deixar contagem
pendurada nem `slice` além do fim.

**LST-06** — A leva seguinte SHALL abrir por `IntersectionObserver` sobre uma sentinela abaixo da
grade, com `rootMargin` de **600px**, de modo que a cliente encontre os cards já montados em vez de
um buraco. O observer SHALL ser **recriado a cada leva**: ele avisa em *transição*, e numa tela alta
a sentinela pode seguir visível depois de acrescentar 24 cards — sem recriar, a lista para no meio
com a sentinela parada na frente da cliente.

**LST-07** — Enquanto houver mais, SHALL existir um `<button>` **real** que abre a leva seguinte.
Não é enfeite: é o caminho do teclado (não há como "rolar até" sem ponteiro), é o que sobra onde não
há `IntersectionObserver`, e é a única superfície que jsdom consegue exercitar.

**LST-08** — A chegada de uma leva SHALL ser anunciada a leitor de tela por região `aria-live`
educada, já que rolar não muda foco nem URL. O anúncio SHALL ser invisível — a contagem visível já
está no cabeçalho.

**LST-09** — Enquanto a **primeira** consulta corre, a listagem SHALL exibir uma leva inteira de
esqueletos na **mesma grade** dos cards, marcada `aria-busy`. Cada esqueleto SHALL espelhar a
**altura** do `ProductCard` — medida no navegador, **431px dos dois lados** —, não o conteúdo dele.

**LST-10** — A classe da grade SHALL ter **um dono** na página, lida pelos cards e pelo esqueleto.
String repetida faria o esqueleto anunciar uma grade que o conteúdo não usa: o "defeito 01" do
projeto no tamanho de uma classe, e sem nada quebrar.

**LST-11** — O estado de carregando SHALL vir de `isLoading` (primeira busca em curso), nunca de
`isPending` sozinho. Com o interruptor de `URL-04` desligado a consulta fica pendente **para
sempre**, e o esqueleto pulsaria embaixo da 404 até a cliente sair da página.

**LST-12** — Durante a carga a página SHALL NOT exibir o texto de vazio de filtro e SHALL NOT
afirmar "0 produtos" no cabeçalho. A contagem SHALL ser substituída por uma barra, que não afirma
nada.

**LST-13** — A tela de 404 SHALL NOT montar esqueleto.

**LST-14** — A grade SHALL ser `grid-cols-2` (mobile denso) · `md:grid-cols-3` · **`lg:grid-cols-4`**.
O `lg` não é preguiça: a sidebar de filtros come 260px + 32 de gap, então em `md` (container de 768)
sobram 444px para a listagem e quatro colunas dariam cards de **96px**. Medido em navegador: **224px
em 1440**, **160px em 1024**, **134,7px em 768** com três colunas.

## Dívida declarada

- **A faixa de chips de universo entra depois da carga**, porque enquanto a consulta corre não há
  como saber se a coleção tem tags — e a grade desce ~48px nesse momento. Reservar a faixa trocaria
  esse salto por outro, nas coleções sem tag. Fica como está, sabido.
- **As medidas do `ProductCardSkeleton` são uma segunda escrita das do `ProductCard`**, e **nenhum
  teste de componente pega a divergência**: jsdom devolve 0 para toda medida de layout. O que pega é
  auditoria em navegador. Ao mexer na tipografia do card, meça os dois de novo. Cópia deliberada,
  registrada aqui e no comentário do arquivo — mas **sem** a guarda que o `CLAUDE.md` exige para
  cópia deliberada, porque não há régua de disco que compare pixel renderizado.

## Verificação

**24 testes novos**, nenhum removido ou afrouxado:

| Onde | Quantos | O que mede |
| --- | ---: | --- |
| `shared/lib/__tests__/useInfiniteWindow.test.ts` | **10** | a aritmética da janela: primeira leva, avanço, clamp, reancoragem, e o **sensor da cicatriz** — chave igual porém recém-construída não reancora (`LST-04`) |
| `pages/__tests__/CategoryPage.test.tsx` | **14** | esqueleto (`LST-09`, `LST-12`, `LST-13`), rolagem (`LST-01`, `LST-02`, `LST-07`), o laço da identidade em contexto de página (`LST-04`), o anúncio (`LST-08`), e a grade única (`LST-10`, `LST-14`) |

**O que os testes NÃO alcançam, declarado em vez de fingido**: o disparo por `IntersectionObserver`
(`LST-06`) não é mensurável em jsdom — o dublê de `test/setup.ts` é inerte, e mesmo o de verdade
dependeria de layout, que jsdom mede como 0. A prova dele é de navegador: medido em **390×844**,
`24 → 96 → 164` em duas rolagens. É também a razão de `LST-07` existir como requisito e não como
cortesia.

**Gate** (medido em 2026-08-29, por workspace, com exit code capturado):

| Medida | Antes (HEAD da `31`) | Depois | |
| --- | --- | --- | --- |
| store | 1877 / 129 | **1901 / 130** | +24 / +1 |
| backoffice · core · functions · catalog-import | 1556/97 · 1363/52 · 337/6 · 335/16 | intocados | — |
| Tipos (store · backoffice · catalog-import) | 0 · 0 · 0 | **0 · 0 · 0** | — |
| Lint | 30 erros / 8 warnings | **30 / 8** | zero novo |
| `packages/core/src/payment/**` | — | **intocado** | — |

> **Correção de baseline, e ela importa.** O `CLAUDE.md` registrava **1874/129** para o store no
> fecho da `31`. O número medido no HEAD da `31`, por `git stash` em 2026-08-29, é **1877/129** — a
> baseline estava **3 testes curta**. É bookkeeping do fecho da `31`, não regressão: nada foi
> removido em lugar nenhum. O delta desta feature é **+24**, não os +27 que a diferença contra o
> número errado sugeria.

## Rastreamento

- Responde ao **item 2** do [`BL-00X`](../../BACKLOG.md) — a escolha entre página numerada,
  "carregar mais" e scroll infinito. **Não fecha o `BL-00X`**: os 3,1 MB continuam viajando, e os
  itens 1 (busca no servidor), 3 (`select` de listagem) e 4 (filtros no servidor) seguem abertos.
- Mantém o `BL-008` intacto: a consulta não mudou.
