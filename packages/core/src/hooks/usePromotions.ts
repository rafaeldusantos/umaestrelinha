// Promoções vigentes, no formato que a regra pura consome (feature 17).
//
// A loja não decide preço: ela lê as MESMAS linhas que o `create-payment` lê e chama a MESMA função
// (`resolveOrderPricing`). Este arquivo é só a ponte de leitura — nenhuma aritmética de desconto
// mora aqui, de propósito.
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@nanapin/supabase/client'
import type {
  DbPromotion,
  DbPromotionCategory,
  DbPromotionEligibleProduct,
  DbPromotionTier,
  PromotionDiscountKind,
  PromotionScope,
} from '@nanapin/supabase/types/promotion'
import type { ProgressivePromotion, ProgressiveTier } from '../payment/pricing'

/**
 * Uma promoção vigente com o nome da campanha.
 *
 * `ProgressivePromotion` (o tipo puro de `payment/pricing.ts`) não tem `name` porque a aritmética
 * não precisa dele. A **frase do descartado** precisa: PRM-17 pede "a promoção Kit de bottons
 * desconta mais", nomeando a campanha e não o uuid. Daí a extensão aqui, em vez de um campo novo no
 * domínio puro.
 */
export interface ActivePromotion extends ProgressivePromotion {
  name: string
}

/**
 * O mesmo `staleTime` de `useStoreSettings` (5 min), e por um motivo de tela: o total do carrinho é
 * calculado a partir DESTA lista. Com `staleTime` curto, um refetch em outra rota invalidaria o
 * cache e o total piscaria — cairia para o preço cheio no primeiro render seguinte e voltaria ao
 * descontado quando a query resolvesse. Promoção muda por dia, não por segundo.
 */
export const PROMOTIONS_STALE_TIME = 1000 * 60 * 5

/**
 * As mesmas colunas que `mercado-pago/handlers.ts` seleciona, mais `name`. Vigência e `active` vêm
 * na linha porque são avaliadas em TypeScript logo abaixo — ver `isLive`.
 */
const PROMOTION_SELECT =
  'id, name, discount_kind, scope, stacks_with_coupon, active, valid_from, valid_until, created_at, promotion_tiers(min_qty, value)'

type PromotionRow = Pick<
  DbPromotion,
  | 'id'
  | 'name'
  | 'discount_kind'
  | 'scope'
  | 'stacks_with_coupon'
  | 'active'
  | 'valid_from'
  | 'valid_until'
  | 'created_at'
> & {
  promotion_tiers: Pick<DbPromotionTier, 'min_qty' | 'value'>[] | null
}

/**
 * "Esta promoção vale agora?" — decidido aqui, exatamente como o servidor decide (em TypeScript, não
 * como `.eq`/`.gte` na query).
 *
 * A policy pública de RLS já filtra `active` e vigência, e ainda assim o filtro existe: **quem entra
 * na loja logada como admin lê pela policy de admin**, que devolve tudo — inclusive campanha pausada
 * e programada para o mês que vem. Sem este filtro a dona da loja veria um total que o
 * `create-payment` recusaria a cobrar, que é a divergência exata que esta feature existe para matar.
 *
 * Promoção sem faixa nenhuma também sai: ela não desconta nada (edge case explícito da spec) e
 * mantê-la só produziria um `applied` vazio mais adiante.
 */
function isLive(row: PromotionRow, now: Date): boolean {
  if (!(row.promotion_tiers || []).length) return false
  if (row.active !== true) return false
  if (row.valid_from && new Date(row.valid_from) > now) return false
  if (row.valid_until && new Date(row.valid_until) < now) return false
  return true
}

