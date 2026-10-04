// O link de rastreio do pacote de SAÍDA — o botão "Acompanhar entrega" do detalhe (feature `59`,
// `DET-03`).
//
// `orders.tracking_code` é a remessa ateliê → cliente. Não confundir com
// `orders.material_tracking_code`, que é o envelope de ENTRADA (cliente → ateliê) e nunca vai a
// este link.
//
// ⚠️ O formato do link direto do Melhor Rastreio NÃO está documentado: ele reconhece a
// transportadora pelo próprio código, e o endereço abaixo é premissa a confirmar em navegador na
// validação. Por isso ele mora numa constante só — se estiver errado, o conserto é uma linha.
//
// Zero import, de propósito: o diretório é alcançado pelo Deno.

export const PARCEL_TRACKING_BASE_URL = 'https://www.melhorrastreio.com.br/rastreio/'

/** O endereço do rastreio, ou `null` quando não há código — e aí o cartão não aparece (`DET-04`). */
export function parcelTrackingUrl(code: string | null | undefined): string | null {
  if (typeof code !== 'string') return null
  const codigo = code.trim().toUpperCase()
  if (codigo === '') return null
  return `${PARCEL_TRACKING_BASE_URL}${encodeURIComponent(codigo)}`
}
