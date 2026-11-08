# J-03 · Retomar a montagem depois de o celular bloquear e criar o link

**Valor:** a interrupção não custa a sacola montada; a Adri volta, escolhe a cliente de novo e manda o link.
**Persona:** PER-02 Adri interrompida (principal) · — (secundária)
**Prioridade:** P1
**Critérios de origem:** UC-02 (D-12, D-15, D-18, D-19, D-42)
**Charters:** CH-04 · **TC:** TC-JOURNEY-003, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-SEC-002

## Entrada

| Origem            | URL / caminho               | Estado de partida                                     |
| ----------------- | --------------------------- | ----------------------------------------------------- |
| navegação interna | `/pedidos` → "Montar pedido" | logada como `admin-atelie`; nenhum rascunho no aparelho |

## Passos

| #  | A persona…                                                         | Deve ver                                                                      | Em até | Fricção prevista                  | TC          |
| -- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------ | --------------------------------- | ----------- |
| 1  | escolhe uma cliente, acrescenta duas peças, aplica cupom e combinado com motivo | o resumo com tudo                                                  | 90 s   | —                                 | —           |
| 2  | é interrompida: a aba fecha (o processo morre)                      | —                                                                             | —      | —                                 | —           |
| 3  | reabre o app e toca em "Montar pedido"                              | "Rascunho retomado: …"; as duas peças, o cupom e o valor do combinado de volta | 5 s   | rascunho pela metade (fricção 2)  | TC-FUNC-005 |
| 4  | escolhe a cliente de novo e reescreve o motivo                      | a cliente e o motivo vazios, como esperado                                    | 30 s   | —                                 | TC-FUNC-005 |
| 5  | recua e avança com o voltar do Android entre os passos              | um passo por toque no voltar                                                  | 10 s   | voltar sai da montagem (fricção 1) | TC-FUNC-003 |
| 6  | cria o link                                                         | o pedido montado; o rascunho apagado                                          | 10 s   | —                                 | TC-JOURNEY-003 |

**Tempo total esperado:** ~3 min.

## Objetivo

- **Observável:** o pedido montado criado com as peças retomadas; ao tocar de novo em "Montar pedido", a montagem abre vazia
- **Efeitos colaterais:** o rascunho do aparelho apagado

## Saída

- **Natural:** o pedido montado.

## Desvios e abandono

| Ramo  | No passo | Quando                                   | A persona…                                  | Deve acontecer                                                                     | TC          |
| ----- | -------- | ---------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------- | ----------- |
| J-03a | 1        | decide parar por conta própria           | toca no "x" com peças                       | "Sair sem criar o link?" com "Continuar montando", "Guardar rascunho" e "Descartar" | TC-FUNC-004 |
| J-03b | 1        | escolhe "Descartar"                      | reabre "Montar pedido"                      | a montagem vazia, sem aviso de rascunho                                            | TC-FUNC-004 |
| J-03c | 3        | uma peça do rascunho saiu do catálogo    | lê o aviso                                  | a peça não volta e o aviso a conta                                                 | TC-FUNC-005 |
| J-03d | 2        | sai da conta e entra de novo             | reabre "Montar pedido"                      | sem rascunho (a troca de conta o apaga)                                            | TC-FUNC-005 |

## Fronteiras

Nenhuma — o rascunho é do aparelho (`localStorage`).

## Modos de falha

- O rascunho leva nome, e-mail, CPF, endereço, observação ou o motivo do combinado
- O voltar do Android no passo 1 sai sem perguntar com algo preenchido
