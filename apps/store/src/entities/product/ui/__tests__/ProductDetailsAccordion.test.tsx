import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Product } from '@estrelinha/supabase/types'
import type { ResolvedFaq } from '@estrelinha/core/faq'
import ProductDetailsAccordion from '../ProductDetailsAccordion'
import { semComentarios } from '@/test/sourceScan'

/**
 * `PDP-02`/`PDP-10` — a seção "Detalhes do Produto" passa a abrir com a descrição.
 *
 * A `PIN-05` continua valendo: sem descrição, a seção não é montada. Desde 2026-10-10 ela traz só
 * a descrição — tamanho, peso e a seção "Cuidados e Conservação" saíram.
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

/** Duas perguntas reais do catálogo, já resolvidas — é o que a `ProductPage` passa. */
const FAQS: ResolvedFaq[] = [
  {
    id: 'f1',
    question: 'O anel é ajustável?',
    answer: 'Sim, dentro de dois números.',
    overridden: false,
  },
  {
    id: 'f2',
    question: 'Quanto tempo leva para ficar pronta a joia?',
    answer: 'O prazo total estimado é de até 25 dias.',
    overridden: false,
  },
]

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

  // 2026-10-10: tamanho e peso saíram da seção. O produto TEM as medidas cadastradas — sem elas o
  // caso passaria nos dois mundos, porque a ausência seria verdade de qualquer jeito.
  it('com medidas cadastradas, a seção traz só a descrição', () => {
    render(
      <ProductDetailsAccordion
        product={produto({ description: DESCRICAO, width_cm: 15, height_cm: 3, weight_kg: 0.3 })}
      />,
    )

    expect(screen.getByText('Guarda leite materno.')).toBeInTheDocument()
    expect(screen.queryByText(/Tamanho:/)).toBeNull()
    expect(screen.queryByText(/Peso:/)).toBeNull()
  })
})

describe('ProductDetailsAccordion — quando não há nada a dizer (PDP-10, preserva PIN-05)', () => {
  it('sem descrição, a seção não é montada', () => {
    render(<ProductDetailsAccordion product={produto()} />)

    expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()
  })

  it('sem descrição, medida sozinha não monta a seção', () => {
    render(<ProductDetailsAccordion product={produto({ width_cm: 0.8, weight_kg: 0.004 })} />)

    expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()
  })

  it('descrição que a limpeza esvazia conta como ausente', () => {
    // Só `<script>`: se a decisão olhasse o campo cru, abriria uma seção em branco.
    render(<ProductDetailsAccordion product={produto({ description: '<script>alert(1)</script>' })} />)

    expect(screen.queryByRole('button', { name: 'Detalhes do Produto' })).toBeNull()
  })
})

describe('ProductDetailsAccordion — "Cuidados e Conservação" e "Política de Trocas" saíram', () => {
  it('com descrição e perguntas, só as duas seções existem', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} faqs={FAQS} />)

    expect(screen.getByRole('button', { name: 'Detalhes do Produto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Perguntas Frequentes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cuidados e Conservação' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Política de Trocas' })).toBeNull()
  })

  it('o texto de cuidados não sobra no fonte', () => {
    const HERE = dirname(fileURLToPath(import.meta.url))
    const CODIGO = semComentarios(readFileSync(join(HERE, '..', 'ProductDetailsAccordion.tsx'), 'utf8'))

    expect(CODIGO.length).toBeGreaterThan(500)
    expect(CODIGO).not.toContain('Cuidados e Conservação')
    expect(CODIGO).not.toContain('pano seco')
  })
})

/**
 * `FAQ-02` — a seção passa a ser do PRODUTO.
 *
 * Até a feature 28 ela era um `<dl>` cravado com duas perguntas genéricas, iguais nos 691 produtos.
 * A asserção "as quatro seções existem" acima **ganhou uma condição** (`faqs={FAQS}`) porque o
 * comportamento mudou por decisão de spec, e ganhou um caso irmão logo abaixo — o arquivo sai desta
 * feature com mais asserções do que entrou.
 */
describe('ProductDetailsAccordion — as perguntas frequentes vêm do cadastro', () => {
  it('renderiza as perguntas recebidas, na ordem', () => {
    const { container } = render(
      <ProductDetailsAccordion product={produto({ description: DESCRICAO })} faqs={FAQS} />,
    )

    // O Radix DESMONTA o conteúdo da seção fechada — a que abre por padrão é "Detalhes do Produto".
    // Sem abrir, `getByText` não acharia nada e o teste passaria a medir a ausência.
    fireEvent.click(screen.getByRole('button', { name: 'Perguntas Frequentes' }))

    expect(screen.getByText('O anel é ajustável?')).toBeInTheDocument()
    expect(screen.getByText('Sim, dentro de dois números.')).toBeInTheDocument()
    expect(screen.getByText('Quanto tempo leva para ficar pronta a joia?')).toBeInTheDocument()

    const html = container.innerHTML
    expect(html.indexOf('O anel é ajustável?')).toBeLessThan(
      html.indexOf('Quanto tempo leva para ficar pronta a joia?'),
    )
  })

  it('sem pergunta nenhuma, a seção NÃO é montada', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)

    expect(screen.queryByRole('button', { name: 'Perguntas Frequentes' })).toBeNull()
  })

  it('lista vazia se comporta como ausência', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} faqs={[]} />)

    expect(screen.queryByRole('button', { name: 'Perguntas Frequentes' })).toBeNull()
  })

  // A última seção visível não leva risco embaixo — e quem é a última deixou de ser fixo.
  it('sem perguntas, "Detalhes do Produto" vira a última e perde o risco', () => {
    const { container } = render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)
    const detalhes = container.querySelector('[data-state][class*="border-b-0"]')

    expect(detalhes).not.toBeNull()
  })

  it('com perguntas, "Detalhes do Produto" mantém o risco', () => {
    const { container } = render(
      <ProductDetailsAccordion product={produto({ description: DESCRICAO })} faqs={FAQS} />,
    )
    const itens = container.querySelectorAll('[data-state][class*="border-"]')

    expect(itens[0].className).toContain('border-estrelinha-line')
  })
})

/**
 * As duas perguntas genéricas foram para a biblioteca — não podem sobrar no fonte, senão voltam a
 * aparecer nos 691 produtos por um caminho que nenhum render exercita.
 */
describe('ProductDetailsAccordion — o <dl> fixo não existe mais', () => {
  const HERE = dirname(fileURLToPath(import.meta.url))
  const FONTE = readFileSync(join(HERE, '..', 'ProductDetailsAccordion.tsx'), 'utf8')
  // A varredura mede o CÓDIGO. O comentário do componente cita os dois literais de propósito, para
  // registrar o que saiu dali — um guarda que proibisse mencioná-los empurraria a explicação para
  // fora do arquivo que ela explica.
  const CODIGO = semComentarios(FONTE)

  it('nenhum dos dois literais está no código', () => {
    expect(FONTE.length).toBeGreaterThan(1000)
    expect(CODIGO.length).toBeGreaterThan(1000)
    expect(CODIGO).not.toContain('Em quanto tempo chega?')
    expect(CODIGO).not.toContain('Dá para comprar em quantidade?')
  })

  it('o componente delega o desenho a `ProductFaq`, em vez de montar `<dl>` por conta própria', () => {
    expect(CODIGO).toContain('<ProductFaq items={faqs} />')
    expect(CODIGO).not.toContain('<dl')
  })
})
