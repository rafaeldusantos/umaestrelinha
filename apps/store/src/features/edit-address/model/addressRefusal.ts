// A régua do endereço de "Meus dados" (feature 59, `DAD-07`).
//
// Os campos que o caixa também exige: CEP de 8 dígitos, rua, número, bairro, cidade e UF.
// Complemento é opcional. Veredito por campo com `string | null` (ver `profileRefusal`).
import { stripCep } from '@estrelinha/core/validators'
import type { AddressFields } from '@/entities/address'

/** A gravação falhou (`saved: false` ou exceção) — o formulário fica aberto (`DAD-09`). */
export const ENDERECO_NAO_SALVO = 'Não foi possível salvar o endereço agora.'

export type AddressField = 'cep' | 'street' | 'number' | 'neighborhood' | 'city' | 'state'

export const ADDRESS_FIELD_MESSAGES: Record<AddressField, string> = {
  cep: 'Informe o CEP com 8 dígitos.',
  street: 'Informe a rua.',
  number: 'Informe o número.',
  neighborhood: 'Informe o bairro.',
  city: 'Informe a cidade.',
  state: 'Informe a UF.',
}

export type AddressRefusal = Record<AddressField, string | null>

const preenchido = (v: string | null | undefined) => (v ?? '').trim().length > 0

/** O motivo de cada campo, ou `null` quando o endereço inteiro passa. */
export function addressRefusal(a: AddressFields): AddressRefusal | null {
  const recusa: AddressRefusal = {
    cep: stripCep(a.cep ?? '').length === 8 ? null : ADDRESS_FIELD_MESSAGES.cep,
    street: preenchido(a.street) ? null : ADDRESS_FIELD_MESSAGES.street,
    number: preenchido(a.number) ? null : ADDRESS_FIELD_MESSAGES.number,
    neighborhood: preenchido(a.neighborhood) ? null : ADDRESS_FIELD_MESSAGES.neighborhood,
    city: preenchido(a.city) ? null : ADDRESS_FIELD_MESSAGES.city,
    // UF é sigla de duas letras: "R" é tão incompleto quanto vazio.
    state: /^[A-Za-z]{2}$/.test((a.state ?? '').trim()) ? null : ADDRESS_FIELD_MESSAGES.state,
  }
  return Object.values(recusa).some(Boolean) ? recusa : null
}
