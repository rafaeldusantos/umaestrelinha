// `CLI-12` — o CSV das clientes exporta **o filtro inteiro**, mesma régua de `PED-05`.
//
// Quem chama passa o resultado de `fetchAllFiltered`, que atravessa `readAllPages` e **falha** se a
// leitura truncar. Um CSV silenciosamente menor é indistinguível de um filtro mais estreito para
// quem o abre depois.

import { MATERIAL_KIND_LABELS } from '@estrelinha/core/material'
import type { CustomerListRow } from '@/entities/customer/api/customerQuery'

export const CUSTOMER_CSV_HEADERS = [
  'Nome',
  'E-mail',
  'Telefone',
  'CPF',
  'Origem',
  'Pedidos pagos',
  'Pedidos no total',
  'Gastou',
  'Ticket médio',
  'Primeira compra',
  'Última compra',
  'Materiais confiados',
  'Cadastros com este e-mail',
] as const

const dataBr = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

export const customerCsvRow = (c: CustomerListRow): (string | number)[] => [
  c.name ?? '',
  c.email,
  c.phone ?? '',
  c.cpf ?? '',
  c.has_account ? 'conta' : 'convidada',
  c.orders_paid,
  c.orders_total,
  // Só pedido aprovado entra — o mesmo critério que a tela declara em texto (`CLI-04`).
  Number(c.total_spent ?? 0).toFixed(2),
  c.avg_ticket !== null ? Number(c.avg_ticket).toFixed(2) : '',
  dataBr(c.first_order_at),
  dataBr(c.last_activity_at),
  (c.material_kinds ?? [])
    .map(k => MATERIAL_KIND_LABELS[k as keyof typeof MATERIAL_KIND_LABELS] ?? k)
    .join('; '),
  c.same_email_count,
]

export const buildCustomersCsv = (rows: CustomerListRow[]): string =>
  [CUSTOMER_CSV_HEADERS as unknown as string[], ...rows.map(customerCsvRow)]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

export const exportCustomersCsv = (rows: CustomerListRow[]) => {
  // BOM: sem ele o Excel em pt-BR abre em Latin-1 e "Leite materno" chega ilegível.
  const blob = new Blob(['\ufeff' + buildCustomersCsv(rows)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `clientes_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export const customerExportLabel = (total: number): string =>
  total === 0 ? 'Exportar' : `Exportar ${total} do filtro`
