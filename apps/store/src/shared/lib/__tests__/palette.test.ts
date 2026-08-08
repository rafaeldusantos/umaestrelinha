import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindConfig from '../../../../tailwind.config'

/**
 * A paleta da Uma Estrelinha é declarada em DOIS lugares — `src/app/App.css` e
 * `tailwind.config.ts` — e é isso que esta suíte guarda.
 *
 * Um valor certo num lado e velho no outro não quebra build, não quebra tipo e
 * não quebra teste de componente: a loja simplesmente renderiza duas paletas ao
 * mesmo tempo, e quem descobre é a cliente. O teste lê os dois arquivos do
 * disco e compara.
 *
 * Os pisos de contraste NÃO estão aqui — são `contrast.test.ts`. Aqui só se
 * prova que os dois arquivos dizem a mesma coisa.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const APP_CSS = resolve(HERE, '../../../app/App.css')

/**
 * Os valores canônicos — o arquivo do Paper "Uma Estrelinha", idêntico a
 * `../landing-pages/src/styles/global.css`. Nenhum outro arquivo é fonte disso.
 */
const PALETA = {
  ground: '#FAF8F4', // o chão da loja
  'ground-deep': '#F1EBE1', // faixa de seção, palco de foto
  surface: '#FFFFFF', // card
  line: '#E6DFD4', // divisor — nunca borda de campo
  ink: '#23303A', // texto primário e superfície escura
  'ink-soft': '#54616B', // texto secundário — o piso
  primary: '#34495E', // ação, link, preço, aba ativa
  'primary-strong': '#283A4A', // hover / pressed
  'on-primary': '#F7F3EC', // texto sobre superfície primary
  accent: '#B8945F', // preenchimento, detalhe — nunca texto sobre claro
  'accent-strong': '#A07E4C', // detalhe gráfico ≥24px
  serenity: '#DCE6EC', // faixa pontual — nunca texto
  whatsapp: '#25D366', // só o botão do WhatsApp
  field: '#8C8073', // borda de input e de controle — nasceu na feature 20
} as const

function cssTokens(): Record<string, string> {
  const css = readFileSync(APP_CSS, 'utf8')
  const found: Record<string, string> = {}

  for (const match of css.matchAll(/--estrelinha-([a-z-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    found[match[1]] = match[2].toUpperCase()
  }

  return found
}

function tailwindTokens(): Record<string, string> {
  const estrelinha = (tailwindConfig.theme?.extend?.colors as Record<string, unknown> | undefined)
    ?.estrelinha as Record<string, string> | undefined

  if (!estrelinha) throw new Error('tailwind.config.ts não declara `colors.estrelinha`')

  return Object.fromEntries(Object.entries(estrelinha).map(([k, v]) => [k, v.toUpperCase()]))
}

describe('paleta Uma Estrelinha — os valores', () => {
  const css = cssTokens()
  const tw = tailwindTokens()

  it('a leitura do App.css encontrou a paleta inteira', () => {
    // Âncora de contagem: um erro de caminho ou de regex faria as duas leituras
    // devolverem `{}` e todas as comparações abaixo passariam em silêncio.
    expect(Object.keys(css).length).toBeGreaterThanOrEqual(14)
  })

  it.each(Object.entries(PALETA))('`--estrelinha-%s` vale %s no App.css', (token, hex) => {
    expect(css[token]).toBe(hex.toUpperCase())
  })

  it.each(Object.entries(PALETA))('`estrelinha.%s` vale %s no Tailwind', (token, hex) => {
    expect(tw[token]).toBe(hex.toUpperCase())
  })

  it('os dois arquivos declaram exatamente o mesmo conjunto de tokens', () => {
    // Sem isto, um token novo entra num lado só e a classe Tailwind
    // correspondente nasce sem valor (ou vice-versa) sem ninguém notar.
    expect(Object.keys(css).sort()).toEqual(Object.keys(tw).sort())
  })

  it('os dois arquivos concordam em cada valor', () => {
    for (const token of Object.keys(css)) {
      // Comparação com o nome embutido: a mensagem de falha nomeia o token, e
      // não só "esperava #34495E, recebeu #A62348".
      expect(`${token}=${tw[token]}`).toBe(`${token}=${css[token]}`)
    }
  })
})

describe('paleta Uma Estrelinha — a escala de raio', () => {
  const radius = tailwindConfig.theme?.extend?.borderRadius as Record<string, string>

  it('é a escala do DS: sm 6 · md 12 · lg 20 · pill 999', () => {
    expect(radius.sm).toBe('6px')
    expect(radius.md).toBe('12px')
    expect(radius.lg).toBe('20px')
    expect(radius.pill).toBe('999px')
  })

  it('a chave custom `button` NÃO existe mais', () => {
    // Ela existia só para vencer o `rounded-md` do shadcn, que o
    // `tailwind-merge` não colapsa contra token custom. Com a ação em 6px o
    // conflito acabou — e uma chave custom viva convidaria a maquinaria de
    // volta (ordem de declaração, allowlist, teste de "é a última chave").
    expect(radius).not.toHaveProperty('button')
  })
})

describe('paleta Uma Estrelinha — as sombras', () => {
  const shadows = tailwindConfig.theme?.extend?.boxShadow as Record<string, string>

  it.each(['estrelinha-soft', 'estrelinha-lift', 'estrelinha-ink'])('`%s` existe', (name) => {
    expect(shadows[name]).toBeTruthy()
  })

  it('nenhuma sombra ficou no rosa da papelaria', () => {
    // Recalibradas para o slate: `primary` 52,73,94 e `ink` 35,48,58. O rosa
    // (233, 58, 109) sob um card sobre `ground` deixa um halo que não é da
    // marca — e sombra errada é o tipo de resíduo que ninguém procura.
    const rosa = Object.entries(shadows)
      .filter(([name]) => name.startsWith('estrelinha-'))
      .filter(([, value]) => /233,\s*58,\s*109/.test(value))
      .map(([name]) => name)

    expect(rosa).toEqual([])
  })
})
