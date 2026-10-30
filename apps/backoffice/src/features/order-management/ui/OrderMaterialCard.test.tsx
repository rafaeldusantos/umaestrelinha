// Feature 22 / T19 — o card de material no detalhe do pedido (MAT-05, MAT-08, MAT-10, MAT-11).
//
// O que este arquivo congela, além do layout:
//
// - **"a combinar", nunca lista vazia.** Um item que exige material sem dizer qual mostraria uma
//   linha em branco, que se lê como "nenhum material" — o oposto do que significa.
// - **A recusa mostra o MOTIVO.** Botão que some ou falha calada faz a Adri achar que clicou errado.
// - **O toast não alega e-mail enviado quando ele não saiu.**

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder, DbOrderItem } from '@estrelinha/supabase/types'
import {
  DEFAULT_NOTIFICATIONS,
  type NotificationEvent,
  type NotificationSettings,
} from '@estrelinha/core/notifications'
import { useGestoComAviso } from '@/features/order-notice'

const toastSuccess = vi.hoisted(() => vi.fn())
const toastError = vi.hoisted(() => vi.fn())
vi.mock('sonner', () => ({ toast: { success: toastSuccess, error: toastError } }))

import OrderMaterialCard from './OrderMaterialCard'

const order = (over: Partial<DbOrder> = {}): DbOrder =>
  ({
    id: 'ord-1', order_number: 'NP-1', customer_id: null, customer_name: 'Mariana',
    customer_email: 'm@x.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    mp_payment_id: null, mp_status_detail: null, paid_at: null, pix_discount: 0,
    address_street: null, address_number: null, address_neighborhood: null, address_city: null,
    address_state: null, address_zip: null, address_complement: null,
    subtotal: 100, discount: 0, shipping_cost: 0, total: 100,
    tracking_code: null, shipping_carrier: null, cancel_reason: null,
    melhor_envio_id: null, melhor_envio_label_url: null, melhor_envio_protocol: null,
    coupon_code: null, coupon_id: null, created_at: '2026-08-09T10:00:00Z',
    material_status: 'aguardando_material', material_tracking_code: null, material_received_at: null,
    ...over,
  }) as DbOrder

const item = (over: Partial<DbOrderItem> = {}): DbOrderItem =>
  ({
    id: 'it-1', order_id: 'ord-1', product_id: 'p1', product_name: 'Árvore da Vida',
    product_image: null, size: null, finish: null, variant_id: null, price_source: 'base',
    variant_label: null, variant_options: null, quantity: 1, unit_price: 100,
    requires_material: true, material_kinds: ['cabelo', 'coto_umbilical'], engraving_text: null,
    ...over,
  }) as DbOrderItem

const onSetStatus = vi.fn()
const onSetTracking = vi.fn()

/** As configurações com UM evento desligado — para os casos em que nenhum e-mail sai. */
const desligado = (event: NotificationEvent): NotificationSettings => ({
  ...DEFAULT_NOTIFICATIONS,
  events: {
    ...DEFAULT_NOTIFICATIONS.events,
    [event]: { email: { ...DEFAULT_NOTIFICATIONS.events[event].email, enabled: false } },
  },
})
/** E com um evento ligado (o envelope nasce desligado no padrão). */
const ligado = (event: NotificationEvent): NotificationSettings => ({
  ...DEFAULT_NOTIFICATIONS,
  events: {
    ...DEFAULT_NOTIFICATIONS.events,
    [event]: { email: { ...DEFAULT_NOTIFICATIONS.events[event].email, enabled: true } },
  },
})

/**
 * Feature `88`: o card descreve o gesto e a PÁGINA o roda (`useGestoComAviso`). O arnês monta o hook
 * de verdade, com o portão e o diálogo — a fiação pela página real é provada em
 * `AdminOrderPage.aviso.test.tsx`.
 */
const Arnes = ({
  o,
  items,
  settings,
  enviados,
}: {
  o: DbOrder
  items: DbOrderItem[]
  settings: NotificationSettings
  enviados: Set<NotificationEvent>
}) => {
  const g = useGestoComAviso({ settings, enviados })
  return (
    <>
      <div data-testid="card">
      <OrderMaterialCard
        order={o}
        items={items}
        onSetStatus={onSetStatus}
        onSetTracking={onSetTracking}
        acionar={g.acionar}
        pendente={g.pendente}
      />
      </div>
      {g.dialogo}
      {g.regiaoViva}
    </>
  )
}

