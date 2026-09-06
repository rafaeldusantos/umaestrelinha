// Feature 28 — a regra do FAQ, pura.
//
// Vive em `@estrelinha/core` porque **três runtimes** leem daqui e não podem divergir: a loja
// (browser), o backoffice (browser) e o importador do catálogo (**Node**). É a mesma razão de
// `@estrelinha/core/material` existir, e o corolário é o mesmo: nenhum import de React, de Supabase
// ou de API de DOM neste diretório.
//
// O registro do negócio é memorial. Todo texto daqui aparece em tela, e nenhum usa linguagem
// festiva, eufemismo ou diminutivo.

import type { FaqEntry, ProductFaqLink, ResolvedFaq } from './types.ts'

// ---------------------------------------------------------------------------------------------
// Entidades HTML — o corpus é cheio delas
// ---------------------------------------------------------------------------------------------

/**
 * Os nomes da faixa Latin-1 (U+00A0..U+00FF), **em ordem de codepoint**.
 *
 * A tabela é derivada do índice em vez de escrita como pares `nome → caractere`: a segunda forma
 * pede 96 números digitados à mão, e um dígito trocado produziria um caractere errado no meio de uma
 * resposta sem quebrar nada. Aqui o único erro possível é de **ordem**, e ele é visível — por isso o
 * teste assere `length === 96` e confere as pontas.
 */
export const LATIN1_ENTITY_NAMES: readonly string[] = [
  'nbsp', 'iexcl', 'cent', 'pound', 'curren', 'yen', 'brvbar', 'sect',
  'uml', 'copy', 'ordf', 'laquo', 'not', 'shy', 'reg', 'macr',
  'deg', 'plusmn', 'sup2', 'sup3', 'acute', 'micro', 'para', 'middot',
  'cedil', 'sup1', 'ordm', 'raquo', 'frac14', 'frac12', 'frac34', 'iquest',
  'Agrave', 'Aacute', 'Acirc', 'Atilde', 'Auml', 'Aring', 'AElig', 'Ccedil',
  'Egrave', 'Eacute', 'Ecirc', 'Euml', 'Igrave', 'Iacute', 'Icirc', 'Iuml',
  'ETH', 'Ntilde', 'Ograve', 'Oacute', 'Ocirc', 'Otilde', 'Ouml', 'times',
  'Oslash', 'Ugrave', 'Uacute', 'Ucirc', 'Uuml', 'Yacute', 'THORN', 'szlig',
  'agrave', 'aacute', 'acirc', 'atilde', 'auml', 'aring', 'aelig', 'ccedil',
  'egrave', 'eacute', 'ecirc', 'euml', 'igrave', 'iacute', 'icirc', 'iuml',
  'eth', 'ntilde', 'ograve', 'oacute', 'ocirc', 'otilde', 'ouml', 'divide',
  'oslash', 'ugrave', 'uacute', 'ucirc', 'uuml', 'yacute', 'thorn', 'yuml',
]

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  ndash: '–',
  mdash: '—',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bull: '•',
  hellip: '…',
  trade: '™',
  euro: '€',
}

LATIN1_ENTITY_NAMES.forEach((name, index) => {
  NAMED_ENTITIES[name] = String.fromCharCode(0xa0 + index)
})

const ENTITY = /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g

/**
 * Decodifica as entidades do texto.
 *
 * **Passe único, e é isso que torna correto o caso do `&amp;`.** A armadilha clássica é decodificar
 * `&amp;` primeiro e varrer de novo: `&amp;lt;` viraria `&lt;` e depois `<`, ou seja, o texto que a
 * dona escreveu como literal `&lt;` sumiria. Com um `replace` só, cada casamento é substituído no
 * texto de saída e **nunca é reexaminado** — `&amp;lt;` sai como `&lt;`, que é o certo.
 *
 * Entidade desconhecida **fica como está**: preferir o literal a inventar caractere. Nada aqui lança.
 */
export const decodeHtmlEntities = (text: string): string =>
  String(text ?? '').replace(ENTITY, (inteiro, corpo: string) => {
    if (corpo[0] === '#') {
      const hex = corpo[1] === 'x' || corpo[1] === 'X'
      const codigo = Number.parseInt(hex ? corpo.slice(2) : corpo.slice(1), hex ? 16 : 10)
      if (!Number.isFinite(codigo) || codigo <= 0 || codigo > 0x10ffff) return inteiro
      try {
        return String.fromCodePoint(codigo)
      } catch {
        return inteiro
      }
    }
    const encontrado = NAMED_ENTITIES[corpo]
    return encontrado === undefined ? inteiro : encontrado
  })

// ---------------------------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------------------------

/**
 * Espaço colapsado e pontas cortadas. Aplicada a pergunta e a resposta, na tela e na gravação.
 *
 * `\s` do JavaScript já cobre ` ` (o `&nbsp;` decodificado), então não há tratamento especial —
 * e é por isso que `decodeHtmlEntities` pode devolver o caractere fiel em vez de trocá-lo por espaço.
 */
export const normalizeFaqText = (text: string | null | undefined): string =>
  String(text ?? '').replace(/\s+/g, ' ').trim()

