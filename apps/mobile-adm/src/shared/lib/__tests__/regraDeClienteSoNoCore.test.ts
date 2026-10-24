// Feature `76` · T20 (G3) — `MAC-27`, `MAC-23`: nenhuma regra de cliente mora no app do ateliê. "Em que
// recorte", "como um recorte vira filtro", "como a busca é escrita" e "como o vínculo com os pedidos é
// escrito" são de `@estrelinha/core/customers`, lidos igual pelo painel e pelo app. Uma tabela ou um
// filtro no app que repetisse uma delas divergiria do painel sem nada quebrar: build, `tsc` e teste de
// componente passam com as duas cópias discordando (o "defeito 01").
//
// Quatro réguas — uma por FORMA (`L-033`):
//
// 1. **Mapa ou `case` com chave do vocabulário de recorte**: uma entrada de objeto (`'em-aberto': …`,
//    `recorrentes: …`) ou um `case 'todas':` cuja chave é um id ou um RÓTULO de `CUSTOMER_SLICES`. O
//    vocabulário é IMPORTADO de `core` — a régua nunca é uma lista escrita aqui, que envelheceria com o
//    primeiro recorte novo. Alcance declarado: a chave de objeto/`case`; um ternário com o id como
//    resultado (`x ? 'todas' : 'y'`) também é acusado, de propósito — decidir recorte à mão é a regra.
// 2. **Predicado do recorte**: `orders_paid`/`orders_open` num filtro do PostgREST — pela chamada
//    (`.gte('orders_open', 1)`, `.eq('orders_paid', 2)`) ou pela string (`orders_open.gte.1`). Quem
//    traduz recorte em filtro é `applyCustomerSlice`.
// 3. **`ilike` escrito à mão**: a chamada `.ilike(` e a string `ilike.` — o escape de `\ % _` e a
//    aspa do PostgREST são do dono (`ilikeContains`/`ilikeExact`); um `ilike` no app é o `_` do e-mail
//    virando curinga (A10).
// 4. **`or(` montado à mão** com a coluna de cliente (`customer_id`, `customer_email`,
//    `last_activity_at`): pela string (`customer_id.eq.…`, `last_activity_at.lt.…`) ou por template
//    dentro de `.or(`. O vínculo é `customerOrdersCondition`, o cursor é `customerCursorFilter`.
//
// Escopo: `apps/mobile-adm/src`, só produção, comentário fora. Âncora dupla: os arquivos lidos e a
// METADE POSITIVA — cada hook de cliente CHAMA o dono de core (`applyCustomerSlice`, `buildAppCustomerSearch`,
// `customerCursorFilter`, `customerOrdersCondition`, `directoryEmailCondition`); sem ela, apagar as
// chamadas deixaria a ausência verdadeira e vazia.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { CUSTOMER_SLICES } from '@estrelinha/core/customers'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

/** Comentário sai preservando a numeração. CRLF primeiro (`L-031`), linha e bloco na MESMA passada (`BL-027`). */
const semComentarios = (fonte: string): string[] =>
  fonte
    .replace(/\r\n?/g, '\n')
    .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, (t) => t.replace(/[^\n]/g, ' '))
    .split('\n')

interface Arquivo {
  rel: string
  linhas: string[]
}

const PRODUCAO: Arquivo[] = arquivos(SRC).map((c) => ({
  rel: relative(SRC, c).split('\\').join('/'),
  linhas: semComentarios(readFileSync(c, 'utf8')),
}))

const escapar = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** O vocabulário, de `core`: os ids E os rótulos. */
const VOCABULARIO = [...new Set(CUSTOMER_SLICES.flatMap((s) => [s.id, s.label]))]
const CHAVES = VOCABULARIO.map(escapar).join('|')

/** Régua 1a — entrada de objeto: `recorrentes:`, `'em-aberto':`, `"Todas":`. */
const ENTRADA_DE_MAPA = new RegExp(`(?:^|[\\s{,(?])(?:(?:${CHAVES})|['"\`](?:${CHAVES})['"\`])\\s*:(?!:)`)
/** Régua 1b — `case 'em-aberto':`. */
const CASE_DE_SWITCH = new RegExp(`\\bcase\\s+['"\`](?:${CHAVES})['"\`]\\s*:`)

