import { useEffect, useState } from 'react'

/**
 * O valor depois de `atraso` ms sem mudança (feature `74`, TE5). Genérico: o atraso é do chamador
 * (a busca de pedidos passa `SEARCH_DEBOUNCE_MS`, de `core`). Não se importa o do painel — um app não
 * importa de outro —, e não sobe para `core`, que não tem React (`purity.test.ts`).
 */
export const useDebounce = <T,>(valor: T, atraso: number): T => {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), atraso)
    return () => clearTimeout(t)
  }, [valor, atraso])
  return atrasado
}
