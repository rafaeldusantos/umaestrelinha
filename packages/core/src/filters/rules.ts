// Filtros de produto (feature 66) — os limites, as chaves reservadas e as recusas.
//
// Quem lê: o painel (recusa antes de gravar, FLT-03..06), a loja (`url.ts` precisa saber o que NÃO é
// grupo) e o guarda da migration, que compara `FILTER_NAME_MAX` e `RESERVED_FILTER_KEYS` com os
// `check` do banco lidos do disco. Escrita em dois lugares, a regra divergiria sem nada quebrar: a
// tela aceitaria o que o banco recusa, ou o contrário.
//
// Os tetos de CONTAGEM (12 grupos, 60 valores) moram só aqui e no painel — o `check` de linha do
// banco não conta, e um trigger de contagem para um painel de uma pessoa é peso sem ganho. Cópia
// declarada como NÃO espelhada no banco (`design.md`).
//
// Veredito como `string | null`, e não união discriminada por booleano: com
// `strictNullChecks: false` a união não estreita e ler o motivo no `else` é TS2339.

import { foldTokens } from './suggest.ts'

/** Nome de grupo e de valor: até 40 caracteres (o `check` de `filter_groups`/`filter_values`). */
export const FILTER_NAME_MAX = 40

/** Até 12 grupos na loja. */
export const FILTER_GROUPS_MAX = 12

/** Até 60 valores por grupo. */
export const FILTER_VALUES_MAX = 60

/**
 * Chaves de URL que a loja já usa, e que por isso o slug de um grupo não pode ter. Todo prefixo
 * `utm_` também é reservado — ver `isReservedFilterKey`. O `check` do banco repete esta lista, e o
 * guarda compara as duas nos dois sentidos.
 */
export const RESERVED_FILTER_KEYS = [
  'q',
  'ordem',
  'preco',
  'estoque',
  'desconto',
  'novidades',
  'pagina',
  'gclid',
  'fbclid',
] as const

/** O prefixo das chaves de campanha, reservado inteiro. */
export const RESERVED_FILTER_KEY_PREFIX = 'utm_'

export const isReservedFilterKey = (key: string): boolean =>
  (RESERVED_FILTER_KEYS as readonly string[]).includes(key) || key.startsWith(RESERVED_FILTER_KEY_PREFIX)

/** O formato do slug: kebab-case de letras minúsculas e números. O mesmo regex do `check`. */
export const FILTER_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

const semAcento = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '')

/** O endereço no filtro gerado pelo nome: "Prata 925" → `prata-925`, "Folheado à ouro" → `folheado-a-ouro`. */
export const filterSlug = (nome: string): string =>
  semAcento(nome)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** A forma de comparar nomes: sem maiúscula, sem acento, sem espaço sobrando. */
const chaveDoNome = (nome: string): string => semAcento(nome).toLowerCase().trim().replace(/\s+/g, ' ')

/** Comprimento como o `char_length` do banco: por ponto de código, e SEM aparar. */
const comprimento = (texto: string): number => [...texto].length

export interface FilterDraft {
  /** Ausente (ou nulo) ⇒ é um item novo, e o teto conta. */
  id?: string | null
  name: string
  slug: string
}

export const FILTER_SLUG_TAKEN_REFUSAL = 'Este endereço já é usado pela loja.'

export const groupLimitRefusal = (existentes: number): string | null =>
  existentes >= FILTER_GROUPS_MAX ? `A loja aceita até ${FILTER_GROUPS_MAX} grupos de filtro.` : null

export const valueLimitRefusal = (existentes: number): string | null =>
  existentes >= FILTER_VALUES_MAX ? `Um grupo aceita até ${FILTER_VALUES_MAX} valores.` : null

const outrosQue = <T extends { id: string }>(draft: FilterDraft, lista: readonly T[]): T[] =>
  lista.filter(item => !draft.id || item.id !== draft.id)

const nomeRefusal = (nome: string, quem: 'grupo' | 'valor'): string | null => {
  if (nome.trim() === '') return quem === 'grupo' ? 'Dê um nome ao grupo.' : 'Dê um nome ao valor.'
  if (comprimento(nome) > FILTER_NAME_MAX) return `O nome pode ter até ${FILTER_NAME_MAX} caracteres.`
  return null
}

const SLUG_FORMAT_REFUSAL = 'O endereço no filtro só pode ter letras minúsculas sem acento, números e hífens.'

/**
 * A recusa de um grupo, em ordem: teto (só para grupo novo) → nome vazio → nome longo → nome repetido
 * → endereço vazio → endereço reservado → formato → endereço repetido.
 *
 * O reservado vem ANTES do formato: `utm_x` recusa pelo motivo que importa ("já é usado pela loja"),
 * não pelo sublinhado.
 */
