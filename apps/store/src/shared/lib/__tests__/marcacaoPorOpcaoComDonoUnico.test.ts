import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

/**
 * **A marcação por opção é lida pela loja só através de `core/filters`** — feature 67, `VFL-38`.
 *
 * A marcação por opção decide duas coisas que a cliente vê: se a peça passa pelo filtro e em QUAL
 * variação o card abre. As duas são de `matchProduct` (`@estrelinha/core/filters`), que exige que a
 * MESMA variação satisfaça todos os grupos. Uma tela que lesse a marcação por conta — "tem Prata 925
 * em alguma opção? então passa" — somaria a peça (o par Prata 925 + Chaveiro em variações
 * diferentes passaria) e divergiria das contagens sem nada quebrar: build, `tsc` e teste de
 * componente verdes, e a cliente filtrando por um par que a peça não vende.
 *
 * Por isso, em `apps/store/src/**` (fora de teste), o NOME da tabela e o NOME do campo do produto
 * aparecem num arquivo só: o mapper, que traduz a linha do banco para o `Product`. Quem filtra
 * entrega o produto inteiro a `core` e nunca nomeia o campo — e é isso que este guarda mede.
 *
 * **Zero allowlist além do dono**, escrito literalmente. ÂNCORA DUPLA: (1) a varredura leu o app e
 * nomeia os arquivos que importam; (2) a metade POSITIVA — o dono nomeia as duas coisas, e o modelo
 * da listagem delega a `matchProduct` e a `facetCounts`. Sem a (2), apagar a feature inteira deixaria
 * a ausência verdadeira e vazia.
 *
 * A régua roda sobre o fonte SEM COMENTÁRIO (linha e bloco na mesma varredura, `BL-027`): os
 * arquivos explicam em prosa por que não leem o campo, e uma régua que lesse prosa reprovaria a
 * explicação.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const SRC = resolve(HERE, '../../..')

/** O dono, escrito por extenso — a régua nunca é o objeto medido. */
const DONO = 'entities/product/lib/mapProduct.ts'
const MODELO = 'features/category-filters/model/filters.ts'

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.startsWith('test/') || /\.test\.tsx?$/.test(rel)

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return /\.tsx?$/.test(entry.name) ? [full] : []
  })

