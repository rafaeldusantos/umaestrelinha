// O link da proposta e a mensagem do WhatsApp (LNK-02, A-15). Todo import com `.ts`.
//
// O token vai no FRAGMENTO (`#`), nunca no caminho nem na query: o fragmento não chega ao servidor
// (Vercel, `api/page`), não entra no `page_view` e não vai no `Referer` (SEG-02).

import { PROPOSAL_PATH } from '../routes/routes.ts'
import { STORE_TIME_ZONE } from '../time/zone.ts'
import { PROPOSAL_LINK_DAYS } from './limits.ts'

// O caminho tem UM dono, `core/routes` (folha sem import, alcançável pelo Deno); daqui ele é só
// reexportado — `link.test.ts` confere que é a mesma referência (fecho da rodada 1 do Verifier).
export { PROPOSAL_PATH }

/**
 * A frase de quando o link foi criado mas quem desenha não sabe a origem da loja (a env da loja
 * ausente no app que monta) — o painel e o app do ateliê dizem a mesma coisa.
 */
export const LINK_WITHOUT_STORE =
  'O link foi criado, mas a loja não está configurada neste painel para montá-lo. Gere um link novo depois de configurar a loja.'

/**
 * A origem de um pedido que nasceu de uma proposta, a mesma nos dois apps: "Pedido montado" —
 * no painel, a linha "Pedido montado · P-0001" do pedido.
 */
export const PROPOSAL_ORIGIN_LABEL = 'Pedido montado'

/**
 * A falha de gravar o pedido montado, a mesma no painel e no app do ateliê: a proposta e o
 * endereço são UMA gravação, e a falha não deixou nada gravado nem enviado.
 */
export const PROPOSAL_SAVE_FAILED = 'Não consegui gravar o pedido. Nada foi enviado à cliente. Tente de novo.'

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
 * LNK-02: "Oi, {primeiro nome}! Montei seu pedido aqui na loja. É só conferir seus dados, escolher a
 * entrega e o pagamento:" — linha em branco — "{link}" — linha em branco — "O link vale até {dd/mm}."
 * Sem urgência e sem emoji. Sem nome, a saudação fica "Oi!" (nunca "Oi, !").
 *
 * O link vai SOZINHO numa linha, sem pontuação colada: com o ponto final logo depois dele, quem
 * selecionava o trecho (ou um leitor de link que incluísse o ponto) abria `#<token>.` e caía em "Este
 * link não está mais disponível" para um pedido válido (QA da 89,
 * `BUG-20261031-ponto-final-depois-do-link-no-whatsapp`, decisão do usuário em 2026-10-31, opção c:
 * esta linha sozinha e, na loja, `proposalToken.ts` aparando pontuação no fim do fragmento).
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
    `É só conferir seus dados, escolher a entrega e o pagamento:\n\n` +
    `${input.link}\n\n` +
    `O link vale até ${proposalExpiryDate(input.expiresAt)}.`
  )
}

/**
 * A confirmação de renovar o prazo, a mesma no painel e no app do ateliê: "O link venceu em
 * {dd/mm}. Os preços são conferidos de novo e sai um link novo, que vale até {dd/mm}. Mande o novo
 * para {primeiro nome}." O prazo novo é o que a function grava: `now` + `PROPOSAL_LINK_DAYS`. Sem nome, "a
 * cliente".
 */
export function proposalRenewText(input: {
  name?: string | null
  expiresAt: string
  now: Date
  linkDays?: number
}): string {
  const dias = input.linkDays ?? PROPOSAL_LINK_DAYS
  const novo = new Date(input.now.getTime() + dias * 24 * 60 * 60 * 1000).toISOString()
  const nome = firstName(input.name) || 'a cliente'
  return (
    `O link venceu em ${proposalExpiryDate(input.expiresAt)}. ` +
    `Os preços são conferidos de novo e sai um link novo, que vale até ${proposalExpiryDate(novo)}. ` +
    `Mande o novo para ${nome}.`
  )
}
