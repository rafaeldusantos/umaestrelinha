# CH-04 · Painel e loja em duas abas: o que a dona muda chega à loja e ao relatório

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P1                                                                            |
| Persona      | PER-02 Adri                                                                   |
| Tour         | Multi-Tab                                                                     |
| Modo         | com tour                                                                      |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | Editar uma lista muda o bloco de todos os produtos que a usam; peça ou adicional fora do ar é marcado no painel e pulado pela loja; lista em uso não se apaga; a forma do bloco é escolhida no menu Compre Junto; a aba Adesão mostra o relatório. Critérios: CA-01.4, CA-01.5, CA-01.7, CA-02.7, CA-07.1, CA-09.1, CA-09.2, CA-06.1–06.5 |
| Viewport     | 1440 × 900 (o índice e a adesão também em 390 × 844)                          |
| Entrada      | `/admin/compre-junto` na aba A · logada como `admin-painel`; `/produtos/<slug do pingente>` na aba B |
| Jornadas     | J-03 (continuação), J-04, J-06                                                |
| TC           | TC-JOURNEY-004, TC-JOURNEY-006, TC-FUNC-021, TC-FUNC-027, TC-FUNC-032, TC-FUNC-033, TC-FUNC-034, TC-FUNC-037, TC-FUNC-041, TC-FUNC-042, TC-FUNC-043 · com o Dev (não executado na sessão): TC-INT-004 |

**Massa do relatório (decisão D-01 do plano):** a sessão abre a aba Adesão **duas vezes**. Primeiro, antes de qualquer gravação, para TC-FUNC-043 (o vazio escrito). Depois a thread grava a M-08 no banco local (pedidos pagos com Compre Junto, descritos nos Critérios de entrada do plano) e devolve a sessão, que segue com TC-FUNC-041, TC-FUNC-042 e TC-JOURNEY-006, comparando a tela com os números esperados que a thread anotou. A M-08 fica no banco até o fim da rodada; a sessão não a apaga.

## Missão

Achar qualquer estado velho ou perda de atualização entre o que a dona muda no painel e o que a loja e o relatório mostram, vivendo com o painel e a loja abertos lado a lado.

## Deve tentar

1. Com a lista "Correntes" em uso em duas joias, reordenar e tirar uma peça na aba A e recarregar as duas joias na aba B.
2. Desativar no painel uma peça da lista e o produto de um adicional do tipo peça: o selo "saiu do ar" no editor e na aba do produto, e a loja pulando só eles.
3. Trocar a forma do bloco para "Em folha" e "Com fórmula" e recarregar a loja; abrir a aba Adesão (vazia), pedir a gravação da M-08 e reabrir: trocar 7/30/90 e os recortes, editar a lista e voltar ao relatório.
4. Por último, tentar excluir a lista em uso; tirá-la das joias e excluir — e voltar ao relatório para ver que os números não mudaram.

## Edge cases sugeridos

- A mesma lista aberta no editor em duas abas, salvando nas duas
- Excluir a lista numa aba enquanto o produto que a usava está aberto na outra
- Loja aberta antes da mudança, sem recarregar, tentando levar uma peça que acabou de sair do ar
- Relatório sem pedido no período (o vazio escrito, antes da M-08)
- Índice e Adesão em 390 (cartões no lugar da tabela)
- Voltar do editor para o índice e conferir "em uso em N joias"

## Fora do escopo

- Os limites e recusas da montagem (nome, 12 peças, 3 adicionais) — CH-03
- A loja nas três formas, com teclado — CH-06
- O Dashboard e as outras telas de relatório do painel: a régua é a mesma, mas a mudança não as toca
- A folha de separação do pedido (fora da costura)
- Desconto da compra casada (Work Item 92)
- Gravar ou apagar a M-08: é da thread, não da sessão
