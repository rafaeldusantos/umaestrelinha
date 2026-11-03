# Descoberta — Compre Junto na página do produto

> Relatório do `wi-discovery`, gravado em 2026-11-02. O rascunho de PRD está em `prd.md`.

Pedido: Compre Junto na página do produto
Repositórios: `/Users/rafael.santos/Projetos/uma-estrelinha/store` (monorepo: `apps/store`, `apps/backoffice`, `packages/core`, `packages/supabase`, `packages/ui`, `supabase/`). `apps/mobile-adm` não foi investigado: o pedido não chega até ele. Nenhum repositório ficou inacessível.
Instruções lidas: `CLAUDE.md` da raiz, inteiro. `apps/backoffice/CLAUDE.md`, inteiro. `apps/store/CLAUDE.md`, por seção: Design system, Mobile, Ícones, Endereçamento, Produtos em destaque/`ProductCarousel`, Página do produto, Material afetivo, Gaveta de material, Carrinho/chrome/checkout (com as parcelas, PIX, cartão e checkout sem conta), Frete grátis, Pedido montado. `packages/core/CLAUDE.md`, por seção: linhas 1-125 (módulos, Dinheiro, shopping) e 485-507 (`proposals`, tipos). `supabase/CLAUDE.md`, por seção: Migrations/RLS e Edge functions (linhas 52-236) e `checkout`/`order-proposals` (linhas 382-451). `.specs/STATE.md`: só `AD-015` (linhas 249-271). `.specs/BACKLOG.md`: só `BL-002` (linhas 59-89). `DESIGN.md` não foi lido.

## Diagnóstico

Busca por Grep (ripgrep) e Glob; ast-grep não está disponível neste ambiente. Os caminhos são relativos a `/Users/rafael.santos/Projetos/uma-estrelinha/store`.

### Já existe e serve
| O que | Onde | Cobre o que do pedido |
| ----- | ---- | --------------------- |
| Carrinho: cada entrada leva variação, preço da linha e texto de gravação; a gravação faz parte da identidade da linha | `apps/store/src/entities/cart/model/cartStore.ts:85-134` (`itemKey`, `addItem`) | Cada adicional pode entrar como linha própria, com a variação escolhida |
| Estado de compra da página: variação escolhida, `canAddSelection`, recusa de gravação, `add()` com o evento `add_to_cart` e a gaveta abrindo | `apps/store/src/entities/product/model/useProductPurchase.tsx:67-157` | É o molde da escolha e validação de cada adicional; a variação do principal já é estado único da página |
| Seletor de variações da loja em três superfícies (`card`, `sheet`, `page`); `page` mostra as fotos da variação | `apps/store/src/entities/product/ui/VariantPicker.tsx:46,146` | Escolher a variação de um adicional (corrente, pingente) |
| Recusa de adicionar produto com grade sem `variant_id` (o servidor recusa pagar); a sugestão vira link para a página | `apps/store/src/widgets/cart-drawer/ui/CrossSell.tsx:18-24,78-100` | Regra que o bloco precisa honrar: adicional com grade exige variação escolhida |
| Busca de vários produtos por id, reordenada pela posição da dona | `apps/store/src/entities/product/index.ts:3` (`useProductsByIds`); `apps/store/CLAUDE.md:635-638` | Carregar os produtos dos adicionais em uma consulta, na ordem curada |
| Lista curada com teto e recusa com motivo | `packages/core/src/home/featured.ts:22,46-62` (`FEATURED_PRODUCTS_MAX`, `featuredProductsRefusal`) | Molde para "até 3 adicionais" e "lista ordenável", com a recusa em `core` |
| Busca de produto do painel (`modo: 'multiplo'`, `selecionados`, `excluir`, `mostrarFoto`) e o catálogo compartilhado | `apps/backoffice/src/entities/product/ui/ProductSearchField.tsx`, `api/useProductPool.ts` | Escolher os produtos de cada adicional e de cada lista |
| Seletor de variações do painel, em chips com foto (feature 89) | `apps/backoffice/src/entities/product/ui/VariantPicker.tsx` | Escolher quais variações de um adicional a dona libera |
| Lista reordenável por arraste nos editores da Home (feature 50) | `apps/backoffice/CLAUDE.md` › "O editor de Produtos em destaque" | Molde para ordenar os produtos de uma lista |
| Cálculo único de preço com `AD-015`: desconto por item nunca soma (vence o menor preço da linha); promoção × cupom decidido pelo menor total | `packages/core/src/payment/pricing.ts:345-366` (`perItemMin`, `resolveChargedItems`), `:472-502` (`resolveOrderPricing`); `.specs/STATE.md:249-271` | Lugar onde um desconto de compra casada teria de nascer, chamado igual pela loja e pelo servidor |
| Order bump: desconto que vale pela simples presença do `product_id`, com a oferta lida do banco e nunca do navegador | `packages/core/src/payment/pricing.ts:126-144` (`applyOrderBump`); `supabase/functions/mercado-pago/handlers.ts:542-559` | Precedente direto de "desconto por item decidido pelo servidor" |
| O pedido entra na fila de material se qualquer item exige material | `packages/core/src/material/material.ts:251-254` (`initialMaterialStatus`) | Pingente afetivo + corrente: o pedido entra na fila sem regra nova |
| Cada item do pedido congela `requires_material`, `material_kinds` e `engraving_text` | `apps/store/src/features/checkout/lib/buildOrderPayload.ts:63-94` | Cada adicional leva o próprio dado de material e gravação |
| GA4: `view_item_list`/`select_item` com id de lista e `useTrackList` | `packages/core/src/analytics/events.ts:76-99`; `apps/store/src/widgets/related-products/ui/RelatedProducts.tsx:9,29` | Medir a exibição e o clique do bloco como uma lista própria |
| O feed do Google e o JSON-LD não carregam desconto condicional (nem PIX, nem promoção) | `packages/core/CLAUDE.md:119-121` | Garante que o desconto da compra casada não vira preço de oferta |
| Ícones de corrente e pingente | `packages/ui/src/icons/CorrenteIcon.tsx`, `PingenteIcon.tsx` | Vocabulário visual dos adicionais |

