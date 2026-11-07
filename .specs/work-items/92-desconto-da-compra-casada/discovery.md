# Descoberta — WI 92 · Desconto da compra casada (Compre Junto)

> Relatório do `wi-discovery` em 2026-11-03, gravado na íntegra. O rascunho de PRD está em `prd.md`.

Pedido: Desconto da compra casada (Compre Junto) — WI 92, recorte do WI 91 (Q-01), com Q-04/Q-05/Q-06 já decididas
Repositórios: /Users/rafael.santos/Projetos/uma-estrelinha/store-worktrees/store__feature-92 (monorepo: apps/store, apps/backoffice, packages/core, packages/supabase, supabase/migrations, supabase/functions/{checkout,mercado-pago,order-proposals,send-notification}). Nenhum inacessível. apps/mobile-adm não foi investigado além da menção ao WI 94 (`.specs/work-items/94-montar-pedido-no-app/prd.md`).
Instruções lidas: `CLAUDE.md` da raiz (seções "O defeito 01", "Os guardas", "Convenções", "Baselines", "CI e deploy", "Estado conhecido"). `packages/core/CLAUDE.md`, só a seção "Dinheiro — a regra que não muda por acaso" e o começo de "shopping" (linhas 64-123). `.specs/STATE.md` › AD-015 (249-271), AD-070, AD-071, AD-072 (1681-1748). **Não li**: `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `supabase/CLAUDE.md`, `.specs/LESSONS.md`. A thread principal deve conferi-los antes do PRD Tech Review.

Método de busca: Grep (ripgrep) e leitura de arquivo. Não usei ast-grep. `packages/core/src/payment/pricing.ts` foi lido por inteiro.

## Diagnóstico

### Já existe e serve
| O que | Onde | Cobre o que do pedido |
| ----- | ---- | --------------------- |
| Um ponto só que decide o total, chamado igual pela loja e pelo servidor | `packages/core/src/payment/pricing.ts:472-502` (`resolveOrderPricing`); chamadores em `apps/store/src/features/checkout/model/useCheckoutTotals.ts:163-172`, `apps/store/src/entities/cart/model/useCartPromotion.ts:157-164`, `supabase/functions/mercado-pago/handlers.ts:654-662` | É onde o desconto da compra casada tem de entrar (Q-05) para valer "exibido = cobrado" |
| `AD-015` no código: desconto por item calculado do preço cheio, vence o menor preço por índice | `pricing.ts:345-351` (`perItemMin`), `:360-366` (`resolveChargedItems`) | A regra de Q-05 "concorre por item com bump e promoção" já tem o mecanismo. Hoje ele compara duas listas; o desconto novo seria a terceira |
| Order bump: desconto percentual por presença do `product_id`, com a oferta lida do banco e nunca do navegador | `pricing.ts:126-144` (`applyOrderBump`, com `quantity === 1`); `mercado-pago/handlers.ts:542-559` | É o precedente direto de Q-04 (percentual) e de Q-06 (presença decidida pelo servidor) |
| Promoções lidas do banco no servidor e avaliadas em TS dentro do que o dublê cobre (`AD-004`) | `mercado-pago/handlers.ts:563-616` | Molde para o servidor ler `product_buy_together` dos principais do pedido |
| Guarda de teto: o desconto gravado na criação é teto, e recalcular menos dá 422 | `mercado-pago/handlers.ts:668-701` (`promotion_no_longer_valid`); `packages/core/CLAUDE.md:93-95` | Molde para o caso em que a dona muda ou apaga o desconto entre a sacola e o pagamento |
| Recálculo do preço de cada linha pelo catálogo, ignorando o `unit_price` do navegador | `mercado-pago/handlers.ts:428-540` (`resolveItemPrice` por `price_source`) | O desconto parte do preço cheio da variação, que já é confiável |
| Configuração do adicional: até 3 por joia, peça ou lista, variações liberadas, variações do principal que o escondem | `supabase/migrations/20261105120000_compre-junto.sql:63-85` (`product_buy_together`); `:35-44` (`buy_together_list_items`); tipo `packages/supabase/src/types/buyTogether.ts:22-32` | É a linha que ganharia o percentual (Q-04: "por adicional") |
| Marca "acompanha" por linha do pedido: snapshot do principal e da lista, validada pelo servidor | `packages/core/src/buy-together/marks.ts:35-54` (`orderItemMarks`); `supabase/functions/checkout/handlers.ts:270-287`; migration `20261106120000_compre-junto-no-pedido.sql:25-27` | Pode identificar a peça no pedido e no relatório. Pelo código e por Q-06, ela não decide preço (`marks.ts:8-10`) |
| Marca na sacola, por linha, com os principais que ainda estão nela | `apps/store/src/entities/cart/model/cartStore.ts:25-41, 74-77, 140-148` (`companionsOf`) | A sacola já sabe dizer "acompanha o X" e já tira a frase quando o principal sai, que é a mesma condição do desconto |
| Total do conjunto e PIX do conjunto no bloco | `packages/core/src/buy-together/total.ts:13-22`; `apps/store/src/entities/product/model/useBuyTogether.ts:283-290`; `apps/store/src/entities/product/ui/buy-together/BuyTogetherBlock.tsx:40-44, 77-96` | É onde o bloco mostraria o preço com desconto, se for decidido mostrá-lo ali |
| Feed e JSON-LD sem desconto condicional | `packages/core/CLAUDE.md:120-122` | Garante que o desconto não vira preço de oferta no Google (RNF-03 do WI-01) |

### Existe e precisa mudar
| O que | Onde | O que falta para o pedido |
| ----- | ---- | ------------------------- |
| `CalculateOrderTotalsInput` / `OrderPricingInput` | `pricing.ts:19-46, 404-407` | Uma entrada opcional nova (os pares principal → adicional com o percentual), com a mesma garantia de `promotions` e `manualDiscount`: ausente, a saída fica idêntica, inclusive na forma do objeto |
| `resolveChargedItems` | `pricing.ts:360-366` | Hoje volta cedo com o resultado do bump quando não há promoção (`:362`). O desconto novo precisa entrar no `perItemMin` dos dois caminhos, ou só no caminho "sem cupom" (ver Q-03) |
| `priceOnePath`: como o desconto é atribuído | `pricing.ts:435-452` | `promotionDiscount = soma(com bump) − subtotal cobrado`. Um desconto novo dentro de `resolveChargedItems` seria **contado como promoção**: apareceria na linha "Desconto progressivo" (`OrderSummary.tsx:215-222`, `CartDrawer.tsx:269-273`), seria gravado em `orders.promotion_discount` e passaria pela guarda de PRM-12. Precisa de um valor próprio no resultado (ex.: `buyTogetherDiscount`) e do vencedor correspondente |
| `resolveOrderPricing`: `winner`/`discarded`/`stacks` | `pricing.ts:409-418, 472-502` | Só conhece `promotion` e `coupon`. A frase de PRM-17 ("o cupom não foi aplicado — a promoção X desconta mais", `OrderSummary.tsx:286-287`) não tem como nomear a compra casada |
| Recálculo do `create-payment` | `mercado-pago/handlers.ts:542-665` | Ler `product_buy_together` (e `buy_together_list_items` para os adicionais de lista) dos principais do pedido. Com isso resolver quais linhas são adicionais pela presença (Q-06), respeitando `target_variant_ids`, `variant_ids` da lista e `hidden_on_variant_ids` com a variação do principal (`order_items.variant_id`), e passar à mesma função |
| Teto do desconto exibido | `mercado-pago/handlers.ts:684-701`; `checkout/handlers.ts:207-234` (`COLUNAS_DO_PEDIDO`) | Não há coluna para gravar o desconto casado que a tela mostrou. Sem ela, se a dona baixa o percentual entre a sacola e o pagamento, a cobrança fica mais cara do que a tela prometeu e nada recusa |
| Gravação do `unit_price` da linha depois do recálculo | `mercado-pago/handlers.ts:732-744` | Grava o preço de **catálogo** (`resolvedUnitPrice`, antes de bump e promoção), sobrescrevendo o valor descontado que a loja mandou (`buildOrderPayload.ts:60-62, 83, 116`). Depois do pagamento a linha da peça adicional mostraria o preço cheio |
| Totais da loja (checkout e gaveta) | `useCheckoutTotals.ts:136-172`; `useCartPromotion.ts:147-164` | Passar a configuração dos adicionais dos principais na sacola, que hoje nenhum dos dois lê (`useBuyTogetherData` só lê por slug do produto da página, `useBuyTogetherData.ts:63-67, 116-119`). Mostrar a linha do desconto |
| Montagem do item do pedido | `apps/store/src/features/checkout/lib/buildOrderPayload.ts:64-136` | Hoje só o bump é embutido no `unit_price` (`:68`). Precisa decidir se o desconto casado vai embutido, e precisa do valor exibido no corpo, no molde de `promotion_discount` (`:178-183`) |
| A frase do bloco | `BuyTogetherBlock.tsx:55-57, 92-95`; `total.ts:13-19` (`bundleTotal` soma preços cheios) | Se o bloco mostrar o desconto (Q-02), o total e o PIX do conjunto passam a ser outra conta. `bundleTotal` não conhece desconto |
| Rascunho e gravação do adicional no painel | `apps/backoffice/src/features/product-form/model/addons.ts:15-29` (`AddonDraft`), `:139-155` (`addonsChanged`), `:158-173` (`addonsFromRow`); `persistAddons.ts:58-66` (`linha`); `BuyTogetherTab.tsx` (sem campo de desconto, grep por "esconto" vazio) | Campo percentual por adicional, com recusa vinda de `core` (o molde é `buy-together/rules.ts`) |
| Linha do pedido na confirmação, na conta e no e-mail | `apps/store/src/entities/order/ui/OrderItemsSummary.tsx:85-86, 93-106`; `supabase/functions/send-notification/handlers.ts:269` e `render/layout.ts:223, 361` | Mostram `unit_price × quantidade` por linha e o `subtotal` do pedido. **Não há linha de promoção nem de desconto casado** (só cupom e PIX). Com a linha gravada a preço cheio, as linhas não somam o subtotal |
| Painel do pedido | `apps/backoffice/src/pages/admin/AdminOrderPage.tsx:570` (preço da linha), `:729` (subtotal) | Mesma lacuna: nada diz que houve desconto da compra casada nem quanto |
| Relatório de adesão | `supabase/migrations/20261107120000_compre-junto-adesao.sql:22, 66` (`valor = unit_price * quantity`, "o preço pago em cada peça") | Pela gravação de `handlers.ts:732-744`, o `unit_price` é o de catálogo, então o "valor" do relatório não seria o que foi pago com desconto. A migration aplicada é imutável (`AD-017`): mudar a régua exige migration nova que recrie a RPC |
| Pedido montado pelo painel (feature 89) | `packages/core/src/proposals/pricing.ts:99-118` (chama `resolveOrderPricing` sem `bump`), `:166-177` (as linhas travadas reaplicam **só** `applyProgressiveDiscount`); `supabase/functions/order-proposals/handlers.ts:473-482` | Se a montagem passar a configuração dos adicionais, o subtotal mudaria e as linhas travadas não, e os dois deixariam de bater. Se não passar, a proposta fica sem desconto casado. Ver Q-07 |

### Não existe
| O que | Camada | Como procurou |
| ----- | ------ | ------------- |
| Percentual de desconto no adicional (coluna, tipo, rascunho) | dados / contratos | Lida a migration `20261105120000_compre-junto.sql` inteira; lidos `DbProductBuyTogether` (`buyTogether.ts`), `AddonConfig` (`availability.ts:36-46`) e `AddonDraft`; grep `esconto` em `BuyTogetherTab.tsx` |
| Regra de desconto de compra casada em `core` | regra de negócio | Leitura integral de `pricing.ts` (só bump, faixa, cupom, avulso e PIX); leitura de `buy-together/{rules,total,marks,settings,types}.ts` |
| Coluna no pedido para o desconto casado (teto ou registro) | dados | Lida a lista `COLUNAS_DO_PEDIDO` (`checkout/handlers.ts:207-234`) e as colunas que `create-payment` atualiza (`handlers.ts:716-727`) |
| Desconto por linha em `order_items` | dados | Lidos `COLUNAS_DOS_ITENS` (`checkout/handlers.ts:245-260`) e a migration `20261106120000` |
| Linha "Desconto progressivo" ou equivalente na confirmação, no e-mail e no painel do pedido | UI | Grep `promotion_discount` no backoffice (só promoções e propostas) e em `send-notification` (zero); leitura de `OrderItemsSummary.tsx:93-106` |
| Leitura da configuração dos adicionais pela sacola, pelo checkout e pelo `create-payment` | entrada / UI | Grep `product_buy_together` em `apps/`, `packages/` e `supabase/functions`: só `useBuyTogetherData` (página do produto), o formulário do painel, `availability.ts` e testes |

## Premissas

| ID | Premissa | Alternativa | O que muda se a alternativa valer |
| -- | -------- | ----------- | --------------------------------- |
| P-01 | O percentual mora na própria linha do adicional (`product_buy_together`), uma coluna nova e nula | Uma tabela própria de regras de desconto | Migration, tipo, `persistAddons`, a leitura do servidor e o "defeito 01" (com um segundo lugar para a mesma configuração) |
| P-02 | Num adicional do tipo lista, um percentual vale para qualquer peça da lista | Percentual por peça da lista (`buy_together_list_items`) | Muda a tela de Listas, o modelo e quem decide quando a mesma peça está em listas com percentuais diferentes (ver Q-04) |
| P-03 | O desconto respeita o que o bloco respeita: variação não liberada e adicional escondido pela variação do principal não recebem desconto | Vale para qualquer variação da peça | O servidor precisa ou não de `target_variant_ids`, `variant_ids` e `hidden_on_variant_ids`; um caso de borda de CA-04.4 |
| P-04 | Com dois principais na sacola que dão percentuais diferentes à mesma peça, vale o maior percentual (o menor preço, coerente com `AD-015`) | O do primeiro principal, ou o do mais recente | A regra pura e o texto da sacola |
| P-05 | O desconto casado é registrado no pedido numa coluna própria (teto e registro), no molde de `orders.promotion_discount` | Embutido no `promotion_discount`, ou só no `subtotal` | A guarda de CA-04.3, a linha de CA-05.1 e o que o painel e o relatório conseguem dizer |
| P-06 | A frase da linha na sacola e no checkout é "Desconto do Compre junto −R$ X" | Desconto por linha, mostrado junto da peça ("de/por") | O desenho da sacola, do checkout e de `OrderItemsSummary` (ver Q-06) |

## Perguntas

Do que trava para o que não trava. Primeira sugestão = a recomendação do `wi-discovery`.

| ID | Pergunta | Sugestões (2–3) | Muda |
| -- | -------- | --------------- | ---- |
| Q-01 | Com a joia em quantidade 2 ou mais, ou com a peça adicional em quantidade maior que 1 na mesma linha (a sacola soma a peça avulsa e a do conjunto numa linha só, `cartStore.ts:74-77, 118-131`), quantas unidades da peça recebem desconto? | (1) Até a quantidade do principal: com 2 joias, até 2 correntes com desconto, o resto a preço cheio. Exige partir a linha no cálculo. (2) Uma unidade só, como o bump (`pricing.ts:136`). (3) Todas as unidades da linha | A regra pura, `perItemMin` (hoje por linha inteira), CA-02.1 e a frase da sacola |
| Q-02 | O desconto aparece no bloco da página do produto, antes de a cliente levar o conjunto? Isso contradiz a RNF-04 do WI-01 ("os descontos do pedido só aparecem na sacola e no checkout", `WI-01/prd.md:142`) | (1) Sim: a linha do adicional mostra o preço com desconto e o total do conjunto já descontado, com o aviso de que vale com a joia no mesmo pedido. Revisa a RNF-04. (2) Só na sacola e no checkout. (3) Só uma menção no bloco ("10% com esta joia"), sem mudar o total | `useBuyTogether`, `bundleTotal`, `BuyTogetherBlock`, a barra fixa e a RNF-04 do WI-01 |
| Q-03 | Q-05 diz que o desconto "concorre com o cupom pelo menor total". Mas o order bump, que é o molde, **acumula** com o cupom (o cupom incide sobre o subtotal já com bump, `pricing.ts:82-83, 435`). O desconto casado fica com a promoção, no caminho sem cupom, ou fica com o bump, nos dois caminhos? | (1) Com a promoção: caminho A (desconto casado + promoção, sem cupom) contra caminho B (cupom), vale o menor total, e a frase nomeia o descartado. É a letra de Q-05. (2) Como o bump: vale nos dois caminhos e acumula com o cupom. (3) Opção da dona por adicional, como `stacks_with_coupon` | `resolveOrderPricing`, `winner`/`discarded`, a frase de PRM-17 e a margem |
| Q-04 | A peça que está em duas listas com percentuais diferentes, ou que é adicional direto e também está numa lista da mesma joia: qual percentual vale? (só se P-02 cair) | (1) O maior. (2) O do adicional de posição menor | A regra pura |
| Q-05 | Qual o teto do percentual? | (1) De 1% a 50%, inteiro. (2) De 0,01% a 99,99%, como o desconto combinado (`proposals/pricing.ts:52-55`). (3) Livre até 100% | O `check` da migration, a recusa de `core` e o risco de peça grátis |
| Q-06 | Como a sacola, o checkout e o pedido mostram o desconto? | (1) Uma linha "Desconto do Compre junto" no resumo, como "Desconto progressivo", e o preço cheio na linha da peça. (2) "De/por" na linha da peça. (3) As duas coisas | A gaveta, o `OrderSummary`, a confirmação, o e-mail e o painel |
| Q-07 | O pedido montado pelo painel (feature 89) aplica o desconto da compra casada? | (1) Não: a Adri já tem o desconto combinado na montagem, e a proposta segue igual. (2) Sim, igual à loja, e as linhas travadas passam a carregar o desconto (`proposals/pricing.ts:166-177`) | `core/proposals`, `order-proposals`, a tela de montar e o WI 94 (montar no app) |
| Q-08 | O relatório de adesão conta a peça com desconto que entrou sem a marca (adicionada pelo catálogo com a joia na sacola)? E o "valor" mostra o preço pago com desconto? Hoje ele soma `unit_price × quantidade` (`compre-junto-adesao.sql:66`), e o `unit_price` gravado é o de catálogo (`mercado-pago/handlers.ts:732-744`) | (1) Segue contando pela marca, e o valor passa a ser o pago, líquido do desconto (migration nova recria a RPC). Acrescenta uma coluna "desconto concedido". (2) Segue igual, e o desconto aparece só no pedido. (3) Passa a contar pela presença | A RPC do relatório, a tela de Adesão e a régua F8 da revisão do WI-01 |
| Q-09 | Uma peça que é adicional de A e também principal de outro conjunto em que A é adicional (A↔B, ou a mesma corrente principal em outro produto): com as duas na sacola, as duas ganham desconto? | (1) Sim, cada linha recebe o desconto que a outra lhe dá (vale o menor preço por linha). (2) Só uma: a de menor preço cheio. (3) A tela do painel recusa o par recíproco | A regra pura e uma recusa nova no painel |
| Q-10 | Quando a cliente já tem a sacola montada e a dona muda o percentual, o que a cliente vê antes de pagar? | (1) A sacola relê a configuração e mostra o novo valor. Se o desconto caiu depois de ela ver o total, o pagamento recusa (CA-04.3) e ela recarrega. (2) A sacola congela o percentual do momento em que a peça entrou (o servidor teria de aceitar o congelado) | A leitura da sacola e a guarda de teto. A opção (2) contradiz Q-06 |
| Q-11 | Diferenciais `[conhecimento]` que mudam escopo, um por um: (a) desconto por quantidade de adicionais ("levando as duas peças, 15% em cada"); (b) validade do desconto (de/até), como a promoção; (c) uma prévia no painel, "a corrente sai a R$ X com esta joia", ao lado do campo; (d) a frase no bloco dizendo que o desconto vale com a joia no mesmo pedido; (e) aviso no painel quando o percentual de um adicional é menor que uma promoção ativa da peça (o desconto nunca venceria) | (1) Só (c) e (d) neste WI, que não mudam a regra; (a), (b) e (e) num WI seguinte. (2) (c), (d) e (e). (3) Nenhum | O escopo e a tela do painel |

## Conflitos

1. **O preço da linha depois do pagamento contradiz o que a documentação e a loja dizem.** `buildOrderPayload.ts:60-62` diz que o `unit_price` "já sai descontado" do bump (BMP-03), e `packages/core/CLAUDE.md:71-72` diz que o servidor "descarta" o valor do cliente. O `create-payment` faz isto: grava em cada linha o preço de **catálogo** (`resolvedUnitPrice`, sem bump e sem promoção) sempre que ele difere do gravado (`mercado-pago/handlers.ts:732-744`). Hoje, depois do pagamento, as linhas não somam o `subtotal` quando há bump ou promoção, e a confirmação (`OrderItemsSummary.tsx:85-106`), o e-mail (`layout.ts:223, 361`) e o painel (`AdminOrderPage.tsx:570, 729`) mostram isso sem linha que explique. O desconto casado herda o mesmo comportamento. É anterior a este WI. Fica a decisão de corrigir aqui ou não.
2. **A atribuição do desconto em `priceOnePath`.** `pricing.ts:435-452` chama de "promoção" tudo o que `resolveChargedItems` tira além do bump. Se o desconto casado entrar ali sem um valor próprio, ele vira "Desconto progressivo" na tela, vai para `orders.promotion_discount` e dispara `promotion_no_longer_valid` com a frase da promoção.
3. **Q-05 × o molde do bump** (Q-03): Q-05 diz que o desconto concorre com o cupom; o bump, molde de Q-04 e Q-06, acumula com o cupom.
4. **RNF-04 do WI-01 × mostrar o desconto no bloco** (Q-02): `WI-01/prd.md:142` põe os descontos só na sacola e no checkout. `CA-05.4` (`prd.md:107`) e `marks.ts:8-10` ("a marca nunca decide preço") **concordam** com Q-06.
5. **Relatório pela marca × desconto pela presença** (Q-08): o relatório de adesão conta só linhas com marca (`AD-072`), e o desconto vale pela presença. Uma peça com desconto sem marca não entra no relatório. A revisão do WI-01 já tinha deixado isso para o WI 92 (`WI-01/prd-review.md:31-32`, F8).
6. **A proposta travada** (Q-07): as linhas travadas reaplicam só a promoção (`proposals/pricing.ts:166-177`). Um desconto novo dentro de `resolveOrderPricing` faria o subtotal e as linhas da proposta divergirem.
7. **A identidade da linha na sacola** (Q-01): a peça avulsa e a do conjunto são a mesma linha (`cartStore.ts:74-77`), e `perItemMin` decide por linha inteira. Sem decidir a quantidade, o desconto vale para unidades que não vieram com a joia.
8. Nenhum texto lido tentou dar instrução.

## Incertezas

- Não li `apps/store/CLAUDE.md`, `apps/backoffice/CLAUDE.md`, `supabase/CLAUDE.md` nem `.specs/LESSONS.md`. Pode haver regra de módulo (ex.: sobre a sacola, o `OrderSummary` ou o deploy das functions) que este diagnóstico não considerou.
- Não li `AddonRow.tsx`, `CartDrawerRow.tsx`, `OrderSummary.tsx` por inteiro nem `BuyTogetherTab.tsx`. Os pontos de UI citados vêm de grep e das linhas mostradas.
- Não conferi se a gaveta e o checkout, com o bump marcado, já mostram subtotais diferentes por construção: `useCartPromotion` não passa `bump` (`useCartPromotion.ts:157-164`), `useCheckoutTotals` passa. Isso é relevante se o desconto casado seguir o molde do bump.
- Não sei se o servidor deve exigir a variação do principal no pedido para aplicar `hidden_on_variant_ids`, quando o principal é produto sem grade (`variant_id` nulo).
- Não conferi o WI 94 (montar pedido no app do ateliê) além do nome. Ele reusa `core/proposals` e seria alcançado pela resposta de Q-07.
- Não medi em banco o volume de `product_buy_together` hoje nem quantas peças estão em mais de uma lista. Isso pesa em P-02 e Q-04.

## Nota da thread principal (2026-11-03)

O usuário pediu, durante a descoberta, para acrescentar o desconto à UI da loja no Claude Design. Feito no
projeto "Uma Estrelinha - Loja" como **proposta para o gate**: página nova `Produto - Compre Junto com desconto.html`
(abre com o desconto ligado; a página do WI 91 continua abrindo sem desconto), com três exibições no painel do
protótipo — "Sem desconto", "De / por" e "Selo" —, a linha "Desconto por levar junto" no total do conjunto, o PIX
depois do desconto, e a sacola com a linha "Desconto do Compre Junto" e as peças voltando ao preço cheio quando a
joia sai. Exemplo: Correntes 10%, Estojo 15%, Pingentes sem desconto. Conferido em navegador a 390 e 1440, sem
rolagem horizontal. O protótipo antecipa respostas de Q-02 e Q-06 (mostra o desconto no bloco e a linha no
resumo); não as decide.
