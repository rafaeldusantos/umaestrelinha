// `TST-03` — o pedido como rota.
//
// ---------------------------------------------------------------------------------------------
// A QUEDA DE BASELINE AUTORIZADA
// ---------------------------------------------------------------------------------------------
// Este arquivo substitui `OrderDetailDialog.test.tsx`, que tinha **8 casos** (a spec dizia 12; a
// contagem foi conferida no arquivo antes de removê-lo). Os 8 são cobertos aqui, no mesmo lugar
// conceitual e **em maior número** — é a exceção declarada de queda, na régua da `25` e da `31`.
//
// Os 8 originais, e onde reaparecem:
//   UX-02 · erro de banco vira toast        → "a falha de escrita vira toast, e não silêncio"
//   UX-02 · sucesso COM e-mail avisa        → "o sucesso diz se a cliente foi avisada"
//   UX-02 · sucesso SEM e-mail não promete  → idem
//   UX-02 · passa código sem espaços        → "o rastreio é gravado sem espaços"
//   UX-01 · dica de rastreio ausente        → "PED-29 · o bloco diz o que segura"
//   UX-01 · com código não mostra dica       → idem
//   UX-01 · não-shipped não mostra dica      → idem
//   UX-01 · a dica não desabilita o salvar   → "o botão NUNCA é desabilitado pela pendência"

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { DbOrder } from '@estrelinha/supabase/types'

const {
  detailMock, reloadMock, toastErrorMock, toastSuccessMock,
  updateStatusMock, addTrackingMock, addNoteMock, cancelMock,
  setMaterialStatusMock, setMaterialTrackingMock, sendEmailMock,
} = vi.hoisted(() => ({
  detailMock: vi.fn(),
  reloadMock: vi.fn(),
  toastErrorMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  updateStatusMock: vi.fn(),
  addTrackingMock: vi.fn(),
  addNoteMock: vi.fn(),
  cancelMock: vi.fn(),
  setMaterialStatusMock: vi.fn(),
  setMaterialTrackingMock: vi.fn(),
  sendEmailMock: vi.fn(),
}))

vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus: updateStatusMock,
    cancelOrder: cancelMock,
    addTrackingCode: addTrackingMock,
    addNote: addNoteMock,
    setMaterialStatus: setMaterialStatusMock,
    setMaterialTracking: setMaterialTrackingMock,
  }),
}))
vi.mock('@/entities/order/api/sendOrderEmail', () => ({ sendOrderEmail: sendEmailMock }))
vi.mock('sonner', () => ({ toast: { error: toastErrorMock, success: toastSuccessMock } }))
// O Melhor Envio migra sem alteração interna (D9) e fala com uma API externa — fora do escopo aqui.
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))

import AdminOrderPage from './AdminOrderPage'

const order = (over: Partial<DbOrder> = {}): DbOrder =>
  ({
    id: 'o1',
    order_number: '1042',
    customer_id: 'c1',
    customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com',
    status: 'paid',
    payment_method: 'pix',
    payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z',
    pix_discount: 19.45,
    subtotal: 389,
    discount: 0,
    shipping_cost: 0,
    total: 369.55,
    tracking_code: null,
    material_tracking_code: null,
    material_status: 'aguardando_material',
    notes: null,
    address_street: 'Rua Marcelo Gama',
    address_number: '1120',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    address_zip: '90540-041',
    created_at: '2026-08-20T14:32:00Z',
    ...over,
  }) as unknown as DbOrder

const detail = (over: Record<string, unknown> = {}) => ({
  order: order(),
  items: [
    {
      id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Pingente Gota · Cinzas',
      quantity: 1, unit_price: 329, engraving_text: 'Sempre comigo, pai.',
      variant_label: 'Prata 925 · 18mm', material_kinds: ['cinzas'], requires_material: true,
    },
  ],
  history: [],
  notes: [],
  emails: [],
  itemsError: null,
  productRefs: { p1: { id: 'p1', image: 'https://cdn/p1.webp' } },
  loading: false,
  error: null,
  reload: reloadMock,
  ...over,
})

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
      <Routes>
        <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  detailMock.mockReturnValue(detail())
  updateStatusMock.mockResolvedValue({ error: null, emailSent: false })
  addTrackingMock.mockResolvedValue({ error: null, emailSent: false })
  addNoteMock.mockResolvedValue(null)
  cancelMock.mockResolvedValue(null)
  setMaterialStatusMock.mockResolvedValue({ ok: true, reason: null })
  sendEmailMock.mockResolvedValue(true)
})

