# apps/backoffice — o painel da dona

`@estrelinha/backoffice`, Vite na porta **8083**. É onde a Adri trabalha, e **não carrega marca**:
usa os tokens `--estrelinha-admin-*` (roxo/rosa/navy herdado, valores inalterados). Re-skin está fora
de escopo (`C-05`) — o sufixo `admin` existe justamente para deixar claro que aquele namespace não é
a identidade da loja. Leia [`../../CLAUDE.md`](../../CLAUDE.md) antes deste arquivo.

**As rotas mantêm o prefixo `/admin/*`** (ex.: `/admin/produtos`). Simplificar para a raiz é trabalho
futuro — exigiria reescrever a navegação interna.

**Auth**: `RequireAdmin` (de `@estrelinha/auth`), com `loginPath` apontando para `/admin/login`.

## A sidebar tem quatro eixos, ordenados por FILA

Não pelo ciclo de vida do produto:

| Grupo | Itens |
| --- | --- |
| *(sem cabeçalho)* | Dashboard |
| **Vendas** | Pedidos · Carrinhos abandonados · Clientes |
| **Descontos** | Cupons · Promoções |
| **Catálogo** | Produtos · Categorias · Perguntas frequentes |
| **Loja** | Home · Menu da loja · Google Shopping |
| *(rodapé)* | Configurações · Usuários do painel · Minha conta |

**O rodapé é o lugar da administração do SISTEMA**, e por isso os dois itens da feature `48` entram
ali e não num dos quatro eixos: ninguém abre o painel de manhã para conferir quem tem acesso. A ordem
vai do mais amplo ao mais pessoal — **a loja → o sistema → eu** —, e `Minha conta` fica encostada em
`Sair`, que é onde se procura o que é da própria pessoa.

**`Vendas` vem primeiro porque é o único eixo que ACUMULA**: pedido esperando envio, carrinho
esfriando, cliente esperando resposta. Cadastrar e curar vitrine são trabalho de quando não há fila —
nada piora enquanto esperam. Numa sidebar de uso diário, o topo pertence ao que cobra. (A ordem
anterior era o ciclo de vida — cadastrar → apresentar → vender. Lê bem num diagrama e mal numa
segunda-feira.)

- **`Loja` é o que a cliente VÊ, `Catálogo` é o que se cadastra.** Enquanto o `Menu da loja` morava em
  `Catálogo`, a vizinhança sugeria que era mais uma coisa a cadastrar.
- Dentro de cada grupo a ordem é **frequência de visita**: Home antes de Menu antes de Google
  Shopping; Produtos antes de Categorias antes de Perguntas.
- **`navGroups` (`widgets/admin-layout/model/navItems.ts`) é a fonte, e as rotas de `app/App.tsx`
  seguem a mesma sequência.** `navItems.test.ts` **lê o `App.tsx` do disco** e compara a ordem textual
  das rotas com a lista — mover um item de grupo sem reordenar as rotas quebra ali.
- **Nem toda rota entra na sidebar**: `/admin/produtos/grade-rapida` e `/admin/home/:sectionId` são
  alcançadas de dentro de outra tela, não são destino de primeiro nível. A segunda exigiria um id em
  código para virar link.

### A coluna é FIXA, e os grupos colapsam

**A sidebar não acompanha a rolagem da página, e isso conserta um defeito medido.** O `aside` era um
filho de flex sem altura declarada, então o `stretch` o esticava até a altura do **documento**:
em `/admin/produtos` (680 produtos, documento de 6.864px numa viewport de 900) o rodapé
`Configurações · Ver Loja · Sair` ficava com o topo em **1.712px** — fora da tela, e sem jeito de
alcançar sem rolar a listagem inteira. Com `sticky top-0 self-start h-screen` ele fica em **748px**,
sempre. Os dois números foram medidos no navegador, na mesma página, trocando só a `className`.

- **`sticky`, não `fixed`, e não `h-screen overflow-hidden` na raiz.** `fixed` tira a coluna do fluxo
  e o conteúdo passaria por baixo dela; prender a rolagem na raiz trocaria a rolagem do body pela do
  `main`, e `100vh` com a barra do navegador do celular é o defeito seguinte. `sticky` prende a
  coluna **sem** mexer no modelo de rolagem da página.
- **`self-start` é obrigatório**: sem ele o `align-items: stretch` do flex desfaz o `h-screen` e a
  sidebar volta a acompanhar o documento — que é exatamente o defeito.
- **O que rola é o `<nav>`, e o rodapé é irmão dele.** `flex-1 min-h-0 overflow-y-auto`: sem o
  `min-h-0`, um filho de flex não encolhe abaixo do próprio conteúdo e a lista empurraria o rodapé
  para fora da coluna em vez de rolar dentro dela.
- **A barra do celular também é `sticky`.** No celular a sidebar **é** aquele botão: se ele rola para
  fora, navegar exige voltar ao topo de uma listagem de 680 linhas.

**Os grupos colapsam porque a lista não cabe**, e isso também é medido: com os quatro abertos, o
`<nav>` pede **820px** e tem **670px** numa viewport de 900 — o grupo `Loja` inteiro fica abaixo da
dobra interna. Em 390×844 sobram 206px de corte. Colapsar dois grupos zera a diferença.

- **O que se guarda é o conjunto COLAPSADO, nunca o expandido** (`estrelinha.admin.nav-collapsed`,
  junto das colunas e visões salvas das listagens). Assim a ausência de valor — primeira visita,
  storage limpo, aba anônima — significa "tudo aberto", que é o comportamento de sempre; e um grupo
  acrescentado depois nasce **visível** em quem já usava o painel.
- **A lista de rótulos colapsáveis sai de `navGroups`, não de uma segunda cópia** — um segundo dono
  dos rótulos faria o grupo renomeado parar de colapsar, em silêncio. `readCollapsed` ainda descarta
  rótulo que não é mais grupo.
- **O Dashboard não colapsa**: sem cabeçalho não há onde clicar, e esconder o ponto de partida não
  teria como se desfazer.
- **Grupo colapsado que contém a tela atual AVISA** (ponto violeta + texto `sr-only`), e **não** se
  abre sozinho. Abrir à força resolveria o sintoma destruindo a escolha de quem colapsou; sem
  aviso nenhum, colapsar `Catálogo` e abrir um produto pelo link de dentro do pedido deixaria a
  sidebar **sem item marcado**, e navegação que não responde "onde estou" lê como quebrada.
- **A régua do aviso é a mesma do item ativo** (`isNavActive`): grupo que se marcasse só na rota
  exata deixaria de avisar justamente nas telas de segundo nível — que são as alcançadas de dentro de
  outra tela, o caso que motivou o aviso.
- **O que o jsdom não mede está travado por leitura do fonte.** `AdminLayout.test.tsx` lê o próprio
  `.tsx` do disco e cobra `sticky`/`top-0`/`h-screen`/`self-start` no `aside`, `min-h-0` no `<nav>` e
  a ausência de `overflow-hidden` na raiz — com **âncora** (a varredura tem de achar os três
  elementos) e **sensor** (a declaração antiga tem de reprovar na mesma régua).
  - **A régua passou a enxergar `className={cn(…)}`** (feature 47), e isso era um **ponto cego real**:
    ela casava só `className="literal"`, então o primeiro refator para `cn()` faria a âncora medir
    **string vazia** e todas as asserções passarem sobre nada — a pior falha possível num teste que
    lê fonte. Três sensores guardam a extensão: a forma dinâmica correta é lida, uma sem os
    invariantes reprova, e um `className` que a régua **não consegue ler** (`{classes}`, template
    string, `style`) devolve vazio e derruba a âncora.

### O modo de foco: `/admin/home` e `/admin/menu` recolhem a navegação (feature 47)

São as duas telas que mostram **a loja ao lado do que se edita**, e nelas a sidebar de 240px é a
coisa menos usada: quem entra em `/admin/home` veio compor a Home, não navegar. Em 1440 elas passam
a ter coluna de edição de **440px** (era 380) e palco de **872** (era 748) — o computador a **81%**
em vez de 69%.

- **Quem decide é `model/focusRoutes.ts`, vizinho de `navItems.ts`**, e casa por `isNavActive` — a
  **mesma** função que marca o item ativo. Duas réguas de "esta rota é aquela" discordariam no dia em
  que uma subrota nova aparecesse (`/admin/home/:sectionId` conta; `/admin/homologacao` não).
  - A alternativa (a página pedir foco por contexto num `useEffect`) foi recusada no design: o layout
    renderiza **antes** do efeito da página, então o trilho apareceria expandido por um quadro e
    recolheria depois — piscada visível a cada navegação.
- **A preferência guarda só o override** (`estrelinha.admin.nav-rail` = `'expandido'`), e recolher de
  volta **apaga a chave**. É `navCollapse` ao contrário e pelo mesmo motivo: guardando o que DIFERE
  do padrão, a ausência de valor significa sempre "siga o padrão da rota" — e no dia em que o padrão
  mudar, ele muda para quem nunca mexeu. **São duas preferências com donos separados**: o trilho não
  lê nem escreve `estrelinha.admin.nav-collapsed`, e há asserção provando que as chaves nem se tocam.
- **O trilho não declara destino nenhum** — a lista é `navGroups` + `footerNavItems`, na ordem delas,
  e a âncora de contagem do teste é **derivada dessa fonte**, nunca escrita à mão: um grupo novo não
  pode passar despercebido. Os cabeçalhos viram separadores de 1px (o grupo perde o rótulo, não
  desaparece), e o rótulo de cada ícone vive no `aria-label` + tooltip.
