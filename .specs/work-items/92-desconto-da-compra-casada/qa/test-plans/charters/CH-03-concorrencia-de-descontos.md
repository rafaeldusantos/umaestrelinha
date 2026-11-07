# CH-03 · Cupom, promoção, oferta do checkout e duas joias: nenhum desconto se soma onde não devia

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-04 Helena                                                                 |
| Tour         | Money                                                                         |
| Modo         | por técnica (tabela de decisão: casado × promoção × bump × cupom × PIX)       |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | com promoção maior, a sacola mostra o menor e a diferença só ali (CA-02.4); duas joias somam unidades, maior percentual primeiro (CA-03.2); promoção ou bump: o menor da linha, sem somar (CA-03.5); o cupom acumula e o descartado só é nomeado quando desconta (CA-03.6); PIX depois (CA-03.7); maior percentual entre joias e avulsa antes da lista (CA-03.9); par recíproco (CA-03.10); Minha conta e o e-mail com o resumo que fecha (CA-05.1, CA-05.2), com as linhas do resumo na ordem do painel — descontos e PIX antes do Frete (decisão Q-01 de 2026-11-04); as linhas dos itens seguem a Design de cada tela (D-38) |
| Viewport     | 1440 × 900 e 390 × 844 (a persona alterna)                                    |
| Entrada      | `/produtos/<slug de P>` · logada como `cliente-loja`, sacola vazia; M-02, M-03, M-04 prontos |
| Jornadas     | J-03 e os ramos J-03a, J-03b, J-03c                                            |
| TC           | TC-JOURNEY-004, TC-FUNC-010, TC-FUNC-014, TC-FUNC-016, TC-FUNC-017, TC-FUNC-020, TC-FUNC-021, TC-FUNC-027, TC-INT-004 |

## Missão

Achar uma combinação de cupom, promoção, oferta do checkout e duas joias em que a cliente pague menos do que a
regra diz (descontos somados), mais do que ela diz (desconto perdido), ou leia que um desconto "ficou de fora"
quando não ficou — e conferir que Minha conta e o e-mail contam a mesma conta, na mesma ordem do painel.

## Deve tentar

1. Pôr a corrente em promoção maior que o desconto casado (M-04) e comparar o bloco com a sacola.
2. Marcar a corrente como oferta do checkout e conferir que vale só o menor.
3. Aplicar o cupom de 15 % e o de frete grátis, com e sem promoção concorrente, e ler a frase do descartado.
4. Levar P e Q (percentuais diferentes para a mesma corrente) e A e B (par recíproco), e somar cada linha.
5. Conferir a ordem das linhas do resumo no checkout, em Minha conta e no e-mail contra o painel do pedido.

## Edge cases sugeridos

- Aplicar e remover o cupom várias vezes
- Tirar uma das duas joias com o cupom aplicado
- Colar o código do cupom com espaço no fim
- Voltar do checkout para a sacola e de novo ao checkout
- Mesma conta em duas abas, aplicando o cupom numa
- Sessão: entrar por código no meio do checkout

## Fora do escopo

- O relatório de promoções do painel (o número muda por D-22, sem critério neste WI).
- Regras de cupom e de promoção que não envolvem o desconto casado (validade, mínimo, categorias).
- O pedido montado pelo painel (CH-06, TC-REG-002).
- O percentual mudando no caminho (CH-04).