async function fetchActivePromotions(): Promise<ActivePromotion[]> {
  const { data, error } = await supabase.from('promotions').select(PROMOTION_SELECT)

  if (error) {
    // Mesmo desfecho de `useStoreSettings` diante de erro: um default seguro em vez de exceção. Aqui
    // o default seguro é "nenhuma promoção" — preço cheio, sem linha de desconto.
    console.warn('[promotions] fetch failed:', error.message)
    return []
  }

  const now = new Date()
  const live = ((data || []) as unknown as PromotionRow[]).filter((row) => isLive(row, now))
  if (live.length === 0) return []

  // Elegibilidade sai da view, nunca de `Product.category_links`: aquele campo vem do snapshot do
  // carrinho, persistido em `localStorage`, e pode ter dias — decidir desconto por ele mostraria na
  // tela um preço que o servidor (que lê a view) se recusaria a cobrar.
  const scoped = live.filter((row) => row.scope !== 'all')
  const eligibleByPromotion = new Map<string, string[]>()

  if (scoped.length > 0) {
    const { data: eligibleRows, error: eligibleError } = await supabase
      .from('promotion_eligible_products')
      .select('promotion_id, product_id')
      .in(
        'promotion_id',
        scoped.map((row) => row.id),
      )

    if (eligibleError) {
      // Sem a view não há como saber quem é elegível. Devolver a promoção com a lista vazia daria
      // "nenhum item elegível" (preço cheio) — o mesmo desfecho, mas com uma promoção fantasma na
      // lista. Melhor sair sem nenhuma.
      console.warn('[promotions] eligibility fetch failed:', eligibleError.message)
      return []
    }

    for (const row of (eligibleRows || []) as DbPromotionEligibleProduct[]) {
      const known = eligibleByPromotion.get(row.promotion_id)
      if (known) known.push(row.product_id)
      else eligibleByPromotion.set(row.promotion_id, [row.product_id])
    }
  }

  return live.map((row) => ({
    id: row.id,
    name: row.name,
    discount_kind: row.discount_kind,
    // `numeric` do Postgres chega como number pelo PostgREST, mas o `Number()` é o mesmo que o
    // servidor faz: a faixa é dinheiro, e um `"5.00"` string somaria como concatenação.
    tiers: (row.promotion_tiers || []).map((tier) => ({
      min_qty: Number(tier.min_qty),
      value: Number(tier.value),
    })),
    scope: row.scope,
    eligibleProductIds: eligibleByPromotion.get(row.id) ?? [],
    stacks_with_coupon: row.stacks_with_coupon === true,
    created_at: row.created_at,
  }))
}

/**
 * PRM-15/PRM-16: as promoções que valem agora, já no formato de `ProgressivePromotion`.
 *
 * `data` é **sempre** um array: carregando ou em erro devolve `[]`, e a loja trata isso como "sem
 * promoção" — preço cheio, sem linha de desconto. O contrário (deixar `undefined` vazar) faria o
 * total aparecer, cair e voltar entre renders.
 */
export function useActivePromotions(): { data: ActivePromotion[]; isLoading: boolean } {
  const query = useQuery({
    queryKey: ACTIVE_PROMOTIONS_KEY,
    queryFn: fetchActivePromotions,
    staleTime: PROMOTIONS_STALE_TIME,
  })

  return { data: query.data ?? [], isLoading: query.isLoading }
}

// =====================================================================
// Admin — CRUD (feature 17 / T14)
// =====================================================================
//
// Molde: `useCoupons.ts`, linha a linha — mesma forma de hook, mesmo tratamento de erro, mesma
// invalidação. Duas diferenças, as duas deliberadas:
//
//   1. A gravação é **uma** chamada de RPC (`upsert_promotion`), não um `insert` seguido de dois
//      `delete` + dois `insert`. Cinco requisições seriam cinco transações independentes, e a segunda
//      falhar deixaria promoção meio-salva — exatamente o que `PRM-02`/`PRM-08` proíbem.
//   2. Toda mutação invalida **duas** chaves. Só a do admin faria a dona da loja salvar a promoção e
//      a loja continuar praticando o preço antigo por até 5 minutos (`PROMOTIONS_STALE_TIME`).

/** A chave que `useActivePromotions` usa. Exportada porque toda mutação de admin tem de invalidá-la. */
export const ACTIVE_PROMOTIONS_KEY = ['active_promotions'] as const

