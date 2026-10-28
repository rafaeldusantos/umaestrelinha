// Probe 01 da feature 84 — a function `seo-suggest` LOCAL contra a Claude API real (claude-haiku-5-5).
//
// Só ambiente local: Supabase em http://127.0.0.1:54441 e a function servida por
//   supabase functions serve seo-suggest --env-file .env      (o .env da raiz tem ANTHROPIC_API_KEY)
//
// Uso (as credenciais vêm do ambiente, nunca do arquivo):
//   SUPA_URL=http://127.0.0.1:54441 SUPA_KEY=<publishable> ADMIN_EMAIL=… ADMIN_PASS=… \
//   node .specs/features/84-seo-do-produto-com-ia/probes/01-api-real.mjs <saida.json>
//
// Escolhe 5 produtos ativos com descrição (preferindo os que têm relacionados e material), chama a
// function com o MESMO corpo que o painel monta, e confere cada 200 de forma independente da régua
// do servidor: tamanhos, emoji, "!", marca, igualdade com o nome. Mede a duração de cada chamada.

import { writeFileSync } from 'node:fs'

const { SUPA_URL, SUPA_KEY, ADMIN_EMAIL, ADMIN_PASS } = process.env
const saida = process.argv[2]
if (!SUPA_URL?.startsWith('http://127.0.0.1')) throw new Error('SUPA_URL tem de ser o Supabase LOCAL')

const json = async r => ({ status: r.status, body: await r.json().catch(() => null) })

const login = await json(
  await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: SUPA_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  }),
)
if (login.status !== 200) throw new Error(`login local falhou: ${login.status}`)
const jwt = login.body.access_token
const h = { apikey: SUPA_KEY, Authorization: `Bearer ${jwt}` }

const rest = async path => json(await fetch(`${SUPA_URL}/rest/v1/${path}`, { headers: h }))

const cand = await rest(
  'products?select=id,name,description,requires_material,related_product_ids,seo_title,seo_description' +
    '&is_active=eq.true&description=not.is.null&order=updated_at.desc&limit=200',
)
const lista = (cand.body ?? []).filter(p => (p.description ?? '').length > 200)
const comRel = lista.filter(p => (p.related_product_ids ?? []).length > 0)
const comMat = lista.filter(p => p.requires_material && !comRel.includes(p))
const semMat = lista.filter(p => !p.requires_material && !comRel.includes(p))
const escolhidos = [...comRel.slice(0, 2), ...comMat.slice(0, 2), ...semMat.slice(0, 1)]
while (escolhidos.length < 5 && lista.length > escolhidos.length) {
  const p = lista.find(x => !escolhidos.includes(x))
  escolhidos.push(p)
}

const EMOJI = /\p{Extended_Pictographic}/u
const MARCA = /uma\s+estrelinha|\|\s*UE\s*$/i
const dobrar = t => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

const resultados = []
for (const p of escolhidos) {
  const cats = await rest(`product_categories?select=category_id&product_id=eq.${p.id}`)
  const corpo = {
    productId: p.id,
    name: p.name,
    description: p.description ?? '',
    categoryIds: (cats.body ?? []).map(c => c.category_id).slice(0, 10),
    relatedIds: (p.related_product_ids ?? []).slice(0, 20),
    requiresMaterial: p.requires_material === true,
  }
  const t0 = performance.now()
  const r = await json(
    await fetch(`${SUPA_URL}/functions/v1/seo-suggest`, {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    }),
  )
  const ms = Math.round(performance.now() - t0)
  const s = r.status === 200 ? r.body : null
  const checagem = s
    ? {
        tituloLen: s.title.length,
        tituloComMarcaLen: `${s.title} | Uma Estrelinha`.length,
        descricaoLen: s.description.length,
        tituloOk: s.title.length > 0 && s.title.length <= 43,
        descricaoOk: s.description.length >= 140 && s.description.length <= 160,
        semEmoji: !EMOJI.test(s.title + s.description),
        semExclamacao: !(s.title + s.description).includes('!'),
        semMarcaNoTitulo: !MARCA.test(s.title),
        diferenteDoNome: dobrar(s.title) !== dobrar(p.name),
      }
    : null
  resultados.push({
    produto: { id: p.id, nome: p.name, requiresMaterial: corpo.requiresMaterial, relacionados: corpo.relatedIds.length, categorias: corpo.categoryIds.length },
    seoCurado: { title: p.seo_title, description: p.seo_description },
    status: r.status,
    ms,
    resposta: r.body,
    checagem,
  })
  console.log(`${r.status} ${ms}ms ${p.name}`)
}

const tempos = resultados.map(r => r.ms).sort((a, b) => a - b)
const p95 = tempos[Math.min(tempos.length - 1, Math.ceil(0.95 * tempos.length) - 1)]
const resumo = {
  quando: new Date().toISOString(),
  chamadas: resultados.length,
  ok200: resultados.filter(r => r.status === 200).length,
  todasDentroDaRegua: resultados.every(r => r.checagem && Object.entries(r.checagem).every(([k, v]) => !k.endsWith('Ok') && !k.startsWith('sem') && k !== 'diferenteDoNome' ? true : v === true)),
  msMin: tempos[0],
  msMax: tempos[tempos.length - 1],
  p95,
}
writeFileSync(saida, JSON.stringify({ resumo, resultados }, null, 2))
console.log(JSON.stringify(resumo))
