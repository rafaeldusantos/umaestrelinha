/**
 * O link do WhatsApp da loja, com a mensagem já escrita — ou `null` quando não há número.
 *
 * O portão de 10 dígitos é o mesmo de `PolicyContact`, da Sobre (`SOB-08`) e do `WhatsAppFloat`:
 * `general.whatsapp` nasce vazio em `store_settings`, e um botão apontando para `wa.me/` sem dígito
 * abre conversa com ninguém — a cliente acha que pediu ajuda e não pediu. **Menos de 10 dígitos é
 * número não configurado**, e quem recebe `null` tira o botão de cena.
 *
 * Nasceu na feature `59` para as peças NOVAS (a ajuda do detalhe do pedido, os estados que levam ao
 * WhatsApp). As oito escritas antigas do `wa.me` continuam montadas à mão e são dívida registrada
 * no `design.md` da `59`: migrá-las aqui tocaria telas que a feature não foi pedida para tocar.
 */

/** Número curto demais é número não configurado, não número errado. */
export const MIN_DIGITOS_WHATSAPP = 10

export function whatsappHref(numero: string | null | undefined, mensagem: string): string | null {
  const digitos = (numero ?? '').replace(/\D/g, '')
  if (digitos.length < MIN_DIGITOS_WHATSAPP) return null
  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`
}
