import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration da feature `76` — `orders_open` em `customer_stats` e `customer_list`
 * (`MAC-24`, `MAC-09`). Molde de `atelieClockSchema.test.ts`: **afrouxar uma migration não quebra
 * nada**. A view que perde o `security_invoker` vira furo de RLS, a coluna nova no meio desloca as
 * 18 antigas (o `CREATE OR REPLACE VIEW` recusa, ou pior, o painel lê a coluna errada), um `grant`
 * ou uma escrita entrando de carona aplicam limpos e passam em build, `tsc` e teste de componente.
 *
 * **Uma régua por COMANDO** (`L-033`), cada uma um predicado exercido também contra texto mutado, e
 * `mutar()` **lança** quando a mutação não muda nada. A migration `34`, de onde o corpo foi copiado,
 * é lida do disco: as colunas anteriores têm de ser, em ordem e texto, as dela.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const M76 = resolve(ROOT, 'supabase/migrations/20261025120000_76-clientes-em-aberto.sql')
const M34 = resolve(ROOT, 'supabase/migrations/20260829120000_34-painel-de-vendas.sql')

/** Linha e bloco na MESMA varredura, com `[^\n\r]` fechando antes do `\r` (`L-031`, `BL-027`). */
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')
const ler = (p: string): string => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const sql76 = semComentario(ler(M76))
const sql34 = semComentario(ler(M34))
const bruto76 = ler(M76)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const norm = (t: string): string => t.replace(/\s+/g, ' ').trim().toLowerCase()

type Vista = 'customer_stats' | 'customer_list'

/** O `CREATE OR REPLACE VIEW` da vista, até o `;`. `null` reprova. */
const vista = (texto: string, nome: Vista): string | null => {
  const c = semComentario(texto)
  const i = c.search(new RegExp(`create\\s+or\\s+replace\\s+view\\s+public\\.${nome}\\b`, 'i'))
  if (i < 0) return null
  const f = c.indexOf(';', i)
  return f < 0 ? null : c.slice(i, f + 1)
}

/** A lista do `SELECT` final (o último `select` de profundidade zero), partida por vírgula de nível 0. */
const colunasDe = (v: string | null): string[] | null => {
  if (!v) return null
  let nivel = 0
  let ultimo = -1
  for (let i = 0; i < v.length; i++) {
    if (v[i] === '(') nivel++
    else if (v[i] === ')') nivel--
    else if (nivel === 0 && /^select\b/i.test(v.slice(i, i + 7)) && (i === 0 || /\s|\)/.test(v[i - 1]))) ultimo = i
  }
  if (ultimo < 0) return null
  const depois = v.slice(ultimo + 6)
  const fim = (() => {
    let n = 0
    for (let i = 0; i < depois.length; i++) {
      if (depois[i] === '(') n++
      else if (depois[i] === ')') n--
      else if (n === 0 && /^\s*from\b/i.test(depois.slice(i, i + 6)) && i > 0 && /\s|\)/.test(depois[i - 1])) return i
    }
    return depois.length
  })()
  const lista = depois.slice(0, fim)
  const itens: string[] = []
  let n = 0
  let atual = ''
  for (const ch of lista) {
    if (ch === '(') n++
    if (ch === ')') n--
    if (ch === ',' && n === 0) {
      itens.push(atual)
      atual = ''
    } else atual += ch
  }
  itens.push(atual)
  return itens.map(i => {
    const m = /\bas\s+(\w+)\s*$/i.exec(i.trim())
    if (m) return m[1].toLowerCase()
    const d = /(?:\.|^)(\w+)\s*$/.exec(i.trim())
    return (d ? d[1] : i.trim()).toLowerCase()
  })
}

