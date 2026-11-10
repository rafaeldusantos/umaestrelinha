// O token do link de pagamento por cartão (`/pagar-com-cartao#<token>`), que a Adri gera no painel
// para um pedido de cartão que não foi pago. Dono único da chave.
//
// Mesmo desenho do link do pedido montado (`proposalToken.ts`): o token vai no FRAGMENTO, a página o
// lê UMA vez, guarda em `sessionStorage` (não sobrevive a fechar a aba num aparelho emprestado) e o
// apaga da barra com `history.replaceState`. A leitura do fragmento é a de `shared/lib/fragmentToken`.

import { tokenDoFragmento } from '@/shared/lib/fragmentToken'

export const CARD_LINK_TOKEN_KEY = 'estrelinha-card-link-token'

/**
 * O token desta visita. Fragmento presente ⇒ ele vence (um link novo substitui o de antes), é
 * guardado e apagado da barra. Sem fragmento ⇒ o guardado (recarregar a aba), ou `null`.
 */
export function takeCardLinkToken(): string | null {
  if (typeof window === 'undefined') return null
  const doLink = tokenDoFragmento(window.location.hash)
  if (doLink) {
    try {
      sessionStorage.setItem(CARD_LINK_TOKEN_KEY, doLink)
    } catch {
      // Aba privada sem armazenamento: o token vale pela vida desta página.
    }
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}`)
    return doLink
  }
  try {
    return sessionStorage.getItem(CARD_LINK_TOKEN_KEY) || null
  } catch {
    return null
  }
}
