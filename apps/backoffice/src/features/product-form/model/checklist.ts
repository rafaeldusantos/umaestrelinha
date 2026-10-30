// Checklist "Pronto para publicar" (PFM-14) e margem de lucro (PFM-12) — funções puras.
//
// A diferença entre isto e `validateProduct`: a validação diz "este dado está **inválido**" e
// bloqueia qualquer save. O checklist diz "falta isto para o produto ficar **bom na loja**" e
// bloqueia o "Ativar" e o salvar de produto ativo — rascunho continua salvando (P1.7 AC 13). Um produto
// sem imagem não está errado; só não deveria ir para a vitrine assim.

import type { TabId } from './validateProduct'
import type { ProductFormState } from './useProductForm'

export interface ChecklistItem {
  id: 'name' | 'category' | 'image' | 'weight' | 'grid' | 'seo'
  label: string
  ok: boolean
  /** Para onde o atalho leva quando o item está pendente (PFM-14: "cada um com atalho"). */
  focusField: string
  /**
   * A aba do campo, ou `null` quando o campo não mora em aba nenhuma (feature 85, MOD-06): as
   * imagens saíram da aba Mídia para o modal Mídia, e quem decide como chegar lá é a página.
   */
  tab: TabId | null
  /** Por que está pendente. `null` quando `ok`. */
  hint: string | null
  /**
   * Feature 84 (`SIA-03`): só item bloqueante conta para `canPublish` e `pendingCount`. O de SEO é
   * informativo — a loja deriva título e descrição do nome e da descrição (`productPageMeta`), então
   * SEO vazio não impede nada.
   */
  blocking: boolean
}

/** Uma linha vendável: ativa e com preço — a mesma regra de `priceRange` e de `resolveItemPrice`. */
const isSellable = (v: { is_active: boolean; price: number | null }) =>
  v.is_active && v.price !== null && v.price !== undefined

/**
 * O rótulo do item de SEO pelo estado dos dois campos (`SIA-03`). Espaço só conta como vazio.
 */
const seoLabel = (form: ProductFormState): string => {
  const temTitulo = form.seo_title.trim() !== ''
  const temDescricao = form.seo_description.trim() !== ''
  if (temTitulo && temDescricao) return 'SEO curado'
  if (temTitulo || temDescricao) return 'SEO parcial — o resto vem do nome e da descrição'
  return 'SEO automático (nome e descrição)'
}

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
      blocking: true,
      label: 'Nome do produto',
      ok: form.name.trim() !== '',
      focusField: 'name',
      tab: 'geral',
      hint: form.name.trim() === '' ? 'Preencha o nome.' : null,
    },
    {
      id: 'category',
      blocking: true,
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
      blocking: true,
      label: 'Ao menos uma imagem',
      ok: form.images.length > 0,
      focusField: 'images',
      // MOD-06: as imagens não moram mais numa aba. A página abre o modal Mídia.
      tab: null,
      hint: form.images.length === 0 ? 'Envie ao menos uma imagem.' : null,
    },
    {
      id: 'weight',
      blocking: true,
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
      blocking: true,
      label: 'Grade sem variação pendente',
      ok: gridOk,
      focusField: 'variants',
      tab: 'precos',
      hint: gridHint,
    },
    {
      id: 'seo',
      label: seoLabel(form),
      blocking: false,
      ok: true,
      focusField: 'seo_title',
      tab: 'seo',
      hint: null,
    },
  ]
}

/** Itens bloqueantes pendentes barram o "Ativar"; salvar rascunho segue liberado (AC 13). */
export const canPublish = (items: readonly ChecklistItem[]): boolean =>
  items.every(i => !i.blocking || i.ok)

export const pendingCount = (items: readonly ChecklistItem[]): number =>
  items.filter(i => i.blocking && !i.ok).length

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
