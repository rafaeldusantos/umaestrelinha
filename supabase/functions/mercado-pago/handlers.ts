// Handlers da edge function mercado-pago — I/O com dependências injetadas.
//
// Separado de index.ts (que só faz wiring) por AD-002/AD-004: sem `Deno.env` e sem import de
// `esm.sh` aqui, este módulo carrega no vitest, então o layer de I/O deixa de ser ponto cego.
// Toda dependência externa entra por `Deps` — client do Supabase, `fetch` e env.

import {
  applyOrderBump,
  resolveOrderPricing,
} from "../../../packages/core/src/payment/pricing.ts"
import { buildPayer, mergePayer } from "../../../packages/core/src/payment/payer.ts"
import {
  buildOrderPayload,
  extractPaymentId,
  extractPixData,
  type OrderPayload,
  pixExpiresAt,
  resolveCardOutcome,
} from "../../../packages/core/src/payment/orders.ts"
import { canTransition, mapMpStatus } from "../../../packages/core/src/payment/status.ts"
import {
  buildManifestCandidates,
  parseXSignature,
  validateWebhookSignature,
} from "../../../packages/core/src/payment/webhookSignature.ts"
// Preço por variação (07/T12). Mesmo precedente dos imports acima: caminho relativo `.ts`, sem
// import map — a função pura testada em vitest É a que roda no caixa, não uma cópia.
import { isPriceError, resolveItemPrice } from "../../../packages/core/src/pricing/index.ts"
// E-mail transacional (AD-005): import DIRETO do motor, no mesmo processo — sem hop HTTP para a
// function `send-email`. Um `fetch` entre duas functions do mesmo deploy exigiria inventar auth
// interna e pagaria um segundo cold start justamente no caminho do PIX. A `send-email` continua
// existindo: é a porta HTTP que o backoffice usa.
import { type EmailEnv, sendOrderEmail } from "../send-email/sender.ts"
import type { EmailType } from "../send-email/templates.ts"

/** Tudo que os handlers tocam fora do próprio processo. O wiring (index.ts) fornece o real. */
export interface Deps {
  // Client service-role. Tipado como `any` porque o import real vem de esm.sh (Deno) e o dublê
  // do teste implementa só a superfície usada — tipar aqui exigiria arrastar o SDK para o vitest.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fetch: typeof globalThis.fetch
  env: {
    mpAccessToken: string
    mpWebhookSecret: string
    /**
     * Liga a rejeição 422 quando o preço de um item não é resolvível (PST-09).
     *
     * **Nasce LIGADA.** A flag existe para cobrir a janela entre o deploy da edge function e o do
     * bundle da loja, em que abas já abertas ainda mandariam item sem `variant_id`. Com nada em
     * produção (confirmado em 2026-08-01) não há aba aberta nem pedido pendente, então o valor
     * seguro é o estrito. Ela fica no código para o dia em que houver um segundo deploy.
     *
     * Desligada, item não resolvível cai em `base_price` com log de aviso, em vez de 422.
     */
    strictVariantPricing: boolean
  }
  /** Env do e-mail transacional. Chave separada de `env` porque `env` é sobre o Mercado Pago. */
  email: EmailEnv
}

/**
 * Budget do e-mail a partir do `create-payment`: a cliente está esperando na tela e o front aborta em
 * 15s (`PAYMENT_TIMEOUT_MS`). O e-mail é o último passo e não pode competir com isso.
 */
const EMAIL_TIMEOUT_CREATE_MS = 2500

/** A partir do webhook não há ninguém esperando — quem espera é o MP, que retenta de todo jeito. */
const EMAIL_TIMEOUT_WEBHOOK_MS = 8000

/**
 * Dispara e-mail transacional sem NUNCA afetar o resultado do pagamento.
 *
 * O try/catch é carga estrutural, não decoração: `sendOrderEmail` promete não lançar, mas se um bug
 * quebrar essa promessa o throw subiria até o catch de `route` e viraria **500 no pagamento** — PIX
 * sem QR na tela, ou webhook em erro fazendo o MP retentar para sempre. E-mail que não sai é
 * aceitável; cobrança que falha não é.
 */
