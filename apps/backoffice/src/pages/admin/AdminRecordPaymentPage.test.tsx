// "Registrar pagamento" — a tela própria do pedido, pela PÁGINA REAL, com o dono da escrita de
// `core` de verdade sobre um client dublado na fronteira (o bucket, a RPC). O portão de aviso é o da
// feature `88`: com e-mail previsto, a caixa decide se a cliente o recebe.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock, notifyMock, notifyReportMock, estado } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  notifyMock: vi.fn(),
  notifyReportMock: vi.fn(),
  estado: {
    envios: [] as { path: string; opts: unknown }[],
    removidos: [] as string[][],
    rpcs: [] as { fn: string; args: Record<string, unknown> }[],
    resposta: { data: { result: 'ok', id: 'reg-1', status: 'paid' }, error: null } as unknown,
  },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: async (path: string, _b: unknown, opts: unknown) => {
          estado.envios.push({ path, opts })
          return { data: { path }, error: null }
        },
        remove: async (paths: string[]) => {
          estado.removidos.push(paths)
          return { data: [], error: null }
        },
      }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      estado.rpcs.push({ fn, args })
      return estado.resposta
    },
    functions: { invoke: vi.fn() },
  },
}))
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))
vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/notifyOrder', () => ({ notifyOrder: notifyMock, notifyOrderReport: notifyReportMock }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminRecordPaymentPage from './AdminRecordPaymentPage'

const order = (over: Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'pending', payment_method: 'pix', payment_status: 'expired',
    paid_at: null, subtotal: 180, discount: 0, shipping_cost: 0, total: 180, material_status: 'nao_aplicavel',
    created_at: '2020-01-01T12:00:00Z',
    ...over,
  }) as unknown as DbOrder

const detail = (o: DbOrder) => ({
  order: o, items: [], history: [], notes: [], emails: [], emailsError: false, itemsError: null, productRefs: {},
  loading: false, error: null, reload: vi.fn(), manualPayment: null,
})

let local = ''
const Onde = () => {
  local = useLocation().pathname
  return null
}

const montar = (entrada = '/admin/pedidos/o1/pagamento') =>
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Onde />
      <Routes>
        <Route path="/admin/pedidos/:id/pagamento" element={<AdminRecordPaymentPage />} />
        <Route path="/admin/pedidos/:id" element={<p>o pedido</p>} />
      </Routes>
    </MemoryRouter>,
  )

const arquivo = (nome: string, tipo: string, tamanho = 1000) => {
  const f = new File(['x'], nome, { type: tipo })
  Object.defineProperty(f, 'size', { value: tamanho })
  return f
}

const escolher = (...arquivos: File[]) =>
  fireEvent.change(screen.getByLabelText('Comprovantes'), { target: { files: arquivos } })

const registrar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Registrar pagamento' }))
  })
}

beforeEach(() => {
  estado.envios = []
  estado.removidos = []
  estado.rpcs = []
  estado.resposta = { data: { result: 'ok', id: 'reg-1', status: 'paid' }, error: null }
  notifyMock.mockReset()
  notifyMock.mockResolvedValue(true)
  notifyReportMock.mockReset()
  notifyReportMock.mockResolvedValue({ customerSent: false, skipRecorded: true })
  local = ''
  detailMock.mockReturnValue(detail(order()))
})