- **Os 44px do trilho são declarados em classe própria, e `TAP_44` NÃO é importado.** Aquele auxiliar
  mora em `apps/store` e é guardado lá por `touchTarget.test.ts`; trazê-lo para cá criaria um segundo
  dono da medida — que é exatamente o defeito que o guarda existe para impedir. A asserção é por
  **token exato** (`h-11` é substring de `min-h-11`).
- **A largura da coluna de edição NÃO reage ao trilho** (`FOCO-14`). Com a navegação expandida numa
  rota de foco, o palco simplesmente encolhe (em 1440 cai para 688, o computador para ~63% — pior que
  os 69% de antes). É estado transitório e escolhido, e a saída é um clique. Fazer a coluna reagir
  daria **dois donos** da largura: o widget do layout e a página. Há asserção de que
  `AdminHomePage.tsx` não importa nada de `admin-layout`.
- **Fora dessas duas rotas nada muda**, e não existe nem o controle de recolher. Abaixo de `md` também
  não: a navegação continua sendo a gaveta do botão da barra.

## Molde dos formulários

- **Editor é TELA, não modal.** Cupom, promoção e produto se cadastram em rota própria —
  `/admin/{cupons,promocoes,produtos}/novo` e `/:id/editar`. A rota é compartilhável e sobrevive ao
  F5; com modal, recarregar perdia o que estava sendo editado.
  - **A feature `34` estendeu a regra ao que faltava**: `/admin/pedidos/:id` e `/admin/clientes/:id`.
    O pedido era a exceção exatamente onde ela custava mais — o registro mais complexo do painel,
    cinco abas, e nenhuma delas sobrevivia ao F5. `OrderDetailDialog.tsx` e `CustomerDetailDialog.tsx`
    **foram apagados**. As duas rotas **não** entram em `navGroups`: são de segundo nível, mesma
    régua da grade rápida e do editor de seção da Home.
- **Registro que se LÊ tem cabeçalho próprio**: `shared/ui/RecordPageHeader` — trilha, título com os
  **selos em linha**, subtítulo e ações livres. É o do pedido e o da ficha da cliente (feature 34).
  Nem `PageHeader` (das listagens: sem trilha e sem onde pôr selo, o que fazia os selos do pedido
  caírem numa linha solta longe do que qualificam) nem `FormPageHeader` (exige `isDirty`, `saving` e
  `onSave`, e prende o `⌘S` — um registro que se lê não tem save). A trilha é `hidden md:flex`: no
  celular seria um alvo de 16px, e o botão de voltar ao lado, de 44px, leva ao mesmo lugar.
- **A moldura é compartilhada**: `shared/ui/FormPageHeader` (trilha `<grupo> / <listagem> /
  <registro>`, selo `Alterações não salvas`, `Cancelar` + primário com `⌘S`) e o corpo em coluna
  principal + aside de 330. O que diverge é o que **tem** de divergir: cupom tem código, promoção tem
  faixas.
- **`<input type="date">` não é usado** — `shared/ui/DateField` (`Popover` + `Calendar` + `ptBR`) é. O
  nativo é um controle diferente em cada navegador, e no Firefox do Windows não abre calendário
  nenhum. **O vazio diz o que significa** (`Vale desde já` / `Sem fim`), nunca a data de hoje.
- **A tradução dia ⇄ ISO é UMA**, em `shared/lib/dateOnly`. Existiam duas discordantes — iguais em
  fuso negativo, um dia erradas em qualquer fuso positivo.
- **Ao mexer numa tela que grava, prove que ela grava** (`AD-012`). `DbCategory` declarava três
  colunas que o banco não tinha e **toda gravação de categoria falhava com `PGRST204`** — o build não
  checa tipo, o `tsc` achava o código certo (o tipo mentia) e os testes mockavam o client. Probe HTTP
  contra o banco local, não inspeção de tipo.
- **Payload de gravação fica em igualdade EXATA no teste** (`CategoryInspector.test.tsx`,
  `core/product/index.test.ts`). É o que impede campo novo entrar na gravação sem ninguém decidir.
- **O card "Material afetivo" tem UM controle, e a lista "Quais materiais" NÃO volta** (2026-09-11).
  Sobraram o interruptor "Esta peça exige material da cliente" e o limite de gravação. Os dez
  checkboxes saíram junto com o card que a loja mostrava na página do produto: `material_kinds` **diz
  menos que a descrição** (`BL-015`), e a loja parou de anunciá-la.
  - **O interruptor é operação, não texto de vitrine**, e o card diz isso na tela: ligado, o pedido
    pago nasce com `material_status`, entra na fila, aparece no filtro de `/admin/clientes`, ganha a
    cobrança por WhatsApp e sai na folha de separação. Nada disso depende de saber **qual** material —
    é por isso que a lista pôde sair sem levar a fila junto.
  - **A coluna continua gravada e é preservada pelo save.** `useProductForm` ainda a carrega do banco;
    o card **nunca** emite `material_kinds`, e `MaterialCard.test.tsx` assere isso em toda interação —
    emitir `[]` daqui apagaria a curadoria de 689 linhas com o formulário parecendo intocado.

## Descontos

- **Duplicar cupom NÃO grava**: abre `/admin/cupons/novo?from=<id>` com tudo copiado menos o código
  (vazio e focado) e nasce pausado. `coupons.code` é `UNIQUE` **e** é o texto que a cliente digita.
  Duplicar **promoção** grava na hora, porque `promotions.name` é decorativo e não colide.
- **Pausar cupom manda `{ id, active }` e nada mais.** Acrescentar campos reescreveria o cupom com o
  que a listagem tem em cache, que pode estar velho.
- **`Expirado` e `Esgotado` não são a mesma cor** — o remédio de cada um é diferente: esgotado se
  reabre subindo o limite, expirado se prorroga mudando a data. A regra é
  `features/coupon-list/model/couponStatus`, e `!active` vence tudo porque é a única decisão explícita
  da dona.
- **As faixas de promoção são cadastro, não constante de código** — `promotions` + `promotion_tiers`,
  com escopo por `promotion_categories`. O cálculo é de `@estrelinha/core`; ver
  [`../../packages/core/CLAUDE.md`](../../packages/core/CLAUDE.md).

## `/admin/home` — a composição, e a prévia que é a loja

A curadoria inteira mora no banco (`home_sections` + `home_section_items`). O painel arrasta, liga,
desliga e edita; a loja renderiza. Ver [`../store/CLAUDE.md`](../store/CLAUDE.md) para o lado do
desenho.

- **Curadoria é a PRESENÇA de itens, não uma flag.** Ter itens é o override; não ter é a derivação de
  sempre. "Voltar ao automático" é um `delete`, não `mode: 'auto'` — uma flag seria dois donos do
  mesmo dado, e `manual` com zero itens é um estado que a loja não sabe distinguir de `auto`.
- **A vaga que sobra fica VAZIA, e o painel AVISA.** Escolhida que saiu do ar é pulada pela loja; o
  painel mostra "1 das 3 saiu do ar", com a linha marcada. Substituí-la pela derivação poria na
  vitrine algo que a dona não escolheu, justamente na seção onde ela pediu para escolher.
- **Reordenar a Home não mexe em `categories.sort_order`.** Era um dos dois problemas que abriram a
  feature: mudar a vitrine mexia na barra do topo porque os dois liam a mesma coluna.
- **O editor da faixa de vantagens NÃO tem campo de texto** — ele aponta para Configurações. Todo
  número dali sai das settings. Dar campo de texto reintroduziria o defeito da `MarqueeBar`, com a
  diferença de que agora quem digitaria o número errado seria a dona.
- **O hero DEIXOU de ser indelével na feature `41`** (`AD-029`), e a invariante que o protegia foi
  **generalizada, não apagada**: o trigger passou a recusar desligar ou apagar a **última seção
  ativa**, qualquer que seja o tipo. Era preciso — enquanto o hero fosse obrigatório, o Banner
  principal nunca ocuparia o topo. **A mensagem da recusa tem um dono só, e é o banco**: o painel a
  exibe, não a reescreve.
  - **A linha da lista ganhou "Remover"**, e ela é a metade que faltava: `deleteSection` existia no
    hook desde a feature 24 e **nenhuma tela a consumia**. Passou despercebido enquanto o único bloco
    que a AC mandava poder remover era justamente o indelével. A confirmação é `window.confirm`
    porque o que falta antes do clique é um passo, não um fluxo.
  - **A lixeira saiu de cada linha e virou ação de menu** (feature 47, `FOCO-23`..`FOCO-26`). Sete
    seções com sete lixeiras permanentes punham a ação destrutiva disputando peso com a principal
    (abrir), a 40px dela. O `⋯` é o **mesmo** `onRemove`, um passo atrás, e o editor de uma seção
    ganhou **"Remover esta seção da Home"** no rodapé — quem está com ela aberta e decide que ela não
    vai ao ar não precisa voltar à lista para procurar.
    - **Esconder é do desenho; alcançar é do DOM**: `opacity-0` + `group-hover`/`group-focus-within`,
      nunca `hidden`. O controle continua na ordem de tabulação, e há caso provando que ele é
      alcançável por `Tab` **sem nenhum evento de hover** — controle que só existe no hover não
      existe para teclado nem para toque.
  - **O painel NÃO antecipa a recusa da última seção ativa.** Ela vem do banco e chega como erro de
    gravação. Antecipá-la aqui seria a segunda escrita da regra que `AD-029` acabou de unificar.
