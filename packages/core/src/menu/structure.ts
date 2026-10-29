// Feature 86 — o menu montado pela dona.
//
// Até aqui o menu era DEDUZIDO das colunas da categoria (`menu_desktop`, `menu_mobile`,
// `menu_banners`) e da `sort_order` da árvore — que também ordena a grade da Home, o rodapé e a lista
// de categorias. Reordenar o menu bagunçava outras telas, e ligar uma subcategoria podia fazê-la subir
// para a barra. A montagem passa a ter dono próprio: um documento `{ version: 2, items: [...] }` em
// `store_settings.menu` (`AD-068`).
//
// Este arquivo tem a forma do documento, a leitura tolerante (`parseMenuDocument`), a conversão do
// legado (`legacyMenuDocument`) e a porta única (`menuItems`), que as quatro superfícies continuam
// chamando.
//
// **A direção dos imports é regra, não gosto.** `menu.ts` é alcançado pelo Deno (`core/page` e o
// sitemap importam `categoryHref` de lá), e os guardas de alcance têm contagens cravadas. Este
// arquivo importa `menu.ts`; `menu.ts` **nunca** importa este. E todo especificador relativo leva
// `.ts`, inclusive o `import type` — o Deno resolve o grafo de tipos junto.

import {
  byMenuOrder,
  bySortOrder,
  categoryHref,
  legacyMenuItems,
  menuBannerSlots,
  menuHrefIsExternal,
  normalizeMenuHref,
  type LegacyMenuItem,
  type MenuCategory,
  type MenuLink,
  type MenuSurface,
} from './menu.ts'
import { menuIconKey, type MenuIconKey } from './icons.ts'
import type { MenuBanners } from './banners.ts'

// ===========================================================================
// A forma do documento
// ===========================================================================

/**
 * O destino de um nó. Discriminado por literal de **string** — com `strictNullChecks: false`, união
 * por literal booleano não estreita.
 */
export type MenuNodeTarget =
  | { kind: 'category'; category_id: string }
  | { kind: 'link'; href: string }

/** Um nó do menu: item do menu principal ou item de submenu. */
export interface MenuNode {
  /** Estável, gerado no painel. A ponte da prévia (`open`) e as chaves React usam este id. */
  id: string
  target: MenuNodeTarget
  /**
   * `null` = **o nome da categoria**, lido na hora (`MNM-15`). Nunca se copia o nome: a cópia
   * divergiria no primeiro rename — a objeção da `AD-014`. Item de link sempre tem rótulo.
   */
  label: string | null
  desktop: boolean
  mobile: boolean
}

/** Um item do menu principal: o único nível com ícone, banners e submenu. */
export interface MenuRootNode extends MenuNode {
  /** Chave de `MENU_ICON_KEYS`; fora do conjunto degrada para "sem ícone". */
  icon: string | null
  /** A forma da `39`, intacta (`{ desktop: [], mobile: [] }`). Quem valida é `resolveMenuBanners`. */
  banners: MenuBanners | null
  /** Até `MENU_SUBMENU_LIMIT` (a recusa mora em `refusals.ts`). */
  children: MenuNode[]
}

export interface MenuDocument {
  version: 2
  items: MenuRootNode[]
}

// ===========================================================================
// A saída da porta — o que a loja desenha
// ===========================================================================

/** Um item de submenu, pronto para virar link. */
export interface MenuChild {
  id: string
  name: string
  href: string
  external: boolean
}

/**
 * Um item do menu principal, resolvido para uma superfície.
 *
 * Substitui `LegacyMenuCategoryItem`/`LegacyMenuLinkItem`: os filhos deixaram de ser categorias da
 * árvore (um submenu pode ter outra categoria qualquer, ou um link), e o item de link pode ter
 * painel.
 */
