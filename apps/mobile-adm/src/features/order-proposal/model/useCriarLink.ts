import { useCallback, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { PROPOSAL_SAVE_FAILED } from '@estrelinha/core/proposals'

import { salvarMontado } from '../api/portaDePropostas'
import type { CorpoDoSave } from './revisao'
import type { MontadoSalvo } from './tipos'
import { MONTADOS_KEY, chaveDoMontado } from './useMontados'

export interface CriarLink {
  /** A gravação está no ar ("Criando o link…"): o segundo toque não sai. */
  gravando: boolean
  /** A frase da falha, no topo da revisão; `null` sem falha. */
  erro: string | null
  /**
   * Quantas vezes o preço mudou no servidor (409 `prices_changed`) — um contador, para quem chama reler o
   * resumo e a sacola a CADA recusa (duas seguidas são duas releituras).
   */
  precosMudaram: number
  /** A recusa (`42501`) que a porta lançou — a página a entrega à MESMA vigia das leituras. */
  erroBruto: unknown
  /** Grava; devolve a proposta gravada, ou `null` (falha, recusa, preço mudado, ou já gravando). */
  gravar: (corpo: CorpoDoSave) => Promise<MontadoSalvo | null>
}

/**
 * "Criar link" (e "Salvar alterações" de Editar): a ÚNICA gravação da montagem, pela porta
 * (`order-proposals?action=save`). Uma gravação só — a proposta, a ficha nova e o endereço salvo juntos
 * no servidor —, então a falha não deixa nada pela metade e diz isso: "Não consegui gravar o pedido.
 * Nada foi enviado à cliente. Tente de novo." (`PROPOSAL_SAVE_FAILED`, a mesma do painel). O preço que
 * mudou no servidor (409 `prices_changed`) diz a frase da function, e quem chama relê o resumo; a recusa
 * da function com frase (409 `not_open`, 422 do cupom…) mostra a frase dela. Depois de gravar, relê a
 * lista e o pedido montado.
 */
export const useCriarLink = (): CriarLink => {
  const queryClient = useQueryClient()
  const trava = useRef(false)
  const [gravando, setGravando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [precosMudaram, setPrecosMudaram] = useState(0)
  const [erroBruto, setErroBruto] = useState<unknown>(null)

  const gravar = useCallback<CriarLink['gravar']>(
    async (corpo) => {
      if (trava.current) return null
      trava.current = true
      setGravando(true)
      setErro(null)
      try {
        const r = await salvarMontado(corpo)
        if (r.tipo === 'ok' && r.dado?.id) {
          void queryClient.invalidateQueries({ queryKey: MONTADOS_KEY })
          void queryClient.invalidateQueries({ queryKey: chaveDoMontado(r.dado.id) })
          return r.dado
        }
        if (r.tipo === 'erro' && r.slug === 'prices_changed') {
          setErro(r.frase || PROPOSAL_SAVE_FAILED)
          setPrecosMudaram((n) => n + 1)
          return null
        }
        setErro(r.tipo === 'erro' && r.frase ? r.frase : PROPOSAL_SAVE_FAILED)
        return null
      } catch (e) {
        if (isAccessDenied(e)) setErroBruto(e)
        else setErro(PROPOSAL_SAVE_FAILED)
        return null
      } finally {
        trava.current = false
        setGravando(false)
      }
    },
    [queryClient],
  )

  return { gravando, erro, precosMudaram, erroBruto, gravar }
}
