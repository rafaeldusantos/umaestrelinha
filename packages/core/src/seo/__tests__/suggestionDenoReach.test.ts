/**
 * Feature 84 — `seo/suggestion.ts` é lido pela edge function `seo-suggest`, por caminho relativo, no
 * Deno. Deno exige a extensão explícita em todo especificador relativo (`import type` incluso) e
 * resolve o grafo de tipos antes da primeira linha; Vite e vitest resolvem as duas formas, então nada
 * mais acusaria. Molde: `denoReach.test.ts`, ao lado — com raiz própria, porque este arquivo fica FORA
 * do barril de `core/seo` (a âncora de 15 de lá não muda).
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADA = join(DIR, 'suggestion.ts')

type Leitor = (caminho: string) => string

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map(m => m[1])

const caminhar = (entrada: string, ler: Leitor) => {
  const visitados = new Set<string>()
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [entrada]
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (visitados.has(atual)) continue
    visitados.add(atual)
    for (const esp of especificadores(ler(atual))) {
      if (!esp.startsWith('.')) {
        externos.push(`${atual} → ${esp}`)
        continue
      }
      if (!esp.endsWith('.ts')) {
        semExtensao.push(`${atual} → ${esp}`)
        continue
      }
      fila.push(resolve(dirname(atual), esp))
    }
  }
  return { visitados: [...visitados].map(c => c.replace(/\\/g, '/')), semExtensao, externos }
}

const disco: Leitor = c => readFileSync(c, 'utf8')

describe('seo/suggestion.ts é alcançável por Deno', () => {
  const grafo = caminhar(ENTRADA, disco)

  // Conserto r2: a recusa de material saiu (A12) e levou o import de `material/material.ts` — o
  // grafo encolheu de 7 para 6, remedido com esta mesma régua.
  it('âncora: o grafo medido (suggestion, brand, text, faq/block e vizinhos) — sem material/material', () => {
    for (const fim of [
      'seo/suggestion.ts',
      'seo/brand.ts',
      'seo/text.ts',
      'faq/block.ts',
    ]) {
      expect(grafo.visitados.some(n => n.endsWith(fim)), fim).toBe(true)
    }
    expect(grafo.visitados.some(n => n.endsWith('material/material.ts'))).toBe(false)
    expect(grafo.visitados).toHaveLength(6)
  })

  it('todo especificador relativo do grafo tem `.ts` explícito', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa pacote', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor: um `import type` sem extensão em suggestion.ts é acusado', () => {
    const ler: Leitor = c =>
      c.replace(/\\/g, '/').endsWith('seo/suggestion.ts')
        ? `import type { X } from './types'\r\n${disco(c)}`
        : disco(c)
    expect(caminhar(ENTRADA, ler).semExtensao).toHaveLength(1)
  })

  it('sensor: um import de pacote é acusado, e o comentário que o cita não é', () => {
    const ler: Leitor = c =>
      c.replace(/\\/g, '/').endsWith('faq/block.ts')
        ? `// citado em prosa: import x from 'react'\nimport { y } from '@estrelinha/supabase/types'\n${disco(c)}`
        : disco(c)
    expect(caminhar(ENTRADA, ler).externos).toHaveLength(1)
  })
})
