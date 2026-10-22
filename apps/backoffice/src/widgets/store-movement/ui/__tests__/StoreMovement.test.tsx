// Feature 71 · task 25 — o bloco "Movimento da loja", com o hook REAL e só a RPC dublada.
//
// `VIS-01`, `VIS-02`, `VIS-05`, `VIS-06`, `VIS-07`, `VIS-08`, `VIS-10`, `VIS-11` (proxies), `VIS-38`,
// `VIS-39`, `VIS-40`, `VIS-44`. O que o jsdom não mede (largura, quebra de linha, alvo de 44px de
// verdade, toque fora do popover num aparelho) é da prova em navegador (task 29); aqui ficam os
// proxies por TOKEN EXATO.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider, defaultScheduler, notifyManager } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc } }))

import StoreMovement from '../StoreMovement'
import { STORE_MOVEMENT_KEY, type StoreMovement as Movimento } from '@/entities/stats'
import { VISIT_INFO_TEXT } from '../../model/labels'

/** `formatPrice` separa `R$` do número com espaço inseparável. */
const reais = (texto: string) => texto.replace(' ', ' ')

/** Token exato: `h-11` não casa `min-h-11`, `grid-cols-2` não casa `lg:grid-cols-2` (`L-034`). */
const temToken = (el: Element, token: string) =>
  (el.getAttribute('class') ?? '').split(/\s+/).includes(token)

const periodo = (p: Partial<Movimento['periodos']['hoje']> = {}) => ({
  visitas: 0, vendas: 0, faturamento: 0, ticket: null as number | null, ...p,
})

/** Quarta-feira, 21/10, 15h32 em Brasília. */
const movimento = (m: Partial<Movimento> = {}): Movimento => ({
  hoje: '2026-10-21',
  ontem: '2026-10-20',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-22T03:00:00+00:00',
  lido_em: '2026-10-21T18:32:05.123+00:00',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: '2026-10-01T12:00:00+00:00',
  contagem_desde_dia: '2026-10-01',
  ultima_visita: '2026-10-21T18:10:00+00:00',
  ultima_visita_dia: '2026-10-21',
  teto_dia: null,
  periodos: {
    hoje: periodo({ visitas: 1234, vendas: 3, faturamento: 100, ticket: 33.33 }),
    ontem: periodo({ visitas: 7, vendas: 1, faturamento: 59.9, ticket: 59.9 }),
    semana: periodo({ visitas: 2000, vendas: 4, faturamento: 159.9, ticket: 39.98 }),
  },
  ...m,
})

let client: QueryClient
const montar = () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return render(<StoreMovement />, { wrapper })
}

const secao = () => screen.getByRole('region', { name: 'Movimento da loja' })

/** Os quatro cards, na ordem do DOM: o rótulo e o valor (o segundo `<p>`) de cada um. */
const cards = () => {
  const grade = secao().querySelector('[data-grade="movimento"]')
  expect(grade).not.toBeNull()
  return Array.from(grade!.children).map(card => {
    const ps = card.querySelectorAll('p')
    return { rotulo: ps[0]?.textContent ?? '', valor: ps[1]?.textContent ?? null, el: card }
  })
}

const escolherAba = (nome: string) => {
  // O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`.
  fireEvent.mouseDown(screen.getByRole('tab', { name: nome }), { button: 0, ctrlKey: false })
}

/** Uma promessa que o teste resolve quando quiser — a resposta "segurada". */
const segurar = () => {
  let soltar!: (v: unknown) => void
  const promessa = new Promise(r => { soltar = r })
  return { promessa, soltar }
}

beforeEach(() => {
  rpc.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('VIS-01 — o bloco, as abas e os quatro cards', () => {
  it('`h2` "Movimento da loja" nomeia a seção; abas Hoje, Ontem, Esta semana, com Hoje selecionada', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    const titulo = screen.getByRole('heading', { level: 2, name: 'Movimento da loja' })
    expect(secao().getAttribute('aria-labelledby')).toBe(titulo.id)
    const abas = screen.getAllByRole('tab')
    expect(abas.map(a => a.textContent)).toEqual(['Hoje', 'Ontem', 'Esta semana'])
    expect(abas[0].getAttribute('aria-selected')).toBe('true')
  })

  it('os quatro cards, nesta ordem: Visitas únicas, Vendas, Faturamento, Ticket médio', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')
    expect(cards().map(c => c.rotulo)).toEqual(['Visitas únicas', 'Vendas', 'Faturamento', 'Ticket médio'])
  })
})

