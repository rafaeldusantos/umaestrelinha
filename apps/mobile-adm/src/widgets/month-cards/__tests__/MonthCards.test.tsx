// Feature `73` · T16 · `MAI-11`, `MAI-12`, `MAI-28` — o mês e as clientes novas.
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatPriceWhole } from '@estrelinha/core/formatters'
import { resumo } from '@/test/resumo'
import { FALHA_DE_LEITURA, TENTAR_DE_NOVO } from '@/shared/ui/leitura'
import MonthCards from '../ui/MonthCards'

const comDado = (r = resumo()) => ({ dado: r, falhou: false, tentarDeNovo: vi.fn() })
const sem = (s: string) => s.replace(/\s/g, ' ')

describe('MonthCards — com dado', () => {
  it('"Fat. de outubro", a soma sem centavos e "38 pedidos pagos" (MAI-11)', () => {
    render(<MonthCards leitura={comDado()} />)
    const card = screen.getByRole('group', { name: 'Faturamento de outubro' })
    expect(within(card).getByText('Fat. de outubro')).toBeInTheDocument()
    expect(within(card).getByText(sem(formatPriceWhole(12480)))).toBeInTheDocument()
    expect(formatPriceWhole(12480)).toMatch(/^R\$\s12\.480$/)
    expect(within(card).getByText('38 pedidos pagos')).toBeInTheDocument()
  })

  // O relógio fica no MEIO de outro mês, longe de toda borda (`L-058`): numa virada (31/12 23:59 de
  // Brasília) o UTC do aparelho já é janeiro, e ler o mês do aparelho passaria como se fosse o do banco.
  it('o nome do mês vem do `mes` do banco, por texto: `2026-10` ⇒ outubro, com o aparelho em junho (em UTC e em Brasília)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    try {
      render(<MonthCards leitura={comDado(resumo({ mes: '2026-10' }))} />)
      expect(screen.getByText('Fat. de outubro')).toBeInTheDocument()
      expect(screen.getByRole('group', { name: 'Faturamento de outubro' })).toBeInTheDocument()
      expect(screen.queryByText(/junho/)).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('`2026-01` ⇒ janeiro, com o aparelho no meio de julho', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T15:00:00Z'))
    try {
      render(<MonthCards leitura={comDado(resumo({ mes: '2026-01' }))} />)
      expect(screen.getByText('Fat. de janeiro')).toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('singular em 1: "1 pedido pago"; e "0 pedidos pagos" sem venda', () => {
    const { unmount } = render(<MonthCards leitura={comDado(resumo({ mes_resumo: { vendas: 1, faturamento: 359 } }))} />)
    expect(screen.getByText('1 pedido pago')).toBeInTheDocument()
    unmount()
    render(<MonthCards leitura={comDado(resumo({ mes_resumo: { vendas: 0, faturamento: 0 } }))} />)
    expect(screen.getByText('0 pedidos pagos')).toBeInTheDocument()
    expect(screen.getByText(sem(formatPriceWhole(0)))).toBeInTheDocument()
  })

  it('"Clientes novas": o número e "primeira compra no mês" (MAI-12)', () => {
    render(<MonthCards leitura={comDado()} />)
    const card = screen.getByRole('group', { name: 'Clientes novas' })
    expect(within(card).getByText('14')).toBeInTheDocument()
    expect(within(card).getByText('primeira compra no mês')).toBeInTheDocument()
  })

  // Reescrita no QA da `73` (BUG-20261022-numeros-se-sobrepoem-com-fonte-grande): `grid-cols-2` prendia
  // duas trilhas em px, e com a fonte do sistema a 150 % `R$ 101.055` passava por cima do card vizinho.
  // A régua ganhou o sentido que faltava: a grade cai para uma coluna quando a fonte cresce (piso em rem).
  it('duas colunas que caem para uma quando a fonte cresce (`auto-fit` com piso em rem), cards `min-w-0` e números sem embrulhar (MAI-28)', () => {
    render(<MonthCards leitura={comDado(resumo({ mes_resumo: { vendas: 999, faturamento: 99999 } }))} />)
    const grade = (screen.getByTestId('cards-do-mes').getAttribute('class') ?? '').split(/\s+/)
    const reflui = (t: string[]) =>
      t.includes('grid') &&
      !t.some((c) => /^grid-cols-\d+$/.test(c)) &&
      t.some((c) => /^grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,\d+(\.\d+)?rem\),1fr\)\)\]$/.test(c))
    expect(reflui(grade)).toBe(true)
    expect(reflui('grid grid-cols-2 gap-3'.split(' '))).toBe(false) // sensor: a forma de antes reprova
    for (const g of screen.getAllByRole('group')) expect((g.getAttribute('class') ?? '').split(/\s+/)).toContain('min-w-0')
    const valor = screen.getByText(sem(formatPriceWhole(99999)))
    expect((valor.getAttribute('class') ?? '').split(/\s+/)).toContain('whitespace-nowrap')
  })
})

describe('MonthCards — sem dado', () => {
  it('carregando: `aria-busy` e nenhum número', () => {
    render(<MonthCards leitura={{ dado: undefined, falhou: false, tentarDeNovo: vi.fn() }} />)
    const secao = screen.getByRole('region', { name: 'O mês' })
    expect(secao).toHaveAttribute('aria-busy', 'true')
    expect(secao.textContent).not.toMatch(/\d/)
  })

  it('falhou sem dado: a frase e "Tentar de novo"', () => {
    const tentarDeNovo = vi.fn()
    render(<MonthCards leitura={{ dado: undefined, falhou: true, tentarDeNovo }} />)
    expect(screen.getByText(FALHA_DE_LEITURA)).toBeInTheDocument()
    // Fecho r3 (G3/Q1): a falha não se anuncia "ocupada" — `aria-busy` é só do esqueleto (MAI-30).
    expect(screen.getByRole('region', { name: 'O mês' })).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('region', { name: 'O mês' }).textContent).not.toMatch(/\d/)
    fireEvent.click(screen.getByRole('button', { name: TENTAR_DE_NOVO }))
    expect(tentarDeNovo).toHaveBeenCalledTimes(1)
  })
})
