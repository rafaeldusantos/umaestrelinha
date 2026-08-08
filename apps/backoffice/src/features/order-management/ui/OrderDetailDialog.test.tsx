import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { DbOrder } from '@estrelinha/supabase/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

// UX-01 e UX-02 (feature 10): o admin precisa saber (a) que marcar `shipped` sem rastreio não avisa a
// cliente, e (b) se a escrita falhou ou se o e-mail saiu. Antes desta feature o erro de `updateStatus`
// era DESCARTADO — o dialog fechava e o admin achava que tinha salvo.
//
// Fronteira declarada: o caminho do DROPDOWN de status não é dirigido aqui. O `Select` do Radix exige
// APIs de pointer capture que o jsdom não tem, e um teste que as remenda fica instável. O que ele
// provaria — "erro volta e não dispara e-mail" — está provado em `useAdminOrders.test.ts`, e os dois
// handlers do dialog têm a mesma forma. O que é exclusivo do dialog (os dois ramos de toast) está
// provado abaixo pelo caminho do rastreio, que é Input + Button.

const toastSuccess = vi.fn()
const toastError = vi.fn()

vi.mock('sonner', () => ({ toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) } }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}))

vi.mock('@estrelinha/supabase', () => ({
  supabase: { functions: { invoke: vi.fn() }, from: vi.fn(), channel: vi.fn(), removeChannel: vi.fn() },
}))

import OrderDetailDialog from './OrderDetailDialog'

function orderFixture(over: Partial<DbOrder> = {}): DbOrder {
  return {
    id: 'ord-1',
    order_number: 'NP-ABC123',
    customer_name: 'Mariana Souza',
    customer_email: 'mariana@example.com',
    status: 'paid',
    payment_status: 'approved',
    payment_method: 'pix',
    subtotal: 48,
    shipping_cost: 12.5,
    discount: 0,
    total: 60.5,
    tracking_code: null,
    shipping_carrier: null,
    created_at: '2026-07-30T12:00:00Z',
    ...over,
  } as unknown as DbOrder
}

const onAddTracking = vi.fn()
const onStatusChange = vi.fn()

function renderDialog(order: DbOrder) {
  return render(
    <OrderDetailDialog
      open
      onOpenChange={() => {}}
      order={order}
      onStatusChange={onStatusChange}
      getItems={async () => []}
      getStatusHistory={async () => []}
      getNotes={async () => []}
      onCancel={async () => null}
      onAddTracking={onAddTracking}
      onAddNote={async () => null}
    />,
  )
}

/** O Tabs do Radix ativa em `mousedown`, não em `click` — só `fireEvent.click` não troca de aba. */
function openTrackingTab() {
  fireEvent.mouseDown(screen.getByRole('tab', { name: /rastreio/i }))
}

/** Abre a aba Rastreio e salva um código. */
async function saveTracking(code = 'NA123456789BR') {
  openTrackingTab()
  const input = await screen.findByPlaceholderText('Código de rastreio')
  fireEvent.change(input, { target: { value: code } })
  fireEvent.click(screen.getByRole('button', { name: /salvar rastreio/i }))
}

beforeEach(() => {
  toastSuccess.mockReset()
  toastError.mockReset()
  onAddTracking.mockReset()
  onStatusChange.mockReset()
})

describe('UX-02 — o resultado da escrita e do aviso ficam visíveis', () => {
  it('erro de banco vira toast.error com a mensagem — antes era engolido', async () => {
    onAddTracking.mockResolvedValue({
      error: { message: 'violates check constraint "orders_status_check"' },
      emailSent: false,
    })
    renderDialog(orderFixture())

    await saveTracking()

    await waitFor(() => expect(toastError).toHaveBeenCalledTimes(1))
    expect(toastError.mock.calls[0][0]).toContain('violates check constraint')
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('sucesso COM e-mail enviado avisa que a cliente foi notificada', async () => {
    onAddTracking.mockResolvedValue({ error: null, emailSent: true })
    renderDialog(orderFixture({ status: 'shipped' } as Partial<DbOrder>))

    await saveTracking()

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Rastreio salvo e cliente avisado por e-mail'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('sucesso SEM e-mail não promete aviso que não houve', async () => {
    onAddTracking.mockResolvedValue({ error: null, emailSent: false })
    renderDialog(orderFixture())

    await saveTracking()

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Rastreio salvo'))
    expect(toastSuccess.mock.calls[0][0]).not.toContain('e-mail')
  })

  it('passa o código e a transportadora sem espaços para quem escreve', async () => {
    onAddTracking.mockResolvedValue({ error: null, emailSent: true })
    renderDialog(orderFixture())

    openTrackingTab()
    fireEvent.change(await screen.findByPlaceholderText('Código de rastreio'), {
      target: { value: '  NA123456789BR  ' },
    })
    fireEvent.change(screen.getByPlaceholderText(/transportadora/i), { target: { value: ' Correios ' } })
    fireEvent.click(screen.getByRole('button', { name: /salvar rastreio/i }))

    await waitFor(() => expect(onAddTracking).toHaveBeenCalledWith('ord-1', 'NA123456789BR', 'Correios'))
  })
})

describe('UX-01 — dica de rastreio ausente, sem bloquear o save', () => {
  it('pedido `shipped` sem código mostra a dica', () => {
    renderDialog(orderFixture({ status: 'shipped', tracking_code: null } as Partial<DbOrder>))

    expect(screen.getByText(/o e-mail de envio só sai quando o código for salvo/i)).toBeInTheDocument()
  })

  it('pedido `shipped` COM código não mostra a dica', () => {
    renderDialog(orderFixture({ status: 'shipped', tracking_code: 'NA1' } as Partial<DbOrder>))

    expect(screen.queryByText(/o e-mail de envio só sai quando/i)).not.toBeInTheDocument()
  })

  it('pedido que não é `shipped` não mostra a dica', () => {
    renderDialog(orderFixture({ status: 'paid', tracking_code: null } as Partial<DbOrder>))

    expect(screen.queryByText(/o e-mail de envio só sai quando/i)).not.toBeInTheDocument()
  })

  it('a dica não desabilita o botão de salvar rastreio — postar sem código é legítimo', () => {
    renderDialog(orderFixture({ status: 'shipped', tracking_code: null } as Partial<DbOrder>))

    openTrackingTab()
    // O botão só fica desabilitado por código vazio, não pela dica.
    expect(screen.getByRole('button', { name: /salvar rastreio/i })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Código de rastreio'), { target: { value: 'NA1' } })
    expect(screen.getByRole('button', { name: /salvar rastreio/i })).toBeEnabled()
  })
})
