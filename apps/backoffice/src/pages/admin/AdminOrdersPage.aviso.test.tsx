// Feature `88` · T21 — a lista de pedidos, REAL, com o aviso opcional no lote e no cartão do celular, o
// progresso do lote e o carregamento honesto (`AVS-19`..`AVS-21`, `CRG-10`..`CRG-13`).
//
// Molde de `AdminOrderPage.aviso.test.tsx`: nada é dublado no caminho além do client do Supabase.
// `useAdminOrderList` lê a lista, `useAdminOrders` grava pelo dono de verdade
// (`@estrelinha/core/order-actions`), `notifyOrder` monta o corpo, `fetchSentEmails` lê os envios, e as
// configurações vêm de `useStoreSettings`. O dublê REGISTRA cada leitura de `order_notifications`, cada
// RPC, cada escrita e cada corpo de `functions.invoke` — a prova é o corpo, por valor.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { simularFocoDoNavegador } from '@/test/focoDoNavegador'
import { DEFAULT_NOTIFICATIONS, type NotificationEvent } from '@estrelinha/core/notifications'

const { banco, registro, falso, toastSuccess, toastError } = vi.hoisted(() => {
  const banco = {
    rows: [] as Record<string, unknown>[],
    notificacoes: [] as Record<string, unknown>[],
    settings: [] as { key: string; value: unknown }[],
    falharNotificacoes: false,
    falharRpc: false,
    /** Segura cada escrita (para ver o progresso e o gerúndio no meio). */
    segurarEscrita: null as Promise<void> | null,
    /** Cada `update` de `orders` espera a sua trava em `travas` (para ver o progresso pedido a pedido). */
    travarUpdates: false,
    travas: [] as Array<() => void>,
    /** Segura as leituras da lista DEPOIS da primeira (a releitura `'revalidar'`). */
    segurarReleitura: null as Promise<void> | null,
    /** Segura a primeira leitura da lista (o esqueleto). */
    segurarPrimeira: null as Promise<void> | null,
    /** Conserto do QA: segura as contagens (abas e cartões da fila) da primeira carga. */
    segurarContagens: null as Promise<void> | null,
    /** Conserto do QA: o pedido sai da lista depois da RPC (deixou a fila) — o cartão some. */
    sairDaListaDepoisDaRpc: false,
    respostaTrigger: { data: { sent: true }, error: null } as { data: unknown; error: unknown },
  }
  const registro = {
    escritas: [] as Array<{ table: string; values: unknown; filters: unknown[] }>,
    rpcs: [] as Array<{ fn: string; args: Record<string, unknown> }>,
    invocacoes: [] as Array<{ porta: string; body: Record<string, unknown> }>,
    leiturasDeEnvios: [] as Array<{ select: unknown[]; filters: { method: string; args: unknown[] }[] }>,
    leiturasDaLista: 0,
  }

  type Rec = { table: string; select?: unknown[]; filters: { method: string; args: unknown[] }[]; update?: unknown; insert?: unknown }

  const responder = async (r: Rec): Promise<{ data?: unknown; error?: unknown; count?: number }> => {
    if (r.update !== undefined || r.insert !== undefined) {
      if (banco.segurarEscrita) await banco.segurarEscrita
      if (banco.travarUpdates && r.update !== undefined) await new Promise<void>((ok) => banco.travas.push(ok))
      registro.escritas.push({ table: r.table, values: r.update ?? r.insert, filters: r.filters })
      const id = r.filters.find((f) => f.method === 'eq' && f.args[0] === 'id')?.args[1]
      if (r.table === 'orders' && r.update) {
        const linha = banco.rows.find((x) => x.id === id)
        if (linha) Object.assign(linha, r.update as object)
      }
      return { data: [{ id }], error: null }
    }
    switch (r.table) {
      case 'order_list': {
        registro.leiturasDaLista++
        if (registro.leiturasDaLista === 1 && banco.segurarPrimeira) await banco.segurarPrimeira
        if (registro.leiturasDaLista > 1 && banco.segurarReleitura) await banco.segurarReleitura
        return { data: banco.rows.map((x) => ({ ...x })), error: null, count: banco.rows.length }
      }
      case 'orders':
        if (banco.segurarContagens) await banco.segurarContagens
        return { data: [], error: null, count: 0 }
      case 'order_notifications': {
        registro.leiturasDeEnvios.push({ select: r.select ?? [], filters: r.filters })
        if (banco.falharNotificacoes) return { data: null, error: { message: 'boom' } }
        const ids = (r.filters.find((f) => f.method === 'in')?.args[1] ?? []) as string[]
        return { data: banco.notificacoes.filter((n) => ids.includes(n.order_id as string)), error: null }
      }
      case 'store_settings':
        return { data: banco.settings, error: null }
      default:
        return { data: [], error: null }
    }
  }

  const from = (table: string) => {
    const rec: Rec = { table, filters: [] }
    const b: Record<string, unknown> = new Proxy({} as Record<string, unknown>, {
      get(_alvo, prop: string) {
        if (prop === 'then') return (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => responder(rec).then(ok, ko)
        if (prop === 'select') return (...args: unknown[]) => { rec.select = args; return b }
        if (prop === 'update') return (v: unknown) => { rec.update = v; return b }
        if (prop === 'insert') return (v: unknown) => { rec.insert = v; return b }
        if (prop === 'maybeSingle' || prop === 'single') return () => responder(rec)
        return (...args: unknown[]) => { rec.filters.push({ method: prop, args }); return b }
      },
    })
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
        if (banco.falharRpc) return { data: null, error: { message: 'boom' } }
        const linha = banco.rows.find((x) => x.id === args.p_order_id)
        if (linha) linha.material_status = args.p_status
        if (banco.sairDaListaDepoisDaRpc) banco.rows = banco.rows.filter((x) => x.id !== args.p_order_id)
        return { data: { ok: true, status: args.p_status }, error: null }
      }
      return { data: null, error: null }
    },
    functions: {
      invoke: async (porta: string, { body }: { body: Record<string, unknown> }) => {
        registro.invocacoes.push({ porta, body })
        return banco.respostaTrigger
      },
    },
  }
  return { banco, registro, falso, toastSuccess: vi.fn(), toastError: vi.fn() }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: falso }))
