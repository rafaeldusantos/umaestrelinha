// Montagem do pagador para o Mercado Pago — domínio puro (roda em Node, Deno e browser).
// PGD-04: `payer.identification` (CPF), `first_name` e `last_name` saem do pedido, para PIX e
// cartão; quando o CardPayment Brick manda um `identification`, o do pedido sobrescreve.
// DOC-03: o documento pode ser CPF (11 dígitos) ou CNPJ (14) — é o comprimento válido que decide
// o `type`, porque o rascunho guarda os dois no mesmo campo.
// Import com extensão .ts porque a edge function Deno importa este módulo por caminho relativo.
import { isValidCpf, stripCpf } from '../validators/cpf.ts'
import { isValidCnpj, stripCnpj } from '../validators/cnpj.ts'

export interface PayerIdentification {
  type: 'CPF' | 'CNPJ'
  number: string
}

export interface Payer {
  email: string
  first_name: string
  last_name: string
  /** Omitido quando o pedido não tem CPF válido — melhor faltar do que enviar valor sujo ao MP. */
  identification?: PayerIdentification
}

export interface BuildPayerInput {
  name: string
  email: string
  /** CPF **ou** CNPJ — o campo do rascunho é um só (`payment.cpf`), o conteúdo é que varia. */
  cpf: string
}

/**
 * A loja coleta um campo único de nome; o MP exige os dois.
 * Primeiro token vira `first`, o restante vira `last`. Token único repete-se em `last`.
 */
export function splitName(name: string): { first: string; last: string } {
  const tokens = (name ?? '').trim().split(/\s+/).filter(Boolean)

  if (tokens.length === 0) return { first: '', last: '' }
  if (tokens.length === 1) return { first: tokens[0], last: tokens[0] }

  return { first: tokens[0], last: tokens.slice(1).join(' ') }
}

/** Monta o pagador canônico do pedido. Documento inválido => `identification` ausente. */
export function buildPayer(input: BuildPayerInput): Payer {
  const { first, last } = splitName(input.name)
  const payer: Payer = {
    email: input.email,
    first_name: first,
    last_name: last,
  }

  // DOC-03: 11 dígitos válidos ⇒ CPF; 14 ⇒ CNPJ. Nada entre os dois — melhor faltar
  // `identification` do que mandar um documento sujo ao MP.
  if (isValidCpf(input.cpf)) {
    payer.identification = { type: 'CPF', number: stripCpf(input.cpf) }
  } else if (isValidCnpj(input.cpf)) {
    payer.identification = { type: 'CNPJ', number: stripCnpj(input.cpf) }
  }

  return payer
}

/**
 * Funde o `payer` que veio do Brick com o do pedido. Um único CPF canônico por pedido:
 * `identification`, `first_name` e `last_name` do pedido vencem. Os demais campos do Brick
 * (email, entity_type, etc.) são preservados.
 */
export function mergePayer(
  fromBrick: Record<string, unknown> | null | undefined,
  fromOrder: Payer,
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...fromOrder, ...(fromBrick ?? {}) }

  merged.first_name = fromOrder.first_name
  merged.last_name = fromOrder.last_name
  if (fromOrder.identification) merged.identification = fromOrder.identification

  return merged
}
