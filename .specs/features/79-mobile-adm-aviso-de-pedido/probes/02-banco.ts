// Feature 79, T08 — o probe SQL das inscrições, contra o banco LOCAL (54441/54442).
//
// Roda com (as chaves vêm de `supabase status -o env`, nunca escritas aqui):
//   eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|JWT_SECRET|DB_URL)=')"
//   API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY JWT_SECRET=$JWT_SECRET DB_URL=$DB_URL \
//     deno run --no-lock --node-modules-dir=none --allow-net --allow-env --allow-read --allow-sys 02-banco.ts
//   (`--no-lock`: sem ele o Deno grava o `deno.lock` da raiz; `--node-modules-dir=none`: o `package.json`
//   da raiz faria o Deno procurar `postgres` no `node_modules` do monorepo)
//
// Prova o que a régua de fonte (`pushSubscriptionsSchema.test.ts`) não alcança: que o banco RECUSA
// `anon` e `authenticated` (admin incluído) pelo PostgREST, que a service role lê e grava, o `unique`,
// o `check` de `events`, a cascata ao apagar a conta, a atomicidade de `claim_push_test` com duas
// conexões, o teto por conta em `push_test_claims` (fechada como `push_subscriptions`, e sobrevivendo
// à linha do aparelho testado — conserto do probe da T26), e o `check` de canal de `order_notifications`.
//
// Fixturas com prefixo `P79-` (contas `p79-…@exemplo.invalid`, endpoints `…/P79-…`), APAGADAS no fim;
// as contagens de `orders`, `order_notifications`, `push_subscriptions` e `auth.users` são conferidas
// antes e depois.

import postgres from 'npm:postgres@3.4.4'

const env = (k: string): string => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`env ${k} ausente`)
  return v
}
const API = env('API_URL')
const ANON = env('ANON_KEY')
const SERVICE = env('SERVICE_ROLE_KEY')
const SEGREDO = env('JWT_SECRET')
const DB = env('DB_URL')

const sql = postgres(DB, { max: 4, onnotice: () => {} })
const sql2 = postgres(DB, { max: 1, onnotice: () => {} })

const resultados: { passo: string; ok: boolean; detalhe: string }[] = []
const registra = (passo: string, ok: boolean, detalhe: string) => {
  resultados.push({ passo, ok, detalhe })
  console.log(`${ok ? 'ok  ' : 'FALHOU'} — ${passo}: ${detalhe}`)
}

