// A régua de "Dados pessoais" (feature 59, `DAD-03`).
//
// Pura e fora do contexto de auth: `packages/auth` não tem runner de teste, então a regra mora aqui,
// onde a suíte da loja a alcança, e `updateCustomerProfile` só grava. Duas escritas da mesma régua
// (uma na tela, outra no contexto) divergiriam sem nada quebrar — o "defeito 01".
//
// Veredito por campo, com `string | null` e não `{ ok: boolean }`: com `strictNullChecks: false`
// união por literal booleano não estreita (ver `CLAUDE.md`).
import { isValidBrPhone } from '@estrelinha/core/validators'

export const NOME_INCOMPLETO = 'Informe seu nome completo.'
export const WHATSAPP_INVALIDO = 'Informe um WhatsApp com DDD.'

/** Menos que isso não é nome — uma letra sozinha é quase sempre engano de toque. */
export const NOME_MIN = 2

export interface ProfileDraft {
  name: string
  phone: string
}

export interface ProfileRefusal {
  name: string | null
  phone: string | null
}

/** O motivo de cada campo, ou `null` quando os dois passam. */
export function profileRefusal({ name, phone }: ProfileDraft): ProfileRefusal | null {
  const recusa: ProfileRefusal = {
    name: (name ?? '').trim().length < NOME_MIN ? NOME_INCOMPLETO : null,
    // Fixo com DDD (10) ou celular (11) — o mesmo portão do caixa (`isValidBrPhone`).
    phone: isValidBrPhone(phone ?? '') ? null : WHATSAPP_INVALIDO,
  }
  return recusa.name || recusa.phone ? recusa : null
}
