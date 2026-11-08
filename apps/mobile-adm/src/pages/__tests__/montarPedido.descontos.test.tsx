// O passo 3 · Descontos da montagem, pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client): o cupom, o desconto combinado e o resumo vivo — todo número dele vem da prévia
// (`order-proposals?action=preview`), que o dublê responde por uma tabela escrita à mão (os números
// são literais, nunca recalculados aqui). O app manda só a escolha e não lê promoções, cupons nem
// pedidos. As frases são escritas por extenso (fonte independente do código).
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { AGORA } from '@/test/montados'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const ID_HELENA = 'aaaaaaaa-0000-4000-8000-000000000002'
const CLIENTES = [{ id: ID_HELENA, name: 'Helena Prado', email: 'helena@exemplo.invalid', phone: '11955554444', has_account: true, orders_total: 0 }]
const ID_COLAR = 'bbbbbbbb-0000-4000-8000-000000000002'
const PECAS = [
  {
    id: ID_COLAR,
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
  },
]

const PREVIA = 'order-proposals?action=preview'

interface Corpo {
  lines: unknown[]
  coupon_code: string | null
  manual_discount: { kind: string; value: number } | null
  customer_email: string
  [outra: string]: unknown
}

const resumo = (extra: Record<string, unknown> = {}) => ({
  subtotal: 120,
  promotion_discount: 0,
  coupon_discount: 0,
  coupon_applied: false,
  coupon_free_shipping: false,
  coupon_discarded: false,
  manual_discount: 0,
  items_total: 120,
  ...extra,
})
const ok = (data: unknown) => ({ data, error: null })
const http = (status: number, corpo: unknown) => ({
  data: null,
  error: Object.assign(new Error('Edge Function returned a non-2xx status code'), {
    name: 'FunctionsHttpError',
    context: new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } }),
  }),
})
const rede = () => ({ data: null, error: Object.assign(new Error('Failed to send a request to the Edge Function'), { name: 'FunctionsFetchError' }) })

/** O servidor, escrito à mão: cada escolha, a resposta. 120 é o Colar Estrela. */
const CUPONS: Record<string, { type: string; value: number; first_order_only: boolean; desconto: number; itens: number; pix: number }> = {
  SAUDADE10: { type: 'percent', value: 10, first_order_only: false, desconto: 12, itens: 108, pix: 102.6 },
  PRIMEIRA5: { type: 'percent', value: 5, first_order_only: true, desconto: 6, itens: 114, pix: 108.3 },
}
const RECUSAS: Record<string, string> = {
  XYZ: 'Cupom inválido.',
  BEMVINDA: 'Cupom válido apenas no primeiro pedido.',
}
const servidor = (corpo: Corpo) => {
  const codigo = corpo.coupon_code
  if (codigo && RECUSAS[codigo]) return http(422, { error: RECUSAS[codigo], code: 'coupon_refused' })
  const m = corpo.manual_discount
  if (m && m.kind === 'amount' && m.value === 119.5) {
    return ok({ summary: resumo(), coupon: null, manual_refusal: 'O desconto não pode zerar o pedido.', items_pix: { percent: 5, total: 114 } })
  }
  if (m && m.kind === 'amount' && m.value === 20) {
    return ok({ summary: resumo({ manual_discount: 20, items_total: 100 }), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 95 } })
  }
  if (m && m.kind === 'percent' && m.value === 10) {
    return ok({ summary: resumo({ manual_discount: 12, items_total: 108 }), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 102.6 } })
  }
  if (codigo && CUPONS[codigo]) {
    const c = CUPONS[codigo]
    return ok({
      summary: resumo({ coupon_discount: c.desconto, coupon_applied: true, items_total: c.itens }),
      coupon: { code: codigo, type: c.type, value: c.value, first_order_only: c.first_order_only },
      manual_refusal: null,
      items_pix: { percent: 5, total: c.pix },
    })
  }
  return ok({ summary: resumo(), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 114 } })
}

/** A próxima prévia fica segurada até `soltar()`, e responde o que `resposta` disser. */
let segurar: { resposta: unknown } | null = null
/** A próxima prévia volta 403, e a conta perde o papel: a conferência (`atelie_clock`) responde `42501`. */
let recusar = false
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
let soltar: (() => void) | null = null
const corpoDe = (i: number) => (fake.invocacoesDe(PREVIA)[i].opcoes as { body: Corpo }).body
const sinalDe = (i: number) => (fake.invocacoesDe(PREVIA)[i].opcoes as { signal?: AbortSignal }).signal
const ultimoCorpo = () => corpoDe(fake.invocacoesDe(PREVIA).length - 1)

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
const mudar = async (el: HTMLElement, valor: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value: valor } })
  })
  await andar(50)
}
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const regiaoDoResumo = () => screen.getByRole('region', { name: 'Resumo' })
const linhaDoResumo = (id: string) => within(regiaoDoResumo()).queryByTestId(id)
const campoDoCupom = () => screen.getByLabelText('Código do cupom') as HTMLInputElement
const aplicar = () => screen.getByRole('button', { name: 'Aplicar' })
const ligarCombinado = () => clicar(screen.getByRole('switch', { name: /Desconto combinado/ }))

