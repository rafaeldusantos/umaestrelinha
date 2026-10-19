import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **Nenhum filtro da loja lê a tag do produto** — feature 66, `FLT-44`.
 *
 * A tag tem dois papéis que não convivem: etiqueta INTERNA da dona (fornecedor, "Corrigir", "seo",
 * grafias duplicadas) e atributo público. O filtro "Universo" a exibia como filtro, e saiu em
 * `878ef19`; a feature 66 pôs no lugar os grupos curados no painel. Voltar a ler a tag num filtro
 * não quebra nada — build, `tsc` e teste de componente passam, e a cliente passa a ver "dados2"
 * como opção de filtro. Por isso um guarda que lê o fonte do disco.
 *
 * A busca (`features/search`) continua PONTUANDO a tag, e isso é outra coisa: a busca casa texto,
 * não oferece a tag como opção. Ela está fora do escopo de propósito.
 *
 * ÂNCORA DUPLA: (1) a varredura leu os arquivos do escopo — contados e nomeados; (2) a metade
 * POSITIVA: o modelo do slice delega a `matchProduct` de `core`, e as duas páginas leem o
 * catálogo curado. Sem a (2), apagar o filtro inteiro deixaria a ausência de tag verdadeira e vazia.
 *
 * A régua é escrita LITERALMENTE aqui e roda sobre o fonte SEM COMENTÁRIO — os arquivos do escopo
 * explicam em prosa por que a tag saiu, e uma régua que lesse prosa reprovaria a explicação.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

/** O escopo, escrito por extenso — a régua nunca é o objeto medido. */
const DIRETORIO = 'features/category-filters'
const PAGINAS = ['pages/CategoryPage.tsx', 'pages/SearchPage.tsx']

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || /\.test\.tsx?$/.test(rel)

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })

/**
 * Remove comentário de linha e de bloco NA MESMA varredura (`BL-027`), depois de normalizar CRLF.
 *
 * Em duas passadas, um comentário de linha que cite um glob de dois asteriscos carrega um abre-bloco
 * que a régua de bloco trata como abertura, e ela apaga até o próximo fecha-bloco do arquivo —
 * inclusive código. O `//` de linha só conta fora de `:` (para `https://` numa string sobreviver).
 */
