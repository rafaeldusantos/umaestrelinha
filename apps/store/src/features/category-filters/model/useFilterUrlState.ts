// Feature 66 — o estado da listagem MORA NA URL (FLT-29..34).
//
// Não há `useState` de filtro: o estado é **derivado** de `?…` a cada render, e mudar um filtro é
// reescrever a URL. Duas fontes (um estado e uma URL "sincronizada" por efeito) divergiriam no
// primeiro voltar do celular — e o efeito de sincronização seria mais uma escrita por toque.
//
// O que isso compra de graça:
// - F5 e link colado numa aba anônima abrem com o mesmo resultado (FLT-30);
// - o catálogo de filtros e a faixa de preço chegam DEPOIS da primeira pintura, e o estado se
//   recompõe sozinho quando chegam — `?acabamento=prata-925` aberto antes do catálogo não é perdido,
//   porque a escrita só apaga a chave de grupo que o catálogo conhece;
// - trocar de coleção pelo menu é trocar de URL, então o filtro da coleção anterior não vaza.
//
// A tradução (o que é padrão, o que se ignora, o que se preserva — `q`, `utm_*`, `gclid`) é de
// `@estrelinha/core/filters`; este hook só liga a regra ao router.

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { parseFilterParams, writeFilterParams, type FilterCatalog } from '@estrelinha/core/filters'
import type { CategoryFilters } from './filters'

export const useFilterUrlState = (
  catalog: FilterCatalog,
  bounds: [number, number],
): [CategoryFilters, (next: CategoryFilters) => void] => {
  const [params, setParams] = useSearchParams()
  const query = params.toString()
  const [lo, hi] = bounds

  const filters = useMemo(
    () => parseFilterParams(new URLSearchParams(query), catalog, [lo, hi]),
    [query, catalog, lo, hi],
  )

  const setFilters = useCallback(
    (next: CategoryFilters) => {
      const atual = new URLSearchParams(query)
      const escrito = writeFilterParams(atual, next, catalog, [lo, hi])
      if (escrito.toString() === atual.toString()) return
      // `replace`: um toque num chip não é uma página nova. O "voltar" do celular tem de sair da
      // listagem, não desfazer filtro por filtro (FLT-29).
      setParams(escrito, { replace: true })
    },
    [query, catalog, lo, hi, setParams],
  )

  return [filters, setFilters]
}