vi.mock('@estrelinha/supabase', () => ({ supabase: falso }))
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError, info: vi.fn(), message: vi.fn() } }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))

import AdminOrdersPage from './AdminOrdersPage'

let seq = 0
const pedido = (over: Record<string, unknown> = {}) => {
  seq++
  return {
    id: `o${seq}`, order_number: `10${40 + seq}`, customer_id: null, customer_name: `Cliente ${seq}`,
    customer_email: `c${seq}@example.com`, status: 'paid', payment_status: 'approved', payment_method: 'pix',
    total: 100, tracking_code: null, material_tracking_code: null, material_status: 'aguardando_material',
    material_received_at: null, created_at: '2026-10-20T12:00:00Z', notes: null, purchase_ordinal: 1,
    customer_phone: null, ...over,
  }
}

const enviada = (orderId: string, event: NotificationEvent) => ({
  order_id: orderId, event, channel: 'email', status: 'sent',
})

/** `store_settings.notifications` com estes eventos DESLIGADOS no e-mail. */
const desligar = (...eventos: NotificationEvent[]) => {
  const events = { ...DEFAULT_NOTIFICATIONS.events }
  for (const e of eventos) events[e] = { email: { ...events[e].email, enabled: false } }
  banco.settings = [{ key: 'notifications', value: { ...DEFAULT_NOTIFICATIONS, events } }]
}

let qc: QueryClient
const montar = async (url = '/admin/pedidos?visao=tudo') => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <AdminOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('table')
  await waitFor(() => expect(qc.getQueryState(['store_settings'])?.status).toBe('success'))
}

const selecionarTudo = () => fireEvent.click(screen.getByLabelText('Selecionar a página'))
const barra = () => screen.getByRole('toolbar', { name: 'Ações em massa' })
const gatilhos = () => registro.invocacoes.filter((i) => i.porta === 'send-notification?action=trigger')
const materiais = () => registro.rpcs.filter((r) => r.fn === 'set_material_status')
const statusEscritos = () => registro.escritas.filter((e) => e.table === 'orders')
/** Conserto do QA: o resumo do lote fica na tela, numa região `status`, até ser dispensado. */
const resumoDoLote = () => screen.getByRole('status', { name: 'Resumo do lote' })

