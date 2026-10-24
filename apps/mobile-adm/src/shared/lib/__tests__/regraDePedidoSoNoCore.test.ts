// Feature `74` · T28 — `MAP-49`: nenhuma regra de pedido mora no app do ateliê. "Em que recorte",
// "como se diz este status", "este pagamento é de que tom", "este meio se chama como" e "como um recorte
// vira filtro" são de `@estrelinha/core` (`orders/*`, `material/*`), lidos igual pelo painel e pelo
// app. Uma tabela no app que repetisse uma delas divergiria do painel sem nada quebrar: build, `tsc` e
// teste de componente passam com as duas cópias discordando (o "defeito 01").
//
// Duas réguas — uma por FORMA (`L-033`):
//
// 1. **Mapa ou `case` com chave do vocabulário**: uma entrada de objeto (`shipped: …`, `'a-separar': …`)
//    ou um `case 'pix':` cuja chave é uma visão (`ORDER_VIEWS`), um status (`ORDER_STATUS_LABELS`), um
//    status de pagamento (`ORDER_PAYMENT_STATUS_LABELS`) ou um meio (`PAYMENT_METHOD_LABELS`). Os
//    vocabulários são IMPORTADOS de `core` — a régua nunca é uma lista escrita aqui, que envelheceria
//    com a primeira visão nova. Qualquer valor conta: um mapa status → classe também é regra (é o
//    tom do selo, que mora em `core` e em `shared/ui/Selo`).
// 2. **Literal de predicado de RECORTE**: uma coluna de recorte (`status`, `material_status`,
//    `payment_status`, `payment_method`, `tracking_code`) num filtro do PostgREST — pela chamada
//    (`.eq('status', …)`, `.in('material_status', …)`) ou pela string de `.or()` (`status.eq.shipped`,
//    `tracking_code.is.null`). Quem traduz recorte em filtro é `applyOrderSlice`.
//
// O que NÃO é acusado (E8, e os inversos nos sensores): os filtros de IDENTIDADE do detalhe
// (`.eq('id', id)`, `.eq('order_id', id)`), ler o veredito de `core` (`rowSummary(row).action ===
// 'salvar-rastreio'`, `PAYMENT_METHOD_LABELS[pedido.payment_method]`) e dado (`{ visao: 'tudo' }` —
// a chave é `visao`, não uma visão).
//
// Escopo: `apps/mobile-adm/src`, só produção. Âncora dupla: os arquivos lidos (com os que a `74` criou
// nomeados) e a chamada a `applyOrderSlice(` achada no hook da lista — a ocorrência legítima que prova
// que o recorte vai para `core`. Complementa `situacaoComDonoUnico` (suíte da loja), que já recusa a
// tabela de rótulo da situação no app.
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ORDER_PAYMENT_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_VIEWS,
  PAYMENT_METHOD_LABELS,
} from '@estrelinha/core/orders'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

/**
 * Comentário sai preservando a numeração. CRLF normalizado PRIMEIRO (`L-031`), e linha e bloco na
 * MESMA passada (`BL-027`): um glob de dois asteriscos num comentário de linha não abre bloco falso.
 */
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

/** O vocabulário, de `core`. Sem duplicatas (`pending` é status e pagamento). */
const VOCABULARIO = [
  ...new Set([
    ...ORDER_VIEWS.map((v) => v.id),
    ...Object.keys(ORDER_STATUS_LABELS),
    ...Object.keys(ORDER_PAYMENT_STATUS_LABELS),
    ...Object.keys(PAYMENT_METHOD_LABELS),
  ]),
]
const CHAVES = VOCABULARIO.map(escapar).join('|')

/** Régua 1a — entrada de objeto com chave do vocabulário: `pix:`, `'a-separar':`, `"shipped":`. */
const ENTRADA_DE_MAPA = new RegExp(`(?:^|[\\s{,(])(?:(?:${CHAVES})|['"\`](?:${CHAVES})['"\`])\\s*:(?!:)`)
/** Régua 1b — `case 'shipped':`. */
const CASE_DE_SWITCH = new RegExp(`\\bcase\\s+['"\`](?:${CHAVES})['"\`]\\s*:`)

