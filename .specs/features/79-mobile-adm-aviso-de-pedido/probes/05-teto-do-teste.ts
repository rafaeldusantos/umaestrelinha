// Feature 79, conserto do probe da T26 — o teto de 30 s do aviso de teste é da CONTA, e sobrevive à
// linha do aparelho testado sumir (`MAN-33`, `MAN-31`/`MAN-35`).
//
// Roda com (a URL do banco vem de `supabase status -o env`, nunca escrita aqui):
//   eval "$(supabase status -o env | grep -E '^DB_URL=')"
//   DB_URL=$DB_URL deno run --no-lock --node-modules-dir=none --allow-net --allow-env --allow-read --allow-sys 05-teto-do-teste.ts
//
// O defeito que o probe 03 mediu: o teto morava em `push_subscriptions.last_test_at`, na linha do
// aparelho testado; quando o serviço de push responde "gone", a porta apaga essa linha e o teto some
// junto — o teste seguinte noutro aparelho da mesma conta saía na hora (410/200 em vez de 429).
//
// O probe fala SÓ com a RPC `claim_push_test` e com `push_subscriptions` (o que a porta faz), sem
// citar onde o teto mora — por isso ele roda igual contra a regra antiga e contra a nova, e é a mesma
// régua que reprova uma e aprova a outra.
//
// Fixturas com prefixo `P79-` (contas `p79-…@exemplo.invalid`, endpoints `…/P79-…`), APAGADAS no fim;
// as contagens são conferidas antes e depois.

import postgres from 'npm:postgres@3.4.4'

const DB = Deno.env.get('DB_URL')
if (!DB) throw new Error('env DB_URL ausente')
const sql = postgres(DB, { max: 2, onnotice: () => {} })

const resultados: { passo: string; ok: boolean; detalhe: string }[] = []
const registra = (passo: string, ok: boolean, detalhe: string) => {
  resultados.push({ passo, ok, detalhe })
  console.log(`${ok ? 'ok  ' : 'FALHOU'} — ${passo}: ${detalhe}`)
}

const contagens = async () => {
  const [l] = await sql`
    select (select count(*) from public.orders)::int as orders,
           (select count(*) from public.order_notifications)::int as order_notifications,
           (select count(*) from public.push_subscriptions)::int as push_subscriptions,
           (select count(*) from auth.users)::int as auth_users,
           (select count(*) from public.customers)::int as customers`
  // A tabela do teto só existe na regra nova; contada quando existe.
  const [t] = await sql`select to_regclass('public.push_test_claims') is not null as existe`
  if (!t.existe) return { ...l, push_test_claims: 'ausente' }
  const [c] = await sql`select count(*)::int as n from public.push_test_claims`
  return { ...l, push_test_claims: c.n }
}

const ANTES = await contagens()
console.log(`contagens antes: ${JSON.stringify(ANTES)}`)

const criarConta = async (rotulo: string): Promise<string> => {
  const [u] = await sql`
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
    values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
            ${`p79-teto-${rotulo}-${crypto.randomUUID().slice(0, 8)}@exemplo.invalid`}, '', now(), now(), '{}'::jsonb, '{}'::jsonb)
    returning id`
  return u.id
}
const b64url = (b: Uint8Array): string =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const ponto = () => b64url(new Uint8Array([4, ...crypto.getRandomValues(new Uint8Array(64))]))
const segredo = () => b64url(crypto.getRandomValues(new Uint8Array(16)))
const endpoint = (rotulo: string) => `https://fcm.googleapis.com/fcm/send/P79-teto-${rotulo}-${crypto.randomUUID().slice(0, 8)}`
const inscrever = async (conta: string, ep: string) =>
  sql`insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values (${conta}, ${ep}, ${ponto()}, ${segredo()})`
const claim = async (conta: string, ep: string): Promise<boolean> => {
  const [r] = await sql`select public.claim_push_test(${conta}, ${ep}) as ok`
  return r.ok
}

try {
  // ----------------------------------------------------------- O DEFEITO: a linha testada some ("gone")
  const contaA = await criarConta('a')
  const epA = endpoint('a')
  const epB = endpoint('b')
  await inscrever(contaA, epA)
  await inscrever(contaA, epB)

  const primeiro = await claim(contaA, epA)
  // O que a porta faz quando o serviço de push responde "gone" (`MAN-35`): apaga a linha testada.
  await sql`delete from public.push_subscriptions where endpoint = ${epA}`
  const segundo = await claim(contaA, epB)
  registra(
    'aparelho A testado e apagado (gone); teste em B da MESMA conta dentro de 30 s ⇒ false (429 na porta)',
    primeiro === true && segundo === false,
    `A=${primeiro} · (linha de A apagada) · B=${segundo}`,
  )

  // ----------------------------------------------------------- o teto vale também com a linha viva
  const contaB = await criarConta('b')
  const epB1 = endpoint('b1')
  const epB2 = endpoint('b2')
  await inscrever(contaB, epB1)
  await inscrever(contaB, epB2)
  const b1 = await claim(contaB, epB1)
  const b2 = await claim(contaB, epB2)
  registra('com as duas linhas vivas: o 1º true, o 2º (outro aparelho, mesma conta) false', b1 === true && b2 === false, `B1=${b1} · B2=${b2}`)

  // ----------------------------------------------------------- endpoint que não é da conta não consome o teto
  const contaC = await criarConta('c')
  const epC = endpoint('c')
  await inscrever(contaC, epC)
  const alheio = await claim(contaC, epB1) // endereço da conta B
  const proprio = await claim(contaC, epC)
  registra(
    'endpoint de OUTRA conta ⇒ false sem consumir o teto; o da própria conta logo depois ⇒ true',
    alheio === false && proprio === true,
    `alheio=${alheio} · próprio=${proprio}`,
  )

  // ----------------------------------------------------------- conta sem nenhuma linha
  const contaD = await criarConta('d')
  const semLinha = await claim(contaD, endpoint('d'))
  registra('conta sem inscrição nenhuma ⇒ false', semLinha === false, String(semLinha))
} finally {
  await sql`delete from public.push_subscriptions where endpoint like '%/P79-teto-%'`
  await sql`delete from public.customers where email like 'p79-teto-%@exemplo.invalid'`
  await sql`delete from auth.users where email like 'p79-teto-%@exemplo.invalid'`
  const DEPOIS = await contagens()
  console.log(`contagens depois: ${JSON.stringify(DEPOIS)}`)
  registra('fixturas P79- apagadas: contagens iguais às de antes', JSON.stringify(DEPOIS) === JSON.stringify(ANTES), `${JSON.stringify(ANTES)} → ${JSON.stringify(DEPOIS)}`)
  await sql.end()
}

const falhas = resultados.filter((r) => !r.ok)
console.log(falhas.length === 0 ? 'TODOS OS PASSOS OK' : `${falhas.length} PASSO(S) FALHARAM`)
Deno.exit(falhas.length === 0 ? 0 : 1)
