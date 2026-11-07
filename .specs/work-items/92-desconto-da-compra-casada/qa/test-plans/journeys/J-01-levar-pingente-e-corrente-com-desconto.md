# J-01 · Levar o pingente com a corrente pelo celular, pagando menos pela corrente, até o pedido gravado

**Valor:** a cliente leva a joia com a peça que a acompanha por menos, e o valor que ela viu no bloco é o que fica
no pedido.
**Persona:** PER-01 Marina (principal) · PER-05 Sônia (secundária, no CH-08)
**Prioridade:** P0
**Critérios de origem:** CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-02.5, CA-03.1, CA-03.2, CA-03.3, CA-03.4, CA-03.7,
CA-03.8, CA-03.11, CA-04.2, CA-05.1, CA-05.2, RNF-01, RNF-02, RNF-05
**Charters:** CH-01, CH-02 · **TC:** TC-SMOKE-001, TC-SMOKE-002, TC-JOURNEY-001, TC-JOURNEY-002, TC-FUNC-006..009,
TC-FUNC-011..013, TC-FUNC-015, TC-FUNC-018, TC-FUNC-019, TC-FUNC-022, TC-FUNC-024, TC-FUNC-026, TC-REG-001,
TC-UI-001, TC-UI-002

Decisões do Gate 1 (2026-11-04): as peças da lista ficam numa faixa que rola dentro dela (Q-02); as linhas do resumo
do checkout e do pedido seguem a ordem do painel — descontos e PIX antes do Frete (Q-01). As linhas dos itens seguem
a Design de cada tela (D-38).

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| link externo (Instagram) | `/produtos/<slug do pingente P de M-01>` | anônima, sacola vazia, sem cupom |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre a página do pingente e escolhe a variação | o bloco "Compre junto" com a corrente de 15 % e a lista "Correntes" de 10 %, cada peça com desconto em "de/por" e "N% a menos levando junto"; as peças da lista numa faixa que rola dentro dela | 10 s | o "de/por" quebra a linha em 390; a faixa rola o `body` | TC-SMOKE-001, TC-FUNC-006 |
| 2  | marca a corrente avulsa | "Desconto do Compre Junto − R$ X" acima do "Total do conjunto" já descontado, o PIX sobre ele, e a nota "O desconto vale enquanto a joia estiver no mesmo pedido." | 5 s | | TC-FUNC-007, TC-FUNC-008 |
| 3  | confere a barra fixa do celular | o mesmo total descontado e "Conjunto · 2 peças" | 3 s | total da barra ≠ total do bloco | TC-FUNC-011 |
| 4  | toca no botão de compra | a sacola abre com a corrente em "de/por", "Acompanha o … · 15% a menos" e o rodapé com "Desconto do Compre Junto − R$ X" e o mesmo total do bloco | 5 s | | TC-SMOKE-002, TC-FUNC-009, TC-FUNC-019 |
| 5  | vai ao checkout como convidada, preenche contato e entrega, escolhe PIX | o resumo na ordem Subtotal (cheio) · Desconto do Compre Junto · Desconto PIX · Frete · Total, e a nota de que o desconto vale com a joia no mesmo pedido | 90 s | conta do resumo não fecha; Frete antes dos descontos | TC-FUNC-018, TC-FUNC-019 |
| 6  | confirma o pagamento | o pedido criado e a tela `/pedido/:id/pagamento` com o valor igual ao Total do checkout, ao centavo | 15 s | valor do pagamento diferente | TC-JOURNEY-001, TC-FUNC-024 |
| 7  | abre o pedido (`/pedido/:id`) | a corrente com o "de/por" da linha e "Acompanha o … · 15% a menos", o resumo na mesma ordem e Subtotal − descontos + frete = Total | 10 s | | TC-FUNC-026 |

**Tempo total esperado:** ~140 s — dentro da paciência da persona (60 s por tela).

## Objetivo

- **Observável:** o pedido gravado em `/pedido/:id` com o mesmo total que o bloco (mais frete, menos PIX) e o
  checkout mostraram, e a corrente com o preço levando junto.
- **Efeitos colaterais:** o e-mail do pedido no Mailpit; o pedido no painel com o desconto do Compre Junto.

## Saída

- **Natural:** a cliente fica na tela de pagamento do PIX (o QR pode não gerar no ambiente local — não é condição) ou
  volta à loja.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-01a | 4 | muda de ideia sobre o pingente | tira a joia da sacola | a corrente volta ao preço cheio na hora, some o "Acompanha" e aparece "O desconto de 15% volta com o … na sacola."; a linha do desconto some do rodapé | TC-JOURNEY-002 |
| J-01b | 4 | quer duas correntes | aumenta a quantidade da corrente para 2 | a linha diz "1 com desconto, 1 a preço cheio" e o valor é junto × 1 + cheio × 1 | TC-FUNC-013 |
| J-01c | 1 | escolhe a variação da joia que esconde as correntes | troca a variação | as correntes saem do bloco e o desconto delas sai do total; na sacola, sem desconto | TC-FUNC-022 |
| J-01d | 6 | a rede cai ou ela recarrega na tela de pagamento | recarrega | o pedido não duplica; o valor continua o do pedido gravado | TC-FUNC-024 |

## Fronteiras

Edge functions `checkout` (criação do pedido com as colunas novas) e `mercado-pago` (`create-payment`, que recalcula
e regrava o pedido). Jornada que cruza fronteira: entra na regressão com prioridade.

## Modos de falha

- O total do bloco, da sacola, do checkout e do pedido gravado não são o mesmo número.
- O desconto fica com a joia fora da sacola.
- O `create-payment` local não sobe e o pedido não é recalculado (vira `blocked` dos casos P0 de cobrança).
