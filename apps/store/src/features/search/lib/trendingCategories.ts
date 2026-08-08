// As coleções que viram pílula em "Em alta agora" (board "Mobile Search Open - v3").
//
// A regra é **folha da árvore**, não raiz. Parece contra-intuitivo até olhar o catálogo real: a
// árvore da loja tem uma raiz guarda-chuva ("Bottons") e todas as coleções de verdade — Anime,
// K-Pop, Games, Kawaii — pendem dela. Filtrar por `parent_id === null` mostrava uma pílula só,
// escrita "Bottons", numa loja que vende bottons.
//
// Folha também é o que a cliente procura: ninguém busca a categoria que contém tudo, busca o anime.
// Numa árvore plana (nenhuma categoria com filhos) toda categoria é folha, e a função devolve todas
// — então o desenho não depende de a loja ter hierarquia.

import type { Category } from '@estrelinha/supabase/types'

export const pickTrendingCategories = (
  categories: readonly Category[] | undefined,
  limit: number,
): Category[] => {
  const list = categories ?? []
  const parents = new Set(list.map((c) => c.parent_id).filter(Boolean))
  const leaves = list.filter((c) => !parents.has(c.id))
  // A ordem que chega já é `sort_order` — a ordem editorial da loja, que é quem decide o que está
  // "em alta". Sem folha nenhuma (árvore cíclica), cai na lista inteira em vez de mostrar vazio.
  return (leaves.length > 0 ? leaves : list).slice(0, limit)
}
