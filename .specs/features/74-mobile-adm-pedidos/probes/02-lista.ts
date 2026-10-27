// Feature 74 · T10 — a lista do app contra o PostgREST LOCAL (54441) e uma consulta SQL de referência
// (54442). Rodado por `02-lista.sh`, que semeia as fixturas e as apaga (também em falha).
//
// O que prova (`MAP-01`, `MAP-02`, `MAP-10`, `MAP-14`, Success Criteria 1–2, R1, R2, R3, R10):
//   1. seis visões: o conjunto de ids do app (a cadeia do Design §3.3, montada com `applyOrderSlice`
//      de `core`) = o do painel (`viewPredicate`, a forma que `applyView` sempre aplicou) = o SQL de
//      referência, ESCRITO À MÃO aqui (oráculo independente de `core`); e a contagem `exact` = SQL;
//   2. quatro blocos: lista do app = SQL; contagem do app = `store_overview.fila` = a contagem do tile
//      do painel (`orders` com `toPostgrestFilter`), no mesmo instante;
//   3. `#0244`, `0244`, `244`: app = painel = SQL;
//   4. os TRÊS `or=` juntos — "Precisa de ação" (`or` com `and(…)` aninhado) + busca + cursor;
//   5. paginação de 25 com um `insert` no meio: nada repete, nada pula, o que entrou antes do cursor
//      não aparece, o que entrou depois aparece uma vez;
//   6. R1: pedidos no mesmo instante (µs) paginados de 1 em 1 sem pular nem repetir — e o SENSOR: o
//      cursor passado por `Date` (ms) pula ou repete;
//   7. as chaves da resposta = `COLUNAS_DA_LISTA` e as do detalhe (`AD-012`).
//      Feature `82`: o detalhe ganhou `material_tracking_set_at`/`_by` e os itens `requires_material`/
//      `material_kinds` — as listas são importadas de `linha.ts`, então a régua 7 as confere sem edição
//      (saída em `.specs/features/82-envelope-da-cliente/probes/02-colunas-da-74.saida.txt`).
//
// Rodar: `npx tsx --tsconfig tsconfig.base.json .specs/features/74-mobile-adm-pedidos/probes/02-lista.ts`
// da raiz do worktree (o `.sh` faz isso).

import { execFileSync } from 'node:child_process'

import { createClient } from '@supabase/supabase-js'

import {
  ORDER_SEARCH_COLUMNS,
  ORDER_VIEWS,
  QUEUE_BLOCKS,
  applyOrderSlice,
  buildOrderSearchCondition,
  cursorFilter,
  sliceOrder,
  stripOrderNumberPrefix,
  toPostgrestFilter,
  viewPredicate,
  type OrderCursor,
  type OrderSlice,
  type OrderViewId,
  type QueueBlockId,
} from '../../../../packages/core/src/orders/index.ts'
import {
  COLUNAS_DA_LISTA,
  COLUNAS_DAS_NOTAS,
  COLUNAS_DAS_NOTIFICACOES,
  COLUNAS_DO_DETALHE,
  COLUNAS_DO_STATUS,
  COLUNAS_DOS_ITENS,
} from '../../../../apps/mobile-adm/src/entities/order/model/linha.ts'

const DB = 'postgresql://postgres:postgres@127.0.0.1:54442/postgres'
const URL = 'http://127.0.0.1:54441'
const KEY = process.env.APIKEY ?? ''
if (!KEY) throw new Error('APIKEY ausente')

let falhas = 0
const ok = (cond: boolean, oque: string, detalhe?: unknown) => {
  if (cond) console.log(`ok — ${oque}`)
  else {
    falhas++
    console.log(`FALHOU — ${oque}${detalhe === undefined ? '' : ` :: ${JSON.stringify(detalhe)}`}`)
  }
}
const iguais = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

const psql = (sql: string): string => execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-At', '-c', sql], { encoding: 'utf8' }).trim()
const sqlIds = (where: string): string[] => {
  const s = psql(`select coalesce(string_agg(id::text, ','), '') from public.orders o where ${where}`)
  return s === '' ? [] : s.split(',')
}

