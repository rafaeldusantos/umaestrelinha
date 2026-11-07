import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { BUY_TOGETHER_DISCOUNT_MAX, BUY_TOGETHER_DISCOUNT_MIN } from '@estrelinha/core/buy-together'

/**
 * O guarda da migration que dá a cada adicional do Compre Junto o desconto ao levar junto
 * (`product_buy_together.discount_percent`).
 *
 * Lê o `.sql` **do disco**: afrouxar uma migration não quebra nada. Um `check` com outro teto faria o
 * banco aceitar o que o painel recusa (ou o contrário); `not null` ou um default dariam desconto a
 * todo adicional que já existe; um `grant` abriria escrita a quem não é a dona. Os quatro aplicam
 * limpo e passam em build, `tsc` e teste de componente.
 *
 * Os limites são **importados** de `core`: é a régua que a tela usa, e o banco tem de concordar com
 * ela. Uma régua por COMANDO, exercida contra texto mutado, e `mutar()` que lança sem alvo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261110120000_compre-junto-desconto.sql')

const sql = readFileSync(CAMINHO, 'utf8')

/** Comentário de linha e de bloco na mesma varredura, fechando antes do `\r`. */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const comandos = semComentario(sql)

const listaDeComandos = (texto: string): string[] =>
  semComentario(texto)
    .split(';')
    .map((c) => c.trim())
    .filter((c) => c !== '')

/** O `alter table public.product_buy_together`, ou `null`. */
const alter = (texto: string): string | null =>
  listaDeComandos(texto).find((c) => /^alter\s+table\s+public\.product_buy_together\b/i.test(c)) ?? null

/** A coluna entra de forma reexecutável, inteira e NULA: sem `not null` e sem default. */
const colunaAditiva = (texto: string): boolean => {
  const a = alter(texto)
  if (!a) return false
  return /\badd\s+column\s+if\s+not\s+exists\s+discount_percent\s+integer\s+(?:null\s+)?(?:constraint\s+\w+\s+)?check\b/i.test(
    a,
  ) && !/\bnot\s+null\b|\bdefault\b/i.test(a)
}

/** Os dois limites do `check`, ou `null` quando ele não tem a forma "nulo ou entre A e B". */
const limitesDoCheck = (texto: string): [number, number] | null => {
  const a = alter(texto)
  if (!a) return null
  const m =
    /check\s*\(\s*discount_percent\s+is\s+null\s+or\s+discount_percent\s+between\s+(\d+)\s+and\s+(\d+)\s*\)/i.exec(a)
  return m ? [Number(m[1]), Number(m[2])] : null
}

const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(texto))

const concede = (texto: string): boolean => /\bgrant\b/i.test(semComentario(texto))

const mexeEmPolicy = (texto: string): boolean => /\b(create|alter|drop)\s+policy\b/i.test(semComentario(texto))

describe('migration do desconto ao levar junto — âncoras', () => {
  it('leu o arquivo certo', () => {
    expect(sql.length).toBeGreaterThan(200)
    expect(sql).toContain('discount_percent')
  })

  it('âncora de contagem: o alter e o comentário da coluna — dois comandos', () => {
    const lista = listaDeComandos(sql)
    expect(lista).toHaveLength(2)
    expect(alter(sql)).not.toBeNull()
    expect(lista.filter((c) => /^comment\s+on\s+column\s+public\.product_buy_together\.discount_percent\b/i.test(c))).toHaveLength(1)
  })
})

describe('a coluna', () => {
  it('é acrescentada com `if not exists`, inteira e nula', () => {
    expect(colunaAditiva(sql)).toBe(true)
  })

  it('sensor — sem `if not exists`, reprova', () => {
    const m = mutar(comandos, /add\s+column\s+if\s+not\s+exists/i, 'add column')
    expect(colunaAditiva(m)).toBe(false)
  })

  it('sensor — `not null` reprova', () => {
    const m = mutar(comandos, /discount_percent\s+integer/i, 'discount_percent integer not null')
    expect(colunaAditiva(m)).toBe(false)
  })

  it('sensor — um default reprova (daria desconto a todo adicional que já existe)', () => {
    const m = mutar(comandos, /discount_percent\s+integer/i, 'discount_percent integer default 10')
    expect(colunaAditiva(m)).toBe(false)
  })

  it('sensor — `numeric` no lugar de inteiro reprova', () => {
    const m = mutar(comandos, /discount_percent\s+integer/i, 'discount_percent numeric')
    expect(colunaAditiva(m)).toBe(false)
  })
})

describe('o check concorda com a régua de core', () => {
  it('nulo ou entre os limites de core', () => {
    expect(limitesDoCheck(sql)).toEqual([BUY_TOGETHER_DISCOUNT_MIN, BUY_TOGETHER_DISCOUNT_MAX])
  })

  it('sensor — o teto em 60 diverge de core e reprova', () => {
    const m = mutar(comandos, /between\s+1\s+and\s+50/i, 'between 1 and 60')
    expect(limitesDoCheck(m)).not.toEqual([BUY_TOGETHER_DISCOUNT_MIN, BUY_TOGETHER_DISCOUNT_MAX])
  })

  it('sensor — o piso em 0 diverge de core e reprova', () => {
    const m = mutar(comandos, /between\s+1\s+and\s+50/i, 'between 0 and 50')
    expect(limitesDoCheck(m)).not.toEqual([BUY_TOGETHER_DISCOUNT_MIN, BUY_TOGETHER_DISCOUNT_MAX])
  })

  it('sensor — sem o ramo do nulo (o vazio deixaria de ser "sem desconto") reprova', () => {
    const m = mutar(comandos, /discount_percent\s+is\s+null\s+or\s+/i, '')
    expect(limitesDoCheck(m)).toBeNull()
  })
})

describe('aditiva: sem dado, sem grant e sem policy nova', () => {
  it('não escreve dado', () => {
    expect(escreveDado(sql)).toBe(false)
  })

  it('não concede nada (a escrita continua só pela policy de admin que já existe)', () => {
    expect(concede(sql)).toBe(false)
  })

  it('não mexe em policy', () => {
    expect(mexeEmPolicy(sql)).toBe(false)
  })

  it('sensor — um backfill, um grant a anon e uma policy são acusados; a menção em comentário (CRLF e LF) não', () => {
    expect(escreveDado(`${sql}\nupdate public.product_buy_together set discount_percent = 10;`)).toBe(true)
    expect(concede(`${sql}\ngrant update on public.product_buy_together to anon;`)).toBe(true)
    expect(mexeEmPolicy(`${sql}\ncreate policy x on public.product_buy_together for update using (true);`)).toBe(true)
    expect(escreveDado('-- insert into x\r\nselect 1;')).toBe(false)
    expect(concede('/* grant\n */ select 1;')).toBe(false)
  })
})
