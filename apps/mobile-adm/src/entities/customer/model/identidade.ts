import { normalizeBrPhone, whatsappChatUrl } from '@estrelinha/core/notifications'
import { maskPhone } from '@estrelinha/core/validators'

/**
 * Quem é a pessoa, para quem ouve (feature `76`, `MAC-03`, `MAC-15`, `MAC-17`, `MAC-29`). Um cálculo
 * só para a lista, a ficha e o selo de "Ver cliente": o nome, a inicial e o telefone. Nenhuma regra de
 * negócio — só como se escreve.
 */

interface ComNome {
  name?: string | null
  email: string
}

/** O nome aparado; sem nome (ausente, vazio ou só espaços), o e-mail. */
export const nomeDoCliente = (c: ComNome): string => {
  const nome = (c.name ?? '').trim()
  return nome === '' ? c.email : nome
}

/** A primeira letra do que `nomeDoCliente` devolve, em maiúscula. O e-mail sempre existe: nunca `?`. */
export const inicialDoCliente = (c: ComNome): string => {
  const primeira = Array.from(nomeDoCliente(c))[0] ?? ''
  return primeira.toLocaleUpperCase('pt-BR')
}

export interface TelefoneDoCliente {
  /** `(51) 99812-4471` — desenhado a partir do número JÁ normalizado, sem o `55`. */
  mascarado: string
  /** `https://wa.me/55…`, sem texto: a mensagem pronta é a cobrança do pedido, e é do pedido. */
  whatsapp: string
}

/** O telefone para a tela, ou `null` quando não é um número que o `wa.me` entenda (`normalizeBrPhone`). */
export const telefoneDoCliente = (c: { phone?: string | null }): TelefoneDoCliente | null => {
  const numero = normalizeBrPhone(c.phone)
  if (numero === null) return null
  return { mascarado: maskPhone(numero.slice(2)), whatsapp: whatsappChatUrl(c.phone) }
}
