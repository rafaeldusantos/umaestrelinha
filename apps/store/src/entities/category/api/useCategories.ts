import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { Category } from '@estrelinha/supabase/types'

/**
 * Uma linha crua de `categories`. O `select('*')` não é tipado pelo supabase-js, então a forma é
 * afirmada aqui — e cada campo passa por um default explícito no mapper abaixo.
 *
 * **`emoji` saiu, e a lição é a do `AD-012`**: o campo estava declarado aqui e o mapper fazia
 * `row.emoji ?? ''` desde sempre, mas **nenhuma migration cria essa coluna**. O tipo era uma
 * afirmação, não uma verificação: o `select('*')` nunca trazia o campo, o mapper devolvia `''`, e o
 * `{cat.emoji && …}` da busca nunca renderizava nada. Terceira ocorrência do mesmo padrão (as duas
 * primeiras foram `DbCategory` e `DbAbandonedCart`), e ela sai no arquivo que a feature já toca.
 *
 * **`show_in_menu` e `menu_promo` também saíram** (feature 39). A primeira virou **coluna gerada**
 * (`menu_desktop or menu_mobile`) e a segunda é legado não lido: quem responde "esta categoria está
 * no menu?" é `menuItems(…, surface)`, porque a resposta depende do dispositivo. Ler a derivada aqui
 * daria uma resposta só para uma pergunta que tem duas — e `menuSurfaceSingleOwner.test.ts` recusa.
 */
interface CategoryRow {
  id: string
  name: string
  slug: string
  description?: string | null
  image_url?: string | null
  banner_url?: string | null
  color_accent?: string | null
  icon?: string | null
  parent_id?: string | null
  sort_order?: number | null
  active?: boolean | null
  menu_desktop?: boolean | null
  menu_mobile?: boolean | null
  menu_banners?: unknown
}

/**
 * O mapper único da categoria na loja.
 *
 * `active` entra na feature 16, `menu_desktop`/`menu_mobile` na 39, e os defaults conservadores
 * apontam em direções **opostas** de propósito:
 *
 * - `active` cai em `true` quando ausente. A policy `public read categories using (active = true)`
 *   já filtrou o que a cliente pode ver, então uma coluna que não veio não deve esconder a categoria
 *   — sumir da vitrine é pior que aparecer.
 * - as duas do menu caem em `false`. Aqui o conservador é o contrário: um default `true` colocaria
 *   **toda** categoria na barra do topo, que é literalmente o bug que a 16 consertou.
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
  // A chave do ícone do menu (feature 39). Quem a valida é `menuIconKey`, na hora de desenhar:
  // valor fora do catálogo degrada para "sem ícone" em vez de quebrar a barra (`NAV-19`).
  icon: row.icon ?? null,
  parent_id: row.parent_id ?? null,
  // PST-06: é o primeiro critério da categoria de exibição. Ausente vira 0 e o desempate cai
  // na `position` do vínculo — nunca em `NaN`, que reordenaria de forma imprevisível.
  sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
  active: row.active ?? true,
  menu_desktop: row.menu_desktop === true,
  menu_mobile: row.menu_mobile === true,
  // Jsonb cru, entregue como veio: quem valida campo a campo é `resolveMenuBanners`, que é o único
  // lugar do projeto que sabe a forma do banner. Validar aqui seria o segundo dono dela.
  menu_banners: row.menu_banners ?? null,
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