### Existe e precisa mudar
| O que | Onde | O que falta para o pedido |
| ----- | ---- | ------------------------- |
| Coluna `products.buy_together_ids uuid[]` e o card "Compre junto" do painel | `supabase/migrations/20260726000000_products_extended_fields.sql:58`; `packages/supabase/src/types/index.ts:262`; `apps/backoffice/src/pages/admin/AdminProductFormPage.tsx:208-210,399,1052-1054`; `apps/backoffice/src/features/product-form/model/useProductForm.ts:93,200,272`; `apps/backoffice/src/features/product-form/ui/RelatedProductsSelect.tsx` | É uma lista plana de ids. Não tem a ideia de "adicional" (até 3), nem lista de opções por adicional, nem quais variações vale, nem desconto. **Nenhuma tela da loja lê esta coluna**: em `apps/store` ela só aparece no fixture `entities/product/lib/__tests__/cardSelect.test.ts:57`. Precisa ser substituída ou migrada; ficar ao lado de um modelo novo dá dois donos do mesmo dado |
| Página do produto | `apps/store/src/pages/ProductPage.tsx:278-332` | Não tem bloco nenhum entre a informação, o acordeão e os relacionados; o bloco precisa de um lugar. O estado de compra (`purchase`) já é compartilhado com a barra fixa |
| Barra de compra do celular | `apps/store/src/widgets/product-buy-bar/` (`ProductBuyBar`, montada em `ProductPage.tsx:332`) | Adiciona só o produto principal. Não li se precisa conhecer o conjunto (ver Incertezas) |
| Evento `add_to_cart` de um item só | `packages/core/src/analytics/events.ts:110-112` | O conjunto adicionado de uma vez precisa de um evento com vários itens, ou uma regra de "um evento por linha" |
| Carrinho sem noção de origem ou agrupamento | `apps/store/src/entities/cart/model/cartStore.ts:17-47`; `cartStore.ts:169-190` (`version: 3` + `migrate`) | Só muda se a linha precisar dizer "comprado junto com X" (Q-09). Mudar a forma persiste em `estrelinha-cart` e exige `migrate` |
| Regras de preço | `packages/core/src/payment/pricing.ts:19-46` (`CalculateOrderTotalsInput`), `:360-366` | Não há regra de compra casada. Entraria ao lado de `bump` e `promotions`, competindo por `perItemMin` (`AD-015`). **Toca `payment/**`**, que fechou várias features sem uma linha alterada (`CLAUDE.md:2757`) |
| Recálculo do pagamento no servidor | `supabase/functions/mercado-pago/handlers.ts:542-665,684-701` | Teria de ler do banco a configuração da compra casada (como faz com bump e promoções), aplicar pela mesma função e, se houver desconto exibido gravado, ter guarda de teto no molde de `promotion_no_longer_valid` |
| Totais da loja (checkout e gaveta) | `apps/store/src/features/checkout/model/useCheckoutTotals.ts:120-172`; `apps/store/src/entities/cart/model/useCartPromotion.ts:139-157` | Os dois chamam `resolveOrderPricing`; teriam de passar a configuração da compra casada e mostrar a linha do desconto |
| Gravação dos itens do pedido | `supabase/functions/checkout/handlers.ts:432-435` | O `insert` de `order_items` espalha o corpo do item vindo do navegador (`{ ...item, order_id }`). Qualquer marca nova do tipo "veio do compre junto" ou "desconto casado" seria **escrita pelo cliente** e não pode decidir preço |
| Ficha do pedido | `packages/supabase/src/types/index.ts:492-518` (`DbOrderItem`); `orders.promotion_discount` (`mercado-pago/handlers.ts:716-727`) | Não há onde registrar que houve compra casada nem quanto ela descontou (relatório, folha de separação, e-mail) |