describe('o formulário', () => {
  it('pede meio (lista fixa), data e hora já preenchidas, observação e comprovantes — todos opcionais', () => {
    montar()
    for (const meio of ['PIX direto', 'Transferência', 'Dinheiro', 'Cartão de crédito (link de outro gateway ou maquininha)', 'Outro']) {
      expect(screen.getByRole('radio', { name: meio })).toBeInTheDocument()
    }
    expect((screen.getByLabelText('Hora do pagamento (Brasília)') as HTMLInputElement).value).toMatch(/^\d{2}:\d{2}$/)
    expect(screen.getByRole('textbox', { name: 'Observação' })).toBeInTheDocument()
    const campo = screen.getByLabelText('Comprovantes') as HTMLInputElement
    expect(campo.multiple).toBe(true)
    expect(campo.accept).toContain('image/heic')
    expect(campo.accept).toContain('application/pdf')
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).not.toBeDisabled()
  })

  it('diz qual e-mail a cliente pode receber', () => {
    montar()
    expect(screen.getByText(/Ao registrar, você escolhe se a cliente recebe o e-mail/)).toBeInTheDocument()
  })

  it.each([
    ['mais de 3', ['a.png', 'b.png', 'c.png', 'd.png'].map((n) => arquivo(n, 'image/png')), 'São no máximo 3 comprovantes por pagamento.'],
    ['arquivo grande', [arquivo('extrato.pdf', 'application/pdf', 10 * 1024 * 1024 + 1)], 'extrato.pdf passa de 10 MB.'],
    ['tipo não aceito', [arquivo('planilha.xlsx', 'application/vnd.ms-excel')], 'planilha.xlsx não é JPG, PNG, WebP, HEIC ou PDF.'],
  ])('%s: a recusa aparece antes de qualquer gravação, e o botão não grava', async (_n, arquivos, motivo) => {
    montar()
    escolher(...arquivos)
    expect(await screen.findByText(motivo)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeDisabled()
    expect(estado.envios).toEqual([])
    expect(estado.rpcs).toEqual([])
  })
})

describe('os alvos de toque da data do pagamento', () => {
  // Por TOKEN exato: `h-11` é substring de `min-h-11`, e `toContain` aceitaria a forma errada.
  const tokenExato = (token: string) => new RegExp(`(?:^|\\s)${token}(?![-\\w])`)

  it('o botão da data e o "Limpar data" têm 44 px — nem o `h-10` do botão nem o `h-9` do `sm`', () => {
    montar()
    const data = screen.getByRole('button', { name: 'Data do pagamento (Brasília)' })
    const limpar = screen.getByRole('button', { name: 'Limpar Data do pagamento (Brasília)' })

    expect(data.className).toMatch(tokenExato('h-11'))
    expect(data.className).not.toMatch(tokenExato('h-10'))
    expect(limpar.className).toMatch(tokenExato('h-11'))
    expect(limpar.className).toMatch(tokenExato('w-11'))
    expect(limpar.className).not.toMatch(tokenExato('h-9'))
  })

  it('o "Limpar data" não encolhe na linha do campo: `shrink-0` ao lado de `w-11`', () => {
    // A linha é flex, e `w-11` sozinho é largura PREFERIDA: o botão da data, `w-full`, empurra o
    // "Limpar" para baixo de 44 px de largura (40 px medidos em 390 e 320).
    montar()
    const limpar = screen.getByRole('button', { name: 'Limpar Data do pagamento (Brasília)' })
    expect(limpar.className).toMatch(tokenExato('shrink-0'))
    expect(limpar.className).toMatch(tokenExato('w-11'))
  })

  it('a régua é de token: `min-h-11` não passa por `h-11`', () => {
    expect(tokenExato('h-11').test('w-full h-11 justify-start')).toBe(true)
    expect(tokenExato('h-11').test('w-full min-h-11 justify-start')).toBe(false)
    expect(tokenExato('h-11').test('w-full h-10 justify-start')).toBe(false)
    expect(tokenExato('shrink-0').test('h-11 w-11 shrink-0')).toBe(true)
    expect(tokenExato('shrink-0').test('h-11 w-11 hover:shrink-0x')).toBe(false)
    expect(tokenExato('shrink-0').test('h-11 w-11 shrink-0-auto')).toBe(false)
    expect(tokenExato('shrink-0').test('h-11 w-11 shrink')).toBe(false)
  })
})

