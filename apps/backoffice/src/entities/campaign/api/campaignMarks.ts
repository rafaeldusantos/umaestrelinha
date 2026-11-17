// As leituras do bloco "Joias em oferta": as peças marcadas numa campanha (`product_campaigns`) e o
// que é preciso saber das peças escolhidas para dizer se elas aparecem no bloco.
//
// As duas falham com TIPO, e a falha nunca vira lista vazia: "não consegui ler as marcações" e "a
// campanha não tem peça marcada" levariam o editor a decisões opostas — a segunda tiraria da lista
// todas as peças escolhidas.
//
// As peças se leem por id, nunca por nome: a busca por nome tem um dono só (`entities/product/api`,
// `AD-036`).

import { useQuery } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import {
  campaignPieceStates,
  type ChosenPiece,
  type CampaignMark,
  type CampaignPieceRow,
  type CampaignPieceState,
} from '../model/campaignPieces'

/** A leitura das marcações falhou — repete-se, e nunca se lê como "nenhuma peça marcada". */
export class CampaignMarksQueryError extends Error {}

/** A leitura das peças escolhidas falhou. */
export class CampaignPiecesQueryError extends Error {}

export const campaignMarksKey = (campaignId: string | null) => ['admin-campaign-marks', campaignId] as const

/** As colunas de uma peça para a pergunta "a campanha baixa o preço dela?". */
export const CAMPAIGN_PIECE_COLUMNS =
  'id, name, is_active, base_price, original_price, product_variants(price, compare_price)'

const motivo = (erro: unknown, padrao: string): string => {
  const texto = (erro as { message?: string } | null)?.message
  return texto && texto.trim() !== '' ? texto : padrao
}

/**
 * Todas as marcações da campanha, ou falha.
 *
 * Conta primeiro e pagina depois, com a ordem estável por `product_id` (a chave da tabela é
 * peça + campanha): a leitura truncada falha em vez de devolver menos peças.
 */
export const fetchCampaignMarks = async (campaignId: string): Promise<CampaignMark[]> => {
  const { count, error } = await supabase
    .from('product_campaigns')
    .select('product_id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
  if (error) throw new CampaignMarksQueryError(`ler as peças da campanha: ${motivo(error, 'erro desconhecido')}`)

  const total = count ?? 0
  if (total === 0) return []

  try {
    return await readAllPages<CampaignMark>({
      total,
      label: 'peças marcadas na campanha',
      consequence: 'uma peça marcada pareceria fora da campanha',
      readPage: async (de, ate) => {
        const { data, error: erroDaPagina } = await supabase
          .from('product_campaigns')
          .select('product_id, percent')
          .eq('campaign_id', campaignId)
          .order('product_id')
          .range(de, ate)
        if (erroDaPagina) throw new Error(motivo(erroDaPagina, 'erro desconhecido'))
        return (data ?? []) as CampaignMark[]
      },
    })
  } catch (erro) {
    throw new CampaignMarksQueryError(`ler as peças da campanha: ${motivo(erro, 'erro desconhecido')}`)
  }
}

export interface CampaignMarksRead {
  /** As marcações, ou `null` enquanto não foram lidas (sem campanha, carregando ou com erro). */
  marks: CampaignMark[] | null
  /** Os ids das peças marcadas, ou `null` — nunca `[]` por falha. */
  ids: string[] | null
  loading: boolean
  error: string | null
  retry: () => void
}

/**
 * As marcações da campanha. Sem campanha não lê nada.
 *
 * A falha chega à tela na primeira tentativa (`retry: false`): com as novas tentativas automáticas
 * do React Query a leitura fica pendente, sem erro, enquanto elas correm — e elas param quando a aba
 * não está visível —, e o editor ficaria em "Conferindo…" sem dizer que não conseguiu. Tentar de
 * novo é decisão da dona, pelo botão que acompanha o aviso de falha.
 */
export const useCampaignMarks = (campaignId: string | null): CampaignMarksRead => {
  const query = useQuery({
    queryKey: campaignMarksKey(campaignId),
    queryFn: () => fetchCampaignMarks(campaignId as string),
    enabled: !!campaignId,
    retry: false,
  })
  const marks = query.isSuccess ? query.data : null
  return {
    marks,
    ids: marks ? marks.map(m => m.product_id) : null,
    loading: !!campaignId && query.isPending,
    error: query.error ? motivo(query.error, 'não foi possível ler as peças da campanha') : null,
    retry: () => {
      void query.refetch()
    },
  }
}

/** As peças escolhidas, por id. */
export const fetchCampaignPieces = async (productIds: readonly string[]): Promise<CampaignPieceRow[]> => {
  const ids = [...new Set(productIds)].sort()
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('products').select(CAMPAIGN_PIECE_COLUMNS).in('id', ids)
  if (error) throw new CampaignPiecesQueryError(`ler as peças escolhidas: ${motivo(error, 'erro desconhecido')}`)
  return (data ?? []) as unknown as CampaignPieceRow[]
}

export interface CampaignPiecesStateRead {
  /** O estado de cada peça escolhida, na ordem da lista; `null` enquanto não dá para dizer. */
  states: CampaignPieceState[] | null
  loading: boolean
  error: string | null
}

/**
 * O estado das peças escolhidas contra a campanha do bloco: apagada, fora do ar, fora da campanha,
 * não barateada. Sem campanha, ou com uma das duas leituras falhando, não diz nada (`states: null`).
 *
 * A escolhida é o id da peça, ou o item da seção — o item sem id (a peça apagada do catálogo) entra
 * na conta como apagada, pelo nome congelado, sem ser lido.
 */
export const useCampaignPiecesState = (
  campaignId: string | null,
  chosen: readonly (string | ChosenPiece)[],
): CampaignPiecesStateRead => {
  const productIds = chosen
    .map(item => (typeof item === 'string' ? item : item.product_id))
    .filter((id): id is string => !!id)
  const marcas = useCampaignMarks(campaignId)
  const chave = [...new Set(productIds)].sort().join(',')
  const pecas = useQuery({
    queryKey: ['admin-campaign-pieces', chave],
    queryFn: () => fetchCampaignPieces(productIds),
    enabled: !!campaignId && productIds.length > 0,
  })

  const prontas = productIds.length === 0 ? [] : pecas.isSuccess ? pecas.data : null
  const states = campaignId && marcas.marks && prontas ? campaignPieceStates(chosen, marcas.marks, prontas) : null
  return {
    states,
    loading: marcas.loading || (!!campaignId && productIds.length > 0 && pecas.isPending),
    error:
      marcas.error ??
      (pecas.error ? motivo(pecas.error, 'não foi possível ler as peças escolhidas') : null),
  }
}
