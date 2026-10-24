// Feature `74` · T13 — `MAP-04`: o endereço da aba Pedidos tem UM leitor e UM escritor,
// `entities/order/model/pedidosHref.ts`. A Início escreve por `pedidosHref`, a lista lê por
// `recorteDoEndereco`. Um segundo arquivo lendo o parâmetro à mão (um `useSearchParams` na página, um
// `'?visao=tudo'` num link) divergiria sem nada quebrar: o link levaria a uma lista que não filtra,
// ou a lista aceitaria um valor que a Início nunca escreve.
//
// A régua lê o FONTE do disco, sem comentário (linha e bloco na MESMA varredura, `BL-027`), e
// procura USO — o nome dos parâmetros como literal de código, o fragmento de query num texto, e o
// `useSearchParams`. Allowlist de UM, escrito literalmente.
//
// Metade positiva: o próprio dono declara os dois parâmetros e `recorteDoEndereco`, e — desde a T21 da
// `74` — a `PedidosPage` CHAMA `recorteDoEndereco` com o `search` da rota. Sem ela, apagar a leitura
// da página deixaria a ausência verdadeira e vazia (a lista abriria sempre no padrão).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DONO = 'entities/order/model/pedidosHref.ts'

const semComentario = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** As formas proibidas fora do dono. Cada uma devolve as ocorrências achadas no texto. */
const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'literal do parâmetro', re: /(['"`])(visao|bloco)\1/g },
  { nome: 'fragmento de query', re: /[?&](visao|bloco)=/g },
  { nome: 'nome do parâmetro', re: /\bPARAM_(VISAO|BLOCO)\b/g },
  { nome: 'useSearchParams', re: /\buseSearchParams\b/g },
]

const ocorrencias = (texto: string): string[] => {
  const c = semComentario(texto)
  return FORMAS.flatMap(({ nome, re }) => [...c.matchAll(re)].map((m) => `${nome}: ${m[0]}`))
}

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const lidos = arquivos(SRC).map((caminho) => ({ rel: relative(SRC, caminho).split('\\').join('/'), texto: readFileSync(caminho, 'utf8') }))

describe('o endereço da aba Pedidos tem um dono só (MAP-04)', () => {
  it('âncora: o app foi lido, inclusive o dono e um consumidor conhecido', () => {
    expect(lidos.length).toBeGreaterThan(40)
    expect(lidos.map((l) => l.rel)).toContain(DONO)
    expect(lidos.map((l) => l.rel)).toContain('widgets/queue-tiles/ui/QueueTiles.tsx')
  })

  it('âncora: o dono usa as formas que a régua procura (a régua enxerga o uso legítimo)', () => {
    const dono = lidos.find((l) => l.rel === DONO)!.texto
    const achadas = ocorrencias(dono)
    expect(achadas).toContain("literal do parâmetro: 'visao'")
    expect(achadas).toContain("literal do parâmetro: 'bloco'")
    expect(achadas.filter((a) => a.startsWith('nome do parâmetro'))).not.toHaveLength(0)
    expect(semComentario(dono)).toMatch(/export const recorteDoEndereco\b/)
  })

  it('metade positiva: a página da lista lê o endereço SÓ por `recorteDoEndereco` (T21)', () => {
    const pagina = lidos.find((l) => l.rel === 'pages/PedidosPage.tsx')
    expect(pagina).toBeDefined()
    const codigo = semComentario(pagina!.texto)
    expect(codigo).toMatch(/import\s*\{[^}]*\brecorteDoEndereco\b[^}]*\}\s*from\s*'@\/entities\/order'/)
    expect(codigo).toMatch(/\brecorteDoEndereco\(\s*(location\.)?search\s*\)/)
  })

  it('sensor da metade positiva: a página que só cita o nome em comentário reprova', () => {
    const so = semComentario("// recorteDoEndereco(search)\nconst recorte = DEFAULT_ORDER_SLICE\n")
    expect(so).not.toMatch(/\brecorteDoEndereco\(\s*(location\.)?search\s*\)/)
  })

  it('nenhum outro arquivo de produção do app lê ou escreve o parâmetro à mão', () => {
    const fora = lidos
      .filter((l) => l.rel !== DONO)
      .flatMap((l) => ocorrencias(l.texto).map((o) => `${l.rel} — ${o}`))
    expect(fora).toEqual([])
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é uso', () => {
  it.each([
    ["new URLSearchParams(search).get('visao')", 'literal do parâmetro'],
    ['p.get("bloco")', 'literal do parâmetro'],
    ['<Link to="/pedidos?visao=tudo" />', 'fragmento de query'],
    ['`/pedidos?x=1&bloco=${id}`', 'fragmento de query'],
    ['import { PARAM_VISAO } from "./x"', 'nome do parâmetro'],
    ['const [params] = useSearchParams()', 'useSearchParams'],
  ])('acusa: %s', (codigo, forma) => {
    expect(ocorrencias(codigo).some((o) => o.startsWith(forma))).toBe(true)
  })

  it.each([
    ['<a data-bloco="aguardando" />'],
    ['pedidosHref({ bloco: b.id, })'],
    ["const visaoAtual = 'tudo'"],
    ['isBlockSlice(slice)'],
  ])('não acusa: %s', (codigo) => {
    expect(ocorrencias(codigo)).toEqual([])
  })

  it('a forma escrita em comentário não conta — com CRLF e com LF', () => {
    expect(ocorrencias("// lê 'visao' e ?bloco=\r\nconst x = 1")).toEqual([])
    expect(ocorrencias("// lê 'visao' e ?bloco=\nconst x = 1")).toEqual([])
    expect(ocorrencias('/* useSearchParams */ const y = 2')).toEqual([])
  })

  it('o código DEPOIS do comentário continua acusado (CRLF não engole a linha seguinte)', () => {
    expect(ocorrencias("// nota\r\nconst p = 'visao'")).toEqual(["literal do parâmetro: 'visao'"])
  })

  it('o glob de dois asteriscos dentro de um bloco não cega a régua (BL-027)', () => {
    expect(ocorrencias("/* src/**/x.ts */ const p = useSearchParams()")).toEqual(['useSearchParams: useSearchParams'])
  })
})
