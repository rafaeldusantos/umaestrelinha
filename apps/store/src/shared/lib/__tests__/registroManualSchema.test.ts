import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_NOTE_MAX,
  RECEIPTS_BUCKET,
  RECEIPT_CONTENT_TYPES,
  RECEIPT_MAX_BYTES,
} from '@estrelinha/core/orders'

/**
 * O pagamento registrado à mão: o que o CI alcança das duas migrations. A semântica — o
 * estoque uma vez, a data informada no Dashboard, a cliente e o anon de fora, a URL que expira — é dos
 * probes `.specs/work-items/98-pagamento-que-falhou/probes/`. Aqui moram as cópias deliberadas (o
 * `check` do meio, o teto da observação, os tipos e o tamanho do bucket) comparadas com `core`, e a
 * forma das policies. Uma régua por comando; `mutar()` lança quando a mutação não acha o alvo.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const ler = (nome: string) => readFileSync(resolve(ROOT, 'supabase/migrations', nome), 'utf8')
const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const TABELAS = semComentario(ler('20261112120000_98-registrar-pagamento.sql'))
const PORTA = semComentario(ler('20261112130000_98-aprovacao-com-data-e-autor.sql'))

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const lista = (trecho: string): string[] => [...trecho.matchAll(/'([^']+)'/g)].map((m) => m[1])

/** O `check` de `method` na tabela, e a mesma lista dentro da RPC. */
const meiosDaTabela = (t: string): string[] | null => {
  const m = t.match(/method\s+text\s+check\s*\(\s*method\s+in\s*\(([^)]*)\)/i)
  return m ? lista(m[1]) : null
}
const meiosDaRpc = (t: string): string[] | null => {
  const m = t.match(/p_method\s+not\s+in\s*\(([^)]*)\)/i)
  return m ? lista(m[1]) : null
}

/** A policy de uma tabela: `for all to authenticated`, `has_role` no `using` E no `with check`. */
const policySoAdmin = (t: string, tabela: string): boolean =>
  new RegExp(
    `create\\s+policy\\s+"[^"]+"\\s+on\\s+public\\.${tabela}\\s+for\\s+all\\s+to\\s+authenticated\\s+using\\s*\\(\\s*public\\.has_role\\(auth\\.uid\\(\\),\\s*'admin'\\)\\s*\\)\\s+with\\s+check\\s*\\(\\s*public\\.has_role\\(auth\\.uid\\(\\),\\s*'admin'\\)\\s*\\)\\s*;`,
    'i',
  ).test(t)

