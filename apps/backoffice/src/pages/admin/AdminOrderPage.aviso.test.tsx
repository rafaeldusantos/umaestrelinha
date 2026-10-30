// Feature `88` · T18 — a página do pedido, REAL, com o aviso opcional e o carregamento honesto.
//
// Nada é dublado no caminho além do client do Supabase: `useAdminOrder` lê, `useAdminOrders` grava pelo
// dono de verdade (`@estrelinha/core/order-actions`), `notifyOrder` monta o corpo, e as configurações
// de notificação vêm de `useStoreSettings` lendo `store_settings`. O dublê REGISTRA cada escrita e cada
// `functions.invoke` — a prova é o corpo, por valor, e a ausência de escrita enquanto o diálogo está
// aberto (`AVS-01`). jsdom não mede layout: a prova do "não pisca" é o campo digitado que sobrevive à
// releitura (uma remontagem o zeraria) e a ausência do esqueleto.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { simularFocoDoNavegador } from '@/test/focoDoNavegador'
import { DEFAULT_NOTIFICATIONS, type NotificationEvent } from '@estrelinha/core/notifications'
import { enableRadixSelectInJsdom, RADIX_POINTER_DOWN } from '@/test/radix'

const { banco, registro, falso, toastSuccess, toastError } = vi.hoisted(() => {
  const banco = {
    order: {} as Record<string, unknown>,
    notificacoes: [] as Record<string, unknown>[],
    settings: [] as { key: string; value: unknown }[],
    falharLeitura: false,
    falharEscrita: false,
    /** Conserto do QA (A-14): a leitura de `order_notifications` falha. */
    falharEnvios: false,
    /** Conserto do QA: o `action=send` que sai passa a linha a `sent` (o avião some). */
    enviarMudaALinha: false,
    /** Uma leitura do pedido segura (a primeira carga, para ver o esqueleto). */
    segurarLeitura: null as Promise<void> | null,
    /** A escrita segura (para ver o gerúndio). */
    segurarEscrita: null as Promise<void> | null,
    respostaSend: { data: { sent: true }, error: null } as { data: unknown; error: unknown },
    respostaTrigger: { data: { sent: true }, error: null } as { data: unknown; error: unknown },
  }
  const registro = {
    escritas: [] as Array<{ table: string; values: unknown }>,
    rpcs: [] as Array<{ fn: string; args: unknown }>,
    invocacoes: [] as Array<{ porta: string; body: Record<string, unknown> }>,
    leiturasDoPedido: 0,
  }

  type Rec = { table: string; select?: unknown[]; filters: { method: string; args: unknown[] }[]; update?: unknown; insert?: unknown }

  const responder = async (r: Rec): Promise<{ data?: unknown; error?: unknown; count?: number }> => {
    if (r.update !== undefined || r.insert !== undefined) {
      if (banco.segurarEscrita) await banco.segurarEscrita
      registro.escritas.push({ table: r.table, values: r.update ?? r.insert })
      if (banco.falharEscrita) return { data: null, error: { message: 'boom' } }
      if (r.table === 'orders' && r.update) Object.assign(banco.order, r.update as object)
      return { data: [{ id: banco.order.id }], error: null }
    }
    switch (r.table) {
      case 'orders': {
        const porId = r.filters.some((f) => f.method === 'eq' && f.args[0] === 'id')
        if (!porId) return { data: [], error: null, count: 0 }
        registro.leiturasDoPedido++
        if (banco.segurarLeitura) await banco.segurarLeitura
        if (banco.falharLeitura) return { data: null, error: { message: 'connection refused' } }
        return { data: { ...banco.order }, error: null }
      }
      case 'order_items':
        return {
          data: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Pingente Gota', quantity: 1, unit_price: 329, requires_material: true, material_kinds: ['cinzas'], engraving_text: null }],
          error: null,
        }
      case 'order_notifications':
        if (banco.falharEnvios) return { data: null, error: { message: 'permission denied' } }
        return { data: banco.notificacoes, error: null }
      case 'store_settings':
        return { data: banco.settings, error: null }
      default:
        return { data: [], error: null }
    }
  }

  const from = (table: string) => {
    const rec: Rec = { table, filters: [] }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'neq', 'order', 'range', 'limit', 'or', 'is', 'gte', 'lte']) {
      b[m] = (...args: unknown[]) => {
        rec.filters.push({ method: m, args })
        return b
      }
    }
    b.select = (...args: unknown[]) => {
      rec.select = args
      return b
    }
    b.update = (v: unknown) => {
      rec.update = v
      return b
    }
    b.insert = (v: unknown) => {
      rec.insert = v
      return b
    }
    b.maybeSingle = () => responder(rec)
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => responder(rec).then(ok, ko)
    return b
  }

  const canal: Record<string, () => unknown> = { on: () => canal, subscribe: () => canal }
  const falso = {
    from,
    channel: () => canal,
    removeChannel: () => {},
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (banco.segurarEscrita) await banco.segurarEscrita
      registro.rpcs.push({ fn, args })
      if (fn === 'set_material_status') {
        banco.order.material_status = args.p_status
        return { data: { ok: true, status: args.p_status }, error: null }
      }
      if (fn === 'set_material_tracking') {
        banco.order.material_tracking_code = args.p_code
        if (banco.order.material_status === 'aguardando_material') banco.order.material_status = 'material_enviado'
        return { data: { ok: true }, error: null }
      }
      return { data: null, error: null }
    },
    functions: {
      invoke: async (porta: string, { body }: { body: Record<string, unknown> }) => {
        if (porta.endsWith('action=send') && banco.segurarEscrita) await banco.segurarEscrita
        registro.invocacoes.push({ porta, body })
        if (porta.endsWith('action=send') && banco.enviarMudaALinha) {
          banco.notificacoes = banco.notificacoes.map((n) =>
            n.event === body.event ? { ...n, status: 'sent', sent_at: '2026-08-22T10:00:00Z' } : n,
          )
        }
        return porta.endsWith('action=send') ? banco.respostaSend : banco.respostaTrigger
      },
    },
  }
  return { banco, registro, falso, toastSuccess: vi.fn(), toastError: vi.fn() }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: falso }))
