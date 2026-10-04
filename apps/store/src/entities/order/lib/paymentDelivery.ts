// Pagamento e entrega do pedido — os rótulos e as linhas do endereço (feature 59, `DET-11`).
// Puro, fora do componente: o arquivo de UI exporta só componente (Fast Refresh).

/**
 * As formas de pagamento que um pedido pode ter: as duas da loja (`pix`, `card`) e as que vieram
 * com os pedidos da Nuvemshop (`credit_card`, `boleto`, `manual`). Valor desconhecido não vira
 * texto técnico na tela da cliente.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'PIX',
  card: 'Cartão de crédito',
  credit_card: 'Cartão de crédito',
  boleto: 'Boleto',
  manual: 'Combinado com a loja',
}

export const paymentMethodLabel = (method: string | null | undefined): string =>
  PAYMENT_METHOD_LABELS[(method ?? '').trim()] ?? 'Outra forma de pagamento'

export interface OrderDeliveryInput {
  payment_method: string | null
  paid_at?: string | null
  customer_name?: string | null
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
}

export const limpo = (v: string | null | undefined): string => (v ?? '').trim()

/**
 * As linhas do endereço: nome · rua, número, complemento · bairro · cidade/UF · CEP. Linha sem
 * dado some inteira — nunca uma vírgula ou uma barra sobrando.
 */
export const addressLines = (o: OrderDeliveryInput): string[] => {
  const rua = [o.address_street, o.address_number, o.address_complement].map(limpo).filter(Boolean)
  const cidade = [o.address_city, o.address_state].map(limpo).filter(Boolean).join('/')
  return [limpo(o.customer_name), rua.join(', '), limpo(o.address_neighborhood), cidade].filter(Boolean)
}
