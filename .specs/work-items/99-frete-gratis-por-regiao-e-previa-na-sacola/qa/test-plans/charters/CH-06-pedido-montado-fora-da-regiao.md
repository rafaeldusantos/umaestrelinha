# CH-06 · O pedido montado com entrega fora da região

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-02 Cida |
| Tour         | Money |
| Modo         | por cenário (J-04) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | o pedido montado (`/pedido-montado`) só zera o frete com a faixa alcançada **e** o CEP numa região da campanha, e o servidor cobra o mesmo (CA-21; RN-16); a página não lê nem apaga o CEP da sacola (CA-12) |
| Viewport     | 390 × 844 |
| Massa        | **consome** o link de pedido montado da massa (peças ≥ R$ 450, preparado antes da rodada); cria um pedido `pending` no banco local; lê `store_settings.shipping` (Sul + Sudeste) |
| Driver       | — |
| Entrada      | `/` · logada como `cliente-salvador`; sacola com uma peça e 40020-000 calculado na gaveta (montar no começo); depois o link do pedido montado; cotação interceptada com a **fixture A** |
| Jornadas     | J-04 |
| TC           | TC-INT-001, TC-FUNC-017 |

## Missão

Como Cida, pagando pelo link que a Adri mandou, procurar qualquer caminho em que o pedido montado conceda o frete
grátis para Salvador — na tela ou no pedido que nasce — ou em que ele mexa na sacola que ela tinha montado.

## Deve tentar

1. Montar a sacola com 40020-000 calculado; abrir o link do pedido montado; conferir que o formulário de entrega dele
   não veio preenchido com o CEP da sacola.
2. Informar primeiro 01310-100 (o "Grátis" aparece com a faixa alcançada), depois 40020-000: o frete volta a ser
   cobrado e o Total sobe.
3. Seguir ao pagamento com 40020-000 e conferir o Total do pedido que nasce (na tela de pagamento ou em `/conta`).
4. Voltar à loja e abrir a gaveta: a sacola e o 40020-000 intactos.

## Edge cases sugeridos

- Recarregar `/pedido-montado` no meio do preenchimento.
- Voltar do navegador depois de seguir ao pagamento.
- Duplo toque no botão de pagar.
- Abrir o link do pedido montado numa segunda aba com a gaveta aberta na primeira.

## Fora do escopo

- O pedido montado zerar **qualquer** opção escolhida, não só a mais barata (PR-11 — dívida anterior, fora).
- Concluir o pagamento: no local o Mercado Pago está com chave inválida e o PIX não sai; o achado é o Total, não a
  cobrança.
- Montar o pedido no painel (é massa preparada antes da rodada).
- O pedido comum (Pergunta 2 do PRD 99, fora).
