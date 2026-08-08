import { beforeEach, describe, expect, it } from 'vitest'
import type { CheckoutDraft } from '@estrelinha/core/checkout'
import { CHECKOUT_STORAGE_KEY, useCheckoutStore } from '../checkoutStore'

// CHK-07: o `order_id` em curso sobrevive ao reload (sessionStorage) e é reusado sem edição.
// CHK-08: qualquer edição que afete a cobrança marca o pedido em curso como obsoleto.
// CHK-03/CHK-04: `blocks()` delega ao domínio puro — aqui só se prova a delegação.
// FLW-01/FLW-04: `dirty` guarda o que a pessoa editou; NÃO é persistido e some no `reset`.

const CPF_VALIDO = '39053344705'

const completeDraft = (): CheckoutDraft => ({
  contact: { name: 'Marina', email: 'marina@email.com', whatsapp: '11987654321', consent: false },
  address: {
    cep: '01310100',
    street: 'Av. Paulista',
    number: '1000',
    complement: '',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  },
  shipping: {
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 21.5,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  },
  payment: { method: 'pix', cpf: CPF_VALIDO },
  bumpChecked: false,
})

/** Preenche o store com um rascunho completo, sem passar pelo `persist` de sessões anteriores. */
const fill = (draft: CheckoutDraft = completeDraft()) => {
  const s = useCheckoutStore.getState()
  s.setContact(draft.contact)
  s.setAddress(draft.address)
  s.setShipping(draft.shipping)
  s.setPayment(draft.payment)
  s.toggleBump(draft.bumpChecked)
}

beforeEach(() => {
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  localStorage.clear()
})

describe('checkoutStore — persistência', () => {
  it('persiste em sessionStorage sob a chave estrelinha-checkout', () => {
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })

    const raw = sessionStorage.getItem(CHECKOUT_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw!).state.contact.email).toBe('marina@email.com')
  })

  it('NÃO escreve nada em localStorage (o rascunho é da sessão, não permanente)', () => {
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
    useCheckoutStore.getState().setOrder('order-1', completeDraft())

    expect(localStorage.getItem(CHECKOUT_STORAGE_KEY)).toBeNull()
    expect(localStorage.length).toBe(0)
  })

  it('o orderId em curso é persistido, para o reload não criar um segundo pedido pending', () => {
    useCheckoutStore.getState().setOrder('order-42', completeDraft())

    const persisted = JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY)!)
    expect(persisted.state.orderId).toBe('order-42')
    expect(persisted.state.orderSnapshot).not.toBeNull()
  })
})

describe('checkoutStore — ações do rascunho', () => {
  it('setContact aplica patch parcial preservando os demais campos', () => {
    useCheckoutStore.getState().setContact({ name: 'Marina', email: 'marina@email.com' })
    useCheckoutStore.getState().setContact({ whatsapp: '11987654321' })

    expect(useCheckoutStore.getState().contact).toEqual({
      name: 'Marina',
      email: 'marina@email.com',
      whatsapp: '11987654321',
      consent: false,
    })
  })

  it('setAddress aplica patch parcial preservando os demais campos', () => {
    useCheckoutStore.getState().setAddress({ cep: '01310100', street: 'Av. Paulista' })
    useCheckoutStore.getState().setAddress({ number: '1000' })

    const { address } = useCheckoutStore.getState()
    expect(address.cep).toBe('01310100')
    expect(address.street).toBe('Av. Paulista')
    expect(address.number).toBe('1000')
  })

  it('setShipping grava a opção escolhida e aceita null para descartar a seleção', () => {
    const shipping = completeDraft().shipping!
    useCheckoutStore.getState().setShipping(shipping)
    expect(useCheckoutStore.getState().shipping).toEqual(shipping)

    useCheckoutStore.getState().setShipping(null)
    expect(useCheckoutStore.getState().shipping).toBeNull()
  })

  it('setPayment aplica patch parcial (método e CPF são gravados separadamente)', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix' })
    useCheckoutStore.getState().setPayment({ cpf: CPF_VALIDO })

    expect(useCheckoutStore.getState().payment).toEqual({ method: 'pix', cpf: CPF_VALIDO })
  })

  it('toggleBump alterna sem argumento e aceita valor explícito', () => {
    useCheckoutStore.getState().toggleBump()
    expect(useCheckoutStore.getState().bumpChecked).toBe(true)

    useCheckoutStore.getState().toggleBump()
    expect(useCheckoutStore.getState().bumpChecked).toBe(false)

    useCheckoutStore.getState().toggleBump(true)
    expect(useCheckoutStore.getState().bumpChecked).toBe(true)
  })
})