- **`/admin/home` › bloco “Banner principal”** (feature `41`) — o carrossel de campanha. Cada banner
  tem **duas artes** (computador e celular), descrição e destino; a seção escolhe `full` ou `wide`.
  Três coisas não se decidem nesta tela:
  - **"está reaproveitando a arte do computador" é resposta de `core`** (`surfaceArt`, `AD-030`), não
    da tela. O painel do menu já reescreveu esse predicado uma vez por truthiness da string crua, e
    um `"   "` fazia a loja reaproveitar enquanto a tela dizia que estava tudo certo.
  - **O teto de 6 banners recusa com MOTIVO, nunca com botão apagado.** `disabled` some num atalho de
    teclado e não diz o que fazer — e a saída ("crie um segundo bloco") faz parte da recusa.
  - **Nada aqui desenha o carrossel.** `previaUnica.test.ts` recusa a mecânica (`snap-x`,
    `scroll-snap`, `setInterval`) dentro de `home-composition`, e a régua é a mecânica e não o nome
    do arquivo: "só uma mini-prévia para conferir a ordem" é o pedido razoável que traz o defeito de
    volta.
  - **A miniatura de cada vaga tem a proporção DA VAGA** (`1680 × 560` e `720 × 720`), entregue por
    `style` porque a razão é dado — classe montada em tempo de execução não existe no CSS, já que o
    JIT do Tailwind varre o fonte. Ela era `aspect-video` nas **duas**: a dona conferia o recorte em
    16:9 enquanto a loja entregava 3:1 e 1:1, ou seja, **o corte que ela precisa enxergar era
    exatamente o que a miniatura escondia**. É uma terceira proporção na mesma tela, que é o "defeito
    01" em forma de moldura.
- **O seletor de destino é `DestinoDoItem.tsx`, e é compartilhado.** Extraído do `BannerGridEditor` na
  `41`, porque o que ele carrega é uma **regra** e não um formulário: o `label_snapshot` é congelado
  junto com a escolha, e uma segunda escrita esqueceria isso — o painel passaria a dizer "este banner
  perdeu o destino" em vez de "a coleção Prata 925 foi apagada".
- **Editor de seção é ROTA, e ela troca só a coluna da lista** (`/admin/home/:sectionId`). É o
  precedente dos Descontos ("editor é tela, não modal") sem o preço que ele costuma cobrar — que aqui
  seria apagar a prévia justamente enquanto a dona edita olhando para ela. **A prévia não remonta**, e
  isso é asserido por identidade do nó do DOM.
- **A arte da Home tem bucket próprio (`home-images`)**, separado de `product-images`: banner de
  campanha **sobrevive** à coleção que ele apontava, e uma limpeza futura de imagem órfã de produto
  não pode alcançá-lo.

### O editor de "Produtos em destaque" (feature `50`)

- **Três `FormCard`s, na ordem em que a decisão acontece** (molde do `HeroCarouselEditor`, onde a
  ordem das cobranças é regra): **Conteúdo** (título obrigatório, descrição opcional), **Apresentação**
  (o par segmentado `Slider` / `Grade`, com `aria-pressed`, e cada opção dizendo em uma linha o que
  faz) e **Peças escolhidas** (a lista `draggable` nativa, com posição, nome, remover, e o
  `ProductPicker` no rodapé, com o contador `n de 12`).
- **O editor NÃO desenha vitrine** (`AD-019`): a lista é lista, e quem mostra como fica é a prévia.
  `previaUnica.test.ts` ganhou o nome do arquivo novo no sensor — a régua alcança um arquivo que
  nasceu depois dela.
- **Nenhuma regra nova é redigida no painel.** O teto de 12, o título vazio, a lista vazia e o
  produto repetido vêm de `featuredProductsRefusal`, em `@estrelinha/core/home`, chamada por
  `sectionRefusals.ts` — que é o contrato daquele arquivo. O teto é **recusa**, e não `config.limit`:
  `limit` é lido por `resolveHomeSections`, que **corta** a lista, e aí "quantos produtos aparecem"
  teria dois donos.
- **`ProductPicker` virou um invólucro fino do `ProductSearchField`** (feature `51`): ele perdeu o
  prop `products`, a dobra, o teto e o `<Input>` próprio, e ficou com o que é **regra da Home** —
  montar o `DraftItem` congelando `product_slug` e `label_snapshot`. A busca, o teto de 20, o já
  escolhido desabilitado e o vazio explicado vêm do componente compartilhado; a recusa de `core`
  continua sendo a rede de baixo, não a primeira. *(Até a `50` ele filtrava em memória sobre a lista
  que `useAdminProducts` carregava para três telas — 3.217 KB por tela, sem cache. Ver a seção
  **A busca de produto** acima.)*
- **`DraftItem` tem DOIS campos de tela** — a `key` (feature 24) e o `product_slug` (esta) —, e
  `toNewItems` é a **única** linha do repositório que os remove. O `product_slug` existe para a
  prévia: sem ele `resolveItem` trata "sem slug" como "fora do ar", e o bloco em edição apareceria
  vazio justamente enquanto a dona escolhe as peças (`DST-24`). Um campo de tela que escapa para o
  `insert` é `PGRST204` em produção, com a curadoria perdida e **nada** na tela — por isso
  `toNewItems.test.ts` cobra **igualdade** de chaves, nunca "contém as sete".
- **O painel e a loja concordam sobre "saiu do ar"** (`AD-024`): `useAdminResolvedHome` passa a
  receber `products` e a tratar `is_active === false` como fora do ar, espelhando o que já fazia com
  `categoria.active === false`. Sem isso o painel — que lê como admin e **enxerga** produto
  despublicado — diria "tudo certo" sobre um bloco que a Home desenha pela metade.

### A busca de produto: **um** dono para as cinco telas (feature `51`, `AD-036`)

Escolher uma peça é uma pergunta só, e o painel a respondia de **cinco maneiras diferentes**, nenhuma
sabendo da outra: duas listas filtradas em memória com réguas distintas, dois `<select>` com o
catálogo inteiro dentro e busca nenhuma, e uma busca no servidor. E elas **já discordavam**, medido
contra o projeto hospedado: `name ilike '%coracao%'` devolve **0** linhas e `'%coração%'` devolve
**106** — na Home a Adri achava as 106 peças (a dobra era no cliente), no menu a tela dizia que não
existia nenhuma (o termo ia cru para o Postgres).

- **Três camadas, e a fronteira entre elas é o que torna a estratégia trocável.** `shared/lib/texto`
  dobra o texto; `entities/product/lib/buscarProdutos` é a **régua pura** (recebe array, devolve
  array — é onde a busca inteira é provada sem montar tela); `entities/product/api/useProductPool` só
  sabe ler; `entities/product/ui/ProductSearchField` junta os dois e desenha. **Quem trocar o pool
  por busca no servidor mexe em um arquivo e em nenhum dos cinco consumidores**, porque eles recebem
  `{ itens, total }` e não sabem de onde vêm.
- **A busca é melhor que `includes`, e cada metade é testável sozinha**: casa **toda** palavra do
  termo em **qualquer ordem** (`cinzas colar` acha `Colar de Cinzas`), dobra acento e caixa **nos
  dois sentidos**, e ordena em **três postos** — começa com o termo · alguma palavra do nome começa
  com a primeira palavra do termo · casa só no miolo. Empate desempata por `localeCompare(pt-BR)` e,
  empatando de novo, **por `id`** — sem esse último a ordem entre duas peças homônimas dependeria da
  ordem de chegada do banco, e o determinismo seria verdadeiro por acaso.
- **UM componente com `modo: 'unico' | 'multiplo'`, nunca dois componentes.** O que as cinco telas
  compartilham é justamente a parte que erra em silêncio (a consulta, a dobra, a ordenação, o teto de
  20, o vazio explicado); a diferença entre "escolher uma" e "acrescentar à lista" é **onde o
  resultado é entregue**, e cabe num parâmetro. Dois componentes teriam a lista de resultados escrita
  duas vezes — o defeito de novo.
- **`selecionados` desabilita e APARECE; `excluir` some.** A diferença é deliberada: quem já está no
  bloco precisa ser **visto** para a dona entender por que não pode escolhê-lo outra vez; o produto
  que está sendo editado nunca poderia relacionar-se a si mesmo, e mostrá-lo desabilitado seria ruído
  sobre algo que nunca foi opção.
- **Ele nunca tem `<img>`, grade, nem slot de renderização livre** (`AD-019`). O slot resolveria o
  preço do order bump com elegância e **abriria a porta para a miniatura** — que é o segundo desenho
  da Home voltando ao painel pela terceira vez (features `25` e `39`). Por isso o preço é um
  parâmetro **booleano**, ligado só no order bump: número, não composição.
