// A trilha de uma categoria até a raiz — "Anime · Naruto".
//
// A busca mostra sob o nome do produto de onde ele vem (board "Mobile Search Open - v3"), e com
// categorias hierárquicas (`parent_id`) o nome sozinho não diz nada: "Naruto" e "Villains" podem
// estar em ramos diferentes. A trilha é o que distingue.
//
// A subida da cadeia de pais **não vive mais aqui**: é `ancestorsOf` / `pathLabel` de
// `@nanapin/core/menu` (feature 16). Havia três cópias da mesma caminhada nos dois apps — esta, o
// `categoryPath` do formulário de produto e a que o menu precisava — cada uma com o seu limite de
// profundidade (8, 5, 4) e a sua guarda de ciclo. Três implementações da mesma regra é onde a
// divergência nasce. O que sobra aqui é só o formato que a busca da loja usa.

import { ancestorsOf, pathLabel } from '@nanapin/core/menu'
import type { Category } from '@nanapin/supabase/types'

/**
 * A categoria pode não estar em `categories` — a busca chama com o resultado de uma consulta
 * filtrada, e `ancestorsOf` precisa dela no mapa para achar o `parent_id`. Sem isto, a trilha de uma
 * categoria fora da lista voltaria vazia em vez de voltar o próprio nome.
 */
const withSelf = (
  category: Category,
  categories: readonly Category[] | undefined,
): readonly Category[] => {
  const pool = categories ?? []
  return pool.some((c) => c.id === category.id) ? pool : [...pool, category]
}

/** Do ancestral mais alto até a própria categoria. Lista vazia se `category` for nula. */
export const categoryTrail = (
  category: Category | null | undefined,
  categories: readonly Category[] | undefined,
): Category[] => {
  if (!category) return []
  const pool = withSelf(category, categories)
  return [...(ancestorsOf(pool, category.id) as Category[]), category]
}

/** A trilha como texto — `Anime · Naruto`. String vazia quando não há categoria. */
export const categoryTrailLabel = (
  category: Category | null | undefined,
  categories: readonly Category[] | undefined,
): string => {
  if (!category) return ''
  return pathLabel(withSelf(category, categories), category.id, ' · ')
}
