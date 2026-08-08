// Leitura do endereço `is_default` do cliente (ADR-02).
//
// Contraparte de leitura do `useSaveAddress`: sem ela o bloco Entrega não teria como abrir
// preenchido na segunda compra. Nunca rejeita — ausência de endereço e falha de leitura
// convergem para `null`, e o bloco simplesmente abre vazio.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { AddressFields } from './useSaveAddress'

export const DEFAULT_ADDRESS_KEY = 'default-address'

export function useDefaultAddress(customerId: string | undefined) {
  return useQuery<AddressFields | null>({
    queryKey: [DEFAULT_ADDRESS_KEY, customerId],
    enabled: !!customerId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addresses')
        .select('cep, street, number, complement, neighborhood, city, state')
        .eq('customer_id', customerId!)
        .eq('is_default', true)
        .maybeSingle()

      if (error || !data) return null
      return {
        cep: data.cep ?? '',
        street: data.street ?? '',
        number: data.number ?? '',
        complement: data.complement ?? '',
        neighborhood: data.neighborhood ?? '',
        city: data.city ?? '',
        state: data.state ?? '',
      }
    },
  })
}
