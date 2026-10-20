import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature 69, T06 — `core/page` é módulo puro (molde: `core/shopping/__tests__/purity.test.ts`).
 *
 * Quem o executa é a função `api/page` da Vercel, empacotada por esbuild FORA do Vite: sem o alias
 * `@estrelinha/*`, e com a regra servindo HTML de toda rota. Um `import` de React ou do client do
 * Supabase aqui não quebra teste nenhum — quebra o bundle da função, ou a primeira requisição. As
 * leituras entram pelas `deps` (`PageDeps`); o módulo não sabe que banco existe.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo** — prosa sobre a régua não
 * pode reprovar a régua. **Âncora de contagem obrigatória**: um caminho errado leria zero arquivo e
 * passaria em silêncio.
 */

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Arquivo {
  nome: string
  fonte: string
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
  .map(f => {
    const fonte = readFileSync(join(DIR, f), 'utf8')
    return { nome: f, fonte, imports: especificadores(fonte) }
  })

const importadores = (predicado: (spec: string) => boolean): string[] =>
  arquivos.filter(a => a.imports.some(predicado)).map(a => a.nome)

describe('core/page é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(6)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining(['categoryRoute.ts', 'classify.ts', 'head.ts', 'images.ts', 'serve.ts', 'index.ts']),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(15)
  })

  it.each(['react', 'react-dom', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(importadores(s => s === dependencia || s.startsWith(`${dependencia}/`))).toEqual([])
    },
  )

  it('nenhum arquivo importa módulo do Node (`node:` ou `fs`/`path`) nem do Deno (`https://`, `npm:`, `jsr:`)', () => {
    expect(
      importadores(s => /^(node:|https?:|npm:|jsr:)/.test(s) || ['fs', 'path', 'url', 'process'].includes(s)),
    ).toEqual([])
  })

  it('nenhum arquivo usa global de runtime — Deno, process, document, window', () => {
    const culpados = arquivos.filter(a =>
      /\b(Deno|process|document|window|localStorage)\s*\.\w/.test(
        a.fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, ''),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })

  it('nenhum arquivo importa pacote por alias `@estrelinha/` — o bundle da função não o conhece', () => {
    expect(importadores(s => s.startsWith('@estrelinha/'))).toEqual([])
  })

  it('nenhum arquivo importa de apps/ nem de payment/', () => {
    expect(importadores(s => s.includes('apps/') || s.includes('/payment/'))).toEqual([])
  })
})

describe('core/page resolve fora do Vite', () => {
  it('todo import relativo traz a extensão .ts explícita — `import type` incluso', () => {
    const semExtensao: string[] = []
    for (const { nome, imports } of arquivos) {
      for (const spec of imports) {
        if (spec.startsWith('.') && !spec.endsWith('.ts')) semExtensao.push(`${nome} → ${spec}`)
      }
    }
    expect(semExtensao).toEqual([])
  })

  it('a varredura de extensão de fato encontra imports relativos — âncora', () => {
    const relativos = arquivos.reduce((n, a) => n + a.imports.filter(s => s.startsWith('.')).length, 0)
    expect(relativos).toBeGreaterThanOrEqual(15)
  })

  it('a régua DE FATO pegaria as formas proibidas — sensor', () => {
    const specs = especificadores(
      [
        "import { x } from './sem-extensao'",
        "import type { Y } from '@estrelinha/supabase/types'",
        "import fs from 'node:fs'",
        "export * from './ok.ts'",
      ].join('\n'),
    )
    expect(specs).toEqual(['./sem-extensao', '@estrelinha/supabase/types', 'node:fs', './ok.ts'])
    expect(specs.filter(s => s.startsWith('.') && !s.endsWith('.ts'))).toEqual(['./sem-extensao'])
  })
})
