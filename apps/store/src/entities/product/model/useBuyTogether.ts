import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addonEngravingRefusal,
  addonMissingChoice,
  bundleTotal,
  resolveAddons,
  variantSellable,
  type ResolvedAddon,
  type ResolvedPiece,
} from '@estrelinha/core/buy-together'
import { selectItemEvent } from '@estrelinha/core/analytics'
import { engravingLimit, hasEngraving, normalizeEngraving } from '@estrelinha/core/material'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'
import { productItem, track } from '@/shared/lib/analytics'
import { useTrackList } from '@/shared/lib/analytics/useTrackList'
import { useBuyTogetherData } from '../api/useBuyTogetherData'
import {
  PAGE_MAX_AXES,
  availableValuesFor,
  findVariant,
  visibleOptions,
  type GridProduct,
} from '../lib/variantSelection'
import type { ProductPurchase } from './useProductPurchase'

/** A lista de origem dos eventos do bloco — o que `view_item_list` e `select_item` levam. */
export const BUY_TOGETHER_LIST = { id: 'compre-junto', name: 'Compre Junto' } as const

interface Choice {
  marked: boolean
  open: boolean
  pieceId: string | null
  selected: OptionValues
  engraving: string
}

/** Uma peça que a cliente pode escolher, já com o recorte de variações que a dona liberou. */
export interface BuyTogetherPiece {
  product: Product
  /** O produto restrito às variações liberadas — o que `VariantPicker` e `variantSelection` leem. */
  grid: GridProduct
  simple: boolean
}

export interface BuyTogetherAddon {
  id: string
  kind: 'product' | 'list'
  /** A lista de onde o adicional vem, ou `null` na peça avulsa. A marca "acompanha" a leva. */
  listId: string | null
  /** O nome do adicional: o da lista, ou o da peça. */
  name: string
  pieces: BuyTogetherPiece[]
  marked: boolean
  open: boolean
  /** A peça escolhida; numa lista ainda sem escolha, `null`. */
  piece: BuyTogetherPiece | null
  selected: OptionValues
  variant: ProductVariant | null
  /** O preço da escolha completa, ou `null` enquanto falta escolher. */
  price: number | null
  /** O menor preço vendável do adicional, para a linha dizer "a partir de" antes da escolha. */
  fromPrice: number
  photo: string | null
  /** As partes da escolha, na ordem em que a cliente as fez. */
  summaryParts: string[]
  /** O que falta escolher, ou `null`. */
  missing: string | null
  engraving: string
  engravingEnabled: boolean
  engravingLimit: number
  engravingRefusal: string | null
  /** Marcado e completo: pode ir ao carrinho. */
  ready: boolean
}

export interface TakenAddon {
  addonId: string
  listId: string | null
  product: Product
  variant: ProductVariant | null
  /** O texto aparado, ou `null`. */
  engraving: string | null
  price: number
}

export interface BuyTogether {
  /** Reserva o espaço (`loading`) ou desenha (`ready`); `off` não escreve nada. */
  display: 'off' | 'loading' | 'ready'
  addons: BuyTogetherAddon[]
  markedCount: number
  /** O total do conjunto; `null` com nada marcado. */
  total: number | null
  /** Todo adicional marcado está completo e sem recusa de gravação. */
  canTake: boolean
  /** O primeiro adicional marcado e incompleto, para a tela focar. */
  firstIncompleteId: string | null
  /** Quantos marcados estão incompletos. */
  incompleteCount: number
  /** O que vai ao carrinho, na ordem do bloco. */
  taken: TakenAddon[]
  toggle: (id: string) => void
  toggleOpen: (id: string) => void
  choosePiece: (id: string, productId: string) => void
  selectOptions: (id: string, values: OptionValues) => void
  setEngraving: (id: string, text: string) => void
}

const EMPTY: Choice = { marked: false, open: false, pieceId: null, selected: {}, engraving: '' }

const restrict = (product: Product, piece: ResolvedPiece): GridProduct => {
  if (piece.simple) return { options: product.options, variants: [], stock_policy: product.stock_policy }
  const variants = product.variants.filter(
    v => piece.liberated.length === 0 || piece.liberated.includes(v.id),
  )
  const present = (axis: string, value: string) => variants.some(v => v.option_values?.[axis] === value)
  return {
    stock_policy: product.stock_policy,
    variants,
    options: product.options.map(o => ({ ...o, values: o.values.filter(value => present(o.name, value)) })),
  }
}

