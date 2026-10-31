// O link da proposta guardado NESTA aba do painel (feature 89, `SEG-01`, design: "O token só existe na
// resposta do `save`/`renew`").
//
// O banco guarda só o hash do token: reabrir a proposta não remonta o link. A página da proposta lê
// daqui o link que acabou de nascer (criar ou renovar); sem ele, oferece "Gerar link novo" (= renovar).
// `sessionStorage` e não `localStorage`: a credencial não sobrevive ao fechar a aba, nem vai a outro
// navegador. Toda leitura e escrita é protegida — sem armazenamento, a página só oferece gerar de novo.

import { proposalLink } from '@estrelinha/core/proposals'
import { storeOrigin } from '@/shared/lib/storeOrigin'

const PREFIXO = 'estrelinha.admin.proposal-link.'

export interface LinkGuardado {
  link: string
  expiresAt: string
}

/** O link montado a partir do token que a function devolveu. Sem a loja configurada, `null`. */
export const montarLink = (token: string, origem: string | null = storeOrigin()): string | null =>
  origem ? proposalLink(origem, token) : null

export const guardarLink = (id: string, valor: LinkGuardado): void => {
  try {
    window.sessionStorage.setItem(PREFIXO + id, JSON.stringify(valor))
  } catch {
    // Sem armazenamento: a página oferece gerar o link de novo.
  }
}

export const lerLink = (id: string): LinkGuardado | null => {
  try {
    const cru = window.sessionStorage.getItem(PREFIXO + id)
    if (!cru) return null
    const v = JSON.parse(cru) as Partial<LinkGuardado>
    return typeof v.link === 'string' && typeof v.expiresAt === 'string' ? { link: v.link, expiresAt: v.expiresAt } : null
  } catch {
    return null
  }
}

export const esquecerLink = (id: string): void => {
  try {
    window.sessionStorage.removeItem(PREFIXO + id)
  } catch {
    // nada a fazer
  }
}