export const semComentario = (fonte: string): string =>
  String(fonte ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\/|(?<![:\w'"`])\/\/[^\n]*/g, '')

/** A régua, como predicado — asserção e sensor chamam a mesma função. */
export const leTag = (fonte: string): string[] => {
  const codigo = semComentario(fonte)
  const achados: string[] = []
  const formas: [string, RegExp][] = [
    ['leitura `.tags`', /\.tags(?![\w$])/],
    ['leitura `?.tags`', /\?\.tags(?![\w$])/],
    ['índice `["tags"]`', /\[\s*['"`]tags['"`]\s*\]/],
    ['desestruturação `{ tags }`', /\{[^{}]*(?<![\w$])tags(?![\w$])[^{}]*\}\s*=/],
    ['`collectTags`', /(?<![\w$])collectTags(?![\w$])/],
    ['`toggleTag`', /(?<![\w$])toggleTag(?![\w$])/],
  ]
  for (const [nome, re] of formas) if (re.test(codigo)) achados.push(nome)
  return achados
}

const ler = (rel: string) => ({ rel, fonte: readFileSync(join(SRC, rel), 'utf8') })

const escopo = [
  ...arquivos(join(SRC, DIRETORIO))
    .map(full => relative(SRC, full).split('\\').join('/'))
    .filter(rel => !eTeste(rel))
    .map(ler),
  ...PAGINAS.map(ler),
]

describe('nenhum filtro da loja lê a tag (FLT-44)', () => {
  it('âncora 1: a varredura leu o slice inteiro e as duas páginas, nomeados', () => {
    const lidos = escopo.map(a => a.rel).sort()
    expect(lidos).toEqual(
      [
        'features/category-filters/index.ts',
        'features/category-filters/model/filters.ts',
        'features/category-filters/model/useFilterUrlState.ts',
        'features/category-filters/ui/CategoryFiltersPanel.tsx',
        'features/category-filters/ui/CategoryFiltersSheet.tsx',
        'pages/CategoryPage.tsx',
        'pages/SearchPage.tsx',
      ].sort(),
    )
    for (const a of escopo) expect(a.fonte.length, a.rel).toBeGreaterThan(50)
  })

  it('âncora 2 (metade positiva): o modelo delega a `matchProduct` e as páginas leem o catálogo curado', () => {
    const fonte = (rel: string) => semComentario(escopo.find(a => a.rel === rel)!.fonte)
    // Era `passesSelection(` até a feature 67: a lista passou a sair de `matchProduct`, que devolve
    // também a variação — a mesma regra de `core`, um degrau abaixo (`passesSelection` a chama).
    expect(fonte('features/category-filters/model/filters.ts')).toMatch(/matchProduct\(/)
    expect(fonte('features/category-filters/model/filters.ts')).toMatch(/facetCounts\(/)
    expect(fonte('pages/CategoryPage.tsx')).toMatch(/useFilterCatalog\(\)/)
    expect(fonte('pages/SearchPage.tsx')).toMatch(/useFilterCatalog\(\)/)
  })

  it('nenhum arquivo do escopo lê a tag', () => {
    const infratores = escopo
      .map(a => ({ rel: a.rel, formas: leTag(a.fonte) }))
      .filter(a => a.formas.length > 0)
    expect(infratores).toEqual([])
  })
})

describe('sensores da régua', () => {
  it('cada forma de leitura reprova, uma por caso', () => {
    expect(leTag('const t = product.tags')).toEqual(['leitura `.tags`'])
    expect(leTag('const t = product?.tags')).toEqual(['leitura `.tags`', 'leitura `?.tags`'])
    expect(leTag("const t = product['tags']")).toEqual(['índice `["tags"]`'])
    expect(leTag('const { id, tags } = product')).toEqual(['desestruturação `{ tags }`'])
    expect(leTag('const opcoes = collectTags(products)')).toEqual(['`collectTags`'])
    expect(leTag('onChange(toggleTag(filters, tag))')).toEqual(['`toggleTag`'])
  })

  it('inverso: nome parecido NÃO é acusado (`hashtags`, `tagsDaBusca`, `filter_value_ids`)', () => {
    expect(leTag('const x = p.hashtags; const tagsDaBusca = 1; p.filter_value_ids')).toEqual([])
  })

  it('a prosa que explica a remoção não é acusada — com LF', () => {
    const fonte = "// antes: products.flatMap(p => p.tags) e collectTags\nconst a = 1\n/* toggleTag(f, 'x') */\n"
    expect(leTag(fonte)).toEqual([])
  })

  it('a prosa que explica a remoção não é acusada — com CRLF', () => {
    const fonte = '// antes: p.tags\r\nconst a = 1\r\n/* collectTags\r\n */\r\n'
    expect(leTag(fonte)).toEqual([])
  })

  it('o glob de dois asteriscos num comentário de linha NÃO cega a régua para o código abaixo (BL-027)', () => {
    const fonte = [
      '// varre apps/** e mais nada',
      'const x = p.tags',
      '/* bloco de verdade */',
    ].join('\n')
    expect(leTag(fonte)).toEqual(['leitura `.tags`'])
  })

  it('`https://` dentro de string não vira comentário e não esconde o resto da linha', () => {
    expect(leTag("const u = 'https://exemplo.invalid'; const t = p.tags")).toEqual(['leitura `.tags`'])
  })

  it('o colhedor REAL acusa: o modelo do slice com a leitura reinjetada reprova', () => {
    const real = escopo.find(a => a.rel === 'features/category-filters/model/filters.ts')!.fonte
    expect(leTag(real)).toEqual([])
    const mutado = real.replace(
      'export const filterProducts = (',
      'export const universos = (ps: readonly Product[]) => ps.flatMap(p => p.tags)\n\nexport const filterProducts = (',
    )
    expect(mutado).not.toBe(real)
    expect(leTag(mutado)).toEqual(['leitura `.tags`'])
  })
})
