// `PED-15` — um chip por filtro ativo, com o `×` que o desfaz.
//
// Função pura, separada do componente, porque é REGRA (qual filtro vira chip e o que o `x` remove)
// e não apresentação — e porque exportar função + componente do mesmo arquivo quebra o fast refresh.
//
// O chip existe para responder "por que esta lista está assim?" sem obrigar ninguém a reabrir cada
// dropdown. É a metade visível do `PED-04`: o botão diz quantos filtros há, e os chips dizem quais.

import { MATERIAL_STATUS_LABELS, toMaterialStatus } from '@estrelinha/core/material'
import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { ORDER_VIEWS, type OrderFilters } from '@/entities/order/api/orderQuery'

export interface OrderFilterChip {
  key: string
  label: string
  clear: (filters: OrderFilters) => OrderFilters
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'pendente',
  approved: 'aprovado',
  rejected: 'recusado',
  refunded: 'estornado',
  expired: 'expirado',
  cancelled: 'cancelado',
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
  manual: 'Manual',
}

const lista = (valores: string[], rotulos: Record<string, string>): string =>
  valores.map(v => rotulos[v] ?? v).join(', ')

const dataCurta = (iso: string): string => new Date(iso).toLocaleDateString('pt-BR')

export const buildOrderChips = (filters: OrderFilters, search = ''): OrderFilterChip[] => {
  const chips: OrderFilterChip[] = []

  // A visão vira chip quando não é uma das duas "sem recorte". `Precisa de ação` é a padrão e
  // `Tudo` não esconde nada — as outras quatro escondem linhas e precisam se anunciar.
  if (filters.view !== 'precisa-acao' && filters.view !== 'tudo') {
    const rotulo = ORDER_VIEWS.find(v => v.id === filters.view)?.label ?? filters.view
    chips.push({
      key: 'view',
      label: `Visão: ${rotulo}`,
      clear: f => ({ ...f, view: 'tudo' }),
    })
  }

  if (search.trim() !== '') {
    chips.push({
      key: 'search',
      label: `Busca: ${search.trim()}`,
      // A busca é estado da tela e não de `filters` — quem limpa é o chamador, e o chip só devolve
      // os filtros intactos. Sinalizar isso por `key` evita um segundo dono do termo de busca.
      clear: f => f,
    })
  }

  if (filters.statuses.length > 0) {
    chips.push({
      key: 'status',
      label: `Status: ${lista(filters.statuses, STATUS_LABELS)}`,
      clear: f => ({ ...f, statuses: [] }),
    })
  }

  if (filters.materialStatuses.length > 0) {
    const rotulos = Object.fromEntries(
      filters.materialStatuses.map(s => [s, MATERIAL_STATUS_LABELS[toMaterialStatus(s)] ?? s]),
    )
    chips.push({
      key: 'material',
      label:
        filters.materialStatuses.length > 2
          ? `Material: na fila (${filters.materialStatuses.length} estados)`
          : `Material: ${lista(filters.materialStatuses, rotulos)}`,
      clear: f => ({ ...f, materialStatuses: [] }),
    })
  }

  if (filters.paymentStatuses.length > 0) {
    chips.push({
      key: 'payment-status',
      label: `Pagamento: ${lista(filters.paymentStatuses, PAYMENT_STATUS_LABELS)}`,
      clear: f => ({ ...f, paymentStatuses: [] }),
    })
  }

  if (filters.paymentMethods.length > 0) {
    chips.push({
      key: 'payment-method',
      label: `Meio: ${lista(filters.paymentMethods, PAYMENT_METHOD_LABELS)}`,
      clear: f => ({ ...f, paymentMethods: [] }),
    })
  }

  if (filters.semRastreio) {
    chips.push({
      key: 'sem-rastreio',
      label: 'Sem rastreio de saída',
      clear: f => ({ ...f, semRastreio: false }),
    })
  }

  if (filters.dateFrom || filters.dateTo) {
    const de = filters.dateFrom ? dataCurta(filters.dateFrom) : '—'
    const ate = filters.dateTo ? dataCurta(filters.dateTo) : '—'
    chips.push({
      key: 'date',
      label: `Período: ${de} a ${ate}`,
      clear: f => ({ ...f, dateFrom: null, dateTo: null }),
    })
  }

  return chips
}
