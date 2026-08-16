import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { GOOGLE_AGE_GROUPS, GOOGLE_GENDERS } from '@estrelinha/supabase/types/settings'
import { emptyProductForm } from '../model/useProductForm'
import { GoogleShoppingCard } from './GoogleShoppingCard'

/**
 * `GSH-19`, `GSH-20` — os identificadores do produto no feed.
 *
 * O ponto que este arquivo trava: **`age_group` e `gender` são escolha fechada.** Texto livre aqui
 * grava um valor que o `check` do banco recusa (a dona descobre no save) ou, pior, um valor que o
 * banco aceita e o Google recusa — e aí a descoberta é item a item, dias depois do cutover.
 *
 * `it.each` sobre a constante, e não uma lista escrita à mão: uma lista à mão envelheceria sem
 * ninguém notar no dia em que o vocabulário mudasse.
 */

const form = (over: Record<string, unknown> = {}) =>
  ({ ...emptyProductForm(), ...over }) as ReturnType<typeof emptyProductForm>

const renderCard = (over: Record<string, unknown> = {}) => {
  const onChange = vi.fn()
  render(<GoogleShoppingCard form={form(over)} onChange={onChange} />)
  return onChange
}

describe('os campos existem', () => {
  it.each([
    ['Marca', 'gs-brand'],
    ['MPN', 'gs-mpn'],
    ['Faixa etária', 'gs-age'],
    ['Sexo', 'gs-gender'],
    ['Categoria do Google', 'gs-category'],
  ])('o campo %s está na aba SEO', (rotulo, id) => {
    renderCard()
    expect(screen.getByLabelText(rotulo)).toBeTruthy()
    expect(document.getElementById(id)).toBeTruthy()
  })

  it('o card diz que joia artesanal não tem GTIN', () => {
    renderCard()
    expect(screen.getByText(/identifier_exists/)).toBeTruthy()
  })
})

describe('campo de texto propaga o valor', () => {
  it('marca', () => {
    const onChange = renderCard()
    fireEvent.change(screen.getByLabelText('Marca'), { target: { value: 'Uma Estrelinha' } })
    expect(onChange).toHaveBeenCalledWith('brand', 'Uma Estrelinha')
  })

  it('MPN', () => {
    const onChange = renderCard()
    fireEvent.change(screen.getByLabelText('MPN'), { target: { value: 'UE-7NOS' } })
    expect(onChange).toHaveBeenCalledWith('mpn', 'UE-7NOS')
  })

  it('categoria do Google', () => {
    const onChange = renderCard()
    fireEvent.change(screen.getByLabelText('Categoria do Google'), {
      target: { value: 'Apparel & Accessories > Jewelry' },
    })
    expect(onChange).toHaveBeenCalledWith(
      'google_product_category',
      'Apparel & Accessories > Jewelry',
    )
  })

  it('mostra o valor já gravado', () => {
    renderCard({ brand: 'Uma Estrelinha', mpn: 'UE-1' })
    expect((screen.getByLabelText('Marca') as HTMLInputElement).value).toBe('Uma Estrelinha')
    expect((screen.getByLabelText('MPN') as HTMLInputElement).value).toBe('UE-1')
  })
})

describe('vocabulário fechado (GSH-20)', () => {
  it('faixa etária NÃO é campo de texto', () => {
    renderCard()
    expect(screen.getByLabelText('Faixa etária').tagName).not.toBe('INPUT')
  })

  it('sexo NÃO é campo de texto', () => {
    renderCard()
    expect(screen.getByLabelText('Sexo').tagName).not.toBe('INPUT')
  })

  it('faixa etária oferece exatamente os valores do Google, e nada além', () => {
    renderCard()
    fireEvent.click(screen.getByLabelText('Faixa etária'))
    for (const v of GOOGLE_AGE_GROUPS) {
      expect(screen.getAllByRole('option').some(o => o.getAttribute('data-value') === v || o.textContent)).toBe(true)
    }
    // Um por valor, mais o "Não informado".
    expect(screen.getAllByRole('option')).toHaveLength(GOOGLE_AGE_GROUPS.length + 1)
  })

  it('sexo oferece exatamente os valores do Google, e nada além', () => {
    renderCard()
    fireEvent.click(screen.getByLabelText('Sexo'))
    expect(screen.getAllByRole('option')).toHaveLength(GOOGLE_GENDERS.length + 1)
  })

  it('o vocabulário vem da constante compartilhada com o check do banco', () => {
    expect(GOOGLE_AGE_GROUPS).toEqual(['newborn', 'infant', 'toddler', 'kids', 'adult'])
    expect(GOOGLE_GENDERS).toEqual(['male', 'female', 'unisex'])
  })
})

describe('o vazio é representável', () => {
  it('sem valor, a faixa etária mostra "Não informado"', () => {
    renderCard()
    expect(screen.getByLabelText('Faixa etária').textContent).toContain('Não informado')
  })

  it('o formulário nasce com os campos vazios — nada é presumido', () => {
    const inicial = emptyProductForm()
    expect(inicial.brand).toBe('')
    expect(inicial.mpn).toBe('')
    expect(inicial.age_group).toBe('')
    expect(inicial.gender).toBe('')
    expect(inicial.google_product_category).toBe('')
    expect(inicial.identifier_exists).toBeNull()
  })
})
