import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { isPaymentComplete } from '@estrelinha/core/checkout'
import { useCheckoutStore } from '../../model/checkoutStore'
import PaymentBlock, {
  DOC_ERROR_MESSAGE,
  DOC_FIELD_LABEL,
  CPF_JUSTIFICATION,
  NO_METHOD_MESSAGE,
} from '../PaymentBlock'

/* eslint-disable @typescript-eslint/no-explicit-any */

// PGD-01: campo do documento obrigatório com máscara e justificativa.
// PGD-02/DOC-02: documento inválido → mensagem no campo e bloco Pagamento incompleto.
// PGD-06: documento pré-preenchido de `customers.cpf`.
// CHK-03: o método guardado é sempre um habilitado nas settings (carry-forward #5).
// PGM-01 … PGM-04: cards do mesmo tamanho, marca do PIX e uma superfície por método.
// Toggle filtrado por settings + fallback: coberto antes por `PaymentStep.test.tsx`, migrado aqui.

vi.mock('../PixPayment', () => ({
  default: ({ orderId, amount }: any) => (
    <div data-testid="pix-payment" data-order={orderId} data-amount={amount} />
  ),
}))
vi.mock('../CardPaymentBrick', () => ({
  default: ({ amount, payerEmail, payerDocument, errorMessage }: any) => (
    <div
      data-testid="card-brick"
      data-amount={amount}
      data-email={payerEmail}
      data-document={payerDocument}
      data-error={errorMessage}
    />
  ),
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

const authState: { customer: { id: string; cpf?: string } | null } = { customer: { id: 'c1' } }
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))

const CPF_VALIDO = '390.533.447-05'

const onEdit = vi.fn()
const onApproved = vi.fn()

const renderBlock = (props: Partial<Parameters<typeof PaymentBlock>[0]> = {}) =>
  render(
    <PaymentBlock
      open
      complete={false}
      onEdit={onEdit}
      orderId={null}
      amount={100}
      onApproved={onApproved}
      {...props}
    />,
  )

beforeEach(() => {
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  onEdit.mockClear()
  onApproved.mockClear()
  paymentSettings.pix_enabled = true
  paymentSettings.card_enabled = true
  paymentSettings.pix_discount_percent = 5
  authState.customer = { id: 'c1' }
})

describe('PaymentBlock — métodos filtrados pelas settings (CHK-03)', () => {
  it('com os dois habilitados começa no PIX e o clique troca para cartão', () => {
    renderBlock()

    expect(useCheckoutStore.getState().payment.method).toBe('pix')

    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }))

    expect(useCheckoutStore.getState().payment.method).toBe('card')
  })

  it('pix_enabled=false esconde o card do PIX e o método cai para cartão', () => {
    paymentSettings.pix_enabled = false
    renderBlock()

    expect(screen.queryByRole('button', { name: /^pix/i })).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().payment.method).toBe('card')
  })

  it('card_enabled=false esconde o card do cartão e o método cai para PIX', () => {
    paymentSettings.card_enabled = false
    useCheckoutStore.getState().setPayment({ method: 'card' })
    renderBlock()

    expect(screen.queryByRole('button', { name: /cartão de crédito/i })).not.toBeInTheDocument()
    expect(useCheckoutStore.getState().payment.method).toBe('pix')
  })

  it('nenhum método habilitado: aviso na tela, método nulo e bloco incompleto', () => {
    paymentSettings.pix_enabled = false
    paymentSettings.card_enabled = false
    useCheckoutStore.getState().setPayment({ method: 'pix', cpf: CPF_VALIDO })
    renderBlock()

    expect(screen.getByRole('alert')).toHaveTextContent(NO_METHOD_MESSAGE)
    expect(useCheckoutStore.getState().payment.method).toBeNull()
    expect(isPaymentComplete(useCheckoutStore.getState().payment)).toBe(false)
  })

  it('badge de desconto aparece no card do PIX quando pix_discount_percent > 0', () => {
    renderBlock()

    expect(screen.getByText('−5%')).toBeInTheDocument()
  })

  it('pix_discount_percent = 0 não exibe badge de desconto', () => {
    paymentSettings.pix_discount_percent = 0
    renderBlock()

    expect(screen.queryByText(/−\d+%/)).not.toBeInTheDocument()
  })
})

