import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailPreviewFrame } from '../EmailPreviewFrame'

// ABN-06/ABN-07 — a prévia é o MESMO renderizador que envia: o componente entrega o `html` da
// function tal qual, nunca recompondo `heading`+`lead`. Os testes provam isso por conteúdo exato do
// `srcDoc`, não por presença de nó.

describe('EmailPreviewFrame — ABN-06 (sem recompor, sandbox, largura)', () => {
  it('entrega o html EXATO em srcDoc — uma tag inventada sobrevive intacta (prova de "não recompõe")', () => {
    const html = '<html><body><x-tag-inventada data-x="1">Oi, Mariana!</x-tag-inventada></body></html>'
    render(<EmailPreviewFrame subject="Assunto" html={html} text="versão texto" sample={false} />)

    const iframe = screen.getByTestId('email-preview-iframe') as HTMLIFrameElement
    // srcDoc é a prop React equivalente ao atributo `srcdoc` — comparamos o valor exato recebido.
    expect(iframe.getAttribute('srcdoc')).toBe(html)
  })

  it('o iframe é sandboxed sem exceção nenhuma — nunca confia no HTML por composição', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text="oi" sample={false} />)
    const iframe = screen.getByTestId('email-preview-iframe')
    expect(iframe.getAttribute('sandbox')).toBe('')
  })

  it('nasce em 390px e o clique em 600 muda a largura DECLARADA do iframe — nenhum terceiro valor', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text="oi" sample={false} />)
    const iframe = screen.getByTestId('email-preview-iframe') as HTMLIFrameElement

    expect(iframe.style.width).toBe('390px')
    expect(screen.getByTestId('preview-width-390').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('preview-width-600').getAttribute('aria-pressed')).toBe('false')

    fireEvent.click(screen.getByTestId('preview-width-600'))

    expect(iframe.style.width).toBe('600px')
    expect(screen.getByTestId('preview-width-600').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('preview-width-390').getAttribute('aria-pressed')).toBe('false')

    // Só os dois botões existem — nenhum campo livre, nenhum terceiro número.
    expect(screen.queryByTestId('preview-width-1024')).toBeNull()
  })

  it('a versão texto aparece ABAIXO do iframe, em <pre> com quebra preservada', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text={'linha 1\nlinha 2'} sample={false} />)
    const pre = screen.getByTestId('email-preview-text')
    expect(pre.tagName).toBe('PRE')
    expect(pre.textContent).toBe('linha 1\nlinha 2')
  })
})

describe('EmailPreviewFrame — ABN-07 (exemplo x pedido real)', () => {
  it('sample: true mostra o selo "Prévia de exemplo"', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text="oi" sample />)
    expect(screen.getByTestId('preview-sample-badge')).toHaveTextContent('Prévia de exemplo')
  })

  it('sample: false NÃO mostra selo nenhum', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text="oi" sample={false} />)
    expect(screen.queryByTestId('preview-sample-badge')).toBeNull()
  })
})

describe('EmailPreviewFrame — estados de erro e carregamento', () => {
  it('erro renderiza a MENSAGEM no lugar do iframe — nunca um iframe vazio ou quebrado em silêncio', () => {
    render(<EmailPreviewFrame error="Não foi possível gerar a prévia. Tente de novo." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível gerar a prévia. Tente de novo.')
    expect(screen.queryByTestId('email-preview-iframe')).toBeNull()
  })

  it('carregando não mostra iframe nem erro', () => {
    render(<EmailPreviewFrame loading />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByTestId('email-preview-iframe')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sem loading, sem erro e sem html: não renderiza nada (aguardando o primeiro pedido)', () => {
    const { container } = render(<EmailPreviewFrame />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('EmailPreviewFrame — alvo de toque (ABN-10)', () => {
  it('os botões de largura têm ao menos 44px de altura', () => {
    render(<EmailPreviewFrame subject="Assunto" html="<p>oi</p>" text="oi" sample={false} />)
    expect(screen.getByTestId('preview-width-390').className).toContain('h-11')
    expect(screen.getByTestId('preview-width-600').className).toContain('h-11')
  })
})
