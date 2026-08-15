import { bySortOrder, categoryHref, type MenuCategory } from '@estrelinha/core/menu'

/** Uma vaga de banner da home, já resolvida em imagem + destino. */
export interface HomeBanner {
  id: string
  name: string
  bannerUrl: string
  href: string
}

/** A grade tem três vagas: uma grande e duas empilhadas ao lado (board `7CF-0`). */
export const HOME_BANNER_SLOTS = 3

type Candidate = MenuCategory & { active?: boolean; banner_url?: string | null }

/**
 * Quais categorias ocupam a grade de banners da home.
 *
 * **A curadoria é a imagem, não uma coluna nova.** Quem sobe um `banner_url` em `/admin/categorias`
 * está dizendo "esta linha merece vitrine"; quem não sobe, não aparece. Foi a mesma decisão do menu
 * — `show_in_menu` + `sort_order`, sem inventar `menu_order` — e pelo mesmo motivo: dois donos do
 * mesmo dado é o "defeito 01" do projeto.
 *
 * Categoria inativa nunca entra, mesmo com banner: a página de destino responderia 404.
 *
 * **`exclude` evita a página mostrar o mesmo banner duas vezes.** As fileiras de coleção também
 * abrem com o banner da categoria (board `7CF-0`, seção "Decorativos Afetivos"), e conteúdo tem
 * prioridade sobre campanha: quem já é fileira sai da grade, não o contrário. Com a grade vazia ela
 * some inteira, que é o comportamento certo — melhor faltar o bloco de campanha do que repetir a
 * mesma arte a duas dobras de distância.
 *
 * Não trunca em silêncio além das vagas — devolve no máximo `HOME_BANNER_SLOTS` porque a grade tem
 * três lugares e o quarto banner não teria onde ser desenhado.
 */
export function pickHomeBanners(
  categories: readonly Candidate[] | undefined,
  { limit = HOME_BANNER_SLOTS, exclude = [] }: { limit?: number; exclude?: readonly string[] } = {},
): HomeBanner[] {
  if (!categories?.length) return []

  const fora = new Set(exclude)

  return [...categories]
    .filter((c) => c.active !== false && !!c.banner_url?.trim() && !fora.has(c.id))
    .sort(bySortOrder)
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      name: c.name,
      bannerUrl: c.banner_url!.trim(),
      href: categoryHref(categories, c.id),
    }))
}
