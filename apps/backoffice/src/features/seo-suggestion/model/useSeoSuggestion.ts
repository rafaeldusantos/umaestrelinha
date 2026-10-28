// Feature 84 (`SIA-10`, `SIA-12`, `SIA-20`, `SIA-22`..`SIA-25`) — o estado da sugestão de SEO.
//
// O hook mora na PÁGINA, não no botão: quem precisa dele são os dois `onChange` do SEO
// (`noteManualEdit`), o save (`reset`) e a troca de aba (`cancel`) — e o `Tabs` do Radix desmonta a
// aba inativa, então um estado dentro do botão morreria a cada troca de aba levando o desfazer junto.
//
// Três regras de ordem, e todas por NÚMERO DE SEQUÊNCIA, nunca por relógio:
//  - um toque com outro pedido em voo é ignorado (uma chamada só);
//  - a resposta de um pedido superado (cancelado, resetado, de hook desmontado) é descartada;
//  - a resposta que chega depois de uma edição manual é descartada com a frase de `SIA-25`.
//
// `SIA-12` (letra de 2026-10-27, achado do QA): o desfazer devolve o texto de antes da PRIMEIRA
// sugestão da SÉRIE. A série começa na primeira sugestão aplicada e termina no desfazer, na edição
// manual ou no save; sugestões seguidas dentro dela NÃO trocam o ponto de volta. Antes, a 2ª sugestão
// gravava a 1ª como ponto de volta e o texto escrito à mão sumia.
//
// As frases (falha e sucesso) saem na edição manual, no desfazer e no save — menos a de
// `not_configured`, que é a dica do botão desligado (`SIA-20`) e fica até recarregar.

import { useCallback, useEffect, useRef, useState } from 'react'
import { requestSeoSuggestion, type SeoSuggestionInput } from '../api/requestSeoSuggestion'
import { SEO_SUGGESTION_APPLIED, SEO_SUGGESTION_COPY, SEO_SUGGESTION_EDITED_DURING } from './copy'

export interface SeoPair {
  title: string
  description: string
}

export type SeoSuggestionStatus = 'idle' | 'loading' | 'disabled'

interface Options {
  /** O SEO que está nos campos AGORA — é o par que o desfazer devolve. */
  current: SeoPair
  /** Escreve os dois campos do formulário (sem gravar no banco). */
  apply: (pair: SeoPair) => void
}

export interface SeoSuggestionState {
  status: SeoSuggestionStatus
  /** A frase para a região `aria-live`, ou `null`. */
  message: string | null
  canUndo: boolean
  suggest: (input: SeoSuggestionInput) => void
  undo: () => void
  /** A Adri digitou num dos dois campos de SEO. */
  noteManualEdit: () => void
  /** Depois do save: some o desfazer, e um pedido em voo deixa de valer. */
  reset: () => void
  /** Saiu da aba SEO: um pedido em voo deixa de valer (`SIA-24`). O desfazer fica. */
  cancel: () => void
}

const temTexto = (p: SeoPair) => p.title.trim() !== '' || p.description.trim() !== ''

export function useSeoSuggestion({ current, apply }: Options): SeoSuggestionState {
  const [status, setStatus] = useState<SeoSuggestionStatus>('idle')
  const [message, setMessage] = useState<string | null>(null)
  // O ponto de volta da série: `undefined` = sem série aberta; `null` = série aberta a partir de
  // campos vazios (não há o que desfazer, e as sugestões seguintes também não criam desfazer).
  const [origin, setOriginState] = useState<SeoPair | null | undefined>(undefined)
  // O par também num ref: o `undo` e a resposta o leem sem efeito colateral dentro de um updater.
  const originRef = useRef<SeoPair | null | undefined>(undefined)
  const setOrigin = useCallback((p: SeoPair | null | undefined) => {
    originRef.current = p
    setOriginState(p)
  }, [])

  // Lidos na chegada da resposta: o par e o `apply` do render MAIS RECENTE, não os do toque.
  const currentRef = useRef(current)
  currentRef.current = current
  const applyRef = useRef(apply)
  applyRef.current = apply

  const seq = useRef(0)
  const emVoo = useRef(false)
  const editadoNoVoo = useRef(false)
  const desligado = useRef(false)
  const montado = useRef(true)

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
      seq.current += 1
    }
  }, [])

  const suggest = useCallback((input: SeoSuggestionInput) => {
    if (emVoo.current || desligado.current) return
    const meu = ++seq.current
    emVoo.current = true
    editadoNoVoo.current = false
    setStatus('loading')
    setMessage(null)

    void requestSeoSuggestion(input).then(desfecho => {
      if (!montado.current || meu !== seq.current) return
      emVoo.current = false

      if (editadoNoVoo.current) {
        editadoNoVoo.current = false
        setStatus('idle')
        setMessage(SEO_SUGGESTION_EDITED_DURING)
        return
      }

      if (desfecho.kind === 'ok') {
        const antes = currentRef.current
        applyRef.current({ title: desfecho.title, description: desfecho.description })
        // Só a PRIMEIRA sugestão da série grava o ponto de volta (`SIA-12`).
        if (originRef.current === undefined) {
          setOrigin(temTexto(antes) ? { title: antes.title, description: antes.description } : null)
        }
        setStatus('idle')
        setMessage(SEO_SUGGESTION_APPLIED)
        return
      }

      if (desfecho.reason === 'not_configured') {
        // `SIA-20`: o botão fica desligado até a página ser recarregada.
        desligado.current = true
        setStatus('disabled')
      } else {
        setStatus('idle')
      }
      setMessage(SEO_SUGGESTION_COPY[desfecho.reason])
    })
  }, [setOrigin])

  /** Apaga a frase da região viva — menos a dica de `not_configured`, que fica até recarregar. */
  const limparFrase = useCallback(() => {
    if (!desligado.current) setMessage(null)
  }, [])

  const undo = useCallback(() => {
    const anterior = originRef.current
    if (!anterior) return
    applyRef.current(anterior)
    setOrigin(undefined)
    limparFrase()
  }, [setOrigin, limparFrase])

  const noteManualEdit = useCallback(() => {
    setOrigin(undefined)
    if (emVoo.current) editadoNoVoo.current = true
    else limparFrase()
  }, [setOrigin, limparFrase])

  const cancel = useCallback(() => {
    if (!emVoo.current) return
    seq.current += 1
    emVoo.current = false
    editadoNoVoo.current = false
    setStatus(desligado.current ? 'disabled' : 'idle')
  }, [])

  const reset = useCallback(() => {
    setOrigin(undefined)
    limparFrase()
    cancel()
  }, [cancel, setOrigin, limparFrase])

  // Em voo o desfazer some (o par dos campos ainda é a sugestão anterior); volta com a resposta.
  const canUndo = status !== 'loading' && origin !== undefined && origin !== null

  return { status, message, canUndo, suggest, undo, noteManualEdit, reset, cancel }
}