describe('PaymentBlock — cards de método (PGM-01, PGM-02)', () => {
  const methodCard = (name: RegExp) => screen.getByRole('button', { name })

  it('os dois cards têm a mesma base de flex — nenhum com basis automático (PGM-01)', () => {
    renderBlock()

    const pix = methodCard(/^pix/i)
    const card = methodCard(/cartão de crédito/i)

    // `grow` sozinho reparte o espaço SOBRANDO a partir do conteúdo: o rótulo mais longo fica
    // com o card mais largo. `basis-0` zera essa base e os dois terminam iguais.
    expect(pix.className).toContain('basis-0')
    expect(card.className).toContain('basis-0')
    expect(pix.className).toContain('grow')
    expect(card.className).toContain('grow')
  })

  it('o card do PIX usa a marca do PIX, herdando a cor por currentColor (PGM-02)', () => {
    renderBlock()

    const icon = methodCard(/^pix/i).querySelector('svg')
    expect(icon).not.toBeNull()
    expect(icon!.getAttribute('viewBox')).toBe('0 0 16 16')
    expect(icon!.getAttribute('fill')).toBe('currentColor')
    // o `QrCode` do lucide (viewBox 0 0 24 24, classe `lucide-qr-code`) saiu de cena
    expect(icon!.getAttribute('class')).not.toMatch(/lucide/)
    expect(icon!.querySelectorAll('path')).toHaveLength(2)
  })
})

describe('PaymentBlock — CPF do pagador (PGD-01, PGD-02, PGD-06)', () => {
  it('exibe o campo obrigatório com a justificativa ao lado', () => {
    renderBlock()

    const field = screen.getByLabelText(DOC_FIELD_LABEL)
    expect(field).toBeRequired()
    expect(screen.getByText(CPF_JUSTIFICATION)).toBeInTheDocument()
  })

  it('aplica a máscara 000.000.000-00 ao digitar', () => {
    renderBlock()

    fireEvent.change(screen.getByLabelText(DOC_FIELD_LABEL), { target: { value: '39053344705' } })

    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toHaveValue('390.533.447-05')
    expect(useCheckoutStore.getState().payment.cpf).toBe('390.533.447-05')
  })

  it('CPF inválido exibe mensagem no campo e mantém o bloco incompleto', () => {
    renderBlock()

    fireEvent.change(screen.getByLabelText(DOC_FIELD_LABEL), { target: { value: '11111111111' } })

    expect(screen.getByRole('alert')).toHaveTextContent(DOC_ERROR_MESSAGE)
    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toHaveAttribute('aria-invalid', 'true')
    expect(isPaymentComplete(useCheckoutStore.getState().payment)).toBe(false)
  })

  it('CPF válido não exibe mensagem e completa o bloco', () => {
    renderBlock()

    fireEvent.change(screen.getByLabelText(DOC_FIELD_LABEL), { target: { value: '39053344705' } })

    expect(screen.queryByText(DOC_ERROR_MESSAGE)).not.toBeInTheDocument()
    expect(isPaymentComplete(useCheckoutStore.getState().payment)).toBe(true)
  })

  it('CPF vem pré-preenchido de customers.cpf quando existir (PGD-06)', () => {
    authState.customer = { id: 'c1', cpf: '39053344705' }
    renderBlock()

    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toHaveValue('390.533.447-05')
  })

  it('CPF já digitado no rascunho vence o de customers.cpf', () => {
    authState.customer = { id: 'c1', cpf: '39053344705' }
    useCheckoutStore.getState().setPayment({ cpf: '111.444.777-35' })
    renderBlock()

    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toHaveValue('111.444.777-35')
  })
})

