import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthContext } from '@estrelinha/auth'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { cancelarMontado, gravarObservacaoDoMontado, registrarEnvio, renovarMontado, type RespostaDePropostas } from '../api/portaDePropostas'
import { CANCELADO, ENVIO_NAO_REGISTRADO, FALHOU, NAO_COPIOU, OBSERVACAO_SALVA, RENOVADO, abrindoWhatsapp, linkCopiado } from './frases'
import type { CanalDoEnvio } from './tipos'
import { tomarDesfecho } from './montadoEmEdicao'
import { MONTADOS_KEY, chaveDoMontado } from './useMontados'

/** O aviso de uma ação que deu certo (o título e a linha de baixo), desenhado na região viva da tela. */
export interface AvisoDoMontado {
  titulo: string
  texto: string
}

/** O link que o `renew` devolveu — vive SÓ na memória desta tela, nunca em storage. */
export interface LinkRenovado {
  id: string
  token: string
  expires_at: string
}

/** O `renew` voltou com os preços mudados: a confirmação leva o total relido. */
export interface PrecosMudados {
  frase: string
  totalRelido: number
}

export interface AcoesDoMontado {
  /** Uma ação está no ar: as outras não saem (o segundo toque no mesmo tique também não). */
  travado: boolean
  erro: string | null
  /** A recusa (`42501`) que uma ação lançou — a página a entrega à MESMA vigia da leitura. */
  erroBruto: unknown
  aviso: AvisoDoMontado | null
  linkRenovado: LinkRenovado | null
  precosMudados: PrecosMudados | null
  enviar: (canal: CanalDoEnvio, entrada: { link: string; nome: string | null }) => Promise<void>
  cancelar: (aoConcluir?: () => void) => Promise<void>
  renovar: (aoConcluir?: () => void) => Promise<void>
  salvarObservacao: (texto: string | null, aoConcluir?: () => void) => Promise<void>
  limparErro: () => void
}

/**
 * As escritas do pedido montado no app: enviar (copiar ou WhatsApp, com o registro no
 * histórico), cancelar, renovar e a observação interna — todas pela porta da function.
 *
 * - **Depois de todo desfecho que chegou à rede, relê** o pedido montado e a lista; nunca
 *   `setQueryData` (o servidor é o dono do estado e do histórico).
 * - **O link renovado** fica em estado desta tela, preso à conta que o gerou: trocou a conta, sumiu
 *   (a regra de `trocaDeContaLimpaCache`). Sem a chave da cifra no servidor, é o único lugar onde ele
 *   existe.
 * - **A recusa** sai como `erroBruto`; a frase de falha da function (409 `not_open`…) sai em `erro`.
 */
export const useAcoesDoMontado = (id: string): AcoesDoMontado => {
  const queryClient = useQueryClient()
  const { user } = useAuthContext()
  const conta = user?.id ?? null
  const trava = useRef(false)
  const [travado, setTravado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [erroBruto, setErroBruto] = useState<unknown>(null)
  // O desfecho que a montagem deixou para este pedido montado (o aviso de "Link criado." e, ao criar, o
  // link da resposta do `save`) — lido uma vez, na primeira renderização.
  const [desfecho] = useState(() => tomarDesfecho(id, conta))
  const [aviso, setAviso] = useState<AvisoDoMontado | null>(desfecho?.aviso ?? null)
  const [renovado, setRenovado] = useState<(LinkRenovado & { conta: string | null }) | null>(
    desfecho?.link ? { ...desfecho.link, conta } : null,
  )
  const [precosMudados, setPrecosMudados] = useState<PrecosMudados | null>(null)

  // Trocou a conta: o que esta tela guardava da anterior some.
  const contaVista = useRef(conta)
  useEffect(() => {
    if (contaVista.current === conta) return
    contaVista.current = conta
    setRenovado(null)
    setAviso(null)
    setErro(null)
    setPrecosMudados(null)
  }, [conta])

  const reler = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: chaveDoMontado(id) })
    void queryClient.invalidateQueries({ queryKey: MONTADOS_KEY })
  }, [queryClient, id])

  /** Roda uma escrita com a trava; devolve a resposta, ou `null` quando lançou (recusa) ou estava travado. */
  const executar = useCallback(
    async <T,>(chamada: () => Promise<RespostaDePropostas<T>>): Promise<RespostaDePropostas<T> | null> => {
      if (trava.current) return null
      trava.current = true
      setTravado(true)
      setErro(null)
      try {
        const r = await chamada()
        reler()
        return r
      } catch (e) {
        if (isAccessDenied(e)) setErroBruto(e)
        else setErro(FALHOU)
        return null
      } finally {
        trava.current = false
        setTravado(false)
      }
    },
    [reler],
  )

  const falhou = useCallback((r: RespostaDePropostas<unknown>) => setErro(r.tipo === 'erro' && r.frase ? r.frase : FALHOU), [])

  const enviar = useCallback<AcoesDoMontado['enviar']>(
    async (canal, { link, nome }) => {
      if (trava.current) return
      if (canal === 'copy') {
        try {
          await navigator.clipboard.writeText(link)
        } catch {
          setErro(NAO_COPIOU)
          return
        }
      }
      setAviso(canal === 'copy' ? linkCopiado(nome) : abrindoWhatsapp(nome))
      const r = await executar(() => registrarEnvio(id, canal))
      if (r && r.tipo !== 'ok') setErro(ENVIO_NAO_REGISTRADO)
    },
    [executar, id],
  )

  const cancelar = useCallback<AcoesDoMontado['cancelar']>(
    async (aoConcluir) => {
      const r = await executar(() => cancelarMontado(id))
      if (!r) return
      if (r.tipo !== 'ok') return falhou(r)
      setAviso(CANCELADO)
      aoConcluir?.()
    },
    [executar, falhou, id],
  )

  const renovar = useCallback<AcoesDoMontado['renovar']>(
    async (aoConcluir) => {
      const r = await executar(() => renovarMontado(id, precosMudados?.totalRelido ?? null))
      if (!r) return
      if (r.tipo === 'erro' && r.slug === 'prices_changed' && r.totalRelido !== null) {
        setPrecosMudados({ frase: r.frase, totalRelido: r.totalRelido })
        return
      }
      if (r.tipo !== 'ok' || typeof r.dado?.token !== 'string') return falhou(r)
      setPrecosMudados(null)
      setRenovado({ id, token: r.dado.token, expires_at: r.dado.expires_at, conta })
      setAviso(RENOVADO)
      aoConcluir?.()
    },
    [executar, falhou, id, precosMudados, conta],
  )

  const salvarObservacao = useCallback<AcoesDoMontado['salvarObservacao']>(
    async (texto, aoConcluir) => {
      const r = await executar(() => gravarObservacaoDoMontado(id, texto))
      if (!r) return
      if (r.tipo !== 'ok') return falhou(r)
      setAviso({ titulo: OBSERVACAO_SALVA, texto: '' })
      aoConcluir?.()
    },
    [executar, falhou, id],
  )

  const linkRenovado = renovado && renovado.id === id && renovado.conta === conta ? { id, token: renovado.token, expires_at: renovado.expires_at } : null

  return {
    travado,
    erro,
    erroBruto,
    aviso,
    linkRenovado,
    precosMudados,
    enviar,
    cancelar,
    renovar,
    salvarObservacao,
    limparErro: () => setErro(null),
  }
}
