// @vitest-environment jsdom
//
// Molde de `useNotificationsDraft.test.tsx` (L-030): os hooks de settings são REAIS por baixo de um
// QueryClientProvider de verdade — só o client do Supabase é dublado (`.from` para `store_settings`,
// `.functions.invoke` para `?action=preview` e `?action=config-check`).

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS, NOTIFICATION_EVENTS } from '@estrelinha/core/notifications'
import { NOTIFICATION_SECTIONS, groupedEvents } from '../../model/sections'

const { selectMock, upsertMock, invokeMock } = vi.hoisted(() => ({
  selectMock: vi.fn(),
  upsertMock: vi.fn(),
  invokeMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => ({ select: selectMock, upsert: upsertMock }),
    functions: { invoke: invokeMock },
  },
}))

const toastMock = vi.fn()
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))

import { NotificationsTab } from '../NotificationsTab'

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0, staleTime: 0 } } })
  return { client, Wrapper: ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children) }
}

function renderTab(rows: Array<{ key: string; value: unknown }> = [{ key: 'general', value: {} }]) {
  selectMock.mockResolvedValue({ data: rows, error: null })
  const { client, Wrapper } = makeWrapper()
  const utils = render(createElement(NotificationsTab), { wrapper: Wrapper })
  return { ...utils, client, Wrapper }
}

const previewOk = (subject: string) => ({
  data: { subject, html: `<p>${subject}</p>`, text: subject, sample: true },
  error: null,
})

beforeEach(() => {
  selectMock.mockReset()
  upsertMock.mockReset()
  upsertMock.mockResolvedValue({ error: null })
  invokeMock.mockReset()
  invokeMock.mockImplementation((name: string) => {
    if (name.includes('config-check')) {
      return Promise.resolve({ data: { admin_public_url: 'https://painel.umaestrelinha.com.br' }, error: null })
    }
    return Promise.resolve(previewOk('Prévia padrão'))
  })
})

describe('NotificationsTab (ABN-01) — 15 cards, três seções, ordem preservada', () => {
  it('renderiza um card por evento — os 15, cada um exatamente uma vez', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId(`event-card-${NOTIFICATION_EVENTS[0]}`)).toBeInTheDocument())

    for (const event of NOTIFICATION_EVENTS) {
      expect(screen.getByTestId(`event-card-${event}`)).toBeInTheDocument()
    }
    expect(screen.getAllByTestId(/^event-card-[a-z_]+$/)).toHaveLength(15)
  })

  it('a ordem do flat de cards é a das TRÊS SEÇÕES, e dentro de cada uma é a de NOTIFICATION_EVENTS', async () => {
    // AC 1 da spec: "agrupados em três seções... preservando, dentro de cada seção, a ordem de
    // NOTIFICATION_EVENTS". O flat inteiro NÃO é literalmente NOTIFICATION_EVENTS (que intercala
    // customer/material/owner) — é `groupedEvents()`, achatado seção a seção. `sections.test.ts` já
    // prova a regra pura; aqui provamos que a TELA a respeita.
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const esperado = NOTIFICATION_SECTIONS.flatMap((s) => groupedEvents()[s]).map((e) => `event-card-${e}`)
    const cards = screen.getAllByTestId(/^event-card-[a-z_]+$/)
    expect(cards.map((el) => el.getAttribute('data-testid'))).toEqual(esperado)
  })

  it('as três seções aparecem com rótulo visível, e cada evento está em exatamente uma', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    expect(screen.getByText('Pedido e pagamento')).toBeInTheDocument()
    expect(screen.getByText('Material')).toBeInTheDocument()
    expect(screen.getByText('Avisos para você')).toBeInTheDocument()

    const material = within(screen.getByTestId('notifications-section-material'))
    expect(material.getByTestId('event-card-material_instructions')).toBeInTheDocument()

    const owner = within(screen.getByTestId('notifications-section-owner'))
    expect(owner.getByTestId('event-card-owner_order_paid')).toBeInTheDocument()
    expect(owner.getByTestId('event-card-owner_material_incoming')).toBeInTheDocument()

    // material_instructions não aparece de novo na seção customer nem owner.
    const customer = within(screen.getByTestId('notifications-section-customer'))
    expect(customer.queryByTestId('event-card-material_instructions')).toBeNull()
  })

  it('nenhuma coluna ou campo de WhatsApp existe na árvore', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    expect(screen.queryByLabelText(/canal/i)).toBeNull()
    expect(screen.queryByText(/canal.{0,15}whatsapp/i)).toBeNull()
    expect(screen.queryAllByRole('tab').length).toBe(0)
  })
})

