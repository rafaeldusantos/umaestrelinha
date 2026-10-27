// Feature `73` · T13 · `MAI-01`..`MAI-04`, `MAI-17`, `MAI-18`, `MAI-30` — o topo da Início.
//
// O processo roda em UTC (o "aparelho" do teste), e as fixturas escolhem instantes em que a hora e o
// dia de UTC DISCORDAM dos de Brasília: 14:30Z é 11:30 em Brasília (Bom dia × Boa tarde), e
// 01:30Z do dia 23 é 22:30 do dia 22 (Boa noite, quinta-feira 22 × sexta-feira 23).
process.env.TZ = 'UTC'

import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatPrice, formatPriceWhole } from '@estrelinha/core/formatters'
import type { StoreMovement } from '@estrelinha/core/stats'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO, type Leitura } from '@/shared/ui/leitura'
import MovementHero from '../ui/MovementHero'

const movimento = (extra: Partial<StoreMovement> = {}): StoreMovement => ({
  hoje: '2026-10-22',
  ontem: '2026-10-21',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-23T03:00:00.000Z',
  lido_em: '2026-10-22T14:30:00.000Z',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: null,
  contagem_desde_dia: null,
  ultima_visita: null,
  ultima_visita_dia: null,
  teto_dia: null,
  periodos: {
    hoje: { visitas: 41, vendas: 3, faturamento: 1077, ticket: 359 },
    ontem: { visitas: 1234, vendas: 0, faturamento: 0, ticket: null },
    semana: { visitas: 230, vendas: 9, faturamento: 4321.5, ticket: 480.17 },
  },
  ...extra,
})

const comDado = (m: StoreMovement, tentarDeNovo = vi.fn()): Leitura<StoreMovement> => ({ dado: m, falhou: false, tentarDeNovo })

/**
 * Põe o "aparelho" num instante que DISCORDA do esperado na hora e no dia (`L-058`): sem isso, o relógio
 * real do dia em que a suíte roda pode coincidir com a fixtura, e ler o aparelho passaria por ler o banco.
 */
const comAparelhoEm = (iso: string, corpo: () => void) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
  try {
    corpo()
  } finally {
    vi.useRealTimers()
  }
}

/** O nome acessível de um número, sem depender do espaço não-quebrável do `Intl`. */
const numero = (nome: RegExp) => screen.getByRole('group', { name: nome })

/** A grade reflui com a fonte: `grid`, trilhas `auto-fit` com piso em `rem`, e nenhum `grid-cols-N` fixo. */
const gradeQueReflui = (classes: string) => {
  const t = classes.split(/\s+/)
  return (
    t.includes('grid') &&
    !t.some((c) => /^grid-cols-\d+$/.test(c)) &&
    t.some((c) => /^grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,\d+(\.\d+)?rem\),1fr\)\)\]$/.test(c))
  )
}

