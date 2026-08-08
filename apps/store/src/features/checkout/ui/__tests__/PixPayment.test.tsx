import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { StrictMode } from 'react'
import PixPayment from '../PixPayment'
import { supabase } from '@estrelinha/supabase/client'

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr" data-value={value} />,
}))

const mutateAsync = vi.fn()
vi.mock('../../api/useCreatePayment', () => ({
  useCreatePayment: () => ({ mutateAsync, isPending: false }),
  PAYMENT_UNAVAILABLE_MESSAGE: 'Não foi possível iniciar o pagamento. Tente novamente.',
}))

const paymentSettings = {
  pix_enabled: true,
  pix_discount_percent: 5,
  card_enabled: true,
  max_installments: 6,
  min_installment_value: 10,
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => paymentSettings,
}))

// Canal Realtime mockado: captura o filtro e o callback do postgres_changes.
let realtimeHandler: ((payload: any) => void) | null = null
let realtimeConfig: any = null
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => {
      const ch: any = {}
      ch.on = vi.fn((_event: string, config: any, cb: (payload: any) => void) => {
        realtimeConfig = config
        realtimeHandler = cb
        return ch
      })
      ch.subscribe = vi.fn(() => ch)
      return ch
    }),
    removeChannel: vi.fn(),
  },
}))

const onApproved = vi.fn()

const futurePix = () => ({
  qr_code: 'PIX-COPIA-E-COLA',
  qr_code_base64: null,
  expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
})

const expiredPix = () => ({
  qr_code: 'PIX-EXPIRADO',
  qr_code_base64: null,
  expires_at: new Date(Date.now() - 1000).toISOString(),
})

beforeEach(() => {
  mutateAsync.mockReset()
  onApproved.mockClear()
  vi.mocked(supabase.channel).mockClear()
  vi.mocked(supabase.removeChannel).mockClear()
  realtimeHandler = null
  realtimeConfig = null
  paymentSettings.pix_discount_percent = 5
})

describe('PixPayment', () => {
  it('cria o pagamento ao montar UMA vez (guard StrictMode) e renderiza o QR do qr_code', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    render(
      <StrictMode>
        <PixPayment orderId="order-1" onApproved={onApproved} />
      </StrictMode>,
    )

    const qr = await screen.findByTestId('qr')
    expect(qr.getAttribute('data-value')).toBe('PIX-COPIA-E-COLA')
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({ order_id: 'order-1', method: 'pix' })
  })

  it('assina Realtime na linha do pedido e chama onApproved quando payment_status vira approved (PAY-13)', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(realtimeConfig).toEqual({
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: 'id=eq.order-1',
    })

    act(() => realtimeHandler!({ new: { payment_status: 'pending' } }))
    expect(onApproved).not.toHaveBeenCalled()

    act(() => realtimeHandler!({ new: { payment_status: 'approved' } }))
    expect(onApproved).toHaveBeenCalledTimes(1)
  })

  it('QR expirado mostra CTA "Gerar novo código" que refaz o create-payment (PAY-11)', async () => {
    mutateAsync.mockResolvedValueOnce(expiredPix()).mockResolvedValueOnce(futurePix())
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)

    const cta = await screen.findByRole('button', { name: /gerar novo código/i })
    expect(screen.queryByTestId('qr')).not.toBeInTheDocument()

    fireEvent.click(cta)

    const qr = await screen.findByTestId('qr')
    expect(qr.getAttribute('data-value')).toBe('PIX-COPIA-E-COLA')
    expect(mutateAsync).toHaveBeenCalledTimes(2)
  })

  it('exibe a linha de desconto PIX quando percent > 0 (PAY-14)', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.getByText(/5% de desconto no PIX/i)).toBeInTheDocument()
  })

  it('NÃO exibe desconto PIX quando percent = 0', async () => {
    paymentSettings.pix_discount_percent = 0
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.queryByText(/desconto no PIX/i)).not.toBeInTheDocument()
  })

  it('erro na criação exibe mensagem e permite tentar novamente (PAY-09)', async () => {
    mutateAsync
      .mockRejectedValueOnce(new Error('Não foi possível iniciar o pagamento. Tente novamente.'))
      .mockResolvedValueOnce(futurePix())
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível iniciar o pagamento. Tente novamente.',
    )

    fireEvent.click(screen.getByRole('button', { name: /tentar novamente/i }))
    await screen.findByTestId('qr')
    expect(mutateAsync).toHaveBeenCalledTimes(2)
  })

  it('remove o canal Realtime no unmount', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    const { unmount } = render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    unmount()
    await waitFor(() => expect(supabase.removeChannel).toHaveBeenCalled())
  })
})

