// "A cliente já viu o convite para o Instagram neste navegador?"
//
// **Persistência à mão, com `try/catch`**, no molde do consentimento de cookies: em aba privada o
// `localStorage` pode lançar na leitura ou na escrita, e o convite não pode reaparecer a cada
// remontagem da Home por isso. A memória do módulo vale pela sessão em curso; a visita seguinte, sem
// armazenamento, vê o convite de novo — que é o melhor que dá para fazer sem guardar nada.

export const INSTAGRAM_INVITE_KEY = 'estrelinha-instagram-invite'

let vistoNestaSessao = false

export function inviteSeen(): boolean {
  if (vistoNestaSessao) return true
  try {
    return window.localStorage.getItem(INSTAGRAM_INVITE_KEY) !== null
  } catch {
    return false
  }
}

export function markInviteSeen(): void {
  vistoNestaSessao = true
  try {
    window.localStorage.setItem(INSTAGRAM_INVITE_KEY, '1')
  } catch {
    // Aba privada: a marca vale em memória, nesta sessão.
  }
}

/** Esquece a marca em memória — só para os testes, que simulam visitas novas no mesmo módulo. */
export function resetInviteSeenForTests(): void {
  vistoNestaSessao = false
}
