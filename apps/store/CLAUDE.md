# apps/store — a loja pública

`@estrelinha/store`, Vite na porta **8082**. É a superfície que a cliente vê, e a única que carrega a
marca. Leia [`../../CLAUDE.md`](../../CLAUDE.md) (regras do repositório) e
[`../../DESIGN.md`](../../DESIGN.md) (identidade e paleta) antes deste arquivo.

**Premissa que decide empate**: ~90% dos acessos vêm de celular. O layout de 390px é o alvo; desktop
é a adaptação.

## Design system

- **A loja usa os tokens `--estrelinha-*`** (`app/App.css` + `tailwind.config.ts`). O backoffice usa
  `--estrelinha-admin-*`, que é o roxo/rosa/navy herdado — outro namespace, outra folha. Re-skin do
  painel está fora de escopo (`C-05`): painel interno não carrega marca.
- **A separação depende da ORDEM de dois imports** em `main.tsx` (`App.css` **depois** de
  `@estrelinha/ui/styles.css`). Inverter devolve a loja inteira à paleta do painel **sem quebrar
  nada** — `importOrder.test.ts` guarda isso.
- **A paleta é declarada em DOIS arquivos e eles precisam concordar.** Valor certo num lado e velho no
  outro não quebra build, tipo nem teste de componente: a loja renderiza duas paletas ao mesmo tempo e
  quem descobre é a cliente. `palette.test.ts` lê os dois do disco e compara.
