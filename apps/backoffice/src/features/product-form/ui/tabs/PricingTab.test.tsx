import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PricingTab from './PricingTab'
import { emptyProductForm, type ProductFormState } from '../../model/useProductForm'
import type { ProductVariant } from '@nanapin/supabase/types'

// PFM-09 (P1.6 AC 7-11): política de estoque em 3 modos mutuamente exclusivos, `Não controlar`
// desabilitando o saldo, e o prazo de produção que NÃO entra no frete.
// PFM-15 (P1.3 AC 15-16): o aviso de precedência da grade, com o "a partir de" correto e o atalho.

const TAMANHO = { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const form = (over: Partial<ProductFormState> = {}): ProductFormState => ({
  ...emptyProductForm(),
  price: 20,
  ...over,
})

const renderTab = (over: Partial<ProductFormState> = {}) => {
  const setField = vi.fn()
  const onGoToGrid = vi.fn()
  render(<PricingTab form={form(over)} setField={setField} onGoToGrid={onGoToGrid} />)
  return { setField, onGoToGrid }
}

/** O `Intl` pt-BR separa `R$` do número com espaço não-quebrável (U+00A0). */
const NBSP = String.fromCharCode(160)
const money = (text: string) => text.replace('R$ ', `R$${NBSP}`)

describe('PricingTab — política de estoque em 3 modos (P1.6 AC 7)', () => {
  it('oferece exatamente os 3 modos, como um grupo de escolha única', () => {
    renderTab()

    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(3)
    expect(radios.map(r => r.textContent?.split('.')[0])).toEqual([
      expect.stringContaining('Controlar estoque'),
      expect.stringContaining('Vender no negativo'),
      expect.stringContaining('Não controlar'),
    ])
  })

  it('só um modo está marcado por vez', () => {
    renderTab({ stock_policy: 'backorder' })

    const marcados = screen.getAllByRole('radio').filter(r => r.getAttribute('aria-checked') === 'true')
    expect(marcados).toHaveLength(1)
    expect(marcados[0].textContent).toContain('Vender no negativo')
  })

  it('escolher um modo troca stock_policy', () => {
    const { setField } = renderTab({ stock_policy: 'track' })

    fireEvent.click(screen.getByRole('radio', { name: /Não controlar/ }))

    expect(setField).toHaveBeenCalledWith('stock_policy', 'none')
  })

  it('`Não controlar` desabilita saldo e alerta — não há o que controlar', () => {
    renderTab({ stock_policy: 'none' })

    expect(screen.getByLabelText('Estoque total')).toBeDisabled()
    expect(screen.getByLabelText('Alerta de estoque baixo')).toBeDisabled()
  })

  it('`track` e `backorder` mantêm o saldo editável', () => {
    renderTab({ stock_policy: 'backorder' })
    expect(screen.getByLabelText('Estoque total')).toBeEnabled()
  })

  it('produto com grade avisa que o saldo do produto não é o que baixa', () => {
    renderTab({ options: [TAMANHO], variants: [variant()] })

    expect(screen.getByText(/quem baixa é a linha vendida/)).toBeInTheDocument()
  })

  it('o alerta de estoque baixo diz que é avaliado POR VARIAÇÃO (P1.6 AC 10)', () => {
    renderTab()
    expect(screen.getByText(/Avaliado por variação/)).toBeInTheDocument()
  })
})

describe('PricingTab — prazo de produção (P1.6 AC 11)', () => {
  it('grava o valor em dias e deixa claro que não entra no frete', () => {
    const { setField } = renderTab()

    fireEvent.change(screen.getByLabelText('Prazo de produção (dias úteis)'), {
      target: { value: '3' },
    })

    expect(setField).toHaveBeenCalledWith('production_lead_days', 3)
    expect(screen.getByText(/Não entra na cotação do frete/)).toBeInTheDocument()
  })

  it('campo vazio volta a null, não a 0 — "sem prazo" é diferente de "zero dias"', () => {
    const { setField } = renderTab({ production_lead_days: 3 })

    fireEvent.change(screen.getByLabelText('Prazo de produção (dias úteis)'), {
      target: { value: '' },
    })

    expect(setField).toHaveBeenCalledWith('production_lead_days', null)
  })
})

describe('PricingTab — precedência da grade (PFM-15 AC 15-16)', () => {
  it('com grade vendável, avisa e mostra o "a partir de" correto', () => {
    renderTab({
      options: [TAMANHO],
      variants: [variant({ price: 9.4 }), variant({ price: 5.9 })],
    })

    const notice = screen.getByTestId('grid-precedence-notice')
    expect(notice.textContent).toContain('2 variações')
    expect(notice.textContent).toContain('quem manda no preço cobrado é a grade')
    expect(notice.textContent).toContain(money('R$ 5,90'))
  })

  it('o "a partir de" IGNORA a pausada — a vitrine não pratica preço fora do ar', () => {
    renderTab({
      options: [TAMANHO],
      variants: [variant({ price: 9.4 }), variant({ price: 1.9, is_active: false })],
    })

    const notice = screen.getByTestId('grid-precedence-notice')
    expect(notice.textContent).toContain(money('R$ 9,40'))
    expect(notice.textContent).not.toContain('1,90')
  })

  it('o atalho leva à grade', () => {
    const { onGoToGrid } = renderTab({ options: [TAMANHO], variants: [variant()] })

    fireEvent.click(screen.getByRole('button', { name: /Ir para a grade/ }))

    expect(onGoToGrid).toHaveBeenCalled()
  })

  it('SEM variações, nenhum aviso — o preço padrão É o cobrado (AC 16)', () => {
    renderTab({ options: [], variants: [] })

    expect(screen.queryByTestId('grid-precedence-notice')).not.toBeInTheDocument()
    expect(screen.getByText('É o valor cobrado por este produto.')).toBeInTheDocument()
  })

  it('grade só de linhas PAUSADAS não avisa — quem manda ainda é o base_price', () => {
    renderTab({ options: [TAMANHO], variants: [variant({ is_active: false })] })

    expect(screen.queryByTestId('grid-precedence-notice')).not.toBeInTheDocument()
  })

  it('grade com eixo mas linha SEM preço não avisa', () => {
    renderTab({ options: [TAMANHO], variants: [variant({ price: null })] })

    expect(screen.queryByTestId('grid-precedence-notice')).not.toBeInTheDocument()
  })
})

describe('PricingTab — margem (PFM-12)', () => {
  it('preço 20 e custo 8 mostram 60,0% e lucro de R$ 12,00', () => {
    renderTab({ price: 20, cost_price: 8 })

    const card = screen.getByTestId('margin-card')
    expect(card.textContent).toContain('60.0%')
    expect(card.textContent).toContain(money('R$ 12,00'))
  })

  it('preço 0 com custo preenchido NÃO renderiza o card — era o -Infinity do defeito 11', () => {
    renderTab({ price: 0, cost_price: 8 })

    expect(screen.queryByTestId('margin-card')).not.toBeInTheDocument()
  })

  it('sem custo, nenhuma margem para mostrar', () => {
    renderTab({ price: 20, cost_price: 0 })
    expect(screen.queryByTestId('margin-card')).not.toBeInTheDocument()
  })
})

describe('PricingTab — dimensões em campos mascarados', () => {
  it('o peso é digitado em gramas e guardado em kg', () => {
    const { setField } = renderTab({ weight_kg: 0 })

    const input = screen.getByLabelText('Peso')
    fireEvent.change(input, { target: { value: '18' } })
    fireEvent.blur(input)

    expect(setField).toHaveBeenCalledWith('weight_kg', 0.018)
  })

  it('o preço aceita o formato colado de planilha', () => {
    const { setField } = renderTab()

    const input = screen.getByLabelText('Preço')
    fireEvent.change(input, { target: { value: 'R$ 1.234,56' } })
    fireEvent.blur(input)

    expect(setField).toHaveBeenCalledWith('price', 1234.56)
  })
})
