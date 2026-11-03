---
id: 91
titulo: Compre Junto na página do produto
tipo: feature
entrada: descoberta
fase: specify
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

## Insumos
- Claude Design, projeto "Uma Estrelinha - Backoffice" (`e3957c10-bd49-4f3d-9256-04d72a7d0f41`): https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Compre+Junto+-+Listas+e+ades%C3%A3o.html (listas e adesão) e https://claude.ai/design/p/e3957c10-bd49-4f3d-9256-04d72a7d0f41?file=Produto+-+Compre+Junto.html (a aba Compre junto do produto)
- Claude Design, projeto "Uma Estrelinha - Loja" (`69224d8a-17ae-4b1f-a251-a8105b41edc2`, criado em 2026-11-02): https://claude.ai/design/p/69224d8a-17ae-4b1f-a251-a8105b41edc2?file=Produto+-+Compre+Junto.html (o bloco na página do produto e a sacola)

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| descoberta | 2026-11-02 | ratificado · 5 premissas (P-01, P-02, P-04 cobertas por Q-02, Q-09, Q-08 — P-02 caiu) · 14 perguntas → `prd.md` · desconto cortado para o WI 92 (Q-04..Q-06 decididos e registrados em Fora) |
| prd-review r1 | 2026-11-02 | changes_requested_blocking · 10 aplicados ao `prd.md` (F1–F4, F6–F8, F11–F13) · F9 sem edição · 2 rebaixados a tech (F5, F10) + 9 tech em Decisões (registradas em `prd-review.md`) · 0 abertos · combinar o acabamento → WI 93 · parado aqui a pedido do usuário (implementação pelo /feature) |
