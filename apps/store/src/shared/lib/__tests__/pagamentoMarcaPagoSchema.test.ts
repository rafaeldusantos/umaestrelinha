import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O pagamento aprovado passa o pedido de `pending` para `paid` (2026-10-27).
 *
 * Até essa migration `apply_payment_approval` nunca tocava `orders.status`, e o primeiro pedido pago
 * pela loja nova (#0183) ficou "Aprovado" e "Pendente" ao mesmo tempo — com o material recebido, ele
 * sairia de "Pago, a separar" e de "Precisa de ação" (as duas leem `status = 'paid'`) sem nada
 * acusar. Ninguém percebeu porque os pedidos `paid` de antes vieram do importador da Nuvemshop.
 *
 * Este guarda lê a migration **VIGENTE** da função — a última que a recria —, e não só a de
 * 2026-10-27: uma migration futura que recriasse `apply_payment_approval` a partir de uma cópia
 * velha do corpo apagaria a regra com tudo verde. A semântica (o histórico, o `separating` que não
 * volta, a correção idempotente) é provada contra o banco pelo probe
 * `supabase/operacoes/pagamento-aprovado-marca-pago.probe.sql`; aqui mora o que o CI alcança.
 *
 * Cada régua é um predicado, exercido também contra texto mutado; `mutar()` lança quando a mutação
 * não acha o alvo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const PASTA = resolve(ROOT, 'supabase/migrations')
const CRIA = /create\s+or\s+replace\s+function\s+public\.apply_payment_approval\s*\(/i

const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')

const mutar = (texto: string, de: string | RegExp, para: string): string => {
  const mutante = texto.replace(de as string, para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${String(de).slice(0, 70)}…`)
  return mutante
}

const arquivos = readdirSync(PASTA).filter(f => f.endsWith('.sql')).sort()
const queCriam = arquivos.filter(f => CRIA.test(semComentario(readFileSync(resolve(PASTA, f), 'utf8'))))
const vigente = queCriam[queCriam.length - 1]
const comandos = semComentario(readFileSync(resolve(PASTA, vigente), 'utf8'))

/** O corpo da função, entre os dois `$$`. `null` quando o recorte falha — e o guarda reprova. */
const corpo = (texto: string): string | null => {
  const m = texto.match(/apply_payment_approval\s*\([\s\S]*?\bas\s+\$\$([\s\S]*?)\$\$/i)
  return m ? m[1] : null
}

/** A primeira escrita: `update public.orders … returning coupon_id`. */
const primeiraEscrita = (texto: string): string | null => {
  const c = corpo(texto)
  const m = c?.match(/update\s+public\.orders\s+set([\s\S]*?)returning\s+coupon_id/i)
  return m ? m[1] : null
}

// -------------------------------------------------------------------------------------------
// As réguas
// -------------------------------------------------------------------------------------------

/** O status anda só de `pending`, na MESMA escrita que grava o pagamento. */
const pendenteViraPago = (texto: string): boolean =>
  /status\s*=\s*case\s+when\s+status\s*=\s*'pending'\s+then\s+'paid'\s+else\s+status\s+end/i.test(
    primeiraEscrita(texto) ?? '',
  )

/** A idempotência continua sendo `paid_at is null` na mesma escrita. */
const idempotente = (texto: string): boolean =>
  /where\s+id\s*=\s*p_order_id\s+and\s+paid_at\s+is\s+null\s*$/i.test((primeiraEscrita(texto) ?? '').trim())

/** O status de antes é lido com a linha travada. */
const leComTrava = (texto: string): boolean =>
  /select\s+status\s+into\s+v_status_antes\s+from\s+public\.orders\s+where\s+id\s*=\s*p_order_id\s+for\s+update\s*;/i.test(
    corpo(texto) ?? '',
  )

/** O histórico é gravado só quando o status de antes era `pending`, e DEPOIS do `return false`. */
const gravaHistorico = (texto: string): boolean => {
  const c = corpo(texto) ?? ''
  const historico = c.search(
    /if\s+v_status_antes\s*=\s*'pending'\s+then\s+insert\s+into\s+public\.order_status_history\s*\(\s*order_id\s*,\s*from_status\s*,\s*to_status\s*,\s*note\s*,\s*created_by\s*\)\s*values\s*\(\s*p_order_id\s*,\s*'pending'\s*,\s*'paid'/i,
  )
  const saida = c.search(/if\s+not\s+found\s+then\s+return\s+false\s*;/i)
  return historico >= 0 && saida >= 0 && saida < historico
}

/** Só a service role executa. */
const soServiceRole = (texto: string): boolean => {
  const t = semComentario(texto)
  const assinatura = 'public\\.apply_payment_approval\\(uuid,\\s*text,\\s*text\\)'
  const revoga = (papel: string) =>
    new RegExp(`revoke\\s+all\\s+on\\s+function\\s+${assinatura}\\s+from\\s+${papel}\\s*;`, 'i').test(t)
  const concede = [...t.matchAll(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+${assinatura}\\s+to\\s+(\\w+)`, 'gi'))]
  return revoga('public') && revoga('anon') && revoga('authenticated') &&
    concede.length === 1 && concede[0][1].toLowerCase() === 'service_role'
}

