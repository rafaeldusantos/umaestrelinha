import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ResolvedFaq } from '@estrelinha/core/faq'
import { semComentarios } from '@/test/sourceScan'
import ProductFaq from '../ProductFaq'

/** `FAQ-01`, `FAQ-08` — a seção desenha o que o cadastro tem, e desenha como TEXTO. */

const item = (over: Partial<ResolvedFaq> = {}): ResolvedFaq => ({
  id: 'f1',
  question: 'O anel é ajustável?',
  answer: 'Sim, dentro de dois números.',
  overridden: false,
  ...over,
})

describe('ProductFaq', () => {
  it('renderiza um par por item, na ordem recebida', () => {
    render(
      <ProductFaq
        items={[
          item({ id: 'a', question: 'Primeira?', answer: 'Uma.' }),
          item({ id: 'b', question: 'Segunda?', answer: 'Duas.' }),
          item({ id: 'c', question: 'Terceira?', answer: 'Três.' }),
        ]}
      />,
    )

    const termos = screen.getAllByRole('term').map(el => el.textContent)
    expect(termos).toEqual(['Primeira?', 'Segunda?', 'Terceira?'])

    const definicoes = screen.getAllByRole('definition').map(el => el.textContent)
    expect(definicoes).toEqual(['Uma.', 'Duas.', 'Três.'])
  })

  it('usa `<dl>`/`<dt>`/`<dd>` — a mesma marcação do bloco que substituiu', () => {
    const { container } = render(<ProductFaq items={[item()]} />)

    expect(container.querySelector('dl')).not.toBeNull()
    expect(container.querySelector('dt')?.textContent).toBe('O anel é ajustável?')
    expect(container.querySelector('dd')?.textContent).toBe('Sim, dentro de dois números.')
  })

  it('lista vazia não desenha nada', () => {
    const { container } = render(<ProductFaq items={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('lista nula não desenha nada e não quebra', () => {
    const { container } = render(<ProductFaq items={undefined as unknown as ResolvedFaq[]} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('ProductFaq — a resposta é texto, nunca marcação', () => {
  it('marcação na resposta sai literal na tela', () => {
    render(
      <ProductFaq
        items={[item({ answer: 'Sim <b>mesmo</b> — e o símbolo & continua sendo &.' })]}
      />,
    )

    const dd = screen.getByRole('definition')
    expect(dd.textContent).toBe('Sim <b>mesmo</b> — e o símbolo & continua sendo &.')
    expect(dd.querySelector('b')).toBeNull()
  })

  it('marcação na pergunta também sai literal', () => {
    render(<ProductFaq items={[item({ question: '<script>alert(1)</script> Cabe?' })]} />)

    const dt = screen.getByRole('term')
    expect(dt.textContent).toBe('<script>alert(1)</script> Cabe?')
    expect(dt.querySelector('script')).toBeNull()
  })

  // Varredura de fonte: a asserção de render acima passaria mesmo se alguém trocasse por
  // `dangerouslySetInnerHTML` num caminho condicional que o teste não exercita.
  //
  // A varredura tira os comentários antes de medir. Sem isso ela reprova o próprio arquivo que
  // guarda — o comentário do componente **explica** por que não se usa `dangerouslySetInnerHTML`, e
  // um guarda que proíbe falar do que proíbe empurra a documentação para fora do código.
  it('o arquivo não usa `dangerouslySetInnerHTML` no código', () => {
    const HERE = dirname(fileURLToPath(import.meta.url))
    const FONTE = readFileSync(join(HERE, '..', 'ProductFaq.tsx'), 'utf8')
    const CODIGO = semComentarios(FONTE)

    expect(FONTE.length).toBeGreaterThan(400)
    expect(CODIGO.length).toBeGreaterThan(200)
    expect(CODIGO).not.toContain('dangerouslySetInnerHTML')
  })
})

describe('ProductFaq — pergunta longa', () => {
  // Máximo medido no catálogo: 94 caracteres. Em 390px de viewport ela precisa embrulhar, não sumir.
  it('a pergunta de 94 caracteres é renderizada inteira, sem truncamento no DOM', () => {
    const longa = 'Esse pingente guarda o DNA da minha filha e também aceita cinzas de cremação do meu pai?'
    render(<ProductFaq items={[item({ question: longa })]} />)

    expect(screen.getByRole('term').textContent).toBe(longa)
  })

  it('nenhuma classe de truncamento é aplicada ao termo', () => {
    const { container } = render(<ProductFaq items={[item()]} />)
    const dt = container.querySelector('dt')!

    expect(dt.className).not.toMatch(/truncate|line-clamp|text-ellipsis/)
  })
})