const COLUNAS_DE_RECORTE = ['status', 'material_status', 'payment_status', 'payment_method', 'tracking_code']
const COLUNAS = COLUNAS_DE_RECORTE.join('|')
const OPERADORES = 'eq|neq|in|is|not|gt|gte|lt|lte|like|ilike|match|filter|contains'
/** Régua 2a — a chamada: `.eq('status', …)`, `.in("material_status", …)`, `.not('tracking_code', …)`. */
const PREDICADO_POR_CHAMADA = new RegExp(`\\.(?:${OPERADORES})\\(\\s*['"\`](?:${COLUNAS})['"\`]`)
/** Régua 2b — a string de `.or()`: `status.eq.shipped`, `tracking_code.is.null`. Fronteira à esquerda. */
const PREDICADO_POR_STRING = new RegExp(`(?<![\\w.])(?:${COLUNAS})\\.(?:${OPERADORES})\\.`)

const REGUAS = { ENTRADA_DE_MAPA, CASE_DE_SWITCH, PREDICADO_POR_CHAMADA, PREDICADO_POR_STRING }

/**
 * Allowlist de UMA linha, escrita por extenso (arquivo + texto exato). `'a-separar'` é também o id de
 * um BLOCO de "Precisa de você" (`QUEUE_BLOCKS`, `73`), e `CONTAGEM_DO_BLOCO` é um `Record<QueueBlockId,
 * …>` que diz qual CAMPO da resposta de `store_overview` conta cada bloco — formato da resposta, não a
 * visão homônima. Só esta linha, neste arquivo: a mesma entrada em qualquer outro lugar é acusada
 * (sensor abaixo).
 */
const PERMITIDAS = [{ rel: 'widgets/queue-tiles/model/fila.ts', texto: "'a-separar': 'a_separar'," }]
const permitida = (rel: string, texto: string) => PERMITIDAS.some((p) => p.rel === rel && p.texto === texto.trim())

const procurar = (alvo: Arquivo[]): string[] =>
  alvo.flatMap((a) =>
    a.linhas.flatMap((texto, i) =>
      permitida(a.rel, texto)
        ? []
        : Object.entries(REGUAS)
            .filter(([, r]) => r.test(texto))
            .map(([nome]) => `${a.rel}:${i + 1} [${nome}] ${texto.trim()}`),
    ),
  )

const sintetico = (fonte: string): Arquivo[] => [{ rel: 'sintetico.tsx', linhas: semComentarios(fonte) }]

describe('a regra do pedido mora em `core` (MAP-49) — âncoras', () => {
  it('a varredura lê o app, inclusive os arquivos que a `74` criou', () => {
    // Medido no fecho da T28: 83 arquivos de produção.
    expect(PRODUCAO.length).toBeGreaterThanOrEqual(80)
    const rels = PRODUCAO.map((a) => a.rel)
    for (const r of [
      'entities/order/api/useListaDePedidos.ts',
      'entities/order/api/usePedido.ts',
      'entities/order/ui/LinhaDoPedido.tsx',
      'widgets/order-detail/ui/BlocoValores.tsx',
      'widgets/order-detail/ui/BlocoEntrega.tsx',
      'widgets/tab-bar/model/selo.ts',
      'pages/PedidoPage.tsx',
      'pages/PedidosPage.tsx',
    ])
      expect(rels).toContain(r)
    expect(rels.some((r) => r.includes('__tests__/'))).toBe(false)
  })

  it('o vocabulário importado de `core` não está vazio: as seis visões, os status, os pagamentos e os meios', () => {
    expect(ORDER_VIEWS).toHaveLength(6)
    for (const k of ['precisa-acao', 'a-separar', 'shipped', 'approved', 'refunded', 'pix', 'credit_card']) expect(VOCABULARIO).toContain(k)
  })

  it('a ocorrência legítima existe: o hook da lista entrega o recorte a `applyOrderSlice(`', () => {
    const hook = PRODUCAO.find((a) => a.rel === 'entities/order/api/useListaDePedidos.ts')!
    expect(hook.linhas.some((l) => /\bapplyOrderSlice\(\s*\w+\s*,\s*slice\s*\)/.test(l))).toBe(true)
  })
})

