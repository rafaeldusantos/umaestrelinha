// Campanhas de desconto — "esta campanha está valendo agora?".
//
// O DONO em TypeScript da vigência. A policy pública de `campaigns` (migration das campanhas) é a cópia
// deliberada em SQL — `active and starts_at <= now() and now() < ends_at` —, e
// `campanhaVigenciaParidade.test.ts` (suíte da loja) lê a policy do disco e confere que as duas
// respondem igual nas bordas. Início INCLUSIVO, fim EXCLUSIVO, e desligada nunca vale.
//
// Quem chama passa o relógio: o do servidor onde há servidor. O navegador da cliente não decide.
//
// Folha alcançável pelo Deno: o único import é de tipo, com `.ts` explícito.

import type { CampaignWindow, Instant } from './types.ts'

/** O instante em milissegundos. */
export const instantMs = (instante: Instant): number =>
  instante instanceof Date ? instante.getTime() : typeof instante === 'number' ? instante : new Date(instante).getTime()

export function isCampaignLive(campaign: CampaignWindow, now: Instant): boolean {
  if (!campaign || !campaign.active) return false
  const agora = instantMs(now)
  return instantMs(campaign.starts_at) <= agora && agora < instantMs(campaign.ends_at)
}
