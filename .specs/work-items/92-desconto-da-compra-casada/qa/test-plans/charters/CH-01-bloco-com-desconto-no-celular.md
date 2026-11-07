# CH-01 · O bloco diz quanto cada peça custa levando junto, no celular

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Marina                                                                 |
| Tour         | Feature                                                                       |
| Modo         | com tour                                                                      |
| Time-box     | 60 min · orçamento: 50 ações                                                  |
| Mudança      | o bloco Compre Junto passa a mostrar o desconto: "de/por" e "N% a menos levando junto" em cada peça com desconto, também nas peças de uma lista, que ficam numa faixa que rola dentro dela (CA-02.1; a faixa exigida pela decisão Q-02 de 2026-11-04); a linha "Desconto do Compre Junto − R$ X" acima do total já descontado e o PIX sobre ele (CA-02.2); a nota "O desconto vale enquanto a joia estiver no mesmo pedido." (CA-02.3); o total igual ao da sacola sem promoção nem cupom (CA-02.4); a barra fixa com o total descontado (CA-02.5); 390 × 844 sem rolagem horizontal (RNF-05) |
| Viewport     | 390 × 844 (depois 1440 × 900 para a nota do computador)                       |
| Entrada      | `/produtos/<slug do pingente P de M-01>` · anônima, sacola vazia               |
| Jornadas     | J-01 (passos 1–4)                                                             |
| TC           | TC-SMOKE-001, TC-FUNC-006, TC-FUNC-007, TC-FUNC-008, TC-FUNC-009, TC-FUNC-011, TC-UI-001 |

## Missão

Confirmar que quem chega ao pingente pelo celular entende, no próprio bloco, quanto cada peça custa levando junto e
quanto o conjunto vai custar, e que esse número é o mesmo que a barra fixa e a sacola mostram.

## Deve tentar

1. Trocar a variação da joia e da corrente e ver o "de/por" acompanhar o preço da variação escolhida.
2. Marcar e desmarcar peças com e sem desconto e observar a linha do desconto, o total, o PIX e a nota aparecerem
   e sumirem.
3. Abrir a lista "Correntes" (3 ou mais peças) e conferir o "de/por" em cada peça da escolha, numa faixa que rola
   dentro do bloco como no protótipo, até a última peça (Q-02: a grade de hoje no lugar da faixa é bug).
4. Medir em 390 × 844 a 100 %, 130 % e 200 % de fonte: nenhuma rolagem horizontal do `body` (inclusive ao rolar a
   faixa), o "de/por" sem quebrar em pílula, a barra fixa sem cobrir o total.

## Edge cases sugeridos

- Viewport mínima 320 × 568 (o "de/por" com preço de quatro dígitos)
- Girar no meio do fluxo (390 × 844 → 844 × 390)
- Voltar e avançar repetido entre a página e a sacola
- Recarregar com peças marcadas
- Movimento reduzido
- Rede lenta: o bloco carregando (o esqueleto de 320 do WI-01) e o total aparecendo
- Arrastar a faixa da lista na vertical: a página rola, a faixa não prende o dedo

## Fora do escopo

- Os estados do Compre Junto do WI-01 que este WI não toca (carregando, falha que some, esgotada, as três formas do
  bloco, a gravação, o material) — o que a sessão vir ali é sugestão de backlog.
- O "Economize" do `compare_price` na coluna de informação (anterior ao WI, D-09).
- O preço no feed e no JSON-LD (TC-INT-005, com o Dev).
- A sacola além de conferir o total (é do CH-02).
