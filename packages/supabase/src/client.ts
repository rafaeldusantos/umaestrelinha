import { createClient } from '@supabase/supabase-js'

/**
 * As duas env do Supabase do navegador têm UM leitor: este arquivo. Quem precisa delas fora do
 * client — o envio da visita, que é um `fetch` cru com só a chave publicável para não levar o JWT da
 * sessão (feature `71`, `VIS-13`) — importa daqui, nunca de `import.meta.env`.
 */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_PUBLISHABLE_KEY: string = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  throw new Error(
    'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY no .env do app.'
  )
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
