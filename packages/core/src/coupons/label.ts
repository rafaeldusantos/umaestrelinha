// O que o cupom faz, em palavras — ao lado do código, no painel ao montar uma proposta e no app do
// ateliê (o passo Descontos da montagem). Dois leitores da mesma frase: o dono é este arquivo.
//
// Alcançável pelo Deno como o resto do diretório: todo especificador relativo com `.ts`.

import { formatPrice } from '../formatters/price.ts'
import type { CouponRule } from '../payment/pricing.ts'

/**
 * "10% de desconto", "R$ 20,00 de desconto", "Frete grátis". O cupom de primeira compra diz isso no
 * lugar de "de desconto": "5% na primeira compra" (e "Frete grátis na primeira compra").
 */
export const couponLabel = (rule: CouponRule, { firstOrderOnly = false }: { firstOrderOnly?: boolean } = {}): string => {
  const quando = firstOrderOnly ? ' na primeira compra' : ''
  if (rule.type === 'free_shipping') return `Frete grátis${quando}`
  const quanto = rule.type === 'percent' ? `${String(rule.value).replace('.', ',')}%` : formatPrice(rule.value)
  return `${quanto}${firstOrderOnly ? quando : ' de desconto'}`
}
