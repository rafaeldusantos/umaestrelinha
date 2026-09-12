// Feature 46 — o gerador da semeadura das 26 perguntas.
//
// ---------------------------------------------------------------------------------------------
// POR QUE ISTO EXISTE
// ---------------------------------------------------------------------------------------------
// `faqs.question_key` é escrita **pela aplicação**, por `faqQuestionKey` (`@estrelinha/core/faq`).
// A migration da feature 28 recusou coluna gerada de propósito, para não criar uma SEGUNDA
// normalização — uma que exigiria `unaccent` marcado como `immutable` e divergiria da do painel e da
// do importador no primeiro ajuste.
//
// Uma migration que calculasse a chave em SQL reintroduziria exatamente esse segundo dono. E
// digitá-la à mão seria pior ainda: um acento esquecido produz uma chave que não deduplica nada, e
// nada quebra — a pergunta simplesmente entra duas vezes na biblioteca.
//
// **Saída**: este script roda a função REAL sobre o texto real e transporta o resultado para o `.sql`.
// O normalizador continua sendo um só; a migration só carrega a saída dele, e
// `faqPageSchema.test.ts` assere `faqQuestionKey(question) === question_key` nas 26 linhas — o que
// impede o transporte de apodrecer.
//
// ---------------------------------------------------------------------------------------------
// COMO RODAR
// ---------------------------------------------------------------------------------------------
//   node scripts/_gen-faq-seed.mjs            → imprime as linhas do `values` no stdout
//   node scripts/_gen-faq-seed.mjs --conferir → só valida o corpus e imprime o resumo por assunto
//
// Descartável de propósito: fica **fora** de `apps/` e de `packages/`, então nenhum bundle o alcança
// e nenhum `eslint` o vê. A fonte do conteúdo é `conteudo.md`, que é o documento que a dona escreveu.

import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { faqQuestionKey, normalizeFaqText } from '../packages/core/src/faq/faq.ts'

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTEUDO = join(RAIZ, '.specs/features/46-perguntas-frequentes-da-loja/conteudo.md')

/** A ordem em que a página exibe os assuntos. Espelha `FAQ_PAGE_CATEGORIES` e o `check` do `.sql`. */
const ASSUNTOS = [
  'sobre',
  'o-processo',
  'envio-do-material',
  'materiais-e-acabamentos',
  'personalizacao',
  'cuidados',
]

/**
 * Emoji em qualquer parte do corpus aborta a geração (`FAQL-10`).
 *
 * O registro do negócio é memorial, e o texto de origem trazia `✨` e `❤️`. A transcrição já os
 * removeu; isto é a segunda linha, para o dia em que alguém colar um trecho novo direto do WhatsApp.
 */
const EMOJI = /\p{Extended_Pictographic}/u

const md = readFileSync(CONTEUDO, 'utf8').replace(/\r\n/g, '\n')

// ---------------------------------------------------------------------------------------------
// Leitura do corpus
// ---------------------------------------------------------------------------------------------

const linhas = md.split('\n')
const perguntas = []

let assuntoAtual = null
let atual = null

const fechar = () => {
  if (!atual) return
  atual.answer = atual.corpo.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  delete atual.corpo
  perguntas.push(atual)
  atual = null
}

for (const linha of linhas) {
  const assunto = linha.match(/^## ([a-z-]+) — "(.+)" \((\d+)\)$/)
  if (assunto) {
    fechar()
    assuntoAtual = { key: assunto[1], label: assunto[2], esperadas: Number(assunto[3]) }
    if (!ASSUNTOS.includes(assuntoAtual.key)) {
      throw new Error(`Assunto fora do vocabulário fechado: ${assuntoAtual.key}`)
    }
    continue
  }

  // Qualquer outro `##` encerra o assunto corrente (é a `## Conferência` do fim do documento).
  if (linha.startsWith('## ')) {
    fechar()
    assuntoAtual = null
    continue
  }

  const pergunta = linha.match(/^### (\d+)\. (.+)$/)
  if (pergunta) {
    fechar()
    if (!assuntoAtual) throw new Error(`Pergunta fora de assunto: ${linha}`)
    atual = {
      question: normalizeFaqText(pergunta[2]),
      category: assuntoAtual.key,
      position: Number(pergunta[1]),
      corpo: [],
    }
    continue
  }

  if (linha.trim() === '---') {
    fechar()
    continue
  }

  if (atual) atual.corpo.push(linha)
}
fechar()

// ---------------------------------------------------------------------------------------------
// Conferência — o corpus tem de bater com a tabela de conferência do próprio documento
// ---------------------------------------------------------------------------------------------

for (const p of perguntas) {
  if (EMOJI.test(p.question) || EMOJI.test(p.answer)) {
    throw new Error(`Emoji no corpus (FAQL-10): ${p.question}`)
  }
  if (p.answer === '') throw new Error(`Resposta vazia: ${p.question}`)
  p.question_key = faqQuestionKey(p.question)
}

const porAssunto = new Map(ASSUNTOS.map(k => [k, perguntas.filter(p => p.category === k)]))

const chaves = new Set(perguntas.map(p => p.question_key))
if (chaves.size !== perguntas.length) {
  throw new Error(`Duas perguntas colapsam na mesma question_key — a semeadura perderia uma`)
}

if (process.argv.includes('--conferir')) {
  for (const [key, lista] of porAssunto) {
    const maior = Math.max(...lista.map(p => p.answer.length))
    console.log(`${key.padEnd(24)} ${String(lista.length).padStart(2)} perguntas · maior resposta ${maior}`)
  }
  console.log(`${'TOTAL'.padEnd(24)} ${perguntas.length} perguntas · maior resposta ${Math.max(...perguntas.map(p => p.answer.length))}`)
  process.exit(0)
}

// ---------------------------------------------------------------------------------------------
// Saída
// ---------------------------------------------------------------------------------------------

/** Literal de texto do Postgres: a aspa simples é dobrada, e nada mais é escapado. */
const lit = texto => `'${texto.replace(/'/g, "''")}'`

const saida = ASSUNTOS.flatMap(key =>
  porAssunto.get(key).map(
    p => `\t\t(${lit(p.question)},\n\t\t ${lit(p.answer)},\n\t\t ${lit(p.question_key)}, ${lit(p.category)}, ${p.position})`,
  ),
).join(',\n')

process.stdout.write(saida + '\n')