describe('a regra do pedido mora em `core` (MAP-49) — o app', () => {
  it('nenhum arquivo de produção do app declara mapa/`case` do vocabulário nem predicado de recorte', () => {
    expect(procurar(PRODUCAO)).toEqual([])
  })
})

describe('SENSORES', () => {
  it.each([
    ["const TOM = { shipped: 'bg-x' }", 'ENTRADA_DE_MAPA'],
    ["const T: Record<string, string> = {\n  'a-separar': 'A separar',\n}", 'ENTRADA_DE_MAPA'],
    ['const M = { "credit_card": "Cartão" }', 'ENTRADA_DE_MAPA'],
    ["const M = { pix: 'PIX', boleto: 'Boleto' }", 'ENTRADA_DE_MAPA'],
    ["switch (v) {\n  case 'pix':\n    return 1\n}", 'CASE_DE_SWITCH'],
    ["case 'precisa-acao': return x", 'CASE_DE_SWITCH'],
    ["q = q.eq('status', 'paid')", 'PREDICADO_POR_CHAMADA'],
    ["q = q.in('material_status', ['aguardando_material'])", 'PREDICADO_POR_CHAMADA'],
    ['q = q.not("tracking_code", "is", null)', 'PREDICADO_POR_CHAMADA'],
    ["q = q.or('status.eq.shipped,tracking_code.is.null')", 'PREDICADO_POR_STRING'],
    ['q = q.or(`payment_method.eq.pix`)', 'PREDICADO_POR_STRING'],
  ])('acusa: %s ⇒ %s', (fonte, regua) => {
    const achados = procurar(sintetico(fonte))
    expect(achados.length).toBeGreaterThanOrEqual(1)
    expect(achados.some((a) => a.includes(`[${regua}]`))).toBe(true)
  })

  it.each([
    ["supabase.from('order_list').select(COLUNAS).eq('id', id).maybeSingle()"],
    ["supabase.from('order_items').select(COLUNAS).eq('order_id', id)"],
    ["const ponto = rowSummary(row).action === 'salvar-rastreio'"],
    ['const meio = PAYMENT_METHOD_LABELS[pedido.payment_method] ?? pedido.payment_method'],
    ["navigate(pedidosHref({ visao: 'tudo' }), { replace: true })"],
    ["const linha = { status: 'paid', payment_status: 'approved' }"],
    ["q = q.order('created_at', { ascending: false })"],
    ['const s = row.customer_status.eq.x'],
  ])('NÃO acusa (inverso): %s', (fonte) => {
    expect(procurar(sintetico(fonte))).toEqual([])
  })

  it('a allowlist é de UMA linha, no arquivo dela: a mesma entrada noutro arquivo é acusada, e a linha permitida existe', () => {
    const fila = PRODUCAO.find((a) => a.rel === 'widgets/queue-tiles/model/fila.ts')!
    expect(fila.linhas.some((l) => l.trim() === PERMITIDAS[0].texto)).toBe(true)
    expect(procurar([{ rel: 'widgets/outro/model/x.ts', linhas: ["  'a-separar': 'a_separar',"] }])).toHaveLength(1)
    expect(procurar([{ rel: 'widgets/queue-tiles/model/fila.ts', linhas: ["  'a-separar': 'A separar',"] }])).toHaveLength(1)
  })

  it('a prosa que explica a regra não é acusada — com CRLF, com LF e com o glob de dois asteriscos', () => {
    expect(procurar(sintetico("// shipped: 'Enviado'\r\nconst a = 1"))).toEqual([])
    expect(procurar(sintetico("/* q.eq('status', x) */\nconst a = 1"))).toEqual([])
    // O glob num comentário de linha não abre um bloco que engula o código abaixo.
    const achados = procurar(sintetico("// varre apps/**\nconst T = { pix: 'PIX' }\n/* fim */"))
    expect(achados).toEqual(["sintetico.tsx:2 [ENTRADA_DE_MAPA] const T = { pix: 'PIX' }"])
  })
})
