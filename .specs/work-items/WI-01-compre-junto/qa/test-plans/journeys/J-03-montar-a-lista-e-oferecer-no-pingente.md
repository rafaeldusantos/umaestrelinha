# J-03 · Montar a lista "Correntes" e oferecê-la num pingente

**Valor:** a dona monta uma vez as correntes que oferece e as vê aparecer no bloco do pingente, na ordem dela.
**Persona:** PER-02 Adri (principal) · — (secundária)
**Prioridade:** P0
**Critérios de origem:** CA-01.1, CA-01.2, CA-01.3, CA-01.6, CA-02.1, CA-02.2, CA-02.3, CA-02.4, CA-02.5, CA-02.6, CA-02.9, RNF-07
**Charters:** CH-03 · **TC:** TC-SMOKE-003, TC-JOURNEY-003, TC-FUNC-029, TC-FUNC-030, TC-FUNC-031, TC-FUNC-035, TC-FUNC-036, TC-FUNC-038, TC-FUNC-039, TC-FUNC-040, TC-SEC-001, TC-PERSONA-002

## Entrada

| Origem            | URL / caminho              | Estado de partida                                 |
| ----------------- | -------------------------- | ------------------------------------------------- |
| navegação interna | `/admin/compre-junto`      | logada como `admin-painel`; a loja aberta em outra aba |

## Passos

| #  | A persona…                                              | Deve ver                                                                | Em até | Fricção prevista                                 | TC          |
| -- | ------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------------------------------------ | ----------- |
| 1  | abre Catálogo › Compre Junto e toca "Nova lista"        | o editor de lista vazio, com o campo de nome e o contador "0 / 40"      | 3 s    | —                                                | TC-SMOKE-003 |
| 2  | dá o nome "Correntes" e busca três correntes            | a busca a partir de 2 caracteres; resultado já na lista ou fora do ar desabilitado com o motivo | 15 s   | busca sem acento não acha                        | TC-FUNC-029 |
| 3  | reordena as peças e limita as variações de uma delas    | a nova ordem numerada; "k de N" variações na peça limitada              | 20 s   | arrastar sem mouse; botões subir/descer          | TC-FUNC-030, TC-FUNC-031 |
| 4  | salva a lista                                           | "Lista salva." e "Tudo salvo"                                           | 5 s    | —                                                | TC-SMOKE-003 |
| 5  | abre o pingente em Produtos, aba "Compre junto", acrescenta um adicional "Uma peça de uma lista" e escolhe "Correntes" | a lista com fotos, "N peças · em uso em…"; a lista sem peças desabilitada | 15 s   | —                                                | TC-JOURNEY-003 |
| 6  | acrescenta um adicional "Uma peça só" e marca em que variação do principal ele some | o principal e o já escolhido desabilitados com motivo; a frase "Com X escolhido nesta joia, este adicional sai do bloco." | 20 s   | —                                                | TC-FUNC-036 |
| 7  | ordena os adicionais e salva                            | "Compre Junto salvo."                                                   | 5 s    | —                                                | TC-FUNC-038 |
| 8  | recarrega a página do pingente na outra aba             | o bloco com os adicionais na ordem dela e as correntes na ordem da lista | 5 s    | estado velho na aba da loja                      | TC-JOURNEY-003 |

**Tempo total esperado:** ~90 s — dentro da paciência de PER-02 (sem espera acima de 10 s numa gravação).

## Objetivo

- **Observável:** a página do pingente na loja mostra o bloco com os adicionais montados, na ordem da dona, e a lista "Correntes" com as peças na ordem salva.
- **Efeitos colaterais:** o índice mostra a lista "em uso em 1 joia"; nenhum outro produto mudou de Compre Junto.

## Saída

- **Natural:** volta ao índice do Compre Junto ou segue para o próximo pingente.

## Desvios e abandono

| Ramo  | No passo | Quando                                    | A persona…                         | Deve acontecer                                                             | TC          |
| ----- | -------- | ----------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------- | ----------- |
| J-03a | 2        | tenta a 13ª peça                          | insiste                            | "Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista." | TC-FUNC-035 |
| J-03b | 5        | tenta o 4º adicional                      | insiste                            | "Cada joia leva até 3 adicionais. Tire um para acrescentar outro."         | TC-FUNC-035 |
| J-03c | 4        | salva sem nome                            | toca Salvar                        | a barra diz "Dê um nome à lista para salvar." e nada grava                 | TC-FUNC-029 |
| J-03d | 7        | grava o pingente e abre outro produto     | confere o outro                    | o Compre Junto do outro produto não mudou                                  | TC-FUNC-039 |

## Fronteiras

Nenhuma — painel e banco local (PostgREST com RLS).

## Modos de falha

- A gravação do produto apaga ou duplica os adicionais (ou os de outro produto).
- A loja não reflete a lista salva (ordem, peças, variações liberadas).
- A rota do Compre Junto abre sem login de admin.