describe('a rota carrega o pedido sozinha (PED-24)', () => {
  it('mostra o número do pedido lido pelo id da URL', () => {
    renderPage()
    expect(detailMock).toHaveBeenCalledWith('o1')
    expect(screen.getByText('Pedido #1042')).toBeInTheDocument()
  })

  it('pedido inexistente oferece o caminho de volta, e não uma tela em branco', () => {
    detailMock.mockReturnValue(detail({ order: null }))
    renderPage()

    expect(screen.getByText(/Este pedido não existe/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para Pedidos' })).toBeInTheDocument()
  })

  it('erro de leitura é ERRO, e não "pedido não encontrado"', () => {
    // As duas afirmações são diferentes: uma manda procurar em outro lugar, a outra manda tentar de
    // novo. Trocar uma pela outra faz a Adri procurar um pedido que existe.
    detailMock.mockReturnValue(detail({ order: null, error: 'connection refused' }))
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('connection refused')
    expect(screen.queryByText(/Este pedido não existe/)).not.toBeInTheDocument()
  })
})

describe('os dois rastreios NUNCA se cruzam (PED-26)', () => {
  it('o rastreio de saída é rotulado com a direção', () => {
    renderPage()
    expect(screen.getByText('Rastreio da joia (saída)')).toBeInTheDocument()
  })

  it('o campo de rastreio de SAÍDA não é o do envelope', () => {
    // O bloco de entrega tem um único campo de código, e ele é o da joia. O do envelope vive dentro
    // do card de material, que é outro bloco.
    renderPage()
    expect(screen.getByLabelText('Código de rastreio da joia')).toBeInTheDocument()
  })

  it('o código de saída aparece só depois de existir, com botão de copiar', () => {
    detailMock.mockReturnValue(detail({ order: order({ tracking_code: 'BR77 1402 5' }) }))
    renderPage()

    expect(screen.getByText('BR77 1402 5')).toBeInTheDocument()
    expect(screen.getByLabelText('Copiar rastreio da joia')).toBeInTheDocument()
    expect(screen.queryByLabelText('Código de rastreio da joia')).not.toBeInTheDocument()
  })

  it('o rastreio é gravado sem espaços nas pontas (UX-02, herdado)', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Código de rastreio da joia'), {
      target: { value: '  BR77 1402 5  ' },
    })
    fireEvent.change(screen.getByLabelText('Transportadora'), { target: { value: '  Correios ' } })
    fireEvent.click(screen.getByText('Salvar rastreio'))

    await waitFor(() =>
      expect(addTrackingMock).toHaveBeenCalledWith('o1', 'BR77 1402 5', 'Correios'),
    )
  })

  it('o sucesso diz se a cliente foi avisada (UX-02, herdado)', async () => {
    addTrackingMock.mockResolvedValue({ error: null, emailSent: true })
    renderPage()
    fireEvent.change(screen.getByLabelText('Código de rastreio da joia'), {
      target: { value: 'BR1' },
    })
    fireEvent.click(screen.getByText('Salvar rastreio'))

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith('Rastreio salvo — a cliente foi avisada por e-mail'),
    )
  })

  it('sem e-mail, não promete um aviso que não houve (UX-02, herdado)', async () => {
    addTrackingMock.mockResolvedValue({ error: null, emailSent: false })
    renderPage()
    fireEvent.change(screen.getByLabelText('Código de rastreio da joia'), {
      target: { value: 'BR1' },
    })
    fireEvent.click(screen.getByText('Salvar rastreio'))

    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith('Rastreio salvo'))
  })

  it('a falha de escrita vira toast, e não silêncio (UX-02, herdado)', async () => {
    addTrackingMock.mockResolvedValue({ error: { message: 'boom' }, emailSent: false })
    renderPage()
    fireEvent.change(screen.getByLabelText('Código de rastreio da joia'), {
      target: { value: 'BR1' },
    })
    fireEvent.click(screen.getByText('Salvar rastreio'))

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('Não foi possível salvar o rastreio'),
    )
  })
})

