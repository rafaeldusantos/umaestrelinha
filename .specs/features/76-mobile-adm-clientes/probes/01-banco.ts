// Feature 76 · T02 — o probe de banco e de PostgREST (supabase-js REAL contra o banco LOCAL).
// Responde, com dado, as perguntas que o Design deixou abertas (§3.1, §3.6, §4.1, R1, A10, A14, A18).
// Rodado por `01-banco.sh`, que semeia as fixturas P76-… e as apaga por `trap`.
//
// SENTIDOS QUE DECIDEM CÓDIGO (cada um repetido ao lado do caso que o prova):
//  S1  `orders_paid`/`orders_total` (bigint) e `total_spent`/`avg_ticket` (numeric) chegam como NUMBER:
//      a leitura não precisa de `Number()`. `avg_ticket` é null para quem não tem pedido pago.
//  S2  `last_activity_at` chega como string com microssegundos e `+00:00`; devolvida ao `or()` entre
//      aspas ela casa o MESMO instante (o `+` sobrevive ao envio): o cursor é a string do servidor.
//  S3  o cursor de três ramos percorre a lista inteira sem repetir e sem pular — com empate de data,
//      dois nulos, corte exatamente em página cheia, no último com data e no primeiro nulo.
//  S4  `\`, `%`, `_`, `"`, `(`, `,`, `)` no termo: escapados com `\` e entre aspas, casam o literal e SÓ ele.
//  S5  o `*` (ponto aberto TQ9): ver o bloco "ASTERISCO" — o resultado decide `escapeLike`.
//  S6  `email.ilike."<exato sem %>"` casa por e-mail sem caixa; `_` literal NÃO puxa a ficha vizinha (A10).
//  S7  A18: com e-mail repetido, `has_account desc, created_at asc` decide; com EMPATE de created_at
//      só um terceiro critério (`id asc`) torna a escolha determinística.
//
// Variável MUTANTE_CURSOR=1 troca `id.gt` por `id.lt` no cursor: o S3 TEM de reprovar.
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const URL = 'http://127.0.0.1:54441'
const KEY = process.env.APIKEY ?? ''
const MUT = process.env.MUTANTE_CURSOR === '1'

let falhas = 0
const ok = (cond: boolean, oque: string, detalhe?: unknown) => {
  if (cond) console.log(`ok — ${oque}`)
  else {
    falhas++
    console.log(`FALHOU — ${oque}${detalhe === undefined ? '' : ` :: ${JSON.stringify(detalhe)}`}`)
  }
}
const nota = (t: string) => console.log(`   · ${t}`)

// ---- as duas funções de escape do Design §3.1 (escritas aqui para o probe; a T04 as leva a `core`) ----
const escapeLike = (v: string) => v.replace(/[\\%_]/g, '\\$&')
const quote = (v: string) => `"${v.replace(/[\\"]/g, '\\$&')}"`
const ilikeContains = (v: string) => quote(`%${escapeLike(v)}%`)
const ilikeExact = (v: string) => quote(escapeLike(v))

