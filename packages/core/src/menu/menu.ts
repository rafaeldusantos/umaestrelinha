// Feature 16 — o domínio do menu da loja.
//
// Puro: nada aqui sabe que existe React, Supabase ou tela. Vive em `@estrelinha/core` porque **quatro
// superfícies em dois apps** consomem a mesma regra — a tela `/admin/menu`, o mega menu do desktop, a
// folha do celular e a página da coleção. Duplicado, o admin mostraria uma coisa e a loja outra.
//
// E isso não é hipótese: o bug que esta feature conserta era exatamente essa divergência em
// miniatura. O `Header` fazia `.slice(0, 4)` de uma lista chapada ordenada por `sort_order`, sem
// saber o que é raiz e o que é filha. Com a árvore real do banco —
// `Bottons › {Academia, Anime, K-Pop, …}` — a barra do topo da loja dizia
// "Bottons · Academia · Anime · K-Pop": o contêiner de tudo, mais uma filha que só chegou lá por
// empatar em `sort_order = 0` com ele.

import { categoryPath } from '../routes/index.ts'
import { menuIconKey, type MenuIconKey } from './icons.ts'

/**
 * A forma do jsonb LEGADO `categories.menu_promo` — o card da feature 16.
 *
 * **Nada mais lê esta coluna** (feature 39): ela foi substituída por `menu_banners`, que aceita arte,
 * dois anúncios por painel e destino de categoria, produto ou endereço. A coluna continua no banco de
 * propósito, para a loja publicada não quebrar na janela entre o `db push` e o deploy da Vercel, e o
 * tipo continua declarado porque `DbCategory` **descreve a linha** — um tipo que dissesse menos que o
 * banco é o `AD-012` de novo.
 *
 * **Declarado aqui, e reexportado por `@estrelinha/supabase/types`** — a inversão é da feature 33.
 * O tipo morava lá e era importado por este arquivo, o que tornava `core/menu` inalcançável pelo
 * **Deno**: ele resolve o grafo de TIPOS também, e um especificador nu derruba o worker com
 * `Failed resolving types` antes da primeira linha rodar (medido em 2026-08-29, na primeira execução
 * da function do sitemap). Quem precisa alcançar este módulo de lá é o sitemap, porque `categoryHref`
 * — o dono da canônica de categoria — mora aqui.
 *
 * `category_id` era obrigatório porque o card apontava para uma categoria de verdade, e a referência
 * mora dentro de jsonb, onde **não cabe FK** — apagar o destino não dispara `on delete set null`.
 * Essa lição não se perdeu: é a razão de `resolveMenuBanners` validar destino na leitura.
 */
export interface MenuPromo {
  category_id: string
  badge?: string
  title?: string
  subtitle?: string
}

/**
 * A forma **mínima** que o domínio precisa.
 *
 * Estrutural de propósito: o backoffice passa `DbCategory` e a loja passa `Category`, que não são o
 * mesmo tipo (um tem `banner_url`, o outro tem `emoji`). Exigir um dos dois obrigaria um mapper em
 * cada chamada, e um mapper é onde o `active` some sem ninguém notar.
 */
export interface MenuCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id: string | null
  sort_order: number
  active: boolean
  /**
   * **`show_in_menu` e `menu_promo` NÃO estão aqui, e a ausência é a decisão** (feature 39, T30).
   *
   * As duas colunas continuam no banco — a primeira virou **gerada** (`menu_desktop or menu_mobile`)
   * e a segunda é legado não lido —, mas o domínio deixou de conhecê-las: quem responde "está no
   * menu?" é `menuItems(…, surface)`, porque a resposta depende do dispositivo, e um campo aqui
   * seria o convite permanente para alguém voltar a perguntar sem dizer qual dispositivo.
   * `menuSurfaceSingleOwner.test.ts` guarda o outro lado, nos dois apps.
   *
   * Feature 39 — a curadoria por dispositivo. Ausente é o mesmo que desligado.
   */
  menu_desktop?: boolean
  menu_mobile?: boolean
  /** Chave de `MENU_ICON_KEYS`. Valor fora do conjunto degrada para "sem ícone" (`NAV-19`). */
  icon?: string | null
  /** `{ desktop: [], mobile: [] }` cru, como o jsonb guarda. Quem valida é `resolveMenuBanners`. */
  menu_banners?: unknown
  /** Da view `category_product_counts`, quando quem chama a tem. Alimenta o "12 pins" do card. */
  product_count?: number
}

