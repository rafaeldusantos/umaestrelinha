// O detalhe do pedido com o desconto de campanha, pela árvore REAL (`<App />` com sessão admin sobre o
// dublê do client): a peça de campanha com "de/por" e o resumo com a linha "Desconto de campanha" — a
// mesma composição da loja e do painel (`orderSummary`, `core/orders`).
//
// O dublê só devolve as colunas novas quando o `select` as PEDE: sem isso, apagar uma delas de
// `COLUNAS_DO_DETALHE`/`COLUNAS_DOS_ITENS` passaria com a tela verde.
process.env.TZ = 'UTC'

import { act, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pedidoHref, type ItemDoPedido, type PedidoDoDetalhe } from '@/entities/order'
import { esquecerRolagens } from '@/shared/lib/useRolagemRestaurada'
import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { NOTA, detalhe, item, statusRow } from '@/test/pedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const ID = '00000000-0000-4000-8000-000000000244'
// Não são uuid de propósito (molde de `item()`): sem id procurável, o detalhe não lê `products`.
const PINGENTE = 'nuvemshop:Pingente gota'
const CORRENTE = 'nuvemshop:Corrente veneziana'

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const ehDetalhe = (cadeia: Elo[]) => cadeia.some((e) => e.metodo === 'maybeSingle')
const colunasPedidas = (cadeia: Elo[]) =>
  String(cadeia.find((e) => e.metodo === 'select')?.args[0] ?? '')
    .split(',')
    .map((c) => c.trim())
/** Só as chaves que o `select` pediu — o PostgREST não devolve coluna que não foi pedida. */
const soAsPedidas = (linha: object, cadeia: Elo[]) => {
  const pedidas = colunasPedidas(cadeia)
  return Object.fromEntries(Object.entries(linha).filter(([k]) => pedidas.includes(k)))
}

const responder = (pedido: PedidoDoDetalhe, itens: ItemDoPedido[]) => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', (cadeia): RespostaTabela =>
    ehDetalhe(cadeia) ? { data: soAsPedidas(pedido, cadeia), error: null } : { data: [], error: null, count: 0 },
  )
  fake.responderTabela('order_items', (cadeia): RespostaTabela => ({ data: itens.map((i) => soAsPedidas(i, cadeia)), error: null }))
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [], error: null })
  fake.responderTabela('order_admin_notes', { data: null, error: null })
  fake.responderTabela('order_manual_payments', { data: null, error: null })
}

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  esquecerRolagens()
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const abrir = async () => {
  await montarApp(pedidoHref(ID))
  await andar(50)
}

/** O texto sem os espaços inseparáveis do `Intl` — a régua compara a frase, não o tipo de espaço. */
const texto = (el: Element | null | undefined) => (el?.textContent ?? '').replace(/\s/g, ' ')
const valores = () => screen.getByRole('group', { name: 'Valores' })
const linhasDosValores = () =>
  Array.from(valores().querySelectorAll('dl [data-parte]')).map((el) => [el.getAttribute('data-parte'), texto(el)])
const itensNaTela = () => screen.getAllByTestId('item-do-pedido')

// A peça de campanha (209,90 → 167,92) e a comum (100,00), cupom de 10%, PIX de 5%, frete de 20.
const ITENS = [
  item({ id: 'i-1', product_id: PINGENTE, product_name: 'Pingente gota', quantity: 1, unit_price: 167.92, full_unit_price: 209.9 }),
  item({ id: 'i-2', product_id: CORRENTE, product_name: 'Corrente veneziana', variant_label: null, quantity: 1, unit_price: 100, full_unit_price: 100 }),
]
const PEDIDO = detalhe({
  subtotal: 267.92,
  shipping_cost: 20,
  shipping_method: 'PAC',
  discount: 10,
  coupon_code: 'DEZ',
  pix_discount: 12.9,
  promotion_discount: 0,
  buy_together_discount: 0,
  order_bump_discount: 0,
  campaign_discount: 41.98,
  total: 265.02,
})

describe('o detalhe do pedido com o desconto de campanha', () => {
  it('o resumo tem a linha do desconto de campanha, e a conta fecha', async () => {
    responder(PEDIDO, ITENS)
    await abrir()
    expect(linhasDosValores()).toEqual([
      ['subtotal', 'SubtotalR$ 309,90'],
      ['desconto', 'Desconto de campanha− R$ 41,98'],
      ['desconto', 'Cupom DEZ− R$ 10,00'],
      ['desconto', 'Desconto PIX− R$ 12,90'],
      ['frete', 'Frete · PACR$ 20,00'],
      ['total', 'TotalR$ 265,02'],
    ])
  })

  it('a peça de campanha mostra o preço de tabela riscado e o cobrado', async () => {
    responder(PEDIDO, ITENS)
    await abrir()
    const [peca] = itensNaTela()
    expect(texto(peca.querySelector('[data-parte="de-por"]'))).toBe('De R$ 209,90, por R$ 167,92')
  })
})
