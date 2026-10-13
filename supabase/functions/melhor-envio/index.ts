import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1"

// Feature `49`: dono único em `_shared/http.ts` — eram três cópias idênticas nas functions.
import { corsHeaders } from "../_shared/http.ts"
import { requireAdmin } from "../_shared/auth.ts"
// Quais fretes a loja oferece (Correios PAC e SEDEX) tem dono único em `core` — as três telas que
// cotam leem esta resposta, então filtrar aqui vale para as três.
import {
  ALLOWED_SHIPPING_SERVICES_PARAM,
  isAllowedShippingService,
} from "../../../packages/core/src/shipping/services.ts"
// Feature `63` (RET-15): a action `create` mora em `handlers.ts` (`AD-004`), com o client, a chamada
// à API e o remetente injetados — é o que deixa a recusa da retirada ser provada EXECUTANDO
// (`__tests__/handlers.test.ts`), e não lendo este arquivo. Aqui fica só a fiação.
import { handleCreate } from "./handlers.ts"

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

/**
 * Feature `61`: a checagem de admin tem dono único em `_shared/auth.ts` — esta era uma de TRÊS
 * cópias (com `admin-users` e `send-notification`), iguais no comportamento e diferentes só no
 * rótulo do log. Os três desfechos continuam os mesmos:
 *
 *  - sem header           → 401
 *  - anon key como bearer → JWT válido, mas sem `sub`; `getUser` erra → 401
 *  - cliente logada       → `getUser` passa, `has_role` é falso → 403
 *
 * Falha da RPC **fecha** o acesso e loga distinto: indisponibilidade do banco não pode virar porta
 * aberta para comprar etiqueta.
 */
const exigirAdmin = (req: Request) => requireAdmin({ supabase: adminClient() }, req, "melhor-envio")

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
    // Pede à API só os serviços oferecidos; o filtro abaixo garante o mesmo se ela ignorar o campo.
    services: ALLOWED_SHIPPING_SERVICES_PARAM,
  }

  const data = await meFetch("/api/v2/me/shipment/calculate", {
    method: "POST",
    body: JSON.stringify(payload),
  })

  // Só serviços disponíveis E oferecidos pela loja (Correios PAC e SEDEX).
  const available = Array.isArray(data)
    ? data.filter((s: any) => !s.error && isAllowedShippingService(s.id)).map((s: any) => ({
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
      const auth = await exigirAdmin(req)
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
        return await handleCreate({ supabase: adminClient(), meFetch, sender: ME_SENDER }, body)
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
