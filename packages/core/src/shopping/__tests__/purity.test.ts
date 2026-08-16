import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * `GSH-05`, `GSH-12` — `core/shopping` roda em TRÊS runtimes, e este guarda é o que mantém isso
 * verdadeiro.
 *
 * As duas edge functions são Deno. Um `import` de React, do client do Supabase ou de `document` aqui
 * **não quebra teste nenhum** — quebra o deploy da function, ou pior, quebra em produção na primeira
 * requisição. O mesmo vale para o **estilo de import**: Deno resolve por caminho relativo com
 * extensão explícita, e um `from './identity'` sem `.ts` passa no Vite, passa no vitest e falha só no
 * runtime da function.
 *
 * **A varredura lê ESPECIFICADOR DE IMPORT, nunca o texto do arquivo.** Casar por `includes` sobre a
 * fonte inteira produz falso positivo em comentário — e, pior, faz o guarda ser "consertado" editando
 * um comentário em vez do import. A régua não pode ser confundida com prosa sobre a régua.
 *
 * Molde: `packages/core/src/home/__tests__/catalog.test.ts`. **Âncora de contagem obrigatória** —
 * uma varredura com caminho errado lê zero arquivo e passa em silêncio, que é a pior falha possível
 * neste tipo de teste.
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

describe('core/shopping é módulo puro', () => {
  it('a varredura enxerga o módulo — âncora de contagem', () => {
    expect(arquivos.length).toBeGreaterThanOrEqual(7)
    expect(arquivos.map(a => a.nome)).toEqual(
      expect.arrayContaining([
        'types.ts',
        'identity.ts',
        'eligibility.ts',
        'pricing.ts',
        'offer.ts',
        'xml.ts',
        'jsonld.ts',
        'index.ts',
      ]),
    )
  })

  it('a varredura de fato extrai imports — âncora do extrator', () => {
    const total = arquivos.reduce((n, a) => n + a.imports.length, 0)
    expect(total).toBeGreaterThanOrEqual(10)
  })

  it.each(['react', '@supabase/supabase-js', '@estrelinha/supabase/client'])(
    'nenhum arquivo importa %s',
    dependencia => {
      expect(importadores(s => s === dependencia)).toEqual([])
    },
  )

  it('nenhum arquivo toca o DOM — as duas functions rodam em Deno, sem document nem window', () => {
    const culpados = arquivos.filter(a =>
      /\b(document|window|localStorage)\s*\.\w/.test(
        // comentário fora: o que importa é código
        a.fonte.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''),
      ),
    )
    expect(culpados.map(c => c.nome)).toEqual([])
  })

  it('nenhum arquivo importa de apps/', () => {
    expect(importadores(s => s.includes('apps/'))).toEqual([])
  })

  it('nenhum arquivo importa de payment/ — o feed lê preço, não calcula nenhum', () => {
    expect(importadores(s => s.includes('/payment/'))).toEqual([])
  })
})

describe('core/shopping é importável por Deno', () => {
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
    expect(relativos).toBeGreaterThanOrEqual(10)
  })
})