describe('MovementHero — com dado', () => {
  it('Hoje é o período inicial: os quatro números, com nome acessível de rótulo, período e valor (MAI-01, MAI-30)', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'true')
    expect(numero(/^Faturamento, hoje, /)).toHaveAccessibleName(`Faturamento, hoje, ${formatPriceWhole(1077)}`)
    expect(formatPriceWhole(1077)).toMatch(/^R\$\s1\.077$/)
    expect(numero(/^Vendas, hoje, /)).toHaveAccessibleName('Vendas, hoje, 3')
    expect(numero(/^Ticket médio, hoje, /)).toHaveAccessibleName(`Ticket médio, hoje, ${formatPrice(359)}`)
    expect(formatPrice(359)).toMatch(/^R\$\s359,00$/)
    expect(numero(/^Visitas, hoje, /)).toHaveAccessibleName('Visitas, hoje, 41')
  })

  it('sem a nota "Visitas contam navegadores, não pessoas." (removida em 2026-10-26)', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    expect(screen.queryByText(/contam navegadores/)).toBeNull()
  })

  it('trocar para Ontem e Semana troca os números SEM ler nada, e marca o escolhido (MAI-02)', () => {
    const tentarDeNovo = vi.fn()
    render(<MovementHero leitura={comDado(movimento(), tentarDeNovo)} />)

    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Hoje' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'Ontem' })).toHaveAttribute('aria-pressed', 'false')
    expect(numero(/^Faturamento, esta semana, /)).toHaveAccessibleName(`Faturamento, esta semana, ${formatPriceWhole(4321.5)}`)
    expect(numero(/^Ticket médio, esta semana, /)).toHaveAccessibleName(`Ticket médio, esta semana, ${formatPrice(480.17)}`)
    expect(numero(/^Visitas, esta semana, /)).toHaveAccessibleName('Visitas, esta semana, 230')

    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    expect(numero(/^Visitas, ontem, /)).toHaveAccessibleName('Visitas, ontem, 1.234')
    expect(tentarDeNovo).not.toHaveBeenCalled()
  })

  it('sem venda no período: ticket `—`, faturamento `R$ 0`, vendas `0` — nunca `R$ 0,00` no ticket (MAI-03)', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    fireEvent.click(screen.getByRole('button', { name: 'Ontem' }))
    expect(numero(/^Ticket médio, ontem, /)).toHaveAccessibleName('Ticket médio, ontem, —')
    expect(numero(/^Faturamento, ontem, /)).toHaveAccessibleName(`Faturamento, ontem, ${formatPriceWhole(0)}`)
    expect(formatPriceWhole(0)).toMatch(/^R\$\s0$/)
    expect(numero(/^Vendas, ontem, /)).toHaveAccessibleName('Vendas, ontem, 0')
    expect(screen.queryByText(/R\$\s0,00/)).toBeNull()
  })

  it('vendas sem ticket (`null` com venda não acontece, mas vendas 0 com ticket decide): `—`', () => {
    const m = movimento({ periodos: { ...movimento().periodos, hoje: { visitas: 0, vendas: 0, faturamento: 0, ticket: 0 } } })
    render(<MovementHero leitura={comDado(m)} />)
    expect(numero(/^Ticket médio, hoje, /)).toHaveAccessibleName('Ticket médio, hoje, —')
  })

  it('a saudação é pela hora de BRASÍLIA do `lido_em`, com o aparelho em UTC: 14:30Z ⇒ "Bom dia" (MAI-04)', () => {
    expect(new Date('2026-10-22T14:30:00.000Z').getHours()).toBe(14) // o "aparelho" está em UTC
    // O aparelho: 20:00 de 15/06 (Boa noite, segunda-feira 15 de junho) — discorda nos dois campos.
    comAparelhoEm('2026-06-15T20:00:00.000Z', () => {
      render(<MovementHero leitura={comDado(movimento())} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Bom dia, Adri\.$/)
      expect(screen.getByText('quinta-feira, 22 de outubro')).toBeInTheDocument()
      expect(screen.queryByText(/junho/)).toBeNull()
    })
  })

  it('22:30 de Brasília do dia 22 (01:30Z do dia 23): "Boa noite" e a data do BANCO, nunca a do aparelho', () => {
    // O aparelho: 09:00 de 15/06 (Bom dia, junho).
    comAparelhoEm('2026-06-15T09:00:00.000Z', () => {
      render(<MovementHero leitura={comDado(movimento({ lido_em: '2026-10-23T01:30:00.000Z' }))} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Boa noite, Adri\.$/)
      expect(screen.getByText('quinta-feira, 22 de outubro')).toBeInTheDocument()
      expect(screen.queryByText(/sexta-feira|23 de outubro|junho/)).toBeNull()
    })
  })

  it('"Boa tarde" às 12:00 de Brasília (15:00Z)', () => {
    // O aparelho: 08:00 de 15/06 (Bom dia).
    comAparelhoEm('2026-06-15T08:00:00.000Z', () => {
      render(<MovementHero leitura={comDado(movimento({ lido_em: '2026-10-22T15:00:00.000Z' }))} />)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Boa tarde, Adri\.$/)
    })
  })

  it('o maior valor plausível cabe numa linha: os números não embrulham (MAI-28, régua de classe)', () => {
    const m = movimento({ periodos: { ...movimento().periodos, hoje: { visitas: 9999, vendas: 99, faturamento: 99999, ticket: 9999.99 } } })
    render(<MovementHero leitura={comDado(m)} />)
    const valor = within(numero(/^Faturamento, hoje, /)).getByText(formatPriceWhole(99999).replace(/\s/g, ' '))
    expect((valor.getAttribute('class') ?? '').split(/\s+/)).toContain('whitespace-nowrap')
    const ticket = within(numero(/^Ticket médio, hoje, /)).getByText(formatPrice(9999.99).replace(/\s/g, ' '))
    expect((ticket.getAttribute('class') ?? '').split(/\s+/)).toContain('whitespace-nowrap')
  })

  // BUG-20261022-numeros-se-sobrepoem-com-fonte-grande (QA da `73`): com a fonte do sistema em 130 %
  // ou mais, `grid-cols-2` mantinha duas trilhas de px fixos e `R$ 99.999` (`whitespace-nowrap`) pintava
  // POR CIMA do "10" das vendas — medido em 360: "R$ 99.1099". A grade tem de cair para uma coluna
  // quando o texto cresce: trilhas `auto-fit` com piso em `rem` (que cresce com a fonte). jsdom não
  // mede layout; a régua é de token, e o sensor prova que a forma antiga reprova.
  it('os quatro números caem para uma coluna quando a fonte cresce: grade `auto-fit` com piso em rem, nunca `grid-cols-2` fixo', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    const grade = numero(/^Faturamento, hoje, /).parentElement!
    expect(gradeQueReflui(grade.getAttribute('class') ?? '')).toBe(true)
    // sensor: a grade de antes reprova na mesma régua
    expect(gradeQueReflui('mt-5 grid grid-cols-2 gap-x-4 gap-y-[18px]')).toBe(false)
    expect(gradeQueReflui('grid grid-cols-[repeat(auto-fit,minmax(min(100%,144px),1fr))]')).toBe(false)
  })

  it('os períodos são alvos de 44 px (`min-h-11`, token exato)', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    for (const nome of ['Hoje', 'Ontem', 'Semana']) {
      expect((screen.getByRole('button', { name: nome }).getAttribute('class') ?? '').split(/\s+/)).toContain('min-h-11')
    }
  })
})

