/**
 * Feature 71 · task 04 — o que a function `visit` importa de `core` é alcançável pelo Deno
 * (`VIS-23`, e o fuso de `VIS-34`).
 *
 * Deno resolve por caminho com extensão explícita **e resolve o grafo de TIPOS junto**: um
 * especificador relativo sem extensão — inclusive num `import type` — derruba o worker com
 * `Failed resolving types` antes da primeira linha rodar. Vite e vitest resolvem as duas formas,
 * então nada mais acusa (medido na feature `33`).
 *
 * Dois tipos de arquivo, duas réguas:
 * - as FOLHAS (`bots.ts`, `visitor.ts`, `optOut.ts`, `time/zone.ts`) não importam NADA;
 * - o BARRIL `visits/index.ts` só reexporta por caminho relativo COM `.ts`.
 *
 * Molde: `core/checkout/__tests__/denoReach.test.ts`, inclusive o leitor injetável que torna o
 * sensor por mutação possível.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Folhas: zero import. Escritas por extenso — a âncora nunca itera o objeto que mede. */
const FOLHAS = ['visits/bots.ts', 'visits/visitor.ts', 'visits/optOut.ts', 'time/zone.ts']
/** Barril: só especificadores relativos com `.ts`. */
const BARRIL = 'visits/index.ts'

type Leitor = (relativo: string) => string
const lerDoDisco: Leitor = (relativo) => readFileSync(join(SRC, relativo), 'utf8')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const especificadores = (fonte: string): string[] => {
  const saida: string[] = []
  const re = /(?:from\s+|import\s*\(\s*|import\s+)['"]([^'"]+)['"]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(semComentario(fonte))) !== null) saida.push(m[1])
  return saida
}

/** Quantos `import`/`export … from` de verdade o arquivo tem (folha tem de ter zero). */
const importsDe = (ler: Leitor, relativo: string): string[] => especificadores(ler(relativo))

/** Especificadores do barril que quebram o Deno: relativos sem `.ts`, ou de pacote. */
const problemasDoBarril = (ler: Leitor): string[] =>
  especificadores(ler(BARRIL)).filter((s) => !s.startsWith('.') || !s.endsWith('.ts'))

describe('core/visits — alcançável pelo Deno', () => {
  it('âncora — as quatro folhas e o barril foram lidos, com o conteúdo esperado', () => {
    expect(lerDoDisco('visits/bots.ts')).toContain('BOT_SIGNATURES')
    expect(lerDoDisco('visits/visitor.ts')).toContain('visitBodyRefusal')
    expect(lerDoDisco('visits/optOut.ts')).toContain('OPT_OUT_PARAM')
    expect(lerDoDisco('time/zone.ts')).toContain('STORE_TIME_ZONE')
    // O barril reexporta as três folhas de `visits` — exatamente três especificadores.
    expect(especificadores(lerDoDisco(BARRIL)).sort()).toEqual(['./bots.ts', './optOut.ts', './visitor.ts'])
  })

  it.each(FOLHAS)('%s não importa nada', (folha) => {
    expect(importsDe(lerDoDisco, folha)).toEqual([])
  })

  it('o barril só reexporta por caminho relativo com `.ts`', () => {
    expect(problemasDoBarril(lerDoDisco)).toEqual([])
  })

  it('sensor — um `import type` sem extensão no barril É acusado', () => {
    const mutante: Leitor = (r) =>
      r === BARRIL ? `import type { X } from './types'\n${lerDoDisco(r)}` : lerDoDisco(r)
    expect(problemasDoBarril(mutante)).toEqual(['./types'])
  })

  it('sensor — um `import type` numa folha É acusado (folha não importa nem tipo)', () => {
    const mutante: Leitor = (r) =>
      r === 'visits/bots.ts' ? `import type { X } from './types.ts'\n${lerDoDisco(r)}` : lerDoDisco(r)
    expect(importsDe(mutante, 'visits/bots.ts')).toEqual(['./types.ts'])
  })

  it('sensor — um import de pacote no barril É acusado', () => {
    const mutante: Leitor = (r) =>
      r === BARRIL ? `export * from '@estrelinha/supabase/types'\n${lerDoDisco(r)}` : lerDoDisco(r)
    expect(problemasDoBarril(mutante)).toEqual(['@estrelinha/supabase/types'])
  })

  it('sensor CRLF — comentário de linha em arquivo CRLF não engole o import de baixo', () => {
    const mutante: Leitor = (r) =>
      r === 'time/zone.ts' ? `// nota em CRLF\r\nimport { y } from './x'\r\n${lerDoDisco(r)}` : lerDoDisco(r)
    expect(importsDe(mutante, 'time/zone.ts')).toEqual(['./x'])
  })

  it('sensor do removedor de comentário — a MENÇÃO em prosa não é acusada', () => {
    const mutante: Leitor = (r) =>
      r === 'visits/optOut.ts'
        ? `// citado: from './x'\n/* e aqui: import './y'\r\n segue */\n${lerDoDisco(r)}`
        : lerDoDisco(r)
    expect(importsDe(mutante, 'visits/optOut.ts')).toEqual([])
  })
})