### Não existe
| O que | Camada | Como procurou |
| ----- | ------ | ------------- |
| Modelo de "adicional" (até 3 por produto; cada um sendo um produto com variações liberadas ou uma lista ordenada de produtos) | dados | Grep `buy_together\|related_product_ids` em `apps`, `packages`, `supabase`, `tools` (`*.ts,*.tsx,*.sql`); Grep de `create table`/`alter table` em `supabase/migrations` |
| Leitura de compre junto na loja (bloco, hook, consulta) | entrada / UI | O mesmo Grep em `apps/store/src`: só o fixture de teste |
| Regra pura de compra casada em `core` (recusas, teto de 3, lista ordenada) | regra de negócio | Glob em `packages/core/src/**`; Grep `bump\|bundle\|combo` |
| Desconto por combinação de produtos | regra de negócio / dinheiro | Leitura integral de `packages/core/src/payment/pricing.ts`: só bump, faixa progressiva, cupom, avulso e PIX |
| Adicionar vários itens à sacola num gesto só | regra de negócio / UI | `cartStore.ts`: só existe `addItem` unitário. O laço em `useProductPurchase.tsx:143` é por unidade do mesmo produto |
| Registro, no pedido, de que itens vieram de uma compra casada | dados | Leitura de `DbOrderItem` (`types/index.ts:492-518`) e de `buildOrderItems` |
| Relatório de adesão ao compre junto no painel | UI | Grep `buy_together` em `apps/backoffice`: só o formulário |
| Validação de estoque no `create-order` | entrada | Grep `stock\|is_active` em `supabase/functions/checkout/handlers.ts`: 0 ocorrências |

## Premissas

