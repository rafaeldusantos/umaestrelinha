/**
 * A function `visit` importa `live/buckets.ts` por caminho relativo, no Deno. O grafo dele tem de ser
 * alcançável: o único especificador é relativo com `.ts` (`import type` incluso) e aponta para uma
 * folha sem import nenhum. Molde de `visits/__tests__/denoReach.test.ts`, com leitor injetável.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

type Leitor = (relativo: string) => string
const lerDoDisco: Leitor = (r) => readFileSync(join(SRC, r), 'utf8')

const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g)].map((m) => m[1])

const problemas = (ler: Leitor, arquivo: string): string[] =>
  especificadores(ler(arquivo)).filter((s) => !s.startsWith('.') || !s.endsWith('.ts'))

describe('live/buckets.ts — alcançável pelo Deno', () => {
  it('âncora: o arquivo foi lido e importa exatamente o contrato da presença', () => {
    expect(lerDoDisco('live/buckets.ts')).toContain('export function sourceBucket')
    expect(especificadores(lerDoDisco('live/buckets.ts'))).toEqual(['../visits/presence.ts'])
  })

  it('todo especificador é relativo e com `.ts`', () => {
    expect(problemas(lerDoDisco, 'live/buckets.ts')).toEqual([])
  })

  it('o contrato que ele importa é folha (não importa nada)', () => {
    expect(especificadores(lerDoDisco('visits/presence.ts'))).toEqual([])
  })

  it('sensor — `import type` sem extensão e import de pacote SÃO acusados', () => {
    const mutante: Leitor = (r) => `import type { X } from '../visits/presence'\nimport { y } from '@estrelinha/core/visits'\n${lerDoDisco(r)}`
    expect(problemas(mutante, 'live/buckets.ts')).toEqual(['../visits/presence', '@estrelinha/core/visits'])
  })
})
