---
id: 92
titulo: Desconto da compra casada (Compre Junto)
tipo: feature
entrada: descoberta
fase: discovery
criado: 2026-11-02
---
## Descrição
Vamos planejar a próxima feature da loja, o Compre Junto. Esse Compre Junto servirá para oferecer aos clientes na tela do produto outras produtos para tentar fechar compras
  casadas na loja e dessa forma aumentar o ticket médio. A ideia é montar um compre junto parecido com o que já existe em outras lojas referencia no mercado. Porém aqui eu quero
  poder por exemplo.. Em um Pingente afetivo, conseguir da a opção de adicionar corrente em um dos produtos adicionais, e nesse corrente eu poder selecionar alguns produtos
  modelos de corrente por exemplo, para que o usuário consiga escolher qual das correntes ele quer.. Mesmo exemplo para adicionar pingente adicionais, onde pode selecionar um
  lisga de pringentes como adicional. Esse compre junto deve ser dinamico, possibilitar adicionar até 3 produtos adicionais ao produto Principal no compre junto, em um produto,
  dar a a opção adicionar uma lista de produtos referencia (exemplo da corrente) e suas variantes, possibilidade de ordenar esse produtos na lista. Opção de adicionar apenas 1
  produtos e suas váriantes. Possibilidade de descontos na compra casada. E pensar em outras lógicas especificas e funcionalidade que possam ser um  diferencial para o nosso
  compre junto. Quero organizar o planejamento dessa feature, e criar no Claude design Projeto "Uma Estrelinha - Backoffice" a parte admnistrativa e no Projeto Criar um novo
  Projeto para Loja, para desenhar a funcionalidade do usuário. Verificar se para o formato Spec é melhor separar em 1 ou 2 features esssa implementação.

Recorte deste Work Item (gate da descoberta do WI 91, 2026-11-02, Q-01): só o **desconto da compra casada** — o Compre Junto sem desconto é o WI 91, e este depende dele.
Já decidido no mesmo gate: Q-04 percentual por adicional, sobre o preço da peça adicional quando o principal está no mesmo pedido; Q-05 seguir `AD-015` (concorre por item com order bump e promoção — vence o menor preço —, com o cupom pelo menor total, e o PIX incide depois); Q-06 vale pela presença do principal e do adicional no mesmo pedido, decidida pelo servidor.

## Insumos
- `.specs/work-items/91-compre-junto/discovery.md` (diagnóstico do código de dinheiro: `pricing.ts`, `mercado-pago/handlers.ts`, `useCheckoutTotals`, `useCartPromotion`)
- `.specs/work-items/91-compre-junto/prd.md` › Fora (as decisões Q-04..Q-06)
- Claude Design: o desenho do WI 91, com o campo de desconto marcado "WI 92"

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
