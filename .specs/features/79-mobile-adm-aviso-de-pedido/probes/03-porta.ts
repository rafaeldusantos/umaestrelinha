// Feature 79, T26 — o probe HTTP da porta `atelie-avisos`, SERVIDA por `supabase functions serve`
// contra o banco LOCAL (54441/54442).
//
// Roda com (as chaves vêm de `supabase status -o env`, nunca escritas aqui; o `functions serve` sobe
// antes, em outro terminal, com `--env-file .env` — é onde moram as chaves VAPID de dev):
//   supabase functions serve --env-file .env
//   eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|DB_URL)=')"
//   API_URL=$API_URL ANON_KEY=$ANON_KEY SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY DB_URL=$DB_URL \
//     deno run --no-lock --node-modules-dir=none --allow-net --allow-env 03-porta.ts
//
// Prova, de ponta a ponta (a function de verdade, o GoTrue de verdade, o PostgREST e o banco), o que os
// 64 casos de `atelie-avisos/__tests__/handlers.test.ts` provam com dublê: as seis ações, o par conta
// admin × conta sem papel, a troca de dono do mesmo endereço (`MAN-27`), o despejo da 11ª pelo
// `last_used_at` (`MAN-28`), o teto de 30 s do teste (`MAN-33`), e o `test` contra um endereço
// SINTÉTICO do FCM — com o desfecho que o FCM de verdade devolve e o que acontece com a linha.
//
// Contas de verdade (criadas pela API admin do GoTrue com a service role, e entradas com e-mail e
// senha): o JWT que a function valida é o que o GoTrue emitiu. Fixturas com prefixo `P79-` (contas
// `p79-porta-…@exemplo.invalid`, endpoints `…/fcm/send/P79-…`), APAGADAS no `finally`; as contagens de
// `orders`, `order_notifications`, `push_subscriptions`, `auth.users`, `customers` e `user_roles` são
// conferidas antes e depois.

import postgres from 'npm:postgres@3.4.4'

const env = (k: string): string => {
  const v = Deno.env.get(k)
  if (!v) throw new Error(`env ${k} ausente`)
  return v
}
const API = env('API_URL')
const ANON = env('ANON_KEY')
const SERVICE = env('SERVICE_ROLE_KEY')
const DB = env('DB_URL')
const PORTA = `${API}/functions/v1/atelie-avisos`

const sql = postgres(DB, { max: 2, onnotice: () => {} })

const resultados: { passo: string; ok: boolean }[] = []
const registra = (passo: string, ok: boolean, detalhe: string) => {
  resultados.push({ passo, ok })
  console.log(`${ok ? 'ok  ' : 'FALHOU'} — ${passo}: ${detalhe}`)
}

const b64url = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Uma inscrição sintética com chaves VÁLIDAS (o envio cifra de verdade antes de ir ao FCM). */
const chaves = async () => {
  const par = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const publica = new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))
  return { p256dh: b64url(publica), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) }
}
const endpoint = (rotulo: string) => `https://fcm.googleapis.com/fcm/send/P79-${rotulo}-${crypto.randomUUID().slice(0, 8)}`
/** O endpoint nunca aparece inteiro na saída do probe: só o rótulo. */
const rotuloDe = (ep: string) => ep.split('/').pop()!.split('-').slice(0, 2).join('-')

const chamar = async (acao: string, token: string | null, corpo: unknown) => {
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: ANON }
  if (token) headers.authorization = `Bearer ${token}`
  const r = await fetch(`${PORTA}?action=${acao}`, { method: 'POST', headers, body: JSON.stringify(corpo) })
  const texto = await r.text()
  let json: any = null
  try {
    json = JSON.parse(texto)
  } catch {
    json = texto
  }
  return { status: r.status, json, texto }
}

const contagens = async () => {
  const [l] = await sql`
    select (select count(*) from public.orders)::int as orders,
           (select count(*) from public.order_notifications)::int as order_notifications,
           (select count(*) from public.push_subscriptions)::int as push_subscriptions,
           (select count(*) from public.push_test_claims)::int as push_test_claims,
           (select count(*) from auth.users)::int as auth_users,
           (select count(*) from public.customers)::int as customers,
           (select count(*) from public.user_roles)::int as user_roles`
  return l
}