| ID | Premissa | Alternativa | O que muda se a alternativa valer |
| -- | -------- | ----------- | --------------------------------- |
| P-01 | O compre junto é configurado por produto principal | Listas reutilizáveis ligadas a vários produtos, ou uma regra por categoria (ver Q-02) | O modelo de dados e a tela do painel mudam: aparece uma tela própria de "listas", e UC-01 vira dois casos de uso |
| P-02 | Cada adicional vira linha comum da sacola e do pedido, sem marca de origem | A linha carrega "comprado junto com X" (Q-09) | Muda o carrinho (forma persistida em `estrelinha-cart`, `cartStore.ts:169-190`) e `order_items`; abre relatório de adesão e folha de separação agrupada |
| P-03 | Nenhum adicional vem pré-marcado | O primeiro adicional vem marcado | CA-02.2 se inverte. Item pré-marcado em oferta é um padrão contestado (conhecimento) |
| P-04 | Cada adicional entra com quantidade 1, qualquer que seja a quantidade do principal | Adicional acompanha a quantidade do principal (Q-08) | Muda CA-03.1 e, com desconto, a regra de quantas unidades recebem desconto |
| P-05 | O compre junto não se aplica ao pedido montado pelo painel (feature 89) | A montagem oferece os adicionais do produto | A proposta trava preço por linha (`supabase/CLAUDE.md:426-440`); o painel ganharia um passo na montagem |
| P-06 | O bloco mora só na página do produto | Também na gaveta da sacola e no checkout | Novas superfícies, e possível conflito com o order bump e com o "Complete o frete grátis" |
| P-07 | A variação do principal usada pelo conjunto é a já escolhida na página (estado único `useProductPurchase`) | O bloco tem um seletor próprio do principal | Dois estados para a mesma escolha, o defeito que `useProductPurchase.tsx:55-62` existe para evitar |
| P-08 | Num adicional do tipo lista, a cliente escolhe exatamente um produto | Pode escolher vários da lista | Muda CA-02.5, o total e a regra de desconto |

## Perguntas

Da que trava para a que não trava. A primeira sugestão é a recomendação do `wi-discovery`.

