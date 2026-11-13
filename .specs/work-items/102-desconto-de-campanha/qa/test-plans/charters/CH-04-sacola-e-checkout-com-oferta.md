# CH-04 · Sacola e checkout com oferta

| Campo        | Valor |
| ------------ | ----- |
| Tipo         | exploratório |
| Prioridade   | P0 |
| Persona      | PER-03 Helena |
| Tour         | Money |
| Modo         | por cenário (J-04) |
| Time-box     | 90 min · orçamento: 70 ações |
| Mudança      | a sacola e o checkout precificando cada linha pela campanha relida (CA-03, CA-06); a linha "Desconto de campanha" no resumo e no pedido (CA-13); o cupom fora da peça de campanha, a recusa com o nome e o frete grátis (CA-16); a promoção progressiva e o Compre Junto sem a peça de campanha (CA-17) |
| Viewport     | 390 × 844 para montar a sacola; 1440 × 900 para fechar o checkout |
| Massa        | só lê a Black Friday, M-A, M-C, M-E, M-E2, os cupons `QA10` e `QAFRETE`, a promoção da coleção de M-A e o Compre Junto de M-E; **cria** pedidos de convidada (até 3) |
| Driver       | — |
| Entrada      | `http://localhost:8082/ofertas` · sem login, sacola vazia |
| Jornadas     | J-04 |
| TC           | TC-FUNC-005, TC-FUNC-008, TC-FUNC-014, TC-FUNC-015, TC-FUNC-016, TC-JOURNEY-002 |

## Missão

Como a cliente que confere o total antes de pagar, achar qualquer jeito de o pedido gravado ter um total diferente
do que a sacola e o checkout mostraram, ou de um desconto se somar a outro na peça de campanha.

## Deve tentar

1. Sacola com M-A (20 %) + M-E (comum) + `QA10`: o cupom desconta só 10 % de M-E; o checkout mostra o mesmo total e
   o PIX 5 % sobre ele; finalizar como convidada e comparar `/pedido/:id` com o checkout
2. Tirar M-E e tentar `QA10` de novo (recusa com o nome da campanha); trocar por `QAFRETE` (frete zerado)
3. M-C com "de/por" na sacola: o valor cobrado é o menor, nunca os dois descontos multiplicados
4. Sacola com M-E, M-E2 e M-A (a coleção da promoção) e o Compre Junto de M-E com M-A como adicional: a faixa da
   promoção e o desconto do conjunto não contam M-A, e a sacola não promete o que o pedido não dá

## Edge cases sugeridos

- Duplo clique em "Finalizar"
- Recarregar o checkout no meio do preenchimento
- Voltar do checkout para a sacola e mudar a quantidade de M-A (o desconto acompanha por unidade)
- Aplicar o cupom e depois acrescentar/tirar a peça de campanha
- Abrir a sacola em outra aba e mexer na quantidade
- Fechar e reabrir a aba com a sacola montada
- Rede lenta ao aplicar o cupom

## Fora do escopo

- Pagar de verdade: **nunca** digitar cartão; a página de pagamento falhar ao gerar o PIX (chave inválida no local) não é achado — o fim alcançável é o pedido criado e `/pedido/:id`
- Cupom, promoção e Compre Junto em sacolas só com peças comuns: não mudaram neste WI — o que se vir ali é sugestão de backlog
- O frete grátis por valor conferido no servidor (H-07, pré-existente, fora do WI)
- A campanha acabar com o checkout aberto (CH-06)
- Login de cliente, endereço, cálculo de frete das transportadoras