// ------------------------------------------------------------- contas de verdade (GoTrue)
const SENHA = `P79-${crypto.randomUUID()}`
const criadas: string[] = []
const criarConta = async (rotulo: string, admin: boolean) => {
  const email = `p79-porta-${rotulo}-${crypto.randomUUID().slice(0, 8)}@exemplo.invalid`
  const r = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SENHA, email_confirm: true }),
  })
  const u = await r.json()
  if (!u?.id) throw new Error(`não criei a conta ${rotulo}: ${r.status}`)
  criadas.push(u.id)
  if (admin) await sql`insert into public.user_roles (user_id, role) values (${u.id}, 'admin')`
  const s = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: SENHA }),
  })
  const sessao = await s.json()
  if (!sessao?.access_token) throw new Error(`não entrei com a conta ${rotulo}: ${s.status}`)
  return { id: u.id as string, token: sessao.access_token as string }
}

const linhaDe = async (ep: string) => {
  const [l] = await sql`select user_id, events from public.push_subscriptions where endpoint = ${ep}`
  return l ?? null
}
/** O teto do teste da conta (`push_test_claims`, uma linha por conta — conserto do probe da T26). */
const tetoDe = async (id: string) =>
  ((await sql`select last_test_at from public.push_test_claims where user_id = ${id}`)[0]?.last_test_at ?? null) as Date | null
const daConta = async (id: string) =>
  (await sql`select count(*)::int as n from public.push_subscriptions where user_id = ${id}`)[0].n as number

const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

const ANTES = await contagens()
console.log(`contagens antes: ${JSON.stringify(ANTES)}`)

const ecoou: string[] = []
const semEco = (r: { texto: string }, eps: string[]) => {
  for (const ep of eps) if (r.texto.includes(ep)) ecoou.push(rotuloDe(ep))
}

