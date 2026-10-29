// Feature 86, T13 — probe da gravação do documento do menu contra o Supabase LOCAL.
//
// Prova pelo PostgREST de verdade (RLS, gatilho de `updated_at`, `has_role`) o que o dublê do
// `useStoreMenu.test.ts` só pode afirmar:
//   1. a sessão de admin grava o v2 em `store_settings.menu` com o filtro `updated_at = visto`, e
//      recebe a versão nova (MNM-37, MNM-41);
//   2. a releitura devolve o documento gravado, e `parseMenuDocument` o aceita;
//   3. com o `updated_at` VELHO, a mesma escrita afeta ZERO linhas (o conflito do hook);
//   4. sem sessão (anon) a escrita não altera nada (RLS: `store_settings_admin_write`);
//   5. `categories.sort_order`, `menu_desktop`, `menu_mobile` e `menu_banners` ficam byte a byte
//      iguais antes e depois (MNM-18, Success Criterion 2).
// No fim restaura o `store_settings.menu` original (valor inteiro), aconteça o que acontecer.
//
// Uso (da raiz do repositório, com `supabase start` de pé):
//   node .specs/features/86-menu-montado-pela-dona/probes/01-gravacao.mjs
// Sai 0 com uma linha `ok — …` por checagem; qualquer falha imprime `FALHOU — …` e sai 1.
//
// SÓ contra o ambiente local: a URL é fixa em 127.0.0.1 e o script recusa qualquer outra.

import { execFileSync } from 'node:child_process'
import { parseMenuDocument, menuDocumentRefusal } from '../../../../packages/core/src/menu/index.ts'

const API = 'http://127.0.0.1:54441'
const DB = 'postgresql://postgres:postgres@127.0.0.1:54442/postgres'
// Chave publicável do Supabase LOCAL (a de demonstração da CLI; não é segredo).
const ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const ADMIN = { email: 'admin@umaestrelinha.dev', password: 'admin123' } // supabase/seed.sql, seção 5

if (!API.startsWith('http://127.0.0.1:')) throw new Error('probe só roda contra o Supabase local')

let falhas = 0
const ok = (cond, msg) => {
  if (cond) console.log(`ok — ${msg}`)
  else {
    falhas++
    console.log(`FALHOU — ${msg}`)
  }
}

const sql = q => execFileSync('psql', [DB, '-Atc', q], { encoding: 'utf8' }).trim()

/** O retrato das colunas que o menu NÃO pode tocar, linha a linha, como texto. */
const retratoDasCategorias = () =>
  sql(
    `select md5(coalesce(string_agg(id::text || '|' || sort_order::text || '|' || ` +
      `coalesce(menu_desktop::text,'∅') || '|' || coalesce(menu_mobile::text,'∅') || '|' || ` +
      `coalesce(menu_banners::text,'∅') || '|' || coalesce(updated_at::text,'∅'), E'\\n' order by id), '')) ` +
      `|| ':' || count(*) from public.categories`,
  )

