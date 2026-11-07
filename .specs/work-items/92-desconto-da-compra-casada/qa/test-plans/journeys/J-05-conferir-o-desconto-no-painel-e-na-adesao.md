# J-05 · Conferir no painel e na Adesão quanto os pedidos tiveram de desconto

**Valor:** a dona sabe quanto cada pedido teve de desconto e quanto o Compre Junto custou no período, com números
que fecham.
**Persona:** PER-02 Adri (painel) (principal) · —
**Prioridade:** P1
**Critérios de origem:** CA-05.2, CA-05.3, CA-05.4, CA-06.1, CA-06.2, Fora (Q-07)
**Charters:** CH-06 · **TC:** TC-JOURNEY-007, TC-FUNC-028, TC-FUNC-030, TC-FUNC-032, TC-FUNC-033, TC-REG-002

Decisão do Gate 1 (Q-01, 2026-11-04): a ordem das linhas do resumo do painel do pedido é a régua — descontos e PIX
antes do Frete — e o painel passa como está.

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna | `/admin/pedidos` → o pedido de J-01 ou de M-07 | logada como `admin-painel`; M-06 e M-07 no banco |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre o pedido com desconto | as peças com "de/por" (no painel, o da unidade — D-36), a linha mista partida em duas, e no cartão de valores, na ordem Subtotal · Desconto do Compre Junto · Desconto PIX · Frete · Total, com o mesmo valor da loja | 10 s | loja ou app com o Frete antes dos descontos — bug delas (Q-01) | TC-FUNC-030 |
| 2  | abre um pedido antigo (M-06) | como era antes deste WI (rótulos de `core`, sem linha nova) | 10 s | | TC-FUNC-028 |
| 3  | abre `/admin/compre-junto/adesao`, período de 30 dias | as peças levadas pelo bloco, com o valor pago líquido e a coluna "desconto concedido" | 15 s | | TC-FUNC-032, TC-FUNC-033 |

## Objetivo

- **Observável:** o "desconto concedido" da Adesão é a soma de cheio − pago das peças levadas pelo bloco nos pedidos
  pagos do período, e o pedido no painel mostra o mesmo desconto que a cliente viu.
- **Efeitos colaterais:** —

## Saída

- **Natural:** volta à lista de pedidos.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-05a | 1 | o pedido foi montado pelo painel (M-09) | abre a proposta e o pedido dela | sem desconto do Compre Junto | TC-REG-002 |

## Fronteiras

RPC `buy_together_adoption` recriada; `orders`/`order_items` com as colunas novas.

## Modos de falha

- A Adesão conta a peça comprada pelo catálogo, ou o "desconto concedido" não fecha com os pedidos.
