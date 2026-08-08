import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SYMBOL, SYMBOL_TINY } from '@/shared/ui/brand/paths'

/**
 * Os ativos de marca e a cabeça do documento — `IDN-07`.
 *
 * Ícone é a categoria de bug mais silenciosa que existe: o arquivo some, o
 * `<link>` aponta para o lugar errado, o `theme-color` fica na cor da paleta
 * velha — e nada disso quebra build, tipo ou teste de componente. Só a aba do
 * navegador muda, e ninguém olha para a aba da própria loja.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const STORE = resolve(HERE, '../../..')
const PUBLIC = resolve(STORE, 'public')
const INDEX = readFileSync(resolve(STORE, 'index.html'), 'utf8')

/** Todo `href`/`content` do `<head>` que aponta para um arquivo do próprio site. */
const REFERENCIADOS = [...INDEX.matchAll(/(?:href|content)="\/([^"]+)"/g)].map((m) => m[1])

describe('todo arquivo que o index.html referencia existe no disco', () => {
  it('a leitura encontrou as referências locais', () => {
    // Âncora: um `index.html` lido do lugar errado não referencia nada, e um
    // teste que itera lista vazia passa em silêncio. São quatro ícones hoje.
    expect(REFERENCIADOS.length).toBeGreaterThanOrEqual(4)
  })

  it.each(REFERENCIADOS)('`public/%s`', (file) => {
    const path = resolve(PUBLIC, file)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(500)
  })
})

describe('favicon.svg — a ABA, com recorte próprio', () => {
  const svg = readFileSync(resolve(PUBLIC, 'favicon.svg'), 'utf8')

  it('é 64×64', () => {
    expect(svg).toMatch(/viewBox="0 0 64 64"/)
  })

  it('tem canto próprio — o navegador não arredonda favicon', () => {
    // 3,84 / 64 = 6%. Canto pequeno de propósito: o extremo deste desenho é a
    // ponta da estrela, na DIAGONAL — exatamente onde um canto grande come
    // área. Um squircle de 28% obrigaria a encolher a arte para 0,856 e o
    // traço cairia de 1,28px para 1,10px a 16px.
    const rx = Number(svg.match(/rx="([\d.]+)"/)?.[1])
    expect(rx).toBe(3.84)
    expect(rx / 64).toBeCloseTo(0.06, 3)
  })

  it('é placa `primary-strong` com a marca em `on-primary`', () => {
    expect(svg).toMatch(/fill="#283A4A"/)
    expect(svg).toMatch(/stroke="#F7F3EC"/)
  })

  it('usa o path do símbolo REDUZIDO, caractere a caractere', () => {
    // Nada foi redesenhado para caber em 16px: a redução veio da prancha
    // `734-0`, e é a mesma que `paths.ts` carrega.
    expect(svg).toContain(SYMBOL_TINY.strokes[0].d)
  })

  it('NÃO usa o símbolo grande, que a 16px vira mancha', () => {
    // A prancha diz, medido: "abaixo de 32px o símbolo completo vira mancha:
    // as pétalas e as fagulhas fecham".
    expect(svg).not.toContain(SYMBOL.strokes[0].d)
  })
})

describe('a espessura do traço a 16px', () => {
  it('a redução tem quase 3× o traço do símbolo grande', () => {
    // "É quase 3x o traço do símbolo grande, e é proposital" — prancha `734-0`.
    expect(SYMBOL_TINY.strokes[0].width / SYMBOL.strokes[0].width).toBeGreaterThan(2.5)
  })

  it('rende ao menos 1,28px de linha numa aba de 16px', () => {
    // O board calibrou a redução para "render pelo menos 1,3px de linha a
    // 16px". A arte é sangrada — ocupa o quadro inteiro —, então a fração do
    // traço sobre o lado é a própria espessura sobre o viewBox de 100.
    const [, , vb] = SYMBOL_TINY.viewBox.split(/\s+/).map(Number)
    expect((SYMBOL_TINY.strokes[0].width / vb) * 16).toBeGreaterThanOrEqual(1.28)
  })

  it('o símbolo GRANDE não alcançaria esse piso a 16px', () => {
    // É o que torna a redução necessária, e não uma preferência: 2,46% × 16 =
    // 0,39px. Se um dia alguém apontar o favicon para o símbolo grande, este
    // teste é o motivo escrito.
    const [, , vb] = SYMBOL.viewBox.split(/\s+/).map(Number)
    expect((SYMBOL.strokes[0].width / vb) * 16).toBeLessThan(1)
  })
})

