// A compra no GA4, enviada pelo SERVIDOR (feature 61 · CMP-02..08, `AD-047`).
//
// O `purchase` tem um dono só: esta função, chamada pela `mercado-pago` no instante em que
// `apply_payment_approval` devolve `applied` — no cartão síncrono e no webhook. O navegador não
// consegue garantir "uma vez só": o PIX aprovado com a aba fechada nunca chegaria, e um F5 na
// confirmação contaria duas.
//
// A regra pura (decidir, montar o corpo, a URL) vem de `core/analytics/purchase.ts`, importada por
// caminho relativo com extensão explícita — Deno não conhece os alias. Aqui fica só o I/O:
//
//   1. **reivindicar** o envio — `update … set ga_purchase_status = 'sending' where id = $1 and
//      ga_purchase_status is null returning …`. É a contenção barata contra o segundo caminho de
//      aprovação (corrida cartão × webhook, webhook reentregue): quem não reivindica não envia;
//   2. ler a configuração e a chave, e decidir (`purchaseDecision`);
//   3. ler os itens e montar o corpo (`buildPurchaseBody`);
//   4. `POST` ao Measurement Protocol com orçamento próprio (`AbortController`, `AD-008`);
//   5. gravar `sent`/`failed`/`skipped_*` e o instante.
//
// **Nunca lança, e nunca registra a URL** — ela carrega a chave secreta na query string. O log diz
// o pedido, o desfecho e o status HTTP, e mais nada.

import {
  buildPurchaseBody,
  measurementProtocolUrl,
  purchaseDecision,
  type PurchaseDecision,
} from "../../../packages/core/src/analytics/purchase.ts"
import type { AnalyticsItemInput } from "../../../packages/core/src/analytics/items.ts"
// O ARQUIVO, nunca o barrel de `core/product`: o barrel importa `@estrelinha/supabase/types`, e o
// Deno não resolve alias nem no grafo de tipos.
import {
  displayCategoryLinksFromRows,
  displayCategorySlug,
} from "../../../packages/core/src/product/displayCategory.ts"

/** O que `sendPurchase` toca. É um recorte de `Deps` da `mercado-pago` — o chamador passa o seu. */
export interface PurchaseDeps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fetch: typeof globalThis.fetch
  /** A origem pública da loja (`STORE_PUBLIC_URL`) — de onde sai o host para `traffic_type`. */
  storePublicUrl: string | null | undefined
  /** Relógio injetável; padrão `Date.now`. */
  now?: () => number
}

/** O orçamento do `POST` ao Google, separado do das notificações (`AD-008`). */
export const PURCHASE_BUDGET_MS = 2000

/** As colunas que a reivindicação devolve — nada de nome, e-mail, telefone, CPF ou endereço. */
const COLUNAS_DA_COMPRA =
  "id, order_number, total, shipping_cost, discount, promotion_discount, pix_discount, coupon_code, ga_client_id, ga_session_id, analytics_declined"

/** Os status finais que esta função grava. `sending` é o da reivindicação. */
type DesfechoFinal = "sent" | "failed" | Exclude<PurchaseDecision, "send">

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ action: "ga_purchase", ...entry }))
}

const numero = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** O host de `STORE_PUBLIC_URL`, ou `null` quando ausente ou malformada. */
function hostDe(url: string | null | undefined): string | null {
  if (typeof url !== "string" || url.trim() === "") return null
  try {
    return new URL(url.trim()).hostname
  } catch {
    return null
  }
}

/**
 * `item_category`: o **slug** da categoria de exibição (`PST-06`), pela MESMA função que a loja chama
 * nos eventos do navegador — `displayCategorySlug`, em `core/product`. A régua tinha uma segunda
 * escrita aqui, e ela devolvia o NOME enquanto a loja mandava um slug (vazio, por ler a coluna
 * legada): o GA4 recebia duas categorias para a mesma peça. `itemCategoryParity.test.ts` (loja)
 * compara as duas pontas pelo que elas de fato produzem.
 */
// deno-lint-ignore no-explicit-any
const categoriaDoProduto = (vinculos: any): string | null =>
  displayCategorySlug(displayCategoryLinksFromRows(vinculos))

/**
 * Os itens do pedido no formato de `EVT-13`.
 *
 * Duas leituras, e não um embed: `order_items` **não tem FK para `products`** (medido no banco
 * local — `PGRST200`), então `order_items?select=…,products(…)` responderia erro em produção. O
 * nome e o id público vêm do produto; o preço, a quantidade e a variação vêm do ITEM, que é o que
 * foi cobrado. Produto apagado depois da venda cai no nome congelado no item.
 */
async function lerItens(deps: PurchaseDeps, orderId: string): Promise<AnalyticsItemInput[]> {
  const { data: linhas, error } = await deps.supabase
    .from("order_items")
    .select("product_id, product_name, variant_label, unit_price, quantity")
    .eq("order_id", orderId)
  if (error) throw new Error("order_items_read_failed")

  const itens = Array.isArray(linhas) ? linhas : []
  const ids = [...new Set(itens.map((i) => i?.product_id).filter((id) => typeof id === "string"))]

  // deno-lint-ignore no-explicit-any
  const produtos = new Map<string, any>()
  if (ids.length > 0) {
    const { data } = await deps.supabase
      .from("products")
      .select("id, name, nuvemshop_id, product_categories(category_id, position, categories(slug, sort_order, active))")
      .in("id", ids)
    for (const p of Array.isArray(data) ? data : []) produtos.set(p.id, p)
  }

  return itens.map((item, index) => {
    const produto = produtos.get(item.product_id)
    return {
      id: String(item.product_id ?? ""),
      nuvemshop_id: produto?.nuvemshop_id ?? null,
      name: String(produto?.name ?? item.product_name ?? ""),
      category: categoriaDoProduto(produto?.product_categories),
      variant: item.variant_label ?? null,
      price: numero(item.unit_price),
      quantity: numero(item.quantity) || 1,
      index,
    }
  })
}

