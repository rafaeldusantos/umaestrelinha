// A cliente da proposta: busca, ficha por e-mail e endereços salvos (feature 89, `MON-02`, `MON-03`,
// `MON-04`).
//
// **A busca lê `customer_list`, não `customers`**: a convidada (quem comprou sem conta) só existe na
// view, e `MON-02` pede que ela apareça. O filtro é o MESMO da listagem de Clientes —
// `buildCustomerSearchCondition`, de `core/customers` —, nunca um `.ilike` escrito aqui: duas réguas
// de "acha a Fulana" discordariam, e a Adri acharia numa tela quem não acha na outra.
//
// **`has_account` NÃO é "tem conta na loja".** Na view ele é `true` para toda linha de `customers`
// (com ou sem `user_id`) e `false` para a convidada, cujo id é `md5(e-mail)` e não existe em tabela
// nenhuma. Por isso a cliente devolvida carrega `fichaId`: o id de `customers` quando há ficha, e
// `null` para a convidada. É o `fichaId` que vai como `customer_id` para a function `order-proposals`
// — mandar o id da convidada seria `customer_not_found`.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { buildCustomerSearchCondition, directoryEmailCondition } from '@estrelinha/core/customers'
import { isValidEmail, normalizeEmail } from '@estrelinha/core/validators'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const CUSTOMER_PICK_COLUMNS = 'id, name, email, phone, cpf, has_account'
export const CUSTOMER_PICK_LIMIT = 10
export const ADDRESS_COLUMNS =
  'id, label, cep, street, number, complement, neighborhood, city, state, is_default, created_at'

