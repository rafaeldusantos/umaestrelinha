// PLS-06 AC 9-10 (A23) — o desfazer de 30 segundos.
//
// Não é undo transacional: o Postgres não desfaz transação já commitada. O que existe é o snapshot
// dos valores anteriores, capturado ANTES da escrita, e um segundo `update` que os regrava.
//
// Duas consequências que a UI não pode esconder: ele tem prazo, e **some no reload** — o buffer
// vive em memória, de propósito. Persistir em `localStorage` faria a tela prometer uma volta que
// pode não existir mais (a linha pode ter sido editada por outra pessoa nesse meio tempo).

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BulkPatch } from './buildBulkPatch'

export const UNDO_TTL_MS = 30_000

/**
 * O que se guarda para desfazer. Por padrão, os patches de `products`; o lote de campanha guarda as
 * marcações de antes (`CampaignUndoGroup`, em `bulkCampaign`), que voltam pela porta das marcações.
 */
export interface UndoEntry<T = BulkPatch> {
  /** Só as linhas efetivamente alteradas: falha parcial não promete voltar o que não foi. */
  snapshot: T[]
  label: string
}

export const useUndoBuffer = <T = BulkPatch>(ttlMs: number = UNDO_TTL_MS) => {
  const [pending, setPending] = useState<UndoEntry<T> | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /**
   * O mesmo valor do estado, em `ref`.
   *
   * O botão `Desfazer` vive dentro de um **toast**, montado a partir do render em que a operação
   * foi aplicada — antes de `capture` existir no estado. Lendo só o `pending` do closure, `take()`
   * enxergaria `null` e o desfazer não faria nada, calado. O `ref` é lido no momento do clique.
   */
  const pendingRef = useRef<UndoEntry<T> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  const set = useCallback((entry: UndoEntry<T> | null) => {
    pendingRef.current = entry
    setPending(entry)
  }, [])

  const capture = useCallback(
    (entry: UndoEntry<T>) => {
      clearTimer()
      if (entry.snapshot.length === 0) {
        set(null)
        return
      }
      set(entry)
      timerRef.current = setTimeout(() => set(null), ttlMs)
    },
    [ttlMs, set],
  )

  const discard = useCallback(() => {
    clearTimer()
    set(null)
  }, [set])

  /** Devolve o snapshot e apaga o buffer — desfazer é operação de uma vez só. */
  const take = useCallback((): T[] | null => {
    const entry = pendingRef.current
    if (!entry) return null
    clearTimer()
    set(null)
    return entry.snapshot
  }, [set])

  useEffect(() => clearTimer, [])

  return { pending, capture, take, discard }
}
