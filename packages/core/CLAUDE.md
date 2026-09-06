# packages/core — onde a regra mora

`@estrelinha/core`. **Este pacote existe para que uma regra tenha um dono só.** Quase todo módulo
aqui nasceu de um defeito onde a mesma regra estava escrita duas vezes, em dois consumidores que não
se importam, divergindo **sem quebrar nada** — build, `tsc` e teste de componente passam com as duas
cópias discordando. Leia [`../../CLAUDE.md`](../../CLAUDE.md) (seção *O "defeito 01"*) antes deste
arquivo.

## Quando um código pertence a este pacote

1. **Dois consumidores leem a mesma regra** — hoje, ou de forma previsível amanhã. Loja + painel,
   loja + edge function, painel + importador.
2. **Um guarda precisa importá-la de dentro de um teste que lê arquivo do disco.** É por isso que
   `routes` não tem React nem Supabase: `reservedSlugs.test.ts` e `vercelRedirects.test.ts` importam o
   módulo e comparam com o `App.tsx` e o `vercel.json` lidos do disco.
3. **Ela decide dinheiro.** Aí não é preferência: o servidor recalcula e a loja tem de chegar ao mesmo
   número.

Não pertence: componente React, hook que chama Supabase (exceto os de `hooks/`, que são a exceção
declarada), e regra com um consumidor só que ninguém prevê duplicar.

## Pureza — e por que ela é asserida

Os módulos de domínio **não importam React, Supabase nem Deno**. Não é estética:

- Um guarda que lê `App.tsx` do disco não pode arrastar React para dentro do teste.
- As **edge functions importam daqui por caminho relativo com extensão explícita**
  (`../../../packages/core/src/shopping/identity.ts`), porque Deno não passa pelo Vite e não conhece o
  alias. Um `import React` no caminho derrubaria a function em runtime, não em build.

`purity.test.ts` (`shopping`) e `catalog.test.ts` (`home`) asserem isso, **com âncora de contagem** —
sem ela a varredura passa com zero arquivo lido, que é a pior falha possível num teste desse tipo.

## Os módulos

| Subpath | O que é dono | Consumidores |
| --- | --- | --- |
| `./payment/*` | preço, parcelas, Pix, status, assinatura de webhook | loja, `mercado-pago` |
| `./pricing` · `./formatters` | formatação e conta de exibição | os dois apps |
| `./routes` | `ROUTE_SLUGS`, `RESERVED_SLUGS`, `LEGACY_REDIRECTS`, `productPath`, `MATERIAL_GUIDE_PATH` | router da loja, `vercel.json`, cadastro do painel |
| `./menu` | `menuItems`, `menuPanelColumns`, `resolveMenuTarget`/`menuTargetRefusal`, `resolveMenuBanners`, `MENU_ICON_KEYS`, `descendantIds`, `bySortOrder`, `categoryHref`, o canal `preview.ts` | 4 superfícies nos 2 apps |
| `./home` | catálogo de blocos, `DEFAULT_HOME_COMPOSITION`, `derive.ts`, `preview.ts` | loja, painel |
| `./faq` | `resolveProductFaqs`, `faqOverrideOf`, `rankFaqSuggestions`, `block.ts` | loja, painel, importador |
| `./material` | máquina de estado, `requiresMaterial()`, `materialSummary` | loja, painel, RPC (cópia em SQL) |
| `./shopping` | `ShoppingOffer` e as duas serializações | `google-feed`, `product-page`, loja, painel |
| `./checkout` | `resolveBlocks`, `isOrderStale` | loja |
| `./shipping` | `freeShippingState` + `freeShippingRefusal` (o frete grátis tem **um** dono), `estimate.ts` | 8 superfícies nos 2 apps |
| `./validators` · `./product` · `./media` · `./auth` | utilitários de domínio | vários |
| `./hooks/*` | **exceção declarada** — `useStoreSettings`, `useCoupons` tocam Supabase | os dois apps |

## Dinheiro — a regra que não muda por acaso

**`packages/core/src/payment/**` fechou as features 22, 23, 24 e 25 sem uma linha alterada**,
conferido por `git diff --name-only` no gate. Identidade visual, importação de catálogo, composição de
home e prévia não têm por que mexer aqui. Se uma feature encostar em `payment/`, isso é a pergunta a
fazer antes de qualquer outra.