describe('PaymentBlock — superfície de pagamento e colapso', () => {
  it('com orderId e método pix monta o PixPayment do pedido com o valor a pagar (CNF-01)', () => {
    renderBlock({ orderId: 'order-1', amount: 46.55 })

    const pix = screen.getByTestId('pix-payment')
    expect(pix.getAttribute('data-order')).toBe('order-1')
    expect(pix.getAttribute('data-amount')).toBe('46.55')
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
  })

  // PGM-08: o pedido criado NÃO troca o bloco no cartão — o Brick fica montado com o formulário
  // preenchido e o token, que é o que permite retentar uma recusa sem recomeçar.
  it('com orderId e método card o Brick segue montado com o valor do pedido', () => {
    useCheckoutStore.getState().setPayment({ method: 'card' })
    renderBlock({ orderId: 'order-1', amount: 49 })

    expect(screen.getByTestId('card-brick').getAttribute('data-amount')).toBe('49')
    expect(screen.queryByTestId('pix-payment')).not.toBeInTheDocument()
  })

  it('com orderId a superfície aparece mesmo com o bloco colapsado', () => {
    renderBlock({ orderId: 'order-1', open: false, complete: true })

    expect(screen.getByTestId('pix-payment')).toBeInTheDocument()
  })

  it('colapsado sem pedido exibe o método, o CPF e a ação Alterar', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix', cpf: CPF_VALIDO })
    renderBlock({ open: false, complete: true })

    expect(screen.getByText(`PIX · CPF ${CPF_VALIDO}`)).toBeInTheDocument()
    expect(screen.queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })
})

describe('PaymentBlock — uma superfície por método (PGM-03, PGM-04, PGM-09)', () => {
  const CNPJ_VALIDO = '11.222.333/0001-81'

  it('PIX: campo de documento presente e formulário de cartão ausente (PGM-03)', () => {
    renderBlock()

    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
  })

  it('Cartão: formulário presente ANTES de existir pedido e sem campo de documento (PGM-04)', () => {
    renderBlock({ orderId: null })

    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }))

    expect(screen.getByTestId('card-brick')).toBeInTheDocument()
    expect(screen.queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
  })

  it('trocar de método desmonta a superfície anterior (PGM-09)', () => {
    renderBlock()

    fireEvent.click(screen.getByRole('button', { name: /cartão de crédito/i }))
    expect(screen.queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^pix/i }))
    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toBeInTheDocument()
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
  })

  it('o Brick recebe o e-mail do bloco Contato — é ele que apaga o campo de e-mail (PGM-05)', () => {
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
    useCheckoutStore.getState().setPayment({ method: 'card' })
    renderBlock()

    expect(screen.getByTestId('card-brick').getAttribute('data-email')).toBe('marina@email.com')
  })

  it('nenhum método habilitado não monta superfície nenhuma', () => {
    paymentSettings.pix_enabled = false
    paymentSettings.card_enabled = false
    renderBlock()

    expect(screen.queryByLabelText(DOC_FIELD_LABEL)).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-brick')).not.toBeInTheDocument()
  })

  /**
   * O bloco 3 é o último: quem o "continua" é o CTA de finalizar. Um `Continuar` aqui seria
   * justamente o **segundo botão** que esta feature veio eliminar do caminho do cartão — e sem
   * esta asserção nada impediria alguém de acrescentá-lo por simetria com os blocos 1 e 2.
   * Vale para os dois métodos e também com o pedido já criado.
   */
  it.each([
    ['pix' as const, null],
    ['card' as const, null],
    ['pix' as const, 'o1'],
    ['card' as const, 'o1'],
  ])('Pagamento nunca ganha um botão Continuar — método %s, pedido %s', (method, order) => {
    useCheckoutStore.getState().setPayment({ method })
    renderBlock({ orderId: order })

    expect(screen.queryByRole('button', { name: /continuar/i })).not.toBeInTheDocument()
  })

  it('digitar o 12º dígito alterna a máscara para CNPJ (DOC-01)', () => {
    renderBlock()
    const field = () => screen.getByLabelText(DOC_FIELD_LABEL)

    fireEvent.change(field(), { target: { value: '11222333000' } })
    expect(field()).toHaveValue('112.223.330-00')

    fireEvent.change(field(), { target: { value: '112223330001' } })
    expect(field()).toHaveValue('11.222.333/0001')
  })

  it('CNPJ válido completa o bloco de Pagamento (DOC-02)', () => {
    renderBlock()

    fireEvent.change(screen.getByLabelText(DOC_FIELD_LABEL), {
      target: { value: '11222333000181' },
    })

    expect(screen.getByLabelText(DOC_FIELD_LABEL)).toHaveValue(CNPJ_VALIDO)
    expect(screen.queryByText(DOC_ERROR_MESSAGE)).not.toBeInTheDocument()
    expect(isPaymentComplete(useCheckoutStore.getState().payment)).toBe(true)
  })

  it('colapsado no CNPJ a linha diz CNPJ, não CPF', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix', cpf: CNPJ_VALIDO })
    renderBlock({ open: false, complete: true })

    expect(screen.getByText(`PIX · CNPJ ${CNPJ_VALIDO}`)).toBeInTheDocument()
  })

  // O cartão não guarda documento no rascunho (ele vem do Brick, DOC-05): escrever "· CPF" ali
  // exibiria rótulo no lugar de valor — BUG-20260728-bloco-vazio-parece-preenchido.
  it('colapsado no cartão a linha não monta "· CPF"', () => {
    useCheckoutStore.getState().setPayment({ method: 'card' })
    renderBlock({ open: false, complete: true })

    expect(screen.getByText('Cartão de crédito')).toBeInTheDocument()
    expect(screen.queryByText(/CPF/)).not.toBeInTheDocument()
  })
})