/**
 * A chave de deduplicação da biblioteca — **o dono único**.
 *
 * O painel e o importador chamam esta função; a coluna `faqs.question_key` só guarda o resultado.
 * Uma coluna gerada no banco exigiria `unaccent` marcado como `immutable` e criaria uma **segunda**
 * normalização, que divergiria da desta no primeiro ajuste.
 *
 * O corte do acento é `\p{Diacritic}` e **não** uma faixa literal de combinantes — um `[◌̀-◌ͯ]`
 * escrito com os caracteres crus fica invisível no editor e some numa normalização de arquivo, sem
 * quebrar nada visível (a mesma armadilha já registrada em `material.ts`).
 *
 * A pontuação final cai porque "As joias são feitas à mão?" e "As joias são feitas à mão" são a
 * mesma pergunta. Medido no catálogo real: as três variantes de normalização (sem folding, com
 * folding, com folding e sem pontuação) devolvem **67** perguntas distintas — o corte não funde
 * pergunta nenhuma que já não fosse a mesma.
 */
export const faqQuestionKey = (question: string | null | undefined): string => {
  const base = decodeHtmlEntities(String(question ?? ''))
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  return base.replace(/[?!.…]+$/, '').trim()
}

// ---------------------------------------------------------------------------------------------
// Limites
// ---------------------------------------------------------------------------------------------

/**
 * Máximo medido no catálogo real: **94**. A folga é de ~1,7×, e o teto existe — "sem limite" deixa
 * uma pergunta colada de mil caracteres entrar na página do produto sem nada acusar.
 *
 * O par deste número vive no `check` da migration, e `faqSchema.test.ts` prende os dois.
 */
export const FAQ_QUESTION_MAX = 160

/** Máximo medido: **370**. Mesma folga, mesmo par em SQL. */
export const FAQ_ANSWER_MAX = 600

/**
 * O motivo da recusa, ou `null` quando pode gravar.
 *
 * **`string | null`, nunca união discriminada por literal booleano.** `tsconfig.base.json` tem
 * `strictNullChecks: false`, e nesse modo `{ ok: true } | { ok: false; reason: string }` **não
 * estreita** — ler `.reason` no ramo do `else` é TS2339. Mesmo formato de `materialTransitionRefusal`,
 * `menuTargetRefusal` e `reservedSlugRefusal`.
 */
export const faqRefusal = (
  question: string | null | undefined,
  answer: string | null | undefined,
): string | null => {
  const pergunta = normalizeFaqText(question)
  const resposta = normalizeFaqText(answer)

  if (pergunta === '') return 'A pergunta não pode ficar vazia.'
  if (pergunta.length > FAQ_QUESTION_MAX) {
    return `A pergunta tem ${pergunta.length} caracteres e o limite é ${FAQ_QUESTION_MAX}.`
  }
  if (resposta === '') return 'A resposta não pode ficar vazia.'
  if (resposta.length > FAQ_ANSWER_MAX) {
    return `A resposta tem ${resposta.length} caracteres e o limite é ${FAQ_ANSWER_MAX}.`
  }
  return null
}

// ---------------------------------------------------------------------------------------------
// A resolução — o leitor único
// ---------------------------------------------------------------------------------------------

/**
 * A resposta própria do produto, ou `null` quando ela é igual ao padrão.
 *
 * Gravar um override idêntico ao padrão criaria **dois donos do mesmo texto**: editar a biblioteca
 * deixaria de alcançar aquele produto, sem que nada na tela dissesse por quê.
 */
export const faqOverrideOf = (
  override: string | null | undefined,
  entryAnswer: string | null | undefined,
): string | null => {
  const proprio = normalizeFaqText(override)
  if (proprio === '') return null
  return proprio === normalizeFaqText(entryAnswer) ? null : proprio
}

const asMap = (
  entries: ReadonlyMap<string, FaqEntry> | readonly FaqEntry[],
): ReadonlyMap<string, FaqEntry> =>
  entries instanceof Map ? entries : new Map((entries as readonly FaqEntry[]).map(e => [e.id, e]))

/**
 * O que a loja desenha — e o **único** lugar que lê `answer_override`.
 *
 * Três regras numa função só, e de propósito: separá-las daria a cada tela a chance de esquecer uma.
 *
 * 1. **Ordem é `position`**, com desempate por `faq_id`. Sem o desempate, duas leituras da mesma
 *    página poderiam trocar duas perguntas de lugar quando o `position` empata.
 * 2. **Vínculo órfão é pulado, e a vaga NÃO é preenchida.** A entrada chega `null` quando está
 *    inativa — é resposta da RLS, não filtro do cliente (o que a feature 24 mediu com produto
 *    despublicado). Substituí-la por outra pergunta poria na página algo que a dona não escolheu.
 * 3. **`answer_override` só de espaço é vazio**, e cai no padrão.
 */
export const resolveProductFaqs = (
  links: readonly ProductFaqLink[] | null | undefined,
  entries: ReadonlyMap<string, FaqEntry> | readonly FaqEntry[] = [],
): ResolvedFaq[] => {
  const porId = asMap(entries)

  return [...(links ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || String(a.faq_id).localeCompare(String(b.faq_id)))
    .reduce<ResolvedFaq[]>((saida, link) => {
      const entrada = link.faq ?? porId.get(link.faq_id)
      if (!entrada || entrada.is_active === false) return saida

      const pergunta = normalizeFaqText(entrada.question)
      const padrao = normalizeFaqText(entrada.answer)
      const proprio = normalizeFaqText(link.answer_override)

      // Entrada sem texto não vira uma linha em branco na página do produto.
      if (pergunta === '' || (padrao === '' && proprio === '')) return saida

      saida.push({
        id: entrada.id ?? link.faq_id,
        question: pergunta,
        answer: proprio === '' ? padrao : proprio,
        overridden: proprio !== '' && proprio !== padrao,
      })
      return saida
    }, [])
}
