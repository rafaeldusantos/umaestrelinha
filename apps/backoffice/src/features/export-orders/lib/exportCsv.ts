// `PED-05` / `PED-06` — o CSV exporta **o filtro inteiro**, e diz o que o pedido está esperando.
//
// ---------------------------------------------------------------------------------------------
// O DEFEITO QUE ISTO DESFAZ
// ---------------------------------------------------------------------------------------------
// `exportOrdersCsv(orders)` recebia as ≤20 linhas **já carregadas na página**, enquanto o rodapé ao
// lado do botão dizia "148 pedido(s)". Ninguém era avisado: baixava-se um arquivo com 20 linhas
// acreditando que eram 148, e um CSV a menos é indistinguível de um filtro mais estreito para quem
// o abre depois.
//
// Agora quem chama passa o resultado de `fetchAllFiltered`, que atravessa `readAllPages` e **falha**
// se a leitura truncar. E o botão traz o total no rótulo, para o número estar do lado do clique.
//
// As cinco colunas novas respondem o que a planilha não respondia: em que estado está o material,
// se o pagamento virou dinheiro, qual o rastreio do envelope, quando ele chegou, e **há quantos dias
// aquilo está parado** — que é a pergunta que faz alguém exportar a fila para começar.

import { MATERIAL_STATUS_LABELS, toMaterialStatus } from '@estrelinha/core/material'
import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import {
  PAYMENT_STATUS_LABELS, rowQueueAge, type AdminOrderRow,
} from '@/entities/order/api/orderQuery'

export const CSV_HEADERS = [
  'Número',
  'Cliente',
  'Email',
  'Status',
  'Pagamento',
  'Situação do pagamento',
  'Estado do material',
  'Rastreio do envelope (entrada)',
  'Material recebido em',
  'Dias parado',
  'Total',
  'Rastreio da joia (saída)',
  'Data',
] as const

const dataBr = (iso: string | null): string => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

export const orderCsvRow = (o: AdminOrderRow, now?: Date): (string | number)[] => {
  const idade = rowQueueAge(o, now)

  return [
    o.order_number,
    o.customer_name,
    o.customer_email,
    STATUS_LABELS[o.status] ?? o.status,
    o.payment_method,
    PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status,
    MATERIAL_STATUS_LABELS[toMaterialStatus(o.material_status)] ?? '',
    o.material_tracking_code ?? '',
    dataBr(o.material_received_at),
    // O número cru, não a frase: quem exporta vai ordenar e filtrar por ele numa planilha.
    idade ? idade.days : '',
    (o.total ?? 0).toFixed(2),
    o.tracking_code ?? '',
    dataBr(o.created_at),
  ]
}

/** O conteúdo do arquivo, separado do download — é a parte testável sem DOM. */
export const buildOrdersCsv = (orders: AdminOrderRow[], now?: Date): string =>
  [CSV_HEADERS as unknown as string[], ...orders.map(o => orderCsvRow(o, now))]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

export const exportOrdersCsv = (orders: AdminOrderRow[]) => {
  // `﻿`: sem o BOM, o Excel em pt-BR abre o arquivo em Latin-1 e "Cinzas de cremação" chega
  // ilegível para quem for conferir a fila.
  const blob = new Blob(['﻿' + buildOrdersCsv(orders)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

/** O rótulo do botão, que carrega o total — `PED-05`. */
export const exportLabel = (total: number): string =>
  total === 0 ? 'Exportar' : `Exportar ${total} do filtro`
