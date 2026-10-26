import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  NEEDS_ACTION_BLOCKS,
  QUEUE_BLOCKS,
  needsActionSqlPredicate,
  queueBlock,
  toSqlPredicate,
  type QueueBlockId,
} from '@estrelinha/core/orders'

/**
 * Feature `73` · `MAI-06` · `AD-057` — a regra da fila tem UM dono (`core/orders/queue.ts`), e a cópia
 * em SQL dentro de `store_overview` é DELIBERADA e guardada byte a byte (molde de
 * `materialTransitions.test.ts`).
 *
 * A cópia existe porque a Início do ateliê só lê RPC admin (`MAI-23`), e a RPC conta em SQL. Duas
 * escritas da mesma regra divergem sem nada quebrar: o painel diria "Pago, a separar: 3" e o celular
 * "4", com as duas suítes verdes. Este guarda lê a migration do disco e exige, para cada bloco,
 * **exatamente** `count(*) filter (where <toSqlPredicate(bloco)>) as <coluna>`, e a união "Precisa de
 * ação" como o `or` dos três — nunca uma soma.
 *
 * Mora na suíte da loja porque é aqui que moram os guardas que leem migration.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')
const CAMINHO = resolve(ROOT, 'supabase/migrations/20261023120000_73-resumo-do-atelie.sql')

const semComentario = (texto: string): string => texto.replace(/\/\*[\s\S]*?\*\/|--[^\n\r]*/g, '')
const sql = semComentario(readFileSync(CAMINHO, 'utf8').replace(/\r\n/g, '\n'))

const mutar = (texto: string, de: string, para: string): string => {
  const mutante = texto.replace(de, () => para)
  if (mutante === texto) throw new Error(`mutação não encontrou o alvo: ${de.slice(0, 70)}…`)
  return mutante
}

/** A coluna do JSON para cada bloco — o tipo `OverviewQueue` (`core/stats/overview.ts`). */
const COLUNA: Record<QueueBlockId, string> = {
  aguardando: 'aguardando',
  'a-separar': 'a_separar',
  'sem-rastreio': 'sem_rastreio',
  'pix-aguardando': 'pix_aguardando',
}

/** A CTE `fila`, recortada. `null` reprova. */
const fila = (texto: string): string | null => {
  const m = /\bfila\s+as\s+\(/i.exec(texto)
  if (!m) return null
  let nivel = 0
  for (let i = m.index + m[0].length - 1; i < texto.length; i++) {
    if (texto[i] === '(') nivel++
    if (texto[i] === ')' && --nivel === 0) return texto.slice(m.index, i + 1)
  }
  return null
}

/** As linhas `count(*) filter (where …) as <coluna>` da CTE, por coluna. */
const contagens = (texto: string): Record<string, string> => {
  const f = fila(texto) ?? ''
  const saida: Record<string, string> = {}
  for (const linha of f.split('\n')) {
    const m = /^\s*count\(\*\) filter \(where (.*)\) as (\w+),?\s*$/.exec(linha)
    if (m) saida[m[2]] = m[1]
  }
  return saida
}

/** Cada bloco carrega EXATAMENTE o predicado de `core`. */
const blocosBatem = (texto: string): string[] => {
  const c = contagens(texto)
  return QUEUE_BLOCKS.filter((b) => c[COLUNA[b.id]] !== toSqlPredicate(b.rule)).map((b) => b.id)
}

const uniaoBate = (texto: string): boolean => contagens(texto).precisa_acao === needsActionSqlPredicate()

const idadeBate = (texto: string): boolean =>
  (fila(texto) ?? '').includes(
    `min(o.created_at) filter (where ${toSqlPredicate(queueBlock('aguardando').rule)}) as aguardando_desde`,
  )

/** A fila conta `orders` inteira (é o painel de hoje): nenhum recorte de data dentro dela. */
const filaSemData = (texto: string): boolean => {
  const f = fila(texto) ?? ''
  return /from\s+public\.orders\s+o\s*\)$/i.test(f.trim()) && !/paid_at|store_day/i.test(f)
}

