// Feature 76 · T30 — o probe de paridade do app (supabase-js REAL contra o banco LOCAL). Rodado por
// `03-paridade.sh`, em duas fases (FASE=real | fixturas). Prova o que os Success Criteria 2, 3 e 4 pedem:
//
//  P1  as janelas somadas da lista (cursor, 25 por vez) têm TODOS os `id` de `customer_list`, sem repetir,
//      em cada um dos três recortes; a ordem é a de `last_activity_at desc nulls last, id asc`.
//  P2  a contagem de cada chip (a da API) = `select count(*) from customer_list where <predicado>` (psql,
//      independente do PostgREST); fase real: 48 · 3 · 18.
//  P3  o selo "Em aberto" (linhas com orders_open >= 1) = as linhas do chip.
//  P4  para TODA pessoa do banco, o total de pedidos lidos pela cadeia da ficha (customerOrdersCondition,
//      20 por vez, cursor) = `orders_total` de customer_list — a convidada e VROSA_RJ/VROSAXRJ inclusos.
//  P5  uma conta SEM papel admin, com pedido próprio, lê as mesmas cadeias SEM erro (a linha dela vem) e
//      `atelie_clock` a recusa com 42501: o vazamento falso-plausível que `lerComPapel` fecha.
//
// As cadeias são as dos hooks do app, montadas com as MESMAS funções de `@estrelinha/core/customers`
// (nenhum filtro escrito aqui). Os mutantes do fecho (link.ts sem escape; cursor.ts sem o ramo dos nulos)
// são aplicados nos arquivos reais de `core`: ver `03-paridade.mutantes.txt`.
import { execSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

import {
  CUSTOMER_ORDERS_PAGE_SIZE,
  CUSTOMER_PAGE_SIZE,
  CUSTOMER_SLICES,
  applyCustomerSlice,
  customerCursorFilter,
  customerOrdersCondition,
  directoryEmailCondition,
  type CustomerSliceId,
} from '../../../../packages/core/src/customers/index.ts'
import { cursorFilter } from '../../../../packages/core/src/orders/list.ts'
import { COLUNAS_DA_FICHA, COLUNAS_DA_LISTA, COLUNAS_DO_PEDIDO } from '../../../../apps/mobile-adm/src/entities/customer/model/linha.ts'

const URL = 'http://127.0.0.1:54441'
const KEY = process.env.APIKEY ?? ''
const FASE = process.env.FASE ?? 'real'
const DB = 'postgresql://postgres:postgres@127.0.0.1:54442/postgres'

let falhas = 0
const ok = (cond: boolean, oque: string, detalhe?: unknown) => {
  if (cond) console.log(`ok — ${oque}`)
  else {
    falhas++
    console.log(`FALHOU — ${oque}${detalhe === undefined ? '' : ` :: ${JSON.stringify(detalhe)}`}`)
  }
}
const nota = (t: string) => console.log(`   · ${t}`)
const psql = (sql: string) => execSync(`psql "${DB}" -At -c "${sql}"`, { encoding: 'utf8' }).trim()

/** O predicado de cada chip, escrito em SQL por extenso (independente de `core`). */
const PREDICADO: Record<CustomerSliceId, string> = {
  todas: 'true',
  recorrentes: 'orders_paid >= 2',
  'em-aberto': 'orders_open >= 1',
}

const novo = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })

type Linha = { id: string; email: string; orders_open: number; last_activity_at: string | null }