| ID | Pergunta | Sugestões (2–3) | Muda |
| -- | -------- | --------------- | ---- |
| Q-01 | **O spec deve ser 1 ou 2 work items?** O que pesa, pelo código: o desconto toca `packages/core/src/payment/pricing.ts`, a regra `AD-015` (o desconto concorre por item com o order bump e a promoção progressiva, e com o cupom pelo total), o recálculo do `create-payment` (`mercado-pago/handlers.ts:542-701`, com guarda de teto) e os dois chamadores da loja (`useCheckoutTotals`, `useCartPromotion`). É o código de dinheiro que o projeto trata com cerimônia (`CLAUDE.md:2757`; `BL-002`: `pricing.ts` nem passa por ESLint). O resto (modelo de adicionais, painel, bloco, sacola, GA4) não encosta em `payment/**`. **Cortar por camada** (painel × loja) é o pior corte: a loja sem painel não tem dado, o painel sem loja não tem efeito (é o que já acontece com `buy_together_ids`), e a regra pura em `core` seria dos dois. | (1) **Dois, cortados na vertical**: WI-91 "Compre junto" (modelo + painel + bloco + sacola + GA4, sem desconto) e WI-92 "Desconto da compra casada" (regra em `payment/pricing`, recálculo no servidor, linha no resumo, registro no pedido). Custo: duas migrations, dois ciclos de verificação e QA, e o texto do bloco do 91 sem falar de desconto. Ganho: o 91 vai ao ar sem tocar no código de dinheiro, e a adesão ao conjunto pode ser medida antes de dar desconto. (2) **Um só**: lança com desconto, mas o gate do item inteiro passa a ser o de `payment/**` e a probe "exibido = cobrado" contra o servidor local. (3) Dois cortados por camada: não recomendo | Escopo › Dentro/Fora; o desconto entra ou sai; o desenho do painel ganha ou não o campo de desconto |
| Q-02 | Onde a dona configura os adicionais? O catálogo tem ~680 produtos: configurar a "lista de correntes" produto a produto repete a mesma lista centenas de vezes | (1) Listas nomeadas e reutilizáveis ("Correntes", "Pingentes adicionais"), ordenadas uma vez, presas a um adicional de cada produto principal. (2) Só por produto, como o pedido descreve. (3) Por produto, com padrão herdado da categoria | UC-01, P-01, o modelo de dados e se o painel ganha uma tela própria. Atenção ao conflito com `AD-014` (Conflito 3) |
| Q-03 | O que fazer com `products.buy_together_ids` e o card "Compre junto" que já existem no painel e nenhuma tela da loja lê? | (1) Substituir pelo modelo novo e converter o que estiver gravado (cada id vira um adicional do tipo "produto", até 3) antes de apagar a coluna. (2) Descartar sem converter. (3) Manter a coluna e acrescentar o modelo ao lado: não recomendo, são dois donos | A migração, o painel e se há dado de produção a preservar |
| Q-04 | (Se houver desconto) Qual a forma do desconto da compra casada? | (1) Percentual por adicional, aplicado ao preço da linha do adicional quando o principal está no mesmo pedido, no molde do order bump. (2) Valor fixo por adicional. (3) "Preço do conjunto" fixo | A regra em `pricing.ts`, o campo no painel e o texto no bloco |
| Q-05 | (Se houver desconto) Como o desconto convive com cupom, promoção progressiva, order bump e PIX? `AD-015` diz "vale para qualquer oferta futura: upsell, brinde, combo" | (1) Seguir `AD-015`: concorre por item com bump e promoção (vence o menor preço), concorre com cupom pelo menor total, e o PIX incide depois. (2) Acumula com o cupom por opção da dona, como `stacks_with_coupon` | O cálculo e a frase do resumo explicando o que venceu (PRM-17) |
| Q-06 | (Se houver desconto) O desconto exige que a peça tenha entrado pelo bloco, ou basta o principal estar no mesmo pedido? | (1) Basta a presença no mesmo pedido, decidida pelo servidor a partir da configuração do banco (o order bump é assim, `pricing.ts:132-136`). (2) Só se entrou pelo bloco: exige marca na linha, e essa marca é escrita pelo navegador (`checkout/handlers.ts:435`) | Segurança da regra, o modelo do carrinho e a necessidade de marca no pedido |
| Q-07 | Num adicional do tipo "produto", a dona escolhe quais variações valem, ou valem todas as ativas? | (1) A dona escolhe; vazio vale todas. (2) Sempre todas | UC-01 (CA-01.2) e o seletor do painel |
| Q-08 | Com o principal em quantidade 2 ou mais, quantos adicionais entram? | (1) Um de cada, e a cliente ajusta na sacola. (2) A mesma quantidade do principal | P-04, CA-03.1 e a regra de desconto por unidade |
| Q-09 | A sacola, o pedido e o painel mostram que as peças foram compradas juntas? | (1) Não no primeiro corte: linhas comuns, medição só pelo GA4. (2) Sim: "acompanha o Pingente X" na sacola e no pedido, e um relatório de adesão no painel | Modelo do carrinho (`estrelinha-cart`, versão e `migrate`), `order_items` e uma tela nova no painel |
| Q-10 | O compre junto convive com o order bump do checkout e com o "Complete o frete grátis" da gaveta? | (1) Convivem; o order bump some se o produto dele já está na sacola, como hoje (`OrderBump.tsx:31-35`). (2) O compre junto substitui o order bump | Escopo e Configurações › Vendas do painel |
| Q-11 | Adicional que tem gravação (eixo "Com gravação") ou exige material pode entrar no bloco? | (1) Pode; a gravação é pedida dentro do bloco com o mesmo campo e o mesmo limite da página, e o material é tratado no pós-compra como hoje. (2) No primeiro corte, só adicionais sem gravação | UC-02/UC-03 e o tamanho do bloco no celular |
| Q-12 | Diferenciais com o tom da marca [conhecimento]: quais entram? | (1) **Combinar o acabamento**: pré-escolher na corrente a variação do mesmo banho/cor do pingente escolhido, sem marcar a corrente. (2) **Título escrito pela dona** em cada adicional, explicando o porquê. (3) **Total do conjunto com o preço no PIX** ao lado, pela mesma regra da página. Fora, por tom: "quem comprou também levou", "últimas unidades", contagem regressiva | CA novos em UC-02. (1) cria regra de correspondência entre eixos de produtos diferentes |
| Q-13 | Onde o bloco fica na página, no celular? | (1) Logo abaixo do botão de compra da coluna de informação, antes do acordeão, com um botão próprio "Levar o conjunto". (2) Depois da descrição, antes de "Você também vai curtir" | Desenho da loja; se a barra fixa do celular (`ProductBuyBar`) passa a conhecer o conjunto |

