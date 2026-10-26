import { useCallback, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ORDER_CHANGED, trackingSheet, type TrackingSheet, type TrackingSheetOrigin } from '@estrelinha/core/orders'

import type { LinhaDaLista } from '@/entities/order'

import { definirErro } from './erros'

/**
 * A folha do rastreio NO HISTÓRICO (feature `75`, design §3.8; `MAA-26`, `MAA-32`, A23, TQ7).
 *
 * O voltar do Android fecha a folha sem sair do pedido:
 *
 * - **abrir** empurra, pelo roteador, uma entrada com o MESMO `pathname`/`search` e o marcador só no
 *   `state` (preservando o resto dele — `doApp`, E7 da `74`: o "Voltar" do detalhe precisa dele). Nada
 *   vai à URL: `pedidosHref` continua o único dono do endereço (`MAP-04`);
 * - a folha está aberta **sse** o marcador do `state` é a chave desta folha **e** ela foi aberta NESTA
 *   montagem (a referência) — o voltar consome a entrada e, por construção, a fecha;
 * - **fechar** (por "Agora não", fundo, Escape ou sucesso) é `navigate(-1)`;
 * - **F5 com a folha aberta**: montar com o marcador desta linha e sem a referência ⇒ `navigate(-1)` —
 *   a entrada do marcador SAI, e a de baixo é o MESMO endereço sem ele (abrir sempre empurra por cima
 *   do pedido). A folha não reabre e não sobra voltar morto. O marcador de OUTRO pedido não é tocado (a
 *   lista monta um usuário por cartão).
 *   SPEC_DEVIATION (B01, prova em navegador da T31): A23 e §3.8 pedem `replace` sem o marcador, e o
 *   próprio A23 pede "não sobrar um voltar morto". As duas não cabem juntas: o `replace` deixa
 *   [lista, pedido, pedido], e o primeiro voltar fica no mesmo pedido (medido no Chromium). Vale o
 *   desfecho que a spec descreve (o primeiro voltar vai à lista); o mecanismo virou o voltar, e só o
 *   usuário da ORIGEM do marcador volta (o rodapé e a Entrega do mesmo pedido somariam dois voltares);
 * - **o pedido muda com a folha aberta** (`MAA-26`): se `trackingSheet(row, origem)` passa a devolver
 *   outro `modo` ou `null`, a folha fecha (`navigate(-1)`) e o erro do pedido vira `ORDER_CHANGED`.
 *
 * A chave é `<id>:<origem>:<modo>`.
 * SPEC_DEVIATION (forma — §3.8 diz `<id>:<modo>`): a ORIGEM entra na chave, porque o rodapé (`acao`)
 * e "Informar" da Entrega (`entrega`) podem oferecer o MESMO modo no mesmo pedido montado; com a chave
 * de §3.8 os dois leriam o mesmo marcador. A referência já impedia a folha de abrir nos dois; a origem
 * deixa a chave dizer o que ela é.
 */
export interface FolhaNoHistorico {
  /** A folha que esta origem oferece para a linha de agora, ou `null`. */
  folha: TrackingSheet | null
  aberta: boolean
  abrir: () => void
  fechar: () => void
}

const MARCADOR = 'folhaDoRastreio'

type Estado = Record<string, unknown> | null
const marcadorDe = (state: unknown): string | undefined => {
  const v = (state as Estado)?.[MARCADOR]
  return typeof v === 'string' ? v : undefined
}

export const useFolhaNoHistorico = (
  row: LinhaDaLista,
  origem: TrackingSheetOrigin,
  /** O aviso de postagem saiu? Só o detalhe sabe (lê `order_notifications`); ausente ⇒ a folha não afirma. */
  avisoDePostagemSaiu?: boolean,
): FolhaNoHistorico => {
  const location = useLocation()
  const navigate = useNavigate()
  const folha = trackingSheet(row, origem, { avisoDePostagemSaiu })
  const chave = folha ? `${row.id}:${origem}:${folha.modo}` : null
  /** A chave da folha que ESTA montagem abriu (e ainda não viu fechar). */
  const abertaAqui = useRef<string | null>(null)

  const marcador = marcadorDe(location.state)
  const aberta = chave !== null && marcador === chave && abertaAqui.current === chave

  const abrir = useCallback(() => {
    if (!chave) return
    abertaAqui.current = chave
    const estado = (location.state && typeof location.state === 'object' ? location.state : {}) as Record<string, unknown>
    navigate(
      { pathname: location.pathname, search: location.search, hash: location.hash },
      { state: { ...estado, [MARCADOR]: chave } },
    )
  }, [chave, location, navigate])

  const fechar = useCallback(() => {
    if (abertaAqui.current === null || marcadorDe(location.state) !== abertaAqui.current) return
    abertaAqui.current = null
    navigate(-1)
  }, [location.state, navigate])

  // F5 com a folha desta linha aberta: a entrada do marcador sai (a de baixo é o pedido sem ele).
  useEffect(() => {
    const m = marcadorDe(location.state)
    // Pelo id E pela origem: o detalhe monta o rodapé (`acao`) e a Entrega (`entrega`) do MESMO pedido,
    // e os dois voltando somariam duas entradas (B01, medido no Chromium: o F5 levava à lista).
    if (m && m.startsWith(`${row.id}:${origem}:`) && abertaAqui.current === null) {
      navigate(-1)
    }
    // Só na montagem: depois dela, o marcador desta linha é sempre de uma folha aberta aqui.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const abriu = abertaAqui.current
    if (abriu === null) return
    // O voltar (ou outra navegação) consumiu a entrada: esquecer a referência.
    if (marcadorDe(location.state) !== abriu) {
      abertaAqui.current = null
      return
    }
    // `MAA-26`: a linha relida não oferece mais ESTA folha.
    if (chave !== abriu) {
      abertaAqui.current = null
      definirErro(row.id, { frase: ORDER_CHANGED, retentativa: null })
      navigate(-1)
    }
  }, [chave, location.state, navigate, row.id])

  return { folha, aberta, abrir, fechar }
}
