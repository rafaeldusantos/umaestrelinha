// A linha sob o valor na tela de aprovado (`PaymentApproved`). Mora fora do componente porque o
// arquivo de componente só pode exportar componente (Fast Refresh), e a régua tem teste próprio.
import { formatPrice } from '@estrelinha/core/formatters'

/** A linha sob o valor: o meio, e no cartão parcelado, a parcela que a fatura vai mostrar. */
export const approvedNote = (
  method: 'pix' | 'card',
  installments?: { count: number; value: number } | null,
): string => {
  if (method === 'pix') return 'pagos com PIX'
  if (installments && installments.count > 1) {
    return `no cartão, em ${installments.count}x de ${formatPrice(installments.value)}`
  }
  return 'pagos no cartão'
}