- **Desconto por item é server-side, sempre.** `mercado-pago` recalcula `unit_price` a partir de
  `products.base_price` e **descarta** o valor enviado pelo cliente. Logo, qualquer desconto por item
  calculado no front seria **exibido e não cobrado**. O **order bump** aplica o desconto dentro de
  `calculateOrderTotals` (`payment/pricing`), a mesma função que a edge function usa: a loja e o
  servidor passam **preço cheio + o objeto `bump`** — nunca uma lista já descontada
  (`applyOrderBump` não é idempotente por composição).
- **O ponto de entrada único é `resolveOrderPricing`.** A loja (`useCheckoutTotals`,
  `useCartPromotion`) e a `mercado-pago/handlers.ts` chamam a **mesma** função.
- **`AD-015` — desconto por item nunca soma.** Duas regras no mesmo item ⇒ vence o **menor preço**
  (`perItemMin`, calculado a partir do preço cheio nas duas pontas, o que torna o resultado
  independente da ordem de aplicação). Entre promoção e cupom ⇒ vence o **menor total final** — pelo
  total e não pelo desconto, porque cupom `free_shipping` mexe no frete. Empilhar é opt-in por
  promoção (`stacks_with_coupon`), nunca o default.
- **O Pix arredonda o DESCONTO, não o preço final** (`payment/pix`). `resolveOrderPricing` cobra
  `subtotal − round2(subtotal × pct/100)`. A expressão que vivia inline no `ProductCard` arredondava o
  preço final, e as duas **não dão o mesmo número**: com `pix_discount_percent = 5`, **81 dos 259
  preços distintos do catálogo (31%)** divergiam em 1 centavo — a vitrine prometia R$ 7,51 onde a
  cobrança é R$ 7,50. A direção era a favor da cliente, e por isso sobreviveu sem queixa.
  `displayedEqualsCharged.test.ts` compara `pixPrice` com o total de `resolveOrderPricing` por valor.
- **Elegibilidade de promoção sai da view `promotion_eligible_products`** (categoria + descendência),
  nos dois lados. **Nunca de `Product.category_links`**: aquele campo vem do snapshot do carrinho em
  `localStorage` e pode ter dias.
- **`orders.promotion_discount` é TETO, não valor.** `create-payment` cobra sempre o próprio recálculo
  e devolve **422 `promotion_no_longer_valid`** quando o recalculado é MENOR que o exibido — cobrar
  mais caro do que a tela prometeu é o que essa guarda existe para impedir.
- **`orders.promotion_id` é `null` de propósito quando duas promoções aplicam** (FK única não
  representa "duas"). Logo "este pedido teve promoção?" se pergunta por `promotion_discount > 0`.
- **Todo item que entra na conta usa `cartItem.unitPrice`** (preço da variação), nunca
  `product.price`. Com grade, usar a base fazia a loja exibir e gravar um valor que o servidor não
  cobrava — o defeito está **congelado** por teste em `handlers.test.ts`.

## `shopping` — a oferta tem UM dono, e duas serializações (`AD-020`)

`renderFeedXml` (RSS 2.0 para o Merchant Center) e `productJsonLd` (a landing page) partem do **mesmo**
`ShoppingOffer`. O Merchant Center **compara o preço do feed com o preço da landing page** e reprova o
item quando discordam — com 3.233 ofertas apontando para lá, duas escritas seriam duas chances de
produzir exatamente essa divergência sem nada quebrar.

- `shoppingParity.test.ts` mede a igualdade pelas **serializações reais**, com sensor embutido.
- **`offer_id` é `product_variants.nuvemshop_id` cru**, e `item_group_id` é `products.nuvemshop_id` —
  os mesmos que já estão indexados. Produto criado no admin (sem `nuvemshop_id`) usa o UUID da
  variação: hoje são zero linhas, mas a regra precisa existir antes da primeira.
- **Nem Pix nem promoção progressiva entram no feed.** `g:price` é o preço sem condição; anunciar um
  desconto condicional faria a landing page mostrar um número e o feed outro. `sale_price` só sai
  quando `compare_price > price`, que é o único par da base que significa "de/por" sem condição.
- **A descrição enviada é a mesma que a loja mostra** — `sanitizeHtml(stripFaqBlock(html))` reduzido a
  texto. Mandar o bloco de FAQ que a loja filtra faria o feed descrever uma página que não existe.

## `faq/block.ts` — a exceção do regex sobre HTML

**Aqui regex sobre HTML é permitido, e só aqui.** A regra do projeto é sobre **sanitizar**, e
`sanitizeHtml` (que é da loja, por árvore, com `DOMParser`) não mudou. Isto **localiza** um heading num
corpus medido como regular (687 de 687 usam `<h3>Perguntas frequentes</h3>`), o que sobra continua
passando pelo sanitizador, e a resposta extraída é renderizada como **texto**. Node não tem
`DOMParser`: por árvore não serviria às três pontas (importador, loja, painel).

