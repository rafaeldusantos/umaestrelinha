import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { Category, MenuPromo } from '@estrelinha/supabase/types'

/**
 * Uma linha crua de `categories`. O `select('*')` não é tipado pelo supabase-js, então a forma é
 * afirmada aqui — e cada campo passa por um default explícito no mapper abaixo.
 */
interface CategoryRow {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  banner_url?: string | null
  color_accent?: string | null
  emoji?: string | null
  parent_id?: string | null
  sort_order?: number | null
  active?: boolean | null
  show_in_menu?: boolean | null
  menu_promo?: MenuPromo | null
}

/**
 * O mapper único da categoria na loja.
 *
 * `active`, `show_in_menu` e `menu_promo` entram na feature 16. Os dois primeiros com default
 * conservador em direções **opostas**, e isso é de propósito:
 *
 * - `active` cai em `true` quando ausente. A policy `public read categories using (active = true)`
 *   já filtrou o que a cliente pode ver, então uma coluna que não veio não deve esconder a categoria
 *   — sumir da vitrine é pior que aparecer.
 * - `show_in_menu` cai em `false`. Aqui o conservador é o contrário: um default `true` colocaria
 *   **toda** categoria na barra do topo, que é literalmente o bug que a 16 conserta.
 */
const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  image_url: row.image_url ?? null,
  // A grade de banners da home lê daqui (`pickHomeBanners`). Ausente é "sem vitrine", nunca `''`:
  // string vazia passaria pelo `!!` de quem filtra e renderizaria um `<img>` quebrado.
  banner_url: row.banner_url ?? null,
  color_accent: row.color_accent ?? null,
  emoji: row.emoji ?? '',
  parent_id: row.parent_id ?? null,
  // PST-06: é o primeiro critério da categoria de exibição. Ausente vira 0 e o desempate cai
  // na `position` do vínculo — nunca em `NaN`, que reordenaria de forma imprevisível.
  sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
  active: row.active ?? true,
  show_in_menu: row.show_in_menu === true,
  menu_promo: row.menu_promo ?? null,
})

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order')
      if (error || !data) return []
      return (data as unknown as CategoryRow[]).map(mapCategory)
    },
  })

export const useCategoryBySlug = (slug: string) =>
  useQuery({
    queryKey: ['category', slug],
    queryFn: async (): Promise<Category | null> => {
      const { data, error } = await supabase.from('categories').select('*').eq('slug', slug).single()
      if (error || !data) return null
      return mapCategory(data as unknown as CategoryRow)
    },
    enabled: !!slug,
  })
