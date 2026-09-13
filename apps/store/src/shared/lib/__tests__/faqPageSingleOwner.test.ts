import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `FAQL-33` — `faq_page_items` tem **um leitor por app**, e o guarda diz quais.
 *
 * A propriedade ruim de sempre: uma segunda tela abrindo `from('faq_page_items')` não quebra nada.
 * Ela só passa a ordenar, agrupar e resolver o override por conta — e no primeiro ajuste de regra
 * (pular entrada inativa, desempatar `position`, tratar override de espaço) as duas leituras
 * divergem, com a suíte verde. É o "defeito 01" aplicado à colocação.
 *
 * **O escopo inclui `supabase/functions/**`, e isso não é zelo.** Na feature 39 este mesmo tipo de
 * guarda varria só `['apps']`, e a edge function do sitemap seguia pedindo a coluna legado ao banco
 * (`L-035`): guarda com alcance menor que a regra é allowlist com outro nome. A âncora abaixo
 * **nomeia um arquivo de cada ponta** para provar que as duas árvores foram lidas de verdade.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/** As duas árvores, escritas por extenso: a régua nunca é o objeto medido. */
const ESCOPO = [join(ROOT, 'apps'), join(ROOT, 'supabase/functions')]

/** Os **dois** leitores legítimos — um por app. Escritos literalmente, nunca derivados. */
const DONOS = [
  'apps/store/src/entities/faq/api/useFaqPage.ts',
  'apps/backoffice/src/features/faq-page/api/useAdminFaqPage.ts',
]

const EXTENSOES = ['.ts', '.tsx']
const IGNORAR = ['node_modules', 'dist', '.turbo']

const varrer = (dir: string): string[] => {
  let saida: string[] = []
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.includes(nome)) continue
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) saida = saida.concat(varrer(caminho))
    else if (EXTENSOES.some(e => nome.endsWith(e))) saida.push(caminho)
  }
  return saida
}

/**
 * Comentário fora ANTES de medir — e **CRLF normalizado primeiro**.
 *
 * Em JavaScript o `.` não casa `\r` e o `$` sem `m` não ancora antes dele: num checkout Windows um
 * stripper de linha escrito sem isso fica inerte, e o guarda passa a acusar a própria prosa que
 * explica a regra (`L-031`). O bloco e a linha saem na **mesma** varredura (`BL-027`).
 */
const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

const ARQUIVOS = ESCOPO.flatMap(varrer)

/** Quem abre a tabela, fora dos donos. */
const infratores = ARQUIVOS.filter(caminho => {
  const rel = relative(ROOT, caminho).replace(/\\/g, '/')
  if (DONOS.includes(rel)) return false
  if (rel.includes('__tests__') || rel.endsWith('.test.ts') || rel.endsWith('.test.tsx')) return false
  return /from\(\s*['"]faq_page_items['"]\s*\)/.test(semComentarios(readFileSync(caminho, 'utf8')))
}).map(c => relative(ROOT, c).replace(/\\/g, '/'))

describe('faq_page_items tem um dono por app', () => {
  // ÂNCORA 1 — a varredura leu arquivo de verdade, nas DUAS árvores.
  it('a varredura alcança `apps/**` e `supabase/functions/**`', () => {
    expect(ARQUIVOS.length).toBeGreaterThan(400)

    const rel = ARQUIVOS.map(c => relative(ROOT, c).replace(/\\/g, '/'))
    expect(rel.some(f => f.startsWith('apps/store/src/'))).toBe(true)
    expect(rel.some(f => f.startsWith('apps/backoffice/src/'))).toBe(true)
    // A ponta que a feature 39 deixou de fora, e que custou uma coluna legado viva em produção.
    expect(rel.some(f => f.startsWith('supabase/functions/'))).toBe(true)
  })

  // ÂNCORA 2 — os donos existem e realmente abrem a tabela. Sem isto, renomear os dois arquivos
  // deixaria a lista de infratores vazia por vacuidade.
  it('os dois donos existem e abrem a tabela', () => {
    for (const dono of DONOS) {
      const fonte = semComentarios(readFileSync(join(ROOT, dono), 'utf8'))
      expect(fonte, dono).toMatch(/from\(\s*['"]faq_page_items['"]\s*\)/)
    }
  })

  it('nenhum outro arquivo de produção abre `faq_page_items`', () => {
    expect(infratores).toEqual([])
  })
})

describe('a régua é sensível', () => {
  it('acusa a leitura, escrita como o supabase-js a escreve', () => {
    const injetado = "const { data } = await supabase.from('faq_page_items').select('*')"
    expect(/from\(\s*['"]faq_page_items['"]\s*\)/.test(semComentarios(injetado))).toBe(true)
  })

  it('acusa com aspas duplas e com espaço dentro dos parênteses', () => {
    expect(/from\(\s*['"]faq_page_items['"]\s*\)/.test('from( "faq_page_items" )')).toBe(true)
  })

  it('NÃO acusa outra tabela cujo nome contém a mesma raiz', () => {
    expect(/from\(\s*['"]faq_page_items['"]\s*\)/.test("from('faq_usage')")).toBe(false)
    expect(/from\(\s*['"]faq_page_items['"]\s*\)/.test("from('faqs')")).toBe(false)
  })

  // Os três sensores do removedor de comentário — o ponto cego que a `BL-027` fechou.
  it('o removedor apaga comentário de LINHA, com LF e com CRLF', () => {
    const lf = "// from('faq_page_items') explicado aqui\nexport const x = 1\n"
    expect(semComentarios(lf)).not.toContain('faq_page_items')
    expect(semComentarios(lf.replace(/\n/g, '\r\n'))).not.toContain('faq_page_items')
  })

  it('o removedor apaga comentário de BLOCO na mesma varredura', () => {
    const bloco = "/* ninguém além do dono faz from('faq_page_items') */\nexport const x = 1\n"
    expect(semComentarios(bloco)).not.toContain('faq_page_items')
  })

  it('mas não come o código ao redor do comentário', () => {
    const misto = "// nota\nconst a = supabase.from('faq_page_items')\n"
    expect(semComentarios(misto)).toContain("from('faq_page_items')")
  })
})
