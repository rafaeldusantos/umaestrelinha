import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * O guarda da migration que leva o desconto de campanha ao pedido.
 *
 * Lê o `.sql` do disco: afrouxar uma migration não quebra nada. `campaign_percent` com `not null`
 * derrubaria todo pedido sem campanha; o desconto do pedido sem `default 0` deixaria nulo o teto da
 * guarda do `create-payment`; e a `order_list` com a coluna fora do fim faria o `create or replace`
 * falhar no banco que já tem a view. Uma régua por COMANDO, cada uma exercida contra texto mutado, e
 * `mutar()` que lança quando não acha o alvo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261130130000_102-campanha-no-pedido.sql')
const ANTERIOR = resolve(ROOT, 'supabase/migrations/20261110160000_pedido-montado-desconto-na-lista-de-pedidos.sql')

const sql = readFileSync(CAMINHO, 'utf8')
const anterior = readFileSync(ANTERIOR, 'utf8')

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

/** As cláusulas do `alter table public.<tabela>`, uma por coluna. */
const clausula = (texto: string, tabela: string, coluna: string): string | null => {
  const alter = new RegExp(`alter\\s+table\\s+public\\.${tabela}\\s+([\\s\\S]*?);`, 'i').exec(semComentario(texto))
  if (!alter) return null
  const partes = alter[1].split(/,\s*\n/).map((p) => p.trim())
  return partes.find((p) => new RegExp(`\\b${coluna}(?![\\w])`, 'i').test(p)) ?? null
}

/** `campaign_percent`: inteiro, nulo, sem default, com o teto de 1..70. */
const percentualDaLinha = (texto: string): boolean => {
  const c = clausula(texto, 'order_items', 'campaign_percent')
  return (
    !!c &&
    /^add\s+column\s+if\s+not\s+exists\s+campaign_percent\s+integer\s+check\s*\(\s*campaign_percent\s+between\s+1\s+and\s+70\s*\)$/i.test(
      c,
    )
  )
}

/** `compare_unit_price`: numeric(10,2), nulo, sem default, nunca negativo. */
const deDaLinha = (texto: string): boolean => {
  const c = clausula(texto, 'order_items', 'compare_unit_price')
  return (
    !!c &&
    /^add\s+column\s+if\s+not\s+exists\s+compare_unit_price\s+numeric\(10,\s*2\)\s+check\s*\(\s*compare_unit_price\s*>=\s*0\s*\)$/i.test(
      c,
    )
  )
}

/** O desconto de campanha na tabela: numeric(10,2), `not null default 0`, nunca negativo. */
const descontoNaTabela = (texto: string, tabela: string): boolean => {
  const c = clausula(texto, tabela, 'campaign_discount')
  return (
    !!c &&
    /^add\s+column\s+if\s+not\s+exists\s+campaign_discount\s+numeric\(10,\s*2\)\s+not\s+null\s+default\s+0\s+check\s*\(\s*campaign_discount\s*>=\s*0\s*\)$/i.test(
      c,
    )
  )
}

/** As colunas da `order_list`, na ordem do `select`. */
const colunasDaView = (texto: string): string[] | null => {
  const m = /create\s+or\s+replace\s+view\s+public\.order_list[\s\S]*?select([\s\S]*?)from\s+public\.orders/i.exec(
    semComentario(texto),
  )
  if (!m) return null
  return m[1]
    .replace(/row_number\(\)[\s\S]*?as\s+purchase_ordinal/i, 'purchase_ordinal')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c !== '')
}

/** A view recriada é a anterior com `campaign_discount` acrescentada no fim, e `security_invoker`. */
const viewAcrescentaNoFim = (texto: string): boolean => {
  const nova = colunasDaView(texto)
  const velha = colunasDaView(anterior)
  if (!nova || !velha) return false
  const invoker = /create\s+or\s+replace\s+view\s+public\.order_list\s+with\s*\(\s*security_invoker\s*=\s*true\s*\)/i.test(
    semComentario(texto),
  )
  return invoker && nova.length === velha.length + 1 && velha.every((c, i) => nova[i] === c) && nova[velha.length] === 'campaign_discount'
}

const escreveDado = (texto: string): boolean =>
  /\b(insert\s+into|update\s+public\.|delete\s+from|truncate)\b/i.test(semComentario(texto))

