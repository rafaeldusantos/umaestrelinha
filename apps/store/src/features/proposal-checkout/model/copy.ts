import { proposalExpiryDate } from '@estrelinha/core/proposals'

/** CON-02, palavra por palavra: o prazo do link no dia de Brasília, com o ano. */
export const proposalValidUntil = (expiresAt: string) =>
  `Este link vale até ${proposalExpiryDate(expiresAt, true)}.`