const STATS_34 = [
  'customer_id', 'orders_paid', 'orders_total', 'total_spent', 'avg_ticket', 'first_order_at',
  'last_order_at', 'last_activity_at', 'orders_with_material', 'material_kinds',
]
const LIST_34 = [
  'id', 'user_id', 'name', 'email', 'cpf', 'phone', 'created_at', 'has_account', 'orders_paid',
  'orders_total', 'total_spent', 'avg_ticket', 'first_order_at', 'last_order_at', 'last_activity_at',
  'orders_with_material', 'material_kinds', 'same_email_count',
]

/** A linha acrescentada em cada vista, por extenso (a de stats é a saída colada de `openOrdersSqlFilter`). */
const ACRESCIMO = {
  customer_stats:
    /,\s*count\(v\.order_id\)\s+filter\s+\(where[^)]*\)\s*(?:\([^)]*\)\s*)?\)\s+as\s+orders_open/i,
  customer_list: /,\s*coalesce\(s\.orders_open,\s*0\)\s+as\s+orders_open/i,
}

/** A vista da `76` SEM a coluna nova — o que tem de ser igual ao corpo da `34`. */
const semAColuna = (texto: string, nome: Vista): string | null => {
  const v = vista(texto, nome)
  if (!v) return null
  const sem = v.replace(ACRESCIMO[nome], '')
  return sem === v ? null : norm(sem)
}

const R = {
  duasVistas: (t: string) => vista(t, 'customer_stats') !== null && vista(t, 'customer_list') !== null,
  invoker: (t: string, n: Vista) => /with\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(vista(t, n) ?? ''),
  ultima: (t: string, n: Vista) => {
    const c = colunasDe(vista(t, n))
    return !!c && c[c.length - 1] === 'orders_open' && c.filter(x => x === 'orders_open').length === 1
  },
  anteriores: (t: string, n: Vista) => {
    const c = colunasDe(vista(t, n))
    const esperado = n === 'customer_stats' ? STATS_34 : LIST_34
    return !!c && JSON.stringify(c.slice(0, -1)) === JSON.stringify(esperado)
  },
  corpoDaTrinta4: (t: string, n: Vista) => {
    const a = semAColuna(t, n)
    const b = vista(sql34, n)
    return a !== null && b !== null && a === norm(b)
  },
  coalesceNaLista: (t: string) => /coalesce\(\s*s\.orders_open\s*,\s*0\s*\)\s+as\s+orders_open/i.test(vista(t, 'customer_list') ?? ''),
  semGrant: (t: string) => !/\b(grant|revoke)\b/i.test(semComentario(t)),
  semDestrutivo: (t: string) => !/\b(drop|insert|update|delete|truncate|alter)\b/i.test(semComentario(t)),
  comentarios: (t: string) =>
    /comment\s+on\s+view\s+public\.customer_stats\s+is/i.test(semComentario(t)) &&
    /comment\s+on\s+view\s+public\.customer_list\s+is/i.test(semComentario(t)),
}

