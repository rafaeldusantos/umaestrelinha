// Liga ou desliga a peça na loja, sem passar pelo save do formulário.
//
// Grava SÓ `is_active`: o resto do formulário pode estar sujo, e um `update` mais largo gravaria
// edições que a dona ainda não decidiu salvar. O efeito é conferido por `.select('id')` — um
// `update` que a RLS filtra responde sem erro e sem linha, e passaria como sucesso (o defeito que a
// feature `75` achou na escrita do pedido).

import type { QueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { invalidarPoolDeProdutos } from './useProductPool'

/** Devolve a frase do erro, ou `null` quando gravou. */
export const setProductActive = async (
  productId: string,
  active: boolean,
  queryClient?: QueryClient,
): Promise<string | null> => {
  const { data, error } = await supabase
    .from('products')
    .update({ is_active: active })
    .eq('id', productId)
    .select('id')
  if (error) return error.message
  if (!data || data.length === 0) return 'Nenhum produto foi alterado.'
  if (queryClient) await invalidarPoolDeProdutos(queryClient)
  return null
}
