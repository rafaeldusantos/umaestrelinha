import { couponLabel } from '@estrelinha/core/coupons'
import { formatPrice, parseBRL } from '@estrelinha/core/formatters'
import { MANUAL_REASON_MAX, PROPOSAL_ZERO_REFUSAL, manualDiscountRefusal } from '@estrelinha/core/proposals'

import type { LinhaDaSacola } from './sacola'

/**
 * O passo 3 · Descontos da montagem — memória da tela, pura: o cupom aplicado, o desconto combinado,
 * o que vai à prévia (`order-proposals?action=preview`) e o motivo do bloqueio. Nenhuma conta de
 * dinheiro mora aqui: o resumo vem do servidor, pela mesma `precificar` do `save`. O motivo do desconto
 * combinado fica só nesta memória — não vai à prévia, nem ao armazenamento do aparelho.
 */

/** O cupom que a prévia conferiu e a Adri aplicou, com o que é preciso para nomeá-lo. */
export interface CupomAplicado {
  codigo: string
  tipo: 'percent' | 'fixed' | 'free_shipping'
  valor: number
  primeiraCompra: boolean
}

export type TipoDoCombinado = 'amount' | 'percent'

/** O desconto combinado, como está nos campos: o valor é o texto digitado. */
export interface DescontoCombinado {
  ligado: boolean
  tipo: TipoDoCombinado
  valor: string
  motivo: string
}

export const COMBINADO_DESLIGADO: DescontoCombinado = { ligado: false, tipo: 'amount', valor: '', motivo: '' }

/** O que a prévia recebe: só a escolha. Nunca preço, nunca o motivo. */
export interface PedidoDoResumo {
  lines: { product_id: string; variant_id: string | null; quantity: number; engraving_text: string | null }[]
  coupon_code: string | null
  manual_discount: { kind: TipoDoCombinado; value: number } | null
  customer_email: string
}

/** O valor digitado, como número, ou `null` (vazio, sem dígito). Em % a vírgula também é o decimal. */
export const valorDoCombinado = (c: Pick<DescontoCombinado, 'tipo' | 'valor'>): number | null => {
  if (c.tipo === 'amount') return parseBRL(c.valor)
  const limpo = c.valor.replace(/[^\d.,]/g, '').replace(',', '.')
  if (!/\d/.test(limpo)) return null
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

/** O desconto combinado que vai à prévia: ligado e com um valor acima de zero; o resto não entra. */
export const combinadoDaPrevia = (c: DescontoCombinado): PedidoDoResumo['manual_discount'] => {
  if (!c.ligado) return null
  const valor = valorDoCombinado(c)
  return valor !== null && valor > 0 ? { kind: c.tipo, value: valor } : null
}

/** O corpo da prévia, a partir da sacola, do cupom (aplicado, ou o que está sendo conferido) e do e-mail. */
export const pedidoDoResumo = (
  pecas: readonly LinhaDaSacola[],
  codigoDoCupom: string | null,
  combinado: DescontoCombinado,
  email: string,
): PedidoDoResumo => ({
  lines: pecas.map((l) => ({
    product_id: l.pecaId,
    variant_id: l.variacaoId,
    quantity: l.quantidade,
    engraving_text: l.gravacao === '' ? null : l.gravacao,
  })),
  coupon_code: codigoDoCupom,
  manual_discount: combinadoDaPrevia(combinado),
  customer_email: email.trim(),
})

/**
 * O motivo do bloqueio do passo 3, ou `null`. `recusaDoServidor` é a recusa do combinado que a prévia
 * devolveu (o desconto zerando os itens) — ela vem primeiro. O resto é a regra de `core`: o valor, o
 * percentual e o motivo (obrigatório, até 120).
 */
export const motivoDoPassoDescontos = (combinado: DescontoCombinado, recusaDoServidor: string | null): string | null => {
  if (!combinado.ligado) return null
  if (recusaDoServidor) return recusaDoServidor
  const valor = valorDoCombinado(combinado)
  return manualDiscountRefusal({ kind: combinado.tipo, value: valor ?? NaN, reason: combinado.motivo })
}

/** O nome do cupom ao lado do código: "10% de desconto", "Frete grátis", "5% na primeira compra". */
export const rotuloDoCupom = (cupom: CupomAplicado): string =>
  couponLabel({ type: cupom.tipo, value: cupom.valor }, { firstOrderOnly: cupom.primeiraCompra })

/** O código do cupom como a Adri digita: maiúsculas, sem espaço. */
export const codigoDigitado = (texto: string): string => texto.toUpperCase().replace(/\s/g, '')

// As frases do passo 3.
export const CUPOM = 'Cupom'
export const DICA_DO_CUPOM = 'Ex.: SAUDADE10'
export const APLICAR = 'Aplicar'
export const APLICANDO = 'Conferindo…'
export const REMOVER = 'Remover'
export const removerCupom = (codigo: string): string => `Remover o cupom ${codigo}`
export const A_MESMA_REGRA_DA_LOJA = 'A mesma regra do checkout da loja, com o e-mail desta cliente.'
export const DIGITE_O_CODIGO = 'Digite o código do cupom.'
export const CUPOM_NAO_CONFERIDO = 'Não consegui conferir o cupom agora. Tente de novo.'
export const CUPOM_DESCARTADO = 'A promoção vigente vale mais e não acumula com este cupom — o cupom não entra no total.'
export const DESCONTO_COMBINADO = 'Desconto combinado'
export const NOTA_DO_COMBINADO = 'O valor que você acertou com ela na conversa.'
export const EM_REAIS = 'Em reais'
export const EM_PERCENTUAL = 'Em %'
export const VALOR_EM_REAIS = 'Valor em reais'
export const VALOR_EM_PERCENTUAL = 'Valor em %'
export const MOTIVO = 'Motivo'
export const DICA_DO_MOTIVO = 'Ex.: segunda peça da família'
export const contagemDoMotivo = (n: number): string => `${n}/${MANUAL_REASON_MAX}`
export const MOTIVO_FICA_NO_HISTORICO = 'Escreva o motivo — ele fica no histórico.'
export const MOTIVO_SO_PARA_VOCE = 'Só para você. A cliente não vê o motivo.'
export const RECUSA_QUE_ZERA = PROPOSAL_ZERO_REFUSAL
export const RESUMO = 'Resumo'
export const CONFERINDO_O_RESUMO = 'Conferindo o resumo…'
export const RESUMO_NAO_CONFERIDO = 'Não consegui conferir o resumo agora. Este é o último que conferi.'
export const TENTAR_DE_NOVO = 'Tentar de novo'
export const subtotalDasPecas = (n: number): string => `Subtotal · ${n === 1 ? '1 peça' : `${n} peças`}`
export const PROMOCAO = 'Promoção'
export const cupomNoResumo = (codigo: string): string => `Cupom ${codigo}`
export const FRETE_GRATIS = 'frete grátis'
export const ITENS = 'Itens'
export const linhaDoPix = (total: number, percent: number): string =>
  `No PIX: ${formatPrice(total)} nos itens (${String(percent).replace('.', ',')}% de desconto). Frete à parte.`
export const menos = (valor: number): string => `− ${formatPrice(valor)}`
