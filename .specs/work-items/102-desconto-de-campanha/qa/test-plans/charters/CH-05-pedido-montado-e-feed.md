# CH-05 · O pedido montado e o feed do Google

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P1 |
| Persona      | PER-01 Adri |
| Tour         | Money |
| Modo         | por cenário (J-05) |
| Time-box     | 60 min · orçamento: 50 ações |
| Mudança      | a montagem do pedido no painel e no app do ateliê com o preço da campanha e o cupom recusado na peça de campanha (R-05); o feed do Google com `sale_price` e `sale_price_effective_date` (CA-10) |
| Viewport     | 1440 × 900 no painel; 390 × 844 no app do ateliê |
| Massa        | só lê a Black Friday, M-A, M-B, M-E e o cupom `QA10`; **cria** até duas propostas (pedido montado) |
| Driver       | — |
| Entrada      | `http://localhost:8083/admin/pedidos/montar` · logada como `admin-loja` |
| Jornadas     | J-05 |
| TC           | TC-FUNC-019, TC-INT-001 |

## Missão

Como a dona fechando um pedido pelo WhatsApp, achar qualquer diferença de centavo entre o preço que o painel ou o
app montam, o que o link de checkout cobra, o que a loja mostra e o que o anúncio do Google diz.

## Deve tentar

1. No painel, montar com M-A + M-E, aplicar `QA10`, salvar e abrir o link de checkout na loja — comparar os totais
2. Montar só com M-A e tentar `QA10` (recusa com o nome da campanha); dar um desconto combinado por cima
3. No app do ateliê (`http://localhost:8084/pedidos/montar`, 390 × 844), montar com M-B escolhendo uma variação
   cara e uma barata — o preço de cada uma com o percentual sobre o próprio preço
4. Abrir o feed local (`http://127.0.0.1:54441/functions/v1/google-feed`) e, para as variações de M-A e M-B,
   comparar `g:price`, `g:sale_price` e `g:sale_price_effective_date` com a página do produto e a vigência

## Edge cases sugeridos

- Duplo clique em salvar a proposta
- Voltar no meio da montagem (gesto de voltar do app) e retornar
- Recarregar o link de checkout do pedido montado
- Trocar a variação de M-B depois de aplicar o desconto combinado
- Abrir a mesma proposta em duas abas

## Fora do escopo

- Concluir o pagamento do pedido montado (chave inválida no local)
- O resto da montagem (cliente nova, frete, endereço) e a lista de pedidos montados: não mudaram neste WI
- O Merchant Center real; o feed com outras peças fora da campanha (só conferir que continuam sem `sale_price`)