try {
  const adminA = await criarConta('admin-a', true)
  const adminB = await criarConta('admin-b', true)
  const semPapel = await criarConta('sem-papel', false)

  // ----------------------------------------------------------- 401 sem header e com a anon key
  {
    const semHeader = await chamar('config', null, {})
    const comAnon = await chamar('config', ANON, {})
    registra('sem Authorization ⇒ 401; com a anon key ⇒ 401', semHeader.status === 401 && comAnon.status === 401, `${semHeader.status} ${JSON.stringify(semHeader.json)} · ${comAnon.status} ${JSON.stringify(comAnon.json)}`)
  }

  // ----------------------------------------------------------- a conta SEM PAPEL: as seis ações recusadas, nada gravado
  {
    const ep = endpoint('sem-papel')
    const k = await chaves()
    const antes = await contagens()
    const respostas = [
      ['config', await chamar('config', semPapel.token, {})],
      ['status', await chamar('status', semPapel.token, { endpoint: ep })],
      ['subscribe', await chamar('subscribe', semPapel.token, { endpoint: ep, keys: k })],
      ['events', await chamar('events', semPapel.token, { endpoint: ep, events: [] })],
      ['unsubscribe', await chamar('unsubscribe', semPapel.token, { endpoint: ep })],
      ['test', await chamar('test', semPapel.token, { endpoint: ep })],
    ] as const
    const depois = await contagens()
    registra(
      'conta sem papel: as seis ações ⇒ 403, e nada gravado',
      respostas.every(([, r]) => r.status === 403) && igual(antes, depois) && (await linhaDe(ep)) === null,
      respostas.map(([a, r]) => `${a} ${r.status} ${r.json?.error}`).join(' · ') + ` · push_subscriptions ${antes.push_subscriptions}→${depois.push_subscriptions}`,
    )
    for (const [, r] of respostas) semEco(r, [ep])
  }

  // ----------------------------------------------------------- config
  {
    const r = await chamar('config', adminA.token, {})
    const chave = r.json?.applicationServerKey
    const bytes = typeof chave === 'string' ? Uint8Array.from(atob(chave.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (chave.length % 4)) % 4)), (c) => c.charCodeAt(0)) : null
    registra('config (admin) ⇒ 200 com a chave pública: 65 bytes, prefixo 0x04', r.status === 200 && bytes?.length === 65 && bytes[0] === 4, `${r.status}, ${chave?.length} caracteres, ${bytes?.length} bytes, prefixo 0x${bytes?.[0]?.toString(16).padStart(2, '0')}`)
  }

  // ----------------------------------------------------------- subscribe, status, events, unsubscribe (conta A)
  const ep1 = endpoint('um')
  const k1 = await chaves()
  {
    const st0 = await chamar('status', adminA.token, { endpoint: ep1 })
    registra('status de um endereço desconhecido ⇒ subscribed false', st0.status === 200 && st0.json.subscribed === false, `${st0.status} ${JSON.stringify(st0.json)}`)
    const sub = await chamar('subscribe', adminA.token, { endpoint: ep1, keys: k1 })
    const l = await linhaDe(ep1)
    registra('subscribe (dono novo) ⇒ 200, a linha da conta A com os quatro eventos', sub.status === 200 && igual(sub.json.events, OS_QUATRO) && l?.user_id === adminA.id && igual(l?.events, OS_QUATRO), `${sub.status} ${JSON.stringify(sub.json)}; linha ${l ? 'da conta A' : 'ausente'}, ${JSON.stringify(l?.events)}`)
    const st1 = await chamar('status', adminA.token, { endpoint: ep1 })
    registra('status do endereço inscrito ⇒ subscribed true com os quatro', st1.status === 200 && st1.json.subscribed === true && igual(st1.json.events, OS_QUATRO), `${st1.status} ${JSON.stringify(st1.json)}`)
    const ev = await chamar('events', adminA.token, { endpoint: ep1, events: ['owner_order_paid'] })
    registra('events com um subconjunto válido ⇒ 200 e gravado', ev.status === 200 && igual(ev.json.events, ['owner_order_paid']) && igual((await linhaDe(ep1))?.events, ['owner_order_paid']), `${ev.status} ${JSON.stringify(ev.json)}`)
    const evMal = await chamar('events', adminA.token, { endpoint: ep1, events: ['owner_order_paid', 'pix_created'] })
    registra('events com evento fora dos quatro ⇒ 400, nada gravado', evMal.status === 400 && igual((await linhaDe(ep1))?.events, ['owner_order_paid']), `${evMal.status} ${JSON.stringify(evMal.json)}`)
    const sub2 = await chamar('subscribe', adminA.token, { endpoint: ep1, keys: k1 })
    registra('subscribe de novo, MESMO dono ⇒ os eventos escolhidos ficam', sub2.status === 200 && igual(sub2.json.events, ['owner_order_paid']), `${sub2.status} ${JSON.stringify(sub2.json)}`)
    const malHost = await chamar('subscribe', adminA.token, { endpoint: 'https://exemplo.invalid/push/P79-x', keys: k1 })
    const malHttp = await chamar('subscribe', adminA.token, { endpoint: 'http://fcm.googleapis.com/fcm/send/P79-x', keys: k1 })
    const malChave = await chamar('subscribe', adminA.token, { endpoint: endpoint('chave'), keys: { p256dh: k1.p256dh.slice(0, 40), auth: k1.auth } })
    registra('subscribe com host fora da lista, http: ou chave curta ⇒ 400, nada gravado', [malHost, malHttp, malChave].every((r) => r.status === 400) && (await daConta(adminA.id)) === 1, `${malHost.status} ${malHost.json?.error} · ${malHttp.status} ${malHttp.json?.error} · ${malChave.status} ${malChave.json?.error}; a conta A segue com ${await daConta(adminA.id)} linha`)
    for (const r of [st0, sub, st1, ev, evMal, sub2]) semEco(r, [ep1])
  }

  // ----------------------------------------------------------- a troca de dono do mesmo endereço (MAN-27)
  {
    const sub = await chamar('subscribe', adminB.token, { endpoint: ep1, keys: k1 })
    const l = await linhaDe(ep1)
    const stA = await chamar('status', adminA.token, { endpoint: ep1 })
    const evA = await chamar('events', adminA.token, { endpoint: ep1, events: [] })
    registra(
      'troca de dono: a conta B inscreve o endereço da A ⇒ a linha passa a B, os eventos voltam aos quatro, e a A não o vê mais',
      sub.status === 200 && l?.user_id === adminB.id && igual(l?.events, OS_QUATRO) && stA.json?.subscribed === false && evA.status === 404,
      `subscribe B ${sub.status} ${JSON.stringify(sub.json)}; linha da ${l?.user_id === adminB.id ? 'conta B' : '?'}; status A ${JSON.stringify(stA.json)}; events A ${evA.status} ${evA.json?.error}; linhas no endereço: ${(await sql`select count(*)::int as n from public.push_subscriptions where endpoint = ${ep1}`)[0].n}`,
    )
    semEco(sub, [ep1])
  }

  // ----------------------------------------------------------- unsubscribe (existente e ausente)
  {
    const u1 = await chamar('unsubscribe', adminB.token, { endpoint: ep1 })
    const u2 = await chamar('unsubscribe', adminB.token, { endpoint: ep1 })
    registra('unsubscribe existente ⇒ 200 e a linha some; ausente ⇒ 200 também', u1.status === 200 && u2.status === 200 && (await linhaDe(ep1)) === null, `${u1.status} ${JSON.stringify(u1.json)} · ${u2.status} ${JSON.stringify(u2.json)}; linha ${(await linhaDe(ep1)) ? 'presente' : 'ausente'}`)
  }

  // ----------------------------------------------------------- o despejo da 11ª (MAN-28)
  {
    const eps: string[] = []
    for (let i = 1; i <= 10; i++) {
      const ep = endpoint(`dez${String(i).padStart(2, '0')}`)
      eps.push(ep)
      await chamar('subscribe', adminA.token, { endpoint: ep, keys: await chaves() })
    }
    // O usado há mais tempo é o QUINTO, não o primeiro: prova que o critério é `last_used_at`, não a
    // ordem de criação.
    await sql`update public.push_subscriptions set last_used_at = now() - interval '1 hour' where endpoint = ${eps[4]}`
    const dez = await daConta(adminA.id)
    const ep11 = endpoint('onze')
    const r = await chamar('subscribe', adminA.token, { endpoint: ep11, keys: await chaves() })
    const restam = (await sql`select endpoint from public.push_subscriptions where user_id = ${adminA.id}`).map((l: any) => l.endpoint as string)
    registra(
      'a 11ª inscrição despeja a usada há mais tempo (o 5º endereço, por last_used_at), e a conta fica com 10',
      r.status === 200 && dez === 10 && restam.length === 10 && !restam.includes(eps[4]) && restam.includes(eps[0]) && restam.includes(ep11),
      `antes ${dez}; subscribe ${r.status}; depois ${restam.length}; o 5º ${restam.includes(eps[4]) ? 'ficou' : 'saiu'}; o 1º ${restam.includes(eps[0]) ? 'ficou' : 'saiu'}; a 11ª ${restam.includes(ep11) ? 'entrou' : 'faltou'}`,
    )
    // Limpa a conta A para o teste começar só com dois endereços.
    await sql`delete from public.push_subscriptions where user_id = ${adminA.id}`
  }

  // ----------------------------------------------------------- test: o FCM de verdade, contra um endereço sintético
  const epT1 = endpoint('teste1')
  const epT2 = endpoint('teste2')
  {
    await chamar('subscribe', adminA.token, { endpoint: epT1, keys: await chaves() })
    await chamar('subscribe', adminA.token, { endpoint: epT2, keys: await chaves() })
    const ausente = await chamar('test', adminA.token, { endpoint: endpoint('ninguem') })
    registra('test de um endereço sem linha da conta ⇒ 404, e o teto de 30 s NÃO consumido', ausente.status === 404 && (await tetoDe(adminA.id)) === null, `${ausente.status} ${JSON.stringify(ausente.json)}`)

    const t0 = Date.now()
    const t = await chamar('test', adminA.token, { endpoint: epT1 })
    const ms = Date.now() - t0
    const depois = await linhaDe(epT1)
    console.log(`     desfecho do FCM: HTTP da porta ${t.status} ${JSON.stringify(t.json)} em ${ms} ms; a linha ${depois ? 'ficou' : 'foi APAGADA'}; o teto da conta ${(await tetoDe(adminA.id)) ? 'gravado' : 'nulo'}`)
    const coerente =
      (t.status === 410 && depois === null) || (t.status === 502 && depois !== null) || (t.status === 200 && depois !== null)
    registra('test contra o FCM real (endereço sintético) ⇒ um desfecho da porta coerente com o que aconteceu à linha', coerente, `${t.status} ${t.json?.error ?? 'ok'}; linha ${depois ? 'mantida' : 'apagada'}`)
    semEco(t, [epT1])

    // O ACHADO da primeira execução, agora passo: o teto morava na LINHA do aparelho testado, e a linha
    // apagada pelo "gone" o levava junto (o teste seguinte noutro aparelho saía: 410 em vez de 429).
    // Desde o conserto o teto é da CONTA (`push_test_claims`), e sobrevive à linha.
    const t2 = await chamar('test', adminA.token, { endpoint: epT2 })
    registra(
      'test de OUTRO aparelho logo depois do testado (apagado se gone) ⇒ 429 cooldown: o teto é da conta',
      t2.status === 429 && t2.json?.error === 'cooldown',
      `primeiro ${t.status} (linha ${depois ? 'mantida' : 'apagada'}) · segundo ${t2.status} ${JSON.stringify(t2.json)}; a linha de epT2 ${(await linhaDe(epT2)) ? 'ficou, sem envio' : 'foi apagada'}`,
    )
    semEco(t2, [epT2])

    // O teto com a linha AINDA viva: dois testes simultâneos em dois aparelhos da conta. O primeiro
    // grava o teto da conta e vai ao FCM (~0,5 s); o segundo, 150 ms depois, encontra o teto gravado.
    const epT3 = endpoint('teste3')
    const epT4 = endpoint('teste4')
    await chamar('subscribe', adminA.token, { endpoint: epT3, keys: await chaves() })
    await chamar('subscribe', adminA.token, { endpoint: epT4, keys: await chaves() })
    await sql`delete from public.push_test_claims where user_id = ${adminA.id}`
    const primeiro = chamar('test', adminA.token, { endpoint: epT3 })
    await new Promise((r) => setTimeout(r, 150))
    const segundo = await chamar('test', adminA.token, { endpoint: epT4 })
    const p = await primeiro
    registra(
      'test de OUTRO aparelho da mesma conta com o testado ainda inscrito ⇒ 429 cooldown (o teto é por conta)',
      segundo.status === 429 && segundo.json?.error === 'cooldown' && p.status !== 429,
      `primeiro ${p.status} ${JSON.stringify(p.json)} · segundo ${segundo.status} ${JSON.stringify(segundo.json)}; a linha do segundo ${(await linhaDe(epT4)) ? 'ficou, sem envio' : 'sumiu'}`,
    )
    semEco(segundo, [epT4])
    semEco(p, [epT3])

    const pedidos = await sql`select count(*)::int as n from public.order_notifications`
    registra('o test não escreve em order_notifications', pedidos[0].n === ANTES.order_notifications, `${ANTES.order_notifications} → ${pedidos[0].n}`)
  }

  registra('nenhum corpo de resposta ecoou um endpoint', ecoou.length === 0, ecoou.length === 0 ? 'nenhum' : ecoou.join(', '))
} finally {
  // ----------------------------------------------------------- fixturas fora
  await sql`delete from public.push_subscriptions where user_id = any(${criadas}::uuid[])`
  await sql`delete from public.push_subscriptions where endpoint like 'https://fcm.googleapis.com/fcm/send/P79-%'`
  await sql`delete from public.user_roles where user_id = any(${criadas}::uuid[])`
  await sql`delete from public.customers where user_id = any(${criadas}::uuid[])`
  for (const id of criadas) {
    await fetch(`${API}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}` } })
  }
  const DEPOIS = await contagens()
  console.log(`contagens depois: ${JSON.stringify(DEPOIS)}`)
  registra('fixturas P79- apagadas: contagens iguais às de antes', igual(ANTES, DEPOIS), `${JSON.stringify(ANTES)} → ${JSON.stringify(DEPOIS)}`)
  await sql.end()
}

const falhas = resultados.filter((r) => !r.ok)
console.log(falhas.length === 0 ? 'TODOS OS PASSOS OK' : `${falhas.length} PASSO(S) FALHARAM`)
Deno.exit(falhas.length === 0 ? 0 : 1)
