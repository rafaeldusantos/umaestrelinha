import { describe, expect, it } from 'vitest'

import type { MappedOrder, OrderRow } from '../../map/order.ts'
import { createReport } from '../../report.ts'
import { POSTGREST_PAGE, type DbLike } from '../db.ts'
import { writeOrders } from '../orders.ts'

/**
 * A escrita idempotente dos pedidos importados.
 *
 * O caso que este arquivo existe para provar é o mais caro da feature: **a segunda execução não pode
 * desfazer o trabalho da Adri**. Ele não quebra nada quando quebra — o banco aceita, a tela mostra,
 * e um dia de trabalho some sem mensagem.
 */

interface Registro {
  tabela: string
  op: 'insert' | 'insertMany' | 'update' | 'delete'
  valores?: unknown
  filtro?: [string, unknown]
}

/** Dublê que registra o que foi escrito, e trunca a leitura como o PostgREST real. */
const fakeDb = (existentes: Array<Record<string, unknown>> = []) => {
  const registros: Registro[] = []
  const ranges: Array<[number, number]> = []

  const supabase: DbLike = {
    from: (tabela: string) => ({
      select: async () => ({ data: existentes.slice(0, POSTGREST_PAGE), error: null }),
      selectRange: async (_c: string, from: number, to: number) => {
        ranges.push([from, to])
        const fonte = tabela === 'orders' ? existentes : []
        return { data: fonte.slice(from, Math.min(to + 1, from + POSTGREST_PAGE)), error: null }
      },
      insert: (valores: unknown) => ({
        select: () => ({
          single: async () => {
            registros.push({ tabela, op: 'insert', valores })
            return { data: { id: `uuid-${registros.length}` }, error: null }
          },
        }),
      }),
      insertMany: async (valores: readonly unknown[]) => {
        registros.push({ tabela, op: 'insertMany', valores })
        return { data: null, error: null }
      },
      update: (valores: unknown) => ({
        eq: async (coluna: string, valor: unknown) => {
          registros.push({ tabela, op: 'update', valores, filtro: [coluna, valor] })
          return { data: null, error: null }
        },
        in: async () => ({ data: null, error: null }),
      }),
      delete: () => ({
        eq: async (coluna: string, valor: unknown) => {
          registros.push({ tabela, op: 'delete', filtro: [coluna, valor] })
          return { data: null, error: null }
        },
        in: async () => ({ data: null, error: null }),
      }),
    }),
  } as unknown as DbLike

  return { supabase, registros, ranges }
}

const order = (over: Partial<OrderRow> = {}): OrderRow => ({
  order_number: 'NS-165', customer_id: null, customer_name: 'Fulana',
  customer_email: 'fulana@exemplo.invalid', customer_phone: '5551900000001',
  customer_document: '11111111111',
  status: 'paid', payment_status: 'approved', material_status: 'aguardando_material',
  payment_method: 'pix', shipping_method: null, shipping_carrier: null, tracking_code: null,
  subtotal: 100, discount: 0, shipping_cost: 0, total: 100,
  address_street: null, address_number: null, address_complement: null,
  address_neighborhood: null, address_city: null, address_state: null, address_zip: null,
  coupon_code: null, notes: null, cancel_reason: null, paid_at: null,
  created_at: '2026-07-14T13:10:29-03:00', nuvemshop_id: 2018794574,
  nuvemshop_status: 'Aberto', nuvemshop_payment_status: 'Confirmado',
  nuvemshop_shipping_status: 'Não está embalado',
  ...over,
})

const mapeado = (over: Partial<MappedOrder> = {}): MappedOrder => ({
  order: order(),
  items: [{
    product_id: 'uuid-produto', variant_id: null, product_name: 'Joia de Teste',
    quantity: 1, unit_price: 100, price_source: 'base', variant_label: null,
    variant_options: null, requires_material: true, material_kinds: ['cinzas'],
    nuvemshop_order_id: 2018574,
  }],
  history: [{ to_status: 'pending', from_status: null, created_at: '2026-07-14T13:10:29-03:00', note: 'Importado da Nuvemshop' }],
  notes: [{ note: 'Fila inferida' }],
  observed: 'Aberto | Confirmado | Não está embalado',
  orfaos: [],
  ...over,
})

const escrever = async (
  mapeados: MappedOrder[],
  existentes: Array<Record<string, unknown>> = [],
  extra: Record<string, unknown> = {},
) => {
  const db = fakeDb(existentes)
  const report = createReport()
  await writeOrders(mapeados, { supabase: db.supabase, report, ...extra })
  return { ...db, report }
}

