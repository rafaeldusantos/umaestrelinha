# 102 · Campanhas de desconto — cadastro no painel, percentual por produto, a vitrine e o selo da campanha

Costura de 2026-11-13. PRD r1.

Registro do que se descobriu e decidiu nesta data — **não** descrição do estado atual do código.
Critérios de aceite: `prd.md`, ao lado. Convenção de cada repositório: o arquivo de instruções dele.

## Escopo

| UC | Título | Origem |
| --- | --- | --- |
| UC-01 | Cadastrar a campanha | caso de uso do PRD |
| UC-02 | Editar e encerrar | caso de uso do PRD |
| UC-03 | Marcar a peça | caso de uso do PRD |
| UC-04 | Marcar várias de uma vez | caso de uso do PRD |
| UC-05 | A peça na loja, durante a vigência | caso de uso do PRD |
| UC-06 | A vitrine da campanha | caso de uso do PRD |
| UC-07 | O bloco "Joias em oferta" na Home | caso de uso do PRD |

As regras RN-01..RN-17 e os critérios CA-01..CA-17 do `prd.md` valem para os UCs acima; RN-07 (feed) e o
pedido montado de RN-04 não têm tela própria na loja e são tratados como agregados nesta costura.

**Achados de eval que este Work Item resolve**

`nada` — o repositório não tem relatório de avaliação local em `.specs/evals/`, e o WI não vem de achado de
eval.

**Anexos consultados**

| Insumo (caminho ou URL) | Tipo | O que se tirou | Alimenta |
| --- | --- | --- | --- |
| `prd.md` (r1) | PRD | os UCs, RNs, CAs e D-01..D-07 | todos |
| Claude Design `4abe021d-…` · `Black Friday - Selo v2.html` | protótipo (fonte de design) | ver **Design** | UC-05 |
| Claude Design · `Black Friday - Vitrine ofertas.html` | protótipo | ver **Design** | UC-06 |
| Claude Design · `Painel - Campanhas, faixa e perfil.html` | protótipo | ver **Design** (só Campanhas e o campo do produto) | UC-01..UC-03 |
| Claude Design · `Black Friday - Selo.html` | protótipo | só a confirmação de que a v2 (B com o bloco da A) é a escolhida | UC-05 |
| Claude Design · `Black Friday - Home.html` | protótipo | ver **Design** | UC-07 |
| `apps/backoffice/src/widgets/admin-layout/model/navItems.ts` | código | grupo Descontos = Cupons, Promoções (`:76-79`) | UC-01 |
| `apps/store/src/entities/product/ui/ProductCard.tsx`, `ColorPreview.tsx` | código | `CardBadge` (`:39`), `hasDiscount` (`:159-164`), cadeia de selos (`:304-312`), miniaturas a 14 px (`ColorPreview.tsx:139`) | UC-05 |
| `supabase/functions/mercado-pago/handlers.ts`, `supabase/functions/checkout/handlers.ts` | código | reprecificação pelo banco (`:546-570`), guarda de teto (`:811-846`); `COLUNAS_DOS_ITENS` (`:257-274`), `linhaDoItem` (`:288-301`) | UC-05 |
| `packages/core/src/payment/pricing.ts`, `packages/core/src/shopping/pricing.ts` | código | `resolveOrderPricing` (`:673`), `resolveOrderLines` (`:749`); `offerPricing` (`:48`) | UC-05, RN-07 |
| `packages/supabase/src/types/promotion.ts` | código | a promoção progressiva tem `valid_from`/`valid_until` com fim inclusivo — outra regra | RN-17 |
| `packages/core/src/time/zone.ts` | código | `STORE_TIME_ZONE` (`:10`) | RN-03 |
| `apps/backoffice/src/features/bulk-edit` | código | `buildBulkPatch.ts`, `BulkEditPanel.tsx` | UC-04 |

## Fora do escopo

Verbatim do `prd.md` › Fora:

- Desconto por variação diferente do da peça.
- Desconto em valor (R$) em vez de percentual.
- Mudar como cupom, promoção progressiva e Compre Junto funcionam fora das peças de campanha (RN-16 e RN-17 só tiram
  as peças de campanha da base deles).
- Campanha por categoria inteira (marcar a categoria em vez das peças).
- O perfil de cores (WI 100) e a faixa de avisos (WI 101) ligarem sozinhos com a campanha (podem seguir a vigência
  depois).

**Máquina de estados da campanha** (derivada, nunca gravada): `Desligada` (interruptor desligado e fim no
futuro) · `Agendada` (ligada, início no futuro) · `Em vigência` (ligada, início ≤ agora < fim) · `Encerrada`
(fim no passado). `!active` com fim no futuro é Desligada; fim no passado é Encerrada, ligada ou não.

## Design

Fontes: Claude Design, projeto "Uma Estrelinha - Black Friday" (`4abe021d-d77e-4fe7-affd-524180315fa3`), MCP
`claude-design` — os links de `item.md` › Insumos e do cabeçalho do `prd.md` (o PRD não tem seção "Expectativas de
UI/UX"; os links estão no cabeçalho dele e no `item.md`). Fonte `Claude Design · por Work Item` do `PROJECT.md`.
Os arquivos `Black Friday - Sacola.html` e `Sacola v2.html` não foram lidos (fora do briefing); a sacola é a do
Selo v2.

### Selo · a faixa (cartão) — UC-05
- Colada no pé da foto, ponta a ponta, **30 px**; camada acima da foto, miniaturas acima dela. O contêiner da foto
  (cantos de 20 px) corta a faixa nos cantos.
- Duas partes: **texto** (ocupa o resto; cor de destaque sobre a cor da faixa; 11 px, negrito, maiúsculas, 0,08 em;
  folga 12 px à esquerda e 8 px à direita; não quebra; o excesso é cortado sem reticências) e **percentual** (largura
  fixa; cor da faixa sobre a cor de destaque; 13 px negrito; folga 11 px; formato "−20%" com sinal de menos
  tipográfico).
- Cores padrão #161514 / #C2A063. Nome para leitor de tela: "{texto do selo}, {pct}% de desconto".
- Sem percentual, o cartão é o de hoje.

### Selo · em linha (página do produto, sacola) — UC-05
- 26 px de altura, cantos de 6 px, alinhado ao início. Texto 11 px negrito maiúsculo 0,08 em, folga 10/9 px;
  percentual 12 px negrito, folga 9 px.
- Página do produto, na coluna de informação: selo em linha → nome → preço com desconto → "De R$ X (riscado) · 4x de
  R$ Y sem juros" ("De " só para leitor de tela).
- Sacola: na linha do item, o valor com desconto com o cheio riscado ao lado; na fileira de chips, o selo em linha no
  lugar do chip de desconto.

### Cartão com miniaturas de cor — UC-05, CA-11
- Cartão: foto 4:5 cantos 20 px · coração 32 px a 8 px do topo/direita · miniaturas no canto inferior esquerdo · a
  faixa · nome até 2 linhas · preço cheio riscado ("De " para leitor de tela) **acima** do preço com desconto · "4x de
  R$ … sem juros" sobre o preço com desconto.
- Miniaturas: 40 px (celular), 45 px a partir de 768 px, 6 px de espaço, 14 px da esquerda. Sem selo: 14 px do pé. Com
  selo: 40 px do pé no celular e 42 px a partir de 768 px (10 e 12 px acima da faixa). Quantidade pela largura do
  cartão como hoje (<162: nenhuma · 162–212: 1 + "+N" · 213–263: 2 + "+N" · ≥264: 3 + "+N"); menos de 2 cores, nada.
  Grupo "Cores disponíveis".

### Vitrine `/ofertas` — UC-06
- Trilha "Início › {nome da campanha}", título = nome (28 px celular, 44 px a partir de 1024), linha "Peças com
  {lista} de desconto até {data}." (lista "10%, 15% e 20%"; um só: "10%"; data "30 de novembro", dia e mês por
  extenso, sem ano).