vi.mock('@estrelinha/supabase', () => ({ supabase: falso }))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError, info: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))

import AdminOrderPage from './AdminOrderPage'

const PEDIDO = {
  id: 'o1', order_number: '1042', customer_id: null, customer_name: 'Luciana Prado',
  customer_email: 'lu.prado@example.com', status: 'separating', payment_method: 'pix',
  payment_status: 'approved', paid_at: '2026-08-20T14:35:00Z', pix_discount: 0, subtotal: 329,
  discount: 0, shipping_cost: 0, total: 329, tracking_code: 'BR1', shipping_carrier: 'Correios',
  shipping_service_id: '1', material_tracking_code: null, material_status: 'nao_aplicavel',
  notes: null, address_street: 'Rua A', address_number: '1', address_city: 'Porto Alegre',
  address_state: 'RS', address_zip: '90000-000', created_at: '2026-08-20T14:32:00Z',
}

/** `store_settings.notifications` com estes eventos ligados no e-mail. */
const ligar = (...eventos: NotificationEvent[]) => {
  const events = { ...DEFAULT_NOTIFICATIONS.events }
  for (const e of eventos) events[e] = { email: { ...events[e].email, enabled: true } }
  banco.settings = [{ key: 'notifications', value: { ...DEFAULT_NOTIFICATIONS, events } }]
}

const notificacao = (event: string, status: string) => ({
  id: `n-${event}`, order_id: 'o1', event, channel: 'email', delivery_status: null, status,
  attempts: 1, provider_message_id: null, error: null, created_at: '2026-08-21T09:00:00Z', sent_at: null,
})

const montar = async (pedido: Record<string, unknown> = {}) => {
  banco.order = { ...PEDIDO, ...pedido }
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
        <Routes>
          <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByText('Pedido #1042')
  // As configurações chegam depois do pedido; a previsão espera por elas.
  await waitFor(() => expect(qc.getQueryState(['store_settings'])?.status).toBe('success'))
}

const gatilhos = () => registro.invocacoes.filter((i) => i.porta === 'send-notification?action=trigger')
const escritasEm = (t: string) => registro.escritas.filter((e) => e.table === t)
const dialogo = () => screen.getByRole('dialog')

beforeAll(enableRadixSelectInJsdom)

beforeEach(() => {
  banco.settings = []
  banco.notificacoes = []
  banco.falharLeitura = false
  banco.falharEscrita = false
  banco.falharEnvios = false
  banco.enviarMudaALinha = false
  banco.segurarLeitura = null
  banco.segurarEscrita = null
  banco.respostaSend = { data: { sent: true }, error: null }
  banco.respostaTrigger = { data: { sent: true }, error: null }
  registro.escritas.length = 0
  registro.rpcs.length = 0
  registro.invocacoes.length = 0
  registro.leiturasDoPedido = 0
  toastSuccess.mockReset()
  toastError.mockReset()
})

