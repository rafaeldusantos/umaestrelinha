import { useQuery } from '@tanstack/react-query'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { pickupAvailable, pickupLocation } from '@estrelinha/core/shipping'
import type { ShippingQuote } from '@estrelinha/supabase/types'

import { lerComPapel } from '@/shared/api/lerComPapel'

import { lerConfiguracaoDaRetirada } from '../api/configuracaoDaRetirada'
import { cotarFrete } from '../api/portaDaCotacao'
import { corpoDaCotacao, enderecoCotavel } from './revisao'
import type { EnderecoDigitado } from './montagem'
import type { LinhaDaSacola } from './sacola'

/**
 * A prévia do frete do passo 4 e o relógio do servidor da nota do prazo. As duas são LEITURAS, e
 * passam por `lerComPapel`: a cotação é pública na function, então quem recusa a conta sem papel é a
 * confirmação que sai junto (`atelie_clock` ⇒ `42501`). Rede, 5xx ou resposta sem a forma é falha,
 * nunca recusa — e a falha da cotação não bloqueia o "Criar link" (a cliente cota no link).
 */
export const COTACAO_DA_MONTAGEM_KEY = 'atelie-montagem-cotacao'
export const RELOGIO_DA_MONTAGEM_KEY = 'atelie-montagem-relogio'
export const RETIRADA_DA_MONTAGEM_KEY = 'atelie-montagem-retirada'

const FALHA_DA_COTACAO = 'Não consegui cotar o frete.'

/** Só a opção com preço utilizável — o mesmo recorte da loja e do painel. */
const cotavel = (q: ShippingQuote) => q?.price != null && Number.parseFloat(q.price) > 0

/** A cotação, como LEITURA: a confirmação do papel sai junto, e a recusa vence (`lerComPapel`). */
export const lerCotacao = async (corpo: ReturnType<typeof corpoDaCotacao>): Promise<ShippingQuote[]> => {
  const { resultado: r } = await lerComPapel(() => cotarFrete(corpo))
  if (r.tipo !== 'ok' || !Array.isArray(r.dado)) throw new Error(FALHA_DA_COTACAO)
  return r.dado.filter(cotavel)
}

/** A cotação do endereço da entrega, só com CEP de 8 dígitos, rua e ao menos uma peça. */
export const useCotacaoDaRevisao = (endereco: EnderecoDigitado | null, pecas: readonly LinhaDaSacola[], habilitada: boolean) => {
  const pronta = habilitada && enderecoCotavel(endereco) && pecas.length > 0
  const corpo = pronta ? corpoDaCotacao(endereco.cep, pecas) : null
  const consulta = useQuery({
    queryKey: [COTACAO_DA_MONTAGEM_KEY, corpo?.postal_code_to ?? null, JSON.stringify(corpo?.products ?? [])],
    queryFn: () => lerCotacao(corpo),
    enabled: pronta,
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessDenied,
  })
  return { pronta, consulta }
}

/**
 * A retirada no escritório na prévia: a linha do escritório quando ela vale para o CEP da entrega, ou
 * `null`. A regra é de `core/shipping` (`pickupAvailable`, o mesmo dono da loja, do painel e da function
 * `checkout`); a configuração vem de `lerConfiguracaoDaRetirada`, dentro de `lerComPapel`. Lida só com a
 * prévia pronta (`habilitada`), junto da cotação — a recusa do papel chega à página pela cotação, que
 * passa pela mesma confirmação. Enquanto não chega (ou falha), a retirada não aparece.
 */
export const useRetiradaDaRevisao = (endereco: EnderecoDigitado | null, habilitada: boolean): string | null => {
  const { data } = useQuery({
    queryKey: [RETIRADA_DA_MONTAGEM_KEY],
    queryFn: lerConfiguracaoDaRetirada,
    enabled: habilitada,
    staleTime: 5 * 60 * 1000,
    retry: retryUnlessDenied,
  })
  if (!habilitada || !data) return null
  return pickupAvailable({ enabled: data.ligada, material: data.escritorio, cep: endereco?.cep }) ? pickupLocation(data.escritorio) : null
}

/** O instante do servidor (o dia de "o link vale até…"), pela mesma confirmação de papel das leituras. */
export const useRelogioDaMontagem = (habilitado: boolean) =>
  useQuery({
    queryKey: [RELOGIO_DA_MONTAGEM_KEY],
    queryFn: async () => (await lerComPapel(async () => null)).lido_em,
    enabled: habilitado,
    staleTime: 60 * 1000,
    retry: retryUnlessDenied,
  })
