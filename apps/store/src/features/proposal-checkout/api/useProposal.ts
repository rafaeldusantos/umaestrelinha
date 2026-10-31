import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createProposalOrder,
  fetchProposal,
  type ProposalOrderInput,
  type ProposalRead,
} from './proposalApi'

export const PROPOSAL_QUERY_KEY = 'proposal'

/**
 * A proposta do token. Sem refetch ao voltar à aba: reler no meio do preenchimento trocaria o
 * resumo diante da cliente — quem relê é a página, quando o servidor diz que a versão mudou
 * (`CON-10`). Uma tentativa a mais só para falha de leitura; `unavailable` não é erro.
 */
export function useProposal(token: string | null) {
  return useQuery<ProposalRead>({
    queryKey: [PROPOSAL_QUERY_KEY, token],
    enabled: !!token,
    queryFn: () => fetchProposal(token as string),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: 1,
  })
}

export function useCreateProposalOrder() {
  return useMutation({ mutationFn: (input: ProposalOrderInput) => createProposalOrder(input) })
}
