// Feature 74 · T10 — o par que torna `lerComPapel` necessário (`MAP-37`, Success Criterion 3, M4 do
// Design): uma conta autenticada SEM papel admin, com um pedido próprio como cliente, lê pelo
// PostgREST as linhas DELA da view `order_list` e de `order_items` — sem erro nenhum — **e** a RPC
// `atelie_clock` a recusa com `42501`. Sem a RPC, a lista desenharia os pedidos da cliente como se
// fossem a fila da loja. Rodado por `03-cliente-sem-papel.sh`.
import { createClient } from '@supabase/supabase-js'

import { COLUNAS_DA_LISTA, COLUNAS_DOS_ITENS } from '../../../../apps/mobile-adm/src/entities/order/model/linha.ts'

const KEY = process.env.APIKEY ?? ''
let falhas = 0
const ok = (cond: boolean, oque: string, detalhe?: unknown) => {
  if (cond) console.log(`ok — ${oque}`)
  else {
    falhas++
    console.log(`FALHOU — ${oque}${detalhe === undefined ? '' : ` :: ${JSON.stringify(detalhe)}`}`)
  }
}

const main = async () => {
  const supabase = createClient('http://127.0.0.1:54441', KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await supabase.auth.signInWithPassword({ email: 'probe74-cliente@exemplo.invalid', password: 'probe74senha' })
  ok(!error, 'a cliente entra com senha', error?.message)

  const lista = await supabase.from('order_list').select(COLUNAS_DA_LISTA)
  ok(!lista.error, 'a view order_list responde à cliente SEM erro', lista.error)
  ok(
    lista.data?.length === 1 && lista.data[0].id === '00000000-0000-4000-c074-0000000000a1',
    'e devolve exatamente o pedido DELA (a RLS filtra, não recusa)',
    lista.data?.map(l => l.id),
  )
  const itens = await supabase.from('order_items').select(COLUNAS_DOS_ITENS).eq('order_id', '00000000-0000-4000-c074-0000000000a1')
  ok(!itens.error && itens.data?.length === 1, 'order_items também devolve o item dela, sem erro', itens.error)

  const relogio = await supabase.rpc('atelie_clock')
  ok(relogio.data === null && relogio.error?.code === '42501', 'a RPC atelie_clock recusa a cliente com 42501', relogio.error)

  // Controle: a admin do seed, no mesmo instante, recebe `lido_em` e vê a loja inteira.
  const admin = createClient('http://127.0.0.1:54441', KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  await admin.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
  const r = await admin.rpc('atelie_clock')
  ok(!r.error && typeof (r.data as { lido_em?: string })?.lido_em === 'string', 'controle: a admin recebe lido_em', r.error)
  const todas = await admin.from('order_list').select('id', { count: 'exact', head: true })
  ok((todas.count ?? 0) > 1, `controle: a admin vê ${todas.count} pedidos`)

  // anon: sem sessão, a RPC nem executa.
  const anon = createClient('http://127.0.0.1:54441', KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const a = await anon.rpc('atelie_clock')
  ok(a.data === null && a.error?.code === '42501', 'anon é recusado com 42501', a.error)

  console.log(falhas === 0 ? 'TUDO OK' : `${falhas} FALHA(S)`)
  process.exit(falhas === 0 ? 0 : 1)
}
main().catch(e => {
  console.error(e)
  process.exit(2)
})
