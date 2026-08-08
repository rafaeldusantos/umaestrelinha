import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import OrderTimeline from '../OrderTimeline'

// CNF-04: timeline de 4 estágios (`Pago · Em preparo · Postado · Entregue`) com o estágio atual
//         destacado e a janela de entrega lida das colunas de estimativa do pedido (SHP-08).
// CNF-06: os estados se distinguem por **forma** e pelos tokens `estrelinha-*` — preenchido =
//         concluído, anel = atual, contorno = futuro. Nenhuma cor fora da paleta.

const ESTIMATE = { min: '2026-08-04', max: '2026-08-06' }

const states = () =>
  Array.from(document.querySelectorAll('li[data-state]')).map((li) => li.getAttribute('data-state'))

/** Classes de forma do disco, sem nenhuma que carregue cor — a prova do "distinguível sem cor". */
const discShape = (index: number) => {
  const disc = screen.getAllByTestId('stage-disc')[index]
  return disc.className
    .split(/\s+/)
    .filter((cls) => !/^(bg|text|border)-(estrelinha|white)/.test(cls))
    .join(' ')
}

describe('OrderTimeline — quatro estágios (CNF-04)', () => {
  it('renderiza os quatro estágios na ordem Pago, Em preparo, Postado, Entregue', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    const stages = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(stages).toHaveLength(4)
    expect(stages[0]).toContain('Pago')
    expect(stages[1]).toContain('Em preparo')
    expect(stages[2]).toContain('Postado')
    expect(stages[3]).toContain('Entregue')
  })

  it('pedido pago e ainda não postado: Pago concluído, Em preparo atual, os outros futuros', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(states()).toEqual(['complete', 'current', 'future', 'future'])
  })

  it('marca exatamente um estágio como atual para o leitor de tela', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    const current = document.querySelectorAll('li[aria-current="step"]')
    expect(current).toHaveLength(1)
    expect(current[0].textContent).toContain('Em preparo')
  })

  it('pedido postado avança o atual para Postado e conclui os dois primeiros', () => {
    render(<OrderTimeline status="shipped" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(states()).toEqual(['complete', 'complete', 'current', 'future'])
  })

  it('pedido entregue conclui os quatro estágios e não deixa nenhum "atual"', () => {
    render(<OrderTimeline status="delivered" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(states()).toEqual(['complete', 'complete', 'complete', 'complete'])
    expect(document.querySelectorAll('li[aria-current="step"]')).toHaveLength(0)
  })

  it('sem `paid_at` nenhum estágio é concluído — a timeline não finge pagamento', () => {
    render(<OrderTimeline status="pending" paidAt={null} estimate={ESTIMATE} />)

    expect(states()).toEqual(['current', 'future', 'future', 'future'])
  })

  it('exibe a data do pagamento no estágio Pago', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(screen.getAllByRole('listitem')[0].textContent).toContain('27 jul')
  })
})

describe('OrderTimeline — janela de entrega (CNF-04)', () => {
  it('exibe a janela lida das colunas de estimativa', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(screen.getByText('Chega entre 4 e 6 de agosto')).toBeInTheDocument()
  })

  it('janela de um único dia é exibida como data única', () => {
    render(
      <OrderTimeline
        status="pending"
        paidAt="2026-07-27T12:00:00Z"
        estimate={{ min: '2026-07-30', max: '2026-07-30' }}
      />,
    )

    expect(screen.getByText('Chega em 30 de julho')).toBeInTheDocument()
  })

  it('`estimate` nulo omite a linha da janela e mantém os quatro estágios', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={null} />)

    expect(screen.queryByText(/^Chega/)).not.toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
  })
})

describe('OrderTimeline — pedido cancelado', () => {
  it('renderiza o estado próprio e não desenha trilha de progresso', () => {
    render(<OrderTimeline status="cancelled" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    expect(screen.getByText('Pedido cancelado')).toBeInTheDocument()
    expect(screen.queryAllByRole('listitem')).toHaveLength(0)
    expect(screen.queryByText('Em preparo')).not.toBeInTheDocument()
  })
})

describe('OrderTimeline — estados por forma e paleta (CNF-06)', () => {
  it('as três formas de disco diferem sem depender de nenhuma classe de cor', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    const complete = discShape(0)
    const current = discShape(1)
    const future = discShape(2)

    // concluído = preenchido (nenhum contorno); atual = anel de 3px; futuro = contorno de 2px
    expect(complete).not.toMatch(/border/)
    expect(current).toContain('border-[3px]')
    expect(future).toContain('border-2')
    expect(new Set([complete, current, future]).size).toBe(3)
  })

  it('o estágio concluído leva o check e o futuro leva o ícone do estágio', () => {
    render(<OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />)

    const discs = screen.getAllByTestId('stage-disc')
    expect(discs[0].querySelector('svg')).not.toBeNull()
    expect(discs[1].querySelector('svg')).toBeNull()
    expect(discs[2].querySelector('svg')).not.toBeNull()
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha em nenhum estado', () => {
    const { container: paid } = render(
      <OrderTimeline status="pending" paidAt="2026-07-27T12:00:00Z" estimate={ESTIMATE} />,
    )
    const { container: cancelled } = render(
      <OrderTimeline status="cancelled" paidAt={null} estimate={null} />,
    )

    const forbidden = /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/
    expect(paid.innerHTML).not.toMatch(forbidden)
    expect(cancelled.innerHTML).not.toMatch(forbidden)
  })
})