/** A chave da listagem do admin. */
export const ADMIN_PROMOTIONS_KEY = ['admin', 'promotions'] as const

/** Uma linha da listagem do admin: a promoção inteira, com as faixas e os vínculos de escopo. */
export interface AdminPromotion extends DbPromotion {
  /** Ordenadas por `min_qty` **na leitura** — ordem de inserção não é contrato (edge case da spec). */
  tiers: ProgressiveTier[]
  /** Os ids de `promotion_categories`, para o editor remontar os chips sem uma segunda leitura. */
  categoryIds: string[]
}

/**
 * O payload de `upsert_promotion(jsonb)`.
 *
 * **Chave ausente não é o mesmo que chave nula**, e essa distinção é o contrato: ausente ⇒ o campo
 * fica inalterado (ou cai no default, ao criar); presente ⇒ substitui, inclusive `tiers: []`, que
 * apaga as faixas. Por isso os campos são opcionais aqui em vez de terem default no TypeScript — um
 * default local reintroduziria a escrita que o `undefined` existe para evitar.
 *
 * `name` é a única exceção: o corpo da RPC atribui `name = payload->>'name'` sem `coalesce` e recusa
 * nome vazio, então **toda** gravação — inclusive um "pausar" que só muda `active` — precisa mandá-lo.
 */
export interface PromotionWriteInput {
  id?: string | null
  name: string
  scope?: PromotionScope
  discount_kind?: PromotionDiscountKind
  stacks_with_coupon?: boolean
  is_kit_showcase?: boolean
  active?: boolean
  valid_from?: string | null
  valid_until?: string | null
  tiers?: ProgressiveTier[]
  category_ids?: string[]
}

/**
 * PRM-22: o payload de uma cópia.
 *
 * Não existe RPC de duplicar, e não precisa de uma: a cópia é um `upsert_promotion` **sem `id`** — o
 * mesmo caminho do create — montado a partir da linha que a listagem já tem em mãos (`AdminPromotion`
 * carrega `tiers` e `categoryIds`). Um `insert ... select` no banco daria um segundo dono da regra de
 * cópia, e as duas versões divergiriam na primeira coluna nova.
 *
 * Duas chaves são forçadas; todo o resto é copiado:
 *
 * - `active: false`, e **explicitamente**, porque a coluna tem `default true`: omitir a chave faria a
 *   cópia nascer vigente e a loja passaria a praticar duas campanhas no mesmo carregamento.
 * - `is_kit_showcase: false`, porque a vitrine é única por índice parcial — a cópia não pode roubá-la
 *   da original (e com a chave ausente o default já seria `false`; ela vai explícita porque é AC).
 *
 * `tiers` e `category_ids` vão **presentes**: presente significa "substitua", que é exatamente o que
 * se quer aqui. Ausentes, num create, não sobra faixa nenhuma — a cópia nasceria vazia.
 */
export function promotionCopyPayload(promo: AdminPromotion): Omit<PromotionWriteInput, 'id'> {
  return {
    name: `${promo.name} (cópia)`,
    scope: promo.scope,
    discount_kind: promo.discount_kind,
    stacks_with_coupon: promo.stacks_with_coupon,
    // A vigência é da campanha, e a cópia é a mesma campanha com outro nome. Ela nasce pausada de
    // qualquer forma, então uma janela já vencida não faz a loja praticar nada.
    valid_from: promo.valid_from,
    valid_until: promo.valid_until,
    // Cópias rasas das faixas: sem elas, editar a cópia mexeria nas faixas da linha original que a
    // listagem tem em cache.
    tiers: promo.tiers.map((tier) => ({ ...tier })),
    category_ids: [...promo.categoryIds],
    active: false,
    is_kit_showcase: false,
  }
}

const ADMIN_PROMOTION_SELECT =
  '*, promotion_tiers(min_qty, value), promotion_categories(category_id)'

