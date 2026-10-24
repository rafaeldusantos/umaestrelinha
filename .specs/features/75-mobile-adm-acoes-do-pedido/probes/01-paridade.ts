// Feature 75 · T29 — a paridade app × painel contra o banco LOCAL (Success Criteria 1 e 2, `MAA-02`,
// `MAA-08`, `MAA-13`, `MAA-14`, `MAA-23`, `MAA-38`, `AD-012`, `L-059`). Rodado por `01-paridade.sh`.
//
// O supabase-js REAL contra o PostgREST, o Postgres e a `send-notification` locais. Cada caso nasce
// DUAS vezes em `01-fixturas.sql` (`P75-<caso>A` e `P75-<caso>P`, colunas idênticas):
//   - o lado A é tratado por `runAppAction` com as deps que a porta do app monta (`gravarAcao.ts`);
//   - o lado P é tratado pelo EQUIVALENTE do painel: `writeOrderStatus` / `writeTrackingCode` /
//     `writeMaterialStatus` com as entradas que `useAdminOrders` passa hoje (`from` sem guarda, a
//     transportadora do campo em branco como `''`, `avisar` no padrão).
// e os dois terminam com as MESMAS colunas de `orders` (menos `id`, `order_number`, `customer_*` da
// fixtura, `shipping_carrier` — A9 — e `updated_at`; colunas `*_at` comparadas por presença), as mesmas
// linhas de `order_status_history` (sem id e tempo) e os mesmos eventos em `order_notifications`.
//
// **A paridade do rastreio é medida com o código JÁ normalizado** (A8: o app normaliza e valida, o
// painel grava o que recebe). Por isso há dois casos a mais: o 09, em que o app recebe o código cru
// com espaços e minúsculas e o painel o normalizado, e os dois gravam o mesmo; e o 10, em que o painel
// recebe um código curto e cru e o grava como veio, enquanto o app o recusa sem ir à rede — a
// DIFERENÇA ESPERADA, registrada como tal e não como falha.
//
// A notificadora dos dois lados é `triggerOrderNotification` com o client da admin — a mesma que o
// `notifyOrder` do painel e a porta do app chamam. A `send-notification` local roda com uma chave do
// Resend INVÁLIDA de propósito: o evento é reivindicado em `order_notifications` antes do envio, e o
// envio falha sem nada sair.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import {
  runAppAction,
  triggerOrderNotification,
  writeMaterialStatus,
  writeOrderStatus,
  writeTrackingCode,
  type OrderWriteDeps,
  type PedidoDaAcao,
} from '../../../../packages/core/src/order-actions/index.ts'

const URL = 'http://127.0.0.1:54441'
const KEY = process.env.APIKEY ?? ''
const id = (caso: string, lado: 'a' | 'b') => `00000000-0000-4000-c075-0000000${caso}0${lado}0`
const CLI = '00000000-0000-4000-c075-0000000990c0'

let falhas = 0
const ok = (cond: boolean, oque: string, detalhe?: unknown) => {
  if (cond) console.log(`ok — ${oque}`)
  else {
    falhas++
    console.log(`FALHOU — ${oque}${detalhe === undefined ? '' : ` :: ${JSON.stringify(detalhe)}`}`)
  }
}

const novo = () => createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const depsDe = (client: SupabaseClient): OrderWriteDeps => ({
  client,
  notify: (orderId, trigger) => triggerOrderNotification(client, orderId, trigger),
})

const LINHA = 'id, status, material_status, tracking_code, payment_method, shipping_service_id'
const FORA = new Set(['id', 'order_number', 'customer_name', 'customer_email', 'shipping_carrier', 'updated_at', 'created_at'])

/** O que se compara de um pedido: as colunas fora de `FORA`, com `*_at` reduzido a "tem/não tem". */
const estado = async (db: SupabaseClient, orderId: string) => {
  const { data: pedido } = await db.from('orders').select('*').eq('id', orderId).single()
  const colunas: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(pedido ?? {})) {
    if (FORA.has(k)) continue
    colunas[k] = k.endsWith('_at') ? (v === null ? null : 'preenchido') : v
  }
  const { data: hist } = await db
    .from('order_status_history')
    .select('from_status, to_status, note, created_by')
    .eq('order_id', orderId)
    .order('created_at')
  const { data: notif } = await db.from('order_notifications').select('event, channel').eq('order_id', orderId)
  const eventos = (notif ?? []).map((n) => `${n.event}/${n.channel}`).sort()
  return { colunas, historico: hist ?? [], eventos, shipping_carrier: pedido?.shipping_carrier ?? null }
}

const linha = async (db: SupabaseClient, orderId: string) => {
  const { data } = await db.from('orders').select(LINHA).eq('id', orderId).single()
  return data as { id: string; status: string; material_status: string; tracking_code: string | null; payment_method: string; shipping_service_id: string | null }
}