describe('VIS-02 — trocar de aba não lê nada', () => {
  it('cada aba mostra o próprio período, a RPC continua em UMA chamada, e só uma aba fica selecionada', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')
    expect(cards().map(c => c.valor)).toEqual(['1.234', '3', reais('R$ 100,00'), reais('R$ 33,33')])

    escolherAba('Ontem')
    await screen.findByText('Ontem, 20/10')
    expect(cards().map(c => c.valor)).toEqual(['7', '1', reais('R$ 59,90'), reais('R$ 59,90')])

    escolherAba('Esta semana')
    await screen.findByText('De 19/10 a 21/10')
    expect(cards().map(c => c.valor)).toEqual(['2.000', '4', reais('R$ 159,90'), reais('R$ 39,98')])

    expect(rpc).toHaveBeenCalledTimes(1)
    const selecionadas = screen.getAllByRole('tab').filter(a => a.getAttribute('aria-selected') === 'true')
    expect(selecionadas.map(a => a.textContent)).toEqual(['Esta semana'])
  })

  it('a `tablist` se chama "Período", e as setas ← e → movem a seleção', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    expect(screen.getByRole('tablist', { name: 'Período' })).toBeTruthy()
    const hoje = screen.getByRole('tab', { name: 'Hoje' })
    act(() => hoje.focus())
    fireEvent.keyDown(hoje, { key: 'ArrowRight' })
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Ontem' }).getAttribute('aria-selected')).toBe('true'))
    expect(screen.getByText('Ontem, 20/10')).toBeTruthy()

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Ontem' }), { key: 'ArrowLeft' })
    await waitFor(() => expect(hoje.getAttribute('aria-selected')).toBe('true'))
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})

describe('VIS-05 — carregando', () => {
  it('resposta segurada: esqueleto nos quatro cards, `aria-busy`, e nenhum número nem travessão', async () => {
    const { promessa, soltar } = segurar()
    rpc.mockReturnValue(promessa)
    montar()

    expect(secao().getAttribute('aria-busy')).toBe('true')
    expect(secao().querySelectorAll('[data-skeleton="valor"]')).toHaveLength(4)
    expect(cards().map(c => c.valor)).toEqual([null, null, null, null])
    const texto = secao().textContent ?? ''
    expect(texto).not.toMatch(/\d/)
    expect(texto).not.toContain('R$')
    expect(texto).not.toContain('—')

    await act(async () => soltar({ data: movimento(), error: null }))
    await screen.findByText('Hoje, 21/10')
    expect(secao().hasAttribute('aria-busy')).toBe(false)
    expect(secao().querySelectorAll('[data-skeleton="valor"]')).toHaveLength(0)
  })

  it('releitura segurada COM dados na tela: os valores continuam, sem esqueleto e sem `aria-busy`', async () => {
    rpc.mockResolvedValueOnce({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    const { promessa, soltar } = segurar()
    rpc.mockReturnValueOnce(promessa)
    await act(async () => {
      void client.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY })
    })
    expect(rpc).toHaveBeenCalledTimes(2)

    expect(cards().map(c => c.valor)).toEqual(['1.234', '3', reais('R$ 100,00'), reais('R$ 33,33')])
    expect(secao().hasAttribute('aria-busy')).toBe(false)
    expect(secao().querySelectorAll('[data-skeleton="valor"]')).toHaveLength(0)

    await act(async () => soltar({ data: movimento(), error: null }))
  })
})

describe('VIS-06 — a leitura falha', () => {
  it('primeira carga com `{ error }`: UMA mensagem, UM botão de 44px, nenhum valor; o botão relê', async () => {
    // O supabase-js não rejeita: devolve `{ error }`. O hook tenta duas vezes (`retry: 1`).
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    montar()

    const mensagens = await screen.findAllByText('Não foi possível carregar os números do período.', {}, { timeout: 4000 })
    expect(mensagens).toHaveLength(1)
    const botoes = screen.getAllByRole('button', { name: 'Tentar de novo' })
    expect(botoes).toHaveLength(1)
    expect(temToken(botoes[0], 'h-11')).toBe(true)

    expect(secao().querySelector('[data-grade="movimento"]')).toBeNull()
    expect(secao().textContent).not.toContain('R$')
    expect(secao().textContent).not.toMatch(/\d/)
    const chamadas = rpc.mock.calls.length
    expect(chamadas).toBe(2)

    rpc.mockResolvedValue({ data: movimento(), error: null })
    fireEvent.click(botoes[0])
    await screen.findByText('Hoje, 21/10')
    expect(rpc.mock.calls.length).toBe(chamadas + 1)
  })

  it('releitura que FALHA com dados na tela: os valores ficam, e o "Atualizado às" é da leitura boa', async () => {
    rpc.mockResolvedValueOnce({ data: movimento(), error: null })
    montar()
    await screen.findByText('Atualizado às 15h32')

    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    await act(async () => {
      void client.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY })
    })
    await waitFor(() => expect(client.getQueryState(STORE_MOVEMENT_KEY)?.status).toBe('error'), { timeout: 4000 })

    expect(cards().map(c => c.valor)).toEqual(['1.234', '3', reais('R$ 100,00'), reais('R$ 33,33')])
    expect(screen.getByText('Atualizado às 15h32')).toBeTruthy()
    expect(screen.queryByText('Não foi possível carregar os números do período.')).toBeNull()
  })
})