describe('gesto 1 — o Próximo passo (AVS-01..07)', () => {
  it('previsto ⇒ o diálogo abre ANTES de qualquer escrita, com o e-mail e a cliente', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))

    expect(within(dialogo()).getByText('Pedido postado')).toBeInTheDocument()
    expect(within(dialogo()).getByText('Para lu.prado@example.com:')).toBeInTheDocument()
    expect(within(dialogo()).getByText('O pedido #1042 passa de Em Separação para Enviado.')).toBeInTheDocument()
    expect(registro.escritas).toEqual([])
    expect(registro.invocacoes).toEqual([])
  })

  it('caixa marcada ⇒ grava e o corpo do gatilho é o de hoje (sem `customer`); "a cliente foi avisada por e-mail"', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(escritasEm('orders')).toEqual([{ table: 'orders', values: { status: 'shipped' } }])
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed' })
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Status: Enviado — a cliente foi avisada por e-mail'),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('caixa desmarcada ⇒ `customer: false` no corpo, e a frase decide-se pela CAIXA mesmo com o motor dizendo `sent`', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed', customer: false })
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Status: Enviado · sem e-mail à cliente (anotado no histórico)'),
    )
  })

  it('caixa marcada e o e-mail que não saiu ⇒ "o e-mail não saiu — o pedido foi alterado"', async () => {
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Status: Enviado — o e-mail não saiu — o pedido foi alterado'),
    )
  })

  it('"Voltar" ⇒ zero escritas e zero gatilhos', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(registro.escritas).toEqual([])
    expect(registro.invocacoes).toEqual([])
  })

  it('a escrita que falha deixa o diálogo aberto com a frase, e nenhum gatilho sai', async () => {
    banco.falharEscrita = true
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    await waitFor(() =>
      expect(within(dialogo()).getByRole('alert')).toHaveTextContent('Não foi possível mudar o status.'),
    )
    expect(gatilhos()).toEqual([])
  })

  it('"já enviado" (linha `sent`) ⇒ sem diálogo, grava, e diz que não sai de novo', async () => {
    banco.notificacoes = [notificacao('order_shipped', 'sent')]
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Status: Enviado · “Pedido postado” já tinha sido enviado, não sai de novo'),
    )
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed' })
  })

  it('durante a gravação: o botão do diálogo no gerúndio e o "Cancelar pedido" desabilitado (CRG-01, CRG-02)', async () => {
    let soltar!: () => void
    banco.segurarEscrita = new Promise<void>((r) => { soltar = r })
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    expect(await within(dialogo()).findByRole('button', { name: /Marcando como enviado…/ })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Cancelar pedido', hidden: true })).toBeDisabled()

    await act(async () => soltar())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('gesto 2 — o "Outro status"', () => {
  it('previsto ⇒ diálogo; "Voltar" ⇒ zero escritas e o seletor volta ao vazio (AVS-05)', async () => {
    ligar('order_delivered')
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Entregue' }))

    expect(within(dialogo()).getByText('Pedido entregue')).toBeInTheDocument()
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Voltar' }))

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Outro status' })).toHaveTextContent('Outro status'),
    )
    expect(registro.escritas).toEqual([])
  })

  it('desmarcado ⇒ `customer: false`', async () => {
    ligar('order_delivered')
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Entregue' }))
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Entregue' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(escritasEm('orders')[0].values).toEqual({ status: 'delivered' })
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed', customer: false })
  })

  it('sem e-mail previsto (voltar para Pago) ⇒ grava direto, sem diálogo, e diz que nenhum aviso sai (AVS-06)', async () => {
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Pago' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Status: Pago · nenhum aviso sai nesta mudança'))
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed' })
  })
})

// Verifier r1, gap 2 (CRG-09): o RESULTADO do gesto chega à região viva, pela página real. O mutante
// que apaga `anunciar(frase)` de `concluir` (`useGestoComAviso`) deixava a suíte verde: o toast é
// dublado, e nenhum caso lia a região.
const regiaoVivaDiz = (frase: string) =>
  Array.from(document.querySelectorAll('[aria-live="polite"]')).some((el) => el.textContent === frase)

describe('o resultado do gesto é anunciado UMA vez, pelo aviso (CRG-09; conserto do QA)', () => {
  it('com o diálogo (caixa marcada) ⇒ a frase do desfecho na região `aria-live="polite"`', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))

    const frase = 'Status: Enviado — a cliente foi avisada por e-mail'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('sem diálogo (nenhum aviso previsto) ⇒ a frase na região viva também', async () => {
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Pago' }))

    const frase = 'Status: Pago · nenhum aviso sai nesta mudança'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })
})

