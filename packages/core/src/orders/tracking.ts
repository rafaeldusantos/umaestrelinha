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

// ---------------------------------------------------------------------------------------------
// Feature `75` (`MAA-12`, A8) — o código que a Adri digita no balcão do correio, no app do ateliê.
// ---------------------------------------------------------------------------------------------
// Sem formato imposto: Jadlog, Loggi e Melhor Envio não seguem a forma dos Correios, e recusar o
// código de uma transportadora real seria pior que deixar passar um erro de digitação. O mínimo de 8
// pega o código pela metade. Caixa e espaço não importam — `parcelTrackingUrl`, acima, já trata o
// código como insensível a caixa.
//
// **Vale só no app.** O painel não passa a validar, e o dono da escrita (`core/order-actions`) grava
// o código como o recebe: quem normaliza e recusa é a folha do app, antes de ir à rede.

/** Abaixo disto o código está pela metade (`A8`). */
export const TRACKING_CODE_MIN_LENGTH = 8

/** Sem nenhum espaço — inclusive os do meio, tab e quebra de linha — e em maiúsculas. */
export function normalizeTrackingCode(code: string | null | undefined): string {
  if (typeof code !== 'string') return ''
  return code.replace(/\s+/g, '').toUpperCase()
}

/**
 * A frase da folha quando o código não serve, ou `null` quando serve. `string | null`, e não união
 * discriminada por booleano (`strictNullChecks: false`).
 */
export function trackingCodeRefusal(code: string | null | undefined): string | null {
  return normalizeTrackingCode(code).length < TRACKING_CODE_MIN_LENGTH
    ? 'Confira o código — ele costuma ter 13 caracteres.'
    : null
}
