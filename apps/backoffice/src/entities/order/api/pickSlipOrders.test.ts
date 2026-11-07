// O carregador da folha de separação: N pedidos numa leitura só, com o client dublado na fronteira
// (o dublê registra a tabela, o `select` e os filtros — a regra de "quais ids" fica auditável).

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, type Registro, type Resposta } from '@/test/dubleSupabase'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { fetchPickSlipOrders, PICK_SLIP_READ_FAILED } from './pickSlipOrders'

const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

const pedidoLinha = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  order_number: id === 'o1' ? '1042' : '1041',
  customer_name: id === 'o1' ? 'Luciana Prado' : 'Marta Souza',
  created_at: '2026-11-07T14:32:00Z',
  notes: null,
  shipping_method: 'PAC',
  shipping_service_id: '1',
  address_street: 'Rua A', address_number: '1', address_complement: null, address_neighborhood: 'Centro',
  address_city: 'Porto Alegre', address_state: 'RS', address_zip: '90540-041',
  ...over,
})

const itemLinha = (order_id: string, over: Record<string, unknown> = {}) => ({
  order_id,
  product_id: UUID_A,
  product_name: 'Pingente Gota',
  product_image: null,
  quantity: 1,
  variant_label: null,
  engraving_text: null,
  material_kinds: [],
  ...over,
})

type Tabelas = Partial<Record<'orders' | 'order_items' | 'order_admin_notes' | 'products', Resposta>>

let duble: ReturnType<typeof criarDuble>
const montar = (tabelas: Tabelas) => {
  duble = criarDuble((r: Registro) => tabelas[r.table as keyof Tabelas] ?? { data: [] })
  fromMock.mockImplementation(duble.from)
}
const consulta = (tabela: string) => duble.calls.find(c => c.table === tabela)

beforeEach(() => {
  fromMock.mockReset()
})

