# CH-02 · Sacola e checkout: o desconto só com a joia, na medida da joia, até o pedido gravado

| Campo        | Valor                                                                         |
| ------------ | ----------------------------------------------------------------------------- |
| Tipo         | exploratório                                                                  |
| Prioridade   | P0                                                                            |
| Persona      | PER-01 Marina                                                                 |
| Tour         | Money                                                                         |
| Modo         | por técnica (transição de estado: joia entra e sai, quantidade sobe e desce)  |
| Time-box     | 90 min · orçamento: 70 ações                                                  |
| Mudança      | a peça sai com o percentual sobre a variação, a centavo por item (CA-03.1); uma unidade de desconto por unidade da joia, com a linha mista (CA-03.2); tirar a joia tira o desconto e diz que ele volta (CA-03.3); a peça pelo catálogo recebe o desconto (CA-03.4); PIX depois (CA-03.7); "de/por" e a mesma linha na gaveta e no checkout (CA-03.8); variação escondida ou não liberada sem desconto (CA-03.11); o pedido gravado com o total da tela (CA-04.2, RNF-01) e o cheio e o cobrado por linha (CA-05.1); a confirmação (CA-05.2); sem configuração, nada muda (RNF-02); 390 sem rolagem (RNF-05). As linhas do resumo do checkout e da confirmação seguem a ordem do painel — descontos e PIX antes do Frete (decisão Q-01 de 2026-11-04); o Frete antes dos descontos é bug. As linhas dos itens seguem a Design de cada tela (D-38): mostrar o total da linha não é bug |
| Viewport     | 390 × 844; 1440 × 900 no fim                                                  |
| Entrada      | `/produtos/<slug de P>` · anônima, sacola vazia; o checkout como convidada (e-mail `@exemplo.invalid`) |
| Jornadas     | J-01 (passos 4–7) e os ramos J-01a, J-01b, J-01c, J-01d                        |
| TC           | TC-SMOKE-002, TC-JOURNEY-001, TC-JOURNEY-002, TC-FUNC-012, TC-FUNC-013, TC-FUNC-015, TC-FUNC-018, TC-FUNC-019, TC-FUNC-022, TC-FUNC-024, TC-FUNC-026, TC-REG-001, TC-UI-002 |

## Missão

Achar qualquer jeito de a corrente sair com desconto sem a joia na sacola, com desconto em mais unidades do que a
joia permite, ou com um valor diferente do bloco entre a sacola, o checkout e o pedido gravado.

## Deve tentar

1. Tirar a joia, devolvê-la, mudar a quantidade da joia e da corrente, e somar as contas da linha e do rodapé a cada
   mudança.
2. Acrescentar a corrente pelo catálogo ou pela busca, com e sem a joia na sacola.
3. Fechar o pedido como convidada com PIX e comparar o Total do checkout com o valor de `/pedido/:id/pagamento` e de
   `/pedido/:id`, ao centavo, conferindo a ordem do resumo nas duas telas; recarregar a tela de pagamento.
4. Repetir com M-10 (joia e peça sem nenhum percentual) e conferir que nada diferente aparece.

## Edge cases sugeridos

- Duplo clique no botão de confirmar o pagamento
- Recarregar durante o envio do pedido
- Voltar depois do sucesso (da tela de pagamento para o checkout)
- Mesma sacola em duas abas, tirando a joia numa delas
- Fechar e reabrir a aba com a sacola montada
- Rede lenta no checkout
- Viewport mínima 320 × 568 na gaveta

## Fora do escopo

- A concorrência com cupom, promoção, oferta do checkout e duas joias (é do CH-03).
- O percentual mudando no caminho (é do CH-04).
- O QR do PIX e o Brick do cartão: o "cobrado" é o pedido gravado; a ausência do QR no local não é achado.
- A gravação personalizada, o material e o frete do WI-01 e anteriores.
- Minha conta e o e-mail (CH-03).
- A gaveta da sacola não tem a linha do Frete ("frete calculado no checkout"): o rodapé dela segue o protótipo.
