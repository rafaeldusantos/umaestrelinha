import { DEFAULT_APPEARANCE } from '@estrelinha/supabase/types/settings'
import { normalizeAppearance } from '../appearance/normalize.ts'
import type { StyleProfile } from '../appearance/types.ts'
import { useStoreSettings } from './useStoreSettings'

export interface StyleProfileRead {
  profile: StyleProfile
  isLoading: boolean
  /**
   * A leitura terminou sem o banco responder — o `select` falhou ou o `queryFn` rejeitou. `profile`
   * vale o Padrão do mesmo jeito (é o seguro para a loja vestir), mas quem diz à dona qual perfil
   * está salvo não pode afirmá-lo.
   */
  readFailed: boolean
  /** Relê a configuração. */
  retry: () => void
}

/**
 * O perfil de estilo que a dona salvou, ou o Padrão. Lê o mesmo `select` das outras chaves (sem
 * consulta nova), e o valor passa pela normalização — gravado errado, ausente ou com a leitura
 * falhando, vale o Padrão. `isLoading` separa "ainda não sei" de "é o Padrão", para quem aplica o
 * perfil não trocar a paleta duas vezes diante da cliente; `readFailed` separa "não consegui ler" de
 * "é o Padrão", para o painel não dizer "Em uso" de um perfil que ele não leu.
 */
export function useStyleProfile(): StyleProfileRead {
  const { data, isLoading, isError, refetch } = useStoreSettings()
  return {
    profile: normalizeAppearance(data?.appearance ?? DEFAULT_APPEARANCE).profile,
    isLoading,
    readFailed: isError || data?.readFailed === true,
    retry: () => void refetch(),
  }
}