// ===========================================================================
// O QUE SAIU AQUI, e por quê — feature 39, T30
//
// Este bloco guardava `MENU_SLOT_LIMIT`, `slotsUsed`, `menuSlotRefusal`, `MenuEntry`,
// `ResolvedPromo`, `resolvePromo` e `menuEntries`. Os sete foram **apagados**, não depreciados, e a
// diferença importa: um "legado que ninguém lê" exportado do barril é exatamente o que a próxima
// tela importa por engano — e ele responderia com a **única** curadoria de antes, ignorando o
// dispositivo. A tela voltaria a mostrar uma coisa e a loja outra, sem quebrar nada.
//
// - **O teto de 4 vagas** era número de código recusando curadoria da dona: a tela negava a 5ª
//   categoria em vez de mostrar o que acontecia com ela. A resposta da 39 é a barra **rolar**, e não
//   haver recusa por contagem em lugar nenhum. `menuSemTeto.test.ts` recusa a volta.
// - **`menuEntries`** lia um booleano só e devolvia todas as filhas ativas — sem superfície e sem
//   curadoria de painel. `menuItems(input, surface)` é a porta única.
// - **`resolvePromo`** resolvia o card `menu_promo`, um retângulo de cor sem imagem, com destino só
//   de categoria. `resolveMenuBanners` o substituiu, com arte por dispositivo e três tipos de
//   destino.
//
// O comentário que vivia no teto também estava **errado**, e é o defeito que a varredura da 39 achou
// de passagem: dizia que "Crie o Seu" e "Sobre" eram entradas fixas do código. `/crie-seu-botton`
// nunca foi rota declarada — cai na 404 da loja —, e a única entrada escrita em JSX era o "Sobre".
// ===========================================================================

/**
 * A ordem do menu — e a **causa raiz** do bug do topo.
 *
 * "Bottons" e "Academia" estavam as duas em `sort_order = 0`. Sem desempate, a ordem entre elas era o
 * que o Postgres devolvesse, e uma subcategoria chegava ao topo por sorteio. O desempate por nome não
 * é cosmético: é o que faz a barra ser reprodutível entre dois carregamentos.
 *
 * `'pt-BR'` explícito: sem o locale, `localeCompare` usa o do host, e "Séries" x "Sobre" poderia
 * ordenar diferente na máquina de quem desenvolve e no runtime que serve a loja.
 */
export const bySortOrder = (
  a: Pick<MenuCategory, 'sort_order' | 'name'>,
  b: Pick<MenuCategory, 'sort_order' | 'name'>,
): number => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name, 'pt-BR')

/**
 * Os ancestrais, do mais alto até o pai direto — **sem** a própria categoria.
 *
 * A guarda de ciclo é o `seen`, não um limite de profundidade: `parent_id` não tem constraint que
 * impeça `a → b → a`, e o formulário de categoria do backoffice sempre deixou escolher descendente
 * como pai. Um laço aqui travaria a renderização do header inteiro.
 *
 * Pai que não está na lista encerra a subida em vez de quebrar — é o caso da categoria cuja árvore
 * veio parcial (busca filtrada, consulta com `limit`).
 */
export const ancestorsOf = (
  categories: readonly MenuCategory[],
  categoryId: string,
): MenuCategory[] => {
  const byId = new Map(categories.map(c => [c.id, c]))
  const start = byId.get(categoryId)
  if (!start) return []

  const chain: MenuCategory[] = []
  const seen = new Set<string>([start.id])
  let cursor = start

  while (cursor.parent_id) {
    const parent = byId.get(cursor.parent_id)
    if (!parent || seen.has(parent.id)) break
    chain.unshift(parent)
    seen.add(parent.id)
    cursor = parent
  }
  return chain
}

