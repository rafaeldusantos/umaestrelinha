// O link da proposta, montado a partir do token (feature 89).
//
// O link de uma proposta aberta volta pelo `get`: o banco guarda a cifra do
// token, e a página monta o link a cada leitura. Nada vai para o armazenamento do navegador. A
// proposta gravada sem a cifra (antes da chave, ou sem ela) não tem link para mostrar, e a página
// oferece "Gerar link novo".

import { proposalLink } from '@estrelinha/core/proposals'
import { storeOrigin } from '@/shared/lib/storeOrigin'

export interface LinkDaProposta {
  link: string
  expiresAt: string
}

/** O link montado a partir do token que a function devolveu. Sem a loja configurada, `null`. */
export const montarLink = (token: string, origem: string | null = storeOrigin()): string | null =>
  origem ? proposalLink(origem, token) : null