describe('NotificationsTab (ABN-06) — um preview ativo por vez', () => {
  it('abrir a prévia de um card fecha a de outro que estivesse aberta', async () => {
    invokeMock.mockImplementation((name: string, opts?: { body?: { event?: string } }) => {
      if (name.includes('config-check')) {
        return Promise.resolve({ data: { admin_public_url: 'https://painel.umaestrelinha.com.br' }, error: null })
      }
      return Promise.resolve(previewOk(`Prévia de ${opts?.body?.event}`))
    })
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    const cardA = screen.getByTestId('event-card-order_received')
    const cardB = screen.getByTestId('event-card-order_paid')

    fireEvent.click(within(cardA).getByTestId('order_received-toggle-preview'))
    await waitFor(() => expect(within(cardA).getByTestId('email-preview-iframe')).toBeInTheDocument())
    expect(within(cardA).getByTestId('email-preview-iframe').getAttribute('srcdoc')).toBe(
      '<p>Prévia de order_received</p>',
    )

    fireEvent.click(within(cardB).getByTestId('order_paid-toggle-preview'))
    await waitFor(() => expect(within(cardB).getByTestId('email-preview-iframe')).toBeInTheDocument())

    // A prévia de A fechou quando a de B abriu.
    expect(within(cardA).queryByTestId('email-preview-iframe')).toBeNull()
    expect(within(cardB).getByTestId('email-preview-iframe').getAttribute('srcdoc')).toBe(
      '<p>Prévia de order_paid</p>',
    )
  })
})

describe('NotificationsTab (ABN-07) — pedido de exemplo × pedido real', () => {
  it('sem digitar nada, a prévia chama previewNotification SEM order_id (usa o exemplo)', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    fireEvent.click(
      within(screen.getByTestId('event-card-order_received')).getByTestId('order_received-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(([name]) => String(name).includes('preview'))
    expect(chamada?.[1]?.body?.order_id).toBeUndefined()
  })

  it('digitar um ID de pedido faz a prévia chamar previewNotification COM esse order_id', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_received')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('notifications-preview-order-id'), {
      target: { value: '11111111-2222-3333-4444-555555555555' },
    })
    fireEvent.click(
      within(screen.getByTestId('event-card-order_received')).getByTestId('order_received-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(([name]) => String(name).includes('preview'))
    expect(chamada?.[1]?.body?.order_id).toBe('11111111-2222-3333-4444-555555555555')
  })

  it('o ID digitado vale para QUALQUER card em que "ver prévia" for clicado, não só o primeiro', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('notifications-preview-order-id'), {
      target: { value: 'pedido-compartilhado' },
    })
    fireEvent.click(
      within(screen.getByTestId('event-card-order_paid')).getByTestId('order_paid-toggle-preview'),
    )
    await waitFor(() => expect(invokeMock).toHaveBeenCalled())

    const chamada = invokeMock.mock.calls.find(
      ([name, opts]) => String(name).includes('preview') && opts?.body?.event === 'order_paid',
    )
    expect(chamada?.[1]?.body?.order_id).toBe('pedido-compartilhado')
  })
})

describe('NotificationsTab (ABN-12) — remontar sem salvar mostra o último estado do servidor', () => {
  it('editar, desmontar e remontar descarta a edição', async () => {
    const { unmount, Wrapper } = renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('order_paid-subject'), {
      target: { value: 'Rascunho que não vai ser salvo' },
    })
    expect(screen.getByTestId('order_paid-subject')).toHaveValue('Rascunho que não vai ser salvo')

    unmount()

    render(createElement(NotificationsTab), { wrapper: Wrapper })
    await waitFor(() =>
      expect(screen.getByTestId('order_paid-subject')).toHaveValue(
        DEFAULT_NOTIFICATIONS.events.order_paid.email.fields.subject,
      ),
    )
  })
})