type AdminPromotionRow = DbPromotion & {
  promotion_tiers: Pick<DbPromotionTier, 'min_qty' | 'value'>[] | null
  promotion_categories: Pick<DbPromotionCategory, 'category_id'>[] | null
}

const byMinQty = (a: ProgressiveTier, b: ProgressiveTier) => a.min_qty - b.min_qty

/**
 * PRM-01: **todas** as promoções, sem nenhum filtro de vigência — o admin vê pausada, expirada e
 * programada. Filtrar aqui esconderia da única tela onde elas podem ser reativadas ou editadas
 * exatamente as que precisam disso; `isLive` é da loja, não daqui.
 *
 * Ordenada por `created_at` desc, como a listagem de cupons.
 */
export const useAdminPromotions = () =>
  useQuery({
    queryKey: ADMIN_PROMOTIONS_KEY,
    queryFn: async (): Promise<AdminPromotion[]> => {
      const { data, error } = await supabase
        .from('promotions')
        .select(ADMIN_PROMOTION_SELECT)
        .order('created_at', { ascending: false })

      if (error) {
        console.warn('[promotions] admin fetch failed:', error.message)
        return []
      }

      return ((data || []) as unknown as AdminPromotionRow[]).map((row) => ({
        ...row,
        tiers: (row.promotion_tiers || [])
          .map((tier) => ({ min_qty: Number(tier.min_qty), value: Number(tier.value) }))
          .sort(byMinQty),
        categoryIds: (row.promotion_categories || []).map((link) => link.category_id),
      }))
    },
  })

/** As duas chaves, sempre juntas: a tela do admin e o preço que a loja pratica. */
function invalidatePromotions(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ADMIN_PROMOTIONS_KEY })
  qc.invalidateQueries({ queryKey: ACTIVE_PROMOTIONS_KEY })
}

/** PRM-02/PRM-08: promoção + faixas + vínculos numa transação. Devolve o `id` gravado. */
async function callUpsertPromotion(payload: PromotionWriteInput): Promise<string> {
  const { data, error } = await supabase.rpc('upsert_promotion', { payload })
  if (error) throw new Error(error.message)
  return data as unknown as string
}

export const useCreatePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: Omit<PromotionWriteInput, 'id'>) => callUpsertPromotion(input),
    onSuccess: () => invalidatePromotions(qc),
  })
}

/**
 * A MESMA RPC do create — `id` presente vira `update`.
 *
 * Um patch parcial é seguro: as chaves que você não mandar ficam como estão, e `tiers` ausente
 * **preserva** as faixas. `name` continua obrigatório (ver `PromotionWriteInput`).
 */
export const useUpdatePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: PromotionWriteInput & { id: string }) => callUpsertPromotion(input),
    onSuccess: () => invalidatePromotions(qc),
  })
}

export const useDeletePromotion = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => invalidatePromotions(qc),
  })
}

// =====================================================================
// Admin — os números da listagem (feature 17 / T23, PRM-24)
// =====================================================================

/** A janela dos dois cartões que leem `orders`. */
export const PROMOTION_STATS_WINDOW_DAYS = 30

export const PROMOTION_STATS_KEY = ['admin', 'promotion_stats'] as const

/**
 * Os números que a listagem mostra — e `null` significa **"não há o que medir"**, não zero.
 *
 * A distinção é a AC: sem nenhum pedido pago na janela, o cartão mostra `—`. `R$ 0,00` afirmaria que
 * a loja vendeu e não concedeu desconto; `0` em "itens por pedido" afirmaria pedidos vazios. Com
 * pedido pago na janela, `0` volta a ser medida honesta e é isso que sai.
 */
export interface PromotionStats {
  /** Soma de `orders.promotion_discount` dos pedidos **pagos** na janela. */
  discountGranted: number | null
  /** Média de unidades por pedido pago **com** promoção. */
  itemsWithPromotion: number | null
  /** Média de unidades por pedido pago **sem** promoção. */
  itemsWithoutPromotion: number | null
}

export const EMPTY_PROMOTION_STATS: PromotionStats = {
  discountGranted: null,
  itemsWithPromotion: null,
  itemsWithoutPromotion: null,
}

