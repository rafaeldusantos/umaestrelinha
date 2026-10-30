// Feature `88` · T16 — o cancelamento com a caixa "Avisar a cliente por e-mail" (`AVS-08`, `AVS-09`), que
// fica aberto até o desfecho e não apaga o motivo em falha (`CRG-07`).

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CustomerNotice, NotificationEvent } from '@estrelinha/core/notifications'

import OrderCancelDialog from './OrderCancelDialog'

const CANCELADO = ['order_cancelled'] as NotificationEvent[]

const base = (over: Partial<React.ComponentProps<typeof OrderCancelDialog>> = {}) => ({
  open: true,
  onOpenChange: vi.fn(),
  orderNumber: '1042',
  aviso: { send: CANCELADO, alreadySent: [] } as CustomerNotice,
  eventosDaCliente: CANCELADO,
  cliente: 'lu@example.com',
  onConfirm: vi.fn().mockResolvedValue(null),
  ...over,
})

const montar = (over: Partial<React.ComponentProps<typeof OrderCancelDialog>> = {}) => {
  const props = base(over)
  render(<OrderCancelDialog {...props} />)
  return props
}

const motivo = (texto = 'Cliente desistiu') =>
  fireEvent.change(screen.getByLabelText('Motivo do cancelamento'), { target: { value: texto } })
const confirmar = () => fireEvent.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

describe('AVS-08 — a caixa dentro do cancelamento', () => {
  it('e-mail previsto ⇒ caixa MARCADA, o nome do e-mail e a cliente, acima de "Confirmar cancelamento"', () => {
    montar()
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('Avisar a cliente por e-mail')).toBeInTheDocument()
    expect(screen.getByText('Pedido cancelado')).toBeInTheDocument()
    expect(screen.getByText('Para lu@example.com:')).toBeInTheDocument()
    const caixa = screen.getByRole('checkbox')
    const botao = screen.getByRole('button', { name: 'Confirmar cancelamento' })
    expect(caixa.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('e-mail desligado ⇒ uma linha dizendo isso, SEM caixa', () => {
    montar({ aviso: { send: [], alreadySent: [] } })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(
      screen.getByText('Nenhum e-mail sai: “Pedido cancelado” está desligado em Configurações → Notificações.'),
    ).toBeInTheDocument()
  })

  it('já enviado ⇒ a linha diz que não sai de novo, sem caixa', () => {
    montar({ aviso: { send: [], alreadySent: CANCELADO } })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('“Pedido cancelado” já tinha sido enviado, não sai de novo.')).toBeInTheDocument()
  })

  it('o motivo continua obrigatório', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled()
    motivo('   ')
    expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled()
  })
})

describe('AVS-09 — a escolha chega a `onConfirm` por valor', () => {
  it('caixa marcada ⇒ `true`', async () => {
    const p = montar()
    motivo()
    confirmar()
    await waitFor(() => expect(p.onConfirm).toHaveBeenCalledWith('Cliente desistiu', true))
  })

  it('caixa desmarcada ⇒ `false`, e o diálogo diz que fica anotado no histórico', async () => {
    const p = montar()
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByText(/A cliente não recebe e-mail\. Fica anotado no histórico/)).toBeInTheDocument()
    motivo()
    confirmar()
    await waitFor(() => expect(p.onConfirm).toHaveBeenCalledWith('Cliente desistiu', false))
  })

  it('sem caixa (nada a escolher) ⇒ `undefined`, nunca `false` (não houve escolha a anotar — AVS-23)', async () => {
    const p = montar({ aviso: { send: [], alreadySent: [] } })
    motivo()
    confirmar()
    await waitFor(() => expect(p.onConfirm).toHaveBeenCalled())
    expect(vi.mocked(p.onConfirm).mock.calls[0]).toEqual(['Cliente desistiu', undefined])
  })

  it('a caixa volta MARCADA ao reabrir', () => {
    const props = base()
    const { rerender } = render(<OrderCancelDialog {...props} />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(screen.getByRole('checkbox')).not.toBeChecked()

    rerender(<OrderCancelDialog {...props} open={false} />)
    rerender(<OrderCancelDialog {...props} open />)
    expect(screen.getByRole('checkbox')).toBeChecked()
  })
})

describe('CRG-07 — fica aberto até o desfecho, e não apaga o motivo em falha', () => {
  it('durante a gravação: "Cancelando…" com aria-busy, "Voltar" e a caixa desabilitados, e o diálogo não fecha', async () => {
    let terminar!: (v: string | null) => void
    const p = montar({ onConfirm: vi.fn(() => new Promise<string | null>(r => { terminar = r })) })
    motivo()
    confirmar()

    const botao = await screen.findByRole('button', { name: /Cancelando…/ })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeDisabled()
    expect(screen.getByRole('checkbox')).toBeDisabled()

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(p.onOpenChange).not.toHaveBeenCalledWith(false)

    await act(async () => terminar(null))
    expect(p.onOpenChange).toHaveBeenCalledWith(false)
  })

  it('falha ⇒ continua aberto, com a frase e o motivo digitado', async () => {
    const p = montar({ onConfirm: vi.fn().mockResolvedValue('O pedido não foi cancelado. O motivo continua aqui — tente de novo.') })
    motivo('A cliente pediu pelo WhatsApp')
    confirmar()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('O pedido não foi cancelado. O motivo continua aqui'),
    )
    expect(p.onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Motivo do cancelamento')).toHaveValue('A cliente pediu pelo WhatsApp')
    expect(screen.getByRole('button', { name: 'Confirmar cancelamento' })).not.toBeDisabled()
  })

  it('"Voltar" não chama `onConfirm`', () => {
    const p = montar()
    motivo()
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(p.onConfirm).not.toHaveBeenCalled()
    expect(p.onOpenChange).toHaveBeenCalledWith(false)
  })
})

// Verifier r3 (V04): o pedido sem e-mail tem frase própria, mesmo com o evento LIGADO.
describe('AVS-08 — pedido sem e-mail da cliente', () => {
  it.each([null, '', '   '])('cliente %j ⇒ "não tem e-mail", nunca "desligado em Configurações"', (cliente) => {
    montar({ aviso: { send: [], alreadySent: [] }, cliente })
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText('Este pedido não tem e-mail da cliente: nenhum aviso sai.')).toBeInTheDocument()
    expect(screen.queryByText(/desligado em Configurações/)).not.toBeInTheDocument()
  })
})
