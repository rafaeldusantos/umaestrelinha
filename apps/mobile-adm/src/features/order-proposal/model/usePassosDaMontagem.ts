import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { PEDIDOS_PATH, montarPedidoHref } from '@/entities/order'

import { ULTIMO_PASSO, type NumeroDoPasso } from './montagem'

/**
 * Os passos da montagem NO HISTÓRICO — o molde dos passos da recuperação
 * (`features/recovery/model/passos.ts`) e da folha no histórico (`useFolhaNoHistorico`), numa rota só.
 *
 * - Cada passo é uma entrada de `/pedidos/montar` com o número no `history.state`
 *   (`{ doApp: true, passoDaMontagem: n }`) — nada na URL, nenhum dado da cliente. O voltar do Android
 *   recua um passo sem interceptar gesto nenhum: é o voltar do navegador.
 * - **A sentinela**: abrir a montagem empilha a entrada `0` e, por cima, a do passo 1. O voltar do
 *   passo 1 cai na sentinela, ainda nesta tela: sem nada preenchido, ela sai (`navigate(-1)`); com algo
 *   preenchido, a tela pergunta antes ("Sair sem criar o link?"). É o que torna possível pedir a
 *   confirmação no primeiro passo sem um bloqueador de navegação (o app usa `BrowserRouter`).
 * - **Aberta direto** (sem estado — o endereço digitado): a entrada vira `/pedidos` e a montagem é
 *   empilhada por cima, para o "x" e o voltar terem sempre para onde ir.
 * - **F5 no meio** (o estado da tela se perdeu; do aparelho volta só o rascunho das peças e dos
 *   descontos, `rascunho.ts`): volta à sentinela e recomeça no passo 1.
 * - O indicador só navega até o passo mais alto ALCANÇADO; para trás, recua no histórico; para a
 *   frente, empilha os passos do meio (o voltar continua recuando um por um).
 */
const MARCADOR = 'passoDaMontagem'

const passoDe = (state: unknown): number | null => {
  const v = (state as Record<string, unknown> | null)?.[MARCADOR]
  return typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= ULTIMO_PASSO ? v : null
}

export interface PassosDaMontagem {
  /** O passo na tela (1 a 4). */
  passo: NumeroDoPasso
  /** O passo mais alto já alcançado. */
  alcancado: NumeroDoPasso
  /** O voltar caiu na sentinela com algo preenchido: a tela pergunta antes de sair. */
  perguntandoNaSentinela: boolean
  continuar: () => void
  irPara: (n: NumeroDoPasso) => void
  /** Sai da montagem inteira; `folhaAberta` conta a entrada da folha de confirmação. */
  sair: (folhaAberta?: boolean) => void
  /** Da sentinela, volta ao passo 1 ("Continuar montando"). */
  voltarAoPrimeiro: () => void
}

export const usePassosDaMontagem = (preenchida: boolean): PassosDaMontagem => {
  const location = useLocation()
  const navigate = useNavigate()
  const lido = passoDe(location.state)
  const iniciada = useRef(false)
  const reiniciando = useRef(false)
  const preenchidaAgora = useRef(preenchida)
  preenchidaAgora.current = preenchida
  const [maior, setMaior] = useState<NumeroDoPasso>(1)

  const empilhar = useCallback(
    (n: number) => navigate(montarPedidoHref(), { state: { doApp: true, passoDaMontagem: n } }),
    [navigate],
  )

  // Só na montagem: aberta direto, ou F5 num passo do meio.
  useEffect(() => {
    if (lido === null) {
      navigate(PEDIDOS_PATH, { replace: true })
      empilhar(0)
    } else if (lido > 0) {
      reiniciando.current = true
      const recuo = lido
      navigate(-recuo)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (lido === null) return
    if (lido > 0) {
      if (!reiniciando.current) iniciada.current = true
      return
    }
    // Na sentinela.
    if (!iniciada.current || reiniciando.current) {
      iniciada.current = true
      reiniciando.current = false
      empilhar(1)
    } else if (!preenchidaAgora.current) {
      navigate(-1)
    }
  }, [lido, location.key, empilhar, navigate])

  const passo = (lido !== null && lido >= 1 ? lido : 1) as NumeroDoPasso
  useEffect(() => {
    setMaior((m) => (passo > m ? passo : m))
  }, [passo])
  const alcancado = (passo > maior ? passo : maior) as NumeroDoPasso

  const continuar = useCallback(() => {
    if (passo < ULTIMO_PASSO) empilhar(passo + 1)
  }, [passo, empilhar])

  const irPara = useCallback(
    (n: NumeroDoPasso) => {
      if (n === passo || n > alcancado) return
      if (n < passo) {
        const recuo = passo - n
        navigate(-recuo)
        return
      }
      for (let k = passo + 1; k <= n; k++) empilhar(k)
    },
    [passo, alcancado, navigate, empilhar],
  )

  const sair = useCallback(
    (folhaAberta = false) => {
      const profundidade = (lido ?? 0) + 1 + (folhaAberta ? 1 : 0)
      navigate(-profundidade)
    },
    [lido, navigate],
  )

  const voltarAoPrimeiro = useCallback(() => empilhar(1), [empilhar])

  return {
    passo,
    alcancado,
    perguntandoNaSentinela: lido === 0 && iniciada.current && !reiniciando.current && preenchida,
    continuar,
    irPara,
    sair,
    voltarAoPrimeiro,
  }
}
