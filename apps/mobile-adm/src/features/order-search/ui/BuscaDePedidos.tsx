import { useEffect, useRef, useState } from 'react'
import { SEARCH_DEBOUNCE_MS } from '@estrelinha/core/orders'
import { useDebounce } from '@/shared/lib/useDebounce'
import { CAMPO } from '@/shared/ui/campo'

export const PLACEHOLDER_DA_BUSCA = 'Número, nome, e-mail ou rastreio'
export const ROTULO_DA_BUSCA = 'Buscar pedido'

/**
 * O campo de busca da lista (feature `74`, `MAP-10`, `MAP-11`, `MAP-42`).
 *
 * - **O termo sai só depois de `SEARCH_DEBOUNCE_MS`** (`core`, o mesmo atraso do painel) sem tecla
 *   nova: uma tecla não dispara consulta. A primeira montagem não emite nada.
 * - **O termo é estado da página, nunca do endereço** (A13): o endereço é de `pedidosHref`, e um
 *   nome de cliente no histórico do navegador é dado pessoal guardado onde ninguém pediu.
 * - `inicial`: o termo que a página já tem ao montar (o voltar do detalhe, B02) — lido só na
 *   montagem, e não reemitido.
 * - Rótulo acessível ("Buscar pedido") e 48 px de altura (`CAMPO`).
 */
const BuscaDePedidos = ({ aoBuscar, inicial = '' }: { aoBuscar: (termo: string) => void; inicial?: string }) => {
  const [texto, setTexto] = useState(inicial)
  const termo = useDebounce(texto, SEARCH_DEBOUNCE_MS)
  const emitido = useRef(inicial)
  const atual = useRef(aoBuscar)
  atual.current = aoBuscar

  useEffect(() => {
    if (termo === emitido.current) return
    emitido.current = termo
    atual.current(termo)
  }, [termo])

  return (
    <div role="search" className="min-w-0">
      <label htmlFor="busca-de-pedidos" className="sr-only">
        {ROTULO_DA_BUSCA}
      </label>
      <input
        id="busca-de-pedidos"
        type="search"
        inputMode="search"
        autoComplete="off"
        enterKeyHint="search"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={PLACEHOLDER_DA_BUSCA}
        className={`${CAMPO} w-full min-w-0`}
      />
    </div>
  )
}

export default BuscaDePedidos
