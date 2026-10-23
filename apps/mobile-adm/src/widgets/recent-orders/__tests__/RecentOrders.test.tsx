// Feature `73` · T17 · `MAI-14`..`MAI-16` — os últimos pedidos.
import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatPrice } from '@estrelinha/core/formatters'
import { resumo } from '@/test/resumo'
import { destino, montarNaInicio } from '@/test/rotas'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import RecentOrders, { SEM_PEDIDOS } from '../ui/RecentOrders'

const comDado = (r = resumo()) => ({ dado: r, falhou: false, tentarDeNovo: vi.fn() })
const linhas = () => screen.getAllByTestId('pedido-recente')
const sem = (s: string) => s.replace(/\s/g, ' ')

describe('RecentOrders — com dado', () => {
  it('4 linhas: nome, `#número · há quanto tempo` contra o `lido_em`, total com centavos e o selo (MAI-14)', () => {
    montarNaInicio(<RecentOrders leitura={comDado()} />)
    const l = linhas()
    expect(l).toHaveLength(4)

    expect(within(l[0]).getByText('Marina Souza')).toBeInTheDocument()
    // `lido_em` 22/10 14:30Z: 14:18Z ⇒ 12 min; 11:30Z ⇒ 3 h; 20/10 12:00Z ⇒ 2 dias; 19/10 09:00Z ⇒ 3 dias.
    expect(within(l[0]).getByText('#0244 · há 12 min')).toBeInTheDocument()
    expect(within(l[1]).getByText('#0243 · há 3 h')).toBeInTheDocument()
    expect(within(l[2]).getByText('#0242 · há 2 dias')).toBeInTheDocument()
    expect(within(l[3]).getByText('#0241 · há 3 dias')).toBeInTheDocument()

    expect(within(l[0]).getByText(sem(formatPrice(359)))).toBeInTheDocument()
    expect(formatPrice(718.4)).toMatch(/^R\$\s718,40$/)
    expect(within(l[1]).getByText(sem(formatPrice(718.4)))).toBeInTheDocument()

    // O selo é o de `orderSituation` com o público `'atelie'`, rótulo E tom, escrito por extenso
    // (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`: nunca o "seu material" da cliente).
    const selos = l.map((x) => x.querySelector('[data-situation]'))
    expect(selos.map((s) => s?.getAttribute('data-situation'))).toEqual(['awaiting_material', 'awaiting_payment', 'shipped', 'cancelled'])
    expect(selos.map((s) => s?.textContent)).toEqual(['Aguardando material', 'Aguardando pagamento', 'Enviado', 'Cancelado'])
    expect(selos.map((s) => s?.getAttribute('data-tone'))).toEqual(['wait', 'wait', 'progress', 'neutral'])
  })

  it('o par do material na voz do ateliê: não enviado × a caminho × recebido (BUG-20261022)', () => {
    const r = resumo()
    r.recentes = [
      { ...r.recentes[0], id: 'm1', material_status: 'aguardando_material' },
      { ...r.recentes[0], id: 'm2', material_status: 'material_enviado' },
      { ...r.recentes[0], id: 'm3', material_status: 'material_recebido' },
    ]
    montarNaInicio(<RecentOrders leitura={comDado(r)} />)
    const selos = linhas().map((x) => x.querySelector('[data-situation]'))
    expect(selos.map((s) => s?.textContent)).toEqual(['Aguardando material', 'Material a caminho', 'Material recebido'])
    expect(selos.map((s) => s?.getAttribute('data-tone'))).toEqual(['wait', 'wait', 'progress'])
    for (const s of selos) expect(s?.textContent).not.toMatch(/\bseu\b/i)
  })

  it('"há quanto tempo" é contra o instante do SERVIDOR, não o relógio do aparelho', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-01-01T00:00:00Z'))
    montarNaInicio(<RecentOrders leitura={comDado()} />)
    vi.useRealTimers()
    expect(within(linhas()[0]).getByText('#0244 · há 12 min')).toBeInTheDocument()
  })

  it('nunca mais de 4', () => {
    const r = resumo()
    r.recentes = [...r.recentes, { ...r.recentes[0], id: 'o5', order_number: '0240', customer_name: 'Quinta Pessoa' }]
    montarNaInicio(<RecentOrders leitura={comDado(r)} />)
    expect(linhas()).toHaveLength(4)
    expect(screen.queryByText('Quinta Pessoa')).toBeNull()
  })

  it('as linhas NÃO são links: nem `<a>`, nem `role` (MAI-15)', () => {
    montarNaInicio(<RecentOrders leitura={comDado()} />)
    for (const l of linhas()) {
      expect(l.querySelector('a')).toBeNull()
      expect(l.querySelector('[role]')).toBeNull()
      expect(l.getAttribute('role')).toBeNull()
      expect(l.closest('a')).toBeNull()
    }
    // O único link da seção é "Ver todos".
    expect(screen.getAllByRole('link').map((a) => a.textContent)).toEqual(['Ver todos'])
  })

  it('"Ver todos" leva à visão "Tudo", com alvo de 44 px (MAI-15, token exato)', () => {
    montarNaInicio(<RecentOrders leitura={comDado()} />)
    const link = screen.getByRole('link', { name: 'Ver todos' })
    expect((link.getAttribute('class') ?? '').split(/\s+/)).toContain('min-h-11')
    fireEvent.click(link)
    expect(destino()).toBe('/pedidos?visao=tudo')
  })

  it('sem pedido nenhum: diz que ainda não há pedidos (MAI-16)', () => {
    montarNaInicio(<RecentOrders leitura={comDado(resumo({ recentes: [] }))} />)
    expect(screen.getByText(SEM_PEDIDOS)).toBeInTheDocument()
    expect(SEM_PEDIDOS).toBe('Ainda não há pedidos.')
    expect(screen.queryAllByTestId('pedido-recente')).toHaveLength(0)
  })
})

