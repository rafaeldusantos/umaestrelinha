// Validação do produto no submit (PFM-11) — função pura sobre o estado INTEIRO.
//
// Por que não pode ser `required` de input, e por que isso não é preferência: o `Tabs` do Radix
// **desmonta** o conteúdo da aba inativa. O `required` do preço vive dentro de
// `TabsContent value="precos"`, então salvar a partir de qualquer outra aba nunca o vê — é o
// defeito 10, e a alternativa "validar por aba montada" é estruturalmente impossível.
//
// Sendo pura e sobre o objeto inteiro, a validação não sabe nem se importa qual aba está aberta.

import { MATERIAL_KINDS } from '@estrelinha/core/material'
import type { ProductFormState } from './useProductForm'

/** As 5 abas do formulário depois da T25. `variacoes` deixou de existir. */
export type TabId = 'geral' | 'midia' | 'precos' | 'seo' | 'relacionados'

export const TAB_IDS: readonly TabId[] = ['geral', 'midia', 'precos', 'seo', 'relacionados']

/**
 * `error` bloqueia *Salvar e publicar*. `warning` é informação — a vitrine fica estranha, mas o
 * dado não está inválido, e transformar aviso em bloqueio é o caminho mais curto para o admin
 * aprender a ignorar mensagens.
 */
export type IssueSeverity = 'error' | 'warning'

export interface FieldIssue {
  /** Caminho do campo, para o foco de PFM-11 AC 3: `price`, `variants.2.price`. */
  field: string
  tab: TabId
  message: string
  severity: IssueSeverity
  /** Linhas da grade envolvidas. O SKU duplicado aponta as **duas**, não uma. */
  rows?: number[]
}

/** Uma linha da grade é vendável quando está ativa e tem preço — a mesma regra de `priceRange`. */
const isSellable = (v: { is_active: boolean; price: number | null }) =>
  v.is_active && v.price !== null && v.price !== undefined

export const validateProduct = (form: ProductFormState): FieldIssue[] => {
  const issues: FieldIssue[] = []

  // --- Geral ---------------------------------------------------------------------------------
  if (form.name.trim() === '') {
    issues.push({
      field: 'name',
      tab: 'geral',
      message: 'O nome do produto é obrigatório.',
      severity: 'error',
    })
  }

  // --- Material afetivo (feature 22) ----------------------------------------------------------
  //
  // Repare no que NÃO está aqui: exigir material sem marcar nenhum tipo **não** é erro. É a peça de
  // material livre, cuja escolha acontece no WhatsApp — bloquear o save ali obrigaria a dona a
  // inventar um material para conseguir publicar.
  //
  // O que é erro é o que o banco recusaria: um limite fora de 1..200 volta `check_violation` como
  // "erro ao salvar produto", sem dizer qual campo. O `check` continua existindo — esta validação é
  // a que produz mensagem acionável antes da viagem.
  if (
    form.engraving_max_chars !== null &&
    (!Number.isInteger(form.engraving_max_chars) ||
      form.engraving_max_chars < 1 ||
      form.engraving_max_chars > 200)
  ) {
    issues.push({
      field: 'engraving_max_chars',
      tab: 'geral',
      message: 'O limite de caracteres da gravação precisa ser um número inteiro entre 1 e 200.',
      severity: 'error',
    })
  }

  const materiaisInvalidos = form.material_kinds.filter(
    kind => !(MATERIAL_KINDS as readonly string[]).includes(kind),
  )
  if (materiaisInvalidos.length > 0) {
    issues.push({
      field: 'material_kinds',
      tab: 'geral',
      message: `Material desconhecido: ${materiaisInvalidos.join(', ')}.`,
      severity: 'error',
    })
  }

  // --- Preços & variações --------------------------------------------------------------------
  const hasSellableGrid = form.options.length > 0 && form.variants.some(isSellable)

  // Com grade, `products.base_price` é mantido pelo trigger `sync_product_base_price` como o menor
  // preço ativo (A14) — quem cobra é a linha. Exigir do admin um número que o banco sobrescreve
  // seria erro falso. Sem grade, este é o preço cobrado, e zero é venda de graça.
  if (!hasSellableGrid && !(form.price > 0)) {
    issues.push({
      field: 'price',
      tab: 'precos',
      message: 'Defina o preço do produto, ou cadastre uma variação com preço.',
      severity: 'error',
    })
  }

  // A vitrine risca o `compare_price` e calcula o desconto a partir dele. Igual ou menor que o
  // preço de venda produz desconto zero ou negativo na tela.
  if (form.compare_price > 0 && form.compare_price <= form.price) {
    issues.push({
      field: 'compare_price',
      tab: 'precos',
      message: 'O preço "de" deveria ser maior que o preço de venda — a vitrine mostraria um desconto negativo.',
      severity: 'warning',
    })
  }

  // PFM-08 AC 11: linha ativa sem preço não entra na loja. O servidor recusaria o pagamento dela
  // com 422 (`VARIANT_WITHOUT_PRICE`), então publicar assim é vender um beco sem saída.
  form.variants.forEach((variant, index) => {
    if (variant.is_active && (variant.price === null || variant.price === undefined)) {
      issues.push({
        field: `variants.${index}.price`,
        tab: 'precos',
        message: 'Sem preço a variação não entra na loja.',
        severity: 'error',
        rows: [index],
      })
    }
  })

  // `product_variants.sku` é UNIQUE global no banco. Duas linhas iguais estouram no insert com
  // erro cru; apontar as duas antes é o que o admin consegue consertar.
  const skuRows = new Map<string, number[]>()
  form.variants.forEach((variant, index) => {
    const sku = (variant.sku ?? '').trim()
    if (sku === '') return
    const rows = skuRows.get(sku) ?? []
    rows.push(index)
    skuRows.set(sku, rows)
  })
  for (const [sku, rows] of skuRows) {
    if (rows.length > 1) {
      issues.push({
        field: `variants.${rows[0]}.sku`,
        tab: 'precos',
        message: `O SKU "${sku}" está repetido em ${rows.length} linhas da grade.`,
        severity: 'error',
        rows,
      })
    }
  }

  return issues
}

/**
 * Quantos **erros** cada aba tem — é o que alimenta o badge de pendência (PFM-11 AC 2).
 *
 * Avisos ficam de fora de propósito: um badge vermelho que não bloqueia nada ensina o admin a
 * ignorar badges.
 */
export const errorsByTab = (issues: readonly FieldIssue[]): Record<TabId, number> => {
  const counts = Object.fromEntries(TAB_IDS.map(tab => [tab, 0])) as Record<TabId, number>
  for (const issue of issues) {
    if (issue.severity === 'error') counts[issue.tab] += 1
  }
  return counts
}

/** Há erro que bloqueia *Salvar e publicar*? Aviso não bloqueia (PFM-11 / P1.7 AC 13). */
export const hasBlockingErrors = (issues: readonly FieldIssue[]): boolean =>
  issues.some(issue => issue.severity === 'error')

/**
 * O primeiro erro de uma aba, na ordem em que `validateProduct` os produz — é para onde o clique no
 * badge leva o foco (PFM-11 AC 3).
 */
export const firstErrorOfTab = (
  issues: readonly FieldIssue[],
  tab: TabId,
): FieldIssue | null =>
  issues.find(issue => issue.tab === tab && issue.severity === 'error') ?? null
