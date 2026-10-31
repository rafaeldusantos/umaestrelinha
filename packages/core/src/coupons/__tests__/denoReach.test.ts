/**
 * `core/coupons/rules.ts` é lido pela function `order-proposals` (feature 89) por caminho relativo,
 * no Deno. Lá todo especificador relativo precisa de extensão explícita — inclusive o de tipo — e
 * nenhum pacote resolve sem import map. Vite e vitest resolvem as duas formas, então só este guarda
 * acusa. Molde: `core/checkout/__tests__/denoReach.test.ts`, com o leitor injetável dos sensores.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADAS = ['rules.ts', 'index.ts']

type Leitor = (caminho: string) => string

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
  return saida
}

const rotulo = (caminho: string): string =>
  caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminharGrafo = (entradas: string[], ler: Leitor) => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [...entradas]
  const vistos = new Set<string>()
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (vistos.has(atual)) continue
    vistos.add(atual)
    visitados.push(atual)
    for (const spec of especificadores(ler(atual))) {
      if (!spec.startsWith('.')) {
        externos.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      if (!spec.endsWith('.ts')) {
        semExtensao.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      fila.push(join(dirname(atual), spec))
    }
  }
  return { visitados, semExtensao, externos }
}

const lerDoDisco: Leitor = (caminho) => readFileSync(caminho, 'utf8')
const caminhos = ENTRADAS.map((f) => join(DIR, f))

describe('core/coupons — alcançável pelo Deno', () => {
  const grafo = caminharGrafo(caminhos, lerDoDisco)

  it('âncora: leu rules.ts, index.ts e o vizinho payment/pricing.ts', () => {
    expect(grafo.visitados.map(rotulo)).toEqual(
      expect.arrayContaining(['coupons/rules.ts', 'coupons/index.ts', 'payment/pricing.ts']),
    )
    expect(lerDoDisco(join(DIR, 'rules.ts'))).toContain('export function couponRefusal')
  })

  it('nenhum especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote (React, Supabase, Deno, alias)', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — `import type` sem extensão É acusado', () => {
    const mutante: Leitor = (c) =>
      rotulo(c) === 'coupons/rules.ts'
        ? `import type { X } from '../payment/pricing'\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual([
      'coupons/rules.ts → ../payment/pricing',
    ])
  })

  it('sensor — import do pacote de tipos É acusado', () => {
    const mutante: Leitor = (c) =>
      rotulo(c) === 'coupons/rules.ts'
        ? `import type { Coupon } from '@estrelinha/supabase/types/coupon'\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    expect(caminharGrafo(caminhos, mutante).externos).toHaveLength(1)
  })

  it('sensor inverso — a menção em comentário (CRLF ou LF) não é acusada', () => {
    const mencao: Leitor = (c) =>
      rotulo(c) === 'coupons/rules.ts'
        ? `// from './types'\r\n/* from '@estrelinha/x'\n */\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    const g = caminharGrafo(caminhos, mencao)
    expect(g.semExtensao).toEqual([])
    expect(g.externos).toEqual([])
  })
})
