/**
 * `core/customers` é alcançável por caminho relativo (Deno, e hoje Node/Vite): o grafo TRANSITIVO —
 * `customers` → `orders/queue.ts`, `orders/list.ts`, `orders/views.ts`, `paging/pageMath.ts` e as folhas
 * `validators/{cpf,phone,email,cep}.ts` — tem de
 * ter `.ts` em todo especificador relativo, `import type` incluso, e nenhum import de pacote. Vite e
 * vitest resolvem as duas formas; o Deno derruba o worker com `Failed resolving types`.
 * Molde: `core/seo/__tests__/denoReach.test.ts`, com o leitor injetável para o sensor.
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

describe('core/customers é alcançável por Deno', () => {
  const grafo = caminhar(ENTRADA, disco)
  const nomes = grafo.visitados.map((c) => c.replace(/\\/g, '/'))

  it('âncora: o grafo alcança as dependências de fora de customers', () => {
    for (const fim of [
      'orders/queue.ts',
      'orders/list.ts',
      'orders/views.ts',
      'paging/pageMath.ts',
      'validators/cpf.ts',
      'validators/phone.ts',
      'validators/email.ts',
      'validators/cep.ts',
    ])
      expect(nomes.some((n) => n.endsWith(fim)), fim).toBe(true)
  })

  it('âncora: o grafo alcança a leitura do texto colado e a fusão do CEP', () => {
    for (const fim of ['customers/parse.ts', 'customers/mergeCep.ts']) expect(nomes.some((n) => n.endsWith(fim)), fim).toBe(true)
  })

  it('âncora: o número de arquivos do grafo é o MEDIDO (customers 10 + orders 3 + paging 1 + validators 4 = 18)', () => {
    expect(grafo.visitados.length).toBe(18)
  })

  it('nenhum especificador relativo sem `.ts` em todo o grafo', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote em todo o grafo', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — um `import type` sem extensão num arquivo do grafo é acusado', () => {
    const falso: Leitor = (c) => (c.endsWith('slices.ts') ? `import type { X } from ${"'./open'"}` : disco(c))
    expect(caminhar(ENTRADA, falso).semExtensao.length).toBeGreaterThan(0)
  })

  it('sensor — um import sem extensão de uma folha de validators, em parse.ts, é acusado', () => {
    const falso: Leitor = (c) => (c.endsWith('parse.ts') ? `import { isValidCpf } from ${"'../validators/cpf'"}` : disco(c))
    expect(caminhar(ENTRADA, falso).semExtensao.length).toBeGreaterThan(0)
  })

  it('sensor — um import de pacote num arquivo do grafo é acusado', () => {
    const falso: Leitor = (c) => (c.endsWith('like.ts') ? `import { a } from ${"'@supabase/supabase-js'"}` : disco(c))
    expect(caminhar(ENTRADA, falso).externos.length).toBeGreaterThan(0)
  })
})
