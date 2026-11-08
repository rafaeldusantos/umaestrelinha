import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * Uma folha NO HISTÓRICO, para qualquer tela — o mecanismo de
 * `features/order-actions/model/useFolhaNoHistorico.ts` (feature `75`), sem a regra do pedido: a folha
 * do pedido montado (cancelar, renovar, a observação) não depende de `trackingSheet`, só existe ou não.
 *
 * - **abrir** empurra uma entrada com o MESMO endereço e o marcador só no `state` (preservando o resto,
 *   como o `doApp`). Nada vai à URL, e o marcador é só a chave da folha — nenhum dado de cliente;
 * - a folha está aberta **sse** o marcador do `state` é a chave desta folha **e** ela foi aberta NESTA
 *   montagem: o voltar do Android consome a entrada e, por construção, a fecha;
 * - **fechar** é `navigate(-1)`;
 * - **F5 com a folha aberta**: montar com o marcador desta chave e sem a referência ⇒ `navigate(-1)` (o
 *   B01 da `75`: a entrada do marcador sai, e não sobra voltar morto).
 */
const MARCADOR = 'folhaDaTela'

const marcadorDe = (state: unknown): string | undefined => {
  const v = (state as Record<string, unknown> | null)?.[MARCADOR]
  return typeof v === 'string' ? v : undefined
}

export interface FolhaNaEntrada {
  aberta: boolean
  abrir: () => void
  fechar: () => void
}

export const useFolhaNaEntrada = (chave: string): FolhaNaEntrada => {
  const location = useLocation()
  const navigate = useNavigate()
  const abertaAqui = useRef<string | null>(null)
  const aberta = marcadorDe(location.state) === chave && abertaAqui.current === chave

  const abrir = useCallback(() => {
    if (abertaAqui.current === chave && marcadorDe(location.state) === chave) return
    abertaAqui.current = chave
    const estado = (location.state && typeof location.state === 'object' ? location.state : {}) as Record<string, unknown>
    navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, { state: { ...estado, [MARCADOR]: chave } })
  }, [chave, location, navigate])

  const fechar = useCallback(() => {
    if (abertaAqui.current === null || marcadorDe(location.state) !== abertaAqui.current) return
    abertaAqui.current = null
    navigate(-1)
  }, [location.state, navigate])

  // F5 com esta folha aberta: a entrada do marcador sai.
  useEffect(() => {
    if (marcadorDe(location.state) === chave && abertaAqui.current === null) navigate(-1)
    // Só na montagem: depois dela, o marcador desta chave é sempre de uma folha aberta aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // O voltar (ou outra navegação) consumiu a entrada: esquecer a referência.
  useEffect(() => {
    if (abertaAqui.current !== null && marcadorDe(location.state) !== abertaAqui.current) abertaAqui.current = null
  }, [location.state])

  return { aberta, abrir, fechar }
}
