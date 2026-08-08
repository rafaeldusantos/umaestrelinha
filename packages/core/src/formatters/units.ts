// Unidades de logística e percentual, para CAMPO DE ENTRADA.
//
// A conversão de peso é a razão de este arquivo existir. O banco guarda `weight_kg numeric(6,3)`,
// mas um botton pesa 18 gramas — e digitar `0,018` num campo é convite a errar uma ordem de
// grandeza (0,18 kg = 180 g, dez vezes o peso real, direto na cotação do frete). A pessoa digita
// em GRAMAS; a conversão para kg acontece aqui e a tela mostra a equivalência.

import { parseBRL } from './currency'

/** Número digitado em qualquer notação pt-BR ou de máquina. `null` quando não há número. */
const parseNumber = (input: unknown): number | null => parseBRL(input)

// --- Peso: entrada em GRAMAS, persistência em KG -----------------------------------------------

/**
 * `'18'` → `0.018` kg. Arredonda para 3 casas, que é a precisão de `numeric(6,3)` no banco —
 * gravar mais casas do que a coluna aceita faria o valor lido de volta não bater com o digitado.
 */
export const parseGrams = (input: unknown): number | null => {
  const grams = parseNumber(input)
  if (grams === null) return null
  return Math.round(grams) / 1000
}

/**
 * `0.018` → `'18 g'`.
 *
 * O `Math.round` não é zelo excessivo: `0.018 * 1000` em ponto flutuante dá
 * `18.000000000000004`, e sem arredondar o campo exibiria isso.
 */
export const formatGrams = (kg: number | null | undefined): string => {
  if (kg === null || kg === undefined || !Number.isFinite(kg)) return ''
  return `${Math.round(kg * 1000)} g`
}

// --- Dimensões: uma casa decimal ---------------------------------------------------------------

export const parseCm = (input: unknown): number | null => {
  const value = parseNumber(input)
  if (value === null) return null
  return Math.round(value * 10) / 10
}

export const formatCm = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return `${new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)} cm`
}

// --- Percentual: inteiro -----------------------------------------------------------------------

export const parsePercent = (input: unknown): number | null => {
  const value = parseNumber(input)
  if (value === null) return null
  return Math.round(value)
}

export const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return ''
  return `${Math.round(value)}%`
}
