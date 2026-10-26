// Feature `76` · T16 — `MAC-07`, `MAC-14`, `MAC-27` (G1): o endereço da aba Clientes tem UM leitor e UM
// escritor, `entities/customer/model/clientesHref.ts`. Um segundo arquivo lendo o parâmetro à mão (um
// `useSearchParams` na página, um `'?recorte=em-aberto'` num link, um `/clientes/${id}` montado na
// linha) divergiria sem nada quebrar: o link levaria a uma lista que não filtra, ou a ficha abriria
// com um id que a página recusa.
//
// A régua lê o FONTE do disco, sem comentário (linha e bloco na MESMA varredura, `BL-027`), e procura
// USO — o nome do parâmetro como literal de código, o fragmento de query num texto, o `useSearchParams`
// e a montagem do endereço da ficha por interpolação ou concatenação. Allowlist de UM, escrito
// literalmente. A declaração da rota (`path="/clientes/:id"`) não monta endereço nenhum e não é acusada.
//
// Metade positiva (declarada aqui, COBRADA na T24 da `76`): a `ClientesPage` lê o recorte por
// `recorteDeClientesDoEndereco(search)`. Sem ela, apagar a leitura da página deixaria a ausência
// verdadeira e vazia (a lista abriria sempre em `todas`).
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const DONO = 'entities/customer/model/clientesHref.ts'

