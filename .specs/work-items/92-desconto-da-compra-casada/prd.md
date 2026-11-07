> Gerado pela descoberta e ratificado no gate em 2026-11-03.

# Desconto da compra casada (Compre Junto)

## Problema
O Compre Junto (WI-01) oferece na página da joia até três peças para levar junto, mas cobra cada uma
pelo preço cheio. A dona não tem como dar uma condição a quem leva a joia com a peça que a acompanha,
e o pedido original pedia "possibilidade de descontos na compra casada".

## Objetivo
A dona pode dar a cada adicional um percentual de desconto que vale quando a joia principal e a peça
adicional estão no mesmo pedido. A cliente vê o desconto já no bloco da página, e o mesmo valor na
sacola, no checkout, na cobrança e no pedido.

## Usuários e papéis
- Dona da loja (admin do painel): configura o percentual por adicional.
- Cliente da loja (com ou sem conta): leva a joia com a peça e recebe o desconto.
- Ninguém mais. Não há papel novo.

## Escopo
### Dentro
- Percentual por adicional, inteiro de 1% a 50%, sobre o preço da peça adicional, quando o principal está no mesmo pedido. Mora na própria configuração do adicional; vazio é sem desconto [pedido: Q-04 do WI 91; gate: Q-05, P-01]
- Num adicional do tipo lista, o percentual vale para a peça da lista que a cliente escolher [gate: P-02]
- O desconto concorre por item com o order bump e a promoção (vale o menor preço da linha) e **acumula com o cupom**, como o order bump: vale com e sem cupom. O PIX incide depois [gate: Q-03, que substitui a parte "concorre com o cupom" da Q-05 do WI 91; código: `AD-015`, `pricing.ts:82-83`]
- Quem decide se o desconto vale é o servidor, pela presença do principal e do adicional no mesmo pedido [pedido: Q-06 do WI 91]
- O bloco da página do produto mostra o desconto: "de/por" em cada peça e o total do conjunto já descontado, com o aviso de que vale com a joia no mesmo pedido. Revisa a RNF-04 do WI-01 [gate: Q-02]
- A sacola, o checkout, a confirmação, Minha conta, o e-mail, o painel do pedido e o app do ateliê mostram a linha "Desconto do Compre Junto − R$ X" [gate: Q-06, P-06; PRD Tech Review r1]
- A linha do pedido passa a guardar o preço cobrado (com bump, promoção ou desconto casado), e as telas do pedido mostram as linhas de desconto. Corrige um defeito anterior a este WI que também alcança bump e promoção [gate: C-01]
- O relatório de Adesão passa a mostrar o valor pago, líquido do desconto, e uma coluna "desconto concedido"; segue contando pela marca "acompanha" [gate: Q-08]
- Diferenciais deste WI: (c) prévia no painel ao lado do campo, "a corrente sai a R$ X com esta joia"; (d) a frase no bloco dizendo que o desconto vale com a joia no mesmo pedido [gate: Q-11]
### Fora
- Preço do conjunto fixo e desconto em valor fixo (Q-04 do WI 91 escolheu o percentual) [pedido]
- O desconto no feed do Google e no JSON-LD [código: `packages/core/CLAUDE.md:120-122`]
- O pedido montado pelo painel (feature 89, e o WI 94): a montagem já tem o desconto combinado, e a proposta segue igual, sem desconto casado [gate: Q-07]
- Percentual por peça dentro de uma lista [gate: P-02]
- Diferenciais para um WI seguinte: (a) desconto maior levando mais adicionais; (b) validade do desconto (de/até); (e) aviso no painel quando uma promoção ativa da peça já é maior que o desconto [gate: Q-11]
- A sacola guardar o percentual do momento em que a peça entrou [gate: Q-10]

## Casos de uso
### UC-01 · A dona dá um desconto a um adicional
Na aba Compre junto do produto, em cada adicional (peça ou lista), a dona informa um percentual de
desconto. Vazio é sem desconto.