// ------------------------------------------------------------- um JWT de `authenticated` (HS256)
const b64url = (b: Uint8Array | string): string =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const jwtDe = async (sub: string): Promise<string> => {
  const agora = Math.floor(Date.now() / 1000)
  const cab = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const corpo = b64url(JSON.stringify({ sub, role: 'authenticated', aud: 'authenticated', iat: agora, exp: agora + 600 }))
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(SEGREDO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const ass = new Uint8Array(await crypto.subtle.sign('HMAC', chave, new TextEncoder().encode(`${cab}.${corpo}`)))
  return `${cab}.${corpo}.${b64url(ass)}`
}

const rest = async (metodo: string, caminho: string, token: string, corpo?: unknown) => {
  const r = await fetch(`${API}/rest/v1/${caminho}`, {
    method: metodo,
    headers: {
      apikey: token === SERVICE ? SERVICE : ANON,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const texto = await r.text()
  let json: any = null
  try {
    json = JSON.parse(texto)
  } catch {
    json = texto
  }
  return { status: r.status, json }
}

const contagens = async () => {
  const [l] = await sql`
    select (select count(*) from public.orders)::int as orders,
           (select count(*) from public.order_notifications)::int as order_notifications,
           (select count(*) from public.push_subscriptions)::int as push_subscriptions,
           (select count(*) from public.push_test_claims)::int as push_test_claims,
           (select count(*) from auth.users)::int as auth_users`
  return l
}

const ANTES = await contagens()
console.log(`contagens antes: ${JSON.stringify(ANTES)}`)

// ------------------------------------------------------------- fixturas
const criarConta = async (rotulo: string): Promise<string> => {
  const [u] = await sql`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            ${`p79-${rotulo}-${crypto.randomUUID().slice(0, 8)}@exemplo.invalid`}, '', now(), now(), '{}'::jsonb, '{}'::jsonb)
    returning id`
  return u.id
}
const ponto = () => b64url(new Uint8Array([4, ...crypto.getRandomValues(new Uint8Array(64))]))
const segredo = () => b64url(crypto.getRandomValues(new Uint8Array(16)))
const endpoint = (rotulo: string) => `https://fcm.googleapis.com/fcm/send/P79-${rotulo}-${crypto.randomUUID().slice(0, 8)}`

const contaA = await criarConta('a')
const contaB = await criarConta('b')
const [admin] = await sql`select user_id from public.user_roles where role = 'admin' limit 1`

try {
  // ----------------------------------------------------------- service_role lê e grava
  const epA1 = endpoint('a1')
  const ins = await rest('POST', 'push_subscriptions', SERVICE, { user_id: contaA, endpoint: epA1, p256dh: ponto(), auth: segredo() })
  registra(
    'service_role grava pelo PostgREST',
    ins.status === 201 && Array.isArray(ins.json) && ins.json[0]?.endpoint === epA1,
    `POST ${ins.status}; events nasceu ${JSON.stringify(ins.json?.[0]?.events)}`,
  )
  registra(
    'o default de events são os quatro owner_* (A5)',
    JSON.stringify(ins.json?.[0]?.events) ===
      JSON.stringify(['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']),
    JSON.stringify(ins.json?.[0]?.events),
  )
  const lida = await rest('GET', `push_subscriptions?select=endpoint&user_id=eq.${contaA}`, SERVICE)
  registra('service_role lê pelo PostgREST', lida.status === 200 && lida.json.length === 1, `GET ${lida.status}, ${lida.json.length} linha(s)`)

  // ----------------------------------------------------------- anon e authenticated (admin incluído) recusados
  const tokens: [string, string][] = [
    ['anon', ANON],
    ['authenticated (conta A, dona da linha)', await jwtDe(contaA)],
    ['authenticated (admin)', await jwtDe(admin.user_id)],
  ]
  for (const [nome, token] of tokens) {
    const sel = await rest('GET', 'push_subscriptions?select=id', token)
    const insr = await rest('POST', 'push_subscriptions', token, { user_id: contaA, endpoint: endpoint('x'), p256dh: ponto(), auth: segredo() })
    const upd = await rest('PATCH', `push_subscriptions?endpoint=eq.${encodeURIComponent(epA1)}`, token, { events: [] })
    const del = await rest('DELETE', `push_subscriptions?endpoint=eq.${encodeURIComponent(epA1)}`, token)
    const recusado = (r: { status: number; json: any }) => r.status === 401 || r.status === 403 || r.json?.code === '42501'
    registra(
      `${nome}: select/insert/update/delete recusados`,
      [sel, insr, upd, del].every(recusado),
      `select ${sel.status} ${sel.json?.code ?? ''} · insert ${insr.status} ${insr.json?.code ?? ''} · update ${upd.status} ${upd.json?.code ?? ''} · delete ${del.status} ${del.json?.code ?? ''}`,
    )
  }
  // a tabela do teto: a mesma recusa, pelos mesmos papéis
  for (const [nome, token] of tokens) {
    const sel = await rest('GET', 'push_test_claims?select=user_id', token)
    const insr = await rest('POST', 'push_test_claims', token, { user_id: contaA, last_test_at: '2000-01-01T00:00:00Z' })
    const recusado = (r: { status: number; json: any }) => r.status === 401 || r.status === 403 || r.json?.code === '42501'
    registra(
      `${nome}: push_test_claims select/insert recusados`,
      [sel, insr].every(recusado),
      `select ${sel.status} ${sel.json?.code ?? ''} · insert ${insr.status} ${insr.json?.code ?? ''}`,
    )
  }
  const tetoSrv = await rest('GET', 'push_test_claims?select=user_id', SERVICE)
  registra('service_role lê push_test_claims pelo PostgREST', tetoSrv.status === 200 && Array.isArray(tetoSrv.json), `GET ${tetoSrv.status}`)

  const [aindaLa] = await sql`select events from public.push_subscriptions where endpoint = ${epA1}`
  registra('a linha seguiu intocada depois das tentativas', aindaLa?.events?.length === 4, JSON.stringify(aindaLa?.events))

  // ----------------------------------------------------------- unique(endpoint)
  let unico = ''
  try {
    await sql`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (${contaB}, ${epA1}, ${ponto()}, ${segredo()})`
    unico = 'aceitou (ERRADO)'
  } catch (e) {
    unico = `${(e as any).code} ${(e as any).constraint_name ?? ''}`
  }
  registra('unique(endpoint): o mesmo aparelho não vira duas linhas (MAN-27)', unico.startsWith('23505'), unico)

  // ----------------------------------------------------------- check de events
  const evento = async (events: string[]) => {
    try {
      await sql`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, events) values (${contaB}, ${endpoint('ev')}, ${ponto()}, ${segredo()}, ${events})`
      return 'aceitou'
    } catch (e) {
      return `${(e as any).code} ${(e as any).constraint_name ?? ''}`
    }
  }
  const evFora = await evento(['owner_order_paid', 'order_paid'])
  const evVazio = await evento([])
  const evUm = await evento(['owner_material_incoming'])
  registra(
    'check de events: fora dos quatro recusado; vazio e subconjunto aceitos',
    evFora.startsWith('23514') && evVazio === 'aceitou' && evUm === 'aceitou',
    `fora: ${evFora} · vazio: ${evVazio} · um: ${evUm}`,
  )

  // ----------------------------------------------------------- claim_push_test
  const epA2 = endpoint('a2')
  const epB1 = endpoint('b1')
  await sql`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (${contaA}, ${epA2}, ${ponto()}, ${segredo()}), (${contaB}, ${epB1}, ${ponto()}, ${segredo()})`

  // permissões da RPC pelo PostgREST
  const rpc = (token: string, user: string, ep: string) => rest('POST', 'rpc/claim_push_test', token, { p_user_id: user, p_endpoint: ep })
  const rAnon = await rpc(ANON, contaA, epA1)
  const rAuth = await rpc(await jwtDe(admin.user_id), contaA, epA1)
  registra(
    'claim_push_test: anon e authenticated (admin) recusados pelo PostgREST',
    [rAnon, rAuth].every((r) => r.status === 401 || r.status === 403 || r.json?.code === '42501'),
    `anon ${rAnon.status} ${rAnon.json?.code ?? ''} · admin ${rAuth.status} ${rAuth.json?.code ?? ''}`,
  )
  const [semTeste] = await sql`select count(*)::int as n from public.push_test_claims where user_id = ${contaA}`
  registra('as recusas não gravaram o teto (push_test_claims)', semTeste.n === 0, `${semTeste.n} linha(s) da conta A em push_test_claims`)

  // duas conexões ao mesmo tempo: A segura a trava dentro de uma transação aberta
  const ordem: string[] = []
  let primeira: boolean | null = null
  let segunda: boolean | null = null
  const tA = sql.begin(async (tx) => {
    const [r] = await tx`select public.claim_push_test(${contaA}, ${epA1}) as ok`
    primeira = r.ok
    ordem.push(`A=${r.ok}`)
    await new Promise((res) => setTimeout(res, 1200))
    ordem.push('A commit')
  })
  await new Promise((res) => setTimeout(res, 200))
  const inicioB = Date.now()
  const tB = sql2`select public.claim_push_test(${contaA}, ${epA2}) as ok`.then(([r]) => {
    segunda = r.ok
    ordem.push(`B=${r.ok} depois de ${Date.now() - inicioB} ms`)
  })
  await Promise.all([tA, tB])
  registra(
    'claim_push_test com duas conexões concorrentes: exatamente uma true, e a segunda esperou a trava',
    primeira === true && segunda === false && ordem[1] === 'A commit',
    ordem.join(' → '),
  )

  // Promise.all puro, sem segurar: ainda uma só
  const contaC = await criarConta('c')
  const epC1 = endpoint('c1')
  const epC2 = endpoint('c2')
  await sql`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (${contaC}, ${epC1}, ${ponto()}, ${segredo()}), (${contaC}, ${epC2}, ${ponto()}, ${segredo()})`
  const corrida = await Promise.all([
    sql`select public.claim_push_test(${contaC}, ${epC1}) as ok`.then(([r]) => r.ok),
    sql2`select public.claim_push_test(${contaC}, ${epC2}) as ok`.then(([r]) => r.ok),
  ])
  registra('duas chamadas simultâneas sem pausa: exatamente uma true', corrida.filter(Boolean).length === 1, JSON.stringify(corrida))

  const [dentro] = await sql`select public.claim_push_test(${contaA}, ${epA1}) as ok`
  registra('dentro de 30 s ⇒ false (mesmo noutro aparelho da conta)', dentro.ok === false, String(dentro.ok))

  const [deOutra] = await sql`select public.claim_push_test(${contaB}, ${epA1}) as ok`
  const [naoTocou] = await sql`select count(*)::int as n from public.push_test_claims where user_id = ${contaB}`
  registra(
    'endpoint de outra conta ⇒ false, e nada gravado na conta B',
    deOutra.ok === false && naoTocou.n === 0,
    `ok=${deOutra.ok}; linhas da conta B em push_test_claims: ${naoTocou.n}`,
  )

  const [doServico] = await rest('POST', 'rpc/claim_push_test', SERVICE, { p_user_id: contaB, p_endpoint: epB1 }).then((r) => [r])
  registra('service_role chama a RPC pelo PostgREST (conta B, primeira vez) ⇒ true', doServico.status === 200 && doServico.json === true, `${doServico.status} ${JSON.stringify(doServico.json)}`)

  // passados 30 s a conta pode testar de novo (o tempo é empurrado para trás, não esperado)
  await sql`update public.push_test_claims set last_test_at = now() - interval '31 seconds' where user_id = ${contaA}`
  const [depois] = await sql`select public.claim_push_test(${contaA}, ${epA2}) as ok`
  registra('depois de 30 s ⇒ true de novo', depois.ok === true, String(depois.ok))

  // ----------------------------------------------------------- order_notifications: channel push
  const canal = async (channel: string) => {
    try {
      await sql.begin(async (tx) => {
        const [o] = await tx`select id from public.orders limit 1`
        await tx`insert into public.order_notifications (order_id, event, channel, status) values (${o.id}, 'owner_order_paid', ${channel}, 'pending')`
        throw new Error('ROLLBACK_DE_PROPOSITO')
      })
      return 'commit (inesperado)'
    } catch (e) {
      const err = e as any
      return err.message === 'ROLLBACK_DE_PROPOSITO' ? 'aceitou (desfeito)' : `${err.code} ${err.constraint_name ?? ''}`
    }
  }
  const cPush = await canal('push')
  const cSms = await canal('sms')
  registra(
    "order_notifications aceita channel = 'push' e recusa 'sms' (MAN-34)",
    cPush === 'aceitou (desfeito)' && cSms.startsWith('23514'),
    `push: ${cPush} · sms: ${cSms}`,
  )

  // ----------------------------------------------------------- cascata
  const [antesCascata] = await sql`select (select count(*) from public.push_subscriptions where user_id = ${contaA})::int as n,
                                          (select count(*) from public.push_test_claims where user_id = ${contaA})::int as t`
  await sql`delete from auth.users where id = ${contaA}`
  const [depoisCascata] = await sql`select (select count(*) from public.push_subscriptions where user_id = ${contaA})::int as n,
                                           (select count(*) from public.push_test_claims where user_id = ${contaA})::int as t`
  registra(
    'apagar a conta leva as inscrições e o teto junto (MAN-29)',
    antesCascata.n === 2 && depoisCascata.n === 0 && antesCascata.t === 1 && depoisCascata.t === 0,
    `inscrições ${antesCascata.n} → ${depoisCascata.n} · teto ${antesCascata.t} → ${depoisCascata.t}`,
  )
} finally {
  // ----------------------------------------------------------- limpeza das fixturas P79-
  await sql`delete from public.push_subscriptions where endpoint like '%/P79-%'`
  await sql`delete from public.customers where email like 'p79-%@exemplo.invalid'`
  await sql`delete from auth.users where email like 'p79-%@exemplo.invalid'`
  const DEPOIS = await contagens()
  console.log(`contagens depois: ${JSON.stringify(DEPOIS)}`)
  registra('fixturas P79- apagadas: contagens iguais às de antes', JSON.stringify(DEPOIS) === JSON.stringify(ANTES), `${JSON.stringify(ANTES)} → ${JSON.stringify(DEPOIS)}`)
  await sql.end()
  await sql2.end()
}

const falhas = resultados.filter((r) => !r.ok)
console.log(falhas.length === 0 ? 'TODOS OS PASSOS OK' : `${falhas.length} PASSO(S) FALHARAM`)
Deno.exit(falhas.length === 0 ? 0 : 1)