- **A leitura desce ENXUTA, uma vez, e não mente.** `PRODUCT_POOL_COLUMNS` é
  `id, name, slug, is_active, base_price` — **~137 KB** contra os **3.217 KB** do `select('*')` de
  antes, dos quais 876 KB eram `description` em HTML que seletor nenhum lê. Ela **conta primeiro**
  (`count: 'exact', head: true`) e pagina com `readAllPages`: leitura truncada **falha**, em vez de
  virar um catálogo menor — que é indistinguível de uma loja que encolheu e faria o campo dizer
  "nenhuma peça com X" sobre uma peça que existe. A ordem é `name` **e** `id`, porque `name` não é
  único e sem o segundo critério linhas repetiriam ou sumiriam **com a contagem batendo**, que é
  justamente o modo de falha que `readAllPages` não pega.
- **Duas telas são UMA requisição** porque quem desduplica é a chave do React Query, não um singleton
  escrito à mão. `staleTime` de 5 min, e **quem grava produto invalida** — o que torna a troca uma
  melhora de **frescor** e não só de peso: o hook antigo não tinha cache **nem** invalidação, então
  uma peça criada noutra aba já não aparecia.
- **`useAdminProducts` parou de carregar o catálogo.** Com os cinco seletores no pool ele ficou sem
  consumidor, e saiu — em vez de continuar exportado sem ninguém, que é como `deleteSection`
  atravessou uma feature inteira. O que restou é a **escrita** e `getProduct`, que perdeu o atalho de
  cache e caiu na consulta de uma linha **que ele já tinha escrita**.
- **A dobra mora em `shared/lib/texto.ts`, e as três cópias dela chamam de lá.** As outras sete
  ocorrências de `normalize('NFD')` do painel **não** foram tocadas: elas dobram o acento *e
  continuam* (juntam por hífen, recortam o que não é letra), e o que produzem é **endereço**, não
  termo de busca. Ver a dívida no [`CLAUDE.md`](../../CLAUDE.md) da raiz.
- **O guarda é `shared/lib/__tests__/buscaDeProdutoComDonoUnico.test.ts`, com zero allowlist.** Ele
  recusa a sexta cópia por três réguas, e a primeira delas guarda uma lição reutilizável: **o filtro
  por nome do dono não tem a forma que se supõe**. `useAdminProducts` monta `` `name.ilike.%…%` ``
  como **string** para o `.or()` do PostgREST, e a chamada de método que existe no arquivo é sobre
  `sku`, em `product_variants`. Uma régua que só casasse a chamada de método teria nascido **verde
  sobre nada** — régua por comando, nunca uma para a família (`L-033`).

### Gravar NÃO desmonta a tela: `fetch(modo)` (feature `50`)

Era o defeito que multiplicava todos os outros: `fetchSections()`/`fetchCategories()` significavam
**"carregar" e "revalidar" ao mesmo tempo**, e as duas telas só sabiam ler a primeira. Toda gravação
ligava `loading`, trocava a árvore por `<TableSkeleton/>` — e **isso desmontava o `<iframe>` da
prévia**, que remontava recarregando a loja. Montar uma curadoria de 12 peças significava 12
piscadas.

- **O modo tem UM tipo e UM arquivo: `shared/lib/fetchMode.ts`** (`'inicial' | 'revalidar'`). Dois
  nomes para o mesmo modo seriam o "defeito 01" no tamanho de um tipo, e o terceiro hook nasceria com
  um terceiro nome.
- **`'revalidar'` difere em TRÊS coisas, e só nelas**: (1) não liga `loading`; (2) não esvazia a
  lista quando a leitura falha — grava `error` e **mantém as linhas** (`VIV-07`); (3) respeita o
  **token de sequência**. Toda escrita passa `'revalidar'`; a primeira carga e o "Tentar de novo"
  passam `'inicial'`.
- **O token de sequência vale para os DOIS modos.** Duas gravações seguidas pedem duas releituras, e
  a primeira pode responder por último — devolvendo a tela ao estado anterior à segunda. Nada quebra,
  nenhum erro sobe, e o que a dona vê é a própria alteração desaparecendo.
- ⚠️ **Os dois `fetch` recebem argumento agora.** Todo consumidor precisa de seta —
  `onClick={() => fetchSections('inicial')}` —, porque passar a função direto entregaria o
  `MouseEvent` como **modo**, e `'[object MouseEvent]' !== 'inicial'` faria o "Tentar de novo"
  revalidar em silêncio, sem esqueleto.
- **Salvar uma seção não navega mais** (`VIV-05`). Voltar para a lista era a metade barata do recibo:
  a dona perdia a seção, a rolagem da coluna e o contexto da prévia a cada gravação. O recibo agora é
  o selo `Salvo` do `FormPageHeader`, que ocupa **a mesma vaga** do `Alterações não salvas`, no fim
  da fila de ações (mexer o vizinho é o que `ANI-02` proíbe), e some sozinho em ~2 s. Mexer num campo
  depois disso devolve a pendência — `isDirty` vence.
- **O interruptor de seção é a ÚNICA escrita otimista do painel** (`VIV-10`). Ele entra porque é onde
  a latência é sentida: um interruptor que só se mexe depois da ida ao banco parece quebrado, e o
  segundo clique desfaz o primeiro. Otimismo é dívida de reconciliação, e o caminho de volta está
  escrito ao lado: a falha devolve o valor anterior **antes** de o erro subir, e a mensagem é a **do
  banco** (inclusive o `23514` da última seção ativa — `AD-029` não é antecipado em lugar nenhum).

### O movimento do painel (feature `50`)

- **A convenção é CSS, e ela já existia na loja**: `motion-reduce:transition-none` ao lado da classe
  que move. **Nada de `matchMedia` em componente** — a pergunta "esta pessoa pediu menos movimento?"
  teria dois donos, o CSS e o JavaScript, e as duas respostas divergiriam sem nada quebrar.
- **Nada de `framer-motion`.** O painel não o importa, e trazer a biblioteca inteira para animar a
  saída de uma linha é caro. A saída é estado local + CSS, **em paralelo** com a requisição.
- **O que acende é o que MUDOU, não o que foi clicado.** `HomeSectionList` compara a assinatura de
  conteúdo de cada linha entre uma leitura e a seguinte; a que mudou ganha `data-recem-salvo` por
  ~1,2 s. É o que dá `ANI-08` de graça: a revalidação que devolve o mesmo conteúdo produz a mesma
  assinatura, e **nada pisca**. Uma luz disparada pelo clique acenderia também quando o banco
  recusasse.
- **A primeira leitura não acende nada**, e linha nova é `entrando` (`animate-fade-in`), não `acesa`
  — são dois eventos diferentes, e a mesma marca para os dois faria a seção acrescentada piscar duas
  vezes.
- **A saída da linha começa NO CLIQUE, e a requisição sai no mesmo tique** (`ANI-07`). Um
  `setTimeout` antes da chamada — o jeito "natural" de esperar a animação — atrasaria a gravação por
  um efeito visual. O desfazer é incondicional ao fim da promessa: se a remoção deu certo a linha já
  saiu da lista, e se ela falhou **ou foi cancelada no `confirm`** a linha volta ao normal.
- **`animacaoRespeitaMovimento.test.ts` guarda o par**, com escopo literal de oito arquivos. Ver a
  dívida no `CLAUDE.md` da raiz: o resto do painel tem ~50 classes de transição sem par nenhum, de
  antes desta feature.

### A ponte da prévia (feature `25`, e o segundo canal da `39`)

> **São DUAS pontes sobre o mesmo `?preview=1`**: a da Home (`home-composition/model/usePreviewBridge`)
> e a do Menu (`store-menu/model/useMenuPreviewBridge`, feature `39`). Tudo o que está escrito abaixo
> vale para as duas — o que difere é o **payload** e o carimbo (`PREVIEW_SOURCE` ×
> `MENU_PREVIEW_SOURCE`). Um parâmetro novo para o menu seria um segundo dono de "esta janela é uma
> prévia". Detalhe do canal do menu na seção `/admin/menu`, acima.

**O painel NÃO desenha seção da Home** — nem esquema, nem mini-mapa, nem "só um fallback para quando
o iframe não carrega". Isso apagou `HomePreview.tsx`, 277 linhas redesenhando à mão o que
`widgets/home-renderer` (130 linhas) já desenhava, em apps que não se importam, divergindo **sem
quebrar nada**. `previaUnica.test.ts` impede a volta: reprova se `HomePreview` reaparecer, se surgir
um segundo arquivo `…Preview`, se o palco ramificar por tipo de seção, ou se o painel importar de
`apps/store`.

- **O iframe é também o que preserva a separação de tokens.** Renderizar widget da loja dentro do
  painel traria `--estrelinha-*` para o documento de `--estrelinha-admin-*`. Outro documento, outra
  folha.
- **O painel AGE (navega, abre editor), então exige origem exata E a janela do próprio iframe.** A
  loja só desenha, e por isso confia em `window.parent`. A assimetria é a regra.
- **O `draft` sai com `targetOrigin` exato — nunca `'*'`**, porque leva conteúdo não publicado. Errar
  a origem **não dá erro**: o navegador descarta em silêncio e a prévia "não atualiza".
- **O layout inverteu**: rail de **380px** à esquerda (lista ⇄ editor) e o palco ocupando o resto. Era
  o contrário (lista 748 / prévia 380), e nenhuma representação de desktop cabe em 380px.
- **O alternador abre em Celular**, e as duas medidas são reais: **390 × 844** e **1024 × 768** (o
  `lg`, o desktop mais estreito que existe). A redução é `transform: scale` sobre um iframe de largura
  **de verdade** — encolher o `width` faria o botão "Computador" mostrar o layout de celular, porque é
  o `width` que a loja mede para escolher as media queries. A barra mostra a escala.
