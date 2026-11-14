// A faixa do frete grátis da gaveta, nos quatro desenhos: abaixo da faixa (com a barra), alcançada
// sem CEP com as regiões limitadas, liberada (com CEP da campanha, ou com as cinco regiões), e fora
// da campanha. O estado vem de `useFreeShipping` de verdade, alimentado pelas settings dubladas —
// a faixa nunca recalcula a regra.
//
// O valor em reais sai do `Intl` com espaço inseparável entre o "R$" e o número; os textos esperados
// são escritos com ele (`R$\u00a0…`), sem normalizar o que a tela desenha.

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFreeShipping } from '@estrelinha/core/hooks/useFreeShipping'

const shipping = vi.hoisted(() => ({
  value: {
    free_shipping_enabled: true,
    free_shipping_threshold: 450,
    free_shipping_regions: ['sul', 'sudeste'] as string[],
    default_shipping_cost: 9.9,
    handling_days: 2,
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shipping.value,
}))

import FreeShippingBand from '../FreeShippingBand'

const SP = '01310-100'
const BA = '40010-000'

interface Caso {
  subtotal: number
  cep?: string | null
  place?: { city: string; state: string } | null
  freeShippingCoupon?: boolean
}

const Faixa = ({ subtotal, cep = null, place = null, freeShippingCoupon = false }: Caso) => {
  const state = useFreeShipping(subtotal, cep)
  return (
    <FreeShippingBand
      state={state}
      subtotal={subtotal}
      cep={cep}
      place={place}
      freeShippingCoupon={freeShippingCoupon}
    />
  )
}

const montar = (caso: Caso) => render(<Faixa {...caso} />)

// Sem normalizar: o matcher padrão colapsa o espaço inseparável e não casaria o texto cru.
const texto = (s: string) => screen.getByText(s, { normalizer: (t) => t })
const faixa = () => screen.getByTestId('free-shipping-band')
const balao = () => {
  act(() => screen.getByRole('button', { name: 'Sobre o frete grátis' }).focus())
  return screen.getByRole('tooltip').textContent
}

const REGRA_SUL_SUDESTE =
  'Compras a partir de R$\u00a0450,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Sudeste (SP, RJ, MG, ES). A região é conferida pelo CEP.'

beforeEach(() => {
  shipping.value = {
    free_shipping_enabled: true,
    free_shipping_threshold: 450,
    free_shipping_regions: ['sul', 'sudeste'],
    default_shipping_cost: 9.9,
    handling_days: 2,
  }
})

describe('abaixo da faixa', () => {
  it('diz quanto falta, o valor sobre a faixa, e mostra a barra com o progresso', () => {
    montar({ subtotal: 401.83 })

    expect(texto('Faltam R$\u00a048,17 para o frete grátis')).toBeTruthy()
    expect(texto('R$\u00a0401,83 / R$\u00a0450,00')).toBeTruthy()
    const barra = screen.getByRole('progressbar', { name: 'Progresso para o frete grátis' })
    expect(barra.getAttribute('aria-valuenow')).toBe('89')
    expect(barra.getAttribute('aria-valuemin')).toBe('0')
    expect(barra.getAttribute('aria-valuemax')).toBe('100')
    expect(faixa().textContent).not.toMatch(/liberado/)
    expect(faixa().textContent).not.toMatch(/!/)
  })

  it('o ⓘ traz a regra com o valor e as regiões da configuração', () => {
    montar({ subtotal: 401.83 })
    expect(balao()).toBe(REGRA_SUL_SUDESTE)
  })

  it('com CEP da campanha e ainda faltando, o desenho é o mesmo', () => {
    montar({ subtotal: 401.83, cep: SP, place: { city: 'São Paulo', state: 'SP' } })
    expect(texto('Faltam R$\u00a048,17 para o frete grátis')).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(balao()).toBe(REGRA_SUL_SUDESTE)
  })

  it('outra faixa e outras regiões mudam o texto da linha, do valor e do balão', () => {
    shipping.value = { ...shipping.value, free_shipping_threshold: 300, free_shipping_regions: ['nordeste'] }
    montar({ subtotal: 120 })
    expect(texto('Faltam R$\u00a0180,00 para o frete grátis')).toBeTruthy()
    expect(texto('R$\u00a0120,00 / R$\u00a0300,00')).toBeTruthy()
    expect(balao()).toBe(
      'Compras a partir de R$\u00a0300,00 têm frete grátis para entregas no Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE). A região é conferida pelo CEP.',
    )
  })

  it('a largura da barra anima, e não anima com menos movimento', () => {
    montar({ subtotal: 225 })
    const preenchimento = screen.getByRole('progressbar').firstElementChild as HTMLElement
    expect(preenchimento.style.width).toBe('50%')
    const classes = preenchimento.className.split(/\s+/)
    expect(classes).toContain('transition-[width]')
    expect(classes).toContain('duration-[400ms]')
    expect(classes).toContain('motion-reduce:transition-none')
  })
})

/** O destaque ouro: fundo `accent` e texto `ink` sólido, sem opacidade. */
const destacada = (el: HTMLElement) => {
  const classes = el.className.split(/\s+/)
  expect(classes).toContain('bg-estrelinha-accent')
  expect(classes).toContain('text-estrelinha-ink')
  expect(el.outerHTML).not.toMatch(/text-estrelinha-ink\/|text-estrelinha-accent/)
}

describe('alcançada sem CEP, com as regiões limitadas', () => {
  it('destaca em ouro e diz "para Sul e Sudeste", sem barra, sem valor e sem "liberado"', () => {
    montar({ subtotal: 480 })

    expect(texto('Frete grátis para Sul e Sudeste')).toBeTruthy()
    expect(faixa().getAttribute('role')).toBe('status')
    destacada(faixa())
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(faixa().textContent).not.toMatch(/liberado|Faltam|\//)
  })

  it('o ⓘ traz a regra e pede o CEP para confirmar', () => {
    montar({ subtotal: 480 })
    expect(balao()).toBe(`${REGRA_SUL_SUDESTE} Informe o CEP abaixo para confirmar.`)
  })

  it('o rótulo das regiões vem da configuração', () => {
    shipping.value = { ...shipping.value, free_shipping_regions: ['sul'] }
    montar({ subtotal: 480 })
    expect(texto('Frete grátis para Sul')).toBeTruthy()
    expect(balao()).toBe(
      'Compras a partir de R$\u00a0450,00 têm frete grátis para entregas no Sul (PR, SC, RS). A região é conferida pelo CEP. Informe o CEP abaixo para confirmar.',
    )
  })

  it('outra faixa e outras regiões mudam a linha e o balão', () => {
    shipping.value = { ...shipping.value, free_shipping_threshold: 300, free_shipping_regions: ['nordeste', 'sul'] }
    montar({ subtotal: 320 })
    expect(texto('Frete grátis para Sul e Nordeste')).toBeTruthy()
    expect(balao()).toBe(
      'Compras a partir de R$\u00a0300,00 têm frete grátis para entregas no Sul (PR, SC, RS) e no Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE). A região é conferida pelo CEP. Informe o CEP abaixo para confirmar.',
    )
  })
})

describe('liberada', () => {
  it('com CEP de uma região da campanha: "Frete grátis liberado" em ouro, sem barra', () => {
    montar({ subtotal: 480, cep: SP, place: { city: 'São Paulo', state: 'SP' } })

    expect(texto('Frete grátis liberado')).toBeTruthy()
    expect(faixa().getAttribute('role')).toBe('status')
    destacada(faixa())
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('o ⓘ diz a cidade, a UF e a região do CEP', () => {
    montar({ subtotal: 480, cep: SP, place: { city: 'São Paulo', state: 'SP' } })
    expect(balao()).toBe('Entrega em São Paulo/SP, região Sudeste. A forma de envio mais barata sai sem custo.')
  })

  it('sem a busca do CEP, o ⓘ diz só a região, tirada do CEP', () => {
    montar({ subtotal: 480, cep: '90010-000' })
    expect(balao()).toBe('Entrega na região Sul. A forma de envio mais barata sai sem custo.')
  })

  it('com as cinco regiões e sem CEP: "liberado", e o ⓘ traz a regra sem falar de região', () => {
    shipping.value = {
      ...shipping.value,
      free_shipping_regions: ['sul', 'sudeste', 'centro-oeste', 'nordeste', 'norte'],
    }
    montar({ subtotal: 480 })
    expect(texto('Frete grátis liberado')).toBeTruthy()
    destacada(faixa())
    expect(balao()).toBe('Compras a partir de R$\u00a0450,00 têm frete grátis.')
  })
})

describe('CEP fora da campanha', () => {
  it.each([120, 480])('subtotal %s: linha neutra "só para Sul e Sudeste", sem barra, sem valor e sem "faltam"', (subtotal) => {
    montar({ subtotal, cep: BA, place: { city: 'Salvador', state: 'BA' } })

    expect(texto('Frete grátis só para Sul e Sudeste')).toBeTruthy()
    expect(faixa().getAttribute('role')).toBe('status')
    const classes = faixa().className.split(/\s+/)
    expect(classes).toContain('bg-estrelinha-ground-deep')
    expect(classes).not.toContain('bg-estrelinha-accent')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(faixa().textContent).not.toMatch(/Faltam|liberado|R\$|!|infelizmente/i)
  })

  it('o ⓘ diz a cidade e que o frete é o da cotação, seguido da regra', () => {
    montar({ subtotal: 480, cep: BA, place: { city: 'Salvador', state: 'BA' } })
    expect(balao()).toBe(`Para Salvador/BA, o frete é o da cotação. ${REGRA_SUL_SUDESTE}`)
  })

  it('outra faixa e outras regiões mudam a linha e o balão', () => {
    shipping.value = { ...shipping.value, free_shipping_threshold: 300, free_shipping_regions: ['nordeste'] }
    montar({ subtotal: 120, cep: SP, place: { city: 'São Paulo', state: 'SP' } })
    expect(texto('Frete grátis só para Nordeste')).toBeTruthy()
    expect(balao()).toBe(
      'Para São Paulo/SP, o frete é o da cotação. Compras a partir de R$\u00a0300,00 têm frete grátis para entregas no Nordeste (AL, BA, CE, MA, PB, PE, PI, RN, SE). A região é conferida pelo CEP.',
    )
  })

  it('sem a busca do CEP, o ⓘ diz "Para este CEP"', () => {
    montar({ subtotal: 480, cep: BA })
    expect(balao()).toBe(`Para este CEP, o frete é o da cotação. ${REGRA_SUL_SUDESTE}`)
  })

  it('trocar para um CEP da campanha volta a faixa normal na hora', () => {
    const { rerender } = montar({ subtotal: 401.83, cep: BA })
    expect(texto('Frete grátis só para Sul e Sudeste')).toBeTruthy()
    rerender(<Faixa subtotal={401.83} cep={SP} />)
    expect(texto('Faltam R$\u00a048,17 para o frete grátis')).toBeTruthy()
    expect(screen.getByRole('progressbar')).toBeTruthy()
  })
})

describe('sem faixa', () => {
  it('com o interruptor desligado, nada é desenhado', () => {
    shipping.value = { ...shipping.value, free_shipping_enabled: false }
    const { container } = montar({ subtotal: 480, cep: SP })
    expect(container.innerHTML).toBe('')
  })

  it.each([
    ['sem CEP', null],
    ['com CEP da campanha', SP],
    ['com CEP fora', BA],
  ])('com cupom de frete grátis, %s, nada é desenhado', (_, cep) => {
    const { container } = montar({ subtotal: 120, cep, freeShippingCoupon: true })
    expect(container.innerHTML).toBe('')
  })
})