interface OrderStatsRow {
  promotion_discount: number | null
  order_items: { quantity: number }[] | null
}

/** Soma de dinheiro para exibição — não é regra de preço, então não vem de `payment/pricing`. */
const sumMoney = (value: number) => Math.round(value * 100) / 100

/**
 * PRM-24: promoções ativas ficam com a listagem (ela já tem as linhas); os outros dois cartões saem
 * de **uma** leitura de `orders`.
 *
 * SPEC_DEVIATION: o `Done when` da T23 escreve "compara pedidos com e sem `promotion_id`".
 * Reason: `promotion_id` é nulo de propósito quando **duas** promoções aplicaram no mesmo pedido — o
 * `create-payment` só preenche a coluna quando há campanha única. Perguntar pela FK jogaria esses
 * pedidos no lado "sem promoção" e subestimaria o cartão. A AC da spec (P3-A) não nomeia coluna
 * nenhuma; ela pede a comparação, e `promotion_discount > 0` é a única forma honesta de fazê-la.
 *
 * "Este pedido teve promoção?" é `promotion_discount > 0`, **nunca** `promotion_id is not null`: a
 * coluna do id é deliberadamente `null` quando duas promoções aplicaram no mesmo pedido (o
 * `create-payment` só a preenche quando há uma campanha única), então a pergunta pela FK contaria
 * menos pedidos com promoção do que houve. O dinheiro é a evidência; o id é só o rótulo.
 */
export function usePromotionStats(): { data: PromotionStats; isLoading: boolean } {
  const query = useQuery({
    queryKey: PROMOTION_STATS_KEY,
    queryFn: async (): Promise<PromotionStats> => {
      const since = new Date(
        Date.now() - PROMOTION_STATS_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString()

      // `paid_at >= since` já exclui pedido não pago: a coluna é nula até a aprovação.
      const { data, error } = await supabase
        .from('orders')
        .select('promotion_discount, order_items(quantity)')
        .gte('paid_at', since)

      if (error) {
        // Mesmo desfecho das outras leituras deste arquivo: cartões em `—` em vez de tela quebrada.
        console.warn('[promotions] stats fetch failed:', error.message)
        return EMPTY_PROMOTION_STATS
      }

      const rows = (data || []) as unknown as OrderStatsRow[]
      if (rows.length === 0) return EMPTY_PROMOTION_STATS

      let granted = 0
      let unitsWith = 0
      let ordersWith = 0
      let unitsWithout = 0
      let ordersWithout = 0

      for (const row of rows) {
        const discount = Number(row.promotion_discount ?? 0)
        const units = (row.order_items || []).reduce(
          (sum, item) => sum + Number(item.quantity ?? 0),
          0,
        )
        granted += discount
        if (discount > 0) {
          unitsWith += units
          ordersWith += 1
        } else {
          unitsWithout += units
          ordersWithout += 1
        }
      }

      return {
        discountGranted: sumMoney(granted),
        // Um lado sem nenhum pedido é `—`, não `0`: "0 itens por pedido" seria uma comparação
        // inventada a partir de nenhuma amostra.
        itemsWithPromotion: ordersWith === 0 ? null : unitsWith / ordersWith,
        itemsWithoutPromotion: ordersWithout === 0 ? null : unitsWithout / ordersWithout,
      }
    },
  })

  return { data: query.data ?? EMPTY_PROMOTION_STATS, isLoading: query.isLoading }
}

/**
 * PRM-05: liga a vitrine do kit desligando a anterior, atomicamente.
 *
 * É RPC e não dois `update` do client porque `promotions_single_kit_showcase` é índice único
 * parcial: ligar antes de desligar é recusado pelo banco, e duas requisições separadas deixam uma
 * janela em que nenhuma promoção é a vitrine (ou em que a primeira falha e a segunda não roda).
 */
export const useSetKitShowcase = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('set_kit_showcase', { p_promotion_id: id })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => invalidatePromotions(qc),
  })
}
