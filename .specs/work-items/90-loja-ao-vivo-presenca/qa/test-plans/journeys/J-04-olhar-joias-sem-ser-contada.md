# J-04 · Olhar joias sem ser contada além do que aceitou

**Valor:** a cliente que recusou estatística navega sem aparecer em número nenhum, e a Política diz com
exatidão o que a loja guarda de quem aceitou.
**Persona:** PER-04 Helena (principal) · PER-03 Lúcia (secundária — a que aceita, como contraprova)
**Prioridade:** P0
**Critérios de origem:** §10.3, R-01, R-02
**Charters:** CH-02 · **TC:** TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-004, TC-FUNC-017

## Entrada

| Origem | URL / caminho                          | Estado de partida                                              |
| ------ | -------------------------------------- | -------------------------------------------------------------- |
| direta | http://localhost:8082/ (navegador novo) | sem escolha de cookies; a Adri com a Loja ao vivo aberta como oráculo |

## Passos

| # | A persona…                                      | Deve ver                                                                        | Em até | Fricção prevista                         | TC          |
| - | ----------------------------------------------- | ------------------------------------------------------------------------------- | ------ | ---------------------------------------- | ----------- |
| 1 | abre a folha de cookies e recusa "Estatísticas"  | a categoria "Estatísticas" presente e recusável                                  | 10 s   | a categoria não aparecer                 | TC-SEC-001  |
| 2 | abre a Política de Privacidade                   | o texto sobre o aviso de presença, o que fica 30 min, 1 h e 14 dias, sem IP nem endereço | 60 s | texto que diz menos que a loja faz | TC-FUNC-017 |
| 3 | olha joias, põe uma na sacola, vai ao checkout   | a loja funciona igual                                                            | 60 s   | —                                        | TC-SEC-001  |
| 4 | (na Loja ao vivo, depois de 75 s)                | nenhum número muda por causa dela                                                | 75 s   | —                                        | TC-SEC-001  |

**Tempo total esperado:** ~3 min.

## Objetivo

- **Observável:** com Helena navegando, todos os números da Loja ao vivo e o cartão do Início ficam como estavam
- **Efeitos colaterais:** —

## Saída

- **Natural:** Helena fecha a aba ou conclui a compra

## Desvios e abandono

| Ramo  | No passo | Quando                                                       | A persona…                         | Deve acontecer                                         | TC         |
| ----- | -------- | ------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------ | ---------- |
| J-04a | 1        | aceitou e, já com duas abas abertas, recusa numa delas         | segue navegando na outra           | some da contagem em até 5 min, nas duas abas            | TC-SEC-002 |
| J-04b | 3        | abre um link com `?nao-contar=1`                              | segue navegando                    | sai da presença; com `?nao-contar=0` volta              | TC-SEC-003 |
| J-04c | 3        | a loja é aberta por um endereço que não é o de produção, ou por robô | navega                     | não aparece em número nenhum                           | TC-SEC-004 |

## Fronteiras

Loja → function `visit`; a decisão de contar é a mesma do contador de visitas (feature 71).

## Modos de falha

- Uma cliente que recusou aparece em "Agora na loja"
- A Política omite a marca diária de sacola ou o registro por minuto
