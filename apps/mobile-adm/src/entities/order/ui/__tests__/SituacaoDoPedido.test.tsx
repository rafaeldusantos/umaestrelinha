// Feature `74` · T16 — `SituacaoDoPedido` desenha pelo selo compartilhado (`shared/ui/Selo`), com o
// tom e o rótulo do público ateliê de `orderSituation` (`core`). Os valores vêm escritos por extenso.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import SituacaoDoPedido from '../SituacaoDoPedido'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

describe('SituacaoDoPedido desenha pelo selo compartilhado', () => {
  it('o tom e o rótulo do público ateliê, com `data-situation`', () => {
    const { container } = render(
      <SituacaoDoPedido pedido={{ status: 'paid', payment_status: 'approved', material_status: 'aguardando_material' }} />,
    )
    const selo = container.firstElementChild
    expect(selo?.getAttribute('data-situation')).toBe('awaiting_material')
    expect(selo?.getAttribute('data-tone')).toBe('wait')
    expect(tokens(selo)).toEqual(expect.arrayContaining(['bg-estrelinha-wait-soft', 'text-estrelinha-wait']))
    expect(selo?.lastElementChild?.textContent).toBe('Aguardando material')
  })
})
