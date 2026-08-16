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
  it('as quatro seções existem quando há descrição e perguntas', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} faqs={FAQS} />)

    expect(screen.getByRole('button', { name: 'Detalhes do Produto' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cuidados e Conservação' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Política de Trocas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Perguntas Frequentes' })).toBeInTheDocument()
  })

  it('Cuidados e Trocas continuam presentes mesmo sem pergunta nenhuma', () => {
    render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)

    expect(screen.getByRole('button', { name: 'Cuidados e Conservação' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Política de Trocas' })).toBeInTheDocument()
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
  it('sem perguntas, "Política de Trocas" vira a última e perde o risco', () => {
    const { container } = render(<ProductDetailsAccordion product={produto({ description: DESCRICAO })} />)
    const trocas = container.querySelector('[data-state][class*="border-b-0"]')

    expect(trocas).not.toBeNull()
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
