/**
 * `core/seo` é alcançado pela edge function `sitemap` por caminho relativo (via `core/sitemap/urls.ts`
 * → `seo/variant.ts`), e pelo `<head>` servido (`core/page/serve.ts`, feature 69), que é empacotado
 * FORA do Vite. A edge function da página de produto, que o importava antes, foi aposentada na `69`
 * — o leitor mudou, a exigência não. O grafo TRANSITIVO (`core/faq/block.ts`, `core/routes/routes.ts`)
 * tem de ser alcançável por Deno.
 *
 * Deno exige extensão explícita em todo especificador relativo, **`import type` incluso**, e resolve
 * o grafo de tipos antes da primeira linha: um `.ts` faltando derruba o worker com
 * `Failed resolving types`. Vite e vitest resolvem as duas formas, então nada mais acusa.
 * Molde: `core/checkout/__tests__/denoReach.test.ts`, com o leitor injetável para o sensor.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADA = join(DIR, 'index.ts')

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
  return { visitados: [...visitados], semExtensao, externos }
}

const disco: Leitor = c => readFileSync(c, 'utf8')

describe('core/seo é alcançável por Deno', () => {
  const grafo = caminhar(ENTRADA, disco)

  it('âncora: o grafo alcança seo, faq/block e routes', () => {
    const nomes = grafo.visitados.map(c => c.replace(/\\/g, '/'))
    expect(nomes.some(n => n.endsWith('seo/pages.ts'))).toBe(true)
    expect(nomes.some(n => n.endsWith('faq/block.ts'))).toBe(true)
    expect(nomes.some(n => n.endsWith('routes/routes.ts'))).toBe(true)
  })

  // Feature 68: `seo/variant.ts` puxou `shopping` e `filters/types.ts` para o grafo que o Deno
  // resolve (na `68`, pela edge function da página de produto; desde a `69`, pelo `sitemap`). Âncora = o número MEDIDO (15 em 2026-10-19), não um piso: um arquivo a
  // mais ou a menos no grafo do Deno é uma mudança que alguém precisa olhar.
  it('âncora: o grafo alcança seo/variant.ts, os arquivos de shopping e filters/types.ts (15 arquivos)', () => {
    const nomes = grafo.visitados.map(c => c.replace(/\\/g, '/'))
    for (const fim of [
      'seo/variant.ts',
      'shopping/identity.ts',
      'shopping/eligibility.ts',
      'shopping/offer.ts',
      'shopping/pricing.ts',
      'shopping/types.ts',
      'filters/types.ts',
    ]) {
      expect(nomes.some(n => n.endsWith(fim)), fim).toBe(true)
    }
    expect(grafo.visitados.length).toBe(15)
  })

  it('todo especificador relativo do grafo tem `.ts` explícito', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa pacote (React, Supabase, alias @estrelinha)', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor: um `import type` sem extensão num vizinho é acusado', () => {
    const ler: Leitor = c =>
      c.replace(/\\/g, '/').endsWith('seo/brand.ts')
        ? `import type { X } from './types'\n${disco(c)}`
        : disco(c)
    expect(caminhar(ENTRADA, ler).semExtensao.length).toBe(1)
  })

  it('sensor: um import de pacote é acusado, e o comentário que o cita não é', () => {
    const ler: Leitor = c =>
      c.replace(/\\/g, '/').endsWith('seo/text.ts')
        ? `// citado em prosa: import x from 'react'\r\nimport { y } from '@estrelinha/supabase/types'\n${disco(c)}`
        : disco(c)
    expect(caminhar(ENTRADA, ler).externos).toHaveLength(1)
  })
})
