/**
 * `core/pricing` é alcançado por caminho relativo pelas functions `mercado-pago` e `order-proposals`
 * (e, por `core/proposals/piece.ts`, por quem importa o barril de `proposals`). No Deno todo
 * especificador relativo do grafo TRANSITIVO tem de ter `.ts` — `import type` incluso, porque o Deno
 * resolve o grafo de tipos antes da primeira linha rodar — e nenhum import de pacote resolve. Vite e
 * vitest aceitam as duas formas, então só este guarda acusa.
 * Molde: `core/customers/__tests__/denoReach.test.ts`, com o leitor injetável para o sensor.
 */
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADA = join(DIR, 'index.ts')

type Leitor = (caminho: string) => string

const semComentario = (fonte: string): string => fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
const especificadores = (fonte: string): string[] =>
  [...semComentario(fonte).matchAll(/(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1])

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

const disco: Leitor = (c) => readFileSync(c, 'utf8')

describe('core/pricing é alcançável por Deno', () => {
  const grafo = caminhar(ENTRADA, disco)
  const nomes = grafo.visitados.map((c) => c.replace(/\\/g, '/'))

  it('âncora: o grafo é o MEDIDO — index, types e grid', () => {
    for (const fim of ['pricing/index.ts', 'pricing/types.ts', 'pricing/grid.ts'])
      expect(nomes.some((n) => n.endsWith(fim)), fim).toBe(true)
    expect(grafo.visitados.length).toBe(3)
  })

  it('nenhum especificador relativo sem `.ts` em todo o grafo', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote em todo o grafo — `import type` incluso', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — o `import type` de pacote que a leitura das colunas tinha É acusado', () => {
    const falso: Leitor = (c) =>
      c.endsWith('grid.ts') ? `import type { X } from ${"'@estrelinha/supabase/types'"}\n${disco(c)}` : disco(c)
    expect(caminhar(ENTRADA, falso).externos).toHaveLength(1)
  })

  it('sensor — um `import type` relativo sem extensão É acusado', () => {
    const falso: Leitor = (c) =>
      c.endsWith('index.ts') ? `import type { X } from ${"'./types'"}\n${disco(c)}` : disco(c)
    expect(caminhar(ENTRADA, falso).semExtensao).toHaveLength(1)
  })

  it('sensor — a prosa que cita um import de pacote NÃO é acusada', () => {
    const falso: Leitor = (c) =>
      c.endsWith('types.ts') ? `// import type { X } from ${"'@estrelinha/supabase/types'"}\n${disco(c)}` : disco(c)
    expect(caminhar(ENTRADA, falso).externos).toEqual([])
  })
})
