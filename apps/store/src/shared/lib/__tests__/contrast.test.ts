import { describe, it, expect } from 'vitest'
import { contrastRatio, parseHex, relativeLuminance } from '../contrast'

/**
 * O piso de contraste da paleta Uma Estrelinha, medido — `IDN-02`.
 *
 * A regra que este arquivo trava não é "a paleta é bonita": é **quais tokens
 * podem ser texto**. Nenhuma ferramenta acusa `text-estrelinha-accent` num
 * parágrafo — a classe existe, o build passa, o teste de componente passa, e a
 * cliente é quem não consegue ler. Aqui a proibição vira número.
 *
 * As três cores de texto são `ink`, `ink-soft` e `primary` (mais
 * `primary-strong` no hover). O acento **não é uma delas**: `accent` mede
 * 2,66:1 sobre o chão. O único lugar onde ele é texto é sobre `ink`, a 4,78:1.
 *
 * A matemática vem de `../contrast.ts` (WCAG 2.1) e **não muda nesta feature**
 * — é o instrumento, não a medida.
 */

/** Os valores canônicos. A paridade com App.css/Tailwind é `palette.test.ts`. */
const P = {
  ground: '#FAF8F4',
  'ground-deep': '#F1EBE1',
  surface: '#FFFFFF',
  line: '#E6DFD4',
  ink: '#23303A',
  'ink-soft': '#54616B',
  primary: '#34495E',
  'primary-strong': '#283A4A',
  'on-primary': '#F7F3EC',
  accent: '#B8945F',
  'accent-strong': '#A07E4C',
  serenity: '#DCE6EC',
  whatsapp: '#25D366',
  field: '#8C8073',
} as const

type Token = keyof typeof P

/** As três superfícies claras da loja — chão, faixa e card. */
const CLARAS: Token[] = ['ground', 'ground-deep', 'surface']

/**
 * Um veredito em texto, não um booleano.
 *
 * `expect(ratio).toBeGreaterThanOrEqual(4.5)` falha dizendo "expected 2.66 to
 * be >= 4.5" — e quem lê o CI não sabe qual token nem sobre qual fundo. Com o
 * veredito em string, a falha nomeia os dois e a razão medida.
 */
function pisoDeTexto(token: Token, fundo: Token, piso: number): string {
  const razao = contrastRatio(P[token], P[fundo])
  return razao >= piso
    ? `${token} sobre ${fundo}: OK`
    : `${token} sobre ${fundo}: ${razao.toFixed(2)}:1 — abaixo do piso de ${piso}:1`
}

function tetoDeNaoTexto(token: Token, fundo: Token, piso: number): string {
  const razao = contrastRatio(P[token], P[fundo])
  return razao < piso
    ? `${token} sobre ${fundo}: não é texto`
    : `${token} sobre ${fundo}: ${razao.toFixed(2)}:1 — passou de ${piso}:1, a regra "nunca texto" mudou`
}

describe('contraste — quem pode ser texto sobre superfície clara', () => {
  const TEXTO: Token[] = ['ink', 'ink-soft', 'primary', 'primary-strong']

  it.each(
    TEXTO.flatMap((token) => CLARAS.map((fundo) => [token, fundo] as const)),
  )('`%s` é AA como texto sobre `%s` (≥ 4,5:1)', (token, fundo) => {
    expect(pisoDeTexto(token, fundo, 4.5)).toBe(`${token} sobre ${fundo}: OK`)
  })

  it('`ink-soft` é o PISO — nenhum token de texto lê pior que ele', () => {
    // 6,00:1 sobre `ground`. Se um texto novo precisar de um cinza mais claro,
    // o lugar de discutir é aqui, não no componente.
    const piso = contrastRatio(P['ink-soft'], P.ground)
    const piores = (['ink', 'primary', 'primary-strong'] as Token[])
      .map((t) => [t, contrastRatio(P[t], P.ground)] as const)
      .filter(([, r]) => r < piso)
      .map(([t, r]) => `${t}=${r.toFixed(2)}`)

    expect(piores).toEqual([])
    expect(piso).toBeGreaterThanOrEqual(4.5)
  })

  it('`ink` chega a AAA sobre o chão (≥ 7:1)', () => {
    expect(contrastRatio(P.ink, P.ground)).toBeGreaterThanOrEqual(7)
  })
})

