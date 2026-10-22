import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { clientIp, createRateLimiter } from '../rateLimit.ts'
import {
  clientIp as checkoutClientIp,
  createRateLimiter as checkoutCreateRateLimiter,
} from '../../checkout/handlers.ts'

/**
 * `VIS-27` (feature `71`) — o teto por IP das functions tem **um** dono, `_shared/rateLimit.ts`.
 *
 * `createRateLimiter`, `RateLimiter` e `clientIp` nasceram na `checkout` (feature `49`) e a
 * function `visit` precisa dos três. Uma segunda escrita divergiria **sem nada quebrar** — e a
 * divergência mais provável já tem nome: "sem IP" voltar a ser um balde único (`'sem-ip'`), que é
 * exatamente o que a primeira escrita do design da `71` propôs e que faria 30 visitantes sem
 * cabeçalho esgotarem o teto da loja inteira.
 *
 * A `checkout` **reexporta** os três (molde de `http.test.ts`), e a asserção é de **identidade de
 * referência**: `toEqual` passaria com uma cópia colada, que é o que este guarda existe para
 * impedir.
 */

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DONO = '_shared/rateLimit.ts'

/** Linha e bloco na MESMA varredura — a régua mede declaração, não menção (`BL-027`). */
const semComentario = (fonte: string): string =>
  fonte.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

const arquivos = (() => {
  const saida: { nome: string; fonte: string }[] = []
  const andar = (dir: string) => {
    for (const entrada of readdirSync(dir, { withFileTypes: true })) {
      const caminho = join(dir, entrada.name)
      if (entrada.isDirectory()) {
        if (entrada.name === '__tests__' || entrada.name === 'node_modules') continue
        andar(caminho)
        continue
      }
      if (!entrada.name.endsWith('.ts')) continue
      saida.push({
        nome: caminho.replace(/\\/g, '/').split('supabase/functions/')[1] ?? entrada.name,
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(FUNCTIONS)
  return saida
})()

/** Os três nomes que DECLARA (função, `const` ou `interface`), nunca o import nem o reexport. */
const declara = (fonte: string): string[] => {
  const codigo = semComentario(fonte)
  const re =
    /(?:^|\n)\s*(?:export\s+)?(?:(?:async\s+)?function\s+|const\s+|let\s+|interface\s+|type\s+)(createRateLimiter|clientIp|RateLimiter)\b/g
  const nomes: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(codigo)) !== null) nomes.push(m[1])
  return nomes
}

const declarantes = () =>
  arquivos.filter((a) => declara(a.fonte).length > 0).map((a) => a.nome)

describe('VIS-27 — _shared/rateLimit.ts é o dono único do teto por IP', () => {
  it('a varredura leu as functions e achou o dono — âncora', () => {
    const nomes = arquivos.map((a) => a.nome)
    expect(arquivos.length).toBeGreaterThanOrEqual(10)
    expect(nomes).toEqual(expect.arrayContaining([DONO, 'checkout/handlers.ts', '_shared/http.ts']))
  })

  it('o dono declara os três nomes', () => {
    const dono = arquivos.find((a) => a.nome === DONO)!
    expect([...declara(dono.fonte)].sort()).toEqual(['RateLimiter', 'clientIp', 'createRateLimiter'])
  })

  it('só o dono DECLARA — a checkout reexporta', () => {
    expect(declarantes()).toEqual([DONO])
  })

  it('a checkout reexporta a MESMA referência, não uma cópia (`toBe`)', () => {
    expect(checkoutCreateRateLimiter).toBe(createRateLimiter)
    expect(checkoutClientIp).toBe(clientIp)
  })

  it('a checkout reexporta também o TIPO, do dono, com `.ts` explícito', () => {
    const checkout = semComentario(arquivos.find((a) => a.nome === 'checkout/handlers.ts')!.fonte)
    expect(checkout).toMatch(
      /export\s*\{[^}]*\bRateLimiter\b[^}]*\}\s*from\s*['"]\.\.\/_shared\/rateLimit\.ts['"]/,
    )
  })

  describe('sensores', () => {
    it('uma segunda declaração É acusada, nas três formas', () => {
      expect(declara('export function createRateLimiter(max: number) {}')).toEqual(['createRateLimiter'])
      expect(declara('const clientIp = (req: Request) => null')).toEqual(['clientIp'])
      expect(declara('export interface RateLimiter { hit(k: string): boolean }')).toEqual(['RateLimiter'])
      expect(declara('export type RateLimiter = { hit(k: string): boolean }')).toEqual(['RateLimiter'])
    })

    it('import, reexport, chamada e menção em comentário NÃO são declaração', () => {
      expect(declara("import { createRateLimiter, clientIp } from '../_shared/rateLimit.ts'")).toEqual([])
      expect(declara("export { createRateLimiter, clientIp, type RateLimiter } from '../_shared/rateLimit.ts'")).toEqual([])
      expect(declara('const ip = clientIp(req)\nlimiter: createRateLimiter(30, 60_000, now)')).toEqual([])
      expect(declara('// antes: export function createRateLimiter(\nconst x = 1')).toEqual([])
      expect(declara('/* function clientIp( */\r\nconst x = 1')).toEqual([])
    })
  })
})