describe('filaComDonoUnico — âncora', () => {
  it('a migration foi lida, a CTE `fila` achada, e as cinco contagens dela encontradas', () => {
    expect(sql.length).toBeGreaterThan(1000)
    expect(fila(sql)).not.toBeNull()
    expect(Object.keys(contagens(sql)).sort()).toEqual(
      ['a_separar', 'aguardando', 'pix_aguardando', 'precisa_acao', 'sem_rastreio'],
    )
  })

  it('os quatro blocos de `core` estão todos mapeados', () => {
    expect(QUEUE_BLOCKS.map((b) => COLUNA[b.id])).toEqual(['aguardando', 'a_separar', 'sem_rastreio', 'pix_aguardando'])
  })
})

describe('filaComDonoUnico — a cópia em SQL é a de core, byte a byte', () => {
  it.each(QUEUE_BLOCKS.map((b) => [b.id] as const))('bloco %s', (id) => {
    expect(contagens(sql)[COLUNA[id]]).toBe(toSqlPredicate(queueBlock(id).rule))
  })

  it('"Precisa de ação" é a UNIÃO dos três (o `or`), e nunca a soma', () => {
    expect(NEEDS_ACTION_BLOCKS).toHaveLength(3)
    expect(uniaoBate(sql)).toBe(true)
    expect(fila(sql)).not.toMatch(/aguardando\s*\+|a_separar\s*\+/)
  })

  it('a idade do mais antigo usa o predicado do bloco "aguardando"', () => {
    expect(idadeBate(sql)).toBe(true)
  })

  it('a fila não tem recorte de data', () => {
    expect(filaSemData(sql)).toBe(true)
  })
})

describe('filaComDonoUnico — sensores (um por bloco, e um por régua)', () => {
  it.each([
    ['aguardando', "where o.material_status = 'aguardando_material') as aguardando,", "where o.material_status = 'material_enviado') as aguardando,"],
    ['a-separar', "'nao_aplicavel', 'material_recebido', 'em_producao')) as a_separar", "'material_recebido', 'em_producao')) as a_separar"],
    ['sem-rastreio', "where o.status = 'shipped' and o.tracking_code is null) as sem_rastreio", "where o.status = 'shipped') as sem_rastreio"],
    ['pix-aguardando', "o.payment_status = 'pending') as pix_aguardando", "o.payment_status = 'pending' and o.status = 'pending') as pix_aguardando"],
  ] as const)('o bloco %s divergindo de core reprova, e só ele', (id, de, para) => {
    expect(blocosBatem(mutar(sql, de, para))).toEqual([id])
  })

  it('a união sem o material nulo (R1 "consertado" só no SQL) reprova', () => {
    expect(uniaoBate(mutar(sql, 'o.material_status is null or ', ''))).toBe(false)
  })

  it('a união trocada pela SOMA reprova', () => {
    const inicio = sql.indexOf('      count(*) filter (where (o.material_status')
    const fim = sql.indexOf(' as precisa_acao,', inicio)
    expect(inicio).toBeGreaterThan(0)
    const soma = sql.slice(0, inicio) + '      0 + 0' + sql.slice(fim)
    expect(uniaoBate(soma)).toBe(false)
  })

  it('a idade com outro predicado reprova', () => {
    expect(idadeBate(mutar(sql, "min(o.created_at) filter (where o.material_status = 'aguardando_material')", "min(o.created_at) filter (where o.material_status is not null)"))).toBe(false)
  })

  it('a fila com recorte de data reprova', () => {
    expect(filaSemData(mutar(sql, 'from public.orders o\n  ),\n  recentes', 'from public.orders o where o.paid_at >= public.store_day_start(v_mes)\n  ),\n  recentes'))).toBe(false)
  })

  it('`mutar` lança quando a mutação não acha o alvo', () => {
    expect(() => mutar(sql, 'texto que não existe', 'x')).toThrow('mutação não encontrou o alvo')
  })
})