describe('gesto 3 — Salvar rastreio', () => {
  it('pedido já Enviado ⇒ diálogo; desmarcado ⇒ grava o código e `customer: false`', async () => {
    await montar({ status: 'shipped', tracking_code: null })
    fireEvent.change(screen.getByLabelText('Código de rastreio da joia'), { target: { value: 'BR77' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar rastreio' }))

    expect(registro.escritas).toEqual([])
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Salvar rastreio' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(escritasEm('orders')[0].values).toMatchObject({ tracking_code: 'BR77' })
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed', customer: false })
  })
})

describe('gestos 4, 5 e 6 — o material', () => {
  it('4: "Marcar material como recebido" ⇒ diálogo; marcado ⇒ RPC e o corpo de hoje', async () => {
    await montar({ status: 'paid', material_status: 'aguardando_material', tracking_code: null })
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    expect(registro.rpcs).toEqual([])
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(registro.rpcs).toEqual([{ fn: 'set_material_status', args: { p_order_id: 'o1', p_status: 'material_recebido' } }])
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'material_status_changed' })
  })

  it('5: "Colocar em produção" com o e-mail ligado ⇒ desmarcado leva `customer: false`', async () => {
    ligar('in_production')
    await montar({ status: 'paid', material_status: 'material_recebido', tracking_code: null })
    fireEvent.click(screen.getByRole('button', { name: /colocar em produção/i }))
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Colocar em produção' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'material_status_changed', customer: false })
  })

  it('6: o código do envelope com o e-mail ligado ⇒ diálogo com a nota da dona; desmarcado ⇒ `customer: false`', async () => {
    ligar('material_tracking_registered')
    await montar({ status: 'paid', material_status: 'aguardando_material', tracking_code: null })
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), { target: { value: 'aa1br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(within(dialogo()).getByText(/O aviso “Material a caminho”, para você, não depende desta caixa/)).toBeInTheDocument()
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Salvar código' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(registro.rpcs[0]).toEqual({ fn: 'set_material_tracking', args: { p_order_id: 'o1', p_code: 'AA1BR' } })
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'material_tracking_set', customer: false })
  })

  // Verifier r1, gap 1 (AVS-07): o gesto 6 descartava o `emailSent` do dono e dizia "não saiu" com o
  // e-mail entregue. E o `sent` do motor conta também o aviso à DONA (`owner_material_incoming`): a
  // frase só afirma a cliente avisada por `customer_sent`.
  const salvarEnvelopeMarcado = async () => {
    ligar('material_tracking_registered')
    await montar({ status: 'paid', material_status: 'aguardando_material', tracking_code: null })
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), { target: { value: 'aa1br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Salvar código' }))
    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'material_tracking_set' })
  }

  it('6: caixa marcada + o e-mail da cliente saiu (`customer_sent: true`) ⇒ "a cliente foi avisada por e-mail"', async () => {
    banco.respostaTrigger = { data: { sent: true, customer_sent: true }, error: null }
    await salvarEnvelopeMarcado()

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('a cliente foi avisada por e-mail')),
    )
  })

  it('6: caixa marcada + só o aviso à DONA saiu (`sent: true`, `customer_sent: false`) ⇒ NÃO diz que a cliente foi avisada', async () => {
    banco.respostaTrigger = { data: { sent: true, customer_sent: false }, error: null }
    await salvarEnvelopeMarcado()

    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    const frases = toastSuccess.mock.calls.map((c) => String(c[0]))
    expect(frases.some((f) => f.includes('a cliente foi avisada'))).toBe(false)
    expect(frases.some((f) => f.includes('o e-mail não saiu'))).toBe(true)
  })
})

describe('gesto 7 — Cancelar pedido', () => {
  it('com "Pedido cancelado" ligado: a caixa no diálogo; desmarcada ⇒ grava e leva `customer: false`', async () => {
    ligar('order_cancelled')
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(within(dialogo()).getByRole('checkbox')).toBeChecked()
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(escritasEm('orders')[0].values).toEqual({ status: 'cancelled', cancel_reason: 'Desistiu' })
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed', customer: false })
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Pedido cancelado · sem e-mail à cliente (anotado no histórico)'),
    )
  })

  // T23 (`AVS-07`): com a caixa MARCADA, o desfecho real — antes a tela mandava conferir no histórico.
  const cancelarMarcado = async () => {
    ligar('order_cancelled')
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(within(dialogo()).getByRole('checkbox')).toBeChecked()
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(gatilhos()[0].body).toEqual({ order_id: 'o1', trigger: 'order_status_changed' })
  }

  it('marcada + o motor enviou ⇒ "a cliente foi avisada por e-mail"', async () => {
    banco.respostaTrigger = { data: { sent: true }, error: null }
    await cancelarMarcado()
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Pedido cancelado — a cliente foi avisada por e-mail'))
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringMatching(/confira no histórico/))
  })

  it('marcada + o e-mail não saiu ⇒ diz isso, e que o pedido foi cancelado', async () => {
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await cancelarMarcado()
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('O e-mail não saiu — o pedido foi cancelado'))
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringMatching(/avisada/))
  })

  it('desmarcada + o motor respondeu `sent: true` (o aviso à dona) ⇒ a frase vem da CAIXA', async () => {
    banco.respostaTrigger = { data: { sent: true }, error: null }
    ligar('order_cancelled')
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Pedido cancelado · sem e-mail à cliente (anotado no histórico)'),
    )
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringMatching(/avisada/))
  })

  it('desligado (o padrão) ⇒ a linha "desligado em Configurações → Notificações", sem caixa', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    expect(within(dialogo()).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(dialogo()).getByText(/“Pedido cancelado” está desligado em Configurações → Notificações/)).toBeInTheDocument()
  })

  it('a falha deixa o diálogo aberto com o motivo digitado', async () => {
    banco.falharEscrita = true
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(within(dialogo()).getByRole('alert')).toHaveTextContent('O pedido não foi cancelado.'))
    expect(within(dialogo()).getByLabelText('Motivo do cancelamento')).toHaveValue('Desistiu')
    expect(gatilhos()).toEqual([])
  })
})

