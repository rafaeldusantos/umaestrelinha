// "Há uma peça à venda neste endereço?" — UMA leitura, pelo slug, sem trazer o catálogo.
//
// Nasceu no QA da feature 86 (Q03): o "Outro endereço da loja" do menu aceitava
// `/produtos/<peça que não existe>`, e o item levava a cliente à 404. A régua de `core`
// (`menuLinkPathRefusal`, R01) julga só a forma, por ser pura; a existência é pergunta do banco.
//
// Filtra por `slug` e `is_active`: uma peça desligada também é 404 na loja. Devolve `null` quando a
// leitura falhou — "não sei" é diferente de "não existe", e quem chama diz isso à dona.

import { supabase } from '@estrelinha/supabase/client'

export const activeProductExists = async (slug: string): Promise<boolean | null> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('slug')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle()
    if (error) return null
    return typeof data === 'object' && data !== null && !Array.isArray(data) && 'slug' in data
  } catch {
    return null
  }
}
