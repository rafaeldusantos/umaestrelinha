import { describe, expect, it } from 'vitest'
import {
  isContactComplete,
  isDeliveryComplete,
  isOrderStale,
  resolveBlocks,
  resolveFlow,
  type CheckoutDraft,
  type FlowState,
} from '../index'
import { isPaymentComplete } from '../blocks'

// CHK-03: definição de "completo" por bloco
// CHK-04: abre o primeiro incompleto; nunca mais de um aberto
// CHK-08: edição depois do pedido criado invalida o pedido em curso
// FLW-01 … FLW-07: quem avança é a pessoa — completude não fecha bloco
// DOC-02: no PIX o documento do pagador é CPF **ou** CNPJ

const VALID_CPF = '529.982.247-25'
const VALID_CNPJ = '11.222.333/0001-81'

const completeDraft = (): CheckoutDraft => ({
  contact: {
    name: 'Marina Yamashita',
    email: 'marina@exemplo.com',
    whatsapp: '(11) 98888-7777',
    consent: true,
  },
  address: {
    cep: '01310-100',
    street: 'Av. Paulista',
    number: '1000',
    complement: 'Apto 42',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  },
  shipping: {
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 18.9,
    estimateMin: '2026-08-03',
    estimateMax: '2026-08-05',
  },
  payment: { method: 'pix', cpf: VALID_CPF },
  bumpChecked: false,
})

const emptyDraft = (): CheckoutDraft => ({
  contact: { name: '', email: '', whatsapp: '', consent: false },
  address: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    manual: false,
  },
  shipping: null,
  payment: { method: null, cpf: '' },
  bumpChecked: false,
})

describe('isContactComplete', () => {
  it('nome, e-mail válido e WhatsApp de 11 dígitos => completo', () => {
    expect(isContactComplete(completeDraft().contact)).toBe(true)
  })

  it('WhatsApp de 10 dígitos (telefone fixo) também é aceito', () => {
    const contact = { ...completeDraft().contact, whatsapp: '(11) 3888-7777' }
    expect(isContactComplete(contact)).toBe(true)
  })

  it('nome vazio => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, name: '' })).toBe(false)
  })

  it('nome só com espaços => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, name: '   ' })).toBe(false)
  })

  it('e-mail sem @ => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, email: 'marina.exemplo.com' })).toBe(false)
  })

  it('e-mail sem domínio depois do @ => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, email: 'marina@' })).toBe(false)
  })

  it('e-mail sem ponto no domínio => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, email: 'marina@exemplo' })).toBe(false)
  })

  it('WhatsApp com 9 dígitos => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, whatsapp: '988887777' })).toBe(false)
  })

  it('WhatsApp com 12 dígitos => incompleto', () => {
    expect(isContactComplete({ ...completeDraft().contact, whatsapp: '5511988887777' })).toBe(false)
  })

  it('consentimento de marketing recusado não impede o bloco de ficar completo', () => {
    expect(isContactComplete({ ...completeDraft().contact, consent: false })).toBe(true)
  })
})

describe('isDeliveryComplete', () => {
  it('CEP de 8 dígitos, os 5 campos preenchidos e frete escolhido => completo', () => {
    expect(isDeliveryComplete(completeDraft())).toBe(true)
  })

  it('CEP com menos de 8 dígitos => incompleto', () => {
    const draft = completeDraft()
    draft.address.cep = '01310-10'
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('rua vazia => incompleto', () => {
    const draft = completeDraft()
    draft.address.street = ''
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('número vazio => incompleto', () => {
    const draft = completeDraft()
    draft.address.number = ''
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('bairro vazio => incompleto', () => {
    const draft = completeDraft()
    draft.address.neighborhood = ''
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('cidade vazia => incompleto', () => {
    const draft = completeDraft()
    draft.address.city = ''
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('UF vazia => incompleto', () => {
    const draft = completeDraft()
    draft.address.state = ''
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('sem opção de envio selecionada => incompleto', () => {
    const draft = completeDraft()
    draft.shipping = null
    expect(isDeliveryComplete(draft)).toBe(false)
  })

  it('complemento vazio não impede: não é campo obrigatório', () => {
    const draft = completeDraft()
    draft.address.complement = ''
    expect(isDeliveryComplete(draft)).toBe(true)
  })

  it('endereço digitado à mão (manual) fica completo do mesmo jeito', () => {
    const draft = completeDraft()
    draft.address.manual = true
    expect(isDeliveryComplete(draft)).toBe(true)
  })
})

describe('isPaymentComplete', () => {
  it('PIX com CPF válido => completo', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: VALID_CPF })).toBe(true)
  })

  // DOC-02: quem compra com CNPJ informa o CNPJ no mesmo campo e o bloco fica válido.
  it('PIX com CNPJ válido => completo', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: VALID_CNPJ })).toBe(true)
  })

  it('cartão com CPF válido => completo', () => {
    expect(isPaymentComplete({ method: 'card', cpf: VALID_CPF })).toBe(true)
  })

  // PGM-06: no cartão o documento sai do Brick, que valida no submit — exigi-lo aqui
  // manteria o CTA desabilitado com o formulário de cartão preenchido.
  it('cartão SEM documento => completo (o Brick valida no submit)', () => {
    expect(isPaymentComplete({ method: 'card', cpf: '' })).toBe(true)
  })

  it('cartão com documento inválido => completo (o documento não é do bloco)', () => {
    expect(isPaymentComplete({ method: 'card', cpf: '529.982.247-26' })).toBe(true)
  })

  it('sem método escolhido => incompleto', () => {
    expect(isPaymentComplete({ method: null, cpf: VALID_CPF })).toBe(false)
  })

  it('CPF com dígito verificador errado => incompleto', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: '529.982.247-26' })).toBe(false)
  })

  it('CNPJ com dígito verificador errado => incompleto', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: '11.222.333/0001-82' })).toBe(false)
  })

  it('documento de comprimento entre CPF e CNPJ => incompleto', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: '112.223.330/001' })).toBe(false)
  })

  it('CPF vazio => incompleto', () => {
    expect(isPaymentComplete({ method: 'pix', cpf: '' })).toBe(false)
  })
})

