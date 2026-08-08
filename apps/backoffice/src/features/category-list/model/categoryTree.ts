// RFN-09 / T54 — o domínio da árvore de categorias.
//
// Tudo aqui é função pura sobre a lista achatada que veio do banco. A tabela só desenha o que estas
// funções decidem: quem é filha de quem, quantos produtos a linha representa, o que a busca mantém
// visível, o que a seleção arrasta junto e o que o arraste grava.

import { bySortOrder } from '@nanapin/core/menu'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

export type CategoryView = 'todas' | 'vitrine' | 'ocultas' | 'sem-produto'

export interface CategoryRow {
  category: AdminCategory
  /** 0 = raiz. */
  depth: number
  /** Produtos vinculados a ESTA categoria. */
  ownCount: number
  /** Própria + das filhas — é o número que a linha do pai mostra. */
  totalCount: number
  childCount: number
  /** Desenha `└` em vez de `├` no conector. */
  isLastChild: boolean
}

export interface CategoryFilters {
  search: string
  view: CategoryView
}

/** Sem acento e sem caixa — "Filmes & Séries" tem que casar com "series". */
const fold = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// `bySortOrder` mudou de casa para `@nanapin/core/menu` na feature 16: a loja passou a precisar da
// MESMA ordenação (é ela que impede uma filha empatada em `sort_order` de subir ao topo da barra), e
// duas cópias da regra de ordem em dois apps é a divergência que a feature existe para fechar.

/**
 * Achata a árvore na ordem em que a tabela desenha: raiz, filhas da raiz, próxima raiz.
 *
 * **Órfã e ciclo viram raiz.** Uma categoria cujo `parent_id` aponta para quem não existe (ou para
 * um ancestral, formando ciclo) não pertence a nenhuma raiz — agrupar ingenuamente por `parent_id`
 * a faria **sumir da tela**, e a única tela onde dá para consertar o `parent_id` é esta. Some da
 * tela é o pior resultado possível: o admin não vê o problema nem tem como corrigi-lo. Então ela
 * aparece como raiz, editável.
 *
 * **E pelo mesmo motivo a descida é recursiva, não de dois níveis.** A versão anterior desenhava a
 * raiz e as filhas dela e parava: uma NETA ficava no mapa e nunca virava linha — sumia da tela sem
 * erro, sem aviso e sem lugar onde consertar. Não era hipótese, era alcançável pelo próprio campo
 * "Categoria pai" do inspetor, que sempre ofereceu subcategorias como pai.
 */
export const buildCategoryTree = (categories: AdminCategory[]): CategoryRow[] => {
  const byId = new Map(categories.map(c => [c.id, c]))
  const childrenOf = new Map<string, AdminCategory[]>()

  /** Sobe a cadeia de pais: só é filha de verdade quem chega numa raiz sem repetir ninguém. */
  const rootsToATrueRoot = (category: AdminCategory): boolean => {
    const seen = new Set<string>([category.id])
    let current = category
    while (current.parent_id) {
      if (seen.has(current.parent_id)) return false // ciclo
      const parent = byId.get(current.parent_id)
      if (!parent) return false // pai inexistente
      seen.add(parent.id)
      current = parent
    }
    return true
  }

  const roots: AdminCategory[] = []
  for (const category of categories) {
    if (category.parent_id && rootsToATrueRoot(category)) {
      const siblings = childrenOf.get(category.parent_id) ?? []
      siblings.push(category)
      childrenOf.set(category.parent_id, siblings)
    } else {
      roots.push(category)
    }
  }

  const ownCountOf = (category: AdminCategory) => category.product_count ?? 0

  /** Própria + de TODA a descendência. Só a filha direta deixaria a neta fora da conta do avô. */
  const totalCountOf = (category: AdminCategory): number =>
    ownCountOf(category) +
    (childrenOf.get(category.id) ?? []).reduce((sum, child) => sum + totalCountOf(child), 0)

  const rows: CategoryRow[] = []

  // Recursão sem guarda de profundidade de propósito: quem entra em `childrenOf` provou ter cadeia
  // até uma raiz de verdade (`rootsToATrueRoot`), então o que se percorre aqui é floresta, não grafo.
  const walk = (category: AdminCategory, depth: number, isLastChild: boolean) => {
    const children = [...(childrenOf.get(category.id) ?? [])].sort(bySortOrder)
    rows.push({
      category,
      depth,
      ownCount: ownCountOf(category),
      totalCount: totalCountOf(category),
      childCount: children.length,
      isLastChild,
    })
    children.forEach((child, index) => walk(child, depth + 1, index === children.length - 1))
  }

  for (const root of [...roots].sort(bySortOrder)) walk(root, 0, false)
  return rows
}