describe('o próximo passo diz o que segura, e não bloqueia (PED-29, UX-01)', () => {
  it('material aguardando explica o que falta', () => {
    renderPage()
    expect(screen.getByText(/Próximo passo: Em Separação/)).toBeInTheDocument()
    expect(screen.getByText(/quando o material for registrado como recebido/)).toBeInTheDocument()
  })

  it('o botão NUNCA é desabilitado pela pendência — só muda de tom (UX-01, herdado)', () => {
    renderPage()
    const botao = screen.getByText('Avançar mesmo assim')
    expect(botao.closest('button')).not.toBeDisabled()
  })

  it('sem pendência, o botão diz o próximo estado e não "mesmo assim"', () => {
    detailMock.mockReturnValue(
      detail({ order: order({ material_status: 'material_recebido' }) }),
    )
    renderPage()

    expect(screen.queryByText('Avançar mesmo assim')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Em Separação/ })).toBeInTheDocument()
  })

  it('pedido entregue não oferece avançar — fim de linha', () => {
    detailMock.mockReturnValue(detail({ order: order({ status: 'delivered' }) }))
    renderPage()

    expect(screen.getByText('Pedido concluído')).toBeInTheDocument()
    expect(screen.queryByText(/Próximo passo/)).not.toBeInTheDocument()
  })

  it('avançar avisa quando a cliente foi notificada', async () => {
    updateStatusMock.mockResolvedValue({ error: null, emailSent: true })
    renderPage()
    fireEvent.click(screen.getByText('Avançar mesmo assim'))

    await waitFor(() =>
      expect(toastSuccessMock).toHaveBeenCalledWith(
        'Status: Em Separação — a cliente foi avisada',
      ),
    )
  })
})

describe('o recado da cliente chega à tela (PED-11)', () => {
  it('aparece rotulado como recado, e não como nota interna', () => {
    // A coluna existe desde a migration inicial e nunca esteve em `DbOrder` — o que a cliente
    // escreveu no checkout não chegava a tela nenhuma.
    detailMock.mockReturnValue(
      detail({ order: order({ notes: 'Por favor, embale com cuidado.' }) }),
    )
    renderPage()

    expect(screen.getByText('Recado da cliente')).toBeInTheDocument()
    expect(screen.getByText('Por favor, embale com cuidado.')).toBeInTheDocument()
    expect(screen.getByText(/não é nota interna/)).toBeInTheDocument()
  })

  it('pedido sem recado não desenha o bloco vazio', () => {
    renderPage()
    expect(screen.queryByText('Recado da cliente')).not.toBeInTheDocument()
  })
})

describe('histórico é UM fluxo (PED-27, PED-28)', () => {
  it('funde status, e-mails e notas na mesma lista', () => {
    detailMock.mockReturnValue(
      detail({
        history: [
          { id: 'h1', order_id: 'o1', from_status: 'pending', to_status: 'paid', note: null, created_by: null, created_at: '2026-08-20T14:35:00Z' },
        ],
        emails: [
          { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-21T09:00:00Z', sent_at: '2026-08-21T09:00:00Z' },
        ],
        notes: [
          { id: 'n1', order_id: 'o1', note: 'Falei com ela no WhatsApp.', created_by: null, created_at: '2026-08-22T16:12:00Z' },
        ],
      }),
    )
    renderPage()

    const historico = screen.getByRole('tablist', { name: 'Filtrar histórico' }).parentElement!
      .parentElement!

    expect(within(historico).getByText('Pendente → Pago')).toBeInTheDocument()
    expect(within(historico).getByText('Aviso de postagem enviado')).toBeInTheDocument()
    expect(within(historico).getByText('Falei com ela no WhatsApp.')).toBeInTheDocument()
  })

  it('e-mail que NÃO saiu oferece reenviar', () => {
    detailMock.mockReturnValue(
      detail({
        emails: [
          { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'failed', attempts: 2, provider_message_id: null, error: 'SMTP timeout', created_at: '2026-08-21T09:00:00Z', sent_at: null },
        ],
      }),
    )
    renderPage()

    expect(screen.getByText('Falha ao enviar order_shipped')).toBeInTheDocument()
    expect(screen.getByText('SMTP timeout')).toBeInTheDocument()
    expect(screen.getByText('Reenviar')).toBeInTheDocument()
  })

  it('e-mail que saiu NÃO oferece reenviar', () => {
    detailMock.mockReturnValue(
      detail({
        emails: [
          { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'sent', attempts: 1, provider_message_id: 'x', error: null, created_at: '2026-08-21T09:00:00Z', sent_at: '2026-08-21T09:00:00Z' },
        ],
      }),
    )
    renderPage()

    expect(screen.queryByText('Reenviar')).not.toBeInTheDocument()
  })

  it('o reenvio que falha NÃO reverte estado — só informa (AD-008)', async () => {
    sendEmailMock.mockResolvedValue(false)
    detailMock.mockReturnValue(
      detail({
        emails: [
          { id: 'e1', order_id: 'o1', type: 'order_shipped', status: 'failed', attempts: 1, provider_message_id: null, error: 'timeout', created_at: '2026-08-21T09:00:00Z', sent_at: null },
        ],
      }),
    )
    renderPage()
    fireEvent.click(screen.getByText('Reenviar'))

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith('O reenvio não saiu. O estado do pedido não mudou.'),
    )
    expect(updateStatusMock).not.toHaveBeenCalled()
  })

  it('a nota interna é gravada e o campo esvazia', async () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nova nota interna'), {
      target: { value: 'Combinei de postar segunda' },
    })
    fireEvent.click(screen.getByText('Anotar'))

    await waitFor(() =>
      expect(addNoteMock).toHaveBeenCalledWith('o1', 'Combinei de postar segunda'),
    )
  })
})

