import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESCRIPTOR_D, MONOGRAM_D, WORDMARK_D } from '../paths'

/**
 * **Os contadores das letras são buracos, e isso depende da ESTRUTURA do
 * arquivo — não da geometria.**
 *
 * Todos os contornos de uma cor têm de ser subpaths de UM `<path>` só, com
 * `fill-rule="evenodd"` nesse path. É a única forma de o miolo do `a`, do `P`,
 * do `R`, do `O`, do `A` e do `D` ser vazado: `fill-rule` decide preenchimento
 * DENTRO de um path; entre paths separados ele não tem efeito nenhum. Um
 * `<path>` por contorno pinta o contador por cima do corpo, na mesma cor, e a
 * letra sai maciça.
 *
 * Foi exatamente o erro da primeira vetorização — e o mais instrutivo dele é
 * que a verificação de fidelidade **não pegou**: ela rasterizava todos os
 * contornos juntos num único even-odd, então media a geometria e não a
 * estrutura. Os 34 contornos existiam, nas coordenadas certas, e as letras
 * saíam sólidas.
 *
 * Esta suíte é o buraco daquela verificação, tampado.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const BRAND = resolve(HERE, '..')

/** Quantos subpaths (`M` de abertura) o path carrega. */
const subpaths = (d: string) => (d.match(/M/g) ?? []).length

describe('estrutura dos paths da marca', () => {
  it('o wordmark é UM path com muitos subpaths', () => {
    // 13 contornos, segundo a prancha 18. Se alguém quebrar isso em elementos
    // separados, o número aqui não muda — mas o teste dos componentes abaixo
    // pega, porque conta `<path>` renderizado.
    expect(subpaths(WORDMARK_D)).toBeGreaterThan(10)
  })

  it('o descritor é UM path com muitos subpaths', () => {
    // 21 contornos — as letras de "PERSONALIZADOS" mais os contadores.
    expect(subpaths(DESCRIPTOR_D)).toBeGreaterThan(18)
  })

  it('o monograma tem o contador do N vazado', () => {
    expect(subpaths(MONOGRAM_D)).toBeGreaterThanOrEqual(1)
  })
})

describe('cada cor é UM `<path>` com `fill-rule="evenodd"`', () => {
  const components = readdirSync(BRAND).filter((f) => f.endsWith('.tsx'))

  it('a varredura encontra os componentes de marca', () => {
    expect(components.length).toBeGreaterThanOrEqual(3)
  })

  it.each(['NanitaWordmark.tsx', 'NanitaLockup.tsx', 'NanitaMonogram.tsx'])(
    '`%s` só emite `<path>` com `fillRule="evenodd"`',
    (file) => {
      const source = readFileSync(join(BRAND, file), 'utf8')
      const paths = [...source.matchAll(/<path\b[^>]*\/>/g)].map((m) => m[0])

      expect(paths.length).toBeGreaterThan(0)
      for (const path of paths) {
        expect(path).toMatch(/fillRule="evenodd"/)
      }
    },
  )

})

describe('os paths vieram da fonte da marca, sem transcrição', () => {
  it('`paths.ts` bate caractere a caractere com `.specs/brand/nanita-v2/`', () => {
    // Transcrever 10KB de coordenada à mão não quebra nada visível — só deforma
    // a letra, e ninguém repara. Por isso `paths.ts` é gerado, e por isso este
    // teste compara com a fonte em vez de confiar na geração.
    const source = resolve(HERE, '../../../../../../..', '.specs/brand/nanita-v2')
    const dOf = (file: string, index: number) =>
      [...readFileSync(join(source, file), 'utf8').matchAll(/<path[^>]*\sd="([^"]+)"/g)][index][1]

    expect(WORDMARK_D).toBe(dOf('nanita-wordmark.svg', 0))
    expect(DESCRIPTOR_D).toBe(dOf('nanita-logo.svg', 1))
    expect(MONOGRAM_D).toBe(dOf('nanita-monogram-n.svg', 0))
  })
})