- **Trocar de dispositivo não pode tocar no `src`**: cada clique remontaria o documento e perderia o
  rascunho já entregue. Recarregar remonta de propósito, por `key`.
- **O tamanho do quadro tem UM dono, e ele mora em `core`** — `previewFrame(device, box, fullscreen)`
  em `packages/core/src/home/preview.ts` (feature 47). Antes dela a folga entre palco e quadro era
  uma constante **declarada duas vezes**, uma em cada palco: mudar a de um e não a do outro faria as
  duas prévias escalarem diferente com build, `tsc` e teste de componente verdes. É o "defeito 01" em
  miniatura, e `shared/lib/__tests__/folgaDoPalco.test.ts` recusa a volta — inclusive na forma sem
  nome (`caixa.width - 40` no cálculo da escala).
- **A tela cheia é um MODO do palco, não uma segunda prévia** (`FOCO-15`..`FOCO-22`). Um botão leva o
  computador a **1024px com escala exatamente 1** — 81% ainda não é leitura, 100% é, e é o que torna
  a barra do menu e a chamada legíveis como a cliente as lê.
  - **É CSS na `<section>` que já existe** (`fixed inset-0 z-50`, de `shared/lib/useFullscreenStage`),
    e não um portal. Portal reparenta o nó, o React remonta, o iframe recarrega e o rascunho da ponte
    se perde — o defeito que `PRV-13` já custou uma vez. Os testes provam por **identidade do nó**:
    guardam a referência do `<iframe>`, alternam o modo duas vezes, e o nó tem de ser o mesmo objeto.
  - **A altura é a que existe, com piso de 768**, e o rótulo de métrica imprime a altura **realmente
    usada** (`1024 × 948 · 100%`), não a nominal. Imprimir 768 ali seria a barra mentindo sobre o que
    está na tela.
  - **O celular NÃO estica, em modo nenhum**: 390 × 844 é a **dobra real**, e esticá-la mentiria
    sobre o que a cliente vê.
  - **`Esc` sai, e o ouvinte só existe enquanto o modo está ligado** — um listener global permanente
    por palco seria dois `keydown` no documento em toda tela do painel, para nada.
  - **Clicar num bloco dentro da prévia em tela cheia SAI do modo e então abre o editor**: o clique
    quer dizer "quero consertar isto", e abrir o formulário atrás de uma prévia que ocupa a tela
    inteira entregaria algo que ninguém vê.
  - **Sem `VITE_STORE_URL` o botão não é oferecido** — não há o que ampliar.
  - `previaUnica.test.ts` cobre o modo: nenhum arquivo `…Preview` novo nas duas pastas de UI, cada
    palco montando **um** iframe, e nenhum outro arquivo montando iframe nenhum.
- **`VITE_STORE_URL` é o que acende a prévia**, e tem **um leitor**: `shared/lib/storeOrigin.ts`. Sem
  ela o palco mostra o passo de configuração e a lista segue funcionando — a ausência é declarada.
- **Em produção quem autoriza é a LOJA** (`BL-013`, fechado em 2026-08-16). O `vercel.json` dela manda
  `Content-Security-Policy: frame-ancestors 'self' https://umaestrelinha-backoffice.vercel.app` — o
  `X-Frame-Options: SAMEORIGIN` foi **substituído**, porque aquele header não tem sintaxe para
  autorizar outra origem. Em dev funciona sem nada, porque o Vite não manda header.
  - **A origem é EXATA, e isso tem dois preços declarados**: deploy de preview do painel não enquadra
    a loja (URL diferente a cada branch), e trocar o domínio do painel exige atualizar o `vercel.json`
    da loja **e** o literal de `vercelRedirects.test.ts`. Curinga é recusado por teste — liberaria
    qualquer projeto `.vercel.app` a embutir o checkout.
  - O modo de falhar continua sendo **quadro branco sem erro**: a recusa é do navegador, não da
    aplicação, e não aparece em log nenhum.

## Configurações › Frete — o interruptor do frete grátis (feature `37`)

- **`free_shipping_enabled` nasce `false`, e ligar é passo de operação.** Enquanto ninguém ligar, a
  loja não anuncia nem concede frete grátis. Decisão do usuário; o custo (a loja "perde" frete grátis
  no dia do deploy) é conhecido e aceito. Mesmo molde do `google_shopping.enabled`.
- **O campo do valor fica DESABILITADO, não escondido, com o interruptor desligado.** A Adri precisa
  ver o número guardado para decidir se quer religar com ele — desligar não apaga a configuração
  dela. É a razão de o interruptor ser booleano próprio em vez de `threshold > 0`: aquela forma faria
  ela perder o número.
- **Salvar recusa "ligado, a partir de R$ 0"** (`freeShippingRefusal`, de `@estrelinha/core/shipping`),
  **antes de qualquer escrita**. Sem a recusa o painel exibiria "ligado" enquanto a loja se comporta
  como desligada — `freeShippingState` trata faixa ≤ 0 como inativa. O teste prova a recusa pela
  **ausência de chamada** ao upsert, não pelo toast: um toast de erro com a escrita acontecendo atrás
  deixaria a configuração impossível gravada.
- **O veredito é `string | null`**, nunca união discriminada por booleano — com
  `strictNullChecks: false` aquela forma não estreita. Mesmo formato de `reservedSlugRefusal`.
- **`ToggleField` ganhou `aria-label`**, e isso vale para **todos** os toggles do painel: o rótulo é
  um `<p>` e não um `<Label htmlFor>`, então o `Switch` nascia sem nome acessível — um leitor de tela
  anunciava "interruptor, ligado" e nada mais.
  - **`switchClassName` (feature `53`) é aditivo e opcional** — os chamadores de antes dela não
    passam nada e não mudam nem um pixel. Existe porque o `Switch` do design system é `h-6 w-11`
    (24×44px): abaixo do piso de 44px de altura, medido em navegador real na aba Notificações. Quem
    precisa do alvo maior passa a própria classe `before:` (molde do `TAP_44` da loja, nunca
    importado — criaria um segundo dono da medida); os outros 7 usos de `ToggleField` continuam com
    o `Switch` cru.

## Configurações › Notificações — a aba dos 15 eventos do motor (feature `53`)

`/admin/configuracoes` → aba **Notificações**. Lê, edita, liga/desliga e mostra a prévia dos quinze
eventos de `@estrelinha/core/notifications` — o motor que a feature `42` construiu e que ficou sem
tela por uma feature inteira (`BL-033`). A aba é **autocontida**: tem o próprio
`useNotificationsDraft()`/`useUpdateSettings()`, no mesmo molde independente do `CheckoutSettingsCard`
— `AdminSettingsPage.save()` **não** ganha um branch `notifications` (`PageSettingsKey` o exclui, e
isso é checado por `tsc`, não por convenção).

- **Salva a aba inteira, nunca um evento**. `useUpdateSettings` faz `upsert` da chave `notifications`
  inteira — uma escrita que só carregasse o evento editado apagaria, em silêncio, a customização dos
  outros 14 na próxima leitura. `useNotificationsDraft` inicializa o rascunho com
  `resolveAllEventSettings` (os 15, resolvido contra o default) e `save()` sempre reconstrói os 15
  via `buildNotificationsValue` — nunca um subconjunto.
- **As três seções são DERIVADAS**, nunca uma lista nova: audiência `owner` → "Avisos para você";
  `isMaterialEvent(event)` → "Material"; o resto → "Pedido e pagamento" (`model/sections.ts`,
  `sectionFor`/`groupedEvents`). Nenhum nome de evento é escrito como literal em `apps/**` —
  `notificationSingleOwner.test.ts` (feature `42`, na suíte da **loja**) proíbe isso, varrendo
  `apps/**` e `supabase/functions/**`: quem precisa identificar UM evento específico importa
  `MATERIAL_INSTRUCTIONS_EVENT` de `core`, e quem precisa da lista dos eventos `owner` reusa
  `sections.owner` em vez de uma segunda classificação.
- **A prévia é a MESMA function que envia** (`?action=preview`), nunca um segundo desenho de e-mail
  dentro do painel — `EmailPreviewFrame` entrega o `html` da resposta direto para
  `<iframe sandbox="" srcDoc={html}>`, byte a byte. Um preview ativo por vez: abrir um fecha o
  anterior (estado no pai, `NotificationsTab`), para nunca montar 15 `<iframe>` simultâneos.
- **Duas precondições, dois tratamentos diferentes.** `material_instructions` ligado com o endereço
  do ateliê vazio (aba Material) **bloqueia salvar** — a Adri controla o campo na mesma sessão do
  painel. Os dois eventos `owner_*` com `general.email` vazio ou `ADMIN_PUBLIC_URL` que não parece
  produção só **avisam** (banner inline, não bloqueia) — são configurações que ela não alcança
  *nesta* tela. `model/preconditions.ts` (`materialAddressMissing`, `adminUrlLooksLocal`) fica no
  painel, e não em `core`: um consumidor só.
- **Nenhuma régua de tom, variável ou limite é reescrita aqui.** `notificationDraftRefusal` (movida
  para `core` nesta feature — antes só a function conhecia) compõe variável → tom → tamanho, e o
  painel a chama para recusar ao SALVAR — a mesma recusa que a function já dava ao renderizar.
  `notificationCopySingleOwner.test.ts` (`shared/lib/__tests__`) recusa qualquer segunda declaração
  de `URGENCY_TERMS`/`NOTIFICATION_VARIABLES`/`COPY_LIMITS`/a régua de emoji no painel.