const rlsERevoke = (t: string, tabela: string): boolean =>
  new RegExp(`alter\\s+table\\s+public\\.${tabela}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(t) &&
  new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${tabela}\\s+from\\s+anon\\s*;`, 'i').test(t) &&
  new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${tabela}\\s+from\\s+public\\s*;`, 'i').test(t)

const semGrant = (t: string): boolean => !/\bgrant\s+[^;]*\bon\s+(table\s+)?public\.order_manual_payment/i.test(t)

/** O bucket: privado, com o tamanho e os tipos de `core`. */
const bucket = (t: string) => {
  const m = t.match(/insert\s+into\s+storage\.buckets\s*\([^)]*\)\s*values\s*\(([\s\S]*?)\)\s*on\s+conflict/i)
  if (!m) return null
  const partes = m[1]
  return {
    id: lista(partes)[0],
    publico: /,\s*(true|false)\s*,/i.exec(partes)?.[1].toLowerCase(),
    tamanho: Number(/,\s*(\d+)\s*,\s*array/i.exec(partes)?.[1]),
    tipos: lista(partes.slice(partes.toLowerCase().indexOf('array'))),
  }
}

/** Nenhuma policy de leitura do bucket alcança `public`/`anon`, e todas exigem `has_role`. */
const policiesDoBucket = (t: string): string[] =>
  [...t.matchAll(/create\s+policy\s+"[^"]+"\s+on\s+storage\.objects[\s\S]*?;/gi)].map((m) => m[0])
const bucketSoAdmin = (t: string): boolean => {
  const ps = policiesDoBucket(t)
  return ps.length === 3 && ps.every((p) => /\bto\s+authenticated\b/i.test(p) && /public\.has_role\(auth\.uid\(\),\s*'admin'\)/i.test(p) && /bucket_id\s*=\s*'order-payment-receipts'/i.test(p))
}

/** A RPC: `security definer`, a recusa de papel antes de ler o pedido, `execute` só a `authenticated`. */
const rpcSoAdmin = (t: string): boolean => {
  const corpo = t.match(/function\s+public\.record_manual_payment\s*\([\s\S]*?security\s+definer[\s\S]*?\$\$([\s\S]*?)\$\$/i)?.[1] ?? ''
  const papel = corpo.search(/if\s+not\s+public\.has_role\(auth\.uid\(\),\s*'admin'\)\s+then\s+return\s+jsonb_build_object\('result',\s*'sem_papel'\)/i)
  const leitura = corpo.search(/from\s+public\.orders/i)
  const grants = [...t.matchAll(/grant\s+execute\s+on\s+function\s+public\.record_manual_payment\([^)]*\)\s+to\s+(\w+)/gi)].map((m) => m[1])
  return papel >= 0 && leitura > papel && grants.length === 1 && grants[0] === 'authenticated' &&
    /revoke\s+all\s+on\s+function\s+public\.record_manual_payment\([^)]*\)\s+from\s+anon/i.test(t)
}

describe('o registro manual de pagamento — as migrations', () => {
  it('âncora: as duas migrations leem e os recortes acham o que medem', () => {
    expect(meiosDaTabela(TABELAS)).not.toBeNull()
    expect(meiosDaRpc(PORTA)).not.toBeNull()
    expect(bucket(TABELAS)).not.toBeNull()
    expect(policiesDoBucket(TABELAS)).toHaveLength(3)
  })

  it('o meio aceito pela tabela e pela RPC é a lista de `core`', () => {
    expect(meiosDaTabela(TABELAS)).toEqual([...MANUAL_PAYMENT_METHODS])
    expect(meiosDaRpc(PORTA)).toEqual([...MANUAL_PAYMENT_METHODS])
    expect(meiosDaTabela(mutar(TABELAS, "'dinheiro', ", ''))).not.toEqual([...MANUAL_PAYMENT_METHODS])
  })

  it('o teto da observação é o de `core`, na tabela e na RPC', () => {
    expect(TABELAS).toMatch(new RegExp(`note\\s+is\\s+null\\s+or\\s+char_length\\(btrim\\(note\\)\\)\\s+between\\s+1\\s+and\\s+${MANUAL_PAYMENT_NOTE_MAX}\\b`, 'i'))
    expect(PORTA).toMatch(new RegExp(`char_length\\(v_nota\\)\\s*>\\s*${MANUAL_PAYMENT_NOTE_MAX}\\b`, 'i'))
  })

  it('as duas tabelas: RLS ligada, `revoke` de anon e public, policy só admin, nenhum grant', () => {
    for (const t of ['order_manual_payments', 'order_manual_payment_receipts']) {
      expect(rlsERevoke(TABELAS, t)).toBe(true)
      expect(policySoAdmin(TABELAS, t)).toBe(true)
    }
    expect(semGrant(TABELAS)).toBe(true)
    // Sensores: o `with check` apagado, o revoke do anon apagado, um grant acrescentado.
    expect(policySoAdmin(mutar(TABELAS, /\s+with\s+check\s*\([^;]*\)\s*;/i, ';'), 'order_manual_payments')).toBe(false)
    expect(rlsERevoke(mutar(TABELAS, /revoke\s+all\s+on\s+table\s+public\.order_manual_payments\s+from\s+anon\s*;/i, ''), 'order_manual_payments')).toBe(false)
    expect(semGrant(`${TABELAS}\ngrant select on public.order_manual_payments to anon;`)).toBe(false)
  })

  it('o autor é `on delete set null`, e há no máximo um registro vivo por pedido', () => {
    expect(TABELAS).toMatch(/created_by\s+uuid\s+references\s+auth\.users\s*\(id\)\s+on\s+delete\s+set\s+null/i)
    expect(TABELAS).toMatch(/create\s+unique\s+index[^;]*on\s+public\.order_manual_payments\s*\(order_id\)\s+where\s+undone_at\s+is\s+null/i)
  })

  it('o bucket é privado, com o tamanho e os tipos de `core`', () => {
    const b = bucket(TABELAS)!
    expect(b).toEqual({ id: RECEIPTS_BUCKET, publico: 'false', tamanho: RECEIPT_MAX_BYTES, tipos: [...RECEIPT_CONTENT_TYPES] })
    expect(bucket(mutar(TABELAS, /'order-payment-receipts', 'order-payment-receipts', false/, "'order-payment-receipts', 'order-payment-receipts', true"))!.publico).toBe('true')
  })

  it('as três policies do bucket são de admin, nenhuma pública', () => {
    expect(bucketSoAdmin(TABELAS)).toBe(true)
    expect(bucketSoAdmin(mutar(TABELAS, /for\s+select\s+to\s+authenticated/i, 'for select to public'))).toBe(false)
  })

  it('a RPC recusa quem não é admin antes de ler o pedido, e só `authenticated` a executa', () => {
    expect(rpcSoAdmin(PORTA)).toBe(true)
    expect(rpcSoAdmin(mutar(PORTA, /if\s+not\s+public\.has_role\(auth\.uid\(\),\s*'admin'\)\s+then/i, 'if false then'))).toBe(false)
    expect(rpcSoAdmin(`${PORTA}\ngrant execute on function public.record_manual_payment(uuid, text, timestamptz, text, jsonb, text) to anon;`)).toBe(false)
  })

  it('observação e comprovante não viram coluna de `orders`', () => {
    for (const t of [TABELAS, PORTA]) expect(t).not.toMatch(/alter\s+table\s+public\.orders\b/i)
  })
})
