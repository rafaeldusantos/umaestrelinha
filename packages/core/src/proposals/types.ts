// As formas da proposta que atravessam painel, functions e loja (feature 89). Só tipos.

import type { ManualDiscount } from '../payment/pricing.ts'

/** Uma linha do rascunho, como o painel a monta e o servidor a relê do banco. */
export interface ProposalLine {
  product_id: string
  variant_id: string | null
  /** O preço CHEIO da variação (ou do produto), antes de qualquer promoção. */
  list_price: number
  quantity: number
}

/** A linha com o preço travado (já com a promoção que venceu). */
export interface LockedLine<L extends ProposalLine = ProposalLine> {
  line: L
  unit_price: number
}

/** O desconto avulso com o motivo, como a Adri o escreve. O motivo é interno (CON-03). */
export interface ManualDiscountDraft extends ManualDiscount {
  reason: string
}

/**
 * O que fica travado na proposta e é tudo que `proposalPricing` precisa: o preço por linha, o cupom
 * como VALOR (A-06) e a bandeira de frete grátis do cupom, e o avulso já resolvido em reais.
 */
export interface LockedProposal {
  lines: ReadonlyArray<{ unit_price: number; quantity: number }>
  couponDiscount: number
  couponFreeShipping: boolean
  manualDiscount: number
}

/** Uma linha do que `get-proposal` devolve à loja. */
export interface PublicProposalLine {
  position: number
  product_id: string
  variant_id: string | null
  product_name: string
  product_image: string | null
  variant_label: string | null
  quantity: number
  list_price: number
  unit_price: number
  engraving_text: string | null
  requires_material: boolean
  /** A peça segue ativa e com estoque (CON-09). */
  available: boolean
}

export interface PublicProposalAddress {
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
}

/**
 * O que a página do link desenha — e só isso (SEG-04): sem o hash do token, sem o motivo do desconto
 * avulso, sem notas internas, sem quem criou.
 */
export interface PublicProposal {
  id: string
  number: string
  version: number
  expires_at: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  address: PublicProposalAddress | null
  lines: PublicProposalLine[]
  subtotal: number
  promotion_discount: number
  coupon_code: string | null
  coupon_discount: number
  coupon_free_shipping: boolean
  manual_discount: number
  items_total: number
}
