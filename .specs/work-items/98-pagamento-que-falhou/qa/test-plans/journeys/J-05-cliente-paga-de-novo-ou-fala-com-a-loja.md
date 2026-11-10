# J-05 · Voltar ao pedido que falhou e encontrar o caminho para pagar ou falar com a loja

**Valor:** em cada pedido que falhou, a cliente encontra a ação certa — pagar com PIX, gerar um PIX novo, ou falar com a Adri — e um pedido pago por fora aparece pago, com o meio que ela usou.
**Persona:** PER-03 Cliente que voltou ao pedido (principal) · —
**Prioridade:** P1
**Critérios de origem:** CA-01.1, CA-01.2, CA-01.4, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-03.5a, CA-03.16, CA-04.3, RNF-01, RNF-06
**Charters:** CH-04 · **TC:** TC-JOURNEY-003, TC-FUNC-018, TC-FUNC-019, TC-FUNC-020, TC-FUNC-021, TC-FUNC-022, TC-FUNC-023, TC-FUNC-027, TC-UI-002, TC-INT-007

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| direta (volta à loja)                                    | `http://localhost:8082/conta` | logada como `cliente`, 390 × 844; pedidos M1, M2, M3, M4, M5, M7, M10, M12 nesta conta |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | lê as pendências da conta | o PIX vencido com "Gerar novo PIX" e a data-limite; o cartão recusado com o convite para o WhatsApp; o cartão nunca cobrado fora das pendências | 15 s | lista confusa | TC-FUNC-018, TC-FUNC-019, TC-FUNC-020 |
| 2  | abre o pedido do PIX vencido e toca em "Gerar novo PIX" | `/pedido/:id/pagamento` do mesmo pedido, gerando o código (no local, a cobrança não se cria) | 10 s | — | TC-JOURNEY-003 |
| 3  | abre o pedido de cartão recusado | o cartão "O pagamento com cartão não foi concluído" com "Conversar no WhatsApp"; nenhum botão de pagar com cartão ou PIX | 10 s | querer pagar sozinha | TC-FUNC-019 |
| 4  | abre o pedido pago por fora | selo de pago, a jornada de sempre, o meio informado ("Transferência"), o mesmo total; nenhuma observação nem comprovante | 10 s | — | TC-FUNC-022 |
| 5  | abre o pedido em Separando sem pagamento e o cancelado | nenhuma oferta de pagar | 10 s | — | TC-FUNC-021, TC-FUNC-023 |

**Tempo total esperado:** ~55 s.

## Objetivo

- **Observável:** cada pedido mostra exatamente uma saída coerente com o estado dele, no tom da loja.
- **Efeitos colaterais:** gerar o PIX novo fecha o anterior (integração, TC-INT-007).

## Saída

- **Natural:** o QR do PIX novo, ou o WhatsApp aberto com a mensagem pronta.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-05a | 2 | abre direto `/pedido/:id/pagamento` de um pedido cancelado ou em Separando | cola o endereço | não oferece pagamento | TC-FUNC-021, TC-FUNC-023 |
| J-05b | 1 | fonte do celular a 200 % | lê as pendências | nada corta, nada rola de lado | TC-UI-002 |

## Fronteiras

Mercado Pago (o PIX novo) — fora do ambiente local.

## Modos de falha

- Oferta de pagar em pedido que não aceita pagamento (cobrança duplicada ou indevida)
- Pedido pago por fora aparecendo como não pago