beforeEach(() => {
  seq = 0
  banco.rows = []
  banco.notificacoes = []
  banco.settings = []
  banco.falharNotificacoes = false
  banco.falharRpc = false
  banco.segurarEscrita = null
  banco.travarUpdates = false
  banco.travas = []
  banco.segurarReleitura = null
  banco.segurarPrimeira = null
  banco.segurarContagens = null
  banco.sairDaListaDepoisDaRpc = false
  banco.respostaTrigger = { data: { sent: true }, error: null }
  registro.escritas.length = 0
  registro.rpcs.length = 0
  registro.invocacoes.length = 0
  registro.leiturasDeEnvios.length = 0
  registro.leiturasDaLista = 0
  toastSuccess.mockReset()
  toastError.mockReset()
})

describe('o lote de material pergunta UMA vez (AVS-19)', () => {
  it('com e-mail previsto: o diálogo conta as clientes e os e-mails, e nada é gravado antes', async () => {
    const [a, b, c] = [pedido(), pedido(), pedido({ material_status: 'em_producao' })]
    banco.rows = [a, b, c]
    await montar()
    expect(registro.leiturasDeEnvios).toHaveLength(0) // nada é lido sem o clique

    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))

    const dialogo = await screen.findByRole('dialog')
    // Conserto do QA: o título diz o mesmo número que o botão — os que MUDAM.
    expect(within(dialogo).getByText('Registrar o material de 2 pedidos')).toBeInTheDocument()
    expect(within(dialogo).getByText(/2 mudam · 1 fica como está/)).toBeInTheDocument()
    expect(within(dialogo).getByText('Avisar as 2 clientes por e-mail')).toBeInTheDocument()
    expect(within(dialogo).getByText('2 e-mails, um para cada cliente:')).toBeInTheDocument()
    const linhaDoEmail = within(dialogo).getByText('Material recebido no ateliê').closest('li') as HTMLElement
    expect(within(linhaDoEmail).getByText('2')).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Registrar 2 recebimentos' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('checkbox')).toBeChecked()

    expect(materiais()).toEqual([])
    expect(gatilhos()).toEqual([])

    // UMA consulta, dos selecionados, canal e-mail e status `sent`.
    expect(registro.leiturasDeEnvios).toHaveLength(1)
    const leitura = registro.leiturasDeEnvios[0]
    expect(leitura.filters).toEqual(
      expect.arrayContaining([
        { method: 'in', args: ['order_id', [a.id, b.id, c.id]] },
        { method: 'eq', args: ['channel', 'email'] },
        { method: 'eq', args: ['status', 'sent'] },
      ]),
    )
  })

  it('"já recebeu" conta quem recebeu antes, e esse pedido não entra na contagem de e-mails', async () => {
    const [a, b] = [pedido(), pedido()]
    banco.rows = [a, b]
    banco.notificacoes = [enviada(b.id, 'material_received')]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Avisar a cliente por e-mail')).toBeInTheDocument()
    expect(within(dialogo).getByText('1 e-mail:')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('1 pedido já recebeu “Material recebido no ateliê” antes e não recebe de novo.'),
    ).toBeInTheDocument()
  })

  it('desmarcada: cada escrita leva `customer: false`, e o resumo diz que ficou anotado', async () => {
    const [a, b] = [pedido(), pedido()]
    banco.rows = [a, b]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    const dialogo = await screen.findByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('checkbox'))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar 2 recebimentos' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(2))
    expect(materiais().map((r) => r.args)).toEqual([
      { p_order_id: a.id, p_status: 'material_recebido' },
      { p_order_id: b.id, p_status: 'material_recebido' },
    ])
    expect(gatilhos().map((g) => g.body)).toEqual([
      { order_id: a.id, trigger: 'material_status_changed', customer: false },
      { order_id: b.id, trigger: 'material_status_changed', customer: false },
    ])
    // O motor respondeu `sent: true` (o aviso à dona), e a frase vem da CAIXA.
    await waitFor(() =>
      expect(resumoDoLote()).toHaveTextContent('2 marcadas · sem e-mail às clientes — anotado no histórico de 2 pedidos'),
    )
  })

  it('marcada: o corpo de sempre, e o resumo soma os e-mails que saíram de fato', async () => {
    banco.rows = [pedido(), pedido()]
    banco.respostaTrigger = { data: { sent: true }, error: null }
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar 2 recebimentos' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(2))
    for (const g of gatilhos()) expect(g.body).not.toHaveProperty('customer')
    await waitFor(() => expect(resumoDoLote()).toHaveTextContent('2 marcadas · 2 e-mails enviados'))
  })

  // Verifier r1 (AVS-07, C3): o lote soma `emailSent`, que agora é "um e-mail À CLIENTE saiu". O motor
  // respondendo `sent: true` só pelo aviso à DONA não pode virar "2 e-mails enviados".
  it('marcada + o motor avisou só a DONA (`sent: true`, `customer_sent: false`) ⇒ o resumo NÃO conta e-mails enviados', async () => {
    banco.rows = [pedido(), pedido()]
    banco.respostaTrigger = { data: { sent: true, customer_sent: false }, error: null }
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar 2 recebimentos' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(2))
    await waitFor(() => expect(resumoDoLote()).toHaveTextContent('2 marcadas · nenhum e-mail saiu'))
  })

  it('marcada + o motor avisou a CLIENTE (`customer_sent: true`) ⇒ "2 e-mails enviados"', async () => {
    banco.rows = [pedido(), pedido()]
    banco.respostaTrigger = { data: { sent: true, customer_sent: true }, error: null }
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar 2 recebimentos' }))

    await waitFor(() => expect(resumoDoLote()).toHaveTextContent('2 marcadas · 2 e-mails enviados'))
  })

  it('"Voltar" ⇒ nenhuma escrita', async () => {
    banco.rows = [pedido()]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(materiais()).toEqual([])
    expect(gatilhos()).toEqual([])
  })

  it('a leitura dos envios falha ⇒ nada é gravado, e a tela diz isso', async () => {
    banco.rows = [pedido()]
    banco.falharNotificacoes = true
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Não consegui conferir os e-mails já enviados. Nada foi alterado.'),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(materiais()).toEqual([])
  })
})

