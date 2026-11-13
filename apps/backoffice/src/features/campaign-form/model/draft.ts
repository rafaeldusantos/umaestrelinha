// O rascunho da tela de campanha: o que a dona digitou, e o que a tela recusa antes de gravar.
//
// As recusas são as de `@estrelinha/core/campaigns` — esta camada só as distribui pelos campos e
// decide se o Salvar fica ligado. As datas são digitadas em Brasília; o fim é o último minuto que
// vale, e quem converte para o `ends_at` exclusivo é `core` (`campaignEndsAtFromInput`).

import {
  CAMPAIGN_BADGE_MAX,
  CAMPAIGN_DEFAULT_COLORS,
  campaignBadgeRefusal,
  campaignColorsApproval,
  campaignColorsRefusal,
  campaignEndInput,
  campaignEndsAtFromInput,
  campaignNameRefusal,
  campaignOverlapRefusal,
  campaignPercentsRefusal,
  campaignStartInput,
  campaignStartsAtFromInput,
  campaignWindowRefusal,
  type CampaignIdentity,
} from '@estrelinha/core/campaigns'
import { storeLocalInput } from '@estrelinha/core/time'
import type { DbCampaign } from '@estrelinha/supabase/types/campaign'
import type { CampaignWriteInput } from '@/entities/campaign'

export interface CampaignDraft {
  name: string
  badgeText: string
  band: string
  accent: string
  /** `AAAA-MM-DD`, Brasília. */
  startDate: string
  /** `HH:MM`, Brasília. */
  startTime: string
  /** O último dia que vale. */
  endDate: string
  /** O último minuto que vale. */
  endTime: string
  active: boolean
  percents: number[]
}

/** A campanha nova: começa hoje às 00:00 e termina hoje às 23:59, ligada, em preto e ouro. */
export function emptyCampaignDraft(agora: Date = new Date()): CampaignDraft {
  const hoje = storeLocalInput(agora.toISOString()).slice(0, 10)
  return {
    name: '',
    badgeText: '',
    band: CAMPAIGN_DEFAULT_COLORS.band,
    accent: CAMPAIGN_DEFAULT_COLORS.accent,
    startDate: hoje,
    startTime: '00:00',
    endDate: hoje,
    endTime: '23:59',
    active: true,
    percents: [],
  }
}

export function draftFromCampaign(c: DbCampaign & { percents: number[] }): CampaignDraft {
  const inicio = campaignStartInput(c.starts_at)
  const fim = campaignEndInput(c.ends_at)
  return {
    name: c.name,
    badgeText: c.badge_text,
    band: c.band_color.toUpperCase(),
    accent: c.accent_color.toUpperCase(),
    startDate: inicio.slice(0, 10),
    startTime: inicio.slice(11, 16),
    endDate: fim.slice(0, 10),
    endTime: fim.slice(11, 16),
    active: c.active,
    percents: [...c.percents],
  }
}

/**
 * O texto do selo acompanha o nome: enquanto ele está vazio, ou é igual ao começo do nome anterior,
 * vira os 14 primeiros caracteres do nome novo. Escrito à mão, ele fica.
 */
export function nextBadgeText(nomeAnterior: string, nomeNovo: string, selo: string): string {
  const acompanhava = selo === '' || selo === nomeAnterior.slice(0, CAMPAIGN_BADGE_MAX)
  return acompanhava ? nomeNovo.slice(0, CAMPAIGN_BADGE_MAX) : selo
}

export interface DraftCheck {
  starts_at: string | null
  ends_at: string | null
  name: string | null
  badge: string | null
  window: string | null
  overlap: string | null
  percents: string | null
  colors: string | null
  /** A frase verde da medida de contraste, quando o par serve. */
  colorsOk: string | null
  canSave: boolean
}

/** Confere o rascunho inteiro. `others` são as outras campanhas (para a vigência cruzada). */
export function checkDraft(draft: CampaignDraft, id: string | null, others: CampaignIdentity[]): DraftCheck {
  const starts_at = campaignStartsAtFromInput(`${draft.startDate}T${draft.startTime}`)
  const ends_at = campaignEndsAtFromInput(`${draft.endDate}T${draft.endTime}`)
  const window = campaignWindowRefusal(starts_at, ends_at)
  const overlap = window ? null : campaignOverlapRefusal({ id, starts_at, ends_at, active: draft.active }, others)
  const name = campaignNameRefusal(draft.name)
  const badge = campaignBadgeRefusal(draft.badgeText)
  const percents = campaignPercentsRefusal(draft.percents)
  const colors = campaignColorsRefusal(draft.band, draft.accent)
  return {
    starts_at,
    ends_at,
    name,
    badge,
    window,
    overlap,
    percents,
    colors,
    colorsOk: campaignColorsApproval(draft.band, draft.accent),
    canSave: !name && !badge && !window && !overlap && !percents && !colors,
  }
}

/** O rascunho conferido ⇒ o que a porta grava. */
export function draftToInput(draft: CampaignDraft, id: string | null, check: DraftCheck): CampaignWriteInput {
  return {
    id,
    name: draft.name.trim(),
    badge_text: draft.badgeText.trim(),
    band_color: draft.band.toUpperCase(),
    accent_color: draft.accent.toUpperCase(),
    starts_at: check.starts_at as string,
    ends_at: check.ends_at as string,
    active: draft.active,
    percents: [...draft.percents],
  }
}
