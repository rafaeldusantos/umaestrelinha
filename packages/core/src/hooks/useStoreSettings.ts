import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import {
  DEFAULT_GENERAL,
  DEFAULT_SHIPPING,
  DEFAULT_PAYMENT,
  DEFAULT_SEO,
  DEFAULT_ABANDONED_CART,
  DEFAULT_CHECKOUT,
  type GeneralSettings,
  type ShippingSettings,
  type PaymentSettings,
  type SeoSettings,
  type AbandonedCartSettings,
  type CheckoutSettings,
  type SettingsKey,
  type SettingsMap,
} from '@estrelinha/supabase/types/settings'

// Toda chave nova precisa entrar aqui: `fetchAllSettings` descarta linha cuja key não esteja
// em DEFAULTS (ver o `if (key in map)` abaixo).
const DEFAULTS: SettingsMap = {
  general: DEFAULT_GENERAL,
  shipping: DEFAULT_SHIPPING,
  payment: DEFAULT_PAYMENT,
  seo: DEFAULT_SEO,
  abandoned_cart: DEFAULT_ABANDONED_CART,
  checkout: DEFAULT_CHECKOUT,
}

async function fetchAllSettings(): Promise<SettingsMap> {
  const { data, error } = await supabase
    .from('store_settings')
    .select('key, value')

  if (error) {
    // tabela ainda não criada → retorna defaults para não quebrar a loja
    return DEFAULTS
  }

  const map: SettingsMap = { ...DEFAULTS }
  for (const row of data || []) {
    const key = row.key as SettingsKey
    if (key in map) {
      map[key] = { ...(map[key] as object), ...(row.value as object) } as never
    }
  }
  return map
}

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store_settings'],
    queryFn: fetchAllSettings,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGeneralSettings(): GeneralSettings {
  const { data } = useStoreSettings()
  return data?.general ?? DEFAULT_GENERAL
}

export function useShippingSettings(): ShippingSettings {
  const { data } = useStoreSettings()
  return data?.shipping ?? DEFAULT_SHIPPING
}

export function usePaymentSettings(): PaymentSettings {
  const { data } = useStoreSettings()
  return data?.payment ?? DEFAULT_PAYMENT
}

export function useSeoSettings(): SeoSettings {
  const { data } = useStoreSettings()
  return data?.seo ?? DEFAULT_SEO
}

export function useAbandonedCartSettings(): AbandonedCartSettings {
  const { data } = useStoreSettings()
  return data?.abandoned_cart ?? DEFAULT_ABANDONED_CART
}

export function useCheckoutSettings(): CheckoutSettings {
  const { data } = useStoreSettings()
  return data?.checkout ?? DEFAULT_CHECKOUT
}

type UpdateInput = { [K in SettingsKey]: { key: K; value: SettingsMap[K] } }[SettingsKey]

export function useUpdateSettings() {
  const qc = useQueryClient()
  return useMutation<void, Error, UpdateInput>({
    mutationFn: async (input) => {
      const { error } = await supabase
        .from('store_settings')
        .upsert({ key: input.key, value: input.value as object }, { onConflict: 'key' })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['store_settings'] })
    },
  })
}
