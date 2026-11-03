# J-01 · Montar pingente e corrente no celular e levar o conjunto à sacola

**Valor:** a cliente sai da página do produto com a joia e a corrente para usá-la na sacola, num gesto só, sem ter saído da página.
**Persona:** PER-01 Marina (principal) · PER-03 Helena (secundária)
**Prioridade:** P0
**Critérios de origem:** CA-03.1, CA-03.2, CA-03.3, CA-03.4, CA-03.5, CA-03.6, CA-03.7, CA-03.8, CA-03.14, CA-03.15, CA-04.1, CA-04.2, CA-04.8, CA-04.9, CA-02.9, RNF-01
**Charters:** CH-01 (CH-07 na auditoria de CFR) · **TC:** TC-SMOKE-001, TC-SMOKE-002, TC-JOURNEY-001, TC-FUNC-001..007, TC-FUNC-010, TC-FUNC-011, TC-FUNC-016, TC-FUNC-017, TC-FUNC-020, TC-PERSONA-001

## Entrada

| Origem          | URL / caminho                 | Estado de partida                                    |
| --------------- | ----------------------------- | ---------------------------------------------------- |
| deep link (Instagram) | `/produtos/<slug do pingente da massa>` | anônima, sacola vazia, forma do bloco "Na linha" (padrão) |

## Passos

| #  | A persona…                                         | Deve ver                                                                 | Em até | Fricção prevista                                  | TC          |
| -- | -------------------------------------------------- | ------------------------------------------------------------------------ | ------ | ------------------------------------------------- | ----------- |
| 1  | abre a página do pingente                          | a página de pé; o bloco "Compre junto" entre a variação e o botão, com nada marcado; espaço reservado sem salto enquanto carrega | 4 s    | salto de layout ao chegar o bloco                 | TC-SMOKE-001, TC-FUNC-002 |
| 2  | escolhe a variação do pingente                     | o bloco segue a variação escolhida, sem repetir o seletor do principal; some o adicional marcado para sumir naquela variação | 5 s    | —                                                 | TC-FUNC-003, TC-FUNC-020 |
| 3  | marca a corrente (adicional do tipo lista)         | as peças da lista na ordem da dona; nenhuma escolhida; o total e o rodapé do bloco aparecem | 5 s    | não entende que precisa escolher uma peça         | TC-FUNC-006 |
| 4  | escolhe a peça e o comprimento                      | variação esgotada desabilitada; total = principal + corrente pela variação escolhida; PIX ao lado | 10 s   | escolha esgotada parece disponível                | TC-FUNC-004, TC-FUNC-007 |
| 5  | olha a barra fixa                                  | o total do conjunto e "Conjunto · 2 peças", sem PIX; o botão diz "Levar o conjunto" | 3 s    | barra diz um número que ela não espera            | TC-FUNC-017 |
| 6  | toca "Levar o conjunto" na barra fixa              | a gaveta da sacola abre com duas linhas: o pingente e a corrente, esta com quantidade 1 e "acompanha o <nome do pingente>" | 4 s    | —                                                 | TC-JOURNEY-001, TC-FUNC-012 |

**Tempo total esperado:** ~31 s — dentro da paciência de PER-01 (60 s por tela; ~4 min até o pedido).

## Objetivo

- **Observável:** a gaveta aberta com o principal na variação escolhida e a corrente na variação escolhida, em linhas próprias; a linha da corrente diz "acompanha o <nome completo do pingente>".
- **Efeitos colaterais:** a sacola persiste ao recarregar (`estrelinha-cart`).

## Saída

- **Natural:** "Finalizar compra" na gaveta (segue em J-02) ou "Continuar comprando".

## Desvios e abandono

| Ramo  | No passo | Quando                                                  | A persona…                         | Deve acontecer                                                                 | TC          |
| ----- | -------- | ------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------ | ----------- |
| J-01a | 6        | marcou a corrente sem escolher o comprimento            | toca o botão mesmo assim           | nada entra na sacola; "Falta uma escolha em 1 peça. Ela está marcada acima."; a página rola até o adicional e diz qual escolha falta | TC-FUNC-005 |
| J-01b | 2        | a combinação escolhida do pingente está indisponível    | tenta levar o conjunto             | o bloco continua visível; o botão fica bloqueado com "Essa combinação está indisponível no momento." | TC-FUNC-016 |
| J-01c | 1        | abre um produto sem Compre Junto, ou todos os adicionais indisponíveis | segue a compra       | a página fica como hoje, sem bloco, botão "Adicionar à sacola"                 | TC-FUNC-001, TC-REG-001 |
| J-01d | 3        | desiste da corrente e desmarca                          | toca o botão                       | o botão volta a "Adicionar à sacola" e leva só o pingente                      | TC-FUNC-002 |

## Fronteiras

Nenhuma — a jornada termina na sacola local. A leitura dos adicionais vem do Supabase local.

## Modos de falha

- A barra fixa e o bloco divergem: a barra leva menos (ou mais) do que o bloco mostra marcado.
- A leitura dos adicionais falha e derruba a página do produto inteira, não só o bloco.
- O bloco cria rolagem horizontal em 390 e esconde o botão.
