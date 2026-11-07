# PRD Tech Review — WI 92 · Desconto da compra casada

## Rodada r1

`round: 1` · `prd_version: 2` · 2026-11-03 · `changes_requested_blocking` (2 blocking · 7 gaps · 2 questions · 5 tech · 1 none).
O subagente devolveu `verdict: "needs_changes"`, valor fora do envelope; o veredito acima é o derivado dos findings.

### Retriagem

- **F8** `atribuicao-do-desconto-em-priceonepath`: `tech` → `tech_prd_edit`. A decisão muda o que a frase do descartado diz ("a promoção X desconta mais") e o que o cupom compara.
- Os demais ficaram com o `owner` do parecer: `tech_prd_edit` F1, F2, F3, F5, F6, F12, F16, F17; `negocio` F4, F7, F11; `tech` F9, F10, F13, F14, F15; `none` F18.
- A pedido do usuário ("Ratifique com suas sugestões as perguntas, e deixe apenas as que de fato precisam e dependem de uma avaliação mais restritiva de negócio"), 15 itens foram ratificados pela primeira sugestão, F11 incluído. Só F4 e F7 foram à página.

### Findings (resumo do envelope)

| id | key | category | owner | severity |
| -- | --- | -------- | ----- | -------- |
| F1 | resumo-do-pedido-nao-fecha-com-linha-liquida | blocking | tech_prd_edit | high |
| F2 | desconto-ate-a-quantidade-na-linha-unica | blocking | tech_prd_edit | high |
| F3 | teto-por-componente-recusa-pedido-mais-barato | gap | tech_prd_edit | high |
| F4 | pedido-recusado-pelo-teto-sem-saida | gap | negocio | high |
| F5 | total-do-bloco-diverge-com-promocao-ou-cupom | gap | tech_prd_edit | medium |
| F6 | percentual-dentro-da-mesma-joia | gap | tech_prd_edit | medium |
| F7 | reciproco-menor-preco-contradiz-o-bloco | question | negocio | medium |
| F8 | atribuicao-do-desconto-em-priceonepath | gap | tech_prd_edit (retriado) | medium |
| F9 | desconto-concedido-sem-dado-por-linha | gap | tech | medium |
| F10 | outros-leitores-de-unit-price | improvement | tech | medium |
| F11 | app-do-atelie-fora-do-escopo | question | negocio | low |
| F12 | frase-do-desconto-volta-sem-marca | gap | tech_prd_edit | low |
| F13 | guarda-de-tom-nao-alcanca-as-telas-novas | improvement | tech | low |
| F14 | coluna-nova-descartada-em-silencio | improvement | tech | low |
| F15 | create-payment-nao-sobe-local | improvement | tech | medium |
| F16 | preco-cheio-x-preco-de-catalogo | naming | tech_prd_edit | low |
| F17 | previa-com-variacoes-de-preco | gap | tech_prd_edit | low |
| F18 | q07-pedido-montado-confirmado-fora | overlap | none | info |

A evidência de cada finding (`caminho:linha`) está no `corpo` dos itens; ela é a do parecer, resumida.

### Respostas e onde foram aplicadas

| key | resposta | owner final | estado | aplicado em |
| --- | -------- | ----------- | ------ | ----------- |
| resumo-do-pedido-nao-fecha-com-linha-liquida | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-05.1, CA-05.2 · Decisões: D-01 |
| desconto-ate-a-quantidade-na-linha-unica | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-03.2 · Decisões: D-02 |
| teto-por-componente-recusa-pedido-mais-barato | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-04.3 · Decisões: D-03 |
| pedido-recusado-pelo-teto-sem-saida | "Recusado o pagamento, no checkout a cliente vê o total novo e confirma a compra outra vez; pelo link do pedido ou por Minha conta, a página diz que o valor deste pedido mudou e mostra o contato da loja." (página) | negocio | aplicado | `prd.md` CA-04.3 (a frase "recarregar a sacola" saiu) |
| total-do-bloco-diverge-com-promocao-ou-cupom | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-02.4 · Decisões: D-04 |
| percentual-dentro-da-mesma-joia | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-03.9 · Decisões: D-05 |
| reciproco-menor-preco-contradiz-o-bloco | "No par recíproco vale o desconto da peça levada pelo bloco (a que tem a marca 'acompanha')" (página) | negocio | aplicado | `prd.md` CA-03.10 · Decisões: D-11 |
| atribuicao-do-desconto-em-priceonepath | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-03.6 · Decisões: D-06 |
| desconto-concedido-sem-dado-por-linha | 1ª sugestão (ratificada) | tech | aplicado | Decisões: D-07 |
| outros-leitores-de-unit-price | 1ª sugestão (ratificada) | tech | aplicado | Decisões: D-08 |
| app-do-atelie-fora-do-escopo | 1ª sugestão (ratificada) | negocio | aplicado | `prd.md` CA-05.3 e Escopo › Dentro |
| frase-do-desconto-volta-sem-marca | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-03.3 |
| guarda-de-tom-nao-alcanca-as-telas-novas | 1ª sugestão (ratificada) | tech | aplicado | Decisões: D-09 |
| coluna-nova-descartada-em-silencio | 1ª sugestão (ratificada) | tech | aplicado | Decisões: D-10 |
| create-payment-nao-sobe-local | 1ª sugestão (ratificada) | tech | aplicado | Decisões: D-12 |
| preco-cheio-x-preco-de-catalogo | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-02.1 |
| previa-com-variacoes-de-preco | 1ª sugestão (ratificada) | tech_prd_edit | aplicado | `prd.md` CA-01.5 |
| q07-pedido-montado-confirmado-fora | — | none | sem item | — (o ramo de `proposal_id` sai antes do recálculo, `mercado-pago/handlers.ts:410-426`) |

