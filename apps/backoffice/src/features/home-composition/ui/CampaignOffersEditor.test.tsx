// O editor de "Joias em oferta": sem campo, e dizendo de onde vem o conteúdo.

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { SECTION_EDITORS, type SectionEditorProps } from './sectionEditors'

describe('Joias em oferta no painel', () => {
  it('o editor não tem campo e aponta para Campanhas', () => {
    const entrada = SECTION_EDITORS.campaign_offers!
    expect(entrada.refusal).toBeUndefined()
    const Body = entrada.Body
    const { container } = render(
      <MemoryRouter>
        <Body {...({} as SectionEditorProps)} />
      </MemoryRouter>,
    )

    expect(container.querySelectorAll('input, textarea, select')).toHaveLength(0)
    expect(screen.getByText(/vêm da campanha de desconto em vigência/)).toBeInTheDocument()
    expect(screen.getByText(/não aparece na loja/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Campanhas' })).toHaveAttribute('href', '/admin/campanhas')
  })
})
