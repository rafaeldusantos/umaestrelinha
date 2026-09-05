// `PED-24` — um pedido, para a rota `/admin/pedidos/:id`.
//
// O modal recebia o pedido **já carregado pela listagem**, e era isso que o prendia a ela: não havia
// como abrir um pedido sem antes ter a página que o continha. A rota precisa carregar o registro
// pelo id, sozinha, porque o caso de uso é alguém colando um link — ou dando F5, que era o que fazia
// o modal perder tudo.
//
// Traz `notes` (`PED-11`), que a listagem antiga nem selecionava e o tipo nem declarava.

import { useCallback, useEffect, useState } from 'react'
import { primaryImage } from '@estrelinha/core/media'
import { supabase } from '@estrelinha/supabase/client'
import type {
  DbOrder, DbOrderItem, DbOrderNote, DbOrderStatusHistory,
} from '@estrelinha/supabase/types'

/**
 * Um evento de `public.order_emails` — a auditoria de envio da feature "e-mails do pedido".
 *
 * Conferido contra o `information_schema` do banco local, e **não** contra a memória: a primeira
 * versão deste tipo declarava `template` e `to_email`, que não existem. A coluna se chama `type`, e
 * o destinatário nunca foi gravado. Tipo escrito à mão é afirmação, não verificação (`AD-012`).
 */
export interface OrderEmailEvent {
  id: string
  order_id: string
  /** `order_shipped`, `material_received`, … */
  type: string
  /** `pending` | `sent` | `failed`. É o que decide se a tela oferece reenviar (`PED-28`). */
  status: string
  attempts: number
  provider_message_id: string | null
  error: string | null
  created_at: string
  sent_at: string | null
}

/** O resumo da cliente que o aside do pedido mostra (`D3`). */
export interface OrderCustomerSummary {
  id: string
  orders_paid: number
  total_spent: number
}

/**
 * O produto **de hoje**, para o item do pedido — a capa, e a prova de que ele ainda existe.
 *
 * Existe por dois motivos medidos em 2026-08-30. O primeiro: `product_image` é snapshot, e **os 59
 * itens importados da Nuvemshop o têm vazio** — o CSV de vendas não traz imagem, então quem separa
 * o pedido lia o nome e imaginava a peça. O segundo: a **presença** da chave neste mapa é o único
 * jeito honesto de saber se há cadastro para abrir; `order_items.product_id` sozinho não sabe, e
 * 35 dos 59 apontam para um produto que não existe.
 *
 * **NÃO é um segundo dono do snapshot.** Nada aqui sobrescreve `order_items`: a foto do catálogo
 * só aparece onde o snapshot está **ausente**. Item com `product_image` gravado continua mostrando
 * a foto da época, que é o que a bancada tem de ver.
 */
export interface OrderProductRef {
  id: string
  /** A capa atual do catálogo. `null` quando o produto não tem foto. */
  image: string | null
}

/**
 * `order_items.product_id` é `text`, e **nem sempre é um uuid**: o import da Nuvemshop grava
 * `nuvemshop:<nome>` no item que não casou com o catálogo (35 dos 59 de hoje). Mandar esse valor
 * num `in('id', ...)` contra uma coluna `uuid` derruba a consulta inteira com `22P02` — e levaria
 * junto a foto e o link dos itens que CASARAM. Por isso o recorte é por forma, antes da rede.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Os `product_id` que **podem** ser procurados em `products`, sem repetição.
 *
 * Exportado só para ter teste: é a linha cuja remoção não quebra nada visível — a consulta passa a
 * falhar, o mapa volta vazio, e **todo** item do pedido perde foto e link em silêncio, inclusive os
 * que casaram. Sem uma asserção sobre ela, o próximo a mexer aqui não tem como saber.
 */
export const catalogProductIds = (itens: readonly { product_id: string }[]): string[] =>
  [...new Set(itens.map(i => i.product_id).filter(id => UUID.test(id ?? '')))]

export interface AdminOrderDetail {
  order: DbOrder | null
  customer: OrderCustomerSummary | null
  items: DbOrderItem[]
  /**
   * `PED-08`, aplicado à leitura dos itens.
   *
   * **Lista vazia e leitura que falhou não são a mesma coisa**, e aqui a diferença tem custo: um
   * pedido sem itens é impossível (o checkout sempre os grava), então "Itens · 0 peças" numa tela de
   * pedido pago é uma afirmação falsa — e é o conteúdo da folha que vai para a bancada. Sem este
   * campo, imprimir uma folha em branco parecia um pedido vazio.
   */
  itemsError: string | null
  /** `product_id` → produto atual, só para os itens que casaram com o catálogo. */
  productRefs: Record<string, OrderProductRef>
  history: DbOrderStatusHistory[]
  notes: DbOrderNote[]
  emails: OrderEmailEvent[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
}

export const useAdminOrder = (id: string | undefined): AdminOrderDetail => {
  const [order, setOrder] = useState<DbOrder | null>(null)
  const [customer, setCustomer] = useState<OrderCustomerSummary | null>(null)
  const [items, setItems] = useState<DbOrderItem[]>([])
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [productRefs, setProductRefs] = useState<Record<string, OrderProductRef>>({})
  const [history, setHistory] = useState<DbOrderStatusHistory[]>([])
  const [notes, setNotes] = useState<DbOrderNote[]>([])
  const [emails, setEmails] = useState<OrderEmailEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!id) {
      setError('Pedido não informado')
      setLoading(false)
      return
    }