describe('NotificationsTab (ABN-09) — avisos roteados para os cards certos', () => {
  it('material_instructions mostra o aviso de endereço vazio (default: sem linha material)', async () => {
    renderTab([{ key: 'general', value: {} }])
    await waitFor(() => expect(screen.getByTestId('event-card-material_instructions')).toBeInTheDocument())

    expect(screen.getByTestId('event-warnings-material_instructions')).toBeInTheDocument()
    // Nenhum outro card da seção "Pedido e pagamento" ganha o mesmo aviso.
    expect(screen.queryByTestId('event-warnings-order_paid')).toBeNull()
  })

  it('owner_* mostram os DOIS avisos quando e-mail vazio E URL parece local', async () => {
    invokeMock.mockImplementation((name: string) => {
      if (name.includes('config-check')) {
        return Promise.resolve({ data: { admin_public_url: 'http://localhost:8083' }, error: null })
      }
      return Promise.resolve(previewOk('x'))
    })
    renderTab([{ key: 'general', value: { email: '' } }])
    await waitFor(() => expect(screen.getByTestId('event-card-owner_order_paid')).toBeInTheDocument())

    await waitFor(() => expect(screen.getByTestId('event-warnings-owner_order_paid')).toBeInTheDocument())
    const banner = screen.getByTestId('event-warnings-owner_order_paid')
    expect(banner.textContent).toContain('e-mail')
    expect(banner.textContent).toMatch(/produ[çc][ãa]o/)

    expect(screen.getByTestId('event-warnings-owner_material_incoming')).toBeInTheDocument()
    // material_instructions não ganha os avisos de owner.
    expect(screen.queryByTestId('event-warnings-material_instructions')).not.toBeNull() // continua com o SEU próprio aviso (endereço vazio)
  })

  it('sem nenhuma pendência (e-mail preenchido, URL de produção, endereço preenchido), nenhum card mostra aviso', async () => {
    renderTab([
      { key: 'general', value: {} },
      {
        key: 'material',
        value: { recipient: 'Adri', street: 'Rua das Flores', number: '1', complement: '', neighborhood: '', city: '', state: '', zip: '', notes: '' },
      },
    ])
    await waitFor(() => expect(screen.getByTestId('event-card-material_instructions')).toBeInTheDocument())
    await waitFor(() => expect(screen.queryByTestId('event-warnings-material_instructions')).toBeNull())
    expect(screen.queryByTestId('event-warnings-owner_order_paid')).toBeNull()
    expect(screen.queryByTestId('event-warnings-owner_material_incoming')).toBeNull()
  })
})

describe('NotificationsTab — salvar', () => {
  it('o botão salvar chama a gravação com sucesso quando canSave é true', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('notifications-save'))
    await waitFor(() => expect(upsertMock).toHaveBeenCalledTimes(1))
    expect(toastMock).not.toHaveBeenCalled()
  })

  it('o botão fica desabilitado quando algum campo viola uma régua de core', async () => {
    renderTab()
    await waitFor(() => expect(screen.getByTestId('event-card-order_paid')).toBeInTheDocument())

    fireEvent.change(screen.getByTestId('order_paid-lead'), {
      target: { value: 'Corra, é imperdível — últimas unidades!!' },
    })

    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeDisabled())
  })

  it('mostra um toast de erro quando a gravação falha', async () => {
    upsertMock.mockResolvedValue({ error: new Error('rede fora do ar') })
    renderTab()
    await waitFor(() => expect(screen.getByTestId('notifications-save')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('notifications-save'))
    await waitFor(() => expect(toastMock).toHaveBeenCalledTimes(1))
    expect(toastMock.mock.calls[0][0]).toMatchObject({ variant: 'destructive' })
  })
})