/** Grava o desfecho final. Falha aqui só vira log — a compra não pode derrubar o pagamento. */
async function gravarDesfecho(deps: PurchaseDeps, orderId: string, desfecho: DesfechoFinal) {
  const agora = new Date((deps.now ?? Date.now)()).toISOString()
  const { error } = await deps.supabase
    .from("orders")
    .update({ ga_purchase_status: desfecho, ga_purchase_at: agora })
    .eq("id", orderId)
  if (error) log({ order_id: orderId, status: "status_write_failed", desfecho })
}

/**
 * Envia o `purchase` do pedido ao GA4, **uma vez só**, sem nunca lançar.
 *
 * Chamado logo depois do `fireTrigger` de `payment_approved`, e só quando a aprovação foi aplicada
 * AGORA. Mesmo assim reivindica: o `applied` da RPC já é único, e a reivindicação é a contenção
 * contra o próximo caminho de aprovação que alguém criar sem saber disto.
 */
export async function sendPurchase(
  deps: PurchaseDeps,
  orderId: string,
  budgetMs: number = PURCHASE_BUDGET_MS,
): Promise<void> {
  let reivindicado = false
  try {
    // 1. A reivindicação. Quem não casa o `is null` não é o primeiro — e sai sem enviar.
    const { data: pedido, error: erroReivindicacao } = await deps.supabase
      .from("orders")
      .update({ ga_purchase_status: "sending" })
      .eq("id", orderId)
      .is("ga_purchase_status", null)
      .select(COLUNAS_DA_COMPRA)
      .maybeSingle()

    if (erroReivindicacao) {
      log({ order_id: orderId, status: "claim_failed" })
      return
    }
    if (!pedido?.id) {
      log({ order_id: orderId, status: "already_claimed" })
      return
    }
    reivindicado = true

    // 2. Configuração e chave. Leitura que falha é "desligado" — o padrão seguro.
    const { data: config } = await deps.supabase
      .from("store_settings")
      .select("value")
      .eq("key", "analytics")
      .maybeSingle()
    const settings = config?.value ?? null

    const { data: segredo } = await deps.supabase
      .from("analytics_secrets")
      .select("value")
      .eq("key", "ga4_api_secret")
      .maybeSingle()
    const apiSecret = typeof segredo?.value === "string" ? segredo.value : null

    const decisao = purchaseDecision({
      settings,
      apiSecret,
      declined: pedido.analytics_declined === true,
    })
    if (decisao !== "send") {
      await gravarDesfecho(deps, orderId, decisao)
      log({ order_id: orderId, status: decisao })
      return
    }

    // 3. O corpo.
    const itens = await lerItens(deps, orderId)
    const corpo = buildPurchaseBody(
      {
        id: pedido.id,
        order_number: String(pedido.order_number ?? ""),
        total: numero(pedido.total),
        shipping_cost: numero(pedido.shipping_cost),
        // Informativo para o GA4 (o `value` é o `total` cobrado): cupom + promoção + Pix.
        discount: numero(pedido.discount) + numero(pedido.promotion_discount) + numero(pedido.pix_discount),
        coupon_code: pedido.coupon_code ?? null,
      },
      itens,
      {
        clientId: pedido.ga_client_id,
        sessionId: pedido.ga_session_id,
        storeHost: hostDe(deps.storePublicUrl),
        productionHost: settings?.production_host ?? null,
      },
    )

    // 4. O envio, com orçamento próprio. A URL carrega a chave: ela não sai desta função.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), budgetMs)
    let desfecho: DesfechoFinal = "failed"
    let http: number | null = null
    try {
      const res = await deps.fetch(measurementProtocolUrl(settings.measurement_id, apiSecret as string), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
        signal: controller.signal,
      })
      http = res.status
      desfecho = res.ok ? "sent" : "failed"
    } catch (err) {
      // `AbortError` é o orçamento estourado; o resto é rede. Os dois são "failed", e o nome do
      // erro basta para distinguir no log — a mensagem poderia citar a URL.
      log({
        order_id: orderId,
        status: "send_error",
        error: err instanceof Error ? err.name : "unknown",
      })
    } finally {
      clearTimeout(timer)
    }

    // 5. O desfecho.
    await gravarDesfecho(deps, orderId, desfecho)
    log({ order_id: orderId, status: desfecho, ...(http !== null ? { http } : {}) })
  } catch (err) {
    log({
      order_id: orderId,
      status: "unexpected_error",
      error: err instanceof Error ? err.name : "unknown",
    })
    // Reivindicado e sem desfecho, o pedido ficaria `sending` para sempre — e o painel não
    // saberia dizer que a compra não saiu.
    if (reivindicado) {
      try {
        await gravarDesfecho(deps, orderId, "failed")
      } catch {
        // nada: já está no log
      }
    }
  }
}