## Conflitos

1. **O painel já tem "Compre junto", e a loja não o lê.** `AdminProductFormPage.tsx:1052-1054` grava `products.buy_together_ids`, e nenhum arquivo de `apps/store` lê a coluna (só o fixture `cardSelect.test.ts:57`). O pedido trata a funcionalidade como nova; o código tem uma metade órfã. Ver Q-03.
2. **Mesma família**: o card "Produtos relacionados" grava `related_product_ids`, mas a faixa "Você também vai curtir" da loja sai da categoria (`apps/store/src/pages/ProductPage.tsx:82,137`). A coluna é lida só pela sugestão de SEO (`AdminProductFormPage.tsx:1018`). Fora do pedido, mas é a vizinha direta da tela que será redesenhada.
3. **"Lista de produtos" × `AD-014`.** O pedido pede uma "lista de produtos referência" (ex.: correntes). O código diz que conjunto de produtos é **categoria, só ela** (`apps/store/CLAUDE.md:204-207`), e a tabela `collections` foi recusada. Uma lista reutilizável e nomeada (Q-02, sugestão 1) é um segundo conceito de "conjunto de produtos". A alternativa que não colide é o adicional apontar para uma categoria; nesse caso a ordem viria da categoria (`product_categories.position`) e não da curadoria do bloco.
4. **Corrente pode já ser variação do pingente.** O catálogo tem eixos "Tipos de elo", em quatro grafias, em 150 eixos de variação (`apps/store/CLAUDE.md:802-803`). Nesses produtos a corrente já é escolhida dentro do próprio pingente. Oferecer corrente como adicional nesses produtos daria duas formas de escolher a mesma coisa.
5. **Conhecimento × código, sobre tom.** Compre junto de mercado costuma usar itens pré-marcados, "economize X" em destaque, "quem comprou também levou" e escassez. `CLAUDE.md:8` proíbe urgência fabricada, e `CLAUDE.md:365` proíbe prova social fabricada. O rascunho segue o código (CA-02.2, CA-02.8). De passagem, pela mesma régua: o selo "Só aqui" do order bump (`apps/store/src/features/checkout/ui/OrderBump.tsx:88-90`) é uma afirmação de exclusividade.
6. **Desconto × `AD-015`.** O pedido diz "possibilidade de descontos na compra casada". `AD-015` (`.specs/STATE.md:249-254`) já decidiu que combo não soma com outro desconto por item e que contra o cupom vale o menor total. Um desconto que somasse contradiria uma decisão ativa.
7. **Marca de origem no pedido é escrita pelo navegador.** `supabase/functions/checkout/handlers.ts:435` grava `order_items` com o corpo do item espalhado. Qualquer campo "veio do compre junto" seria escrito pelo cliente, então o desconto não pode depender dele; o servidor teria de derivar a partir da configuração do banco (Q-06).
8. Nenhum texto lido (pedido, código, comentário) tentou dar instrução.

## Incertezas

- Se o banco de produção tem dados em `buy_together_ids` (e `related_product_ids`). Não consultado: só leitura de disco. Isso decide se Q-03 exige conversão.
- Como a confirmação do pedido (`OrderMaterialBlock`) e o código de envelope único por pedido (feature 82) lidam com **duas** peças que exigem material no mesmo pedido.
- Se `ProductBuyBar` precisa mudar: só foi lido onde ele é montado (`ProductPage.tsx:332`).
- Se `useProductsByIds` já traz as variações (`product_variants`) necessárias para o seletor de cada adicional.
- Quantos produtos do catálogo seriam "principais" com corrente como variação × corrente como produto separado (Conflito 4).
- O conteúdo de `DESIGN.md`: não lido.
- `create-order` não valida estoque (Grep `stock` = 0 em `checkout/handlers.ts`). Não verificado se outra camada (RPC, trigger) faz isso.