export const groupRefusal = (
  draft: FilterDraft,
  outros: readonly { id: string; name: string; slug: string }[],
): string | null => {
  const demais = outrosQue(draft, outros)
  if (!draft.id) {
    const teto = groupLimitRefusal(demais.length)
    if (teto) return teto
  }
  const nome = nomeRefusal(draft.name, 'grupo')
  if (nome) return nome
  if (demais.some(g => chaveDoNome(g.name) === chaveDoNome(draft.name))) return 'Já existe um grupo com este nome.'
  const slug = draft.slug.trim()
  if (slug === '') return 'Dê um endereço no filtro ao grupo.'
  if (isReservedFilterKey(slug)) return FILTER_SLUG_TAKEN_REFUSAL
  if (!FILTER_SLUG_PATTERN.test(slug)) return SLUG_FORMAT_REFUSAL
  if (demais.some(g => g.slug === slug)) return FILTER_SLUG_TAKEN_REFUSAL
  return null
}

/**
 * A recusa de um valor, dentro do grupo dele (`irmaos` são os outros valores do MESMO grupo). Mesma
 * ordem de `groupRefusal`, sem a régua das chaves reservadas: o slug do valor não é chave de URL, é
 * o que vai depois do `=`.
 */
export const valueRefusal = (
  draft: FilterDraft,
  irmaos: readonly { id: string; name: string; slug: string }[],
): string | null => {
  const demais = outrosQue(draft, irmaos)
  if (!draft.id) {
    const teto = valueLimitRefusal(demais.length)
    if (teto) return teto
  }
  const nome = nomeRefusal(draft.name, 'valor')
  if (nome) return nome
  if (demais.some(v => chaveDoNome(v.name) === chaveDoNome(draft.name))) {
    return 'Já existe um valor com este nome neste grupo.'
  }
  const slug = draft.slug.trim()
  if (slug === '') return 'Dê um endereço no filtro ao valor.'
  if (!FILTER_SLUG_PATTERN.test(slug)) return SLUG_FORMAT_REFUSAL
  if (demais.some(v => v.slug === slug)) return 'Este endereço já é usado por outro valor deste grupo.'
  return null
}

// -------------------------------------------------------------------------------------------
// Feature 67 — o texto da opção e os termos de sugestão
// -------------------------------------------------------------------------------------------
//
// Os três números têm par na migration da 67 (`variantFiltersSchema.test.ts` compara).

/**
 * Teto do eixo e do texto de uma marcação por opção (o `check` de `product_option_filter_values`).
 * Sanidade, não regra de negócio: medido em 2026-10-18, o maior eixo do catálogo tem 20 caracteres e
 * o maior texto, 40.
 */
export const FILTER_OPTION_TEXT_MAX = 120

/** Até 10 termos extras de sugestão por valor (VFL-35). */
export const FILTER_SUGGEST_TERMS_MAX = 10

// SPEC_DEVIATION: o `design.md` compara o comprimento do termo com `FILTER_NAME_MAX`. São regras
// diferentes que hoje coincidem em 40 — o nome do valor e um termo que o sugere —, e uma constante
// própria impede que subir uma arraste a outra. O guarda da migration importa esta.
/** Cada termo de sugestão: até 40 caracteres (VFL-35). */
export const FILTER_SUGGEST_TERM_MAX = 40

/**
 * A recusa de um termo novo de sugestão (VFL-37), em ordem: teto → vazio → longo → igual ao nome →
 * repetido. "Igual" e "repetido" comparam pelos TOKENS dobrados (sem maiúscula, sem acento, sem
 * pontuação), que é exatamente como o termo casa: dois termos com os mesmos tokens sugerem as mesmas
 * peças, e o segundo não acrescenta nada. Termo só de pontuação não tem token e nunca casaria nada.
 *
 * `outros` são os termos que o valor já tem (sem o que está sendo editado).
 */
export const suggestTermRefusal = (termo: string, outros: readonly string[], nomeDoValor: string): string | null => {
  if (outros.length >= FILTER_SUGGEST_TERMS_MAX) return `Um valor aceita até ${FILTER_SUGGEST_TERMS_MAX} termos.`
  if (termo.trim() === '') return 'Escreva o termo.'
  if (comprimento(termo) > FILTER_SUGGEST_TERM_MAX) return `O termo pode ter até ${FILTER_SUGGEST_TERM_MAX} caracteres.`
  const chave = foldTokens(termo).join(' ')
  if (chave === '') return 'O termo precisa ter letras ou números.'
  if (chave === foldTokens(nomeDoValor).join(' ')) return 'O nome do valor já sugere sozinho.'
  if (outros.some(t => foldTokens(t).join(' ') === chave)) return 'Este termo já está na lista.'
  return null
}
