import {
  parseBRL, formatBRL,
  parseGrams, formatGrams,
  parseCm, formatCm,
} from '@estrelinha/core/formatters'
import { MaskedNumberInput, type MaskedNumberInputProps } from './MaskedNumberInput'

/**
 * Inputs mascarados pt-BR (feature 07 / T27, requisito PFM-10).
 *
 * Moram em `shared/ui` e não em `features/product-form` porque são consumidos por **três**
 * features: o formulário (`11`), a edição inline da listagem e a grade rápida (`13`). Em
 * `features/`, os slices da `13` importariam de outro slice da mesma camada — cross-import que o
 * `eslint-plugin-boundaries` sinaliza (`AD-010`).
 *
 * Toda a aritmética de parse/format vive em `@estrelinha/core/formatters`, testada lá como função
 * pura. Aqui só o comportamento de campo.
 */
type FieldProps = Omit<MaskedNumberInputProps, 'parse' | 'format' | 'prefix' | 'suffix'>

/** Moeda. `R$` é slot fixo à esquerda e **não** entra no valor. */
export const MoneyInput = (props: FieldProps) => (
  <MaskedNumberInput {...props} parse={parseBRL} format={formatBRL} prefix="R$" placeholder={props.placeholder ?? '0,00'} />
)

/**
 * Peso. A pessoa digita em **gramas**; o valor controlado é em **kg**, que é o que o banco guarda
 * (`weight_kg numeric(6,3)`).
 *
 * Essa troca de unidade é o ponto do componente: um botton pesa 18 g, e digitar `0,018` num campo
 * é convite a errar uma ordem de grandeza direto na cotação do frete.
 */
export const WeightInput = (props: FieldProps) => (
  <MaskedNumberInput
    {...props}
    parse={parseGrams}
    // O sufixo `g` já está no slot fixo; o valor exibido não o repete.
    format={kg => (kg === null || kg === undefined ? '' : String(Math.round(kg * 1000)))}
    suffix="g"
    placeholder={props.placeholder ?? '0'}
  />
)

/** Dimensão em centímetros, uma casa decimal. */
export const DimensionInput = (props: FieldProps) => (
  <MaskedNumberInput
    {...props}
    parse={parseCm}
    format={cm => (cm === null || cm === undefined ? '' : formatCm(cm).replace(' cm', ''))}
    suffix="cm"
    placeholder={props.placeholder ?? '0,0'}
  />
)

export { MaskedNumberInput, type MaskedNumberInputProps } from './MaskedNumberInput'
