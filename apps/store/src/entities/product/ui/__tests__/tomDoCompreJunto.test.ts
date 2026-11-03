import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * O registro do negócio é memorial: o bloco Compre Junto não usa urgência, contagem, escassez, prova
 * social, exclamação nem emoji. Os textos estão em `buy-together/` e em `core/buy-together`, e este
 * guarda lê os dois do disco, sem comentário. A régua procura as formas proibidas; a prosa que as
 * explica mora em `.specs/`.
 */

const AQUI = dirname(fileURLToPath(import.meta.url))
const BLOCO = join(AQUI, '..', 'buy-together')
const CORE = join(AQUI, '../../../../../../../packages/core/src/buy-together')

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const lidos = [BLOCO, CORE].flatMap(dir =>
  readdirSync(dir)
    .filter(f => /\.tsx?$/.test(f))
    .map(f => ({ nome: f, fonte: semComentarios(readFileSync(join(dir, f), 'utf8')) })),
)

/** Literais de texto: o que a cliente lê. */
const literais = (fonte: string): string[] =>
  [...fonte.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)].map(m => m[1] ?? m[2] ?? m[3] ?? '')

export const tomProibido = (texto: string): boolean =>
  /últim[ao]s?\b|\brestam?\b|\bresta\b|corra|aproveite|\bhoje\b|por tempo limitado|\bsó (?:até|hoje)|esgotando|poucas unidades|mais (?:vendid|comprad)|\bclientes? (?:amam|escolheram)|!|\p{Extended_Pictographic}/iu.test(
    texto,
  )

describe('o bloco Compre Junto mantém o tom memorial', () => {
  it('âncora: o bloco e as regras foram lidos', () => {
    const nomes = lidos.map(l => l.nome)
    expect(nomes).toContain('BuyTogetherBlock.tsx')
    expect(nomes).toContain('AddonRow.tsx')
    expect(nomes).toContain('total.ts')
    expect(lidos.flatMap(l => literais(l.fonte)).length).toBeGreaterThan(30)
  })

  it('nenhum literal usa urgência, contagem regressiva, escassez, prova social, exclamação ou emoji', () => {
    const achados = lidos.flatMap(l =>
      literais(l.fonte)
        .filter(tomProibido)
        .map(t => `${l.nome}: ${t}`),
    )
    expect(achados).toEqual([])
  })

  it('sensor — cada forma proibida É acusada', () => {
    for (const frase of [
      'Últimas unidades',
      'Restam 2',
      'Corra, é só hoje',
      'Aproveite agora',
      'Oferta por tempo limitado',
      'Os mais vendidos',
      'Clientes amam',
      'Levei junto!',
      'Peça especial ✨',
    ]) {
      expect(tomProibido(frase), frase).toBe(true)
    }
  })

  it('sensor inverso — os textos do bloco NÃO são acusados', () => {
    for (const frase of [
      'Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar.',
      'O botão de compra leva a joia e as peças marcadas.',
      'Escolha a peça · 3 modelos',
      'Essa combinação está indisponível no momento.',
    ]) {
      expect(tomProibido(frase), frase).toBe(false)
    }
  })
})