/** Token exato: `min-w-0` não pode casar dentro de `min-w-0.5`, nem `shrink-0` dentro de `flex-shrink-0`. */
const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('RecentOrders — a linha quebra com a fonte grande (BUG-20261023)', () => {
  // jsdom devolve 0 para layout: a régua é a FORMA que produz a quebra, lida por token. A prova da
  // largura é do navegador (relatório `2026-10-23-mobile-adm-inicio-reteste-2.md`).
  const partes = () => {
    montarNaInicio(<RecentOrders leitura={comDado()} />)
    const li = linhas()[0]
    const [nome, direita] = Array.from(li.children)
    return { li, nome, direita }
  }

  it('a linha embrulha: `flex-wrap`, com folga vertical para a segunda linha', () => {
    const { li } = partes()
    expect(tokens(li)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'gap-x-3', 'gap-y-1']))
  })

  it('o nome tem PISO em rem (cresce com a fonte) e ocupa o que sobra', () => {
    const { nome } = partes()
    expect(tokens(nome)).toContain('min-w-[min(100%,6rem)]')
    expect(tokens(nome)).toContain('flex-1')
    // Sem piso o nome encolheria a zero antes de a linha quebrar.
    expect(tokens(nome)).not.toContain('min-w-0')
  })

  it('o total e o selo cedem: sem `shrink-0`, com teto na largura da linha e à direita', () => {
    const { direita } = partes()
    const t = tokens(direita)
    expect(t).not.toContain('shrink-0')
    expect(t).toEqual(expect.arrayContaining(['ml-auto', 'min-w-0', 'max-w-full', 'flex-col', 'items-end']))
    expect(direita.querySelector('[data-situation]')).not.toBeNull()
  })

  it('o rótulo do selo nunca é cortado: sem `truncate` nem `whitespace-nowrap`, e com teto na linha', () => {
    const { direita } = partes()
    const selo = direita.querySelector('[data-situation]')
    expect(tokens(selo)).toContain('max-w-full')
    expect(tokens(selo)).not.toContain('whitespace-nowrap')
    const rotulo = selo?.lastElementChild ?? null
    expect(rotulo?.textContent).toBe('Aguardando material')
    expect(tokens(rotulo)).not.toContain('truncate')
    expect(tokens(rotulo)).toContain('min-w-0')
  })

  it('sensor: a forma antiga (coluna `shrink-0`, nome `min-w-0`, linha sem quebra) reprova nas mesmas réguas', () => {
    const antiga = document.createElement('li')
    antiga.className = 'flex items-center gap-3 py-3'
    antiga.innerHTML = '<div class="min-w-0 flex-1"></div><div class="flex shrink-0 flex-col items-end gap-1"></div>'
    const [n, d] = Array.from(antiga.children)
    expect(tokens(antiga)).not.toContain('flex-wrap')
    expect(tokens(n)).not.toContain('min-w-[min(100%,6rem)]')
    expect(tokens(d)).toContain('shrink-0')
  })
})

describe('RecentOrders — sem dado', () => {
  it('carregando: `aria-busy`, sem linhas e sem a frase de vazio', () => {
    montarNaInicio(<RecentOrders leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    expect(screen.getByRole('region', { name: 'Últimos pedidos' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryAllByTestId('pedido-recente')).toHaveLength(0)
    expect(screen.queryByText(SEM_PEDIDOS)).toBeNull()
  })

  it('falhou sem dado: a frase de falha, nunca a de vazio', () => {
    const tentarDeNovo = vi.fn()
    montarNaInicio(<RecentOrders leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Fecho r3 (G3/Q1): a falha não se anuncia "ocupada" — `aria-busy` é só do esqueleto (MAI-30).
    expect(screen.getByRole('region', { name: 'Últimos pedidos' })).not.toHaveAttribute('aria-busy')
    expect(screen.queryByText(SEM_PEDIDOS)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