const montar = (
  o = order(),
  items = [item()],
  settings: NotificationSettings = DEFAULT_NOTIFICATIONS,
  enviados = new Set<NotificationEvent>(),
) => render(<Arnes o={o} items={items} settings={settings} enviados={enviados} />)

/** Os tetos do diálogo de aviso. */
const dialogo = () => screen.getByRole('dialog')

beforeEach(() => {
  onSetStatus.mockReset().mockResolvedValue({ ok: true, reason: null, emailSent: true })
  onSetTracking.mockReset().mockResolvedValue({ ok: true, reason: null })
  toastSuccess.mockReset()
  toastError.mockReset()
})

describe('OrderMaterialCard — quando aparece', () => {
  it('pedido `nao_aplicavel` não ganha card', () => {
    montar(order({ material_status: 'nao_aplicavel' }))
    // O arnês monta também a região viva da página; o que se mede é o lugar do card.
    expect(screen.getByTestId('card')).toBeEmptyDOMElement()
  })

  it('pedido na fila mostra o estado e o que cada item espera', () => {
    montar()
    expect(screen.getByText('Aguardando material')).toBeInTheDocument()
    expect(screen.getByText(/aguarda: Mecha de cabelo e Coto umbilical/i)).toBeInTheDocument()
  })

  it('item que exige SEM dizer qual mostra "a combinar" — nunca linha em branco', () => {
    montar(order(), [item({ material_kinds: [] })])
    expect(screen.getByText(/aguarda: a combinar/i)).toBeInTheDocument()
  })

  it('mostra o texto de gravação, do snapshot do pedido', () => {
    montar(order(), [item({ engraving_text: 'Ana & Léo' })])
    expect(screen.getByText(/gravar em Árvore da Vida/i)).toBeInTheDocument()
    expect(screen.getByText(/Ana & Léo/)).toBeInTheDocument()
  })

  it('sem gravação, não abre a seção de gravação', () => {
    montar()
    expect(screen.queryByText(/gravar em/i)).not.toBeInTheDocument()
  })
})

describe('OrderMaterialCard — transição guardada (MAT-08)', () => {
  it('de `aguardando_material` o SALTO DIRETO para recebido está habilitado', () => {
    // É obrigatório, não atalho: informar o rastreio é opcional, então a maioria dos pedidos nunca
    // passa por `material_enviado`.
    montar()
    expect(screen.getByRole('button', { name: /marcar material como recebido/i })).not.toBeDisabled()
  })

  it('de `material_enviado` também dá para marcar recebido', () => {
    montar(order({ material_status: 'material_enviado' }))
    expect(screen.getByRole('button', { name: /marcar material como recebido/i })).not.toBeDisabled()
  })

  it('marcar recebido chama a transição com o alvo certo', async () => {
    // Feature `88`: "Material recebido no ateliê" nasce LIGADO, então o portão abre antes; a caixa
    // marcada confirma com `avisarCliente: true`.
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    expect(onSetStatus).not.toHaveBeenCalled()
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() => expect(onSetStatus).toHaveBeenCalledWith('ord-1', 'material_recebido', true))
  })

  it('de `aguardando_material` "em produção" está BLOQUEADO, com o motivo visível', () => {
    // Não pula etapa: o material precisa ser marcado como recebido antes.
    montar()
    const botao = screen.getByRole('button', { name: /colocar em produção/i })

    expect(botao).toBeDisabled()
    expect(botao).toHaveAttribute('title', expect.stringContaining('Material recebido'))
  })

  it('de `material_recebido` o botão de recebido fica bloqueado e explica', () => {
    montar(order({ material_status: 'material_recebido' }))
    const botao = screen.getByRole('button', { name: /marcar material como recebido/i })

    // Transição para o próprio estado é sucesso na regra (idempotência), mas repetir o clique não é
    // ação nenhuma — a tela não oferece.
    expect(botao).not.toBeDisabled()
    expect(screen.getByRole('button', { name: /colocar em produção/i })).not.toBeDisabled()
  })

  it('recusa do servidor vira toast com motivo, não silêncio', async () => {
    // Sem e-mail previsto o gesto grava direto, e a recusa vira toast.
    onSetStatus.mockResolvedValue({ ok: false, reason: 'invalid_transition', emailSent: false })
    montar(order(), [item()], desligado('material_received'))
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() => expect(toastError).toHaveBeenCalled())
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('recusa do servidor COM o diálogo aberto: o motivo fica no diálogo, e nada de sucesso', async () => {
    onSetStatus.mockResolvedValue({ ok: false, reason: 'invalid_transition', emailSent: false })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() =>
      expect(within(dialogo()).getByRole('alert')).toHaveTextContent('Não foi possível mudar o estado do material'),
    )
    expect(toastSuccess).not.toHaveBeenCalled()
  })
})

