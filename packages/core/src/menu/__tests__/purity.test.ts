import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `core/menu` roda em Node, em Deno e no browser — e este guarda é o que mantém isso verdadeiro.
 *
 * Quem alcança este módulo de fora do Vite é a edge function do **sitemap**: o dono da canônica de
 * categoria é `categoryHref`, e ele mora aqui. Deno resolve por caminho relativo com extensão
 * explícita **e resolve o grafo de tipos junto** — um `export * from './menu'` sem `.ts`, ou um
 * `import type` de `@estrelinha/supabase/types`, derruba o worker com `Failed resolving types` antes
 * da primeira linha rodar. Medido em 2026-08-29; está escrito no `index.ts` e no `CLAUDE.md`.
 *
 * A feature 39 acrescenta três arquivos ao módulo (`icons.ts`, `target.ts`, `banners.ts`) e um deles
 * é o vocabulário de um conjunto de ícones **React**. É exatamente o tipo de arquivo que convida o
 * import errado: `MENU_ICON_COMPONENTS` mora em `@estrelinha/ui/icons`, e trazê-lo para cá não
 * quebraria teste nenhum — quebraria o sitemap em produção.
 *
 * Molde: `core/shopping/__tests__/purity.test.ts`. **Âncora de contagem obrigatória** — uma varredura
 * com caminho errado lê zero arquivo e passa em silêncio, que é a pior falha possível aqui.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo.** Casar por `includes` sobre a
 * fonte produz falso positivo em comentário — e faz o guarda ser "consertado" editando prosa.
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

describe('core/menu é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(5)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining(['index.ts', 'menu.ts', 'icons.ts', 'target.ts', 'banners.ts']),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(4)
  })

  it.each(['react', 'react-dom', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(importadores(s => s === dependencia)).toEqual([])
    },
  )

  it('nenhum arquivo importa o pacote de UI — o desenho do ícone mora lá, a chave mora aqui', () => {
    expect(importadores(s => s.startsWith('@estrelinha/ui'))).toEqual([])
  })

  it('nenhum arquivo importa de apps/', () => {
    expect(importadores(s => s.includes('apps/'))).toEqual([])
  })

  it('nenhum arquivo toca o DOM — a function do sitemap roda em Deno, sem document nem window', () => {
    const culpados = arquivos.filter(a =>
      /\b(document|window|localStorage)\s*\.\w/.test(
        // comentário fora: o que importa é código
        a.fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })

  it('nenhum arquivo importa de payment/ — menu não é caminho de dinheiro', () => {
    expect(importadores(s => s.includes('/payment/'))).toEqual([])
  })
})

describe('core/menu é importável por Deno', () => {
  it('todo import relativo traz a extensão .ts explícita', () => {
    const semExtensao: string[] = []
    for (const { nome, imports } of arquivos) {
      for (const spec of imports) {
        if (spec.startsWith('.') && !spec.endsWith('.ts')) semExtensao.push(`${nome} → ${spec}`)
      }
    }
    expect(semExtensao).toEqual([])
  })

  it('a varredura de extensão de fato encontra imports relativos — âncora', () => {
    const relativos = arquivos.reduce(
      (n, a) => n + a.imports.filter(s => s.startsWith('.')).length,
      0,
    )
    expect(relativos).toBeGreaterThanOrEqual(4)
  })
})
