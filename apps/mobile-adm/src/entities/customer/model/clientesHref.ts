import {
  CUSTOMER_SLICES,
  DEFAULT_CUSTOMER_SLICE,
  isCustomerId,
  isCustomerSliceId,
  type CustomerSliceId,
} from '@estrelinha/core/customers'

/**
 * Os endereços da aba Clientes (feature `76`, `MAC-07`, `MAC-14`, `MAC-28`) — UM dono, lido pela página
 * que filtra e escrito por quem a abre. Escrito à mão em cada link, o chip e o endereço divergiriam sem
 * nada quebrar. `enderecoDeClientesComDonoUnico.test.ts` recusa o nome do parâmetro, o `useSearchParams`
 * e a montagem de `/clientes/…` em qualquer outro arquivo do app. Molde de `pedidosHref.ts`.
 *
 * Só o RECORTE mora no endereço. O termo da busca fica na memória da página e **nunca** na URL
 * (`MAC-28`): nome, e-mail e telefone de uma pessoa não vão para o histórico do navegador.
 *
 * O vocabulário vem de `CUSTOMER_SLICES` (`core`) — lido, não repetido.
 */

export const CLIENTES_PATH = '/clientes'
const PARAM_RECORTE = 'recorte'

/**
 * O endereço de um recorte. `todas` é o padrão e **não escreve a query** (`/clientes`): o endereço limpo
 * é a lista inteira, e o chip "Todas" volta a ele. Lança para id fora do vocabulário.
 */
export const clientesHref = (id: CustomerSliceId): string => {
  if (!isCustomerSliceId(id)) throw new Error(`recorte de clientes desconhecido: ${String(id)}`)
  if (id === DEFAULT_CUSTOMER_SLICE) return CLIENTES_PATH
  return `${CLIENTES_PATH}?${new URLSearchParams({ [PARAM_RECORTE]: id })}`
}

/** O recorte de um `location.search`, ou `null` (ausente ou fora do vocabulário — nunca um recorte qualquer). */
export const lerRecorteDeClientes = (search: string): CustomerSliceId | null => {
  const valor = new URLSearchParams(search).get(PARAM_RECORTE)
  return CUSTOMER_SLICES.find((s) => s.id === valor)?.id ?? null
}

/** O recorte que a lista mostra: o do endereço, ou `todas`. É a ÚNICA leitura que a página faz. */
export const recorteDeClientesDoEndereco = (search: string): CustomerSliceId =>
  lerRecorteDeClientes(search) ?? DEFAULT_CUSTOMER_SLICE

/**
 * O endereço da ficha de uma cliente. Lança para id que não é uuid: um e-mail, um nome ou um telefone
 * jamais viram endereço (`MAC-28`).
 */
export const clienteHref = (id: string): string => {
  if (!isCustomerId(id)) throw new Error('id de cliente que não é uuid')
  return `${CLIENTES_PATH}/${id}`
}