async function fireEmail(deps: Deps, orderId: string, type: EmailType, timeoutMs: number) {
  try {
    await sendOrderEmail(
      { supabase: deps.supabase, fetch: deps.fetch, env: deps.email },
      { orderId, type, timeoutMs },
    )
  } catch (err) {
    log({
      action: "email_dispatch_failed",
      order_id: orderId,
      type,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const MP_BASE = "https://api.mercadopago.com"

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

// Retentativa permitida (PAY-02): pending, rejected e expired podem gerar novo pagamento.
const RETRYABLE_STATUSES = ["pending", "rejected", "expired"]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * RTY-01/RTY-02: cancela no MP a order anterior do pedido, antes de criar a nova — é o que fecha
 * a janela de "dois PIX pagáveis para o mesmo pedido" que a Payments API não permitia fechar.
 *
 * Falhar aqui é resposta NORMAL, não excepcional: o MP só cancela orders em `created` ou
 * `action_required`, então uma order já processada devolve 4xx. Por isso a função nunca lança e
 * nunca bloqueia a retentativa — o guard reativo de segundo `approved` no webhook segue sendo a
 * rede de segurança. Devolve `true` só quando o MP confirmou o cancelamento.
 */
export async function cancelPreviousOrder(
  deps: Deps,
  mpOrderId: string,
  idempotencyKey: string,
): Promise<boolean> {
  try {
    const res = await deps.fetch(`${MP_BASE}/v1/orders/${mpOrderId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.env.mpAccessToken}`,
        "Content-Type": "application/json",
        // Derivada da chave do cliente: cancel e create são requisições distintas e não podem
        // compartilhar a mesma idempotência.
        "X-Idempotency-Key": `${idempotencyKey}-cancel`,
      },
    })
    if (res.ok) return true
    log({
      action: "create-payment",
      mp_order_id: mpOrderId,
      status: "previous_order_cancel_failed",
      mp_http: res.status,
    })
    return false
  } catch (_err) {
    log({
      action: "create-payment",
      mp_order_id: mpOrderId,
      status: "previous_order_cancel_failed",
    })
    return false
  }
}

// ACTION: create-payment — auth manual + ownership + guard de status (PAY-10)
//
// PGD-04: o pagador é montado AQUI, a partir de `customers` (cpf + name), e não do payload
// do cliente. BMP-04: o desconto do order bump também é aplicado aqui, dentro do mesmo
// `calculateOrderTotals` que a loja usa para exibir o total — é o que garante, por
// construção, que o valor exibido é o valor cobrado.
//
// ---------------------------------------------------------------------------------------
// ROTEIRO MANUAL — sandbox do Mercado Pago, API de **Orders** (T16 da 09; ver validation.md)
//
// Vocabulário: não existe mais `transaction_amount` nem `date_of_expiration` no corpo. O que
// se confere agora é `total_amount` (string, raiz da order), `transactions.payments[0].amount`
// (idêntico), `transactions.payments[0].payment_method` (o `statement_descriptor` do cartão e o
// `qr_code` do PIX vivem aí dentro) e `expiration_time` (duração ISO-8601 na raiz).
//
// Pré-requisitos:
//   supabase secrets set MERCADO_PAGO_ACCESS_TOKEN=... MERCADO_PAGO_WEBHOOK_SECRET=...
//   loja com VITE_MP_PUBLIC_KEY no .env do app store.
//
//   ⚠️ No ambiente LOCAL: o CLI monta no container do edge runtime **um bind mount por
//   arquivo importado**, calculado quando o container sobe. Importar um arquivo novo do
//   core (foi o caso de payer.ts e validators/cpf.ts) exige `supabase stop && supabase start`
//   — sem isso o worker responde 503 com "Module not found". Não é problema do código:
//   `deno check supabase/functions/mercado-pago/index.ts` passa (exit 0), e o deploy hosted
//   resolve o grafo de imports no bundle. É só a montagem local que fica velha.
//
//   ⚠️ SANDBOX: o MP recusa `payer.email` que não termine em `@testuser.com`
//   (`invalid_email_for_sandbox`). O e-mail do bloco Contato do checkout precisa ser o do
//   usuário de teste. E nem todo BIN de cartão de teste é aceito pela conta: o Mastercard
//   5031 4332 1540 6351 devolve `invalid_transaction_amount`; o Visa 4235 6477 2802 5682 passa.
//
// CONFERÊNCIA — pela API, não pelo painel (a API é evidência melhor e não exige login):
//   curl -s "https://api.mercadopago.com/v1/orders/<mp_order_id>" -H "Authorization: Bearer $TOKEN"
//   Traz `status`, `status_detail`, `total_amount`, `external_reference` e
//   `transactions.payments[]`. **Não traz `payer`** — nem no POST nem no GET (medido em T16),
//   então PGD-04 não é asseverável pela resposta do MP; a prova fica nos testes de `payer.ts`.
//
//   1) PIX COM CPF (caminho feliz de PGD-04)
//      · `update customers set cpf='39053344705' where id=<customer>;`
//      · checkout → PIX → CTA.
//      · Esperado: 200 com `qr_code` não vazio, e `orders.mp_order_id` + `orders.mp_payment_id`
//        gravados. Formatos reais medidos: `ORDTST01K…` para a order e `PAY01K…` para o
//        payment — não `01J…`/`pay_…` como a spec supunha.
//
//   2) CARTÃO COM CPF DIVERGENTE DO BRICK (o do pedido vence)
//      · No Brick, digitar um CPF diferente do que está em `customers.cpf`.
//      · Esperado: `mergePayer` manda o CPF de `customers`. Não observável pela API (ver acima).
//
//   2b) DESCRITOR DE FATURA (ORD-03) — **CONFIRMADO em T16**: o MP aceita
//      `statement_descriptor` dentro de `transactions.payments[0].payment_method` e o devolve
//      na resposta (`"statement_descriptor": "UMA ESTRELINHA"`). A posição do payload está certa.
//
//   3) PEDIDO SEM CPF (o defeito que esta feature veio corrigir)
//      · `update customers set cpf=null where id=<customer>;`
//      · Esperado: HTTP 422 com a mensagem de CPF obrigatório, log `missing_payer_cpf` e
//        NENHUMA order criada no MP (`orders.mp_order_id` continua null).
//
//   4) BUMP: EXIBIDO == COBRADO, COM CUPOM `percent` (BMP-04)
//      · store_settings.checkout = { order_bump_enabled: true, order_bump_product_id: <p>,
//        order_bump_discount_percent: 50 }, com <p> fora do carrinho e com estoque.
//      · Marcar o bump, aplicar um cupom `percent`, anotar o rótulo do CTA, acionar.
//      · Esperado: rótulo == `orders.total` == `total_amount` da order no MP, até o centavo.
//        Conferir `bump_applied: true` no log estruturado.
//
//   5) BUMP DESLIGADO
//      · order_bump_enabled=false com o mesmo produto no carrinho.
//      · Esperado: preço cheio cobrado e `bump_applied: false` no log.
//
//   6) CARTÃO RECUSADO (refuta a Assumption nº3; STA-04)
//      · Titular **OTHE** no Brick (o MP decide o desfecho pelo nome do titular).
//      · Medido em T16: **HTTP 402**, corpo `{ errors:[…], data:{ order } }` — a order vem
//        aninhada em `data`, não na raiz. `status: "failed"`, `status_detail` da order
//        `"failed"`, e o detalhe útil (`"rejected_by_issuer"`) só em
//        `transactions.payments[0].status_detail`. **Não** é da família `cc_rejected_*`.
//      · Já tratado: a order é resolvida da raiz OU de `data` (D3), o detalhe vem do payment
//        (D6) e `friendlyMessage` conhece `rejected_by_issuer` + a ponte de prefixo (D4).
//        Esperado agora: **200** com `{ status: 'rejected', status_detail: 'rejected_by_issuer' }`
//        e `mp_order_id` gravado (a order recusada existe no MP e não pode ficar órfã).
//
//   7) WEBHOOK
//      · Order aprovada → `payment_status='approved'`, `paid_at` preenchido, estoque baixado
//        uma vez; reenviar a mesma notificação → no-op (`applied:false`, sem 2º decremento).
//      · O manifest é `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`. O template oficial
//        lowerceia o `data.id`, mas isso vinha de um exemplo com id NUMÉRICO: no tópico `order`
//        o id é MAIÚSCULO e o lowercase derrubava o HMAC (8/8 em 401 no T16). A validação tenta
//        o id como recebido e depois em minúsculas (D2).
// ---------------------------------------------------------------------------------------
export async function createPayment(deps: Deps, req: Request, body: any) {
  const { order_id, method, idempotency_key } = body
  if (!order_id || !["pix", "card"].includes(method) || !idempotency_key) {
    return json(
      { error: "order_id, method (pix|card) e idempotency_key são obrigatórios" },
      400,
    )
  }

  const authHeader = req.headers.get("Authorization") || ""
  const jwt = authHeader.replace(/^Bearer\s+/i, "")
  if (!jwt) return json({ error: "Não autenticado" }, 401)

  const supabase = deps.supabase
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt)
  const user = userData?.user
  if (userError || !user) return json({ error: "Não autenticado" }, 401)

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single()
  if (orderError || !order) return json({ error: "Pedido não encontrado" }, 404)

  // A mesma leitura serve para o ownership e para o pagador (PGD-04): cpf e name saem do
  // servidor, nunca do payload do cliente.
  let customer: { user_id?: string | null; cpf?: string | null; name?: string | null } | null = null
  if (order.customer_id) {
    const { data } = await supabase
      .from("customers")
      .select("user_id, cpf, name")
      .eq("id", order.customer_id)
      .single()
    customer = data
  }
  const ownerUserId = customer?.user_id ?? null
  if (!ownerUserId || ownerUserId !== user.id) {
    return json({ error: "Pedido não pertence ao usuário autenticado" }, 403)
  }

  if (!RETRYABLE_STATUSES.includes(order.payment_status)) {
    return json(
      { error: `Pedido não pode ser pago (payment_status=${order.payment_status})` },
      409,
    )
  }

  // PGD-04: pagador identificado é pré-requisito — para PIX e para cartão. `buildPayer` omite
  // `identification` quando o CPF não passa no dígito verificador, então este guard cobre
  // "ausente" e "sujo" de uma vez. Falhar aqui (antes de qualquer escrita ou chamada ao MP) é
  // o ponto da feature: um PIX sem pagador identificado é recusado pelo banco.
  const orderPayer = buildPayer({
    name: customer?.name || order.customer_name || "",
    email: order.customer_email,
    cpf: customer?.cpf || "",
  })
  if (!orderPayer.identification) {
    log({ action: "create-payment", order_id, status: "missing_payer_cpf", payer_cpf_present: false })
    return json(
      {
        error:
          "Informe um CPF válido para pagar. O Mercado Pago exige o CPF do pagador para emitir o PIX e para processar o cartão.",
      },
      422,
    )
  }

  // --- Recálculo server-side (PAY-03): nunca confiar no valor vindo do client ---
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("id, product_id, quantity, unit_price, variant_id, price_source")
    .eq("order_id", order_id)
  if (itemsError || !items?.length) {
    return json({ error: "Pedido sem itens" }, 422)
  }

  // order_items.product_id é TEXT; products.id é uuid — só ids uuid válidos entram no join.
  const productIds = [
    ...new Set(items.map((i: any) => i.product_id).filter((id: string) => UUID_RE.test(id))),
  ]
  const basePriceByProductId = new Map<string, number>()
  if (productIds.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, base_price")
      .in("id", productIds)
    for (const p of products || []) basePriceByProductId.set(String(p.id), Number(p.base_price))
  }

  const variantIds = [
    ...new Set(items.map((i: any) => i.variant_id).filter((id: unknown): id is string => !!id)),
  ]
  const variantById = new Map<string, { product_id: string; price: number | null }>()
  if (variantIds.length) {
    const { data: variants } = await supabase
      .from("product_variants")
      .select("id, product_id, price")
      .in("id", variantIds)
    for (const v of variants || []) {
      variantById.set(String(v.id), {
        product_id: String(v.product_id),
        price: v.price === null || v.price === undefined ? null : Number(v.price),
      })
    }
  }

  const pricingContext = { basePriceByProductId, variantById }

  // Resolve o preço item a item por `resolveItemPrice` (@estrelinha/core/pricing) — a MESMA função
  // pura que o admin e a loja usam, coberta por 36 testes em vitest. O que ela garante e o mapa
  // `priceById` de antes não garantia: o caminho de preço é o **gravado no item**, e preço não
  // resolvível vira ERRO, não o `unit_price` que veio do cliente.
  const resolvedUnitPrice = new Map<string, number>()
  const pricingItems: { product_id: string; unit_price: number; quantity: number }[] = []

  for (const i of items as any[]) {
    const productId = String(i.product_id)

    // Pin personalizado (A3): `product_id` sintético, sem linha em `products`. Mantém o
    // comportamento de hoje — `unit_price` do item — porque não há o que resolver.
    if (!UUID_RE.test(productId)) {
      const unit = Number(i.unit_price)
      pricingItems.push({ product_id: productId, unit_price: unit, quantity: i.quantity })
      resolvedUnitPrice.set(String(i.id), unit)
      continue
    }

    const resolution = resolveItemPrice(
      {
        product_id: productId,
        variant_id: i.variant_id ?? null,
        price_source: (i.price_source ?? "base") as "base" | "variant",
      },
      pricingContext,
    )

    if (isPriceError(resolution)) {
      if (deps.env.strictVariantPricing) {
        log({
          action: "create-payment",
          order_id,
          status: "price_not_resolvable",
          code: resolution.error.code,
          item_id: i.id,
          product_id: productId,
          variant_id: i.variant_id ?? null,
        })
        // 422 ANTES de qualquer chamada ao MP: pedido impagável não vira cobrança.
        return json(
          { error: `Não foi possível precificar um item do pedido. ${resolution.error.message}` },
          422,
        )
      }

      // Flag desligada: cai em `base_price` com aviso. Só existe para uma janela de deploy.
      const fallback = basePriceByProductId.get(productId)
      log({
        action: "create-payment",
        order_id,
        status: "variant_pricing_lenient",
        code: resolution.error.code,
        item_id: i.id,
        product_id: productId,
        fell_back_to_base: fallback !== undefined,
      })
      if (fallback === undefined) {
        return json({ error: `Produto ${productId} não encontrado para precificação.` }, 422)
      }
      pricingItems.push({ product_id: productId, unit_price: fallback, quantity: i.quantity })
      resolvedUnitPrice.set(String(i.id), fallback)
      continue
    }

    pricingItems.push({
      product_id: productId,
      unit_price: resolution.price,
      quantity: i.quantity,
    })
    resolvedUnitPrice.set(String(i.id), resolution.price)
  }

  // BMP-04: a oferta do bump é do lojista (store_settings), nunca do payload do cliente —
  // um flag `is_order_bump` vindo do browser seria input não confiável.
  const { data: checkoutSettings } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "checkout")
    .maybeSingle()
  const bump = {
    enabled: checkoutSettings?.value?.order_bump_enabled === true,
    product_id: checkoutSettings?.value?.order_bump_product_id ?? null,
    discount_percent: Number(checkoutSettings?.value?.order_bump_discount_percent ?? 0),
  }

  // `applyOrderBump` devolve a MESMA referência quando não aplica — daí o teste de identidade.
  // Só o `bumpApplied` do log estruturado depende disto: quem aplica o desconto para valer é
  // `resolveOrderPricing`, a partir de `pricingItems` (preço CHEIO) mais o objeto `bump`.
  const bumpedItems = applyOrderBump(pricingItems, bump)
  const bumpApplied = bumpedItems !== pricingItems

  const now = new Date()

  // PRM-11: as promoções vigentes vêm do BANCO, nunca do payload — mesma regra do bump, e pelo
  // mesmo motivo (um `promotion_id` vindo do browser seria input não confiável).
  //
  // `active` e vigência são avaliados AQUI, em TypeScript, e não como `.eq`/`.gte`/`.lte` na query.
  // É exatamente o que a validação de cupom logo abaixo já faz — ler a linha e decidir em JS — e é
  // o que mantém a decisão "esta promoção vale agora?" dentro da superfície que o dublê de
  // `supabase-js` cobre (`AD-004`). Empurrada para o SQL, ela só seria verificável contra o banco
  // real, e é uma decisão de dinheiro: precisa de teste.
  const { data: promotionRows } = await supabase
    .from("promotions")
    .select(
      "id, discount_kind, scope, stacks_with_coupon, active, valid_from, valid_until, created_at, promotion_tiers(min_qty, value)",
    )

  const livePromotions = (promotionRows || []).filter((p: any) => {
    // Promoção sem faixa nenhuma não desconta nada — edge case explícito da spec.
    if (!(p.promotion_tiers || []).length) return false
    if (p.active !== true) return false
    if (p.valid_from && new Date(p.valid_from) > now) return false
    if (p.valid_until && new Date(p.valid_until) < now) return false
    return true
  })

  // D1: elegibilidade sai da view `promotion_eligible_products` (categoria + descendência), filtrada
  // pelos produtos DESTE pedido. Nunca de `category_links` do carrinho, que é snapshot de
  // `localStorage` e pode ter dias — divergir do servidor aqui é o defeito que a 17 existe para matar.
  const eligibleByPromotion = new Map<string, string[]>()
  const scoped = livePromotions.filter((p: any) => p.scope !== "all")
  if (scoped.length && productIds.length) {
    const { data: eligibleRows } = await supabase
      .from("promotion_eligible_products")
      .select("promotion_id, product_id")
      .in("promotion_id", scoped.map((p: any) => String(p.id)))
      .in("product_id", productIds)
    for (const row of (eligibleRows || []) as any[]) {
      const key = String(row.promotion_id)
      const known = eligibleByPromotion.get(key)
      if (known) known.push(String(row.product_id))
      else eligibleByPromotion.set(key, [String(row.product_id)])
    }
  }

  const promotions = livePromotions.map((p: any) => ({
    id: String(p.id),
    discount_kind: p.discount_kind,
    tiers: (p.promotion_tiers || []).map((t: any) => ({
      min_qty: Number(t.min_qty),
      value: Number(t.value),
    })),
    scope: p.scope,
    eligibleProductIds: eligibleByPromotion.get(String(p.id)) ?? [],
    stacks_with_coupon: p.stacks_with_coupon === true,
    created_at: String(p.created_at),
  }))

  // Cupom validado em coupons; inválido no momento do pagamento → segue como `null`.
  // Quem calcula o desconto é `resolveOrderPricing`, com a MESMA `resolveCouponDiscount` que a loja
  // usa — aqui só se decide se o cupom vale.
  let coupon: { type: "percent" | "fixed" | "free_shipping"; value: number } | null = null
  if (order.coupon_id) {
    const { data: couponRow } = await supabase
      .from("coupons")
      .select("type, value, active, valid_from, valid_until, max_uses, used_count")
      .eq("id", order.coupon_id)
      .maybeSingle()
    const valid =
      couponRow &&
      couponRow.active &&
      (!couponRow.valid_from || new Date(couponRow.valid_from) <= now) &&
      (!couponRow.valid_until || new Date(couponRow.valid_until) >= now) &&
      (couponRow.max_uses == null || couponRow.used_count < couponRow.max_uses)
    if (valid) {
      coupon = { type: couponRow.type, value: Number(couponRow.value) }
    } else {
      log({ action: "create-payment", order_id, status: "coupon_invalid" })
    }
  }

  const { data: paymentSettings } = await supabase
    .from("store_settings")
    .select("value")
    .eq("key", "payment")
    .maybeSingle()
  const pixDiscountPercent = Number(paymentSettings?.value?.pix_discount_percent ?? 0)

  // `resolveOrderPricing` é o ponto ÚNICO que decide o total, e a loja chama o mesmo (`AD-015`):
  // promoção e cupom não somam — vale o de menor total final. O `shipping` que entra é o COTADO;
  // quem zera para cupom `free_shipping` é a própria função, porque comparar os dois caminhos pelo
  // total exige que o frete já esteja resolvido nos dois.
  let pricing
  try {
    pricing = resolveOrderPricing({
      items: pricingItems,
      shipping: Number(order.shipping_cost || 0),
      pixDiscountPercent,
      method,
      bump,
      coupon,
      promotions,
    })
  } catch (_err) {
    return json({ error: "Total do pedido inválido: menor que R$ 0,01" }, 422)
  }
  const totals = pricing.totals

  // PRM-12 — A GUARDA DE TETO.
  //
  // `orders.promotion_discount` foi gravado na CRIAÇÃO do pedido, pela loja: é número escrito pelo
  // cliente. Por isso ele nunca é o valor cobrado (`PAY-03` — o total cobrado é sempre o recálculo
  // deste servidor); ele serve para responder uma pergunta só: "o desconto piorou depois de a
  // cliente ver o total?".
  //
  // Recalculado MENOR que o exibido ⇒ cobrar agora seria cobrar mais caro do que a tela prometeu.
  // 422 antes de qualquer chamada ao MP, e a loja recarrega. É o único caminho de erro que esta
  // feature adiciona, e existe porque a alternativa é a loja mentir sobre preço.
  //
  // Recalculado igual ou MAIOR ⇒ passa direto. Promoção que melhorou entre o pedido e o pagamento
  // deixa a cliente pagar menos; recusar um pagamento por isso seria erro onde não havia problema.
  //
  // Por que um valor alto forjado não é exploração: ele só torna o 422 mais provável — auto-
  // infligido. Não existe caminho em que o número do cliente vire o valor cobrado.
  const displayedPromotionDiscount = Number(order.promotion_discount || 0)
  if (pricing.promotionDiscount < displayedPromotionDiscount) {
    log({
      action: "create-payment",
      order_id,
      status: "promotion_no_longer_valid",
      displayed_discount: displayedPromotionDiscount,
      recomputed_discount: pricing.promotionDiscount,
    })
    return json(
      {
        error:
          "A promoção deste pedido mudou. Recarregue a sacola para ver o novo total antes de pagar.",
        code: "promotion_no_longer_valid",
      },
      422,
    )
  }

  // `orders.promotion_id` é FK única e não representa "duas". Com sobreposição (D6) — um botton em
  // duas promoções vigentes — grava `null` e deixa a verdade em `promotion_discount`, em vez de
  // eleger arbitrariamente uma das duas e fazer o relatório do admin mentir sobre qual campanha
  // gerou o desconto. Quem pergunta "este pedido teve promoção?" pergunta por `promotion_discount`.
  const appliedPromotionId =
    pricing.applied.length === 1 ? pricing.applied[0].promotion_id : null

  // Persiste o recálculo COMPLETO antes de cobrar (PST-01 AC 10).
  //
  // Antes daqui só `pix_discount` e `total` eram gravados. Com preço por variação isso passa a
  // mentir: o item continuaria mostrando 14,90 num pedido que cobrou 18,40, e o histórico do
  // cliente, o e-mail e o backoffice leriam o número errado. `subtotal` e cada
  // `order_items.unit_price` acompanham.
  const { error: persistError } = await supabase
    .from("orders")
    .update({
      subtotal: totals.subtotal,
      pix_discount: totals.pixDiscount,
      total: totals.total,
      // Gravados com o valor RECALCULADO, nunca com o que veio do cliente: depois do pagamento é
      // esta linha que o resumo, o e-mail e o backoffice leem.
      promotion_id: appliedPromotionId,
      promotion_discount: pricing.promotionDiscount,
    })
    .eq("id", order_id)
  if (persistError) {
    return json({ error: "Falha ao atualizar o pedido" }, 500)
  }

  // Um update por item: o `unit_price` recalculado difere por linha, e o supabase-js não expressa
  // um UPDATE ... FROM (VALUES ...) em uma chamada. São poucos itens por pedido.
  for (const i of items as any[]) {
    const resolved = resolvedUnitPrice.get(String(i.id))
    if (resolved === undefined || resolved === Number(i.unit_price)) continue
    const { error: itemPersistError } = await supabase
      .from("order_items")
      .update({ unit_price: resolved })
      .eq("id", i.id)
    if (itemPersistError) {
      return json({ error: "Falha ao atualizar os itens do pedido" }, 500)
    }
  }

  // --- POST /v1/orders (ORD-01…ORD-05) ---
  // O corpo é montado por `buildOrderPayload` (domínio puro): envelope da order, valores como
  // string e `payer` na RAIZ. A expiração agora é a duração `PT30M` da própria order — o antigo
  // `date_of_expiration` (timestamp calculado aqui) deixou de existir.
  let orderPayload: OrderPayload
  if (method === "card") {
    const card = body.card
    if (!card?.token || !card?.payment_method_id || !card?.payer?.email) {
      return json({ error: "Dados do cartão incompletos" }, 400)
    }
    orderPayload = buildOrderPayload({
      orderId: order_id,
      total: totals.total,
      // PGD-04: um único CPF canônico por pedido — o do pedido sobrescreve o do Brick.
      payer: mergePayer(card.payer, orderPayer),
      method: "card",
      card: {
        token: card.token,
        payment_method_id: card.payment_method_id,
        installments: Number(card.installments || 1),
      },
    })
  } else {
    orderPayload = buildOrderPayload({
      orderId: order_id,
      total: totals.total,
      // PGD-04: email + first_name + last_name + identification (a API do MP recusa PIX no
      // Brasil sem o pagador identificado).
      payer: orderPayer,
      method: "pix",
    })
  }

  // O corpo é EXATAMENTE o que `buildOrderPayload` produz — nada é acrescentado aqui.
  //
  // A Orders API valida o corpo por schema fechado: qualquer propriedade extra derruba a
  // requisição inteira com `unsupported_properties`. Foi o que aconteceu com `notification_url`
  // (medido no T16: HTTP 400, `additionalProperties '$.notification_url' not allowed`), que na
  // Payments API era legítimo na raiz. A URL de notificação passa a viver **só** no painel da
  // aplicação — e o T16 confirmou que as notificações chegam normalmente por lá.
  const payload: OrderPayload = orderPayload

  // RTY-01: só depois de o payload estar montado — cancelar antes de validar o cartão destruiria
  // a order anterior para devolver 400. O guard de status acima já restringe a `pending`,
  // `rejected` e `expired`; a condição fica explícita porque é a regra, não um efeito colateral.
  if (order.mp_order_id && RETRYABLE_STATUSES.includes(order.payment_status)) {
    await cancelPreviousOrder(deps, String(order.mp_order_id), idempotency_key)
  }

  let mpRes: Response
  try {
    mpRes = await deps.fetch(`${MP_BASE}/v1/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deps.env.mpAccessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotency_key,
      },
      body: JSON.stringify(payload),
    })
  } catch (_err) {
    log({ action: "create-payment", order_id, status: "mp_unreachable" })
    return json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, 502)
  }

  const mpBody = await mpRes.json().catch(() => null)
  // D3 (medido no T16): numa recusa de cartão o MP responde HTTP 402 com a order aninhada em
  // `data`, não na raiz. Uma order que EXISTE no MP é DESFECHO DE NEGÓCIO, não falha de
  // transporte: tratá-la como erro 4xx devolvia 400 genérico (a mensagem nem está em `message`,
  // está em `errors[0].message`) e deixava a order ÓRFÃ — criada no MP e sem `mp_order_id` no
  // pedido. Por isso a order é resolvida das duas posições.
  const mp = mpBody?.id ? mpBody : mpBody?.data?.id ? mpBody.data : null

  // 5xx e 2xx-sem-order continuam sendo indisponibilidade: gravar id vazio é pior do que pedir
  // para tentar de novo (ORD-07).
  if (mpRes.status >= 500 || !mp) {
    if (mpRes.ok || mpRes.status >= 500 || !mpBody) {
      log({ action: "create-payment", order_id, status: "mp_unavailable", mp_http: mpRes.status })
      return json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, 502)
    }
    // 4xx sem order resolvível: repassa mensagem segura (sem vazar credenciais). O Orders põe o
    // texto em `errors[0].message`; `message` na raiz é o formato da Payments API.
    log({ action: "create-payment", order_id, status: "mp_rejected_request", mp_http: mpRes.status })
    const mpMessage = mpBody.errors?.[0]?.message ?? mpBody.message
    const message = typeof mpMessage === "string" && mpMessage
      ? mpMessage
      : "Não foi possível criar o pagamento"
    return json({ error: message }, 400)
  }

  // PER-02: os dois ULIDs do Orders. `mp.id` é o da ORDER (`ORDTST01K…` em sandbox); o do PAYMENT
  // (`PAY01K…`) mora dentro de `transactions.payments[0]` e é o que a RPC e o painel usam.
  const mpOrderId = String(mp.id)
  const mpPaymentId = extractPaymentId(mp)

  // Desfecho síncrono. Só o CARTÃO tem regra própria (STA-03): `action_required` fora do
  // `waiting_transfer` é desafio 3DS, e a loja não apresenta desafio — deixar `pending` prenderia
  // a cliente até o expirador de 24h, então é recusa (AD-003). No PIX, `action_required` é o
  // caminho feliz (aguardando a transferência) e vale o mapa direto.
  const cardOutcome = method === "card" ? resolveCardOutcome(mp) : null
  const syncStatus = cardOutcome ? cardOutcome.status : mapMpStatus(mp.status ?? "")
  // D6: na recusa, o `status_detail` da RAIZ é o genérico `"failed"`; o acionável
  // (`rejected_by_issuer`) vive em `transactions.payments[0]`. `resolveCardOutcome` já resolve essa
  // preferência, então o cartão usa o detalhe dele — é o que a tela passa para `friendlyMessage`.
  const statusDetail = cardOutcome ? cardOutcome.statusDetail : mp.status_detail ?? null

  await supabase
    .from("orders")
    .update({
      mp_order_id: mpOrderId,
      mp_payment_id: mpPaymentId,
      mp_status_detail: statusDetail,
      ...(syncStatus === "rejected" ? { payment_status: "rejected" } : {}),
    })
    .eq("id", order_id)

  // Resposta síncrona approved (cartão) → efeitos idempotentes via RPC service-role.
  // O BOOLEANO da RPC é capturado (antes era descartado): ele é o único sinal de "aprovou AGORA" vs
  // "já estava aprovado", e é o que impede o e-mail de sair duas vezes numa corrida entre este
  // caminho e o webhook do mesmo cartão.
  let approvalApplied = false
  if (syncStatus === "approved") {
    const { data: rpcApplied, error: rpcError } = await supabase.rpc("apply_payment_approval", {
      p_order_id: order_id,
      p_mp_payment_id: mpPaymentId,
      p_status_detail: statusDetail,
    })
    if (rpcError) {
      log({
        action: "create-payment",
        order_id,
        mp_order_id: mpOrderId,
        mp_payment_id: mpPaymentId,
        status: "rpc_error",
        message: rpcError.message,
      })
    }
    approvalApplied = rpcApplied === true
  }

  // `payer_cpf_present` e `bump_applied` são booleanos de propósito — o CPF nunca entra no log.
  // `mp_http` só aparece quando a resposta NÃO foi 2xx: é o que deixa visível no log um desfecho de
  // negócio que chegou por 402 (D3), em vez de ele se confundir com um caminho feliz.
  log({
    action: "create-payment",
    order_id,
    mp_order_id: mpOrderId,
    mp_payment_id: mpPaymentId,
    status: mp.status,
    ...(mpRes.ok ? {} : { mp_http: mpRes.status }),
    bump_applied: bumpApplied,
    // PRM-13: no mesmo molde do `bump_applied`, e pelo mesmo motivo — é por este campo que o
    // roteiro de sandbox confere que a faixa que a tela mostrou é a faixa que o servidor aplicou.
    promotion_id: appliedPromotionId,
    tier_min_qty: pricing.applied.length === 1 ? pricing.applied[0].tier_min_qty : null,
    promotions_applied: pricing.applied.length,
    payer_cpf_present: Boolean(orderPayer.identification),
  })

  // E-mail transacional. Hoistado do return do PIX para cá porque o guard de `qr_code` precisa do
  // valor extraído: `extractPixData` devolve `qr_code: ''` quando o MP não trouxe QR (ORD-06), e
  // mandar "seu PIX está pronto" sem QR é mentira — `syncStatus === 'pending'` sozinho não exclui
  // esse caso.
  //
  // Cartão aprovado recebe SÓ `order_paid`; cartão recusado não recebe nada (a loja já mostra
  // `friendlyMessage` com a cliente na tela, e `rejected` é retentável).
  const pix = method === "pix" ? extractPixData(mp) : null
  const emailType: EmailType | null = approvalApplied
    ? "order_paid"
    : method === "pix" && syncStatus === "pending" && pix?.qr_code
      ? "order_received"
      : null
  if (emailType) {
    await fireEmail(deps, order_id, emailType, EMAIL_TIMEOUT_CREATE_MS)
  }

  if (method === "pix") {
    // D5: `expires_at` é calculado aqui, não lido da order — o MP ecoa a duração `PT30M` que
    // recebeu, e `new Date("PT30M")` é Invalid Date no cronômetro da tela. O contrato da loja
    // (`qr_code`, `qr_code_base64`, `expires_at`) fica idêntico.
    return json({ ...pix, expires_at: pixExpiresAt(new Date()) })
  }
  // Contrato preservado: a loja compara `status === 'approved'` e passa `status_detail` para
  // `friendlyMessage` — por isso o vocabulário interno, não o do MP.
  return json({ status: syncStatus, status_detail: statusDetail ?? "" })
}

// ACTION: webhook — assinatura HMAC (PAY-05), transições guardadas (PAY-04),
// efeitos idempotentes via RPC (PAY-07), mp_status_detail sempre gravado (PAY-12).
export async function webhook(deps: Deps, req: Request, url: URL) {
  const body = await req.json().catch(() => ({}))
  const dataIdRaw = url.searchParams.get("data.id") ?? body?.data?.id ?? null
  const dataId = dataIdRaw != null ? String(dataIdRaw) : null
  const signatureHeader = req.headers.get("x-signature")
  const requestId = req.headers.get("x-request-id")
  const ts = parseXSignature(signatureHeader)?.ts ?? null

  // D2: o `data.id` do tópico `order` vem em MAIÚSCULAS, e o lowercase do template oficial (escrito
  // para o id NUMÉRICO do tópico de pagamentos) muda a string e derruba o HMAC — 8/8 notificações
  // reais em 401 no T16. Aceita no PRIMEIRO candidato que casar.
  //
  // Isso não afrouxa a validação: os candidatos são derivações do próprio `data.id` recebido, e
  // cada um exige um HMAC válido com o segredo. Assinatura ausente, adulterada ou de outro segredo
  // continua falhando em todos os candidatos.
  let validSignature = false
  for (const manifest of buildManifestCandidates({ dataId, requestId, ts })) {
    if (await validateWebhookSignature(signatureHeader, manifest, deps.env.mpWebhookSecret)) {
      validSignature = true
      break
    }
  }
  if (!validSignature) {
    log({ action: "webhook", status: "invalid_signature" })
    return json({ error: "Assinatura inválida" }, 401)
  }

  // WHK-01: corte seco no tópico do Orders. `type: "payment"` (API antiga) não tem dado legado
  // para tratar — responde recebido, sem efeito.
  if (body?.type !== "order" || !dataId) {
    return json({ received: true })
  }

  // Nunca confia no payload: consulta a order na API do MP. `data.id` do webhook É o mp_order_id.
  let mpRes: Response
  try {
    mpRes = await deps.fetch(`${MP_BASE}/v1/orders/${dataId}`, {
      headers: { Authorization: `Bearer ${deps.env.mpAccessToken}` },
    })
  } catch (_err) {
    log({ action: "webhook", mp_order_id: dataId, status: "mp_unreachable" })
    return json({ error: "Mercado Pago indisponível" }, 502)
  }
  const mp = await mpRes.json().catch(() => null)
  if (!mpRes.ok || !mp?.id) {
    log({ action: "webhook", mp_order_id: dataId, status: "mp_lookup_failed", mp_http: mpRes.status })
    return json({ error: "Falha ao consultar order" }, 502)
  }

  const mpOrderId = String(mp.id)
  const mpPaymentId = extractPaymentId(mp)
  const statusDetail = mp.status_detail ?? null
  const supabase = deps.supabase

  const ORDER_COLUMNS = "id, payment_status, mp_payment_id, mp_order_id"

  // WHK-03: localiza pedido por external_reference; fallback por mp_order_id (cobre a order que
  // o MP conhece mas cujo external_reference não voltou na consulta).
  let order: any = null
  if (mp.external_reference && UUID_RE.test(String(mp.external_reference))) {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", String(mp.external_reference))
      .maybeSingle()
    order = data
  }
  if (!order) {
    const { data } = await supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("mp_order_id", mpOrderId)
      .maybeSingle()
    order = data
  }
  if (!order) {
    log({ action: "webhook", mp_order_id: mpOrderId, status: "order_not_found" })
    return json({ received: true })
  }

  const target = mapMpStatus(mp.status)
  if (!target) {
    log({
      action: "webhook",
      order_id: order.id,
      mp_order_id: mpOrderId,
      mp_payment_id: mpPaymentId,
      status: "unknown_mp_status",
    })
    return json({ received: true })
  }

  let applied = false
  if (target === "approved") {
    if (order.payment_status === "approved" && order.mp_order_id && order.mp_order_id !== mpOrderId) {
      // WHK-04: segundo approved de OUTRA order (PIX pago após troca de método). Não regride nem
      // reaplica efeitos; grava o marcador greppável para atenção do admin.
      log({
        action: "webhook",
        order_id: order.id,
        mp_order_id: mpOrderId,
        mp_payment_id: mpPaymentId,
        status: "duplicate_approved_other_order",
      })
      await supabase
        .from("orders")
        .update({
          mp_status_detail:
            `duplicate_approved_other_order: ${mpOrderId} (${statusDetail ?? "sem detalhe"})`,
        })
        .eq("id", order.id)
      return json({ received: true })
    }
    if (order.payment_status === "approved" || canTransition(order.payment_status, "approved")) {
      const { data: rpcApplied, error: rpcError } = await supabase.rpc("apply_payment_approval", {
        p_order_id: order.id,
        p_mp_payment_id: mpPaymentId,
        p_status_detail: statusDetail,
      })
      if (rpcError) {
        log({
          action: "webhook",
          order_id: order.id,
          mp_order_id: mpOrderId,
          mp_payment_id: mpPaymentId,
          status: "rpc_error",
          message: rpcError.message,
        })
        return json({ error: "Falha ao aplicar aprovação" }, 500)
      }
      applied = rpcApplied === true
      // D7: a RPC grava só `mp_payment_id` (o SQL dela não muda). Sem esta escrita, um pedido
      // localizado por `external_reference` fica `approved` com `mp_order_id` null — medido no T16 —
      // e o fallback de lookup do WHK-03 fica cego para a próxima notificação da mesma order.
      if (order.mp_order_id !== mpOrderId) {
        await supabase.from("orders").update({ mp_order_id: mpOrderId }).eq("id", order.id)
      }
    }
  } else if (canTransition(order.payment_status, target)) {
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: target,
        mp_status_detail: statusDetail,
        ...(order.mp_payment_id ? {} : { mp_payment_id: mpPaymentId }),
      })
      .eq("id", order.id)
    applied = !updateError
  }

  if (!applied) {
    // Transição ignorada / RPC no-op (webhook duplicado): grava só o detail.
    await supabase.from("orders").update({ mp_status_detail: statusDetail }).eq("id", order.id)
  }

  log({
    action: "webhook",
    order_id: order.id,
    mp_order_id: mpOrderId,
    mp_payment_id: mpPaymentId,
    status: mp.status,
    applied,
  })

  // O guard é `target === "approved" && applied`, NÃO só `applied`: as transições de não-aprovação
  // acima também setam `applied = true`, então um webhook de `refunded`/`expired`/`cancelled`
  // mandaria "pagamento aprovado". E `applied === false` (webhook reentregue, RPC no-op) não manda
  // nada — é o que faz a reentrega do MP ser silenciosa.
  if (target === "approved" && applied) {
    await fireEmail(deps, order.id, "order_paid", EMAIL_TIMEOUT_WEBHOOK_MS)
  }

  return json({ received: true })
}

/**
 * Roteamento por `action` (molde melhor-envio). Vive aqui, e não dentro do `Deno.serve`, para ser
 * testável: `index.ts` apenas entrega as deps reais e serve. Erro não previsto vira 500 com a
 * mensagem, preservando o comportamento anterior.
 */
export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get("action")

    switch (action) {
      case "create-payment": {
        const body = req.method === "POST" ? await req.json().catch(() => ({})) : {}
        return await createPayment(deps, req, body)
      }
      case "webhook":
        return await webhook(deps, req, url)
      default:
        return json({ error: "action inválida. Use: create-payment, webhook" }, 400)
    }
  } catch (err) {
    log({ action: "error", message: err instanceof Error ? err.message : String(err) })
    return json({ error: err instanceof Error ? err.message : "Erro interno" }, 500)
  }
}