- **Os 11 eventos novos nascem desligados** (`PNL-06`, decisão da `42`) e a `53` não ligou nenhum —
  ver *Estado conhecido / dívidas* no `CLAUDE.md` da raiz.

## `/admin/menu` — a curadoria do menu, por dispositivo (feature `39`)

**A tela mostra o que a loja renderiza**: ela chama `menuItems(input, surface)`, a **mesma** função
que desenha a barra do computador e a folha do celular. Não filtra, não ordena e não trunca por
conta — fazer isso seria o "defeito 01" nascendo dentro da tela que existe para acabar com ele.

- **Duas curadorias, não um responsivo.** O alternador Computador/Celular troca ao mesmo tempo o que
  se edita, o que se conta e o que a prévia mostra. O switch grava **só** a coluna da superfície
  corrente (`menu_desktop` / `menu_mobile`), e a linha AVISA quando a outra está diferente
  ("desligada no celular") — o aviso nomeia sempre o dispositivo onde ela está DESLIGADA, então diz a
  mesma coisa nas duas abas: é propriedade da categoria, não da aba.
- **Não existe teto, e nenhuma recusa por contagem existe no código.** O contador diz "5 itens", e
  nunca "4 de 5 vagas": contagem é **informação**, não cota. Quem mostra o que acontece quando não
  cabe é a prévia (a barra da loja rola), não um erro no clique.
- **Nenhuma entrada é declarada no painel.** `FIXED_ENTRIES` foi APAGADA — ela anunciava "Crie o Seu"
  → `/crie-seu-botton`, que **nunca foi rota declarada** e caía na 404. O "Sobre" é um **item de
  link** de `store_settings.menu`, semeado pela migration, e a Adri pode movê-lo, trocá-lo ou tirá-lo.
- **O papel é derivado da árvore, nunca gravado** (`NAV-06`): filha marcada de pai marcado na mesma
  superfície é item do **painel** do pai, e por isso ela **não tem linha na lista da barra** — o
  lugar dela é o `MenuPanelEditor`. Uma coluna "é item de painel" dessincronizaria no primeiro
  "mover categoria".
- **Arrastar reordena a `sort_order` da ÁRVORE**, e a tela diz isso depois de gravar: a mesma ordem
  vale para a grade da home e o rodapé. Arraste entre ramos é recusado com motivo (mudar de pai é a
  tela de Categorias). Item de link **não** arrasta — a `sort_order` dele mora no jsonb, e um arraste
  atravessando a fronteira gravaria em duas fontes com significados diferentes.
- **Duas leituras, duas faixas de erro.** Categorias e itens de link falham em separado, e cada uma
  tem a própria superfície com "tentar de novo". `useMenuLinks` **não** usa `useStoreSettings`: aquele
  hook é o da loja e engole erro de propósito (devolve defaults), o que aqui faria a tela dizer
  "nenhum link" com o banco fora do ar.
- **Os banners são até dois por superfície, e o terceiro é recusado com motivo.** Gravar é explícito
  (rascunho + "Salvar banners"), e não um `update` por tecla digitada como no card antigo.
  **Excedente gravado à mão é ACUSADO**: `resolveMenuBanners` trunca em dois na leitura, então sem o
  aviso ("3 gravados, 2 cabem") o terceiro ficaria invisível **e indeletável**.
- **A arte do banner vai para `home-images/menu`** — bucket reusado, não criado: mesma policy e mesmo
  ciclo de vida (campanha sobrevive à coleção que aponta), e criar `menu-images` exigiria migration
  nova sobre uma já aplicada (`AD-017`).
- **Quem decide "esta superfície tem arte?" é `core`, não esta tela** — `menuBannerArt` e
  `menuBannerImage`, de `@estrelinha/core/menu`. O editor calculava a herança por truthiness da
  string crua e `core` apara espaço: um `image_mobile: "   "` (chegado por SQL ou por importação)
  fazia a loja reaproveitar a arte do computador e a tela **não avisar**. `MenuBannerEditor.test.tsx`
  carrega o par — a tela renderizada e `resolveMenuBanners` respondendo ao mesmo jsonb.
- **O painel NÃO desenha o menu — a prévia é a LOJA, num iframe** (`MenuLivePreview`, `NAV-43`).
  `MenuBarPreview.tsx` foi apagado: era o segundo desenho da barra, com os tokens do admin, mostrando
  a entrada fixa que não existia. `previaUnica.test.ts` cobre as duas features agora: recusa a volta
  do arquivo, um segundo `…Preview`, o import de `apps/store` e qualquer arquivo do painel que
  **calcule** o desenho da loja (`menuPanelColumns`, `resolveMenuBanners`).
  - **Não há alternador de dispositivo dentro do palco, e a ausência é a decisão** (`NAV-37`): o
    alternador Computador/Celular da própria tela governa a edição **e** a prévia, e o quadro é 390
    ou 1024 conforme a superfície em edição. Um segundo alternador deixaria a Adri editar a curadoria
    do celular olhando a barra do computador — dois donos de "que dispositivo estou conferindo".
  - **A medida vai no atributo `width`/`height` e a redução é `transform: scale()`.** Encolher o
    iframe por CSS o deixaria medindo 1024 nas media queries, e a superfície "celular" mostraria a
    barra do computador — que é `hidden md:block`, ou seja, o erro apareceria como um menu que some.
  - **`postMessage` com a origem exata, nunca `'*'`** (`useMenuPreviewBridge`), e a régua de recepção
    é a estrita: **origem exata E `event.source` sendo a janela do próprio iframe**. O painel **age**
    (muda a seleção da tela de quem está trabalhando); a loja só desenha, e por isso lá basta ser o
    pai. A assimetria é o desenho da `25`.
  - **O rascunho sai com debounce e o `open` sai sem**: o primeiro acompanha gravação e aguenta
    200ms; o segundo acompanha o clique na lista, e 200ms ali seriam lidos como travamento.
  - **Sem `VITE_STORE_URL` a tela DIZ isso e continua editável** (`NAV-46`) — a ponte fica desligada
    inteira (`origin: null`), em vez de tocar num `contentWindow` que não existe.
- **A entrada se edita num lugar só** (feature 47, `FOCO-28`..`FOCO-32`): `MenuEntryEditor` é um card
  com abas **Painel · Banners · Ícone**, na coluna da esquerda. O `MenuIconPicker` morava na coluna da
  **direita**, debaixo da prévia — configurar uma categoria pedia olhar para as duas colunas ao mesmo
  tempo, e o seletor ficava a uma rolagem do nome do item que ele iconiza. Os três editores **não
  mudaram por dentro**: o card é invólucro.
  - **Trocar a entrada OU o dispositivo volta para Painel**, por `key={superfície:entrada}` no
    `<Tabs>`. Remontar zera a aba **e** o estado interno dos editores (o `mostrarTodas` do painel, o
    rascunho dos banners), que é o comportamento certo ao passar a editar outra coisa — e sai de
    graça.
  - **A contagem da aba "Banners" sai da MESMA leitura que o editor usa** (`model/bannersGravados.ts`,
    `AD-025`). Uma segunda contagem ali diria "2" com o editor mostrando 3, e nada quebraria. A função
    mora em `model/` e não dentro do editor justamente porque dois componentes a consomem.
- **O corpo tem altura de tela, no molde literal de `/admin/home`** (`FOCO-13`): a coluna da esquerda
  rola dentro de si e o palco fica parado. Antes a prévia rolava junto com os três editores e saía da
  vista enquanto se edita olhando para ela. O `11rem` é **suposição de altura de cabeçalho** copiada
  da Home, e o teste lê as **duas páginas do disco e as compara** — se uma mudar e a outra não,
  reprova. **Pende prova em navegador** (1024 e 1440): os dois `PageHeader` têm subtítulos de
  comprimentos diferentes, e um que embrulhe em duas linhas estoura a viewport.
- **"Salvando…" vive no CABEÇALHO** (`FOCO-33`/`FOCO-34`), ao lado do alternador de dispositivo. Era
  um `<p>` solto no fim do documento, depois de três editores: com o corpo rolando, ligar uma
  categoria no topo da lista dava um segundo de silêncio e nenhuma confirmação à vista. Ele **some do
  DOM** ao terminar — o teste prova por ausência do nó, não por classe de invisibilidade.
- **Abaixo de `lg` a tela alterna Entradas | Prévia** (`FOCO-35`..`FOCO-37`), como `/admin/home` faz
  desde a 24. **A forma é diferente de propósito**: aqui o alternador de vista nasce logo abaixo de
  uma pílula segmentada (Computador/Celular), e dois controles de forma idêntica empilhados leem como
  o mesmo controle duplicado. O de **dispositivo** continua pílula ("o que estou editando"); o de
  **vista** é barra sublinhada ("o que estou vendo"). A régua é escrita como **predicado** e chamada
  pela asserção **e** pelo sensor.
- **Ninguém lê `show_in_menu` nem `menu_promo`** (`menuSurfaceSingleOwner.test.ts`, **sem allowlist**
  desde a fase 5): a primeira é coluna gerada e a segunda é legado. As duas continuam no banco para a
  loja publicada não quebrar entre o `db push` e o deploy da Vercel.
