import type { MappedOrder, OrderRow } from '../map/order.ts'
import type { Report } from '../report.ts'
import { type DbLike, selectAll, unwrap } from './db.ts'

interface ExistingOrder {
  id: string
  nuvemshop_id: number | null
  order_number: string
  status: string
}

export interface OrderWriteDeps {
  supabase: DbLike
  report: Report
  dryRun?: boolean
  log?: (message: string) => void
  /** Sobrescreve o estado operacional a partir da origem. Ver `COLUNAS_OPERACIONAIS`. */
  ressincronizarEstado?: boolean
  /** Apaga e regrava os itens do pedido. Ver "itens são imutáveis", abaixo. */
  reimportarItens?: boolean
}

/**
 * Escritas **sempre**. Fato da origem, que a Adri não edita no painel.
 *
 * `created_at` está aqui de propósito: a data do pedido é da origem e não muda. `notes` também — é
 * o recado que a cliente escreveu no checkout da Nuvemshop, e o painel não o edita.
 */
const COLUNAS_SNAPSHOT = [
  'order_number', 'customer_name', 'customer_email', 'customer_phone', 'customer_document',
  'subtotal', 'discount', 'shipping_cost', 'total', 'payment_method', 'shipping_method',
  'address_street', 'address_number', 'address_complement', 'address_neighborhood',
  'address_city', 'address_state', 'address_zip', 'coupon_code', 'notes', 'created_at',
  'nuvemshop_id', 'nuvemshop_status', 'nuvemshop_payment_status', 'nuvemshop_shipping_status',
] as const

/**
 * Escritas **só no INSERT** — ou no UPDATE quando `--ressincronizar-estado`.
 *
 * Depois do cutover o **dono destas colunas é o painel**, não o arquivo. Sem esta separação a
 * segunda execução arrasta de volta um pedido que a Adri já marcou como enviado — e não quebra
 * nada: o banco aceita, a tela mostra, e o trabalho de um dia some sem mensagem nenhuma. É o modo
 * de falha mais caro desta feature, porque só aparece depois de alguém já ter trabalhado.
 *
 * A flag existe para o dia do cutover, quando a origem ainda é a verdade e a intenção é
 * deliberada — e o relatório NOMEIA cada pedido sobrescrito.
 */
const COLUNAS_OPERACIONAIS = [
  'status', 'payment_status', 'material_status', 'material_tracking_code',
  'tracking_code', 'shipping_carrier', 'cancel_reason', 'paid_at',
] as const

const recorte = (row: OrderRow, colunas: readonly string[]): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const coluna of colunas) {
    if (coluna in row) out[coluna] = (row as unknown as Record<string, unknown>)[coluna]
  }
  return out
}

/**
 * Grava os pedidos importados, casando por `nuvemshop_id`.
 *
 * **Itens são IMUTÁVEIS.** O CSV não traz id de item — só nome, preço e quantidade —, então não
 * existe chave de update honesta: casar por posição ou por nome erra em silêncio numa reexportação,
 * e o erro só aparece quando alguém for conferir um pedido antigo. Pedido que já existe **não tem
 * itens tocados**; `--reimportar-itens` apaga e regrava o conjunto inteiro daquele pedido.
 */
export const writeOrders = async (
  mapeados: readonly MappedOrder[],
  deps: OrderWriteDeps,
): Promise<void> => {
  const { supabase, report, dryRun = false } = deps
  const log = deps.log ?? (() => {})

  // Paginado pelo mesmo motivo das outras leituras de estado: o PostgREST corta em 1.000 linhas, e
  // um conjunto de "já existe" truncado faria o import tentar INSERT em pedido existente — a
  // idempotência quebraria exatamente a partir do volume real.
  const existentes = await selectAll<ExistingOrder>(
    supabase.from('orders'),
    'id, nuvemshop_id, order_number, status',
    'ler pedidos existentes',
  )
  const porNuvemshopId = new Map<number, ExistingOrder>()
  for (const o of existentes) {
    if (o.nuvemshop_id !== null) porNuvemshopId.set(o.nuvemshop_id, o)
  }

  for (const mapeado of mapeados) {
    const { order, items } = mapeado
    report.read('pedidos')
    report.read('itens', items.length)

    conferirTotais(mapeado, report)
    if (order.customer_phone === null) report.orderWithoutPhone()
    if (items.length === 0) report.orderWithoutItems()
    report.observedTriple(mapeado.observed, order.status, order.payment_status)
    const sugestaoPorNome = new Map(mapeado.orfaos.map(o => [o.nome, o.sugestao]))
    for (const item of items) {
      const casou = !item.product_id.startsWith('nuvemshop:')
      report.itemMatched(
        casou,
        item.product_name,
        casou ? null : sugestaoPorNome.get(item.product_name) ?? null,
      )
    }
    if (order.material_status === 'aguardando_material') {
      report.materialQueued({
        order_number: order.order_number,
        cliente: order.customer_name,
        criadoEm: order.created_at,
        itens: items.length,
      })
    }

    const existente = porNuvemshopId.get(order.nuvemshop_id)

    if (existente) {
      await atualizar(existente, mapeado, deps)
      continue
    }

    if (dryRun) {
      log(`dry-run: criaria ${order.order_number}`)
      report.created('pedidos')
      report.created('itens', items.length)
      continue
    }

    const criado = unwrap(
      `criar pedido ${order.order_number}`,
      await supabase
        .from('orders')
        .insert<{ id: string }>({ ...order, nuvemshop_synced_at: new Date().toISOString() })
        .select('id')
        .single(),
    )

    await gravarItens(criado.id, mapeado, deps)
    await gravarHistorico(criado.id, mapeado, deps)
    await gravarNotas(criado.id, mapeado, deps)

    report.created('pedidos')
  }
}

