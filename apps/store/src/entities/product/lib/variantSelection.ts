// Casamento entre os eixos escolhidos na loja e a linha da grade que será vendida (PST-05, PST-08,
// PST-10).
//
// Isto é domínio da **loja**, não de `@estrelinha/core`: são as regras de qual seletor aparece, o que
// aparece habilitado e qual combinação começa selecionada. `core/pricing` responde "quanto custa" e
// "esta linha pode ser vendida"; este módulo responde "qual linha o cliente escolheu".
//
// Tudo aqui é função pura, de propósito: o que precisa de prova é a regra, não o DOM.

import { isVariantAvailable } from '@estrelinha/core/pricing'
import type {
  OptionValues,
  ProductOption,
  ProductVariant,
  StockPolicy,
} from '@estrelinha/supabase/types'

/** O mínimo que uma superfície precisa saber do produto para montar seletores. */
export interface GridProduct {
  options: ProductOption[]
  variants: ProductVariant[]
  stock_policy: StockPolicy
}

/** Quantos eixos cada superfície mostra (A7). O card não aperta; a página aguenta os três. */
export const CARD_MAX_AXES = 2
export const PAGE_MAX_AXES = 3

/**
 * Vagas da placa de cor do card (`COR-12`). Quatro a partir de `md`, três abaixo.
 *
 * Não é preferência: em 220px — a largura real do card no carrossel — quatro vagas medem 160px e o
 * botão "+" começa em 168px a partir da esquerda, então elas SOBREPÕEM. Três medem 122px e sobram
 * 32px. Com mediana de 3 cores no catálogo real, o mobile mostra todas as cores em 305 dos 385
 * produtos que têm o eixo.
 */
export const COLOR_SLOTS_MOBILE = 3
export const COLOR_SLOTS_DESKTOP = 4

/**
 * Os eixos na ordem de `position`. Empate resolve por `name`, para a ordem ser estável entre
 * renders — dois eixos com `position: 0` são um cadastro possível, e um seletor que troca de lugar
 * a cada render é pior que uma ordem arbitrária mas fixa.
 */
export const orderedOptions = (options: readonly ProductOption[]): ProductOption[] =>
  [...options]
    .filter(o => o.values.length > 0)
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))

/** Os eixos que esta superfície mostra. O resto do produto continua existindo — só não cabe aqui. */
export const visibleOptions = (
  options: readonly ProductOption[],
  max: number,
): ProductOption[] => orderedOptions(options).slice(0, max)

/**
 * O card não consegue fechar a escolha de um produto de 3 eixos com 2 seletores — mostrar 2 e
 * adicionar ao carrinho escolheria o terceiro eixo pelo cliente. Então ele leva para a página
 * (PST-05 AC 2).
 */
export const needsProductPage = (options: readonly ProductOption[]): boolean =>
  orderedOptions(options).length > CARD_MAX_AXES

/**
 * O produto é vendido **por variação**?
 *
 * Exige as duas metades: eixo cadastrado **e** linha vendável (ativa e com preço). É a regra de
 * PST-10 — variação ativa com `options` vazio é o estado de uma grade meio-cadastrada, e a loja
 * trata o produto como simples (`base_price`) em vez de exigir uma escolha que não tem seletor.
 *
 * É a mesma condição de `priceRange`, de `resolveItemPrice` e da guarda do checkout: uma grade só
 * de linhas pausadas ou sem preço não é vendável por variação.
 */
export const hasSellableGrid = (product: {
  options: readonly ProductOption[]
  variants: readonly Pick<ProductVariant, 'is_active' | 'price'>[]
}): boolean =>
  orderedOptions(product.options).length > 0 &&
  product.variants.some(v => v.is_active && v.price !== null && v.price !== undefined)

/**
 * A variação cujos `option_values` casam com **todos** os eixos escolhidos.
 *
 * Só compara os eixos presentes em `values`: uma escolha parcial (o card com 2 de 3 eixos) casaria
 * com várias linhas, e devolver a primeira seria escolher pelo cliente. Por isso o chamador só
 * chama isto com a seleção completa — `needsProductPage` é quem impede a parcial.
 */
export const findVariant = (
  variants: readonly ProductVariant[],
  values: OptionValues,
): ProductVariant | null => {
  const axes = Object.keys(values)
  if (axes.length === 0) return null
  return (
    variants.find(v => axes.every(axis => v.option_values?.[axis] === values[axis])) ?? null
  )
}

/**
 * Os valores de `axis` que ainda levam a alguma variação **disponível**, mantidas as outras
 * escolhas. É o que desabilita "5,5 cm" quando só o 5,5 cm fosco acabou (PST-08 / AC 16).
 *
 * `none` e `backorder` nunca esgotam, então nesses casos o filtro só derruba linha pausada e
 * combinação que não existe na grade.
 */
export const availableValuesFor = (
  product: GridProduct,
  axis: string,
  selected: OptionValues,
): Set<string> => {
  const others = Object.fromEntries(
    Object.entries(selected).filter(([key]) => key !== axis),
  ) as OptionValues

  const available = new Set<string>()
  for (const variant of product.variants) {
    if (!isVariantAvailable(variant, product.stock_policy)) continue
    const matchesOthers = Object.keys(others).every(
      key => variant.option_values?.[key] === others[key],
    )
    if (!matchesOthers) continue
    const value = variant.option_values?.[axis]
    if (typeof value === 'string' && value !== '') available.add(value)
  }
  return available
}

