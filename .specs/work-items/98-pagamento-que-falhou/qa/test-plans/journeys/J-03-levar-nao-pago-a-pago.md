# J-03 · Destravar pedidos não pagos sem marcá-los como pagos por engano

**Valor:** a Adri continua levando pedidos adiante pelos atalhos de sempre, e nenhum pedido vira "Pago" (e venda) sem o pagamento registrado.
**Persona:** PER-02 Adri no computador (principal) · —
**Prioridade:** P1
**Critérios de origem:** CA-03.9, CA-03.16, CA-05.1, CA-05.4, CA-06.3, CA-06.6
**Charters:** CH-05 · **TC:** TC-FUNC-010, TC-FUNC-011, TC-FUNC-012, TC-FUNC-014, TC-FUNC-015, TC-REG-001, TC-INT-004

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna                                        | `http://localhost:8083/admin/pedidos` | logada como `admin`, 1440; massa M6 (pendentes não pagos), M9 (pago pela loja), M10 (avançado à mão), M3 (cartão recusado) |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | seleciona na lista pedidos pagos e não pagos e usa "Avançar status" | os pagos avançam; o resumo diz quantos ficaram de fora por não estarem pagos | 15 s | não saber quais ficaram | TC-FUNC-011, TC-REG-001 |
| 2  | abre um não pago e usa "Avançar mesmo assim" | a tela "Registrar pagamento" do pedido, sem o status mudar | 5 s | — | TC-FUNC-010 |
| 3  | volta e tenta "Outro status" → Pago (e → Separando/Enviado/Entregue) | a mesma tela de registrar | 10 s | voltar do navegador deixa o pedido no meio | TC-FUNC-010 |
| 4  | abre o pedido antigo em Separando sem pagamento | "Pagamento não registrado" com a ação de registrar | 5 s | — | TC-FUNC-012 |
| 5  | abre o pedido de cartão recusado e gera o link de cartão | o link, com "copiar" | 10 s | — | TC-FUNC-014, TC-FUNC-015 |
| 6  | cancela um pedido de PIX pendente pelo painel | a caixa de aviso de sempre; o pedido cancelado; a cobrança aberta fechada | 10 s | — | TC-INT-004 |

**Tempo total esperado:** ~55 s.

## Objetivo

- **Observável:** nenhum pedido não pago chegou a Pago (ou além) sem passar pela tela de registrar; o lote disse o que deixou de fora.
- **Efeitos colaterais:** nenhum e-mail "cancelado por falta de pagamento" no cancelamento pela admin.

## Saída

- **Natural:** a lista de pedidos, com os não pagos ainda em Pendente.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-03a | 2 | chega à tela de registrar e desiste | usa o voltar do navegador | volta ao pedido sem nada gravado; o status continua Pendente | TC-FUNC-010 |
| J-03b | 1 | só pedidos não pagos estão selecionados | aplica "Avançar status" | nenhum avança; o resumo diz que todos ficaram de fora | TC-FUNC-011 |

## Fronteiras

Nenhuma além do painel (o fechamento da cobrança no Mercado Pago é conferido em TC-INT-004/TC-INT-007).

## Modos de falha

- Um atalho de status leva a Pago sem registro (venda e estoque falsos)
- O lote avança em silêncio só uma parte e a Adri acha que avançou tudo