const COLUNAS_DE_RECORTE = 'orders_paid|orders_open'
const OPERADORES = 'eq|neq|in|is|not|gt|gte|lt|lte|like|ilike|match|filter|contains'
/** Régua 2a — a chamada: `.gte('orders_open', 1)`. */
const PREDICADO_POR_CHAMADA = new RegExp(`\\.(?:${OPERADORES})\\(\\s*['"\`](?:${COLUNAS_DE_RECORTE})['"\`]`)
/** Régua 2b — a string de `.or()`: `orders_open.gte.1`. Fronteira à esquerda. */
const PREDICADO_POR_STRING = new RegExp(`(?<![\\w.])(?:${COLUNAS_DE_RECORTE})\\.(?:${OPERADORES})\\.`)

/** Régua 3 — `ilike` escrito à mão: a chamada e a string. */
const ILIKE_NA_CHAMADA = /\.ilike\(/
const ILIKE_NA_STRING = /(?<![\w])ilike\./

const COLUNAS_DO_VINCULO = 'customer_id|customer_email|last_activity_at'
/** Régua 4a — a string do filtro: `customer_id.eq.…`, `last_activity_at.lt.…`. */
const OR_POR_STRING = new RegExp(`(?<![\\w.])(?:${COLUNAS_DO_VINCULO})\\.(?:${OPERADORES}|and|or)\\b`)
/** Régua 4b — `.or(` com um template que cita a coluna. */
const OR_POR_TEMPLATE = new RegExp(`\\.or\\(\\s*\`[^\`]*\\b(?:${COLUNAS_DO_VINCULO})\\b`)

const REGUAS = {
  ENTRADA_DE_MAPA,
  CASE_DE_SWITCH,
  PREDICADO_POR_CHAMADA,
  PREDICADO_POR_STRING,
  ILIKE_NA_CHAMADA,
  ILIKE_NA_STRING,
  OR_POR_STRING,
  OR_POR_TEMPLATE,
}

const procurar = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) =>
    a.linhas.flatMap((texto, i) =>
      Object.entries(REGUAS)
        .filter(([, r]) => r.test(texto))
        .map(([nome]) => `${a.rel}:${i + 1} [${nome}] ${texto.trim()}`),
    ),
  )

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', linhas: semComentarios(fonte) }]