describe('OrderMaterialCard — o toast é honesto sobre o e-mail (MAT-09)', () => {
  it('e-mail enviado ⇒ o toast diz que a cliente foi avisada', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining('avisada por e-mail')),
    )
  })

  it('e-mail que NÃO saiu ⇒ o toast NÃO alega aviso, e o estado permanece', async () => {
    // Falha de e-mail não reverte estado (`AD-008`), mas mentir sobre o aviso faria a Adri deixar
    // de avisar por outro canal.
    //
    // Feature `88`: sem e-mail previsto, a frase diz que nenhum aviso sai — e continua sem alegar aviso.
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: false })
    montar(order(), [item()], desligado('material_received'))
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Material recebido · nenhum aviso sai nesta mudança'),
    )
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringContaining('avisada'))
    expect(toastSuccess).not.toHaveBeenCalledWith(expect.stringContaining('e-mail'))
  })

  it('caixa MARCADA e o e-mail que não saiu ⇒ "o e-mail não saiu", nunca "avisada"', async () => {
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: false })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Material recebido — o e-mail não saiu — o pedido foi alterado'),
    )
  })
})

describe('OrderMaterialCard — o rastreio da cliente pelo painel (MAT-11)', () => {
  it('o campo vem preenchido com o que já está gravado', () => {
    montar(order({ material_tracking_code: 'AA123456789BR' }))
    expect(screen.getByLabelText(/código de rastreio do envio da cliente/i)).toHaveValue(
      'AA123456789BR',
    )
  })

  it('salvar chama a mesma RPC da loja, pelo hook', async () => {
    montar()
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), {
      target: { value: 'aa1br' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(onSetTracking).toHaveBeenCalledWith('ord-1', 'AA1BR'))
  })

  it('código vazio deixa o botão desabilitado', () => {
    montar()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  })

  it('a tela diz que informar é opcional', () => {
    montar()
    expect(screen.getByText(/informar é opcional/i)).toBeInTheDocument()
  })
})