**Critérios de aceite**
- CA-01.1 Cada adicional tem um campo de percentual. Vazio quer dizer sem desconto, e o adicional continua funcionando como no WI-01 [pedido: Q-04; gate: P-01]
- CA-01.2 Um percentual fora de 1% a 50%, ou não inteiro, é recusado antes de gravar, com a frase do motivo. Gravação direta no banco também é recusada [gate: Q-05; código: o molde é `buy-together/rules.ts:20-38` + `check` da migration]
- CA-01.3 Mudar só o percentual conta como alteração: o "Salvar" grava, e sem mudança o salvar não escreve [código: `addons.ts:139-155`]
- CA-01.4 Gravar o desconto de uma joia não muda o Compre Junto de outra [código: `persistAddons.ts:5-7`]
- CA-01.5 Ao lado do campo, uma prévia diz por quanto a peça sai com esta joia ("a corrente sai a R$ X com esta joia"); quando as variações liberadas da peça, ou as peças da lista, têm preços diferentes, a prévia fala da faixa ("de R$ X a R$ Y") [gate: Q-11 (c); PRD Tech Review r1]

### UC-02 · A cliente vê o desconto no bloco da página do produto
**Critérios de aceite**
- CA-02.1 Cada peça com desconto mostra riscado o preço de hoje da variação escolhida e o preço levando junto ("de/por"), e a frase "N% a menos levando junto"; numa lista, as peças da escolha também mostram "de/por" [gate: Q-02, Q-06; PRD Tech Review r1]
- CA-02.2 Com peças marcadas, o total do conjunto já vem descontado, com uma linha "Desconto do Compre Junto − R$ X" acima dele, e o preço no PIX é calculado sobre o total descontado [gate: Q-02; pedido: Q-05 do WI 91]
- CA-02.3 O bloco diz que o desconto vale enquanto a joia estiver no mesmo pedido [gate: Q-11 (d)]
- CA-02.4 Sem promoção nem cupom valendo para essas peças, o total do bloco é o total da sacola com só a joia e as peças marcadas. Com promoção que dê preço menor que o desconto casado, ou com cupom, a sacola mostra o menor, e a diferença aparece só ali [código: RNF-04 do WI-01, revisada; PRD Tech Review r1]
- CA-02.5 A barra fixa do celular mostra o mesmo total descontado [código: o botão único do WI-01]

### UC-03 · O desconto na sacola e no checkout
**Critérios de aceite**
- CA-03.1 Com o principal e o adicional na sacola, a peça adicional sai com o percentual da dona sobre o preço da variação escolhida, arredondado a centavo por item [pedido: Q-04; código: `pricing.ts:239-249`]
- CA-03.2 Cada unidade de uma joia principal na sacola dá desconto a uma unidade de uma peça que ela oferece (sem contar a unidade da joia cuja variação esconde o adicional). Com mais de uma joia, as unidades somam, e o maior percentual vale primeiro; entre linhas da mesma peça, o desconto vai primeiro para a de maior preço. O que passar disso sai a preço cheio. Na sacola e no checkout, a linha mista diz quantas unidades saem com desconto ("1 com desconto, 1 a preço cheio"), e no pedido ela vira duas linhas da mesma peça [gate: Q-01; PRD Tech Review r1]
- CA-03.3 Tirar o principal da sacola tira o desconto da peça na hora, como já some a frase "acompanha"; quando a peça entrou pelo Compre Junto, a linha dela diz que o desconto volta com aquela joia na sacola [pedido: Q-06; PRD Tech Review r1; código: `cartStore.ts:136-148`]
- CA-03.4 A peça adicional acrescentada sozinha, por outro caminho (catálogo, busca), recebe o desconto se o principal estiver na sacola [pedido: Q-06]
- CA-03.5 Se a peça também tem promoção ou é o order bump, vale o menor preço da linha, e esses descontos não se somam [pedido: Q-05 do WI 91; código: `pricing.ts:345-351`]
- CA-03.6 Com cupom aplicado, o desconto casado continua valendo, e o cupom incide sobre o subtotal já com ele, como com o order bump. Quando o cupom concorre com uma promoção, a loja compara o que cada um desconta além do desconto casado, e diz qual ficou de fora só se ele de fato desconta alguma coisa [gate: Q-03; PRD Tech Review r1]
- CA-03.7 O desconto PIX incide sobre o valor depois do desconto casado [pedido: Q-05 do WI 91; código: `pricing.ts:379-382`]
- CA-03.8 A gaveta e o checkout mostram "de/por" na linha da peça e a linha "Desconto do Compre Junto − R$ X" no resumo, com o mesmo valor [gate: Q-06, P-06]
- CA-03.9 Duas joias na sacola que dão percentuais diferentes à mesma peça: vale o maior percentual. Dentro da mesma joia, se a peça é um adicional avulso e também está numa lista, vale o percentual do adicional que a página mostra: a peça avulsa vem antes da lista, e entre listas vale a ordem da dona [gate: P-04; PRD Tech Review r1]
- CA-03.10 No par recíproco vale o desconto da peça levada pelo bloco (a que tem a marca 'acompanha'). Sem marca em nenhuma das duas, só uma recebe o desconto, a de menor preço cheio [gate: Q-09; PRD Tech Review r1]
- CA-03.11 Um adicional que a variação escolhida do principal esconde, ou uma variação da peça que a dona não liberou, não recebe o desconto [gate: P-03; código: `compre-junto.sql:70-71`, `availability.ts:43-45`]
- CA-03.12 Com a sacola já montada, se a dona muda o percentual, a sacola relê a configuração e mostra o valor novo [gate: Q-10]

