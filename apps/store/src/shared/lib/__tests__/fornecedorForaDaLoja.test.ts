import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Feature 80 (FOR-03) — o fornecedor da peça é só do painel, e NADA que serve a cliente o nomeia.
 *
 * O banco já recusa a leitura (RLS + `revoke` do anon, guardados por `fornecedorSchema.test.ts`), e
 * por isso um `select` público que pedisse a tabela falharia com 401. Este guarda fecha a outra
 * metade: a loja, a função `api/page` e as edge functions (feed do Google, sitemap, e-mail) não
 * podem nem PEDIR — uma edge function roda com a chave de serviço, que ignora o RLS, e um embed do
 * fornecedor no feed publicaria o nome dele para o Google sem erro nenhum.
 *
 * **Âncora dupla**: os arquivos lidos passam de um piso, e cada escopo tem ao menos um arquivo.
 * **Allowlist de DOIS**, escrita literalmente: este guarda e o da migration, que precisam carregar
 * o nome das tabelas.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * Os escopos, por extenso: a régua nunca é o objeto medido. `packages/core/src` entra INTEIRO porque é
 * lá que mora o código que a função `api/page`, o feed e o sitemap executam (`core/page`,
 * `core/shopping`, `core/sitemap`) — a primeira escrita deste guarda cobria só a borda de `apps/store`
 * e deixava passar um embed plantado em `core/page/serve.ts` (achado da verificação, M40). O dono dos
 * limites (`core/suppliers`) descreve as colunas sem escrever o nome das tabelas, e por isso não
 * precisa de exceção.
 */
const ESCOPOS = ['apps/store/src', 'apps/store/server', 'apps/store/api', 'supabase/functions', 'packages/core/src'] as const

const PERMITIDOS = new Set([
  'apps/store/src/shared/lib/__tests__/fornecedorForaDaLoja.test.ts',
  'apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts',
])

const arquivos = (dir: string): string[] =>
  readdirSync(dir).flatMap(nome => {
    const caminho = join(dir, nome)
    if (nome === 'node_modules' || nome.startsWith('.')) return []
    if (statSync(caminho).isDirectory()) return arquivos(caminho)
    return /\.(ts|tsx|mjs|js)$/.test(nome) ? [caminho] : []
  })

/** O nome das tabelas como token: `suppliers` e `product_suppliers`, nunca como pedaço de palavra. */
const TABELA = /(?<![\w-])(?:product_)?suppliers(?![\w-])/

/** As ocorrências `arquivo:linha` num texto. */
const ocorrencias = (rel: string, texto: string): string[] =>
  texto
    .replace(/\r\n/g, '\n')
    .split('\n')
    .flatMap((linha, i) => (TABELA.test(linha) ? [`${rel}:${i + 1}`] : []))

const LIDOS = ESCOPOS.map(e => ({ escopo: e, arquivos: arquivos(join(ROOT, e)) }))

describe('fornecedorForaDaLoja — âncora', () => {
  it('cada escopo tem arquivos, e o total passa do piso', () => {
    for (const { escopo, arquivos: lista } of LIDOS) expect(lista.length, escopo).toBeGreaterThan(0)
    expect(LIDOS.reduce((n, l) => n + l.arquivos.length, 0)).toBeGreaterThan(300)
  })

  it('o guarda da migration, permitido, de fato carrega o nome (senão a allowlist esconde nada)', () => {
    const rel = 'apps/store/src/shared/lib/__tests__/fornecedorSchema.test.ts'
    expect(ocorrencias(rel, readFileSync(join(ROOT, rel), 'utf8')).length).toBeGreaterThan(0)
  })
})

describe('FOR-03 — nada que serve a cliente nomeia o fornecedor', () => {
  it('zero ocorrência fora da allowlist', () => {
    const achados = LIDOS.flatMap(({ arquivos: lista }) =>
      lista.flatMap(abs => {
        const rel = relative(ROOT, abs).split('\\').join('/')
        return PERMITIDOS.has(rel) ? [] : ocorrencias(rel, readFileSync(abs, 'utf8'))
      }),
    )
    expect(achados, 'o fornecedor é só do painel (feature 80)').toEqual([])
  })

  it('sensor: o embed no select, a tabela no from e o nome em string são acusados', () => {
    expect(ocorrencias('x.ts', "select('id, name, product_suppliers(url)')")).toEqual(['x.ts:1'])
    expect(ocorrencias('x.ts', "const a = 1\r\nsupabase.from('suppliers')")).toEqual(['x.ts:2'])
  })

  it('o código que a função `api/page` executa está no alcance', () => {
    const lidos = LIDOS.flatMap(l => l.arquivos).map(a => relative(ROOT, a).split('\\').join('/'))
    expect(lidos).toContain('packages/core/src/page/serve.ts')
    expect(lidos).toContain('packages/core/src/shopping/offer.ts')
  })

  it('sensor inverso: palavra que só CONTÉM o nome não é acusada', () => {
    expect(ocorrencias('x.ts', 'const allSuppliersCount = 0 // suppliers-list')).toEqual([])
  })
})
