// A leitura da aba Adesão: UMA RPC admin, com o período em dias. O banco decide que dia é (Brasília)
// e qual pedido é venda (a régua do Dashboard); o painel só diz quantos dias.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { AdoptionPeriod, BuyTogetherAdoption } from '../model/adoption'

export const BUY_TOGETHER_ADOPTION_KEY = ['buy-together-adoption'] as const

const lerAdesao = async (dias: AdoptionPeriod): Promise<BuyTogetherAdoption> => {
  const { data, error } = await supabase.rpc('buy_together_adoption', { p_dias: dias })
  // O supabase-js não rejeita: devolve `{ error }`. Sem este `throw` o estado de erro não existiria.
  if (error) throw error
  return data as BuyTogetherAdoption
}

export const useBuyTogetherAdoption = (dias: AdoptionPeriod) =>
  useQuery({
    queryKey: [...BUY_TOGETHER_ADOPTION_KEY, dias],
    queryFn: () => lerAdesao(dias),
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
