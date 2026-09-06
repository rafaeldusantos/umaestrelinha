import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { semComentarios } from '@/test/sourceScan'

/**
 * **A árvore de categorias tem UM dono** — `PRF-20`.
 *
 * Até a feature 40, `useProducts` fazia o próprio `from('categories').select('id, parent_id, slug')`
 * **dentro** do `queryFn`. Como a chave dele carrega o slug e o limite
 * (`['products', slug, limit]`), cada fileira da home emitia a **sua** cópia da consulta — e o React
 * Query não tinha como fundi-las, porque as chaves eram diferentes.
 *
 * O preço, medido no Lighthouse de 2026-09-06 (móvel, Slow 4G simulado):
 *
 * ```
 *  583ms  categories?select=*            ->  884ms   (o header — ja trazia id/parent_id/slug)
 * 1007ms  4x categories?select=id,...    -> 1301, 1898, 2143, 2356ms
 * 1304ms  products fileira 1 -> 1607
 * 1908ms  products fileira 2 -> 2259     <- cada uma esperava A SUA arvore
 * 2145ms  products fileira 3 -> 2841
 * 2358ms  products fileira 4 -> 3010
 * ```
 *
 * Quatro requisições idênticas, quatro preflights CORS, e uma cauda de 3,0 s — para um dado que já
 * estava em cache desde 884 ms.
 *
 * **Por que um guarda e não só o conserto.** Voltar a abrir consulta própria não quebra nada: o
 * build passa, o `tsc` passa, o teste de componente passa, e a tela desenha igual. O único sintoma é
 * a página ficar mais lenta — que é exatamente o tipo de defeito que ninguém vê num diff. É a mesma
 * família do `renditionSingleOwner` e do `freeShippingSingleOwner`.
 *
 * ÂNCORA DUPLA: a varredura prova que **leu arquivos** e que a **régua acha o que procura** (o
 * arquivo do dono casa). Só contar arquivos deixa passar um regex quebrado; só procurar ocorrência
 * deixa passar um caminho errado.
 *
 * A régua é escrita **literalmente** aqui, não derivada de constante que o código sob teste exporte
 * — lição da `fieldBorder`.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** Escopo literal. */
const ESCOPO = 'apps/store/src'

/**
 * O dono, escrito literalmente.
 *
 * **Zero allowlist além dele.** `useCategoryBySlug` mora no mesmo arquivo de propósito: quem fala
 * com a tabela `categories` na loja é este módulo, e mais ninguém.
 */
const DONO = 'apps/store/src/entities/category/api/useCategories.ts'

const IGNORADOS = new Set(['node_modules', 'dist', '.turbo', '.temp', 'coverage', '.git'])
const EXTENSOES = ['.ts', '.tsx']

const arquivos = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (IGNORADOS.has(entry.name)) return []
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return arquivos(full)
    return entry.isFile() && EXTENSOES.some((ext) => entry.name.endsWith(ext)) ? [full] : []
  })

const eTeste = (rel: string): boolean =>
  rel.includes('__tests__/') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')

/**
 * A régua, como **predicado** — para que asserção e sensor chamem a mesma função (`BL-028`).
 *
 * Roda sobre o fonte **sem comentário**: este arquivo inteiro cita a chamada proibida ao explicar o
 * defeito, e uma régua que lesse comentário reprovaria a própria documentação.
 */
export const leCategoriasDireto = (fonte: string): boolean =>
  /\.from\(\s*['"]categories['"]\s*\)/.test(semComentarios(fonte))

describe('a árvore de categorias tem um dono só (PRF-20)', () => {
  const encontrados = arquivos(join(ROOT, ESCOPO))
    .map((full) => ({
      rel: relative(ROOT, full).split('\\').join('/'),
      fonte: readFileSync(full, 'utf8'),
    }))
    .filter((a) => !eTeste(a.rel))

  it('a varredura leu arquivos de verdade (âncora 1)', () => {
    expect(encontrados.length).toBeGreaterThan(200)
  })

  it('a régua acha a chamada no arquivo do dono (âncora 2)', () => {
    const dono = encontrados.find((a) => a.rel === DONO)
    expect(dono, `o dono ${DONO} não foi lido — caminho errado?`).toBeDefined()
    expect(leCategoriasDireto(dono!.fonte)).toBe(true)
  })

  it('nenhum arquivo fora do dono consulta `categories` direto', () => {
    const infratores = encontrados
      .filter((a) => a.rel !== DONO)
      .filter((a) => leCategoriasDireto(a.fonte))
      .map((a) => a.rel)

    expect(
      infratores,
      `Estes arquivos abrem consulta própria a \`categories\`. Use ` +
        `\`categoriesQueryOptions()\` de ${DONO} — a chave compartilhada é o que impede a home de ` +
        `emitir uma requisição por fileira (PRF-20).`,
    ).toEqual([])
  })

  it('SENSOR: a régua reprova quem volta a abrir consulta própria', () => {
    const recaida = `
      const { data } = await supabase.from('categories').select('id, parent_id, slug')
    `
    expect(leCategoriasDireto(recaida)).toBe(true)
  })

  it('SENSOR: a régua NÃO se deixa enganar por comentário', () => {
    const soComentario = `
      // antes isto fazia supabase.from('categories').select('*')
      /* e aqui também: .from("categories") */
      const rows = await queryClient.fetchQuery(categoriesQueryOptions())
    `
    expect(leCategoriasDireto(soComentario)).toBe(false)
  })
})
