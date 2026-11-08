// "O CEP manda": depois da leitura de um texto colado, o endereço lido encontra a resposta do
// serviço de CEP. Quando o serviço conhece o CEP, rua, bairro, cidade e UF vêm dele — o texto da
// conversa erra a grafia, abrevia ("R.", "POA") e troca bairro; o serviço não. Número e complemento
// são sempre do texto: o serviço não os conhece.
//
// Puro, sem import de valor: a resposta do serviço chega com a forma de `CepLookupResult`
// (`core/hooks/useCepLookup.ts`), declarada aqui de forma estrutural para a folha não arrastar o
// React Query.

import type { ParsedAddress } from './parse.ts'

/** A resposta do serviço de CEP, como `useCepLookup` a entrega. */
export interface CepServiceAnswer {
  street: string
  neighborhood: string
  city: string
  state: string
  /** `true` quando o serviço não conhece o CEP. */
  manual: boolean
}

export type CepField = 'street' | 'neighborhood' | 'city' | 'state'

const CAMPOS_DO_CEP: readonly CepField[] = ['street', 'neighborhood', 'city', 'state']

export interface CepMerge {
  address: ParsedAddress
  /** Os campos que vieram do serviço — o "O CEP conferiu rua, bairro e cidade". */
  fromCep: CepField[]
}

/**
 * `answer` nulo (o serviço não respondeu) ou `manual` (não conhece o CEP): fica o que o texto trouxe.
 * Campo vazio na resposta (CEP de cidade, sem rua): fica o do texto.
 */
export function mergeCep(address: ParsedAddress, answer: CepServiceAnswer | null): CepMerge {
  const saida: ParsedAddress = { ...address }
  const fromCep: CepField[] = []
  if (!answer || answer.manual) return { address: saida, fromCep }

  for (const campo of CAMPOS_DO_CEP) {
    const valor = typeof answer[campo] === 'string' ? answer[campo].trim() : ''
    if (valor === '') continue
    saida[campo] = valor
    fromCep.push(campo)
  }
  return { address: saida, fromCep }
}
