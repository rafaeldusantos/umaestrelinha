// Feature `83` · T08 — a Loja ao vivo pela árvore REAL (`<App />` com sessão admin sobre o dublê do
// client). `LAV-06`, `LAV-07`, `LAV-08`, `LAV-50`, `LAV-55`, `LAV-60`, `LAV-62`.
//
// O processo roda em UTC (o "aparelho"). A régua do ciclo mede a partir do instante da ÚLTIMA chamada
// (o React Query recomeça o intervalo a cada atualização da query), nunca de um número cravado.
process.env.TZ = 'UTC'

import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { focusManager } from '@tanstack/react-query'
import { fake, type RespostaRpc } from '@/test/fakeSupabase'
import { montarApp } from '@/test/montarApp'
import { resumo } from '@/test/resumo'
import { movimentoComAcessos } from '@/test/movimento'
import { SEM_ACESSO } from '@/pages/LoginPage'
import { FALHA_DE_LEITURA, NAO_ATUALIZOU } from '@/shared/ui/leitura'
import { ATUALIZANDO } from '@/shared/ui/PullToRefresh'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const EMAIL = 'adri@exemplo.invalid'
const RECUSA = { message: 'permission denied for function store_movement', code: '42501' }
const REDE = { message: 'Failed to fetch' }
const QUINHENTOS = { message: 'boom', code: '500' }

/** O instante (relógio falso) de cada chamada de `store_movement`. */
let instantes: number[] = []

beforeEach(() => {
  fake.reset()
  fake.comSessao(EMAIL, { admin: true })
  fake.responderRpc('store_overview', resumo())
  instantes = []
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  focusManager.setFocused(undefined)
})

const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
const chamadas = () => fake.chamadasDe('store_movement').length

/** Responde o movimento (`r(n)` por chamada) e registra o instante de cada uma. */
const responder = (r: (n: number) => RespostaRpc) =>
  fake.aoChamarRpc('store_movement', (n) => {
    instantes.push(Date.now())
    return r(n)
  })
const sempre = (m = movimentoComAcessos()) => responder(() => ({ data: m, error: null }))

const abrir = async (estado?: Record<string, unknown>) => {
  await montarApp('/ao-vivo', estado ? { estado } : {})
  await andar(50)
}

/** Anda o relógio até `ms` depois da ÚLTIMA chamada de `store_movement`. */
const andarAte = async (ms: number) => {
  const alvo = instantes[instantes.length - 1] + ms
  await andar(Math.max(0, alvo - Date.now()))
}

const h1 = () => screen.getByRole('heading', { level: 1 })
const visitasHoje = () => screen.queryByRole('group', { name: /^Visitas, hoje, / })
const frescor = () => screen.queryByTestId('frescor-ao-vivo')
const barraDeAbas = () => screen.queryByRole('navigation', { name: 'Áreas do ateliê' })
const temClasse = (el: Element, token: string) => el.className.split(/\s+/).includes(token)

