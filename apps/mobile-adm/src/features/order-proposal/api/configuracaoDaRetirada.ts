import { supabase } from '@estrelinha/supabase/client'
import { DEFAULT_MATERIAL, DEFAULT_SHIPPING, type MaterialSettings, type ShippingSettings } from '@estrelinha/supabase/types/settings'

import { lerComPapel } from '@/shared/api/lerComPapel'

/**
 * A configuração da retirada no escritório para a prévia do passo 4: o interruptor
 * (`shipping.pickup_enabled`) e o endereço do escritório (`material`), lidos de `store_settings`.
 *
 * - **Passa por `lerComPapel`**, como toda leitura do app: a confirmação do papel sai junto, e a recusa
 *   vence. A leitura que toca a tabela não é exportada e só é chamada de dentro dele.
 * - **Os defaults são os da loja** (`DEFAULT_SHIPPING`, `DEFAULT_MATERIAL`): chave ausente vale o
 *   default, e o escritório vazio faz a retirada não aparecer.
 * - Quem decide se a retirada vale para o CEP é `pickupAvailable` (`core/shipping`); aqui só se lê.
 */
export interface ConfiguracaoDaRetirada {
  ligada: boolean
  escritorio: MaterialSettings
}

interface LinhaDeConfiguracao {
  key: string
  value: unknown
}

const lerLinhas = async (): Promise<LinhaDeConfiguracao[]> => {
  const { data, error } = await supabase.from('store_settings').select('key, value').in('key', ['shipping', 'material'])
  if (error) throw error
  return (data ?? []) as LinhaDeConfiguracao[]
}

const valorDe = (linhas: readonly LinhaDeConfiguracao[], chave: string): object => {
  const valor = linhas.find((l) => l.key === chave)?.value
  return valor && typeof valor === 'object' ? valor : {}
}

export const lerConfiguracaoDaRetirada = async (): Promise<ConfiguracaoDaRetirada> => {
  const { resultado } = await lerComPapel(() => lerLinhas())
  const shipping = { ...DEFAULT_SHIPPING, ...valorDe(resultado, 'shipping') } as ShippingSettings
  const escritorio = { ...DEFAULT_MATERIAL, ...valorDe(resultado, 'material') } as MaterialSettings
  return { ligada: shipping.pickup_enabled, escritorio }
}