- Chips "Todas · N" e "{p}% · n" (estado pressionado; rolam de lado no celular; alvo 44 px). A partir de 768 px
  chips e ordenação numa linha. Grade 2 / 3 (768) / 4 (1024) colunas. Cartões com a faixa nas cores da campanha.
- Sem campanha: trilha "Início › Ofertas", caixa "Não há ofertas agora", texto "Quando houver uma campanha com peças em
  oferta, elas aparecem aqui. Enquanto isso, as coleções da loja continuam abertas.", botão "Ver as coleções".
- Troca de campanha: filtro volta a "Todas"; nome, percentuais, data, texto e cores mudam. Exemplo Dia das Mães:
  #6E2433 / #F6DCD8, 10% e 15%, "até 10 de maio".
- O design não mostra carregando, erro, rolagem infinita nem os filtros da categoria.

### Painel · Campanhas · lista — UC-01
- Grupo **Descontos** (Cupons, Promoções, **Campanhas**). Trilha "Descontos › Campanhas". Título "Campanhas",
  subtítulo "Descontos por percentual, com início e fim. Uma campanha em vigência por vez." Botão "Nova campanha".
- Tabela (computador): selo em linha (texto, cores, maior percentual) antes do nome · Campanha · Vigência ("13/11 a
  30/11/2026") · Percentuais (pílulas) · Peças (soma, à direita) · Estado (pílula: Em vigência verde, Agendada azul,
  Encerrada cinza, Desligada âmbar). Celular: cartões — nome + estado; "{vigência} · {n} peças"; selo + pílulas.
- Linha/cartão abre a edição. Nota do rodapé: "A campanha vale na loja só quando está ligada e dentro da vigência
  (horário de Brasília). Encerrada, ela fica aqui com as marcações das peças, sem efeito."
- O design não mostra vazio, carregando nem erro.

### Painel · Campanha · nova / editar — UC-01, UC-02
- Trilha "Descontos › Campanhas › {Nova campanha | nome}". Nova: título "Nova campanha". Edição: nome, pílula do
  estado, subtítulo "{vigência} · {n} peças marcadas", botão "Ver as peças".
- Duas colunas: à esquerda Identificação, Vigência, Percentuais, Cores do selo, interruptor; à direita a prévia
  (acompanha a rolagem no computador). Abaixo de 1024 px, uma coluna. Barra de salvar no pé ("Pronta para salvar." /
  "Corrija o que está marcado para salvar.").
- **Nome**: texto até 40, obrigatório (vazio desliga Salvar), contador "{n} / 40", dica "Aparece no título da vitrine
  (/ofertas) e no bloco de ofertas da Home."
- **Texto do selo**: digitável além de 14; contador "{n} / 14", vermelho acima de 14 com "O selo cabe até 14
  caracteres no cartão do celular. Use uma forma curta do nome."; sem erro, "Sai em maiúsculas na faixa do cartão, ao
  lado do percentual. Veja a prévia ao lado." Vazio ou igual ao começo do nome, acompanha os 14 primeiros caracteres
  do nome.
- **Vigência**: "Começa em" e "Termina em", data + hora (nova nasce 00:00 e 23:59). Nota "Horário de Brasília. Fora
  desse intervalo nenhum desconto da campanha vale, mesmo com as peças marcadas." Fim antes do início: "O fim vem antes
  do início." Cruzada: "A vigência cruza a da campanha “Natal” (01/12 a 24/12). Só uma campanha ligada pode valer por
  vez: mude as datas ou desligue a outra."
- **Percentuais**: "São as opções que aparecem no cadastro da peça. Até 5, de 1 a 70%." Vazio: "Nenhum percentual
  ainda." Campo só dígitos (até 2) com sufixo "%", Adicionar (ou Enter), erros "Use um número de 1 a 70." · "{n}% já
  está na campanha." · "Até 5 percentuais por campanha." Pílulas de 48 px em ordem crescente com o uso ("9 peças",
  "1 peça", "nenhuma peça") e botão "Tirar {p}%". Tirar em uso: "{n} peças usam {p}%. Mude essas peças para outro
  percentual (ou tire da campanha) antes de tirar o {p}%." + link "Ver as peças com {p}%".
- **Cores do selo**: "O texto sai na cor de destaque sobre a faixa, e o percentual na cor da faixa sobre o
  destaque." Cor da faixa e cor de destaque: seletor + hex (#RRGGBB, maiúsculas). Medida com uma casa e vírgula:
  inválido "Use o formato #RRGGBB nas duas cores."; ≥ 4,5:1 verde "{x,y:1} Contraste bom para ler o selo."; abaixo,
  vermelho "{x,y:1} Pouca diferença entre as cores: o selo fica difícil de ler. Escolha cores com mais diferença (o
  mínimo é 4,5:1)." Combinações prontas: "Preto e ouro" #161514/#C2A063 · "Ardósia e ouro" #23303A/#B8945F · "Vinho e
  rosa" #6E2433/#F6DCD8. Nova nasce preto e ouro.
- **Interruptor** "Campanha ligada": "Desligada, a campanha não vale na loja mesmo dentro da vigência. As marcações
  das peças ficam guardadas." Nova nasce ligada.
- **Prévia**: cartão de 173 px (foto 4:5, faixa, "Joia Afetiva com Dente de Leite", R$ 179,90 riscado, preço com o
  maior percentual; sem percentual usa 10; texto vazio mostra "Campanha"; cor inválida cai para preto e ouro).
  Legenda "Cartão do celular (173 px). Na página da peça e na sacola:" + selo em linha. Na edição: "Estado: {em
  vigência até 30/11 às 23:59 | agendada — começa em 01/12 às 00:00 | encerrada em 10/05 | desligada}" e "Vitrine:
  /ofertas".
