import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/appearance` é módulo puro (molde: `core/announcements/__tests__/purity.test.ts`).
 *
 * Três leitores: a loja, o painel e a função `api/page` da Vercel — esta empacotada por esbuild FORA
 * do Vite, sem o alias `@estrelinha/*`. Um `import` de React ou do client do Supabase aqui não quebra
 * teste nenhum: quebra o bundle da função, ou a primeira requisição.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo** — prosa sobre a régua não pode
 * reprovar a régua. **Âncora de contagem obrigatória**: um caminho errado leria zero arquivo e passaria
 * em silêncio.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Arquivo {
  nome: string
  imports: string[]
}

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(fonte)) !== null) saida.push(m[1])
  return saida
}

const arquivos: Arquivo[] = readdirSync(DIR)
  .filter(f => f.endsWith('.ts'))
  .map(f => ({ nome: f, imports: especificadores(readFileSync(join(DIR, f), 'utf8')) }))

const importadores = (predicado: (spec: string) => boolean): string[] =>
  arquivos.filter(a => a.imports.some(predicado)).map(a => a.nome)

describe('core/appearance é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.map(a => a.nome).sort()).toEqual(['copy.ts', 'index.ts', 'normalize.ts', 'preview.ts', 'types.ts'])
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(7)
  })

  it.each(['react', 'react-dom', '@supabase/supabase-js', '@tanstack/react-query'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(importadores(s => s === dependencia || s.startsWith(`${dependencia}/`))).toEqual([])
    },
  )

  it('nenhum arquivo importa pacote por alias `@estrelinha/` nem o alias `@/` do app', () => {
    expect(importadores(s => s.startsWith('@estrelinha/') || s.startsWith('@/'))).toEqual([])
  })

  it('nenhum arquivo importa módulo do Node nem do Deno', () => {
    expect(
      importadores(s => /^(node:|https?:|npm:|jsr:)/.test(s) || ['fs', 'path', 'url', 'process'].includes(s)),
    ).toEqual([])
  })

  it('todo import é relativo — nenhum pacote', () => {
    expect(importadores(s => !s.startsWith('.'))).toEqual([])
  })
})

describe('core/appearance resolve fora do Vite', () => {
  it('todo import relativo traz a extensão .ts explícita — `import type` incluso', () => {
    const semExtensao: string[] = []
    for (const { nome, imports } of arquivos) {
      for (const spec of imports) {
        if (spec.startsWith('.') && !spec.endsWith('.ts')) semExtensao.push(`${nome} → ${spec}`)
      }
    }
    expect(semExtensao).toEqual([])
  })

  it('a régua DE FATO pegaria as formas proibidas — sensor', () => {
    const specs = especificadores(
      [
        "import type { X } from './sem-extensao'",
        "import { y } from '@estrelinha/core/home'",
        "import React from 'react'",
        "export * from './ok.ts'",
      ].join('\n'),
    )
    expect(specs).toEqual(['./sem-extensao', '@estrelinha/core/home', 'react', './ok.ts'])
    expect(specs.filter(s => s.startsWith('.') && !s.endsWith('.ts'))).toEqual(['./sem-extensao'])
    expect(specs.filter(s => !s.startsWith('.'))).toEqual(['@estrelinha/core/home', 'react'])
  })
})
