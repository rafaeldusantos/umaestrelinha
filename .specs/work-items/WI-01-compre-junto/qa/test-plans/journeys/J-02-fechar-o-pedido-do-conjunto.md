# J-02 · Fechar o pedido do conjunto como convidada e ver que a corrente acompanha a joia

**Valor:** a cliente paga o conjunto pelo valor que viu e o pedido registra o que foi comprado junto.
**Persona:** PER-01 Marina (principal) · PER-04 Sônia (secundária, no computador)
**Prioridade:** P0
**Critérios de origem:** CA-03.10, CA-03.13, CA-04.1, CA-04.3, CA-04.5, CA-04.6, CA-05.1, CA-05.2, CA-05.4, RNF-04
**Charters:** CH-02 (CH-07 na auditoria de CFR) · **TC:** TC-JOURNEY-002, TC-FUNC-008, TC-FUNC-009, TC-FUNC-012, TC-FUNC-014, TC-FUNC-018, TC-FUNC-019, TC-FUNC-023, TC-INT-001, TC-INT-003

## Entrada

| Origem             | URL / caminho                 | Estado de partida                                        |
| ------------------ | ----------------------------- | -------------------------------------------------------- |
| navegação interna  | `/produtos/<slug do pingente com gravação>` | anônima, sacola vazia; principal com gravação, corrente da lista com gravação, um adicional que exige material |

## Passos

| #  | A persona…                                                 | Deve ver                                                                  | Em até | Fricção prevista                                    | TC          |
| -- | ---------------------------------------------------------- | ------------------------------------------------------------------------- | ------ | --------------------------------------------------- | ----------- |
| 1  | preenche a gravação do pingente e marca a corrente com gravação | o campo de gravação do adicional dentro do bloco, com o limite da peça e o contador | 15 s   | confunde o campo do principal com o do adicional    | TC-FUNC-008 |
| 2  | marca o adicional que exige material                       | o adicional entra normalmente; o bloco não diz qual material              | 5 s    | —                                                   | TC-FUNC-009 |
| 3  | leva o conjunto                                            | a gaveta com três linhas; cada gravação na linha certa; adicionais com "acompanha o <nome completo>" | 5 s    | nome longo do principal corta em vez de quebrar     | TC-FUNC-012, TC-FUNC-018 |
| 4  | toca "Finalizar compra" e preenche o checkout como convidada, escolhendo PIX | o total do checkout igual ao subtotal da sacola (sem desconto do Compre Junto) | 90 s   | total muda sem explicação                           | TC-FUNC-023 |
| 5  | conclui o pedido                                           | `/pedido/:id/pagamento` com o valor do pedido igual ao total do checkout; o QR do PIX pode faltar no local sem reprovar (decisão D-02 do plano) | 10 s   | ausência do QR confundida com falha                 | TC-FUNC-023 |
| 6  | abre a confirmação do pedido                               | cada adicional diz que acompanha o pingente                               | 5 s    | —                                                   | TC-JOURNEY-002, TC-FUNC-019 |

**Tempo total esperado:** ~130 s — dentro da paciência de PER-01 (~4 min até o pedido).

## Objetivo

- **Observável:** o pedido existe com as três peças; a confirmação mostra a frase "acompanha" nos adicionais; o valor do pedido gravado, mostrado na tela de pagamento e no painel, é o total que ela viu no checkout.
- **Efeitos colaterais:** o pedido aparece no painel com o mesmo total, a frase nos itens e na fila de material (uma peça exige material).

## Saída

- **Natural:** a confirmação do pedido; depois Minha Conta (PER-04, entrando por código).

## Desvios e abandono

| Ramo  | No passo | Quando                                               | A persona…                     | Deve acontecer                                                         | TC          |
| ----- | -------- | ---------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------- | ----------- |
| J-02a | 1        | a gravação da corrente passa do limite               | toca "Levar o conjunto"        | nada entra na sacola; a recusa aparece junto do campo da corrente      | TC-FUNC-014 |
| J-02b | 3        | desiste de uma peça na sacola                        | remove a corrente              | as outras linhas ficam; o pingente continua                            | TC-FUNC-015 |
| J-02c | 5        | fecha a aba na tela do pagamento e volta pelo link   | reabre o pedido                | o pedido continua o mesmo, sem duplicar                                | TC-JOURNEY-002 |

## Fronteiras

Edge function `checkout` (grava o pedido e a marca) e Mercado Pago (gera o PIX) — no Supabase local. A geração do PIX pode não subir no local (`CLAUDE.md` › Estado conhecido: boot local da `mercado-pago`); pela decisão D-02 do plano, o "cobrado" é o valor do pedido gravado, e o QR não é condição da jornada.

## Modos de falha

- O pedido grava sem a marca "acompanha", ou com a marca de um principal que não está no pedido.
- O valor do pedido gravado diverge do total da sacola e do checkout.
- Uma peça que exige material não põe o pedido na fila de material.
