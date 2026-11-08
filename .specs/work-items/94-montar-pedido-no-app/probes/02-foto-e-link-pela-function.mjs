// WI 94 · tarefa 02 (lado function) — o handler REAL da `order-proposals` contra o PostgREST LOCAL.
//
//   SERVICE_ROLE_KEY="$(supabase status -o json | jq -r .SERVICE_ROLE_KEY)" \
//     node .specs/work-items/94-montar-pedido-no-app/probes/02-foto-e-link-pela-function.mjs
//
// Importa `supabase/functions/order-proposals/handlers.ts` (o Node 24 tira os tipos) e o chama com o
// supabase-js de verdade apontado para 127.0.0.1:54441 — nunca outro host. Só `auth.getUser` é
// trocado (não há JWT de navegador aqui): ele devolve uma conta admin real do banco local, e o
// `has_role` roda de verdade.
//
// Prova, sem dublê:
//   - a leitura `capa:images->0->>url` funciona no PostgREST real, e a peça sem foto na variação e na
//     coluna antiga grava na linha a primeira foto da galeria;
//   - `save_address: true` põe o endereço na ficha;
//   - com a chave, a cifra é gravada e o `get` devolve o token (e não a cifra nem o hash).
// Tudo o que grava é apagado no fim. Exit 0 e só `ok —`.

import { createClient } from '@supabase/supabase-js'
import { route } from '../../../../supabase/functions/order-proposals/handlers.ts'
import { createTokenCipher } from '../../../../supabase/functions/_shared/tokenCipher.ts'

const URL_LOCAL = 'http://127.0.0.1:54441'
const KEY = process.env.SERVICE_ROLE_KEY ?? ''
if (!KEY) throw new Error('SERVICE_ROLE_KEY ausente')

const db = createClient(URL_LOCAL, KEY, { auth: { autoRefreshToken: false, persistSession: false } })

const confere = (ok, oQue) => {
  if (!ok) throw new Error(`PROBE FALHOU: ${oQue}`)
  console.log(`ok — ${oQue}`)
}

// Uma conta admin do banco local (o `has_role` da function confere de verdade).
const { data: papeis, error: erroPapel } = await db.from('user_roles').select('user_id').eq('role', 'admin').limit(1)
if (erroPapel || !papeis?.length) throw new Error('nenhuma conta admin no banco local')
const ADMIN = papeis[0].user_id

const supabase = new Proxy(db, {
  get(alvo, prop) {
    if (prop === 'auth') {
      return new Proxy(alvo.auth, {
        get(a, p) {
          if (p === 'getUser') return async () => ({ data: { user: { id: ADMIN } }, error: null })
          return Reflect.get(a, p)
        },
      })
    }
    const v = Reflect.get(alvo, prop)
    return typeof v === 'function' ? v.bind(alvo) : v
  },
})

const chave = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64')
const tokenCipher = await createTokenCipher(chave)
const deps = { supabase, now: () => Date.now(), tokenCipher }

const pedir = async (action, body) => {
  const res = await route(
    deps,
    new Request(`http://local/order-proposals?action=${action}`, {
      method: 'POST',
      headers: { Authorization: 'Bearer probe' },
      body: JSON.stringify(body),
    }),
  )
  return { status: res.status, texto: await res.text() }
}

// A peça: sem foto na coluna antiga, com galeria, e uma variação ativa sem foto e sem gravação.
const { data: candidatas, error: erroPecas } = await db
  .from('products')
  .select('id, image_url, capa:images->0->>url, product_variants(id, image_url, is_active, option_values)')
  .eq('is_active', true)
  .is('image_url', null)
  .not('images', 'eq', '[]')
  .limit(50)
