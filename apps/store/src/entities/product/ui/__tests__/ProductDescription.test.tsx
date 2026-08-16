import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProductDescription from '../ProductDescription'

/**
 * `PDP-02`/`PDP-10` — a descrição chega à tela como ELEMENTO, não como texto com tag dentro.
 *
 * A limpeza em si é medida em `shared/lib/__tests__/sanitizeHtml.test.ts`; aqui a régua é o DOM
 * renderizado.
 */

describe('ProductDescription — o HTML vira estrutura', () => {
  it('parágrafo, lista e negrito chegam como elementos', () => {
    const { container } = render(
      <ProductDescription html="<p>Um <strong>anel</strong></p><ul><li>Prata 925</li></ul>" />,
    )

    expect(container.querySelector('p')).not.toBeNull()
    expect(container.querySelector('strong')?.textContent).toBe('anel')
    expect(container.querySelectorAll('li')).toHaveLength(1)
  })

  it('o título da descrição sai como `h4`, e não como `h2`', () => {
    // O `AccordionPrimitive.Header` já é um `<h3>`; e a página já tem o nome do produto como `<h1>`.
    render(<ProductDescription html="<h2>Anel Afetivo</h2>" />)

    expect(screen.getByRole('heading', { level: 4, name: 'Anel Afetivo' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2 })).toBeNull()
  })

  it('a entidade vira caractere na tela', () => {
    // O defeito que a feature fecha: a loja mostrava `Cora&ccedil;&otilde;es` literalmente.
    render(<ProductDescription html="<p>Cora&ccedil;&otilde;es</p>" />)

    expect(screen.getByText('Corações')).toBeInTheDocument()
    expect(screen.queryByText(/&ccedil;/)).toBeNull()
  })

  it('nenhuma tag aparece como texto', () => {
    const { container } = render(
      <ProductDescription html="<h2>Anel</h2><p>Prata <strong>925</strong></p>" />,
    )

    expect(container.textContent).toBe('AnelPrata 925')
    expect(container.textContent).not.toContain('<')
  })

  it('conteúdo hostil não chega ao DOM', () => {
    const { container } = render(
      <ProductDescription html='<p onclick="alert(1)">Anel</p><script>alert(1)</script><img src=x onerror=alert(1)>' />,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('p')?.getAttribute('onclick')).toBeNull()
  })
})

describe('ProductDescription — quando não há o que mostrar (PDP-10)', () => {
  it('descrição vazia não renderiza nada', () => {
    const { container } = render(<ProductDescription html="" />)
    expect(container.firstChild).toBeNull()
  })

  it('descrição só com espaço não renderiza nada', () => {
    const { container } = render(<ProductDescription html="   " />)
    expect(container.firstChild).toBeNull()
  })

  it('descrição que a limpeza esvazia não renderiza nada', () => {
    // A decisão olha o sanitizado, não o campo cru — senão abriria um bloco em branco.
    const { container } = render(<ProductDescription html="<script>alert(1)</script>" />)
    expect(container.firstChild).toBeNull()
  })
})

describe('ProductDescription — cor', () => {
  it('usa só tokens `estrelinha-*`, e não a paleta do plugin `prose`', () => {
    const { container } = render(<ProductDescription html="<p>Anel</p>" />)
    const classe = (container.firstChild as HTMLElement).className

    expect(classe).toContain('text-estrelinha-ink-soft')
    expect(classe).not.toContain('prose')
  })
})
