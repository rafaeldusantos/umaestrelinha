// O link da proposta e a mensagem do WhatsApp (LNK-02, A-15). Todo import com `.ts`.
//
// O token vai no FRAGMENTO (`#`), nunca no caminho nem na query: o fragmento não chega ao servidor
// (Vercel, `api/page`), não entra no `page_view` e não vai no `Referer` (SEG-02).

import { PROPOSAL_PATH } from '../routes/routes.ts'
import { STORE_TIME_ZONE } from '../time/zone.ts'

// O caminho tem UM dono, `core/routes` (folha sem import, alcançável pelo Deno); daqui ele é só
// reexportado — `link.test.ts` confere que é a mesma referência (fecho da rodada 1 do Verifier).
export { PROPOSAL_PATH }

/** `https://loja` + token ⇒ `https://loja/pedido-montado#<token>`. */
export function proposalLink(origin: string, token: string): string {
  const base = (origin ?? '').trim().replace(/\/+$/, '')
  return `${base}${PROPOSAL_PATH}#${token}`
}

const DIA_MES = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
})
const DIA_MES_ANO = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** O prazo do link no dia de Brasília: `07/11` ou, com o ano, `07/11/2026` (CON-02). */
export function proposalExpiryDate(expiresAt: string, withYear = false): string {
  const instante = new Date(expiresAt)
  if (Number.isNaN(instante.getTime())) return ''
  return (withYear ? DIA_MES_ANO : DIA_MES).format(instante)
}

/** O primeiro nome, aparado; vazio quando não há nome. */
export function firstName(name: string | null | undefined): string {
  return (name ?? '').trim().split(/\s+/)[0] ?? ''
}

/**
 * LNK-02, palavra por palavra: "Oi, {primeiro nome}! Montei seu pedido aqui na loja. É só conferir
 * seus dados, escolher a entrega e o pagamento: {link}. O link vale até {dd/mm}." — sem urgência e
 * sem emoji. Sem nome, a saudação fica "Oi!" (nunca "Oi, !").
 */
export function proposalWhatsappText(input: {
  firstName?: string | null
  name?: string | null
  link: string
  expiresAt: string
}): string {
  const nome = (input.firstName ?? '').trim() || firstName(input.name)
  const saudacao = nome ? `Oi, ${nome}!` : 'Oi!'
  return (
    `${saudacao} Montei seu pedido aqui na loja. ` +
    `É só conferir seus dados, escolher a entrega e o pagamento: ${input.link}. ` +
    `O link vale até ${proposalExpiryDate(input.expiresAt)}.`
  )
}
