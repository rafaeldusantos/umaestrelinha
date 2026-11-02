import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { FUNNEL_RULES, LIVE_WINDOW_MIN, funnelStage, funnelStageSql } from '@estrelinha/core/live'

/**
 * A presença na loja — o funil e a janela têm UM dono (`core/live/presence.ts`), e a cópia em SQL
 * dentro de `store_live` é DELIBERADA e guardada aqui (molde de `filaComDonoUnico.test.ts` e
 * `materialTransitions.test.ts`).
 *
 * A cópia existe porque a RPC conta no banco: o total, as três faixas e as barras saem prontos dela.
 * Duas escritas da mesma regra divergem sem nada quebrar — o funil do `core` diria "no checkout" e o
 * número da Loja ao vivo contaria a mesma pessoa em "com joia na sacola", com as duas suítes verdes.
 *
 * O lado TypeScript é DERIVADO do dono, nunca cravado: o `case` esperado é `funnelStageSql('p')`, e a
 * janela esperada é `LIVE_WINDOW_MIN`. O guarda lê a migration do disco, sem comentário e com os
 * espaços colapsados, e exige:
 * - o `case … end as etapa` de `presentes` igual, byte a byte, ao de `funnelStageSql('p')`;
 * - as DUAS janelas de minutos (a de `presentes` e a de cada barra) e o `janela_min` devolvido iguais
 *   a `LIVE_WINDOW_MIN`.
 *
 * Mora na suíte da loja porque é aqui que moram os guardas que leem migration.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261104130000_presenca-leitura.sql')

const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')
const normal = (texto: string): string => semComentario(texto.replace(/\r\n/g, '\n')).replace(/\s+/g, ' ')
const sql = normal(readFileSync(CAMINHO, 'utf8'))

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 70)}…`)
  return mutante
}

/** O `case` que produz a coluna `etapa`. `null` reprova. */
const casoDaEtapa = (texto: string): string | null => /\b(case\b.*?\bend) as etapa\b/.exec(texto)?.[1] ?? null

/** Os minutos de cada janela: a de `presentes` (sobre `v_minuto`), a de cada barra (sobre `g.minuto`) e o `janela_min`. */
const janelas = (texto: string) => ({
  presentes: [...texto.matchAll(/> v_minuto - interval '(\d+) minutes?'/g)].map((m) => Number(m[1])),
  barras: [...texto.matchAll(/> g\.minuto - interval '(\d+) minutes?'/g)].map((m) => Number(m[1])),
  devolvida: [...texto.matchAll(/'janela_min', (\d+)/g)].map((m) => Number(m[1])),
})

const funilBate = (texto: string): boolean => casoDaEtapa(texto) === funnelStageSql('p')
const janelaBate = (texto: string): boolean => {
  const j = janelas(texto)
  return [j.presentes, j.barras, j.devolvida].every((l) => l.length === 1 && l[0] === LIVE_WINDOW_MIN)
}

describe('o funil e a janela da presença — âncoras', () => {
  it('a migration foi lida e o `case` da etapa foi encontrado', () => {
    expect(sql.length).toBeGreaterThan(1000)
    expect(casoDaEtapa(sql)).not.toBeNull()
  })

  it('cada janela aparece UMA vez — nem zero (a régua cega), nem duas (uma escaparia)', () => {
    const j = janelas(sql)
    expect([j.presentes.length, j.barras.length, j.devolvida.length]).toEqual([1, 1, 1])
  })

  it('o dono tem regra: duas faixas antes do "olhando", e a do checkout primeiro', () => {
    expect(FUNNEL_RULES.map((r) => r.stage)).toEqual(['checkout', 'sacola'])
    expect(funnelStage({ page: 'checkout', cart: 2 })).toBe('checkout')
  })
})

describe('a cópia SQL do funil e da janela é a do dono', () => {
  it('o `case` da etapa em `store_live` é exatamente `funnelStageSql`', () => {
    expect(casoDaEtapa(sql)).toBe(funnelStageSql('p'))
  })

  it('as duas janelas e o `janela_min` são `LIVE_WINDOW_MIN`', () => {
    expect(janelas(sql)).toEqual({ presentes: [LIVE_WINDOW_MIN], barras: [LIVE_WINDOW_MIN], devolvida: [LIVE_WINDOW_MIN] })
  })
})

describe('sensores — a cópia trocada reprova', () => {
  it('a ordem invertida (sacola antes do checkout) reprova', () => {
    const invertido = mutar(
      sql,
      "when p.page_kind = 'checkout' then 'checkout' when p.cart_items > 0 then 'sacola'",
      "when p.cart_items > 0 then 'sacola' when p.page_kind = 'checkout' then 'checkout'",
    )
    expect(funilBate(sql)).toBe(true)
    expect(funilBate(invertido)).toBe(false)
  })

  it('a sacola com `>= 0` (todo mundo na sacola) reprova', () => {
    expect(funilBate(mutar(sql, 'p.cart_items > 0', 'p.cart_items >= 0'))).toBe(false)
  })

  it('outra página no lugar do checkout reprova', () => {
    expect(funilBate(mutar(sql, "p.page_kind = 'checkout'", "p.page_kind = 'sacola'"))).toBe(false)
  })

  it.each([
    ["> v_minuto - interval '5 minutes'", "> v_minuto - interval '6 minutes'"],
    ["> g.minuto - interval '5 minutes'", "> g.minuto - interval '4 minutes'"],
    ["'janela_min', 5", "'janela_min', 10"],
  ])('a janela trocada reprova: %s', (de, para) => {
    expect(janelaBate(sql)).toBe(true)
    expect(janelaBate(mutar(sql, de, para))).toBe(false)
  })

  it('a janela da barra apagada reprova (a régua não aceita ausência)', () => {
    expect(janelaBate(mutar(sql, "> g.minuto - interval '5 minutes'", '> g.minuto'))).toBe(false)
  })

  it('o dono mudando muda o esperado: outro alias produz outro `case`, que a migration não carrega', () => {
    expect(casoDaEtapa(sql)).not.toBe(funnelStageSql('x'))
  })

  it('comentário não é código — com CRLF e com LF', () => {
    expect(normal("-- case when a then 'b' end as etapa\r\nselect 1")).not.toContain('as etapa')
    expect(normal("/* case when a then 'b' end as etapa */\nselect 1")).not.toContain('as etapa')
  })
})
