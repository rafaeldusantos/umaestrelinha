import type { DbOrder } from '@estrelinha/supabase/types'
import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'

export const exportOrdersCsv = (orders: DbOrder[]) => {
  const headers = ['Número', 'Cliente', 'Email', 'Status', 'Pagamento', 'Subtotal', 'Desconto', 'Frete', 'Total', 'Rastreio', 'Data']
  const rows = orders.map(o => [
    o.order_number,
    o.customer_name,
    o.customer_email,
    STATUS_LABELS[o.status] ?? o.status,
    o.payment_method,
    o.subtotal.toFixed(2),
    o.discount.toFixed(2),
    o.shipping_cost.toFixed(2),
    o.total.toFixed(2),
    o.tracking_code ?? '',
    new Date(o.created_at).toLocaleDateString('pt-BR'),
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
