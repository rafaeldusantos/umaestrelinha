// Parsing e formatação de moeda para CAMPO DE ENTRADA.
//
// Não confundir com `formatPrice` (irmão em `price.ts`), que é para EXIBIÇÃO e emite `R$ 1.234,56`
// com o símbolo embutido. Aqui o símbolo NÃO entra na string: na UI ele é um slot fixo ao lado do
// input, para que o cursor nunca caminhe por cima dele.

/**
 * Interpreta o que uma pessoa digita ou cola num campo de dinheiro.
 *
 * Aceita `R$ 1.234,56`, `1.234,56`, `1234,56` e `1234.56` — todos viram `1234.56`.
 * Devolve `null` quando não há número: **nunca `NaN`**. `NaN` num campo controlado se propaga
 * silenciosamente até o banco; `null` obriga o chamador a decidir o que fazer.
 *
 * ## A ambiguidade de `1.234`, e como ela é resolvida
 *
 * Sem vírgula, um ponto pode ser separador de milhar (pt-BR: `1.234` = mil duzentos e trinta e
 * quatro) ou decimal (formato de máquina: `1234.56`). Não dá para acertar sempre — a regra é o
 * **tamanho do último grupo**:
 *
 * - `1.234`     → grupo final de 3 dígitos → milhar  → `1234`
 * - `1234.56`   → grupo final de 2 dígitos → decimal → `1234.56`
 * - `1.234.567` → grupo final de 3 dígitos → milhar  → `1234567`
 *
 * É a leitura que acerta os dois casos reais: colar de planilha em pt-BR e colar de um export
 * técnico. Com vírgula presente, não há ambiguidade nenhuma — vírgula é o decimal e ponto é milhar.
 */
export const parseBRL = (input: unknown): number | null => {
  if (typeof input === 'number') return Number.isFinite(input) ? input : null
  if (typeof input !== 'string') return null

  const negative = /-/.test(input)
  // Só dígitos, ponto e vírgula sobrevivem: `R$`, espaço, NBSP e qualquer outro ruído somem.
  const cleaned = input.replace(/[^\d.,]/g, '')
  if (!/\d/.test(cleaned)) return null

  let normalized: string

  if (cleaned.includes(',')) {
    // Vírgula manda: é o decimal. Todo ponto é milhar.
    const [intPart, ...rest] = cleaned.split(',')
    normalized = `${intPart.replace(/\./g, '')}.${rest.join('').replace(/\./g, '')}`
  } else if (cleaned.includes('.')) {
    const groups = cleaned.split('.')
    const last = groups[groups.length - 1]
    normalized =
      last.length === 3
        ? groups.join('') // milhar
        : `${groups.slice(0, -1).join('')}.${last}` // decimal
  } else {
    normalized = cleaned
  }

  const value = Number(normalized)
  if (!Number.isFinite(value)) return null
  return negative ? -value : value
}

/**
 * `1234.56` → `1.234,56`. **Sem** o `R$` — ele é slot fixo na UI.
 * Sempre com 2 casas, para que o campo não "pule" enquanto se digita.
 */
export const formatBRL = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}