describe('leitura de itens que falha NÃO vira "0 peças" (PED-08)', () => {
  it('a falha aparece como erro, e o cabeçalho para de prometer uma contagem', () => {
    // Um pedido sem itens é impossível: o checkout sempre os grava. Então "Itens · 0 peças" numa
    // tela de pedido pago é uma afirmação FALSA — e é o conteúdo que vai para a bancada na folha
    // de separação. Imprimir uma folha em branco parecia um pedido vazio.
    detailMock.mockReturnValue(detail({ items: [], itemsError: 'connection refused' }))
    renderPage()

    const alertas = screen.getAllByRole('alert')
    expect(alertas.some(a => a.textContent?.includes('connection refused'))).toBe(true)
    expect(screen.queryByText(/Itens · 0 peças/)).not.toBeInTheDocument()
  })

  it('zero itens SEM erro é anunciado como anomalia, não como estado normal', () => {
    detailMock.mockReturnValue(detail({ items: [], itemsError: null }))
    renderPage()

    expect(screen.getByText(/não tem itens gravados/)).toBeInTheDocument()
    expect(screen.getByText(/Não é um estado esperado/)).toBeInTheDocument()
  })

  it('com itens, nada de erro nem de anomalia — e a contagem volta', () => {
    renderPage()

    expect(screen.getByText('Itens · 1 peças')).toBeInTheDocument()
    expect(screen.queryByText(/não tem itens gravados/)).not.toBeInTheDocument()
  })
})

describe('cancelar declara o que NÃO faz (PED-31)', () => {
  it('o diálogo diz que não estorna e não repõe estoque', () => {
    renderPage()
    fireEvent.click(screen.getByText('Cancelar pedido'))

    expect(screen.getByText(/não estorna no Mercado Pago/)).toBeInTheDocument()
    expect(screen.getByText(/não repõe o estoque/)).toBeInTheDocument()
  })
})

describe('a ordem dos blocos é a da operação (D3)', () => {
  it('o material vem ANTES do próximo passo, dos itens e do histórico', () => {
    detailMock.mockReturnValue(detail({ order: order({ notes: null }) }))
    const { container } = renderPage()

    const texto = container.textContent ?? ''
    const posMaterial = texto.indexOf('Aguardando material')
    const posProximo = texto.indexOf('Próximo passo')
    const posItens = texto.indexOf('Itens ·')
    const posHistorico = texto.indexOf('Histórico')

    expect(posMaterial).toBeGreaterThanOrEqual(0)
    expect(posMaterial).toBeLessThan(posProximo)
    expect(posProximo).toBeLessThan(posItens)
    expect(posItens).toBeLessThan(posHistorico)
  })

  it('a gravação aparece com a contagem de caracteres — é o que vai para a bancada', () => {
    renderPage()
    expect(screen.getByText(/Sempre comigo, pai.*19 caracteres/)).toBeInTheDocument()
  })
})