describe('checkoutStore — dirty (FLW-01, FLW-04)', () => {
  it('nasce vazio: nada foi editado antes de a pessoa tocar na tela', () => {
    expect(useCheckoutStore.getState().dirty).toEqual([])
  })

  it('markDirty registra o bloco editado', () => {
    useCheckoutStore.getState().markDirty('contact')

    expect(useCheckoutStore.getState().dirty).toEqual(['contact'])
  })

  it('markDirty acumula blocos diferentes na ordem em que foram editados', () => {
    useCheckoutStore.getState().markDirty('delivery')
    useCheckoutStore.getState().markDirty('contact')

    expect(useCheckoutStore.getState().dirty).toEqual(['delivery', 'contact'])
  })

  // A cada tecla o bloco chama markDirty. Um array novo por tecla re-renderizaria a página à toa.
  it('markDirty repetido não duplica NEM troca a referência do array', () => {
    useCheckoutStore.getState().markDirty('contact')
    const afterFirst = useCheckoutStore.getState().dirty

    useCheckoutStore.getState().markDirty('contact')
    useCheckoutStore.getState().markDirty('contact')

    expect(useCheckoutStore.getState().dirty).toBe(afterFirst)
    expect(useCheckoutStore.getState().dirty).toEqual(['contact'])
  })

  it('dirty NÃO é persistido: o reload volta ao estado "nada editado nesta tela"', () => {
    useCheckoutStore.getState().setContact({ email: 'marina@email.com' })
    useCheckoutStore.getState().markDirty('contact')

    const persisted = JSON.parse(sessionStorage.getItem(CHECKOUT_STORAGE_KEY)!)
    expect(persisted.state).not.toHaveProperty('dirty')
  })

  it('reset esvazia dirty', () => {
    useCheckoutStore.getState().markDirty('contact')
    useCheckoutStore.getState().markDirty('payment')

    useCheckoutStore.getState().reset()

    expect(useCheckoutStore.getState().dirty).toEqual([])
  })
})

describe('checkoutStore — blocks() delega a resolveBlocks', () => {
  it('rascunho vazio abre `contact` e nenhum bloco completo', () => {
    expect(useCheckoutStore.getState().blocks()).toEqual({ open: 'contact', complete: [] })
  })

  it('só o contato preenchido abre `delivery`', () => {
    useCheckoutStore.getState().setContact(completeDraft().contact)

    expect(useCheckoutStore.getState().blocks()).toEqual({
      open: 'delivery',
      complete: ['contact'],
    })
  })

  it('rascunho completo não abre nenhum bloco e marca os três como completos', () => {
    fill()

    expect(useCheckoutStore.getState().blocks()).toEqual({
      open: null,
      complete: ['contact', 'delivery', 'payment'],
    })
  })
})

describe('checkoutStore — pedido em curso (CHK-07 / CHK-08)', () => {
  it('setOrder grava orderId e orderSnapshot', () => {
    const snapshot = completeDraft()
    useCheckoutStore.getState().setOrder('order-1', snapshot)

    expect(useCheckoutStore.getState().orderId).toBe('order-1')
    expect(useCheckoutStore.getState().orderSnapshot).toEqual(snapshot)
  })

  it('invalidateOrder limpa orderId E orderSnapshot', () => {
    useCheckoutStore.getState().setOrder('order-1', completeDraft())
    useCheckoutStore.getState().invalidateOrder()

    expect(useCheckoutStore.getState().orderId).toBeNull()
    expect(useCheckoutStore.getState().orderSnapshot).toBeNull()
  })

  it('sem pedido em curso não há nada obsoleto', () => {
    fill()
    expect(useCheckoutStore.getState().isStale()).toBe(false)
  })

  it('logo após setOrder, sem edição, o pedido é reusável (CHK-07)', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())

    expect(useCheckoutStore.getState().isStale()).toBe(false)
  })

  it('editar o número do endereço com pedido em curso torna o pedido obsoleto (CHK-08)', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())
    useCheckoutStore.getState().setAddress({ number: '2000' })

    expect(useCheckoutStore.getState().isStale()).toBe(true)
  })

  it('trocar a opção de frete com pedido em curso torna o pedido obsoleto (CHK-08)', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())
    useCheckoutStore.getState().setShipping({
      ...completeDraft().shipping!,
      serviceId: '2',
      cost: 34.9,
    })

    expect(useCheckoutStore.getState().isStale()).toBe(true)
  })

  it('marcar o order bump com pedido em curso torna o pedido obsoleto (CHK-08)', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())
    useCheckoutStore.getState().toggleBump(true)

    expect(useCheckoutStore.getState().isStale()).toBe(true)
  })

  it('marcar o consentimento de marketing NÃO torna o pedido obsoleto (não afeta cobrança)', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())
    useCheckoutStore.getState().setContact({ consent: true })

    expect(useCheckoutStore.getState().isStale()).toBe(false)
  })
})

describe('checkoutStore — reset', () => {
  it('reset volta o rascunho, o pedido em curso e o storage ao estado inicial', () => {
    fill()
    useCheckoutStore.getState().setOrder('order-1', useCheckoutStore.getState().draft())

    useCheckoutStore.getState().reset()

    const s = useCheckoutStore.getState()
    expect(s.contact).toEqual({ name: '', email: '', whatsapp: '', consent: false })
    expect(s.address.cep).toBe('')
    expect(s.shipping).toBeNull()
    expect(s.payment).toEqual({ method: null, cpf: '' })
    expect(s.bumpChecked).toBe(false)
    expect(s.orderId).toBeNull()
    expect(s.orderSnapshot).toBeNull()
    expect(sessionStorage.getItem(CHECKOUT_STORAGE_KEY)).toBeNull()
  })
})
