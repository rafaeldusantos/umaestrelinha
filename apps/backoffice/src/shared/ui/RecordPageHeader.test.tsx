import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecordPageHeader from './RecordPageHeader'

// Feature 67, D1 da prova em navegador: o `main` do painel deixou de ser `overflow-auto` (era o que
// impedia todo `sticky` de dentro de grudar). Medido em 390, o grupo de ações do pedido tinha 469px
// numa coluna de 342 — `shrink-0` sem teto, então o `flex-wrap` de dentro nunca disparava, e o que
// escondia o estouro era a rolagem horizontal do próprio `main`. Sem ela, viraria rolagem do body.
describe('RecordPageHeader — o grupo de ações cabe na coluna', () => {
  it('tem teto de largura (`max-w-full`) além de embrulhar', () => {
    render(
      <RecordPageHeader
        group="Vendas"
        parentLabel="Pedidos"
        crumb="#0244"
        title="Pedido #0244"
        onBack={vi.fn()}
        actions={<button type="button">Folha de separação</button>}
      />,
    )
    const grupo = screen.getByRole('button', { name: 'Folha de separação' }).parentElement!
    const tokens = (grupo.getAttribute('class') ?? '').split(/\s+/)
    expect(tokens).toContain('flex-wrap')
    expect(tokens).toContain('max-w-full')
  })
})
