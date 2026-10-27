import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature `83` — `core/live` é módulo puro e alcançável fora do Vite (molde de
 * `core/stats/__tests__/purity.test.ts`). Âncora de contagem: um caminho errado lê zero arquivo e
 * passa em silêncio.
 */
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte.replace(/\r\n/g, '\n')).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1])

const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((nome) => ({ nome, imports: especificadores(readFileSync(join(DIR, nome), 'utf8')) }))

const semExtensao = (imports: string[]) => imports.filter((s) => s.startsWith('.') && !s.endsWith('.ts'))
const proibido = (s: string) => /^(react|react-dom)(\/|$)|^@supabase\/|^@estrelinha\/|^@\/|^node:|^(https?:|npm:|jsr:)/.test(s)

describe('core/live é puro', () => {
  it('âncora: pelo menos três arquivos (index, access, card), e o barril importa os dois', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(3)
    expect(arquivos.map((a) => a.nome)).toEqual(expect.arrayContaining(['index.ts', 'access.ts', 'card.ts']))
    expect(arquivos.find((a) => a.nome === 'index.ts')!.imports).toEqual(['./access.ts', './card.ts'])
  })

  it('todo especificador relativo leva `.ts` (`import type` incluso)', () => {
    expect(arquivos.flatMap((a) => semExtensao(a.imports).map((s) => `${a.nome} → ${s}`))).toEqual([])
  })

  it('nenhum import de React, Supabase, Deno, `node:`, alias ou URL', () => {
    expect(arquivos.flatMap((a) => a.imports.filter(proibido))).toEqual([])
  })

  it('sensor — o relativo sem `.ts` (também em `import type`) é acusado; o comentário não', () => {
    expect(semExtensao(especificadores(`import type { X } from '../stats/movement'`))).toEqual(['../stats/movement'])
    expect(semExtensao(especificadores(`import { y } from './access.ts'`))).toEqual([])
    expect(especificadores(`// from './x'\r\nexport const a = 1`)).toEqual([])
  })

  it('sensor — React, Supabase, alias e `node:` são acusados', () => {
    for (const s of ['react', '@supabase/supabase-js', '@estrelinha/core/stats', '@/x', 'node:fs']) expect(proibido(s)).toBe(true)
    expect(proibido('../stats/labels.ts')).toBe(false)
  })
})
