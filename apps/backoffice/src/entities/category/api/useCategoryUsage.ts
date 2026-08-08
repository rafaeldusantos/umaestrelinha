// Contagem de uso de categorias e de tags (A19).
//
// A regra que este arquivo existe para respeitar: **nunca `select('*')` no catálogo para contar no
// cliente**. É exatamente o erro que a feature 13 está corrigindo na listagem, e reintroduzi-lo aqui
// — num autocomplete que abre em toda edição de produto — seria trocar de lugar o mesmo problema.
//
// ## O compromisso, declarado
//
// Cada contagem é **uma** consulta de **uma** coluna: `product_categories.category_id` e
// `products.tags`. O payload é pequeno (um uuid ou um `text[]` por linha, não o produto inteiro com
// `images` e `variants` em jsonb), mas a agregação ainda acontece no cliente.
//
// O ideal é uma **view agregada** no Postgres (`select category_id, count(*) ... group by`), que
// devolveria dezenas de linhas em vez de milhares. Não foi feita aqui porque a feature 11 não tem
// task de migration, e inventar uma no meio do formulário é escopo que ninguém revisou. Fica
// registrado: quando o catálogo passar de alguns milhares de produtos, esta é a primeira coisa a
// trocar.

import { useEffect, useState } from 'react'
import { supabase } from '@nanapin/supabase/client'

export type UsageCount = Record<string, number>

export interface CategoryUsageResult {
  /** `category_id` → quantos produtos usam. Categoria sem produto simplesmente não aparece. */
  countByCategory: UsageCount
  loading: boolean
}

export const useCategoryUsage = (): CategoryUsageResult => {
  const [countByCategory, setCountByCategory] = useState<UsageCount>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // UMA consulta, UMA coluna. `product_categories` é a tabela de vínculos: uma linha por par
      // produto↔categoria, sem nada do produto.
      const { data, error } = await supabase.from('product_categories').select('category_id')
      if (cancelled) return
      if (!error && data) {
        const counts: UsageCount = {}
        for (const row of data as { category_id: string }[]) {
          counts[row.category_id] = (counts[row.category_id] ?? 0) + 1
        }
        setCountByCategory(counts)
      }
      // Falha de leitura deixa as contagens vazias: o combobox funciona sem elas. Contagem é
      // conveniência, não requisito para escolher uma categoria.
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { countByCategory, loading }
}

export interface TagUsageResult {
  /** Tag → quantos produtos a usam, para ordenar o autocomplete por uso (PFM-06 AC 8). */
  countByTag: UsageCount
  /** As tags existentes, da mais usada para a menos usada. */
  tagsByUsage: string[]
  loading: boolean
}

export const useTagUsage = (): TagUsageResult => {
  const [countByTag, setCountByTag] = useState<UsageCount>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      // UMA consulta, UMA coluna (`text[]`). Não é `select('*')`.
      const { data, error } = await supabase.from('products').select('tags')
      if (cancelled) return
      if (!error && data) {
        const counts: UsageCount = {}
        for (const row of data as { tags: string[] | null }[]) {
          for (const tag of row.tags ?? []) {
            if (typeof tag === 'string' && tag.trim() !== '') {
              counts[tag] = (counts[tag] ?? 0) + 1
            }
          }
        }
        setCountByTag(counts)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const tagsByUsage = Object.keys(countByTag).sort(
    (a, b) => countByTag[b] - countByTag[a] || a.localeCompare(b),
  )

  return { countByTag, tagsByUsage, loading }
}