describe('resolveBlocks', () => {
  it('rascunho vazio abre Contato e não tem bloco completo', () => {
    expect(resolveBlocks(emptyDraft())).toEqual({ open: 'contact', complete: [] })
  })

  it('só Contato completo abre Entrega', () => {
    const draft = emptyDraft()
    draft.contact = completeDraft().contact
    expect(resolveBlocks(draft)).toEqual({ open: 'delivery', complete: ['contact'] })
  })

  it('Contato e Entrega completos abrem Pagamento', () => {
    const draft = completeDraft()
    draft.payment = { method: null, cpf: '' }
    expect(resolveBlocks(draft)).toEqual({ open: 'payment', complete: ['contact', 'delivery'] })
  })

  it('os três completos não deixam nenhum bloco aberto', () => {
    expect(resolveBlocks(completeDraft())).toEqual({
      open: null,
      complete: ['contact', 'delivery', 'payment'],
    })
  })

  it('com dois blocos incompletos, abre apenas o primeiro deles na ordem', () => {
    // Contato e Entrega incompletos, Pagamento completo: abre Contato, e só ele
    const draft = emptyDraft()
    draft.payment = completeDraft().payment
    const blocks = resolveBlocks(draft)
    expect(blocks.open).toBe('contact')
    expect(blocks.complete).toEqual(['payment'])
  })
})

const flow = (over: Partial<FlowState> = {}): FlowState => ({
  dirty: [],
  confirmed: [],
  editing: null,
  ...over,
})