/** Linha e bloco NA MESMA varredura, depois de normalizar CRLF; `//` só fora de `:` e de aspas. */
export const semComentario = (fonte: string): string =>
  String(fonte ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/\/\*[\s\S]*?\*\/|(?<![:\w'"`])\/\/[^\n]*/g, '')

/** As duas formas, por token exato — `_` é caractere de palavra, então o recorte é `[\w$]`. */
const FORMAS: [string, RegExp][] = [
  ['a tabela', /(?<![\w$])product_option_filter_values(?![\w$])/],
  ['o campo', /(?<![\w$])option_marks(?![\w$])/],
]

/** A régua, como predicado — asserção e sensor chamam a mesma função. */
export const nomeiaMarcacao = (fonte: string): string[] => {
  const codigo = semComentario(fonte)
  return FORMAS.filter(([, re]) => re.test(codigo)).map(([nome]) => nome)
}

const escopo = arquivos(SRC)
  .map(full => relative(SRC, full).split('\\').join('/'))
  .filter(rel => !eTeste(rel))
  .map(rel => ({ rel, fonte: readFileSync(join(SRC, rel), 'utf8') }))

const fonteDe = (rel: string): string => {
  const achado = escopo.find(a => a.rel === rel)
  if (!achado) throw new Error(`o guarda não leu ${rel}`)
  return achado.fonte
}

describe('a marcação por opção tem UM leitor na loja (VFL-38)', () => {
  it('âncora 1: a varredura leu o app inteiro, inclusive os arquivos que a feature tocou', () => {
    expect(escopo.length).toBeGreaterThan(300)
    const lidos = escopo.map(a => a.rel)
    for (const rel of [
      DONO,
      MODELO,
      'entities/product/ui/ProductCard.tsx',
      'pages/CategoryPage.tsx',
      'pages/SearchPage.tsx',
    ]) {
      expect(lidos, rel).toContain(rel)
    }
    expect(lidos.some(eTeste)).toBe(false)
  })

  it('âncora 2 (metade positiva): o dono nomeia a tabela e o campo, em CÓDIGO', () => {
    expect(nomeiaMarcacao(fonteDe(DONO))).toEqual(['a tabela', 'o campo'])
  })

  it('âncora 2 (metade positiva): o modelo da listagem entrega a decisão a `core`', () => {
    const modelo = semComentario(fonteDe(MODELO))
    expect(modelo).toMatch(/\bmatchProduct\(/)
    expect(modelo).toMatch(/\bfacetCounts\(/)
    expect(modelo).toMatch(/from '@estrelinha\/core\/filters'/)
  })

  it('nenhum outro arquivo da loja nomeia a tabela ou o campo', () => {
    const infratores = escopo
      .filter(a => a.rel !== DONO)
      .map(a => ({ rel: a.rel, formas: nomeiaMarcacao(a.fonte) }))
      .filter(a => a.formas.length > 0)
    expect(infratores).toEqual([])
  })
})

describe('sensores da régua', () => {
  it('cada forma reprova, uma por caso', () => {
    expect(nomeiaMarcacao("const s = 'id, product_option_filter_values(option_name)'")).toEqual(['a tabela'])
    expect(nomeiaMarcacao('const m = product.option_marks')).toEqual(['o campo'])
    expect(nomeiaMarcacao("const m = product['option_marks']")).toEqual(['o campo'])
    expect(nomeiaMarcacao('const { option_marks } = product')).toEqual(['o campo'])
  })

  it('inverso: os vizinhos da 66 e das variações NÃO são acusados', () => {
    expect(
      nomeiaMarcacao('p.filter_value_ids; v.option_values; product_filter_values(value_id); p.options'),
    ).toEqual([])
  })

  it('inverso: identificador que só CONTÉM o nome não é o nome', () => {
    expect(nomeiaMarcacao('const option_marks_count = 1; const my_product_option_filter_values = 2')).toEqual([])
  })

  it('a prosa não é acusada — com LF', () => {
    expect(nomeiaMarcacao('// option_marks vem do mapper\nconst a = 1\n/* product_option_filter_values */\n')).toEqual([])
  })

  it('a prosa não é acusada — com CRLF', () => {
    expect(nomeiaMarcacao('// option_marks\r\nconst a = 1\r\n/* product_option_filter_values\r\n */\r\n')).toEqual([])
  })

  it('o glob de dois asteriscos num comentário de linha não cega o resto do arquivo (`BL-027`)', () => {
    // O abre-bloco do glob não tem fecho na mesma linha: um removedor em duas passadas apagaria até o
    // fecho do bloco seguinte, levando a linha de código junto — e a régua passaria cega.
    const fonte = ['// varre apps/** e mais nada', 'const m = p.option_marks', '/* bloco */'].join('\n')
    expect(nomeiaMarcacao(fonte)).toEqual(['o campo'])
    const duasPassadas = (f: string) => f.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(duasPassadas(fonte)).not.toContain('option_marks')
  })

  it('`https://` dentro de string não vira comentário e não esconde o resto da linha', () => {
    expect(nomeiaMarcacao("const u = 'https://exemplo.invalid'; const m = p.option_marks")).toEqual(['o campo'])
  })

  it('o colhedor REAL acusa: o modelo da listagem com a leitura reinjetada reprova', () => {
    const real = fonteDe(MODELO)
    expect(nomeiaMarcacao(real)).toEqual([])
    const mutado = real.replace(
      'export const filterMatches = (',
      'const porOpcao = (p: Product) => p.option_marks ?? []\n\nexport const filterMatches = (',
    )
    expect(mutado).not.toBe(real)
    expect(nomeiaMarcacao(mutado)).toEqual(['o campo'])
  })

  it('o colhedor REAL acusa: o card pedindo a tabela por conta própria reprova', () => {
    const real = fonteDe('entities/product/ui/ProductCard.tsx')
    expect(nomeiaMarcacao(real)).toEqual([])
    const mutado = `${real}\nexport const EMBED = 'product_option_filter_values(value_id)'\n`
    expect(nomeiaMarcacao(mutado)).toEqual(['a tabela'])
  })
})