/**
 * A URL canônica de uma categoria da árvore — `AD-018`, e a **única** função que sabe montá-la.
 *
 * Raiz vira `/<slug>`; filha vira `/<pai imediato>/<slug>`. **No máximo dois segmentos**: uma árvore
 * de três níveis (que o catálogo real não tem — medido, máximo 2) produz `/<pai>/<slug>` e nunca
 * `/<avô>/<pai>/<slug>`, porque a canônica declarada pelo site em produção tem dois.
 *
 * Reusa `ancestorsOf`, que já é a única subida da cadeia de pais do projeto: uma segunda caminhada
 * herdaria de novo a guarda de ciclo e o caso do pai fora da lista, e as duas divergiriam.
 *
 * `id` inexistente devolve `/` em vez de lançar — o chamador é uma renderização de link, e derrubar
 * o header inteiro por causa de um card apontando para categoria apagada é pior que levar à home.
 * Pai **ausente da lista** (árvore parcial, pai inativo que a RLS escondeu) cai na forma de um
 * segmento, que resolve com 200 e declara a própria canônica.
 */
export const categoryHref = (categories: readonly MenuCategory[], id: string): string => {
  const self = categories.find(c => c.id === id)
  if (!self) return '/'

  const chain = ancestorsOf(categories, id)
  const parent = chain.length > 0 ? chain[chain.length - 1] : null
  return categoryPath(self.slug, parent ? parent.slug : null)
}

/** `Bottons › Anime` — o caminho **com** a própria categoria. String vazia se o id não existe. */
export const pathLabel = (
  categories: readonly MenuCategory[],
  categoryId: string,
  separator = ' › ',
): string => {
  const self = categories.find(c => c.id === categoryId)
  if (!self) return ''
  return [...ancestorsOf(categories, categoryId), self].map(c => c.name).join(separator)
}

/**
 * Toda a descendência de uma categoria, **incluindo ela própria**.
 *
 * É o que faz `/bottons/anime` mostrar os produtos de "Naruto". Sem isto, a página do universo lista
 * só os vínculos diretos — e o "Ver todos →" do mega menu levaria a uma tela sem os produtos que o
 * próprio menu acabou de listar, porque o `CategoryMultiSelect` do formulário de produto **não**
 * marca o pai automaticamente.
 *
 * Descida em largura com `seen`: cobre neta e bisneta (meia-descida deixaria a neta fora da conta do
 * avô) e termina em árvore com ciclo, tratando o nó repetido como folha.
 */
export const descendantIds = (
  categories: readonly MenuCategory[],
  categoryId: string,
): string[] => {
  const childrenOf = new Map<string, string[]>()
  for (const category of categories) {
    if (!category.parent_id) continue
    const siblings = childrenOf.get(category.parent_id) ?? []
    siblings.push(category.id)
    childrenOf.set(category.parent_id, siblings)
  }

  const out: string[] = []
  const seen = new Set<string>()
  const queue = [categoryId]

  while (queue.length > 0) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
    queue.push(...(childrenOf.get(id) ?? []))
  }
  return out
}


// ===========================================================================
// Feature 39 — o menu configurável: duas superfícies, sem teto, papel derivado da árvore.
//
// O que muda de modelo: até aqui o menu era **um** booleano (`show_in_menu`) e uma lista chapada de
// quatro vagas. A dona não podia ter uma barra no computador e outra no celular, não podia passar de
// quatro, não podia escolher quais filhas o painel mostra, e o único item que não era categoria — o
// "Sobre" — estava escrito no JSX de duas telas.
//
// Daqui para baixo, **nada disso é decidido por tela**: `menuItems` é a única porta, e as quatro
// superfícies (barra do desktop, folha do celular, `/admin/menu` e a prévia) leem dela.
// ===========================================================================

/** As duas superfícies. Não é "responsivo": são duas curadorias independentes. */
export type MenuSurface = 'desktop' | 'mobile'