describe('a migration vigente de apply_payment_approval', () => {
  it('âncora: o recorte acha o arquivo, o corpo e a primeira escrita', () => {
    expect(queCriam.length).toBeGreaterThanOrEqual(4)
    expect(vigente >= '20261030120000_pagamento-aprovado-marca-pago.sql').toBe(true)
    expect(corpo(comandos)).not.toBeNull()
    expect(primeiraEscrita(comandos)).toMatch(/payment_status\s*=\s*'approved'/)
  })

  it('o pagamento aprovado muda pending para paid, na mesma escrita', () => {
    expect(pendenteViraPago(comandos)).toBe(true)
    expect(pendenteViraPago(mutar(comandos, /\s*status\s*=\s*case[^,]*,/i, ''))).toBe(false)
    expect(pendenteViraPago(mutar(comandos, "then 'paid' else status", "then 'paid' else 'paid'"))).toBe(false)
  })

  it('a idempotência continua sendo paid_at is null', () => {
    expect(idempotente(comandos)).toBe(true)
    expect(idempotente(mutar(comandos, /\s+and\s+paid_at\s+is\s+null/i, ''))).toBe(false)
  })

  it('o status de antes é lido com a linha travada', () => {
    expect(leComTrava(comandos)).toBe(true)
    expect(leComTrava(mutar(comandos, /\s+for\s+update\s*;/i, ';'))).toBe(false)
  })

  it('a mudança entra no histórico, e só depois de o webhook repetido sair', () => {
    expect(gravaHistorico(comandos)).toBe(true)
    expect(gravaHistorico(mutar(comandos, /if\s+v_status_antes\s*=\s*'pending'\s+then/i, 'if true then'))).toBe(false)
    // O histórico antes do `return false`: o segundo webhook gravaria uma linha a cada notificação.
    const c = corpo(comandos)!
    const bloco = c.match(/\s*if\s+v_status_antes[\s\S]*?end\s+if\s*;/i)![0]
    const movido = mutar(c.replace(bloco, ''), /(update\s+public\.orders\s+set)/i, `${bloco}\n$1`)
    expect(gravaHistorico(comandos.replace(c, movido))).toBe(false)
  })

  it('só a service role executa', () => {
    expect(soServiceRole(comandos)).toBe(true)
    expect(soServiceRole(`${comandos}\ngrant execute on function public.apply_payment_approval(uuid, text, text) to authenticated;`)).toBe(false)
    expect(soServiceRole(mutar(comandos, /revoke\s+all[^;]*from\s+anon\s*;/i, ''))).toBe(false)
  })
})

describe('a correção dos pedidos já pagos que ficaram pending', () => {
  const sql = semComentario(
    readFileSync(resolve(PASTA, '20261030120000_pagamento-aprovado-marca-pago.sql'), 'utf8'),
  )
  /** Só o recorte exato muda, e o histórico sai das linhas que ESTA atualização mudou. */
  const corrige = (texto: string): boolean =>
    /with\s+corrigidos\s+as\s*\(\s*update\s+public\.orders\s+set\s+status\s*=\s*'paid'\s+where\s+status\s*=\s*'pending'\s+and\s+payment_status\s*=\s*'approved'\s+and\s+paid_at\s+is\s+not\s+null\s+returning\s+id\s*\)\s*insert\s+into\s+public\.order_status_history[\s\S]*?from\s+corrigidos\s*;/i.test(
      texto,
    )

  it('o recorte é pending + approved + paid_at, e o histórico vem do returning', () => {
    expect(corrige(sql)).toBe(true)
    expect(corrige(mutar(sql, /\s+and\s+payment_status\s*=\s*'approved'/i, ''))).toBe(false)
    expect(corrige(mutar(sql, /where\s+status\s*=\s*'pending'\s+and/i, 'where'))).toBe(false)
    expect(corrige(mutar(sql, /from\s+corrigidos\s*;/i, 'from public.orders;'))).toBe(false)
  })
})