describe('a peça do pedido tem cara e tem endereço', () => {
  // Os 59 itens vindos da Nuvemshop têm `product_image` VAZIO — o CSV de vendas não traz imagem —,
  // e a linha inteira saía com a moldura em branco. Quem separa o pedido lia o nome e imaginava a
  // peça, num catálogo em que "Redondo com Cinzas" tem sete variantes.

  // O nome da peça aparece DUAS vezes na tela — o card de material também o lista. As asserções de
  // "não virou link" precisam olhar o bloco de Itens, senão medem o outro bloco.
  const bloco = () => screen.getByRole('heading', { name: /^Itens/ }).closest('section') as HTMLElement

  const semSnapshot = () =>
    detail({
      items: [
        {
          id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Pingente Gota · Cinzas',
          quantity: 1, unit_price: 329, product_image: null,
        },
      ],
    })

  it('sem snapshot, a foto vem do catálogo — moldura vazia não diz qual peça é', () => {
    detailMock.mockReturnValue(semSnapshot())
    renderPage()

    expect(screen.getByAltText('Pingente Gota · Cinzas')).toHaveAttribute(
      'src',
      'https://cdn/p1.webp',
    )
  })

  it('o SNAPSHOT vence a foto de hoje — a bancada separa o que foi vendido', () => {
    // O contrário seria o defeito 01: a foto do pedido passaria a ter dois donos, e trocar a
    // imagem no cadastro mudaria, sem aviso, o que a folha de separação mostra de um pedido de
    // 2025. `product_image` é snapshot, e snapshot não se recalcula.
    detailMock.mockReturnValue(
      detail({
        items: [
          {
            id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Pingente Gota · Cinzas',
            quantity: 1, unit_price: 329, product_image: 'https://cdn/na-epoca.webp',
          },
        ],
      }),
    )
    renderPage()

    expect(screen.getByAltText('Pingente Gota · Cinzas')).toHaveAttribute(
      'src',
      'https://cdn/na-epoca.webp',
    )
  })

  it('sem snapshot e sem catálogo, sobra a moldura — nunca um `<img>` sem src', () => {
    detailMock.mockReturnValue(detail({ ...semSnapshot(), productRefs: {} }))
    renderPage()

    expect(screen.queryByAltText('Pingente Gota · Cinzas')).not.toBeInTheDocument()
  })

  it('o nome abre o CADASTRO do produto, em nova aba', () => {
    // O painel, e não a loja: quem separa precisa de estoque, variação e material exigido.
    renderPage()

    const link = screen.getByRole('link', { name: /Pingente Gota · Cinzas/ })
    expect(link).toHaveAttribute('href', '/admin/produtos/p1/editar')
    expect(link).toHaveAttribute('target', '_blank')
  })

  it('a rota do link é a MESMA que o router registra para editar produto', () => {
    // A régua não pode ser a string do componente: o segmento no SINGULAR casaria a asserção acima
    // e cairia na 404 do painel. Lê o `App.tsx` do disco.
    //
    // O caso não é escrito por extenso de propósito — `URL-01` proíbe a forma legada do endereço em
    // TODO arquivo de `apps/backoffice/src`, e um comentário que a cita derruba aquele guarda. É a
    // mesma disciplina de `CURATED_EXCLUDED`: descrever o caso sem escrever a string faz parte.
    const HERE = dirname(fileURLToPath(import.meta.url))
    const app = readFileSync(join(HERE, '../../app/App.tsx'), 'utf8')

    renderPage()
    const href = screen.getByRole('link', { name: /Pingente Gota/ }).getAttribute('href') ?? ''
    const padrao = href.replace('p1', ':id')

    expect(app).toContain(`path="${padrao}"`)
  })

  it('item ÓRFÃO do import não vira link morto — o nome fica texto', () => {
    // 35 dos 59 itens importados não casaram com o catálogo (`product_id` = `nuvemshop:<nome>`).
    // Não existe página para eles, e um link que abre 404 é pior que nome sem link.
    detailMock.mockReturnValue(detail({ productRefs: {} }))
    renderPage()

    expect(within(bloco()).queryByRole('link')).not.toBeInTheDocument()
    expect(within(bloco()).getByText('Pingente Gota · Cinzas')).toBeInTheDocument()
  })


})
