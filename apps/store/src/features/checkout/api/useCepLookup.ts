// Resolução de CEP no ViaCEP, com fallback para digitação manual (SHP-03, ADR-01).
//
// Movido de `features/checkout/ui/AddressStep.tsx:23-38` — o endpoint é público e sem chave.
// O hook **nunca** lança: CEP inexistente, resposta inválida e falha de rede convergem para
// `manual: true`, que é o sinal para o bloco Entrega destravar os campos.
import { useQuery } from '@tanstack/react-query'
import { stripCep } from '@estrelinha/core/validators'

export const CEP_LOOKUP_KEY = 'cep-lookup'

export interface CepLookupResult {
  street: string
  neighborhood: string
  city: string
  state: string
  /** `true` quando o ViaCEP não resolveu — a cliente digita o endereço à mão. */
  manual: boolean
}

const MANUAL: CepLookupResult = {
  street: '',
  neighborhood: '',
  city: '',
  state: '',
  manual: true,
}

export function useCepLookup(cep: string | null) {
  const cleanCep = stripCep(cep ?? '')

  return useQuery<CepLookupResult>({
    queryKey: [CEP_LOOKUP_KEY, cleanCep],
    // SHP-03: CEP incompleto não dispara requisição.
    enabled: cleanCep.length === 8,
    retry: false,
    queryFn: async () => {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        if (!res.ok) return MANUAL
        const data = await res.json()
        if (data?.erro) return MANUAL
        return {
          street: data.logradouro || '',
          neighborhood: data.bairro || '',
          city: data.localidade || '',
          state: data.uf || '',
          manual: false,
        }
      } catch {
        return MANUAL
      }
    },
  })
}