describe('registrar', () => {
  it('com o e-mail marcado: envia o comprovante, grava pela RPC, avisa a cliente e volta ao pedido', async () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: 'Transferência' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Observação' }), { target: { value: 'Pagou no Itaú' } })
    escolher(arquivo('comprovante.pdf', 'application/pdf'))
    await registrar()

    const dialogo = await screen.findByRole('dialog')
    expect(within(dialogo).getByRole('checkbox')).toBeChecked()
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
    })

    await waitFor(() => expect(local).toBe('/admin/pedidos/o1'))
    expect(estado.envios).toHaveLength(1)
    expect(estado.envios[0].path).toMatch(/^o1\/.+\.pdf$/)
    expect(estado.rpcs).toHaveLength(1)
    expect(estado.rpcs[0].fn).toBe('record_manual_payment')
    expect(estado.rpcs[0].args).toMatchObject({
      p_order_id: 'o1', p_method: 'transferencia', p_note: 'Pagou no Itaú', p_author_name: 'Adri Muniz',
      p_receipts: [{ path: estado.envios[0].path, content_type: 'application/pdf', size_bytes: 1000 }],
    })
    expect(typeof estado.rpcs[0].args.p_paid_at).toBe('string')
    expect(notifyMock).toHaveBeenCalledWith('o1', 'payment_recorded')
  })

  it('com a caixa desmarcada, o gatilho sai sem o e-mail da cliente', async () => {
    montar()
    await registrar()
    const dialogo = await screen.findByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('checkbox'))
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
    })
    await waitFor(() => expect(local).toBe('/admin/pedidos/o1'))
    // Sem e-mail, o disparo é o que lê a resposta inteira (a anotação do aviso pulado).
    expect(notifyReportMock).toHaveBeenCalledWith('o1', 'payment_recorded', { cliente: false })
  })

  it('aprovado enquanto o formulário estava aberto: a tela diz isso, nada é gravado e o comprovante sai', async () => {
    estado.resposta = { data: { result: 'ja_pago' }, error: null }
    montar()
    escolher(arquivo('comprovante.pdf', 'application/pdf'))
    await registrar()
    const dialogo = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
    })
    expect(
      (await screen.findAllByText('O pagamento deste pedido foi aprovado enquanto você preenchia. Nada foi registrado, e os comprovantes não foram guardados.')).length,
    ).toBeGreaterThan(0)
    expect(estado.removidos).toEqual([[estado.envios[0].path]])
    expect(notifyMock).not.toHaveBeenCalled()
    expect(local).toBe('/admin/pedidos/o1/pagamento')
  })

  it('vindo do "Outro status" para Enviado, a tela diz para onde o pedido vai depois', () => {
    montar('/admin/pedidos/o1/pagamento?para=shipped')
    expect(screen.getByText(/levar o pedido a Enviado/)).toBeInTheDocument()
  })
})

// O campo de arquivo como o navegador o entrega: `input.files` é uma lista VIVA, e limpar o campo
// (`value = ''`, para a mesma escolha poder ser feita de novo) a esvazia no mesmo objeto. Quem lê a
// lista depois da limpeza lê nada — e é assim que uma escolha some sem aviso.
const escolherNoNavegador = (...arquivos: File[]) => {
  const campo = screen.getByLabelText('Comprovantes') as HTMLInputElement
  const lista: File[] = [...arquivos]
  Object.defineProperty(campo, 'files', { configurable: true, get: () => lista })
  Object.defineProperty(campo, 'value', {
    configurable: true,
    get: () => (lista.length > 0 ? `C:\\fakepath\\${lista[0].name}` : ''),
    set: (v: string) => {
      if (v === '') lista.splice(0)
    },
  })
  fireEvent.change(campo)
}

const listados = () =>
  screen.queryAllByRole('button', { name: /^Tirar / }).map((b) => b.getAttribute('aria-label'))