export interface MenuItem {
  /** O id do NÓ (a ponte `open` usa este). No legado convertido, `cat:<id>` ou `link:<id>`. */
  id: string
  kind: 'category' | 'link'
  /**
   * A categoria de destino, quando o item é de categoria; `null` para link. Não estava no desenho:
   * é o que deixa a loja continuar achando os banners da categoria enquanto `useMenuBanners` não lê
   * `banners` do item (T08).
   */
  categoryId: string | null
  name: string
  href: string
  external: boolean
  icon: MenuIconKey | null
  /** Só os visíveis nesta superfície, na ordem gravada. */
  children: MenuChild[]
  /** Cru, para `resolveMenuBanners`. */
  banners: unknown
  /** Filho visível **ou** banner nesta superfície, para categoria **e** link (`MNM-27`). */
  hasPanel: boolean
}

/** As fontes da porta. `document` ausente ou `null` ⇒ o menu deduzido de hoje (`links` incluso). */
export interface MenuDocumentInput {
  categories: readonly MenuCategory[]
  document?: MenuDocument | null
  links?: readonly MenuLink[]
}

// ===========================================================================
// Leitura tolerante
// ===========================================================================

const ehObjeto = (valor: unknown): valor is Record<string, unknown> =>
  typeof valor === 'object' && valor !== null && !Array.isArray(valor)

const textoNaoVazio = (valor: unknown): string | null =>
  typeof valor === 'string' && valor.trim() !== '' ? valor : null

const parseTarget = (raw: unknown): MenuNodeTarget | null => {
  if (!ehObjeto(raw)) return null
  if (raw.kind === 'category') {
    const id = textoNaoVazio(raw.category_id)
    return id ? { kind: 'category', category_id: id.trim() } : null
  }
  if (raw.kind === 'link') {
    const href = textoNaoVazio(raw.href)
    return href ? { kind: 'link', href } : null
  }
  return null
}

const parseNode = (raw: unknown): MenuNode | null => {
  if (!ehObjeto(raw)) return null
  const id = textoNaoVazio(raw.id)
  if (!id) return null
  const target = parseTarget(raw.target)
  if (!target) return null
  return {
    id,
    target,
    label: typeof raw.label === 'string' ? raw.label : null,
    // Ausente é desligado — a mesma leitura das colunas da `39`. O painel grava as duas sempre.
    desktop: raw.desktop === true,
    mobile: raw.mobile === true,
  }
}

/** Os nós válidos de uma lista, sem id repetido (o primeiro vence). */
const parseList = <T>(raw: unknown, parse: (n: unknown) => T | null, id: (n: T) => string): T[] => {
  if (!Array.isArray(raw)) return []
  const vistos = new Set<string>()
  const saida: T[] = []
  for (const bruto of raw) {
    const no = parse(bruto)
    if (!no || vistos.has(id(no))) continue
    vistos.add(id(no))
    saida.push(no)
  }
  return saida
}

const parseRoot = (raw: unknown): MenuRootNode | null => {
  const no = parseNode(raw)
  if (!no) return null
  const bruto = raw as Record<string, unknown>
  return {
    ...no,
    icon: typeof bruto.icon === 'string' ? bruto.icon : null,
    banners: ehObjeto(bruto.banners) ? (bruto.banners as unknown as MenuBanners) : null,
    children: parseList(bruto.children, parseNode, n => n.id),
  }
}

/**
 * O documento gravado — ou `null` quando ainda não há a versão nova.
 *
 * `null`, array, objeto sem `version: 2` (inclusive o legado `{ links: [...] }`) ⇒ `null`, e a porta
 * cai no menu deduzido. Nó que não é objeto, sem `id` ou com alvo inválido é **descartado** (jsonb
 * escrito na mão não derruba a loja). Nó cuja categoria **não existe mais fica**: o painel precisa
 * mostrá-lo como "Categoria apagada" (`MNM-36`), e quem o esconde da loja é a porta.
 */
export const parseMenuDocument = (raw: unknown): MenuDocument | null => {
  if (!ehObjeto(raw) || raw.version !== 2) return null
  return { version: 2, items: parseList(raw.items, parseRoot, n => n.id) }
}

// ===========================================================================
// Estado e nome de um nó
// ===========================================================================

export type MenuNodeState = 'ok' | 'inactive' | 'deleted'

