# J-05 · Montar um pedido para uma cliente com uma peça em oferta

**Valor:** a dona fecha pelo WhatsApp um pedido com uma peça em oferta e manda o link de pagamento com o mesmo
preço que a cliente veria na loja.
**Persona:** PER-01 Adri (principal) · —
**Prioridade:** P1
**Critérios de origem:** R-05, CA-10 (o mesmo centavo no Google)
**Charters:** CH-05 · **TC:** TC-FUNC-019, TC-INT-001

## Entrada

| Origem            | URL / caminho                                   | Estado de partida                       |
| ----------------- | ----------------------------------------------- | --------------------------------------- |
| navegação interna | `http://localhost:8083/admin/pedidos/montar`    | logada como `admin-loja`; BF em vigência |

## Passos

| # | A persona… | Deve ver | Em até | Fricção prevista | TC |
| - | ---------- | -------- | ------ | ---------------- | -- |
| 1 | escolhe uma cliente e acrescenta M-A e M-E | M-A com o preço da campanha (o mesmo da loja) e M-E com o preço de sempre | 30 s | — | TC-FUNC-019 |
| 2 | aplica o cupom `QA10` | o cupom só sobre M-E; com só M-A, a recusa com o nome da campanha | 10 s | — | TC-FUNC-019 |
| 3 | salva a proposta e abre o link de checkout na loja | o mesmo total, travado | 15 s | — | TC-FUNC-019 |
| 4 | no app do ateliê (`http://localhost:8084/pedidos/montar`, 390×844), monta outra com M-B | M-B com o preço da campanha por variação | 60 s | — | TC-FUNC-019 |
| 5 | abre o feed do Google (`http://127.0.0.1:54441/functions/v1/google-feed`) | para M-A: `g:sale_price` igual ao preço da página e `g:sale_price_effective_date` com a vigência | 10 s | — | TC-INT-001 |

**Tempo total esperado:** ~3 min.

## Objetivo

- **Observável:** o link do pedido montado abre a loja com o mesmo total que o painel mostrou, com M-A no preço da
  campanha.
- **Efeitos colaterais:** a proposta aparece em "Pedidos montados".

## Saída

- **Natural:** a lista de pedidos montados.

## Desvios e abandono

| Ramo  | No passo | Quando | A persona… | Deve acontecer | TC |
| ----- | -------- | ------ | ---------- | -------------- | -- |
| J-05a | 2 | a proposta tem só M-A e ela tenta o cupom | lê o motivo e dá um desconto combinado | o cupom recusado com o nome da campanha; o desconto combinado é aceito por cima | TC-FUNC-019 |

## Fronteiras

Edge function `order-proposals`; o app do ateliê (outro app, mesma conta); a function `google-feed`.

## Modos de falha

- O painel mostra o preço de tabela e o link de checkout cobra o da campanha (ou o contrário)
