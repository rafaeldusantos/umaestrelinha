import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { parcelTrackingUrl } from '@estrelinha/core/orders'
import OrderTrackingCard from '../OrderTrackingCard'

// Feature 59 — o rastreio do pacote no detalhe.
//
// DET-03: com `tracking_code`, o cartão mostra o código, a transportadora (quando houver),
//         "Acompanhar entrega" (o rastreio da transportadora em nova aba) e "Copiar" (copia e avisa).
// DET-04: sem código, o cartão não é renderizado.

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('sonner', () => ({ toast }))

const tokens = (el: Element) => el.className.split(/\s+/).filter(Boolean)

const clipboardOriginal = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const definirClipboard = (valor: unknown) =>
  Object.defineProperty(navigator, 'clipboard', { value: valor, configurable: true })

beforeEach(() => {
  toast.success.mockReset()
  toast.error.mockReset()
})

afterEach(() => {
  if (clipboardOriginal) Object.defineProperty(navigator, 'clipboard', clipboardOriginal)
  else delete (navigator as { clipboard?: unknown }).clipboard
})

describe('OrderTrackingCard — sem código, sem cartão (DET-04)', () => {
  it.each([null, undefined, '', '   '])('código %p não renderiza nada', (code) => {
    const { container } = render(<OrderTrackingCard code={code as string | null} carrier="Correios" />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Acompanhar entrega')).not.toBeInTheDocument()
  })
})

describe('OrderTrackingCard — o cartão (DET-03)', () => {
  it('mostra o rótulo, o código e a transportadora', () => {
    render(<OrderTrackingCard code="QC123456789BR" carrier="Correios" />)

    expect(screen.getByRole('region', { name: 'Rastreio do pacote' })).toBeInTheDocument()
    expect(screen.getByText('Rastreio do pacote')).toHaveClass('estrelinha-eyebrow')
    expect(screen.getByText('QC123456789BR')).toBeInTheDocument()
    expect(screen.getByText('Enviado por Correios')).toBeInTheDocument()
  })

  it('sem transportadora, o código aparece sozinho — nada de "Enviado por" vazio', () => {
    render(<OrderTrackingCard code="QC123456789BR" carrier={null} />)

    expect(screen.getByText('QC123456789BR')).toBeInTheDocument()
    expect(screen.queryByText(/Enviado por/)).not.toBeInTheDocument()
  })

  it('o código aparece aparado e em maiúsculas, como vai no link', () => {
    render(<OrderTrackingCard code="  qc123456789br " />)

    expect(screen.getByText('QC123456789BR')).toBeInTheDocument()
  })

  it('"Acompanhar entrega" abre o rastreio da transportadora em NOVA aba, com `rel` seguro', () => {
    render(<OrderTrackingCard code="QC123456789BR" carrier="Correios" />)

    const link = screen.getByRole('link', { name: 'Acompanhar entrega' })
    expect(link.getAttribute('href')).toBe(parcelTrackingUrl('QC123456789BR'))
    expect(link.getAttribute('href')).toBe('https://www.melhorrastreio.com.br/rastreio/QC123456789BR')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')?.split(' ')).toEqual(
      expect.arrayContaining(['noopener', 'noreferrer']),
    )
  })

  it('os dois botões têm o alvo de 44px (token exato)', () => {
    render(<OrderTrackingCard code="QC123456789BR" />)

    expect(tokens(screen.getByRole('link', { name: 'Acompanhar entrega' }))).toContain('min-h-11')
    expect(tokens(screen.getByRole('button', { name: 'Copiar' }))).toContain('min-h-11')
  })

  it('o cartão é `primary` com texto `on-primary`, e nenhuma cor padrão do Tailwind', () => {
    const { container } = render(<OrderTrackingCard code="QC123456789BR" carrier="Correios" />)

    const cartao = screen.getByRole('region', { name: 'Rastreio do pacote' })
    expect(tokens(cartao)).toEqual(
      expect.arrayContaining(['bg-estrelinha-primary', 'text-estrelinha-on-primary']),
    )
    expect(container.innerHTML).not.toMatch(/\b(bg|text|border)-(yellow|blue|purple|green|red)-\d/)
  })
})

describe('OrderTrackingCard — copiar (DET-03)', () => {
  it('"Copiar" põe o código na área de transferência e confirma com aviso', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    definirClipboard({ writeText })
    render(<OrderTrackingCard code=" qc123456789br" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Código de rastreio copiado'))
    expect(writeText).toHaveBeenCalledWith('QC123456789BR')
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('área de transferência recusando: avisa que NÃO copiou, em vez de fingir', async () => {
    definirClipboard({ writeText: vi.fn().mockRejectedValue(new Error('NotAllowedError')) })
    render(<OrderTrackingCard code="QC123456789BR" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível copiar. Selecione o código e copie à mão.',
      ),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('área de transferência inexistente: mesmo aviso, sem lançar', async () => {
    definirClipboard(undefined)
    render(<OrderTrackingCard code="QC123456789BR" />)

    fireEvent.click(screen.getByRole('button', { name: 'Copiar' }))

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível copiar. Selecione o código e copie à mão.',
      ),
    )
    expect(toast.success).not.toHaveBeenCalled()
  })
})
