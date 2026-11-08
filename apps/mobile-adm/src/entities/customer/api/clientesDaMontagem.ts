import { useQuery } from '@tanstack/react-query'
import { CUSTOMER_PAGE_SIZE, buildAppCustomerSearch, directoryEmailCondition, isCustomerId } from '@estrelinha/core/customers'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { isValidEmail, normalizeEmail } from '@estrelinha/core/validators'
import { supabase } from '@estrelinha/supabase/client'

import { lerComPapel } from '@/shared/api/lerComPapel'

import { COLUNAS_DA_MONTAGEM, COLUNAS_DO_ENDERECO_SALVO, type ClienteDaMontagem, type EnderecoSalvo } from '../model/linha'

/**
 * As três leituras de cliente da MONTAGEM de um pedido. Toda leitura do app
 * passa por `lerComPapel` (a RLS devolveria a uma conta sem papel as linhas DELA, sem erro), e a recusa
 * vence a falha — quem chama separa as duas (`isAccessDenied`).
 *
 * - **A busca** lê `customer_list` (a convidada só existe na view) pela MESMA regra da aba Clientes,
 *   `buildAppCustomerSearch` (`core`): nome, e-mail e telefone — por dígitos também —, nunca o
 *   documento. Termo vazio lista as primeiras, por nome.
 * - **A ficha por e-mail** é EXATA (`directoryEmailCondition`, sem curinga): a ficha de `customers`
 *   vence a convidada. E-mail inválido não vai à rede.
 * - **Os endereços salvos** são da ficha (`customers`), com o padrão primeiro. Só a montagem os lê: a
 *   aba Clientes e o detalhe do pedido continuam sem endereço completo. Nada fica no aparelho:
 *   o cache do React Query é memória, e a troca de conta o limpa.
 */

export const CLIENTES_DA_MONTAGEM_KEY = 'atelie-montagem-clientes'
export const FICHA_POR_EMAIL_KEY = 'atelie-montagem-ficha'
export const ENDERECOS_SALVOS_KEY = 'atelie-montagem-enderecos'

type LinhaLida = { id: string; name: string | null; email: string; phone: string | null; has_account: boolean | null; orders_total: number | null }

const paraCliente = (r: LinhaLida): ClienteDaMontagem => ({
  id: String(r.id),
  name: r.name ?? null,
  email: String(r.email ?? ''),
  phone: r.phone ?? null,
  fichaId: r.has_account === true ? String(r.id) : null,
  pedidos: Number(r.orders_total ?? 0) || 0,
})

const buscar = async (termo: string): Promise<ClienteDaMontagem[]> => {
  const busca = buildAppCustomerSearch(termo)
  const { resultado } = await lerComPapel(async () => {
    let q = supabase.from('customer_list').select(COLUNAS_DA_MONTAGEM)
    if (busca) q = q.or(busca)
    const { data, error } = await q.order('name', { ascending: true }).order('id', { ascending: true }).limit(CUSTOMER_PAGE_SIZE)
    if (error) throw error
    return (data ?? []) as unknown as LinhaLida[]
  })
  return resultado.map(paraCliente)
}

const fichaPorEmail = async (email: string): Promise<ClienteDaMontagem | null> => {
  const alvo = normalizeEmail((email ?? '').trim())
  if (!isValidEmail(alvo)) return null
  const { resultado } = await lerComPapel(async () => {
    const { data, error } = await supabase.from('customer_list').select(COLUNAS_DA_MONTAGEM).or(directoryEmailCondition(alvo)).limit(5)
    if (error) throw error
    return (data ?? []) as unknown as LinhaLida[]
  })
  const linhas = resultado.map(paraCliente)
  return linhas.find((c) => c.fichaId !== null) ?? linhas[0] ?? null
}

const enderecosDa = async (fichaId: string): Promise<EnderecoSalvo[]> => {
  const { resultado } = await lerComPapel(async () => {
    const { data, error } = await supabase
      .from('addresses')
      .select(COLUNAS_DO_ENDERECO_SALVO)
      .eq('customer_id', fichaId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as unknown as EnderecoSalvo[]
  })
  return resultado.map((e) => ({ ...e, is_default: e.is_default === true }))
}

/** A busca da montagem — o termo já vem com o atraso do campo. */
export const useClientesDaMontagem = (termo: string, habilitada: boolean) => {
  const limpo = (termo ?? '').trim()
  return useQuery({
    queryKey: [CLIENTES_DA_MONTAGEM_KEY, limpo],
    queryFn: () => buscar(limpo),
    enabled: habilitada,
    staleTime: 0,
    retry: retryUnlessDenied,
  })
}

/** A ficha que já existe para o e-mail digitado. E-mail inválido não consulta. */
export const useFichaPorEmail = (email: string) => {
  const alvo = normalizeEmail((email ?? '').trim())
  return useQuery({
    queryKey: [FICHA_POR_EMAIL_KEY, alvo],
    queryFn: () => fichaPorEmail(alvo),
    enabled: isValidEmail(alvo),
    staleTime: 0,
    retry: retryUnlessDenied,
  })
}

/** Os endereços salvos da ficha escolhida (a convidada não tem). */
export const useEnderecosSalvos = (fichaId: string | null) => {
  const id = fichaId && isCustomerId(fichaId) ? fichaId : null
  return useQuery({
    queryKey: [ENDERECOS_SALVOS_KEY, id],
    queryFn: () => enderecosDa(id as string),
    enabled: id !== null,
    staleTime: 0,
    retry: retryUnlessDenied,
  })
}
