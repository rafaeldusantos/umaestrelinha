import { useCallback, useEffect, useState } from 'react'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { conferirResumo } from '../api/portaDePropostas'
import type { PedidoDoResumo } from './descontos'
import type { PreviaDaMontagem } from './tipos'

export interface ResumoDaMontagemNaTela {
  /** A última prévia que voltou boa — fica na tela enquanto a próxima confere, e depois de uma falha. */
  previa: PreviaDaMontagem | null
  /** Uma prévia está no ar. */
  conferindo: boolean
  /** A última prévia falhou (rede, 5xx): o resumo na tela é o anterior. */
  falhou: boolean
  /** A última prévia foi recusada pela function (422), com a frase dela. */
  recusa: { slug: string; frase: string } | null
  /** A recusa (`42501`) que a porta lançou — a página a entrega à MESMA vigia das leituras. */
  erroBruto: unknown
  tentarDeNovo: () => void
}

/**
 * O resumo vivo do passo 3: a cada mudança da escolha, a prévia (`order-proposals?action=preview`)
 * confere de novo, com a chamada anterior CANCELADA (o `signal` do `invoke`) e a resposta dela
 * descartada mesmo que chegue. `pedido` nulo não confere nada (fora do passo). Nenhum número é calculado
 * aqui: o resumo é o do servidor.
 */
export const useResumoDaMontagem = (pedido: PedidoDoResumo | null): ResumoDaMontagemNaTela => {
  const chave = pedido ? JSON.stringify(pedido) : null
  const [previa, setPrevia] = useState<PreviaDaMontagem | null>(null)
  const [conferindo, setConferindo] = useState(false)
  const [falhou, setFalhou] = useState(false)
  const [recusa, setRecusa] = useState<{ slug: string; frase: string } | null>(null)
  const [erroBruto, setErroBruto] = useState<unknown>(null)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    if (chave === null) return
    const controle = new AbortController()
    let vigente = true
    setConferindo(true)
    void (async () => {
      let r: Awaited<ReturnType<typeof conferirResumo>>
      try {
        r = await conferirResumo(JSON.parse(chave) as PedidoDoResumo, controle.signal)
      } catch (e) {
        if (!vigente) return
        setConferindo(false)
        if (isAccessDenied(e)) setErroBruto(e)
        else setFalhou(true)
        return
      }
      if (!vigente) return
      setConferindo(false)
      if (r.tipo === 'ok') {
        setPrevia(r.dado)
        setFalhou(false)
        setRecusa(null)
        setErroBruto(null)
      } else if (r.tipo === 'erro') {
        setFalhou(false)
        setRecusa({ slug: r.slug, frase: r.frase })
      } else {
        setFalhou(true)
      }
    })()
    return () => {
      vigente = false
      controle.abort()
      setConferindo(false)
    }
  }, [chave, tentativa])

  const tentarDeNovo = useCallback(() => setTentativa((t) => t + 1), [])

  return { previa, conferindo, falhou, recusa, erroBruto, tentarDeNovo }
}
