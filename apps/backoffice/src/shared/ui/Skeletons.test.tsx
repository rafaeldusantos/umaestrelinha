import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TableSkeleton, CardSkeleton, OrderPageSkeleton } from './Skeletons'

describe('TableSkeleton', () => {
  it('renders the requested number of rows', () => {
    render(<TableSkeleton rows={4} cols={3} />)
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(4)
  })

  it('defaults to 6 rows', () => {
    render(<TableSkeleton />)
    expect(screen.getAllByTestId('skeleton-row')).toHaveLength(6)
  })
})

describe('CardSkeleton', () => {
  it('renders without crashing', () => {
    const { container } = render(<CardSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })
})

// Feature `88` · T13 (`CRG-06`): a primeira carga do pedido mostra a GRADE do pedido — a coluna
// principal e a lateral de 330 —, nunca "Carregando...". jsdom não mede layout: a grade é provada
// pela classe, por token exato, igual à de `AdminOrderPage`.
describe('OrderPageSkeleton', () => {
  const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

  it('a mesma grade do pedido (coluna + lateral 330), `aria-busy`, e nenhum "Carregando..."', () => {
    const { container } = render(<OrderPageSkeleton />)
    const raiz = screen.getByTestId('order-page-skeleton')
    expect(raiz).toHaveAttribute('aria-busy', 'true')
    const grade = raiz.querySelector('.grid')!
    expect(tokens(grade)).toEqual(expect.arrayContaining(['grid', 'gap-4', 'lg:grid-cols-[minmax(0,1fr)_330px]']))
    expect(grade.children).toHaveLength(2)
    expect(container).not.toHaveTextContent(/Carregando/)
  })

  it('o brilho para com "menos movimento": todo bloco que pulsa tem `motion-reduce:animate-none`', () => {
    render(<OrderPageSkeleton />)
    const pulsando = Array.from(screen.getByTestId('order-page-skeleton').querySelectorAll('.animate-pulse'))
    expect(pulsando.length).toBeGreaterThan(5)
    for (const el of pulsando) expect(tokens(el)).toContain('motion-reduce:animate-none')
  })
})
