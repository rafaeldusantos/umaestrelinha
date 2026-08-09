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

import type { MenuPromo } from '@estrelinha/supabase/types'
import { categoryPath } from '../routes'

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
  show_in_menu: boolean
  menu_promo?: MenuPromo | null
  /** Da view `category_product_counts`, quando quem chama a tem. Alimenta o "12 pins" do card. */
  product_count?: number
}

/** Vagas na barra do topo. Além destas, "Crie o Seu" e "Sobre" são fixas no código. */
export const MENU_SLOT_LIMIT = 4

/** O card promocional já resolvido: destino existe, textos preenchidos, link pronto. */
export interface ResolvedPromo {
  badge: string | null
  title: string
  subtitle: string | null
  /** A URL canônica do destino: `/<slug>` na raiz, `/<pai>/<slug>` na filha (`AD-018`). */
  href: string
  /** `null` quando quem chamou não trouxe `product_count`. */
  productCount: number | null
}

/** Uma entrada da barra do topo, pronta para desenhar. */
export interface MenuEntry {
  id: string
  name: string
  slug: string
  /** A URL canônica da categoria: `/<slug>` na raiz, `/<pai>/<slug>` na filha (`AD-018`). */
  href: string
  /** `Bottons › Anime` — o admin precisa saber o que está pondo no menu. A loja mostra só `name`. */
  path: string
  /** Subcategorias ativas, ordenadas. Vazio ⇒ a entrada é link direto, não painel. */
  children: MenuCategory[]
  /** `null` quando não há promo, o jsonb é inválido, ou o destino sumiu/desativou. */
  promo: ResolvedPromo | null
}

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

/**
 * Valida o jsonb do card e resolve o destino — ou devolve `null`.
 *
 * `menu_promo.category_id` mora **dentro de jsonb**, onde não cabe FK: apagar a categoria de destino
 * não dispara `on delete set null`. Então a referência pendurada é um estado alcançável do banco, e a
 * única resposta possível é validar na leitura. Card que não resolve não renderiza — a alternativa é
 * um "Explorar →" que leva a 404.
 *
 * Destino **inativo** também devolve `null`: a policy `public read categories using (active = true)`
 * já o esconderia da cliente, e um card apontando para uma coleção invisível é pior que card nenhum.
 */
export const resolvePromo = (
  categories: readonly MenuCategory[],
  raw: unknown,
): ResolvedPromo | null => {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null

  const promo = raw as Partial<MenuPromo>
  if (typeof promo.category_id !== 'string' || promo.category_id.trim() === '') return null

  const target = categories.find(c => c.id === promo.category_id)
  if (!target || !target.active) return null

  const trimmed = (value: unknown) =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null

  return {
    badge: trimmed(promo.badge),
    // Título e texto vazios caem no que a categoria de destino já diz — o admin só escreve quando
    // quer divergir dela, e não é obrigado a repetir o nome para o card aparecer.
    title: trimmed(promo.title) ?? target.name,
    subtitle: trimmed(promo.subtitle) ?? trimmed(target.description),
    href: categoryHref(categories, target.id),
    productCount: typeof target.product_count === 'number' ? target.product_count : null,
  }
}

/**
 * As entradas da barra do topo.
 *
 * **Não trunca em `MENU_SLOT_LIMIT`.** Se o banco tem 5 marcadas — SQL na mão, migration, dois admins
 * — devolver 4 esconderia a quinta de todas as telas, inclusive da única onde ela poderia ser
 * desmarcada. Truncar em silêncio é como o `.slice(0, 4)` original se comportava: a tela parecia
 * certa e o dado estava errado. Quem impede a quinta é `canEnterMenu`, na entrada; aqui o retorno é
 * honesto e o contador do admin mostra "5 de 4".
 */
export const menuEntries = (categories: readonly MenuCategory[]): MenuEntry[] => {
  const visible = categories.filter(c => c.active)

  return visible
    .filter(c => c.show_in_menu)
    .sort(bySortOrder)
    .map(entry => ({
      id: entry.id,
      name: entry.name,
      slug: entry.slug,
      href: categoryHref(visible, entry.id),
      path: pathLabel(categories, entry.id),
      children: visible.filter(c => c.parent_id === entry.id).sort(bySortOrder),
      promo: resolvePromo(visible, entry.menu_promo),
    }))
}

/**
 * Quantas vagas estão tomadas.
 *
 * Conta **toda** categoria marcada, ativa ou não — a vaga fica reservada. `menuEntries` esconde a
 * inativa da loja, mas se ela não contasse aqui, reativá-la depois faria a barra ter 5 itens sem
 * ninguém ter ligado nada. A tela mostra a inativa marcada como "não aparece na loja", que é o
 * suficiente para o admin decidir.
 */
export const slotsUsed = (categories: readonly MenuCategory[]): number =>
  categories.filter(c => c.show_in_menu).length

/**
 * Por que esta categoria **não** pode entrar no menu — ou `null` quando pode.
 *
 * O limite é regra de domínio, não `disabled` de switch: o `disabled` some num teste, num atalho de
 * teclado ou numa chamada direta ao hook, e a barra ganha um quinto item que estoura em 1440px.
 *
 * Quem já está no menu devolve `null` — ligar o que está ligado é idempotente, e recusar aí faria a
 * tela acusar erro num clique que não muda nada.
 *
 * **Devolve `string | null` e não um `{ ok, reason }`** por um motivo do repositório, não de gosto:
 * `tsconfig.base.json` tem `strictNullChecks: false`, e nesse modo uma união discriminada por
 * literal booleano (`{ ok: true } | { ok: false; reason: string }`) **não estreita** — ler
 * `verdict.reason` no ramo do `else` é erro de compilação. O formato atual não tem ramo para
 * esquecer: ou há motivo, ou não há.
 */
export const menuSlotRefusal = (
  categories: readonly MenuCategory[],
  categoryId: string,
): string | null => {
  const category = categories.find(c => c.id === categoryId)
  if (!category) return 'Categoria não encontrada.'
  if (category.show_in_menu) return null

  if (slotsUsed(categories) >= MENU_SLOT_LIMIT) {
    return `A barra do topo tem ${MENU_SLOT_LIMIT} vagas e todas estão ocupadas. Desligue uma antes de ligar esta.`
  }
  return null
}
