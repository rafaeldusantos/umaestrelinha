import { useState } from 'react'
import { toast } from 'sonner'
import { variantLabel } from '@estrelinha/core/pricing'
import {
  engravingLimit,
  engravingRefusal,
  hasEngraving,
  normalizeEngraving,
} from '@estrelinha/core/material'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { addToCartEvent } from '@estrelinha/core/analytics'
import { productItem, track } from '@/shared/lib/analytics'
import type { CartEntry } from '@/entities/cart/model/cartStore'
import { BUY_TOGETHER_LIST, type TakenAddon } from './useBuyTogether'
import {
  PAGE_MAX_AXES,
  canAddSelection,
  findVariant,
  hasSellableGrid,
  initialSelection,
  selectionForVariant,
} from '../lib/variantSelection'
import { savingsOf, stockLineOf, type StockLine } from '../lib/productFacts'

export interface ProductPurchase {
  qty: number
  setQty: (qty: number) => void
  selected: OptionValues
  select: (values: OptionValues) => void
  /** A linha escolhida, ou `null` em produto simples / combinação inexistente. */
  variant: ProductVariant | null
  sellableGrid: boolean
  /** O que vai ser cobrado por unidade — preço da LINHA, nunca o `base_price` da vitrine. */
  price: number
  /** O rótulo da linha escolhida (`Aço / 45cm`), ou `null` em produto simples. */
  variantLabel: string | null
  savings: ReturnType<typeof savingsOf>
  stock: StockLine
  canAdd: boolean
  /**
   * Leva o principal à sacola. Com `taken`, leva junto cada adicional já completo do Compre Junto:
   * o laço da quantidade é só do principal, o adicional entra com quantidade 1, e tudo vai num único
   * `addItems` e num único evento. Quem confere se os adicionais estão completos é o chamador
   * (`useBuyAction`); aqui só a recusa da gravação do principal aborta.
   */
  add: (taken?: readonly TakenAddon[]) => void
  /** O texto cru do campo — com espaços, como a cliente digitou. */
  engraving: string
  setEngraving: (text: string) => void
  /**
   * A **variação escolhida** grava? Não o produto: o mesmo produto tem linhas `Com gravação: Sim` e
   * `Não`, e perguntar ao produto mostraria o campo para quem escolheu a que não grava.
   */
  engravingEnabled: boolean
  /** O teto desta peça, do cadastro. `null` no produto cai em `DEFAULT_ENGRAVING_MAX_CHARS`. */
  engravingLimit: number
  /** Motivo da recusa, ou `null`. Alimenta o contador e o bloqueio do CTA. */
  engravingRefusal: string | null
}

/**
 * O estado de compra da página do produto: quantidade, variação escolhida, preço e o "adicionar".
 *
 * Existe porque os boards de Produto puseram **duas** superfícies para a mesma compra: a coluna de
 * informação e a barra fixa do rodapé mobile. Duplicar o estado significaria duas quantidades e dois
 * preços na mesma tela — e foi exatamente esse tipo de duplicação que quebrou a remoção de item com
 * variação quando existiam duas telas de carrinho. A página monta o hook uma vez e passa para as
 * duas.
 *
 * A escolha da variação também é o que a galeria observa (PMD-06 AC 3), então o `onSelect` da página
 * recebe a linha resolvida — não os valores crus.
 */
