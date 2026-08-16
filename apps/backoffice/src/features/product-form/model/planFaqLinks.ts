import { faqOverrideOf } from '@estrelinha/core/faq'

/**
 * O plano dos vínculos de pergunta do produto — `FAQ-16`, `FAQ-17`, `FAQ-37`.
 *
 * Espelho exato de `planCategoryLinks`, com um campo a mais: a **resposta própria**. Mesmo formato de
 * propósito — o `persistProductRelations` grava as duas tabelas no mesmo bloco, e duas formas de
 * plano ali dentro seriam duas maneiras de errar a mesma coisa.
 */

/** O que a aba mantém em estado, por vínculo. */
export interface ProductFaqSelection {
  faq_id: string
  /** O texto que a dona digitou para ESTE produto, se digitou. */
  answer_override?: string | null
  /** A resposta padrão da biblioteca, para decidir se o override é redundante. */
  defaultAnswer?: string | null
}

export interface ProductFaqLinkRow {
  faq_id: string
  position: number
  answer_override: string | null
}

export interface FaqLinkPlan {
  toUpsert: ProductFaqLinkRow[]
  /** `faq_id` dos vínculos que a dona removeu. */
  toDelete: string[]
}

/**
 * @param selected As perguntas na ordem em que a dona as deixou.
 * @param saved    O que está no banco hoje.
 */
export const planFaqLinks = (
  selected: readonly ProductFaqSelection[],
  saved: readonly string[],
): FaqLinkPlan => {
  // Duplicata na seleção viraria violação da PK composta `(product_id, faq_id)` — o mesmo erro que
  // derrubou a primeira execução real do importador, com 2.500 linhas já gravadas.
  const unique: ProductFaqSelection[] = []
  for (const item of selected) {
    if (!item?.faq_id) continue
    if (unique.some(u => u.faq_id === item.faq_id)) continue
    unique.push(item)
  }

  return {
    // **Todos** os presentes vão no upsert, não só os novos: reordenar muda a `position` de linhas
    // que já existiam, e sem regravá-las a loja mostraria a ordem antiga.
    toUpsert: unique.map((item, position) => ({
      faq_id: item.faq_id,
      position,
      // `faqOverrideOf` devolve `null` quando o texto é igual ao padrão. Gravar o idêntico daria dois
      // donos do mesmo texto: editar a biblioteca deixaria de alcançar este produto, e nada na tela
      // diria por quê.
      answer_override: faqOverrideOf(item.answer_override, item.defaultAnswer),
    })),
    toDelete: saved.filter(id => !unique.some(u => u.faq_id === id)),
  }
}