describe('contraste — o acento NUNCA é texto sobre claro', () => {
  const ACENTOS: Token[] = ['accent', 'accent-strong']

  it.each(
    ACENTOS.flatMap((token) => CLARAS.map((fundo) => [token, fundo] as const)),
  )('`%s` reprova como texto sobre `%s`', (token, fundo) => {
    // Não é falha — é o fato que a regra protege. `accent` 2,66:1 e
    // `accent-strong` 3,55:1 sobre `ground`: os dois são preenchimento e
    // detalhe. Se um dia algum deles passar de 4,5, a regra do DESIGN.md mudou
    // e é aqui que isso aparece.
    expect(tetoDeNaoTexto(token, fundo, 4.5)).toBe(`${token} sobre ${fundo}: não é texto`)
  })

  it('`accent` sobre `ink` é o ÚNICO uso de texto do acento (4,78:1 ✓ AA)', () => {
    expect(pisoDeTexto('accent', 'ink', 4.5)).toBe('accent sobre ink: OK')
  })

  it('`accent-strong` não herda essa licença — sobre `ink` mede 3,59:1', () => {
    // Os dois acentos não são intercambiáveis dentro de superfície escura: o
    // forte serve de detalhe gráfico ≥24px, nunca de rótulo de botão.
    expect(tetoDeNaoTexto('accent-strong', 'ink', 4.5)).toBe('accent-strong sobre ink: não é texto')
  })

  it('rótulo DENTRO de `accent` é `ink`, e não `primary-strong` (IDN-09)', () => {
    // As boards `5MC-0`/`6AU-0` desenham o contador do carrinho e o botão da
    // newsletter com `primary-strong` sobre `accent`. Medido, esse par dá
    // **4,21:1** — passa de 3, reprova em 4,5, e é rótulo de verdade nos dois
    // lugares (contador de 10px, botão de 13px). `ink` sobre o mesmo ouro dá
    // 4,78:1 e é o par que o DESIGN.md já nomeava. A divergência da board é
    // deliberada e mora aqui, medida, para não voltar por engano.
    expect(tetoDeNaoTexto('primary-strong', 'accent', 4.5)).toBe(
      'primary-strong sobre accent: não é texto',
    )
    expect(pisoDeTexto('ink', 'accent', 4.5)).toBe('ink sobre accent: OK')
  })

  it('`line` e `serenity` também não são texto em superfície nenhuma', () => {
    // 1,25:1 e 1,19:1 sobre o chão. Divisor e faixa — a diferença para o
    // acento é só de grau; a regra é a mesma.
    expect(tetoDeNaoTexto('line', 'ground', 4.5)).toBe('line sobre ground: não é texto')
    expect(tetoDeNaoTexto('serenity', 'ground', 4.5)).toBe('serenity sobre ground: não é texto')
  })
})

describe('contraste — dentro de superfície escura e de superfície primary', () => {
  it('`on-primary` sobre `primary` é AA (8,40:1)', () => {
    // É o par do botão primário. Branco puro daria 9,29 e seria mais duro; o
    // DS escolheu o off-white da marca, que ainda passa com folga.
    expect(pisoDeTexto('on-primary', 'primary', 4.5)).toBe('on-primary sobre primary: OK')
  })

  it('`primary` NÃO serve sobre `ink` — por isso a ação escura é `accent`', () => {
    // 1,45:1. Um CTA `primary` dentro do rodapé escuro desaparece por completo,
    // e é isso que autoriza a variante `onInk` do botão a ser o acento.
    expect(tetoDeNaoTexto('primary', 'ink', 3)).toBe('primary sobre ink: não é texto')
  })

  it('`ground` e `on-primary` são texto legível sobre `ink` (≥ 7:1)', () => {
    expect(contrastRatio(P.ground, P.ink)).toBeGreaterThanOrEqual(7)
    expect(contrastRatio(P['on-primary'], P.ink)).toBeGreaterThanOrEqual(7)
  })
})

describe('contraste — o chão não entra sozinho', () => {
  it('`ground-deep` aparece sobre `ground` (≥ 1,10:1)', () => {
    // A faixa de seção e o palco de foto vivem desta diferença. Um tom claro
    // escolhido sem medir empata em luminância com o chão: a regra continua no
    // CSS e a seção inteira some da tela sem erro em lugar nenhum.
    expect(contrastRatio(P['ground-deep'], P.ground)).toBeGreaterThanOrEqual(1.1)
  })

  it('congela o caso real de empate: a faixa da v1 sobre o chão da v2 dava 1,00:1', () => {
    // Não é hipótese. #FFEFF6 (a faixa de seção da identidade v1) sobre
    // #F9F1EE (o chão que a v2 estreou) mede 1,0045:1 — mesma luminância. A
    // regra continuava no CSS e a seção não aparecia em tela nenhuma. Sem este
    // caso escrito, o piso de 1,10 acima é um número sem história.
    expect(contrastRatio('#FFEFF6', '#F9F1EE')).toBeLessThan(1.01)

    // E o mesmo tom claro sobre o chão da Uma Estrelinha ainda reprovaria:
    // 1,05:1. Trocar o chão sem remedir a faixa é o defeito, não a cor.
    expect(contrastRatio('#FFEFF6', P.ground)).toBeLessThan(1.1)
  })

  it('`ink-soft` sobrevive à troca de superfície (≥ 4,5:1 sobre a faixa)', () => {
    // É o que permite `bg-estrelinha-ground-deep` ser faixa de seção sem
    // reescrever o texto secundário que cai dentro dela: 5,37:1.
    expect(pisoDeTexto('ink-soft', 'ground-deep', 4.5)).toBe('ink-soft sobre ground-deep: OK')
  })
})

describe('contrastRatio — o instrumento', () => {
  // Sem isto, toda medida acima é uma afirmação sobre uma função não conferida.
  it('preto sobre branco dá 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('uma cor contra ela mesma dá 1:1', () => {
    expect(contrastRatio(P.primary, P.primary)).toBeCloseTo(1, 10)
  })

  it('é simétrica — a ordem dos argumentos não muda o resultado', () => {
    expect(contrastRatio(P.ink, P.ground)).toBeCloseTo(contrastRatio(P.ground, P.ink), 10)
  })

  it('aceita hex de 3 dígitos', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('recusa hex inválido em vez de devolver preto silenciosamente', () => {
    // Se ele devolvesse [0,0,0], um token com typo mediria 21:1 e passaria em
    // todo piso deste arquivo.
    expect(() => parseHex('#12345')).toThrow(/Hex inválido/)
  })

  it('luminância relativa: branco = 1, preto = 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
  })
})