/** Compara os dois lados de um caso e imprime uma linha por aspecto. */
const comparar = async (db: SupabaseClient, caso: string, nome: string) => {
  const a = await estado(db, id(caso, 'a'))
  const p = await estado(db, id(caso, 'b'))
  ok(JSON.stringify(a.colunas) === JSON.stringify(p.colunas), `${caso} ${nome}: as mesmas colunas de orders`, { app: a.colunas, painel: p.colunas })
  ok(JSON.stringify(a.historico) === JSON.stringify(p.historico), `${caso} ${nome}: o mesmo histórico (${a.historico.length} linha(s))`, { app: a.historico, painel: p.historico })
  ok(JSON.stringify(a.eventos) === JSON.stringify(p.eventos), `${caso} ${nome}: os mesmos eventos [${a.eventos.join(', ')}]`, { app: a.eventos, painel: p.eventos })
  return { a, p }
}

const app = async (deps: OrderWriteDeps, db: SupabaseClient, caso: string, pedido: PedidoDaAcao) => {
  const r = await runAppAction(deps, await linha(db, id(caso, 'a')), pedido)
  ok(r.tipo === 'ok', `${caso} app: runAppAction devolve ok`, r)
  return r
}
const painel = (caso: string, r: { tipo: string }) => ok(r.tipo === 'ok', `${caso} painel: a escrita devolve ok`, r)

