// Retirada no escritório (feature 63, `AD-049`) — domínio puro.
//
// A retirada NÃO é uma cotação: não passa pelo Melhor Envio, não entra em `ShippingQuote` (`id`
// numérico) nem em `ALLOWED_SHIPPING_SERVICE_IDS`. Ela é uma segunda origem de opção, derivada de
// `store_settings` (`shipping.pickup_enabled` + `material`) e do CEP — e as perguntas "o CEP é do
// RS?", "a retirada está disponível?" e "este pedido é de retirada?" têm UM dono, este arquivo.
// Quem pergunta: a calculadora da página do produto, o checkout, a function `checkout` (que recusa
// a retirada forjada), a `melhor-envio` (que não gera etiqueta) e o pós-compra.
//
// ⚠️ Este arquivo NÃO importa nada, de propósito: as edge functions o importam por caminho
// relativo, e no Deno todo especificador relativo precisa da extensão explícita — inclusive os de
// tipo. Um alias de pacote aqui derrubaria o worker antes da primeira linha.
// `shipping/__tests__/denoReach.test.ts` guarda isso.

/** O que vai em `orders.shipping_service_id`. Os ids do Melhor Envio são numéricos: não colide. */
export const PICKUP_SERVICE_ID = 'retirada'
/** O que vai em `orders.shipping_method`, e o rótulo da escolha nas telas. */
export const PICKUP_METHOD_NAME = 'Retirada no escritório'
/** O que vai em `orders.shipping_carrier`: quem "entrega" é a própria loja. */
export const PICKUP_CARRIER = 'Uma Estrelinha'
/** O motivo da recusa do servidor (`422`), o mesmo texto que a tela trata. */
export const PICKUP_REFUSAL = 'pickup_unavailable'

/**
 * O CEP é do Rio Grande do Sul? Faixa oficial dos Correios: `90000-000` a `99999-999`.
 *
 * Síncrona de propósito — a mesma resposta na página do produto, no checkout e no servidor, sem
 * consulta externa. Exige exatamente 8 dígitos depois de tirar a máscara.
 */
export function isRsCep(cep: string | null | undefined): boolean {
  const digits = String(cep ?? '').replace(/\D/g, '')
  return digits.length === 8 && digits[0] === '9'
}

/**
 * O endereço do escritório, na forma que `MaterialSettings` grava. Estrutural — compatível com
 * `MaterialSettings` sem importá-lo (o tipo mora num pacote que o Deno não alcança).
 */
export interface PickupAddress {
  street?: string | null
  neighborhood?: string | null
  city?: string | null
  state?: string | null
}

/**
 * A linha `Escritório - Uma Estrelinha - {rua}, {bairro}, {cidade}/{UF}` (RET-01), ou `null` quando
 * rua, bairro ou cidade estão em branco — "Escritório - , , " seria pior que não mostrar nada.
 *
 * **Nunca lê o número nem o complemento** (RET-03): a linha é o que aparece para qualquer cliente
 * do RS que calcula frete, antes de ela comprar.
 */
export function pickupLocation(material: PickupAddress | null | undefined): string | null {
  const street = material?.street?.trim() ?? ''
  const neighborhood = material?.neighborhood?.trim() ?? ''
  const city = material?.city?.trim() ?? ''
  const state = material?.state?.trim() ?? ''
  if (!street || !neighborhood || !city) return null
  const cidade = state ? `${city}/${state}` : city
  return `Escritório - ${PICKUP_CARRIER} - ${street}, ${neighborhood}, ${cidade}`
}

/**
 * A retirada aparece para este CEP? Ligada **e** endereço completo **e** CEP do RS (RET-02, RET-05).
 *
 * `enabled` é estrito (`=== true`): quem lê o jsonb cru (a edge function) precisa resolver o
 * default antes de chamar — o default do TypeScript é `DEFAULT_SHIPPING.pickup_enabled`.
 */
export function pickupAvailable(input: {
  enabled: boolean | null | undefined
  material: PickupAddress | null | undefined
  cep: string | null | undefined
}): boolean {
  return input.enabled === true && isRsCep(input.cep) && pickupLocation(input.material) !== null
}

/**
 * Recusa de um pedido de retirada no servidor (RET-12). `string | null`, nunca união discriminada
 * por booleano — com `strictNullChecks: false` ela não estreita.
 *
 * Além da disponibilidade, o custo tem de ser exatamente `0`: o servidor confia em `shipping_cost`
 * do navegador, e esta feature fecha o caso da retirada.
 */
export function pickupRefusal(input: {
  enabled: boolean | null | undefined
  material: PickupAddress | null | undefined
  zip: string | null | undefined
  cost: number
}): string | null {
  if (!pickupAvailable({ enabled: input.enabled, material: input.material, cep: input.zip })) {
    return PICKUP_REFUSAL
  }
  if (input.cost !== 0) return PICKUP_REFUSAL
  return null
}

/** O pedido é de retirada? Pela coluna que já existia — sem migration de coluna. */
export function isPickupOrder(
  order: { shipping_service_id?: string | null } | null | undefined,
): boolean {
  return order?.shipping_service_id === PICKUP_SERVICE_ID
}