    setItemsError(null)
    setProductRefs({})

    setLoading(true)
    setError(null)

    const { data, error: queryError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (queryError) {
      // `PED-08` vale aqui também: erro de leitura não pode virar "pedido não encontrado", que é
      // uma afirmação diferente — e mandaria a Adri procurar um pedido que existe.
      setError(queryError.message ?? 'Não foi possível carregar o pedido')
      setOrder(null)
      setLoading(false)
      return
    }

    if (!data) {
      setOrder(null)
      setError(null)
      setLoading(false)
      return
    }

    setOrder(data as DbOrder)

    // As quatro leituras auxiliares em paralelo: são independentes entre si, e em série somariam
    // quatro latências para desenhar uma tela só.
    const [itensRes, historicoRes, notasRes, emailsRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', id),
      supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_notes')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false }),
      supabase
        .from('order_emails')
        .select('*')
        .eq('order_id', id)
        .order('created_at', { ascending: false }),
    ])

    // O aside diz o que ela já gastou. Lido de `customer_list` por id **ou por e-mail**, a mesma
    // regra de vínculo do resto da feature: a convidada não tem `customer_id` e mesmo assim tem
    // histórico. Sem o fallback, o pedido de convidada mostraria um aside vazio.
    const pedido = data as DbOrder
    const { data: pessoa } = await supabase
      .from('customer_list')
      .select('id, orders_paid, total_spent')
      .or(`id.eq.${pedido.customer_id ?? '00000000-0000-0000-0000-000000000000'},email.ilike.${pedido.customer_email}`)
      .limit(1)
      .maybeSingle()

    setCustomer((pessoa ?? null) as OrderCustomerSummary | null)

    // A leitura dos itens é a ÚNICA das quatro cujo erro não pode degradar para lista vazia: um
    // pedido sem itens não existe, e a folha de separação sai deste array. As outras três degradam
    // de propósito — histórico e notas vazios são estados legítimos, e `order_emails` pode nem
    // existir em ambiente antigo.
    setItems((itensRes.data ?? []) as DbOrderItem[])
    setItemsError(
      itensRes.error
        ? (itensRes.error.message ?? 'Não foi possível carregar os itens deste pedido')
        : null,
    )

    setHistory((historicoRes.data ?? []) as DbOrderStatusHistory[])
    setNotes((notasRes.data ?? []) as DbOrderNote[])
    setEmails((emailsRes.data ?? []) as OrderEmailEvent[])

    setProductRefs(await lerProdutos((itensRes.data ?? []) as DbOrderItem[]))

    setLoading(false)
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  return {
    order, customer, items, itemsError, productRefs, history, notes, emails, loading, error, reload,
  }
}

/**
 * Os produtos dos itens, numa consulta só — e que **nunca derruba a tela**.
 *
 * É leitura de conveniência: sem ela o item continua com nome, variação, gravação, quantidade e
 * preço, que é o que a bancada precisa. Por isso o erro degrada em silêncio para mapa vazio, ao
 * contrário da leitura dos itens (`PED-08`), cujo vazio seria uma afirmação falsa. Um banner de
 * erro aqui assustaria por causa de uma miniatura.
 *
 * A capa sai de `primaryImage(images)`, o mesmo leitor da loja (`VAR-11`) — e não da coluna
 * `image_url`, que `DbProduct` nem declara. Dois jeitos de escolher a foto principal dariam duas
 * fotos diferentes para o mesmo produto, em duas telas do mesmo painel.
 */
const lerProdutos = async (itens: readonly DbOrderItem[]): Promise<Record<string, OrderProductRef>> => {
  const ids = catalogProductIds(itens)
  if (ids.length === 0) return {}

  const { data, error } = await supabase.from('products').select('id, images').in('id', ids)
  if (error || !data) return {}

  const mapa: Record<string, OrderProductRef> = {}
  for (const p of data as { id: string; images: unknown }[]) {
    mapa[p.id] = { id: p.id, image: primaryImage(p.images)?.url ?? null }
  }
  return mapa
}
