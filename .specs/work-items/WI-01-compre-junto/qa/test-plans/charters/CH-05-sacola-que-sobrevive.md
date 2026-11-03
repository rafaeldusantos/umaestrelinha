# CH-05 · A sacola que sobrevive: antes da mudança, entre abas fechadas e sem o principal

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-04 Sônia                                                                  |
| Tour         | Interrupt                                                                     |
| Modo         | por cenário (J-05)                                                            |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | A sacola passa a guardar de qual principal cada peça veio (formato novo, com a de antes migrada); a mesma peça soma à linha existente e acumula principais; a frase "acompanha" é derivada do que está na sacola; a leitura dos adicionais que falha não derruba a página. Critérios: CA-04.1, CA-04.4, CA-04.7, CA-05.1, CA-05.2, CA-05.3, CA-07.3 |
| Viewport     | 1440 × 900 (a sacola também em 390 × 844)                                     |
| Entrada      | `/` · anônima, com a sacola de antes da mudança já gravada no navegador (uma corrente da lista "Correntes" numa variação — preparada antes da sessão, ver Critérios de entrada) |
| Jornadas     | J-05, J-02 (Minha Conta)                                                      |
| TC           | TC-JOURNEY-005, TC-FUNC-013, TC-FUNC-015, TC-FUNC-022, TC-FUNC-019 (o trecho de Minha Conta) |

## Missão

Confirmar que quem é interrompida e volta encontra a sacola como deixou, sem linha duplicada nem frase "acompanha" que não corresponde ao que está ali.

## Deve tentar

1. Abrir a loja com a sacola de antes e conferir a corrente; levar o conjunto com a mesma corrente na mesma variação; e depois numa variação diferente.
2. Levar a mesma corrente com um segundo pingente; remover um pingente, depois o outro; fechar a aba e reabrir em cada passo.
3. Abrir o pingente com a leitura dos adicionais caindo (rede cortada só para essa leitura, ou offline no carregamento) e comprar o principal.
4. Depois de um pedido com o conjunto, entrar em Minha Conta por código (e-mail no Mailpit local) e abrir o pedido.

## Edge cases sugeridos

- Fechar a aba logo depois de "Levar o conjunto" e reabrir
- A mesma sacola em duas abas: remover na A, levar o conjunto na B
- Voltar do checkout para a sacola
- Recarregar durante o carregamento do bloco
- Ficar offline e tentar levar o conjunto
- Aumentar a quantidade da corrente na sacola e remover o principal

## Fora do escopo

- O bloco em si (escolhas, faltas, total) — CH-01
- O valor cobrado e o pagamento — CH-02
- A gaveta da sacola fora das linhas do conjunto (frete, "Complete o frete grátis", order bump): a mudança não toca
- Compre junto dentro da gaveta da sacola (PRD › Fora)