beforeEach(() => {
  fake.reset()
  segurar = null
  soltar = null
  recusar = false
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.filaDeInvocacao(
    PREVIA,
    ...Array.from({ length: 80 }, () => () => {
      if (recusar) {
        fake.estado.admins.clear()
        fake.falharRpc('atelie_clock', RECUSA)
        return http(403, { error: 'forbidden' })
      }
      const resposta = servidor(ultimoCorpo())
      if (!segurar) return resposta
      const segura = segurar
      segurar = null
      return new Promise<never>((resolver) => {
        soltar = () => resolver(segura.resposta as never)
      })
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

/** Pedidos → "Montar pedido" → Helena → o Colar Estrela → Continuar: o passo 3, com a prévia lida. */
const abrirOPassoDosDescontos = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
  await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
  await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
  await clicar(continuar())
  await andar(50)
  expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
}

describe('passo 3 · o resumo vem da prévia do servidor', () => {
  it('manda só a escolha (as peças, o cupom, o desconto e o e-mail da cliente) e desenha o resumo com a linha do PIX', async () => {
    await abrirOPassoDosDescontos()
    expect(corpoDe(0)).toEqual({
      lines: [{ product_id: ID_COLAR, variant_id: null, quantity: 1, engraving_text: null }],
      coupon_code: null,
      manual_discount: null,
      customer_email: 'helena@exemplo.invalid',
    })
    expect(texto(linhaDoResumo('resumo-subtotal'))).toBe('Subtotal · 1 peçaR$ 120,00')
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
    expect(texto(linhaDoResumo('resumo-pix'))).toBe('No PIX: R$ 114,00 nos itens (5% de desconto). Frete à parte.')
    expect(texto(within(barra()).getByTestId('total-da-barra'))).toBe('R$ 120,00')
    // O app não lê promoções, cupons nem pedidos: o resumo é do servidor.
    const lidas = new Set(fake.leiturasDeDado())
    for (const proibida of ['promotions', 'coupons', 'orders']) expect(lidas.has(proibida)).toBe(false)
  })
})

describe('passo 3 · o cupom', () => {
  it('aplicar e remover: maiúsculas, o cartão com o código e o rótulo, a linha no resumo — e sem ela ao remover', async () => {
    await abrirOPassoDosDescontos()
    expect(screen.getByText('A mesma regra do checkout da loja, com o e-mail desta cliente.')).toBeInTheDocument()
    expect(campoDoCupom()).toHaveAttribute('placeholder', 'Ex.: SAUDADE10')

    // Vazio não vai à rede.
    const antes = fake.invocacoesDe(PREVIA).length
    await clicar(aplicar())
    expect(screen.getByRole('alert')).toHaveTextContent('Digite o código do cupom.')
    expect(fake.invocacoesDe(PREVIA)).toHaveLength(antes)

    await mudar(campoDoCupom(), 'saudade10')
    expect(campoDoCupom().value).toBe('SAUDADE10')
    await clicar(aplicar())
    await andar(50)
    const cartao = screen.getByTestId('cupom-aplicado')
    expect(texto(cartao)).toContain('SAUDADE10')
    expect(texto(cartao)).toContain('10% de desconto')
    expect(screen.queryByText('Digite o código do cupom.')).not.toBeInTheDocument()
    expect(ultimoCorpo().coupon_code).toBe('SAUDADE10')
    expect(texto(linhaDoResumo('resumo-cupom'))).toBe('Cupom SAUDADE10− R$ 12,00')
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 108,00')
    expect(texto(linhaDoResumo('resumo-pix'))).toBe('No PIX: R$ 102,60 nos itens (5% de desconto). Frete à parte.')

    await clicar(within(cartao).getByRole('button', { name: 'Remover o cupom SAUDADE10' }))
    await andar(50)
    expect(screen.queryByTestId('cupom-aplicado')).not.toBeInTheDocument()
    expect(ultimoCorpo().coupon_code).toBeNull()
    expect(linhaDoResumo('resumo-cupom')).toBeNull()
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
  })

  it('o cupom de primeira compra se nomeia assim: "5% na primeira compra"', async () => {
    await abrirOPassoDosDescontos()
    await mudar(campoDoCupom(), 'PRIMEIRA5')
    await clicar(aplicar())
    await andar(50)
    expect(texto(screen.getByTestId('cupom-aplicado'))).toContain('5% na primeira compra')
  })

  it.each([
    ['inexistente', 'XYZ', 'Cupom inválido.'],
    ['de primeira compra, para quem já comprou', 'BEMVINDA', 'Cupom válido apenas no primeiro pedido.'],
  ])('o cupom %s é recusado com o texto da loja, e não entra na conta', async (_n, codigo, frase) => {
    await abrirOPassoDosDescontos()
    await mudar(campoDoCupom(), codigo)
    await clicar(aplicar())
    await andar(50)
    expect(screen.getByRole('alert')).toHaveTextContent(frase)
    expect(screen.queryByTestId('cupom-aplicado')).not.toBeInTheDocument()
    expect(linhaDoResumo('resumo-cupom')).toBeNull()
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
  })
  it('o cupom recusado marca o campo como erro: aria-invalid, a recusa em aria-describedby e a borda de erro', async () => {
    await abrirOPassoDosDescontos()
    expect(campoDoCupom()).not.toHaveAttribute('aria-invalid')
    expect(campoDoCupom().className.split(/\s+/)).toContain('border-estrelinha-field')
    await mudar(campoDoCupom(), 'XYZ')
    await clicar(aplicar())
    await andar(50)
    const recusa = screen.getByRole('alert')
    expect(recusa).toHaveTextContent('Cupom inválido.')
    const campo = campoDoCupom()
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect((campo.getAttribute('aria-describedby') ?? '').split(/\s+/)).toContain(recusa.id)
    const classes = campo.className.split(/\s+/)
    expect(classes).toContain('border-estrelinha-alert')
    expect(classes).not.toContain('border-estrelinha-field')
  })
})

describe('passo 3 · o desconto combinado', () => {
  it('em reais e em %: o valor vai à prévia (o motivo não), e o resumo mostra a linha do desconto', async () => {
    await abrirOPassoDosDescontos()
    expect(screen.getByText('O valor que você acertou com ela na conversa.')).toBeInTheDocument()
    await ligarCombinado()
    expect(screen.getByRole('button', { name: 'Em reais' })).toHaveAttribute('aria-pressed', 'true')
    await mudar(screen.getByLabelText('Valor em reais'), '20')
    await mudar(screen.getByLabelText('Motivo'), 'segunda peça da família')
    expect(ultimoCorpo().manual_discount).toEqual({ kind: 'amount', value: 20 })
    expect(JSON.stringify(fake.invocacoesDe(PREVIA).map((i) => i.opcoes))).not.toContain('segunda peça da família')
    expect(texto(linhaDoResumo('resumo-combinado'))).toBe('Desconto combinado− R$ 20,00')
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 100,00')

    await clicar(screen.getByRole('button', { name: 'Em %' }))
    await mudar(screen.getByLabelText('Valor em %'), '10')
    expect(ultimoCorpo().manual_discount).toEqual({ kind: 'percent', value: 10 })
    expect(texto(linhaDoResumo('resumo-combinado'))).toBe('Desconto combinado− R$ 12,00')
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 108,00')
  })

  it('o motivo é obrigatório, e só é cobrado depois da tentativa: "Continuar" fica ligado e não avança', async () => {
    await abrirOPassoDosDescontos()
    await ligarCombinado()
    await mudar(screen.getByLabelText('Valor em reais'), '20')
    expect(screen.getByText('0/120')).toBeInTheDocument()
    expect(screen.getByText('Só para você. A cliente não vê o motivo.')).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveAttribute('placeholder', 'Ex.: segunda peça da família')
    // Antes da tentativa: nada cobrado, o botão ligado.
    expect(screen.queryByText('Escreva o motivo — ele fica no histórico.')).not.toBeInTheDocument()
    expect(within(barra()).queryByText('Escreva o motivo do desconto combinado.')).not.toBeInTheDocument()
    expect(continuar()).toBeEnabled()

    await clicar(continuar())
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    expect(screen.getByText('Escreva o motivo — ele fica no histórico.')).toBeInTheDocument()
    const motivo = within(barra()).getByText('Escreva o motivo do desconto combinado.')
    expect(continuar()).toHaveAttribute('aria-describedby', motivo.id)

    await mudar(screen.getByLabelText('Motivo'), 'Combinado no WhatsApp')
    expect(screen.getByText('21/120')).toBeInTheDocument()
    expect(screen.queryByText('Escreva o motivo — ele fica no histórico.')).not.toBeInTheDocument()
    expect(within(barra()).queryByText('Escreva o motivo do desconto combinado.')).not.toBeInTheDocument()
    await clicar(continuar())
    expect(screen.getByText('Passo 4 de 4 · Revisar')).toBeInTheDocument()
  })

  it('o desconto que zera o pedido é recusado logo, sem tentativa, e não entra na conta', async () => {
    await abrirOPassoDosDescontos()
    await ligarCombinado()
    await mudar(screen.getByLabelText('Valor em reais'), '119,50')
    expect(ultimoCorpo().manual_discount).toEqual({ kind: 'amount', value: 119.5 })
    expect(screen.getByRole('alert')).toHaveTextContent('O desconto não pode zerar o pedido.')
    expect(linhaDoResumo('resumo-combinado')).toBeNull()
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
    // Com o motivo escrito, ainda não avança: a recusa é o bloqueio.
    await mudar(screen.getByLabelText('Motivo'), 'Combinado no WhatsApp')
    await clicar(continuar())
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    expect(within(barra()).getByText('O desconto não pode zerar o pedido.')).toBeInTheDocument()
  })
})

describe('passo 3 · o resumo vivo', () => {
  it('cada mudança cancela a prévia anterior; a resposta que chega atrasada é descartada, e o resumo mantém o último valor enquanto confere', async () => {
    await abrirOPassoDosDescontos()
    await ligarCombinado()
    const n = fake.invocacoesDe(PREVIA).length
    // A prévia de "20" fica no ar, e responde números que não são de nenhuma escolha.
    segurar = { resposta: ok({ summary: resumo({ manual_discount: 99, items_total: 21 }), coupon: null, manual_refusal: null, items_pix: null }) }
    await mudar(screen.getByLabelText('Valor em reais'), '20')
    expect(within(regiaoDoResumo()).getByRole('status')).toHaveTextContent('Conferindo o resumo…')
    expect(regiaoDoResumo()).toHaveAttribute('aria-busy', 'true')
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')

    await mudar(screen.getByLabelText('Valor em reais'), '119,50')
    expect(sinalDe(n)?.aborted).toBe(true)
    expect(sinalDe(n + 1)?.aborted).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('O desconto não pode zerar o pedido.')

    await act(async () => soltar?.())
    await andar(50)
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
    expect(linhaDoResumo('resumo-combinado')).toBeNull()
    expect(within(regiaoDoResumo()).queryByRole('status')).not.toBeInTheDocument()
  })

  it('a rede caída é falha, com o resumo anterior na tela; "Tentar de novo" confere outra vez', async () => {
    await abrirOPassoDosDescontos()
    segurar = { resposta: rede() }
    await ligarCombinado()
    await mudar(screen.getByLabelText('Valor em reais'), '20')
    await act(async () => soltar?.())
    await andar(50)
    expect(screen.getByText('Não consegui conferir o resumo agora. Este é o último que conferi.')).toBeInTheDocument()
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 120,00')
    await clicar(screen.getByRole('button', { name: 'Tentar de novo' }))
    await andar(50)
    expect(screen.queryByText('Não consegui conferir o resumo agora. Este é o último que conferi.')).not.toBeInTheDocument()
    expect(texto(linhaDoResumo('resumo-itens'))).toBe('ItensR$ 100,00')
  })
})

describe('passo 3 · a conta sem papel', () => {
  const observar = async (ms: number) => {
    const instantes: string[] = []
    for (let feito = 0; feito < ms; feito += 50) {
      await andar(50)
      instantes.push(texto(document.body))
    }
    return instantes
  }

  it('a prévia do resumo em 403 com `atelie_clock` em `42501` ⇒ a recusa da tela de entrada, nunca a falha do resumo', async () => {
    await abrirOPassoDosDescontos()
    await ligarCombinado()
    recusar = true
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Valor em reais'), { target: { value: '20' } })
    })
    const instantes = await observar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes('Não consegui conferir o resumo agora'))).toBe(-1)
  })

  it('"Aplicar" o cupom em 403 com `atelie_clock` em `42501` ⇒ a recusa da tela de entrada, nunca a frase do cupom', async () => {
    await abrirOPassoDosDescontos()
    await mudar(campoDoCupom(), 'SAUDADE10')
    recusar = true
    await act(async () => {
      fireEvent.click(aplicar())
    })
    const instantes = await observar(3000)
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(instantes.findIndex((t) => t.includes('Não consegui conferir o cupom agora'))).toBe(-1)
  })
})