/** A categoria referenciada existe e está ativa? Link é sempre `ok`. */
export const menuNodeState = (
  node: Pick<MenuNode, 'target'>,
  categories: readonly MenuCategory[],
): MenuNodeState => {
  if (node?.target?.kind !== 'category') return 'ok'
  const id = node.target.category_id
  const categoria = (categories ?? []).find(c => c?.id === id)
  if (!categoria) return 'deleted'
  return categoria.active ? 'ok' : 'inactive'
}

/**
 * O nome que o item mostra: o rótulo próprio aparado, ou — com `label: null` — o nome **atual** da
 * categoria. Categoria apagada sem rótulo devolve `''`.
 */
export const menuNodeName = (
  node: Pick<MenuNode, 'target' | 'label'>,
  categories: readonly MenuCategory[],
): string => {
  const proprio = typeof node?.label === 'string' ? node.label.trim() : ''
  if (proprio !== '') return proprio
  if (node?.target?.kind !== 'category') return ''
  const id = node.target.category_id
  return (categories ?? []).find(c => c?.id === id)?.name ?? ''
}

// ===========================================================================
// A conversão do legado
// ===========================================================================

const idDoLegado = (item: Pick<LegacyMenuItem, 'kind' | 'id'>): string =>
  item.kind === 'category' ? `cat:${item.id}` : `link:${item.id}`

/**
 * O menu de hoje — o que `legacyMenuItems` devolve no computador **e** no celular — como documento
 * v2.
 *
 * É o que deixa a feature nascer **sem migration**: enquanto `store_settings.menu` não tem
 * `version: 2`, a loja e o painel montam o menu a partir disto, e a loja fica idêntica à de antes por
 * construção. A primeira ação da dona grava o documento inteiro (`MNM-34`).
 *
 * - **União das duas superfícies**: item só no computador ⇒ `desktop: true, mobile: false`, e o
 *   inverso. Os filhos levam as chaves de cada superfície.
 * - **Ordem de hoje**: as raízes pela régua de `byMenuOrder` (sort_order, depois nome em `pt-BR`), e
 *   os filhos pela da árvore — as duas listas de cada superfície já saem nessa ordem, e a união
 *   ordenada pela mesma régua preserva a ordem relativa de cada uma.
 * - **Determinística** (`MNM-40`): ids derivados do alvo (`cat:<id>`, `link:<id>`), sem relógio nem
 *   aleatório. Duas chamadas com a mesma entrada devolvem documentos iguais.
 * - **Banners copiados** de `categories.menu_banners` para o item da categoria.
 */
export const legacyMenuDocument = (
  categories: readonly MenuCategory[],
  links: readonly MenuLink[] = [],
): MenuDocument => {
  const input = { categories: categories ?? [], links: links ?? [] }
  const porSuperficie: Record<MenuSurface, LegacyMenuItem[]> = {
    desktop: legacyMenuItems(input, 'desktop'),
    mobile: legacyMenuItems(input, 'mobile'),
  }

  interface Raiz {
    legado: LegacyMenuItem
    no: MenuRootNode
    filhas: Map<string, { categoria: MenuCategory; no: MenuNode }>
  }
  const raizes = new Map<string, Raiz>()
  const lista = (categories ?? []).filter(Boolean)

  for (const surface of ['desktop', 'mobile'] as const) {
    for (const item of porSuperficie[surface]) {
      const id = idDoLegado(item)
      let raiz = raizes.get(id)
      if (!raiz) {
        const categoria = item.kind === 'category' ? lista.find(c => c.id === item.id) : undefined
        const link = item.kind === 'link' ? (links ?? []).find(l => l?.id === item.id) : undefined
        raiz = {
          legado: item,
          filhas: new Map(),
          no: {
            id,
            target:
              item.kind === 'category'
                ? { kind: 'category', category_id: item.id }
                : { kind: 'link', href: link ? link.href : item.href },
            label: item.kind === 'category' ? null : item.name,
            desktop: false,
            mobile: false,
            icon: item.icon,
            banners:
              categoria && ehObjeto(categoria.menu_banners)
                ? (categoria.menu_banners as unknown as MenuBanners)
                : null,
            children: [],
          },
        }
        raizes.set(id, raiz)
      }
      raiz.no[surface] = true

      if (item.kind === 'category') {
        for (const filha of item.children) {
          let entrada = raiz.filhas.get(filha.id)
          if (!entrada) {
            entrada = {
              categoria: filha,
              no: {
                id: `cat:${filha.id}`,
                target: { kind: 'category', category_id: filha.id },
                label: null,
                desktop: false,
                mobile: false,
              },
            }
            raiz.filhas.set(filha.id, entrada)
          }
          entrada.no[surface] = true
        }
      }
    }
  }

  const items = [...raizes.values()]
    .sort((a, b) => byMenuOrder(a.legado, b.legado))
    .map(({ no, filhas }) => ({
      ...no,
      children: [...filhas.values()]
        .sort((a, b) => bySortOrder(a.categoria, b.categoria))
        .map(f => f.no),
    }))

  return { version: 2, items }
}

