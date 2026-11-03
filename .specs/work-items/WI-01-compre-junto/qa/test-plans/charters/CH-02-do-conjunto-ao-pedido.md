# CH-02 · Do conjunto ao pedido: gravações, valor cobrado e a marca "acompanha"

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Marina                                                                 |
| Tour         | Money                                                                         |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | O conjunto entra na sacola como linhas próprias (adicional com quantidade 1), com gravação por peça; a sacola e o pedido dizem "acompanha o <principal>"; o pedido guarda a marca e entra na fila de material se qualquer peça exige. Critérios: CA-03.10, CA-03.13, CA-04.1, CA-04.3, CA-04.5, CA-04.6, CA-05.1, CA-05.2, CA-05.4, RNF-04 |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/produtos/<slug do pingente com gravação>` · anônima, sacola vazia           |
| Jornadas     | J-02                                                                          |
| TC           | TC-JOURNEY-002, TC-FUNC-008, TC-FUNC-009, TC-FUNC-012, TC-FUNC-014, TC-FUNC-016, TC-FUNC-018, TC-FUNC-019, TC-FUNC-023, TC-INT-001 · com o Dev (não executado na sessão): TC-INT-003 |

## Missão

Procurar qualquer jeito de o conjunto chegar ao pedido com valor diferente do que a cliente viu, com gravação na peça errada, com uma peça a mais ou a menos, ou sem a marca de que a corrente acompanha a joia.

## Deve tentar

1. Pôr gravação no principal e na corrente, passar o limite de uma delas e tentar levar; depois corrigir e levar, conferindo cada texto na linha certa da sacola.
2. Escolher quantidade do principal maior que 1 (no computador, pelo seletor; no celular, ajustando na sacola) e conferir que o adicional entra com 1 e o total do checkout bate com a sacola.
3. Fechar o pedido como convidada com PIX e comparar o total da sacola, do checkout e da tela de pagamento.
4. Abrir a confirmação e, com a conta `admin-painel` em outra janela, o pedido no painel: a frase "acompanha" em cada adicional e o pedido na fila de material.

## Edge cases sugeridos

- Recarregar durante o envio do pedido
- Duplo clique em "Finalizar compra" e no botão de concluir do checkout
- Voltar do pagamento para o checkout e concluir de novo (pedido duplicado?)
- Gravação com aspas curvas e travessão colados de outro app
- Gravação só com espaços (o contador conta o texto aparado)
- Fechar a aba na tela do pagamento e reabrir o link do pedido
- Cupom válido no checkout com o conjunto (o desconto aparece só na sacola/checkout, RNF-04)

## Fora do escopo

- O bloco em si (marcar, escolher, faltas) — CH-01
- A sacola de antes da mudança e a mescla com linha existente — CH-05
- Desconto da compra casada (Work Item 92): o total nunca tem desconto do Compre Junto
- O pedido montado pelo painel (feature 89) e a folha de separação do painel
- O order bump e o "Complete o frete grátis" seguem como estão; diferenças neles são backlog
- O pagamento com cartão (o Brick precisa do SDK do Mercado Pago; fora do local)
