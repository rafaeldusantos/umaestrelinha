// O contrato do formulário de promoção (feature 17).
//
// Duas coisas moram aqui e nada mais: o `zod` que decide o que a tela aceita, e a tradução do
// formulário para o payload de `upsert_promotion`.
//
// Por que `zod` E os `check`/trigger do banco: o banco recusa `min_qty < 2` e `percent` fora de 1–90
// de qualquer jeito, mas a mensagem que ele devolve é uma string de Postgres
// (`violates check constraint "promotion_tiers_min_qty_check"`) sem campo associado. A pessoa que
// preenche precisa saber QUAL linha está errada — e isso só o formulário sabe dizer. O banco é a rede;
// a tela é a explicação.

import { z } from 'zod'
import type { PromotionWriteInput } from '@estrelinha/core/hooks/usePromotions'
import { dateOnlyFromIso, isoFromDateOnly } from '@/shared/lib/dateOnly'

export const SCOPE_WITHOUT_CATEGORY =
  'Escolha ao menos uma categoria — sem vínculo a promoção não desconta de ninguém.'

/** Texto da AC 3, ao pé da letra. */
export const MIN_QTY_TOO_LOW = 'A faixa precisa começar em 2 unidades ou mais'
export const NO_TIERS = 'Adicione ao menos uma faixa'
export const UNIT_PRICE_NOT_POSITIVE = 'O preço por unidade precisa ser maior que zero'
export const PERCENT_OUT_OF_RANGE = 'O percentual precisa estar entre 1 e 90'

/** `Já existe uma faixa a partir de 5 unidades` — a AC 4 pede a quantidade NOMEADA. */
export const duplicateMinQty = (minQty: number) =>
  `Já existe uma faixa a partir de ${minQty} unidades`

export const promotionSchema = z
  .object({
    name: z.string().trim().min(2, 'Dê um nome à promoção'),
    scope: z.enum(['all', 'categories']),
    discount_kind: z.enum(['unit_price', 'percent']),
    category_ids: z.array(z.string()).default([]),
    tiers: z
      .array(
        z.object({
          // `min_qty >= 2` também é `check` no banco. A mensagem vem daqui porque a do Postgres é
          // `violates check constraint "promotion_tiers_min_qty_check"` — verdadeira e inútil para
          // quem está preenchendo a terceira linha de um repetidor.
          min_qty: z.coerce.number().int().min(2, MIN_QTY_TOO_LOW),
          value: z.coerce.number(),
        }),
      )
      .min(1, NO_TIERS),
    valid_from: z.string().optional().or(z.literal('')),
    valid_until: z.string().optional().or(z.literal('')),
    stacks_with_coupon: z.boolean().default(false),
    is_kit_showcase: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .superRefine((values, ctx) => {
    // Escopo `categories` sem nenhuma categoria é gravável no banco de propósito (o `on delete
    // cascade` produz esse estado sozinho), mas escolher salvar assim de dentro do editor é sempre
    // engano: a promoção não descontaria de ninguém e a tela não teria como dizer por quê.
    if (values.scope === 'categories' && values.category_ids.length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['category_ids'], message: SCOPE_WITHOUT_CATEGORY })
    }

    // O intervalo válido de `value` depende de `discount_kind`, que é da promoção e não da faixa —
    // exatamente por isso o banco usa o trigger `validate_promotion_tier()` em vez de um `check`.
    // Aqui a dependência é trivial, e a mensagem sai POR CAMPO.
    const seen = new Map<number, number>()
    values.tiers.forEach((tier, index) => {
      const minQty = Number(tier.min_qty)
      const value = Number(tier.value)

      const first = seen.get(minQty)
      if (first === undefined) seen.set(minQty, index)
      else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers', index, 'min_qty'],
          message: duplicateMinQty(minQty),
        })
      }

      if (values.discount_kind === 'unit_price' && !(value > 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers', index, 'value'],
          message: UNIT_PRICE_NOT_POSITIVE,
        })
      }
      if (values.discount_kind === 'percent' && !(value >= 1 && value <= 90)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tiers', index, 'value'],
          message: PERCENT_OUT_OF_RANGE,
        })
      }
    })
  })

export type PromotionFormValues = z.input<typeof promotionSchema>

export const emptyPromotionForm: PromotionFormValues = {
  name: '',
  scope: 'categories',
  discount_kind: 'unit_price',
  category_ids: [],
  // Uma linha vazia, não zero linhas: o repetidor abre mostrando o que se preenche. Campos em `''`
  // (e não em `0`) porque `0` obrigaria a apagar um número antes de digitar o certo — e porque a
  // mensagem de erro de `0` já diz exatamente o que falta.
  tiers: [{ min_qty: '', value: '' }],
  valid_from: '',
  valid_until: '',
  stacks_with_coupon: false,
  is_kit_showcase: false,
  active: true,
}

/**
 * A tradução dia ⇄ ISO saiu daqui na feature 18 (DSC-05 AC 5).
 *
 * Ela existia em DUAS versões discordantes — esta, por componentes locais, e a de
 * `AdminCouponsPage`, cortando a string (componentes UTC). Agora é `shared/lib/dateOnly`, e as duas
 * telas de Descontos leem e gravam pelo mesmo módulo. Os nomes seguem exportados porque a suíte da
 * feature 17 os cita.
 */
export const toDateInput = dateOnlyFromIso
const fromDateInput = isoFromDateOnly

/**
 * O payload da RPC.
 *
 * `tiers` e `category_ids` vão **sempre presentes** — este é o caminho do editor, que conhece a
 * promoção inteira, e presente significa "substitua". Quem manda patch parcial (a ação de pausar da
 * listagem) chama `useUpdatePromotion` direto, sem passar por aqui: é a chave AUSENTE que preserva o
 * que está gravado.
 *
 * Escopo `all` manda `category_ids: []` para limpar vínculos herdados de quando o escopo era por
 * categoria — deixá-los gravados faria a view continuar listando produtos de uma regra que agora vale
 * para todos, e a volta ao escopo antigo ressuscitaria uma seleção que a pessoa não vê mais.
 */
export const toWriteInput = (values: PromotionFormValues): Omit<PromotionWriteInput, 'id'> => ({
  name: values.name.trim(),
  scope: values.scope,
  discount_kind: values.discount_kind,
  category_ids: values.scope === 'categories' ? values.category_ids ?? [] : [],
  tiers: (values.tiers ?? []).map(tier => ({
    min_qty: Number(tier.min_qty),
    value: Number(tier.value),
  })),
  valid_from: fromDateInput(values.valid_from ?? ''),
  valid_until: fromDateInput(values.valid_until ?? ''),
  stacks_with_coupon: values.stacks_with_coupon ?? false,
  is_kit_showcase: values.is_kit_showcase ?? false,
  active: values.active ?? true,
})