- **`accent` (#B8945F) nunca é texto sobre claro** — 2,66:1. O único uso de texto dele é sobre `ink`,
  onde mede 4,78:1. **Nem com opacidade**: `ink/80` dentro de uma superfície `accent` cai para ~3,6:1,
  e a 45% para ~2,1:1 — foi defeito real, achado na Fase 5 da feature 20. A lista curta de exceções
  está em `accentText.test.ts`, entrada por entrada.
- **Borda de controle é `field` (#8C8073, 3,63:1), nunca `line`** (1,25:1, que é divisor). A WCAG
  1.4.11 pede 3:1 de contorno de controle e nenhum tom claro chega lá sobre o chão.
- **Botão é `rounded-sm` (6px); pílula é forma de RÓTULO** (badge, chip, tag, campo de busca), e o
  **disco** (`rounded-full`) segue sendo assinatura de ação circular.
- **Não se usa `prose`**, embora `@tailwindcss/typography` esteja no preset: o plugin traz a própria
  paleta (`--tw-prose-*`), que `contrast.test.ts` não mede. Seletor de filho explícito mantém toda cor
  em token auditável.

## Mobile — o que quebra e não grita

- **Grade com item largo precisa de `minmax(0, …)` NO MOBILE, não só a partir de `md`.** Sem ele a
  coluna implícita é `auto`, cujo mínimo automático é o **min-content do item** — e `overflow-x-auto`
  dentro do item não salva ninguém, porque quem não pode encolher é a trilha. Custou caro: a
  `ProductPage` declarava `minmax(0,…)` só no `md:` e, por isso, **toda página de produto rolava na
  horizontal no celular** (`scrollWidth` 634 numa viewport de 390), empurrada pela fita de miniaturas
  da galeria. Sobreviveu porque nada quebra: build, `tsc` e teste de componente passam, e **jsdom
  devolve 0 para toda medida de layout**. Achado só em navegador real, na auditoria da `27`.
  `ProductPage.test.tsx` trava a classe como **proxy**; a medida de verdade é a auditoria em 390×844.
- **O alvo de 44px tem DOIS auxiliares, e escolher errado quebra o outro** (`shared/lib/touchTarget`):
  `TAP_44` é 44×44 centrado, para disco de ícone e botão quadrado; `TAP_ROW` é 44px de **altura** na
  largura do próprio rótulo, para texto em fluxo. Um quadrado de 44 centrado num link de 130px
  deixaria as pontas fora do alvo. Alvo derivado do tamanho do desenho (`after:-inset-2`) **não
  converge**: dava 44 para o botão de 28px e 32 para o de 16px.
  - Desenho **maior** que 44 não usa auxiliar nenhum — a varredura de `touchTarget.test.ts` só o
    cobra de `h-8`/`h-9`/`h-10`/`38px`. É por isso que a vaga de foto de variação (56px) não leva
    `TAP_44`.

## Ícones e marca

- **Ícone da loja tem UMA porta: `@/shared/ui/icons`.** A biblioteca guarda os desenhos que vieram dos
  boards do Paper e que o lucide não tem vocabulário para dizer — corrente, pingente, gravação, gota
  afetiva, os passos do guia de material. O que o lucide já resolve (seta, coração, `+`, lupa)
  **continua vindo de lá**: duplicar ícone genérico só cria um segundo lugar para consertar.
  - **Uma grade e um traço**: `viewBox="0 0 24 24"` e traço **efetivo 1,5**. Desenhos que nasceram em
    outra grade entram num `<g transform="scale(…)">` com o traço compensado — **escala × traço =
    1,5**, sempre. Há três grades de origem em uso (40, 48 e 120), e `icons.test.ts` assere a
    invariante de cada uma **e** que o par (escala, traço) anda junto: `scale(0.5)` com o traço da
    grade de 40 renderiza 1,25, um oitavo mais fino que o vizinho — invisível em review, visível na
    tela.
  - **Contorno em `currentColor`, realce em `accent-strong`.** O contorno acompanha o texto ao lado; o
    realce é ouro fixo, e é `accent-strong` (3,55:1) porque `accent` (2,66:1) reprova até como
    elemento gráfico, onde a régua é 3:1.
  - `PixIcon` mora lá mas **fora do conjunto**: é a marca oficial do arranjo (grade de 16,
    preenchida), não um monoline nosso. Fica exportada, fora do registro `ESTRELINHA_ICONS`.
  - **Ligar ícone a categoria ainda não existe.** O board mostra um por vaga do menu; escolher qual é
    curadoria da dona, da mesma natureza do `show_in_menu`, e pede coluna própria — não um mapa de
    slug em código nem inferência em runtime.
- **A marca é SVG inline, nunca `<img src>`** — o header não pode ter estado de carregamento.
  `shared/ui/brand` traz a escada medida, e cada degrau **cai para o de baixo abaixo do próprio piso**:

  | degrau | componente | piso | onde aparece |
  | --- | --- | ---: | --- |
  | 1 | `EstrelinhaLockup` | **600px** | e-mail, papelaria, embalagem, `og-image.png` |
  | 2 | `EstrelinhaSignature` | **190px** | header (202px), rodapé, menu, checkout, auth |
  | 3 | `EstrelinhaSymbol` | **48px** | favicon, selo, superfície pequena |

  **O lockup completo não cabe em nenhuma tela da loja, e isso é resultado medido, não descuido**: a
  marca é monoline, o traço é fração fixa da largura, e a 48px de altura o lockup mediria 176px de
  largura com a assinatura em 0,29px — abaixo de 1px o traço vira cinza de antialias. A coluna de
  marca do rodapé tem 337px e a viewport de projeto, 390.
  `paths.ts` é **gerado** dos SVGs de `.specs/brand/uma-estrelinha/` (`_gen-paths.mjs`) e
  `paths.test.ts` compara caractere a caractere. **Um `<path>` por PAPEL DE TRAÇO** — aqui o que
  divide os paths é a espessura, que é geometria; `fill-rule="evenodd"` não se aplica, porque nada
  nesta marca preenche.
- **Favicon é o SÍMBOLO REDUZIDO, em duas bases**: canto de 6% na aba (o navegador não arredonda
  favicon) e **quadrado sangrado** no `apple-touch-icon` (o iOS aplica a própria máscara, e arte
  pré-arredondada deixa sobra de canto). O canto é quase reto porque o extremo deste desenho é a
  **ponta da estrela, na diagonal** — squircle de 28% custaria 15% da espessura do traço, e o board
  pede ao menos 1,3px de linha a 16px.

## Endereçamento — a URL tem UM formato (`AD-018`, feature `23`)

| conteúdo | canônica | também resolve |
| --- | --- | --- |
| produto | `/produtos/:slug` | `/produto/:slug` — **301** |
| categoria raiz | `/:slug` | `/colecao/:slug` e `/categoria/:slug` — **301** |
| subcategoria | `/:pai/:filha` | `/:filha` sozinha — **200**, com canonical para a de dois |
| guia de material | `/como-enviar-seu-material-de-dna` | `/como-enviar-o-material` — **301** |

- **A fonte é uma só: `@estrelinha/core/routes`** — `ROUTE_SLUGS`, `INFRA_SLUGS`, `RESERVED_SLUGS`,
  `productPath`, `categoryPath`, `MATERIAL_GUIDE_PATH` e `LEGACY_REDIRECTS`. Quem monta a canônica de
  uma categoria é `categoryHref` (`@estrelinha/core/menu`), que sobe até o **pai imediato** e para
  ali: a canônica tem no máximo **dois** segmentos, mesmo numa árvore de três níveis.
- **Categoria na raiz significa que o namespace de rota e o de slug de categoria são O MESMO.** Uma
  categoria chamada "sobre" encobriria `/sobre`; uma rota `/ajuda` nova encobriria a categoria
  `ajuda`. O React Router **ranqueia por especificidade, não pela ordem das linhas**, então quem vence
  é sempre a rota e quem some é sempre a categoria — em silêncio, e em produção. Por isso a lista de
  reservadas **não é zelo, é a contrapartida obrigatória da escolha**: `reservedSlugRefusal` recusa no
  cadastro (nas **duas** superfícies do painel, porque criar deriva o slug do nome e editar aceita
  digitação livre) e `reservedSlugs.test.ts` impede a lista de divergir do `App.tsx`.
- **A barra final não é canônica**: `trailingSlash: false` no `vercel.json`. Os `<Link>`, o router, a
  tag canônica e o destino do 301 concordam numa forma só; a URL indexada com barra paga **um** salto
  308 antes do 301.
- **O 301 mora no edge, com espelho no router.** Só o edge devolve status HTTP de verdade — que é o
  que preserva link equity e o que `curl -I` mede. O espelho existe porque `pnpm dev` e o vitest não
  têm Vercel na frente: sem ele a rota legada só quebraria no dia do cutover. As duas pontas leem
  `LEGACY_REDIRECTS`. **`statusCode: 301`, nunca `permanent: true`** — este produz **308**, e os dois
  campos não coexistem.
  - **Caminho fixo casa ANTES de prefixo.** `/como-enviar-o-material` é a primeira entrada sem
    `:slug`, e `legacyRedirectTo` testa a forma exata primeiro: cair na busca por padrão faria
    `/como-enviar-o-material/qualquer-coisa` produzir um destino com `:slug` literal na URL.
  - **O destino do 301 de categoria tem UM segmento**, não dois: o edge não conhece a árvore e não tem
    como saber de que pai a filha pende. A forma de um segmento resolve com 200 e declara canonical
    para a de dois, então o legado chega ao conteúdo em um salto.
- **Slug renomeado não perde a página**: `product_redirects` e `category_redirects`. A precedência é
  fixa e vale nas duas pontas — **conteúdo vivo > redirect > 404** —, e a escrita **apaga** o redirect
  cujo `from_slug` virou slug ativo (`persistRedirect`, `persistCategoryRedirect`). Sem isso a mesma
  URL seria conteúdo e redirect ao mesmo tempo, e a resposta dependeria da ordem da consulta.
- **URL desconhecida não baixa o catálogo.** `useProducts(undefined)` devolve a loja inteira; com a
  categoria na raiz, toda URL errada passaria por ali. `useProducts` tem `enabled`, ligado só quando a
  rota resolve, e slug desconhecido devolve `[]`. O 404 é o `NotFound` do projeto nas duas páginas de
  catálogo — nunca tela branca, nunca a listagem completa.
- **A tag canônica é injetada por JS** (`useCanonical`), e `curl` não a vê: a loja é SPA sem SSR. A
  verificação é partida — `curl -I` prova status e `Location`; a canônica se prova em navegador
  headless. Não é falha escondida, é o método.
- **Conjunto de produtos é CATEGORIA — só ela** (`AD-014`). "Coleção" na loja já é a categoria: a
  `CategoryPage` vem de `categories`, o widget da home se chama "Coleções" e o 404 diz "Coleção não
  encontrada". A tabela `collections` **nunca existiu em migration nenhuma** (`PGRST205`), o hook
  engolia o erro e a tela mostrava grade vazia para sempre. **Não recriar.**

### A rolagem ao trocar de página — `app/ScrollToTop.tsx`

Numa SPA o documento **não recarrega**: o `pushState` troca o conteúdo e o navegador mantém a posição
de rolagem em que a pessoa estava. Sem isto, quem clicava num produto no meio de uma categoria longa
aterrissava no meio da página do produto — sem foto, sem preço, sem nome. É pior no celular, que é
~90% dos acessos, porque a viewport curta esconde qualquer referência de onde se está.

O componente é montado uma vez em `App.tsx`, **dentro do `BrowserRouter` e fora das `Routes`** — no
`StoreLayout` ele deixaria o checkout e o 404 de fora, que vivem fora do layout. `useLayoutEffect`,
não `useEffect`: corrigir depois da pintura é um flash visível justamente no aparelho lento.

**As três coisas que ele NÃO faz são a parte que importa**, porque cada uma seria uma regressão:

- **Botão voltar (`POP`) não rola.** Restaurar a posição de uma entrada de histórico é do navegador
  (`history.scrollRestoration === 'auto'`), e ele já faz. Rolar aqui devolveria a cliente ao começo da
  categoria toda vez que ela voltasse de um produto — o gesto exato de quem está garimpando.
- **Mudança só de query string não rola.** A `SearchPage` reescreve `?q=` a cada tecla
  (`setParams(..., { replace: true })`), e um pulo por caractere é pior que o defeito original. O
  gatilho é o **destino** (`pathname` + `hash`), guardado num `ref` — sem ele, o primeiro `replace` da
  busca troca o `navigationType` de `POP` para `REPLACE`, o efeito reroda e a página salta sem que
  endereço nenhum tenha mudado.
- **Âncora de outra página vai até o alvo, não ao topo.** Os `<a href="#...">` do guia de material são
  do mesmo documento e o navegador os resolve sozinho (âncora não dispara `popstate`, então o router
  nem enxerga o clique). O caso **sem dono nenhum** é o `Link to="/politicas#trocas"` do rodapé: troca
  de página, e aí ninguém rola até o fragmento. Com alvo existente vai até ele; **sem alvo, topo**.
  - **E hoje os três `#` do rodapé não casam com `id` nenhum**: `PoliciesPage` não tem um `id`
    sequer, então `#trocas`, `#termos` e `#privacidade` caem no topo da política. É melhor que o meio
    da página, mas continua sendo âncora morta — e `#termos` nem tem seção correspondente, então
    consertar exige decisão de conteúdo, não `id`.

`scrollToTop.test.tsx` (`app/__tests__`) mede os seis casos navegando de verdade, e carrega a guarda
de que o componente está **montado** — existir sem ninguém montar passaria em build, `tsc` e em todos
os outros testes. **jsdom devolve 0 para toda medida de layout e não implementa rolagem**: o que se
assere é a chamada, nunca a posição. A prova de que a página abre no topo é de navegador, em 390.

## Sitemap — `/sitemap.xml` (feature `33`, `AD-022`)

**É servido ao vivo por uma edge function** (`supabase/functions/sitemap`), exposta por `rewrite` do
`vercel.json`. Produto, categoria ou página cadastrada no painel entra na **requisição seguinte** —
não há artefato de build para envelhecer, e é por isso que a saída "gerar no build" foi recusada: a
curadoria da Adri acontece no painel, que não faz deploy.

- **A regra é pura e mora em `@estrelinha/core/sitemap`** (`sitemapUrls`, `renderSitemapXml`,
  `originRefusal`). A function é wiring. Quem monta a URL é `productPath` e `categoryHref` —
  **jamais** concatenação local: `categoryHref` é a **mesma** função que `resolveCategoryRoute` usa
  para declarar a canônica da página, então sitemap e `<link rel="canonical">` não podem divergir.
- **A function lê com a chave PUBLICÁVEL, não com service role** — é a única diferença deliberada
  em relação à `google-feed`. Com ela, a visibilidade do sitemap **é** a RLS (`is_active`/`active`);
  com service role seria preciso repetir os dois predicados num `.eq()`, e essa segunda escrita
  divergiria da primeira sem quebrar nada.
- **Todo caminho degradado é 5xx sem corpo de sitemap**: leitura truncada (o teto de 1.000 do
  PostgREST, via `readAllPages`), zero produtos, ou origem ausente/malformada. Um sitemap parcial não
  parece parcial — **parece uma loja menor**, e o rastreador acredita.
- **O `Content-Type` de `/sitemap.xml` é reimposto no `vercel.json`, e isso é CARGA.** Medido em
  2026-08-29: a function responde `application/xml; charset=utf-8` e o gateway `*.supabase.co`
  entrega **`text/plain`**, com `nosniff`, e o `Cache-Control` intacto — assinatura idêntica à do
  `BUG-20260829`. Não é específico de `text/html`. Sem o header, a rota devolve 200 com XML correto
  e entrega inutilizável.
- **A linha `Sitemap:` do `robots.txt` é o SEGUNDO dono da origem**, e foi assumido de propósito. O
  primeiro é o secret `STORE_PUBLIC_URL`. Servir o `robots.txt` pela function daria um dono só e foi
  **recusado por assimetria de dano**: `robots.txt` em 5xx faz o Google parar de rastrear o site
  inteiro, e sitemap em 5xx custa uma releitura. A contenção é dupla — `robotsSource.test.ts` fixa a
  forma da linha, e `sitemap-check.yml` confere todo dia que o **host** dela é o host que serve.
  - **No cutover de domínio, três coisas mudam juntas**: o secret `STORE_PUBLIC_URL`, a linha do
    `robots.txt` e a variável `STORE_PUBLIC_URL` do workflow. Trocar só uma apaga a descoberta em
    silêncio — o Google **ignora** referência de sitemap entre domínios.
- **Rota nova precisa ser classificada.** `SITEMAP_STATIC_PATHS` e `NON_INDEXABLE_PATHS`
  (`@estrelinha/core/routes`) mais as dinâmicas e as legadas têm de cobrir o `App.tsx` inteiro, nas
  duas direções (`sitemapRoutes.test.ts`). Sem isso a próxima página pública nasceria fora do sitemap
  por esquecimento, e nada quebraria.
- **A prova de que está de pé nunca é o status code** (`AD-021`): é o `Content-Type` **entregue**, o
  documento parseando e a contagem batendo o catálogo.
  ```bash
  curl -sD - -o /tmp/s.xml <origem>/sitemap.xml | grep -i content-type   # tem de conter "xml"
  grep -c '<loc>' /tmp/s.xml                                             # 719 em 2026-08-29
  curl -s <origem>/robots.txt | grep -ci '^Sitemap:'                     # exatamente 1
  ```

## A listagem de categoria

A `CategoryPage` **filtra, ordena e conta no cliente**: `useProducts(slug)` traz a categoria inteira
(com roll-up da descendência) e `priceBounds`, `collectTags` e o "N produtos" do cabeçalho leem a
coleção toda. Quem pagina é a **janela** (`shared/lib/useInfiniteWindow`), não a consulta.

- **A rolagem infinita corta DOM, não rede.** Uma coleção de 508 peças montava 508 `ProductCard` de
  uma vez, num público que é ~90% celular; agora abre `PRODUCTS_PER_PAGE` (24) por vez. **A consulta
  não mudou**: continua trazendo a categoria toda e continua presa ao teto de 1.000 linhas do
  PostgREST (`BL-008`). Paginar no servidor exigiria mover filtro e ordenação para lá junto — senão a
  faixa de preço passa a descrever só as páginas baixadas e "menor preço" ordena um pedaço.
- **A chave da janela é `string`, e isso é cicatriz.** A primeira versão comparava a IDENTIDADE do
  array de `visible`. Funciona enquanto o `data` do React Query for referencialmente estável e
  **explode em "Too many re-renders"** quando não for — `routing.test.tsx` usa
  `useProducts: () => ({ data: [] })` e um literal ali derrubava a rota inteira. A reancoragem é
  `setState` durante o render (mesmo padrão do `anchor`), então régua de identidade é laço infinito
  esperando um consumidor descuidado.
- **A sentinela carrega, o botão existe mesmo assim.** `IntersectionObserver` com `rootMargin` de
  600px abre a leva antes de a cliente chegar nela; o `<button>` "Carregar mais joias" é o caminho de
  teclado e o que sobra onde não há a API. Medido em 390×844: 24 → 96 → 164 em duas rolagens.
  - **O observer é RECRIADO a cada leva** (`count` nas dependências do efeito). Ele avisa em
    *transição*, e numa tela alta a sentinela pode seguir visível depois de acrescentar 24 cards — sem
    recriar, a lista pararia no meio com a sentinela parada na frente da cliente.
- **A grade é `md:grid-cols-3 lg:grid-cols-4`, e o `lg` não é preguiça.** A sidebar come 260px + 32 de
  gap; em `md` (container de 768) sobram 444px, e quatro colunas dariam cards de 96px. Medido em
  navegador: **224px em 1440**, **160px em 1024**, **134,7px em 768** (três colunas).
- **A grade tem UM dono** (`gridClass` na página), porque duas superfícies a desenham: os cards e o
  esqueleto. String repetida faria o esqueleto anunciar uma grade que o conteúdo não usa.
- **O esqueleto (`ProductCardSkeleton`) espelha a ALTURA do card, não o conteúdo** — medido em
  navegador, 431px dos dois lados, salto zero. As medidas são uma segunda escrita das do
  `ProductCard` e **nenhum teste de componente pega a divergência**: jsdom devolve 0 para toda medida
  de layout. Ao mexer na tipografia do card, meça os dois de novo.
- **Carregando é o TERCEIRO estado da listagem**, ao lado de vazio e de falha. Até aqui a página
  dizia "Nenhuma joia com esses filtros" durante a primeira carga, mandando a cliente mexer em filtro
  que ela não tocou — mesma família do `BUG-20260809`, que já tinha separado vazio de falha. O
  cabeçalho também não afirma "0 produtos" enquanto carrega.
- **`isLoading`, nunca `isPending`.** Com o interruptor de `URL-04` desligado a consulta fica pendente
  para sempre, e o esqueleto pulsaria embaixo da 404 até a cliente sair da página.
- **Sabido e em aberto**: enquanto carrega não há como saber se a coleção tem universos, então a
  faixa de chips aparece só depois — a grade desce ~48px nesse momento. Reservar a faixa trocaria
  esse salto por outro nas coleções sem tag.

## A Home é dado (feature `24`)

`home_sections` + `home_section_items` guardam quais blocos existem, em que ordem, com que texto, com
que arte e com que limite. A `HomePage` encolheu para **hook → resolve → render** e **não conhece
seção nenhuma**: quem caminha a lista é o `HomeRenderer`, por um registro `tipo → componente`. Quem
edita é `/admin/home` (ver [`../backoffice/CLAUDE.md`](../backoffice/CLAUDE.md)).

- **A virada não mudou um pixel, e isso é medido.** `homeComposition.test.tsx` congelou a Home antiga
  pelo **DOM renderizado** — sequência, literais, limites, as duas cores do título — **antes** de
  qualquer refatoração, e a regra do gate é **"não perde asserção, só ganha"**. É o único jeito de a
  invariante ser verificável em vez de opinável: build, `tsc` e teste de componente passam todos com a
  home de cara trocada.
- **Erro de leitura cai em `DEFAULT_HOME_COMPOSITION`, nunca em página em branco.** A composição de
  hoje existe como dado em `@estrelinha/core/home` e é ao mesmo tempo a **semente** da migration e o
  **piso** do hook. Lista vazia cai no mesmo piso.
- **A vaga que sobra fica VAZIA.** Escolhida que saiu do ar é pulada e **não** é substituída pela
  derivação: entraria na vitrine algo que a dona não escolheu, justamente na seção onde ela pediu para
  escolher. A loja **pula**, o painel **avisa**.
- **Só RAIZ vira fileira.** `useProducts(slug)` faz roll-up da descendência, então pai e filha na
  mesma página mostrariam os mesmos produtos duas vezes.
- **A mesma arte não aparece duas vezes**: a fileira abre com o banner da própria categoria, e quem
  virou fileira sai da grade (`exclude`) — conteúdo tem prioridade sobre campanha. Com a grade vazia
  ela some inteira, e isso é o certo.
- **Todo número da faixa de vantagens sai das settings**, nunca do JSX. A `MarqueeBar` que ela
  substituiu prometia "Pix com 5% OFF" e "Parcele em 12×" em texto fixo enquanto `max_installments` já
  era 6: a home dizia uma coisa e o caixa cobrava outra, sem nada acusar.
- **Nenhum tipo de contagem regressiva nem de prova social entra no catálogo, e a ausência é
  asserida** (`homeSections.test.ts`). Os dois saíram na feature 20 por decisão ética, e um catálogo
  genérico de blocos é exatamente a porta por onde voltariam — com a dona clicando, sem ninguém
  decidir nada.
- **O hero é indelével**: sem controle de desligar na lista **e** com trigger na migration.
- `widgets/category-grid` **continua no repositório mas não é montado**: a grade de tiles saiu da home
  quando a grade de banners tomou o lugar dela no board. Os blocos `product_carousel` e `category_grid`
  estão no catálogo **sem renderer**, e o renderizador os pula sem quebrar a página.

### Modo prévia (feature `25`)

O painel carrega `<loja>/?preview=1` num iframe e manda o rascunho não salvo por `postMessage`. **A
Home tem um desenho só, e ele mora aqui.**

- **O contrato tem UM dono: `@estrelinha/core/home/preview.ts`** — quatro mensagens (`ready`, `draft`,
  `highlight`, `select`), `isPreviewWindow`, `parsePreviewMessage`, `previewScale`.
- **O modo prévia exige `?preview=1` E estar dentro de um iframe.** O parâmetro sozinho não basta: ele
  é adivinhável e viraliza por link compartilhado, e uma cliente cairia numa página esperando uma
  mensagem que nunca chega.
- **A loja só DESENHA, então basta ser `window.parent`** — a assimetria com o painel (que **age**, e
  por isso exige origem exata) é a regra, não descuido.
- **Em modo prévia a consulta é DESLIGADA (`enabled: false`), não filtrada depois.** Uma leitura viva
  em paralelo daria à página duas fontes, e a do banco chegaria depois — sobrescrevendo o que a dona
  está digitando. Pelo mesmo motivo `sections` começa `[]` e **não** cai em
  `DEFAULT_HOME_COMPOSITION`: o piso existe para **erro de leitura**, e ali não há leitura.
- **Clique na prévia não navega, seleciona.** Captura (não bolha — o `<Link>` navega no handler dele),
  `preventDefault`, e o id do bloco volta como `select`.
- **O `AbandonedCartTracker` não é montado em modo prévia**: a dona conferindo a vitrine dispararia
  rastreio de uma sessão que não é de cliente nenhuma.
- **O invólucro `data-home-section-id` só existe em modo prévia.** Em modo normal cada seção segue
  saindo num `Fragment`, porque `homeComposition.test.tsx` mede o DOM renderizado — e um invólucro por
  seção mudaria a árvore sem mudar um estilo. `HomeRendererPreview.test.tsx` guarda os dois modos.

## Página do produto

- **Quem compra no celular é a barra fixa.** O CTA da coluna de informação é `hidden md:flex` e o
  `widgets/product-buy-bar` é `md:hidden`: **nunca os dois**. O estado de compra é um só,
  `entities/product/model/useProductPurchase`, montado pela `ProductPage` e passado às duas.
- **A descrição é HTML, e ela mora no acordeão** (feature `27`). Medido: 679 dos 680 produtos têm
  descrição e **100% delas trazem tag** (`li`, `p`, `strong`, `h3`, `br`, `ul`, `h2` — e **zero
  atributo**), mediana de 2.271 caracteres. Até a `27` a loja imprimia o campo como texto puro: a
  cliente lia `Cora&ccedil;&otilde;es` na tela.
  - **Render passa por `shared/lib/sanitizeHtml`, sempre.** Allowlist por **árvore** (`DOMParser` em
    `text/html`, que não executa script nem baixa recurso), **nunca regex sobre HTML**. Tag fora da
    lista **desembrulha** preservando o texto; `script`/`style`/`iframe`/`object`/`embed`/`noscript`/
    `template` somem **com o conteúdo** — desembrulhar um `<script>` imprimiria o código na tela.
    Atributo zero, exceto `href` de `<a>` validado por `new URL` (nunca `startsWith`, que
    `java&#9;script:` engana), e o `<a>` sobrevivente ganha `rel="noopener noreferrer"`.
  - **Quem monta o `dangerouslySetInnerHTML` é quem sanitiza** (`ProductDescription`), para o
    componente ser seguro venha de onde vier a chamada. O acordeão chama a **mesma** função só para
    perguntar "sobra alguma coisa?" — a decisão de montar a seção olha o **sanitizado**, não o campo
    cru, senão uma descrição só com `<script>` abriria uma seção em branco.
  - **`h1`/`h2`/`h3` viram `h4`**: o `AccordionPrimitive.Header` do shadcn já renderiza `<h3>`, e 1.358
    descrições abrem com um `<h2>` que repete o nome do produto — que a página já tem como `<h1>`.
- **A variação com foto é regra medida, não lista de nomes de eixo** (feature `27`). `axisPhotos`
  qualifica um eixo quando **≥2 valores têm foto E as fotos presentes são todas distintas entre si**;
  eixo reprovado continua em pílula com o nome.
  - **A segunda condição é o que faz a regra dizer a verdade.** No catálogo real (686 eixos com ≥2
    valores) ela aceita **540** — `Cor` (352), `Tipos de elo` e suas quatro grafias (150), `Modelo`
    (27) — e recusa exatamente os eixos onde **todos os valores apontam para a mesma foto**:
    `Com gravação` (36), `Com Base` (20), `Letra` (11) e 29 dos 32 `Tamanho`. Quatro vagas idênticas
    diriam à cliente que a escolha não muda a peça.
  - **O nome do valor vai para o CABEÇALHO** (`Cor: Aço Inoxidável Folheado a Ouro Rose`), nunca sob a
    vaga: o rótulo tem mediana 15 e **máximo 40** caracteres, que não cabe sob 56px em 390 de viewport.
    Cada vaga leva `aria-label` com o valor.
  - **Foto só em `surface="page"`.** O card tem a placa de cor da feature 26 (`colorPreview`, restrita
    a `Cor`, com contador de overflow) e o sheet é painel estreito — outra superfície, outra regra.
    `colorPreview` **continua existindo e intocado**; `axisPhotos` não o substitui.
  - Os eixos saem em **chips** (`VariantPicker surface="page"`), não em `<select>`.
- **`?variant=` abre a variação anunciada** (feature `30`). Todo link indexado pelo Google Shopping
  carrega o parâmetro, e ignorá-lo levaria a cliente a uma página mostrando outra peça que não a do
  anúncio. A resolução é `entities/product/lib/variantSelection`, e o parâmetro **não acrescenta nó ao
  DOM** — é seleção inicial, não UI nova.

### Perguntas frequentes (feature `28`)

Até a `28` a seção era um `<dl>` cravado com **duas perguntas genéricas**, iguais nos 691 produtos,
enquanto as de verdade — **3.476 pares em 687 produtos (99,4%)** — estavam presas dentro de
`products.description`. Agora são `faqs` + `product_faqs`.

- **`resolveProductFaqs` é o leitor único**: ordena por `position` e **pula** vínculo cuja entrada saiu
  do ar. Ninguém compara a coluna crua.
- **A vaga que sobra fica VAZIA.** `product_faqs` é lido publicamente **sem condição**, de propósito:
  assim o vínculo para entrada inativa chega ao navegador com `faq: null` e o ramo de "pular" roda em
  produção. Fechá-lo na policy faria o código existir sem nada exercitá-lo.
- **A descrição para de exibir o bloco que virou cadastro** — `ProductDescription` chama
  `sanitizeHtml(stripFaqBlock(html))`. A descrição **não** é alterada no banco (decisão do usuário:
  nada é destruído, e a origem na Nuvemshop segue intacta). `faqNoDuplicate.test.tsx` mede as duas
  superfícies contra uma descrição **real** do catálogo.
- **A resposta é TEXTO, nunca HTML** — medido: **0 de 3.476** respostas contêm tag. Nenhum
  `dangerouslySetInnerHTML` na seção.

## Material afetivo (feature `22`)

Medido no catálogo real: **zero** das 3.356 variações tem eixo de material — ele está no **nome** (169
dizem "leite", 127 "cinzas", 85 "cabelo", 51 "coto"), e existe peça que exige **dois**. Pedir que a
cliente escolha seria pedir que repita o que já escolheu ao clicar no produto.

| `products.requires_material` | `material_kinds` | o que a loja diz |
| --- | --- | --- |
| `false` / `null` | — | nada; a compra segue igual |
| `true` | `cabelo`, `coto_umbilical` | "você envia cabelo e coto umbilical", com link para a ficha |
| `true` | **vazia** | "o material é combinado com a gente" — e o pedido **entra na fila igual** |

- **Lista vazia NUNCA se lê como "não exige"**: é a peça de material livre, e quem a renderiza usa
  `materialSummary`, que devolve **`a combinar`**. Lista vazia em tela se lê como "nenhum material",
  que é o oposto.
- **Todo consumidor passa por `requiresMaterial()`**, onde `null` é `false`. `null` é o terceiro
  estado e significa "nunca decidido" — é o marcador que deixa o importador semear sem apagar a
  curadoria da dona.
- **Gravação é VARIAÇÃO, não coluna nova**: o eixo `Com gravação` já existe em 35 produtos (626
  variações) e **33 deles cobram a mais** (mediana R$ 42). O que a `22` acrescentou foi o **texto** e o
  **limite por produto** (`engraving_max_chars`, `null` cai em 20 — nunca "sem limite"). O campo deriva
  da **variação escolhida**, não do produto: trocar para `Não` **limpa** o texto.
- **O texto de gravação compõe a chave da linha do carrinho.** Duas unidades da mesma variação com
  gravações diferentes são **duas linhas** — colapsá-las mandaria um nome só para a bancada. Mesma
  armadilha que o `variantId` já custou à loja anterior, em duas telas.

## O guia de material — `/como-enviar-seu-material-de-dna` (feature `31`)

Desenho dos artboards `5MC-0` (desktop) e `6AU-0` (mobile). A página resolve **três** coisas —
canônica, viewport e qual vídeo está aberto — e o resto é o slice `widgets/material-guide`: conteúdo
em `model/guide.ts`, desenho em 16 componentes.

> Esta feature **não tem spec** em `.specs/features/`. O número segue consumido; a próxima é a `32`.

- **A âncora de todo `MaterialKind` é contrato, e tem guarda.** A página do produto monta `#cinzas`
  desde a `22`, e âncora quebrada **não dá 404**: a página abre, não rola, e ninguém descobre.
  `MATERIAIS_SEM_ANCORA` reprova a falta **antes** do render, e um teste confere que todo atalho do
  seletor aponta para um `id` que existe. `flores` e `outro` ganharam cartão por isso — o board não os
  cobre, e sem eles dois links já publicados cairiam no vazio.
- **`model/fichas.ts` foi APAGADO.** Era a segunda escrita do mesmo guia.
- **Três desvios do board, todos por contraste medido.** O selo numerado dos passos sai `ink` sobre
  ouro (4,78:1) e não creme (2,52:1); os algarismos do preparo em casa saem `on-primary` e não ouro
  (3,26:1); e o versalete de cada seção sai `ink-soft`, com o ouro no **fio** ao lado. A exceção
  declarada são os algarismos `01`..`04` dos passos, que passam por serem texto **grande** (3,17:1
  contra a régua de 3:1). Tudo em `accentText.test.ts`.
- **O iframe do YouTube só existe depois do clique**, no domínio `youtube-nocookie`. Cinco players
  embutidos carregariam o script do YouTube em quem só passou pela página; e o `Dialog` do Radix
  desmonta o conteúdo ao fechar, o que também **para o som**.
- **A capa é `hqdefault` e `object-cover` sozinho basta.** São 480×360 com o quadro 16:9 no meio:
  exatamente 45px de tarja em cima e 45 embaixo, que cobrir um container 16:9 remove. Um `scale` por
  cima não removia tarja nenhuma e **cortava as laterais**, comendo a última palavra do título que a
  Adri escreveu na arte. Pelo mesmo motivo o disco de play fica no **canto**, não no centro.
- **A duração dos vídeos está vazia de propósito.** O board mostra `1:48`, `2:05` e `1:32`, mas
  aqueles são vagas de desenho — os vídeos reais são outros e o repositório não tem como medi-los.
  `VideoDePreparo.duracao` é opcional e a legenda acende sozinha quando for preenchida.
- **As fichas ricas são acordeão no celular e abertas no computador**, decidido UMA vez pela página
  (`useCompactViewport`) e distribuído. O hook usa `useSyncExternalStore`, e não `useState` +
  `useEffect`: o par tradicional começa em `false` e descobre a verdade no efeito, o que no celular
  faria as fichas nascerem abertas e **colapsarem na frente da cliente**.
- **`MaterialAddress` sobreviveu ao redesenho.** O board não o desenha — nele o endereço chega por
  WhatsApp depois do pagamento —, mas o componente lê `store_settings` e **não renderiza endereço pela
  metade**. Apagá-lo trocaria informação que a loja já sabe dar por informação que a cliente teria de
  pedir.

## Página Sobre (feature `29`)

Quatro faixas de largura cheia, nesta ordem e com estas cores dos artboards: `1 Hero`
(`ground-deep`), `2 A história` (`ground`), `3 O nome` (`primary`), `4 Fecho e convite`
(`ground-deep`). Coluna de no máximo **1200px** com **20px** de respiro lateral no mobile; a faixa
`2 A história` limita o texto a **720px** no desktop.

- **A vaga da foto renderiza um palco declarado quando não há foto** (o símbolo da marca sobre
  `serenity`) — nunca uma caixa escrita "FOTO", que é notação de desenho e não de loja. **4:3 paisagem
  nos dois tamanhos**, porque a fotografia é **um** arquivo: duas proporções pediriam dois recortes.
- **A legenda muda de coluna, não de texto**, e existe **uma** ocorrência dela no DOM nos dois casos.
- A trilha (breadcrumb) mora na página e não em `shared/ui`: é a primeira da loja, e componente
  compartilhado com um consumidor só é abstração antes da hora.

## Carrinho, chrome e checkout

- **O carrinho é a gaveta, e só ela.** `widgets/cart-drawer` é a única superfície de sacola. Todo
  caminho que levava a `/carrinho` **abre a gaveta**: header, aba da `MobileNav`, o "Ver carrinho" do
  toast, e o "Voltar ao carrinho" do checkout. A rota `/carrinho` sobrevive como **atalho** — recupera
  o `?recover=<id>` dos e-mails de carrinho abandonado, abre a gaveta e redireciona para `/`. Quem
  abre é o `cartUiStore` (Zustand **efêmero**, em `entities/cart` — fora do `cartStore`, que é
  persistido, porque um booleano de UI ali reabriria a gaveta na visita seguinte). **Não recriar uma
  página de carrinho**: duas superfícies para a mesma lista significavam dois lugares para consertar
  cada regra — foi assim que a remoção de item com variação ficou quebrada nas duas.
- **Uma barra de rodapé por vez, e a moldura do topo se recolhe** (`shared/lib/storeChrome`,
  `shared/lib/useScrollDirection`). Header + barra de compra + `MobileNav` empilhados somavam
  **197px — 30% de um iPhone SE**.
  - **`ownsBottomBar(pathname)`** decide quem ocupa o rodapé. Onde a página traz a própria barra (hoje
    só `/produto/*`), o `StoreLayout` **não monta o `MobileNav`**. É um **predicado puro
    compartilhado**, e não um `useLocation` dentro do `MobileNav`, porque a resposta tem consequência
    em dois arquivos.
  - **As duas barras têm a mesma altura** (`BOTTOM_BAR_H`), e é isso que deixa a reserva de espaço ser
    incondicional. Essa reserva fica **depois do `<Footer/>`**, não como `pb` do `main`: reservar antes
    dele deixava a última faixa do rodapé atrás da barra.
  - **O header se recolhe no scroll para baixo e volta no scroll para cima**, só no mobile
    (`md:translate-y-0` trava o desktop). `sticky` + `translate`, nunca `fixed` nem desmontar: assim
    ele segue ocupando os 64px no fluxo e esconder/mostrar **não causa reflow**. **A barra de compra
    nunca se esconde** — o CTA é a finalidade da página.
  - Cuidado ao pôr `position: fixed` dentro do `<header>`: ele carrega `transform`, que cria
    containing block — o elemento passaria a se medir pelo header, não pela viewport. É por isso que
    `MobileMenu` mora no `StoreLayout`.
- **Checkout é one-page**: três blocos numa única tela — `1 Contato`, `2 Entrega`, `3 Pagamento` — com
  resumo persistente e **um único CTA**. Não existe passo "Revisão". As regras de completude, bloco
  aberto e invalidação do pedido são domínio puro em `@estrelinha/core/checkout` (`resolveBlocks`,
  `isOrderStale`); o rascunho + o `order_id` em curso vivem no `checkoutStore` (Zustand em
  **`sessionStorage`**). A rota `/checkout` fica **fora do `StoreLayout`** (header próprio + CTA fixo
  no rodapé) e por isso monta o `AuthOverlay` por conta própria. A confirmação é a rota `/pedido/:id`
  (lê o pedido do banco), nunca estado interno da página — assim sobrevive ao reload; o carrinho e o
  cupom são limpos **só** na aprovação.
- **Preço, desconto e promoção são de `@estrelinha/core`, não daqui.** A loja **exibe**; quem calcula
  é `resolveOrderPricing`, a mesma função que a edge function do Mercado Pago chama. Ver
  [`../../packages/core/CLAUDE.md`](../../packages/core/CLAUDE.md).

## Frete grátis — um interruptor e um dono só (feature `37`)

**A loja não pratica frete grátis por padrão.** `store_settings.shipping.free_shipping_enabled` nasce
`false`, e ligar é ato explícito da dona em `/admin/configuracoes` → aba Frete. **Isso é passo de
operação, não detalhe de configuração**: sem ele a loja fica sem frete grátis indefinidamente e
ninguém é avisado.

- **Ninguém lê `free_shipping_threshold`.** Quem responde "esta loja pratica frete grátis, e falta
  quanto?" é `freeShippingState` (`@estrelinha/core/shipping`), alcançado pelas telas por
  **`useFreeShipping(subtotal)`**. `freeShippingSingleOwner.test.ts` derruba a suíte se alguma tela
  voltar a ler o campo cru — o allowlist tem **dois** arquivos e está escrito literalmente lá.
- **A invariante que carrega tudo é `active === false ⇒ reached === false`.** As quatro superfícies
  que zeram frete perguntam "atingiu?"; se `reached` pudesse ser verdadeiro com a funcionalidade
  desligada, o defeito volta pela porta dos fundos, o texto some da tela e o dinheiro continua saindo.
- **O que custava dinheiro, e por que nada gritava**: sete superfícies liam o mesmo campo e se
  dividiam em dois grupos. Com a faixa em zero, três escondiam o texto (`threshold > 0`) e quatro
  **zeravam o frete** (`subtotal >= threshold`, sempre verdadeiro contra zero). Zerar o campo no
  painel — o caminho óbvio para desligar — escondia o anúncio e liberava frete grátis para todo
  mundo no caixa. Build, `tsc` e teste de componente passavam com as duas leituras convivendo.
- **Cupom `free_shipping` NÃO é governado pelo interruptor** (decisão do usuário). Ele é ato
  explícito da dona em `/admin/cupons`, vive em `resolveOrderPricing`, e **nenhuma linha de
  `packages/core/src/payment/**` nem de `supabase/functions/**` foi tocada por esta feature.** Com o
  interruptor desligado e um cupom aplicado, o frete é zero e nenhuma copy de faixa aparece.
- **O que some quando desliga**: a segunda linha do item de envio da `TrustBar` vira `para todo o
  Brasil` (o item **não** some — enviar para o Brasil é verdade dos dois jeitos), o selo da
  `ProductTrustBadges`, o parágrafo da `PoliciesPage`, o item do `AuthOverlay`, a faixa de progresso
  **e a `CrossSell`** da gaveta, e a faixa do `OrderSummary` com o sufixo ` · frete grátis` da barra
  mobile.
- **`freeShippingProgress` e `FreeShippingBar` foram APAGADOS.** A primeira era a regra escrita uma
  segunda vez, com o caso de borda invertido; o segundo era um componente **sem consumidor nenhum**
  que dividia por `threshold` sem guarda. Os dois nomes são recusados pelo guarda.
- **`cartStore` não pode chamar hook** (zustand, fora do React), então lê `runtimeFreeShippingConfig()`
  de `@estrelinha/core/constants`, hidratado pelo `RuntimeSettingsLoader` — mas chama a **mesma**
  `freeShippingState`. `RuntimeSettingsLoader` hidrata os **três** campos juntos: hidratar só a faixa
  deixaria uma janela com o interruptor velho e a faixa nova.
- **Guarda de comentário: a régua lê CÓDIGO, não prosa.** `freeShippingSingleOwner` remove comentários
  antes de varrer, e **normaliza CRLF primeiro** — em JavaScript `.` não casa `\r`, então num
  checkout Windows o stripper de linha ficava inerte e o guarda acusava o comentário que explica o
  defeito. O conserto "óbvio" seria apagar o comentário em vez de consertar o código.

## Menu (consumo)

- A regra vive em `@estrelinha/core/menu` (`menuEntries`, `menuSlotRefusal`, `resolvePromo`,
  `descendantIds`, `bySortOrder`). Foi ter a regra em cada tela que produziu o bug original: o
  `Header` fazia `.slice(0, 4)` de uma lista chapada e a barra do topo mostrava o contêiner de tudo
  mais uma filha que empatou em `sort_order = 0`.
- **`browseCategories`** (grade da home, rodapé) **pula o guarda-chuva**: uma raiz sozinha é
  contêiner, não escolha. Não confundir com `pickTrendingCategories`, que é deliberadamente **folha**.
- **`useProducts(slug)` faz roll-up da descendência** (`descendantIds`): sem isso o "Ver todos →" do
  menu levaria a uma página sem os produtos que o menu acabou de listar.

## Auth (loja)

Overlay único (`features/auth`) com steps entry → code → name, mais password, reset → reset-code →
new-password. Login por **código de 6 dígitos** (`signInWithOtp`/`verifyOtp`) e **Google**
(`signInWithOAuth`). Reset de senha também é por código (`verifyOtp` com `type: 'recovery'` +
`updateUser({ password })`) — **não por link**, para não depender do `code_verifier` do PKCE ficar no
mesmo navegador. A configuração dos templates é versionada: ver
[`../../supabase/CLAUDE.md`](../../supabase/CLAUDE.md).

## Quem pode enquadrar a loja (`BL-013`, fechado em 2026-08-16)

A prévia real de `/admin/home` carrega a loja num `<iframe>`, então a loja precisa **autorizar** o
painel. Quem faz isso é o `vercel.json`:

```
Content-Security-Policy: frame-ancestors 'self' https://umaestrelinha-backoffice.vercel.app
```

**`X-Frame-Options: SAMEORIGIN` foi substituído, não acompanhado.** Aquele header não tem sintaxe para
autorizar outra origem — `ALLOW-FROM` foi removido de todos os navegadores modernos e é ignorado em
silêncio. Manter os dois deixaria uma política com **dois donos** e um caminho de falha em que o mais
fraco vence, que é justamente o quadro branco que este item existe para eliminar.

- **A origem é EXATA, e curinga é recusado por teste.** `https://*.vercel.app` faria os deploys de
  preview do painel funcionarem — e liberaria **qualquer** projeto hospedado em vercel.app a embutir a
  loja, inclusive o de um terceiro. É vetor de clickjacking sobre o checkout.
- **Trocar o domínio do painel exige mexer em dois lugares**: o `vercel.json` e o literal de
  `vercelRedirects.test.ts`, que guarda a origem escrita por extenso — a régua nunca pode ser o objeto
  medido.
- Em dev funciona sem nada: o Vite não manda header nenhum. **O modo de falhar em produção é quadro
  branco sem erro**, porque a recusa é do navegador e não da aplicação.
