import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { contrastRatio, parseHex, relativeLuminance } from '../contrast'
import tailwindConfig from '../../../../tailwind.config'

/**
 * A paleta papelaria (feature 19) é declarada em DOIS lugares — `App.css` e
 * `tailwind.config.ts` — e é isso que esta suíte guarda.
 *
 * Um valor certo num lado e velho no outro não quebra build, não quebra tipo e
 * não quebra teste de componente: a loja simplesmente renderiza duas paletas ao
 * mesmo tempo, e quem descobre é a cliente. O teste lê os dois arquivos do
 * disco e compara.
 *
 * Os pisos de contraste vêm da prancha 18 do Paper, medidos sobre Papel
 * #F9F1EE — e são requisito de aceite (`PAP-03`), não zelo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_CSS = resolve(HERE, '../../../app/App.css')

/** Valores canônicos — a prancha 18. Nenhum outro arquivo é fonte disso. */
const PAPELARIA = {
  paper: '#F9F1EE', // Papel       — o chão
  sugar: '#F7D6E0', // Mata-borrão — faixa de seção
  border: '#EBDDD7', // Dobra       — divisor
  rule: '#8F7268', // Papelão      — borda de campo
  glaze: '#F1678D', // Carimbo     — preenchimento
  raspberry: '#E93A6D', // Selo     — detalhe gráfico
  jam: '#A62348', // Carmim        — texto de dinheiro
  plum: '#7E5769', // Carbono      — texto secundário
  ink: '#2E2028', // Grafite       — texto primário
  butter: '#FFC95C', // Fita       — badge
} as const

type TokenName = keyof typeof PAPELARIA