describe('resolveFlow', () => {
  it('rascunho vazio abre Contato', () => {
    expect(resolveFlow(emptyDraft(), flow())).toEqual({
      open: 'contact',
      complete: [],
      settled: [],
    })
  })

  // FLW-01: o atrito que originou a feature — digitar o último dígito não pode fechar o bloco.
  it('bloco completo, sujo e não confirmado continua ABERTO (FLW-01)', () => {
    const draft = emptyDraft()
    draft.contact = completeDraft().contact

    const result = resolveFlow(draft, flow({ dirty: ['contact'] }))

    expect(result.open).toBe('contact')
    expect(result.settled).toEqual([])
    expect(result.complete).toEqual(['contact'])
  })

  it('confirmar o bloco sujo abre o próximo (FLW-03)', () => {
    const draft = emptyDraft()
    draft.contact = completeDraft().contact

    const result = resolveFlow(draft, flow({ dirty: ['contact'], confirmed: ['contact'] }))

    expect(result.open).toBe('delivery')
    expect(result.settled).toEqual(['contact'])
  })

  // FLW-04/ADR-02: contato semeado de `customers` e endereço `is_default` nascem colapsados.
  it('bloco completo e LIMPO nasce settled, sem exigir Continuar (FLW-04)', () => {
    const draft = completeDraft()
    draft.payment = { method: null, cpf: '' }

    const result = resolveFlow(draft, flow())

    expect(result.settled).toEqual(['contact', 'delivery'])
    expect(result.open).toBe('payment')
  })

  it('confirmar não fecha bloco incompleto: ele segue aberto', () => {
    const draft = emptyDraft()

    const result = resolveFlow(draft, flow({ confirmed: ['contact'] }))

    expect(result.open).toBe('contact')
    expect(result.settled).toEqual([])
  })

  // FLW-05: `payment` é o último de BLOCK_ORDER — não há próximo bloco para onde avançar, e é
  // isso que mantém o formulário de cartão montado (PGM-04).
  it('Pagamento NUNCA fica settled, nem completo, nem confirmado (FLW-05)', () => {
    const result = resolveFlow(
      completeDraft(),
      flow({ dirty: ['payment'], confirmed: ['contact', 'delivery', 'payment'] }),
    )

    expect(result.settled).toEqual(['contact', 'delivery'])
    expect(result.open).toBe('payment')
  })

  it('com os três blocos válidos o aberto é Pagamento — `open` nunca vira null (FLW-05)', () => {
    const result = resolveFlow(completeDraft(), flow())

    expect(result.open).toBe('payment')
    expect(result.complete).toEqual(['contact', 'delivery', 'payment'])
  })

  // FLW-06: `Alterar` vence a ordem natural — e colapsa os demais, porque `open` é um só.
  it('`editing` vence a ordem natural dos blocos (FLW-06)', () => {
    const result = resolveFlow(completeDraft(), flow({ editing: 'contact' }))

    expect(result.open).toBe('contact')
  })

  it('`editing` abre até um bloco que já estava settled', () => {
    const draft = completeDraft()
    const result = resolveFlow(draft, flow({ editing: 'delivery', confirmed: ['delivery'] }))

    expect(result.open).toBe('delivery')
    expect(result.settled).toContain('delivery')
  })

  // Edge case da spec: voltar por `Alterar` e invalidar o bloco desabilita `Continuar` e o CTA.
  it('bloco confirmado que volta a ser inválido sai de settled e reabre', () => {
    const draft = completeDraft()
    draft.contact.email = 'marina@'

    const result = resolveFlow(draft, flow({ dirty: ['contact'], confirmed: ['contact'] }))

    expect(result.settled).toEqual(['delivery'])
    expect(result.open).toBe('contact')
    expect(result.complete).not.toContain('contact')
  })

  // FLW-07: o CTA deixa de olhar `open` (que nunca é null) e passa a olhar `complete`.
  it('complete traz os três blocos mesmo com Pagamento aberto (FLW-07)', () => {
    const result = resolveFlow(completeDraft(), flow({ dirty: ['contact', 'delivery'] }))

    expect(result.complete).toHaveLength(3)
    expect(result.open).toBe('contact')
  })

  it('sujar a Entrega depois do Contato confirmado mantém a Entrega aberta', () => {
    const result = resolveFlow(
      completeDraft(),
      flow({ dirty: ['contact', 'delivery'], confirmed: ['contact'] }),
    )

    expect(result.open).toBe('delivery')
    expect(result.settled).toEqual(['contact'])
  })

  it('delega `complete` a resolveBlocks — mesma lista, para o mesmo rascunho', () => {
    const draft = completeDraft()
    expect(resolveFlow(draft, flow({ dirty: ['contact'] })).complete).toEqual(
      resolveBlocks(draft).complete,
    )
  })
})

describe('isOrderStale', () => {
  it('sem snapshot não há pedido em curso: nunca obsoleto', () => {
    expect(isOrderStale(completeDraft(), null)).toBe(false)
  })

  it('rascunho idêntico ao snapshot não invalida o pedido', () => {
    expect(isOrderStale(completeDraft(), completeDraft())).toBe(false)
  })

  it('endereço alterado invalida o pedido', () => {
    const draft = completeDraft()
    draft.address.number = '2000'
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('CEP alterado invalida o pedido', () => {
    const draft = completeDraft()
    draft.address.cep = '04538-133'
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('opção de frete trocada invalida o pedido', () => {
    const draft = completeDraft()
    draft.shipping = { ...draft.shipping!, serviceId: '2', serviceName: 'SEDEX', cost: 32.4 }
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('frete removido invalida o pedido', () => {
    const draft = completeDraft()
    draft.shipping = null
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('método de pagamento trocado invalida o pedido', () => {
    const draft = completeDraft()
    draft.payment.method = 'card'
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('order bump marcado invalida o pedido', () => {
    const draft = completeDraft()
    draft.bumpChecked = true
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('CPF do pagador alterado invalida o pedido', () => {
    const draft = completeDraft()
    draft.payment.cpf = '111.444.777-35'
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('nome do contato alterado invalida o pedido', () => {
    const draft = completeDraft()
    draft.contact.name = 'Marina Y. Souza'
    expect(isOrderStale(draft, completeDraft())).toBe(true)
  })

  it('só o consentimento de marketing mudou: não invalida o pedido', () => {
    const draft = completeDraft()
    draft.contact.consent = false
    expect(isOrderStale(draft, completeDraft())).toBe(false)
  })

  it('só o modo manual do endereço mudou: não invalida o pedido', () => {
    const draft = completeDraft()
    draft.address.manual = true
    expect(isOrderStale(draft, completeDraft())).toBe(false)
  })
})
