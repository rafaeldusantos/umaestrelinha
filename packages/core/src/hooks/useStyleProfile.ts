import { DEFAULT_APPEARANCE } from '@estrelinha/supabase/types/settings'
import { normalizeAppearance } from '../appearance/normalize.ts'
import type { StyleProfile } from '../appearance/types.ts'
import { useStoreSettings } from './useStoreSettings'

/**
 * O perfil de estilo que a dona salvou, ou o Padrão. Lê o mesmo `select` das outras chaves (sem
 * consulta nova), e o valor passa pela normalização — gravado errado, ausente ou com a leitura
 * falhando, vale o Padrão. `isLoading` separa "ainda não sei" de "é o Padrão", para quem aplica o
 * perfil não trocar a paleta duas vezes diante da cliente.
 */
export function useStyleProfile(): { profile: StyleProfile; isLoading: boolean } {
  const { data, isLoading } = useStoreSettings()
  return { profile: normalizeAppearance(data?.appearance ?? DEFAULT_APPEARANCE).profile, isLoading }
}
