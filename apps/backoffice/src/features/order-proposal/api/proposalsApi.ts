// O painel falando com a function `order-proposals` (feature 89, `MON-11`, `LNK-03`..`LNK-06`).
//
// As tabelas da proposta não existem para o navegador (RLS sem policy, `SEG-05`): TODA leitura e
// escrita passa por aqui, por `functions.invoke`, nunca por `from('order_proposals')`. O JWT da sessão
// vai junto pelo client; quem confere o papel é a function.
//
// **`motivoDaFalha` lê o corpo da resposta de erro**, no molde de `useAdminUsers`: `functions.invoke`
// devolve `error` para todo status ≥ 400 e joga o corpo fora, e o que a Adri precisa ler é a frase do
// servidor ("Os preços mudaram enquanto você montava. Confira o resumo."), nunca "Edge Function
// returned a non-2xx status code". Aqui ele devolve também o `code` e o `summary`, porque a tela
// AGE sobre eles: `prices_changed` relê o resumo, `version_conflict` relê a proposta.

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { ProposalState } from '@estrelinha/core/proposals'

export const PROPOSALS_KEY = ['admin', 'proposals'] as const
export const proposalKey = (id: string) => [...PROPOSALS_KEY, 'detail', id] as const
export const PROPOSAL_LIST_KEY = [...PROPOSALS_KEY, 'list'] as const

const FUNCAO = 'order-proposals'

// ---------------------------------------------------------------------------------------------
// As formas que a function devolve (contrato do fecho da T08)
// ---------------------------------------------------------------------------------------------

/** O resumo que o servidor recalculou — os mesmos números que ficam travados. */
export interface ProposalServerSummary {
  subtotal: number
  promotion_discount: number
  coupon_discount: number
  coupon_applied: boolean
  coupon_free_shipping: boolean
  coupon_discarded: boolean
  manual_discount: number
  items_total: number
}

export interface ProposalListItem {
  id: string
  number: string
  status: 'open' | 'completed' | 'cancelled'
  version: number
  expires_at: string
  viewed_at: string | null
  order_id: string | null
  order_number: string | null
  customer_name: string
  customer_email: string
  items_total: number
  created_at: string
  state: ProposalState
}

export interface ProposalItemRow {
  position: number
  product_id: string
  variant_id: string | null
  product_name: string
  product_image: string | null
  variant_label: string | null
  variant_options: Record<string, string> | null
  quantity: number
  list_price: number
  unit_price: number
  engraving_text: string | null
  requires_material: boolean
  material_kinds: string[]
}

export interface ProposalEvent {
  kind: 'created' | 'edited' | 'link_sent' | 'viewed' | 'renewed' | 'cancelled' | 'completed'
  channel: 'whatsapp' | 'copy' | null
  /** O uuid da conta. Não é para tela: quem mostra o autor usa `actor_email`. */
  actor: string | null
  /** O e-mail do autor, resolvido pela function (HIS-01); `null` sem conta ou sem leitura. */
  actor_email: string | null
  created_at: string
}

export interface ProposalDetail {
  id: string
  number: string
  status: 'open' | 'completed' | 'cancelled'
  version: number
  expires_at: string
  viewed_at: string | null
  order_id: string | null
  order_number: string | null
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  coupon_id: string | null
  coupon_code: string | null
  coupon_discount: number
  coupon_free_shipping: boolean
  manual_discount_kind: 'amount' | 'percent' | null
  manual_discount_value: number | null
  manual_discount_reason: string | null
  manual_discount: number
  subtotal: number
  promotion_discount: number
  items_total: number
  created_at: string
  updated_at: string
  items: ProposalItemRow[]
  events: ProposalEvent[]
}

export interface ProposalGetResult {
  proposal: ProposalDetail
  state: ProposalState
  actions: unknown
}

export interface SaveProposalLine {
  product_id: string
  variant_id: string | null
  quantity: number
  engraving_text: string | null
}

/** O corpo do `save` — exatamente estas chaves (o rascunho monta em `model/draft.ts`). */
export interface SaveProposalPayload {
  id?: string
  version?: number
  idempotency_key?: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string | null
  customer_document: string | null
  address_zip: string | null
  address_street: string | null
  address_number: string | null
  address_complement: string | null
  address_neighborhood: string | null
  address_city: string | null
  address_state: string | null
  lines: SaveProposalLine[]
  coupon_code: string | null
  manual_discount: { kind: 'amount' | 'percent'; value: number; reason: string } | null
  expected_total: number
}

export interface SaveProposalResult {
  id: string
  number: string
  version: number
  status: string
  customer_id: string | null
  created: boolean
  changed: boolean
  reused: boolean
  /** Só ao criar (`SEG-01`). O banco guarda o hash: reabrir não remonta o link. */
  token: string | null
  expires_at: string | null
  summary: ProposalServerSummary
}

export interface RenewProposalResult {
  id: string
  number: string
  version: number
  token: string
  expires_at: string
  repriced: boolean
  summary: ProposalServerSummary
}

export type SentChannel = 'whatsapp' | 'copy'

