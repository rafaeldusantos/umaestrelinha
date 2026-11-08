# J-06 · Perceber que entrou com a conta errada e trocar para a do ateliê sem ver dado de cliente

**Valor:** quem não administra a loja nunca vê dado de cliente pelas telas novas, e a Adri que errou de
conta acha a saída.
**Persona:** PER-05 Conta sem acesso ao ateliê (principal) · — (secundária)
**Prioridade:** P1
**Critérios de origem:** UC-01, UC-02, UC-05, UC-09 (D-01, D-02, D-08)
**Charters:** CH-05 · **TC:** TC-JOURNEY-006, TC-SEC-001

## Entrada

| Origem     | URL / caminho                                                    | Estado de partida                    |
| ---------- | ---------------------------------------------------------------- | ------------------------------------ |
| deep link  | `/pedidos/montar`, `/pedidos?visao=montados`, `/pedidos/montados/<id>` | logada como `cliente-sem-papel`      |

## Passos

| #  | A persona…                                        | Deve ver                                                          | Em até | Fricção prevista                 | TC          |
| -- | ------------------------------------------------- | ----------------------------------------------------------------- | ------ | -------------------------------- | ----------- |
| 1  | abre `/pedidos/montar` pelo link salvo            | a recusa de acesso do app; nenhum nome, e-mail ou telefone        | 5 s    | carregando sem fim (fricção 1)   | TC-SEC-001  |
| 2  | abre `/pedidos?visao=montados`                     | a mesma recusa; nenhum cartão                                     | 5 s    | nome piscando antes (fricção 1)  | TC-SEC-001  |
| 3  | abre `/pedidos/montados/<id>` de um montado real    | a mesma recusa; nenhum link, peça nem cliente                     | 5 s    | —                                | TC-SEC-001  |
| 4  | sai e entra com a conta do ateliê                   | Pedidos normal; "Montar pedido" abre vazia                        | 20 s   | sem caminho de saída (fricção 3) | TC-JOURNEY-006 |

**Tempo total esperado:** ~40 s.

## Objetivo

- **Observável:** a recusa em cada tela nova, sem dado de cliente em instante nenhum; depois da troca, a
  conta do ateliê usa tudo normalmente

## Saída

- **Natural:** Pedidos, com a conta do ateliê.

## Desvios e abandono

| Ramo  | No passo | Quando                        | A persona…           | Deve acontecer                                     | TC         |
| ----- | -------- | ----------------------------- | -------------------- | -------------------------------------------------- | ---------- |
| J-06a | 1        | a rede cai ao abrir           | recarrega            | falha de rede (com "Tentar de novo"), nunca a recusa | TC-SEC-001 |

## Fronteiras

As functions `order-proposals`, `customer-parse` e a cotação, que respondem 401/403 a quem não tem papel.

## Modos de falha

- Um nome de cliente aparece por um instante antes da recusa
- A recusa aparece como "fora do ar" e a pessoa fica tentando de novo
