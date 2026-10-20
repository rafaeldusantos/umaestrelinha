import {
  resolveCategoryRoute as resolveCategoryRouteDeCore,
  type CategoryRoute as CategoryRouteDeCore,
  type CategoryRouteInput,
} from '@estrelinha/core/page'
import type { Category } from '@estrelinha/supabase/types'

/**
 * A regra subiu para `@estrelinha/core/page` na feature 69 (`AD-033`): a página servida pela função
 * da Vercel e a `CategoryPage` decidem a mesma URL, e duas escritas divergiriam sem nada quebrar.
 * Este arquivo só fixa o tipo da loja (`Category`) e reexporta — nenhuma regra mora aqui.
 *
 * A loja não passa `inactiveFallback`: a RPC `category_fallback` não é chamada do navegador
 * (`design.md` da 69, *Risks*). Categoria inativa continua `notfound` no cliente.
 */
export type CategoryRoute = CategoryRouteDeCore<Category>

export const resolveCategoryRoute: (input: CategoryRouteInput<Category>) => CategoryRoute =
  resolveCategoryRouteDeCore
