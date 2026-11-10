// O token do link do pedido montado pelo painel (feature 89, `SEG-02`). Dono único da chave.
//
// O link é `/pedido-montado#<token>`: o token vai no FRAGMENTO porque o fragmento não chega ao
// servidor (Vercel, `api/page`), não vai no `Referer` e — com o `PageViewTracker` cortando o `#` —
// não entra no `page_view`. Ao abrir, a página o lê UMA vez, guarda em `sessionStorage` e o apaga da
// barra de endereço com `history.replaceState`: assim um print, um "copiar link" ou uma extensão que
// leia a URL não levam a credencial adiante, e recarregar a aba continua funcionando.
//
// `sessionStorage`, e não `localStorage`: o token é a prova de posse dada pela Adri (A-08), e ele
// não deve sobreviver ao fechar a aba num aparelho emprestado. Quem fecha e volta abre o link de novo.
//
// Nenhum outro arquivo dos apps escreve a chave (`proposalTokenComDonoUnico.test.ts`).

export const PROPOSAL_TOKEN_KEY = 'estrelinha-proposal-token'

import { tokenDoFragmento } from '@/shared/lib/fragmentToken'

function guardar(token: string): void {
  try {
    sessionStorage.setItem(PROPOSAL_TOKEN_KEY, token)
  } catch {
    // Aba privada sem armazenamento: o token vale pela vida desta página, e é o que basta.
  }
}

function ler(): string | null {
  try {
    return sessionStorage.getItem(PROPOSAL_TOKEN_KEY) || null
  } catch {
    return null
  }
}

/**
 * O token desta visita. Fragmento presente ⇒ ele vence (um link novo substitui o de antes), é
 * guardado e apagado da barra. Sem fragmento ⇒ o guardado (recarregar a aba), ou `null`. A leitura do
 * fragmento (com a pontuação do fim aparada) é a de `shared/lib/fragmentToken.ts`.
 */
export function takeProposalToken(): string | null {
  if (typeof window === 'undefined') return null
  const doLink = tokenDoFragmento(window.location.hash)
  if (doLink) {
    guardar(doLink)
    // O mesmo endereço sem o fragmento, preservando o estado do router (a chave da entrada).
    const { pathname, search } = window.location
    window.history.replaceState(window.history.state, '', `${pathname}${search}`)
    return doLink
  }
  return ler()
}

/** Esquece o token (o link não vale mais, ou o pedido nasceu). */
export function forgetProposalToken(): void {
  try {
    sessionStorage.removeItem(PROPOSAL_TOKEN_KEY)
  } catch {
    // nada a esquecer
  }
}