const main = async () => {
  const db = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  const e = await db.auth.signInWithPassword({ email: 'admin@umaestrelinha.dev', password: 'admin123' })
  ok(!e.error, 'a admin do seed entra', e.error?.message)

  // ============================== (1) chaves e tipos ==============================
  const A = '00000000-0000-4000-c076-000000000001'
  const idDe = (email: string) => {
    const h = createHash('md5').update(email.toLowerCase()).digest('hex')
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
  }
  const idCurA = idDe('p76-cur-a@exemplo.invalid')
  const COLUNAS_DA_LISTA = 'id, name, email, phone, created_at, orders_paid, total_spent, last_order_at, last_activity_at'
  const COLUNAS_DA_FICHA = 'id, name, email, phone, created_at, orders_paid, orders_total, total_spent, avg_ticket'
  const lista = await db.from('customer_list').select(COLUNAS_DA_LISTA).eq('id', idCurA).maybeSingle()
  ok(!lista.error && !!lista.data, 'customer_list: a linha da convidada Cursor A (id = md5 do e-mail)', lista.error)
  const chaves = (o: object) => Object.keys(o).sort().join(',')
  const quer = (s: string) => s.split(',').map((x) => x.trim()).sort().join(',')
  ok(chaves(lista.data) === quer(COLUNAS_DA_LISTA), 'COLUNAS_DA_LISTA: as chaves devolvidas são exatamente as pedidas', chaves(lista.data))
  const ficha = await db.from('customer_list').select(COLUNAS_DA_FICHA).eq('id', idCurA).maybeSingle()
  ok(chaves(ficha.data) === quer(COLUNAS_DA_FICHA), 'COLUNAS_DA_FICHA: idem', chaves(ficha.data))
  const f = ficha.data as Record<string, unknown>
  ok(typeof f.orders_paid === 'number' && typeof f.orders_total === 'number', 'S1 orders_paid e orders_total (bigint) chegam como number', [typeof f.orders_paid, typeof f.orders_total])
  ok(typeof f.total_spent === 'number' && typeof f.avg_ticket === 'number', 'S1 total_spent e avg_ticket (numeric) chegam como number', [typeof f.total_spent, typeof f.avg_ticket])
  const nulo = await db.from('customer_list').select(COLUNAS_DA_FICHA).eq('id', '00000000-0000-4000-c076-0000000a0001').maybeSingle()
  const n = nulo.data as Record<string, unknown>
  ok(n.orders_paid === 0 && n.total_spent === 0 && n.avg_ticket === null, 'S1 sem pedido: orders_paid 0, total_spent 0, avg_ticket null', n)
  const semOpen = await db.from('customer_list').select('orders_open').limit(1)
  nota(`orders_open em customer_list ANTES da T08: ${semOpen.error ? `erro ${semOpen.error.code} (esperado)` : 'já existe'}`)

  const COLUNAS_DO_PEDIDO = 'id, order_number, status, payment_status, shipping_service_id, material_status, total, created_at'
  const ped = await db.from('order_list').select(COLUNAS_DO_PEDIDO).eq('id', A).maybeSingle()
  ok(chaves(ped.data) === quer(COLUNAS_DO_PEDIDO), 'COLUNAS_DO_PEDIDO: chaves exatas em order_list', ped.error ?? chaves(ped.data))
  ok(typeof (ped.data as any)?.total === 'number', 'S1 order_list.total chega como number')
  const vinc = await db.from('order_list').select('customer_id, customer_email').eq('id', A).maybeSingle()
  ok(!vinc.error && 'customer_id' in (vinc.data as object) && 'customer_email' in (vinc.data as object), 'order_list traz customer_id e customer_email (o vínculo)', vinc.error)
  const itens = await db.from('order_items').select('order_id, product_name').in('order_id', [A])
  ok(itens.data?.length === 1 && chaves(itens.data[0]) === 'order_id,product_name', 'COLUNAS_DOS_ITENS: chaves exatas', itens.error ?? itens.data)
  const cid = await db.from('order_list').select('address_city, address_state').eq('id', A).not('address_city', 'is', null).limit(1)
  ok(cid.data?.length === 1 && chaves(cid.data[0]) === 'address_city,address_state', 'COLUNAS_DA_CIDADE: chaves exatas', cid.error ?? cid.data)
  const ach = await db.from('customer_directory').select('id').eq('id', idCurA)
  ok(ach.data?.length === 1 && chaves(ach.data[0]) === 'id', 'COLUNAS_DO_ACHADO: chaves exatas em customer_directory', ach.error ?? ach.data)

  // ============================== (2) cursor ==============================
  ok(typeof lista.data.last_activity_at === 'string' && /\.123456\+00:00$/.test(lista.data.last_activity_at), 'S2 last_activity_at chega com microssegundos e +00:00', lista.data.last_activity_at)
  const cursor = (c: { last_activity_at: string | null; id: string }) => {
    const gt = MUT ? 'lt' : 'gt'
    if (c.last_activity_at === null) return `and(last_activity_at.is.null,id.${gt}.${c.id})`
    const t = `"${c.last_activity_at}"`
    return `last_activity_at.lt.${t},and(last_activity_at.eq.${t},id.${gt}.${c.id}),last_activity_at.is.null`
  }
  const base = () => db.from('customer_list').select('id, last_activity_at')
  const todas = await base().order('last_activity_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true }).limit(1000)
  const esperado = (todas.data ?? []).map((r) => r.id)
  const datados = (todas.data ?? []).filter((r) => r.last_activity_at !== null).length
  const nulos = esperado.length - datados
  nota(`lista inteira: ${esperado.length} pessoas, ${datados} com data, ${nulos} sem data`)
  ok(nulos >= 2, 'há ao menos dois nulos (as fixturas Nulo A/B)')
  const empate = (todas.data ?? []).filter((r) => r.last_activity_at && r.last_activity_at.startsWith('2031-04-01'))
  ok(empate.length === 2 && empate[0].last_activity_at === empate[1].last_activity_at && empate[0].id < empate[1].id, 'o empate B/C existe, mesma data, ordenado por id asc', empate)
  const andar = async (tam: number) => {
    const vistos: string[] = []
    let c: { last_activity_at: string | null; id: string } | null = null
    for (let i = 0; i < 400; i++) {
      let q = base()
      if (c) q = q.or(cursor(c))
      const r = await q.order('last_activity_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true }).limit(tam)
      if (r.error) throw new Error(JSON.stringify(r.error))
      vistos.push(...r.data.map((x) => x.id))
      if (r.data.length < tam) break
      c = r.data[r.data.length - 1]
    }
    return vistos
  }
  const tamanhos: [string, number][] = [
    ['1', 1], ['2 (corta dentro do empate)', 2], ['3', 3], ['7', 7],
    ['até o último com data', datados], ['até o primeiro nulo', datados + 1], ['até o segundo nulo', datados + 2],
    ['página cheia exata (toda a lista)', esperado.length], ['25 (a página do app)', 25],
  ]
  for (const [rot, t] of tamanhos) {
    const v = await andar(t)
    const igual = v.length === esperado.length && v.every((x, i) => x === esperado[i])
    ok(igual && new Set(v).size === v.length, `S3 cursor, página de ${rot} (${t}): as mesmas ${esperado.length} pessoas, na ordem, sem repetir`, igual ? undefined : { vistos: v.length, unicos: new Set(v).size })
  }

  // ============================== (3) escape ==============================
  const nomes = async (cond: string) => {
    const r = await db.from('customer_directory').select('name').like('name', 'P76%').or(cond).order('name')
    if (r.error) throw new Error(`${cond} :: ${JSON.stringify(r.error)}`)
    return r.data.map((x) => x.name)
  }
  const casos: [string, string, string[]][] = [
    ['%', '100%', ['P76 100% Ana']],
    ['_', 'a_b', ['P76 a_b Bia']],
    ['\\', 'back\\slash', ['P76 back\\slash']],
    ['"', '"aspas"', ['P76 "aspas" Dani']],
    ['( , )', 'Ana (b, c)', ['P76 Ana (b, c)']],
  ]
  for (const [rot, termo, quero] of casos) {
    const got = await nomes(`name.ilike.${ilikeContains(termo)}`)
    ok(JSON.stringify(got) === JSON.stringify(quero), `S4 ${rot}: escapado e entre aspas casa o literal e SÓ ele`, got)
  }
  const cru100 = await nomes('name.ilike."%100%%"')
  ok(cru100.length === 2, 'controle: sem escape, `100%` casa os DOIS (o % é curinga — o defeito que o escape corrige)', cru100)
  const crua = await nomes('name.ilike."%a_b%"')
  ok(crua.length === 2, 'controle: sem escape, `a_b` casa os DOIS (o _ é curinga)', crua)

  // ASTERISCO (S5, TQ9)
  const variantes: [string, string][] = [
    ['`\\*` (escape só do PostgREST)', '"%star\\\\*x%"'],
    ['`*` cru entre aspas', '"%star*x%"'],
    ['`*` trocado por espaço', '"%star x%"'],
    ['`*` trocado por `_` (curinga de UM caractere)', '"%star_x%"'],
    ['`\\*` com UMA barra no fio', '"%star\\*x%"'],
  ]
  const resAst: Record<string, string[]> = {}
  for (const [rot, pad] of variantes) {
    resAst[rot] = await nomes(`name.ilike.${pad}`)
    nota(`ASTERISCO ${rot} => ${JSON.stringify(resAst[rot])}`)
  }
  const porUnderline = resAst['`*` trocado por `_` (curinga de UM caractere)']
  ok(porUnderline.includes('P76 star*x') && !porUnderline.includes('P76 star'), 'S5 `*` trocado por `_` ainda acha o nome com `*` (e nunca vira o curinga de vários caracteres)', porUnderline)
  const cruAst = resAst['`*` cru entre aspas']
  const barAst = resAst['`\\*` (escape só do PostgREST)']
  const literal = barAst.length === 1 && barAst[0] === 'P76 star*x'
  ok(true, `S5 DECISÃO: o \`*\` ${cruAst.length > 1 ? 'cru VIRA CURINGA (casa ' + cruAst.length + ' nomes)' : 'cru NÃO é curinga'}; \`\\*\` ${literal ? 'chega LITERAL e casa só `star*x`' : 'NÃO chega literal (casa ' + JSON.stringify(barAst) + ')'}`)
  ok(cruAst.length >= 1 && cruAst.includes('P76 star*x'), 'o `*` cru entre aspas ainda casa o próprio nome com `*`', cruAst)

  // ============================== (4) vínculo A10 ==============================
  const um = 'P76VROSA_RJ@exemplo.invalid'
  const idUm = idDe(um)
  const ped30 = '00000000-0000-4000-c076-000000000030'
  const ped31 = '00000000-0000-4000-c076-000000000031'
  const exato = await db.from('order_list').select('id').or(`customer_id.eq.${idUm},customer_email.ilike.${ilikeExact(um)}`).like('order_number', 'P76-%')
  ok(JSON.stringify(exato.data?.map((x) => x.id)) === JSON.stringify([ped30]), 'S6/A10 vínculo sem curinga: a ficha de VROSA_RJ traz SÓ o pedido dela', exato.error ?? exato.data)
  const cruzado = await db.from('order_list').select('id').or(`customer_id.eq.${idUm},customer_email.ilike.${quote(um)}`).like('order_number', 'P76-%')
  ok((cruzado.data ?? []).map((x) => x.id).sort().join() === [ped30, ped31].join(), 'controle: com o e-mail CRU o `_` é curinga e a ficha puxa o pedido de VROSAXRJ (o defeito do painel — BL-052)', cruzado.data)

  // ============================== (5) caixa ==============================
  const caixa = await db.from('customer_directory').select('id, email').or(`email.ilike.${ilikeExact('p76maria@exemplo.invalid')}`)
  ok(caixa.data?.length === 1 && caixa.data[0].email === 'P76Maria@Exemplo.invalid', 'S6 ilike exato sem % casa `P76Maria@Exemplo` com `p76maria@exemplo` (sem caixa)', caixa.error ?? caixa.data)

  // ============================== (6) A18 ==============================
  const escolher = async (email: string, desempate: boolean) => {
    let q = db.from('customer_directory').select('id').or(`email.ilike.${ilikeExact(email)}`)
      .order('has_account', { ascending: false }).order('created_at', { ascending: true })
    if (desempate) q = q.order('id', { ascending: true })
    const r = await q.limit(1)
    if (r.error) throw new Error(JSON.stringify(r.error))
    return r.data[0]?.id
  }
  const dd = '00000000-0000-4000-c076-0000000d0001'
  const repetido = new Set<string>()
  for (let i = 0; i < 5; i++) repetido.add(await escolher('p76-dup@exemplo.invalid', false))
  ok(repetido.size === 1 && repetido.has(dd), 'S7/A18 dois cadastros, created_at diferentes: `has_account desc, created_at asc, limit 1` escolhe o mais antigo, sempre', [...repetido])
  const emp = new Set<string>()
  for (let i = 0; i < 5; i++) emp.add(await escolher('p76-emp@exemplo.invalid', true))
  ok(emp.size === 1 && emp.has('00000000-0000-4000-c076-0000000d0003'), 'S7/A18 com created_at EMPATADO, o terceiro critério `id asc` decide (d0003)', [...emp])
  const empSem = await escolher('p76-emp@exemplo.invalid', false)
  nota(`A18 empate SEM \`id asc\`: devolveu ${empSem} (estável por acaso do plano; só o terceiro critério garante)`)
  const dir = await db.from('customer_list').select('same_email_count').eq('id', dd).maybeSingle()
  ok(dir.data?.same_email_count === 2, 'a duplicata aparece com same_email_count = 2 (a regra de A18 é real)', dir.data)

  console.log(falhas === 0 ? '\nTUDO OK' : `\n${falhas} FALHA(S)`)
  process.exit(falhas === 0 ? 0 : 1)
}
main().catch((err) => {
  console.error('ERRO', err)
  process.exit(2)
})