/** Eixo com um único valor vendável já nasce escolhido. */
const seedSelection = (piece: BuyTogetherPiece): OptionValues => {
  if (piece.simple) return {}
  const seed: OptionValues = {}
  for (const axis of visibleOptions(piece.grid.options, PAGE_MAX_AXES)) {
    const values = availableValuesFor(piece.grid, axis.name, {})
    if (values.size === 1) seed[axis.name] = [...values][0]
  }
  return seed
}

/**
 * O estado do Compre Junto da página do produto: o que está disponível, o que a cliente marcou e
 * escolheu, o total e o PIX do conjunto.
 *
 * Lê a variação do principal de `purchase` — o bloco **não repete o seletor** — e a quantidade que a
 * página mostra. O hook só decide e mostra; a sacola e a barra fixa leem o mesmo estado.
 */
export const useBuyTogether = (product: Product, purchase: ProductPurchase): BuyTogether => {
  const data = useBuyTogetherData(product.id)
  const [choices, setChoices] = useState<Record<string, Choice>>({})
  const announced = useRef(new Set<string>())

  const mainSoldOut = purchase.sellableGrid
    ? !product.variants.some(v => variantSellable(v, product.stock_policy))
    : product.stock_policy === 'track' && product.stock_total <= 0

  const mainVariantId = purchase.variant?.id ?? null
  const byId = useMemo(() => new Map(data.products.map(p => [p.id, p])), [data.products])

  const resolved: ResolvedAddon[] = useMemo(
    () =>
      data.status === 'ready' && !mainSoldOut
        ? resolveAddons({
            mainProductId: product.id,
            mainVariantId,
            addons: data.addons,
            lists: data.lists,
            products: data.products,
          })
        : [],
    [data.status, data.addons, data.lists, data.products, product.id, mainVariantId, mainSoldOut],
  )

  const display: BuyTogether['display'] = mainSoldOut
    ? 'off'
    : data.status === 'loading'
      ? 'loading'
      : data.status === 'ready' && resolved.length > 0
        ? 'ready'
        : 'off'

  // Um adicional que some (a variação do principal o esconde) perde a marca e as escolhas.
  const visibleKey = resolved.map(a => a.id).join('|')
  useEffect(() => {
    if (display !== 'ready') return
    setChoices(prev => {
      const keep = new Set(visibleKey.split('|'))
      const ids = Object.keys(prev)
      if (ids.every(id => keep.has(id))) return prev
      return Object.fromEntries(ids.filter(id => keep.has(id)).map(id => [id, prev[id]]))
    })
  }, [visibleKey, display])

  // `view_item_list`: uma exibição por conjunto de peças mostrado (`useTrackList` dedupa por id).
  const shown = useMemo(() => {
    const seen = new Set<string>()
    const out: Product[] = []
    for (const a of resolved)
      for (const p of a.pieces) {
        const prod = byId.get(p.productId)
        if (prod && !seen.has(prod.id)) {
          seen.add(prod.id)
          out.push(prod)
        }
      }
    return out
  }, [resolved, byId])
  useTrackList(display === 'ready' ? BUY_TOGETHER_LIST : null, display === 'ready' ? shown : null)

  const addons: BuyTogetherAddon[] = resolved.map(addon => {
    const choice = choices[addon.id] ?? EMPTY
    const pieces: BuyTogetherPiece[] = addon.pieces.map(p => {
      const prod = byId.get(p.productId)!
      return { product: prod, grid: restrict(prod, p), simple: p.simple }
    })
    const piece =
      addon.kind === 'product'
        ? pieces[0]
        : (pieces.find(p => p.product.id === choice.pieceId) ?? null)
    const selected: OptionValues = piece ? { ...seedSelection(piece), ...choice.selected } : {}
    const axes = piece && !piece.simple ? visibleOptions(piece.grid.options, PAGE_MAX_AXES) : []
    const missingAxis = axes.find(a => !(a.name in selected))?.name ?? null
    const variant =
      piece && !piece.simple && missingAxis === null ? findVariant(piece.grid.variants, selected) : null
    const sellable = variant
      ? variantSellable(variant, piece!.product.stock_policy)
      : piece?.simple === true
    const unavailable = piece && !piece.simple && missingAxis === null && !sellable
    const missing = piece
      ? (addonMissingChoice({
          kind: addon.kind,
          pieceChosen: true,
          missingAxis,
          pieceName: piece.product.name,
        }) ?? (unavailable ? 'Essa combinação está indisponível no momento.' : null))
      : addonMissingChoice({ kind: addon.kind, pieceChosen: false, missingAxis: null, pieceName: '' })
    const price = !missing && piece ? (variant?.price ?? piece.product.price) : null
    const fromPrice = Math.min(
      ...pieces.flatMap(p =>
        p.simple
          ? [p.product.price]
          : p.grid.variants
              .filter(v => variantSellable(v, p.product.stock_policy))
              .map(v => v.price as number),
      ),
    )
    const enabled = hasEngraving(variant?.option_values)
    const refusal = enabled ? addonEngravingRefusal(choice.engraving, piece?.product.engraving_max_chars) : null
    const shownPiece = piece ?? pieces[0]
    const summaryParts = [
      ...(addon.kind === 'list' && piece ? [piece.product.name] : []),
      ...axes.filter(a => a.name in selected).map(a => selected[a.name]),
    ]
    return {
      id: addon.id,
      kind: addon.kind,
      listId: addon.listId,
      name: addon.kind === 'list' ? (addon.listName ?? shownPiece.product.name) : shownPiece.product.name,
      pieces,
      marked: choice.marked,
      open: choice.open,
      piece,
      selected,
      variant,
      price,
      fromPrice,
      photo: variant?.image_url || shownPiece.product.image_url || null,
      summaryParts,
      missing,
      engraving: choice.engraving,
      engravingEnabled: enabled,
      engravingLimit: engravingLimit(piece?.product.engraving_max_chars),
      engravingRefusal: refusal,
      ready: choice.marked && missing === null && refusal === null,
    }
  })

  const marked = addons.filter(a => a.marked)
  const incomplete = marked.filter(a => !a.ready)
  const taken: TakenAddon[] = marked
    .filter(a => a.ready && a.piece)
    .map(a => ({
      addonId: a.id,
      listId: a.listId,
      product: a.piece!.product,
      variant: a.variant,
      engraving: a.engravingEnabled ? normalizeEngraving(a.engraving) : null,
      price: a.price as number,
    }))
  const total =
    marked.length === 0
      ? null
      : bundleTotal({
          mainPrice: purchase.price,
          mainQty: purchase.qty,
          addonPrices: taken.map(t => t.price),
        })

  const patch = (id: string, fn: (c: Choice) => Choice) =>
    setChoices(prev => ({ ...prev, [id]: fn(prev[id] ?? EMPTY) }))

  const toggle = (id: string) => {
    const addon = addons.find(a => a.id === id)
    if (!addon) return
    patch(id, c => ({ ...c, marked: !c.marked, open: !c.marked ? true : c.open }))
    if (!addon.marked && !announced.current.has(id)) {
      announced.current.add(id)
      const shownPiece = addon.piece ?? addon.pieces[0]
      track(
        selectItemEvent({
          listId: BUY_TOGETHER_LIST.id,
          listName: BUY_TOGETHER_LIST.name,
          item: productItem(shownPiece.product, {
            index: addons.findIndex(a => a.id === id),
            variant: null,
          }),
        }),
      )
    }
  }

  const toggleOpen = (id: string) => patch(id, c => ({ ...c, open: !c.open }))

  const choosePiece = (id: string, productId: string) => {
    const addon = addons.find(a => a.id === id)
    if (!addon?.pieces.some(p => p.product.id === productId)) return
    patch(id, c =>
      c.pieceId === productId ? c : { ...c, pieceId: productId, selected: {}, engraving: '' },
    )
  }

  const selectOptions = (id: string, values: OptionValues) => {
    const addon = addons.find(a => a.id === id)
    patch(id, c => {
      const chosen = addon?.piece
      const keeps = chosen && hasEngraving(findVariant(chosen.grid.variants, values)?.option_values)
      return { ...c, selected: values, engraving: keeps ? c.engraving : '' }
    })
  }

  const setEngraving = (id: string, text: string) => patch(id, c => ({ ...c, engraving: text }))

  return {
    display,
    addons,
    markedCount: marked.length,
    total,
    canTake: incomplete.length === 0,
    firstIncompleteId: incomplete[0]?.id ?? null,
    incompleteCount: incomplete.length,
    taken,
    toggle,
    toggleOpen,
    choosePiece,
    selectOptions,
    setEngraving,
  }
}
