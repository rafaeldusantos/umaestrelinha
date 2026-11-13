// A campanha de desconto em vigência e as marcações das peças, para as functions.
//
// Um leitor só (o `create-order` da `checkout` é quem o chama ao gravar o pedido), com o client e o
// relógio INJETADOS: a vigência é decidida pelo relógio da function, nunca pelo do navegador, e quem
// decide é `isCampaignLive` (`core/campaigns/live.ts`) — o mesmo dono da policy pública de
// `campaigns`. A function usa a service role, que ignora a RLS; por isso a vigência é decidida aqui,
// e não pela leitura.
//
// O `create-payment` NÃO chama isto: ele aplica a campanha GRAVADA na linha, sem reavaliar a vigência
// (o pedido criado durante a campanha e pago depois vale pelo que foi gravado).

import { isCampaignLive } from '../../../packages/core/src/campaigns/live.ts'

export interface LiveCampaignMarks {
  /** A mensagem do erro de leitura, ou `null`. Erro nunca vira "sem campanha". */
  error: string | null
  /** A campanha em vigência agora, ou `null`. */
  campaign: { id: string; name: string } | null
  /** O percentual de cada peça pedida que está marcada na campanha em vigência. */
  percentOf: Map<string, number>
}

const NENHUMA = (): LiveCampaignMarks => ({ error: null, campaign: null, percentOf: new Map() })

export async function liveCampaignMarks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  now: () => number | Date,
  productIds: readonly string[],
): Promise<LiveCampaignMarks> {
  const ids = [...new Set(productIds.filter((id) => typeof id === 'string' && id !== ''))]
  if (ids.length === 0) return NENHUMA()

  const { data: campanhas, error } = await client
    .from('campaigns')
    .select('id, name, starts_at, ends_at, active')
    .eq('active', true)
  if (error) return { ...NENHUMA(), error: String(error.message ?? 'campaigns') }

  const agora = now()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viva = ((campanhas ?? []) as any[]).find(
    (c) => c && typeof c.id === 'string' && isCampaignLive(c, agora),
  )
  if (!viva) return NENHUMA()

  const { data: marcas, error: erroDasMarcas } = await client
    .from('product_campaigns')
    .select('product_id, percent')
    .eq('campaign_id', viva.id)
    .in('product_id', ids)
  if (erroDasMarcas) return { ...NENHUMA(), error: String(erroDasMarcas.message ?? 'product_campaigns') }

  const percentOf = new Map<string, number>()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const m of (marcas ?? []) as any[]) {
    const percent = Number(m?.percent)
    if (typeof m?.product_id === 'string' && Number.isFinite(percent) && percent > 0) {
      percentOf.set(m.product_id, percent)
    }
  }
  return { error: null, campaign: { id: viva.id, name: String(viva.name ?? '') }, percentOf }
}