/**
 * Um item de link, como `store_settings.menu -> links[]` o guarda.
 *
 * **Não é categoria, e por isso não mora em `categories`** (`AD-014`, `AD-028`): não tem produto,
 * não tem filha e não tem página própria — é um atalho para uma página que já existe. Pô-lo na
 * árvore criaria a categoria vazia que a feature 16 recusou, e ela apareceria na grade da home, no
 * rodapé e na busca sem ninguém ter pedido.
 *
 * `sort_order` é do item, como o da categoria: quem funde as duas fontes é o comparador, não a
 * coluna.
 */
export interface MenuLink {
  id: string
  label: string
  href: string
  /** Chave de `MENU_ICON_KEYS`; fora do conjunto degrada para "sem ícone". */
  icon?: string | null
  desktop: boolean
  mobile: boolean
  sort_order: number
}

interface MenuItemBase {
  id: string
  /** O rótulo que a loja mostra. Da categoria é o `name`; do link é o `label`. */
  name: string
  href: string
  icon: MenuIconKey | null
  sortOrder: number
}

/** Uma entrada de categoria: pode abrir painel. */
export interface MenuCategoryItem extends MenuItemBase {
  kind: 'category'
  slug: string
  /** `Joias › Correntes` — o admin precisa saber o que está pondo no menu. A loja mostra só `name`. */
  path: string
  /** As filhas **curadas para esta superfície**, na ordem da árvore. */
  children: MenuCategory[]
  /**
   * Abre painel? Filha curada **ou** banner configurado nesta superfície (`NAV-25`).
   *
   * Aqui a conta é da **presença** do banner, não do banner resolvido: destino de produto só é
   * resolvido quando o painel abre (a loja não carrega o catálogo para desenhar o topo), e esperar
   * por isso faria a seta aparecer depois do primeiro hover.
   */
  hasPanel: boolean
}

/** Um item de link: link direto, sempre. Sem painel, sem seta, sem filha, sem banner (`NAV-12`). */
export interface MenuLinkItem extends MenuItemBase {
  kind: 'link'
  external: boolean
}

/**
 * O que as quatro superfícies desenham.
 *
 * União discriminada por literal de **string**, e isso é exigência do repositório, não gosto:
 * `tsconfig.base.json` tem `strictNullChecks: false`, e nesse modo união por literal **booleano** não
 * estreita. `kind` estreita.
 */
export type MenuItem = MenuCategoryItem | MenuLinkItem

/** As duas fontes do menu. `links` ausente é o mesmo que loja sem item de link (`NAV-15`). */
export interface MenuInput {
  categories: readonly MenuCategory[]
  links?: readonly MenuLink[]
}

/** Esta categoria está ligada nesta superfície? Ausente é desligado — o default do banco é `false`. */
const naSuperficie = (category: MenuCategory, surface: MenuSurface): boolean =>
  surface === 'desktop' ? !!category?.menu_desktop : !!category?.menu_mobile

/** Este link está ligado nesta superfície? */
const linkNaSuperficie = (link: MenuLink, surface: MenuSurface): boolean =>
  surface === 'desktop' ? !!link?.desktop : !!link?.mobile

/**
 * O endereço é de fora da loja?
 *
 * Casa **`http` e `https`** de propósito, ainda que a gravação só aceite `https://`
 * (`menuTargetRefusal`): um link gravado antes dessa regra continua sendo externo, e renderizá-lo
 * como caminho interno faria o React Router tentar servir `http:` como rota e devolver 404.
 */
export const menuHrefIsExternal = (href: unknown): boolean =>
  typeof href === 'string' && /^https?:\/\//i.test(href.trim())

/**
 * O caminho interno na forma que a loja serve: uma barra na frente, nenhuma no fim.
 *
 * A forma importa porque `vercel.json` declara `trailingSlash: false` — `/sobre/` e `/sobre` são a
 * mesma página com dois endereços, e o segundo é o canônico. Endereço externo passa intacto: quem o
 * julga é `menuTargetRefusal`.
 *
 * Barras repetidas na frente colapsam em uma. `//exemplo.com` é endereço **protocol-relative**: sem
 * o colapso ele atravessaria como "interno" e a loja mandaria a cliente para outro domínio; com ele
 * vira `/exemplo.com`, que a recusa da gravação pega por não ser rota declarada.
 */
