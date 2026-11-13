# J-04 · Comprar uma peça em oferta com cupom e pagar o que viu

**Valor:** a cliente fecha a compra sabendo o total, e o pedido gravado é exatamente o total que a tela mostrou.
**Persona:** PER-03 Helena (principal) · PER-04 Rosa (secundária, no CFR)
**Prioridade:** P0
**Critérios de origem:** CA-03, CA-06, CA-13, CA-16, CA-17
**Charters:** CH-04, CH-08 · **TC:** TC-JOURNEY-002, TC-FUNC-005, TC-FUNC-008, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016

## Entrada

| Origem            | URL / caminho                        | Estado de partida                |
| ----------------- | ------------------------------------ | -------------------------------- |
| navegação interna | `http://localhost:8082/ofertas`      | sem login, sacola vazia, 390×844 |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | acrescenta M-A (20 %) à sacola | a linha com o preço com desconto, o cheio riscado e o selo em linha no lugar do chip de desconto | 3 s | — | TC-FUNC-005 |
| 2 | acrescenta M-E (comum) | a segunda linha sem selo, preço de sempre | 3 s | — | TC-FUNC-005 |
| 3 | aplica o cupom `QA10` | o desconto do cupom igual a 10 % de M-E (só a comum) | 5 s | o cupom "menor" que o esperado | TC-FUNC-014 |
| 4 | vai ao checkout (no notebook, 1440×900) e preenche como convidada | o mesmo total da sacola; PIX com 5 % sobre o total | 60 s | total que muda entre telas | TC-FUNC-014 |
| 5 | finaliza com PIX | o pedido criado (a página de pagamento pode falhar ao gerar o PIX — chave inválida no local) | 10 s | — | TC-JOURNEY-002 |
| 6 | abre o pedido (`/pedido/:id`) | os itens com o preço cobrado, a linha "Desconto de campanha", o cupom e o total iguais ao checkout | 5 s | — | TC-FUNC-005 |

**Tempo total esperado:** ~2 min — dentro da paciência da Helena.

## Objetivo

- **Observável:** o pedido em `/pedido/:id` tem o mesmo total que o checkout mostrou, com o cupom só sobre M-E.
- **Efeitos colaterais:** e-mail de pedido recebido no Mailpit (`http://127.0.0.1:54444`), com a linha
  "Desconto de campanha".

## Saída

- **Natural:** a página do pedido.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-04a | 3 | tira M-E e fica só com M-A | tenta o cupom de novo | "Este cupom não vale para peças da Black Friday."; `QAFRETE` continua zerando o frete | TC-FUNC-015 |
| J-04b | 2 | monta 3 peças da coleção com promoção (M-E, M-E2 e M-A) | lê a sacola | a faixa da promoção não é alcançada e a sacola não promete o preço dela | TC-FUNC-016 |
| J-04c | 4 | a campanha acaba com o checkout aberto | volta à aba e tenta finalizar | o total novo e o pedido de nova confirmação; nunca o valor antigo | TC-FUNC-017 (CH-06) |

## Fronteiras

Edge functions `checkout` (`create-order`) e `mercado-pago` (`create-payment`), servidas localmente com chaves
externas inválidas.

## Modos de falha

- O cupom desconta também a peça de campanha, e o pedido grava outro total que o da tela
- A sacola mostra o preço congelado de quando a peça entrou, e o checkout outro
