// Grava/atualiza o endereço `is_default` do cliente (ADR-03, ADR-04).
//
// Como em `entities/customer`, a checagem é por **linhas afetadas**: `.update()` no Supabase
// não lança quando a RLS nega — devolve 0 linhas sem `error`.
//
// Diferença proposital em relação a `useSaveCustomerCpf` (design.md → Error Handling): falhar
// aqui **não** bloqueia a compra. O pedido já carrega o endereço nas suas próprias colunas;
// `addresses` é conveniência para a próxima compra. Por isso o hook **resolve** com
// `{ saved: false }` e loga, em vez de rejeitar.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

export interface AddressFields {
  cep: string
  street: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
}

export interface SaveAddressInput {
  customerId: string
  address: AddressFields
}

export interface SaveAddressResult {
  saved: boolean
}

const NOT_SAVED: SaveAddressResult = { saved: false }

const warn = (reason: string) =>
  console.warn('[useSaveAddress] endereço não foi salvo em `addresses`:', reason)

export function useSaveAddress() {
  return useMutation<SaveAddressResult, Error, SaveAddressInput>({
    mutationFn: async ({ customerId, address }) => {
      const { data: existing, error: lookupError } = await supabase
        .from('addresses')
        .select('id')
        .eq('customer_id', customerId)
        .eq('is_default', true)
        .maybeSingle()

      // Sem saber se já existe um default, gravar arriscaria criar um segundo (ADR-04).
      if (lookupError) {
        warn(lookupError.message)
        return NOT_SAVED
      }

      const { data, error } = existing
        ? await supabase.from('addresses').update(address).eq('id', existing.id).select()
        : await supabase
            .from('addresses')
            .insert({ customer_id: customerId, ...address, is_default: true })
            .select()

      if (error) {
        warn(error.message)
        return NOT_SAVED
      }
      if (!data || data.length === 0) {
        warn('nenhuma linha afetada (RLS)')
        return NOT_SAVED
      }

      return { saved: true }
    },
  })
}
