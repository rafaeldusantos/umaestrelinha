/**
 * A régua de aceitação de uma sugestão de SEO — feature 84 (A2, A3, A7, A13, `SIA-14`, `SIA-15`).
 *
 * Um dono, dois leitores: a edge function `seo-suggest` (que recusa a resposta do modelo e tenta de
 * novo) e o painel (que lê o teto do campo). A régua do registro memorial não pode depender de o
 * modelo obedecer ao prompt — ela é determinística e mora aqui.
 *
 * Alcançável pelo Deno: todo especificador relativo leva a extensão explícita, e nenhum pacote entra.
 * **Fora do barril de `core/seo` de propósito**: o grafo do barril tem âncora exata em
 * `denoReach.test.ts`, e este arquivo tem a dele (`suggestionDenoReach.test.ts`). Quem lê, lê o
 * arquivo (`@estrelinha/core/seo/suggestion`).
 *
 * O material afetivo PODE ser nomeado (A12, decisão do usuário em 2026-10-27): é o termo buscado. A
 * recusa de material que esta régua teve até o conserto r2 saiu — e com ela o import de
 * `material/material.ts`.
 */
import { ABREVIACAO_DA_MARCA, JA_TEM_MARCA, STORE_BRAND } from './brand.ts'
import { DESCRIPTION_MAX } from './text.ts'

/** O teto do campo "Título SEO" do painel — e o que o buscador mostra antes de cortar. */
export const SEO_TITLE_FIELD_MAX = 60

/**
 * O teto do título sugerido, SEM a marca (A2): a loja acrescenta ` | Uma Estrelinha` por
 * `brandedTitle`, e o servido tem de caber no campo. Calculado, nunca cravado.
 */
export const SUGGESTION_TITLE_MAX = SEO_TITLE_FIELD_MAX - ` | ${STORE_BRAND}`.length

/** O piso da descrição sugerida (A3). O teto é `DESCRIPTION_MAX`. */
export const SUGGESTION_DESCRIPTION_MIN = 140

/**
 * O piso que o PROMPT pede (A3: "o prompt pede 150–160"). A régua aceita a partir de
 * `SUGGESTION_DESCRIPTION_MIN`: a folga de 10 evita retentativa por um caractere.
 */
export const SUGGESTION_DESCRIPTION_ASK_MIN = 150

const MARCA_NO_FIM = new RegExp(`\\|\\s*${JA_TEM_MARCA.source}\\s*$`, 'i')

const colapsar = (texto: string): string => String(texto ?? '').replace(/\s+/g, ' ').trim()

/** Tira a marca do FIM do título (por extenso ou abreviada); a marca no meio fica. */
export const stripBrand = (title: string): string =>
  colapsar(colapsar(title).replace(MARCA_NO_FIM, '').replace(ABREVIACAO_DA_MARCA, ''))

/** Sem caixa, sem acento, espaço colapsado — a comparação de "é o mesmo texto?". */
const dobrar = (texto: string): string =>
  colapsar(texto)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

const escapar = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const contemTermo = (dobrado: string, termo: string): boolean =>
  new RegExp(`(^|[^a-z0-9])${escapar(dobrar(termo))}($|[^a-z0-9])`).test(dobrado)

/**
 * O vocabulário de urgência fabricada. Origem: o `CLAUDE.md` da raiz ("nada de urgência fabricada")
 * e a régua de `homeSections` (nenhuma contagem regressiva nem prova social). Casado sem caixa, sem
 * acento e com fronteira de palavra.
 */
export const URGENCY_TERMS: readonly string[] = [
  'últimas unidades',
  'última unidade',
  'corra',
  'só hoje',
  'somente hoje',
  'promoção imperdível',
  'imperdível',
  'não perca',
  'aproveite',
  'por tempo limitado',
  'estoque limitado',
  'compre já',
  'garanta já',
]

/** O registro memorial: sem emoji, sem exclamação, sem urgência. `null` quando o texto passa. */
export const memorialToneRefusal = (text: string): string | null => {
  const texto = String(text ?? '')
  if (/\p{Extended_Pictographic}/u.test(texto)) return 'O texto tem emoji.'
  if (texto.includes('!')) return 'O texto tem ponto de exclamação.'
  const dobrado = dobrar(texto)
  const termo = URGENCY_TERMS.find(t => contemTermo(dobrado, t))
  if (termo) return `O texto usa linguagem de urgência ("${termo}").`
  return null
}

export interface SeoSuggestion {
  title: string
  description: string
}

/**
 * `null` quando a sugestão serve; senão, o motivo. Ordem: vazio → tamanho do título (depois de
 * `stripBrand`) → faixa da descrição → tom → igual a um exemplo → igual ao nome do produto (A13).
 *
 * `productName`: o nome da peça. O título de busca que só repete o nome não acrescenta nada (regra de
 * SEO da loja: "nunca repetir a mesma frase do título do produto"). Comparado sem caixa, sem acento e
 * com espaço colapsado — o nome CONTIDO no título passa.
 */
export const suggestionRefusal = (
  s: SeoSuggestion,
  exampleTitles: readonly string[],
  productName: string,
): string | null => {
  const title = stripBrand(s.title)
  const description = colapsar(s.description)

  if (title === '') return 'O título veio vazio.'
  if (title.length > SUGGESTION_TITLE_MAX) {
    return `O título passa de ${SUGGESTION_TITLE_MAX} caracteres.`
  }
  if (description.length < SUGGESTION_DESCRIPTION_MIN) {
    return `A descrição tem menos de ${SUGGESTION_DESCRIPTION_MIN} caracteres.`
  }
  if (description.length > DESCRIPTION_MAX) {
    return `A descrição passa de ${DESCRIPTION_MAX} caracteres.`
  }

  const tom = memorialToneRefusal(title) ?? memorialToneRefusal(description)
  if (tom) return tom

  const tituloDobrado = dobrar(title)
  if (exampleTitles.some(e => dobrar(stripBrand(e)) === tituloDobrado)) {
    return 'O título repete o de um exemplo.'
  }

  if (tituloDobrado === dobrar(productName)) {
    return 'O título repete o nome do produto.'
  }

  return null
}
