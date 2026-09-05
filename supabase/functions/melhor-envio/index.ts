import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const ME_TOKEN = Deno.env.get("MELHOR_ENVIO_TOKEN")!
const ME_SENDER = JSON.parse(Deno.env.get("MELHOR_ENVIO_SENDER_JSON") || "{}")
const ME_BASE = Deno.env.get("MELHOR_ENVIO_ENV") === "production"
  ? "https://melhorenvio.com.br"
  : "https://sandbox.melhorenvio.com.br"

const supabaseUrl = Deno.env.get("SUPABASE_URL")!
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

/**
 * Um client service-role por processo. Antes cada handler criava o seu, o que além de desperdício
 * espalhava a credencial mais forte do sistema por três lugares.
 */
const adminClient = () => createClient(supabaseUrl, supabaseKey)

/**
 * `quote` é a ÚNICA ação pública — é a cliente, possivelmente convidada, cotando o carrinho antes de
 * ter conta. Todo o resto é da dona.
 *
 * A lista é de **liberação**, não de bloqueio, e isso é deliberado: com uma lista de bloqueio, uma
 * ação nova nasceria pública por esquecimento. Aqui ela nasce fechada.
 */
const PUBLIC_ACTIONS = new Set(["quote"])

type AuthOutcome = { ok: true; userId: string } | { ok: false; status: number; error: string }

/**
 * Mesmo molde de `send-email/handlers.ts` — de propósito, para não existir uma segunda definição de
 * "admin" nas edge functions.
 *
 * `verify_jwt = false` no `config.toml` e checagem manual aqui, porque `verify_jwt = true` seria
 * teatro: a anon key pública É um JWT válido do projeto e passaria pelo gateway. O que importa é o
 * papel, e papel só se checa dentro do handler.
 *
 * Três casos fecham o acesso de quem não é a dona:
 *  - sem header           → 401
 *  - anon key como bearer → JWT válido, mas sem `sub`; `getUser` erra → 401
 *  - cliente logada       → `getUser` passa, `has_role` é falso → 403
 *
 * Falha da RPC **fecha** o acesso e loga distinto: indisponibilidade do banco não pode virar porta
 * aberta para comprar etiqueta.
 */
async function requireAdmin(req: Request): Promise<AuthOutcome> {
  const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim()
  if (jwt === "") return { ok: false, status: 401, error: "Não autenticado" }

  const supabase = adminClient()
  const { data, error } = await supabase.auth.getUser(jwt)
  const user = data?.user
  if (error || !user?.id) return { ok: false, status: 401, error: "Não autenticado" }

  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  })
  if (roleError) {
    console.log(JSON.stringify({
      action: "melhor-envio",
      status: "admin_check_failed",
      message: String(roleError.message ?? roleError),
    }))
    return { ok: false, status: 403, error: "Acesso restrito ao admin" }
  }
  if (isAdmin !== true) return { ok: false, status: 403, error: "Acesso restrito ao admin" }

  return { ok: true, userId: user.id }
}

function meHeaders() {
  return {
    Authorization: `Bearer ${ME_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    // A API do Melhor Envio EXIGE identificacao no User-Agent (nome + e-mail de contato);
    // sem isso ela recusa a chamada. O e-mail e o mesmo do default de `store_settings.general`.
    "User-Agent": "Uma Estrelinha (contato@umaestrelinha.com.br)",
  }
}

async function meFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${ME_BASE}${path}`, {
    ...options,
    headers: { ...meHeaders(), ...(options.headers || {}) },
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(JSON.stringify(data))
  }
  return data
}

// ACTION: quote — cotação de frete
async function handleQuote(body: any) {
  const { postal_code_to, products } = body
  if (!postal_code_to || !products?.length) {
    return new Response(JSON.stringify({ error: "postal_code_to e products são obrigatórios" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const payload = {
    from: { postal_code: ME_SENDER.postal_code },
    to: { postal_code: postal_code_to },
    products: products.map((p: any) => ({
      id: p.id || "1",
      width: p.width || 11,
      height: p.height || 2,
      length: p.length || 16,
      weight: p.weight || 0.1,
      insurance_value: p.insurance_value || p.price || 10,
      quantity: p.quantity || 1,
    })),
  }

  const data = await meFetch("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  // Filter only available services
  const available = Array.isArray(data)
    ? data.filter((s: any) => !s.error).map((s: any) => ({
        id: s.id,
        name: s.name,
        company: s.company?.name,
        company_picture: s.company?.picture,
        price: s.custom_price || s.price,
        discount: s.discount,
        delivery_time: s.custom_delivery_time || s.delivery_time,
        delivery_range: s.delivery_range,
        currency: s.currency,
      }))
    : []

  return new Response(JSON.stringify(available), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ACTION: create — cart + checkout + generate
async function handleCreate(body: any) {
  const { order_id, service_id } = body
  if (!order_id || !service_id) {
    return new Response(JSON.stringify({ error: "order_id e service_id são obrigatórios" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const supabase = adminClient()

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
    const dims = dimMap.get(item.product_id)
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
  const generateData = await meFetch("/api/v2/me/shipment/generate", {
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

// ACTION: print — get label PDF URL
async function handlePrint(body: any) {
  const { shipment_id, order_id } = body
  if (!shipment_id) {
    return new Response(JSON.stringify({ error: "shipment_id é obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const data = await meFetch("/api/v2/me/shipment/print", {
    method: "POST",
    body: JSON.stringify({ orders: [shipment_id] }),
  })

  const labelUrl = data?.url || null

  if (labelUrl && order_id) {
    const supabase = adminClient()
    await supabase
      .from("orders")
      .update({ melhor_envio_label_url: labelUrl })
      .eq("id", order_id)
  }

  return new Response(JSON.stringify({ label_url: labelUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

// ACTION: tracking — check delivery status
async function handleTracking(body: any) {
  const { shipment_id } = body
  if (!shipment_id) {
    return new Response(JSON.stringify({ error: "shipment_id é obrigatório" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  const data = await meFetch("/api/v2/me/shipment/tracking", {
    method: "POST",
    body: JSON.stringify({ orders: [shipment_id] }),
  })

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get("action")
    const body = req.method === "POST" ? await req.json() : {}

    // Choke point ÚNICO da autorização. Ficar aqui, e não dentro de cada handler, é o que faz uma
    // ação nova nascer fechada: quem esquecer de mexer nesta linha ganha 401, não uma porta aberta.
    //
    // Sem isto, `create` era um endpoint público que comprava etiqueta com o saldo da carteira e
    // escrevia em `orders` com service role, a partir de um `order_id` de qualquer origem.
    if (!PUBLIC_ACTIONS.has(action ?? "")) {
      const auth = await requireAdmin(req)
      if (!auth.ok) {
        return new Response(JSON.stringify({ error: auth.error }), {
          status: auth.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }
    }

    switch (action) {
      case "quote":
        return await handleQuote(body)
      case "create":
        return await handleCreate(body)
      case "print":
        return await handlePrint(body)
      case "tracking":
        return await handleTracking(body)
      default:
        return new Response(
          JSON.stringify({ error: "action inválida. Use: quote, create, print, tracking" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        )
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  }
})