- **São DOIS arranjos de HTML, não um.** 617 produtos usam um `<p>` por par; **70 põem todos os pares
  num `<p>` só**, separados por `<br />`. A leitura ingênua perde **312 pares** em silêncio.
- **`stripFaqBlock` só age quando houve par extraível**: heading com prosa solta é texto da dona.
- `block.test.ts` guarda os dois arranjos e a fronteira do bloco.

## `faq/suggest.ts` — a fórmula é PROPORÇÃO

`usos na categoria ÷ produtos com FAQ na categoria`, tomando a **maior** entre as categorias do
produto. Medido no catálogo real, top-5: **84,0% de precisão e 83,5% de cobertura**, 3 produtos sem
acerto. Por **contagem bruta** cai para **61,1% / 56,1%** e 52 sem acerto — `Joias e acessórios`, com
634 produtos, decide o ranking de todo mundo.

- Categoria com menos de **3** produtos com FAQ é ignorada (com 2 vizinhos, 100% é acidente com cara
  de certeza).
- **O recuo para a frequência global é tudo-ou-nada**: completar as vagas que faltam com perguntas
  globais mudaria a medição de 84% sem ninguém perceber.
- `faqSuggestion.test.ts` reprova abaixo de **80%** contra a distribuição real (687 produtos × 36
  categorias × 67 perguntas, leave-one-out) e carrega **sensor embutido**: assere que contagem bruta
  reprova na mesma régua.
- **A sugestão é determinística de propósito.** Geração por IA ficou de fora por decisão do usuário
  (2026-08-16) e virou `BL-014`; a **`AD-011` continua valendo**.
- **Não derive "Quais materiais posso usar?" de `material_kinds`** — a coluna diz **menos** que a
  descrição (`BL-015`), e derivar faria a loja dizer menos do que já diz.

## `material` — a cópia deliberada em SQL

A máquina de estado vive aqui **e** no `where` da RPC. As duas são necessárias: só o banco impede
requisição forjada, e só o TypeScript produz o motivo legível que a AC exige.
`materialTransitions.test.ts` lê a migration do disco e compara origem a origem, alvo a alvo.

- **Um salto obrigatório**: `aguardando_material → material_recebido` **direto**, porque informar o
  rastreio é opcional e a maioria dos pedidos nunca passa por `material_enviado`.
- **`nao_aplicavel` é terminal.** **Transição para o próprio estado é sucesso** — é o que faz duas
  admins clicando ao mesmo tempo convergirem.
- **`orders.material_tracking_code` NÃO é `orders.tracking_code`.** A primeira é a remessa **de
  entrada** (cliente → ateliê, o envelope com o material); a segunda é a **de saída** e alimenta o
  e-mail `order_shipped`. Reusar aquela faria "postamos sua joia" sair com o código do envelope que a
  cliente mandou.
- **O pedido é snapshot**: `order_items` repete `requires_material`, `material_kinds` e
  `engraving_text` de propósito. Mudar o cadastro não altera pedido já criado.
- **Nenhuma decisão de dinheiro depende do material.** `create-payment` não lê nenhuma coluna nova, e
  `payment/**` fechou a feature `22` sem uma linha alterada.

## `menu` — a regra das quatro superfícies

Consumida pelas **quatro** superfícies nos dois apps (barra do desktop, folha do celular,
`/admin/menu` e a prévia). Foi ter a regra em cada tela que produziu o bug original: o `Header` fazia
`.slice(0, 4)` de uma lista chapada e a barra do topo mostrava o contêiner de tudo mais uma filha que
empatou em `sort_order = 0`.

- **A porta é `menuItems(input, surface)`, e é UMA.** Nenhuma tela filtra, ordena ou trunca por conta.
  Ela funde **duas fontes** — `categories` e `store_settings.menu.links` — numa lista só, ordenada
  junto: é isso que permite não haver item de menu escrito em JSX.
- **O menu não é responsivo: são DUAS curadorias.** `menu_desktop` e `menu_mobile` são colunas
  independentes, e a superfície é pedida **por nome**. Derivar por largura faria o hook responder uma
  coisa na prévia do painel e outra no navegador da cliente.
- **O papel (barra × painel) é DERIVADO da árvore**, nunca gravado: categoria marcada cujo pai também
  está marcado **na mesma superfície** é item do painel do pai. Uma coluna de papel dessincronizaria
  no primeiro "mover categoria" — em silêncio.
