// WI 95 · C-03, C-07, AD-012 — a gravação da observação pelo MESMO caminho do painel, contra o banco
// LOCAL (:54441): o supabase-js real, logado como a admin de desenvolvimento, chamando o dono da
// escrita de `core` (`writeAdminNote`) e lendo com as colunas que o hook do painel lê. Prova que a
// gravação grava (tipo escrito à mão é afirmação, não verificação). Limpa o que gravou.
//
//   node .specs/work-items/95-observacao-do-pedido/probes/02-gravacao-pelo-painel.mjs
//
// Nunca aponte para ambiente remoto. Exit 0 com só `ok —` é a prova.

import { execSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..')
const require = createRequire(resolve(RAIZ, 'package.json'))
const { createClient } = require('@supabase/supabase-js')
const { writeAdminNote, ORDER_ADMIN_NOTE_COLUMNS } = await import(resolve(RAIZ, 'packages/core/src/order-actions/adminNote.ts'))

const API = 'http://127.0.0.1:54441'
const status = JSON.parse(execSync('supabase status -o json 2>/dev/null', { cwd: RAIZ }).toString())
if (status.API_URL !== API) throw new Error(`o probe só roda contra o banco local (${status.API_URL})`)

let falhas = 0
const ok = (m) => console.log(`ok — ${m}`)
const falha = (m, d) => {
  console.log(`FALHA — ${m} (${JSON.stringify(d)})`)
  falhas++
}

const opcoes = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(API, status.ANON_KEY, opcoes)
const anon = createClient(API, status.ANON_KEY, opcoes)
const { data: sessao, error: erroLogin } = await admin.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
if (erroLogin) throw erroLogin
const uid = sessao.user.id

// Um pedido sem observação (o probe não pode pisar numa de verdade).
const { data: pedidos } = await admin.from('orders').select('id').order('created_at').limit(50)
const { data: comNota } = await admin.from('order_admin_notes').select('order_id')
const ocupados = new Set((comNota ?? []).map((n) => n.order_id))
const pedido = (pedidos ?? []).find((p) => !ocupados.has(p.id))?.id
if (!pedido) throw new Error('nenhum pedido sem observação no banco local')

const ler = async (cliente) => cliente.from('order_admin_notes').select(ORDER_ADMIN_NOTE_COLUMNS).eq('order_id', pedido).maybeSingle()

try {
  // 1 · cadastra
  let r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: '  Gravar "Ana" na frente  ', userId: uid, userName: 'Adri Muniz' })
  if (r.tipo === 'ok' && r.nota?.note === 'Gravar "Ana" na frente' && r.nota.updated_by === uid && r.nota.updated_by_name === 'Adri Muniz') {
    ok('admin cadastra pelo dono: a linha devolvida tem o texto aparado, o autor e o nome')
  } else falha('cadastrar', r)

  let lida = await ler(admin)
  if (!lida.error && lida.data?.note === 'Gravar "Ana" na frente') ok('a leitura do painel (as mesmas colunas) devolve a observação')
  else falha('ler depois de cadastrar', lida)

  // 2 · edita (upsert na mesma linha) — o instante é renovado pelo banco, sem o cliente mandar
  const instanteAntes = lida.data?.updated_at
  await new Promise((pronto) => setTimeout(pronto, 1100))
  r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: 'Gravar "Ana" atrás', userId: uid, userName: 'Adri Muniz' })
  const { count } = await admin.from('order_admin_notes').select('order_id', { count: 'exact', head: true }).eq('order_id', pedido)
  if (r.tipo === 'ok' && r.nota?.note === 'Gravar "Ana" atrás' && count === 1) ok('admin edita: a mesma linha, o texto novo')
  else falha('editar', { r, count })
  if (r.tipo === 'ok' && instanteAntes && new Date(r.nota.updated_at) > new Date(instanteAntes)) {
    ok('a edição renova updated_at pelo banco (o dono não manda o instante)')
  } else falha('updated_at na edição', { antes: instanteAntes, depois: r.nota?.updated_at })

  // 3 · o teto: 1001 é recusado ANTES da rede, 1000 grava
  r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: 'a'.repeat(1001), userId: uid, userName: 'Adri' })
  if (r.tipo === 'recusado') ok('1001 caracteres: recusado pelo dono')
  else falha('1001', r)
  r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: '𝒜'.repeat(1000), userId: uid, userName: 'Adri' })
  if (r.tipo === 'ok') ok('1000 pontos de código (2000 unidades UTF-16): o banco aceita o que o dono aceita')
  else falha('1000 pontos de código', r)

  // 4 · o anônimo não lê
  const doAnon = await ler(anon)
  if (doAnon.error || doAnon.data === null) ok(`anônimo não lê a observação (${doAnon.error?.code ?? 'sem linha'})`)
  else falha('anônimo leu', doAnon)

  // 5 · vazio apaga
  r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: '   ', userId: uid, userName: 'Adri' })
  lida = await ler(admin)
  if (r.tipo === 'ok' && r.nota === null && !lida.error && lida.data === null) ok('texto vazio apaga a observação')
  else falha('apagar', { r, lida })

  // 6 · apagar o que não existe é `nenhuma-linha`, nunca sucesso
  r = await writeAdminNote({ client: admin }, { orderId: pedido, texto: '', userId: uid, userName: 'Adri' })
  if (r.tipo === 'nenhuma-linha') ok('apagar sem observação: nenhuma-linha')
  else falha('apagar sem observação', r)
} finally {
  await admin.from('order_admin_notes').delete().eq('order_id', pedido)
}

process.exit(falhas === 0 ? 0 : 1)