### Decisões técnicas (vão à seção Decisões da costura)

- **D-01** (F1) Cada linha de `order_items` guarda o preço cheio da unidade, além do `unit_price` cobrado; o pedido guarda cada desconto por item em separado: desconto do Compre Junto, `promotion_discount` e o desconto da oferta do checkout (order bump). O resumo das telas do pedido parte do preço cheio. Pedido antigo (sem o preço cheio) segue como está.
- **D-02** (F2) No cálculo e no pedido, a linha da peça se parte em duas — unidades com desconto e a preço cheio —, e o order bump continua decidindo pela linha da sacola.
- **D-03** (F3) A guarda do pagamento compara a soma dos descontos por item exibidos (Compre Junto, promoção e oferta do checkout) com a soma recalculada, e não cada desconto sozinho.
- **D-04** (F5) O bloco calcula só a joia e as peças com o desconto casado; promoção e cupom ficam na sacola.
- **D-05** (F6) A regra que escolhe o percentual dentro de uma joia é a mesma que escolhe o que a página mostra (`availability.ts:120-160`, `claimed`): avulsa antes da lista, entre listas a ordem.
- **D-06** (F8) Base dos dois caminhos = itens com min(oferta do checkout, casado); `promotionDiscount` = base − cobrado; `buyTogetherDiscount` = soma(com bump) − base; a promoção só conta como aplicada se vencer algum item contra essa base. Entrada ausente ⇒ saída idêntica (RNF-02). Um AD novo emenda o `AD-015`: o desconto casado empilha com o cupom por decisão do gate (Q-03).
- **D-07** (F9) O preço cheio na linha (D-01) alimenta a coluna "desconto concedido"; migration nova recria a RPC do relatório; o guarda `compreJuntoAdesaoSchema` passa a ler a migration vigente da função (molde de `store_movement`); o probe `05-adesao.sh` ganha fixtura com desconto.
- **D-08** (F10) O `purchase` do GA4 e o valor declarado da etiqueta passam a ler o preço cobrado; o pin personalizado continua lendo o preço cheio da linha; pedido antigo fica como está.
- **D-09** (F13) O guarda de tom amplia o escopo aos arquivos das frases novas (sacola, checkout, resumo do pedido, e-mail, painel, aba do produto), com âncora que nomeie um de cada ponta, e acrescenta "economiz" à régua.
- **D-10** (F14) Um guarda irmão de `chavesDoItemDoPedido` cruza por igualdade as chaves do pedido que a loja manda com `COLUNAS_DO_PEDIDO` da function `checkout`; a coluna nova entra nas duas pontas.
- **D-11** (F7, complemento técnico da resposta de negócio) No par recíproco, o servidor só usa a marca "acompanha" que ele mesmo validou (`checkout/handlers.ts:270-287`); sem marca válida em nenhuma das duas, vale a de menor preço cheio da unidade. É a única situação em que a marca participa do preço — a resposta do usuário revisa, nesse caso, o "nunca pela marca de origem" da Q-06 do WI 91.
- **D-12** (F15) Trocar o `import type` de pacote em `core/pricing` por tipo local, para a `mercado-pago` subir no ambiente local e os cenários de cobrança serem provados contra o runtime de verdade.

### Leitura humana

O PRD ratificado na descoberta não fechava a conta do pedido (o desconto contado duas vezes) nem cabia no
pedido gravado (duas unidades da mesma linha com preços diferentes); as duas decisões técnicas que os
resolvem (D-01, D-02) mudam o modelo de `order_items`. Os outros achados ajustaram critérios para o bloco,
a sacola e a cobrança dizerem o mesmo. O usuário decidiu as duas questões de negócio que restavam: o pedido
recusado pelo teto é reconfirmado no checkout ou explicado no link, e no par recíproco vale a peça levada
pelo bloco.
