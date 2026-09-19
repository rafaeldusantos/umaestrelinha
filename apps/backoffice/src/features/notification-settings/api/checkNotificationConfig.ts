// Feature 53 (T08) — expõe `admin_public_url` para o aviso de `ABN-09`, lido de
// `?action=config-check` (já existe, feature `52`). Falha em silêncio: é diagnóstico
// puramente informativo, e gritar sobre uma falha de rede própria seria pior do que não avisar.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

export interface NotificationConfigCheck {
  adminPublicUrl: string
}

/**
 * `null`, e não `undefined`, no caminho de falha — é o `queryFn` do React Query, que trata `data`
 * `undefined` como "consulta inválida" e reclama no console. `null` é dado válido para a biblioteca;
 * quem traduz para a interface pública (`| undefined`, o mesmo molde de `useStoreSettings`) é
 * `useNotificationConfigCheck`, abaixo.
 */
async function fetchConfigCheck(): Promise<NotificationConfigCheck | null> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification?action=config-check')
    if (error) return null
    if (typeof data?.admin_public_url !== 'string') return null
    return { adminPublicUrl: data.admin_public_url }
  } catch {
    return null
  }
}

/**
 * `undefined` em QUALQUER erro (rede, function fora do ar, resposta sem o campo) — nunca lança,
 * nunca popula um estado de erro que a tela precisaria tratar. Mesmo molde de `useStoreSettings`.
 */
export function useNotificationConfigCheck(): NotificationConfigCheck | undefined {
  const { data } = useQuery({
    queryKey: ['send-notification', 'config-check'],
    queryFn: fetchConfigCheck,
    staleTime: 1000 * 60 * 5,
  })
  return data ?? undefined
}
