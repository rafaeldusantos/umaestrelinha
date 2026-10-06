// Qual das N categorias REPRESENTA o produto (PST-06 AC 3) — a regra, num dono só.
//
// Com `product_categories` (N:N) um produto está em várias categorias ao mesmo tempo, mas o selo do
// card, o breadcrumb e o `item_category` do GA4 têm espaço para **uma**. A regra é
// `menor categories.sort_order`, desempate por `product_categories.position`, e empate nos dois
// cai no `category_id` — para o resultado ser determinístico em qualquer caso.
//
// ## Por que aqui, e não em `apps/store/src/entities/product`
//
// A regra tem consumidores em DOIS lugares que não se enxergam: a loja (selo, breadcrumb e os
// eventos do navegador) e a edge function `mercado-pago` (o `purchase` do servidor, feature 61).
// Escrita duas vezes, ela divergiu na primeira entrega da 61 — a loja mandava o slug da coluna
// LEGADA `products.category_id`, nula nos 691 produtos, e o servidor mandava o NOME pela régua
// certa. O GA4 recebia duas categorias diferentes para a mesma peça. `medicaoComDonoUnico.test.ts`
// recusa uma segunda declaração da ordenação em `apps/**` e `supabase/functions/**`.
//
// ## Por que um arquivo próprio, e não o barrel `core/product`
//
// O barrel importa `@estrelinha/supabase/types`, e o Deno não resolve alias nenhum — nem no grafo de
// TIPOS, que ele resolve antes da primeira linha rodar. Este arquivo **não importa nada**, então a
// function o alcança por caminho relativo. `__tests__/displayCategory.test.ts` guarda isso.

/** O mínimo que uma categoria precisa ter para concorrer. */
export interface DisplayCategoryRank {
  sort_order: number
}

/** Um vínculo `product_categories`, com a categoria resolvida — ou `null` quando não resolveu. */
export interface DisplayCategoryLink<C extends DisplayCategoryRank = DisplayCategoryRank> {
  category_id: string
  position: number
  category?: C | null
}

/** Número que não é número concorre como 0 — a linha torta não derruba a escolha. */
const ordem = (valor: unknown): number => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : 0
}

/**
 * A categoria de exibição entre os vínculos, ou `null` quando nenhum vínculo resolveu categoria.
 *
 * Genérica de propósito: a loja passa a `Category` inteira (o selo precisa do nome e do slug), o
 * servidor passa o recorte embutido do PostgREST. Quem escolhe é sempre esta função.
 */
export const pickDisplayCategory = <C extends DisplayCategoryRank>(
  links: readonly DisplayCategoryLink<C>[] | null | undefined,
): C | null => {
  const candidatos = (links ?? []).filter(
    (link): link is DisplayCategoryLink<C> & { category: C } => !!link && !!link.category,
  )
  if (candidatos.length === 0) return null
  const [escolhido] = [...candidatos].sort(
    (a, b) =>
      ordem(a.category.sort_order) - ordem(b.category.sort_order) ||
      ordem(a.position) - ordem(b.position) ||
      String(a.category_id).localeCompare(String(b.category_id)),
  )
  return escolhido.category
}

/** A categoria embutida que o slug precisa. */
export interface DisplayCategorySlugSource extends DisplayCategoryRank {
  slug?: string | null
}

/**
 * O **slug** da categoria de exibição — o `item_category` do GA4, nos DOIS lados (feature 61).
 *
 * Slug, e não nome: a vitrine enxuta (`PRODUCT_CARD_SELECT`) não traz o nome, e o slug é o
 * identificador estável — renomear uma coleção no painel não parte a série histórica do relatório.
 */
export const displayCategorySlug = (
  links: readonly DisplayCategoryLink<DisplayCategorySlugSource>[] | null | undefined,
): string | null => {
  const slug = pickDisplayCategory(links)?.slug
  return typeof slug === 'string' && slug.trim() !== '' ? slug.trim() : null
}

/**
 * A categoria embutida num vínculo cru do PostgREST (`product_categories(…, categories(slug,
 * sort_order, active))`). `undefined` quando o `select` não pediu o embed; `null` quando pediu e ele
 * não resolveu. Só `slug` e `sort_order` atravessam — é o que a escolha e o slug leem.
 *
 * **Categoria inativa é `null`, e é isso que mantém as duas pontas iguais.** A loja lê com a chave
 * publicável, e a RLS (`active = true`) já devolve o embed nulo para a inativa; o servidor lê com
 * service role e a receberia inteira. Sem este recorte, um produto cuja menor `sort_order` está numa
 * coleção desligada teria uma categoria no navegador e outra na compra. `active` ausente conta como
 * ativa — um `select` que não pediu a coluna não esconde nada.
 */
export const embeddedDisplayCategory = (
  raw: unknown,
): { slug: string; sort_order: number } | null | undefined => {
  if (raw === undefined) return undefined
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null
  const c = raw as Record<string, unknown>
  if (typeof c.slug !== 'string' || c.slug.trim() === '') return null
  if (c.active === false) return null
  return { slug: c.slug, sort_order: ordem(c.sort_order) }
}

/**
 * Os vínculos crus do PostgREST, prontos para a escolha. É o que o servidor chama; a loja passa
 * pelo mesmo `embeddedDisplayCategory` dentro de `normalizeCategoryLinks`.
 */
export const displayCategoryLinksFromRows = (
  raw: unknown,
): DisplayCategoryLink<{ slug: string; sort_order: number }>[] => {
  if (!Array.isArray(raw)) return []
  const out: DisplayCategoryLink<{ slug: string; sort_order: number }>[] = []
  raw.forEach((entry, index) => {
    if (entry === null || typeof entry !== 'object') return
    const link = entry as Record<string, unknown>
    if (typeof link.category_id !== 'string' || link.category_id === '') return
    out.push({
      category_id: link.category_id,
      position:
        typeof link.position === 'number' && Number.isFinite(link.position) ? link.position : index,
      category: embeddedDisplayCategory(link.categories) ?? null,
    })
  })
  return out
}
