// Defaults / valores hardcoded — usados como fallback enquanto as
// configurações dinâmicas (`store_settings`) não foram carregadas.
//
// Em runtime, `setRuntimeSettings` é chamado pelo `RuntimeSettingsLoader`
// para hidratar estes valores a partir do banco. Componentes que precisam
// reagir a mudanças devem usar `useShippingSettings()` diretamente.
export let FREE_SHIPPING_THRESHOLD = 150
export let SHIPPING_COST = 9.9

/**
 * O interruptor do frete grátis, no caminho **não-React** (`FRG-01`).
 *
 * Nasce `false` pelo mesmo motivo que `DEFAULT_SHIPPING.free_shipping_enabled`: enquanto a linha do
 * banco não chega, a loja não pode piscar uma promessa de frete grátis que talvez não se confirme.
 */
export let FREE_SHIPPING_ENABLED = false

export const setRuntimeShippingSettings = (s: {
  free_shipping_enabled?: boolean
  free_shipping_threshold?: number
  default_shipping_cost?: number
}) => {
  if (typeof s.free_shipping_enabled === 'boolean') {
    FREE_SHIPPING_ENABLED = s.free_shipping_enabled
  }
  if (typeof s.free_shipping_threshold === 'number') {
    FREE_SHIPPING_THRESHOLD = s.free_shipping_threshold
  }
  if (typeof s.default_shipping_cost === 'number') {
    SHIPPING_COST = s.default_shipping_cost
  }
}

/**
 * A configuração de frete grátis hidratada, no formato que `freeShippingState` consome.
 *
 * Existe para que o `cartStore` — zustand, fora do React, sem acesso a hook — chame **a mesma
 * função** que as telas chamam, em vez de comparar `subtotal >= FREE_SHIPPING_THRESHOLD` por conta
 * própria. Era exatamente essa comparação que zerava o frete no carrinho com a faixa em zero,
 * enquanto a vitrine já não prometia nada.
 *
 * É função e não constante porque os valores acima são **reatribuídos** por
 * `setRuntimeShippingSettings`: um objeto montado na carga do módulo congelaria os defaults.
 */
export const runtimeFreeShippingConfig = () => ({
  free_shipping_enabled: FREE_SHIPPING_ENABLED,
  free_shipping_threshold: FREE_SHIPPING_THRESHOLD,
})

/**
 * Espelha `minimum_password_length` em supabase/config.toml. Vive aqui (e não em
 * @estrelinha/auth) para que a UI possa validar a senha sem arrastar o client do
 * Supabase para dentro do bundle/teste do componente.
 */
export const MIN_PASSWORD_LENGTH = 6

export const iconMap: Record<string, string> = {
  anime: 'Tv2',
  kpop: 'Music2',
  filmes: 'Film',
  bandas: 'Guitar',
  games: 'Gamepad2',
  series: 'Monitor',
}
