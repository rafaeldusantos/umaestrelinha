import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * O termo da busca de cada entrada do histórico (conserto do QA da `74`, B02 —
 * `BUG-20261024-voltar-do-pedido-buscado-perde-a-busca`). Molde de `useRolagemRestaurada`: um `Map`
 * em MÓDULO, por `location.key` — nada em storage, nada no endereço.
 *
 * O termo é estado da página (A13): um nome de cliente no endereço iria parar no histórico do
 * navegador. Mas a página desmonta ao abrir o detalhe, e sem esta memória o voltar trazia a caixa vazia
 * e o recorte inteiro no topo — a Adri redigitava a busca a cada pedido que conferia.
 *
 * - **Voltar à MESMA entrada** (o "Voltar" do detalhe é `navigate(-1)`, e o voltar do Android também)
 *   devolve o termo — e, com ele, a chave da lista buscada no cache, então `useRolagemRestaurada`
 *   restaura a rolagem da lista BUSCADA.
 * - **Entrada nova** (a aba, um link colado) abre sem termo. **F5** também: o `Map` é da memória.
 * - Gravado quando a página desmonta (ou a entrada troca: o chip troca o endereço por substituição, e
 *   o termo segue na página — a entrada velha some do histórico, então gravar nela é inócuo).
 * - **A troca de conta esquece tudo** (`esquecerTermos`, chamado com o cache em `App.tsx`).
 */
const termos = new Map<string, string>()

export const useTermoDaEntrada = (): [string, (termo: string) => void] => {
  const { key } = useLocation()
  const [termo, setTermo] = useState(() => termos.get(key) ?? '')
  const atual = useRef(termo)
  atual.current = termo

  useEffect(
    () => () => {
      if (atual.current) termos.set(key, atual.current)
      else termos.delete(key)
    },
    [key],
  )

  return [termo, setTermo]
}

/** Esquece todos os termos guardados: troca de conta (`App.tsx`) e testes. */
export const esquecerTermos = () => termos.clear()
