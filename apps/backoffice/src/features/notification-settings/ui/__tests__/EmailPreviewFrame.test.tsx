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

// ───────────────────────────────────────────────────────────────────────────
// Feature 56 (`LEG-16`) — a moldura que nomeia a prévia
// ───────────────────────────────────────────────────────────────────────────

const TITULO = 'Prévia — o mesmo e-mail que a cliente recebe'

describe('EmailPreviewFrame (LEG-16) — a moldura', () => {
  it('a barra nomeia a prévia com a FRASE INTEIRA', () => {
    // A frase inteira, e não um fragmento (`L-009`): "Prévia" sozinho casaria também com o selo
    // "Prévia de exemplo", e a asserção passaria com a barra tendo perdido o resto do texto.
    render(<EmailPreviewFrame html="<p>oi</p>" />)

    expect(screen.getByText(TITULO)).toBeInTheDocument()
  })

  it('os controles de largura e o iframe ficam DENTRO da moldura', () => {
    render(<EmailPreviewFrame html="<p>oi</p>" text="oi" sample />)

    const moldura = screen.getByTestId('email-preview-frame')

    // Contenção, e não "existe na tela": os quatro já existiam antes desta feature, soltos. O que
    // `LEG-16` muda é onde eles moram.
    expect(moldura.contains(screen.getByTestId('preview-width-390'))).toBe(true)
    expect(moldura.contains(screen.getByTestId('preview-width-600'))).toBe(true)
    expect(moldura.contains(screen.getByTestId('email-preview-iframe'))).toBe(true)
    expect(moldura.contains(screen.getByTestId('email-preview-text'))).toBe(true)
    expect(moldura.contains(screen.getByTestId('preview-sample-badge'))).toBe(true)
  })

  it('o selo de exemplo fica na BARRA, junto do título — não flutuando sobre o iframe', () => {
    render(<EmailPreviewFrame html="<p>oi</p>" sample />)

    const titulo = screen.getByText(TITULO)
    const selo = screen.getByTestId('preview-sample-badge')

    // Pai compartilhado: o selo é informação SOBRE a prévia, que é o que a barra nomeia.
    expect(selo.parentElement).toBe(titulo.parentElement)
  })

  it('carregando e erro moram na MESMA moldura — a página não salta entre os três estados', () => {
    // Antes desta feature eram três caixas diferentes, com três alturas e três bordas: a página
    // pulava a cada troca de estado. Uma moldura só é o que torna a troca silenciosa.
    const { unmount } = render(<EmailPreviewFrame loading />)
    expect(screen.getByTestId('email-preview-frame').contains(screen.getByRole('status'))).toBe(true)
    expect(screen.getByText(TITULO)).toBeInTheDocument()
    unmount()

    render(<EmailPreviewFrame error="Não deu" />)
    expect(screen.getByTestId('email-preview-frame').contains(screen.getByRole('alert'))).toBe(true)
    expect(screen.getByText(TITULO)).toBeInTheDocument()
  })

  it('sem pedido nenhum, NÃO existe moldura — ela não promete conteúdo que ninguém pediu', () => {
    // O par do caso acima. Sem ele, "a moldura sempre existe" passaria por completude e o card
    // recolhido carregaria uma caixa vazia com um título dentro.
    render(<EmailPreviewFrame />)

    expect(screen.queryByTestId('email-preview-frame')).toBeNull()
    expect(screen.queryByText(TITULO)).toBeNull()
  })
})
