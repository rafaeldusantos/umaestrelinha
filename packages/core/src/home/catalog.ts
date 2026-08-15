import type { HomeSectionType } from './types'

/**
 * A lista fechada de tipos, **na ordem em que o painel os oferece**.
 *
 * É o par do `check (type in …)` da migration, e `homeSections.test.ts` lê a migration do disco e
 * compara os dois conjuntos com âncora de contagem (`HOME-06`). Molde exato de
 * `materialTransitions.test.ts`: duas cópias da mesma lista só são aceitáveis quando um teste as
 * prende uma à outra.
 */
export const HOME_SECTION_TYPES: readonly HomeSectionType[] = [
  'hero',
  'trust_bar',
  'banner_grid',
  'collection_rows',
  'brand_statement',
  'trending_tags',
  'newsletter',
  'collection_feature',
  'product_carousel',
  'category_grid',
]

/**
 * Os tipos que só podem existir **uma vez** na Home.
 *
 * Par do índice único parcial da migration. O painel não oferece uma segunda (edge case da spec), e o
 * índice faz a mesma regra valer contra escrita direta — esconder o botão é UX, o índice é a
 * garantia.
 *
 * Os quatro que ficam de fora são repetíveis por natureza: grade de banners, destaque em coleção,
 * carrossel de produtos e grade de coleções são blocos de campanha, e a dona pode querer dois.
 */
export const UNIQUE_SECTION_TYPES: readonly HomeSectionType[] = [
  'hero',
  'trust_bar',
  'collection_rows',
  'brand_statement',
  'trending_tags',
  'newsletter',
]

/**
 * O teto de seções na Home.
 *
 * Impede a Home de virar página infinita por acidente, e é folgado o bastante para nunca ser sentido
 * — a composição de hoje tem 7.
 */
export const MAX_HOME_SECTIONS = 30

/** A faixa aceita de `config.limit`, quando o tipo tem um. */
export interface SectionLimit {
  min: number
  max: number
}

export interface SectionMeta {
  type: HomeSectionType
  /** O nome que a dona lê na lista e na bandeja. */
  label: string
  unique: boolean
  /** `null` quando o tipo não tem `limit` editável. */
  limit: SectionLimit | null
}

/**
 * Rótulos em português da loja, não jargão de código.
 *
 * Cada um sai do vocabulário que a spec já usa para a seção ("faixa de vantagens", "fileiras de
 * coleção", "faixa institucional", "chips de tema") — inventar um segundo nome aqui faria o painel e
 * a documentação falarem de coisas diferentes.
 */
const LABELS: Record<HomeSectionType, string> = {
  hero: 'Chamada principal',
  trust_bar: 'Faixa de vantagens',
  banner_grid: 'Grade de banners',
  collection_rows: 'Fileiras de coleção',
  brand_statement: 'Faixa institucional',
  trending_tags: 'Chips de tema',
  newsletter: 'Newsletter',
  collection_feature: 'Destaque em coleção',
  product_carousel: 'Carrossel de produtos',
  category_grid: 'Grade de coleções',
}

/**
 * As faixas de `limit`, **só onde o desenho declarou uma**.
 *
 * Os dois tipos de P3 (`product_carousel`, `category_grid`) têm `limit` no `config` mas nenhuma faixa
 * declarada, e ela **não é inventada aqui**: eles entram no catálogo sem renderer e sem editor, e a
 * faixa nasce junto com a tela que a cobra. Faixa chutada seria regra sem origem, e é o tipo de
 * número que ninguém depois consegue justificar.
 */
const LIMITS: Partial<Record<HomeSectionType, SectionLimit>> = {
  collection_rows: { min: 1, max: 8 },
  trending_tags: { min: 1, max: 24 },
}

/**
 * O que o painel precisa saber sobre um tipo — ou `null` quando o tipo não existe.
 *
 * Devolve `null` em vez de lançar porque o consumidor é uma tela caminhando uma lista que veio do
 * banco: um tipo desconhecido (linha gravada por uma versão mais nova) tem de ser **pulado**, nunca
 * derrubar a Home.
 */
export const sectionMeta = (type: HomeSectionType): SectionMeta | null => {
  if (!HOME_SECTION_TYPES.includes(type)) return null
  return {
    type,
    label: LABELS[type],
    unique: UNIQUE_SECTION_TYPES.includes(type),
    limit: LIMITS[type] ?? null,
  }
}