/**
 * A conferência de `subtotal` — **não aborta**.
 *
 * Medido: zero dos 35 divergem hoje. Divergência é dado torto da origem, não erro do import, e
 * parar o espelho inteiro por causa de um centavo de arredondamento seria desproporcional. Vira
 * linha de relatório, que é o que permite conferir sem bloquear.
 */
const conferirTotais = (mapeado: MappedOrder, report: Report): void => {
  const soma = mapeado.items.reduce((a, i) => a + i.unit_price * i.quantity, 0)
  if (Math.abs(soma - mapeado.order.subtotal) > 0.011) {
    report.totalMismatch({
      order_number: mapeado.order.order_number,
      somaDosItens: Number(soma.toFixed(2)),
      subtotal: mapeado.order.subtotal,
    })
  }
}

const atualizar = async (
  existente: ExistingOrder,
  mapeado: MappedOrder,
  deps: OrderWriteDeps,
): Promise<void> => {
  const { supabase, report, dryRun = false } = deps
  const { order, items } = mapeado

  const patch: Record<string, unknown> = {
    ...recorte(order, COLUNAS_SNAPSHOT),
    nuvemshop_synced_at: new Date().toISOString(),
  }

  if (deps.ressincronizarEstado === true) {
    Object.assign(patch, recorte(order, COLUNAS_OPERACIONAIS))
    report.stateResynced(order.order_number)
  }

  if (!dryRun) {
    unwrap(
      `atualizar pedido ${order.order_number}`,
      await supabase.from('orders').update(patch).eq('id', existente.id),
    )
  }

  if (deps.reimportarItens === true) {
    if (!dryRun) {
      unwrap(
        `apagar itens de ${order.order_number}`,
        await supabase.from('order_items').delete().eq('nuvemshop_order_id', order.nuvemshop_id),
      )
    }
    await gravarItens(existente.id, mapeado, deps)
    report.itemsReimported(order.order_number)
  } else {
    // Itens intactos: eles são o registro do que FOI vendido, e a origem não tem chave para casá-los.
    for (let i = 0; i < items.length; i += 1) report.skipped('itens')
  }

  report.updated('pedidos')
}

const gravarItens = async (
  orderId: string,
  mapeado: MappedOrder,
  deps: OrderWriteDeps,
): Promise<void> => {
  const { supabase, report, dryRun = false } = deps
  if (mapeado.items.length === 0) return

  if (!dryRun) {
    unwrap(
      `gravar itens de ${mapeado.order.order_number}`,
      await supabase
        .from('order_items')
        .insertMany(mapeado.items.map(item => ({ ...item, order_id: orderId }))),
    )
  }
  report.created('itens', mapeado.items.length)
}

const gravarHistorico = async (
  orderId: string,
  mapeado: MappedOrder,
  deps: OrderWriteDeps,
): Promise<void> => {
  const { supabase, dryRun = false } = deps
  if (dryRun || mapeado.history.length === 0) return

  unwrap(
    `gravar histórico de ${mapeado.order.order_number}`,
    await supabase
      .from('order_status_history')
      .insertMany(mapeado.history.map(h => ({ ...h, order_id: orderId, created_by: null }))),
  )
}

const gravarNotas = async (
  orderId: string,
  mapeado: MappedOrder,
  deps: OrderWriteDeps,
): Promise<void> => {
  const { supabase, dryRun = false } = deps
  if (dryRun || mapeado.notes.length === 0) return

  unwrap(
    `gravar notas de ${mapeado.order.order_number}`,
    await supabase
      .from('order_notes')
      .insertMany(mapeado.notes.map(n => ({ ...n, order_id: orderId, created_by: null }))),
  )
}
