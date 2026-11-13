// A escrita das campanhas do painel — e a PORTA ÚNICA das marcações das peças.
//
// - A campanha e os percentuais dela gravam juntos, numa transação: `save_campaign` (RPC `security
//   invoker`, a RLS do admin vale). Os percentuais tirados saem antes dos acrescentados.
// - "Encerrar agora" põe o fim no instante atual; apagar só sem pedido (`order_items.campaign_id` é
//   `restrict`), e as marcações saem junto (`cascade`).
// - `setProductsCampaign` é quem grava `product_campaigns`: uma peça ou várias, com um percentual da
//   campanha, ou `null` para tirar da campanha. Nenhuma outra tela grava essa tabela.
//
// Cada gravação confere o efeito (`.select(...)`): um `update` que a RLS filtra responde sem erro e
// sem linha, e isso não pode passar como sucesso. Os erros do banco viram a frase de `core`.

import { supabase } from '@estrelinha/supabase/client'
import {
  campaignDeleteRefusal,
  campaignOverlapRefusal,
  campaignPercentRemovalRefusal,
  type CampaignIdentity,
} from '@estrelinha/core/campaigns'

export interface CampaignWriteInput {
  /** `null` ⇒ campanha nova. */
  id: string | null
  name: string
  badge_text: string
  band_color: string
  accent_color: string
  starts_at: string
  /** Exclusivo: o minuto seguinte ao último que vale. */
  ends_at: string
  active: boolean
  percents: number[]
}

export interface CampaignWriteContext {
  /** As outras campanhas, para nomear a que cruza quando o banco recusa (`23P01`). */
  others: CampaignIdentity[]
  /** Quantas peças usam cada percentual hoje, para a recusa de tirar percentual em uso (`23503`). */
  usage: Record<number, number>
  /** Os percentuais gravados hoje (vazio na campanha nova). */
  savedPercents: number[]
}

interface ErroDoBanco {
  code?: string
  message: string
}

const SEM_PERMISSAO = 'Só quem administra a loja grava campanha.'

/** O erro do banco na gravação da campanha, na frase da tela. */
export function campaignSaveErrorMessage(erro: ErroDoBanco, input: CampaignWriteInput, contexto: CampaignWriteContext): string {
  if (erro.code === '23P01') {
    return (
      campaignOverlapRefusal(input, contexto.others) ??
      'A vigência cruza a de outra campanha ligada. Só uma campanha ligada pode valer por vez: mude as datas ou desligue a outra.'
    )
  }
  if (erro.code === '23503') {
    const tirado = contexto.savedPercents.find(p => !input.percents.includes(p) && (contexto.usage[p] ?? 0) > 0)
    if (tirado !== undefined) return campaignPercentRemovalRefusal(tirado, contexto.usage[tirado]) as string
    return 'Um percentual que você tirou está em uso por alguma peça. Mude essas peças antes de tirá-lo.'
  }
  if (erro.code === '42501') return SEM_PERMISSAO
  if (erro.code === '23514' && /percentuais/i.test(erro.message)) return erro.message
  if (erro.code === '23514') return 'Algum campo está fora do limite. Confira o nome, o selo, as cores e as datas.'
  if (erro.code === 'P0002') return 'Esta campanha não existe mais (ou foi apagada em outra aba).'
  return erro.message
}

/** Cria ou altera a campanha, com os percentuais. Devolve o id. Lança com a frase da tela. */
export async function saveCampaign(input: CampaignWriteInput, contexto: CampaignWriteContext): Promise<string> {
  const { data, error } = await supabase.rpc('save_campaign', {
    p_id: input.id,
    p_name: input.name.trim(),
    p_badge_text: input.badge_text.trim(),
    p_band_color: input.band_color,
    p_accent_color: input.accent_color,
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
    p_active: input.active,
    p_percents: input.percents,
  })
  if (error) throw new Error(campaignSaveErrorMessage(error, input, contexto))
  if (!data) throw new Error('A campanha não foi gravada. Tente de novo.')
  return data as string
}

/** "Encerrar agora": o fim passa a ser o instante atual. */
export async function endCampaignNow(campaignId: string, agora: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('campaigns')
    .update({ ends_at: agora.toISOString() })
    .eq('id', campaignId)
    .select('id')
  if (error) throw new Error(error.code === '23514' ? 'Só se encerra uma campanha que já começou.' : error.message)
  if (!data || (data as unknown[]).length === 0) throw new Error('Nenhuma campanha foi alterada.')
}

/** Apaga a campanha sem pedido; as marcações saem junto. Com pedido, recusa antes e o banco também. */
export async function deleteCampaign(campaignId: string, ordersUsing: number): Promise<void> {
  const recusa = campaignDeleteRefusal(ordersUsing)
  if (recusa) throw new Error(recusa)
  const { data, error } = await supabase.from('campaigns').delete().eq('id', campaignId).select('id')
  if (error) throw new Error(error.code === '23503' ? (campaignDeleteRefusal(1) as string) : error.message)
  if (!data || (data as unknown[]).length === 0) throw new Error('Nenhuma campanha foi apagada.')
}

/** Quantos ids por requisição: a lista vai na URL do `in(...)`. */
export const MARKING_CHUNK = 100

/**
 * A porta única das marcações: põe as peças na campanha com o percentual, ou tira (`percent` nulo).
 * Devolve quantas peças foram gravadas. O percentual tem de ser um dos da campanha — o banco confere
 * (`23503`), e a frase diz qual.
 */
export async function setProductsCampaign(
  productIds: string[],
  campaignId: string,
  percent: number | null,
): Promise<number> {
  const ids = [...new Set(productIds)]
  let gravadas = 0
  for (let i = 0; i < ids.length; i += MARKING_CHUNK) {
    const lote = ids.slice(i, i + MARKING_CHUNK)
    const { data, error } =
      percent === null
        ? await supabase.from('product_campaigns').delete().eq('campaign_id', campaignId).in('product_id', lote).select('product_id')
        : await supabase
            .from('product_campaigns')
            .upsert(
              lote.map(product_id => ({ product_id, campaign_id: campaignId, percent })),
              { onConflict: 'product_id,campaign_id' },
            )
            .select('product_id')
    if (error) {
      throw new Error(error.code === '23503' && percent !== null ? `${percent}% não é um percentual desta campanha.` : error.message)
    }
    gravadas += (data as unknown[] | null)?.length ?? 0
  }
  return gravadas
}