describe('VIS-07, VIS-39, VIS-44 — o que se desenha', () => {
  it('período sem venda: Vendas `0`, Faturamento `R$ 0,00`, Ticket `R$ 0,00` — nunca `—`', async () => {
    rpc.mockResolvedValue({
      data: movimento({ periodos: { hoje: periodo({ visitas: 5 }), ontem: periodo(), semana: periodo() } }),
      error: null,
    })
    montar()
    await screen.findByText('Hoje, 21/10')

    const [visitas, vendas, faturamento, ticket] = cards()
    expect(visitas.valor).toBe('5')
    expect(vendas.valor).toBe('0')
    expect(faturamento.valor).toBe(reais('R$ 0,00'))
    expect(ticket.valor).toBe(reais('R$ 0,00'))
    expect(secao().textContent).not.toContain('—')
  })

  it('contador nunca usado: Visitas `0` (nunca `—`), e o texto que diz por quê', async () => {
    rpc.mockResolvedValue({
      data: movimento({
        contagem_desde: null, contagem_desde_dia: null, ultima_visita: null, ultima_visita_dia: null,
        periodos: { hoje: periodo(), ontem: periodo(), semana: periodo() },
      }),
      error: null,
    })
    montar()
    await screen.findByText('Hoje, 21/10')

    expect(cards()[0].valor).toBe('0')
    expect(
      screen.getByText('Nenhuma visita registrada ainda. O contador só conta na loja em umaestrelinha.com.br.'),
    ).toBeTruthy()
    expect(screen.queryByText(/Última visita registrada/)).toBeNull()
  })

  it('o teto atingido hoje aparece em Hoje e em Esta semana, e some em Ontem', async () => {
    const TEXTO = 'Em 21/10 o limite de 5.000 visitas por dia foi atingido, e a contagem desse dia parou ali.'
    rpc.mockResolvedValue({ data: movimento({ teto_dia: '2026-10-21' }), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')
    expect(screen.getByText(TEXTO)).toBeTruthy()

    escolherAba('Ontem')
    await screen.findByText('Ontem, 20/10')
    expect(screen.queryByText(TEXTO)).toBeNull()

    escolherAba('Esta semana')
    await screen.findByText('De 19/10 a 21/10')
    expect(screen.getByText(TEXTO)).toBeTruthy()
  })

  it('VIS-38 e VIS-40: "Contando desde" no card de Visitas só nos períodos que começam antes; a última visita abaixo', async () => {
    rpc.mockResolvedValue({
      data: movimento({
        hoje: '2026-10-22', ontem: '2026-10-21', inicio_semana: '2026-10-19',
        lido_em: '2026-10-22T13:00:00+00:00', expira_em: '2026-10-23T03:00:00+00:00',
        contagem_desde: '2026-10-21T18:32:00Z', contagem_desde_dia: '2026-10-21',
        ultima_visita: '2026-10-22T12:05:00Z', ultima_visita_dia: '2026-10-22',
      }),
      error: null,
    })
    montar()
    await screen.findByText('Hoje, 22/10')
    const LINHA = 'Contando desde 21/10 às 15h32'
    expect(within(cards()[0].el as HTMLElement).queryByText(LINHA)).toBeNull()
    expect(screen.getByText('Última visita registrada: hoje às 09h05')).toBeTruthy()
    expect(screen.getByText('Atualizado às 10h00')).toBeTruthy()

    escolherAba('Ontem')
    await screen.findByText('Ontem, 21/10')
    expect(within(cards()[0].el as HTMLElement).getByText(LINHA)).toBeTruthy()

    escolherAba('Esta semana')
    await screen.findByText('De 19/10 a 22/10')
    expect(within(cards()[0].el as HTMLElement).getByText(LINHA)).toBeTruthy()
  })
})

describe('VIS-08 — o ⓘ de Visitas únicas', () => {
  it('é um `<button>` de 44px no card de Visitas, com nome e `aria-expanded`', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    const botao = screen.getByRole('button', { name: 'O que conta como visita única' })
    // A TAG é o que dá Enter e Espaço: o jsdom não sintetiza a ação padrão do teclado, e um
    // `<div onClick>` renderizaria e clicaria igual (lição da feature 56).
    expect(botao.tagName).toBe('BUTTON')
    expect(botao.getAttribute('type')).toBe('button')
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    expect(temToken(botao, 'h-11')).toBe(true)
    expect(temToken(botao, 'w-11')).toBe(true)
    expect(cards()[0].el.contains(botao)).toBe(true)
  })

  it('abre um Popover com o texto INTEIRO, e Esc fecha devolvendo o foco ao botão', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    const botao = screen.getByRole('button', { name: 'O que conta como visita única' })
    act(() => botao.focus())
    fireEvent.click(botao)
    const dialogo = await screen.findByRole('dialog')
    expect(dialogo.textContent).toBe(VISIT_INFO_TEXT)
    expect(botao.getAttribute('aria-expanded')).toBe('true')
    // Nunca um Tooltip, que não abre por toque.
    expect(screen.queryByRole('tooltip')).toBeNull()

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(botao.getAttribute('aria-expanded')).toBe('false')
    await waitFor(() => expect(document.activeElement).toBe(botao))
  })
})

