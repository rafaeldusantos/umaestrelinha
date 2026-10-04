// As opções de parcela do cartão digitado, e a escolhida — o que `InstallmentPicker` desenha e o
// que o CTA da página nomeia ("Pagar 3x de R$ 92,42").
//
// Um hook só para os dois leitores: a lista e o rótulo do botão não podem discordar sobre o valor
// da parcela. A tabela vem do Mercado Pago (`useCardInstallments`), o corte é a regra pura de
// `core` (`cardInstallmentOptions`) e a escolha mora no `checkoutStore`.
import { useMemo } from 'react'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import {
  CARD_INSTALLMENTS_CEILING,
  cardInstallmentOptions,
  resolveInstallments,
  type CardInstallmentOption,
} from '@estrelinha/core/payment/installments'
import { useCardInstallments } from '../api/useCardInstallments'
import { useCheckoutStore } from './checkoutStore'

export interface CardInstallmentsState {
  /** `idle`: o número do cartão ainda não foi reconhecido. */
  status: 'idle' | 'loading' | 'ready' | 'error'
  options: CardInstallmentOption[]
  /** A opção que vai no pagamento — sempre uma das `options` quando há opções. */
  selected: CardInstallmentOption | null
}

export function useCardInstallmentOptions(amount: number): CardInstallmentsState {
  const bin = useCheckoutStore((s) => s.cardBin)
  const chosen = useCheckoutStore((s) => s.cardInstallments)
  const { min_installment_value } = usePaymentSettings()
  const query = useCardInstallments(amount, bin)

  return useMemo(() => {
    if (!bin) return { status: 'idle', options: [], selected: null }
    if (query.isError) {
      // Sem a tabela não há como saber os juros de nenhuma parcela: só o à vista é verdadeiro.
      const options = cardInstallmentOptions(amount, [], min_installment_value)
      return { status: 'error', options, selected: options[0] ?? null }
    }
    if (!query.data) return { status: 'loading', options: [], selected: null }
    const options = cardInstallmentOptions(amount, query.data, min_installment_value)
    const selected = options.find((o) => o.count === chosen) ?? options[0] ?? null
    return { status: 'ready', options, selected }
  }, [bin, chosen, amount, min_installment_value, query.isError, query.data])
}

export interface CardInstallmentHeadline {
  /** A maior parcela sem juros (2x ou mais), ou `null` quando não há o que anunciar sem juros. */
  interestFree: { count: number; value: number } | null
  /** Até quantas vezes o cartão parcela, com ou sem juros. */
  maxCount: number
}

/**
 * O anúncio curto do cartão — "Até 3x de R$ 85,20 sem juros" ou "Parcele em até 10x" —, lido pelo
 * card de cartão do bloco Pagamento e pela linha do resumo do pedido.
 *
 * Com a tabela do Mercado Pago na mão, ele diz o que ela diz (a mesma da lista). Antes dela, vale
 * o anúncio das settings, o mesmo da vitrine. Escrito duas vezes, o resumo continuou dizendo
 * "4x sem juros" ao lado de uma lista com 3x (medido em navegador, 2026-10-04).
 */
export function useCardInstallmentHeadline(amount: number): CardInstallmentHeadline {
  const table = useCardInstallmentOptions(amount)
  const { max_installments, min_installment_value } = usePaymentSettings()

  return useMemo(() => {
    if (table.status === 'ready') {
      const free = table.options.filter((o) => o.interestFree && o.count > 1)
      const best = free[free.length - 1]
      return {
        interestFree: best ? { count: best.count, value: best.value } : null,
        maxCount: table.options[table.options.length - 1]?.count ?? 1,
      }
    }
    const advertised = resolveInstallments(amount, max_installments, min_installment_value)
    const ceiling = resolveInstallments(amount, CARD_INSTALLMENTS_CEILING, min_installment_value)
    return {
      interestFree: advertised && advertised.count > 1 ? advertised : null,
      maxCount: ceiling?.count ?? 1,
    }
  }, [table, amount, max_installments, min_installment_value])
}
