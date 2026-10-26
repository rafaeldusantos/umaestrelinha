import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature `73` — `core/stats` é módulo puro e alcançável fora do Vite (molde de
 * `core/orders/__tests__/purity.test.ts`). Âncora de contagem obrigatória: um caminho errado lê zero
 * arquivo e passa em silêncio.
 */
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1])

const arquivos = readdirSync(DIR)
  .filter((f) => f.endsWith('.ts'))
  .map((nome) => ({ nome, imports: especificadores(readFileSync(join(DIR, nome), 'utf8')) }))

describe('core/stats é puro', () => {
  it('âncora: os cinco arquivos', () => {
    expect(arquivos.map((a) => a.nome).sort()).toEqual(['index.ts', 'labels.ts', 'movement.ts', 'overview.ts', 'turn.ts'])
    expect(arquivos.find((a) => a.nome === 'index.ts')!.imports.length).toBeGreaterThanOrEqual(4)
  })

  it('todo especificador relativo leva `.ts`', () => {
    expect(arquivos.flatMap((a) => a.imports.filter((s) => s.startsWith('.') && !s.endsWith('.ts')).map((s) => `${a.nome} → ${s}`))).toEqual([])
  })

  it('nenhum import de React, Supabase, alias ou URL', () => {
    const proibido = (s: string) => /^(react|react-dom)(\/|$)|^@supabase\/|^@estrelinha\/|^(https?:|npm:|jsr:)/.test(s)
    expect(arquivos.flatMap((a) => a.imports.filter(proibido))).toEqual([])
  })

  it('nenhum `new Date(` sobre um dia nu — o dia é texto do banco (`AD-055`)', () => {
    const acusados = arquivos.filter((a) =>
      /new Date\(\s*(dia|mes|hoje)\b/.test(semComentario(readFileSync(join(DIR, a.nome), 'utf8'))),
    )
    expect(acusados.map((a) => a.nome)).toEqual([])
  })

  it('sensor — relativo sem `.ts` e o alias são acusados', () => {
    expect(especificadores(`import type { X } from './movement'`)).toEqual(['./movement'])
    expect(especificadores(`// from './x'\nexport const a = 1`)).toEqual([])
  })
})
