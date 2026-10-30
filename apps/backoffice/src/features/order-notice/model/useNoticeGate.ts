// Feature `88` · C6 — o portão de aviso: `pedir(req)` abre o diálogo, e é ele quem chama
// `req.executar` com o estado da caixa.
//
// - A caixa nasce MARCADA a cada abertura (`A-02`) — a escolha de não avisar nunca vaza de um gesto
//   para o seguinte.
// - Enquanto `executar` corre, `ocupado` é verdadeiro: o botão mostra o gerúndio, "Voltar", `Esc` e o
//   clique fora não fecham, e o botão desabilitado não chama `executar` de novo.
// - `null` fecha; uma frase fica no diálogo e reabilita o botão (`CRG-07`). Uma exceção vira a frase
//   genérica, para o diálogo nunca ficar preso em "ocupado".
// - Ao abrir, o foco vai ao título; ao fechar, volta ao elemento que estava focado quando `pedir` foi
//   chamado (o botão do gesto).

import { createElement, useCallback, useRef, useState, type ReactNode } from 'react'
import type { NotificationEvent } from '@estrelinha/core/notifications'
import { NoticeDialog } from '../ui/NoticeDialog'
import { abrirPrevia } from './previa'
import { blocoDe, devolverFoco, tituloDaPagina } from '@/shared/lib/foco'
import type { NoticeRequest } from './types'

/** A frase quando `executar` lança em vez de devolver o desfecho. */
export const FALHA_INESPERADA = 'Não foi possível concluir. Tente de novo.'

export interface NoticeGate {
  pedir: (req: NoticeRequest) => void
  /** O diálogo; o chamador o monta uma vez na tela. */
  dialogo: ReactNode
  ocupado: boolean
}

export function useNoticeGate(): NoticeGate {
  const [pedido, setPedido] = useState<NoticeRequest | null>(null)
  const [aberto, setAberto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [avisar, setAvisar] = useState(true)
  const origem = useRef<Element | null>(null)
  const alternativas = useRef<Array<() => Element | null | undefined>>([])

  const pedir = useCallback((req: NoticeRequest) => {
    origem.current = req.origem !== undefined ? req.origem : document.activeElement
    // Calculadas AGORA: depois de gravar a origem pode ter saído do documento, e `closest` num nó
    // solto não acha mais o bloco dela.
    alternativas.current = req.focoDepois ?? [blocoDe(origem.current), tituloDaPagina]
    setPedido(req)
    setAvisar(true)
    setErro(null)
    setAberto(true)
  }, [])

  const voltar = useCallback(() => {
    setAberto(false)
    pedido?.aoCancelar?.()
  }, [pedido])

  const confirmar = useCallback(async () => {
    if (!pedido) return
    setOcupado(true)
    setErro(null)
    let desfecho: string | null
    try {
      desfecho = await pedido.executar(avisar)
    } catch {
      desfecho = FALHA_INESPERADA
    }
    setOcupado(false)
    if (desfecho === null) setAberto(false)
    else setErro(desfecho)
  }, [pedido, avisar])

  const verEmail = useCallback(
    (event: NotificationEvent) => {
      if (pedido?.orderId) void abrirPrevia(event, pedido.orderId)
    },
    [pedido],
  )

  // Conserto do QA (`BUG-20261030-foco-cai-no-body-nas-acoes-do-pedido`): a origem pode ter sumido
  // (o próximo passo mudou, a opção do "Outro status" saiu com a lista) — o foco vai à alternativa,
  // nunca ao `<body>`.
  const fechou = useCallback(() => {
    devolverFoco(origem.current, ...alternativas.current)
  }, [])

  const dialogo = createElement(NoticeDialog, {
    pedido,
    aberto,
    ocupado,
    erro,
    avisar,
    onAvisar: setAvisar,
    onConfirmar: confirmar,
    onVoltar: voltar,
    onVerEmail: verEmail,
    onFechou: fechou,
  })

  return { pedir, dialogo, ocupado }
}