// ---------------------------------------------------------------------------------------------
// A falha, legível
// ---------------------------------------------------------------------------------------------

export interface ProposalFailure {
  /** A frase do servidor, ou o fallback em português. */
  message: string
  /** `prices_changed`, `version_conflict`, `coupon_refused`… — `null` quando o corpo não disse. */
  code: string | null
  /** No `prices_changed`, o resumo recalculado. */
  summary: ProposalServerSummary | null
}

export class ProposalError extends Error {
  readonly code: string | null
  readonly summary: ProposalServerSummary | null
  constructor(falha: ProposalFailure) {
    super(falha.message)
    this.name = 'ProposalError'
    this.code = falha.code
    this.summary = falha.summary
  }
}

export const motivoDaFalha = async (erro: unknown, fallback: string): Promise<ProposalFailure> => {
  const resposta = (erro as { context?: Response })?.context
  if (resposta && typeof resposta.json === 'function') {
    try {
      const corpo = await resposta.json()
      if (corpo?.error) {
        return {
          message: String(corpo.error),
          code: typeof corpo.code === 'string' ? corpo.code : null,
          summary: corpo.summary ?? null,
        }
      }
    } catch {
      // Corpo ilegível (proxy, timeout): o fallback ao menos é uma frase em português.
    }
  }
  return { message: fallback, code: null, summary: null }
}

/** Uma chamada. Sucesso devolve o corpo; falha LANÇA `ProposalError` com a frase do servidor. */
const chamar = async <T>(action: string, body: Record<string, unknown>, fallback: string): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(`${FUNCAO}?action=${action}`, { body })
  if (error) throw new ProposalError(await motivoDaFalha(error, fallback))
  return data as T
}

// ---------------------------------------------------------------------------------------------
// As seis ações
// ---------------------------------------------------------------------------------------------

export const listProposals = async (): Promise<ProposalListItem[]> => {
  const data = await chamar<{ proposals: ProposalListItem[] }>('list', {}, 'Não consegui ler as propostas.')
  return data?.proposals ?? []
}

export const getProposal = (id: string): Promise<ProposalGetResult> =>
  chamar<ProposalGetResult>('get', { id }, 'Não consegui ler a proposta.')

export const saveProposal = (payload: SaveProposalPayload): Promise<SaveProposalResult> =>
  chamar<SaveProposalResult>('save', { ...payload }, 'Não consegui gravar a proposta.')

/** `expected_total` só quando a Adri já viu o total relido (o 409 `prices_changed` o devolve). */
export const renewProposal = (id: string, expectedTotal?: number | null): Promise<RenewProposalResult> =>
  chamar<RenewProposalResult>(
    'renew',
    expectedTotal == null ? { id } : { id, expected_total: expectedTotal },
    'Não consegui renovar o link.',
  )

export const cancelProposal = (id: string): Promise<{ id: string }> =>
  chamar<{ id: string }>('cancel', { id }, 'Não consegui cancelar a proposta.')

export const logProposalSent = (id: string, channel: SentChannel): Promise<unknown> =>
  chamar<unknown>('log-sent', { id, channel }, 'Não consegui registrar o envio.')

// ---------------------------------------------------------------------------------------------
// React Query
// ---------------------------------------------------------------------------------------------

export const invalidarPropostas = (qc: QueryClient, id?: string | null): Promise<void> =>
  id
    ? Promise.all([
        qc.invalidateQueries({ queryKey: PROPOSAL_LIST_KEY }),
        qc.invalidateQueries({ queryKey: proposalKey(id) }),
      ]).then(() => undefined)
    : qc.invalidateQueries({ queryKey: PROPOSALS_KEY })

export const useProposalList = () =>
  useQuery({ queryKey: PROPOSAL_LIST_KEY, queryFn: listProposals, staleTime: 30 * 1000 })

export const useProposal = (id: string | null | undefined) =>
  useQuery({
    queryKey: proposalKey(id ?? ''),
    queryFn: () => getProposal(id as string),
    enabled: !!id,
    staleTime: 0,
  })

/**
 * As quatro escritas, cada uma invalidando a lista e o detalhe da proposta que mudou. A frase da
 * falha é a do servidor — quem chama lê `error.message` (e `code`, quando precisa agir).
 */
export const useProposalMutations = () => {
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: saveProposal,
    onSuccess: (r) => invalidarPropostas(qc, r?.id),
  })
  const renew = useMutation({
    mutationFn: (v: { id: string; expectedTotal?: number | null }) => renewProposal(v.id, v.expectedTotal),
    onSuccess: (_r, v) => invalidarPropostas(qc, v.id),
  })
  const cancel = useMutation({
    mutationFn: (id: string) => cancelProposal(id),
    onSuccess: (_r, id) => invalidarPropostas(qc, id),
  })
  const logSent = useMutation({
    mutationFn: (v: { id: string; channel: SentChannel }) => logProposalSent(v.id, v.channel),
    onSuccess: (_r, v) => invalidarPropostas(qc, v.id),
  })
  return { save, renew, cancel, logSent }
}