### UC-04 · O servidor cobra o que a tela mostrou
**Critérios de aceite**
- CA-04.1 A cobrança recalcula o desconto a partir da configuração do banco e do preço de catálogo, e não lê o desconto nem a marca vindos do navegador [pedido: Q-06; código: `mercado-pago/handlers.ts:428-559`, `marks.ts:8-10`]
- CA-04.2 Para o mesmo carrinho, a sacola, o checkout e a cobrança dão o mesmo total, ao centavo, nos dois meios de pagamento [código: `displayedEqualsCharged.test.ts`, `useCheckoutTotals.ts:1-5`]
- CA-04.3 O desconto casado mostrado é gravado no pedido numa coluna própria. Se, recalculado no pagamento, o pedido sair mais caro do que a tela mostrou (a dona baixou ou tirou o percentual), o pagamento é recusado antes de cobrar. Se sair igual ou mais barato — inclusive quando outro desconto passou a valer no lugar do casado —, o pagamento segue. Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez; pelo link do pedido ou por Minha conta, a página diz que o valor deste pedido mudou e mostra o contato da loja [gate: P-05, Q-10; PRD Tech Review r1; código: `mercado-pago/handlers.ts:668-701`]

### UC-05 · O pedido mostra o desconto
**Critérios de aceite**
- CA-05.1 Cada linha do pedido guarda o preço cheio e o preço cobrado daquela peça (com a oferta do checkout, promoção ou desconto casado) [gate: C-01; PRD Tech Review r1]
- CA-05.2 Na confirmação, em Minha conta e no e-mail do pedido, a peça com desconto mostra "de/por". O resumo mostra o Subtotal pela soma dos preços cheios, uma linha para cada desconto que houve ("Desconto do Compre Junto", "Desconto progressivo", o da oferta do checkout, o cupom e o PIX) e o Total cobrado, e a conta fecha: Subtotal − descontos + frete = Total. Pedido feito antes deste WI continua como está [gate: Q-06, C-01; PRD Tech Review r1]
- CA-05.3 No painel do pedido e no app do ateliê, a dona vê que houve desconto da compra casada e quanto, com a mesma composição do resumo da loja [PRD Tech Review r1; código: `AdminOrderPage.tsx:729`, `apps/mobile-adm/src/widgets/order-detail/ui/BlocoValores.tsx:40-49`]
- CA-05.4 Mudar ou apagar o desconto do adicional depois não muda pedido já feito [código: o snapshot é a regra de `20261106120000_compre-junto-no-pedido.sql:5-7`]

### UC-06 · O relatório de Adesão mostra o desconto concedido
**Critérios de aceite**
- CA-06.1 O relatório segue contando as peças pela marca "acompanha" [gate: Q-08; código: `AD-072`]
- CA-06.2 O "valor" de cada peça é o pago, líquido do desconto, e há uma coluna "desconto concedido": tudo o que as peças levadas junto deixaram de custar (preço cheio − preço pago), qualquer que seja o desconto que venceu na linha [gate: Q-08; handoff: H-02; código: `compre-junto-adesao.sql:22, 66`]

