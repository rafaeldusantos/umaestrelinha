// Feature 28 — as formas do FAQ, num lugar só.
//
// Nenhum tipo daqui é gerado do banco: eles são a **fatia** que a regra pura precisa, e a coluna que
// não é lida não aparece. `AD-012` vale aqui como em qualquer lugar — tipo escrito à mão é
// afirmação, não verificação, e quem prova que a tabela tem estas colunas é o probe HTTP da T6.

/** Uma entrada da biblioteca. `is_active` é opcional porque a loja só recebe as ativas pela RLS. */
export interface FaqEntry {
  id: string
  question: string
  answer: string
  is_active?: boolean | null
}

/**
 * O vínculo entre produto e entrada.
 *
 * `answer_override` é **nullable de propósito**, no mesmo molde de `engraving_max_chars`: `null`
 * significa "usa o padrão da biblioteca", e ninguém compara a coluna crua — todo consumidor passa
 * por `resolveProductFaqs`.
 */
export interface ProductFaqLink {
  faq_id: string
  position: number
  answer_override?: string | null
  /** O embed do PostgREST (`faq:faqs(...)`). Vem `null` quando a entrada está inativa. */
  faq?: FaqEntry | null
}

/** O que a loja desenha. Já resolvido: nada aqui precisa de segunda decisão. */
export interface ResolvedFaq {
  id: string
  question: string
  answer: string
  /** A resposta veio do vínculo, e não da biblioteca. O painel marca a linha com isto. */
  overridden: boolean
}

/** Um par extraído de uma descrição. Texto puro nos dois campos — nunca HTML. */
export interface FaqPair {
  question: string
  answer: string
}

/**
 * Um pedaço de resposta já interpretado — feature 46.
 *
 * A resposta é **texto puro** no banco (medido: 0 de 3.476 do catálogo têm tag), e continua sendo:
 * é o que dispensa sanitizador, dispensa `dangerouslySetInnerHTML` e é a forma que um modelo de
 * linguagem ingere limpa. O que este tipo carrega é a **leitura** desse texto — linha em branco
 * separa parágrafo, linha começada por `- ` é item —, e quem a produz é `faqAnswerBlocks`.
 *
 * Discriminada por literal de **string**, e não por booleano: com `strictNullChecks: false` a união
 * por literal booleano não estreita, e ler o campo do outro ramo é TS2339.
 */
export type FaqBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: readonly string[] }

/** Uma linha da view `faq_category_usage`. */
export interface FaqCategoryUsage {
  category_id: string
  faq_id: string
  /** Produtos **daquela categoria** que usam esta pergunta. */
  uses: number
  /** Produtos daquela categoria com ao menos uma pergunta — o denominador. */
  sample: number
}

/** Uma linha da view `faq_usage`: em quantos produtos a entrada está, no catálogo inteiro. */
export interface FaqUsage {
  faq_id: string
  products: number
}