export const CUSTOMER_SEARCH_KEY = ['admin', 'customers', 'pick'] as const
export const CUSTOMER_BY_EMAIL_KEY = ['admin', 'customers', 'by-email'] as const
export const CUSTOMER_ADDRESSES_KEY = ['admin', 'customers', 'addresses'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ClienteEncontrada {
  /** O id da view (para a convidada, o `md5` do e-mail). */
  id: string
  name: string
  email: string
  phone: string | null
  cpf: string | null
  /** O id em `customers`, ou `null` para a convidada (sem ficha). */
  fichaId: string | null
}

export interface EnderecoSalvo {
  id: string
  label: string | null
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
  is_default: boolean
}

const paraCliente = (r: any): ClienteEncontrada => ({
  id: String(r.id),
  name: String(r.name ?? ''),
  email: String(r.email ?? ''),
  phone: r.phone ?? null,
  cpf: r.cpf ?? null,
  fichaId: r.has_account === true ? String(r.id) : null,
})

const falha = (erro: any, padrao: string) => new Error(erro?.message || padrao)

/** `MON-02` — até 10 clientes pelo nome, e-mail, telefone ou CPF. Termo vazio não consulta. */
export const lerClientes = async (termo: string, client: any = supabase): Promise<ClienteEncontrada[]> => {
  const condicao = buildCustomerSearchCondition(termo)
  if (!condicao) return []
  const { data, error } = await client
    .from('customer_list')
    .select(CUSTOMER_PICK_COLUMNS)
    .or(condicao)
    .order('name')
    .order('id')
    .limit(CUSTOMER_PICK_LIMIT)
  if (error) throw falha(error, 'não foi possível buscar as clientes')
  return ((data ?? []) as any[]).map(paraCliente)
}

/**
 * `MON-03` — a ficha que já existe para este e-mail, comparado sem caixa e sem espaço nas pontas.
 *
 * O e-mail vai EXATO (`directoryEmailCondition`, escapado e sem curinga): `VROSA_RJ@…` não pode puxar
 * `VROSAXRJ@…`. Havendo uma linha de `customers` e uma de convidada (não deveria: a view recorta), a
 * ficha vence — é ela que a proposta reaproveita.
 */
export const lerClientePorEmail = async (
  email: string,
  client: any = supabase,
): Promise<ClienteEncontrada | null> => {
  const limpo = normalizeEmail((email ?? '').trim())
  if (!isValidEmail(limpo)) return null
  const { data, error } = await client
    .from('customer_list')
    .select(CUSTOMER_PICK_COLUMNS)
    .or(directoryEmailCondition(limpo))
    .limit(5)
  if (error) throw falha(error, 'não foi possível conferir o e-mail')
  const linhas = ((data ?? []) as any[]).map(paraCliente)
  return linhas.find((c) => c.fichaId !== null) ?? linhas[0] ?? null
}

/** `MON-02` — os endereços salvos da ficha, com o padrão PRIMEIRO. Convidada não tem endereço salvo. */
export const lerEnderecosDaCliente = async (
  fichaId: string,
  client: any = supabase,
): Promise<EnderecoSalvo[]> => {
  const { data, error } = await client
    .from('addresses')
    .select(ADDRESS_COLUMNS)
    .eq('customer_id', fichaId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw falha(error, 'não foi possível ler os endereços')
  const linhas = ((data ?? []) as any[]).map((r) => ({ ...r, is_default: r.is_default === true }) as EnderecoSalvo)
  // A ordem do banco já põe o padrão na frente; a ordenação estável daqui é o que garante a regra se
  // a consulta mudar.
  return linhas.slice().sort((a, b) => Number(b.is_default) - Number(a.is_default))
}

export interface EnderecoParaGravar {
  cep: string
  street: string
  number: string
  complement: string | null
  neighborhood: string
  city: string
  state: string
}

/**
 * `MON-04` — "Salvar no cadastro da cliente". Escreve em `addresses` (policy de admin), nunca nas
 * tabelas da proposta. Só existe com ficha: a convidada ganha a ficha na gravação da proposta, e é
 * com o `customer_id` que a function devolve que a página chama esta função.
 */
export const gravarEnderecoDaCliente = async (
  fichaId: string,
  endereco: EnderecoParaGravar,
  opcoes: { padrao: boolean },
  client: any = supabase,
): Promise<string | null> => {
  if (!UUID.test(fichaId)) return 'A ficha da cliente não existe mais.'
  const { error } = await client.from('addresses').insert({
    customer_id: fichaId,
    label: 'Casa',
    cep: endereco.cep.replace(/\D/g, ''),
    street: endereco.street.trim(),
    number: endereco.number.trim(),
    complement: endereco.complement?.trim() || null,
    neighborhood: endereco.neighborhood.trim(),
    city: endereco.city.trim(),
    state: endereco.state.trim().toUpperCase(),
    is_default: opcoes.padrao,
  })
  return error ? (error.message as string) || 'Não foi possível salvar o endereço.' : null
}

export const useCustomerSearch = (termo: string) => {
  const limpo = (termo ?? '').trim()
  const { data, isFetching, error } = useQuery({
    queryKey: [...CUSTOMER_SEARCH_KEY, limpo],
    queryFn: () => lerClientes(limpo),
    enabled: buildCustomerSearchCondition(limpo) !== null,
    staleTime: 30 * 1000,
  })
  return {
    clientes: data ?? [],
    buscando: isFetching,
    erro: error ? (error as Error).message : null,
  }
}

export const useCustomerByEmail = (email: string) => {
  const limpo = normalizeEmail((email ?? '').trim())
  const { data, isFetching } = useQuery({
    queryKey: [...CUSTOMER_BY_EMAIL_KEY, limpo],
    queryFn: () => lerClientePorEmail(limpo),
    enabled: isValidEmail(limpo),
    staleTime: 30 * 1000,
  })
  return { existente: data ?? null, conferindo: isFetching }
}

export const useCustomerAddresses = (fichaId: string | null | undefined) => {
  const id = fichaId && UUID.test(fichaId) ? fichaId : null
  const { data, isLoading, error } = useQuery({
    queryKey: [...CUSTOMER_ADDRESSES_KEY, id],
    queryFn: () => lerEnderecosDaCliente(id as string),
    enabled: id !== null,
    staleTime: 30 * 1000,
  })
  return {
    enderecos: data ?? [],
    carregando: id !== null && isLoading,
    erro: error ? (error as Error).message : null,
  }
}
