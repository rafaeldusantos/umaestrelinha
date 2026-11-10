// A leitura do token de um link que leva a credencial no FRAGMENTO (`/<rota>#<token>`): o do pedido
// montado (`features/proposal-checkout/model/proposalToken.ts`) e o do pagamento por cartão
// (`features/card-link/model/cardLinkToken.ts`). Cada um é dono da própria chave e do próprio
// armazenamento; a leitura do fragmento é uma só, aqui.

/**
 * O que sobra no FIM do fragmento e não é do alfabeto base64url (`A-Z a-z 0-9 - _`): o ponto final
 * da frase, a vírgula, o parêntese de quem citou o link, as reticências. O token nunca contém nada
 * disso (32 bytes em base64url sem `=`), então aparar é seguro — e sem aparar, `#<token>.` caía em
 * "Este link não está mais disponível" para um link válido (QA da 89,
 * `BUG-20261031-ponto-final-depois-do-link-no-whatsapp`, decisão do usuário em 2026-10-31).
 */
const FORA_DO_TOKEN_NO_FIM = /[^A-Za-z0-9_-]+$/

/** O fragmento sem o `#`, decodificado, aparado e sem pontuação no fim; vazio quando não há. */
export function tokenDoFragmento(hash: string): string {
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
