// A vigência escrita em uma linha (feature 18 / T4, DSC-06 AC 1).
//
// A função nasceu privada dentro de `AdminPromotionsPage`. Sai de lá inteira porque as duas listagens
// do grupo `Descontos` mostram o MESMO dado — duas datas nullable — e falavam línguas diferentes: a
// promoção dizia `Sem fim` e mostrava a faixa; o cupom dizia `Sem prazo` e mostrava só o fim.
//
// Mora em `shared/lib` e não numa das duas features porque nenhuma das duas é dona: uma listagem não
// pode importar do slice da outra, e duplicar era exatamente o problema.

import { shortIsoAsDate } from './dateOnly'

/** `Sem fim` · `até 30/09` · `01/08 – 31/08` · `a partir de 01/08`. */
export const validityLabel = (
  validFrom: string | null | undefined,
  validUntil: string | null | undefined,
): string => {
  if (validFrom && validUntil) return `${shortIsoAsDate(validFrom)} – ${shortIsoAsDate(validUntil)}`
  if (validUntil) return `até ${shortIsoAsDate(validUntil)}`
  if (validFrom) return `a partir de ${shortIsoAsDate(validFrom)}`
  return 'Sem fim'
}
