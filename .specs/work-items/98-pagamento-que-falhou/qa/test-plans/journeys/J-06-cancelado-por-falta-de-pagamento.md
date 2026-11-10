# J-06 · Entender que o pedido foi cancelado por falta de pagamento e retomar com a Adri

**Valor:** o pedido que ninguém pagou sai do caminho sozinho em 7 dias, e a cliente sabe por quê e com quem falar.
**Persona:** PER-03 Cliente que voltou ao pedido (principal) · PER-01 Adri no celular (secundária — confere o efeito no painel)
**Prioridade:** P1
**Critérios de origem:** CA-01.3, CA-06.1, CA-06.1a, CA-06.2, CA-06.5, CA-06.6, CA-03.15, CA-05.8
**Charters:** CH-04 (a cliente), CH-06 (o painel e o job) · **TC:** TC-FUNC-024, TC-FUNC-025, TC-INT-008, TC-INT-009

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| e-mail (quando ligado) ou direta                         | `http://localhost:8082/pedido/:id` (massa M13) | logada como `cliente`, 390 × 844; o job já rodou (a thread o executa) |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | (quando o e-mail está ligado) lê o e-mail | assunto "Pedido … cancelado por falta de pagamento" | — | — | TC-INT-009 |
| 2  | abre o pedido | "Pedido cancelado por falta de pagamento", a frase de retomar com a Adri e "Conversar no WhatsApp" | 10 s | não saber o que fazer | TC-FUNC-024 |
| 3  | abre `/conta` | o mesmo estado, sem oferta de pagar | 10 s | — | TC-FUNC-024 |
| 4  | toca em "Conversar no WhatsApp" | o WhatsApp com o número da loja | 5 s | — | TC-FUNC-024 |

**Tempo total esperado:** ~25 s.

## Objetivo

- **Observável:** a cliente lê a razão do cancelamento e tem o WhatsApp à mão.
- **Efeitos colaterais:** só os pedidos do recorte foram cancelados; a cobrança aberta foi fechada; o e-mail só saiu se estava ligado em Notificações.

## Saída

- **Natural:** a conversa no WhatsApp.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-06a | — | o pedido teve registro desfeito há menos de 7 dias, ou tem material enviado, ou é anterior à publicação | abre o pedido | continua Pendente, não cancelado | TC-INT-008 |

## Fronteiras

Job agendado (`cancel-unpaid-orders`), motor de e-mail, Mercado Pago.

## Modos de falha

- O job cancela pedido pago, avançado ou com material a caminho
- A cliente vê só "cancelado", sem razão nem saída
