import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Produtos" />)
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('renders the subtitle only when provided', () => {
    const { rerender } = render(<PageHeader title="Produtos" />)
    expect(screen.queryByText('Gerencie o catálogo')).not.toBeInTheDocument()
    rerender(<PageHeader title="Produtos" subtitle="Gerencie o catálogo" />)
    expect(screen.getByText('Gerencie o catálogo')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(<PageHeader title="Produtos" actions={<button>Novo</button>} />)
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
  })

  it('calls backTo when the back button is clicked', () => {
    const backTo = vi.fn()
    render(<PageHeader title="Editar" backTo={backTo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(backTo).toHaveBeenCalledTimes(1)
  })

  it('does not render a back button without backTo', () => {
    render(<PageHeader title="Editar" />)
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
  })

  it('no celular os botões das ações quebram linha (fonte grande), sem mudar o computador', () => {
    render(<PageHeader title="Pedidos" actions={<button>Folha de separação</button>} />)
    const tokens = (screen.getByRole('button', { name: 'Folha de separação' }).parentElement!.getAttribute('class') ?? '').split(/\s+/)
    for (const t of TOKENS_QUE_QUEBRAM) expect(tokens).toContain(t)
    expect(tokens).not.toContain('whitespace-normal')
  })
})

// Conserto do reteste da feature `88` (`BUG-20261030-pedido-rola-de-lado-com-fonte-200`): com a fonte a
// 200 % em 390, os botões do cabeçalho (`whitespace-nowrap` do shadcn) mediam 363–370 px numa coluna de
// 294 e a página inteira rolava de lado. No celular eles quebram linha; no computador, nada muda.
const TOKENS_QUE_QUEBRAM = [
  'min-w-0', 'max-w-full', 'flex-wrap',
  'max-md:[&_button]:whitespace-normal', 'max-md:[&_button]:h-auto', 'max-md:[&_button]:min-h-11',
]
