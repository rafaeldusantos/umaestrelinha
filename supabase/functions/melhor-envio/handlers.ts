// Handlers da edge function `melhor-envio` — por enquanto, só a action `create` (feature `63`).
//
// Separado de `index.ts` por `AD-004`: sem `Deno.env` e sem import de `esm.sh` aqui, este módulo
// carrega no vitest. O client service-role, a função que fala com a API do Melhor Envio e o
// remetente entram por `CreateDeps` — e é isso que deixa `RET-15` ser provado por EXECUÇÃO
// (`__tests__/handlers.test.ts`: pedido de retirada, zero chamadas à API, zero gravação), em vez de
// por leitura de fonte, que a cada rodada de verificação achava uma forma sintática nova de comprar
// a etiqueta e passar.
//
// `quote`, `print` e `tracking` continuam em `index.ts`: nenhuma delas toca a retirada, e movê-las
// não compraria nada além de diff.
//
// Todo import aqui é relativo e com a extensão escrita: o Deno não resolve de outro jeito, e o
// bundler do CLI lê os especificadores por texto.
import { corsHeaders } from "../_shared/http.ts"
import { pickupGate } from "./pickupGate.ts"

/** A chamada à API do Melhor Envio: `path` relativo à base, devolve o JSON ou LANÇA em não-2xx. */
export type MeFetch = (path: string, options?: RequestInit) => Promise<any>

/** Tudo que `handleCreate` toca fora do próprio processo. O wiring (`index.ts`) fornece o real. */
export interface CreateDeps {
  // Client service-role. `any` porque o real vem de esm.sh e o dublê implementa só o que é usado.
  supabase: any
  meFetch: MeFetch
  /** O remetente (`MELHOR_ENVIO_SENDER_JSON`, já parseado). */
  sender: Record<string, any>
}

// ACTION: create — cart + checkout + generate
export async function handleCreate(deps: CreateDeps, body: any): Promise<Response> {
  const { order_id, service_id } = body
  if (!order_id || !service_id) {
    return new Response(JSON.stringify({ error: "order_id e service_id são obrigatórios" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { supabase, meFetch, sender: ME_SENDER } = deps

  // Fetch order + items
  const { data: order, error: orderErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single()
  if (orderErr || !order) {
    return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // RET-15: retirada no escritório não vai aos Correios. Recusa ANTES de qualquer chamada à API —
  // a primeira delas já põe a etiqueta no carrinho do Melhor Envio. O `select("*")` acima traz
  // `shipping_service_id`. Quem prova: `__tests__/handlers.test.ts`, executando.
  const recusaRetirada = pickupGate(order)
  if (recusaRetirada) {
    return new Response(JSON.stringify({ error: recusaRetirada.error }), {
      status: recusaRetirada.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", order_id)

  // Fetch product dimensions
  const productIds = (items || []).map((i: any) => i.product_id)
  const { data: productsData } = await supabase
    .from("products")
    .select("id, weight_kg, width_cm, height_cm, length_cm")
    .in("id", productIds)

  const dimMap = new Map((productsData || []).map((p: any) => [p.id, p]))

  const products = (items || []).map((item: any) => ({
    name: item.product_name,
    quantity: item.quantity,
    unitary_value: item.unit_price,
  }))

  // Calculate total volume for shipping
  let totalWeight = 0
  let maxWidth = 0, maxLength = 0, totalHeight = 0
  for (const item of (items || [])) {
    const dims: any = dimMap.get(item.product_id)
    const w = dims?.weight_kg || 0.1
    const wd = dims?.width_cm || 11
    const h = dims?.height_cm || 2
    const l = dims?.length_cm || 16
    totalWeight += w * item.quantity
    maxWidth = Math.max(maxWidth, wd)
    maxLength = Math.max(maxLength, l)
    totalHeight += h * item.quantity
  }

  // 1. Add to cart
  const cartPayload = {
    service: service_id,
    from: {
      name: ME_SENDER.name,
      phone: ME_SENDER.phone,
      email: ME_SENDER.email,
      document: ME_SENDER.document,
      address: ME_SENDER.address,
      number: ME_SENDER.number,
      complement: ME_SENDER.complement || "",
      district: ME_SENDER.district,
      city: ME_SENDER.city,
      state_abbr: ME_SENDER.state_abbr,
      country_id: "BR",
      postal_code: ME_SENDER.postal_code,
    },
    to: {
      name: order.customer_name,
      phone: "",
      email: order.customer_email,
      document: "",
      address: order.address_street || "",
      number: order.address_number || "",
      complement: order.address_complement || "",
      district: order.address_neighborhood || "",
      city: order.address_city || "",
      state_abbr: order.address_state || "",
      country_id: "BR",
      postal_code: order.address_zip || "",
    },
    products,
    volumes: [
      {
        height: Math.max(totalHeight, 2),
        width: Math.max(maxWidth, 11),
        length: Math.max(maxLength, 16),
        weight: Math.max(totalWeight, 0.1),
      },
    ],
    options: {
      insurance_value: order.total,
      receipt: false,
      own_hand: false,
    },
  }

  const cartData = await meFetch("/api/v2/me/cart", {
    method: "POST",
    body: JSON.stringify(cartPayload),
  })

  const shipmentId = cartData.id
  if (!shipmentId) {
    return new Response(JSON.stringify({ error: "Falha ao adicionar ao carrinho", details: cartData }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // 2. Checkout
  const checkoutData = await meFetch("/api/v2/me/shipment/checkout", {
    method: "POST",
    body: JSON.stringify({ orders: [shipmentId] }),
  })

  // 3. Generate label
  await meFetch("/api/v2/me/shipment/generate", {
    method: "POST",
    body: JSON.stringify({ orders: [shipmentId] }),
  })

  // 4. Get tracking info
  let trackingCode = ""
  let carrier = ""
  let protocol = ""
  try {
    const info = await meFetch(`/api/v2/me/shipment/tracking`, {
      method: "POST",
      body: JSON.stringify({ orders: [shipmentId] }),
    })
    if (info && Array.isArray(info) && info[0]) {
      trackingCode = info[0].tracking || ""
      protocol = info[0].protocol || ""
    }
  } catch {
    // tracking may not be available immediately
  }

  // Try to get carrier name from checkout data
  if (checkoutData && Array.isArray(checkoutData)) {
    const shipment = checkoutData.find((s: any) => s.id === shipmentId)
    if (shipment) {
      carrier = shipment.service || ""
      protocol = shipment.protocol || protocol
      trackingCode = shipment.tracking || trackingCode
    }
  }

  // Update order in DB
  await supabase
    .from("orders")
    .update({
      melhor_envio_id: shipmentId,
      melhor_envio_protocol: protocol,
      tracking_code: trackingCode || null,
      shipping_carrier: carrier || null,
    })
    .eq("id", order_id)

  return new Response(
    JSON.stringify({
      shipment_id: shipmentId,
      tracking_code: trackingCode,
      protocol,
      carrier,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  )
}