/**
 * O pai da linha **como a árvore o desenhou** — `null` na raiz.
 *
 * Não é o mesmo que `category.parent_id`: a órfã e a do ciclo aparecem como raiz com o `parent_id`
 * quebrado intacto (é o dado que o admin veio consertar). Ler o campo cru aqui faria as varreduras
 * abaixo pendurarem essas linhas num pai que não existe na tela.
 */
const drawnParentOf = (row: CategoryRow): string | null =>
  row.depth > 0 ? row.category.parent_id ?? null : null

const matchesView = (row: CategoryRow, view: CategoryView): boolean => {
  if (view === 'vitrine') return row.category.active === true
  if (view === 'ocultas') return row.category.active !== true
  if (view === 'sem-produto') return row.totalCount === 0
  return true
}

const matchesSearch = (row: CategoryRow, search: string): boolean => {
  const term = fold(search.trim())
  if (!term) return true
  return fold(row.category.name).includes(term) || fold(row.category.slug).includes(term)
}

/**
 * Filtra mantendo a árvore legível.
 *
 * **O pai de uma filha que casa continua visível**, mesmo sem casar ele próprio — senão a filha
 * apareceria indentada, com conector, pendurada em nada. E quando o **pai** casa, as filhas ficam:
 * quem busca "Anime" quer o ramo, não só o rótulo.
 *
 * As duas regras valem para a **cadeia inteira**, não para um nível: com a neta casando, o avô
 * precisa ficar junto da mãe, ou a mãe é que fica pendurada em nada.
 */
export const filterCategoryRows = (
  rows: CategoryRow[],
  { search, view }: CategoryFilters,
): CategoryRow[] => {
  const passes = new Map(rows.map(row => [row.category.id, matchesSearch(row, search) && matchesView(row, view)]))

  // As linhas vêm em pré-ordem — pai sempre antes da filha. Descer o "o ramo do que casou fica" é
  // uma passada para frente; subir o "os ancestrais de quem casou ficam" é a mesma passada ao
  // contrário. Duas varreduras, nenhuma busca de cadeia por linha.
  const underMatch = new Set<string>()
  for (const row of rows) {
    const parent = drawnParentOf(row)
    if (parent && (passes.get(parent) || underMatch.has(parent))) underMatch.add(row.category.id)
  }

  const overMatch = new Set<string>()
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]
    const parent = drawnParentOf(row)
    if (parent && (passes.get(row.category.id) || overMatch.has(row.category.id))) overMatch.add(parent)
  }

  return rows.filter(row =>
    passes.get(row.category.id) || underMatch.has(row.category.id) || overMatch.has(row.category.id),
  )
}

/**
 * Marcar um pai marca as filhas.
 *
 * É a regra que a barra de massa anuncia ("as subcategorias acompanham a ação") — e ela precisa ser
 * verdade no conjunto que vai para o `update`, não só no texto.
 *
 * A pré-ordem faz a cascata ser transitiva de graça: quando a linha da neta é lida, a mãe já entrou
 * no conjunto pela mesma varredura.
 */
export const cascadeSelection = (selectedIds: string[], rows: CategoryRow[]): string[] => {
  const selected = new Set(selectedIds)
  for (const row of rows) {
    const parent = drawnParentOf(row)
    if (parent && selected.has(parent)) selected.add(row.category.id)
  }
  return [...selected]
}

