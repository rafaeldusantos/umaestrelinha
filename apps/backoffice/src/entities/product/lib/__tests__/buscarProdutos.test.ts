// `entities/product/lib` é PURO — sem React e sem Supabase.
//
// Os casos da régua da busca moram com o dono, em `packages/core/src/product-search/__tests__/`.
// Aqui fica a pureza do segmento do painel, que continua lendo a régua por este slice.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('entities/product/lib é PURO — a régua roda sem React e sem Supabase', () => {
  const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

  const especificadores = (fonte: string): string[] => {
    const saida: string[] = []
    const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(fonte)) !== null) saida.push(m[1])
    return saida
  }

  const arquivos = readdirSync(DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => ({ nome: f, imports: especificadores(readFileSync(join(DIR, f), 'utf8')) }))

  it('ÂNCORA: a varredura enxerga o segmento e de fato extrai imports', () => {
    // Molde de `packages/core/src/shopping/__tests__/purity.test.ts`. Sem a âncora, um caminho
    // errado leria zero arquivo e as asserções de baixo passariam sobre nada (`L-021`).
    expect(arquivos.map(a => a.nome)).toContain('buscarProdutos.ts')
    expect(arquivos.reduce((n, a) => n + a.imports.length, 0)).toBeGreaterThanOrEqual(1)
  })

  it.each(['react', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(arquivos.filter(a => a.imports.includes(dependencia)).map(a => a.nome)).toEqual([])
    },
  )

  it('nem o client por caminho de pacote — a régua não conhece o banco', () => {
    const culpados = arquivos.filter(a => a.imports.some(s => s.startsWith('@estrelinha/supabase')))
    expect(culpados.map(c => c.nome)).toEqual([])
  })
})