const concedeOuPolicy = (texto: string): boolean => /\b(grant|create\s+policy)\b/i.test(semComentario(texto))

describe('migration do desconto de campanha no pedido — âncoras', () => {
  it('leu o arquivo certo, e a view de antes', () => {
    expect(sql).toContain('campaign_discount')
    expect(colunasDaView(anterior)?.length).toBeGreaterThan(40)
  })

  it('âncora de contagem: três alter e a view — quatro comandos', () => {
    const lista = listaDeComandos(sql)
    expect(lista).toHaveLength(4)
    expect(lista.filter((c) => /^alter\s+table/i.test(c))).toHaveLength(3)
  })
})

describe('order_items — o percentual e o "de" da linha', () => {
  it('campaign_percent é inteiro, nulo, aditivo e de 1 a 70', () => {
    expect(percentualDaLinha(sql)).toBe(true)
  })
  it('sensor — `not null` reprova', () => {
    expect(percentualDaLinha(mutar(comandos, 'campaign_percent integer', 'campaign_percent integer not null'))).toBe(false)
  })
  it('sensor — o teto trocado reprova', () => {
    expect(percentualDaLinha(mutar(comandos, 'between 1 and 70', 'between 1 and 100'))).toBe(false)
  })
  it('compare_unit_price é numeric(10,2), nulo e nunca negativo', () => {
    expect(deDaLinha(sql)).toBe(true)
  })
  it('sensor — um default reprova', () => {
    expect(deDaLinha(mutar(comandos, 'compare_unit_price numeric(10,2)', 'compare_unit_price numeric(10,2) default 0'))).toBe(false)
  })
  it('sensor — sem `if not exists` reprova', () => {
    expect(deDaLinha(mutar(comandos, 'if not exists compare_unit_price', 'compare_unit_price'))).toBe(false)
  })
})

describe('o desconto de campanha do pedido e do travado', () => {
  it('orders.campaign_discount: not null default 0, nunca negativo', () => {
    expect(descontoNaTabela(sql, 'orders')).toBe(true)
  })
  it('order_charge_locks.campaign_discount: a mesma forma', () => {
    expect(descontoNaTabela(sql, 'order_charge_locks')).toBe(true)
  })
  it('sensor — sem o default reprova (o teto da guarda ficaria nulo)', () => {
    const m = mutar(comandos, /(alter table public\.orders\s+add column if not exists campaign_discount numeric\(10,2\) not null) default 0/, '$1')
    expect(descontoNaTabela(m, 'orders')).toBe(false)
  })
  it('sensor — sem o check reprova no travado', () => {
    const m = mutar(
      comandos,
      /(alter table public\.order_charge_locks\s+add column if not exists campaign_discount numeric\(10,2\) not null default 0) check \(campaign_discount >= 0\)/,
      '$1',
    )
    expect(descontoNaTabela(m, 'order_charge_locks')).toBe(false)
  })
})

describe('order_list — a coluna acrescentada no fim', () => {
  it('a lista anterior, sem reordenar, mais campaign_discount no fim e security_invoker', () => {
    expect(viewAcrescentaNoFim(sql)).toBe(true)
  })
  it('sensor — a coluna no meio reprova', () => {
    const m = mutar(comandos, 'manual_discount,\n\t\n\tcampaign_discount', 'campaign_discount,\n\tmanual_discount')
    expect(viewAcrescentaNoFim(m)).toBe(false)
  })
  it('sensor — sem security_invoker reprova', () => {
    expect(viewAcrescentaNoFim(mutar(comandos, 'with (security_invoker = true)', ''))).toBe(false)
  })
  it('sensor — uma coluna de antes perdida reprova', () => {
    expect(viewAcrescentaNoFim(mutar(comandos, 'order_bump_discount,', ''))).toBe(false)
  })
})

describe('aditiva — nada de dado, policy ou grant', () => {
  it('não escreve dado', () => {
    expect(escreveDado(sql)).toBe(false)
  })
  it('sensor — um update reprova', () => {
    expect(escreveDado(`${sql}\nupdate public.orders set campaign_discount = 0;`)).toBe(true)
  })
  it('não concede nem cria policy', () => {
    expect(concedeOuPolicy(sql)).toBe(false)
  })
  it('sensor — um grant reprova', () => {
    expect(concedeOuPolicy(`${sql}\ngrant select on public.orders to anon;`)).toBe(true)
  })
})