export const useProductPurchase = (
  product: Product,
  onVariantChange?: (variant: ProductVariant | null) => void,
  initialVariant?: ProductVariant | null,
): ProductPurchase => {
  const [qty, setQty] = useState(1)
  // PST-05 AC 1: até 3 seletores, gerados de `products.options` na ordem de `position`.
  //
  // `GSH-10`: quando a URL traz `?variant=`, a semente é a linha anunciada — a cliente clicou num
  // preço específico na Google Shopping e precisa encontrar aquele preço na tela. O que muda é a
  // **semente**, nunca o algoritmo: sem parâmetro, ou com um que não resolve, `initialSelection`
  // decide como sempre.
  const [selected, setSelected] = useState(
    () =>
      selectionForVariant(product, initialVariant ?? null, PAGE_MAX_AXES) ??
      initialSelection(product, PAGE_MAX_AXES),
  )
  const [engraving, setEngravingText] = useState('')
  const addItems = useCartStore(s => s.addItems)

  // PST-10: grade sem eixo ou sem linha vendável = produto simples, por `base_price`.
  const sellableGrid = hasSellableGrid(product)
  const variant = sellableGrid ? findVariant(product.variants, selected) : null
  // O preço exibido é o da LINHA escolhida. `base_price` só serve ao "a partir de" da vitrine
  // (A14) — mostrá-lo aqui seria anunciar um valor que o caixa não vai cobrar.
  const price = variant?.price ?? product.price
  // MAT-03: quem decide é a variação escolhida, não o produto. O eixo `Com gravação` existe em 35
  // produtos do catálogo e **precifica** (33 deles cobram a mais) — o preço já vem de `variant.price`
  // acima, então aqui só sobra o texto e o limite.
  const engravingEnabled = hasEngraving(variant?.option_values)
  const limit = engravingLimit(product.engraving_max_chars)
  // Gravação desligada nunca recusa: o texto pendurado é ignorado, e é limpo no `select` abaixo.
  const refusal = engravingEnabled ? engravingRefusal(engraving, limit) : null

  // PST-08 / AC 6-7: `none` e `backorder` nunca esgotam. Sem grade, o saldo é o `stock_total`.
  const canAdd =
    (sellableGrid
      ? canAddSelection(product, selected)
      : product.stock_policy !== 'track' || product.stock_total > 0) && refusal === null

  const select = (values: OptionValues) => {
    setSelected(values)
    // Trocar para uma variação que NÃO grava apaga o texto. Sem isto, quem digitou "Ana" e depois
    // escolheu "Com gravação: Não" levaria o texto para o pedido — e a Adri gravaria o que a cliente
    // desistiu de pedir. O campo some da tela; o estado não pode sobreviver a ele.
    if (!hasEngraving(findVariant(product.variants, values)?.option_values)) setEngravingText('')
    onVariantChange?.(findVariant(product.variants, values))
  }

  const add = (taken: readonly TakenAddon[] = []) => {
    // A recusa da gravação vem ANTES do esgotado: dizer "essa combinação está indisponível" para
    // quem só passou do limite de caracteres manda a cliente procurar o defeito no lugar errado.
    if (refusal) {
      toast.error(refusal)
      return
    }
    if (!canAdd) {
      toast.error(
        sellableGrid
          ? 'Essa combinação está indisponível. Escolha outra.'
          : 'Esta joia está esgotada.',
      )
      return
    }
    const input =
      sellableGrid && variant
        ? {
            variantId: variant.id,
            variantLabel: variantLabel(product.options, variant.option_values),
            optionValues: variant.option_values,
            unitPrice: variant.price!,
          }
        : undefined
    // Só de espaços é vazio (MAT-03): senão " " viraria uma linha separada no carrinho e um pedido
    // de gravação em branco na bancada.
    const engravingText = engravingEnabled ? normalizeEngraving(engraving) : null
    const entries: CartEntry[] = [
      { product, variant: input, engravingText, quantity: qty },
      ...taken.map((t): CartEntry => ({
        product: t.product,
        variant: t.variant
          ? {
              variantId: t.variant.id,
              variantLabel: variantLabel(t.product.options, t.variant.option_values),
              optionValues: t.variant.option_values,
              unitPrice: t.variant.price!,
            }
          : undefined,
        engravingText: t.engraving,
        quantity: 1,
        accompanies: { mainProductId: product.id, listId: t.listId },
      })),
    ]
    addItems(entries)
    // Feature 61 · EVT-05: UM evento com todas as peças e as quantidades adicionadas — o principal
    // uma vez, com a quantidade dele, e cada adicional com 1 e a lista de origem do bloco.
    track(
      addToCartEvent({
        items: [
          productItem(product, { price, variant: input?.variantLabel ?? null, quantity: qty }),
          ...taken.map((t, i) => ({
            ...productItem(t.product, {
              price: t.price,
              variant: t.variant ? variantLabel(t.product.options, t.variant.option_values) : null,
              quantity: 1,
              index: i,
            }),
            list_id: BUY_TOGETHER_LIST.id,
            list_name: BUY_TOGETHER_LIST.name,
          })),
        ],
      }),
    )

    // A confirmação é a PRÓPRIA gaveta, e não um aviso no canto. O toast dizia "adicionado" e pedia
    // um segundo toque em "Ver carrinho" — e na página do produto o celular não tem a aba do
    // carrinho (`ownsBottomBar`), então o aviso era o único caminho até a sacola e sumia sozinho.
    // A gaveta mostra a linha recém-entrada, o subtotal e o caminho para o checkout de uma vez.
    useCartUiStore.getState().openCart()
  }

  return {
    qty,
    setQty: next => setQty(Math.max(1, next)),
    selected,
    select,
    variant,
    sellableGrid,
    price,
    variantLabel: variant ? variantLabel(product.options, variant.option_values) : null,
    savings: savingsOf(product, price),
    stock: stockLineOf(product, variant),
    canAdd,
    add,
    engraving,
    setEngraving: setEngravingText,
    engravingEnabled,
    engravingLimit: limit,
    engravingRefusal: refusal,
  }
}