describe('OrderMaterialCard — pedido cancelado sai da fila (edge case)', () => {
  it('não oferece transição nem campo, e diz o que fazer com o material', () => {
    montar(order({ status: 'cancelled' }))

    expect(screen.queryByRole('button', { name: /marcar material como recebido/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/código de rastreio do envio/i)).not.toBeInTheDocument()
    expect(screen.getByText(/saiu da fila de material/i)).toBeInTheDocument()
    expect(screen.getByText(/devolva à cliente/i)).toBeInTheDocument()
  })

  it('a frase é a do app do ateliê, palavra por palavra (feature 82, ENV-26 — `MATERIAL_CANCELLED_NOTE`)', () => {
    montar(order({ status: 'cancelled' }))
    // Escrita por extenso: ler a constante aqui provaria que ela é igual a si mesma.
    expect(
      screen.getByText(
        'Pedido cancelado, saiu da fila de material. Se o envelope já tiver chegado, devolva à cliente.',
      ),
    ).toBeInTheDocument()
  })
})

describe('feature 88 · T15 — o portão de aviso nos três gestos do material', () => {
  it('com e-mail previsto, o portão abre ANTES de qualquer escrita, nomeando o e-mail e a cliente', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    expect(onSetStatus).not.toHaveBeenCalled()
    expect(within(dialogo()).getByText('Material recebido no ateliê')).toBeInTheDocument()
    expect(within(dialogo()).getByText('Para m@x.com:')).toBeInTheDocument()
    expect(within(dialogo()).getByRole('checkbox')).toBeChecked()
  })

  it('desmarcar a caixa e confirmar ⇒ `avisarCliente: false` por valor, e a frase decide-se pela caixa', async () => {
    // O motor pode responder `sent: true` pelo aviso da DONA: a frase não pode dizer "avisada".
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: true })
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Registrar recebimento' }))

    await waitFor(() => expect(onSetStatus).toHaveBeenCalledWith('ord-1', 'material_recebido', false))
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Material recebido · sem e-mail à cliente (anotado no histórico)'),
    )
  })

  it('"Voltar" no diálogo ⇒ nenhuma escrita', async () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Voltar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(onSetStatus).not.toHaveBeenCalled()
    expect(toastSuccess).not.toHaveBeenCalled()
  })

  it('sem e-mail previsto ("Peça em produção" nasce desligado) grava DIRETO, com dois argumentos, e diz por quê', async () => {
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: false })
    montar(order({ material_status: 'material_recebido' }))
    fireEvent.click(screen.getByRole('button', { name: /colocar em produção/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(onSetStatus).toHaveBeenCalled())
    expect(onSetStatus.mock.calls[0]).toEqual(['ord-1', 'em_producao'])
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith('Pedido em produção · nenhum aviso sai nesta mudança'),
    )
  })

  it('o e-mail já enviado antes ⇒ sem diálogo, e o resultado diz que não sai de novo (A-01)', async () => {
    onSetStatus.mockResolvedValue({ ok: true, reason: null, emailSent: false })
    montar(order({ material_status: 'material_enviado' }), [item()], DEFAULT_NOTIFICATIONS, new Set(['material_received']))
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() =>
      expect(toastSuccess).toHaveBeenCalledWith(
        'Material recebido · “Material recebido no ateliê” já tinha sido enviado, não sai de novo',
      ),
    )
  })

  it('o envelope: com o e-mail ligado, o portão abre COM a nota da dona; `onSetTracking` recebe a escolha', async () => {
    montar(order(), [item()], ligado('material_tracking_registered'))
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), { target: { value: 'aa1br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSetTracking).not.toHaveBeenCalled()
    expect(within(dialogo()).getByText('Rastreio do material registrado')).toBeInTheDocument()
    expect(within(dialogo()).getByText(/O aviso “Material a caminho”, para você, não depende desta caixa/)).toBeInTheDocument()

    fireEvent.click(within(dialogo()).getByRole('checkbox'))
    fireEvent.click(within(dialogo()).getByRole('button', { name: 'Salvar código' }))
    await waitFor(() => expect(onSetTracking).toHaveBeenCalledWith('ord-1', 'AA1BR', false))
  })

  it('a nota da dona NÃO aparece num gatilho que só avisa a cliente (decidida por público, não por gesto)', () => {
    montar()
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))
    expect(within(dialogo()).queryByText(/para você, não depende desta caixa/)).not.toBeInTheDocument()
  })
})

describe('feature 88 · T15 — cada botão mostra o próprio trabalho (CRG-01, CRG-02, CRG-05)', () => {
  it('gravando o recebimento: o botão diz "Registrando recebimento…" com aria-busy, e os outros ficam desabilitados', async () => {
    let terminar!: (v: unknown) => void
    onSetStatus.mockReturnValue(new Promise(r => { terminar = r }))
    montar(order({ material_tracking_code: 'AA1BR' }), [item()], desligado('material_received'))
    fireEvent.click(screen.getByRole('button', { name: /marcar material como recebido/i }))

    const botao = await screen.findByRole('button', { name: /Registrando recebimento…/ })
    expect(botao).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Salvar' })).not.toHaveAttribute('aria-busy')

    terminar({ ok: true, reason: null, emailSent: false })
    await waitFor(() => expect(screen.getByRole('button', { name: /marcar material como recebido/i })).not.toHaveAttribute('aria-busy'))
  })

  it('salvando o envelope: "Salvando código…" no botão Salvar', async () => {
    let terminar!: (v: unknown) => void
    onSetTracking.mockReturnValue(new Promise(r => { terminar = r }))
    montar()
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), { target: { value: 'aa1br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(await screen.findByRole('button', { name: /Salvando código…/ })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: /marcar material como recebido/i })).toBeDisabled()
    terminar({ ok: true, reason: null })
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled())
  })

  it('o código do envelope que falhou CONTINUA no campo, e o erro diz o que não mudou', async () => {
    onSetTracking.mockResolvedValue({ ok: false, reason: 'rpc_failed' })
    montar()
    fireEvent.change(screen.getByLabelText(/código de rastreio do envio da cliente/i), { target: { value: 'aa1br' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('O código do envelope não foi salvo. Tente de novo.'))
    expect(screen.getByLabelText(/código de rastreio do envio da cliente/i)).toHaveValue('AA1BR')
  })
})