describe('o carregamento (CRG-03, CRG-04, CRG-06)', () => {
  it('primeira carga ⇒ o esqueleto do pedido, sem "Carregando..."', async () => {
    let soltar!: () => void
    banco.segurarLeitura = new Promise<void>((r) => { soltar = r })
    banco.order = { ...PEDIDO }
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
          <Routes>
            <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(screen.getByTestId('order-page-skeleton')).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    banco.segurarLeitura = null
    await act(async () => soltar())
    await screen.findByText('Pedido #1042')
  })

  it('depois de gravar: relê SEM esqueleto e a transportadora digitada continua no campo', async () => {
    // Sem rastreio, "Enviado" não prevê e-mail (o par `TRG-12` não fecha) e grava direto.
    await montar({ tracking_code: null, shipping_carrier: null })
    fireEvent.change(screen.getByLabelText('Transportadora'), { target: { value: 'Jadlog' } })
    const leituras = registro.leiturasDoPedido
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))

    await waitFor(() => expect(registro.leiturasDoPedido).toBeGreaterThan(leituras))
    await waitFor(() => expect(screen.getByText('Enviado', { selector: 'span' })).toBeInTheDocument())
    expect(screen.queryByTestId('order-page-skeleton')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Transportadora')).toHaveValue('Jadlog')
  })

  it('a releitura que falha mantém o pedido e mostra a faixa com "Tentar de novo"', async () => {
    await montar({ tracking_code: null })
    banco.falharLeitura = true
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))

    const faixa = await screen.findByText('Não consegui atualizar o pedido. O que está na tela pode estar desatualizado.')
    expect(screen.getByText('Pedido #1042')).toBeInTheDocument()

    banco.falharLeitura = false
    fireEvent.click(within(faixa.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() =>
      expect(screen.queryByText('Não consegui atualizar o pedido. O que está na tela pode estar desatualizado.')).not.toBeInTheDocument(),
    )
  })
})

describe('o avião do histórico (AVS-13, A-13)', () => {
  const AVIAO = 'Enviar agora o e-mail “Pedido postado” para a cliente'

  const abrir = async () => {
    banco.notificacoes = [notificacao('order_shipped', 'skipped')]
    await montar({ status: 'shipped' })
    fireEvent.click(screen.getByRole('button', { name: AVIAO }))
  }

  it('chama `action=send` com o evento e o canal da linha; enviado ⇒ a frase de sucesso', async () => {
    await abrir()
    await waitFor(() =>
      expect(registro.invocacoes).toEqual([
        { porta: 'send-notification?action=send', body: { order_id: 'o1', event: 'order_shipped', channel: 'email' } },
      ]),
    )
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('E-mail “Pedido postado” enviado'))
  })

  it('o evento desligado ⇒ "desligado em Configurações → Notificações"', async () => {
    banco.respostaSend = { data: { sent: false, skipped: 'disabled' }, error: null }
    await abrir()
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Este e-mail está desligado em Configurações → Notificações.'),
    )
  })

  it('a pré-condição que deixou de valer (422) ⇒ "não está mais no estado deste e-mail"', async () => {
    banco.respostaSend = { data: null, error: { context: { status: 422 } } }
    await abrir()
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('O pedido não está mais no estado deste e-mail.'))
  })

  it('a falha do envio ⇒ "não saiu"', async () => {
    banco.respostaSend = { data: { sent: false, reason: 'provider' }, error: null }
    await abrir()
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('O e-mail “Pedido postado” não saiu. Tente de novo.'))
  })
})

