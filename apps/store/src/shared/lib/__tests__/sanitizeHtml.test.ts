import { describe, expect, it } from 'vitest'
import { sanitizeHtml } from '../sanitizeHtml'

/**
 * `PDP-03`..`PDP-09` — o sanitizador da descrição do produto.
 *
 * A régua não é "não quebrou": é o HTML de saída, comparado por valor. Um sanitizador que devolve
 * string vazia para tudo passaria em qualquer teste de "não lançou".
 */

describe('sanitizeHtml — a allowlist (PDP-04)', () => {
  it('mantém as tags que o catálogo real usa', () => {
    // As sete tags medidas no banco: li, p, strong, h3, br, ul, h2.
    expect(sanitizeHtml('<p>Um <strong>anel</strong> de prata.</p>')).toBe(
      '<p>Um <strong>anel</strong> de prata.</p>',
    )
    expect(sanitizeHtml('<ul><li>Prata 925</li><li>8mm</li></ul>')).toBe(
      '<ul><li>Prata 925</li><li>8mm</li></ul>',
    )
    expect(sanitizeHtml('<p>Uma linha<br>outra linha</p>')).toBe('<p>Uma linha<br>outra linha</p>')
  })

  it('mantém ênfase e lista ordenada, que o editor do painel escreve', () => {
    expect(sanitizeHtml('<p><em>feito à mão</em> e <i>único</i></p>')).toBe(
      '<p><em>feito à mão</em> e <i>único</i></p>',
    )
    expect(sanitizeHtml('<ol><li>Primeiro</li></ol>')).toBe('<ol><li>Primeiro</li></ol>')
  })

  it('DESEMBRULHA a tag fora da lista e preserva o texto dela', () => {
    // O caso que decide entre as duas listas: o texto da dona não pode sumir junto com um `<div>`.
    expect(sanitizeHtml('<div>Guardamos o leite materno.</div>')).toBe(
      'Guardamos o leite materno.',
    )
    expect(sanitizeHtml('<section><p>Oi</p></section>')).toBe('<p>Oi</p>')
    expect(sanitizeHtml('<table><tr><td>Peso</td></tr></table>')).toBe('Peso')
  })

  it('desembrulha em profundidade, mantendo a ordem do texto', () => {
    expect(sanitizeHtml('<div><span>Uma</span> <span>estrelinha</span></div>')).toBe(
      'Uma estrelinha',
    )
  })

  it('remove comentário de HTML', () => {
    expect(sanitizeHtml('<p>Anel<!-- nota interna --></p>')).toBe('<p>Anel</p>')
  })
})

