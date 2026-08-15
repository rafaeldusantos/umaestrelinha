import type { HomeSection, HomeSectionItem, HomeSectionType } from './types'
import { orderSections } from './order'

/**
 * Um item já resolvido — o que a loja desenha e o que o painel nomeia.
 *
 * Serve às três seções que têm lista (grade de banners, fileiras de coleção, chips) e ao destaque em
 * coleção. Os campos que uma delas não usa vêm `null`; um tipo por seção daria quatro formas quase
 * iguais e quatro lugares para consertar a mesma coisa.
 */
export interface ResolvedItem {
  /** Da linha curada quando há curadoria; da entidade quando a lista veio da derivação. */
  id: string
  categoryId: string | null
  productId: string | null
  slug: string | null
  /** O que a loja usa como título e como `alt`. */
  label: string
  /** O apoio (a descrição da coleção), quando houver. */
  description: string | null
  /** O destino já montado — `categoryHref`, `productPath` ou o caminho livre. */
  href: string
  /** A arte própria do item; sem ela, a do destino. */
  imageUrl: string | null
  /** `true` quando a dona escolheu a dedo; `false` quando veio da derivação de hoje. */
  curated: boolean
}

/**
 * O que quem chama precisa fornecer.
 *
 * **A derivação não é reescrita aqui, é injetada** — mesmo depois de a T35 tê-la trazido para
 * `core/home` (`derive.ts`). Continua injetada porque quem chama precisa dizer **qual** derivação
 * cada seção usa e com que catálogo: a loja e o painel montam listas de forma diferente (a loja
 * desenha, o painel resume), e resolver isso aqui dentro obrigaria este módulo a conhecer os tipos
 * de seção duas vezes.
 *
 * Pelo mesmo motivo `resolveItem` é injetado: dizer se a coleção de destino ainda está publicada
 * exige o catálogo, e o catálogo é de quem chama.
 */
export interface ResolveContext {
  /**
   * Resolve um item curado — ou devolve `null` quando o destino saiu do ar (despublicado, apagado,
   * ou órfão porque o `on delete set null` esvaziou a FK).
   */
  resolveItem: (item: HomeSectionItem, section: HomeSection) => ResolvedItem | null
  /** A lista derivada da seção, quando ela não tem curadoria. */
  derive: (section: HomeSection) => readonly ResolvedItem[]
}

export interface ResolvedSection {
  section: HomeSection
  renders: boolean
  /**
   * `null` quando renderiza. Senão, **o motivo legível** — não um booleano.
   *
   * `HOME-09` pede que a linha do painel diga *por quê* a seção não vai aparecer, e motivo é texto de
   * interface: um `hidden: true` obrigaria cada tela a reconstruir a frase, que é como a regra do
   * menu acabou espalhada em quatro lugares.
   */
  hiddenReason: string | null
  items: ResolvedItem[]
  /** Curados que saíram do ar. Alimenta "2 de 6 escolhidos saíram do ar" (`HOME-34`). */
  droppedCount: number
  /** Para a faixa institucional: dentro de quem ela entra, e depois de qual fileira. */
  nestedUnder: { sectionId: string; afterRow: number } | null
}

/**
 * Os tipos cuja existência na tela depende de uma fonte ter conteúdo.
 *
 * Os outros quatro (hero, faixa de vantagens, faixa institucional, newsletter) desenham a partir do
 * próprio `config` e por isso nunca ficam vazios por falta de catálogo.
 */
const SOURCE_DRIVEN: readonly HomeSectionType[] = [
  'banner_grid',
  'collection_rows',
  'trending_tags',
  'collection_feature',
  'product_carousel',
  'category_grid',
]

/**
 * O motivo por tipo quando a fonte não devolveu nada.
 *
 * Frases inteiras e específicas de propósito: "fonte vazia" não diz à dona o que fazer, e o que ela
 * precisa saber é se falta subir arte, cadastrar coleção ou escolher item.
 */