/** A janela inteira da lista, página a página, pela cadeia de `useListaDeClientes`. */
const andarALista = async (db: ReturnType<typeof novo>, slice: CustomerSliceId) => {
  const vistos: Linha[] = []
  let cursor: { last_activity_at: string | null; id: string } | null = null
  let total: number | null = null
  for (let i = 0; i < 400; i++) {
    let q = i === 0
      ? db.from('customer_list').select(COLUNAS_DA_LISTA, { count: 'exact' })
      : db.from('customer_list').select(COLUNAS_DA_LISTA)
    q = applyCustomerSlice(q, slice)
    if (cursor) q = q.or(customerCursorFilter(cursor))
    const r = await q
      .order('last_activity_at', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .limit(CUSTOMER_PAGE_SIZE)
    if (r.error) throw new Error(JSON.stringify(r.error))
    if (i === 0) total = r.count
    vistos.push(...(r.data as unknown as Linha[]))
    if (r.data.length < CUSTOMER_PAGE_SIZE) break
    const ultima = r.data[r.data.length - 1] as unknown as Linha
    cursor = { last_activity_at: ultima.last_activity_at, id: ultima.id }
  }
  return { vistos, total }
}

/** Os pedidos de uma pessoa, pela cadeia de `usePedidosDoCliente`, 20 por vez. */
const andarOsPedidos = async (db: ReturnType<typeof novo>, id: string, email: string) => {
  const ids: string[] = []
  let cursor: { created_at: string; id: string } | null = null
  for (let i = 0; i < 100; i++) {
    let q = db.from('order_list').select(COLUNAS_DO_PEDIDO).or(customerOrdersCondition(id, email))
    if (cursor) q = q.or(cursorFilter(cursor, 'desc'))
    const r = await q.order('created_at', { ascending: false }).order('id', { ascending: false }).limit(CUSTOMER_ORDERS_PAGE_SIZE)
    if (r.error) throw new Error(JSON.stringify(r.error))
    ids.push(...r.data.map((x: { id: string }) => x.id))
    if (r.data.length < CUSTOMER_ORDERS_PAGE_SIZE) break
    const u = r.data[r.data.length - 1] as unknown as { created_at: string; id: string }
    cursor = { created_at: u.created_at, id: u.id }
  }
  return ids
}

const main = async () => {
  console.log(`# FASE ${FASE}`)
  const admin = novo()
  const e = await admin.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
  ok(!e.error, 'a admin do seed entra', e.error?.message)

  // ============================== P1, P2, P3 — a lista e os chips ==============================
  const esperados: Record<string, number> = {}
  for (const { id: slice } of CUSTOMER_SLICES) {
    const sql = PREDICADO[slice]
    const n = Number(psql(`select count(*) from public.customer_list where ${sql}`))
    esperados[slice] = n
    const idsSql = psql(`select id from public.customer_list where ${sql} order by id`).split('\n').filter(Boolean)
    const { vistos, total } = await andarALista(admin, slice)
    const idsApp = vistos.map((v) => v.id)
    ok(new Set(idsApp).size === idsApp.length, `P1 [${slice}] as janelas somadas não repetem ninguém (${idsApp.length} linhas)`)
    ok(JSON.stringify([...idsApp].sort()) === JSON.stringify(idsSql), `P1 [${slice}] os ${n} \`id\` distintos cobrem customer_list inteira (psql)`, { app: idsApp.length, sql: idsSql.length })
    ok(total === n, `P2 [${slice}] a contagem do chip (API, count exact) = psql count(*) where ${sql}`, { api: total, sql: n })
    // a ordem: last_activity_at desc nulls last, id asc
    const ord = [...vistos].sort((a, b) => {
      if (a.last_activity_at === b.last_activity_at) return a.id < b.id ? -1 : 1
      if (a.last_activity_at === null) return 1
      if (b.last_activity_at === null) return -1
      return a.last_activity_at < b.last_activity_at ? 1 : -1
    })
    ok(JSON.stringify(ord.map((v) => v.id)) === JSON.stringify(idsApp), `P1 [${slice}] a ordem é last_activity_at desc nulls last, id asc`)
    if (slice === 'todas') {
      const abertas = vistos.filter((v) => v.orders_open >= 1).length
      nota(`linhas da lista com orders_open >= 1: ${abertas}`)
      ok(abertas === Number(psql('select count(*) from public.customer_list where orders_open >= 1')), 'P3 o selo "Em aberto" (orders_open >= 1 nas linhas lidas) = o chip "Com pedido em aberto" (psql)', { abertas })
    }
  }
  if (FASE === 'real') {
    ok(esperados.todas === 48, 'fase real: todas = 48', esperados)
    ok(esperados.recorrentes === 3, 'fase real: recorrentes = 3', esperados)
    ok(esperados['em-aberto'] === 18, 'fase real: em aberto = 18', esperados)
  }

  // ============================== P4 — a ficha soma os pedidos ==============================
  const pessoas = await admin.from('customer_list').select(COLUNAS_DA_FICHA).order('id', { ascending: true }).limit(1000)
  if (pessoas.error) throw new Error(JSON.stringify(pessoas.error))
  const divergentes: unknown[] = []
  let semEmail = 0
  let total = 0
  for (const p of pessoas.data as unknown as { id: string; email: string; orders_total: number }[]) {
    total++
    if (!p.email) {
      semEmail++
      if (p.orders_total !== 0) divergentes.push({ id: p.id, orders_total: p.orders_total, lidos: 'sem e-mail' })
      continue
    }
    const lidos = await andarOsPedidos(admin, p.id, p.email)
    if (lidos.length !== p.orders_total || new Set(lidos).size !== lidos.length) divergentes.push({ id: p.id, email: p.email, orders_total: p.orders_total, lidos: lidos.length })
  }
  ok(divergentes.length === 0, `P4 para TODA pessoa (${total}, ${semEmail} sem e-mail) o total lido pela cadeia da ficha = orders_total`, divergentes)

  if (FASE === 'fixturas') {
    const idPorEmail = (email: string) => psql(`select id from public.customer_list where lower(email) = lower('${email}')`)
    const um = idPorEmail('P76VROSA_RJ@exemplo.invalid')
    const dois = idPorEmail('P76VROSAXRJ@exemplo.invalid')
    const lidosUm = await andarOsPedidos(admin, um, 'P76VROSA_RJ@exemplo.invalid')
    const lidosDois = await andarOsPedidos(admin, dois, 'P76VROSAXRJ@exemplo.invalid')
    ok(lidosUm.length === 1 && lidosDois.length === 1 && lidosUm[0] !== lidosDois[0], 'P4 VROSA_RJ e VROSAXRJ: um pedido cada, nenhum puxa o do vizinho (o vínculo é exato)', { lidosUm, lidosDois })
    const convidada = idPorEmail('p76-cur-a@exemplo.invalid')
    const lidosConv = await andarOsPedidos(admin, convidada, 'p76-cur-a@exemplo.invalid')
    ok(lidosConv.length === 1, 'P4 a convidada (sem customers): o pedido dela vem pelo e-mail', lidosConv)
    const ver = await admin.from('customer_directory').select('id').or(directoryEmailCondition('P76MARIA@exemplo.invalid')).limit(1)
    ok(!ver.error && ver.data?.length === 1, '"Ver cliente": o e-mail exato, sem caixa, acha a pessoa', ver.error ?? ver.data)

    // ============================== P5 — a conta sem papel ==============================
    const cli = novo()
    const s = await cli.auth.signInWithPassword({ email: 'probe76-cliente@exemplo.invalid', password: 'probe76senha' })
    ok(!s.error, 'P5 a conta sem papel entra com senha', s.error?.message)
    const proprio = psql(`select id from public.customers where email = 'probe76-cliente@exemplo.invalid'`)
    const dela = await cli.from('order_list').select(COLUNAS_DO_PEDIDO).or(customerOrdersCondition(proprio, 'probe76-cliente@exemplo.invalid'))
    ok(!dela.error && dela.data?.length === 1, 'P5 sem papel, a cadeia dos pedidos responde SEM erro e traz o pedido DELA (a RLS filtra, não recusa)', dela.error ?? dela.data)
    const lista = await cli.from('customer_list').select(COLUNAS_DA_LISTA)
    ok(!lista.error, 'P5 sem papel, customer_list responde sem erro', lista.error)
    nota(`sem papel, customer_list devolve ${lista.data?.length ?? 'erro'} linha(s) — a RLS decide; a recusa é da RPC`)
    const todasAsDeLoja = await cli.from('order_list').select('id', { count: 'exact', head: true })
    ok((todasAsDeLoja.count ?? 0) === 1, 'P5 sem papel, order_list inteira = só o pedido dela (nenhum da loja)', todasAsDeLoja.count)
    const relogio = await cli.rpc('atelie_clock')
    ok(relogio.data === null && relogio.error?.code === '42501', 'P5 sem papel: atelie_clock recusa com 42501 — é a recusa que fecha o dado falso-plausível', relogio.error)
    const r = await admin.rpc('atelie_clock')
    ok(!r.error && typeof (r.data as { lido_em?: string })?.lido_em === 'string', 'controle: a admin recebe lido_em', r.error)
  }

  console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`)
  process.exit(falhas === 0 ? 0 : 1)
}
main().catch((err) => {
  console.error('ERRO', err)
  process.exit(2)
})
