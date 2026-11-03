# CH-01 · O bloco Compre Junto no celular, da página à sacola

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Marina                                                                 |
| Tour         | Feature                                                                       |
| Modo         | por cenário (J-01)                                                            |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | A página do produto ganha o bloco "Compre junto" na coluna de informação, entre a variação e o botão; o botão único passa a "Levar o conjunto" com adicional marcado, e a barra fixa do celular mostra o total e "Conjunto · N peças". Critérios: CA-03.1–03.8, CA-03.14, CA-03.15, CA-04.1, CA-04.2, CA-04.9, CA-02.9, CA-07.2, RNF-01, RNF-03 |
| Viewport     | 390 × 844                                                                     |
| Entrada      | `/produtos/<slug do pingente da massa>` · anônima, sacola vazia, forma "Na linha" |
| Jornadas     | J-01                                                                          |
| TC           | TC-SMOKE-001, TC-SMOKE-002, TC-JOURNEY-001, TC-FUNC-001, TC-FUNC-002, TC-FUNC-003, TC-FUNC-004, TC-FUNC-005, TC-FUNC-006, TC-FUNC-007, TC-FUNC-010, TC-FUNC-011, TC-FUNC-017, TC-FUNC-020, TC-REG-001, TC-PERSONA-001 · com o Dev (não executados na sessão): TC-INT-005, TC-INT-006 |

## Missão

Confirmar que quem abre o pingente pela primeira vez no celular entende o bloco, monta pingente e corrente e leva pela barra fixa exatamente o que marcou, em menos de um minuto por tela.

## Deve tentar

1. Marcar a corrente da lista, escolher peça e comprimento e conferir, a cada escolha, o total e o PIX do bloco contra os preços das variações escolhidas (nunca o "a partir de").
2. Tocar a barra fixa com uma escolha faltando e ver se a página rola até o adicional e diz qual escolha falta; depois completar e levar.
3. Trocar a variação do pingente para a que tem um adicional marcado para sumir (ex.: "Chaveiro") com esse adicional marcado, e ver o que acontece com a marca e com o total.
4. Abrir um produto sem Compre Junto e um produto inteiro esgotado com Compre Junto, e comparar com a página de antes (botão, "Você também vai curtir").

## Edge cases sugeridos

- Voltar depois do sucesso (gaveta aberta) e conferir que o bloco não reabre marcado nem duplica
- Duplo toque em "Levar o conjunto"
- Marcar, desmarcar e marcar de novo um adicional: a escolha anterior volta ou zera, e o total acompanha
- Viewport mínima 320 × 568 com três adicionais
- Girar para 844 × 390 no meio da escolha
- Recarregar com adicionais marcados (o bloco volta sem marca, CA-03.2)
- Movimento reduzido ao abrir as escolhas

## Fora do escopo

- O checkout, o pagamento e a confirmação — CH-02
- A gaveta da sacola além da frase "acompanha" e das linhas recém-adicionadas — CH-02 e CH-05
- As formas "Em folha" e "Com fórmula" — CH-06
- "Você também vai curtir", a galeria, o frete, o acordeão e "Como enviar seu material de DNA": a mudança não toca; o que aparecer ali é sugestão de backlog
- O order bump do checkout e o "Complete o frete grátis" (PRD › Fora)
- Compre junto no card da vitrine, na gaveta da sacola e no checkout (PRD › Fora)
- Desconto da compra casada (Work Item 92) e combinar o acabamento (Work Item 93)
