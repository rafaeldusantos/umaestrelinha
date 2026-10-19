// A leitura da fila — feature 67 (`VFL-18`, `VFL-24`, `VFL-28`).
//
// Junta as duas leituras React Query (o pool da marcação, com as variações e as duas marcações, e
// as recusas) com o catálogo de filtros, e passa pela regra de `core`. É chamada pela fila E por
// `/admin/filtros` (o "Sugestões (N)"), e por isso o número das duas telas é o mesmo por construção.
//
// `atualizarFila` é a régua de "atualiza sem recarregar" (`VFL-24`): ela invalida as DUAS chaves —
// a do pool da marcação (que traz as marcações) e a das recusas —, e quem grava chama ela depois de
// o banco responder. O catálogo de filtros (as contagens de `/admin/filtros`) não é React Query: quem
// grava relê ele com `fetchCatalog('revalidar')`.

import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidarRecusas, useSuggestionDismissals, type AdminFilterGroup } from '@/entities/filter'
import { PRODUCT_MARKING_KEY, useProductMarkingPool } from '@/entities/product'
import { montarFila, totalPendente } from './fila'

export const useFila = (groups: readonly AdminFilterGroup[]) => {
  const pool = useProductMarkingPool()
  const recusas = useSuggestionDismissals()
  const fila = useMemo(
    () => (pool.carregando || recusas.carregando ? [] : montarFila(groups, pool.produtos, recusas.recusas)),
    [groups, pool.produtos, pool.carregando, recusas.recusas, recusas.carregando],
  )
  const produtos = useMemo(() => new Map(pool.produtos.map(p => [p.id, p])), [pool.produtos])
  return {
    fila,
    produtos,
    total: totalPendente(fila),
    carregando: pool.carregando || recusas.carregando,
    erro: pool.erro ?? recusas.erro,
  }
}

export const useAtualizarFila = () => {
  const qc = useQueryClient()
  return async (): Promise<void> => {
    await Promise.all([qc.invalidateQueries({ queryKey: PRODUCT_MARKING_KEY }), invalidarRecusas(qc)])
  }
}