/**
 * A combinação que já vem selecionada: a primeira linha **disponível**, na ordem de `position` da
 * grade. Abrir a página com uma combinação esgotada obriga o cliente a descobrir sozinho qual
 * existe.
 *
 * Quando nenhuma está disponível (grade toda esgotada ou toda pausada), cai na primeira linha
 * existente para os seletores não abrirem vazios — a indisponibilidade aparece no CTA, que é onde
 * ela importa.
 */
export const initialSelection = (product: GridProduct, max: number): OptionValues => {
  const axes = visibleOptions(product.options, max).map(o => o.name)
  if (axes.length === 0) return {}

  const byPosition = [...product.variants].sort((a, b) => a.position - b.position)
  const covers = (variant: ProductVariant) =>
    axes.every(axis => typeof variant.option_values?.[axis] === 'string')
  const pick = (variant: ProductVariant): OptionValues =>
    Object.fromEntries(axes.map(axis => [axis, variant.option_values[axis]])) as OptionValues

  const firstAvailable = byPosition.find(
    v => covers(v) && isVariantAvailable(v, product.stock_policy),
  )
  if (firstAvailable) return pick(firstAvailable)

  const firstExisting = byPosition.find(covers)
  if (firstExisting) return pick(firstExisting)

  // Grade sem nenhuma linha que cubra os eixos: cai no primeiro valor declarado de cada eixo.
  return Object.fromEntries(
    visibleOptions(product.options, max).map(o => [o.name, o.values[0]]),
  ) as OptionValues
}

/** Uma vaga da placa de cor — o valor do eixo, a foto daquela cor e se ela é a escolhida. */
export interface ColorThumb {
  value: string
  /** `null` quando nenhuma variação daquela cor tem foto (`COR-15`). Nunca a foto de outra cor. */
  imageUrl: string | null
  active: boolean
}

/** O que a placa desenha: as vagas preenchidas e quantas cores ficaram de fora. */
export interface ColorPreview {
  thumbs: ColorThumb[]
  overflow: number
}

/**
 * O eixo de cor do produto, ou `null`.
 *
 * O casamento é pelo NOME do eixo, normalizado (`trim` + minúsculas), e é **igualdade exata a
 * "cor"** — não prefixo. Medido no catálogo real: 385 produtos têm o eixo `Cor`, e outros quatro
 * têm `Cor do quadrinho` / `Cor do quadro`, que são a cor de um acessório e não a da peça. Prefixo
 * os arrastaria para dentro da placa sem ninguém decidir isso.
 *
 * `orderedOptions` já descarta eixo sem valor, então o que sai daqui sempre tem ao menos um.
 */
export const colorAxis = (options: readonly ProductOption[]): ProductOption | null =>
  orderedOptions(options).find(o => o.name.trim().toLowerCase() === 'cor') ?? null

/**
 * A foto daquela cor: a primeira variação da cor, por `position`, que TENHA foto.
 *
 * Com dois eixos a mesma cor aparece em várias linhas (uma por tamanho) e nem todas trazem foto —
 * por isso a busca não para na primeira linha da cor, e sim na primeira COM imagem. Nenhuma com
 * foto devolve `null`: `COR-02` proíbe cair na capa do produto ou na foto de outra cor, porque três
 * cores mostrando a mesma imagem dizem à cliente que a cor não muda a peça.
 */
const colorImage = (
  variants: readonly ProductVariant[],
  axis: string,
  value: string,
): string | null =>
  [...variants]
    .sort((a, b) => a.position - b.position)
    .find(v => v.option_values?.[axis] === value && !!v.image_url)?.image_url ?? null

/**
 * As vagas da placa de cor do card (`COR-10`..`COR-15`), ou `null` quando não há placa.
 *
 * Não há placa em três casos, e os três são o caso comum do catálogo: produto sem grade vendável
 * (120 de 680), produto com grade e sem eixo de cor (175) e eixo de cor com um valor só — onde não
 * há escolha a mostrar.
 *
 * Quando as cores não cabem, a ÚLTIMA vaga vira contador: com `slots = 4` e cinco cores saem três
 * miniaturas e `overflow = 2`, não quatro e `+1`. O contador ocupa vaga, não se pendura ao lado.
 */
export const colorPreview = (
  product: GridProduct,
  selected: OptionValues,
  slots: number,
): ColorPreview | null => {
  if (!hasSellableGrid(product)) return null

  const axis = colorAxis(product.options)
  if (!axis || axis.values.length < 2) return null

  const shown = axis.values.length <= slots ? axis.values.length : slots - 1
  const chosen = selected[axis.name]

  return {
    thumbs: axis.values.slice(0, shown).map(value => ({
      value,
      imageUrl: colorImage(product.variants, axis.name, value),
      active: value === chosen,
    })),
    overflow: axis.values.length - shown,
  }
}

/**
 * A escolha atual pode ir para o carrinho?
 *
 * Produto sem grade vendável cai na disponibilidade de sempre (`stock_total`), que é decisão do
 * chamador; aqui só se responde pela grade.
 */
export const canAddSelection = (product: GridProduct, selected: OptionValues): boolean => {
  const variant = findVariant(product.variants, selected)
  if (!variant) return false
  if (variant.price === null || variant.price === undefined) return false
  return isVariantAvailable(variant, product.stock_policy)
}