const rest = async (caminho, { metodo = 'GET', token, corpo, prefer } = {}) => {
  const headers = { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json' }
  if (prefer) headers.Prefer = prefer
  const r = await fetch(`${API}/rest/v1/${caminho}`, {
    method: metodo,
    headers,
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })
  const texto = await r.text()
  return { status: r.status, data: texto ? JSON.parse(texto) : null }
}

const lerMenu = async token => {
  const { status, data } = await rest('store_settings?select=value,updated_at&key=eq.menu', { token })
  if (status !== 200) throw new Error(`leitura do menu: ${status} ${JSON.stringify(data)}`)
  return data[0] ?? null
}

// --- sessão de admin ---------------------------------------------------------
const login = await fetch(`${API}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify(ADMIN),
})
const sessao = await login.json()
ok(login.status === 200 && typeof sessao.access_token === 'string', 'login do admin do seed no GoTrue local')
const TOKEN = sessao.access_token

const original = await lerMenu(TOKEN)
const categoriasAntes = retratoDasCategorias()
ok(categoriasAntes.endsWith(':') === false && Number(categoriasAntes.split(':')[1]) > 0, `retrato das categorias tirado (${categoriasAntes.split(':')[1]} linhas)`)

const escrever = (visto, value, token) =>
  rest(`store_settings?key=eq.menu&updated_at=eq.${encodeURIComponent(visto)}&select=updated_at`, {
    metodo: 'PATCH',
    token,
    corpo: { value },
    prefer: 'return=representation',
  })

try {
  if (!original) throw new Error('a linha store_settings.menu não existe no banco local (a migration da 39 a semeia)')
  const visto = original.updated_at

  // Um documento v2 que o painel gravaria: uma categoria real + um link, preservando as chaves antigas.
  const umaCategoria = sql('select id from public.categories where active order by sort_order, name limit 1')
  const documento = {
    version: 2,
    items: [
      { id: 'probe-cat', target: { kind: 'category', category_id: umaCategoria }, label: null, desktop: true, mobile: true, icon: null, banners: null, children: [] },
      { id: 'probe-link', target: { kind: 'link', href: '/sobre' }, label: 'Sobre (probe)', desktop: true, mobile: false, icon: null, banners: null, children: [] },
    ],
  }
  ok(menuDocumentRefusal(documento) === null, 'o documento do probe passa em menuDocumentRefusal (o painel o gravaria)')
  const value = { ...original.value, ...documento }

  // 1. admin grava com o updated_at visto
  const gravou = await escrever(visto, value, TOKEN)
  ok(gravou.status === 200 && Array.isArray(gravou.data) && gravou.data.length === 1, 'admin grava v2 filtrando por key e updated_at visto (1 linha)')
  const novo = gravou.data?.[0]?.updated_at
  ok(typeof novo === 'string' && novo !== visto, `o gatilho devolve um updated_at novo (${visto} → ${novo})`)

  // 2. releitura
  const relido = await lerMenu(TOKEN)
  ok(relido.updated_at === novo, 'a releitura traz o mesmo updated_at que a gravação devolveu')
  const doc = parseMenuDocument(relido.value)
  ok(doc !== null && JSON.stringify(doc) === JSON.stringify(documento), 'parseMenuDocument(relido) é exatamente o documento gravado')
  ok(JSON.stringify(relido.value.links) === JSON.stringify(original.value.links), 'as chaves antigas do value (links legados) foram preservadas')

  // 3. conflito: o updated_at velho não casa mais
  const velho = await escrever(visto, { ...value, items: [] }, TOKEN)
  ok(velho.status === 200 && Array.isArray(velho.data) && velho.data.length === 0, 'com o updated_at VELHO a escrita afeta 0 linhas (conflito)')
  ok(JSON.stringify((await lerMenu(TOKEN)).value) === JSON.stringify(relido.value), 'e o documento gravado continua intacto depois do conflito')

  // 4. anônimo
  const anon = await escrever(novo, { ...value, items: [] }, undefined)
  ok(anon.status >= 400 || (Array.isArray(anon.data) && anon.data.length === 0), `anon não grava (status ${anon.status}, ${Array.isArray(anon.data) ? anon.data.length : '-'} linhas)`)
  const depoisDoAnon = await lerMenu(TOKEN)
  ok(depoisDoAnon.updated_at === novo && JSON.stringify(depoisDoAnon.value) === JSON.stringify(relido.value), 'e o menu segue o do admin depois da tentativa anônima')

  // sensor do retrato: ele ENXERGA uma mudança em categories (senão a igualdade abaixo seria cega)
  const sensor = sql(
    `begin; update public.categories set sort_order = sort_order + 1 where id = '${umaCategoria}'; ` +
      `select md5(coalesce(string_agg(id::text || '|' || sort_order::text || '|' || ` +
      `coalesce(menu_desktop::text,'∅') || '|' || coalesce(menu_mobile::text,'∅') || '|' || ` +
      `coalesce(menu_banners::text,'∅') || '|' || coalesce(updated_at::text,'∅'), E'\\n' order by id), '')) ` +
      `|| ':' || count(*) from public.categories; rollback;`,
  )
    .split('\n')
    .find(l => l.includes(':'))
  ok(sensor && sensor !== categoriasAntes, 'sensor: o retrato muda quando uma sort_order muda (dentro de transação desfeita)')
} finally {
  // Restaura o valor original inteiro (pela sessão de admin, filtrando só pela chave).
  if (original) {
    const restaura = await rest('store_settings?key=eq.menu&select=updated_at', {
      metodo: 'PATCH',
      token: TOKEN,
      corpo: { value: original.value },
      prefer: 'return=representation',
    })
    const final = await lerMenu(TOKEN)
    ok(restaura.status === 200 && JSON.stringify(final.value) === JSON.stringify(original.value), 'store_settings.menu restaurado ao valor original')
  }
  // 5. categories intocadas (o updated_at da categoria entra no retrato: até um "toque" acusaria)
  ok(retratoDasCategorias() === categoriasAntes, 'categories.sort_order/menu_desktop/menu_mobile/menu_banners byte a byte iguais antes e depois')
}

if (falhas > 0) {
  console.log(`\n${falhas} checagem(ns) falharam`)
  process.exit(1)
}