// CNF-01: a tela do PIX diz **quanto** sai da conta dela — hoje ausente.
// CNF-02: código expirado não perde o pedido: ele fica em "Minha conta → Pedidos".
describe('PixPayment — valor a pagar e saída para a conta (CNF-01, CNF-02)', () => {
  it('exibe o valor exato a pagar em destaque', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" amount={46.55} onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.getByText('R$ 46,55')).toBeInTheDocument()
  })

  it('acompanha o valor da nota de desconto PIX quando percent > 0', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" amount={46.55} onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.getByText('já com os 5% de desconto do PIX')).toBeInTheDocument()
  })

  it('percent = 0 exibe o valor sem a nota de desconto', async () => {
    paymentSettings.pix_discount_percent = 0
    mutateAsync.mockResolvedValue(futurePix())
    render(<PixPayment orderId="order-1" amount={49} onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.getByText('R$ 49,00')).toBeInTheDocument()
    expect(screen.queryByText(/desconto do PIX/i)).not.toBeInTheDocument()
  })

  it('código expirado informa que o pedido fica guardado em Minha conta → Pedidos', async () => {
    mutateAsync.mockResolvedValue(expiredPix())
    render(<PixPayment orderId="order-1" amount={46.55} onApproved={onApproved} />)
    await screen.findByRole('button', { name: /gerar novo código/i })

    expect(screen.getByText(/o pedido fica guardado em/i)).toBeInTheDocument()
  })

  it('código expirado oferece link para /conta', async () => {
    mutateAsync.mockResolvedValue(expiredPix())
    render(<PixPayment orderId="order-1" amount={46.55} onApproved={onApproved} />)
    await screen.findByRole('button', { name: /gerar novo código/i })

    expect(screen.getByRole('link', { name: /minha conta/i })).toHaveAttribute('href', '/conta')
  })

  it('a saída para a conta é ADICIONAL: o CTA de gerar novo código continua lá', async () => {
    mutateAsync.mockResolvedValue(expiredPix())
    render(<PixPayment orderId="order-1" amount={46.55} onApproved={onApproved} />)

    expect(await screen.findByRole('button', { name: /gerar novo código/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /minha conta/i })).toBeInTheDocument()
  })
})

// CNF-06: os estados desta tela se distinguem por forma e pelos tokens `estrelinha-*`.
// O grep da spec (utilitários de vermelho/verde/azul/amarelo/roxo do Tailwind) volta zero.
describe('PixPayment — estados na paleta Uma Estrelinha (CNF-06)', () => {
  it('erro na criação usa geleia sobre pó de açúcar, sem vermelho', async () => {
    mutateAsync.mockRejectedValue(new Error('Não foi possível iniciar o pagamento. Tente novamente.'))
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('text-estrelinha-primary')
    expect(alert).toHaveClass('bg-estrelinha-ground-deep')
  })

  it('contador nos últimos 5 minutos vira geleia em vez de vermelho', async () => {
    mutateAsync.mockResolvedValue({
      qr_code: 'PIX-QUASE-EXPIRADO',
      qr_code_base64: null,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
    })
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(screen.getByText(/^0[01]:\d{2}$/)).toHaveClass('text-estrelinha-primary')
  })

  it('confirmação de "copiado" usa geleia em vez de verde', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    Object.assign(navigator, { clipboard: { writeText: vi.fn() } })
    render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    fireEvent.click(screen.getByLabelText('Copiar código'))

    const check = await screen.findByLabelText('Código copiado')
    expect(check).toHaveClass('text-estrelinha-primary')
  })

  // `DESIGN.md` §8: uma única pílula geleia por tela. Esta superfície monta dentro do checkout,
  // onde o CTA já é a pílula geleia — então os CTAs de recuperação daqui são secundários.
  it('o CTA de erro é secundário (contorno tinta), não uma segunda pílula geleia', async () => {
    mutateAsync.mockRejectedValue(new Error('Não foi possível iniciar o pagamento. Tente novamente.'))
    const { container } = render(<PixPayment orderId="order-1" onApproved={onApproved} />)

    const retry = await screen.findByRole('button', { name: /tentar novamente/i })
    expect(retry.className).toContain('border-estrelinha-ink')
    expect(retry.className).not.toContain('bg-estrelinha-primary')
    expect(container.querySelectorAll('[class*="bg-estrelinha-primary"]')).toHaveLength(0)
  })

  it('o CTA de código expirado é secundário (contorno tinta), não uma segunda pílula geleia', async () => {
    mutateAsync.mockResolvedValue(expiredPix())
    const { container } = render(<PixPayment orderId="order-1" onApproved={onApproved} />)

    const regenerate = await screen.findByRole('button', { name: /gerar novo código/i })
    expect(regenerate.className).toContain('border-estrelinha-ink')
    expect(regenerate.className).not.toContain('bg-estrelinha-primary')
    expect(container.querySelectorAll('[class*="bg-estrelinha-primary"]')).toHaveLength(0)
  })

  it('nenhuma classe de cor fora da paleta em nenhum estado renderizado', async () => {
    mutateAsync.mockResolvedValue(futurePix())
    const { container } = render(<PixPayment orderId="order-1" onApproved={onApproved} />)
    await screen.findByTestId('qr')

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})
