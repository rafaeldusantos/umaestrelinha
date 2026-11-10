# J-04 · Receber o link de cartão e pagar o mesmo pedido com outro cartão

**Valor:** a cliente cujo cartão foi recusado paga o MESMO pedido com outro cartão, pelo valor da compra, sem conta e sem refazer a compra.
**Persona:** PER-04 Cliente que recebeu o link pelo WhatsApp (principal) · PER-02 Adri no computador (secundária — gera o link)
**Prioridade:** P0
**Critérios de origem:** CA-05.1, CA-05.2, CA-05.3, CA-05.4, CA-05.5, CA-05.6, CA-05.7, CA-02.4, CA-01.5
**Charters:** CH-02 (CH-05 para a geração) · **TC:** TC-JOURNEY-002, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-FUNC-017, TC-SEC-002, TC-SEC-003, TC-INT-005, TC-INT-006

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| deep link (mensagem do WhatsApp)                         | `http://localhost:8082/pagar-com-cartao#<código>` (massa M14, link vivo) | sem sessão, 390 × 844 |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | toca no link | a tela de pagamento por cartão do pedido, sem pedir login; o código some da barra de endereço | 5 s | pede login | TC-JOURNEY-002, TC-SEC-002 |
| 2  | reconhece o pedido | número do pedido, peça(s) e o valor da compra | 10 s | não reconhecer | TC-JOURNEY-002 |
| 3  | escolhe o cartão e as parcelas no Brick | o formulário do Mercado Pago | 30 s | Brick não carrega no ambiente local | TC-INT-005 |
| 4  | paga | a espera e depois "pagamento aprovado" | 15 s | — | TC-INT-005 |

**Tempo total esperado:** ~60 s — no limite da paciência da persona.

## Objetivo

- **Observável:** o pedido pago pelo valor da compra, e a tela de aprovado.
- **Efeitos colaterais:** os mesmos de um pagamento aprovado no checkout (selo, estoque, cupom, e-mail, venda). No ambiente local os passos 3–4 ficam `blocked` (Brick e cobrança indisponíveis).

## Saída

- **Natural:** a tela de aprovado; ela volta ao WhatsApp.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-04a | 1 | abre um link que a Adri já substituiu por outro | toca no link antigo | não oferece pagar; diz que o link não vale e por onde seguir | TC-FUNC-016 |
| J-04b | 1 | o pedido já foi pago, ou foi cancelado | toca no link | mostra a situação do pedido, sem pagamento | TC-FUNC-017 |
| J-04c | 1 | o link chegou cortado ou alterado | toca no link | nenhum dado de pedido; frase sem jargão | TC-SEC-002 |

## Fronteiras

Mercado Pago (Brick, cobrança, webhook) — fora do ambiente local; probe 09 da Validation.

## Modos de falha

- O link abre outro pedido, ou cobra outro valor
- Link substituído ou de pedido cancelado ainda cobra