describe('a regra do cliente mora em `core` (MAC-27) — âncoras', () => {
  it('a varredura lê o app, inclusive os arquivos de cliente da `76`', () => {
    // O piso sobe junto com a feature (126 arquivos de produção na T20); nunca desce.
    expect(PRODUCAO.length).toBeGreaterThanOrEqual(110)
    const rels = PRODUCAO.map((a) => a.rel)
    for (const r of [
      'entities/customer/api/useListaDeClientes.ts',
      'entities/customer/api/useCliente.ts',
      'entities/customer/api/usePedidosDoCliente.ts',
      'entities/customer/api/buscarClientePorEmail.ts',
      'entities/customer/model/clientesHref.ts',
      'features/open-customer/model/useAbrirCliente.ts',
      'pages/ClientesPage.tsx',
    ])
      expect(rels).toContain(r)
    expect(rels.some((r) => r.includes('__tests__/'))).toBe(false)
  })

  it('o vocabulário importado de `core` não está vazio: três recortes, ids e rótulos', () => {
    expect(CUSTOMER_SLICES).toHaveLength(3)
    expect(VOCABULARIO).toHaveLength(6)
    for (const k of ['todas', 'recorrentes', 'em-aberto', 'Todas', 'Compraram mais de uma vez', 'Com pedido em aberto']) expect(VOCABULARIO).toContain(k)
  })

  it('metade positiva: cada hook de cliente CHAMA o dono de core', () => {
    const chama = (rel: string, nome: string) => PRODUCAO.find((a) => a.rel === rel)!.linhas.some((l) => new RegExp(`\\b${nome}\\(`).test(l))
    expect(chama('entities/customer/api/useListaDeClientes.ts', 'applyCustomerSlice')).toBe(true)
    expect(chama('entities/customer/api/useListaDeClientes.ts', 'buildAppCustomerSearch')).toBe(true)
    expect(chama('entities/customer/api/useListaDeClientes.ts', 'customerCursorFilter')).toBe(true)
    expect(chama('entities/customer/api/useCliente.ts', 'customerOrdersCondition')).toBe(true)
    expect(chama('entities/customer/api/usePedidosDoCliente.ts', 'customerOrdersCondition')).toBe(true)
    expect(chama('entities/customer/api/buscarClientePorEmail.ts', 'directoryEmailCondition')).toBe(true)
  })

  it('sensor da metade positiva: o hook sem a chamada (só citada em comentário) reprova', () => {
    const so = semComentarios('// applyCustomerSlice(q, slice)\nconst q = 1')
    expect(so.some((l) => /\bapplyCustomerSlice\(/.test(l))).toBe(false)
  })
})

describe('a regra do cliente mora em `core` (MAC-27) — o app', () => {
  it('nenhum arquivo de produção do app declara mapa/`case` do recorte, predicado, `ilike` nem `or(` do vínculo à mão', () => {
    expect(procurar(PRODUCAO)).toEqual([])
  })
})

describe('SENSORES', () => {
  it.each([
    ["const M = { recorrentes: 'x' }", 'ENTRADA_DE_MAPA'],
    ["const T: Record<string, string> = {\n  'em-aberto': 'a',\n}", 'ENTRADA_DE_MAPA'],
    ['const M = { "todas": 1 }', 'ENTRADA_DE_MAPA'],
    ["const M = { 'Compraram mais de uma vez': 2 }", 'ENTRADA_DE_MAPA'],
    ["const x = c ? 'em-aberto' : 'todas'", 'ENTRADA_DE_MAPA'],
    ["switch (v) {\n  case 'recorrentes':\n    return 1\n}", 'CASE_DE_SWITCH'],
    ["case 'Com pedido em aberto': return x", 'CASE_DE_SWITCH'],
    ["q = q.gte('orders_open', 1)", 'PREDICADO_POR_CHAMADA'],
    ['q = q.eq("orders_paid", 2)', 'PREDICADO_POR_CHAMADA'],
    ["q = q.or('orders_open.gte.1')", 'PREDICADO_POR_STRING'],
    ['q = q.or(`orders_paid.gte.2`)', 'PREDICADO_POR_STRING'],
    ["q = q.ilike('name', '%ana%')", 'ILIKE_NA_CHAMADA'],
    ["q = q.or('name.ilike.%ana%')", 'ILIKE_NA_STRING'],
    ["q = q.or(`email.ilike.${termo}`)", 'ILIKE_NA_STRING'],
    ["q = q.or(`customer_id.eq.${id}`)", 'OR_POR_STRING'],
    ["q = q.or('customer_email.ilike.x')", 'OR_POR_STRING'],
    ["q = q.or(`last_activity_at.lt.${t}`)", 'OR_POR_STRING'],
    ["q = q.or(`${a},customer_id`)", 'OR_POR_TEMPLATE'],
  ])('acusa: %s ⇒ %s', (fonte, regua) => {
    const achados = procurar(sintetico(fonte))
    expect(achados.length).toBeGreaterThanOrEqual(1)
    expect(achados.some((a) => a.includes(`[${regua}]`))).toBe(true)
  })

  it.each([
    ['q = applyCustomerSlice(q, slice)'],
    ['const busca = buildAppCustomerSearch(termo)'],
    ['q = q.or(customerCursorFilter(cursor))'],
    ['q = q.or(customerOrdersCondition(id, email))'],
    ['q = q.or(directoryEmailCondition(email))'],
    ["navigate(clientesHref('em-aberto'))"],
    ["const [recorte, setRecorte] = useState<CustomerSliceId>('todas')"],
    ['for (const s of CUSTOMER_SLICES) lista.push(s.id)'],
    ["q = q.order('last_activity_at', { ascending: false, nullsFirst: false })"],
    ["supabase.from('customer_list').select(COLUNAS_DA_LISTA).eq('id', id).maybeSingle()"],
    ['const c = { customer_id: 1 }'],
    ["const aviso = 'ilike'"],
    ['const total = cliente.orders_open'],
  ])('NÃO acusa (inverso): %s', (fonte) => {
    expect(procurar(sintetico(fonte))).toEqual([])
  })

  it('a prosa que explica a regra não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(procurar(sintetico("// recorrentes: 'x' e q.ilike('name')\r\nconst a = 1"))).toEqual([])
    expect(procurar(sintetico("/* q.gte('orders_open', 1) */\nconst a = 1"))).toEqual([])
    const achados = procurar(sintetico("// varre apps/**\nconst T = { recorrentes: 1 }\n/* fim */"))
    expect(achados).toEqual(["sintetico.tsx:2 [ENTRADA_DE_MAPA] const T = { recorrentes: 1 }"])
  })
})
