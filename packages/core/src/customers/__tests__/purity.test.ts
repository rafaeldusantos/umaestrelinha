import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/customers` roda em Node, em Deno e no navegador (feature `76`, `MAC-27`/G12). Molde de
 * `core/orders/__tests__/purity.test.ts`: a varredura lê ESPECIFICADOR DE IMPORT, nunca o texto, e tem
 * âncora de contagem — um caminho errado leria zero arquivo e passaria em silêncio.
 */
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1])

const listar = (dir: string, prefixo = ''): string[] =>
  readdirSync(dir).flatMap((f) => {
    const caminho = join(dir, f)
    if (statSync(caminho).isDirectory()) return f === '__tests__' ? [] : listar(caminho, `${prefixo}${f}/`)
    return f.endsWith('.ts') ? [`${prefixo}${f}`] : []
  })

const arquivos = listar(DIR).map((nome) => ({ nome, imports: especificadores(readFileSync(join(DIR, nome), 'utf8')) }))

const relativoSemExtensao = (s: string): boolean => s.startsWith('.') && !s.endsWith('.ts')
const runtimeProibido = (s: string): boolean =>
  /^(react|react-dom)(\/|$)/.test(s) || /^@supabase\//.test(s) || /^@estrelinha\//.test(s) || /^(https?:|npm:|jsr:|node:)/.test(s) || /^(Deno)$/.test(s)

describe('core/customers é módulo puro e alcançável pelo Deno', () => {
  it('âncora de contagem — a varredura enxerga o módulo (≥ 7 arquivos)', () => {
    expect(arquivos.map((a) => a.nome)).toEqual(
      expect.arrayContaining(['index.ts', 'slices.ts', 'open.ts', 'id.ts', 'like.ts', 'search.ts', 'cursor.ts', 'link.ts']),
    )
    expect(arquivos.length).toBeGreaterThanOrEqual(8)
  })

  it('todo especificador relativo leva `.ts` explícito', () => {
    expect(arquivos.flatMap((a) => a.imports.filter(relativoSemExtensao).map((s) => `${a.nome} → ${s}`))).toEqual([])
  })

  it('nenhum arquivo importa React, Supabase, alias, `node:`, Deno ou URL', () => {
    expect(arquivos.flatMap((a) => a.imports.filter(runtimeProibido).map((s) => `${a.nome} → ${s}`))).toEqual([])
  })

  it('âncora de USO: o barrel e a busca têm especificadores (a régua não varre o vazio)', () => {
    expect(arquivos.find((a) => a.nome === 'index.ts')?.imports.length).toBeGreaterThanOrEqual(6)
    expect(arquivos.find((a) => a.nome === 'search.ts')?.imports.length).toBeGreaterThanOrEqual(2)
  })

  it('sensor — `import type` relativo sem extensão É acusado; o par com extensão não', () => {
    expect(especificadores(`import type { X } from ${"'./slices'"}`).filter(relativoSemExtensao)).toEqual(['./slices'])
    expect(especificadores(`import type { X } from ${"'./slices.ts'"}`).filter(relativoSemExtensao)).toEqual([])
  })

  it('sensor — React, Supabase, alias e node: são acusados', () => {
    const m = especificadores(
      [
        `import { useState } from ${"'react'"}`,
        `import { c } from ${"'@supabase/supabase-js'"}`,
        `import type { T } from ${"'@estrelinha/supabase/types'"}`,
        `import { r } from ${"'node:fs'"}`,
      ].join('\n'),
    )
    expect(m.filter(runtimeProibido)).toHaveLength(4)
  })

  it('sensor — prosa de comentário que cita uma importação não é acusada', () => {
    const fonte = `// import x from ${"'react'"}\n/* from ${"'@supabase/x'"} */\nexport const a = 1`
    expect(especificadores(fonte)).toEqual([])
  })
})