// Verifier r2 (CRG-09): os outros pontos em que um gesto anuncia o próprio resultado — o cancelamento
// (que não passa por `concluir`), o avião, o "Reenviar" e a falha do gesto sem diálogo. Os mutantes que
// apagavam cada `anunciar` (N13, N22, N23, N11) deixavam a suíte verde: o toast é dublado, e nenhum caso
// lia a região.
describe('o cancelamento, o avião, o "Reenviar" e a falha sem diálogo: um anúncio, pelo aviso (CRG-09; conserto do QA)', () => {
  it('cancelamento com sucesso ⇒ a frase do resultado na região viva', async () => {
    banco.respostaTrigger = { data: { sent: true }, error: null }
    ligar('order_cancelled')
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))

    const frase = 'Pedido cancelado — a cliente foi avisada por e-mail'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  const AVIAO = 'Enviar agora o e-mail “Pedido postado” para a cliente'

  it('avião enviado ⇒ o desfecho de sucesso na região viva', async () => {
    banco.notificacoes = [notificacao('order_shipped', 'skipped')]
    await montar({ status: 'shipped' })
    fireEvent.click(screen.getByRole('button', { name: AVIAO }))

    const frase = 'E-mail “Pedido postado” enviado'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('avião que falha ⇒ o desfecho de falha na região viva', async () => {
    banco.respostaSend = { data: { sent: false, reason: 'provider' }, error: null }
    banco.notificacoes = [notificacao('order_shipped', 'skipped')]
    await montar({ status: 'shipped' })
    fireEvent.click(screen.getByRole('button', { name: AVIAO }))

    const frase = 'O e-mail “Pedido postado” não saiu. Tente de novo.'
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('"Reenviar" que sai ⇒ "E-mail reenviado" na região viva', async () => {
    banco.notificacoes = [notificacao('order_shipped', 'failed')]
    await montar({ status: 'shipped' })
    fireEvent.click(screen.getByRole('button', { name: /Reenviar/ }))

    await waitFor(() =>
      expect(registro.invocacoes).toEqual([
        { porta: 'send-notification?action=send', body: { order_id: 'o1', event: 'order_shipped', channel: 'email' } },
      ]),
    )
    const frase = 'E-mail reenviado'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('"Reenviar" que não sai ⇒ a frase de falha na região viva', async () => {
    banco.respostaSend = { data: { sent: false }, error: null }
    banco.notificacoes = [notificacao('order_shipped', 'failed')]
    await montar({ status: 'shipped' })
    fireEvent.click(screen.getByRole('button', { name: /Reenviar/ }))

    const frase = 'O reenvio não saiu. O estado do pedido não mudou.'
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('gesto sem diálogo que falha (voltar para Pago) ⇒ a frase de falha na região viva', async () => {
    banco.falharEscrita = true
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Pago' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const frase = 'Não foi possível mudar o status. Nada foi alterado — tente de novo.'
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio por desfecho — o aviso flutuante (região viva do sonner) o diz; a região
    // do gesto não o repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
    expect(gatilhos()).toEqual([])
  })
})

// Verifier r3 — fecho das lacunas sem rodada 4.
describe('lacunas da rodada 3 do Verifier (CRG-09 na nota, AVS-08 sem e-mail)', () => {
  // V20: a nota interna não tem toast de sucesso; "Nota salva" na região viva é o ÚNICO sinal.
  it('nota interna salva ⇒ "Nota salva" na região `aria-live="polite"` (CRG-09)', async () => {
    await montar()
    fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: 'Cliente ligou' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }))

    await waitFor(() => expect(escritasEm('order_notes')).toHaveLength(1))
    expect(escritasEm('order_notes')[0].values).toEqual({ order_id: 'o1', note: 'Cliente ligou' })
    await waitFor(() => expect(regiaoVivaDiz('Nota salva')).toBe(true))
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  // V04: com "Pedido cancelado" LIGADO e o pedido sem e-mail, o motivo é a falta do e-mail — nunca
  // "desligado em Configurações", que seria um motivo falso.
  it('cancelamento de pedido sem e-mail da cliente ⇒ a frase própria, sem caixa e sem "desligado" (AVS-08)', async () => {
    ligar('order_cancelled')
    await montar({ customer_email: null })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))

    expect(within(dialogo()).queryByRole('checkbox')).not.toBeInTheDocument()
    expect(within(dialogo()).getByText('Este pedido não tem e-mail da cliente: nenhum aviso sai.')).toBeInTheDocument()
    expect(within(dialogo()).queryByText(/desligado em Configurações/)).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------------------------------
// Conserto do QA (2026-10-30, `docs/qa/reports/2026-10-30-backoffice-aviso-opcional-nos-pedidos.md`).
// Cada caso reprovou antes do conserto.
// ---------------------------------------------------------------------------------------------------

const FALHA_DOS_ENVIOS = 'Não consegui conferir os e-mails já enviados. Nada foi alterado.'
const HISTORICO_SEM_EMAILS = 'Não consegui ler os e-mails deste pedido.'

describe('conserto do QA — a leitura dos envios falha (A-14, BUG leitura-de-envios-falha-em-silencio)', () => {
  it('o Histórico diz que não leu os e-mails, com "Tentar de novo" — nunca "Nada por aqui ainda."', async () => {
    banco.falharEnvios = true
    await montar()
    const aviso = await screen.findByText(HISTORICO_SEM_EMAILS)
    expect(screen.queryByText('Nada por aqui ainda.')).not.toBeInTheDocument()

    banco.falharEnvios = false
    banco.notificacoes = [notificacao('order_shipped', 'sent')]
    fireEvent.click(within(aviso.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' }))
    await waitFor(() => expect(screen.queryByText(HISTORICO_SEM_EMAILS)).not.toBeInTheDocument())
    expect(screen.getByText(/\(E-mail\)$/)).toBeInTheDocument()
  })

  it('um gesto que dependeria da previsão é RECUSADO: sem diálogo, sem escrita, a frase do lote', async () => {
    banco.falharEnvios = true
    banco.notificacoes = [notificacao('order_shipped', 'sent')]
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(FALHA_DOS_ENVIOS))
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(registro.escritas).toEqual([])
    expect(gatilhos()).toEqual([])
  })

  it('o cancelamento com "Pedido cancelado" ligado também é recusado, dentro do diálogo', async () => {
    ligar('order_cancelled')
    banco.falharEnvios = true
    await montar()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar pedido' }))
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))

    await waitFor(() => expect(within(dialogo()).getByRole('alert')).toHaveTextContent(FALHA_DOS_ENVIOS))
    expect(registro.escritas).toEqual([])
    expect(gatilhos()).toEqual([])
  })

  it('gestos que não mandam e-mail seguem: voltar para Pago grava, e a nota interna também', async () => {
    banco.falharEnvios = true
    await montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    fireEvent.click(screen.getByRole('option', { name: 'Pago' }))
    await waitFor(() => expect(escritasEm('orders')).toEqual([{ table: 'orders', values: { status: 'paid' } }]))
    expect(toastError).not.toHaveBeenCalledWith(FALHA_DOS_ENVIOS)

    fireEvent.change(screen.getByLabelText('Nova nota interna'), { target: { value: 'Ligou' } })
    fireEvent.click(screen.getByRole('button', { name: 'Anotar' }))
    await waitFor(() => expect(escritasEm('order_notes')).toHaveLength(1))
  })
})

describe('conserto do QA — o foco volta a um lugar (BUG foco-cai-no-body-nas-acoes-do-pedido)', () => {
  let soltarFoco: () => void = () => {}
  beforeEach(() => { soltarFoco = simularFocoDoNavegador() })
  afterEach(() => soltarFoco())

  const foco = () => document.activeElement as HTMLElement
  /** A escrita fica no ar até o botão desabilitar (é aí que o navegador tira o foco), e então sai. */
  const segurandoAEscrita = async (gesto: () => void, foraDoDialogo = true) => {
    let soltar!: () => void
    banco.segurarEscrita = new Promise<void>((r) => { soltar = r })
    gesto()
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).not.toBeNull())
    if (foraDoDialogo) await waitFor(() => expect(foco()).toBe(document.body))
    banco.segurarEscrita = null
    await act(async () => soltar())
  }

  it('"Outro status" → Voltar no diálogo ⇒ o foco volta ao seletor', async () => {
    ligar('order_delivered')
    await montar()
    const seletor = screen.getByRole('combobox', { name: 'Outro status' })
    fireEvent.pointerDown(seletor, RADIX_POINTER_DOWN)
    // No navegador, a opção sob o ponteiro tem o foco quando é escolhida (e ela some com a lista).
    const opcao = screen.getByRole('option', { name: 'Entregue' })
    opcao.focus()
    fireEvent.click(opcao)
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).toBe(screen.getByRole('combobox', { name: 'Outro status' })))
  })

  it('"Enviado" gravado sem diálogo ⇒ o foco fica no bloco do próximo passo, nunca no <body>', async () => {
    await montar({ tracking_code: null })
    const botao = screen.getByRole('button', { name: /^Enviado/ })
    botao.focus()
    await segurandoAEscrita(() => fireEvent.click(botao))
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    await waitFor(() => expect(foco()).not.toBe(document.body))
    expect(foco().closest('section')).toBe(screen.getByRole('combobox', { name: 'Outro status' }).closest('section'))
  })

  it('"Mudar para Enviado" confirmado no diálogo ⇒ o foco não cai no <body>', async () => {
    await montar()
    const botao = screen.getByRole('button', { name: /^Enviado/ })
    botao.focus()
    fireEvent.click(botao)
    await segurandoAEscrita(() => fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' })), false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).not.toBe(document.body))
    expect(foco().closest('section')).not.toBeNull()
  })

  const AVIAO = 'Enviar agora o e-mail “Pedido postado” para a cliente'

  it('avião que falha ⇒ o foco volta ao avião', async () => {
    banco.respostaSend = { data: { sent: false, reason: 'provider' }, error: null }
    banco.notificacoes = [notificacao('order_shipped', 'skipped')]
    await montar({ status: 'shipped' })
    const aviao = screen.getByRole('button', { name: AVIAO })
    aviao.focus()
    await segurandoAEscrita(() => fireEvent.click(aviao))
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    await waitFor(() => expect(foco()).toBe(screen.getByRole('button', { name: AVIAO })))
  })

  it('avião que envia (a linha vira "enviado" e o avião some) ⇒ o foco vai à linha do histórico', async () => {
    banco.enviarMudaALinha = true
    banco.notificacoes = [notificacao('order_shipped', 'skipped')]
    await montar({ status: 'shipped' })
    const aviao = screen.getByRole('button', { name: AVIAO })
    aviao.focus()
    fireEvent.click(aviao)
    await waitFor(() => expect(screen.queryByRole('button', { name: AVIAO })).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).not.toBe(document.body))
    expect(foco().closest('section')?.querySelector('h2')?.textContent).toBe('Histórico')
  })

  it('cancelamento confirmado ⇒ o foco não cai no <body>', async () => {
    await montar()
    const botao = screen.getByRole('button', { name: 'Cancelar pedido' })
    botao.focus()
    fireEvent.click(botao)
    fireEvent.change(within(dialogo()).getByLabelText('Motivo do cancelamento'), { target: { value: 'Desistiu' } })
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Confirmar cancelamento' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).not.toBe(document.body))
  })

  it('"Tentar de novo" da releitura que volta ⇒ a faixa some e o foco vai ao título do pedido', async () => {
    await montar({ tracking_code: null })
    banco.falharLeitura = true
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    const faixa = await screen.findByText('Não consegui atualizar o pedido. O que está na tela pode estar desatualizado.')
    banco.falharLeitura = false
    const tentar = within(faixa.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' })
    tentar.focus()
    fireEvent.click(tentar)
    await waitFor(() => expect(screen.queryByText(/Não consegui atualizar o pedido/)).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).toBe(screen.getByRole('heading', { level: 1, name: 'Pedido #1042' })))
  })

  // Conserto do reteste (`BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`): o aviso some com o
  // botão quando a releitura dá certo, e o foco caía no <body>.
  it('"Tentar de novo" do Histórico que lê ⇒ o aviso some e o foco vai ao título "Histórico"', async () => {
    banco.falharEnvios = true
    await montar()
    const aviso = await screen.findByText(HISTORICO_SEM_EMAILS)
    banco.falharEnvios = false
    const tentar = within(aviso.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' })
    tentar.focus()
    fireEvent.click(tentar)
    await waitFor(() => expect(screen.queryByText(HISTORICO_SEM_EMAILS)).not.toBeInTheDocument())
    await waitFor(() => expect(foco()).toBe(screen.getByRole('heading', { level: 2, name: 'Histórico' })))
  })

  it('"Tentar de novo" do Histórico que falha de novo ⇒ o foco fica no próprio botão', async () => {
    banco.falharEnvios = true
    await montar()
    const aviso = await screen.findByText(HISTORICO_SEM_EMAILS)
    const tentar = within(aviso.closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' })
    tentar.focus()
    fireEvent.click(tentar)
    await act(async () => { await new Promise((r) => setTimeout(r, 50)) })
    expect(screen.getByText(HISTORICO_SEM_EMAILS)).toBeInTheDocument()
    await waitFor(() => expect(foco()).toBe(
      within(screen.getByText(HISTORICO_SEM_EMAILS).closest('[role="alert"]') as HTMLElement).getByRole('button', { name: 'Tentar de novo' }),
    ))
  })
})

describe('conserto do QA — a falha do avião fica legível (A-15, BUG aviao-que-falha-apaga-a-escolha)', () => {
  it('a linha de falha diz "A tentativa de envio falhou" com "Reenviar"; o erro cru fica no detalhe técnico recolhido', async () => {
    const CRU = 'error sending request for url (https://api.resend.com/emails)'
    banco.notificacoes = [{ ...notificacao('order_shipped', 'failed'), error: CRU }]
    await montar({ status: 'shipped' })
    const linha = screen.getByText(/Falha ao enviar o aviso: Pedido postado/).closest('li') as HTMLElement
    expect(within(linha).getByText('A tentativa de envio falhou')).toBeInTheDocument()
    expect(within(linha).getByRole('button', { name: /Reenviar/ })).toBeInTheDocument()
    const cru = within(linha).getByText(CRU)
    expect(cru.closest('details')).not.toBeNull()
    expect(cru.closest('details')).not.toHaveAttribute('open')
  })
})

describe('conserto do QA — UM anúncio por desfecho (paper cut da região viva)', () => {
  it('o resultado com aviso flutuante não é repetido na região do gesto', async () => {
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))
    const frase = 'Status: Enviado — a cliente foi avisada por e-mail'
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith(frase))
    expect(toastSuccess).toHaveBeenCalledTimes(1)
    expect(regiaoVivaDiz(frase)).toBe(false)
  })

  it('a falha dentro do diálogo é anunciada pelo alerta dele, não também pela região', async () => {
    banco.falharEscrita = true
    await montar()
    fireEvent.click(screen.getByRole('button', { name: /^Enviado/ }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Mudar para Enviado' }))
    await waitFor(() => expect(within(dialogo()).getByRole('alert')).toHaveTextContent('Não foi possível mudar o status.'))
    expect(regiaoVivaDiz('Não foi possível mudar o status. Nada foi alterado — tente de novo.')).toBe(false)
  })
})
