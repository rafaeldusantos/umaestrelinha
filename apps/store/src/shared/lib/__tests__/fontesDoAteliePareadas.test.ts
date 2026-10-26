import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Feature 72 — as fontes da marca são uma CÓPIA DELIBERADA, e é isto que a guarda.
 *
 * A loja serve `public/fonts/*.woff2` com `preload` de caminho estável, e o app do ateliê
 * (`apps/mobile-adm`) precisa dos mesmos arquivos. `publicDir` não se compartilha entre apps, e ler
 * a pasta pública da loja seria um app importando de outro — então os arquivos são copiados, e esta
 * suíte lê os dois lados do disco e compara o SHA-256 arquivo a arquivo (consequência 3 do
 * "defeito 01": cópia deliberada com guarda que lê os dois e compara).
 *
 * Mora na suíte da LOJA porque é ela quem é dona do arquivo-fonte.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const LOJA = resolve(HERE, '../../../../public/fonts')
const ATELIE = resolve(HERE, '../../../../../mobile-adm/public/fonts')

/** Âncora cravada: Libre Baskerville regular e itálica, e Outfit. */
const FONTES_ESPERADAS = 3

const woff2 = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.woff2')).sort()
const sha = (buf: Buffer) => createHash('sha256').update(buf).digest('hex')

/** Nomes dos arquivos que faltam ou divergem entre os dois lados. Vazio = pareados. */
function divergentes(
  loja: Record<string, Buffer>,
  atelie: Record<string, Buffer>,
): string[] {
  const nomes = [...new Set([...Object.keys(loja), ...Object.keys(atelie)])].sort()
  return nomes.filter((n) => !loja[n] || !atelie[n] || sha(loja[n]) !== sha(atelie[n]))
}

const ler = (dir: string) =>
  Object.fromEntries(woff2(dir).map((f) => [f, readFileSync(resolve(dir, f))])) as Record<string, Buffer>

describe('fontes do ateliê — cópia byte a byte das da loja', () => {
  const loja = ler(LOJA)
  const atelie = ler(ATELIE)

  it(`âncora: os dois lados têm exatamente ${FONTES_ESPERADAS} arquivos woff2`, () => {
    expect(Object.keys(loja)).toHaveLength(FONTES_ESPERADAS)
    expect(Object.keys(atelie)).toHaveLength(FONTES_ESPERADAS)
  })

  it('os mesmos nomes dos dois lados', () => {
    expect(Object.keys(atelie)).toEqual(Object.keys(loja))
  })

  it('o SHA-256 de cada arquivo é o mesmo dos dois lados', () => {
    expect(divergentes(loja, atelie)).toEqual([])
  })

  it('sensor: um buffer com um byte trocado é acusado pelo nome', () => {
    const [primeiro] = Object.keys(loja)
    const alterado = Buffer.from(atelie[primeiro])
    alterado[alterado.length - 1] ^= 0xff
    expect(divergentes(loja, { ...atelie, [primeiro]: alterado })).toEqual([primeiro])
  })

  it('sensor: um arquivo que falta de um lado é acusado', () => {
    const [primeiro, ...resto] = Object.keys(loja)
    const semUm = Object.fromEntries(resto.map((n) => [n, atelie[n]]))
    expect(divergentes(loja, semUm)).toEqual([primeiro])
  })
})
