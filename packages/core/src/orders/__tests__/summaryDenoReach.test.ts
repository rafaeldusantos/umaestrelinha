/**
 * O resumo do pedido (`orders/summary.ts`) é importado pela function `send-notification` por caminho
 * relativo — e o grafo inteiro dele tem de ser alcançável pelo Deno.
 *
 * Deno resolve por caminho com extensão explícita e resolve o grafo de TIPOS junto: um especificador
 * relativo sem a extensão, `import type` incluso, ou um import de pacote derrubam o worker antes da
 * primeira linha rodar. Vite e vitest resolvem as duas formas, então nada mais acusaria.
 * `purity.test.ts` olha só os arquivos de `core/orders`; este caminha o grafo TRANSITIVO, que sai do
 * diretório (`payment/orderLines.ts`).
 *
 * Molde: `core/checkout/__tests__/denoReach.test.ts`, com o leitor injetável que torna o sensor
 * por mutação possível.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const ENTRADA = join(DIR, 'summary.ts')

type Leitor = (caminho: string) => string

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  const codigo = semComentario(fonte)
  while ((m = re.exec(codigo)) !== null) saida.push(m[1])
  return saida
}

const rotulo = (caminho: string): string =>
  caminho.replace(/\\/g, '/').split('/').slice(-2).join('/')

const caminharGrafo = (entrada: string, ler: Leitor) => {
  const visitados: string[] = []
  const semExtensao: string[] = []
  const externos: string[] = []
  const fila = [entrada]
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

describe('core/orders/summary — o que o e-mail importa é alcançável pelo Deno', () => {
  const grafo = caminharGrafo(ENTRADA, lerDoDisco)

  it('a varredura leu a entrada e a folha que ela importa — âncora', () => {
    expect(grafo.visitados.map(rotulo)).toEqual(['orders/summary.ts', 'payment/orderLines.ts'])
    expect(lerDoDisco(ENTRADA)).toContain('export function orderSummary')
  })

  it('nenhum especificador relativo do grafo vem sem `.ts`', () => {
    expect(grafo.semExtensao).toEqual([])
  })

  it('nenhum arquivo do grafo importa pacote (React, Supabase, alias, URL)', () => {
    expect(grafo.externos).toEqual([])
  })

  it('o e-mail importa o ARQUIVO, por caminho relativo com `.ts`, nunca o barrel', () => {
    const layout = lerDoDisco(
      join(DIR, '../../../../supabase/functions/send-notification/render/layout.ts'),
    )
    expect(especificadores(layout)).toContain('../../../../packages/core/src/orders/summary.ts')
  })

  it('sensor — um `import type` sem extensão É acusado', () => {
    const mutante: Leitor = (caminho) =>
      caminho === ENTRADA ? `import type { X } from ${"'./format'"}\n${lerDoDisco(caminho)}` : lerDoDisco(caminho)
    expect(caminharGrafo(ENTRADA, mutante).semExtensao).toEqual(['orders/summary.ts → ./format'])
  })

  it('sensor — um import de pacote É acusado', () => {
    const mutante: Leitor = (caminho) =>
      caminho === ENTRADA
        ? `import type { Order } from ${"'@estrelinha/supabase/types'"}\n${lerDoDisco(caminho)}`
        : lerDoDisco(caminho)
    expect(caminharGrafo(ENTRADA, mutante).externos).toEqual([
      'orders/summary.ts → @estrelinha/supabase/types',
    ])
  })

  it('sensor do removedor de comentário — a menção em prosa não é acusada, com CRLF e com LF', () => {
    expect(especificadores(`// from ${"'./x'"}\r\n/* from ${"'./y'"}\n */\nexport const a = 1`)).toEqual([])
    expect(especificadores(`// nota\r\nimport { x } from ${"'./x.ts'"}\r\n`)).toEqual(['./x.ts'])
  })
})