- **Nada aqui conta vaga.** O teto de 4 e os símbolos que o encarnavam foram apagados de `core/menu`;
  `menuSemTeto.test.ts` recusa a volta deles e do vocabulário de "vaga" nesta tela. A contagem que a
  lista mostra é **informação** ("7 itens no computador"), nunca cota.
- **O seletor de ícone tem busca por nome** (`NAV-48`), sem acento e sem caixa — "gravacao" acha
  "Gravação" —, e ela casa o **rótulo e a chave**: quem confere um valor gravado procura por
  `gota-afetiva`, não por "Gota afetiva". A cela "Sem ícone" **não é filtrada**: é a saída, não um
  resultado, e escondê-la tiraria o único jeito de limpar a escolha.

## Pedidos e a fila de material

- **`orders.material_tracking_code` NÃO é `orders.tracking_code`.** A primeira é a remessa **de
  entrada** (cliente → ateliê, o envelope com o material); a segunda é a **de saída** e alimenta o
  e-mail `order_shipped`. Reusar aquela faria "postamos sua joia" sair com o código do envelope que a
  cliente mandou.
- **Escrita de estado só existe por RPC.** `orders` não tem policy de `UPDATE` para cliente, de
  propósito: abrir uma exporia `payment_status` e os valores. `set_material_status` (admin) e
  `set_material_tracking` (dona do pedido **ou** admin) escrevem o campo e nada mais.
- **Transição para o próprio estado é sucesso** — é o que faz duas admins clicando ao mesmo tempo
  convergirem. `nao_aplicavel` é terminal.
- **Os dois rastreios nunca aparecem no mesmo bloco** (`PED-26`, feature `34`). O de **entrada** vive
  dentro do card de material; o de **saída** vive no bloco de entrega da coluna direita, rotulado
  `RASTREIO DA JOIA (SAÍDA)`. Desenho ambíguo é o caminho mais curto para cometer o erro que o item
  acima descreve, e o rótulo com a direção é o que o fecha.
- **`orders.status` NÃO aceitava `separating` até 2026-08-29.** O CHECK inline do `CREATE TABLE`
  original permitia cinco dos seis estados, e nada nunca o afrouxou — enquanto `ORDER_STATUSES`
  declarava os seis e a tela oferecia os seis. **Toda gravação de "Em separação" falhava com 23514**,
  e nada acusava: a coluna é `text`, o `tsc` acha certo, e os testes mockam o client. Terceira
  ocorrência da família `AD-012`, corrigida na migration da `34`.
- **A cliente convidada NÃO existe em `public.customers`.** Aquela tabela só recebe linha do trigger
  `on_auth_user_created_customer`, que dispara em `auth.users`; o checkout de convidada grava
  `customer_id = null` e não cria cadastro nenhum. **Quem lista clientes lê `customer_list`**, não
  `customers`: a view une cadastro e convidada, agrupando a segunda por e-mail normalizado, e o id
  dela é `md5(lower(email))::uuid` — determinístico e estável, para `/admin/clientes/:id` funcionar
  igual nos dois casos.

## As duas listagens de Vendas (feature `34`)

- **O topo diz o que COBRA, não o que existe.** Quatro contadores clicáveis, e só o primeiro
  (`Aguardando material`) tem acento — é o único que acumula. O quarto (`Pix aguardando`) está lá
  **para dizer que não é fila**: sem ele, sete Pix pendentes se leem como sete dívidas.
- **Contador e filtro têm de ser o MESMO predicado.** Medido no navegador na `34`: o tile
  "Pago, a separar" contava `status = 'paid'` e o clique aplicava a visão `a-separar` — dizia 3 e
  trazia 4. A lista de estados que não seguram a separação mora em `MATERIAL_NAO_SEGURA_LISTA`,
  exportada de um lugar só, e os dois a leem.
- **Número de resumo é UNIÃO, nunca soma de tiles.** Os tiles se sobrepõem (um pedido pago que ainda
  espera o envelope está em dois), então somá-los conta gente duas vezes. O subtítulo usa a contagem
  da visão `Precisa de ação`, que o servidor calcula.
- **A contagem de aba é `head: true`.** `select('id', { count: 'exact', head: true })`: o servidor
  conta e nenhuma linha atravessa a rede — não há teto de 1.000 a herdar. O `fetchStatusCounts`
  antigo lia `orders` inteira, sem `where` e sem `range`.
- **Erro de leitura vira faixa, nunca estado vazio.** "Nenhum pedido encontrado" é a frase para "o
  filtro não casou nada", não para "o banco não respondeu" — e a segunda manda tentar de novo.
  - **Vale também para os ITENS do pedido, e ali o custo é maior**: um pedido sem itens é impossível
    (o checkout sempre os grava), então `Itens · 0 peças` é uma afirmação falsa — e é o conteúdo que
    a folha de separação leva para a bancada. A tela separa três casos: carregado, **leitura falhou**
    (faixa de erro, e o cabeçalho para de prometer contagem) e **zero sem erro** (aviso de anomalia).
- **`fetchAllFiltered` passa por `readAllPages`**, que **falha** se a leitura truncar. Um CSV
  silenciosamente menor é indistinguível de um filtro mais estreito para quem o abre depois.
- **A seleção guarda a LINHA, não o id** (`Map<string, AdminOrderRow>`): sem os valores atuais não há
  como nomear no resumo quais pedidos não passaram.
- **O lote de material é um laço de `set_material_status`, e não aborta.** Não existe RPC de lote, e
  inventar uma seria uma segunda máquina de estado. Recusa (transição inválida) e falha (rede) são
  contadas **separado**: a primeira é o caso esperado quando outra aba já atualizou o pedido.
- **A peça do pedido tem foto e endereço, e nenhum dos dois é um segundo dono do snapshot.**
  `order_items.product_image` e `product_name` são a compra congelada; o catálogo de hoje entra
  **só** por `useAdminOrder.productRefs`, e **só** onde o snapshot está ausente. Item com
  `product_image` gravado continua mostrando a foto da época — o contrário faria trocar a imagem no
  cadastro mudar o que a folha de separação leva para a bancada, num pedido de 2025.
  - **O motivo de existir foi medido**: os 59 itens importados da Nuvemshop têm `product_image`
    **vazio** — o CSV de vendas não traz imagem —, e quem separava lia o nome e imaginava a peça,
    num catálogo em que "Redondo com Cinzas" tem sete variantes.
  - **`product_id` NEM SEMPRE é um uuid.** O importador grava `nuvemshop:<nome>` no item que não
    casou (35 dos 59 de hoje), e `products.id` é `uuid`: um desses valores dentro de `in('id', …)`
    devolve `22P02` — **medido** — e derruba a consulta inteira, apagando foto e link **também dos
    itens que casaram**. O recorte é `catalogProductIds`, e ele tem teste porque a falha é muda.
  - **O nome abre o CADASTRO, não a vitrine** — `/admin/produtos/:id/editar`, em nova aba (decisão
    do usuário, 2026-08-30). Quem clica está separando um pedido e quer estoque, variação, material
    exigido e limite de gravação; a página da loja não mostra nada disso. Nova aba porque a
    conferência não pode custar o rascunho de nota ou o rastreio meio digitado do pedido aberto.
    **Item órfão não vira link**: `/admin/produtos/<id órfão>/editar` abriria a tela de edição em
    cima de um produto que não existe. E o teste lê o `App.tsx` **do disco** para conferir o
    caminho — um `/admin/produto/…` no singular passaria por qualquer asserção de string literal.
- **`purchase_ordinal` vem da view `order_list`**, por window function particionada por cadastro ou
  e-mail. Calcular "3ª compra" no cliente custaria uma leitura por linha da página.

## `/admin/perguntas` — a biblioteca (feature `28`)

67 entradas e 3.475 vínculos, semeados pelo importador a partir das descrições; 977 vínculos (28%)
carregam resposta própria.

- **"Qual a pergunta" e "qual a resposta AQUI" são dois dados.** `faqs.answer` é o padrão;
  `product_faqs.answer_override` é a resposta daquela peça, e é **nullable** — mesmo molde de
  `engraving_max_chars`.
- **Resposta própria idêntica ao padrão é gravada como `null`** (`faqOverrideOf`). Guardar o idêntico
  daria dois donos do mesmo texto: editar a biblioteca deixaria de alcançar aquele produto e nada na
  tela diria por quê.
- **Apagar entrada em uso é recusado pelo BANCO** (`on delete restrict`), e o caminho reversível é
  `is_active = false`. Apagar removeria a pergunta de até 453 páginas em silêncio.
- **A contagem de uso é VIEW, não coluna** (`faq_usage`): materializá-la daria um segundo dono do
  número, que o importador desatualizaria ao gravar 3.475 vínculos de uma vez.
- **A aba `Perguntas` fica logo depois de `Geral`** no formulário do produto — a pergunta é a
  continuação da descrição.
- **A descrição continua trazendo o bloco antigo, e a contrapartida é obrigatória.** A loja filtra no
  render; o painel mostra o texto cru. `DescriptionFaqNotice` avisa na aba Geral quantas perguntas há
  ali e oferece **remover o bloco** por clique. O importador **não** remove: quem decide é a dona.
- **A sugestão é determinística e a fórmula é PROPORÇÃO** (`rankFaqSuggestions`, em `core`): medido no
  catálogo real, top-5 dá **84,0% de precisão e 83,5% de cobertura**. Por contagem bruta cai para
  **61,1% / 56,1%**. IA ficou de fora por decisão do usuário (`BL-014`).