// --- O oráculo SQL: escrito À MÃO, nunca derivado de `core` ---------------------------------
const NAO_SEGURA = `('nao_aplicavel', 'material_recebido', 'em_producao')`
const SQL_VISAO: Record<OrderViewId, string> = {
  tudo: 'true',
  'precisa-acao': `(o.material_status = 'aguardando_material' or (o.status = 'paid' and (o.material_status is null or o.material_status in ${NAO_SEGURA})) or (o.status = 'shipped' and o.tracking_code is null))`,
  'fila-material': `o.material_status in ('aguardando_material', 'material_enviado', 'material_recebido', 'em_producao')`,
  'a-separar': `o.status in ('paid', 'separating')`,
  'em-transito': `o.status = 'shipped'`,
  concluidos: `o.status in ('delivered', 'cancelled')`,
}
const SQL_BLOCO: Record<QueueBlockId, string> = {
  aguardando: `o.material_status = 'aguardando_material'`,
  'a-separar': `o.status = 'paid' and o.material_status in ${NAO_SEGURA}`,
  'sem-rastreio': `o.status = 'shipped' and o.tracking_code is null`,
  'pix-aguardando': `o.payment_method = 'pix' and o.payment_status = 'pending'`,
}
const FILA_CHAVE: Record<QueueBlockId, string> = {
  aguardando: 'aguardando',
  'a-separar': 'a_separar',
  'sem-rastreio': 'sem_rastreio',
  'pix-aguardando': 'pix_aguardando',
}
const sqlBusca = (termo: string): string => {
  const t = stripOrderNumberPrefix(termo.trim()).replace(/'/g, "''")
  return `(${['order_number', 'customer_name', 'customer_email', 'tracking_code', 'material_tracking_code']
    .map(c => `o.${c} ilike '%${t}%'`)
    .join(' or ')})`
}

// --- O cliente real, logado como a admin do seed ---------------------------------------------
const supabase = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

/** A cadeia do Design §3.3 — a que `useListaDePedidos` monta (a T14 prova a do hook). */
const appLista = async (
  slice: OrderSlice,
  termo: string,
  { limite, cursor, contar }: { limite: number; cursor?: OrderCursor; contar: boolean },
) => {
  let q = supabase.from('order_list').select(COLUNAS_DA_LISTA, contar ? { count: 'exact' } : undefined)
  q = applyOrderSlice(q, slice)
  const busca = buildOrderSearchCondition(termo)
  if (busca) q = q.or(busca)
  const dir = sliceOrder(slice)
  if (cursor) q = q.or(cursorFilter(cursor, dir))
  const { data, error, count } = await q
    .order('created_at', { ascending: dir === 'asc' })
    .order('id', { ascending: dir === 'asc' })
    .limit(limite)
  if (error) throw new Error(`lista: ${error.message}`)
  return { linhas: (data ?? []) as unknown as Record<string, unknown>[], count }
}

/** O painel: `order_list` com o predicado aplicado como `applyView` sempre fez (or antes dos in). */
const painelLista = async (visao: OrderViewId, termo: string) => {
  let q = supabase.from('order_list').select('id')
  const p = viewPredicate(visao)
  if (p?.or) q = q.or(p.or)
  for (const [c, v] of Object.entries(p?.in ?? {})) q = q.in(c, v)
  const busca = buildOrderSearchCondition(termo)
  if (busca) q = q.or(busca)
  const { data, error } = await q.limit(1000)
  if (error) throw new Error(`painel: ${error.message}`)
  return (data ?? []).map(r => r.id as string)
}

const ids = (linhas: Record<string, unknown>[]) => linhas.map(l => l.id as string)

const main = async () => {
  const { error: loginErr } = await supabase.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
  if (loginErr) throw new Error(`login: ${loginErr.message}`)

  // 1. Seis visões.
  for (const { id: visao } of ORDER_VIEWS) {
    const app = await appLista({ visao }, '', { limite: 1000, contar: true })
    const painel = await painelLista(visao, '')
    const ref = sqlIds(SQL_VISAO[visao])
    ok(iguais(ids(app.linhas), ref) && iguais(painel, ref), `visão ${visao}: app = painel = SQL (${ref.length})`)
    ok(app.count === ref.length, `visão ${visao}: count exact = SQL (${app.count})`)
  }

  // 2. Quatro blocos — e a contagem da Início no mesmo instante.
  const { data: resumo, error: resumoErr } = await supabase.rpc('store_overview')
  if (resumoErr) throw new Error(`store_overview: ${resumoErr.message}`)
  const fila = (resumo as { fila: Record<string, number> }).fila
  for (const bloco of QUEUE_BLOCKS) {
    const app = await appLista({ bloco: bloco.id }, '', { limite: 1000, contar: true })
    const ref = sqlIds(SQL_BLOCO[bloco.id])
    const tile = await supabase.from('orders').select('id', { count: 'exact', head: true }).or(toPostgrestFilter(bloco.rule))
    ok(iguais(ids(app.linhas), ref), `bloco ${bloco.id}: lista do app = SQL (${ref.length})`)
    ok(ref.length > 0, `bloco ${bloco.id}: povoado (não é igualdade sobre o nada)`)
    ok(
      app.count === ref.length && fila[FILA_CHAVE[bloco.id]] === ref.length && tile.count === ref.length,
      `bloco ${bloco.id}: contagem do app = store_overview.fila = tile do painel = SQL`,
      { app: app.count, fila: fila[FILA_CHAVE[bloco.id]], tile: tile.count, sql: ref.length },
    )
  }
  const precisa = await appLista({ visao: 'precisa-acao' }, '', { limite: 1000, contar: true })
  ok(precisa.count === fila.precisa_acao, `"Precisa de ação" da lista = store_overview.fila.precisa_acao (${fila.precisa_acao})`)
  ok(ids(precisa.linhas).includes('00000000-0000-4000-c074-00000000000a'), 'o pago a separar está em "Precisa de ação"')
  ok(!ids(precisa.linhas).includes('00000000-0000-4000-c074-00000000000b'), 'R2: o Pix pendente cancelado NÃO está em "Precisa de ação"')
  const pix = await appLista({ bloco: 'pix-aguardando' }, '', { limite: 1000, contar: true })
  ok(ids(pix.linhas).includes('00000000-0000-4000-c074-00000000000b'), 'R2: o Pix pendente com status cancelled está no bloco Pix aguardando')

  // 3. A busca.
  for (const termo of ['#0244', '0244', '244']) {
    const app = await appLista({ visao: 'tudo' }, termo, { limite: 1000, contar: true })
    const painel = await painelLista('tudo', termo)
    const ref = sqlIds(sqlBusca(termo))
    ok(iguais(ids(app.linhas), ref) && iguais(painel, ref) && ref.length > 0, `busca "${termo}": app = painel = SQL (${ref.length})`)
  }
  ok(sqlIds(sqlBusca('0244')).length === 1 && sqlIds(sqlBusca('244')).length === 2, '"0244" acha 1, "244" acha 2 (a busca não é um "tudo")')
  ok(ORDER_SEARCH_COLUMNS.length === 5, 'o oráculo cobre as 5 colunas da busca')

  // 4. Os três `or=` juntos.
  {
    const slice: OrderSlice = { visao: 'precisa-acao' }
    const primeira = await appLista(slice, 'Probe74', { limite: 1, contar: true })
    const c = primeira.linhas[0] as unknown as OrderCursor
    const resto = await appLista(slice, 'Probe74', { limite: 1000, cursor: { created_at: c.created_at, id: c.id }, contar: false })
    const ref = sqlIds(
      `${SQL_VISAO['precisa-acao']} and ${sqlBusca('Probe74')} and (o.created_at, o.id) > ('${c.created_at}'::timestamptz, '${c.id}'::uuid)`,
    )
    ok(iguais(ids(resto.linhas), ref) && ref.length > 0, `três or= (visão aninhada + busca + cursor) = SQL (${ref.length})`, { app: ids(resto.linhas), ref })
    ok(primeira.count === sqlIds(`${SQL_VISAO['precisa-acao']} and ${sqlBusca('Probe74')}`).length, 'visão + busca: count exact = SQL')
  }

  // 5. Paginação de 25 com insert no meio ("Tudo", desc).
  {
    const slice: OrderSlice = { visao: 'tudo' }
    const totalAntes = sqlIds('true')
    ok(totalAntes.length >= 60, `"Tudo" tem ao menos 60 pedidos (${totalAntes.length})`)
    const p1 = await appLista(slice, '', { limite: 25, contar: true })
    // Entra um MAIS NOVO que todos (antes do cursor em desc: não pode aparecer) e um MAIS ANTIGO
    // que todos (depois do cursor: tem de aparecer uma vez).
    psql(`insert into public.orders (id, order_number, customer_name, customer_email, payment_method, subtotal, total, status, payment_status, created_at) values
      ('00000000-0000-4000-c074-0000000000f1', 'PRB74-X', 'Probe74 Novo', 'p74x@exemplo.invalid', 'pix', 1, 1, 'delivered', 'approved', '2031-01-01T00:00:00Z'),
      ('00000000-0000-4000-c074-0000000000f2', 'PRB74-Y', 'Probe74 Velho', 'p74y@exemplo.invalid', 'pix', 1, 1, 'delivered', 'approved', '2000-01-01T00:00:00Z')`)
    const todas = [...p1.linhas]
    let ultima = p1.linhas
    while (ultima.length === 25) {
      const u = ultima[ultima.length - 1] as unknown as OrderCursor
      ultima = (await appLista(slice, '', { limite: 25, cursor: { created_at: u.created_at, id: u.id }, contar: false })).linhas
      todas.push(...ultima)
    }
    const vistos = ids(todas)
    ok(new Set(vistos).size === vistos.length, `paginação: nenhum pedido repetido (${vistos.length} linhas)`)
    ok(iguais(vistos.filter(i => i !== '00000000-0000-4000-c074-0000000000f2'), totalAntes), 'paginação: nenhum pedido do início pulado')
    ok(!vistos.includes('00000000-0000-4000-c074-0000000000f1'), 'o que entrou antes do cursor não aparece no meio')
    ok(vistos.filter(i => i === '00000000-0000-4000-c074-0000000000f2').length === 1, 'o que entrou depois do cursor aparece uma vez')
  }

  // 6. R1 — microssegundos.
  {
    const seq = async (paraCursor: (l: Record<string, unknown>) => OrderCursor) => {
      const s: OrderSlice = { visao: 'tudo' }
      const out: Record<string, unknown>[] = []
      let cur: OrderCursor | undefined
      for (let i = 0; i < 8; i++) {
        const { linhas } = await appLista(s, 'Mesmo Segundo', { limite: 1, cursor: cur, contar: false })
        if (linhas.length === 0) break
        out.push(linhas[0])
        cur = paraCursor(linhas[0])
      }
      return ids(out)
    }
    const ref = psql(
      `select string_agg(id::text, ',' order by created_at desc, id desc) from public.orders where customer_name = 'Probe74 Mesmo Segundo'`,
    ).split(',')
    const cru = await seq(l => ({ created_at: l.created_at as string, id: l.id as string }))
    ok(cru.join() === ref.join(), 'R1: com a string do servidor, 4 pedidos no mesmo segundo saem de 1 em 1, na ordem, sem pular nem repetir', { cru, ref })
    const e1 = (await appLista({ visao: 'tudo' }, 'PRB74-E1', { limite: 1, contar: false })).linhas[0]
    ok(/\.\d{6}/.test(e1.created_at as string), `R1: o PostgREST devolve microssegundos (${e1.created_at as string})`)
    const truncado = await seq(l => ({ created_at: new Date(l.created_at as string).toISOString(), id: l.id as string }))
    ok(truncado.join() !== ref.join(), 'SENSOR R1: o cursor passado por Date (ms) pula ou repete', { truncado })
  }

  // 7. As chaves da resposta (`AD-012`).
  {
    const chaves = (s: string) => s.split(',').map(c => c.trim()).sort()
    const { linhas } = await appLista({ visao: 'tudo' }, '0244', { limite: 1, contar: false })
    ok(Object.keys(linhas[0]).sort().join() === chaves(COLUNAS_DA_LISTA).join(), 'a linha tem exatamente as chaves de COLUNAS_DA_LISTA')
    const C = '00000000-0000-4000-c074-00000000000c'
    const det = await supabase.from('order_list').select(COLUNAS_DO_DETALHE).eq('id', C).maybeSingle()
    ok(!det.error && Object.keys(det.data ?? {}).sort().join() === chaves(COLUNAS_DO_DETALHE).join(), 'o pedido do detalhe tem exatamente as chaves de COLUNAS_DO_DETALHE', det.error)
    for (const [tabela, colunas] of [
      ['order_items', COLUNAS_DOS_ITENS],
      ['order_status_history', COLUNAS_DO_STATUS],
      ['order_notes', COLUNAS_DAS_NOTAS],
      ['order_notifications', COLUNAS_DAS_NOTIFICACOES],
    ] as const) {
      const r = await supabase.from(tabela).select(colunas).eq('order_id', C)
      ok(!r.error && r.data?.length === 1 && Object.keys(r.data[0]).sort().join() === chaves(colunas).join(), `${tabela}: exatamente as chaves pedidas`, r.error)
    }
    const naoExiste = await supabase.from('order_list').select(COLUNAS_DO_DETALHE).eq('id', '00000000-0000-4000-c074-ffffffffffff').maybeSingle()
    ok(!naoExiste.error && naoExiste.data === null, 'pedido inexistente: maybeSingle devolve null, sem erro')
  }

  console.log(falhas === 0 ? 'TUDO OK' : `${falhas} FALHA(S)`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch(e => {
  console.error(e)
  process.exit(2)
})
