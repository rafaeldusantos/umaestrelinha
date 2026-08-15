import { bySortOrder, categoryHref, type MenuCategory } from '@estrelinha/core/menu'

/** Uma fileira de coleção da home, já resolvida em título, destino e banner. */
export interface HomeCollection {
  id: string
  name: string
  slug: string
  description: string | null
  href: string
  /** Quando presente, a fileira abre com o card de banner e mostra um produto a menos. */
  bannerUrl: string | null
}

/** Quantas fileiras a home mostra — quatro, como no board `7CF-0`. */
export const HOME_COLLECTION_ROWS = 4

type Candidate = MenuCategory & { banner_url?: string | null }

/**
 * Quais coleções viram fileira de produto na home.
 *
 * **Só RAIZ.** Uma subcategoria ao lado do contêiner que a agrupa mostraria os mesmos produtos duas
 * vezes na mesma página — `useProducts(slug)` faz roll-up da descendência, então a fileira do pai já
 * contém a da filha. É o mesmo motivo pelo qual `browseCategories` pula o guarda-chuva, com o sinal
 * trocado: lá o problema era o contêiner sozinho, aqui é o contêiner e a filha juntos.
 *
 * **A ordem é a `sort_order` que já existe**, a mesma que ordena o menu e a grade de coleções. Sem
 * coluna `home_order`: dois donos do mesmo dado é o "defeito 01" do projeto, e reordenar a home
 * passa a ser arrastar categoria em `/admin/categorias` — que é onde a dona já reordena.
 *
 * Categoria inativa nunca entra: a fileira levaria a uma página 404.
 */
export function pickHomeCollections(
  categories: readonly Candidate[] | undefined,
  limit = HOME_COLLECTION_ROWS,
): HomeCollection[] {
  if (!categories?.length) return []

  return [...categories]
    .filter((c) => c.active && c.parent_id === null)
    .sort(bySortOrder)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description?.trim() || null,
      href: categoryHref(categories, c.id),
      bannerUrl: c.banner_url?.trim() || null,
    }))
}
