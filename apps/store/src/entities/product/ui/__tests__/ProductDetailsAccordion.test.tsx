import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import ProductDetailsAccordion from '../ProductDetailsAccordion'

/**
 * `PDP-02`/`PDP-10` — a seção "Detalhes do Produto" passa a abrir com a descrição.
 *
 * A `PIN-05` continua valendo: sem nada a dizer, a seção não é montada e quem abre é "Cuidados".
 */

const produto = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Anel Afetivo',
    description: '',
    width_cm: null,
    height_cm: null,
    weight_kg: null,
    ...over,
  }) as Product

const DESCRICAO = '<h2>Anel Afetivo</h2><p>Guarda leite materno.</p>'

describe('ProductDetailsAccordion — a descrição na seção (PDP-02)', () => {
  it('mostra a descrição renderizada como HTML', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)

    expect(screen.getByText('Guarda leite materno.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Anel Afetivo' })).toBeInTheDocument()
  })

  it('a seção "Detalhes do Produto" abre por padrão quando há descrição', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO }) } />)

    // O conteúdo estar acessível é o que prova que a seção está aberta.
    expect(screen.getByText('Guarda leite materno.')).toBeVisible()
  })

  it('a descrição vem ANTES dos bullets de medida', () => {
    // Ordem no DOM, não presença: "acima" é a AC, e presença passaria com a ordem invertida.
    const { container } = render(
      <ProductDetailsAccordion
        product={produto({ description: DESCRICAO, width_cm: 0.8, weight_kg: 0.004 })}
      />,
    )

    const html = container.innerHTML
    expect(html.indexOf('Guarda leite materno.')).toBeLessThan(html.indexOf('Tamanho: 0,8 cm'))
  })

  it('com descrição e sem medida, a seção traz só a descrição', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)

    expect(screen.getByText('Guarda leite materno.')).toBeInTheDocument()
    expect(screen.queryByText(/^Tamanho:/)).toBeNull()
    expect(screen.queryByText(/^Peso:/)).toBeNull()
  })

  it('sem descrição e com medida, a seção traz só os bullets', () => {
    render(<ProductDetailsAccordion product={produto({ width_cm: 0.8 })} />)

    expect(screen.getByText('• Tamanho: 0,8 cm')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Detalhes do Produto' })).toBeInTheDocument()
  })
})

describe('ProductDetailsAccordion — quando não há nada a dizer (PDP-10, preserva PIN-05)', () => {
  it('sem descrição e sem medida, a seção não é montada', () => {
    render(<ProductDetailsAccordion product={produto()} />)

    expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()
  })

  it('sem descrição e sem medida, quem abre é "Cuidados e Conservação"', () => {
    render(<ProductDetailsAccordion product={produto()} />)

    expect(
      screen.getByText('• Limpe com pano seco e macio. Nada de produto de limpeza, álcool ou ultrassom.'),
    ).toBeVisible()
  })

  it('descrição que a limpeza esvazia conta como ausente', () => {
    // Só `<script>`: se a decisão olhasse o campo cru, abriria uma seção em branco.
    render(<ProductDetailsAccordion product={produto({ description: '<script>alert(1)</script>' })} />)

    expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()
  })

  it('descrição que a limpeza esvazia ainda monta a seção se houver medida', () => {
    render(
      <ProductDetailsAccordion
        product={produto({ description: '<script>alert(1)</script>', weight_kg: 0.004 })}
      />,
    )

    expect(screen.getByText('• Peso: 4g')).toBeInTheDocument()
  })
})

describe('ProductDetailsAccordion — as três seções de política seguem intactas', () => {
  it('as quatro seções existem quando há descrição', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)

    expect(screen.getByRole('button', { name: 'Detalhes do Produto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cuidados e Conservação' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Política de Trocas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Perguntas Frequentes' })).toBeInTheDocument()
  })
})