const semComentario = (texto: string): string =>
  texto.replace(/\r\n/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')

/** As formas proibidas fora do dono. Cada uma devolve as ocorrências achadas no texto. */
const FORMAS: { nome: string; re: RegExp }[] = [
  { nome: 'literal do parâmetro', re: /(['"`])recorte\1/g },
  { nome: 'fragmento de query', re: /[?&]recorte=/g },
  { nome: 'nome do parâmetro', re: /\bPARAM_RECORTE\b/g },
  { nome: 'useSearchParams', re: /\buseSearchParams\b/g },
  { nome: 'endereço da ficha montado', re: /\/clientes\/\$\{|\$\{\s*CLIENTES_PATH\s*\}\/|(['"`])\/clientes\/\1\s*\+/g },
]

const ocorrencias = (texto: string): string[] => {
  const c = semComentario(texto)
  return FORMAS.flatMap(({ nome, re }) => [...c.matchAll(re)].map((m) => `${nome}: ${m[0]}`))
}

/** A página chama o leitor do dono (uma CHAMADA, não uma menção em comentário). */
const leOEnderecoPeloDono = (texto: string): boolean => /\brecorteDeClientesDoEndereco\(/.test(semComentario(texto))
/** A página monta o endereço do chip pelo dono. */
const trocaOEnderecoPeloDono = (texto: string): boolean => /\bnavigate\(\s*clientesHref\(/.test(semComentario(texto))

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) return nome === '__tests__' || nome === 'test' ? [] : arquivos(caminho)
    return /\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome) ? [caminho] : []
  })

const lidos = arquivos(SRC).map((caminho) => ({ rel: relative(SRC, caminho).split('\\').join('/'), texto: readFileSync(caminho, 'utf8') }))

describe('o endereço da aba Clientes tem um dono só (MAC-07, MAC-14)', () => {
  it('âncora: o app foi lido, inclusive o dono e um consumidor conhecido', () => {
    expect(lidos.length).toBeGreaterThan(40)
    expect(lidos.map((l) => l.rel)).toContain(DONO)
    expect(lidos.map((l) => l.rel)).toContain('pages/ClientesPage.tsx')
  })

  it('âncora: o dono usa as formas que a régua procura (a régua enxerga o uso legítimo)', () => {
    const dono = lidos.find((l) => l.rel === DONO)!.texto
    const achadas = ocorrencias(dono)
    expect(achadas).toContain('nome do parâmetro: PARAM_RECORTE')
    expect(achadas.some((a) => a.startsWith('endereço da ficha montado'))).toBe(true)
    expect(semComentario(dono)).toMatch(/export const recorteDeClientesDoEndereco\b/)
  })

  it('metade positiva (T24): a ClientesPage lê o recorte por `recorteDeClientesDoEndereco` e os chips trocam por `clientesHref`', () => {
    const pagina = lidos.find((l) => l.rel === 'pages/ClientesPage.tsx')!.texto
    expect(leOEnderecoPeloDono(pagina)).toBe(true)
    expect(trocaOEnderecoPeloDono(pagina)).toBe(true)
  })

  it('nenhum outro arquivo de produção do app lê ou escreve o endereço à mão', () => {
    const fora = lidos
      .filter((l) => l.rel !== DONO)
      .flatMap((l) => ocorrencias(l.texto).map((o) => `${l.rel} — ${o}`))
    expect(fora).toEqual([])
  })
})

describe('sensores — a régua acusa cada forma e não acusa o que não é uso', () => {
  it('a metade positiva reprova a página sem a leitura (só em comentário, ou ausente) e a sem a troca pelo dono', () => {
    expect(leOEnderecoPeloDono('const r = recorteDeClientesDoEndereco(search)')).toBe(true)
    expect(leOEnderecoPeloDono('const r = DEFAULT')).toBe(false)
    expect(leOEnderecoPeloDono('// recorteDeClientesDoEndereco(search)\r\nconst r = 1')).toBe(false)
    expect(leOEnderecoPeloDono('/* recorteDeClientesDoEndereco(search) */')).toBe(false)
    expect(trocaOEnderecoPeloDono("navigate(clientesHref(id), { replace: true })")).toBe(true)
    expect(trocaOEnderecoPeloDono("navigate('/clientes?x=1')")).toBe(false)
  })

  it.each([
    ["new URLSearchParams(search).get('recorte')", 'literal do parâmetro'],
    ['p.get("recorte")', 'literal do parâmetro'],
    ['<Link to="/clientes?recorte=em-aberto" />', 'fragmento de query'],
    ['`/clientes?x=1&recorte=${id}`', 'fragmento de query'],
    ['import { PARAM_RECORTE } from "./x"', 'nome do parâmetro'],
    ['const [params] = useSearchParams()', 'useSearchParams'],
    ['<Link to={`/clientes/${c.id}`} />', 'endereço da ficha montado'],
    ['<Link to={`${CLIENTES_PATH}/${c.id}`} />', 'endereço da ficha montado'],
    ["navigate('/clientes/' + c.id)", 'endereço da ficha montado'],
  ])('acusa: %s', (codigo, forma) => {
    expect(ocorrencias(codigo).some((o) => o.startsWith(forma))).toBe(true)
  })

  it.each([
    ['<Route path="/clientes/:id" element={<ClientePage />} />'],
    ['<Link to={clienteHref(c.id)} />'],
    ['<Link to={clientesHref(\'em-aberto\')} />'],
    ['<a data-recorte="em-aberto" />'],
    ["const recorteAtual = 'todas'"],
    ['navigate(CLIENTES_PATH)'],
  ])('não acusa (um componente que apenas CHAMA o dono passa): %s', (codigo) => {
    expect(ocorrencias(codigo)).toEqual([])
  })

  it('a forma escrita em comentário não conta — com CRLF e com LF', () => {
    expect(ocorrencias("// lê 'recorte' e ?recorte=\r\nconst x = 1")).toEqual([])
    expect(ocorrencias("// lê 'recorte' e ?recorte=\nconst x = 1")).toEqual([])
    expect(ocorrencias('/* useSearchParams */ const y = 2')).toEqual([])
  })

  it('o código DEPOIS do comentário continua acusado (CRLF não engole a linha seguinte)', () => {
    expect(ocorrencias("// nota\r\nconst p = 'recorte'")).toEqual(["literal do parâmetro: 'recorte'"])
  })

  it('o glob de dois asteriscos dentro de um bloco não cega a régua (BL-027)', () => {
    expect(ocorrencias('/* src/**/x.ts */ const p = useSearchParams()')).toEqual(['useSearchParams: useSearchParams'])
  })
})
