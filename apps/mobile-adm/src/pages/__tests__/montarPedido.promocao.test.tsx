// A promoção vigente no passo 2 · Peças, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client): na folha da variação ("<promoção> · 15% nesta peça") e na linha da sacola (a etiqueta
// "<promoção> · 15%"). Quem diz a promoção é a prévia do servidor (`order-proposals?action=preview`),
// por linha — o app não lê promoções. O dublê responde por uma tabela escrita à mão. O preço da linha
// continua o cheio; com a prévia falhando, nada aparece e nada bloqueia.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { AGORA } from '@/test/montados'
import { SEM_ACESSO } from '@/pages/LoginPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const CLIENTES = [{ id: 'aaaaaaaa-0000-4000-8000-000000000002', name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 }]
const ID_COLAR = 'bbbbbbbb-0000-4000-8000-000000000002'
const ID_BRINCO = 'bbbbbbbb-0000-4000-8000-000000000004'
const peca = (id: string, name: string, base_price: number) => ({
  id,
  name,
  base_price,
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
})
const PECAS = [peca(ID_COLAR, 'Colar Estrela', 120), peca(ID_BRINCO, 'Brinco Lua', 80)]

const PREVIA = 'order-proposals?action=preview'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
type Corpo = { lines: { product_id: string }[] }

const ok = (data: unknown) => ({ data, error: null })
const http = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  }),
})
const rede = () => ({ data: null, error: Object.assign(new Error('Failed to send a request to the Edge Function'), { name: 'FunctionsFetchError' }) })

/** O servidor, escrito à mão: o Colar Estrela está na "Promoção de outubro", 15%; o Brinco Lua, em nenhuma. */
const servidor = (corpo: Corpo) =>
  ok({
    summary: { subtotal: 0, promotion_discount: 0, coupon_discount: 0, coupon_applied: false, coupon_free_shipping: false, coupon_discarded: false, manual_discount: 0, items_total: 0 },
    coupon: null,
    manual_refusal: null,
    items_pix: null,
    lines: corpo.lines.map((l) => ({ promotion: l.product_id === ID_COLAR ? { name: 'Promoção de outubro', percent: 15 } : null })),
  })

let modo: 'ok' | 'rede' | 'recusa' = 'ok'
const ultimoCorpo = () => {
  const todas = fake.invocacoesDe(PREVIA)
  return (todas[todas.length - 1].opcoes as { body: Corpo }).body
}

const comoOPostgrest = (linhas: unknown[]) => (cadeia: Elo[]) => {
  const select = cadeia.find((e) => e.metodo === 'select')
  if ((select?.args[1] as { head?: boolean } | undefined)?.head) return { data: null, error: null, count: linhas.length }
  return { data: linhas, error: null }
}

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const clicar = async (el: HTMLElement) => {
  await act(async () => {
    fireEvent.click(el)
  })
  await andar(50)
}
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const folha = () => screen.getByRole('dialog')
const joia = (nome: string) => within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: new RegExp(nome) })
const linhaDe = (nome: string) => screen.getAllByTestId('linha-da-sacola').find((l) => texto(l).includes(nome))!

beforeEach(() => {
  fake.reset()
  modo = 'ok'
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.filaDeInvocacao(
    PREVIA,
    ...Array.from({ length: 80 }, () => () => {
      if (modo === 'rede') return rede()
      if (modo === 'recusa') {
        fake.estado.admins.clear()
        fake.falharRpc('atelie_clock', RECUSA)
        return http(403, { error: 'forbidden' })
      }
      return servidor(ultimoCorpo())
    }),
  )
  fake.responderTabela('customer_list', { data: CLIENTES, error: null })
  fake.responderTabela('addresses', { data: [], error: null })
  fake.responderTabela('products', comoOPostgrest(PECAS))
  fake.responderTabela('product_variants', comoOPostgrest([]))
  vi.useFakeTimers({ shouldAdvanceTime: true })
  window.history.pushState({}, '', '/__antes-deste-teste')
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Pedidos → "Montar pedido" → Helena → Continuar: o passo 2, com o catálogo lido. */
const abrirOPassoDasPecas = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
}
const acrescentar = async (nome: string) => {
  await clicar(joia(nome))
  await andar(50)
  await clicar(within(folha()).getByRole('button', { name: /^Acrescentar · / }))
  await andar(50)
}

describe('passo 2 · a promoção vigente, pela prévia do servidor', () => {
  it('na folha: "<promoção> · 15% nesta peça" ao lado do preço — e nada na peça sem promoção', async () => {
    await abrirOPassoDasPecas()
    await clicar(joia('Colar Estrela'))
    await andar(50)
    expect(texto(folha())).toContain('Promoção de outubro · 15% nesta peça')
    // A prévia leva a escolha da folha (a peça e a quantidade), e nunca o preço.
    expect(ultimoCorpo().lines).toEqual([{ product_id: ID_COLAR, variant_id: null, quantity: 1, engraving_text: null }])
    // O botão continua no preço cheio: a etiqueta é só exibição.
    expect(texto(within(folha()).getByRole('button', { name: /^Acrescentar · / }))).toBe('Acrescentar · R$ 120,00')
    await act(async () => window.history.back())
    await andar(50)

    await clicar(joia('Brinco Lua'))
    await andar(50)
    expect(texto(folha())).not.toContain('nesta peça')
    expect(texto(folha())).not.toContain('Promoção')
  })

  it('na sacola: a etiqueta "<promoção> · 15%" na linha da peça em promoção, com o preço cheio; a outra linha, sem etiqueta', async () => {
    await abrirOPassoDasPecas()
    await acrescentar('Colar Estrela')
    await acrescentar('Brinco Lua')
    await andar(50)
    expect(ultimoCorpo().lines.map((l) => l.product_id)).toEqual([ID_COLAR, ID_BRINCO])
    expect(texto(linhaDe('Colar Estrela'))).toContain('Promoção de outubro · 15%')
    expect(texto(linhaDe('Colar Estrela'))).toContain('1 × R$ 120,00')
    expect(texto(linhaDe('Brinco Lua'))).not.toContain('Promoção')
  })

  it('com a prévia falhando, nenhuma etiqueta — e nada bloqueia', async () => {
    modo = 'rede'
    await abrirOPassoDasPecas()
    await clicar(joia('Colar Estrela'))
    await andar(50)
    expect(texto(folha())).not.toContain('Promoção')
    await clicar(within(folha()).getByRole('button', { name: /^Acrescentar · / }))
    await andar(50)
    expect(texto(linhaDe('Colar Estrela'))).not.toContain('Promoção')
    expect(continuar()).toBeEnabled()
  })

  it('a prévia da sacola em 403 com `atelie_clock` em `42501` ⇒ a recusa da tela de entrada', async () => {
    await abrirOPassoDasPecas()
    await clicar(joia('Colar Estrela'))
    await andar(50)
    modo = 'recusa'
    await clicar(within(folha()).getByRole('button', { name: /^Acrescentar · / }))
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })

  it('a prévia da folha em 403 com `atelie_clock` em `42501` ⇒ a recusa da tela de entrada', async () => {
    await abrirOPassoDasPecas()
    modo = 'recusa'
    await clicar(joia('Colar Estrela'))
    await andar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
  })
})