- **Ações**: "Encerrar agora" (vermelho, só na edição de campanha em vigência); Salvar desligado com contraste
  insuficiente, selo > 14, vigência cruzada, nenhum percentual, nome vazio.
- O design não mostra apagar, confirmações, nem o destino de "Ver as peças".

### Painel · Produto · campo da campanha — UC-03
- Aba **Preço e estoque**, abaixo do cartão Preço. Um cartão por campanha: cabeçalho com nome, pílula do estado e
  vigência ("13/11 a 30/11/2026"); texto "Desconto desta peça na campanha. Vale para todas as variações."; grupo de
  escolha única "Desconto na {nome}": "Nenhum · 10% · 15% · 20%" (botões ≥ 64 px, números em negrito).
- Com percentual: preço base riscado → preço com desconto + selo em linha; tabela "Variação / Preço / Na campanha"
  (coluna Preço some abaixo de 1024 px).
- Notas: em vigência "A loja mostra este preço até 30/11 às 23:59. O preço cadastrado não muda, e cupom não vale nesta
  peça durante a campanha."; agendada "A loja mostra este preço a partir de 01/12. …"; Nenhum "Sem desconto: a peça
  fica fora da vitrine /ofertas e sem selo."

### Home · "Joias em oferta" — UC-07
- Seção branca. Rótulo "{nome} · …", título "Joias em oferta", texto "Peças selecionadas com {lista} de desconto. O
  valor de cada joia já aparece com o desconto."
- Um cartão por percentual: número grande com "%", "de desconto", "Ver as peças →"; leitor de tela "Ver as peças com
  {n}% de desconto". Uma coluna no celular (104 px, número 56 px); três colunas a partir de 768 px (220 px, número 88
  px). Tons da paleta da loja: fundo claro, ouro, e escuro com número em ouro.
- Subtítulo "Algumas das peças em oferta" + "Ver todas"; fileira de cartões com a faixa (rola de lado; 164 px celular,
  220 px a partir de 1024).

Divergências entre fontes e com o PRD: resolvidas em **Decisões** (H-09).

## Código — /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-102

- **Instruções** — `CLAUDE.md` › O "defeito 01" · Convenções que valem em todo o repositório · Os guardas ·
  Baselines · CI e deploy · Feature-Sliced Design / Alias de import; `apps/store/CLAUDE.md` › Endereçamento · O
  `<title>` de cada rota · O HTML servido (`api/page`) · Sitemap · A listagem de categoria / os filtros · Carrinho,
  chrome e checkout · A sacola v4; `apps/backoffice/CLAUDE.md` › A sidebar · Molde dos formulários · Descontos;
  `packages/core/CLAUDE.md` › Quando um código pertence a este pacote · Pureza · Os módulos · Dinheiro · `shopping` ·
  `home` · `proposals`; `supabase/CLAUDE.md` › Migrations · RLS — o molde que os guardas cobram · Compre Junto;
  `apps/mobile-adm/CLAUDE.md` › Montar pedido (WI 94).
- **Recorte** — UC-01..UC-07, todos.

### O que já serve
- Contraste: `packages/core/src/color/contrast.ts:59 › contrastRatio` (`parseHex:24`). #161514 × #C2A063 = 7,38:1.
- Fuso: `packages/core/src/time/zone.ts:10 › STORE_TIME_ZONE` (folha sem import; `fusoComDonoUnico` recusa o literal
  fora dele).
- Campo opcional no cálculo: `packages/core/src/payment/pricing.ts:65 manualDiscount?`, `:74 buyTogether?` (ausente ⇒
  saída idêntica).
