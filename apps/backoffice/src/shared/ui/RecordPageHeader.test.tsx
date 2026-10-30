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

  it('no celular os botões quebram linha, e o grupo não se recusa a encolher', () => {
    render(
      <RecordPageHeader
        group="Vendas" parentLabel="Pedidos" crumb="#0244" title="Pedido #0244" onBack={vi.fn()}
        actions={<button type="button">Folha de separação</button>}
      />,
    )
    const tokens = (screen.getByRole('button', { name: 'Folha de separação' }).parentElement!.getAttribute('class') ?? '').split(/\s+/)
    for (const t of TOKENS_QUE_QUEBRAM) expect(tokens).toContain(t)
    expect(tokens).not.toContain('shrink-0')
    // A regra é só abaixo de `md`: nenhum token pelado que mudaria o computador.
    expect(tokens).not.toContain('whitespace-normal')
    expect(tokens).not.toContain('[&_button]:whitespace-normal')
  })
})

// Conserto do reteste da feature `88` (`BUG-20261030-pedido-rola-de-lado-com-fonte-200`): com a fonte a
// 200 % em 390, os botões do cabeçalho (`whitespace-nowrap` do shadcn) mediam 363–370 px numa coluna de
// 294 e a página inteira rolava de lado. No celular eles quebram linha; no computador, nada muda.
const TOKENS_QUE_QUEBRAM = [
  'min-w-0', 'max-w-full', 'flex-wrap',
  'max-md:[&_button]:whitespace-normal', 'max-md:[&_button]:h-auto', 'max-md:[&_button]:min-h-11',
]

