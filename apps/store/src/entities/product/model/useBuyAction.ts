import { useState } from 'react'
import { ENGRAVING_FIELD_ID } from '../ui/EngravingField'
import type { BuyTogether } from './useBuyTogether'
import type { ProductPurchase } from './useProductPurchase'

export interface BuyAction {
  /** O rótulo do botão quando dá para comprar: o conjunto, ou só a joia. */
  label: 'Adicionar à sacola' | 'Levar o conjunto'
  /** Quantas peças o conjunto tem agora: o principal e os adicionais marcados. `1` sem conjunto. */
  pieces: number
  /** O total do conjunto, ou `null` sem adicional marcado. */
  bundleTotal: number | null
  /** O aviso do botão, ou `null`. Some sozinho quando a causa some. */
  notice: string | null
  /** O toque no botão — o mesmo na coluna de informação e na barra fixa. */
  tap: () => void
}

const SELECTORS = 'input:not([type="hidden"]), button, [role="radio"], select, textarea'

const focusAddon = (state: BuyTogether, id: string) => {
  const addon = state.addons.find(a => a.id === id)
  if (!addon) return
  const go = () => {
    const field = addon.engravingRefusal ? document.getElementById(`engraving-${id}`) : null
    const row = document.querySelector<HTMLElement>(`[data-addon-id="${id}"]`)
    const target =
      field ??
      row?.querySelector<HTMLElement>(`#buy-together-panel-${id} ${SELECTORS}`) ??
      row?.querySelector<HTMLElement>(SELECTORS) ??
      null
    ;(row ?? target)?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    target?.focus()
  }
  if (addon.open) go()
  else {
    state.toggleOpen(id)
    setTimeout(go, 0)
  }
}

/**
 * O botão único de compra: a coluna de informação e a barra fixa leem **este** objeto, então o
 * rótulo, a validação e o foco são os mesmos nas duas superfícies.
 *
 * Marcou adicional → "Levar o conjunto". Faltando escolha ou com gravação recusada em qualquer peça,
 * nada entra: o foco vai ao primeiro adicional incompleto e o aviso diz o que falta. O principal
 * bloqueado (combinação indisponível, gravação acima do limite) continua sendo a decisão de
 * `useProductPurchase`.
 */
export const useBuyAction = (purchase: ProductPurchase, buyTogether?: BuyTogether): BuyAction => {
  const [attempted, setAttempted] = useState(false)
  const marked = buyTogether?.markedCount ?? 0
  const bundle = buyTogether !== undefined && marked > 0

  const first = bundle ? buyTogether.addons.find(a => a.id === buyTogether.firstIncompleteId) : undefined
  const incomplete = bundle ? buyTogether.incompleteCount : 0

  let notice: string | null = null
  // A combinação indisponível do principal já tem o aviso dela na coluna (ao lado do seletor); este
  // aviso é só da tentativa de levar um conjunto com escolha faltando.
  if (attempted && incomplete > 0) {
    notice = first?.engravingRefusal
      ? 'A gravação passou do limite. Ajuste o texto para continuar.'
      : incomplete === 1
        ? 'Falta uma escolha em 1 peça. Ela está marcada acima.'
        : `Falta uma escolha em ${incomplete} peças. Elas estão marcadas acima.`
  }

  const tap = () => {
    if (purchase.engravingRefusal) {
      // O botão da barra não fica `disabled` por isso: ele leva ao campo que o bloqueia.
      const campo = document.getElementById(ENGRAVING_FIELD_ID)
      campo?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
      campo?.focus()
      purchase.add()
      return
    }
    if (!purchase.canAdd) {
      purchase.add()
      return
    }
    if (bundle && buyTogether.incompleteCount > 0) {
      setAttempted(true)
      if (buyTogether.firstIncompleteId) focusAddon(buyTogether, buyTogether.firstIncompleteId)
      return
    }
    setAttempted(false)
    purchase.add(bundle ? buyTogether.taken : undefined)
  }

  return {
    label: bundle ? 'Levar o conjunto' : 'Adicionar à sacola',
    pieces: 1 + marked,
    bundleTotal: bundle ? buyTogether.total : null,
    notice,
    tap,
  }
}
