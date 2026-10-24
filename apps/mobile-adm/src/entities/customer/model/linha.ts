// Feature `76` — o FORMATO do que a lista de clientes e a ficha leem (`MAC-03`, `MAC-15`, `MAC-16`,
// `MAC-29`).
//
// Só formato: as colunas pedidas ao PostgREST, nomeadas uma a uma, e os tipos do que volta. Nenhuma
// regra mora aqui — "em que recorte", "quem é a pessoa deste pedido" e "como se escreve a busca" são
// de `@estrelinha/core/customers`.
//
// **Tipo escrito à mão é afirmação, não verificação** (`AD-012`): cada lista abaixo é conferida pelo
// probe `.specs/features/76-mobile-adm-clientes/probes/01-banco.ts`, que lê o banco local e exige que a
// resposta tenha EXATAMENTE estas chaves (a coluna `orders_open`, da migration da `76`, é provada pelo
// probe `02-em-aberto`). **Nenhuma** lista contém `cpf`, `material_kinds`, `orders_with_material`,
// `same_email_count`, `address_street…`, `customer_document`, `customer_phone`, nem coluna
// `nuvemshop_*`: o que a tela não desenha não atravessa a rede nem fica no aparelho
// (`semDadoSensivelDeClienteNoApp`).

/** A linha da lista, na view `customer_list` (`MAC-03`). */
export const COLUNAS_DA_LISTA =
  'id, name, email, phone, created_at, orders_paid, total_spent, last_order_at, last_activity_at, orders_open'

/** O cabeçalho da ficha, na mesma view, `.eq('id', id).maybeSingle()` (`MAC-15`, `MAC-16`). */
export const COLUNAS_DA_FICHA =
  'id, name, email, phone, created_at, orders_paid, orders_total, total_spent, avg_ticket, orders_open'

/** Um pedido da ficha, na view `order_list` (a view também traz `customer_id`/`customer_email`, usados no filtro). */
export const COLUNAS_DO_PEDIDO =
  'id, order_number, status, payment_status, shipping_service_id, material_status, total, created_at'

/** O nome do primeiro item de cada pedido da janela (`.in('order_id', ids)`, uma leitura só). */
export const COLUNAS_DOS_ITENS = 'order_id, product_name'

/** A cidade mais recente da pessoa, em `order_list` (`.not('address_city', 'is', null)`). */
export const COLUNAS_DA_CIDADE = 'address_city, address_state'

/** "Ver cliente": o id da pessoa de `customer_directory` que tem aquele e-mail. */
export const COLUNAS_DO_ACHADO = 'id'

export interface LinhaDeCliente {
  id: string
  name: string | null
  email: string
  phone: string | null
  created_at: string
  orders_paid: number
  /** `numeric` chega como `number` (medido no probe da T02): sem `Number()`. */
  total_spent: number
  last_order_at: string | null
  /** A string do servidor, com microssegundos — é o cursor da página seguinte (R1). */
  last_activity_at: string | null
  orders_open: number
}

/** O cabeçalho da ficha: o que `customer_list` devolve para uma pessoa. */
export interface CabecalhoDeCliente {
  id: string
  name: string | null
  email: string
  phone: string | null
  created_at: string
  orders_paid: number
  orders_total: number
  total_spent: number
  /** `null` quando nunca houve pedido pago — a tela escreve um travessão, nunca "R$ 0,00". */
  avg_ticket: number | null
  orders_open: number
}

/** A ficha lida: o cabeçalho, a cidade (A6; `null` sem pedido com endereço) e o instante do banco. */
export interface FichaDeCliente {
  /** `null` ⇒ "Não encontrei esta cliente." */
  cliente: CabecalhoDeCliente | null
  cidade: { city: string; state: string | null } | null
  /** `null` só quando NÃO houve leitura (o endereço não é um id de cliente). */
  lido_em: string | null
}

/** Um pedido da ficha, com o nome do primeiro item (ou `null`: a leitura dos itens falhou ou não há item). */
export interface PedidoDaFicha {
  id: string
  order_number: string
  status: string
  payment_status: string
  shipping_service_id: string | null
  material_status: string
  total: number
  created_at: string
  item: string | null
}

/** Uma janela da lista, do topo: `fim` quando a última leitura veio curta (`MAC-05`). */
export interface JanelaDeClientes {
  linhas: LinhaDeCliente[]
  total: number
  lido_em: string
  fim: boolean
}