describe('migration da 76: orders_open (clientesSchema)', () => {
  it('âncora: a migration e a 34 foram lidas, as duas vistas existem e as colunas foram contadas', () => {
    expect(sql76.length).toBeGreaterThan(500)
    expect(sql34.length).toBeGreaterThan(500)
    expect(R.duasVistas(sql76)).toBe(true)
    expect(colunasDe(vista(sql34, 'customer_stats'))).toHaveLength(10)
    expect(colunasDe(vista(sql76, 'customer_stats'))).toHaveLength(11)
    expect(colunasDe(vista(sql34, 'customer_list'))).toHaveLength(18)
    expect(colunasDe(vista(sql76, 'customer_list'))).toHaveLength(19)
  })

  it('usa CREATE OR REPLACE VIEW nas duas (nunca drop)', () => {
    expect(R.duasVistas(sql76)).toBe(true)
    expect(R.duasVistas(mutar(sql76, /create\s+or\s+replace\s+view\s+public\.customer_list/i, 'create view public.customer_list'))).toBe(false)
    expect(R.duasVistas(mutar(sql76, /create\s+or\s+replace\s+view\s+public\.customer_stats/i, 'create view public.customer_stats'))).toBe(false)
  })

  it.each(['customer_stats', 'customer_list'] as const)('%s: security_invoker = true', n => {
    expect(R.invoker(sql76, n)).toBe(true)
    const re = new RegExp(`(create\\s+or\\s+replace\\s+view\\s+public\\.${n}\\s+)with\\s*\\(\\s*security_invoker\\s*=\\s*true\\s*\\)`, 'i')
    expect(R.invoker(mutar(sql76, re, '$1'.replace('$1', `create or replace view public.${n} `)), n)).toBe(false)
    expect(R.invoker(mutar(sql76, new RegExp(`(view\\s+public\\.${n}\\s+with\\s*\\(\\s*security_invoker\\s*=\\s*)true`, 'i'), 'view public.' + n + ' with (security_invoker = false'), n)).toBe(false)
  })

  it.each(['customer_stats', 'customer_list'] as const)('%s: orders_open é a ÚLTIMA coluna, uma vez só', n => {
    expect(R.ultima(sql76, n)).toBe(true)
    const v = vista(sql76, n) as string
    // movida para o meio: a última passa a ser outra coluna
    const movida = mutar(v, ACRESCIMO[n], '')
    expect(R.ultima(movida, n)).toBe(false)
    const noMeio = mutar(movida, /\bas\s+orders_paid\b/i, 'as orders_paid, 0 as orders_open')
    expect(R.ultima(noMeio, n)).toBe(false)
  })

  it.each(['customer_stats', 'customer_list'] as const)('%s: as colunas anteriores são, em ordem, as da 34', n => {
    expect(R.anteriores(sql76, n)).toBe(true)
    const v = vista(sql76, n) as string
    expect(R.anteriores(mutar(v, /\bas\s+orders_total\b/i, 'as orders_totais'), n)).toBe(false)
  })

  it.each(['customer_stats', 'customer_list'] as const)('%s: o corpo é o da 34, texto a texto, mais a coluna', n => {
    expect(R.corpoDaTrinta4(sql76, n)).toBe(true)
    const v = vista(sql76, n) as string
    const alvo = n === 'customer_stats' ? "'approved')            AS orders_paid" : 'coalesce(s.orders_paid, 0)'
    expect(R.corpoDaTrinta4(mutar(v, alvo, n === 'customer_stats' ? "'pending')            AS orders_paid" : 'coalesce(s.orders_total, 0)'), n)).toBe(false)
  })

  it('a lista usa coalesce(s.orders_open, 0): pessoa sem pedido tem 0, nunca nulo', () => {
    expect(R.coalesceNaLista(sql76)).toBe(true)
    expect(R.coalesceNaLista(mutar(sql76, 'coalesce(s.orders_open, 0)', 's.orders_open'))).toBe(false)
  })

  it('nenhum grant ou revoke', () => {
    expect(R.semGrant(sql76)).toBe(true)
    expect(R.semGrant(sql76 + '\ngrant select on public.customer_list to anon;')).toBe(false)
    expect(R.semGrant(sql76 + '\nrevoke all on public.customer_list from public;')).toBe(false)
  })

  it('nenhum drop, insert, update, delete (a migration não escreve dado nem derruba coisa)', () => {
    expect(R.semDestrutivo(sql76)).toBe(true)
    for (const cmd of ['drop view public.customer_list;', 'insert into public.orders default values;', 'update public.orders set status = 1;', 'delete from public.orders;'])
      expect(R.semDestrutivo(sql76 + '\n' + cmd)).toBe(false)
  })

  it('os dois COMMENT ON VIEW estão atualizados (a prosa que cita a feature 76)', () => {
    expect(R.comentarios(sql76)).toBe(true)
    expect(R.comentarios(mutar(sql76, /comment\s+on\s+view\s+public\.customer_list/i, 'comment on view public.outra'))).toBe(false)
    expect(/orders_open[^']*feature 76|feature 76[^']*orders_open/i.test(bruto76)).toBe(true)
  })
})
