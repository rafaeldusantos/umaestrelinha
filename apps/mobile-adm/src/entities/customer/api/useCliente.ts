import { useQuery } from '@tanstack/react-query'
import { customerOrdersCondition, isCustomerId } from '@estrelinha/core/customers'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { supabase } from '@estrelinha/supabase/client'

import { lerComPapel } from '@/shared/api/lerComPapel'
import { ler } from '@/shared/api/lerSemLancar'

import { COLUNAS_DA_CIDADE, COLUNAS_DA_FICHA, type CabecalhoDeCliente, type FichaDeCliente } from '../model/linha'

/**
 * O cabeçalho da ficha de uma cliente (feature `76`, `MAC-14`, `MAC-15`, `MAC-16`, `MAC-11`, `MAC-12`;
 * Design §3.6). UMA `queryFn` e UMA confirmação de papel (`lerComPapel`) para as duas leituras — o
 * molde de `usePedido`:
 *
 * 1. um id que não é uuid ⇒ `{ cliente: null }` SEM rede e sem RPC (`MAC-14`): o PostgREST devolveria
 *    `22P02`, e a tela diria "não consegui carregar" de um endereço que simplesmente não existe;
 * 2. o cabeçalho vem de `customer_list` (`.eq('id', id).maybeSingle()`); os três números da ficha são
 *    os DELA, nunca a soma dos pedidos da tela;
 * 3. a cidade (A6) é a SEGUNDA onda: ela precisa do e-mail do cabeçalho para ligar a pessoa aos pedidos
 *    (`customerOrdersCondition`, sem curinga — A10) e é o endereço do pedido mais recente que tem
 *    cidade;
 * 4. erro NO cabeçalho ⇒ a query falha (a ficha inteira em falha, com "Tentar de novo"); cabeçalho
 *    `null` ⇒ `{ cliente: null }` ("Não encontrei esta cliente."); erro NA cidade ⇒ a cidade é omitida
 *    e a ficha não cai;
 * 5. a recusa da RPC vence tudo: nada sai, nem o que estava em cache.
 */

export const CLIENTE_KEY = 'atelie-cliente'
export const chaveDoCliente = (id: string) => [CLIENTE_KEY, id] as const

const lerFicha = async (id: string): Promise<FichaDeCliente> => {
  if (!isCustomerId(id)) return { cliente: null, cidade: null, lido_em: null }

  const { resultado, lido_em } = await lerComPapel(async () => {
    const cabecalho = await ler<CabecalhoDeCliente>(() =>
      supabase.from('customer_list').select(COLUNAS_DA_FICHA).eq('id', id).maybeSingle(),
    )
    if (cabecalho.error) throw cabecalho.error
    if (!cabecalho.data) return { cliente: null, cidade: null }

    const cidade = await ler<{ address_city: string | null; address_state: string | null }[]>(() =>
      supabase
        .from('order_list')
        .select(COLUNAS_DA_CIDADE)
        .or(customerOrdersCondition(id, cabecalho.data.email))
        .not('address_city', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1),
    )
    const achada = cidade.error ? null : (cidade.data?.[0] ?? null)
    return {
      cliente: cabecalho.data,
      cidade: achada?.address_city ? { city: achada.address_city, state: achada.address_state ?? null } : null,
    }
  })

  return { ...resultado, lido_em }
}

export const useCliente = (id: string) =>
  useQuery({
    queryKey: chaveDoCliente(id),
    queryFn: () => lerFicha(id),
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: retryUnlessDenied,
  })