describe('PaymentBlock — paleta (CHK-04 / DESIGN.md §8)', () => {
  it('aberto: nenhum elemento com bg-nanita-jam', () => {
    const { container } = renderBlock()

    expect(container.querySelectorAll('[class*="bg-nanita-jam"]')).toHaveLength(0)
  })

  it('CPF inválido: nenhuma classe de cor fora da paleta Nanita', () => {
    const { container } = renderBlock()
    fireEvent.change(screen.getByLabelText(DOC_FIELD_LABEL), { target: { value: '11111111111' } })

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

// ── Correções do ciclo de QA 2026-07-28 ───────────────────────────────────────
// `resolveInstallments` saiu daqui para `@estrelinha/core/payment/installments` (a sub-linha do resumo
// e a página do produto usam a mesma conta); a suíte dele mora em
// `packages/core/src/payment/__tests__/installments.test.ts`.
import { PAYMENT_EMPTY_SUMMARY } from '../PaymentBlock'

describe('PaymentBlock — bloco vazio não se apresenta como pronto (BUG-20260728-bloco-vazio-parece-preenchido)', () => {
  it('colapsado e incompleto: mostra o convite, nunca "PIX · CPF" com o rótulo no lugar do valor', () => {
    renderBlock({ open: false, complete: false })

    expect(screen.getByText(PAYMENT_EMPTY_SUMMARY)).toBeInTheDocument()
    expect(screen.queryByText(/·\s*CPF\s*$/)).not.toBeInTheDocument()
  })

  it('colapsado e incompleto: a ação diz "Preencher", não "Alterar"', () => {
    renderBlock({ open: false, complete: false })

    expect(screen.getByRole('button', { name: 'Preencher' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Alterar' })).not.toBeInTheDocument()
  })

  it('a ação tem alvo de toque de 44px (BUG-20260728-alterar-alvo-de-toque-28px)', () => {
    renderBlock({ open: false, complete: false })

    // jsdom não faz layout: a asserção é sobre a classe que garante os 44px.
    // A medição real (getBoundingClientRect em 390x844) fica no roteiro de re-caminhada.
    expect(screen.getByRole('button', { name: 'Preencher' }).className).toContain('min-h-11')
  })
})