describe('a casca (LAV-06, LAV-07, LAV-62)', () => {
  it('com dado: `h1` "Loja ao vivo", o título do documento, sem a barra de abas, e os números da seção', async () => {
    sempre()
    await abrir()
    expect(h1().textContent).toBe('Loja ao vivo')
    expect(document.title).toBe('Loja ao vivo · Ateliê')
    expect(barraDeAbas()).toBeNull()
    expect(screen.queryByTestId('reserva-da-barra')).toBeNull()
    expect(visitasHoje()).toHaveAccessibleName('Visitas, hoje, 41')
    expect(fake.chamadasDe('store_movement')).toEqual([{ nome: 'store_movement', args: [] }])
  })

  it('carregando (a RPC pendurada): o `h1` e o título existem, sem frescor e sem número', async () => {
    fake.pendurarRpc('store_movement')
    await abrir()
    await andar(2000)
    expect(h1().textContent).toBe('Loja ao vivo')
    expect(document.title).toBe('Loja ao vivo · Ateliê')
    expect(screen.getByRole('region', { name: 'Acessos' })).toHaveAttribute('aria-busy', 'true')
    expect(frescor()).toBeNull()
    expect(visitasHoje()).toBeNull()
  })

  it('em falha: o `h1` e o título existem, a frase de falha, sem frescor', async () => {
    fake.falharRpc('store_movement', REDE)
    await abrir()
    await andar(3000)
    expect(h1().textContent).toBe('Loja ao vivo')
    expect(document.title).toBe('Loja ao vivo · Ateliê')
    expect(within(screen.getByRole('region', { name: 'Acessos' })).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(frescor()).toBeNull()
  })

  it('o cabeçalho sangra o recuo do `<main>` e fica preso no topo (tokens exatos)', async () => {
    sempre()
    await abrir()
    const cabecalho = screen.getByTestId('cabecalho-ao-vivo')
    for (const t of ['-mx-4', '-mt-4', 'sticky', 'top-0', 'min-h-[60px]', 'bg-estrelinha-surface', 'border-b', 'border-estrelinha-line']) {
      expect(temClasse(cabecalho, t)).toBe(true)
    }
    const voltar = within(cabecalho).getByRole('button', { name: 'Voltar' })
    expect(temClasse(voltar, 'h-11')).toBe(true)
    expect(temClasse(voltar, 'w-11')).toBe(true)
  })
})

describe('o "Voltar" (LAV-06)', () => {
  it('com `doApp`: volta UMA entrada (a anterior, montada por este teste)', async () => {
    sempre()
    window.history.pushState({}, '', '/descontos')
    await abrir({ doApp: true })
    const tamanho = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/descontos')
    expect(window.history.length).toBe(tamanho)
  })

  it('sem `doApp` (link colado, F5 sem estado): vai à Início POR SUBSTITUIÇÃO', async () => {
    sempre()
    window.history.pushState({}, '', '/descontos')
    await abrir()
    const tamanho = window.history.length
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    await andar(50)
    expect(window.location.pathname).toBe('/')
    expect(window.history.length).toBe(tamanho)
    // a entrada de /ao-vivo foi SUBSTITUÍDA: voltar daqui leva à anterior, nunca de novo a /ao-vivo
    act(() => window.history.back())
    await andar(50)
    expect(window.location.pathname).toBe('/descontos')
  })
})

describe('o período (LAV-50)', () => {
  it('o `periodo` do estado da entrada chega à seção (Ontem pressionado)', async () => {
    sempre()
    await abrir({ doApp: true, periodo: 'ontem' })
    expect(screen.getByRole('button', { name: 'Ontem' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: 'Visitas, ontem, 12' })).toBeInTheDocument()
  })

  it('trocar Hoje → Ontem → Semana não chama a RPC (os três vêm da mesma resposta)', async () => {
    sempre()
    await abrir()
    expect(chamadas()).toBe(1)
    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    await andar(20)
    expect(screen.getByRole('group', { name: 'Visitas, ontem, 12' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    await andar(20)
    expect(screen.getByRole('group', { name: 'Visitas, esta semana, 230' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoje' }))
    await andar(20)
    expect(chamadas()).toBe(1)
  })
})

describe('o ciclo de 15 s, só com a aba visível (LAV-08)', () => {
  it('visível: nenhuma chamada a 14,8 s da última, uma a 15 s', async () => {
    sempre()
    await abrir()
    expect(chamadas()).toBe(1)
    await andarAte(14_800)
    expect(chamadas()).toBe(1)
    await andarAte(15_300)
    expect(chamadas()).toBe(2)
    await andarAte(14_800)
    expect(chamadas()).toBe(2)
    await andarAte(15_300)
    expect(chamadas()).toBe(3)
  })

  it('em segundo plano: 90 s ATRAVESSANDO a virada do dia ⇒ nenhuma chamada; de volta ao foco, uma', async () => {
    // A virada a 10 s (o timer do hook dispararia dentro da janela em segundo plano).
    sempre(movimentoComAcessos({ lido_em: '2026-10-23T02:59:50.000Z', expira_em: '2026-10-23T03:00:00.000Z' }))
    await abrir()
    expect(chamadas()).toBe(1)
    act(() => focusManager.setFocused(false))
    await andar(90_000)
    expect(chamadas()).toBe(1)
    act(() => focusManager.setFocused(true))
    await andar(50)
    expect(chamadas()).toBe(2)
  })

  it('a recusa (`42501`) com o papel ainda admin PARA o ciclo: 90 s depois, nenhuma chamada nova', async () => {
    responder((n) => (n === 1 ? { data: movimentoComAcessos(), error: null } : { data: null, error: RECUSA }))
    await abrir()
    await andarAte(15_300)
    await andar(3000)
    const depoisDaRecusa = chamadas()
    expect(depoisDaRecusa).toBeGreaterThanOrEqual(2)
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(visitasHoje()).toBeNull()
    await andar(90_000)
    expect(chamadas()).toBe(depoisDaRecusa)
    expect(visitasHoje()).toBeNull()
  })
})

describe('o frescor (LAV-07, LAV-61)', () => {
  it('"Atualizado agora" na chegada, "há 5 s" depois de 5 s', async () => {
    sempre()
    await abrir()
    expect(frescor()?.textContent).toBe('Atualizado agora')
    await andar(5500)
    expect(frescor()?.textContent).toBe('Atualizado há 5 s')
  })

  it('a releitura em 500: "Não consegui atualizar agora." e os números ficam', async () => {
    responder((n) => (n === 1 ? { data: movimentoComAcessos(), error: null } : { data: null, error: QUINHENTOS }))
    await abrir()
    await andarAte(15_300)
    await andar(3000)
    expect(frescor()?.textContent).toBe(NAO_ATUALIZOU)
    expect(frescor()).toHaveAttribute('role', 'status')
    expect(visitasHoje()).toHaveAccessibleName('Visitas, hoje, 41')
  })

  it('com o relógio do aparelho 1 h ADIANTADO em relação ao `lido_em`, a linha continua "agora"', async () => {
    vi.setSystemTime(new Date('2026-10-22T15:30:00.000Z')) // lido_em é 14:30Z
    sempre()
    await abrir()
    expect(frescor()?.textContent).toBe('Atualizado agora')
  })
})

describe('puxar para atualizar só no topo (LAV-08, L-061)', () => {
  const puxar = (de: number, ate: number) => {
    const alvo = screen.getByTestId('cabecalho-ao-vivo')
    fireEvent.touchStart(alvo, { touches: [{ clientY: de }] })
    fireEvent.touchMove(alvo, { touches: [{ clientY: ate }] })
    fireEvent.touchEnd(alvo)
  }
  afterEach(() => {
    Object.defineProperty(window, 'scrollY', { value: 0, configurable: true, writable: true })
  })

  it('com 1 px de rolagem: nada', async () => {
    sempre()
    await abrir()
    Object.defineProperty(window, 'scrollY', { value: 1, configurable: true, writable: true })
    puxar(10, 200)
    await andar(50)
    expect(chamadas()).toBe(1)
  })

  it('o dedo SUBINDO no topo: nada', async () => {
    sempre()
    await abrir()
    puxar(200, 10)
    await andar(50)
    expect(chamadas()).toBe(1)
  })

  it('no topo, acima do limiar: uma chamada', async () => {
    sempre()
    await abrir()
    puxar(10, 120)
    await andar(50)
    expect(chamadas()).toBe(2)
    expect(screen.queryByText(ATUALIZANDO)).toBeNull()
  })
})

describe('recusa e falha (LAV-60)', () => {
  it('`42501` na primeira leitura ⇒ o Login com a frase da `72`, e nenhum número em instante nenhum', async () => {
    responder(() => {
      fake.estado.admins.clear()
      return { data: null, error: RECUSA }
    })
    await montarApp('/ao-vivo')
    for (let i = 0; i < 30; i++) {
      await andar(100)
      expect(screen.queryByRole('group', { name: /^(Visitas|Vendas|Conversão), / })).toBeNull()
      expect(document.body.textContent).not.toMatch(/Atualizado/)
    }
    expect(window.location.pathname).toBe('/login')
    expect(screen.getByText(SEM_ACESSO)).toBeInTheDocument()
    expect(chamadas()).toBe(1)
  })

  it('500 ⇒ a falha do bloco, nunca a recusa', async () => {
    fake.falharRpc('store_movement', QUINHENTOS)
    await abrir()
    await andar(3000)
    expect(window.location.pathname).toBe('/ao-vivo')
    expect(screen.queryByText(SEM_ACESSO)).toBeNull()
    expect(within(screen.getByRole('region', { name: 'Acessos' })).getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(fake.estado.tabelas.filter((t) => t === 'user_roles')).toHaveLength(1)
  })
})
