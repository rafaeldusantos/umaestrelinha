// Feature `73` · `MAI-09`..`MAI-14` — a resposta de `public.store_overview()`.
//
// **Tipo escrito à mão é afirmação** (`AD-012`). `OVERVIEW_KEYS` e as listas ao lado são derivadas
// de um `Record<keyof …, true>`: chave a mais ou a menos no TIPO faz o `tsc` recusar o objeto. A
// comparação com a saída REAL da RPC é o probe da T09 (`probes/`) e o caso de `overview.test.ts`
// que carrega a lista copiada dela.
//
// Nenhum dia é calculado aqui: `hoje`, `mes` e os `dia` da semana chegam como texto já decidido pelo
// banco (`AD-055`).

export interface OverviewDay {
  /** `'AAAA-MM-DD'`, dia de Brasília. */
  dia: string
  /** ISO: segunda = 1, domingo = 7. */
  dow: number
  vendas: number
  /** `0` sem venda. */
  faturamento: number
}

export interface OverviewJewel {
  /** `product_id` quando o produto existe no catálogo; senão `'nome:' || product_name`. */
  chave: string
  nome: string
  pecas: number
  /**
   * `products.images` CRU (2026-10-26), `null` quando o item não casou com o catálogo. A capa sai de
   * `primaryImage(imagens)` no app — a escolha não é refeita em SQL.
   */
  imagens: unknown
  /** Um `order_items.product_image` não vazio do mês (o snapshot), ou `null`. */
  foto_do_pedido: string | null
}

export interface OverviewQueue {
  aguardando: number
  a_separar: number
  sem_rastreio: number
  pix_aguardando: number
  /** A UNIÃO dos três primeiros (`count` com `or`) — nunca a soma. */
  precisa_acao: number
  /** `created_at` do mais antigo aguardando material, ou `null`. */
  aguardando_desde: string | null
}

export interface OverviewRecentOrder {
  id: string
  order_number: string
  customer_name: string
  total: number
  created_at: string
  status: string
  payment_status: string
  material_status: string | null
  shipping_service_id: string | null
  delivery_estimate_max: string | null
}

export interface StoreOverview {
  /** `'AAAA-MM-DD'`, de `store_day(p_agora)`. */
  hoje: string
  /** `'AAAA-MM'`. */
  mes: string
  /** ISO, o `p_agora`. */
  lido_em: string
  /** ISO, `store_day_start(hoje + 1)`. */
  expira_em: string
  /** 7 dias, do mais antigo a hoje. */
  semana: OverviewDay[]
  mes_resumo: { vendas: number; faturamento: number }
  clientes_novas: number
  /** Até 4. */
  joias: OverviewJewel[]
  fila: OverviewQueue
  /** 4, por `created_at` desc. */
  recentes: OverviewRecentOrder[]
}

const TOPO: Record<keyof StoreOverview, true> = {
  hoje: true, mes: true, lido_em: true, expira_em: true, semana: true, mes_resumo: true,
  clientes_novas: true, joias: true, fila: true, recentes: true,
}
const DIA: Record<keyof OverviewDay, true> = { dia: true, dow: true, vendas: true, faturamento: true }
const JOIA: Record<keyof OverviewJewel, true> = { chave: true, nome: true, pecas: true, imagens: true, foto_do_pedido: true }
const FILA: Record<keyof OverviewQueue, true> = {
  aguardando: true, a_separar: true, sem_rastreio: true, pix_aguardando: true, precisa_acao: true,
  aguardando_desde: true,
}
const RECENTE: Record<keyof OverviewRecentOrder, true> = {
  id: true, order_number: true, customer_name: true, total: true, created_at: true, status: true,
  payment_status: true, material_status: true, shipping_service_id: true, delivery_estimate_max: true,
}
const MES_RESUMO: Record<keyof StoreOverview['mes_resumo'], true> = { vendas: true, faturamento: true }

const ordenadas = (r: Record<string, true>): readonly string[] => Object.keys(r).sort()

/** As chaves do tipo, ordenadas, por nível — a régua contra a saída real da RPC. */
export const OVERVIEW_KEYS = {
  topo: ordenadas(TOPO),
  semana: ordenadas(DIA),
  mes_resumo: ordenadas(MES_RESUMO),
  joias: ordenadas(JOIA),
  fila: ordenadas(FILA),
  recentes: ordenadas(RECENTE),
} as const
