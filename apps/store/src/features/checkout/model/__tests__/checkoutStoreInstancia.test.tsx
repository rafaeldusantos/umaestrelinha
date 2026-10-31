import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import {
  CHECKOUT_STORAGE_KEY,
  CheckoutStoreProvider,
  createCheckoutStore,
  useCheckoutStore,
} from '../checkoutStore'
import ContactBlock from '../../ui/ContactBlock'

// Feature 89 · T21 — o rascunho do checkout por instância.
//
// O edge case da spec: "o link SHALL não tocar a sacola da cliente". Quem diz "este pedido é o da
// sacola" é o rascunho de `/checkout` (`OrderPaymentPage` esvazia a sacola quando o `orderId` dele
// é o pago). Então a página do pedido montado usa OUTRA instância, e as duas não podem se tocar —
// nem no estado, nem no `sessionStorage`, nem no `reset`.

vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({ setGuestEmail: vi.fn() }))
vi.mock('../../api/useAccountLookup', () => ({ useAccountLookup: () => ({ check: vi.fn() }) }))
vi.mock('../../ui/CheckoutSignInChallenge', () => ({ default: () => null }))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ customer: null }) }))

const OUTRA_CHAVE = 'estrelinha-teste-outra-instancia'

beforeEach(() => {
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
})

describe('createCheckoutStore — duas instâncias', () => {
  it('a escrita numa não aparece na outra, nem no rascunho de /checkout', () => {
    const a = createCheckoutStore(OUTRA_CHAVE)
    a.getState().setContact({ name: 'Proposta' })
    a.getState().setOrder('pedido-da-proposta', a.getState().draft())

    expect(useCheckoutStore.getState().contact.name).toBe('')
    expect(useCheckoutStore.getState().orderId).toBeNull()
    expect(a.getState().orderId).toBe('pedido-da-proposta')
  })

  it('cada uma persiste na chave dela', () => {
    const a = createCheckoutStore(OUTRA_CHAVE)
    a.getState().setContact({ name: 'Proposta' })
    useCheckoutStore.getState().setContact({ name: 'Sacola' })

    expect(JSON.parse(sessionStorage.getItem(OUTRA_CHAVE) ?? '{}').state.contact.name).toBe('Proposta')
    expect(JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY) ?? '{}').state.contact.name).toBe(
      'Sacola',
    )
  })

  it('o reset de uma apaga só a chave dela', () => {
    const a = createCheckoutStore(OUTRA_CHAVE)
    a.getState().setContact({ name: 'Proposta' })
    useCheckoutStore.getState().setContact({ name: 'Sacola' })
    useCheckoutStore.getState().setOrder('pedido-da-sacola', useCheckoutStore.getState().draft())

    a.getState().reset()

    expect(sessionStorage.getItem(OUTRA_CHAVE)).toBeNull()
    expect(sessionStorage.getItem(CHECKOUT_STORAGE_KEY)).not.toBeNull()
    expect(useCheckoutStore.getState().orderId).toBe('pedido-da-sacola')
    expect(useCheckoutStore.getState().contact.name).toBe('Sacola')
  })
})

describe('CheckoutStoreProvider — os blocos leem o rascunho do provider', () => {
  const contato = () => (
    <ContactBlock
      open
      complete={false}
      onEdit={() => {}}
      onContinue={() => {}}
      canContinue={false}
      challenging={false}
      onChallenge={() => {}}
    />
  )

  it('sob o provider, digitar escreve na instância dele e não no rascunho de /checkout', () => {
    const a = createCheckoutStore(OUTRA_CHAVE)
    a.getState().setContact({ name: 'Maria' })
    render(<CheckoutStoreProvider store={a}>{contato()}</CheckoutStoreProvider>)

    // O valor desenhado é o da instância.
    const nome = screen.getByLabelText('Nome completo') as HTMLInputElement
    expect(nome.value).toBe('Maria')

    fireEvent.change(nome, { target: { value: 'Maria Souza' } })
    expect(a.getState().contact.name).toBe('Maria Souza')
    expect(a.getState().dirty).toContain('contact')
    expect(useCheckoutStore.getState().contact.name).toBe('')
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })

  it('sem provider, o bloco segue no rascunho de /checkout (o de sempre)', () => {
    const a = createCheckoutStore(OUTRA_CHAVE)
    render(contato())

    fireEvent.change(screen.getByLabelText('Nome completo'), { target: { value: 'Ana' } })
    expect(useCheckoutStore.getState().contact.name).toBe('Ana')
    expect(a.getState().contact.name).toBe('')
  })
})