- **Não existe teto** (feature `39`). `MENU_SLOT_LIMIT`, `slotsUsed` e `menuSlotRefusal` foram
  **apagados**: eram número de código recusando a curadoria da dona. Vinte marcadas devolvem vinte, e
  a barra rola. `menuSemTeto.test.ts` recusa a volta dos sete símbolos.
- **`menuEntries`/`MenuEntry` e `resolvePromo`/`ResolvedPromo` também foram apagados**, e não
  depreciados: símbolo de legado exportado do barril é o que a próxima tela importa por engano — e
  ele responderia com a curadoria única de antes, ignorando o dispositivo.
- **Destino sem FK continua sendo destino sem FK.** `menu_banners` mora em jsonb, então apagar a
  categoria ou o produto de destino não dispara `on delete set null`: quem lê **precisa** de
  `resolveMenuBanners`, que remove o banner cujo destino sumiu ou está inativo. É a mesma lição do
  `menu_promo`, e é AC.
- **Um validador de destino só** (`resolveMenuTarget`/`menuTargetRefusal`), servindo item de link e
  banner. Dois divergiriam, e um aceitaria o que o outro recusa.
- **`preview.ts` é o canal da prévia do MENU, e reusa os genéricos da `25`.** `MENU_PREVIEW_SOURCE`,
  as mensagens `ready`/`draft`/`open` e `parseMenuPreviewMessage` moram aqui; `PREVIEW_PARAM`,
  `isPreviewWindow`, `PREVIEW_DEVICES`, `previewScale`, `previewMetrics` e `previewSrc` são
  **importados** de `core/home/preview.ts`, nunca redeclarados. **Um `?preview=1` só, dois canais** —
  o carimbo é o que os separa, e um parâmetro novo seria um segundo dono de "esta janela é prévia".
- **Sem coluna `menu_order`** — a ordem é a `sort_order` que já existia. Dois donos do mesmo dado é o
  "defeito 01".
- **`core/menu` é resolvido pelo Deno** (a function do sitemap importa `categoryHref` daqui), e desde
  a `39` o grafo dele alcança `core/home/preview.ts`. `purity.test.ts` passou a caminhar o grafo
  **transitivo**: um vizinho com especificador relativo sem `.ts` derruba o worker com
  `Failed resolving types` **antes da primeira linha rodar**, e nada mais acusaria — Vite e vitest
  resolvem as duas formas. Foi assim que `home/preview.ts` ganhou o `./types.ts`.

## `home` — derivação e contrato da prévia

- **`derive.ts` é o dono de `pickHomeCollections`, `pickHomeBanners`, `pickTrendingCategories`.**
  Viviam em `apps/store`, e como o backoffice não importa de lá, o painel carregava uma segunda
  escrita delas. Duas cópias divergentes fazem o painel prometer uma seção que a Home não renderiza.
- **`defaults.ts` é ao mesmo tempo a semente da migration e o piso do hook.** `defaults.test.ts` assere
  que a semente não divirja do que a loja desenha.
- **`preview.ts` é o contrato das quatro mensagens** (`ready`, `draft`, `highlight`, `select`), mais
  `isPreviewWindow`, `parsePreviewMessage` e `previewScale`. Módulo puro porque as **duas** pontas o
  leem — e, desde a `39`, também porque `core/menu/preview.ts` importa os genéricos dele. Essa
  segunda leitura tem consequência: o arquivo entrou no grafo que o **Deno** do sitemap resolve, e
  por isso o `import type … from './types'` ganhou o `.ts` explícito.
- **Literal de texto de seção mora aqui, não dentro do widget** — `catalog.test.ts` reprova a volta.

## Convenções de tipo

- **`strictNullChecks` está `false`.** União discriminada por literal **booleano** não estreita: com
  `{ ok: true } | { ok: false; reason: string }`, ler `verdict.reason` no `else` é TS2339. Para
  veredito com motivo devolva **`string | null`** — é o formato de `menuTargetRefusal`,
  `menuBannerRefusal`, `reservedSlugRefusal` e `feedExclusion`. Parser de mensagem segue a mesma
  regra: `parseMenuPreviewMessage` devolve `T | null`, nunca `{ ok }`.
- **Este pacote não passa por ESLint** (`BL-002`): nenhum pacote tem script `lint` e `pnpm lint` é
  `turbo run lint`. É type-checado e testado, mas o linter nunca o vê.