// ===========================================================================
// A porta
// ===========================================================================

/**
 * O menu de uma superfície. **A única porta** — as quatro superfícies (barra do computador, folha do
 * celular, `/admin/menu` e a prévia) leem daqui, e nenhuma filtra, ordena ou trunca por conta.
 *
 * `document` ausente ou `null` ⇒ o menu deduzido de hoje (`legacyMenuDocument`), e a saída é a mesma
 * de antes, item a item. Com o documento:
 *
 * - **Visível na superfície** = ligado nela **e** com a categoria existente e ativa. Item principal
 *   de categoria inativa ou apagada some **com o submenu inteiro** (`MNM-35`, `MNM-36`); filho
 *   inativo ou apagado some sozinho.
 * - **O nome** é o rótulo próprio, ou o nome atual da categoria (`MNM-15`).
 * - **Sem teto** na raiz (`MNM-39`): a barra rola.
 * - **`hasPanel`** = filho visível ou banner nesta superfície, para categoria **e** link (`MNM-27`).
 *
 * O `href` de categoria sai de `categoryHref` sobre as **ativas** (`AD-018`): um pai inativo não
 * pode aparecer numa URL que a cliente vai abrir.
 */
export const menuItems = (input: MenuDocumentInput, surface: MenuSurface): MenuItem[] => {
  const categories = (input?.categories ?? []).filter(Boolean)
  const documento = input?.document ?? legacyMenuDocument(categories, input?.links ?? [])
  const visiveis = categories.filter(c => c.active)

  const destino = (node: MenuNode): { href: string; external: boolean } | null => {
    if (menuNodeState(node, categories) !== 'ok') return null
    if (node.target.kind === 'category') {
      return { href: categoryHref(visiveis, node.target.category_id), external: false }
    }
    const href = normalizeMenuHref(node.target.href)
    if (href === '') return null
    return { href, external: menuHrefIsExternal(node.target.href) }
  }

  const visivel = (node: MenuNode): boolean => node?.[surface] === true

  const saida: MenuItem[] = []
  for (const raiz of documento?.items ?? []) {
    if (!raiz || !visivel(raiz)) continue
    const alvo = destino(raiz)
    if (!alvo) continue
    const name = menuNodeName(raiz, categories)
    // Rótulo vazio não é item: é linha pela metade no jsonb.
    if (name === '') continue

    const children: MenuChild[] = []
    for (const filho of raiz.children ?? []) {
      if (!filho || !visivel(filho)) continue
      const alvoFilho = destino(filho)
      const nomeFilho = alvoFilho ? menuNodeName(filho, categories) : ''
      if (!alvoFilho || nomeFilho === '') continue
      children.push({ id: filho.id, name: nomeFilho, ...alvoFilho })
    }

    const banners = raiz.banners ?? null
    saida.push({
      id: raiz.id,
      kind: raiz.target.kind,
      categoryId: raiz.target.kind === 'category' ? raiz.target.category_id : null,
      name,
      href: alvo.href,
      external: alvo.external,
      icon: menuIconKey(raiz.icon),
      children,
      banners,
      hasPanel: children.length > 0 || menuBannerSlots(banners, surface).length > 0,
    })
  }
  return saida
}
