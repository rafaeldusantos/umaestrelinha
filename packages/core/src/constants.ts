// Defaults / valores hardcoded — usados como fallback enquanto as
// configurações dinâmicas (`store_settings`) não foram carregadas.
//
// Em runtime, `setRuntimeSettings` é chamado pelo `RuntimeSettingsLoader`
// para hidratar estes valores a partir do banco. Componentes que precisam
// reagir a mudanças devem usar `useShippingSettings()` diretamente.
export let FREE_SHIPPING_THRESHOLD = 150
export let SHIPPING_COST = 9.9

export const setRuntimeShippingSettings = (s: {
  free_shipping_threshold?: number
  default_shipping_cost?: number
}) => {
  if (typeof s.free_shipping_threshold === 'number') {
    FREE_SHIPPING_THRESHOLD = s.free_shipping_threshold
  }
  if (typeof s.default_shipping_cost === 'number') {
    SHIPPING_COST = s.default_shipping_cost
  }
}

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
