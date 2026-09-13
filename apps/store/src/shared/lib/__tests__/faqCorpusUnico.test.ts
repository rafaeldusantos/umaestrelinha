import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * `FAQL-32` — existe **um** corpus de pergunta e resposta neste projeto, e ele é `faqs`.
 *
 * A feature 46 foi construída sobre essa premissa: a página da loja e as páginas de produto leem a
 * mesma biblioteca, por vínculos diferentes (`faq_page_items` e `product_faqs`). É isso que faz
 * editar uma resposta alcançar os dois lugares — e é isso que dá ao agente de IA, quando ele vier,
 * **um** lugar para ler em vez de dois que discordam.
 *
 * As duas formas de perder essa propriedade, e as duas têm régua aqui:
 *
 * 1. **Uma segunda TABELA** de pergunta e resposta numa migration.
 * 2. **Uma lista de perguntas escrita em código**, que é exatamente o que a loja tinha antes da
 *    feature 28 — duas perguntas genéricas cravadas num acordeão, iguais nos 691 produtos.
 *
 * ⚠️ **A régua procura DECLARAÇÃO, nunca menção.** Proibir a menção proibiria o uso que este guarda
 * existe para proteger: o comentário que explica a regra, o `import type`, a consulta ao dono. É a
 * mesma distinção que `donoUnicoDoGuia.test.ts` faz.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

const EXTENSOES = ['.ts', '.tsx']
const IGNORAR = ['node_modules', 'dist', '.turbo']

const varrer = (dir: string, extensoes: string[] = EXTENSOES): string[] => {
  let saida: string[] = []
  for (const nome of readdirSync(dir)) {
    if (IGNORAR.includes(nome)) continue
    const caminho = join(dir, nome)
    if (statSync(caminho).isDirectory()) saida = saida.concat(varrer(caminho, extensoes))
    else if (extensoes.some(e => nome.endsWith(e))) saida.push(caminho)
  }
  return saida
}

const rel = (caminho: string) => relative(ROOT, caminho).replace(/\\/g, '/')

const semComentarios = (fonte: string): string =>
  fonte.replace(/\r\n?/g, '\n').replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '')

// ---------------------------------------------------------------------------------------------
// 1 · Nenhuma segunda TABELA de pergunta e resposta
// ---------------------------------------------------------------------------------------------

/** As três que existem: a biblioteca e os dois vínculos sobre ela. */
const TABELAS_LEGITIMAS = ['faqs', 'product_faqs', 'faq_page_items']

const MIGRATIONS = varrer(join(ROOT, 'supabase/migrations'), ['.sql'])

/** Um `create table` cujo corpo declara pergunta **e** resposta. */
const tabelasDeQA = MIGRATIONS.flatMap(caminho => {
  const sql = readFileSync(caminho, 'utf8').replace(/--[^\n]*/g, '')
  return [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)]
    .filter(([, , corpo]) => /\bquestion\b|\bpergunta\b/.test(corpo) && /\banswer\b|\bresposta\b/.test(corpo))
    .map(([, nome]) => nome)
})

// ---------------------------------------------------------------------------------------------
// 2 · Nenhuma LISTA de perguntas escrita em código
// ---------------------------------------------------------------------------------------------

const FONTES = varrer(join(ROOT, 'apps')).filter(
  c => !rel(c).includes('__tests__') && !/\.test\.tsx?$/.test(c),
)

/**
 * Um literal de objeto que declara `question` **e** `answer` como campos com valor de texto — ou
 * seja, conteúdo escrito ali, não um tipo e não uma leitura.
 *
 * A janela é de 200 caracteres para os dois campos caberem no mesmo objeto sem casar dois objetos
 * distintos que por acaso se seguem.
 */
const LITERAL_DE_QA = /question:\s*['"`][\s\S]{0,200}?answer:\s*['"`]/

const listasEmCodigo = FONTES.filter(c => LITERAL_DE_QA.test(semComentarios(readFileSync(c, 'utf8')))).map(rel)

describe('o corpus de pergunta e resposta é um só', () => {
  // ÂNCORA — sem ela, um caminho errado varre zero e as duas regras passam sobre nada.
  it('a varredura leu as migrations e o código dos dois apps', () => {
    expect(MIGRATIONS.length).toBeGreaterThan(40)
    expect(FONTES.length).toBeGreaterThan(400)
    expect(FONTES.some(c => rel(c).startsWith('apps/store/src/'))).toBe(true)
    expect(FONTES.some(c => rel(c).startsWith('apps/backoffice/src/'))).toBe(true)
  })

  // ÂNCORA 2 — a régua das tabelas encontra as que EXISTEM. Sem isto, um regex quebrado devolveria
  // lista vazia e o teste abaixo passaria para sempre.
  it('a régua encontra a biblioteca e os dois vínculos que existem', () => {
    expect(tabelasDeQA).toContain('faqs')
    expect(tabelasDeQA.length).toBeGreaterThanOrEqual(1)
  })

  it('nenhuma migration cria uma SEGUNDA tabela de pergunta e resposta', () => {
    expect(tabelasDeQA.filter(t => !TABELAS_LEGITIMAS.includes(t))).toEqual([])
  })

  // O estado anterior à feature 28: duas perguntas genéricas cravadas num acordeão, iguais nos 691
  // produtos. A resposta não pode voltar para o JSX.
  it('nenhum arquivo de produção declara uma lista de perguntas e respostas', () => {
    expect(listasEmCodigo).toEqual([])
  })
})

describe('a régua procura declaração, nunca menção', () => {
  it('acusa uma lista de Q&A escrita em código', () => {
    const injetado = `const PERGUNTAS = [{ question: 'Em quanto tempo chega?', answer: 'Até 10 dias.' }]`
    expect(LITERAL_DE_QA.test(injetado)).toBe(true)
  })

  // ⚠️ O par que impede o guarda de proibir o uso que ele protege.
  it('NÃO acusa um tipo, que declara os campos sem conteúdo nenhum', () => {
    const tipo = 'export interface FaqPair {\n  question: string\n  answer: string\n}'
    expect(LITERAL_DE_QA.test(tipo)).toBe(false)
  })

  it('NÃO acusa uma leitura do dono', () => {
    const leitura = "supabase.from('faqs').select('id, question, answer, is_active')"
    expect(LITERAL_DE_QA.test(leitura)).toBe(false)
  })

  it('NÃO acusa o comentário que explica a regra', () => {
    const prosa = "// nunca declare { question: 'x', answer: 'y' } aqui — o dono é `faqs`\nexport const a = 1"
    expect(LITERAL_DE_QA.test(semComentarios(prosa))).toBe(false)
  })

  it('a régua das tabelas acusa uma segunda tabela de Q&A', () => {
    const sql = 'create table if not exists public.store_faqs (\n  question text not null,\n  answer text not null\n);'
    const achadas = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)\s*\(([\s\S]*?)\n\);/g)]
      .filter(([, , corpo]) => /\bquestion\b/.test(corpo) && /\banswer\b/.test(corpo))
      .map(([, nome]) => nome)

    expect(achadas).toEqual(['store_faqs'])
    expect(TABELAS_LEGITIMAS).not.toContain('store_faqs')
  })
})