if (erroPecas) throw new Error(`leitura das peças: ${erroPecas.message}`)
const peca = (candidatas ?? []).find(
  (p) =>
    p.capa &&
    (p.product_variants ?? []).some((v) => v.is_active !== false && !v.image_url && Object.keys(v.option_values ?? {}).length === 0),
)
if (!peca) throw new Error('nenhuma peça local sem foto na variação e na coluna antiga, com galeria')
const variacao = peca.product_variants.find(
  (v) => v.is_active !== false && !v.image_url && Object.keys(v.option_values ?? {}).length === 0,
)
const { data: galeria } = await db.from('products').select('images').eq('id', peca.id).single()
const primeiraDaGaleria = galeria.images[0].url
confere(peca.capa === primeiraDaGaleria, 'o PostgREST real resolve `capa:images->0->>url` para a primeira foto da galeria')

const EMAIL = `probe94.foto.${Date.now()}@exemplo.invalid`
const corpo = (extra) => ({
  idempotency_key: `probe94-foto-${Date.now()}`,
  customer_name: 'Cliente Probe Foto',
  customer_email: EMAIL,
  address_zip: '91240-010',
  address_street: 'Rua da Probe',
  address_number: '7',
  address_neighborhood: 'Centro',
  address_city: 'Porto Alegre',
  address_state: 'RS',
  save_address: true,
  lines: [{ product_id: peca.id, variant_id: variacao.id, quantity: 1 }],
  ...extra,
})

let propostaId = null
let fichaId = null
try {
  // O total que o servidor calcula volta no 409; a segunda chamada vai com ele.
  const primeira = await pedir('save', corpo({ expected_total: 0 }))
  confere(primeira.status === 409, 'save com total errado ⇒ 409 prices_changed (o preço é do banco)')
  const total = JSON.parse(primeira.texto).summary.items_total
  const salvo = await pedir('save', corpo({ expected_total: total }))
  confere(salvo.status === 200, `save grava (status ${salvo.status})`)
  const r = JSON.parse(salvo.texto)
  propostaId = r.id
  fichaId = r.customer_id

  const { data: linhas } = await db.from('order_proposal_items').select('product_image').eq('proposal_id', propostaId)
  confere(linhas?.length === 1 && linhas[0].product_image === primeiraDaGaleria,
    'a linha da peça sem foto na variação grava a primeira da galeria (images[0])')

  const { data: prop } = await db.from('order_proposals').select('token_hash, token_cipher').eq('id', propostaId).single()
  confere(typeof prop.token_cipher === 'string' && (await tokenCipher.decrypt(prop.token_cipher)) === r.token,
    'com a chave, a cifra gravada decifra o token da resposta')

  const { data: enderecos } = await db.from('addresses').select('street, cep').eq('customer_id', fichaId)
  confere(enderecos?.length === 1 && enderecos[0].street === 'Rua da Probe' && enderecos[0].cep === '91240010',
    'save_address: o endereço foi para a ficha, pela própria gravação')

  const lido = await pedir('get', { id: propostaId })
  const g = JSON.parse(lido.texto)
  confere(lido.status === 200 && g.token === r.token && g.actions.renew === false,
    'o get devolve o token da proposta aberta, e ela não renova')
  confere(!lido.texto.includes(prop.token_cipher) && !lido.texto.includes(prop.token_hash),
    'a resposta do get não leva a cifra nem o hash')

  const renovar = await pedir('renew', { id: propostaId })
  confere(renovar.status === 409, 'renovar a aberta com link disponível é recusado')
} finally {
  if (propostaId) {
    await db.from('order_proposal_events').delete().eq('proposal_id', propostaId)
    await db.from('order_proposal_items').delete().eq('proposal_id', propostaId)
    await db.from('order_proposals').delete().eq('id', propostaId)
  }
  if (fichaId) {
    await db.from('addresses').delete().eq('customer_id', fichaId)
    await db.from('customers').delete().eq('id', fichaId).eq('email', EMAIL)
  }
  const { count } = await db.from('customers').select('id', { count: 'exact', head: true }).eq('email', EMAIL)
  confere((count ?? 0) === 0, 'limpeza: nada da probe ficou no banco local')
}
