// Feature `74` (`MAP-10`, `MAP-11`, `MAP-12`, `MAP-47`) — a busca de pedido, com UM dono para o painel
// e para o app do ateliê. Subiu BYTE A BYTE de `apps/backoffice/src/entities/order/api/orderQuery.ts`
// (`PED-10`); o painel reexporta por referência.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { escapeSearchTerm } from '../paging/pageMath.ts'
import { stripOrderNumberPrefix } from './format.ts'

/**
 * As cinco colunas que a busca alcança.
 *
 * Antes eram duas (`order_number`, `customer_name`). Faltavam justamente as que se tem em mãos
 * quando se está procurando: o e-mail que a cliente mandou no WhatsApp, e **os dois rastreios** —
 * o do envelope que ela postou e o da joia que saiu daqui.
 */
export const ORDER_SEARCH_COLUMNS = [
  'order_number',
  'customer_name',
  'customer_email',
  'tracking_code',
  'material_tracking_code',
] as const

/**
 * O `or=(…)` da busca, ou `null` quando não há termo.
 *
 * **O `#` cai antes de virar filtro** (`PIX-P4-05`, feature `58`). O número é gravado sem prefixo
 * (`0244`) e exibido com ele (`#0244`), então o que a Adri copia da tela, do WhatsApp ou do e-mail
 * **traz o `#`** — e `order_number.ilike.%#0244%` não acha nada. As três grafias (`244`, `0244` e
 * `#0244`) passam a cair no mesmo `%0244%`/`%244%`.
 *
 * Quem recorta é `stripOrderNumberPrefix`, o mesmo dono que põe o prefixo — um recorte escrito aqui
 * divergiria do formatador no dia em que o prefixo mudasse, e o sintoma seria só a busca deixando
 * de achar, com a tela continuando certa.
 *
 * O recorte é **do termo inteiro**, não por coluna: `#` não aparece em nome, e-mail nem código de
 * rastreio, então tirá-lo não estreita nenhuma das outras quatro buscas.
 */
export const buildOrderSearchCondition = (search: string): string | null => {
  const term = stripOrderNumberPrefix(escapeSearchTerm(search))
  if (term === '') return null
  return ORDER_SEARCH_COLUMNS.map(coluna => `${coluna}.ilike.%${term}%`).join(',')
}

/** `PED-10` — o debounce da busca, em ms. Mora aqui para a tela e o teste lerem o mesmo número. */
export const SEARCH_DEBOUNCE_MS = 300