export interface DeletionImpact {
  /** Quantas categorias somem (já com as filhas que a seleção arrastou). */
  categories: number
  /** Quantas dessas são subcategorias. */
  subcategories: number
  /** Vínculos produto↔categoria que serão removidos. */
  productLinks: number
  /** Cada categoria com a própria contagem, para a lista prévia. */
  rows: CategoryRow[]
}

/**
 * O estrago que o `Excluir` vai causar, para poder ser dito ANTES.
 *
 * `productLinks` é a soma das contagens próprias — **não** o número de produtos distintos. Um botton
 * marcado em "Anime" e "Sailor Moon" conta duas vezes quando as duas são excluídas, e isso é comum
 * (o formulário de produto marca pai e filha). Contar produtos distintos exigiria um
 * `count(distinct product_id)` que o PostgREST não expressa. Por isso o rótulo na tela fala em
 * **vínculos**, e a lista prévia mostra a contagem de cada categoria: o número agregado nunca é
 * apresentado como "produtos afetados".
 */
export const deletionImpact = (rows: CategoryRow[], ids: string[]): DeletionImpact => {
  const target = new Set(ids)
  const affected = rows.filter(row => target.has(row.category.id))

  return {
    categories: affected.length,
    subcategories: affected.filter(row => row.depth > 0).length,
    productLinks: affected.reduce((sum, row) => sum + row.ownCount, 0),
    rows: affected,
  }
}

/**
 * Quem pode ser pai desta categoria.
 *
 * Fora da lista: **ela própria** (o banco recusa, via `categories_parent_not_self`, mas oferecer a
 * opção para o erro voltar do servidor é desenho ruim) e **as descendentes dela** — escolher a
 * própria filha como pai criaria um ciclo, e um ciclo some da árvore de todo mundo.
 *
 * `null` no `categoryId` é o caso "categoria nova": tudo é elegível.
 */
export const eligibleParents = (
  categories: AdminCategory[],
  categoryId: string | null,
): AdminCategory[] => {
  if (!categoryId) return [...categories].sort(bySortOrder)

  const descendants = new Set<string>([categoryId])
  // Varre até estabilizar: a lista não está ordenada por profundidade, então uma passada só
  // perderia a neta que aparece antes da filha.
  let grew = true
  while (grew) {
    grew = false
    for (const category of categories) {
      if (category.parent_id && descendants.has(category.parent_id) && !descendants.has(category.id)) {
        descendants.add(category.id)
        grew = true
      }
    }
  }

  return categories.filter(c => !descendants.has(c.id)).sort(bySortOrder)
}

/** Uma linha do que o `Mover para…` vai gravar. */
export interface CategoryMove {
  id: string
  parent_id: string | null
  sort_order: number
}

/** O recorte da seleção que o diálogo de mover precisa explicar antes de gravar. */
export interface MoveSelection {
  /** As que recebem `parent_id` novo — as selecionadas mais ao topo. */
  moving: CategoryRow[]
  /** As que vão junto por estarem dentro de uma que se move. Não recebem update. */
  carried: CategoryRow[]
}

/**
 * Quem de fato muda de pai numa mudança em massa.
 *
 * A seleção chega aqui já cascateada (`cascadeSelection`), e reescrever `parent_id` de **todas**
 * achataria a árvore: mover "Anime" arrastando "Sailor Moon" junto não pode transformar a filha em
 * irmã dela. Só as selecionadas mais ao topo recebem pai novo; a descendência é **carregada** pelo
 * movimento e continua pendurada exatamente onde estava.
 *
 * A pré-ordem de novo: um pai já marcado como coberto quando a filha é lida.
 */
export const moveSelection = (rows: CategoryRow[], selectedIds: string[]): MoveSelection => {
  const selected = new Set(selectedIds)
  const covered = new Set<string>()
  const moving: CategoryRow[] = []
  const carried: CategoryRow[] = []

  for (const row of rows) {
    const parent = drawnParentOf(row)
    if (parent && covered.has(parent)) {
      covered.add(row.category.id)
      if (selected.has(row.category.id)) carried.push(row)
      continue
    }
    if (selected.has(row.category.id)) {
      moving.push(row)
      covered.add(row.category.id)
    }
  }

  return { moving, carried }
}

