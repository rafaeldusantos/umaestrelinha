// Feature 53 (T07) — `?action=preview`: a MESMA function que envia renderiza o rascunho não salvo
// (`AD-019`/`PNL-05`, `ABN-06`/`ABN-07`). Nunca lança: falha de rede ou 422 de recusa viram
// `{ error }`, para `EmailPreviewFrame` mostrar inline em vez de derrubar o componente.

import { supabase } from '@estrelinha/supabase/client'
import type { EmailFields, NotificationEvent } from '@estrelinha/core/notifications'

export interface PreviewNotificationInput {
  event: NotificationEvent
  draft: Partial<EmailFields>
  orderId?: string
}

export interface PreviewNotificationResult {
  subject: string
  html: string
  text: string
  sample: boolean
}

const FALLBACK_ERROR = 'Não foi possível gerar a prévia. Tente de novo.'

export async function previewNotification(
  input: PreviewNotificationInput,
): Promise<PreviewNotificationResult | { error: string }> {
  try {
    const body: Record<string, unknown> = { event: input.event, channel: 'email', draft: input.draft }
    if (input.orderId) body.order_id = input.orderId

    const { data, error } = await supabase.functions.invoke('send-notification?action=preview', { body })
    if (error) return { error: await motivoDaFalha(error) }
    if (!data) return { error: FALLBACK_ERROR }

    return { subject: data.subject, html: data.html, text: data.text, sample: Boolean(data.sample) }
  } catch {
    return { error: FALLBACK_ERROR }
  }
}

/**
 * `supabase.functions.invoke` devolve `error` para qualquer status ≥ 400 e joga o corpo fora — o
 * motivo legível que `preview` escreveu em `{ error: recusa }` (a 422 de `notificationDraftRefusal`)
 * não chega por essa porta sem isto. Mesmo molde de `useAdminUsers.ts` (`motivoDaFalha`).
 */
async function motivoDaFalha(erro: unknown): Promise<string> {
  const resposta = (erro as { context?: Response })?.context
  if (resposta && typeof resposta.json === 'function') {
    try {
      const corpo = await resposta.json()
      if (corpo?.error) return String(corpo.error)
    } catch {
      // Corpo ilegível (proxy, timeout): cai no fallback.
    }
  }
  return FALLBACK_ERROR
}
