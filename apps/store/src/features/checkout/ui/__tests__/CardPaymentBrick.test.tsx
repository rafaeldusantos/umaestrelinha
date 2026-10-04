import { afterEach, describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import CardPaymentBrick from '../CardPaymentBrick'
import { useCheckoutStore } from '../../model/checkoutStore'

/* eslint-disable @typescript-eslint/no-explicit-any */

// O Brick virou **superfície**: ele desenha o formulário e nada mais. Quem tokeniza, cria o pedido
// e cobra é o CTA único da página (PGM-05, PGM-06) — a prova de recusa (PAY-02), de aprovação e de
// falha do `create-payment` (PAY-09) vive em `pages/__tests__/CheckoutPage.test.tsx`.

// Mock do Brick: só captura as props. Não há botão de submit — é justamente isso que PGM-05 pede.
let capturedProps: any = null
vi.mock('@mercadopago/sdk-react', () => ({
  CardPayment: (props: any) => {
    capturedProps = props
    return <div data-testid="mp-card-payment" />
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))

const renderBrick = (props: Partial<Parameters<typeof CardPaymentBrick>[0]> = {}) =>
  render(
    <CardPaymentBrick amount={100} payerEmail="marina@email.com" errorMessage={null} {...props} />,
  )

beforeEach(() => {
  capturedProps = null
  delete (window as any).cardPaymentBrickController
})

describe('CardPaymentBrick — superfície do cartão', () => {
  it('não renderiza nenhum input próprio de PAN/CVV/validade (PAY-01)', () => {
    const { container } = renderBrick()
    expect(container.querySelectorAll('input').length).toBe(0)
  })

  it('inicializa o Brick com amount e parcelas limitadas pelas settings (PAY-15)', () => {
    renderBrick({ amount: 30 })
    expect(capturedProps.initialization.amount).toBe(30)
    // max_installments=6, min_installment_value=10 → floor(30/10)=3
    expect(capturedProps.customization.paymentMethods.maxInstallments).toBe(3)
  })

  it('desmonta o Brick via cardPaymentBrickController no unmount (PGM-09)', () => {
    const unmountController = vi.fn()
    ;(window as any).cardPaymentBrickController = { unmount: unmountController }

    const { unmount } = renderBrick()
    unmount()

    expect(unmountController).toHaveBeenCalledTimes(1)
  })
})

describe('CardPaymentBrick — sem botão próprio e sem campo de e-mail (PGM-05)', () => {
  it('esconde o botão de pagar do Brick — o CTA da página é o único', () => {
    renderBrick()

    expect(capturedProps.customization.visual.hidePaymentButton).toBe(true)
  })

  it('esconde o título do Brick (o bloco 3 já se chama "Pagamento")', () => {
    renderBrick()

    expect(capturedProps.customization.visual.hideFormTitle).toBe(true)
  })

  // "Brick will hide email field if this value is correctly filled" — é este o mecanismo.
  it('leva o e-mail do bloco Contato para o payer, e é isso que apaga o campo de e-mail', () => {
    renderBrick({ payerEmail: 'marina@email.com' })

    expect(capturedProps.initialization.payer.email).toBe('marina@email.com')
  })

  it('prefill do documento: CPF conhecido vira identification type CPF só com dígitos', () => {
    renderBrick({ payerDocument: '390.533.447-05' })

    expect(capturedProps.initialization.payer.identification).toEqual({
      type: 'CPF',
      number: '39053344705',
    })
  })

  it('prefill do documento: 14 dígitos viram identification type CNPJ', () => {
    renderBrick({ payerDocument: '11.222.333/0001-81' })

    expect(capturedProps.initialization.payer.identification).toEqual({
      type: 'CNPJ',
      number: '11222333000181',
    })
  })

  it('sem documento conhecido o payer vai sem identification — o Brick pede no formulário', () => {
    renderBrick()

    expect(capturedProps.initialization.payer.identification).toBeUndefined()
  })
})

describe('CardPaymentBrick — mensagem de erro por prop (PAY-02, CNF-06)', () => {
  it('sem erro não há alerta na superfície', () => {
    renderBrick()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('a mensagem de recusa recebida por prop aparece em geleia sobre pó de açúcar', () => {
    const { container } = renderBrick({ errorMessage: 'Saldo insuficiente no cartão.' })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Saldo insuficiente no cartão.')
    expect(alert).toHaveClass('text-estrelinha-primary')
    expect(alert).toHaveClass('bg-estrelinha-ground-deep')
    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

/**
 * O sinal que destrava "Pagar" no cartão (2026-10-04). O SDK não tem evento de validade do
 * formulário; o único sinal enquanto a pessoa digita é `onBinChange`, o número reconhecido.
 */
describe('CardPaymentBrick — o número reconhecido chega ao checkout', () => {
  beforeEach(() => useCheckoutStore.getState().reset())
  const reconhecido = () => useCheckoutStore.getState().cardNumberRecognized

  it('nasce não reconhecido', () => {
    renderBrick()
    expect(reconhecido()).toBe(false)
  })

  it('BIN de 6 dígitos ou mais marca o número como reconhecido', () => {
    renderBrick()
    act(() => capturedProps.onBinChange('411111'))
    expect(reconhecido()).toBe(true)
  })

  it('BIN curto, vazio ou ausente desmarca — o número foi apagado ou está incompleto', () => {
    renderBrick()
    act(() => capturedProps.onBinChange('41111111'))
    act(() => capturedProps.onBinChange('4111'))
    expect(reconhecido()).toBe(false)

    act(() => capturedProps.onBinChange('41111111'))
    act(() => capturedProps.onBinChange(undefined))
    expect(reconhecido()).toBe(false)
  })

  it('desmontar (trocar de método, fechar o bloco) derruba o sinal — o Brick volta vazio', () => {
    const { unmount } = renderBrick()
    act(() => capturedProps.onBinChange('41111111'))
    unmount()
    expect(reconhecido()).toBe(false)
  })

  it('valor novo recria o Brick e derruba o sinal — o cartão digitado se perde', () => {
    const { rerender } = renderBrick({ amount: 100 })
    act(() => capturedProps.onBinChange('41111111'))
    expect(reconhecido()).toBe(true)

    rerender(<CardPaymentBrick amount={120} payerEmail="marina@email.com" errorMessage={null} />)
    expect(reconhecido()).toBe(false)
  })

  it('o sinal NÃO entra no rascunho — digitar o cartão não invalida o pedido em curso (CHK-08)', () => {
    renderBrick()
    const antes = JSON.stringify(useCheckoutStore.getState().draft())
    act(() => capturedProps.onBinChange('41111111'))
    expect(JSON.stringify(useCheckoutStore.getState().draft())).toBe(antes)
  })
})

/**
 * BUG-20261004-brick-recriado-a-cada-render.
 *
 * O `CardPayment` do SDK recria o Brick — e esvazia o cartão digitado — sempre que muda a
 * IDENTIDADE de `initialization`, `customization`, `onBinChange`, `onReady`, `onError` ou
 * `onSubmit` (é a lista de dependências do `useEffect` dele, em `@mercadopago/sdk-react` 1.0.7).
 * Objeto literal ou função inline no JSX é uma identidade nova por render. Em produção isso apagava
 * o cartão ao digitar o número (o sinal de BIN renderiza a página) e ao clicar em "Pagar" (o
 * `setBusy` também). A régua aqui é a do SDK: `toBe`, nunca `toEqual`.
 */
describe('CardPaymentBrick — renderizar de novo NÃO recria o Brick', () => {
  const DEPENDENCIAS_DO_SDK = [
    'initialization',
    'customization',
    'onBinChange',
    'onReady',
    'onError',
    'onSubmit',
  ] as const
  const congelar = () => Object.fromEntries(DEPENDENCIAS_DO_SDK.map((k) => [k, capturedProps[k]]))
  const props = { amount: 100, payerEmail: 'marina@email.com' }

  it('a mensagem de erro mudar (o CTA terminou uma tentativa) mantém a identidade de todas', () => {
    const { rerender } = render(<CardPaymentBrick {...props} errorMessage={null} />)
    const antes = congelar()

    rerender(<CardPaymentBrick {...props} errorMessage="Saldo insuficiente no cartão." />)

    for (const k of DEPENDENCIAS_DO_SDK) expect(capturedProps[k], k).toBe(antes[k])
  })

  it('o pai renderizar de novo com as MESMAS props mantém a identidade de todas', () => {
    const { rerender } = render(<CardPaymentBrick {...props} errorMessage={null} />)
    const antes = congelar()

    rerender(<CardPaymentBrick {...props} errorMessage={null} />)

    for (const k of DEPENDENCIAS_DO_SDK) expect(capturedProps[k], k).toBe(antes[k])
  })

  it('o número reconhecido chegar ao store mantém a identidade de todas', () => {
    useCheckoutStore.getState().reset()
    render(<CardPaymentBrick {...props} errorMessage={null} />)
    const antes = congelar()

    act(() => capturedProps.onBinChange('42356477'))

    expect(useCheckoutStore.getState().cardNumberRecognized).toBe(true)
    for (const k of DEPENDENCIAS_DO_SDK) expect(capturedProps[k], k).toBe(antes[k])
  })

  it('o valor mudar AINDA recria — é o caso legítimo, o Brick precisa do valor novo', () => {
    const { rerender } = render(<CardPaymentBrick {...props} errorMessage={null} />)
    const antes = capturedProps.initialization

    rerender(<CardPaymentBrick {...props} amount={120} errorMessage={null} />)

    expect(capturedProps.initialization).not.toBe(antes)
  })
})

/**
 * BUG-20261004-brick-com-cor-da-loja-anterior: o formulário de cartão pintava foco e seleção em
 * `#B0176B` — o magenta da loja anterior, escrito à mão no componente. O dono da paleta é
 * `App.css` (`--estrelinha-primary`, guardado por `palette.test.ts`); o Brick lê de lá.
 */
describe('CardPaymentBrick — a cor do formulário é a da marca', () => {
  afterEach(() => document.documentElement.style.removeProperty('--estrelinha-primary'))

  it('o `baseColor` vem de `--estrelinha-primary`, o token da loja', () => {
    document.documentElement.style.setProperty('--estrelinha-primary', '#34495e')
    renderBrick()

    expect(capturedProps.customization.visual.style.customVariables.baseColor).toBe('#34495e')
  })

  it('nunca o magenta da loja anterior', () => {
    document.documentElement.style.setProperty('--estrelinha-primary', '#34495e')
    renderBrick()

    expect(capturedProps.customization.visual.style.customVariables.baseColor).not.toMatch(/b0176b/i)
  })
})