- Guarda de teto com 422: `supabase/functions/mercado-pago/handlers.ts:811-846` (`promotion_no_longer_valid`, "Um
  desconto deste pedido mudou. Nada foi cobrado.").
- Cobrança travada: `mercado-pago/handlers.ts:478-509 › lockedProposalCharge` / `lockedFirstCharge`.
- Leitura pública por `now()`: `supabase/migrations/20260803130000_promotions-progressive.sql:182-219`
  (`promotions_public_read`, filhas por `exists`); teto por gatilho `:160 validate_promotion_tier`.
- `api/page` lê com a chave publicável: `apps/store/server/page.ts:209` — o `<head>` servido já passa pela RLS.
- Feed: `packages/core/src/shopping/pricing.ts:48 › offerPricing`, `shopping/xml.ts:54`, `shopping/jsonld.ts:32`,
  `shoppingParity.test.ts`.
- `ctaHrefRefusal` aceita `/ofertas`: `packages/core/src/home/refusals.ts:134-157`.
- Resumo de descontos do pedido: `packages/core/src/orders/summary.ts:55 OrderDiscountKey`, `:94
  ORDER_DISCOUNT_LABELS`, `:129 orderSummary`.
- Telas do painel: `AdminPromotionFormPage.tsx`, `AdminPromotionsPage.tsx`, `AdminCouponFormPage.tsx`,
  `shared/ui/FormPageHeader`, `FormCard`; status por regra pura `features/coupon-list/model/couponStatus.ts`.
- Filtro da lista no servidor: `apps/backoffice/src/entities/product/api/productQuery.ts:39,56,73` (`supplierIds`),
  `useAdminProducts.ts:104`, `features/product-list/model/__tests__/fornecedorNosFiltros.test.ts`.
- Fileira de produtos da Home: `ProductCarousel` (row/slider/grid), `core/home/featured.ts`.
- `/black-friday` hoje: categoria `black-friday` existe **desligada** (banco local, medido 2026-11-13); cai em
  `category_fallback` (`apps/store/server/page.ts:159`). Nenhuma categoria `ofertas`.
- Variações com `compare_price > price`: 93 no banco local; produtos com `original_price > base_price`: 0.

### O que muda
- Sacola: `apps/store/src/entities/cart/model/cartStore.ts:179,220` (`variant?.unitPrice ?? product.price`), `:248
  subtotal`, `:256 freeShippingState`, `version: 4` (`:263`).
- Checkout: `apps/store/src/features/checkout/model/useCheckoutTotals.ts:180,186,204,240-241`; prévia da promoção
  `entities/cart/model/useCartPromotion.ts:15,145,170,187`.
- Cálculo: `packages/core/src/payment/pricing.ts:101 round2`, `:114 resolveCouponDiscount`, `:594 priceOnePath`, `:631
  priceOnePathWithBuyTogether`, `:673 resolveOrderPricing`, `:749 resolveOrderLines` (`fullUnitPrice` `:763,:772`;
  resíduo do bump `:793-794`).
- Cupom: `packages/core/src/coupons/rules.ts:28-59 › CouponContext`, `couponRefusal`; `core/hooks/useCoupons.ts:85-93 ›
  validateCoupon` (chamado só de `CouponInput.tsx:45`).
- Compre Junto: `packages/core/src/buy-together/cartDiscount.ts:149 allocateBuyTogetherDiscount`, `:282
  buyTogetherDiscountConfig`; `discount.ts:11-17 buyTogetherDiscountedPrice`.
- `create-payment`: `mercado-pago/handlers.ts:546-570` (lê só `base_price`/`price`), `:686 now`, `:746-760` (cupom
  sem `min_order`), `:777-786 pricingInput`, `:811-819` teto, `:875-876`/`:920-921` gravação, `:967-970
  ITENS_DO_RECALCULO`, `:980 SNAPSHOT_DA_LINHA`, `:1023-1066 regravarLinhas`, `:914-921,1404-1454` cobrança travada;
  `supabase/migrations/20261115120000_98-preco-travado.sql:25-39` (`order_charge_locks`).
- `create-order`: `supabase/functions/checkout/handlers.ts:239-244 COLUNAS_DO_PEDIDO`, `:257-274 COLUNAS_DOS_ITENS`,
  `:276-301 COLUNAS_DA_MARCA`/`linhaDoItem` (hoje não lê `products`).
- Pedido montado: `supabase/functions/order-proposals/handlers.ts:297-318 promocoesVigentes`, `:369`, `:376`, `:433
  resolveItemPrice`, `:481-505 couponRefusal`; `packages/core/src/proposals/pricing.ts`, `proposals/piece.ts:33,48,
  108,122`; `supabase/functions/checkout/proposal.ts`; painel `features/order-proposal/*`; app
  `apps/mobile-adm/src/entities/product/api/catalogoDaMontagem.ts`, `features/order-proposal/model/sacola.ts`,
  `ui/FolhaDaVariacao.tsx`.
- Feed: `supabase/functions/google-feed/index.ts:13,21,57-68`; `core/shopping/pricing.ts:48-54`, `offer.ts:176-188`,
  `types.ts:123`.
- Página servida: `apps/store/server/page.ts:52,101-102`; `packages/core/src/page/serve.ts:117-119,179,196`;
  `page/classify.ts:18-23 PathKind`, `:66-89 classifyPath`.
- Rotas: `packages/core/src/routes/routes.ts:22-79 ROUTE_SLUGS`, `:222-240 SITEMAP_STATIC_PATHS`, `:254-284
  NON_INDEXABLE_PATHS`, `:302-311 LEGACY_REDIRECTS`, `:356-362 APP_ROUTE_PATTERNS`; sitemap
  `apps/store/server/sitemap.ts:74,91,108`, `core/sitemap/urls.ts`; meta `core/seo/pages.ts › staticPageMeta`.
- Cartão: `ProductCard.tsx:39 CardBadge`, `:146 selectedPrice`, `:159-164`, `:304-312`, `:365-371`;
  `ColorPreview.tsx:139`.
- Mapeador: `apps/store/src/entities/product/lib/mapProduct.ts:106-134 PRODUCT_CARD_SELECT`, `:187-192
  mapDbToProduct`.
- Filtros: `apps/store/src/features/category-filters/model/filters.ts:88-91 priceBounds`, `:94 hasDiscount`,
  `:107-109`, `:119-126`, `:306-312`, `:328 matchPrice`.
- Outras leituras de `price` na loja (31 arquivos): `shared/lib/analytics/items.ts:36,54`,
  `features/abandoned-cart/model/useAbandonedCartTracker.ts:89`, `features/search/ui/SearchDropdown.tsx`,
  `SearchOverlay.tsx`, `widgets/cart-drawer/ui/CrossSell.tsx`, `CartDrawerRow.tsx:114`,
  `features/checkout/ui/OrderBump.tsx`, `OrderSummary.tsx`, `entities/product/ui/ProductInfo.tsx`,
  `widgets/product-buy-bar/ui/ProductBuyBar.tsx`, `entities/product/ui/buy-together/AddonRow.tsx`, `AddonPanel.tsx`,
  `entities/product/model/useBuyTogether.ts`, `entities/cart/lib/buyTogetherPricing.ts`,
  `entities/cart/lib/toQuotePayload.ts`, `features/shipping-calc/ui/ShippingCalc.tsx`; seguro
  `packages/core/src/shipping/quotePayload.ts:45`.
- Resumo do pedido: `core/orders/summary.ts:50-52,55,94,158,180-182`, `mercado-pago/analytics.ts`,
  `send-notification/render/layout.ts`, `send-notification/dispatch.ts`, `apps/store/src/entities/order/api/useOrders.ts`,
  `entities/order/ui/OrderItemsSummary.tsx`, `apps/mobile-adm/src/entities/order/model/linha.ts`; view `order_list`
  vigente em `20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql` (a da `20261110150000_…` mais `manual_discount` no fim).
- Tipos: `packages/supabase/src/types/`.
- Painel: `navItems.ts:76-79`; `features/product-form/ui/tabs/PricingTab.tsx`; `features/bulk-edit/model/
  buildBulkPatch.ts:9-12,102`, `ui/BulkEditPanel.tsx`.
- Home: `packages/core/src/home/catalog.ts:11-22 HOME_SECTION_TYPES`, `:36 UNIQUE_SECTION_TYPES`, `:99-105`; `check`
  vigente em `20260906120000_41-banner-principal-da-home.sql`.

### O que nasce
- Tabelas `campaigns`, `campaign_percents`, `product_campaigns`; colunas `order_items.campaign_id`,
  `campaign_percent`, `compare_unit_price`, `orders.campaign_discount`, `order_charge_locks.campaign_discount`;
  constraint de exclusão (a primeira do repositório); gatilho de teto de 5; policies pública (por `now()`) e de
  admin; view de uso por percentual (`security_invoker`); recriação do `check` de `home_sections.type` e da view
  `order_list`.
- `packages/core/src/campaigns/` — `live.ts`, `price.ts`, `refusals.ts`, `status.ts`, tetos, cores padrão, texto da
  vitrine e conversão do fim (H-04).
- Leitura de campanha das functions com relógio injetado (H-06).
- Selo v2 (faixa e em linha) em `apps/store/src/entities/` (lido por card, página e sacola — `AD-033`).
- Página `/ofertas` (lazy) e os chips por percentual.
- Bloco "Joias em oferta" (core/home, widget da loja, editor/bandeja no painel).
- Telas Campanhas (lista, nova, editar) e um campo de data **e hora** de Brasília no painel (`shared/ui/DateField` é só
  de dia).
- Guardas: paridade SQL × TS da vigência, dono único do preço de campanha, selo sem token `estrelinha-*`, schema da
  migration, `denoReach` de `core/campaigns`, recusa de chamada de vigência na loja.

### Exemplares
| Tipo de mudança | Siga a forma de |
| --- | --- |
| Campo opcional em `resolveOrderPricing` | `packages/core/src/payment/pricing.ts:65 manualDiscount`, `:74 buyTogether` |
| Folha de `core` alcançável pelo Deno | `packages/core/src/time/zone.ts`, `buy-together/discount.ts` |
| Policy pública por vigência | `supabase/migrations/20260803130000_promotions-progressive.sql:205-230` |
| Teto por gatilho | `promotions-progressive.sql:160 › validate_promotion_tier` |
| Recriar `check` e trocar guarda nos dois sentidos | `20260906120000_41-banner-principal-da-home.sql` + `homeSections.test.ts:46-62,150-171` |
| Recriar view acrescentando no fim | `20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql` (a vigente; copie a lista dela sem reordenar e acrescente depois de `manual_discount`) |
| Marca no pedido gravada pelo servidor | `supabase/functions/checkout/handlers.ts:276-301 › COLUNAS_DA_MARCA`, `linhaDoItem` |
| Guarda de teto e 422 | `mercado-pago/handlers.ts:798-846` |
| Guarda de schema | `apps/store/src/shared/lib/__tests__/compreJuntoSchema.test.ts`, `visitasSchema.test.ts` |
| Paridade SQL × TS | `materialTransitions.test.ts` |
| Dono único com metade positiva | `freeShippingSingleOwner.test.ts`, `surfaceArtSingleOwner.test.ts` |
| `denoReach` | `packages/core/src/coupons/__tests__/denoReach.test.ts`, `pricing/__tests__/denoReach.test.ts` |
| Telas de cadastro | `AdminPromotionFormPage.tsx`, `AdminPromotionsPage.tsx`, `features/coupon-list/model/couponStatus.ts` |
| Filtro, chip e visão da lista | `productQuery.ts:39-73`, `fornecedorNosFiltros.test.ts`, `useAdminProducts.ts:104` |
| Bloco de peças da Home | `core/home/featured.ts`, `ProductCarousel` |
| Página servida dinâmica | ramo de produto em `core/page/serve.ts:117` (`s-maxage=300`) |
| Probes | `.specs/work-items/WI-01-compre-junto/probes/` |

### Obrigações transversais
- Defeito 01: vigência, preço de campanha, status e recusas com um dono em `core/campaigns`, e guarda que recusa a
  segunda escrita.
- Cópia deliberada SQL × TS da vigência com guarda que lê a migration (molde `materialTransitions`).
- `.ts` explícito em todo especificador relativo de `core/campaigns` e do que as functions importam (`import type`
  incluso).
- `strictNullChecks: false`: recusas em `string | null`, discriminação por literal de string.
- `AD-012`: toda gravação provada por probe contra o banco local.
- `AD-017`: `check` de `home_sections.type`, `order_list` e `order_charge_locks` só em migration nova.
- Migration só no local (`supabase migration up --local`).
- Ordem de publicação: migration → functions (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`) → bundles
  (o embed do card derruba a leitura inteira sem as tabelas).
- RLS do molde: sem `grant` a `anon`; escrita por `(select public.has_role(...))` no `using` e no `with check`; FK de
  destino `restrict`.
- `payment/**`: a suíte só ganha casos; `campaign` ausente ⇒ saída idêntica, inclusive a forma do objeto.
- `AD-015`: desconto por item nunca soma.
- Mobile primeiro (390×844), alvo 44 px, sem rolagem horizontal, fonte a 200 %.
- Guardas que não podem reprovar sem afrouxar: `cardSkeletonBox`, `alvoDeToqueNaoRoubaPosicao`, `accentText`,
  `touchTarget`, `fieldBorder`; `animacaoRespeitaMovimento` (escopo literal: os arquivos de UI novos entram) e
  `movimentoDosPedidos` no app.
- Tom (RN-14): sem contagem regressiva, escassez nem exclamação; `homeSections.test.ts:258-259`.
- Âncoras medidas em 2026-11-13: `metaPorRota.test.ts:43` 20; `rotasDeApp.test.ts:72-73` 27/16;
  `sitemapRoutes.test.ts:71` e `paginasFixasServidas.test.ts:164` 27; `routeSplitting.test.ts:123` 20;
  `seo.test.ts:200-201` 18; `vercelRedirects.test.ts:74` 4; `HOME_SECTION_TYPES` 11 (`catalog.test.ts:37`,
  `homeSections.test.ts:171`).

### Testes
- Unidade (`core`): 20% sobre R$ 209,90 = R$ 167,92; 15% sobre R$ 199,90 = R$ 169,92 (meio centavo para cima, por
  unidade); CA-06 numa variação (R$ 233,91, nunca R$ 215,91); vigência inclui o início e exclui o fim; os quatro
  estados; cada recusa do cadastro com o motivo; `resolveOrderPricing` sem `campaign` idêntico; CA-16 (cupom só nas
  comuns, recusa com o nome, mínimo só nas comuns, frete grátis, PIX sobre o total); CA-17 (faixa e casado sem a peça
  de campanha); bump cobra o menor; `campaignDiscount` fora do resíduo do bump; `shoppingParity` com a vigência.
- Handlers: `create-order` grava a campanha que resolveu e descarta a do corpo; recusa 422 quando a campanha exibida
  acabou (H-05); `create-payment` aplica a gravada depois do fim; teto com `campaign_discount`; `min_order`; linha
  partida preserva a campanha; pagar de novo com `campaign_discount` travado; `order-proposals` com preço de campanha e
  cupom recusado; `google-feed` com `sale_price` e `sale_price_effective_date` só em vigência.
- Componente/página real (jsdom): cartão com a faixa no lugar dos selos do canto, miniaturas acima, troca de foto sem
  navegar, "De R$"; página do produto com selo em linha e parcelas/PIX sobre o preço com desconto; sacola relida;
  checkout relendo ao voltar o foco e mostrando o 422; filtros e ordenação pelo efetivo; vitrine com chips e estado
  vazio; bloco da Home oculto sem campanha e com "DIA DAS MÃES" (CA-12); painel: as telas pela página real, a recusa de
  percentual em uso, a aba de preço com duas campanhas em ordem, a edição em massa, o filtro da lista.
- Integração local: probe SQL (exclusão, FK composta, 23503, teto de 5, `restrict`, `anon` vê só a em vigência, hex,
  `order_list`); probe HTTP `create-order` → `create-payment` dentro e fora da vigência, corpo forjado, feed; probe da
  gravação do painel.
- Navegador (QA): 390×844 e 1440×900, fonte a 200 %, cartões de 173 e 220 px, painel em 390, `/ofertas` com
  `noindex` fora da vigência.

### Depende / Expõe
- Expõe `/ofertas` como destino de link de um segmento (WI 101, faixa de avisos; `ctaHrefRefusal` aceita).
- Depende de nada do WI 100.
- WI 101 (outra sessão, só planejamento em 2026-11-13) tende a editar `navItems.ts`, o App.tsx do painel,
  `focusRoutes.test.ts`, `rotasSobGuarda.test.ts`, `core/page/head.ts`/`serve.ts`, `apps/store/server/page.ts`,
  `store_settings`/`storeSettingsDefaults.test.ts` e a tabela de baselines do `CLAUDE.md`. Conflito de merge esperado
  nesses arquivos; ver H-12 para as migrations.

## Fronteira entre repositórios

`nada` — topologia de repositório único (`PROJECT.md` › Topologia, conferência de fronteira: não).

## Cobertura dos UCs

| UC | Reivindicado por |
| --- | --- |
| UC-01 | `.` (migration, `core/campaigns`, painel) |
| UC-02 | `.` (painel, FK composta e view de uso) |
| UC-03 | `.` (`PricingTab`) |
| UC-04 | `.` (`bulk-edit`, `productQuery`, `product-list`) |
| UC-05 | `.` (cartão, página, sacola, checkout, `payment`, functions `checkout`/`mercado-pago`) |
| UC-06 | `.` (rota, `core/page`, `core/routes`, sitemap, `/black-friday`) |
| UC-07 | `.` (`core/home`, `check` de `home_sections`, widget e editor) |

## Decisões

| # | A pergunta | A resposta | Quem decidiu |
| --- | --- | --- | --- |
| T1 | A sacola guarda o preço congelado (`sacola-guarda-o-preco-congelado`) | A sacola e o checkout passam a precificar cada linha pela função de preço de campanha (RN-04) sobre o catálogo **relido** (a mesma consulta da vitrine, com as marcações em vigência), e não pelo `unitPrice` congelado: o `unitPrice` persistido fica só como valor de exibição até a releitura chegar. A mesma releitura alimenta o frete grátis por faixa e o `insurance_value`. Sem migração de `version` do `persist`. | o agente sob instrução do usuário, gate do PRD Tech Review (`sacola-guarda-o-preco-congelado` · `tech` · r1) |
| T2 | A campanha fora do resíduo do bump (`campanha-fora-do-residuo-do-bump`) | A entrada de `resolveOrderPricing` ganha, opcional, `campaign: { percent } \| null` por linha (ausente ⇒ resultado idêntico); a saída ganha `campaignDiscount`, descontado explicitamente antes do resíduo do bump; `full_unit_price` continua sendo o preço de tabela; `order_items` ganha `campaign_id`, `campaign_percent` e `compare_unit_price`, gravados pelo recálculo do servidor em `regravarLinhas`, nunca copiados do corpo; `orders` ganha `campaign_discount`. O recálculo passa a ler `original_price`/`compare_price`. | idem (`campanha-fora-do-residuo-do-bump` · `tech` · r1) |
| T3 | O preço gravado vem do navegador (`d05-o-preco-gravado-vem-do-navegador`) | A function `checkout` resolve, com o relógio dela, a campanha em vigência e a marcação de cada peça, e grava `campaign_id`/`campaign_percent` (fora de `COLUNAS_DOS_ITENS`, como a marca "acompanha"); o `mercado-pago` aplica a campanha **gravada na linha**, sem reavaliar a vigência. `chavesDoItemDoPedido.test.ts` e o teste de `linhaDoItem` provam que a campanha vinda do corpo é descartada. | idem (`d05-o-preco-gravado-vem-do-navegador` · `tech` · r1) |
| T4 | A campanha acaba entre a sacola e o pagamento (`campanha-acaba-entre-a-sacola-e-o-pagamento`) | A campanha entra na guarda de teto (recalculado menor que o exibido ⇒ 422 com o mesmo código e corpo do "Um desconto deste pedido mudou", antes de qualquer cobrança); a loja relê as marcações ao abrir o checkout e ao voltar o foco. Trecho do `prd.md` (UC-05) trocado em r1. | idem (`campanha-acaba-entre-a-sacola-e-o-pagamento` · `tech_prd_edit` · r1) |
| T5 | Vigência na loja (`vigencia-na-loja-pela-leitura-publica`) | Policy pública por `now()` nas tabelas novas (molde das promoções), `core/campaigns/live.ts` como dono em TypeScript com `.ts` explícito e sem import, e um guarda que lê a migration e exige o mesmo predicado (início inclusivo, fim exclusivo, `active`) nos dois lados. A loja nunca chama a função de vigência com `new Date()` — guarda de fonte recusando a chamada em `apps/store/src` fora do mapeador. | idem (`vigencia-na-loja-pela-leitura-publica` · `tech` · r1) |
| T6 | `/ofertas` muda título e indexação (`ofertas-titulo-e-indexacao-mudam-com-a-campanha`) | `/ofertas` ganha uma classe própria em `classifyPath` (dinâmica, como produto), com `<head>` montado da campanha em vigência, `s-maxage=300` e o sitemap incluindo `/ofertas` só com campanha em vigência; os dois guardas de classificação ganham o terceiro conjunto. Trecho do `prd.md` (UC-06) trocado em r1. | idem (`ofertas-titulo-e-indexacao-mudam-com-a-campanha` · `tech_prd_edit` · r1) |
| T7 | Arredondamento (`arredondamento-do-preco-de-campanha`) | O preço de campanha é calculado em centavos inteiros, por unidade, com meio centavo para cima, e só depois multiplicado pela quantidade; o "menor" de RN-06 compara em centavos. Trecho do `prd.md` (RN-06) trocado em r1. | idem (`arredondamento-do-preco-de-campanha` · `tech_prd_edit` · r1) |
| T8 | Faixa de preço e ordenação (`faixa-de-preco-e-ordenacao-pelo-preco-de-campanha`) | O mapeador do produto da loja expõe o preço efetivo da peça e de cada variação (já com a campanha em vigência, pela função de RN-04), e filtros, ordenação, limites da régua e o card leem esse campo; `hasDiscount` passa a ser "efetivo < cheio". Trecho do `prd.md` (RN-10) trocado em r1. | idem (`faixa-de-preco-e-ordenacao-pelo-preco-de-campanha` · `tech_prd_edit` · r1) |
| T10 | Onde mora a recusa do cupom (`recusa-do-cupom-mora-em-couponrefusal`) | Duas peças: (1) a base do cupom sem as linhas de campanha em `resolveCouponDiscount`/`priceOnePath`; (2) a recusa com o nome da campanha e o mínimo sobre a mesma base em `couponRefusal`, que ganha no contexto o subtotal elegível e o nome da campanha, chamada pela loja também quando a sacola muda, por `order-proposals` e pelo `mercado-pago` (que passa a conferir `min_order`, com o cupom recusado virando `null`). | idem (`recusa-do-cupom-mora-em-couponrefusal` · `tech` · r1) |
| T11 | Regras do cadastro no banco (`regras-do-cadastro-garantidas-no-banco`) | `campaigns` (nome, texto do selo, duas cores, `starts_at`, `ends_at`, `active`, `check` de tetos e `ends_at > starts_at`, constraint de exclusão sobre `tstzrange(starts_at, ends_at, '[)')` com `where (active)`); `campaign_percents (campaign_id, percent)` PK composta, `check` 1–70; `product_campaigns (product_id, campaign_id, percent)` PK `(product_id, campaign_id)`, FK composta `(campaign_id, percent) → campaign_percents on delete restrict` (a recusa de UC-02 vira `23503` traduzido com a contagem), `product_id on delete cascade`; `order_items.campaign_id on delete restrict` (RN-09). Teto de 5 por gatilho. Provado por probe SQL local. | idem (`regras-do-cadastro-garantidas-no-banco` · `tech` · r1) |
| T16 | CA-14 e o WI 100 (`ca-14-depende-do-wi-100`) | O selo lê só as duas cores da campanha, por `style` inline, nunca um token da loja; um guarda de fonte recusa token `estrelinha-*` nos componentes do selo. Trecho do `prd.md` (CA-14) trocado em r1. | idem (`ca-14-depende-do-wi-100` · `tech_prd_edit` · r1) |
| T17 | Nomes das colunas (`nomes-das-colunas-de-preco`) | `products.base_price`/`products.original_price` e `product_variants.price`/`product_variants.compare_price`; CA-06 é provado numa variação. | idem (`nomes-das-colunas-de-preco` · `tech` · r1) |
| T19 | Contraste no banco (`contraste-no-banco-seria-segundo-dono`) | No banco, só o `check` de formato (`^#[0-9A-Fa-f]{6}$`); a recusa por contraste é `core/color` chamada pelo painel; o selo aplica as cores por `style` inline e o teste do selo calcula a razão com `contrastRatio` sobre a semente. | idem (`contraste-no-banco-seria-segundo-dono` · `tech` · r1) |
| T20 | Inventário de guardas (`inventario-de-guardas-e-ancoras`) | As tarefas listam por nome os guardas e âncoras que movem; ordem de publicação migration → functions (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`) → bundles. | idem (`inventario-de-guardas-e-ancoras` · `tech` · r1) |
| H-01 | Dois donos de "percentual sobre preço": `buyTogetherDiscountedPrice` (float) × o preço de campanha em centavos | Convivem: o preço de campanha tem dono único em `core/campaigns/price.ts`, em centavos (T7); `buyTogetherDiscountedPrice` não muda, porque RN-17 tira a peça de campanha do casado e as duas réguas nunca se aplicam à mesma linha. O guarda de dono único do preço de campanha recusa a segunda escrita do preço **de campanha**, não a do casado. | o agente no gate principal, sob instrução do usuário ("use suas melhores recomendações") |
| H-02 | AD-014 ("conjunto de produtos é categoria") × RN-08 (vitrine derivada) | Vale RN-08 (D-01): `/ofertas` é a exceção declarada ao AD-014, como a lista do Compre Junto; a tarefa da vitrine registra a exceção em `apps/store/CLAUDE.md` › Endereçamento. | idem |
| H-03 | `/black-friday` → `/ofertas`: slug reservado ou só redirect | Só redirect: entrada em `LEGACY_REDIRECTS` e em `apps/store/vercel.json` (o `vercelRedirects.test.ts` compara os dois); **não** entra em `ROUTE_SLUGS`, para `reservedSlugRefusal` não recusar a categoria existente. A categoria `black-friday` continua desligada. | idem |
| H-04 | Fim inclusivo (promoção) × exclusivo (campanha, T11) | O banco guarda `ends_at` exclusivo. O painel digita e mostra o **último minuto que vale** ("Termina em 30/11 23:59"): gravar soma 1 minuto (`ends_at` = 01/12 00:00), mostrar subtrai 1 minuto. A conversão tem dono em `core/campaigns`. A promoção progressiva não muda. | idem |
| H-05 | Quem escreve o teto `orders.campaign_discount` e como pegar a campanha que acabou entre a tela e o `create-order` | A loja manda por linha o `campaign_percent` **exibido** (só para comparação, nunca gravado). O `create-order` resolve a campanha com o relógio dele: desconto de campanha do servidor **menor** que o exibido em alguma linha ⇒ 422 `promotion_no_longer_valid` com o mesmo corpo, nada gravado; **maior** (a campanha começou) ⇒ grava o do servidor. `orders.campaign_discount` é calculado pelo servidor. O `create-payment` aplica a campanha gravada (D-05) e a guarda de teto inclui `campaign_discount`. | idem |
| H-06 | Quatro functions leem a campanha (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`) | Um leitor só: `supabase/functions/_shared/campaigns.ts`, com client e relógio injetados, decidindo por `core/campaigns/live.ts`. A promoção (já copiada em duas functions) não é tocada. | idem |
| H-07 | O frete grátis por valor não é conferido no servidor no caminho comum (pré-existente) | Fora deste WI: a regra "conta com desconto" (RN-16) vale pela loja, que recebe o preço relido (T1). Registrado em Não resolvido. | idem |
| H-08 | O importador chama Black Friday de urgência fabricada (`tools/catalog-import/src/map/category.ts:45`) | Não muda: o importador está fora do escopo do `PROJECT.md`, e a categoria continua desligada. | idem |
| H-09 | Divergências design × PRD | Valem o PRD: cores e texto do selo da campanha (não fixos); larguras 173 e 220 px; selos do canto saem só na peça de campanha; o link "Ofertas" é posto pela dona no editor de menu; título, rótulo e percentuais do bloco da Home vêm da campanha; Salvar desligado com fim antes do início, comparando data e hora. Vale o design: a frase de recusa ao tirar percentual em uso ("{n} peças usam {p}%. Mude essas peças para outro percentual (ou tire da campanha) antes de tirar o {p}%." + "Ver as peças com {p}%"); o campo da peça como cartão (nome, pílula de estado, vigência, notas, prévia com selo e tabela por variação); a pílula de estado no campo da peça; o texto do selo digitável além de 14 com erro e Salvar desligado. A vitrine usa os filtros, a ordenação e a rolagem infinita da categoria (PRD) com os chips por percentual do design por cima; a lista própria de ordenação do protótipo não entra. | idem |
| H-10 | Lacunas do design | Apagar: botão na edição, só sem pedido que usou a campanha, com confirmação (`AlertDialog`); com pedido, desligado com o motivo. "Encerrar agora" com confirmação. Toda campanha é editável (inclusive encerrada), sujeita às recusas. "Ver as peças" → `/admin/produtos` filtrada pela campanha (e "Ver as peças com {p}%" pelo percentual). UC-03 com mais de uma campanha: um cartão por campanha, na ordem do início. UC-04 segue o molde do filtro por fornecedor e o painel de edição em massa (campanha → percentual, "Tirar da {nome}"). Filtro da vitrine na URL: `?percentual=<p>`. Bloco da Home: um cartão por percentual (1 a 5), cada um a `/ofertas?percentual=<p>`; "Ver todas" a `/ofertas`; sem campanha em vigência não renderiza; tipo único na Home, sem campos de configuração (título e percentuais vêm da campanha). Vazio, carregando e erro pelo molde do painel e da loja. **Superado pelo WI 103 (tarefa 02):** o bloco é repetível, um por campanha (`home_sections.campaign_id`, índice único parcial por campanha), com título e descrição da dona (recuo para o nome da campanha e a frase dos percentuais) e peças escolhidas; aparece só quando a campanha dele é a vigente. | idem |
| H-11 | O `<head>` e o JSON-LD servidos ficam em cache até 300 s na virada da campanha | Aceito: é a janela "em até 5 minutos" do UC-06 r1. | idem |
| H-12 | Prefixo das migrations, com o WI 101 em paralelo | As migrations deste WI usam prefixos de `20261130120000` em diante, um por tarefa que cria migration, apurados na hora como o próximo livre **a partir** de `20261130120000`; tarefas da mesma onda usam horas distintas (ver `waves.md`). No merge com o WI 101, prefixo repetido se renomeia antes. | idem |

### Decisões da implementação (raio largo, registradas na Validation)

Premissas que os implementadores tomaram sozinhos e que alcançam além de uma tarefa. As revisões conferiram cada uma, e o `implement-log.md` traz o detalhe.

| # | Decisão | Origem | Alcance |
| --- | --- | --- | --- |
| I-01 | O mapeador da loja (`mapDbToProduct`) **sobrescreve** `price`/`compare_price` da peça e das variações com o preço efetivo e o cheio da campanha, e acrescenta `Product.campaign`. Assim filtros, ordenação, busca, cartão, Compre Junto, GA4 e carrinho abandonado passam ao efetivo sem mudar nenhum leitor. O preço de tabela vai em `campaign.list_prices`, para o servidor não aplicar o desconto duas vezes. | T04 · 1, 2 | toda a loja; T05–T07 |
| I-02 | Uma peça só é "de campanha" (selo, vitrine, fora do cupom, da faixa e do Compre Junto) quando a campanha **baixa** o preço dela. Peça marcada cujo "de/por" já é menor continua comum, nas duas pontas. | T04 · 3, T05 · 2 | loja, vitrine, checkout, `mercado-pago`, `order-proposals` |
| I-03 | A variação calcula sobre o próprio `compare_price` e nunca herda o `original_price` da peça. Na loja e no servidor. | T04 · 4, T09 · 6 | loja, `checkout`, `order-proposals` |
| I-04 | A recusa "Este cupom não vale para peças da {nome}." vale só para cupom de percentual ou de valor. O cupom de frete grátis passa, e o pedido mínimo é conferido sobre a base elegível. | T05 · 6 | loja, `mercado-pago`, `order-proposals`, painel |
| I-05 | O 422 `promotion_no_longer_valid` do `create-order` vai com `total: null`. A loja mostra o total que ela mesma recalcula depois de reler o catálogo. | T05 · 7 | checkout |
| I-06 | O resumo do pedido tem a linha genérica "Desconto de campanha", sem o nome da campanha, também no e-mail (`send-notification`). | T05 · 14 | loja, painel, app, e-mail |
| I-07 | `/ofertas` é uma terceira classe de rota (`classifyPath` → `offers`): está em `ROUTE_SLUGS`, mas não em `SITEMAP_STATIC_PATHS` nem em `NON_INDEXABLE_PATHS`. Sem campanha, responde 200 com `noindex`. Uma falha de leitura dá shell `no-store`, e o sitemap inteiro responde 503. O grafo Deno de `core/seo` subiu de 15 para 22 arquivos. | T06 · 2–5 | `core/page`, `core/seo`, sitemap, guardas de rota |
| I-08 | Erro de leitura da campanha **nunca** vira "sem campanha": o feed responde 503 sem gravar `last_fetched_at`, e a montagem do pedido é recusada com 502 `catalog_read_failed`. | T08 · 3, T09 · 5 | `google-feed`, `order-proposals` |
| I-09 | O feed manda `sale_price_effective_date` em UTC `Z`, com o fim exclusivo. O JSON-LD manda `priceValidUntil` com o último dia em Brasília (`lastMinuteOf`). Peça cujo "de/por" vence a campanha fica sem vigência, como antes. | T08 · 4–6 | feed, página servida |
| I-10 | O bloco da Home se chama `campaign_offers` e é único também no banco (índice parcial recriado). Os tons são fundo claro, ouro e escuro. Enquanto carrega, o bloco não reserva espaço; o CLS fica para a QA medir. **Superado pelo WI 103 (tarefa 02):** `campaign_offers` saiu do índice de tipos únicos (migration `20261130170000_103-joias-em-oferta-por-campanha.sql`); a unicidade passou a ser por campanha (`home_sections_campaign_offers_campaign_idx`). | T07 · 1, 2, 4, 6 | `home_sections`, Home |
| I-11 | No painel e no app, a vigência exibida usa o relógio do painel e o `lido_em` do `atelie_clock`; o servidor confere de novo. Na virada da campanha, o `save` pode responder "Os preços mudaram…". | T09 · 7 | montagem do pedido |

## Não resolvido

- **Frete grátis por valor no servidor** (H-07): o servidor não confere a faixa de frete grátis no caminho comum
  (`freeShippingState` só no ramo do pedido montado, `mercado-pago/handlers.ts:1371`). Pré-existente, fora do WI.
- **Merchant Center na virada**: até 300 s com o JSON-LD/feed divergindo da página no início e no fim (H-11) — aceito,
  não medido.
- **`leituraSoComPapel` do app** com uma leitura nova de campanha em `catalogoDaMontagem.ts`: não conferido; a tarefa
  do pedido montado confere.
- Nenhum UC travado: `Fica fora` do fatiamento é `nada` além do `Fora` do PRD.
