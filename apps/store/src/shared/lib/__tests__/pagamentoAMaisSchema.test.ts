import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import { PAYMENT_ALERT_KINDS } from '@estrelinha/core/orders'

/**
 * O pagamento a mais: aprovado num pedido já pago, ou num pedido cancelado. O que o CI alcança da
 * migration — a cópia deliberada do `check` dos marcadores comparada com `core`, a forma da RLS, e a
 * ORDEM das duas saídas novas de `apply_payment_approval` (antes da escrita, devolvendo `false`). A
 * semântica (estoque, cupom, `paid_at`, a reentrega que não marca, quem lê) é do probe
 * `.specs/work-items/98-pagamento-que-falhou/probes/05-pagamento-a-mais.sql`.
 *
 * Uma régua por comando; `mutar()` lança quando a mutação não acha o alvo.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')
const SQL = semComentario(
  readFileSync(resolve(ROOT, 'supabase/migrations/20261114120000_98-pagamento-a-mais.sql'), 'utf8'),
)

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

/** Os tipos do `check` da tabela. `null` quando o recorte falha. */
const tiposDoCheck = (t: string): string[] | null => {
  const m = t.match(/kind\s+text\s+not\s+null\s+check\s*\(\s*kind\s+in\s*\(([^)]*)\)/i)
  return m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : null
}

/** RLS ligada, `revoke all` de anon e de public, e a policy só admin no `using` E no `with check`. */
const soAdmin = (t: string): boolean =>
  /alter\s+table\s+public\.order_payment_alerts\s+enable\s+row\s+level\s+security/i.test(t) &&
  /revoke\s+all\s+on\s+table\s+public\.order_payment_alerts\s+from\s+anon\s*;/i.test(t) &&
  /revoke\s+all\s+on\s+table\s+public\.order_payment_alerts\s+from\s+public\s*;/i.test(t) &&
  /create\s+policy\s+"[^"]+"\s+on\s+public\.order_payment_alerts\s+for\s+all\s+to\s+authenticated\s+using\s*\(\s*public\.has_role\(auth\.uid\(\),\s*'admin'\)\s*\)\s+with\s+check\s*\(\s*public\.has_role\(auth\.uid\(\),\s*'admin'\)\s*\)\s*;/i.test(
    t,
  ) &&
  !/\bgrant\s+[^;]*\bon\s+(table\s+)?public\.order_payment_alerts/i.test(t)

