// O detalhe do pedido com o desconto do Compre Junto, pela árvore REAL (`<App />` com sessão admin
// sobre o dublê do client): a peça com "de/por", a linha mista partida em duas, o resumo com a mesma
// composição da loja (`orderSummary`, `core/orders`) e o Total que é `orders.total`.
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

// O pingente (R$ 400) e a corrente que o acompanha, levada 2 vezes: a sacola grava a linha MISTA
// partida em duas — a unidade com o desconto casado (cheio R$ 120, cobrado R$ 96) e a avulsa (R$ 120).
// Subtotal cheio 400 + 120 + 120 = 640; o casado 24; PIX 30,80; frete 19,90 ⇒ Total 605,10.
const ITENS_COM_DESCONTO = [
  item({ id: 'i-1', product_id: PINGENTE, product_name: 'Pingente gota', quantity: 1, unit_price: 400, full_unit_price: 400 }),
  item({
    id: 'i-2',
    product_id: CORRENTE,
    product_name: 'Corrente veneziana',
    variant_label: null,
    quantity: 1,
    unit_price: 96,
    full_unit_price: 120,
    accompanies_product_ids: [PINGENTE],
  }),
  item({ id: 'i-3', product_id: CORRENTE, product_name: 'Corrente veneziana', variant_label: null, quantity: 1, unit_price: 120, full_unit_price: 120 }),
]
const PEDIDO_COM_DESCONTO = detalhe({
  subtotal: 616,
  shipping_cost: 19.9,
  shipping_method: 'PAC',
  discount: 0,
  coupon_code: null,
  pix_discount: 30.8,
  promotion_discount: 0,
  buy_together_discount: 24,
  order_bump_discount: 0,
  total: 605.1,
})

describe('o detalhe do pedido com o desconto do Compre Junto', () => {
  it('a peça com desconto mostra o preço cheio riscado e o cobrado; a parte avulsa da linha partida, só o preço', async () => {
    responder(PEDIDO_COM_DESCONTO, ITENS_COM_DESCONTO)
    await abrir()
    const [pingente, comDesconto, avulsa] = itensNaTela()
    expect(pingente.querySelector('[data-parte="de-por"]')).toBeNull()
    const dePor = comDesconto.querySelector('[data-parte="de-por"]')!
    expect(texto(dePor.querySelector('s'))).toBe('R$ 120,00')
    expect(texto(dePor)).toBe('De R$ 120,00, por R$ 96,00')
    expect(texto(comDesconto.querySelector('[data-parte="quantidade"]'))).toBe('1 × R$ 96,00')
    expect(avulsa.querySelector('[data-parte="de-por"]')).toBeNull()
    expect(texto(avulsa.querySelector('[data-parte="quantidade"]'))).toBe('1 × R$ 120,00')
  })

  it('o resumo parte do subtotal cheio, com uma linha por desconto, e o Total é o do pedido', async () => {
    responder(PEDIDO_COM_DESCONTO, ITENS_COM_DESCONTO)
    await abrir()
    expect(linhasDosValores()).toEqual([
      ['subtotal', 'SubtotalR$ 640,00'],
      ['frete', 'Frete · PACR$ 19,90'],
      ['desconto', 'Desconto do Compre Junto− R$ 24,00'],
      ['desconto', 'Desconto PIX− R$ 30,80'],
      ['total', 'TotalR$ 605,10'],
    ])
    expect(valores().textContent).not.toMatch(/Promoção|economi|!/i)
  })

  it('o Total é `orders.total` mesmo quando a soma das linhas daria outro número', async () => {
    responder({ ...PEDIDO_COM_DESCONTO, total: 599.9 }, ITENS_COM_DESCONTO)
    await abrir()
    expect(texto(valores().querySelector('[data-parte="total"]'))).toBe('TotalR$ 599,90')
  })

  it('o pedido de antes das colunas de preço cheio fica como era: o subtotal gravado, sem "de/por" nem linha do Compre Junto', async () => {
    responder(
      detalhe({ subtotal: 400, shipping_cost: 19.9, coupon_code: 'ESTRELA10', discount: 40, pix_discount: 18, total: 361.9 }),
      [item({ id: 'i-1', quantity: 1, unit_price: 400 })],
    )
    await abrir()
    expect(itensNaTela()[0].querySelector('[data-parte="de-por"]')).toBeNull()
    expect(texto(itensNaTela()[0].querySelector('[data-parte="quantidade"]'))).toBe('1 × R$ 400,00')
    expect(linhasDosValores()).toEqual([
      ['subtotal', 'SubtotalR$ 400,00'],
      ['frete', 'Frete · PACR$ 19,90'],
      ['desconto', 'Cupom ESTRELA10− R$ 40,00'],
      ['desconto', 'Desconto PIX− R$ 18,00'],
      ['total', 'TotalR$ 361,90'],
    ])
    expect(within(valores()).queryByText(/Compre Junto/)).toBeNull()
  })

  it('com a leitura dos itens em falha, os valores ficam no formato do subtotal gravado, sem afirmar desconto', async () => {
    responder(PEDIDO_COM_DESCONTO, ITENS_COM_DESCONTO)
    fake.falharTabela('order_items', { message: 'falhou' })
    await abrir()
    expect(linhasDosValores()).toEqual([
      ['subtotal', 'SubtotalR$ 616,00'],
      ['frete', 'Frete · PACR$ 19,90'],
      ['desconto', 'Desconto PIX− R$ 30,80'],
      ['total', 'TotalR$ 605,10'],
    ])
  })
})
