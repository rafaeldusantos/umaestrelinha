// API pública inalterada: `@nanapin/core/formatters` segue exportando os dois nomes, para que o
// split em `price.ts` / `date.ts` não toque em nenhum call site.
export { formatPrice } from './price'
export { formatRelativeDate } from './date'

// Máscaras de CAMPO DE ENTRADA (feature 07 / T8, requisito PFM-10).
//
// `formatPrice` é para EXIBIR (`R$ 1.234,56`, símbolo embutido); `formatBRL` é para o VALOR DENTRO
// de um input (`1.234,56`, símbolo em slot fixo ao lado). Os dois convivem de propósito.
export { parseBRL, formatBRL } from './currency'
export {
  parseGrams,
  formatGrams,
  parseCm,
  formatCm,
  parsePercent,
  formatPercent,
} from './units'
