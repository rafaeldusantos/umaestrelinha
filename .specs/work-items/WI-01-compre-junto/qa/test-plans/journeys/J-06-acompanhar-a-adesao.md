# J-06 · Acompanhar a adesão ao Compre Junto no relatório

**Valor:** a dona descobre se as clientes levam o conjunto, quais peças mais saem e por qual joia ou lista.
**Persona:** PER-02 Adri (principal) · — (secundária)
**Prioridade:** P1
**Critérios de origem:** CA-06.1, CA-06.2, CA-06.3, CA-06.4, CA-06.5, CA-01.4, CA-01.7
**Charters:** CH-04 · **TC:** TC-JOURNEY-006, TC-FUNC-041, TC-FUNC-042, TC-FUNC-043, TC-INT-004

## Entrada

| Origem            | URL / caminho                  | Estado de partida                                                         |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------- |
| navegação interna | `/admin/compre-junto/adesao`   | logada como `admin-painel`; pedidos pagos com Compre Junto no período (massa M-08, gravada pela thread no banco local antes do CH-04 — decisão D-01 do plano) |

## Passos

| #  | A persona…                                      | Deve ver                                                                                   | Em até | Fricção prevista                                   | TC          |
| -- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------- | ----------- |
| 1  | abre a aba Adesão                               | período de 30 dias marcado; "Pedidos com Compre Junto" com a parte dos pedidos pagos, "Peças levadas junto" com a média, "Valor das peças levadas junto"; a nota da régua | 4 s    | números sem explicação                             | TC-FUNC-041 |
| 2  | troca para 7 e para 90 dias                      | os números mudam pelo período                                                              | 4 s    | —                                                  | TC-FUNC-041 |
| 3  | olha "Por joia principal" e troca para "Por lista" | pedidos, peças, valor e a peça que mais sai com a variação; a linha "Peça escolhida direto no produto" no recorte por lista | 10 s   | não entende a linha "direto no produto"            | TC-FUNC-042 |
| 4  | edita a lista "Correntes" (tira uma peça) e volta ao relatório | os números do relatório não mudam                                           | 20 s   | —                                                  | TC-JOURNEY-006 |

**Tempo total esperado:** ~38 s.

## Objetivo

- **Observável:** o relatório mostra os números do período e os recortes, contando só pedidos pagos e não cancelados.
- **Efeitos colaterais:** —

## Saída

- **Natural:** a dona decide que listas manter ou reordenar (volta ao editor de lista).

## Desvios e abandono

| Ramo  | No passo | Quando                                  | A persona…            | Deve acontecer                                   | TC          |
| ----- | -------- | --------------------------------------- | --------------------- | ------------------------------------------------ | ----------- |
| J-06a | 1        | o período não tem pedido com Compre Junto (conferido antes da gravação da M-08) | lê a tela | o relatório diz por escrito que não houve pedido com Compre Junto no período | TC-FUNC-043 |
| J-06b | 4        | tenta apagar a lista em uso             | toca "Excluir lista"  | a exclusão é recusada com as joias nomeadas      | TC-FUNC-034 |

## Fronteiras

Nenhuma — RPC do banco local. Os números vêm da massa M-08, gravada pela thread (o ambiente local não produz pedidos pagos sozinho).

## Modos de falha

- O relatório conta pedido pendente ou cancelado.
- Editar a lista depois da venda reescreve o histórico.
