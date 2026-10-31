// O estado da montagem (feature 89, `MON-09`, `MON-12`). O hook só guarda e deriva: as operações são
// as funções puras de `draft.ts`, o preço é `priceDraft` (sobre `priceProposalDraft`), e as
// promoções vigentes vêm do mesmo hook que a loja usa (`useActivePromotions`) — a promoção que a tela
// mostra é a que o servidor relê ao gravar.

import { useCallback, useMemo, useRef, useState } from 'react'
import { useActivePromotions } from '@estrelinha/core/hooks/usePromotions'
import {
  addLine,
  createLinkRefusal,
  emptyDraft,
  priceDraft,
  removeLine,
  toSavePayload,
  updateLine,
  type DraftAddress,
  type DraftCoupon,
  type DraftCustomer,
  type DraftLine,
  type DraftManual,
  type ProposalDraft,
  type SaveTarget,
} from './draft'

const novaChaveDeIdempotencia = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `proposta-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`

export const useProposalDraft = (inicial?: ProposalDraft) => {
  const [draft, setDraft] = useState<ProposalDraft>(() => inicial ?? emptyDraft())
  const { data: promotions } = useActivePromotions()
  // Uma chave por montagem: o duplo clique em "Criar link" devolve a MESMA proposta.
  const chave = useRef(novaChaveDeIdempotencia())

  const pricing = useMemo(() => priceDraft(draft, promotions), [draft, promotions])
  const refusal = useMemo(() => createLinkRefusal(draft, pricing), [draft, pricing])

  const setCustomer = useCallback(
    (patch: Partial<DraftCustomer>) => setDraft((d) => ({ ...d, customer: { ...d.customer, ...patch } })),
    [],
  )
  const setAddress = useCallback(
    (patch: Partial<DraftAddress>) => setDraft((d) => ({ ...d, address: { ...d.address, ...patch } })),
    [],
  )
  const add = useCallback((line: DraftLine) => setDraft((d) => addLine(d, line)), [])
  const update = useCallback((key: string, patch: Partial<DraftLine>) => setDraft((d) => updateLine(d, key, patch)), [])
  const remove = useCallback((key: string) => setDraft((d) => removeLine(d, key)), [])
  const setCoupon = useCallback((coupon: DraftCoupon | null) => setDraft((d) => ({ ...d, coupon })), [])
  const setManual = useCallback((manual: DraftManual | null) => setDraft((d) => ({ ...d, manual })), [])
  const reset = useCallback((next: ProposalDraft) => setDraft(next), [])

  const payload = useCallback(
    (alvo: Omit<SaveTarget, 'idempotencyKey'> = {}) =>
      toSavePayload(draft, pricing, alvo.id ? alvo : { idempotencyKey: chave.current }),
    [draft, pricing],
  )

  return {
    draft,
    pricing,
    /** `MON-12` — o motivo, ou `null` quando o link pode ser criado. */
    refusal,
    setCustomer,
    setAddress,
    addLine: add,
    updateLine: update,
    removeLine: remove,
    setCoupon,
    setManual,
    reset,
    payload,
    idempotencyKey: chave.current,
  }
}
