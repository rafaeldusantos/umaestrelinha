# PRD Tech Review — WI 102

## Rodada r1

Revisado: `prd.md` versão 1 · 2026-11-13. Gate decidido pelo agente sob instrução explícita do usuário nesta conversa ("analise e use suas melhores recomendações… Faça isso para todas as paradas com perguntas") — inline a pedido · pela recomendação; a página aberta foi encerrada sem respostas.

### Envelope

```json
{
  "schema": "prd-review/v1",
  "work_item_ref": "102",
  "round": 1,
  "prd_version": 1,
  "reviewed_at": "2026-11-13T00:00:00-03:00",
  "skill": "wi-workflow/prd-tech-review",
  "skill_version": "4.0.0",
  "summary": {
    "verdict": "changes_requested_gaps",
    "blocking": 0,
    "gaps": 12,
    "questions": 0,
    "tech_decisions": 9,
    "scenarios": [
      {
        "title": "Peça marcada em 20% durante a vigência: cartão, página, sacola e cobrança em R$ 167,92",
        "type": "happy_path",
        "risk": "P0"
      },
      {
        "title": "Campanha acaba com a sacola aberta e a cliente finaliza depois do fim",
        "type": "borda",
        "risk": "P0"
      },
      {
        "title": "Peça posta na sacola antes do início, checkout durante a vigência",
        "type": "borda",
        "risk": "P0"
      },
      {
        "title": "Variação com compare_price maior que o preço, marcada em 10% (cobra o menor)",
        "type": "alternativo",
        "risk": "P0"
      },
      {
        "title": "Cupom de 10% com peça de campanha e peça comum; sacola só com campanha recusa o cupom",
        "type": "alternativo",
        "risk": "P0"
      },
      {
        "title": "Corpo do create-order forjando campaign_id/percent ou unit_price menor",
        "type": "seguranca",
        "risk": "P0"
      },
      {
        "title": "Campanha agendada invisível para a cliente (anon) e visível no painel",
        "type": "seguranca",
        "risk": "P1"
      },
      {
        "title": "Duas campanhas ligadas com vigências cruzadas, e tirar percentual em uso",
        "type": "erro",
        "risk": "P1"
      },
      {
        "title": "Feed e JSON-LD com sale_price e sale_price_effective_date iguais à página",
        "type": "happy_path",
        "risk": "P1"
      },
      {
        "title": "/ofertas sem campanha: noindex, fora do sitemap, cache não segurando o título antigo",
        "type": "borda",
        "risk": "P1"
      },
      {
        "title": "15% sobre R$ 199,90 dá o mesmo centavo na loja, no servidor e no feed",
        "type": "borda",
        "risk": "P1"
      },
      {
        "title": "Pedido montado pelo painel durante a vigência",
        "type": "alternativo",
        "risk": "P1"
      },
      {
        "title": "Selo inteiro em 173 px com fonte a 200 % e miniaturas de cor acima da faixa",
        "type": "borda",
        "risk": "P1"
      },
      {
        "title": "Vitrine /ofertas com centenas de peças e rolagem infinita",
        "type": "performance",
        "risk": "P2"
      }
    ]
  },
  "findings": [
    {
      "id": "F1",
      "key": "sacola-guarda-o-preco-congelado",
      "category": "gap",
      "owner": "tech",
      "severity": "high",
      "title": "A sacola congela o preço no momento em que a peça entra — a campanha não chega a ela",
      "anchor": {
        "quote": "o Total igual ao que o servidor cobra",
        "prefix": "o cheio riscado; ",
        "suffix": ".",
        "section": "UC-05"
      },
      "body": "`CartItem.unitPrice` é **congelado ao adicionar** e persistido no `localStorage` (`apps/store/src/entities/cart/model/cartStore.ts:53-60`, gravado em `:179` e `:220` a partir de `variant.unitPrice ?? product.price`). O checkout soma esse número (`apps/store/src/features/checkout/model/useCheckoutTotals.ts:180`, `unit_price: item.unitPrice`), o frete grátis por faixa lê `subtotal()` dele (`cartStore.ts:256`) e o valor declarado da cotação também (`packages/core/src/shipping/quotePayload.ts:45`).\n\nConsequências diretas para UC-05/CA-03:\n- peça posta na sacola **antes** do início da campanha continua mostrando R$ 209,90 durante a vigência, enquanto o servidor cobra R$ 167,92;\n- peça posta **durante** a vigência continua mostrando R$ 167,92 depois do fim (por dias, o carrinho é persistido), enquanto o servidor cobra o cheio (ver F4).\n\nHoje isso é tolerado porque o preço só muda quando a dona edita o catálogo; com campanha, o preço muda sozinho num instante marcado, para centenas de linhas ao mesmo tempo.",
      "suggestion": "A sacola e o checkout passam a precificar cada linha pela função de preço de campanha (RN-04) sobre o catálogo **relido** (a mesma consulta da vitrine, com as marcações em vigência), e não pelo `unitPrice` congelado: o `unitPrice` persistido fica só como valor de exibição até a releitura chegar. A mesma releitura alimenta o frete grátis por faixa e o `insurance_value`. Sem migração de `version` do `persist` (a forma do item não muda; muda quem decide o número).",
      "questions": []
    },
    {
      "id": "F2",
      "key": "campanha-fora-do-residuo-do-bump",
      "category": "gap",
      "owner": "tech",
      "severity": "high",
      "title": "Onde a campanha entra em resolveOrderPricing decide se o pedido grava o cheio e se o desconto vira 'order bump'",
      "anchor": {
        "quote": "a campanha e o percentual da linha são gravados junto",
        "prefix": "existem; ",
        "suffix": ". Campanha usada",
        "section": "RN-09"
      },
      "body": "`resolveOrderLines` grava como cheio o preço **da entrada** (`packages/core/src/payment/pricing.ts:763` e `:772`, `fullUnitPrice: input.items[i].unit_price`) e calcula o desconto do bump **por resíduo**: `orderBumpDiscount = full − subtotal − promoção − casado` (`pricing.ts:793-794`). As duas saídas óbvias quebram algo:\n- baixar o `unit_price` de entrada para o preço de campanha ⇒ `full_unit_price` passa a ser o preço com desconto e o \"cheio\" de CA-13 se perde;\n- aplicar a campanha dentro do cálculo sem um termo próprio ⇒ o desconto da campanha cai no resíduo e é gravado em `orders.order_bump_discount`, entrando na guarda de teto do `create-payment` (`supabase/functions/mercado-pago/handlers.ts:811-820`) como se fosse bump.\n\nAlém disso, RN-06 exige o `compare_price` no servidor, e o recálculo do `mercado-pago` hoje lê só `products.base_price` e `product_variants.price` (`handlers.ts:546-570`), nunca `original_price`/`compare_price`. E `full_unit_price` hoje significa \"preço de tabela antes dos descontos por item da loja\" (o `base_price`/`price` da linha), não o \"de\" riscado: usar o `compare_price` como cheio mudaria o significado da coluna para todos os pedidos.",
      "suggestion": "Modelar a campanha como um desconto **por item** com termo próprio: a entrada de `resolveOrderPricing` ganha, opcional, `campaign: { percent } | null` por linha (ausente ⇒ resultado idêntico ao de hoje, como `manualDiscount` e `buyTogether`); a saída ganha `campaignDiscount`, descontado explicitamente antes do resíduo do bump; `full_unit_price` continua sendo o preço de tabela da linha; e `order_items` ganha `campaign_id`, `campaign_percent` e o `compare_unit_price` (o \"de\" mostrado), gravados pelo recálculo do servidor em `regravarLinhas` (`handlers.ts:1023`), nunca copiados do corpo. `orders` ganha `campaign_discount` para o resumo e o relatório. O recálculo passa a ler `original_price`/`compare_price`.",
      "questions": []
    },
    {
      "id": "F3",
      "key": "d05-o-preco-gravado-vem-do-navegador",
      "category": "gap",
      "owner": "tech",
      "severity": "high",
      "title": "O 'preço gravado no pedido' de D-05 é escrito pelo navegador; quem precisa congelar a campanha é o servidor, na criação",
      "anchor": {
        "quote": "vale o preço gravado no pedido (Decisão D-05)",
        "prefix": "pago depois do fim: ",
        "suffix": "; o `mercado-pago`",
        "section": "RN-05"
      },
      "body": "A function `checkout` (create-order) **não precifica nada**: copia `unit_price` e `full_unit_price` como vieram do corpo (`supabase/functions/checkout/handlers.ts:257-273`, `COLUNAS_DOS_ITENS`), e quem decide o valor é o primeiro `create-payment` do `mercado-pago`, que recalcula com `const now = new Date()` (`mercado-pago/handlers.ts:686`) e só então trava a cobrança (`lockedFirstCharge`, `:496`, `:1404`). Logo \"o preço gravado no pedido\" na criação é um número do navegador (PAY-03 proíbe confiar nele), e a vigência hoje seria avaliada **no primeiro pagamento**, não na criação.\n\nD-05 só vale como escrita se a campanha da linha for decidida pelo servidor no instante da criação. O pedido montado (feature 89, `lockedProposalCharge`, `:476-490`) e o pagar de novo (WI 98, `lockedFirstCharge`) já estão cobertos pela trava; o caso aberto é o primeiro pagamento depois do fim.",
      "suggestion": "A function `checkout` passa a resolver, com o relógio dela, a campanha em vigência e a marcação de cada peça, e grava `order_items.campaign_id`/`campaign_percent` (fora de `COLUNAS_DOS_ITENS`, como a marca \"acompanha\" já é tratada em `linhaDoItem`); o `mercado-pago` aplica a campanha **gravada na linha** (relendo só o preço de tabela), sem reavaliar a vigência com `now`. `chavesDoItemDoPedido.test.ts` e o teste de `linhaDoItem` passam a provar que a campanha vinda do corpo é descartada.",
      "questions": []
    },
    {
      "id": "F4",
      "key": "campanha-acaba-entre-a-sacola-e-o-pagamento",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "high",
      "title": "Nada diz o que a cliente vê quando a campanha acaba entre a sacola e o pagamento; hoje o servidor cobraria mais, calado",
      "anchor": {
        "quote": "Fora da vigência, nada disso aparece, mesmo com a peça marcada.",
        "prefix": "",
        "suffix": "",
        "section": "UC-05"
      },
      "body": "A guarda que impede cobrar acima do que a tela mostrou soma só `promotion_discount + buy_together_discount + order_bump_discount` (`supabase/functions/mercado-pago/handlers.ts:811-820`); um desconto de campanha que deixa de valer não entra nela. Com F3 resolvido, o caso que sobra é a cliente com a sacola aberta antes do fim (os dados da loja ficam até 5 min sem reler, `STORE_STALE_TIME`, `apps/store/src/app/queryClient.ts:29`) que finaliza depois do fim: o pedido nasce sem campanha e o PIX/cartão sai pelo cheio, com a tela tendo mostrado o preço com desconto. O inverso (campanha começa com a sacola aberta) cobra menos que o mostrado. O PRD não especifica nenhum dos dois, e o selo não \"some no instante\" sem uma releitura.",
      "suggestion": "Decisão técnica: a campanha entra na guarda de teto (o desconto de campanha recalculado menor que o exibido ⇒ 422 com o mesmo código e o mesmo corpo do \"Um desconto deste pedido mudou\", antes de qualquer cobrança); a loja relê as marcações ao abrir o checkout e ao voltar o foco. Texto para o PRD (acrescentar em UC-05): \"Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela confirme de novo; nunca é cobrado um valor maior que o mostrado. Se a campanha começar nesse meio-tempo, a sacola passa a mostrar o preço com desconto na próxima vez que for aberta.\"",
      "questions": []
    },
    {
      "id": "F5",
      "key": "vigencia-na-loja-pela-leitura-publica",
      "category": "improvement",
      "owner": "tech",
      "severity": "medium",
      "title": "Na loja (SPA, sem servidor), 'em vigência' só sai do navegador se a leitura pública já vier filtrada pelo relógio do banco — e isso é um segundo dono da regra",
      "anchor": {
        "quote": "O navegador da cliente nunca decide se a campanha está valendo.",
        "prefix": "(`core/time/zone.ts`). ",
        "suffix": "",
        "section": "RN-03"
      },
      "body": "A loja é SPA e lê o Supabase direto; o único relógio de servidor exposto hoje é de serviço/admin (`store_clock`, feature 71; `atelie_clock`, feature 74). O precedente que resolve exatamente isto é a promoção progressiva: a policy pública de `promotions` filtra `active` **e** a vigência com `now()` (`supabase/migrations/20260803130000_promotions-progressive.sql:178-218`), e o navegador só recebe o que vale agora. Para campanha, o mesmo desenho (policy de `anon` nas duas tabelas novas: ligada e `now()` dentro da vigência; marcação só de peça ativa, molde de `20261018120000_66-filtros-de-produto.sql:119`) faz o navegador nunca decidir e esconde a campanha agendada da cliente.\n\nO custo: a regra \"em vigência\" passa a existir em SQL **e** em `core/campaigns` (usada pelo checkout, `mercado-pago`, feed e `api/page` com o relógio deles). É cópia deliberada no molde de `materialTransitions.test.ts`. O painel (SPA) também não tem relógio de servidor para os estados Agendada/Em vigência; ali o relógio do navegador só rotula, não cobra.",
      "suggestion": "Policy pública por `now()` nas duas tabelas novas (molde das promoções), `core/campaigns/live.ts` como dono em TypeScript com `.ts` explícito e sem import, e um guarda que lê a migration e exige o mesmo predicado (início inclusivo, fim exclusivo, `active`) nos dois lados. A loja nunca chama a função de vigência com `new Date()` — guarda de fonte recusando `campaignIsLive(` em `apps/store/src` fora do mapeador.",
      "questions": []
    },
    {
      "id": "F6",
      "key": "ofertas-titulo-e-indexacao-mudam-com-a-campanha",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "/ofertas tem título e indexação que mudam com a campanha, e o servidor de páginas só conhece rota fixa com cache de 1h",
      "anchor": {
        "quote": "`noindex` e fora do sitemap",
        "prefix": "leva às coleções; ",
        "suffix": ".",
        "section": "UC-06"
      },
      "body": "`classifyPath` trata toda rota de `SITEMAP_STATIC_PATHS` como `static` (`packages/core/src/page/classify.ts:75-76`), servida com o título fixo de `staticPageMeta` e `s-maxage=3600` (`packages/core/src/page/serve.ts:119`). A classificação é obrigatória e binária: `sitemapRoutes.test.ts` e `seo.test.ts` exigem que cada rota esteja em `SITEMAP_STATIC_PATHS` **ou** em `NON_INDEXABLE_PATHS` (`packages/core/src/routes/routes.ts:222-262`). UC-06/CA-09 pedem uma página indexável com o nome da campanha no título durante a vigência e `noindex`/fora do sitemap fora dela — nenhuma das duas listas comporta isso, e com o cache de 1h o título \"Black Friday\" e o `index` sobreviveriam até uma hora ao fim.",
      "suggestion": "Decisão técnica: `/ofertas` ganha uma classe própria em `classifyPath` (página dinâmica, como produto), com `<head>` montado da campanha em vigência, cache de página de produto (`s-maxage=300`) e o sitemap incluindo `/ofertas` só quando há campanha em vigência; os dois guardas de classificação ganham o terceiro conjunto. Texto para o PRD (UC-06): \"Durante a vigência, a página aparece no Google com o nome da campanha no título. Fora dela, diz que não há ofertas agora, leva às coleções e deixa de ser indexada — a troca acontece em até 5 minutos depois do início ou do fim.\"",
      "questions": []
    },
    {
      "id": "F7",
      "key": "arredondamento-do-preco-de-campanha",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "O PRD não diz como o preço com desconto é arredondado no centavo",
      "anchor": {
        "quote": "o cobrado é o **menor** entre o preço de hoje e o cheio com o desconto da campanha",
        "prefix": "`compare_price`; ",
        "suffix": ". Nunca os dois",
        "section": "RN-06"
      },
      "body": "Os exemplos do PRD caem exatos (209,90 × 0,8 = 167,92; 259,90 × 0,9 = 233,91), mas 15% sobre R$ 199,90 dá R$ 169,915, e 15% é um dos três percentuais da campanha. O código de dinheiro arredonda com `Math.round(v * 100) / 100` (`packages/core/src/payment/pricing.ts:99`), que em ponto flutuante não é meio-para-cima garantido. Cartão, página, sacola, feed e servidor precisam do mesmo centavo (RN-04, Merchant Center reprova preço divergente), e o arredondamento é por **unidade** antes de multiplicar pela quantidade, ou por linha — o PRD não diz.",
      "suggestion": "Decisão técnica: o preço de campanha é calculado em centavos inteiros, por unidade, com meio centavo para cima, e só depois multiplicado pela quantidade; o \"menor\" de RN-06 compara em centavos. Texto para o PRD (RN-06): \"O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15% sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.\"",
      "questions": []
    },
    {
      "id": "F8",
      "key": "faixa-de-preco-e-ordenacao-pelo-preco-de-campanha",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "medium",
      "title": "RN-10 cobre só o filtro de desconto; a faixa de preço e a ordenação por preço continuam lendo o preço cheio",
      "anchor": {
        "quote": "passa a incluir as peças da campanha em vigência",
        "prefix": "feature `66`) ",
        "suffix": ".",
        "section": "RN-10"
      },
      "body": "Os filtros de sistema rodam no navegador sobre o produto mapeado: faixa de preço e \"com desconto\" em `passesSystem`/`passesSystemVariant` (`apps/store/src/features/category-filters/model/filters.ts:94-130`, `hasDiscount` = `compare_price > price`), e a ordenação `menor-preco`/`maior-preco` sobre o mesmo `price`. Se só o \"com desconto\" aprender a campanha, a peça de R$ 209,90 vendida a R$ 167,92 some do filtro \"até R$ 180\" e é ordenada pelo preço que não é cobrado — dentro da própria vitrine `/ofertas`, que reusa `CategoryPage`. O mesmo vale para os limites da régua de preço e para o card da variação escolhida (`ProductCard.tsx:146-163`).",
      "suggestion": "Decisão técnica: o mapeador do produto da loja expõe o preço efetivo da peça e de cada variação (já com a campanha em vigência, pela função de RN-04), e filtros, ordenação, limites da régua e o card leem esse campo; `hasDiscount` passa a ser \"efetivo < cheio\". Texto para o PRD (substituir RN-10): \"RN-10 · Os filtros e a ordenação contam o preço com desconto. Durante a vigência, a peça de campanha aparece em \\\"Com desconto\\\", entra na faixa de preço pelo preço com desconto e é ordenada por ele.\"",
      "questions": []
    },
    {
      "id": "F9",
      "key": "pedido-montado-pelo-painel-e-a-campanha",
      "category": "gap",
      "owner": "negocio",
      "severity": "medium",
      "title": "O pedido montado pelo painel (e pelo app do ateliê) é uma quarta precificação no servidor, e o PRD não diz se ele leva o preço de campanha",
      "anchor": {
        "quote": "a function `mercado-pago` (que reprecifica pelo banco)",
        "prefix": "`full_unit_price`), ",
        "suffix": ", o feed do Google",
        "section": "RN-04"
      },
      "body": "A function `order-proposals` precifica a montagem com `resolveItemPrice` sobre `base_price`/variação (`supabase/functions/order-proposals/handlers.ts:376-440`), confere o cupom com `couponRefusal` (`:481-488`) e lê as promoções vigentes (`:496`); a proposta trava o preço e o `mercado-pago` cobra pelo travado (`lockedProposalCharge`, `mercado-pago/handlers.ts:476-490`). Ela não está na lista de RN-04, então a montagem feita durante a Black Friday sairia pelo preço cheio, ao lado de um cupom que D-03 recusaria na loja — e o app do ateliê (WI 94) monta pelo mesmo caminho.",
      "suggestion": "Texto para o PRD (acrescentar em RN-04 e RN-16): \"O pedido montado pela dona, no painel ou no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.\"",
      "questions": []
    },
    {
      "id": "F10",
      "key": "recusa-do-cupom-mora-em-couponrefusal",
      "category": "improvement",
      "owner": "tech",
      "severity": "medium",
      "title": "A recusa do cupom e o valor mínimo não moram em resolveOrderPricing, e o servidor não confere o mínimo",
      "anchor": {
        "quote": "A regra mora em `resolveOrderPricing` (`packages/core/src/payment/pricing.ts`)",
        "prefix": "vem da campanha). ",
        "suffix": ", que a loja e o",
        "section": "RN-16"
      },
      "body": "`resolveOrderPricing` recebe o cupom só como `{ type, value }` (`CouponRule`, `packages/core/src/payment/pricing.ts:94-97`) e calcula o desconto sobre a base (`resolveCouponDiscount`, `:114-128`). Quem recusa com motivo e confere o pedido mínimo é `couponRefusal` (`packages/core/src/coupons/rules.ts`), chamado por `validateCoupon` só **no momento de aplicar** (`packages/core/src/hooks/useCoupons.ts:85-93`, de `CouponInput.tsx:45`) e por `order-proposals`. O `mercado-pago` não chama `couponRefusal`: confere ativo, datas e usos (`mercado-pago/handlers.ts:746-760`) e **não confere `min_order`** — hoje, tirar peças da sacola depois de aplicar o cupom deixa o mínimo sem conferência no servidor. Com D-06, o mínimo passa a ser sobre as linhas fora da campanha, e a sacola pode virar \"só campanha\" depois de o cupom já estar aplicado.",
      "suggestion": "Dividir em duas peças: (1) a base do cupom sem as linhas de campanha dentro de `resolveCouponDiscount`/`priceOnePath` (o dinheiro); (2) a recusa com o nome da campanha e o mínimo sobre a mesma base em `couponRefusal`, que ganha no contexto o subtotal elegível e o nome da campanha, chamada pela loja **também quando a sacola muda** (não só ao aplicar), por `order-proposals` e pelo `mercado-pago` (que passa a conferir `min_order`, com o cupom recusado virando `null` como já acontece).",
      "questions": []
    },
    {
      "id": "F11",
      "key": "regras-do-cadastro-garantidas-no-banco",
      "category": "improvement",
      "owner": "tech",
      "severity": "medium",
      "title": "Percentual em uso, percentual válido e vigência cruzada podem ser garantidos por chave e por exclusion constraint, sem gatilho",
      "anchor": {
        "quote": "**Tirar um percentual em uso é recusado**",
        "prefix": "- ",
        "suffix": ", com a contagem",
        "section": "UC-02"
      },
      "body": "RN-01 pede o percentual da peça conferido no banco e UC-02 recusa tirar percentual em uso; se os percentuais forem um `int[]` na campanha, nenhuma chave estrangeira alcança o elemento e as duas regras viram gatilho. RN-02 (vigência cruzada no banco) cabe numa exclusion constraint sobre `tstzrange(starts_at, ends_at, '[)')` com `&&` e `where (active)`: só o operador de range, que não precisa de `btree_gist` (o banco local tem `plpgsql`, `uuid-ossp`, `pgcrypto`, `pg_stat_statements`, `supabase_vault`, `pg_cron`, medido em 2026-11-13). O `[)` também fecha a ambiguidade do \"até 30/11 23:59\" (o fim é exclusivo).",
      "suggestion": "Tabelas: `campaigns` (nome, texto do selo, as duas cores, `starts_at`, `ends_at`, `active`, `check` de tetos e de `ends_at > starts_at`, exclusion constraint acima); `campaign_percents (campaign_id, percent)` com PK composta e `check` 1–70; `product_campaigns (product_id, campaign_id, percent)` com PK `(product_id, campaign_id)` e FK composta `(campaign_id, percent) → campaign_percents on delete restrict` (a recusa de UC-02 vira o `23503`, traduzido com a contagem), `product_id on delete cascade`; `order_items.campaign_id on delete restrict` (RN-09). Teto de 5 percentuais por gatilho de contagem ou pela RPC de gravação. Provar por probe SQL contra o banco local.",
      "questions": []
    },
    {
      "id": "F12",
      "key": "order-bump-em-peca-de-campanha",
      "category": "gap",
      "owner": "negocio",
      "severity": "low",
      "title": "O desconto do 'leve também' do checkout (order bump) numa peça de campanha não está decidido",
      "anchor": {
        "quote": "Promoção progressiva e Compre Junto também não descontam peça de campanha",
        "prefix": "**RN-17 · ",
        "suffix": "** (D-07)",
        "section": "RN-17"
      },
      "body": "Além de cupom, faixa e Compre Junto, o checkout tem a oferta do bump com percentual próprio (`store_settings.checkout.order_bump_*`, lida em `mercado-pago/handlers.ts:661-668` e aplicada em `applyOrderBump`, `packages/core/src/payment/pricing.ts:155`). Se a peça do bump estiver marcada na campanha, RN-16/RN-17 não dizem se ela leva o desconto do bump, o da campanha ou os dois. Hoje os descontos por item nunca compõem (`AD-015`: vale o menor preço).",
      "suggestion": "Texto para o PRD (acrescentar em RN-17): \"A oferta do checkout (\\\"leve também\\\") numa peça de campanha cobra o menor preço entre o da campanha e o da oferta, nunca os dois descontos somados.\"",
      "questions": []
    },
    {
      "id": "F13",
      "key": "frete-gratis-pela-soma-com-desconto",
      "category": "gap",
      "owner": "negocio",
      "severity": "low",
      "title": "O frete grátis por faixa não diz se conta a peça de campanha pelo preço com desconto ou pelo cheio",
      "anchor": {
        "quote": "o **cupom de frete grátis** continua valendo",
        "prefix": "- ",
        "suffix": ": ele zera o frete",
        "section": "RN-16"
      },
      "body": "A faixa de frete grátis é decidida por `freeShippingState` sobre o subtotal da sacola (`apps/store/src/entities/cart/model/cartStore.ts:255-256`, `packages/core/src/shipping`). D-06 trata o cupom de frete grátis, não a faixa. Com a peça a R$ 167,92 e a faixa em R$ 200, a cliente que via \"frete grátis\" com o preço cheio deixa de ver durante a campanha — ou o contrário, se a regra contar o cheio.",
      "suggestion": "Texto para o PRD (acrescentar em RN-16): \"O frete grátis por valor conta a soma do que a cliente paga pelas peças, já com o desconto da campanha.\"",
      "questions": []
    },
    {
      "id": "F14",
      "key": "mais-de-uma-campanha-no-cadastro-da-peca",
      "category": "gap",
      "owner": "negocio",
      "severity": "low",
      "title": "O cadastro da peça e a edição em massa podem ter duas campanhas abertas ao mesmo tempo (a em vigência e a próxima agendada)",
      "anchor": {
        "quote": "aparece um campo por campanha **agendada ou em vigência**",
        "prefix": "na aba de preço da peça, ",
        "suffix": " (na",
        "section": "UC-03"
      },
      "body": "RN-02 só proíbe vigências que se cruzam; a Black Friday em vigência e um \"Natal\" agendado para dezembro convivem. Então \"na prática, uma\" não se sustenta, e UC-04 (\"os percentuais oferecidos são os da campanha\") não diz qual campanha a ação em massa usa nem como o filtro da lista se apresenta com duas.",
      "suggestion": "Texto para o PRD (UC-03 e UC-04): \"Aparece um campo por campanha agendada ou em vigência, na ordem do início, cada um com a sua vigência no rótulo. Na edição em massa, a dona escolhe primeiro a campanha e depois o percentual; o filtro da lista também começa pela campanha.\"",
      "questions": []
    },
    {
      "id": "F15",
      "key": "selo-da-campanha-e-os-selos-do-topo",
      "category": "gap",
      "owner": "negocio",
      "severity": "low",
      "title": "O PRD diz 'nunca dois selos na mesma foto', mas não diz o que acontece com Novo, Destaque e Últimas",
      "anchor": {
        "quote": "substitui o selo \"−X%\" de hoje",
        "prefix": "No pé da foto, 30 px; ",
        "suffix": " (nunca dois",
        "section": "RN-13"
      },
      "body": "O cartão mostra hoje **um** selo no canto superior, em cadeia: desconto ⇒ \"Novo\" ⇒ \"Últimas\" ⇒ \"Destaque\" (`apps/store/src/entities/product/ui/ProductCard.tsx:304-312`). Se a faixa da campanha só ocupar o lugar do \"−X%\", a peça de campanha que é nova passa a ter dois selos (a faixa no pé e \"Novo\" no topo); se ocupar o lugar da cadeia toda, os outros somem durante a campanha. \"Nunca dois selos\" é ambíguo entre os dois.",
      "suggestion": "Texto para o PRD (RN-13): \"Durante a vigência, a peça de campanha mostra só a faixa da campanha: os selos do canto (desconto de hoje, Novo, Últimas, Destaque) não aparecem nela. Fora da campanha, o cartão volta a ser o de hoje.\"",
      "questions": []
    },
    {
      "id": "F16",
      "key": "ca-14-depende-do-wi-100",
      "category": "gap",
      "owner": "tech_prd_edit",
      "severity": "low",
      "title": "CA-14 testa o selo contra um perfil de estilo que ainda não existe no código",
      "anchor": {
        "quote": "O selo é o mesmo com a loja no perfil Padrão ou no Black Friday.",
        "prefix": "ouro #C2A063. ",
        "suffix": "",
        "section": "CA-14"
      },
      "body": "Não há perfil de estilo na árvore (nenhuma ocorrência de perfil de estilo em `apps/`, `packages/` ou `supabase/`; o WI 100 é só especificação, fora deste worktree). O critério não é verificável no fecho deste item.",
      "suggestion": "Decisão técnica: o selo lê só as duas cores da campanha, por `style` inline, nunca um token da loja; um guarda de fonte recusa token `estrelinha-*` nos componentes do selo. Texto para o PRD (CA-14, última frase): \"O selo não usa nenhuma cor da paleta da loja: muda a paleta, o selo continua igual.\"",
      "questions": []
    },
    {
      "id": "F17",
      "key": "nomes-das-colunas-de-preco",
      "category": "naming",
      "owner": "tech",
      "severity": "low",
      "title": "As colunas de preço da peça não se chamam price/compare_price",
      "anchor": {
        "quote": "cadastrado (`price`, `compare_price`)",
        "prefix": "O preço\n  ",
        "suffix": " **nunca**",
        "section": "RN-01"
      },
      "body": "Em `products` as colunas são `base_price` e `original_price` (lidas em `apps/store/src/entities/product/lib/mapProduct.ts:110` e mapeadas para `price`/`compare_price` em `:191-192`); `price`/`compare_price` são de `product_variants` (`mapProduct.ts:134`). No banco local, 0 produtos têm `original_price > base_price` e 93 variações têm `compare_price > price` (medido em 2026-11-13) — o \"de/por\" de RN-06/CA-06 é, na prática, de variação.",
      "suggestion": "A spec nomeia `products.base_price`/`products.original_price` e `product_variants.price`/`product_variants.compare_price`, e CA-06 é provado numa variação.",
      "questions": []
    },
    {
      "id": "F18",
      "key": "categoria-black-friday-da-nuvemshop",
      "category": "overlap",
      "owner": "negocio",
      "severity": "low",
      "title": "Já existe uma categoria 'black-friday' (desligada, vinda da Nuvemshop), e o pedido original falava em 'entrar na categoria BlackFriday'",
      "anchor": {
        "quote": "Uma página só, no endereço fixo **`/ofertas`**",
        "prefix": "- ",
        "suffix": " (Decisão D-01)",
        "section": "UC-06"
      },
      "body": "No banco local (importado da Nuvemshop) há `categories.slug = 'black-friday'` com `active = false` (medido em 2026-11-13). Uma categoria inativa no endereço `/black-friday` é servida pela regra de categoria inativa (`core/page`, RPC `category_fallback`: 301 para a mãe ou 404). Quem tiver o link antigo da Nuvemshop, ou a dona por hábito, cai fora da vitrine nova.",
      "suggestion": "Texto para o PRD (UC-06): \"A categoria antiga \\\"Black Friday\\\", que veio da loja anterior e está desligada, continua desligada; o endereço /black-friday leva para /ofertas.\"",
      "questions": []
    },
    {
      "id": "F19",
      "key": "contraste-no-banco-seria-segundo-dono",
      "category": "improvement",
      "owner": "tech",
      "severity": "low",
      "title": "Um check de contraste no banco duplicaria a fórmula de core/color",
      "anchor": {
        "quote": "a recusa do par sem contraste, chamada pelo painel e por um `check`/teste de schema",
        "prefix": "`@estrelinha/core/color` | ",
        "suffix": " |",
        "section": "Plano técnico"
      },
      "body": "`contrastRatio` mora em `packages/core/src/color/contrast.ts:59` (conferido: #161514 × #C2A063 = 7,38:1). Reescrever a luminância WCAG em SQL para um `check` é uma cópia da fórmula que exigiria guarda de paridade; a escrita é só de admin (RLS `has_role`), então o risco que o `check` cobre é pequeno. As cores saem do banco como valor arbitrário e não passam pelos guardas de cor (`contrast.test.ts` mede tokens; `arbitraryTextColor.test.ts`, classes `text-[#…]`).",
      "suggestion": "No banco, só o `check` de formato (`^#[0-9A-Fa-f]{6}$`); a recusa por contraste é `core/color` chamada pelo painel e pela RPC/handler de gravação se houver; o selo aplica as cores por `style` inline e o teste do selo calcula a razão com `contrastRatio` sobre a semente.",
      "questions": []
    },
    {
      "id": "F20",
      "key": "inventario-de-guardas-e-ancoras",
      "category": "improvement",
      "owner": "tech",
      "severity": "low",
      "title": "As peças novas disparam guardas e âncoras de contagem que a spec precisa listar por nome",
      "anchor": {
        "quote": "tipo novo no catálogo da Home (D-04)",
        "prefix": "bloco \"Joias em oferta\" | ",
        "suffix": " |",
        "section": "Plano técnico"
      },
      "body": "Pela forma do repositório (CLAUDE.md, §Os guardas): o tipo novo da Home exige **recriar** o `check` de `home_sections.type` em migration nova (molde da `41`, `supabase/migrations/20260906120000_41-banner-principal-da-home.sql`) e reprova `homeSections.test.ts`, `catalog.test.ts` (core/home), `HomeRenderer.test.tsx` e `HomeBlockTray.test.tsx` até ser cumprido; a rota `/ofertas` move `ROUTE_SLUGS`/`reservedSlugs`, `routeSplitting`, `metaPorRota` (âncora de 18 páginas), `rotasDeApp` (âncora 25/14), `sitemapRoutes` e `seo.test.ts`; colunas novas em `order_items` passam por `chavesDoItemDoPedido.test.ts`; toda RPC nova chamada pela loja, painel ou function entra na lista literal de `marcacaoSoPorAcao.test.ts`; as folhas de `core/campaigns` lidas pelo Deno precisam do `denoReach` próprio; a regra de \"um dono\" do preço pede o guarda `precoDeCampanhaComDonoUnico` (nenhuma tela multiplicando percentual à mão).",
      "suggestion": "A spec lista estes guardas por nome nas tarefas que os movem, e a ordem de publicação é migration → functions (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`) → bundles (a vitrine e o card pedem as tabelas novas por embed; sem elas a leitura inteira falha).",
      "questions": []
    },
    {
      "id": "F21",
      "key": "estado-desligada-e-encerrada",
      "category": "naming",
      "owner": "negocio",
      "severity": "low",
      "title": "O vocabulário chama a campanha desligada de Encerrada, e a lista mostra Desligada à parte",
      "anchor": {
        "quote": "**Encerrada**: fim no passado (ou desligada).",
        "prefix": "- ",
        "suffix": " Fica no histórico",
        "section": "Vocabulário"
      },
      "body": "UC-01 lista quatro estados (Agendada, Em vigência, Encerrada, Desligada); o Vocabulário funde Desligada em Encerrada. Uma campanha desligada com fim no futuro pode ser religada (e passa por RN-02 de novo); uma encerrada não volta sozinha. A tela e o filtro precisam de um nome só para cada caso.",
      "suggestion": "Texto para o PRD (Vocabulário): \"**Encerrada**: fim no passado. **Desligada**: interruptor desligado com o fim ainda no futuro; pode ser religada. As duas ficam no histórico, com as marcações das peças, sem efeito.\"",
      "questions": []
    }
  ]
}
```

### Respostas, por `key`

| key | owner final | escolha | estado |
| --- | --- | --- | --- |
| `sacola-guarda-o-preco-congelado` | tech | a sugestão do parecer (ratificada) | aplicado |
| `campanha-fora-do-residuo-do-bump` | tech | a sugestão do parecer (ratificada) | aplicado |
| `d05-o-preco-gravado-vem-do-navegador` | tech | a sugestão do parecer (ratificada) | aplicado |
| `campanha-acaba-entre-a-sacola-e-o-pagamento` | tech_prd_edit | a sugestão do parecer (ratificada) | aplicado |
| `vigencia-na-loja-pela-leitura-publica` | tech | a sugestão do parecer (ratificada) | aplicado |
| `ofertas-titulo-e-indexacao-mudam-com-a-campanha` | tech_prd_edit | a sugestão do parecer (ratificada) | aplicado |
| `arredondamento-do-preco-de-campanha` | tech_prd_edit | a sugestão do parecer (ratificada) | aplicado |
| `faixa-de-preco-e-ordenacao-pelo-preco-de-campanha` | tech_prd_edit | a sugestão do parecer (ratificada) | aplicado |
| `pedido-montado-pelo-painel-e-a-campanha` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `recusa-do-cupom-mora-em-couponrefusal` | tech | a sugestão do parecer (ratificada) | aplicado |
| `regras-do-cadastro-garantidas-no-banco` | tech | a sugestão do parecer (ratificada) | aplicado |
| `order-bump-em-peca-de-campanha` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `frete-gratis-pela-soma-com-desconto` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `mais-de-uma-campanha-no-cadastro-da-peca` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `selo-da-campanha-e-os-selos-do-topo` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `ca-14-depende-do-wi-100` | tech_prd_edit | a sugestão do parecer (ratificada) | aplicado |
| `nomes-das-colunas-de-preco` | tech | a sugestão do parecer (ratificada) | aplicado |
| `categoria-black-friday-da-nuvemshop` | negocio | a sugestão do parecer (ratificada) | aplicado |
| `contraste-no-banco-seria-segundo-dono` | tech | a sugestão do parecer (ratificada) | aplicado |
| `inventario-de-guardas-e-ancoras` | tech | a sugestão do parecer (ratificada) | aplicado |
| `estado-desligada-e-encerrada` | negocio | a sugestão do parecer (ratificada) | aplicado |

### O que foi aplicado, e onde

- **`sacola-guarda-o-preco-congelado`** (tech) — vai a **Decisões** do `spec.md`: A sacola e o checkout passam a precificar cada linha pela função de preço de campanha (RN-04) sobre o catálogo **relido** (a mesma consulta da vitrine, com as marcações em vigência), e não pelo `unitPrice` congelado: o `unitPrice` persistido fica só como valor de exibição até a releitura chegar. A mesma releitura alimenta o frete grátis por faixa e o `insurance_value`. Sem migração de `version` do `persist` (a forma do item não muda; muda quem decide o número).
- **`campanha-fora-do-residuo-do-bump`** (tech) — vai a **Decisões** do `spec.md`: Modelar a campanha como um desconto **por item** com termo próprio: a entrada de `resolveOrderPricing` ganha, opcional, `campaign: { percent } | null` por linha (ausente ⇒ resultado idêntico ao de hoje, como `manualDiscount` e `buyTogether`); a saída ganha `campaignDiscount`, descontado explicitamente antes do resíduo do bump; `full_unit_price` continua sendo o preço de tabela da linha; e `order_items` ganha `campaign_id`, `campaign_percent` e o `compare_unit_price` (o "de" mostrado), gravados pelo recálculo do servidor em `regravarLinhas` (`handlers.ts:1023`), nunca copiados do corpo. `orders` ganha `campaign_discount` para o resumo e o relatório. O recálculo passa a ler `original_price`/`compare_price`.
- **`d05-o-preco-gravado-vem-do-navegador`** (tech) — vai a **Decisões** do `spec.md`: A function `checkout` passa a resolver, com o relógio dela, a campanha em vigência e a marcação de cada peça, e grava `order_items.campaign_id`/`campaign_percent` (fora de `COLUNAS_DOS_ITENS`, como a marca "acompanha" já é tratada em `linhaDoItem`); o `mercado-pago` aplica a campanha **gravada na linha** (relendo só o preço de tabela), sem reavaliar a vigência com `now`. `chavesDoItemDoPedido.test.ts` e o teste de `linhaDoItem` passam a provar que a campanha vinda do corpo é descartada.
- **`campanha-acaba-entre-a-sacola-e-o-pagamento`** (tech_prd_edit) — `prd.md`:
  - antes: «- Fora da vigência, nada disso aparece, mesmo com a peça marcada.»
  - depois: «- Fora da vigência, nada disso aparece, mesmo com a peça marcada.
- Se a campanha acabar enquanto a cliente está na sacola ou no checkout, a loja mostra o total novo e pede que ela
  confirme de novo; nunca é cobrado um valor maior que o mostrado. Se a campanha começar nesse meio-tempo, a sacola
  passa a mostrar o preço com desconto na próxima vez que for aberta.»
  - e a decisão técnica vai a **Decisões** do `spec.md`: Decisão técnica: a campanha entra na guarda de teto (o desconto de campanha recalculado menor que o exibido ⇒ 422 com o mesmo código e o mesmo corpo do "Um desconto deste pedido mudou", antes de qualquer cobrança); a loja relê as marcações ao abrir o checkout e ao voltar o foco.
- **`vigencia-na-loja-pela-leitura-publica`** (tech) — vai a **Decisões** do `spec.md`: Policy pública por `now()` nas duas tabelas novas (molde das promoções), `core/campaigns/live.ts` como dono em TypeScript com `.ts` explícito e sem import, e um guarda que lê a migration e exige o mesmo predicado (início inclusivo, fim exclusivo, `active`) nos dois lados. A loja nunca chama a função de vigência com `new Date()` — guarda de fonte recusando `campaignIsLive(` em `apps/store/src` fora do mapeador.
- **`ofertas-titulo-e-indexacao-mudam-com-a-campanha`** (tech_prd_edit) — `prd.md`:
  - antes: «- Sem campanha em vigência: a página diz que não há ofertas agora e leva às coleções; `noindex` e fora do sitemap.»
  - depois: «- Durante a vigência, a página aparece no Google com o nome da campanha no título. Fora dela, diz que não há ofertas
  agora, leva às coleções e deixa de ser indexada — a troca acontece em até 5 minutos depois do início ou do fim.
- A categoria antiga "Black Friday", que veio da loja anterior e está desligada, continua desligada; o endereço
  /black-friday leva para /ofertas.»
  - e a decisão técnica vai a **Decisões** do `spec.md`: Decisão técnica: `/ofertas` ganha uma classe própria em `classifyPath` (página dinâmica, como produto), com `<head>` montado da campanha em vigência, cache de página de produto (`s-maxage=300`) e o sitemap incluindo `/ofertas` só quando há campanha em vigência; os dois guardas de classificação ganham o terceiro conjunto.
- **`arredondamento-do-preco-de-campanha`** (tech_prd_edit) — `prd.md`:
  - antes: «Nunca os dois
  descontos multiplicados.»
  - depois: «Nunca os dois
  descontos multiplicados. O preço com desconto é arredondado para o centavo mais próximo (meio centavo para cima), por unidade: 15%
  sobre R$ 199,90 é R$ 169,92. A loja, o servidor e o Google mostram o mesmo centavo.»
  - e a decisão técnica vai a **Decisões** do `spec.md`: Decisão técnica: o preço de campanha é calculado em centavos inteiros, por unidade, com meio centavo para cima, e só depois multiplicado pela quantidade; o "menor" de RN-06 compara em centavos.
- **`faixa-de-preco-e-ordenacao-pelo-preco-de-campanha`** (tech_prd_edit) — `prd.md`:
  - antes: «- **RN-10 · O filtro "Em promoção" de hoje conta a campanha.** O filtro de sistema de desconto (`desconto=1`,
  feature `66`) passa a incluir as peças da campanha em vigência.»
  - depois: «- **RN-10 · Os filtros e a ordenação contam o preço com desconto.** Durante a vigência, a peça de campanha aparece em
  "Com desconto", entra na faixa de preço pelo preço com desconto e é ordenada por ele.»
  - e a decisão técnica vai a **Decisões** do `spec.md`: Decisão técnica: o mapeador do produto da loja expõe o preço efetivo da peça e de cada variação (já com a campanha em vigência, pela função de RN-04), e filtros, ordenação, limites da régua e o card leem esse campo; `hasDiscount` passa a ser "efetivo < cheio".
- **`pedido-montado-pelo-painel-e-a-campanha`** (negocio) — `prd.md`:
  - antes: «A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote).»
  - depois: «A função é
  alcançável pelo Deno (arquivo com `.ts` explícito, sem import de pacote). O pedido montado pela dona, no painel ou
  no app do ateliê, segue a mesma regra: durante a vigência, a peça marcada entra com o preço da campanha (a dona ainda
  pode dar um desconto combinado por cima), o cupom não vale para ela, e o preço fica travado na proposta como hoje.»
- **`recusa-do-cupom-mora-em-couponrefusal`** (tech) — vai a **Decisões** do `spec.md`: Dividir em duas peças: (1) a base do cupom sem as linhas de campanha dentro de `resolveCouponDiscount`/`priceOnePath` (o dinheiro); (2) a recusa com o nome da campanha e o mínimo sobre a mesma base em `couponRefusal`, que ganha no contexto o subtotal elegível e o nome da campanha, chamada pela loja **também quando a sacola muda** (não só ao aplicar), por `order-proposals` e pelo `mercado-pago` (que passa a conferir `min_order`, com o cupom recusado virando `null` como já acontece).
- **`regras-do-cadastro-garantidas-no-banco`** (tech) — vai a **Decisões** do `spec.md`: Tabelas: `campaigns` (nome, texto do selo, as duas cores, `starts_at`, `ends_at`, `active`, `check` de tetos e de `ends_at > starts_at`, exclusion constraint acima); `campaign_percents (campaign_id, percent)` com PK composta e `check` 1–70; `product_campaigns (product_id, campaign_id, percent)` com PK `(product_id, campaign_id)` e FK composta `(campaign_id, percent) → campaign_percents on delete restrict` (a recusa de UC-02 vira o `23503`, traduzido com a contagem), `product_id on delete cascade`; `order_items.campaign_id on delete restrict` (RN-09). Teto de 5 percentuais por gatilho de contagem ou pela RPC de gravação. Provar por probe SQL contra o banco local.
- **`order-bump-em-peca-de-campanha`** (negocio) — `prd.md`:
  - antes: «para a tela não
  prometer o que o servidor não dá.»
  - depois: «para a tela não
  prometer o que o servidor não dá. A oferta do checkout ("leve também") numa peça de campanha cobra o menor preço entre o da campanha e o da
  oferta, nunca os dois descontos somados.»
- **`frete-gratis-pela-soma-com-desconto`** (negocio) — `prd.md`:
  - antes: «- o **valor mínimo** do cupom é conferido sobre as linhas que entram na base (sem as peças de campanha).»
  - depois: «- o **valor mínimo** do cupom é conferido sobre as linhas que entram na base (sem as peças de campanha).
  - o **frete grátis por valor** conta a soma do que a cliente paga pelas peças, já com o desconto da campanha.»
- **`mais-de-uma-campanha-no-cadastro-da-peca`** (negocio) — `prd.md`:
  - antes: «aparece um campo por campanha **agendada ou em vigência** (na
  prática, uma):»
  - depois: «aparece um campo por campanha **agendada ou em vigência**, na ordem do
  início, cada um com a sua vigência no rótulo:»
  - antes: «pela edição em
  massa que já existe; os percentuais oferecidos são os da campanha.»
  - depois: «pela edição em
  massa que já existe; os percentuais oferecidos são os da campanha. Na edição em massa, a dona escolhe primeiro a campanha e depois o percentual;
  o filtro da lista também começa pela campanha.»
- **`selo-da-campanha-e-os-selos-do-topo`** (negocio) — `prd.md`:
  - antes: «`alvoDeToqueNaoRoubaPosicao`,
  `cardSkeletonBox` e `accentText` continuam valendo.»
  - depois: «`alvoDeToqueNaoRoubaPosicao`,
  `cardSkeletonBox` e `accentText` continuam valendo. Durante a vigência, a peça de campanha mostra só a faixa da campanha: os selos do
  canto (desconto de hoje, Novo, Últimas, Destaque) não aparecem nela. Fora da campanha, o cartão volta a ser o de hoje.»
- **`ca-14-depende-do-wi-100`** (tech_prd_edit) — `prd.md`:
  - antes: «O selo é o mesmo com a loja no perfil Padrão ou no Black Friday.»
  - depois: «O selo não usa nenhuma cor da paleta da loja: muda a paleta, o selo continua igual.»
  - e a decisão técnica vai a **Decisões** do `spec.md`: Decisão técnica: o selo lê só as duas cores da campanha, por `style` inline, nunca um token da loja; um guarda de fonte recusa token `estrelinha-*` nos componentes do selo.
- **`nomes-das-colunas-de-preco`** (tech) — vai a **Decisões** do `spec.md`: A spec nomeia `products.base_price`/`products.original_price` e `product_variants.price`/`product_variants.compare_price`, e CA-06 é provado numa variação.
- **`categoria-black-friday-da-nuvemshop`** (negocio) — `prd.md`:
  - antes: «(UC-06, última linha)»
  - depois: «A categoria antiga "Black Friday" … leva para /ofertas.»
- **`contraste-no-banco-seria-segundo-dono`** (tech) — vai a **Decisões** do `spec.md`: No banco, só o `check` de formato (`^#[0-9A-Fa-f]{6}$`); a recusa por contraste é `core/color` chamada pelo painel e pela RPC/handler de gravação se houver; o selo aplica as cores por `style` inline e o teste do selo calcula a razão com `contrastRatio` sobre a semente.
- **`inventario-de-guardas-e-ancoras`** (tech) — vai a **Decisões** do `spec.md`: A spec lista estes guardas por nome nas tarefas que os movem, e a ordem de publicação é migration → functions (`checkout`, `mercado-pago`, `order-proposals`, `google-feed`) → bundles (a vitrine e o card pedem as tabelas novas por embed; sem elas a leitura inteira falha).
- **`estado-desligada-e-encerrada`** (negocio) — `prd.md`:
  - antes: «- **Encerrada**: fim no passado (ou desligada). Fica no histórico, com as marcações das peças, sem efeito.»
  - depois: «- **Encerrada**: fim no passado. **Desligada**: interruptor desligado com o fim ainda no futuro; pode ser religada. As duas
  ficam no histórico, com as marcações das peças, sem efeito.»

### Leitura

Veredito `changes_requested_gaps` (0 bloqueantes, 12 lacunas, 9 decisões técnicas). O negócio estava amarrado; o risco era o caminho do dinheiro: a sacola com preço congelado, a campanha do pedido congelada pelo servidor (D-05), um termo próprio para a campanha no cálculo do pedido e a guarda de teto do pagamento. As 12 lacunas entraram no `prd.md` (r1 do Histórico); as 9 decisões técnicas e as 5 técnicas-com-edição vão a Decisões da costura.
