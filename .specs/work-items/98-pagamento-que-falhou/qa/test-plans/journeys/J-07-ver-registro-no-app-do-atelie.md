# J-07 · Ver no app do ateliê que o pagamento foi registrado à mão

**Valor:** na bancada, pelo app, a Adri sabe que aquele pedido foi pago por fora, por qual meio, quando e com qual observação — sem precisar abrir o painel.
**Persona:** PER-01 Adri no celular (principal) · —
**Prioridade:** P2
**Critérios de origem:** RNF-09, RNF-08, CA-03.7
**Charters:** CH-06 · **TC:** TC-FUNC-026

## Entrada

| Origem                                                   | URL / caminho        | Estado de partida                |
| -------------------------------------------------------- | -------------------- | -------------------------------- |
| navegação interna do app                                 | `http://localhost:8084/pedidos/:id` (massa M7) | logada como `admin` no app, 390 × 844 |

## Passos

| #  | A persona…        | Deve ver                          | Em até | Fricção prevista            | TC          |
| -- | ----------------- | --------------------------------- | ------ | --------------------------- | ----------- |
| 1  | abre o pedido pela lista | o detalhe do pedido | 5 s | — | — |
| 2  | lê o bloco de valores | "registrado à mão", o meio, a data e a observação; nenhum comprovante; nenhuma ação de registrar ou desfazer | 10 s | — | TC-FUNC-026 |

**Tempo total esperado:** ~15 s.

## Objetivo

- **Observável:** o registro manual visível no detalhe, sem comprovante.
- **Efeitos colaterais:** —

## Saída

- **Natural:** volta à lista de pedidos.

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…                       | Deve acontecer                     | TC   |
| ----- | -------- | --------------------------------------- | -------------------------------- | ---------------------------------- | ---- |
| J-07a | 2 | o registro foi desfeito no painel com o app aberto | puxa para reler | o registro não aparece mais | TC-FUNC-026 |

## Fronteiras

Nenhuma.

## Modos de falha

- O comprovante (dado financeiro) aparece no app