describe('o lote "Avançar status" (AVS-19, AVS-20)', () => {
  it('sem e-mail previsto ⇒ grava direto, sem diálogo, com o corpo de sempre (AVS-20)', async () => {
    banco.respostaTrigger = { data: { sent: false }, error: null }
    const [a, b] = [pedido({ status: 'paid' }), pedido({ status: 'paid' })]
    banco.rows = [a, b]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Avançar status/ }))

    await waitFor(() => expect(gatilhos()).toHaveLength(2))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(statusEscritos().map((e) => e.values)).toEqual([{ status: 'separating' }, { status: 'separating' }])
    for (const g of gatilhos()) expect(g.body).toEqual({ order_id: expect.any(String), trigger: 'order_status_changed' })
    await waitFor(() =>
      expect(resumoDoLote()).toHaveTextContent('2 avançaram · nenhum aviso sai nestas mudanças'),
    )
  })

  it('com "Pedido postado" previsto: o diálogo, o fim de linha que fica, e a escolha em cada escrita', async () => {
    const [a, b] = [pedido({ status: 'separating', tracking_code: 'BR1' }), pedido({ status: 'delivered' })]
    banco.rows = [a, b]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Avançar status/ }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByRole('heading', { name: 'Avançar 1 pedido' })).toBeInTheDocument()
    expect(within(dialogo).getByText(/1 muda · 1 fica como está \(já no fim do caminho\)/)).toBeInTheDocument()
    expect(within(dialogo).getByText('Pedido postado')).toBeInTheDocument()
    fireEvent.click(within(dialogo).getByRole('checkbox'))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Avançar 1 pedido' }))

    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(statusEscritos().map((e) => e.values)).toEqual([{ status: 'shipped' }])
    expect(gatilhos()[0].body).toEqual({ order_id: a.id, trigger: 'order_status_changed', customer: false })
    await waitFor(() =>
      expect(resumoDoLote()).toHaveTextContent(
        '1 avançou · 1 ficou como estava (já no fim do caminho) · sem e-mail às clientes — anotado no histórico de 1 pedido',
      ),
    )
  })

  it('evento desligado em Configurações ⇒ sem diálogo', async () => {
    desligar('order_shipped')
    banco.rows = [pedido({ status: 'separating', tracking_code: 'BR1' })]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Avançar status/ }))
    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('o lote mostra progresso, e a lista fica na tela (CRG-10, CRG-12)', () => {
  it('"Avançando 1 de 2…" com a barra, ações e seleção desabilitadas; depois, a tabela continua', async () => {
    banco.rows = [pedido({ status: 'paid' }), pedido({ status: 'paid' })]
    await montar()
    selecionarTudo()

    let soltar!: () => void
    banco.segurarEscrita = new Promise<void>((r) => { soltar = r })
    let soltarReleitura!: () => void
    banco.segurarReleitura = new Promise<void>((r) => { soltarReleitura = r })

    fireEvent.click(within(barra()).getByRole('button', { name: /Avançar status/ }))

    const progresso = await screen.findByRole('progressbar')
    expect(progresso).toHaveAttribute('aria-valuemax', '2')
    expect(progresso).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByText('Avançando 0 de 2…')).toBeInTheDocument()
    expect(within(barra()).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Selecionar a página')).toBeDisabled()
    expect(screen.getAllByRole('button', { name: /^Recebi o material/ })[0]).toBeDisabled()

    await act(async () => { soltar() })
    await waitFor(() => expect(gatilhos()).toHaveLength(2))

    // A releitura é `'revalidar'`: a tabela fica, e o cabeçalho diz "Atualizando…" (`CRG-12`).
    await waitFor(() => expect(screen.getByText('Atualizando…')).toBeInTheDocument())
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.queryByTestId('orders-skeleton')).not.toBeInTheDocument()
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()

    await act(async () => { soltarReleitura() })
    await waitFor(() => expect(screen.queryByText('Atualizando…')).not.toBeInTheDocument())
  })

  it('o progresso anda pedido a pedido', async () => {
    banco.rows = [pedido({ status: 'paid' }), pedido({ status: 'paid' })]
    await montar()
    selecionarTudo()

    banco.travarUpdates = true

    fireEvent.click(within(barra()).getByRole('button', { name: /Avançar status/ }))
    await waitFor(() => expect(banco.travas).toHaveLength(1))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    await act(async () => { banco.travas[0]() })
    await waitFor(() => expect(banco.travas).toHaveLength(2))
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('Avançando 1 de 2…')).toBeInTheDocument()
    await act(async () => { banco.travas[1]() })
    await waitFor(() => expect(screen.queryByRole('progressbar')).not.toBeInTheDocument())
  })
})

