// A derivação da Home — **a regra que decide o que aparece quando ninguém escolheu nada**.
//
// As três funções abaixo vinham de `apps/store` (`widgets/home-collections/model`,
// `widgets/home-banners/model` e `features/search/lib`), e foram **movidas** para cá pela T35 da
// feature 24. O motivo é medido, não estético: o backoffice não importa de `apps/store`, então a
// Fase 4 precisou **reescrevê-las** dentro de `useAdminResolvedHome` — mesmos filtros, mesma
// ordenação, mesmo `slice`, em ~40 linhas paralelas. É o "defeito 01" do projeto instalado no lugar
// mais caro possível: o trabalho do painel é **dizer a verdade sobre o que a loja desenha**, e duas
// cópias divergentes fariam o painel prometer uma seção que a Home não renderiza — que é justamente
// o que esta feature existe para eliminar. A deriva já havia começado: a cópia do painel usava
// `limit ?? 4` literal onde a loja usava `HOME_COLLECTION_ROWS`.
//
// Nada aqui foi reescrito. O que mudou no movimento foi só o que a mudança de camada obrigou:
// `pickTrendingCategories` deixou de anotar `Category` de `@estrelinha/supabase/types` (que `core`
// não pode importar) e passou a ser genérica sobre o que recebe — quem chama continua recebendo de
// volta o próprio tipo, sem `as`.

import { bySortOrder, categoryHref, type MenuCategory } from '../menu'

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

type CollectionCandidate = MenuCategory & { banner_url?: string | null }

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
  categories: readonly CollectionCandidate[] | undefined,
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

/** Uma vaga de banner da home, já resolvida em imagem + destino. */
export interface HomeBanner {
  id: string
  name: string
  bannerUrl: string
  href: string
}

/** A grade tem três vagas: uma grande e duas empilhadas ao lado (board `7CF-0`). */
export const HOME_BANNER_SLOTS = 3

type BannerCandidate = MenuCategory & { active?: boolean; banner_url?: string | null }

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
  categories: readonly BannerCandidate[] | undefined,
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

// As coleções que viram pílula em "Em alta agora" (board "Mobile Search Open - v3").
//
// A regra é **folha da árvore**, não raiz. Parece contra-intuitivo até olhar o catálogo real: a
// árvore da loja tem uma raiz guarda-chuva e todas as coleções de verdade pendem dela. Filtrar por
// `parent_id === null` mostrava uma pílula só, escrita com o nome do guarda-chuva.
//
// Folha também é o que a cliente procura: ninguém busca a categoria que contém tudo, busca o tema.
// Numa árvore plana (nenhuma categoria com filhos) toda categoria é folha, e a função devolve todas
// — então o desenho não depende de a loja ter hierarquia.
//
// **Genérica sobre o que recebe**, e não anotada com o tipo do banco: `core` não importa
// `@estrelinha/supabase`, e devolver o próprio tipo de entrada é o que faz a loja continuar
// recebendo `Category[]` sem um `as` na chamada.
export const pickTrendingCategories = <T extends { id: string; parent_id: string | null }>(
  categories: readonly T[] | undefined,
  limit: number,
): T[] => {
  const list = categories ?? []
  const parents = new Set(list.map((c) => c.parent_id).filter(Boolean))
  const leaves = list.filter((c) => !parents.has(c.id))
  // A ordem que chega já é `sort_order` — a ordem editorial da loja, que é quem decide o que está
  // "em alta". Sem folha nenhuma (árvore cíclica), cai na lista inteira em vez de mostrar vazio.
  return (leaves.length > 0 ? leaves : list).slice(0, limit)
}
