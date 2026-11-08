// O voltar do Android dentro e logo depois da montagem, pela árvore REAL (`<App />` com sessão admin
// sobre o dublê do client) e o histórico REAL do jsdom (`history.back`/`history.forward`):
// - depois de "Criar link", o voltar cai em Montados com o cartão novo, e a montagem sai do histórico
//   (nem um segundo voltar nem o avançar a reabrem);
// - com a folha "Sair sem criar o link?" aberta pelo voltar do passo 1, o voltar fecha a folha e a
//   montagem fica no passo 1.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA, leituraDoMontado, montadoNaLista } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
const ID_NOVO = 'dddddddd-0000-4000-8000-000000000001'
const CLIENTES = [{ id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 }]
const PECA = {
  id: 'bbbbbbbb-0000-4000-8000-000000000002',
  name: 'Colar Estrela',
  base_price: 120,
  image_url: null,
  capa: null,
  is_active: true,
  stock_policy: 'track',
  stock_total: 5,
  requires_material: false,
  engraving_max_chars: null,
  options: [],
  weight_kg: null,
  width_cm: null,
  height_cm: null,
  length_cm: null,
}

const ok = (data: unknown) => ({ data, error: null })
const resumo = (itens: number) => ({
  subtotal: itens,
  promotion_discount: 0,
  coupon_discount: 0,
  coupon_applied: false,
  coupon_free_shipping: false,
  coupon_discarded: false,
  manual_discount: 0,
  items_total: itens,
})
const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) =>
  (cadeia.find((e) => e.metodo === 'select')?.args[1] as { head?: boolean } | undefined)?.head
    ? { data: null, error: null, count: linhas.length }
    : { data: linhas, error: null }

/** A lista de Montados: vazia até o link ser criado; depois, com o cartão novo. */
let criado = false

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const voltar = async () => {
  await act(async () => {
    window.history.back()
    await vi.advanceTimersByTimeAsync(50)
  })
  await andar(50)
}
const avancar = async () => {
  await act(async () => {
    window.history.forward()
    await vi.advanceTimersByTimeAsync(50)
  })
  await andar(50)
}
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const naMontagem = () => window.location.pathname === '/pedidos/montar' || screen.queryByText(/^Passo \d de 4 · /) !== null

beforeEach(() => {
  fake.reset()
  criado = false
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao(
    'order-proposals?action=list',
    ...Array.from({ length: 40 }, () => () =>
      ok({ proposals: criado ? [montadoNaLista({ id: ID_NOVO, number: 'P-0050', customer_name: 'Helena Prado', created_at: AGORA })] : [], agora: AGORA }),
    ),
  )
  fake.filaDeInvocacao(
    'order-proposals?action=preview',
    ...Array.from({ length: 40 }, () => () => ok({ summary: resumo(120), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 114 } })),
  )
  fake.filaDeInvocacao(
    'order-proposals?action=save',
    ...Array.from({ length: 5 }, () => () => {
      criado = true
      return ok({ id: ID_NOVO, number: 'P-0050', version: 1, created: true, token: 'tok-novo', expires_at: '2026-11-14T12:00:00Z' })
    }),
  )
  fake.filaDeInvocacao(
    'order-proposals?action=get',
    ...Array.from({ length: 10 }, () => () => ok(leituraDoMontado({ proposal: { id: ID_NOVO, number: 'P-0050', customer_name: 'Helena Prado' }, token: null }))),
  )
  fake.responderTabela('customer_list', { data: CLIENTES, error: null })
  fake.responderTabela('addresses', { data: [], error: null })
  fake.responderTabela('products', comoOPostgrest([PECA]))
  fake.responderTabela('product_variants', comoOPostgrest([]))
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ erro: true }), { status: 200 })))
  vi.stubEnv('VITE_STORE_URL', 'https://loja.exemplo.invalid')
  vi.useFakeTimers({ shouldAdvanceTime: true })
  // Uma sentinela conhecida antes de cada teste: o histórico do jsdom é um só por arquivo.
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pedidos → "Montar pedido" → a Helena. */
const abrirComACliente = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await andar(50)
}

describe('o voltar depois de "Criar link"', () => {
  it('cai em Montados com o cartão novo; um segundo voltar e o avançar não reabrem a montagem', async () => {
    await abrirComACliente()
    await clicar(continuar())
    await andar(50)
    await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
    await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
    await clicar(continuar())
    await andar(50)
    await clicar(continuar())
    await andar(100)
    expect(screen.getByText('Passo 4 de 4 · Revisar')).toBeInTheDocument()
    await clicar(within(barra()).getByRole('button', { name: 'Criar link' }))
    await andar(100)
    expect(window.location.pathname).toBe(`/pedidos/montados/${ID_NOVO}`)
    expect(screen.getByTestId('aviso-do-montado')).toHaveTextContent('Link criado.')

    // 1.º voltar: Montados, com o cartão novo.
    await voltar()
    await andar(100)
    expect(window.location.pathname).toBe('/pedidos')
    expect(new URLSearchParams(window.location.search).get('visao')).toBe('montados')
    expect(naMontagem()).toBe(false)
    const cartoes = await screen.findAllByTestId('cartao-do-montado')
    expect(cartoes).toHaveLength(1)
    expect(cartoes[0]).toHaveTextContent('Helena Prado')

    // 2.º voltar: a montagem não volta.
    await voltar()
    await andar(100)
    expect(naMontagem()).toBe(false)

    // O avançar volta a Montados e ao pedido montado — nunca à montagem.
    await avancar()
    await andar(100)
    expect(naMontagem()).toBe(false)
    expect(new URLSearchParams(window.location.search).get('visao')).toBe('montados')
    await avancar()
    await andar(100)
    expect(naMontagem()).toBe(false)
    expect(window.location.pathname).toBe(`/pedidos/montados/${ID_NOVO}`)
  })
})

describe('o voltar com a folha "Sair sem criar o link?" aberta', () => {
  it('fecha a folha e a montagem fica no passo 1, com a cliente escolhida', async () => {
    await abrirComACliente()
    // O voltar do passo 1, com a cliente: a folha.
    await voltar()
    const folha = await screen.findByRole('dialog')
    expect(within(folha).getByText('Sair sem criar o link?')).toBeInTheDocument()

    // O voltar de novo, com a folha aberta: fecha a folha, e a montagem fica.
    await voltar()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(window.location.pathname).toBe('/pedidos/montar')
    expect(screen.getByText('Passo 1 de 4 · Cliente')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Cliente' })).toHaveTextContent('Helena Prado')

    // E o voltar do passo 1 pergunta de novo; "Sair" sai para Pedidos.
    await voltar()
    await clicar(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Sair' }))
    await andar(50)
    expect(window.location.pathname).toBe('/pedidos')
    expect(screen.queryByText('Passo 1 de 4 · Cliente')).toBeNull()
  })
})