describe('fetchPickSlipOrders — a leitura dos pedidos da folha', () => {
  it('lê pedidos, itens e observações por `.in` sobre os ids pedidos', async () => {
    montar({
      orders: { data: [pedidoLinha('o1'), pedidoLinha('o2')] },
      order_items: { data: [itemLinha('o1'), itemLinha('o2')] },
    })
    await fetchPickSlipOrders(['o1', 'o2'])

    expect(consulta('orders')?.filters).toEqual([{ method: 'in', args: ['id', ['o1', 'o2']] }])
    expect(consulta('order_items')?.filters).toEqual([{ method: 'in', args: ['order_id', ['o1', 'o2']] }])
    expect(consulta('order_admin_notes')?.filters).toEqual([{ method: 'in', args: ['order_id', ['o1', 'o2']] }])
    // As colunas são nomeadas: o frete e o endereço da folha.
    const colunas = String(consulta('orders')?.select?.[0])
    for (const c of ['shipping_method', 'shipping_service_id', 'notes', 'address_street', 'address_zip', 'customer_name']) {
      expect(colunas).toContain(c)
    }
    expect(colunas).not.toContain('nuvemshop')
  })

  it('pede a `products` só os ids de catálogo (uuid), sem repetir', async () => {
    montar({
      orders: { data: [pedidoLinha('o1')] },
      order_items: {
        data: [
          itemLinha('o1', { product_id: UUID_A }),
          itemLinha('o1', { product_id: UUID_A }),
          itemLinha('o1', { product_id: 'nuvemshop:Colar antigo' }),
          itemLinha('o1', { product_id: UUID_B }),
        ],
      },
    })
    await fetchPickSlipOrders(['o1'])
    expect(consulta('products')?.filters).toEqual([{ method: 'in', args: ['id', [UUID_A, UUID_B]] }])
  })

  it('sem nenhum id de catálogo, não consulta `products`', async () => {
    montar({
      orders: { data: [pedidoLinha('o1')] },
      order_items: { data: [itemLinha('o1', { product_id: 'nuvemshop:Colar' })] },
    })
    await fetchPickSlipOrders(['o1'])
    expect(consulta('products')).toBeUndefined()
  })

  it('devolve os pedidos na ordem dos ids, cada um com os seus itens e a sua observação', async () => {
    montar({
      orders: { data: [pedidoLinha('o2'), pedidoLinha('o1')] },
      order_items: {
        data: [
          itemLinha('o1', { product_name: 'Pingente Gota', quantity: 2 }),
          itemLinha('o2', { product_name: 'Anel Raiz' }),
        ],
      },
      order_admin_notes: { data: [{ order_id: 'o2', note: 'Ligar antes' }] },
    })
    const r = await fetchPickSlipOrders(['o1', 'o2'])

    expect(r.map(o => o.id)).toEqual(['o1', 'o2'])
    expect(r[0].items.map(i => [i.product_name, i.quantity])).toEqual([['Pingente Gota', 2]])
    expect(r[1].items.map(i => i.product_name)).toEqual(['Anel Raiz'])
    expect(r[0].admin_note).toBeNull()
    expect(r[1].admin_note).toBe('Ligar antes')
    expect(r[0].shipping_method).toBe('PAC')
    expect(r[0].customer_name).toBe('Luciana Prado')
  })

  it('id que não voltou de `orders` fica de fora (não vira folha vazia)', async () => {
    montar({ orders: { data: [pedidoLinha('o1')] }, order_items: { data: [itemLinha('o1')] } })
    const r = await fetchPickSlipOrders(['o1', 'sumiu'])
    expect(r.map(o => o.id)).toEqual(['o1'])
  })

  it('a foto segue `itemPhoto`: o snapshot do pedido vence; a capa do catálogo só onde falta', async () => {
    montar({
      orders: { data: [pedidoLinha('o1')] },
      order_items: {
        data: [
          itemLinha('o1', { product_id: UUID_A, product_image: 'https://cdn.exemplo.invalid/snapshot.jpg' }),
          itemLinha('o1', { product_id: UUID_B, product_image: '   ' }),
          itemLinha('o1', { product_id: 'nuvemshop:x', product_image: null }),
        ],
      },
      products: {
        data: [
          { id: UUID_A, images: [{ url: 'https://cdn.exemplo.invalid/capa-a.jpg' }] },
          { id: UUID_B, images: [{ url: 'https://cdn.exemplo.invalid/capa-b.jpg' }] },
        ],
      },
    })
    const [o] = await fetchPickSlipOrders(['o1'])
    expect(o.items.map(i => i.image)).toEqual([
      'https://cdn.exemplo.invalid/snapshot.jpg',
      'https://cdn.exemplo.invalid/capa-b.jpg',
      null,
    ])
  })

  it('foto do Storage vira a rendição de 112 (2× a moldura)', async () => {
    const storage = 'http://127.0.0.1:54441/storage/v1/object/public/products/p.jpg'
    montar({
      orders: { data: [pedidoLinha('o1')] },
      order_items: { data: [itemLinha('o1', { product_image: storage })] },
    })
    const [o] = await fetchPickSlipOrders(['o1'])
    expect(o.items[0].image).toContain('/storage/v1/render/image/public/products/p.jpg')
    expect(o.items[0].image).toContain('width=112')
  })

  it('falha de `orders` lança — nada é impresso', async () => {
    montar({ orders: { data: null, error: { message: 'boom' } }, order_items: { data: [] } })
    await expect(fetchPickSlipOrders(['o1'])).rejects.toThrow(PICK_SLIP_READ_FAILED)
  })

  it('falha de `order_items` lança — folha sem itens seria afirmação falsa', async () => {
    montar({ orders: { data: [pedidoLinha('o1')] }, order_items: { data: null, error: { message: 'boom' } } })
    await expect(fetchPickSlipOrders(['o1'])).rejects.toThrow(PICK_SLIP_READ_FAILED)
  })

  it('falha de `order_admin_notes` devolve os pedidos sem observação', async () => {
    montar({
      orders: { data: [pedidoLinha('o1', { notes: 'Embale para presente' })] },
      order_items: { data: [itemLinha('o1')] },
      order_admin_notes: { data: null, error: { message: 'boom' } },
    })
    const [o] = await fetchPickSlipOrders(['o1'])
    expect(o.admin_note).toBeNull()
    expect(o.notes).toBe('Embale para presente')
    expect(o.items).toHaveLength(1)
  })

  it('falha de `products` devolve sem foto de catálogo, e o snapshot continua', async () => {
    montar({
      orders: { data: [pedidoLinha('o1')] },
      order_items: {
        data: [
          itemLinha('o1', { product_id: UUID_A, product_image: 'https://cdn.exemplo.invalid/snapshot.jpg' }),
          itemLinha('o1', { product_id: UUID_B, product_image: null }),
        ],
      },
      products: { data: null, error: { message: 'boom' } },
    })
    const [o] = await fetchPickSlipOrders(['o1'])
    expect(o.items.map(i => i.image)).toEqual(['https://cdn.exemplo.invalid/snapshot.jpg', null])
  })

  it('lista vazia de ids não vai à rede', async () => {
    montar({})
    expect(await fetchPickSlipOrders([])).toEqual([])
    expect(duble.calls).toHaveLength(0)
  })
})
