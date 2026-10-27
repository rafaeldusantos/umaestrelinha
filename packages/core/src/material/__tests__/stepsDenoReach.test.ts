/**
 * `core/material/steps.ts` (feature `74`) entra no grafo que o app do ateliê lê e que uma edge
 * function pode vir a ler por caminho relativo: o arquivo e TUDO que ele alcança têm de ser folhas
 * com especificador relativo e `.ts` explícito — `import type` incluso —, e nenhum import de pacote.
 * Vite e vitest resolvem as duas formas, então nada mais acusaria (lição da feature 33).
 *
 * Molde: `core/shipping/__tests__/denoReach.test.ts`, com o leitor injetável para o sensor.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')

type Leitor = (caminho: string) => string

/** Linha e bloco na MESMA varredura, CRLF normalizado antes (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  const codigo = semComentario(fonte)
  while ((m = re.exec(codigo)) !== null) saida.push(m[1])
  return saida
}

const rotulo = (caminho: string): string => caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminhar = (entrada: string, ler: Leitor) => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [entrada]
  const vistos = new Set<string>()
  while (fila.length > 0) {
    const atual = fila.shift()!
    if (vistos.has(atual)) continue
    vistos.add(atual)
    visitados.push(rotulo(atual))
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

const lerDoDisco: Leitor = (c) => readFileSync(c, 'utf8')
const ENTRADA = join(DIR, 'steps.ts')

// Feature `82`: `envelope.ts` entra no mesmo grafo (o app o lê; `core/order-actions` também), e
// alcança `orders/appAction.ts` e `orders/row.ts` — o caminho inteiro tem de ser de folhas com `.ts`.
const ENVELOPE = join(DIR, 'envelope.ts')

describe('core/material/envelope.ts é alcançável pelo Deno', () => {
  const grafo = caminhar(ENVELOPE, lerDoDisco)

  it('âncora: o grafo foi caminhado (envelope → orders/appAction, orders/row → material/aging, stats/labels)', () => {
    expect(grafo.visitados).toEqual(
      expect.arrayContaining([
        'material/envelope.ts',
        'orders/appAction.ts',
        'orders/row.ts',
        'material/aging.ts',
        'material/material.ts',
        'stats/labels.ts',
        'time/zone.ts',
      ]),
    )
  })

  it('nenhum especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote (React, Supabase, alias, URL)', () => {
    expect(grafo.externos).toEqual([])
  })
})

describe('core/material/steps.ts é alcançável pelo Deno', () => {
  const grafo = caminhar(ENTRADA, lerDoDisco)

  it('âncora: o grafo foi caminhado até as folhas (steps → material, stats/labels → time/zone)', () => {
    expect(grafo.visitados).toEqual(
      expect.arrayContaining(['material/steps.ts', 'material/material.ts', 'stats/labels.ts', 'time/zone.ts']),
    )
  })

  it('nenhum especificador relativo sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum import de pacote (React, Supabase, alias, URL)', () => {
    expect(grafo.externos).toEqual([])
  })

  it('sensor — `import type` relativo sem extensão é acusado', () => {
    const mutante: Leitor = (c) =>
      c === ENTRADA ? `import type { X } from ${"'./material'"}\nexport const a = 1` : lerDoDisco(c)
    expect(caminhar(ENTRADA, mutante).semExtensao).toEqual(['material/steps.ts → ./material'])
  })

  it('sensor — import de pacote é acusado', () => {
    const mutante: Leitor = (c) =>
      c === ENTRADA ? `import { x } from ${"'@estrelinha/supabase/types'"}\nexport const a = 1` : lerDoDisco(c)
    expect(caminhar(ENTRADA, mutante).externos).toEqual(['material/steps.ts → @estrelinha/supabase/types'])
  })

  it('sensor do removedor de comentário — prosa não é acusada, com CRLF e com LF', () => {
    expect(especificadores(`// from ${"'./x'"}\r\n/* from ${"'./y'"}\n */\nexport const a = 1`)).toEqual([])
    expect(especificadores(`// nota\r\nimport { x } from ${"'./x.ts'"}\r\n`)).toEqual(['./x.ts'])
  })
})
