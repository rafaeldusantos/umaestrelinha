// O que o cupom faz, em palavras — ao lado do código no cartão Descontos (feature 89, ajuste de
// 2026-11-01, pelo protótipo). Puro: o teste lê a mesma frase que a tela escreve.

import { formatPrice } from '@estrelinha/core/formatters'
import type { CouponRule } from '@estrelinha/core/payment/pricing'

export const rotuloDoCupom = (rule: CouponRule): string =>
  rule.type === 'free_shipping'
    ? 'Frete grátis'
    : rule.type === 'percent'
      ? `${String(rule.value).replace('.', ',')}% de desconto`
      : `${formatPrice(rule.value)} de desconto`
