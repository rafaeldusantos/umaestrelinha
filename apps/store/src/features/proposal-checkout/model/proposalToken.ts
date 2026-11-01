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

/**
 * O que sobra no FIM do fragmento e não é do alfabeto base64url (`A-Z a-z 0-9 - _`): o ponto final
 * da frase, a vírgula, o parêntese de quem citou o link, as reticências. O token nunca contém nada
 * disso (`createGuestAccessToken`, 32 bytes em base64url sem `=`), então aparar é seguro — e sem
 * aparar, `#<token>.` caía em "Este link não está mais disponível" para um pedido válido (QA da 89,
 * `BUG-20261031-ponto-final-depois-do-link-no-whatsapp`, decisão do usuário em 2026-10-31).
 */
const FORA_DO_TOKEN_NO_FIM = /[^A-Za-z0-9_-]+$/

/** O fragmento sem o `#`, decodificado, aparado e sem pontuação no fim; vazio quando não há. */
function tokenDoFragmento(hash: string): string {
  const cru = (hash ?? '').replace(/^#/, '').trim()
  if (!cru) return ''
  let lido = cru
  try {
    lido = decodeURIComponent(cru)
  } catch {
    // fica o cru
  }
  return lido.trim().replace(FORA_DO_TOKEN_NO_FIM, '')
}

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
 * guardado e apagado da barra. Sem fragmento ⇒ o guardado (recarregar a aba), ou `null`.
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
