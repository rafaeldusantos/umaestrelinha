// Feature 42 — o pedido de exemplo da prévia do painel (`PNL-05`).
//
// A dona clica em "ver prévia" e vê o e-mail montado sobre ESTE pedido, não sobre um da loja: a tela
// de configuração não é lugar de mostrar o nome, o endereço e a compra de uma cliente real. Quem
// quiser conferir um caso concreto passa um `order_id` — é a outra metade da mesma action.
//
// Todo dado aqui é INVENTADO e tem de continuar sendo: e-mail em `@exemplo.invalid` (TLD reservado
// pela RFC 2606, nunca entregável), nome que não é de ninguém, CEP e rua genéricos.
// `render.test.ts` assere que nenhum endereço fora de `@exemplo.invalid` aparece neste arquivo.

import type { EmailOrder } from './layout.ts'

/**
 * Um pedido com o que exercita todos os blocos: dois itens (um com variação, um sem), frete pago,
 * desconto de PIX, endereço completo com complemento, rastreio dos dois tipos e material a caminho.
 * Assim qualquer evento que a dona escolher tem o que renderizar — inclusive os de material e o
 * destaque do código de rastreio.
 *
 * A corrente acompanha o pingente com 10% do Compre Junto: a prévia mostra o "de/por" na linha e o
 * Subtotal cheio com a linha do desconto. A conta fecha: 289 − 4 (Compre Junto) − 14,25 (PIX sobre
 * 285) + 24,90 = 295,65.
 */
export const SAMPLE_ORDER: EmailOrder = {
  id: '00000000-0000-4000-8000-000000000042',
  order_number: 'UE-0042',
  customer_name: 'Mariana Souza',
  customer_email: 'mariana@exemplo.invalid',
  subtotal: 285,
  shipping_cost: 24.9,
  discount: 0,
  pix_discount: 14.25,
  total: 295.65,
  buy_together_discount: 4,
  promotion_discount: 0,
  order_bump_discount: 0,
  tracking_code: 'AA123456789BR',
  shipping_carrier: 'PAC',
  material_status: 'material_enviado',
  material_tracking_code: 'BB987654321BR',
  address_street: 'Rua das Acácias',
  address_number: '128',
  address_complement: 'apto 34',
  address_neighborhood: 'Jardim das Flores',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  address_zip: '90000-000',
  order_items: [
    {
      product_id: 'exemplo-pingente',
      product_name: 'Pingente Gota — resina com cinzas',
      size: 'Único',
      finish: 'Prata 950',
      quantity: 1,
      unit_price: 249,
      full_unit_price: 249,
    },
    {
      product_id: 'exemplo-corrente',
      product_name: 'Corrente veneziana 45cm',
      size: null,
      finish: null,
      quantity: 1,
      unit_price: 36,
      full_unit_price: 40,
      accompanies_product_ids: ['exemplo-pingente'],
    },
  ],
}
