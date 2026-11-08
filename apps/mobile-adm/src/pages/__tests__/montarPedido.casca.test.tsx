// A casca da montagem (o cabeçalho com o indicador e a barra fixa), pela árvore REAL (`<App />` com
// sessão admin sobre o dublê do client). O total da barra vem da prévia do servidor
// (`order-proposals?action=preview`), que o dublê responde com números escritos à mão. As frases e as
// medidas do protótipo são escritas por extenso (fonte independente do código). jsdom não mede layout:
// o que a fonte do sistema a 200 % faz com o cabeçalho e a barra é uma régua de CLASSE aqui, e a medida
// fica para o navegador.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type Elo } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
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
  lines: { quantity: number }[]
  coupon_code: string | null
  manual_discount: { kind: string; value: number } | null
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

/** O servidor, escrito à mão. Uma peça: 120; duas: 240; 100 % de desconto combinado: a recusa. */
const servidor = (corpo: Corpo) => {
  const m = corpo.manual_discount
  if (m && m.kind === 'percent' && m.value === 100) {
    return ok({ summary: resumo(), coupon: null, manual_refusal: 'O desconto não pode zerar o pedido.', items_pix: { percent: 5, total: 114 } })
  }
  const quantidade = corpo.lines.reduce((s, l) => s + l.quantity, 0)
  if (quantidade === 2) return ok({ summary: resumo({ subtotal: 240, items_total: 240 }), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 228 } })
  return ok({ summary: resumo(), coupon: null, manual_refusal: null, items_pix: { percent: 5, total: 114 } })
}
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
const mudar = async (el: HTMLElement, valor: string) => {
  await act(async () => {
    fireEvent.change(el, { target: { value: valor } })
  })
  await andar(50)
}
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const barra = () => screen.getByTestId('barra-da-montagem')
const continuar = () => within(barra()).getByRole('button', { name: 'Continuar' })
const total = () => texto(within(barra()).getByTestId('total-da-barra'))
const indicador = () => screen.getByRole('navigation', { name: 'Passos da montagem' })
const passo = (n: number, nome: string) => within(indicador()).getByRole('button', { name: `Passo ${n}: ${nome}` })
const segmento = (botao: HTMLElement) => botao.querySelector('[data-segmento]')

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('atelie_clock', { lido_em: AGORA })
  fake.responderTabela('order_list', { data: [], error: null, count: 0 })
  fake.filaDeInvocacao('order-proposals?action=list', ...Array.from({ length: 40 }, () => () => ({ data: { proposals: [], agora: AGORA }, error: null })))
  fake.filaDeInvocacao(PREVIA, ...Array.from({ length: 80 }, () => () => servidor(ultimoCorpo())))
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

const abrirAMontagem = async () => {
  await montarApp('/pedidos')
  await andar(50)
  await clicar(screen.getByRole('link', { name: 'Montar pedido' }))
  await andar(50)
}
const escolherHelenaESeguir = async () => {
  await clicar(within(screen.getByRole('list', { name: 'Clientes' })).getByRole('button', { name: /Helena Prado/ }))
  await clicar(continuar())
  await andar(50)
  expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
}
const acrescentarOColar = async () => {
  await clicar(within(screen.getByRole('list', { name: 'Joias' })).getByRole('button', { name: /Colar Estrela/ }))
  await clicar(within(screen.getByRole('dialog')).getByRole('button', { name: /^Acrescentar · / }))
  await andar(50)
}

describe('a barra fixa · o total no passo das peças', () => {
  it('"—" sem peças; com a peça na sacola, o total da prévia logo no passo 2; sem peças de novo, "—"', async () => {
    await abrirAMontagem()
    await escolherHelenaESeguir()
    expect(texto(within(barra()).getByText('Nenhuma peça ainda'))).toBe('Nenhuma peça ainda')
    expect(total()).toBe('—')

    await acrescentarOColar()
    expect(screen.getByText('Passo 2 de 4 · Peças')).toBeInTheDocument()
    expect(within(barra()).getByText('Itens · 1 peça · frete à parte')).toBeInTheDocument()
    expect(total()).toBe('R$ 120,00')

    await clicar(screen.getByRole('button', { name: 'Remover Colar Estrela' }))
    expect(within(barra()).getByText('Nenhuma peça ainda')).toBeInTheDocument()
    expect(total()).toBe('—')
  })
})

describe('a barra fixa · a tipografia do total', () => {
  it('o total em serifa 700, na primária, a 18 px', async () => {
    await abrirAMontagem()
    await escolherHelenaESeguir()
    await acrescentarOColar()
    const el = within(barra()).getByTestId('total-da-barra')
    expect(tokens(el)).toEqual(expect.arrayContaining(['font-display', 'font-bold', 'text-estrelinha-primary', 'text-lg']))
    expect(tokens(el)).not.toContain('text-estrelinha-ink')
  })
})