describe('o cartão do celular — "Recebi o material" (AVS-21)', () => {
  const botaoDoCartao = (nome: string) => {
    const cartao = screen.getAllByRole('link', { name: nome }).map((l) => l.closest('li')).find(Boolean) as HTMLElement
    return within(cartao).getByRole('button', { name: /Recebi o material|Registrando…/ })
  }

  it('previsto ⇒ lê os envios DAQUELE pedido, pergunta, e a escolha chega à escrita', async () => {
    const [a] = [pedido(), pedido()]
    banco.rows = [a, pedido()]
    await montar()
    fireEvent.click(botaoDoCartao('Cliente 1'))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Registrar o material como recebido')).toBeInTheDocument()
    expect(within(dialogo).getByText(`Para ${a.customer_email}:`)).toBeInTheDocument()
    expect(registro.leiturasDeEnvios).toHaveLength(1)
    expect(registro.leiturasDeEnvios[0].filters).toEqual(
      expect.arrayContaining([{ method: 'in', args: ['order_id', [a.id]] }]),
    )
    expect(materiais()).toEqual([])

    fireEvent.click(within(dialogo).getByRole('checkbox'))
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar recebimento' }))
    await waitFor(() => expect(gatilhos()).toHaveLength(1))
    expect(materiais()[0].args).toEqual({ p_order_id: a.id, p_status: 'material_recebido' })
    expect(gatilhos()[0].body).toEqual({ order_id: a.id, trigger: 'material_status_changed', customer: false })
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('#1041 · material recebido · sem e-mail à cliente (anotado no histórico)'),
    )
  })

  it('o estado aparece SÓ no cartão tocado; os outros ficam desabilitados sem indicador', async () => {
    desligar('material_received')
    banco.respostaTrigger = { data: { sent: false }, error: null }
    banco.rows = [pedido(), pedido()]
    await montar()
    let soltar!: () => void
    banco.segurarEscrita = new Promise<void>((r) => { soltar = r })
    fireEvent.click(botaoDoCartao('Cliente 1'))

    await waitFor(() => expect(botaoDoCartao('Cliente 1')).toHaveAttribute('aria-busy', 'true'))
    expect(botaoDoCartao('Cliente 1')).toHaveTextContent('Registrando…')
    expect(botaoDoCartao('Cliente 2')).toBeDisabled()
    expect(botaoDoCartao('Cliente 2')).not.toHaveAttribute('aria-busy')
    expect(botaoDoCartao('Cliente 2')).toHaveTextContent('Recebi o material')

    await act(async () => { soltar() })
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('#1041 · material recebido · nenhum aviso sai nesta mudança'),
    )
  })

  it('já enviado ⇒ sem diálogo, e o resultado diz que não sai de novo', async () => {
    const a = pedido()
    banco.rows = [a]
    banco.notificacoes = [enviada(a.id, 'material_received')]
    banco.respostaTrigger = { data: { sent: false }, error: null }
    await montar()
    fireEvent.click(botaoDoCartao('Cliente 1'))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        '#1041 · material recebido · “Material recebido no ateliê” já tinha sido enviado, não sai de novo',
      ),
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(gatilhos()[0].body).toEqual({ order_id: a.id, trigger: 'material_status_changed' })
  })

  it('a falha da RPC aparece em aviso — antes era ignorada', async () => {
    desligar('material_received')
    banco.rows = [pedido()]
    banco.falharRpc = true
    await montar()
    fireEvent.click(botaoDoCartao('Cliente 1'))

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('O recebimento não foi registrado. Nada foi alterado — tente de novo.'),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe('a primeira carga (CRG-13)', () => {
  it('esqueleto da tabela e dos cartões, sem "Carregando..."', async () => {
    banco.rows = [pedido()]
    let soltar!: () => void
    banco.segurarPrimeira = new Promise<void>((r) => { soltar = r })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/admin/pedidos?visao=tudo']}>
          <AdminOrdersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const esqueleto = screen.getByTestId('orders-skeleton')
    expect(esqueleto).toHaveAttribute('aria-busy', 'true')
    expect(within(esqueleto).getAllByTestId('skeleton-row').length).toBeGreaterThan(0)
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    await act(async () => { soltar() })
    await screen.findByRole('table')
    expect(screen.queryByTestId('orders-skeleton')).not.toBeInTheDocument()
  })
})

// Verifier r3 — fecho das lacunas sem rodada 4.
const regiaoVivaDiz = (frase: string) =>
  Array.from(document.querySelectorAll('[aria-live="polite"]')).some((el) => el.textContent === frase)

/** Dá ao gesto a chance de gravar depois do aviso — uma escrita indevida aparece aqui. */
const deixarCorrer = () => act(async () => { await new Promise((r) => setTimeout(r, 50)) })

describe('lacunas da rodada 3 do Verifier (AVS-21 no cartão, o teto de 50 no diálogo)', () => {
  const botaoDoCartao = (nome: string) => {
    const cartao = screen.getAllByRole('link', { name: nome }).map((l) => l.closest('li')).find(Boolean) as HTMLElement
    return within(cartao).getByRole('button', { name: /Recebi o material|Registrando…/ })
  }

  // V14: sem o `return`, o cartão diria "Nada foi alterado" e gravaria logo depois. Com o evento
  // desligado não há diálogo no caminho: a escrita indevida sairia direto.
  it.each([
    ['desligado (sem diálogo no caminho)', true],
    ['ligado (o diálogo não abre)', false],
  ])('cartão com a leitura dos envios falhando, e-mail %s ⇒ nada grava, "Nada foi alterado"', async (_n, desligado) => {
    if (desligado) desligar('material_received')
    banco.rows = [pedido()]
    banco.falharNotificacoes = true
    await montar()
    fireEvent.click(botaoDoCartao('Cliente 1'))

    const frase = 'Não consegui conferir os e-mails já enviados. Nada foi alterado.'
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(frase))
    // Conserto do QA: UM anúncio — o aviso flutuante o diz, a região do gesto não repete.
    expect(regiaoVivaDiz(frase)).toBe(false)
    await deixarCorrer()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(materiais()).toEqual([])
    expect(gatilhos()).toEqual([])
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  // V28: o diálogo conta e nomeia só os primeiros 50 (`BULK_LIMIT`), que são os que gravam.
  it('lote de 60 selecionados ⇒ o diálogo conta e lista só os 50, e só 50 gravam', async () => {
    const linhas = Array.from({ length: 60 }, () => pedido())
    banco.rows = linhas
    await montar()
    selecionarTudo()
    expect(within(barra()).getByText('60 selecionados')).toBeInTheDocument()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByText('Registrar o material de 50 pedidos')).toBeInTheDocument()
    expect(within(dialogo).getByText('50 mudam.')).toBeInTheDocument()
    const lista = within(dialogo).getByRole('list', { name: 'O que muda' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(50)
    expect(within(lista).getByText('Cliente 50')).toBeInTheDocument()
    expect(within(lista).queryByText('Cliente 51')).not.toBeInTheDocument()
    const ids = registro.leiturasDeEnvios[0].filters.find((f) => f.method === 'in')?.args[1] as string[]
    expect(ids).toEqual(linhas.slice(0, 50).map((l) => l.id))

    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar 50 recebimentos' }))
    await waitFor(() => expect(gatilhos()).toHaveLength(50))
    await deixarCorrer()
    expect(materiais()).toHaveLength(50)
    expect(materiais().map((r) => r.args.p_order_id)).toEqual(linhas.slice(0, 50).map((l) => l.id))
  })
})

// ---------------------------------------------------------------------------------------------------
// Conserto do QA (2026-10-30). Cada caso reprovou antes do conserto.
// ---------------------------------------------------------------------------------------------------

describe('conserto do QA — a lista não afirma o que ainda não contou (BUG lista-diz-nada-esperando-enquanto-carrega)', () => {
  it('com as contagens no ar: nem "Nada esperando você agora" nem zeros nos cartões da fila', async () => {
    banco.rows = [pedido()]
    let soltar!: () => void
    banco.segurarContagens = new Promise<void>((r) => { soltar = r })
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <MemoryRouter initialEntries={['/admin/pedidos?visao=tudo']}>
          <AdminOrdersPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await screen.findByRole('table')
    expect(screen.queryByText('Nada esperando você agora')).not.toBeInTheDocument()
    const fila = screen.getByRole('group', { name: 'O que precisa de ação' })
    expect(fila).toHaveAttribute('aria-busy', 'true')
    expect(within(fila).queryByText('0')).not.toBeInTheDocument()

    await act(async () => { soltar() })
    await waitFor(() => expect(screen.getByText('Nada esperando você agora')).toBeInTheDocument())
    expect(fila).not.toHaveAttribute('aria-busy')
    expect(within(fila).getAllByText('0').length).toBeGreaterThan(0)
  })
})

describe('conserto do QA — o resumo do lote fica até ser dispensado (BUG resumo-do-lote-some-em-quatro-segundos)', () => {
  it('o resumo é uma região de status na lista, sem aviso flutuante, e só sai em "Dispensar"', async () => {
    banco.rows = [pedido(), pedido()]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar 2 recebimentos' }))

    await waitFor(() => expect(resumoDoLote()).toHaveTextContent('2 marcadas · 2 e-mails enviados'))
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringContaining('2 marcadas'))
    await deixarCorrer()
    expect(resumoDoLote()).toBeInTheDocument()

    fireEvent.click(within(resumoDoLote()).getByRole('button', { name: 'Dispensar o resumo do lote' }))
    expect(screen.queryByRole('status', { name: 'Resumo do lote' })).not.toBeInTheDocument()
  })
})

describe('conserto do QA — o botão do cartão diz de qual pedido é (BUG recebi-o-material-sem-o-pedido-no-nome)', () => {
  it('o nome acessível traz o número do pedido e a cliente', async () => {
    banco.rows = [pedido(), pedido()]
    await montar()
    expect(screen.getByRole('button', { name: 'Recebi o material — pedido #1041, Cliente 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recebi o material — pedido #1042, Cliente 2' })).toBeInTheDocument()
  })
})

describe('conserto do reteste — o botão do cartão quebra linha (BUG pedido-rola-de-lado-com-fonte-200)', () => {
  // A 390/200 % "Recebi o material" (`whitespace-nowrap`) empurrava o botão do WhatsApp para fora do
  // cartão e a lista inteira rolava de lado (`scrollWidth` 478). Os cartões só existem abaixo de `md`.
  it('o botão de ação do cartão encolhe e quebra o texto', async () => {
    banco.rows = [pedido()]
    await montar()
    const tokens = (screen.getByRole('button', { name: 'Recebi o material — pedido #1041, Cliente 1' }).getAttribute('class') ?? '').split(/\s+/)
    for (const t of ['min-w-0', 'whitespace-normal', 'h-auto']) expect(tokens).toContain(t)
  })
})

describe('conserto do QA — o foco depois do cartão (BUG foco-cai-no-body-nas-acoes-do-pedido)', () => {
  let soltarFoco: () => void = () => {}
  beforeEach(() => { soltarFoco = simularFocoDoNavegador() })
  afterEach(() => soltarFoco())

  it('"Recebi o material" gravado ⇒ o foco fica no próprio cartão, nunca no <body>', async () => {
    desligar('material_received')
    banco.respostaTrigger = { data: { sent: false }, error: null }
    banco.rows = [pedido(), pedido()]
    await montar()
    const botao = screen.getByRole('button', { name: 'Recebi o material — pedido #1041, Cliente 1' })
    const cartao = botao.closest('li') as HTMLElement
    botao.focus()
    fireEvent.click(botao)
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
    await waitFor(() => expect(document.activeElement).not.toBe(document.body))
    expect(cartao.contains(document.activeElement)).toBe(true)
  })

  it('pelo diálogo, com o cartão saindo da lista ⇒ o foco vai ao título da página, nunca ao <body>', async () => {
    banco.sairDaListaDepoisDaRpc = true
    banco.rows = [pedido(), pedido()]
    await montar()
    const botao = screen.getByRole('button', { name: 'Recebi o material — pedido #1041, Cliente 1' })
    botao.focus()
    fireEvent.click(botao)
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar recebimento' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(screen.queryByText('Cliente 1')).not.toBeInTheDocument())
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Pedidos' })))
  })

  // Conserto do reteste (`BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`): a região do resumo
  // some com o botão, e o foco caía no <body>.
  it('"Dispensar o resumo do lote" ⇒ o foco vai ao título da lista, nunca ao <body>', async () => {
    banco.rows = [pedido(), pedido()]
    await montar()
    selecionarTudo()
    fireEvent.click(within(barra()).getByRole('button', { name: /Marcar material recebido/ }))
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Registrar 2 recebimentos' }))
    await waitFor(() => expect(resumoDoLote()).toBeInTheDocument())
    const dispensar = within(resumoDoLote()).getByRole('button', { name: 'Dispensar o resumo do lote' })
    dispensar.focus()
    fireEvent.click(dispensar)
    expect(screen.queryByRole('status', { name: 'Resumo do lote' })).not.toBeInTheDocument()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1, name: 'Pedidos' })))
  })

  it('a leitura dos envios que falha também devolve o foco ao cartão', async () => {
    banco.rows = [pedido()]
    banco.falharNotificacoes = true
    await montar()
    const botao = screen.getByRole('button', { name: 'Recebi o material — pedido #1041, Cliente 1' })
    const cartao = botao.closest('li') as HTMLElement
    botao.focus()
    fireEvent.click(botao)
    await waitFor(() => expect(toastError).toHaveBeenCalled())
    await waitFor(() => expect(cartao.contains(document.activeElement)).toBe(true))
  })
})