const EMPTY_SOURCE_REASON: Record<HomeSectionType, string> = {
  hero: '',
  trust_bar: '',
  banner_grid:
    'Não vai aparecer: esta grade não tem banner próprio e nenhuma coleção tem arte de banner.',
  collection_rows: 'Não vai aparecer: o catálogo ainda não tem coleção para mostrar.',
  brand_statement: '',
  trending_tags: 'Não vai aparecer: o catálogo ainda não tem coleção para virar chip.',
  newsletter: '',
  collection_feature: 'Não vai aparecer: nenhuma coleção escolhida está no ar.',
  product_carousel: 'Não vai aparecer: a fonte não devolveu nenhum produto.',
  category_grid: 'Não vai aparecer: o catálogo ainda não tem coleção para mostrar.',
}

const DESLIGADA = 'Desligada: não aparece na loja.'

const todosForaDoAr = (total: number): string =>
  total === 1
    ? 'Não vai aparecer: o item escolhido saiu do ar.'
    : `Não vai aparecer: os ${total} itens escolhidos saíram do ar.`

/** A curadoria vem na ordem da dona, que é a `position` da linha. */
const naOrdemDaDona = (items: readonly HomeSectionItem[]): HomeSectionItem[] =>
  [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

/**
 * O que renderiza, o que não renderiza **e por quê** — a mesma resposta para a loja e para o painel.
 *
 * A loja precisa saber *o que desenhar*; o painel precisa saber *o que avisar que não vai desenhar*.
 * É a mesma pergunta vista dos dois lados, e foi ter a regra em cada tela que produziu o defeito
 * original do menu (o `.slice(0, 4)` do `Header`). Molde de `menuEntries`, que mora em `core` e é
 * consumida pelas quatro superfícies.
 *
 * **Devolve TODAS as seções, inclusive as que não renderizam.** A loja filtra por `renders`; o painel
 * precisa justamente das que não renderizam, para mostrar o motivo na linha.
 */
export const resolveHomeSections = (
  sections: readonly HomeSection[],
  ctx: ResolveContext,
): ResolvedSection[] => {
  const resolved: ResolvedSection[] = []
  /** A última seção que **renderizou** — é dela que a faixa institucional pende. */
  let ultimaRenderizada: HomeSection | null = null

  for (const section of orderSections(sections)) {
    const curados = naOrdemDaDona(section.items ?? [])

    let items: ResolvedItem[] = []
    let droppedCount = 0

    if (curados.length > 0) {
      // Curadoria é a PRESENÇA de itens. Com itens, a lista é a dela, na ordem dela, e a vaga que
      // sobra **fica vazia**: completar com o automático poria na Home item que ela não escolheu.
      for (const item of curados) {
        const resolvido = ctx.resolveItem(item, section)
        if (resolvido) items.push(resolvido)
        else droppedCount += 1
      }
    } else {
      items = [...ctx.derive(section)]
    }

    // `HOME-42`: o limite da seção vale para os dois ramos. Só os tipos que declaram faixa em
    // `sectionMeta` têm `config.limit`, então isto não alcança quem não tem limite editável.
    const limit = section.config?.limit
    if (typeof limit === 'number' && limit > 0) items = items.slice(0, limit)

    const semFonte = SOURCE_DRIVEN.includes(section.type) && items.length === 0

    let hiddenReason: string | null = null
    if (!section.active) hiddenReason = DESLIGADA
    else if (semFonte && curados.length > 0) hiddenReason = todosForaDoAr(curados.length)
    else if (semFonte) hiddenReason = EMPTY_SOURCE_REASON[section.type] || DESLIGADA

    const renders = hiddenReason === null

    // A faixa institucional declara ela mesma o aninhamento. Sem uma seção de fileiras renderizada
    // logo antes, ela **renderiza sozinha, no próprio lugar** — nunca some. Uma Home reordenada não
    // pode engolir conteúdo em silêncio.
    const afterRow = section.config?.interlude_after
    const nestedUnder =
      renders &&
      typeof afterRow === 'number' &&
      ultimaRenderizada &&
      ultimaRenderizada.type === 'collection_rows'
        ? { sectionId: ultimaRenderizada.id, afterRow }
        : null

    resolved.push({ section, renders, hiddenReason, items, droppedCount, nestedUnder })
    if (renders) ultimaRenderizada = section
  }

  return resolved
}
