// Checklist "Pronto para publicar" (PFM-14) e margem de lucro (PFM-12) — funções puras.
//
// A diferença entre isto e `validateProduct`: a validação diz "este dado está **inválido**" e
// bloqueia qualquer save. O checklist diz "falta isto para o produto ficar **bom na loja**" e
// bloqueia só o *Salvar e publicar* — *Salvar rascunho* continua liberado (P1.7 AC 13). Um produto
// sem imagem não está errado; só não deveria ir para a vitrine assim.

import type { TabId } from './validateProduct'
import type { ProductFormState } from './useProductForm'

export interface ChecklistItem {
  id: 'name' | 'category' | 'image' | 'weight' | 'grid' | 'seo'
  label: string
  ok: boolean
  /** Para onde o atalho leva quando o item está pendente (PFM-14: "cada um com atalho"). */
  focusField: string
  tab: TabId
  /** Por que está pendente. `null` quando `ok`. */
  hint: string | null
}

/** Uma linha vendável: ativa e com preço — a mesma regra de `priceRange` e de `resolveItemPrice`. */
const isSellable = (v: { is_active: boolean; price: number | null }) =>
  v.is_active && v.price !== null && v.price !== undefined

/**
 * Os 6 itens de P1.7 AC 12, sempre na mesma ordem — o checklist é lido de cima para baixo e itens
 * que trocam de lugar entre renders viram ruído.
 */
export const buildChecklist = (form: ProductFormState): ChecklistItem[] => {
  const hasGrid = form.options.length > 0
  const sellableRows = form.variants.filter(isSellable).length
  const activeWithoutPrice = form.variants.filter(
    v => v.is_active && (v.price === null || v.price === undefined),
  ).length

  // Item "grade": sem eixo, não há grade e o item passa (o produto é simples). Com eixo, exige
  // pelo menos uma linha vendável — é o que cobre o edge case "tem variações mas TODAS pausadas",
  // que sem esta metade passaria batido, porque uma grade toda pausada não tem nenhuma linha
  // "ativa sem preço" para reclamar.
  const gridOk = !hasGrid || (sellableRows > 0 && activeWithoutPrice === 0)
  const gridHint = !hasGrid
    ? null
    : activeWithoutPrice > 0
      ? `${activeWithoutPrice} variação(ões) ativa(s) sem preço.`
      : sellableRows === 0
        ? 'Nenhuma variação ativa com preço — o produto não tem o que vender.'
        : null

  return [
    {
      id: 'name',
      label: 'Nome do produto',
      ok: form.name.trim() !== '',
      focusField: 'name',
      tab: 'geral',
      hint: form.name.trim() === '' ? 'Preencha o nome.' : null,
    },
    {
      id: 'category',
      label: 'Ao menos uma categoria',
      // `category_ids` é a verdade (N:N). `category_id` entra na conta porque até a T31 a aba Geral
      // ainda usa o Select único — sem isso o checklist acusaria pendência num produto categorizado.
      ok: form.category_ids.length > 0 || form.category_id !== '',
      focusField: 'category_ids',
      tab: 'geral',
      hint:
        form.category_ids.length > 0 || form.category_id !== ''
          ? null
          : 'Escolha ao menos uma categoria.',
    },
    {
      id: 'image',
      label: 'Ao menos uma imagem',
      ok: form.images.length > 0,
      focusField: 'images',
      tab: 'midia',
      hint: form.images.length === 0 ? 'Envie ao menos uma imagem.' : null,
    },
    {
      id: 'weight',
      label: 'Peso preenchido',
      // Peso é o que o Melhor Envio cota. Zero ou vazio faz a cotação cair no fallback e o frete
      // sai errado com cara de certo (SHP-02).
      ok: form.weight_kg > 0,
      focusField: 'weight_kg',
      tab: 'precos',
      hint: form.weight_kg > 0 ? null : 'Informe o peso — sem ele o frete sai pelo fallback.',
    },
    {
      id: 'grid',
      label: 'Grade sem variação pendente',
      ok: gridOk,
      focusField: 'variants',
      tab: 'precos',
      hint: gridHint,
    },
    {
      id: 'seo',
      label: 'SEO preenchido',
      ok: form.seo_title.trim() !== '' && form.seo_description.trim() !== '',
      focusField: 'seo_title',
      tab: 'seo',
      hint:
        form.seo_title.trim() === '' || form.seo_description.trim() === ''
          ? 'Preencha título e descrição de SEO.'
          : null,
    },
  ]
}

/** Itens pendentes bloqueiam *Salvar e publicar*; *Salvar rascunho* segue liberado (AC 13). */
export const canPublish = (items: readonly ChecklistItem[]): boolean => items.every(i => i.ok)

export const pendingCount = (items: readonly ChecklistItem[]): number =>
  items.filter(i => !i.ok).length

export interface Margin {
  /** Percentual com uma casa: `((price - cost) / price) * 100`. */
  percent: number
  /** Lucro por unidade, em reais. */
  profit: number
}

/**
 * A margem — ou `null` quando não há margem que faça sentido (PFM-12).
 *
 * O defeito 11 era exatamente isto: a página guardava só `cost_price > 0` e dividia por
 * `form.price`. Com preço 0 e custo preenchido, `(0 - 8) / 0 * 100` = `-Infinity`, que ia direto
 * para a tela. `price > 0` é a guarda que faltava.
 */
export const computeMargin = (price: number, cost: number): Margin | null => {
  if (!(price > 0) || !(cost > 0)) return null
  if (!Number.isFinite(price) || !Number.isFinite(cost)) return null
  return { percent: ((price - cost) / price) * 100, profit: price - cost }
}