describe('os comprovantes escolhidos em qualquer momento', () => {
  it('escolher um, preencher meio e observação, escolher mais um: os dois ficam na lista e são enviados e gravados', async () => {
    montar()
    escolherNoNavegador(arquivo('pix.jpg', 'image/jpeg'))
    fireEvent.click(screen.getByRole('radio', { name: 'Transferência' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Observação' }), { target: { value: 'Pagou no Itaú' } })
    escolherNoNavegador(arquivo('extrato.pdf', 'application/pdf'))

    expect(listados()).toEqual(['Tirar pix.jpg', 'Tirar extrato.pdf'])

    await registrar()
    const dialogo = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
    })
    await waitFor(() => expect(local).toBe('/admin/pedidos/o1'))
    expect(estado.envios.map((e) => e.path)).toEqual([expect.stringMatching(/^o1\/.+\.jpg$/), expect.stringMatching(/^o1\/.+\.pdf$/)])
    expect(estado.rpcs).toHaveLength(1)
    expect(estado.rpcs[0].args.p_receipts).toEqual([
      { path: estado.envios[0].path, content_type: 'image/jpeg', size_bytes: 1000 },
      { path: estado.envios[1].path, content_type: 'application/pdf', size_bytes: 1000 },
    ])
  })

  it('meio e observação primeiro, depois o arquivo: ele entra na lista', () => {
    montar()
    fireEvent.click(screen.getByRole('radio', { name: 'Transferência' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Observação' }), { target: { value: 'Pagou no Itaú' } })
    escolherNoNavegador(arquivo('pix.jpg', 'image/jpeg'))
    expect(listados()).toEqual(['Tirar pix.jpg'])
  })

  it('seleções sucessivas no mesmo campo somam; a quarta é recusada com a frase e nada é gravado', async () => {
    montar()
    escolherNoNavegador(arquivo('a.png', 'image/png'))
    escolherNoNavegador(arquivo('b.png', 'image/png'))
    escolherNoNavegador(arquivo('c.pdf', 'application/pdf'))
    expect(listados()).toEqual(['Tirar a.png', 'Tirar b.png', 'Tirar c.pdf'])
    expect(screen.queryByText('São no máximo 3 comprovantes por pagamento.')).toBeNull()

    escolherNoNavegador(arquivo('d.png', 'image/png'))
    expect(screen.getByText('São no máximo 3 comprovantes por pagamento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar pagamento' })).toBeDisabled()
    await registrar()
    expect(estado.envios).toEqual([])
    expect(estado.rpcs).toEqual([])
  })

  it('o registro grava exatamente os comprovantes que estão na lista', async () => {
    montar()
    escolherNoNavegador(arquivo('a.png', 'image/png'))
    fireEvent.change(screen.getByRole('textbox', { name: 'Observação' }), { target: { value: 'Dinheiro na mão' } })
    escolherNoNavegador(arquivo('b.webp', 'image/webp'), arquivo('c.pdf', 'application/pdf'))
    fireEvent.click(screen.getByRole('button', { name: 'Tirar b.webp' }))
    expect(listados()).toEqual(['Tirar a.png', 'Tirar c.pdf'])

    await registrar()
    const dialogo = await screen.findByRole('dialog')
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
    })
    await waitFor(() => expect(local).toBe('/admin/pedidos/o1'))
    expect(estado.envios).toHaveLength(2)
    expect(estado.rpcs[0].args.p_receipts).toEqual([
      { path: estado.envios[0].path, content_type: 'image/png', size_bytes: 1000 },
      { path: estado.envios[1].path, content_type: 'application/pdf', size_bytes: 1000 },
    ])
  })
})

describe('quando não há o que registrar', () => {
  it('pedido já pago: a tela diz isso e não mostra o formulário', () => {
    detailMock.mockReturnValue(detail(order({ status: 'paid', payment_status: 'approved', paid_at: '2026-11-08T12:00:00Z' })))
    montar()
    expect(screen.getByText('Este pedido já está pago.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull()
  })

  it('pedido cancelado: não recebe registro', () => {
    detailMock.mockReturnValue(detail(order({ status: 'cancelled' })))
    montar()
    expect(screen.getByText('Pedido cancelado não recebe registro de pagamento.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar pagamento' })).toBeNull()
  })
})