/** O corpo da função (o primeiro `$$`). */
const corpo = (t: string): string | null => {
  const m = t.match(/apply_payment_approval\s*\([\s\S]*?\bas\s+\$\$([\s\S]*?)\$\$/i)
  return m ? m[1] : null
}

/** A saída de um caso: o bloco que marca `kind` e devolve `false`, ANTES da escrita da aprovação. */
const saiAntesDaEscrita = (t: string, condicao: RegExp, kind: string): boolean => {
  const c = corpo(t) ?? ''
  const escrita = c.search(/update\s+public\.orders\s+set\s+payment_status\s*=\s*'approved'/i)
  const inicio = c.search(condicao)
  if (escrita < 0 || inicio < 0 || inicio > escrita) return false
  const bloco = c.slice(inicio, escrita)
  const marca = new RegExp(
    `if\\s+p_author\\s+is\\s+null[\\s\\S]*?insert\\s+into\\s+public\\.order_payment_alerts\\s*\\([^)]*\\)\\s*values\\s*\\(\\s*p_order_id\\s*,\\s*'${kind}'[\\s\\S]*?on\\s+conflict\\s+do\\s+nothing\\s*;[\\s\\S]*?end\\s+if\\s*;\\s*return\\s+false\\s*;`,
    'i',
  )
  return marca.test(bloco)
}

const JA_PAGO = /if\s+v_pago_em\s+is\s+not\s+null\s+then/i
const CANCELADO = /if\s+v_cancelado\s+then/i

describe('o marcador do pagamento a mais', () => {
  it('âncora: o recorte acha o check, o corpo e a escrita', () => {
    expect(tiposDoCheck(SQL)).not.toBeNull()
    expect(corpo(SQL)).toMatch(/update\s+public\.orders\s+set\s+payment_status/i)
  })

  it('os tipos do check são exatamente os de core', () => {
    expect(tiposDoCheck(SQL)).toEqual([...PAYMENT_ALERT_KINDS])
    expect(tiposDoCheck(mutar(SQL, "'paid_twice', 'paid_after_cancel'", "'paid_twice'"))).not.toEqual([
      ...PAYMENT_ALERT_KINDS,
    ])
  })

  it('só admin lê e grava, e ninguém recebe grant', () => {
    expect(soAdmin(SQL)).toBe(true)
    expect(soAdmin(mutar(SQL, /revoke\s+all\s+on\s+table\s+public\.order_payment_alerts\s+from\s+anon\s*;/i, ''))).toBe(false)
    expect(soAdmin(mutar(SQL, /with\s+check\s*\(\s*public\.has_role\(auth\.uid\(\),\s*'admin'\)\s*\)/i, 'with check (true)'))).toBe(false)
    expect(soAdmin(`${SQL}\ngrant select on public.order_payment_alerts to authenticated;`)).toBe(false)
  })

  it('a mesma aprovação notificada de novo não grava outro marcador (índice único com o pagamento)', () => {
    const unico = (t: string) =>
      /create\s+unique\s+index[^;]*on\s+public\.order_payment_alerts\s*\(\s*order_id\s*,\s*kind\s*,\s*coalesce\(\s*mp_payment_id\s*,\s*''\s*\)\s*\)/i.test(t)
    expect(unico(SQL)).toBe(true)
    expect(unico(mutar(SQL, /create\s+unique\s+index/i, 'create index'))).toBe(false)
  })
})

describe('apply_payment_approval: as duas saídas novas', () => {
  it('pedido já pago marca "pago duas vezes" e sai antes da escrita', () => {
    expect(saiAntesDaEscrita(SQL, JA_PAGO, 'paid_twice')).toBe(true)
    expect(saiAntesDaEscrita(mutar(SQL, /'paid_twice',\s*p_mp_payment_id/i, "'paid_after_cancel', p_mp_payment_id"), JA_PAGO, 'paid_twice')).toBe(false)
  })

  it('pedido cancelado marca "pago depois de cancelado" e sai antes da escrita', () => {
    expect(saiAntesDaEscrita(SQL, CANCELADO, 'paid_after_cancel')).toBe(true)
    // Sem a saída, a aprovação seria aplicada (estoque, cupom, e-mail) num pedido cancelado.
    const semSaida = mutar(SQL, /if\s+v_cancelado\s+then[\s\S]*?return\s+false\s*;\s*end\s+if\s*;/i, '')
    expect(saiAntesDaEscrita(semSaida, CANCELADO, 'paid_after_cancel')).toBe(false)
  })

  it('o cancelado é lido do pedido travado', () => {
    const le = (t: string) =>
      /status\s*=\s*'cancelled'\s+into\s+v_pago_em\s*,\s*v_pagamento_antes\s*,\s*v_cancelado\s+from\s+public\.orders\s+where\s+id\s*=\s*p_order_id/i.test(
        corpo(t) ?? '',
      ) && /select\s+status\s+into\s+v_status_antes\s+from\s+public\.orders\s+where\s+id\s*=\s*p_order_id\s+for\s+update\s*;/i.test(corpo(t) ?? '')
    expect(le(SQL)).toBe(true)
    expect(le(mutar(SQL, /status\s*=\s*'cancelled'\s+into/i, "status = 'pending' into"))).toBe(false)
  })

  it('a migration não escreve dado', () => {
    const fora = SQL.replace(/\$\$[\s\S]*?\$\$|\$body\$[\s\S]*?\$body\$/g, '')
    expect(/\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(fora)).toBe(false)
    expect(/\b(insert\s+into|update\s+public\.|delete\s+from)\b/i.test(`${fora}\ndelete from public.orders;`)).toBe(true)
  })
})
