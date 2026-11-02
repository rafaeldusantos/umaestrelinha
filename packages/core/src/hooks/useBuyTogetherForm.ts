import { DEFAULT_BUY_TOGETHER } from '@estrelinha/supabase/types/settings'
import { normalizeBuyTogetherForm, type BuyTogetherForm } from '../buy-together/settings.ts'
import { useStoreSettings } from './useStoreSettings'

/**
 * A forma do bloco Compre Junto: a que a dona gravou, ou "Na linha". Lê o mesmo `select` das outras
 * chaves (sem consulta nova), e o valor passa pela normalização — gravado errado, vale o padrão.
 */
export function useBuyTogetherForm(): BuyTogetherForm {
  const { data } = useStoreSettings()
  return normalizeBuyTogetherForm((data?.buy_together ?? DEFAULT_BUY_TOGETHER).form)
}
