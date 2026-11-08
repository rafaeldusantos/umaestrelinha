// O que o cupom faz, em palavras — ao lado do código no cartão Descontos (feature 89, ajuste de
// 2026-11-01, pelo protótipo). A frase mora em `core` (`couponLabel`), lida também pelo app do ateliê.

import { couponLabel } from '@estrelinha/core/coupons'
import type { CouponRule } from '@estrelinha/core/payment/pricing'

export const rotuloDoCupom = (rule: CouponRule): string => couponLabel(rule)