// -------------------------------------------------------------------------------------------

describe('leitura do estado atual', () => {
  it('passa por `selectAll` — leitura truncada faria o import duplicar', async () => {
    const { ranges } = await escrever([mapeado()])
    expect(ranges.length).toBeGreaterThan(0)
    expect(ranges[0]).toEqual([0, POSTGREST_PAGE - 1])
  })
})

describe('pedido novo', () => {
  it('grava pedido, itens, histórico e notas', async () => {
    const { registros } = await escrever([mapeado()])
    expect(registros.map(r => `${r.tabela}.${r.op}`)).toEqual([
      'orders.insert', 'order_items.insertMany', 'order_status_history.insertMany', 'order_notes.insertMany',
    ])
  })

  it('carimba `nuvemshop_synced_at` na criação', async () => {
    const { registros } = await escrever([mapeado()])
    const valores = registros[0].valores as Record<string, unknown>
    expect(typeof valores.nuvemshop_synced_at).toBe('string')
  })

  it('os filhos recebem o id do pedido criado', async () => {
    const { registros } = await escrever([mapeado()])
    for (const r of registros.slice(1)) {
      const linhas = r.valores as Array<Record<string, unknown>>
      expect(linhas[0].order_id).toBe('uuid-1')
    }
  })

  it('o balance fecha para pedidos e itens', async () => {
    const { report } = await escrever([mapeado()])
    expect(report.balances().every(b => b.confere)).toBe(true)
    expect(report.exitCode()).toBe(0)
  })
})

describe('re-execução — o caso mais caro da feature', () => {
  const existente = { id: 'uuid-existente', nuvemshop_id: 2018794574, order_number: 'NS-165', status: 'shipped' }

  it('não cria duplicata: casa por `nuvemshop_id`', async () => {
    const { registros, report } = await escrever([mapeado()], [existente])
    expect(registros.filter(r => r.op === 'insert')).toHaveLength(0)
    expect(report.data().entidades.pedidos.criados).toBe(0)
    expect(report.data().entidades.pedidos.atualizados).toBe(1)
  })

  it('PRESERVA as colunas operacionais — o pedido enviado aqui não volta a `paid`', async () => {
    // Sem esta separação, a segunda execução arrasta de volta o trabalho de um dia, em silêncio.
    const { registros } = await escrever([mapeado()], [existente])
    const patch = registros.find(r => r.op === 'update')?.valores as Record<string, unknown>
    for (const coluna of ['status', 'payment_status', 'material_status', 'tracking_code', 'cancel_reason', 'paid_at']) {
      expect(patch).not.toHaveProperty(coluna)
    }
  })

  it('atualiza o snapshot e a proveniência', async () => {
    const { registros } = await escrever([mapeado()], [existente])
    const patch = registros.find(r => r.op === 'update')?.valores as Record<string, unknown>
    expect(patch.customer_phone).toBe('5551900000001')
    expect(patch.total).toBe(100)
    expect(patch.nuvemshop_status).toBe('Aberto')
    expect(patch.created_at).toBe('2026-07-14T13:10:29-03:00')
  })

  it('os ITENS não são tocados — a origem não tem chave para casá-los', async () => {
    const { registros, report } = await escrever([mapeado()], [existente])
    expect(registros.filter(r => r.tabela === 'order_items')).toHaveLength(0)
    expect(report.data().entidades.itens.pulados).toBe(1)
    expect(report.balances().every(b => b.confere)).toBe(true)
  })

  it('não regrava histórico nem notas', async () => {
    const { registros } = await escrever([mapeado()], [existente])
    expect(registros.filter(r => r.tabela === 'order_status_history')).toHaveLength(0)
    expect(registros.filter(r => r.tabela === 'order_notes')).toHaveLength(0)
  })
})

