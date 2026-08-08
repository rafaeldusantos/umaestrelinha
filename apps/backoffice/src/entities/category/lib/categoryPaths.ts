// A hierarquia de categorias como o combobox do produto precisa dela: caminho, caminho do pai,
// profundidade e a lista achatada em ordem de árvore.
//
// **Mudou de casa na feature 16**: estava em `features/product-form/model/`, e a tela de Menu passou a
// ser um segundo consumidor. Feature importando de outra feature é cross-import; como isto é leitura
// de uma entidade, o lugar é `entities/category/lib/`.
//
// A subida da cadeia de pais delega para `@estrelinha/core/menu` — `categoryPath` tinha a terceira cópia
// da mesma caminhada (as outras eram o `categoryTrail` da loja e a que o menu precisava), com o seu
// próprio limite de profundidade e a sua própria guarda de ciclo.
//
// Não confundir com `features/category-list/model/categoryTree.ts`: aquele é da TELA de categorias
// (mover, reordenar, contar descendentes). Este é só leitura, para escolher.

import { ancestorsOf, pathLabel } from '@estrelinha/core/menu'
import type { DbCategory } from '@estrelinha/supabase/types'

/** `K-Pop › Girl Groups` (AC 2). Sem o caminho, duas "Girl Groups" de pais diferentes são iguais. */
export const categoryPath = (category: DbCategory, all: readonly DbCategory[]): string =>
  pathLabel(all.some(c => c.id === category.id) ? all : [...all, category], category.id)

/**
 * O caminho **sem** o próprio nome: `K-Pop ›` de `K-Pop › Girl Groups`. Vazio na raiz.
 *
 * O artboard divide a linha em duas ênfases — o pai apagado, o nome próprio em destaque — em vez do
 * caminho inteiro num tom só. Numa lista de 30 categorias em que oito começam com o mesmo pai, o
 * caminho completo em peso uniforme faz o olho ler oito vezes a parte que não distingue nada.
 */
export const parentPath = (category: DbCategory, all: readonly DbCategory[]): string => {
  const parts = categoryPath(category, all).split(' › ')
  parts.pop()
  return parts.length === 0 ? '' : `${parts.join(' › ')} ›`
}

/** Quantos ancestrais a categoria tem. É o recuo da linha no dropdown. */
export const depthOf = (category: DbCategory, all: readonly DbCategory[]): number =>
  ancestorsOf(all.some(c => c.id === category.id) ? all : [...all, category], category.id).length

/**
 * A lista em ordem de **árvore**: cada pai imediatamente seguido dos seus filhos.
 *
 * `useAdminCategories` devolve `order('sort_order')`, que é uma ordem *global* — nada garante que o
 * filho venha depois do pai. Sem achatar, o recuo do dropdown desenharia uma hierarquia falsa
 * (`Girl Groups` recuado aparecendo acima de `K-Pop`). Categoria órfã — `parent_id` apontando para
 * quem não veio na consulta — e ciclo entre duas entram no fim: some da árvore, não da lista.
 */
export const flattenTree = (all: readonly DbCategory[]): DbCategory[] => {
  const byParent = new Map<string | null, DbCategory[]>()
  for (const category of all) {
    const key = category.parent_id ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(category)
  }

  const out: DbCategory[] = []
  const walk = (parent: string | null, depth: number) => {
    if (depth > 4) return
    for (const category of byParent.get(parent) ?? []) {
      out.push(category)
      walk(category.id, depth + 1)
    }
  }
  walk(null, 0)

  const placed = new Set(out.map(category => category.id))
  for (const category of all) if (!placed.has(category.id)) out.push(category)
  return out
}