describe('VIS-11 — os proxies de layout, por token exato', () => {
  it('grade em 2 colunas no celular e 4 a partir de `lg`; `TabsList` com `h-auto`; gatilhos com `min-h-11`', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    const grade = secao().querySelector('[data-grade="movimento"]')!
    expect(temToken(grade, 'grid-cols-2')).toBe(true)
    expect(temToken(grade, 'lg:grid-cols-4')).toBe(true)
    expect(temToken(screen.getByRole('tablist'), 'h-auto')).toBe(true)
    for (const aba of screen.getAllByRole('tab')) expect(temToken(aba, 'min-h-11')).toBe(true)
  })

  it('o valor não quebra linha (`whitespace-nowrap`) e as linhas de rodapé quebram em qualquer ponto', async () => {
    rpc.mockResolvedValue({ data: movimento(), error: null })
    montar()
    await screen.findByText('Hoje, 21/10')

    for (const c of cards()) {
      const span = c.el.querySelectorAll('p')[1].firstElementChild!
      expect(temToken(span, 'whitespace-nowrap')).toBe(true)
    }
    const rodape = screen.getByText('Atualizado às 15h32').parentElement!
    expect(temToken(rodape, '[overflow-wrap:anywhere]')).toBe(true)
  })
})

describe('VIS-10 — a linha do período troca NA TELA no instante `expira_em` (conserto P2 da verificação r1)', () => {
  // Até aqui a troca era provada por composição: o hook troca `data.hoje` no instante
  // (`useStoreMovement.test.ts`) e `periodLine` escreve a linha (`labels.test.ts`). Este caso monta o
  // WIDGET com o hook real e o relógio falso, e lê o texto que a dona vê — um widget que guardasse a
  // primeira leitura (ou a linha dela) passaria nas duas metades e mostraria "Hoje, 21/10" pela
  // manhã de 22/10.
  const HORA = 3_600_000
  const ontemEHoje = (hoje: string, ontem: string, lido: string, expira: string) =>
    movimento({ hoje, ontem, inicio_semana: '2026-10-19', lido_em: lido, expira_em: expira })

  /** Promessas e timers de 0 ms, em vários `act` curtos (molde de `useStoreMovement.test.ts`). */
  const escoar = async () => {
    for (let i = 0; i < 20; i++) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
    }
  }
  const avancar = async (ms: number) => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms)
    })
    await escoar()
  }

  beforeEach(() => {
    // O `setTimeout(0)` de notificação do React Query, agendado de DENTRO do timer falso da virada,
    // não dispara no `advanceTimersByTimeAsync` — mesma configuração de arnês do teste do hook.
    notifyManager.setScheduler(cb => queueMicrotask(cb))
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    notifyManager.setScheduler(defaultScheduler)
  })

  it('1 ms antes de `expira_em` a tela diz "Hoje, 21/10"; no instante, "Hoje, 22/10" — sem foco, sem clique', async () => {
    rpc
      .mockResolvedValueOnce({
        data: ontemEHoje('2026-10-21', '2026-10-20', '2026-10-21T18:00:00.000Z', '2026-10-22T03:00:00.000Z'),
        error: null,
      })
      .mockResolvedValue({
        data: ontemEHoje('2026-10-22', '2026-10-21', '2026-10-22T03:00:00.000Z', '2026-10-23T03:00:00.000Z'),
        error: null,
      })
    montar()
    await escoar()
    expect(screen.getByText('Hoje, 21/10')).toBeTruthy()

    // 18:00Z → 03:00Z = 9 h.
    await avancar(9 * HORA - 1)
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Hoje, 21/10')).toBeTruthy()
    expect(screen.queryByText('Hoje, 22/10')).toBeNull()

    await avancar(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(screen.getByText('Hoje, 22/10')).toBeTruthy()
    expect(screen.queryByText('Hoje, 21/10')).toBeNull()

    // E a aba Ontem acompanha: o dia que acabou de terminar.
    escolherAba('Ontem')
    await escoar()
    expect(screen.getByText('Ontem, 21/10')).toBeTruthy()
  })
})