/**
 * Para onde a seleção pode ir — na ordem e na profundidade em que a árvore desenha, para o seletor
 * poder mostrar o destino como árvore em vez de lista chapada.
 *
 * Fora da lista: **as próprias que se movem** e **a descendência delas**. Escolher a própria filha
 * como destino criaria ciclo, e um ciclo tira o ramo inteiro da árvore de todo mundo. A raiz não
 * aparece aqui — é opção fixa do seletor, com `null` no lugar do id.
 */
export const moveDestinations = (rows: CategoryRow[], movingIds: string[]): CategoryRow[] => {
  const blocked = new Set(movingIds)
  const allowed: CategoryRow[] = []

  for (const row of rows) {
    const parent = drawnParentOf(row)
    if (parent && blocked.has(parent)) {
      blocked.add(row.category.id)
      continue
    }
    if (!blocked.has(row.category.id)) allowed.push(row)
  }

  return allowed
}

/**
 * O que o `Mover para…` grava.
 *
 * Devolve **só as que realmente mudam de pai** — quem já está no destino não é reescrita — e dá a
 * cada uma uma `sort_order` **depois da última irmã que já mora lá**. Sem isso, três raízes com
 * `sort_order` 1, 2 e 3 caem em cima das filhas existentes e a ordem no destino vira desempate por
 * nome: o admin move e a árvore se embaralha sozinha.
 *
 * Destino inválido devolve lista vazia em vez de gravar. O seletor já não oferece esses destinos —
 * isto é a segunda tranca, porque o preço de errar é o ramo sumir da tela.
 */
export const planMove = (
  categories: AdminCategory[],
  rows: CategoryRow[],
  selectedIds: string[],
  destinationId: string | null,
): CategoryMove[] => {
  const { moving } = moveSelection(rows, selectedIds)
  if (moving.length === 0) return []

  const movingIds = moving.map(row => row.category.id)
  if (destinationId !== null) {
    const allowed = moveDestinations(rows, movingIds)
    if (!allowed.some(row => row.category.id === destinationId)) return []
  }

  const inTheWay = new Set(movingIds)
  let nextOrder = categories
    .filter(c => (c.parent_id ?? null) === destinationId && !inTheWay.has(c.id))
    .reduce((max, c) => Math.max(max, c.sort_order ?? 0), 0)

  return moving
    .filter(row => (row.category.parent_id ?? null) !== destinationId)
    .map(row => {
      nextOrder += 1
      return { id: row.category.id, parent_id: destinationId, sort_order: nextOrder }
    })
}

/**
 * O que o arraste grava.
 *
 * Devolve **só as linhas que mudaram de posição** — arrastar a primeira para a segunda não pode
 * reescrever `sort_order` da lista inteira. Devolve `null` quando origem e destino têm pais
 * diferentes: mudar de pai é o campo "Categoria pai" do inspetor, não um efeito colateral de soltar
 * a linha no lugar errado.
 */
export const reorderWithinParent = (
  categories: AdminCategory[],
  draggedId: string,
  targetId: string,
): { id: string; sort_order: number }[] | null => {
  const dragged = categories.find(c => c.id === draggedId)
  const target = categories.find(c => c.id === targetId)
  if (!dragged || !target) return null
  if ((dragged.parent_id ?? null) !== (target.parent_id ?? null)) return null
  if (draggedId === targetId) return []

  const siblings = categories
    .filter(c => (c.parent_id ?? null) === (dragged.parent_id ?? null))
    .sort(bySortOrder)

  const from = siblings.findIndex(c => c.id === draggedId)
  const to = siblings.findIndex(c => c.id === targetId)
  const reordered = [...siblings]
  reordered.splice(to, 0, ...reordered.splice(from, 1))

  return reordered
    .map((category, index) => ({ id: category.id, sort_order: index + 1 }))
    .filter(entry => {
      const before = siblings.find(c => c.id === entry.id)
      return (before?.sort_order ?? 0) !== entry.sort_order
    })
}
