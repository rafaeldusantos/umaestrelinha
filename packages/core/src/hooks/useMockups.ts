import { useQuery } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type { MockupTemplate } from '@nanapin/supabase/types'

async function fetchActiveMockups(): Promise<MockupTemplate[]> {
  const { data, error } = await supabase
    .from('mockup_templates')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error || !data) {
    // tabela ainda não criada / erro → retorna [] para não quebrar a loja
    return []
  }

  return data as MockupTemplate[]
}

export function useMockups() {
  return useQuery({
    queryKey: ['mockup_templates', 'active'],
    queryFn: fetchActiveMockups,
    staleTime: 1000 * 60 * 5,
  })
}
