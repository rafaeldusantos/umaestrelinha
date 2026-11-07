// A folha de separação em lote pela lista de Pedidos, com a página REAL.
//
// Molde de `AdminOrdersPage.aviso.test.tsx`: só o client do Supabase é dublado. O carregador
// (`fetchPickSlipOrders`) e `openPickSlips` são os de verdade; a janela entra por `window.open`, e o
// que se prova é o que a janela recebeu (o documento) e o que o client recebeu (os ids pedidos).

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const { banco, registro, falso, toastError, toastMessage } = vi.hoisted(() => {
  const banco = {
    rows: [] as Record<string, unknown>[],
    itens: [] as Record<string, unknown>[],
    falharPedidos: false,
    /** Segura a leitura da folha (para ver o botão ocupado). */
    segurarFolha: null as Promise<void> | null,
  }
  const registro = {
    /** Os ids de cada leitura da folha em `orders` (a que pede `order_number`). */
    leiturasDaFolha: [] as string[][],
    leiturasDeItens: [] as string[][],
  }
  type Rec = { table: string; select?: unknown[]; filters: { method: string; args: unknown[] }[] }

  const idsDe = (r: Rec) => (r.filters.find((f) => f.method === 'in')?.args[1] ?? []) as string[]

  const responder = async (r: Rec): Promise<{ data?: unknown; error?: unknown; count?: number }> => {
    switch (r.table) {
      case 'order_list':
        return { data: banco.rows.map((x) => ({ ...x })), error: null, count: banco.rows.length }
      case 'orders': {
        const colunas = String(r.select?.[0] ?? '')
        if (!colunas.includes('order_number')) return { data: [], error: null, count: 0 }
        const ids = idsDe(r)
        registro.leiturasDaFolha.push(ids)
        if (banco.segurarFolha) await banco.segurarFolha
        if (banco.falharPedidos) return { data: null, error: { message: 'boom' } }
        return {
          data: banco.rows
            .filter((x) => ids.includes(x.id as string))
            .map((x) => ({ ...x, address_street: `Rua do ${x.customer_name}`, address_number: '10' })),
          error: null,
        }
      }
      case 'order_items': {
        const ids = idsDe(r)
        registro.leiturasDeItens.push(ids)
        return { data: banco.itens.filter((i) => ids.includes(i.order_id as string)), error: null }
      }
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
    rpc: async () => ({ data: null, error: null }),
    functions: { invoke: async () => ({ data: null, error: null }) },
  }
  return { banco, registro, falso, toastError: vi.fn(), toastMessage: vi.fn() }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: falso }))
vi.mock('@estrelinha/supabase', () => ({ supabase: falso }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: toastError, info: vi.fn(), message: toastMessage } }))

import AdminOrdersPage from './AdminOrdersPage'
import { PICK_SLIP_BLOCKED } from '@/features/pick-slip'
import { PICK_SLIP_READ_FAILED } from '@/entities/order'

let seq = 0
const pedido = () => {
  seq++
  const id = `o${seq}`
  banco.itens.push({
    order_id: id, product_id: 'nuvemshop:x', product_name: `Peça do pedido ${seq}`, product_image: null,
    quantity: 1, variant_label: null, engraving_text: null, material_kinds: [],
  })
  return {
    id, order_number: `${1040 + seq}`, customer_id: null, customer_name: `Cliente ${seq}`,
    customer_email: `c${seq}@example.com`, status: 'paid', payment_status: 'approved', payment_method: 'pix',
    total: 100, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel',
    material_received_at: null, created_at: '2026-10-20T12:00:00Z', notes: null, purchase_ordinal: 1,
    customer_phone: null,
  }
}

const janelaFalsa = () => {
  const escrito: string[] = []
  return {
    escrito,
    document: {
      open: vi.fn(),
      write: vi.fn((html: string) => escrito.push(html)),
      close: vi.fn(),
      images: [],
    },
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
  }
}

let janela: ReturnType<typeof janelaFalsa>
let abrir: ReturnType<typeof vi.spyOn>

const montar = async () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/pedidos?visao=tudo']}>
        <AdminOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findByRole('table')
}

const botaoDoCabecalho = () => screen.getByRole('button', { name: 'Folha de separação' })
const barra = () => screen.getByRole('toolbar', { name: 'Ações em massa' })
const botaoDaBarra = () => within(barra()).getByRole('button', { name: /Folhas de separação/ })
const selecionar = (numero: string) => fireEvent.click(screen.getByLabelText(`Selecionar pedido ${numero}`))
/** O documento que a janela recebeu depois da leitura (o primeiro write é o "Preparando"). */
const documento = () => janela.escrito.at(-1) ?? ''

beforeEach(() => {
  seq = 0
  banco.rows = []
  banco.itens = []
  banco.falharPedidos = false
  banco.segurarFolha = null
  registro.leiturasDaFolha.length = 0
  registro.leiturasDeItens.length = 0
  toastError.mockReset()
  toastMessage.mockReset()
  janela = janelaFalsa()
  abrir = vi.spyOn(window, 'open').mockImplementation(() => janela as unknown as Window)
})

afterEach(() => abrir.mockRestore())

