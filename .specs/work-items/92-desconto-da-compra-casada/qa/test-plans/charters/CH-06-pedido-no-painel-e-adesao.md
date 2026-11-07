# CH-06 · A dona confere no painel do pedido e na Adesão quanto houve de desconto

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-02 Adri (painel)                                                          |
| Tour         | Feature                                                                       |
| Modo         | por cenário                                                                   |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o painel do pedido mostra o desconto do Compre Junto com as mesmas linhas e valores da loja (CA-05.3), na ordem do painel — que é a régua e passa como está (decisão Q-01 de 2026-11-04); pedido antigo como está (CA-05.2, CA-05.4); a Adesão conta pela marca (CA-06.1) e mostra o valor pago líquido e o "desconto concedido" (CA-06.2); o pedido montado pelo painel segue sem desconto casado (Fora, Q-07) |
| Viewport     | 1440 × 900; 390 × 844 no pedido                                               |
| Entrada      | `/admin/pedidos` · logada como `admin-painel`; os pedidos de CH-02/CH-03, M-06, M-07 e M-09 no banco |
| Jornadas     | J-05 e o ramo J-05a                                                            |
| TC           | TC-JOURNEY-007, TC-FUNC-028, TC-FUNC-030, TC-FUNC-032, TC-FUNC-033, TC-REG-002 |

## Missão

Percorrer, como a dona no fim do dia, os pedidos com desconto, um pedido antigo e o relatório de Adesão, e
confirmar que cada número fecha com o que a cliente pagou e que nada antigo mudou de cara.

## Deve tentar

1. Abrir o pedido com linha mista e somar as linhas do cartão de valores contra o Total; registrar a ordem das linhas
   (é a régua da loja e do app).
2. Abrir um pedido antigo (M-06) e comparar com o que ele mostrava antes do WI (rótulos de `core`).
3. Na Adesão, trocar o período (7/30/90) e conferir o "desconto concedido" contra os pedidos de M-07.
4. Abrir o pedido da proposta montada (M-09).

## Edge cases sugeridos

- Pedido com só peças sem desconto
- Pedido com a corrente comprada pelo catálogo (sem a marca)
- Pedido cancelado com desconto (não conta na Adesão)
- Viewport 390 no pedido do painel
- Recarregar a Adesão trocando o período

## Fora do escopo

- A fila de material, as ações do pedido, os avisos e o resto da página do pedido.
- O relatório de promoções (`usePromotions`, D-22).
- A Adesão fora das colunas de valor (linhas, recorte por joia e por lista do WI-01).
- A montagem do pedido pelo painel em si (feature 89).
- A ordem do resumo na loja e no app: a divergência delas é achado dos CH-02, CH-03 e CH-07, não do painel.