describe('sanitizeHtml — o que some com o conteúdo (PDP-05)', () => {
  it('`<script>` não deixa nem o código como texto', () => {
    // Desembrulhar aqui imprimiria `alert(1)` na página do produto.
    expect(sanitizeHtml('<p>Anel</p><script>alert(1)</script>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('')
  })

  it('`<script>` escondido dentro de uma tag desconhecida também some', () => {
    // A ordem importa: os filhos são limpos ANTES de subirem no desembrulho. Sem isso, o script
    // escaparia junto com o texto do `<div>`.
    expect(sanitizeHtml('<div>Anel<script>alert(1)</script></div>')).toBe('Anel')
  })

  it('style, iframe, object, embed e template somem inteiros', () => {
    expect(sanitizeHtml('<style>body{display:none}</style><p>Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<iframe src="https://evil.test"></iframe><p>Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<object data="x"></object><p>Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<embed src="x"><p>Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<template><p>oculto</p></template><p>Anel</p>')).toBe('<p>Anel</p>')
  })

  /**
   * `noscript` é o único da lista cujo desfecho **depende do ambiente**, e a asserção diz o que é
   * verdade nos dois em vez de fingir que é um só.
   *
   * O conteúdo de `<noscript>` só é texto cru quando o script está LIGADO. No navegador da cliente
   * ele está, então o elemento chega inteiro aqui e cai por `DROP_COM_FILHOS`. No jsdom o script está
   * desligado, e o **próprio parser** dissolve o elemento e promove o conteúdo a irmão — o
   * sanitizador nunca vê um `noscript`.
   *
   * O que **não** varia é a propriedade que importa: nada executável sobrevive. Com o script
   * desligado o parser já descarta um `<script>` aninhado; um `<img onerror>` promovido a irmão cai
   * na allowlist. Sobra texto inerte, que é o que `<noscript>` é.
   */
  it('noscript: nenhum elemento sobrevive, e nada hostil dentro dele passa', () => {
    expect(sanitizeHtml('<noscript>sem js</noscript><p>Anel</p>')).not.toContain('<noscript')
    expect(sanitizeHtml('<noscript><script>alert(1)</script></noscript><p>Anel</p>')).toBe(
      '<p>Anel</p>',
    )
    expect(sanitizeHtml('<noscript><img src=x onerror=alert(1)></noscript><p>Anel</p>')).toBe(
      '<p>Anel</p>',
    )
  })
})

describe('sanitizeHtml — atributos (PDP-06)', () => {
  it('remove todo atributo das tags permitidas', () => {
    expect(sanitizeHtml('<p class="x" id="y" data-z="1">Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<strong style="color:red">Prata</strong>')).toBe('<strong>Prata</strong>')
  })

  it('remove manipulador de evento', () => {
    expect(sanitizeHtml('<p onclick="alert(1)">Anel</p>')).toBe('<p>Anel</p>')
    expect(sanitizeHtml('<p ONCLICK="alert(1)">Anel</p>')).toBe('<p>Anel</p>')
  })

  it('`<img src=x onerror=…>` não sobrevive — `img` não está na allowlist', () => {
    // O vetor clássico de XSS armazenado. `img` desembrulha e não tem filho, então some inteiro.
    expect(sanitizeHtml('<p>Anel<img src=x onerror=alert(1)></p>')).toBe('<p>Anel</p>')
  })

  it('`<svg onload=…>` não sobrevive', () => {
    expect(sanitizeHtml('<svg onload="alert(1)"></svg><p>Anel</p>')).toBe('<p>Anel</p>')
  })
})

describe('sanitizeHtml — protocolo do link (PDP-07, PDP-08)', () => {
  it('mantém http, https e mailto, com `rel`', () => {
    expect(sanitizeHtml('<a href="https://umaestrelinha.com.br">site</a>')).toBe(
      '<a href="https://umaestrelinha.com.br" rel="noopener noreferrer">site</a>',
    )
    expect(sanitizeHtml('<a href="mailto:oi@umaestrelinha.com.br">e-mail</a>')).toBe(
      '<a href="mailto:oi@umaestrelinha.com.br" rel="noopener noreferrer">e-mail</a>',
    )
  })

  it('mantém caminho relativo', () => {
    expect(sanitizeHtml('<a href="/ajuda">ajuda</a>')).toBe(
      '<a href="/ajuda" rel="noopener noreferrer">ajuda</a>',
    )
  })

  it('remove `javascript:` e deixa o texto do link', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">clique</a>')).toBe('<a>clique</a>')
  })

  it('remove `javascript:` ofuscado com tabulação — o motivo de usar `new URL`', () => {
    // `startsWith('javascript:')` não pega este; o parser de URL descarta a tabulação e pega.
    expect(sanitizeHtml('<a href="java&#9;script:alert(1)">clique</a>')).toBe('<a>clique</a>')
  })

  it('remove `data:`', () => {
    expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('<a>x</a>')
  })

  it('link sem `href` seguro não ganha `rel`', () => {
    expect(sanitizeHtml('<a href="javascript:void(0)">x</a>')).not.toContain('rel=')
  })
})

describe('sanitizeHtml — títulos (PDP-09)', () => {
  it('rebaixa h1, h2 e h3 para h4', () => {
    // O `AccordionPrimitive.Header` do shadcn já é um `<h3>`.
    expect(sanitizeHtml('<h2>Anel Afetivo</h2>')).toBe('<h4>Anel Afetivo</h4>')
    expect(sanitizeHtml('<h1>Anel</h1>')).toBe('<h4>Anel</h4>')
    expect(sanitizeHtml('<h3>Especificações</h3>')).toBe('<h4>Especificações</h4>')
  })

  it('h4 e h5 ficam como estão', () => {
    expect(sanitizeHtml('<h4>Detalhe</h4>')).toBe('<h4>Detalhe</h4>')
    expect(sanitizeHtml('<h5>Detalhe</h5>')).toBe('<h5>Detalhe</h5>')
  })

  it('o título rebaixado perde os atributos e mantém os filhos', () => {
    expect(sanitizeHtml('<h2 class="titulo">Anel <strong>925</strong></h2>')).toBe(
      '<h4>Anel <strong>925</strong></h4>',
    )
  })
})

describe('sanitizeHtml — entidades (PDP-03)', () => {
  it('a entidade vira o caractere, e não a sequência literal', () => {
    // O defeito visível em produção: a loja mostrava `Cora&ccedil;&otilde;es` na tela.
    expect(sanitizeHtml('<p>Cora&ccedil;&otilde;es</p>')).toBe('<p>Corações</p>')
    expect(sanitizeHtml('<p>Prata 925 &mdash; feita à m&atilde;o</p>')).toBe(
      '<p>Prata 925 — feita à mão</p>',
    )
  })

  it('`&lt;` continua escapado — texto que parece tag não vira tag', () => {
    expect(sanitizeHtml('<p>use &lt;script&gt; com cuidado</p>')).toBe(
      '<p>use &lt;script&gt; com cuidado</p>',
    )
  })
})

describe('sanitizeHtml — bordas', () => {
  it('entrada vazia, só espaço ou nula devolve string vazia', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml('   \n  ')).toBe('')
    expect(sanitizeHtml(null as unknown as string)).toBe('')
  })

  it('entrada que sobra vazia depois da limpeza devolve string vazia', () => {
    // É o que permite a `PDP-10` decidir pelo resultado, e não pelo campo cru.
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe('')
    expect(sanitizeHtml('<style>p{}</style>')).toBe('')
  })

  it('HTML malformado não lança e devolve o que deu para recuperar', () => {
    expect(() => sanitizeHtml('<p>Anel <strong>925')).not.toThrow()
    expect(sanitizeHtml('<p>Anel <strong>925')).toBe('<p>Anel <strong>925</strong></p>')
  })

  it('texto puro sem tag nenhuma atravessa intacto', () => {
    expect(sanitizeHtml('Anel de prata 925')).toBe('Anel de prata 925')
  })

  it('uma descrição real do catálogo sai inteira e sem tag estranha', () => {
    const real =
      '<h2>Anel Afetivo Cora&ccedil;&otilde;es com Leite Materno em Prata 925</h2>\n' +
      '<p>O Anel &eacute; uma joia delicada.</p>\n' +
      '<h3>Especifica&ccedil;&otilde;es</h3>\n' +
      '<ul>\n<li>Tipo: Anel afetivo</li>\n<li>Tamanho: 6mm</li>\n</ul>'

    const limpo = sanitizeHtml(real)

    expect(limpo).toContain('<h4>Anel Afetivo Corações com Leite Materno em Prata 925</h4>')
    expect(limpo).toContain('<h4>Especificações</h4>')
    expect(limpo).toContain('<li>Tipo: Anel afetivo</li>')
    expect(limpo).not.toContain('<h2')
    expect(limpo).not.toContain('<h3')
    expect(limpo).not.toContain('&ccedil;')
  })
})