describe('--ressincronizar-estado', () => {
  const existente = { id: 'uuid-existente', nuvemshop_id: 2018794574, order_number: 'NS-165', status: 'shipped' }

  it('SOBRESCREVE as colunas operacionais — o inverso exato do teste acima', async () => {
    const { registros } = await escrever([mapeado()], [existente], { ressincronizarEstado: true })
    const patch = registros.find(r => r.op === 'update')?.valores as Record<string, unknown>
    expect(patch.status).toBe('paid')
    expect(patch.payment_status).toBe('approved')
    expect(patch.material_status).toBe('aguardando_material')
  })

  it('NOMEIA no relatório cada pedido sobrescrito', async () => {
    const { report } = await escrever([mapeado()], [existente], { ressincronizarEstado: true })
    expect(report.data().pedidos.estadoRessincronizado).toEqual(['NS-165'])
  })

  it('sem a flag, nada é sobrescrito e nada é nomeado', async () => {
    const { report } = await escrever([mapeado()], [existente])
    expect(report.data().pedidos.estadoRessincronizado).toEqual([])
  })
})

describe('--reimportar-itens', () => {
  const existente = { id: 'uuid-existente', nuvemshop_id: 2018794574, order_number: 'NS-165', status: 'paid' }

  it('apaga pelo id do pedido na ORIGEM e regrava o conjunto', async () => {
    const { registros, report } = await escrever([mapeado()], [existente], { reimportarItens: true })
    const del = registros.find(r => r.op === 'delete')
    expect(del?.tabela).toBe('order_items')
    expect(del?.filtro).toEqual(['nuvemshop_order_id', 2018794574])
    expect(registros.some(r => r.tabela === 'order_items' && r.op === 'insertMany')).toBe(true)
    expect(report.data().pedidos.itensReimportados).toEqual(['NS-165'])
  })

  it('o balance continua fechando — os itens contam como criados, não pulados', async () => {
    const { report } = await escrever([mapeado()], [existente], { reimportarItens: true })
    expect(report.data().entidades.itens.criados).toBe(1)
    expect(report.data().entidades.itens.pulados).toBe(0)
    expect(report.balances().every(b => b.confere)).toBe(true)
  })
})

describe('dry-run', () => {
  it('não grava nada, e ainda assim o balance fecha', async () => {
    const { registros, report } = await escrever([mapeado()], [], { dryRun: true })
    expect(registros).toEqual([])
    expect(report.balances().every(b => b.confere)).toBe(true)
  })

  it('num pedido existente, tampouco grava', async () => {
    const existente = { id: 'x', nuvemshop_id: 2018794574, order_number: 'NS-165', status: 'paid' }
    const { registros } = await escrever([mapeado()], [existente], { dryRun: true, ressincronizarEstado: true })
    expect(registros).toEqual([])
  })
})

describe('o que o relatório aprende durante a escrita', () => {
  it('registra a tripla observada, a fila de material e a taxa de casamento', async () => {
    const { report } = await escrever([mapeado()])
    const p = report.data().pedidos
    expect(p.distribuicao).toEqual([
      { tripla: 'Aberto | Confirmado | Não está embalado', vezes: 1, status: 'paid', paymentStatus: 'approved' },
    ])
    expect(p.filaDeMaterial).toEqual([
      { order_number: 'NS-165', cliente: 'Fulana', criadoEm: '2026-07-14T13:10:29-03:00', itens: 1 },
    ])
    expect(report.matchRate()).toBe(1)
  })

  it('item órfão baixa a taxa e é nomeado', async () => {
    const m = mapeado()
    m.items[0].product_id = 'nuvemshop:piramide com cabelo'
    m.items[0].product_name = 'Pirâmide com cabelo'
    const { report } = await escrever([m])
    expect(report.matchRate()).toBe(0)
    expect(report.data().pedidos.itensOrfaos).toEqual([{ nome: 'Pirâmide com cabelo', sugestao: null }])
    expect(report.exitCode()).toBe(1)
  })

  it('pedido sem telefone e pedido sem item são contados', async () => {
    const { report } = await escrever([
      mapeado({ order: order({ customer_phone: null }), items: [] }),
    ])
    expect(report.data().pedidos.semTelefone).toBe(1)
    expect(report.data().pedidos.pedidosSemItem).toBe(1)
  })

  it('subtotal que não fecha vira linha de relatório e NÃO aborta', async () => {
    const m = mapeado({ order: order({ subtotal: 999 }) })
    const { report } = await escrever([m])
    expect(report.data().pedidos.totaisQueNaoFecham).toEqual([
      { order_number: 'NS-165', somaDosItens: 100, subtotal: 999 },
    ])
    expect(report.data().parouPorErro).toBeNull()
  })

  it('pedido fora da fila não entra na lista de material', async () => {
    const { report } = await escrever([mapeado({ order: order({ material_status: 'nao_aplicavel' }) })])
    expect(report.data().pedidos.filaDeMaterial).toEqual([])
  })
})
