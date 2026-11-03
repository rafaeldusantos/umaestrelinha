# J-05 · Voltar com a sacola de antes e completar o conjunto com a corrente que já estava lá

**Valor:** a cliente que deixou peças na sacola antes da mudança encontra tudo como deixou e completa o conjunto sem linha duplicada.
**Persona:** PER-04 Sônia (principal) · — (secundária)
**Prioridade:** P1
**Critérios de origem:** CA-04.1, CA-04.4, CA-04.7, CA-05.1, CA-05.3, CA-07.3
**Charters:** CH-05 · **TC:** TC-JOURNEY-005, TC-FUNC-013, TC-FUNC-015, TC-FUNC-022

## Entrada

| Origem  | URL / caminho                      | Estado de partida                                                       |
| ------- | ---------------------------------- | ----------------------------------------------------------------------- |
| direta  | `/` e depois `/produtos/<slug do pingente>` | anônima; sacola gravada no formato de antes da mudança (versão 3 de `estrelinha-cart`) com uma corrente da lista "Correntes" numa variação |

## Passos

| #  | A persona…                                                  | Deve ver                                                                     | Em até | Fricção prevista                              | TC          |
| -- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ------ | --------------------------------------------- | ----------- |
| 1  | abre a loja e a sacola                                      | a corrente que ela deixou, na mesma variação, sem frase "acompanha"          | 5 s    | sacola vazia depois da mudança                | TC-JOURNEY-005 |
| 2  | abre o pingente e leva o conjunto com a mesma corrente, na mesma variação | uma linha só para a corrente, com a quantidade somada, agora "acompanha o <pingente>" | 10 s   | duas linhas para a mesma corrente             | TC-FUNC-013 |
| 3  | leva outro pingente com a mesma corrente                    | a linha diz "acompanha o <pingente A> e o <pingente B>"                       | 15 s   | —                                             | TC-FUNC-013 |
| 4  | fecha a aba e reabre a loja                                 | a sacola igual, com as frases                                                 | 10 s   | —                                             | TC-JOURNEY-005 |
| 5  | remove o pingente A                                         | a corrente fica; a frase passa a citar só o pingente B                        | 5 s    | a corrente some junto                         | TC-FUNC-015 |

**Tempo total esperado:** ~45 s — dentro da paciência de PER-04 (~90 s por passo).

## Objetivo

- **Observável:** a sacola tem as peças de antes e as do conjunto, sem duplicata, e cada frase "acompanha" cita só principais que estão na sacola.
- **Efeitos colaterais:** —

## Saída

- **Natural:** segue para o checkout ou deixa a sacola para depois.

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…                 | Deve acontecer                                                 | TC          |
| ----- | -------- | -------------------------------------------- | -------------------------- | -------------------------------------------------------------- | ----------- |
| J-05a | 5        | remove todos os principais                   | olha a corrente            | a corrente continua como peça comum, sem frase                  | TC-FUNC-015 |
| J-05b | 2        | a leitura dos adicionais falha ao abrir o pingente | segue a compra       | a página de pé, sem bloco; "Adicionar à sacola" leva só o pingente | TC-FUNC-022 |

## Fronteiras

Nenhuma — sacola no navegador.

## Modos de falha

- A sacola de antes da mudança é descartada ou corrompida.
- A mesma peça vira duas linhas, ou a frase "acompanha" cita um principal que não está mais na sacola.
