import { directoryEmailCondition } from '@estrelinha/core/customers'
import { supabase } from '@estrelinha/supabase/client'

import { lerComPapel } from '@/shared/api/lerComPapel'

import { COLUNAS_DO_ACHADO } from '../model/linha'

/**
 * "Ver cliente" (feature `76`, `MAC-21`, A10, A11): a pessoa de `customer_directory` que tem o e-mail do
 * pedido. A leitura passa por `lerComPapel` como toda leitura do app (a RLS devolveria a uma conta sem
 * papel as linhas DELA, sem erro).
 *
 * - **O e-mail é EXATO**: `directoryEmailCondition` (`core`) devolve `email.ilike.<ilikeExact>`, sem `%`,
 *   com `\ % _` escapados — `VROSA_RJ` não acha `VROSAXRJ`. O app não escreve `ilike` nenhum.
 * - **Mais de uma pessoa com o mesmo e-mail** (a convidada que depois criou conta, `same_email_count`):
 *   a conta vence (`has_account desc`) e, no empate, a mais antiga (`created_at asc`). Estável.
 * - Achou ⇒ `{ id }`; nenhuma linha ⇒ `null` ("Não encontrei esta cliente."). A recusa e a falha de
 *   leitura LANÇAM — quem chama separa as duas (`isAccessDenied`).
 * - E-mail vazio ⇒ `null` sem ir à rede: nada a procurar.
 */
export const buscarClientePorEmail = async (email: string): Promise<{ id: string } | null> => {
  const alvo = (email ?? '').trim()
  if (alvo === '') return null
  const { resultado } = await lerComPapel(async () => {
    const { data, error } = await supabase
      .from('customer_directory')
      .select(COLUNAS_DO_ACHADO)
      .or(directoryEmailCondition(alvo))
      .order('has_account', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
    if (error) throw error
    return ((data ?? []) as unknown as { id: string }[])[0] ?? null
  })
  return resultado ? { id: resultado.id } : null
}
