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
| *(rodapé)* | Configurações |

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
- **O hero é indelével**: sem controle de desligar na lista **e** com trigger na migration. Os dois
  precisam existir — sem o trigger a regra morre num `PATCH` direto; sem o controle escondido, a dona
  clica e leva um erro do banco.
- **Editor de seção é ROTA, e ela troca só a coluna da lista** (`/admin/home/:sectionId`). É o
  precedente dos Descontos ("editor é tela, não modal") sem o preço que ele costuma cobrar — que aqui
  seria apagar a prévia justamente enquanto a dona edita olhando para ela. **A prévia não remonta**, e
  isso é asserido por identidade do nó do DOM.
- **A arte da Home tem bucket próprio (`home-images`)**, separado de `product-images`: banner de
  campanha **sobrevive** à coleção que ele apontava, e uma limpeza futura de imagem órfã de produto
  não pode alcançá-lo.

### A ponte da prévia (feature `25`)

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

## `/admin/menu` — a curadoria da barra do topo

Duas colunas mandam: `show_in_menu` (a vaga, **válida em qualquer profundidade**) e `menu_promo jsonb`
(`{ category_id, badge?, title?, subtitle? }`, nulo = sem card). A **ordem é a `sort_order` que já
existia** — não há coluna `menu_order`. A regra é de `@estrelinha/core/menu`.

- **O contador mostra "5 de 4" quando há cinco marcadas**, e isso é de propósito: `menuEntries` não
  trunca em `MENU_SLOT_LIMIT`. Truncar esconderia a quinta da **única tela onde ela pode ser
  desmarcada**.
- **Destino de promo apagado não quebra a tela**: `resolvePromo` devolve `null` para destino
  inexistente ou inativo — `menu_promo.category_id` mora em jsonb e não tem FK, então
  `on delete set null` não dispara.

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

## Dívidas conhecidas deste app

- **A baseline de lint do painel é 25 erros / 4 warnings**, em boa parte
  `@typescript-eslint/no-explicit-any` nos hooks admin (`entities/*/api/useAdmin*`). O gate é "sem
  erros novos". *(Dizia 28/7 até 2026-09-05: a `34` apagou `OrderDetailDialog.tsx` e levou junto três
  `no-explicit-any`, e o número aqui não acompanhou. **Baseline que cai também precisa ser anotada** —
  senão a feature seguinte compara contra folga que não existe mais.)*
- **`fetchStatusCounts` lê `orders` sem paginação** e herda o teto de 1.000 do PostgREST (`BL-008`).
  As contagens da fila de material entram no mesmo teto; corretas até 1.000 pedidos.
- **`uploadProductImage.ts` tem `SUPABASE_URL` com fallback hard-coded de outro projeto**
  (`BL-009`..`BL-011`).