## Requisitos não-funcionais
- RNF-01 Exibido = cobrado, provado pela mesma função nas duas pontas, sem conta de desconto na tela [código: `useCartPromotion.ts:7-10`, `packages/core/CLAUDE.md:77-78`]
- RNF-02 Sem a configuração nova, o cálculo de qualquer pedido fica idêntico ao de hoje, inclusive a forma do objeto de totais [código: `pricing.ts:27-45`]
- RNF-03 O módulo de regra alcançável pelo Deno: todo import relativo com `.ts`, `import type` incluso [código: `CLAUDE.md` raiz › "Alias de import"]
- RNF-04 O preço do feed e do JSON-LD não muda [código: `packages/core/CLAUDE.md:120-122`]
- RNF-05 Mobile primeiro: o "de/por" no bloco e a linha do desconto na sacola e no checkout em 390×844 sem rolagem horizontal e sem quebrar em pílula [código: `CLAUDE.md` raiz › "Mobile é o caso principal"]
- RNF-06 Tom memorial: sem "economize!", sem exclamação, sem urgência nem contagem [código: `CLAUDE.md` raiz, `tomDoCompreJunto.test.ts`]
- RNF-07 A migration nova é aditiva e só local até o usuário pedir produção [código: `CLAUDE.md` raiz › "CI e deploy"]

## Expectativas de UI/UX
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`): https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html — o campo "Desconto ao levar junto" (marcado "WI 92 · depois") em cada adicional.
- Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`): https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto+com+desconto.html — o desconto no bloco e na sacola (2026-11-03). A exibição escolhida no gate é "De / por" (Q-06); o "Selo" do painel do protótipo foi descartado. O WI 91 sem desconto segue em `Produto - Compre Junto.html`.

## Cenários preliminares
| Cenário | Tipo | Risco |
| ------- | ---- | ----- |
| Joia + corrente com 10%: bloco, sacola, checkout e cobrança iguais, PIX e cartão | happy_path | P0 |
| Cliente tira a joia da sacola: o desconto da corrente some | alternativo | P0 |
| Corrente acrescentada pelo catálogo com a joia na sacola | alternativo | P1 |
| Corrente em promoção progressiva e com desconto casado: vale o menor, sem somar | borda | P0 |
| Corrente é também o order bump marcado | borda | P1 |
| Cupom de 15% com desconto casado: os dois valem, o cupom sobre o subtotal já descontado | alternativo | P0 |
| Cupom de frete grátis com desconto casado | borda | P1 |
| A dona baixa o percentual entre a sacola e o pagamento: 422 antes de cobrar | erro | P0 |
| Corpo do pedido forjado com `unit_price` menor ou com marca forjada | seguranca | P0 |
| 1 joia e 2 correntes na mesma linha: 1 corrente com desconto, 1 a preço cheio | borda | P0 |
| A joia A tem B como adicional e B tem A como adicional: só a de menor preço cheio ganha | borda | P1 |
| Variação do principal que esconde o adicional, com os dois na sacola | borda | P1 |
| Pedido com bump e promoção: as linhas do pedido somam o subtotal depois do pagamento | borda | P0 |
| Pedido montado pelo painel com a joia e a corrente: sem desconto casado | alternativo | P1 |
| Relatório de adesão do pedido com desconto: valor líquido e desconto concedido | alternativo | P2 |
| Sacola com 20 linhas: leitura da configuração e tempo da gaveta | performance | P2 |

## Histórico de revisões
| Data | O que mudou |
| ---- | ----------- |
| 2026-11-03 | Gate da descoberta: 11 perguntas e 6 premissas aplicadas. Q-03 faz o desconto acumular com o cupom (substitui a parte "concorre com o cupom" da Q-05 do WI 91); Q-02 mostra o desconto no bloco (revisa a RNF-04 do WI-01); C-01 traz para o escopo a linha do pedido com o preço cobrado; Q-07 deixa a montagem pelo painel de fora; Q-11 traz os diferenciais (c) e (d) |
| 2026-11-03 | r1 · PRD Tech Review · resumo-do-pedido-nao-fecha-com-linha-liquida, desconto-ate-a-quantidade-na-linha-unica, teto-por-componente-recusa-pedido-mais-barato, total-do-bloco-diverge-com-promocao-ou-cupom, percentual-dentro-da-mesma-joia, atribuicao-do-desconto-em-priceonepath, frase-do-desconto-volta-sem-marca, previa-com-variacoes-de-preco, preco-cheio-x-preco-de-catalogo, app-do-atelie-fora-do-escopo (ratificados pelas sugestões a pedido do usuário), pedido-recusado-pelo-teto-sem-saida, reciproco-menor-preco-contradiz-o-bloco (respondidos pelo usuário na página) |
| 2026-11-03 | handoff · H-03 um rótulo só, "Desconto do Compre Junto", também no bloco (CA-02.2); H-02 "desconto concedido" = preço cheio − pago (CA-06.2) |