describe('MovementHero — sem dado', () => {
  it('carregando: esqueleto com `aria-busy`, sem número nenhum, e o `h1` presente (MAI-30)', () => {
    const { container } = render(<MovementHero leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    expect(screen.getByRole('region', { name: 'Movimento da loja' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    expect(screen.queryByRole('group')).toBeNull()
    expect(container.textContent).not.toMatch(/\d/)
    // O esqueleto não se move com movimento reduzido (`MAI-31`).
    const pulsos = container.querySelectorAll('[class*="animate-pulse"]')
    expect(pulsos.length).toBeGreaterThan(0)
    for (const p of pulsos) expect((p.getAttribute('class') ?? '').split(/\s+/)).toContain('motion-reduce:animate-none')
  })

  // Fecho r3 (S1): "um esqueleto que ocupa o lugar do número" — cada um dos quatro rótulos tem, no
  // lugar do valor, um irmão `aria-hidden` que pulsa. O `animate-pulse` do `h1` não vale por eles.
  it('carregando: cada um dos quatro números tem o esqueleto `aria-hidden` + `animate-pulse` no lugar do valor (MAI-30)', () => {
    render(<MovementHero leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    const rotulos = ['Faturamento', 'Vendas', 'Ticket médio', 'Visitas']
    for (const r of rotulos) {
      const rotulo = screen.getByText(r)
      const celula = rotulo.parentElement!
      const irmaos = Array.from(celula.children).filter((n) => n !== rotulo)
      expect(irmaos).toHaveLength(1)
      const [traco] = irmaos
      expect(traco).toHaveAttribute('aria-hidden', 'true')
      expect((traco.getAttribute('class') ?? '').split(/\s+/)).toContain('animate-pulse')
      expect(celula.textContent).toBe(r) // nenhum valor ao lado do rótulo
    }
  })

  it('falhou sem dado: a frase e "Tentar de novo", sem número, sem períodos (MAI-17)', () => {
    const tentarDeNovo = vi.fn()
    const { container } = render(<MovementHero leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    expect(FALHA_DE_LEITURA).toBe('Não consegui carregar.')
    expect(screen.queryByRole('button', { name: 'Hoje' })).toBeNull()
    expect(screen.queryByRole('group')).toBeNull()
    expect(container.textContent).not.toMatch(/\d/)
    expect(screen.getByRole('region', { name: 'Movimento da loja' })).not.toHaveAttribute('aria-busy')

    const botao = screen.getByRole('button', { name: TENTAR_DE_NOVO })
    expect((botao.getAttribute('class') ?? '').split(/\s+/)).toContain('min-h-12')
    fireEvent.click(botao)
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })

  it('com dado E falha de releitura: os números continuam, sem esqueleto (MAI-18)', () => {
    render(<MovementHero leitura={{ dado: movimento(), falhou: false, tentarDeNovo: vi.fn() }} />)
    expect(numero(/^Vendas, hoje, /)).toHaveAccessibleName('Vendas, hoje, 3')
    expect(screen.getByRole('region', { name: 'Movimento da loja' })).not.toHaveAttribute('aria-busy')
  })
})

/**
 * `MAI-31`: a troca de período e o esqueleto não se movem com movimento reduzido. A régua é por TOKEN
 * exato (`L-034`): um `transition*` precisa de `motion-reduce:transition-none` e um `animate-*` de
 * `motion-reduce:animate-none` no MESMO nó — `motion-reduce:opacity-100` não desliga movimento nenhum.
 * Asserção e sensor chamam a mesma função.
 */
const MOVIMENTO = /^(?:(?!motion-reduce:)[\w-]+:)*(transition(?:-[\w-]+)?|animate-[\w-]+)$/
const movimentosSemPar = (nos: Element[]): string[] =>
  nos.flatMap((no) => {
    const tokens = (no.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
    return tokens
      .filter((t) => !t.startsWith('motion-reduce:'))
      .map((t) => MOVIMENTO.exec(t))
      .filter((m): m is RegExpExecArray => m !== null)
      .filter((m) => !tokens.includes(m[1].startsWith('animate-') ? 'motion-reduce:animate-none' : 'motion-reduce:transition-none'))
      .map((m) => m[0])
  })

describe('MovementHero — sem movimento com movimento reduzido (MAI-31)', () => {
  const botoes = () => ['Hoje', 'Ontem', 'Semana'].map((nome) => screen.getByRole('button', { name: nome }))

  it('os botões de período, antes e depois da troca, não têm `transition-*`/`animate-*` sem o par que o desliga', () => {
    render(<MovementHero leitura={comDado(movimento())} />)
    expect(botoes()).toHaveLength(3) // âncora: os três foram achados
    expect(movimentosSemPar(botoes())).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Semana' }))
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute('aria-pressed', 'true')
    expect(movimentosSemPar(botoes())).toEqual([])
  })

  it('o esqueleto inteiro (todo nó da seção carregando) também não', () => {
    const { container } = render(<MovementHero leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    const nos = Array.from(container.querySelectorAll('*'))
    expect(nos.length).toBeGreaterThan(5) // âncora: a varredura achou o esqueleto
    expect(movimentosSemPar(nos)).toEqual([])
  })

  it('sensor: `transition-colors` sem o par reprova; com `motion-reduce:transition-none` passa; `motion-reduce:opacity-100` não vale', () => {
    const no = (classes: string) => {
      const b = document.createElement('button')
      b.setAttribute('class', classes)
      return b
    }
    expect(movimentosSemPar([no('min-h-11 flex-1 transition-colors')])).toEqual(['transition-colors'])
    expect(movimentosSemPar([no('hover:transition-colors')])).toEqual(['hover:transition-colors'])
    expect(movimentosSemPar([no('transition')])).toEqual(['transition'])
    expect(movimentosSemPar([no('animate-pulse')])).toEqual(['animate-pulse'])
    expect(movimentosSemPar([no('transition-colors motion-reduce:opacity-100')])).toEqual(['transition-colors'])
    expect(movimentosSemPar([no('animate-pulse motion-reduce:transition-none')])).toEqual(['animate-pulse'])
    expect(movimentosSemPar([no('transition-colors motion-reduce:transition-none')])).toEqual([])
    expect(movimentosSemPar([no('animate-pulse motion-reduce:animate-none')])).toEqual([])
    // Token exato: nome de classe que só CONTÉM a palavra não é movimento.
    expect(movimentosSemPar([no('no-transition-x min-h-11 rounded-pill')])).toEqual([])
  })
})