export const normalizeMenuHref = (href: unknown): string => {
  const bruto = typeof href === 'string' ? href.trim() : ''
  if (bruto === '') return ''
  if (menuHrefIsExternal(bruto)) return bruto

  const comBarra = (bruto.startsWith('/') ? bruto : `/${bruto}`).replace(/^\/+/, '/')
  return comBarra.length > 1 ? comBarra.replace(/\/+$/, '') : comBarra
}

/**
 * Os banners crus de uma superfície — a **forma** do jsonb, lida num lugar só.
 *
 * Mora aqui, e não em `banners.ts`, por causa da direção dos imports: `banners.ts` importa
 * `target.ts`, que importa `categoryHref` **daqui**. Se este arquivo importasse `banners.ts` para
 * saber se há banner, o grafo fecharia um ciclo — e ciclo de módulo é o tipo de coisa que o Vite
 * tolera e o Deno das edge functions não. Com o primitivo aqui e a resolução lá, a seta continua
 * tendo um dono só.
 */
export const menuBannerSlots = (raw: unknown, surface: MenuSurface): unknown[] => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return []
  const lista = (raw as Record<string, unknown>)[surface]
  return Array.isArray(lista) ? lista : []
}

/**
 * A ordem do menu inteiro — categorias e links **juntos**.
 *
 * Delega para `bySortOrder` em vez de repetir a regra: o desempate por nome com locale `'pt-BR'` é o
 * que faz a barra ser reprodutível entre dois carregamentos, e ele já custou o bug do topo da
 * feature 16. Duas escritas dele divergiriam no primeiro empate — e empate é o caso comum, porque
 * `sort_order` nasce 0 para todo mundo.
 */
export const byMenuOrder = (a: MenuItem, b: MenuItem): number =>
  bySortOrder(
    { sort_order: a.sortOrder, name: a.name },
    { sort_order: b.sortOrder, name: b.name },
  )

/**
 * O menu de uma superfície. **A única porta** — nenhuma tela filtra, ordena ou trunca por conta.
 *
 * Três regras moram aqui, e cada uma existia solta numa tela antes:
 *
 * 1. **O papel é derivado da árvore, não gravado** (`NAV-06`). Categoria marcada cujo **pai também
 *    está marcado na mesma superfície** é item do painel do pai; qualquer outra marcada é entrada da
 *    barra. Gravar o papel numa coluna seria um segundo dono de algo que a árvore já responde, e ele
 *    dessincronizaria no primeiro "mover categoria" — em silêncio, como sempre.
 * 2. **Não há teto** (`NAV-03`). Vinte marcadas devolvem vinte. Quando não couber, a barra rola; era
 *    o teto de 4 que fazia a tela recusar a curadoria da dona em vez de mostrar o que acontece.
 * 3. **Categorias e links saem na mesma lista ordenada** (`NAV-14`), o que é o que permite não haver
 *    item de menu escrito em JSX.
 *
 * Inativa não é devolvida (`NAV-07`) — a policy `public read categories using (active = true)` já a
 * esconderia da cliente, e uma entrada que leva a uma coleção invisível é pior que entrada nenhuma.
 * Ela continua contando na tela do admin, que é onde ela pode ser desligada.
 *
 * **Ciclo termina**: `a → b → a` com as duas marcadas não é subida de cadeia nenhuma aqui — a
 * pergunta "o pai está marcado?" é uma consulta a um conjunto. As duas viram item de painel uma da
 * outra e nenhuma chega à barra, o que é estranho e é o dado que está estranho; o que não acontece é
 * o header travar. `parent_id` não tem constraint que impeça o ciclo, e o formulário de categoria do
 * backoffice sempre deixou escolher descendente como pai.
 */