## `/admin/google-shopping` — o interruptor e o cutover (feature `30`)

A conta Merchant Center `685367464` tem **3.235 ofertas aprovadas**, alimentadas hoje pela Content API
do app da Nuvemshop. No cutover de DNS aquela fonte morre. Esta tela troca a fonte sem perder o
catálogo — e impede que a troca aconteça na ordem errada.

- **O interruptor não é um toggle qualquer.** Ligado uma vez, desligar deixa de ser neutro: o Google
  para de receber o feed e as ofertas expiram. Por isso desligar exige confirmação com o efeito
  escrito (`DisableFeedDialog`), e por isso **`ever_enabled` existe no dado** — um booleano só não
  distingue "nunca ligou" de "está ligado agora". Nasce **desligado**, e o endpoint responde 404
  enquanto estiver assim.
- **A ordem do cutover é a tela que a repete**: DNS → ligar o interruptor → desconectar o app Google
  na Nuvemshop → **excluir a fonte `Content API`** no Merchant Center → criar a busca agendada. Errar
  a ordem faz as duas fontes disputarem os mesmos `offer_id`.
- **A contagem do que fica de fora vem de `FEED_EXCLUSIONS`** (`@estrelinha/core/shopping`), com
  precedência fixa `produto_inativo` > `variacao_inativa` > `sem_preco`. O critério é **o que a dona
  faria a seguir**: com o produto inteiro fora do ar, dizer "esta linha está sem preço" manda
  consertar a coisa errada.
- **A tela não serve o feed** — quem serve são as edge functions `google-feed` e `product-page`. Ver
  [`../../supabase/CLAUDE.md`](../../supabase/CLAUDE.md).

## `/admin/usuarios` e `/admin/conta` — quem entra no painel (feature `48`)

**Toda escrita passa pela edge function `admin-users`** (`AD-034`). Nada aqui toca `auth.admin.*`, e
`chaveDeServidorForaDoNavegador.test.ts` (na suíte da **loja**, que é onde os guardas de varredura
moram) recusa qualquer arquivo de `apps/**` que nomeie a chave de serviço ou aquela API.

- **"Remover do painel" e "Apagar conta" são ações DIFERENTES, lado a lado, com rótulos diferentes.**
  A primeira apaga uma linha de `user_roles` e é reversível com um clique; a segunda destrói login,
  ficha de cliente e lista de desejos. Rotulá-las igual — ou oferecer só a segunda — era o desenho
  que esta feature recusou, porque **um admin que trabalhou não pode ser apagado**: quatro FKs
  bloqueiam, e o botão falharia quase sempre.
- **A confirmação de apagar é digitar o e-mail**, e não um "tem certeza?". As duas ações ficam a um
  pixel de distância e têm consequências opostas; digitar obriga a ler qual conta está na frente.
- **`is_self` desabilita as duas na própria linha**, com o motivo no `title`. Recusa que só aparece
  depois do clique faz a dona pensar que algo quebrou.
- **`motivoDaFalha` em `useAdminUsers.ts` existe porque `functions.invoke` DESCARTA o corpo** de
  qualquer resposta ≥ 400. Sem ler o `context` do `FunctionsHttpError`, a frase que o handler
  escreveu ("esta conta tem 7 pedidos…") nunca chega à tela, e a Adri leria *"Edge Function returned
  a non-2xx status code"*. As duas pontas certas, resultado errado.
- **`/admin/conta` é separada de `/admin/configuracoes` de propósito**: aquela tela guarda
  configuração **da loja**, compartilhada entre todo mundo que administra. Senha é pessoal.
- **Trocar a própria senha exige a senha atual**, e o GoTrue **não** exige.
  `changeOwnPassword` faz recusa local → `signInWithPassword` → `updateUser`, nessa ordem. A recusa
  local antes da rede não é zelo: sem ela, cada confirmação errada queima o `sign_in_sign_ups` do
  GoTrue e a pessoa acaba bloqueada justamente enquanto tenta trocar a senha.
- **`/admin/login` ganhou "Esqueci minha senha"**, e isso fechou um buraco que já existia: o
  template `recovery.html` manda um código de 6 dígitos dizendo *"use o código abaixo **na loja**"*,
  e o painel não tinha onde consumi-lo. O fluxo usa `resetPassword`, `verifyRecoveryCode` e
  `updatePassword` do `AuthContext` — os três **já existiam e não tinham chamador nenhum aqui**. O
  desfecho reusa o efeito `entrando`/`authLoading` que já morava na página: uma segunda regra de
  "para onde ir depois de entrar" seria a divergência que a feature combate.

> ⚠️ **Revogar o papel NÃO derruba a sessão ativa da pessoa.** Medido nos typings
> (`@supabase/auth-js@2.110.7`): `signOut(jwt, scope?)` exige o JWT dela, e não existe logout por id.
> O casco do painel pode seguir na tela até ela recarregar — mas **nada que ela faça grava**, porque
> toda policy de escrita chama `has_role`, avaliado por requisição. Limitação declarada, não
> escondida.

## Dívidas conhecidas deste app

- **A baseline de testes do painel é 2704 em 148 arquivos**, todos passando (2026-09-14, no fecho da
  feature `51`, um workspace por vez e com exit code capturado fora de pipe). *(Dizia `2204/129` até
  aqui, medida na árvore mesclada `46` + `47` — duas features a atravessaram sem que o número
  acompanhasse, que é o envelhecimento silencioso que o `CLAUDE.md` da raiz registra desde a `45`.)*
  - **Meça com `--testTimeout=20000`.** Os guardas que varrem disco (`SlugField`,
    `CategoryInspector`) cruzam o teto padrão de 5s sob a contenção da suíte cheia e reprovam por
    **timeout, nunca por asserção** — e o arquivo que reprova **muda a cada execução**. As duas
    sessões que corriam em paralelo em 2026-09-12 chegaram a esse diagnóstico separadamente. Antes
    de investigar uma reprovação do painel, confira se o erro diz `Test timed out in 5000ms`.
  - O gate é "sem regressão". Ver [`../../CLAUDE.md`](../../CLAUDE.md).
- **A baseline de lint do painel é 25 erros / 4 warnings**, em boa parte
  `@typescript-eslint/no-explicit-any` nos hooks admin (`entities/*/api/useAdmin*`). O gate é "sem
  erros novos". *(Dizia 28/7 até 2026-09-05: a `34` apagou `OrderDetailDialog.tsx` e levou junto três
  `no-explicit-any`, e o número aqui não acompanhou. **Baseline que cai também precisa ser anotada** —
  senão a feature seguinte compara contra folga que não existe mais.)*
- **`fetchStatusCounts` lê `orders` sem paginação** e herda o teto de 1.000 do PostgREST (`BL-008`).
  As contagens da fila de material entram no mesmo teto; corretas até 1.000 pedidos.
  - **`AdminQuickGridPage.tsx:127` e `AdminProductsPage.tsx:173` têm o mesmo teto sobre `products`**,
    e a `51` os deixou de fora por decisão de escopo — são caminho de importação de CSV, não de
    seletor. O modo de falha é pior que uma contagem errada: as duas montam um `Set` de slugs para
    recusar duplicata, e acima de 1.000 produtos o PostgREST corta **sem avisar**, a tela conclui que
    o slug está livre e **cria a duplicata em silêncio**. São 702 produtos hoje. O conserto é
    `readAllPages`, que já é o dono desta regra no repositório — foi o que a `51` usou no pool.
- **`BL-009` está FECHADO** (feature `39`, T19). O motor de upload — validar, comprimir e gravar no
  Storage — saiu de `features/product-form/lib` para **`shared/lib/uploadImage.ts`**, porque três
  features o consomem (produto, Home e o banner do menu) e feature importando de feature é a
  fronteira FSD ao contrário. O `|| 'https://<ref>.supabase.co'` do `SUPABASE_URL` **morreu na
  mudança de casa**: ele era inalcançável (o client lança sem `VITE_SUPABASE_URL`), e é exatamente
  assim que um fallback se parece antes de virar defeito — bastava alguém dar um default ao client
  para toda imagem enviada apontar para outro projeto, sem erro nenhum. `BL-010` e `BL-011` seguem
  abertas.
  - **O `cacheControl` do upload é `STORAGE_CACHE_CONTROL` de `@estrelinha/core/media` — um ano, não
    uma hora** (`PRF-05`, feature `38`). O caminho do objeto carrega um UUID, então ele é imutável:
    uma hora fazia cada revisita rebaixar o arquivo **e** repetir a transformação do `render/image`,
    que é o que custa dinheiro. **Quase se perdeu no merge das duas features**, e o modo de falha
    merece registro: a `38` pôs a constante no arquivo antigo, a `39` mudou o motor de casa, e o
    merge automático manteve as duas coisas **sem conflito** — o painel voltou a gravar `'3600'` e o
    guarda passou a ler um arquivo que não faz mais upload. Peça certa, endereço errado, suíte
    verde. O guarda em `shared/lib/__tests__/uploadImage.test.ts` agora lê **os dois** arquivos: o
    novo tem de citar o dono, e o antigo não pode ter `cacheControl` nenhum.
  - **A miniatura da arte do banner do menu pede a rendição de 64px** (mesma origem), pelo mesmo
    dono da loja. Duas cópias da régua de "qual URL nesta vaga" seriam o defeito 01 em bytes.