describe('apple-touch-icon — o atalho do iOS, SANGRADO', () => {
  const png = readFileSync(resolve(PUBLIC, 'apple-touch-icon.png'))

  it('é 180×180', () => {
    // Os oito primeiros bytes são a assinatura do PNG; largura e altura vêm no
    // IHDR, em big-endian, a partir do byte 16.
    expect(png.readUInt32BE(16)).toBe(180)
    expect(png.readUInt32BE(20)).toBe(180)
  })

  it('a fonte dele não tem canto — o iOS aplica a própria máscara', () => {
    // Arte pré-arredondada deixa uma sobra entre o desenho e o corte do
    // sistema. Quem decide o raio ali é o iOS, não a arte.
    const fonte = readFileSync(resolve(PUBLIC, 'icon-maskable.svg'), 'utf8')
    expect(fonte).toMatch(/viewBox="0 0 180 180"/)
    expect(fonte).not.toMatch(/<rect[^>]*\srx=/)
  })
})

describe('favicon.ico — três tamanhos', () => {
  const ico = readFileSync(resolve(PUBLIC, 'favicon.ico'))

  it('é um ícone com 3 entradas', () => {
    expect(ico.readUInt16LE(0)).toBe(0) // reservado
    expect(ico.readUInt16LE(2)).toBe(1) // 1 = ícone
    expect(ico.readUInt16LE(4)).toBe(3)
  })

  it('traz 16, 32 e 48', () => {
    const sizes = [0, 1, 2].map((i) => ico.readUInt8(6 + i * 16))
    expect(sizes).toEqual([16, 32, 48])
  })
})

describe('index.html — a cabeça do documento', () => {
  it.each([
    ['icon svg', /rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/],
    ['icon ico', /rel="icon" type="image\/x-icon" href="\/favicon\.ico"/],
    ['icon 512', /rel="icon"[^>]*sizes="512x512" href="\/icon-512\.png"/],
    ['apple-touch-icon', /rel="apple-touch-icon" sizes="180x180" href="\/apple-touch-icon\.png"/],
  ])('declara %s', (_label, pattern) => {
    expect(INDEX).toMatch(pattern)
  })

  it('`theme-color` está declarado e não é a geleia velha', () => {
    // O VALOR é da T35 (metadados), não desta task. O que se guarda aqui é que
    // ele existe e não voltou ao rosa que a paleta já não tem.
    expect(INDEX).toMatch(/name="theme-color" content="#[0-9A-Fa-f]{6}"/)
    expect(INDEX).not.toContain('#B0176B')
  })
})

describe('index.html — as fontes', () => {
  const fontLink = INDEX.match(/<link href="https:\/\/fonts\.googleapis[^>]*>/)?.[0] ?? ''

  it('a leitura encontrou o `<link>` do Google Fonts', () => {
    // Âncora: sem ela, as asserções de "não pede X" abaixo passariam sobre uma
    // string vazia — que é exatamente o resultado de um regex que deixou de
    // casar. Um `<link>` só, e é o que a loja carrega.
    expect(fontLink).toMatch(/family=/)
  })

  it('pede Libre Baskerville e Outfit', () => {
    expect(fontLink).toMatch(/family=Libre\+Baskerville/)
    expect(fontLink).toMatch(/family=Outfit/)
  })

  it('pede os pesos que o DS declara, e só eles', () => {
    // Libre Baskerville existe em 400, 700 e itálico de 400 — não há 500 nem
    // 600. Pedir peso inexistente faz o navegador sintetizar falso-negrito.
    expect(fontLink).toMatch(/Libre\+Baskerville:ital,wght@0,400;0,700;1,400/)
    // Outfit é variável: uma faixa cobre os cinco pesos do DS (300..700).
    expect(fontLink).toMatch(/Outfit:wght@300\.\.700/)
  })

  it.each(['Fredoka', 'DM+Sans', 'Berkshire', 'Lilita'])(
    'NÃO pede `%s`, da identidade anterior',
    (familia) => {
      expect(fontLink).not.toContain(familia)
    },
  )

  it('nenhuma outra origem de fonte é requisitada', () => {
    // Uma segunda origem passaria despercebida: a página renderiza, e o custo
    // aparece só no waterfall de quem abre no 4G.
    const origens = [...INDEX.matchAll(/<link[^>]*href="(https?:\/\/[^/"]+)/g)].map((m) => m[1])
    expect([...new Set(origens)].sort()).toEqual([
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
    ])
  })
})