export const menuItems = (input: MenuInput, surface: MenuSurface): MenuItem[] => {
  // Linha nula não é categoria: ela chega quando um mapper devolve `undefined` para uma linha que
  // não reconheceu, e `pathLabel` varre a lista INTEIRA — a inativa incluída. Sem este recorte, uma
  // linha ruim derruba o header todo em vez de sumir sozinha.
  const categories = (input?.categories ?? []).filter(Boolean)
  const links = (input?.links ?? []).filter(Boolean)

  // A árvore que a cliente pode ver. O href sai daqui (um pai inativo não pode aparecer numa URL
  // que ela vai abrir); o `path` sai da lista inteira, porque o admin precisa ver a posição real.
  const visiveis = categories.filter(c => c.active)
  const marcadas = new Set(visiveis.filter(c => naSuperficie(c, surface)).map(c => c.id))

  const entradas: MenuItem[] = visiveis
    .filter(c => marcadas.has(c.id) && !(c.parent_id && marcadas.has(c.parent_id)))
    .map((c): MenuCategoryItem => {
      const children = visiveis
        .filter(filha => filha.parent_id === c.id && marcadas.has(filha.id))
        .sort(bySortOrder)

      return {
        kind: 'category',
        id: c.id,
        name: c.name,
        slug: c.slug,
        href: categoryHref(visiveis, c.id),
        path: pathLabel(categories, c.id),
        icon: menuIconKey(c.icon),
        sortOrder: c.sort_order ?? 0,
        children,
        hasPanel: children.length > 0 || menuBannerSlots(c.menu_banners, surface).length > 0,
      }
    })

  const atalhos: MenuItem[] = links
    .filter(l => linkNaSuperficie(l, surface))
    // Rótulo ou destino vazio não é item: é linha pela metade no jsonb. O que **não** se recusa aqui
    // é destino que deixou de ser rota — a loja não tem como saber, e sumir com ele em silêncio é
    // pior que um 404 visível. Quem recusa é a gravação, na próxima edição (`menuTargetRefusal`).
    .filter(
      l => typeof l.label === 'string' && l.label.trim() !== '' && normalizeMenuHref(l.href) !== '',
    )
    .map((l): MenuLinkItem => ({
      kind: 'link',
      id: l.id,
      name: l.label.trim(),
      href: normalizeMenuHref(l.href),
      icon: menuIconKey(l.icon),
      sortOrder: l.sort_order ?? 0,
      external: menuHrefIsExternal(l.href),
    }))

  return [...entradas, ...atalhos].sort(byMenuOrder)
}

/** Quantas subcategorias cabem numa coluna do painel antes de começar a próxima. */
export const MENU_PANEL_COLUMN_SIZE = 8

/**
 * As filhas do painel, distribuídas em colunas — **calculado, nunca configurado** (`NAV-24`).
 *
 * Um campo "coluna" por filha seria um dono de layout que quebra no instante em que uma filha é
 * desmarcada: a coluna 2 fica com um buraco e ninguém é avisado. Aqui a única entrada é a ordem da
 * árvore, que já é a ordem da grade da home e do rodapé.
 *
 * Enche a primeira coluna antes de abrir a segunda — o mega menu se lê de cima para baixo e depois
 * para o lado, e distribuir "equilibrado" (5 e 4, por exemplo) faria a nona filha mudar a décima de
 * coluna sem nada ter mudado nela.
 *
 * `max` inválido (zero, negativo, fracionário) cai no padrão em vez de laçar para sempre: a
 * alternativa de um laço sem progresso é o header não renderizar nunca.
 */
export const menuPanelColumns = (
  children: readonly MenuCategory[],
  max: number = MENU_PANEL_COLUMN_SIZE,
): MenuCategory[][] => {
  const lista = children ?? []
  const porColuna = Number.isInteger(max) && max > 0 ? max : MENU_PANEL_COLUMN_SIZE

  const colunas: MenuCategory[][] = []
  for (let i = 0; i < lista.length; i += porColuna) colunas.push(lista.slice(i, i + porColuna))
  return colunas
}
