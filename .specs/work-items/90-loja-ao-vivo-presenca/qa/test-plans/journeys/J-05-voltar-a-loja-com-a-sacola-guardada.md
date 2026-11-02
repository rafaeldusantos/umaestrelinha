# J-05 · Sair da loja e voltar depois, com a sacola guardada

**Valor:** a cliente sai quando quer e volta à sacola de antes, sem a loja engasgar — e a Adri vê ela sair e
voltar com o estado certo.
**Persona:** PER-03 Lúcia (principal) · PER-01 Adri (secundária — lê a Loja ao vivo)
**Prioridade:** P1
**Critérios de origem:** §10.4, LAV-12, LAV-20
**Charters:** CH-03 · **TC:** TC-JOURNEY-002, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-REG-003

## Entrada

| Origem                 | URL / caminho                          | Estado de partida                                       |
| ---------------------- | -------------------------------------- | ------------------------------------------------------- |
| link do Instagram      | http://localhost:8082/produtos/<slug>?utm_source=instagram | estatística aceita; sacola vazia; a Loja ao vivo aberta no app |

## Passos

| # | A persona…                                  | Deve ver                                                          | Em até | Fricção prevista                   | TC             |
| - | ------------------------------------------- | ----------------------------------------------------------------- | ------ | ---------------------------------- | -------------- |
| 1 | pousa na joia e põe na sacola                | a sacola com 1 joia; na Loja ao vivo, "Com joia na sacola" 1         | 75 s   | a página demorar                   | TC-FUNC-015    |
| 2 | troca para outro app (aba em segundo plano)  | depois de 5 min, sai do total                                       | 6 min  | —                                  | TC-FUNC-014    |
| 3 | volta à aba                                 | reaparece no total na próxima batida                                | 75 s   | —                                  | TC-FUNC-014    |
| 4 | fecha a aba                                 | sai do total em até 5 min                                           | 6 min  | —                                  | TC-JOURNEY-002 |
| 5 | reabre a loja no dia seguinte (ou depois)    | a sacola guardada está lá; conta em "Com joia na sacola"            | 75 s   | sacola sumida                      | TC-FUNC-015    |
| 6 | vai ao checkout e preenche os dados          | o checkout funciona como antes                                      | 120 s  | engasgo a cada mudança da sacola   | TC-REG-003     |

**Tempo total esperado:** ~15 min de relógio, por causa das esperas de 5 min; poucos segundos de atenção da
cliente por passo.

## Objetivo

- **Observável:** a cliente conclui a sacola e o checkout; a Loja ao vivo a mostra presente quando está e
  ausente até 5 min depois de sair
- **Efeitos colaterais:** —

## Saída

- **Natural:** a cliente segue para o pagamento ou fecha a aba

## Desvios e abandono

| Ramo  | No passo | Quando                               | A persona…                   | Deve acontecer                                          | TC             |
| ----- | -------- | ------------------------------------ | ---------------------------- | ------------------------------------------------------- | -------------- |
| J-05a | 4        | fecha a aba no meio do checkout      | não volta                    | sai de "No checkout" e do total em até 5 min            | TC-JOURNEY-002 |
| J-05b | 5        | esvazia a sacola                     | segue olhando                | passa de "Com joia na sacola" para "Olhando joias"      | TC-FUNC-015    |
| J-05c | 1        | abre a mesma loja em duas abas       | navega nas duas              | conta como uma pessoa                                   | TC-FUNC-016    |

## Fronteiras

Loja → function `visit` → banco → app.

## Modos de falha

- A pessoa que fechou a aba continua no total depois de 5 min
- A sacola guardada não conta como sacola
