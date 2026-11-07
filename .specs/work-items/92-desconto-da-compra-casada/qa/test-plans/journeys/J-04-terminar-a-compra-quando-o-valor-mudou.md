# J-04 · Terminar a compra quando o desconto mudou no caminho

**Valor:** a cliente nunca paga mais do que viu sem ser avisada, sabe que nada foi cobrado, e tem um caminho para
seguir.
**Persona:** PER-04 Helena (principal) · PER-01 Marina (secundária, no ramo do checkout)
**Prioridade:** P0
**Critérios de origem:** CA-03.12, CA-04.3, CA-05.4
**Charters:** CH-04 · **TC:** TC-JOURNEY-005, TC-JOURNEY-006, TC-FUNC-023, TC-FUNC-025, TC-FUNC-029, TC-INT-003

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta | `/checkout` com P e a corrente a 15 % na sacola | logada como `cliente-loja`; a thread (ou a PER-02 em outra aba) baixa o percentual no painel no passo indicado |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | monta a sacola e abre o checkout | o resumo com "Desconto do Compre Junto" a 15 % | 30 s | | — |
| 2  | (o percentual da corrente cai de 15 % para 5 % no painel) | — | — | | — |
| 3  | confirma o pagamento com PIX | `role="alert"` "O valor do seu pedido mudou", "Nada foi cobrado.", os cartões "Antes" (riscado) e "Agora", "Confirmar com o novo total" e "Voltar à sacola" | 10 s | a tela some ou diz "processando" | TC-JOURNEY-005, TC-INT-003 |
| 4  | toca em "Confirmar com o novo total" | um novo pedido pelo total "Agora", e a tela de pagamento com esse valor | 15 s | o pedido antigo continua pendente na conta | TC-JOURNEY-005 |

## Objetivo

- **Observável:** o pedido pago pelo total novo; nenhuma cobrança pelo valor de antes.
- **Efeitos colaterais:** nenhuma order criada no Mercado Pago na tentativa recusada.

## Saída

- **Natural:** tela de pagamento do pedido novo.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-04a | 3 | prefere rever | toca em "Voltar à sacola" | a sacola com o percentual novo (5 %) | TC-FUNC-023 |
| J-04b | 1 | criou o pedido ontem e paga hoje por Minha conta | abre o pedido e tenta pagar depois de o percentual cair | "Pedido #NNNN", "O valor deste pedido mudou", "Nada foi cobrado.", "Fale comigo…", "Falar pelo WhatsApp" e "Escrever por e-mail" | TC-JOURNEY-006 |
| J-04c | 2 | o percentual **aumenta**, ou entra uma promoção maior | confirma o pagamento | o pagamento segue pelo valor igual ou menor, sem aviso | TC-FUNC-025 |
| J-04d | depois | a dona apaga o percentual depois de um pedido pago | abre o pedido em Minha conta | o pedido continua com o desconto que teve | TC-FUNC-029 |
| J-04e | 1 | a dona mudou o percentual com a sacola montada | reabre a gaveta | o valor novo, relido | TC-FUNC-023 |

## Fronteiras

`mercado-pago` (`create-payment` e o 422 `buy_together_price_changed`).

## Modos de falha

- O pagamento cobra o valor antigo, ou a tela diz que cobrou quando não cobrou.
- A cliente fica sem saída na tela do pedido (sem contato, sem botão).