describe('o cabeçalho · o indicador de passos', () => {
  it('cada segmento com o nome visível e a barra de 4 px; o atual em accent (e `aria-current`), os feitos em primária, os demais em line', async () => {
    await abrirAMontagem()
    const nomes = ['Cliente', 'Peças', 'Descontos', 'Revisar']
    nomes.forEach((nome, i) => {
      const b = passo(i + 1, nome)
      const rotulo = within(b).getByText(nome)
      expect(rotulo).toBeVisible()
      expect(rotulo).not.toHaveAttribute('aria-hidden')
      expect(tokens(rotulo)).toContain('text-[12px]')
      expect(tokens(segmento(b))).toContain('h-1')
    })
    expect(passo(1, 'Cliente')).toHaveAttribute('aria-current', 'step')
    expect(tokens(segmento(passo(1, 'Cliente')))).toContain('bg-estrelinha-accent')
    expect(tokens(segmento(passo(2, 'Peças')))).toContain('bg-estrelinha-line')

    await escolherHelenaESeguir()
    expect(passo(2, 'Peças')).toHaveAttribute('aria-current', 'step')
    expect(passo(1, 'Cliente')).not.toHaveAttribute('aria-current')
    expect(tokens(segmento(passo(2, 'Peças')))).toContain('bg-estrelinha-accent')
    expect(tokens(segmento(passo(2, 'Peças')))).not.toContain('bg-estrelinha-primary')
    expect(tokens(segmento(passo(1, 'Cliente')))).toContain('bg-estrelinha-primary')
    expect(tokens(segmento(passo(1, 'Cliente')))).not.toContain('bg-estrelinha-accent')
    expect(tokens(segmento(passo(3, 'Descontos')))).toContain('bg-estrelinha-line')
    expect(tokens(segmento(passo(4, 'Revisar')))).toContain('bg-estrelinha-line')
  })

  it('o título a 17 px e o subtítulo a 12 px', async () => {
    await abrirAMontagem()
    expect(tokens(screen.getByRole('heading', { level: 1, name: 'Montar pedido' }))).toContain('text-[17px]')
    expect(tokens(screen.getByText('Passo 1 de 4 · Cliente'))).toContain('text-[12px]')
  })
})

describe('a barra fixa · o motivo do bloqueio e o botão', () => {
  it('o motivo na cor de espera, a 13 px, acima do total; o botão com 190 px', async () => {
    await abrirAMontagem()
    const motivo = within(barra()).getByText('Escolha a cliente para continuar.')
    expect(tokens(motivo)).toEqual(expect.arrayContaining(['text-estrelinha-wait', 'text-[13px]']))
    expect(tokens(motivo)).not.toContain('text-estrelinha-ink')
    // Acima do total: vem antes dele na barra.
    expect(motivo.compareDocumentPosition(within(barra()).getByTestId('total-da-barra')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(continuar()).toHaveAttribute('aria-describedby', motivo.id)
    expect(tokens(continuar())).toContain('min-w-[190px]')
  })

  it('no passo 3, o desconto combinado que zeraria o pedido aparece na barra logo, antes de tocar em "Continuar"', async () => {
    await abrirAMontagem()
    await escolherHelenaESeguir()
    await acrescentarOColar()
    await clicar(continuar())
    await andar(50)
    expect(screen.getByText('Passo 3 de 4 · Descontos')).toBeInTheDocument()
    await clicar(screen.getByRole('switch', { name: /Desconto combinado/ }))
    await clicar(screen.getByRole('button', { name: 'Em %' }))
    await mudar(screen.getByLabelText('Desconto (%)'), '100')
    expect(ultimoCorpo().manual_discount).toEqual({ kind: 'percent', value: 100 })

    const motivo = within(barra()).getByText('O desconto não pode zerar o pedido.')
    expect(tokens(motivo)).toContain('text-estrelinha-wait')
    expect(continuar()).toHaveAttribute('aria-describedby', motivo.id)
    // O motivo que depende da tentativa (o texto do motivo vazio) continua esperando o toque.
    expect(within(barra()).queryByText('Escreva o motivo do desconto combinado.')).not.toBeInTheDocument()
  })

  it('no passo 3, sem a recusa do servidor, a barra não cobra nada antes da tentativa', async () => {
    await abrirAMontagem()
    await escolherHelenaESeguir()
    await acrescentarOColar()
    await clicar(continuar())
    await andar(50)
    await clicar(screen.getByRole('switch', { name: /Desconto combinado/ }))
    await mudar(screen.getByLabelText('Desconto (R$)'), '20')
    expect(barra().querySelector('#motivo-do-bloqueio')).toBeNull()
  })
})

describe('a fonte do sistema a 200 % · o cabeçalho e a barra não se sobrepõem (régua de classe)', () => {
  it('o cabeçalho só fica preso ao topo em tela alta; os controles dele não crescem com a fonte', async () => {
    await abrirAMontagem()
    const cabecalho = screen.getByRole('heading', { level: 1, name: 'Montar pedido' }).closest('header')
    expect(cabecalho).not.toBeNull()
    expect(tokens(cabecalho)).not.toContain('sticky')
    expect(tokens(cabecalho)).toContain('[@media(min-height:640px)]:sticky')
    expect(tokens(screen.getByRole('button', { name: 'Fechar a montagem' }))).toEqual(expect.arrayContaining(['h-[48px]', 'w-[48px]']))
    for (const [n, nome] of [
      [1, 'Cliente'],
      [2, 'Peças'],
      [3, 'Descontos'],
      [4, 'Revisar'],
    ] as const) {
      expect(tokens(passo(n, nome))).toContain('min-h-[44px]')
      expect(tokens(passo(n, nome))).not.toContain('min-h-11')
    }
  })
})