describe('a folha em lote lê os pedidos completos', () => {
  it.each([
    ['barra', () => botaoDaBarra()],
    ['cabeçalho', () => botaoDoCabecalho()],
  ])('com seleção, o botão da %s passa os ids selecionados e imprime a folha completa de cada um', async (_nome, botao) => {
    const [a, b, c] = [pedido(), pedido(), pedido()]
    banco.rows = [a, b, c]
    await montar()

    selecionar(a.order_number)
    selecionar(c.order_number)
    fireEvent.click(botao())

    await waitFor(() => expect(janela.print).toHaveBeenCalledTimes(1))
    expect(registro.leiturasDaFolha).toEqual([['o1', 'o3']])
    expect(registro.leiturasDeItens).toEqual([['o1', 'o3']])
    const html = documento()
    // Uma folha por pedido, com o que só a leitura completa traz: itens e endereço.
    expect(html.match(/<section class="folha">/g)).toHaveLength(2)
    expect(html).toContain('Peça do pedido 1')
    expect(html).toContain('Peça do pedido 3')
    expect(html).toContain('Rua do Cliente 1')
    expect(html).not.toContain('Peça do pedido 2')
    expect(html.indexOf('Peça do pedido 1')).toBeLessThan(html.indexOf('Peça do pedido 3'))
    expect(toastError).not.toHaveBeenCalled()
  })

  it('sem seleção, o botão do cabeçalho usa os pedidos da página', async () => {
    banco.rows = [pedido(), pedido(), pedido()]
    await montar()

    fireEvent.click(botaoDoCabecalho())

    await waitFor(() => expect(janela.print).toHaveBeenCalledTimes(1))
    expect(registro.leiturasDaFolha).toEqual([['o1', 'o2', 'o3']])
    expect(documento().match(/<section class="folha">/g)).toHaveLength(3)
  })
})

describe('o teto de 10 pedidos por lote', () => {
  it('com 12 selecionados, saem os 10 primeiros e a tela avisa que 2 ficaram de fora', async () => {
    banco.rows = Array.from({ length: 12 }, () => pedido())
    await montar()
    fireEvent.click(screen.getByLabelText('Selecionar a página'))

    fireEvent.click(botaoDaBarra())

    await waitFor(() => expect(janela.print).toHaveBeenCalledTimes(1))
    expect(registro.leiturasDaFolha).toEqual([banco.rows.slice(0, 10).map((r) => r.id)])
    expect(documento().match(/<section class="folha">/g)).toHaveLength(10)
    await waitFor(() => expect(toastMessage).toHaveBeenCalledTimes(1))
    expect(toastMessage.mock.calls[0][0]).toMatch(/10 primeiros pedidos\. 2 ficaram de fora/)
  })

  it('com 10 selecionados, todos saem e não há aviso', async () => {
    banco.rows = Array.from({ length: 10 }, () => pedido())
    await montar()
    fireEvent.click(screen.getByLabelText('Selecionar a página'))

    fireEvent.click(botaoDaBarra())

    await waitFor(() => expect(janela.print).toHaveBeenCalledTimes(1))
    expect(registro.leiturasDaFolha[0]).toHaveLength(10)
    expect(toastMessage).not.toHaveBeenCalled()
  })
})

describe('o que dá errado avisa', () => {
  it('a leitura que falha avisa e nada é impresso', async () => {
    banco.rows = [pedido(), pedido()]
    banco.falharPedidos = true
    await montar()

    fireEvent.click(botaoDoCabecalho())

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(PICK_SLIP_READ_FAILED))
    expect(janela.print).not.toHaveBeenCalled()
    expect(janela.close).toHaveBeenCalledTimes(1)
  })

  it('o popup bloqueado avisa, e nada é lido', async () => {
    banco.rows = [pedido()]
    abrir.mockImplementation(() => null)
    await montar()

    fireEvent.click(botaoDoCabecalho())

    await waitFor(() => expect(toastError).toHaveBeenCalledWith(PICK_SLIP_BLOCKED))
    expect(registro.leiturasDaFolha).toEqual([])
  })
})

describe('o botão enquanto lê', () => {
  it('fica ocupado durante a leitura, e o duplo clique não abre segunda janela', async () => {
    banco.rows = [pedido(), pedido()]
    let soltar!: () => void
    banco.segurarFolha = new Promise<void>((ok) => { soltar = ok })
    await montar()
    selecionar(banco.rows[0].order_number as string)

    const botao = botaoDaBarra()
    fireEvent.click(botao)
    fireEvent.click(botao)

    await waitFor(() => expect(within(barra()).getByRole('button', { name: /Preparando as folhas…/ })).toHaveAttribute('aria-busy', 'true'))
    expect(abrir).toHaveBeenCalledTimes(1)
    // O do cabeçalho também não abre outra enquanto esta lê.
    expect(botaoDoCabecalho()).toBeDisabled()

    await act(async () => soltar())
    await waitFor(() => expect(janela.print).toHaveBeenCalledTimes(1))
    expect(abrir).toHaveBeenCalledTimes(1)
    expect(within(barra()).getByRole('button', { name: /Folhas de separação/ })).not.toHaveAttribute('aria-busy')
  })
})
