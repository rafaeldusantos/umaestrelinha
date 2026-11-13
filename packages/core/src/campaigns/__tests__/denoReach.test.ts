/**
 * `core/campaigns` é lido pelas edge functions (`checkout`, `mercado-pago`, `order-proposals`,
 * `google-feed`) por caminho relativo, no Deno. Lá todo especificador relativo precisa de extensão
 * explícita — inclusive o de tipo — e nenhum pacote resolve sem import map. Vite e vitest resolvem as
 * duas formas, então só este guarda acusa. Molde: `core/coupons/__tests__/denoReach.test.ts`, com o
 * leitor injetável dos sensores.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
/** Todo arquivo do módulo é entrada: qualquer um pode ser importado direto por uma function. */
const ENTRADAS = readdirSync(DIR).filter((f) => f.endsWith('.ts'))

type Leitor = (caminho: string) => string

const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
  return saida
}

const rotulo = (caminho: string): string =>
  caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminharGrafo = (entradas: string[], ler: Leitor) => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [...entradas]
  const vistos = new Set<string>()
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (vistos.has(atual)) continue
    vistos.add(atual)
    visitados.push(atual)
    for (const spec of especificadores(ler(atual))) {
      if (!spec.startsWith('.')) {
        externos.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      if (!spec.endsWith('.ts')) {
        semExtensao.push(`${rotulo(atual)} → ${spec}`)
        continue
      }
      fila.push(join(dirname(atual), spec))
    }
  }
  return { visitados, semExtensao, externos }
}

const lerDoDisco: Leitor = (caminho) => readFileSync(caminho, 'utf8')
const caminhos = ENTRADAS.map((f) => join(DIR, f))

describe('core/campaigns — alcançável pelo Deno', () => {
  const grafo = caminharGrafo(caminhos, lerDoDisco)

  it('âncora: leu as nove folhas do módulo e os vizinhos de `time` e `color`', () => {
    expect([...ENTRADAS].sort()).toEqual([
      'end.ts',
      'index.ts',
      'limits.ts',
      'live.ts',
      'price.ts',
      'refusals.ts',
      'status.ts',
      'text.ts',
      'types.ts',
    ])
    expect(grafo.visitados.map(rotulo)).toEqual(
      expect.arrayContaining(['time/local.ts', 'time/zone.ts', 'color/contrast.ts']),
    )
    expect(lerDoDisco(join(DIR, 'live.ts'))).toContain('export function isCampaignLive')
  })

  it('nenhum especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote (React, Supabase, Deno, alias, node:)', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — `import type` sem extensão É acusado', () => {
    const mutante: Leitor = (c) =>
      rotulo(c) === 'campaigns/live.ts'
        ? `import type { X } from './types'\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    expect(caminharGrafo(caminhos, mutante).semExtensao).toEqual(['campaigns/live.ts → ./types'])
  })

  it('sensor — import do pacote de tipos É acusado', () => {
    const mutante: Leitor = (c) =>
      rotulo(c) === 'campaigns/price.ts'
        ? `import type { Campaign } from '@estrelinha/supabase/types/campaign'\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    expect(caminharGrafo(caminhos, mutante).externos).toEqual([
      'campaigns/price.ts → @estrelinha/supabase/types/campaign',
    ])
  })

  it('sensor inverso — a menção em comentário (CRLF ou LF) não é acusada', () => {
    const mencao: Leitor = (c) =>
      rotulo(c) === 'campaigns/refusals.ts'
        ? `// from './types'\r\n/* from '@estrelinha/x'\n */\n${lerDoDisco(c)}`
        : lerDoDisco(c)
    const g = caminharGrafo(caminhos, mencao)
    expect(g.semExtensao).toEqual([])
    expect(g.externos).toEqual([])
  })
})
