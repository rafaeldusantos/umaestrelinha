# J-04 · Escolher a forma do bloco e ver a loja abrir as escolhas nela

**Valor:** a dona decide como a cliente escolhe as peças do conjunto, e a loja inteira passa a mostrar daquele jeito.
**Persona:** PER-02 Adri (principal) · PER-03 Helena (secundária, na loja)
**Prioridade:** P1
**Critérios de origem:** CA-09.1, CA-09.2, CA-09.3, CA-09.4, CA-09.5
**Charters:** CH-04 (painel e troca), CH-06 (a loja nas três formas) · **TC:** TC-JOURNEY-004, TC-FUNC-024, TC-FUNC-025, TC-FUNC-026, TC-FUNC-027, TC-FUNC-028

## Entrada

| Origem            | URL / caminho          | Estado de partida                                            |
| ----------------- | ---------------------- | ------------------------------------------------------------ |
| navegação interna | `/admin/compre-junto`  | logada como `admin-painel`; nenhuma forma gravada; a página do pingente aberta em outra aba |

## Passos

| #  | A persona…                                      | Deve ver                                                                    | Em até | Fricção prevista                         | TC          |
| -- | ----------------------------------------------- | --------------------------------------------------------------------------- | ------ | ---------------------------------------- | ----------- |
| 1  | abre o menu Compre Junto                        | a escolha entre "Na linha", "Em folha" e "Com fórmula", com "Na linha" marcada | 3 s    | não acha onde fica a escolha             | TC-FUNC-027 |
| 2  | escolhe "Em folha" e grava                      | a escolha gravada; ao reabrir, "Em folha" marcada                           | 5 s    | —                                        | TC-JOURNEY-004 |
| 3  | recarrega a página do pingente na loja          | marcar um adicional abre uma folha (celular) ou um diálogo (computador) com "Incluir no conjunto" | 5 s    | estado velho na aba da loja              | TC-FUNC-024 |
| 4  | escolhe "Com fórmula", grava e recarrega a loja | a faixa "Esta joia + <adicional> + …" acima da lista                        | 10 s   | —                                        | TC-FUNC-025 |
| 5  | monta o mesmo conjunto nas três formas          | as mesmas regras (falta de escolha, total, gravação, botão) nas três        | 60 s   | uma forma deixa passar o que outra barra | TC-FUNC-026 |

**Tempo total esperado:** ~85 s.

## Objetivo

- **Observável:** a forma escolhida no painel é a forma em que a loja abre as escolhas, em qualquer produto com Compre Junto.
- **Efeitos colaterais:** —

## Saída

- **Natural:** a dona deixa a forma que preferiu gravada.

## Desvios e abandono

| Ramo  | No passo | Quando                                       | A persona…                         | Deve acontecer                                                    | TC          |
| ----- | -------- | -------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------- | ----------- |
| J-04a | 3        | abre a folha e fecha com a escolha incompleta | fecha por Esc ou clique fora      | a folha fecha, o foco volta ao controle que a abriu; o adicional não fica marcado incompleto | TC-FUNC-024 |
| J-04b | 1        | a forma gravada é um valor desconhecido      | abre a loja                        | a loja usa "Na linha" e a página não quebra                       | TC-FUNC-028 |

## Fronteiras

Nenhuma.

## Modos de falha

- A escolha grava no painel e a loja continua na forma antiga.
- A folha prende o foco ou some sem devolvê-lo.
