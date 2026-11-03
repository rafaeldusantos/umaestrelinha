// O selo do estado do pedido montado: o rótulo vem de `core` e cada estado tem a sua cor, no molde
// dos selos da lista de Pedidos (pílula com borda).
import { render, screen } from '@testing-library/react'
import { PROPOSAL_STATE_LABELS, type ProposalState } from '@estrelinha/core/proposals'
import ProposalStateBadge from '../ProposalStateBadge'

const ESTADOS = Object.keys(PROPOSAL_STATE_LABELS) as ProposalState[]

describe('ProposalStateBadge', () => {
  it('cobre os cinco estados de core', () => {
    expect(ESTADOS).toHaveLength(5)
  })

  it.each(ESTADOS)('"%s" mostra o rótulo de core numa pílula com borda', (estado) => {
    render(<ProposalStateBadge state={estado} />)
    const selo = screen.getByText(PROPOSAL_STATE_LABELS[estado])
    for (const t of ['rounded-full', 'border', 'text-xs', 'font-semibold']) {
      expect(selo.className.split(/\s+/)).toContain(t)
    }
  })

  it('cada estado tem uma cor diferente', () => {
    const cores = ESTADOS.map((estado) => {
      const { container, unmount } = render(<ProposalStateBadge state={estado} />)
      const cls = (container.firstElementChild as HTMLElement).className
      unmount()
      return cls.split(/\s+/).find((c) => c.startsWith('bg-'))
    })
    expect(new Set(cores).size).toBe(ESTADOS.length)
  })
})
