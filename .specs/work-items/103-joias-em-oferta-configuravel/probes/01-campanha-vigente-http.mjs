// Probe HTTP contra o PostgREST LOCAL (API 54441): o embed da loja pelas views da vigência, com o
// token de uma sessão de admin (WI 103, tarefa 01, UC-06 / CA-06.1). Só leitura — nada é gravado.
//
//   node .specs/work-items/103-joias-em-oferta-configuravel/probes/01-campanha-vigente-http.mjs
//
// Lê a URL, a chave anônima e o segredo do JWT de `supabase status -o json` (o projeto local). O
// token de admin é assinado aqui, com `sub` = a conta `admin@umaestrelinha.dev` (lida do banco local
// por `psql` na 54442) e `role` = `authenticated` — a mesma sessão que a loja manda com a dona logada.
// Cada verificação imprime `ok — …`; a primeira que não bate sai com código 1. Nunca aponte para
// ambiente remoto.

import { createHmac } from 'node:crypto'
import { execFileSync } from 'node:child_process'

const falha = msg => {
  console.error(`FALHA — ${msg}`)
  process.exit(1)
}
const ok = msg => console.log(`ok — ${msg}`)

const status = JSON.parse(execFileSync('supabase', ['status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))
const API = status.API_URL
if (!/^http:\/\/(127\.0\.0\.1|localhost):54441$/.test(API)) falha(`API fora do local: ${API}`)

const adminId = execFileSync(
  'psql',
  ['-h', '127.0.0.1', '-p', '54442', '-U', 'postgres', '-d', 'postgres', '-At', '-c', "select id from auth.users where email = 'admin@umaestrelinha.dev'"],
  { encoding: 'utf8', env: { ...process.env, PGPASSWORD: 'postgres' } },
).trim()
if (!adminId) falha('sem a conta de admin no banco local')

const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url')
const assinar = payload => {
  const corpo = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`
  return `${corpo}.${createHmac('sha256', status.JWT_SECRET).update(corpo).digest('base64url')}`
}
const agora = Math.floor(Date.now() / 1000)
const TOKEN_ADMIN = assinar({ sub: adminId, role: 'authenticated', aud: 'authenticated', iat: agora, exp: agora + 600 })

const get = async (caminho, token) => {
  const r = await fetch(`${API}/rest/v1/${caminho}`, {
    headers: { apikey: status.ANON_KEY, Authorization: `Bearer ${token ?? status.ANON_KEY}` },
  })
  const corpo = await r.json()
  return { status: r.status, corpo }
}

// O embed da marcação, como a loja o pede (`PRODUCT_CAMPAIGNS_EMBED`), e o recorte da vitrine.
const EMBED = 'product_campaigns:live_product_campaigns(percent,campaigns(id,name,badge_text,band_color,accent_color,ends_at))'

// A referência: o que o VISITANTE vê da tabela crua é a vigência decidida pelo banco (policy pública).
const publica = await get('campaigns?select=id')
if (publica.status !== 200) falha(`leitura pública de campaigns respondeu ${publica.status}`)
const VIGENTES = new Set(publica.corpo.map(c => c.id))
if (VIGENTES.size !== 1) falha(`esperada uma campanha em vigência no banco local, há ${VIGENTES.size}`)

// O defeito, refeito pelo HTTP: a sessão de admin, na tabela crua, vê mais que a vigente.
const crua = await get('campaigns?select=id', TOKEN_ADMIN)
if (crua.status !== 200) falha(`campaigns como admin respondeu ${crua.status}`)
if (crua.corpo.length <= VIGENTES.size) falha('a sessão de admin não viu campanha fora da vigência: o token não é de admin, ou o defeito não se reproduz')
ok(`antes: com o token de admin, \`campaigns\` cru entrega ${crua.corpo.length} campanhas (a vigente é ${VIGENTES.size})`)

// O defeito no embed de produto: com o token de admin, a marcação crua traz campanha fora da vigência.
// Sem isso, a checagem do embed novo abaixo passaria também com o embed antigo (prova vazia).
const embedCru = await get('products?select=id,product_campaigns(percent,campaigns(id))&limit=5000', TOKEN_ADMIN)
if (embedCru.status !== 200) falha(`products com o embed cru respondeu ${embedCru.status}: ${JSON.stringify(embedCru.corpo)}`)
const foraCru = embedCru.corpo.flatMap(p => p.product_campaigns ?? []).filter(m => !m.campaigns || !VIGENTES.has(m.campaigns.id))
if (foraCru.length === 0) falha('o embed cru com o token de admin não trouxe marcação fora da vigência: o defeito não se reproduz com os dados do banco local, e a prova do embed novo seria vazia')
ok(`antes: com o token de admin, o embed cru \`product_campaigns(...)\` traz ${foraCru.length} marcações de campanha fora da vigência (o defeito)`)

// `live_campaigns` com os percentuais, como `useLiveCampaign` pede.
const viva = await get('live_campaigns?select=id,name,badge_text,band_color,accent_color,ends_at,campaign_percents(percent)', TOKEN_ADMIN)
if (viva.status !== 200) falha(`live_campaigns respondeu ${viva.status}: ${JSON.stringify(viva.corpo)}`)
if (viva.corpo.length !== 1 || !VIGENTES.has(viva.corpo[0].id)) falha(`live_campaigns entregou ${JSON.stringify(viva.corpo.map(c => c.id))}`)
if (!Array.isArray(viva.corpo[0].campaign_percents) || viva.corpo[0].campaign_percents.length === 0) falha('os percentuais não vieram embutidos')
ok(`depois: com o token de admin, \`live_campaigns\` entrega só a vigente, com ${viva.corpo[0].campaign_percents.length} percentuais embutidos (200, sem PGRST200/201)`)

// O embed de produto, com o token de admin.
const produtos = await get(`products?select=id,is_active,${EMBED}&limit=5000`, TOKEN_ADMIN)
if (produtos.status !== 200) falha(`products com o embed respondeu ${produtos.status}: ${JSON.stringify(produtos.corpo)}`)
const marcas = produtos.corpo.flatMap(p => p.product_campaigns ?? [])
if (marcas.length === 0) falha('nenhuma marcação embutida: a prova seria vazia')
const fora = marcas.filter(m => !m.campaigns || !VIGENTES.has(m.campaigns.id))
if (fora.length) falha(`o embed com o token de admin trouxe marcação fora da vigência: ${JSON.stringify(fora)}`)
ok(`depois: com o token de admin, \`products\` com \`live_product_campaigns\` embutido responde 200 e as ${marcas.length} marcações são da vigente`)

// O recorte `!inner` da vitrine `/ofertas`.
const campanha = [...VIGENTES][0]
const vitrine = await get(`products?select=id,${EMBED},oferta:live_product_campaigns!inner(campaign_id)&oferta.campaign_id=eq.${campanha}&limit=5000`, TOKEN_ADMIN)
if (vitrine.status !== 200) falha(`o recorte da vitrine respondeu ${vitrine.status}: ${JSON.stringify(vitrine.corpo)}`)
if (vitrine.corpo.length === 0) falha('o recorte da vitrine veio vazio')
ok(`o recorte \`oferta:live_product_campaigns!inner\` da vitrine responde 200 com ${vitrine.corpo.length} peças`)

// Para o visitante, o embed novo entrega as mesmas marcações que o antigo.
const antigo = await get('products?select=id,product_campaigns(percent,campaigns(id))&limit=5000')
const novo = await get(`products?select=id,${EMBED}&limit=5000`)
if (antigo.status !== 200 || novo.status !== 200) falha(`visitante: ${antigo.status} / ${novo.status}`)
const chave = corpo => JSON.stringify(corpo.flatMap(p => (p.product_campaigns ?? []).map(m => `${p.id}:${m.percent}:${m.campaigns?.id}`)).sort())
if (chave(antigo.corpo) !== chave(novo.corpo)) falha('para o visitante, o embed novo entrega outras marcações que o antigo')
ok(`para o visitante, o embed novo entrega as mesmas ${JSON.parse(chave(novo.corpo)).length} marcações que a tabela crua`)
