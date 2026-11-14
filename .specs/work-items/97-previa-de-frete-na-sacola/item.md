---
id: 97
titulo: Prévia de frete na sacola, com o CEP levado ao checkout
tipo: feature
entrada: prd
fase: absorvido
criado: 2026-11-07
absorvido_por: 99
---
> **Absorvido pelo WI 99** (decisão do usuário, 2026-11-13: "Feature 99 - Pode absorver a 97"). O `prd.md` desta
> pasta continua valendo e é lido pelo PRD da 99, que registra só o que muda sobre ele. Não executar este item à parte.

## Descrição
Adicionar o calculo de Frete dos produtos no Drawer de Carrinho, uma prévia real valor de Frete antes de ir para o Checkout.
  Levar o CEP adicionado no carrinho para o Checkout também. Vamos criar no Claude Design essa funcionalidade, baseie-se no que já existe na UI da loja  para montar o Drawer de carrinho com o ajuste

Pedido seguinte, na mesma sessão (2026-11-07), já refletido no protótipo e no PRD:
- "Remover a frase \"Total com o frete para o CEP 90010-000. O CEP e a forma de envio seguem para o checkout, onde você confere tudo.\" do Prodtotipo, e crie o Item e o PRD no Projeto como os itens anteriores em /spwork-items com as regras e o planjemaneto para ficar na fila para implementaçào na sequencia"

## Insumos
- PRD: `prd.md` (escrito nesta sessão a partir do pedido, do protótipo e da leitura do código da gaveta e do checkout)
- Protótipo: projeto "Uma Estrelinha - Loja", página `Sacola - Prévia de frete.html` (`sf-dados.jsx`, `sf-gaveta.jsx`, `sf-checkout.jsx`, `sf-app.jsx`, `sf.css`). Nasceu no Claude Design (`69224d8a-17ae-4b1f-a251-a8105b41edc2`) e o projeto foi migrado para https://claude.ai/code/artifact/41e4046b-6433-4e30-9670-f714f2dc2b75 em 2026-11-08
- A gaveta de hoje: `apps/store/src/widgets/cart-drawer/ui/CartDrawer.tsx`
- O cálculo de frete da página do produto (molde visual): `apps/store/src/features/shipping-calc/ui/ShippingCalc.tsx`
- O bloco Entrega do checkout (dono da cotação, da pré-seleção e do frete grátis por opção): `apps/store/src/features/checkout/ui/DeliveryBlock.tsx`, `apps/store/src/features/checkout/api/useShippingQuote.ts`, `apps/store/src/features/checkout/model/checkoutStore.ts`

## Gates
| gate | quando | resultado |
| ---- | ------ | --------- |
| absorção | 2026-11-13 | absorvido pelo WI 99 (prévia de frete + frete grátis por região) |