const main = async () => {
  const admin = novo()
  const entrou = await admin.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
  ok(!entrou.error, 'a admin do seed entra', entrou.error?.message)
  const deps = depsDe(admin)

  // R7: a send-notification viva ANTES de qualquer escrita.
  const viva = await fetch(`${URL}/functions/v1/send-notification?action=trigger`, { method: 'POST', body: '{}' })
  ok(viva.status === 401, `send-notification viva (sem auth responde ${viva.status}, esperado 401)`)

  // 01 — "Recebi o material"
  await app(deps, admin, '01', { tipo: 'primaria' })
  painel('01', await writeMaterialStatus(deps, { id: id('01', 'b'), to: 'material_recebido' }))
  await comparar(admin, '01', 'recebi o material')

  // 02 — "Iniciar separação" sem material
  await app(deps, admin, '02', { tipo: 'primaria' })
  painel('02', await writeOrderStatus(deps, { id: id('02', 'b'), to: 'separating', from: 'paid' }))
  await comparar(admin, '02', 'separar sem material')

  // 02-guarda — a linha VELHA (a tela ainda mostra `paid`, o banco já está em `separating`): a guarda
  // de status (`expectedFrom`) filtra o update ⇒ `nenhuma-linha`, e nada mais é gravado (A3, `MAA-21`).
  const antesGuarda = await estado(admin, id('02', 'a'))
  const velha = { ...(await linha(admin, id('02', 'a'))), status: 'paid' }
  const rGuarda = await runAppAction(deps, velha, { tipo: 'primaria' })
  ok(rGuarda.tipo === 'nenhuma-linha', `02 guarda: a linha velha ⇒ ${rGuarda.tipo} (o pedido mudou)`, rGuarda)
  ok(JSON.stringify(antesGuarda) === JSON.stringify(await estado(admin, id('02', 'a'))), '02 guarda: nem status, nem histórico, nem evento novos')

  // 03 — "Iniciar separação" com o material recebido = em_producao + separating
  await app(deps, admin, '03', { tipo: 'primaria' })
  painel('03', await writeMaterialStatus(deps, { id: id('03', 'b'), to: 'em_producao' }))
  painel('03', await writeOrderStatus(deps, { id: id('03', 'b'), to: 'separating', from: 'paid' }))
  await comparar(admin, '03', 'separar com material')

  // 04 — "Marcar como enviado" com código (já normalizado)
  await app(deps, admin, '04', { tipo: 'rastreio', codigo: 'AN123456789BR', origem: 'acao' })
  painel('04', await writeTrackingCode(deps, { id: id('04', 'b'), code: 'AN123456789BR', carrier: '' }))
  painel('04', await writeOrderStatus(deps, { id: id('04', 'b'), to: 'shipped', from: 'separating' }))
  await comparar(admin, '04', 'enviar com código')

  // 05 — salvar rastreio de shipped sem código
  await app(deps, admin, '05', { tipo: 'rastreio', codigo: 'AN555555555BR', origem: 'acao' })
  painel('05', await writeTrackingCode(deps, { id: id('05', 'b'), code: 'AN555555555BR', carrier: '' }))
  await comparar(admin, '05', 'salvar rastreio de shipped')

  // 06 — salvar e DEPOIS alterar o rastreio de shipped: "Alterar" não gera segundo order_shipped
  await app(deps, admin, '06', { tipo: 'rastreio', codigo: 'AN666666666BR', origem: 'acao' })
  painel('06', await writeTrackingCode(deps, { id: id('06', 'b'), code: 'AN666666666BR', carrier: '' }))
  await app(deps, admin, '06', { tipo: 'rastreio', codigo: 'AN777777777BR', origem: 'entrega' })
  painel('06', await writeTrackingCode(deps, { id: id('06', 'b'), code: 'AN777777777BR', carrier: '' }))
  const seis = await comparar(admin, '06', 'salvar e alterar rastreio de shipped')
  for (const [lado, e] of [['app', seis.a], ['painel', seis.p]] as const) {
    ok(e.eventos.filter((x) => x.startsWith('order_shipped/')).length === 1, `06 ${lado}: "Alterar" não gera um segundo order_shipped`, e.eventos)
    ok(e.colunas.tracking_code === 'AN777777777BR', `06 ${lado}: o código alterado ficou`, e.colunas.tracking_code)
  }

  // 07 — informar o rastreio de delivered
  await app(deps, admin, '07', { tipo: 'rastreio', codigo: 'AN888888888BR', origem: 'entrega' })
  painel('07', await writeTrackingCode(deps, { id: id('07', 'b'), code: 'AN888888888BR', carrier: '' }))
  await comparar(admin, '07', 'informar rastreio de delivered')

  // 08 — retirada: separating → delivered
  await app(deps, admin, '08', { tipo: 'primaria' })
  painel('08', await writeOrderStatus(deps, { id: id('08', 'b'), to: 'delivered', from: 'separating' }))
  await comparar(admin, '08', 'marcar como retirado')

  // 09 — o PAR da normalização (A8): app com o código cru, painel com o normalizado ⇒ o mesmo código
  await app(deps, admin, '09', { tipo: 'rastreio', codigo: ' an 123 456 789 br ', origem: 'acao' })
  painel('09', await writeTrackingCode(deps, { id: id('09', 'b'), code: 'AN123456789BR', carrier: '' }))
  painel('09', await writeOrderStatus(deps, { id: id('09', 'b'), to: 'shipped', from: 'separating' }))
  const nove = await comparar(admin, '09', 'normalização: app cru × painel normalizado')
  ok(nove.a.colunas.tracking_code === 'AN123456789BR', '09 app: gravou o código aparado e em maiúsculas', nove.a.colunas.tracking_code)

  // 10 — a DIFERENÇA ESPERADA (A8): o painel grava o curto cru; o app recusa sem ir à rede
  const antes10 = await estado(admin, id('10', 'a'))
  const r10 = await runAppAction(deps, await linha(admin, id('10', 'a')), { tipo: 'rastreio', codigo: ' an 123 ', origem: 'acao' })
  ok(r10.tipo === 'falhou', '10 app: o código curto é recusado (falhou, sem rede)', r10)
  const depois10 = await estado(admin, id('10', 'a'))
  ok(JSON.stringify(antes10) === JSON.stringify(depois10), '10 app: o pedido ficou intacto')
  painel('10', await writeTrackingCode(deps, { id: id('10', 'b'), code: ' an 123 ', carrier: '' }))
  const p10 = await estado(admin, id('10', 'b'))
  ok(p10.colunas.tracking_code === ' an 123 ', `10 DIFERENÇA ESPERADA (A8): o painel grava o código como veio (${JSON.stringify(p10.colunas.tracking_code)}), o app não grava`)

  // A9: o app nunca escreve shipping_carrier; o painel grava a string do campo
  const c04 = await estado(admin, id('04', 'a'))
  ok(c04.shipping_carrier === null, '04 app: shipping_carrier intocada (null, A9)', c04.shipping_carrier)

  // Success Criterion 2 — a conta SEM papel, com um pedido PRÓPRIO
  const cli = novo()
  const e2 = await cli.auth.signInWithPassword({ email: 'probe75-cliente@exemplo.invalid', password: 'probe75senha' })
  ok(!e2.error, 'a conta sem papel entra com senha', e2.error?.message)
  const depsCli = depsDe(cli)
  const antesLoja = await estado(admin, id('11', 'a'))
  const antesDela = await estado(admin, CLI)
  const rLoja = await runAppAction(depsCli, await linha(admin, id('11', 'a')), { tipo: 'primaria' })
  ok(rLoja.tipo === 'nenhuma-linha', `sem papel: o pedido da loja ⇒ ${rLoja.tipo} (a RLS filtra o update)`, rLoja)
  const rDela = await runAppAction(depsCli, await linha(admin, CLI), { tipo: 'primaria' })
  ok(rDela.tipo === 'nenhuma-linha', `sem papel: o pedido DELA ⇒ ${rDela.tipo}`, rDela)
  const rMat = await writeMaterialStatus(depsCli, { id: id('11', 'a'), to: 'material_recebido' })
  ok(rMat.tipo === 'sem-papel', `sem papel: a RPC do material ⇒ ${rMat.tipo}`, rMat)
  ok(JSON.stringify(antesLoja) === JSON.stringify(await estado(admin, id('11', 'a'))), 'sem papel: o pedido da loja NÃO mudou (colunas, histórico, eventos)')
  ok(JSON.stringify(antesDela) === JSON.stringify(await estado(admin, CLI)), 'sem papel: o pedido DELA NÃO mudou')
  const relogio = await cli.rpc('atelie_clock')
  ok(relogio.data === null && relogio.error?.code === '42501', 'sem papel: atelie_clock recusa com 42501 (a conferência do app)', relogio.error)

  console.log(falhas === 0 ? 'TUDO OK' : `${falhas} FALHA(S)`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(2)
})