function cssTokens(): Record<string, string> {
  const css = readFileSync(APP_CSS, 'utf8')
  const found: Record<string, string> = {}

  for (const match of css.matchAll(/--nanita-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    found[match[1]] = match[2].toUpperCase()
  }

  return found
}

function tailwindTokens(): Record<string, string> {
  const nanita = (tailwindConfig.theme?.extend?.colors as Record<string, unknown> | undefined)
    ?.nanita as Record<string, string> | undefined

  if (!nanita) throw new Error('tailwind.config.ts não declara `colors.nanita`')

  return Object.fromEntries(Object.entries(nanita).map(([k, v]) => [k, v.toUpperCase()]))
}

describe('paleta papelaria — os valores', () => {
  const css = cssTokens()
  const tw = tailwindTokens()

  it.each(Object.entries(PAPELARIA))('`--nanita-%s` vale %s no App.css', (token, hex) => {
    expect(css[token]).toBe(hex.toUpperCase())
  })

  it.each(Object.entries(PAPELARIA))('`nanita.%s` vale %s no Tailwind', (token, hex) => {
    expect(tw[token]).toBe(hex.toUpperCase())
  })

  it('os dois arquivos declaram exatamente o mesmo conjunto de tokens', () => {
    // Sem isto, um token novo entra num lado só e a classe Tailwind
    // correspondente nasce sem valor (ou vice-versa) sem ninguém notar.
    const cssNames = Object.keys(css).sort()
    const twNames = Object.keys(tw).sort()

    expect(cssNames).toEqual(twNames)
  })

  it('os dois arquivos concordam em cada valor', () => {
    for (const token of Object.keys(css)) {
      expect(`${token}=${tw[token]}`).toBe(`${token}=${css[token]}`)
    }
  })
})

describe('paleta papelaria — os pisos de contraste sobre Papel', () => {
  const paper = PAPELARIA.paper

  /** Texto: AA pede 4,5:1 para corpo. */
  it.each<[TokenName, number]>([
    ['jam', 4.5], // Carmim  — preço, link, botão
    ['plum', 4.5], // Carbono — texto secundário, o piso
  ])('%s serve de texto sobre Papel (≥ %s:1)', (token, floor) => {
    expect(contrastRatio(PAPELARIA[token], paper)).toBeGreaterThanOrEqual(floor)
  })

  it('Grafite chega a AAA sobre Papel (≥ 7:1)', () => {
    expect(contrastRatio(PAPELARIA.ink, paper)).toBeGreaterThanOrEqual(7)
  })

  it('Papelão serve de borda de campo (WCAG 1.4.11, ≥ 3:1)', () => {
    // É a razão de `--nanita-rule` existir separado de `--nanita-border`.
    expect(contrastRatio(PAPELARIA.rule, paper)).toBeGreaterThanOrEqual(3)
  })

  it('Selo serve de detalhe gráfico e texto grande (≥ 3:1)', () => {
    expect(contrastRatio(PAPELARIA.raspberry, paper)).toBeGreaterThanOrEqual(3)
  })

  /**
   * Estes NÃO são falha — são o fato que a regra "nunca texto" protege. Se um
   * dia algum deles passar de 3, a regra do DESIGN.md mudou e este teste é o
   * lugar onde isso aparece.
   */
  it.each<TokenName>(['glaze', 'sugar', 'border', 'butter'])(
    '%s é preenchimento, não texto: fica abaixo de 3:1 sobre Papel',
    (token) => {
      expect(contrastRatio(PAPELARIA[token], paper)).toBeLessThan(3)
    },
  )
})

describe('paleta papelaria — a guarda do chão', () => {
  it('Mata-borrão aparece sobre Papel (≥ 1,15:1)', () => {
    // O defeito que motivou a feature: o `sugar` da v1 (#FFEFF6) sobre Papel dá
    // 1,00:1 — mesma luminância. A faixa de seção continuaria no CSS e não
    // apareceria em tela nenhuma. O chão não entra sozinho.
    expect(contrastRatio(PAPELARIA.sugar, PAPELARIA.paper)).toBeGreaterThanOrEqual(1.15)
  })

  it('o `sugar` da v1 falharia essa guarda', () => {
    // Congela o motivo. Sem isto, "≥ 1,15" é um número sem história.
    expect(contrastRatio('#FFEFF6', PAPELARIA.paper)).toBeLessThan(1.01)
  })
})

describe('paleta papelaria — sobre Mata-borrão', () => {
  const sugar = PAPELARIA.sugar

  it('Carbono ainda é AA sobre Mata-borrão (≥ 4,5:1)', () => {
    // É o que faz `bg-nanita-sugar` continuar servindo de faixa de seção sem
    // reescrever os 92 usos: o texto secundário sobrevive à troca de superfície.
    expect(contrastRatio(PAPELARIA.plum, sugar)).toBeGreaterThanOrEqual(4.5)
  })

  it('#F7D6E0 é o TETO do rosa de superfície — um passo mais fundo derruba Carbono', () => {
    // Prancha 18: `#F4CFDB` leva Carbono a 4,28, abaixo de AA. Sem este teste,
    // "por que não um rosa mais forte?" vira uma pergunta sem resposta escrita.
    expect(contrastRatio(PAPELARIA.plum, '#F4CFDB')).toBeLessThan(4.5)
  })

  it('Papelão ainda serve de borda de campo sobre Mata-borrão (≥ 3:1)', () => {
    expect(contrastRatio(PAPELARIA.rule, sugar)).toBeGreaterThanOrEqual(3)
  })
})

describe('paleta papelaria — sobre Grafite', () => {
  const ink = PAPELARIA.ink

  it('Fita só é legível sobre Grafite (≥ 7:1)', () => {
    expect(contrastRatio(PAPELARIA.butter, ink)).toBeGreaterThanOrEqual(7)
  })

  it('Carimbo serve de CTA sobre Grafite (≥ 4,5:1)', () => {
    // É o que autoriza a variante `onInk` do botão a ser Carimbo com texto
    // Grafite, em vez de Carmim — que sobre Grafite lê a 2,18:1.
    expect(contrastRatio(PAPELARIA.glaze, ink)).toBeGreaterThanOrEqual(4.5)
  })

  it('Carmim NÃO serve sobre Grafite — é por isso que a variante escura é Carimbo', () => {
    expect(contrastRatio(PAPELARIA.jam, ink)).toBeLessThan(3)
  })

  it('o descritor do lockup sobre Grafite é Dobra, não Carbono', () => {
    // Prancha 18: Carbono sobre Grafite dá 2,55:1 e o descritor desaparece.
    expect(contrastRatio(PAPELARIA.plum, ink)).toBeLessThan(3)
    expect(contrastRatio(PAPELARIA.border, ink)).toBeGreaterThanOrEqual(7)
  })
})

describe('contrastRatio — a fórmula', () => {
  it('preto sobre branco dá 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('uma cor contra ela mesma dá 1:1', () => {
    expect(contrastRatio(PAPELARIA.jam, PAPELARIA.jam)).toBeCloseTo(1, 10)
  })

  it('é simétrica — a ordem dos argumentos não muda o resultado', () => {
    expect(contrastRatio(PAPELARIA.ink, PAPELARIA.paper)).toBeCloseTo(
      contrastRatio(PAPELARIA.paper, PAPELARIA.ink),
      10,
    )
  })

  it('aceita hex de 3 dígitos', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255])
  })

  it('recusa hex inválido em vez de devolver preto silenciosamente', () => {
    expect(() => parseHex('#12345')).toThrow(/Hex inválido/)
  })

  it('luminância relativa: branco = 1, preto = 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
  })
})
