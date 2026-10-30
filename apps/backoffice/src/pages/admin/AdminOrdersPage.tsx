import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { CalendarIcon, Columns3, Download, Eye, Loader2, MessageCircle, Printer, Search, ShoppingCart, X } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { formatPrice, formatRelativeDate } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import {
  MATERIAL_STATUS_LABELS, materialTransitionRefusal, queueAge, queueAgeLabel, toMaterialStatus,
} from '@estrelinha/core/material'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { Calendar } from '@estrelinha/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@estrelinha/ui/select'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  customerNoticeFor,
  NOTIFICATION_EVENT_NAMES,
  type CustomerNotice,
  type NotificationEvent,
  type NotificationTrigger,
} from '@estrelinha/core/notifications'
import { useNotificationSettings } from '@estrelinha/core/hooks/useStoreSettings'

import { useAdminOrders, ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { useAdminOrderList } from '@/entities/order/api/useAdminOrderList'
import {
  MATERIAL_QUEUE_STATES,
  MATERIAL_TILES,
  MATERIAL_TILE_STATES,
  ORDER_VIEWS,
  QUEUE_TILES,
  SEARCH_DEBOUNCE_MS,
  activeOrderFilterCount,
  clearFiltersLabel,
  emptyOrderFilters,
  rangeLabel,
  rowQueueAge,
  purchaseOrdinalLabel,
  queueSince,
  type AdminOrderRow,
  type OrderFilters,
  type OrderQuery,
  type OrderSortKey,
} from '@/entities/order/api/orderQuery'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import PaymentStatusBadge from '@/entities/order/ui/PaymentStatusBadge'
import MaterialStatusBadge from '@/entities/order/ui/MaterialStatusBadge'
import QueueAge from '@/entities/order/ui/QueueAge'
import OrderFilterChips from '@/features/order-list/ui/OrderFilterChips'
import OrderBulkBar from '@/features/order-list/ui/OrderBulkBar'
import QueueTiles from '@/features/order-list/ui/QueueTiles'
import {
  BULK_LIMIT, NEXT_STATUS, bulkSummary, runMaterialBulk, runStatusBulk, type BulkOutcome,
} from '@/features/order-list/model/bulkMaterial'
import type { BulkProgress } from '@/features/order-list/ui/OrderBulkBar'
import { fetchSentEmails, SENT_EMAILS_READ_FAILED } from '@/entities/order/api/sentEmails'
import { useGestoComAviso } from '@/features/order-notice'
import { devolverFoco, tituloDaPagina } from '@/shared/lib/foco'
import { rowSummary } from '@/features/order-list/model/rowSummary'
import {
  ORDER_LIST_COLUMNS, isOrderColumnVisible, useOrderColumnPrefs,
} from '@/features/order-list/model/columns'
import { exportLabel, exportOrdersCsv } from '@/features/export-orders/lib/exportCsv'
import { chargeMaterialUrl } from '@/features/order-list/model/chargeMaterial'
import {
  ORDER_PAGE_SIZES, orderListHref, orderQueryFromParams, orderQueryToParams,
} from '@/features/order-list/model/queryUrl'
import { openPickSlips } from '@/features/pick-slip'
import {
  ActionButton, AdminTable, CardSkeleton, PageHeader, Pagination, TableSkeleton, type AdminColumn,
} from '@/shared/ui'

/**
 * A listagem de pedidos — `PED-04`..`PED-23`.
 *
 * ---------------------------------------------------------------------------------------------
 * A ORDEM DA TELA É A ORDEM DA PERGUNTA
 * ---------------------------------------------------------------------------------------------
 * O cabeçalho diz **o que cobra**, não o que existe: "12 esperando alguma coisa sua · o mais antigo
 * há 9 dias". Depois vêm os quatro contadores clicáveis, e só então a lista. A versão anterior abria
 * com "Pedidos" e 148 linhas — verdadeiro e inútil.
 *
 * ---------------------------------------------------------------------------------------------
 * O QUE MUDOU DE DONO
 * ---------------------------------------------------------------------------------------------
 * A leitura da listagem saiu de `useAdminOrders` e virou `useAdminOrderList`: filtro, busca,
 * ordenação, paginação e **as contagens** agora são todos do servidor, e concordam entre si. As
 * escritas (transição de material, status, rastreio, nota) continuam em `useAdminOrders` — a
 * feature muda **onde** são chamadas, nunca o que fazem.
 *
 * ---------------------------------------------------------------------------------------------
 * O MOBILE É CARTÃO, NÃO TABELA (D8)
 * ---------------------------------------------------------------------------------------------
 * ~90% dos acessos da loja vêm de celular, e a fila é consultada com o envelope na mão. Abaixo de
 * `md` a tabela some e cada pedido vira um cartão com **a ação primária daquele estado** ocupando a
 * largura em 44px. As duas faixas roláveis (contadores e visões) rolam DENTRO do próprio container:
 * quem não pode encolher é a trilha, não o item, e o body nunca rola na horizontal.
 */
const AdminOrdersPage = () => {
  // O recorte mora na URL (`queryUrl.ts`): sobrevive ao F5 e a abrir um pedido e voltar. `replace`
  // porque mudar o filtro não é navegar — o voltar do navegador sai da lista, não desfaz um filtro.
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const query = useMemo(() => orderQueryFromParams(searchParams), [searchParams])
  const setQuery = useCallback(
    (next: (q: OrderQuery) => OrderQuery) =>
      setSearchParams(prev => orderQueryToParams(next(orderQueryFromParams(prev))), { replace: true }),
    [setSearchParams],
  )
  // O endereço de volta que o pedido recebe: o "voltar" dele reabre a lista neste recorte.
  const voltarPara = { voltarPara: orderListHref(query) }
  const [searchInput, setSearchInput] = useState(() => query.search)
  // A seleção guarda a **LINHA**, não o id (`PLS-06`/`D5`): sem os valores atuais não há como
  // nomear no resumo quais pedidos não passaram, nem gerar folha de separação sem reler o banco.
  const [selection, setSelection] = useState<Map<string, AdminOrderRow>>(new Map())
  const [busy, setBusy] = useState(false)

  const { prefs, toggle, setDensity } = useOrderColumnPrefs()
  const { setMaterialStatus, updateStatus } = useAdminOrders()
  const {
    rows, total, loading, error, viewCounts, tileCounts, oldestWaitingAt, refetch, fetchAllFiltered,
    revalidando, contando,
  } = useAdminOrderList(query)

  // Feature `88`: a previsão do aviso (`A-01`) — as configurações de notificação (os padrões enquanto
  // a leitura não chega, os mesmos do motor). O que cada cliente JÁ recebeu é lido só ao acionar o
  // lote ou o cartão (`fetchSentEmails`), numa consulta.
  const notificacoes = useNotificationSettings()
  const gesto = useGestoComAviso({ settings: notificacoes, enviados: NADA_ENVIADO })
  // `CRG-10`: o lote em curso. Enquanto ele corre, a barra vira o progresso e o resto fica desabilitado.
  const [progresso, setProgresso] = useState<BulkProgress | null>(null)
  // O cartão do celular que está lendo os envios antes de decidir se pergunta (`AVS-21`).
  const [lendoCartao, setLendoCartao] = useState<string | null>(null)
  // Conserto do QA (`BUG-20261030-resumo-do-lote-some-em-quatro-segundos`): o resumo do lote FICA na
  // lista, numa região `status`, até a Adri dispensar — o aviso flutuante sumia em ~4 s. Ele é o único
  // anúncio do desfecho (sem toast junto), e recebe o foco: a barra de onde o lote saiu some com a
  // seleção.
  const [resumoDoLote, setResumoDoLote] = useState<{ texto: string; falhou: boolean } | null>(null)
  const caixaDoResumo = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (resumoDoLote) caixaDoResumo.current?.focus()
  }, [resumoDoLote])
  const ocupado = busy || progresso !== null || gesto.pendente !== null || gesto.ocupado || lendoCartao !== null

  // `PED-10` — debounce de 300 ms. Sem ele, cada tecla dispara uma consulta paginada mais seis
  // contagens; com a busca alcançando cinco colunas, isso é sete `ilike` por caractere.
  //
  // `buscaEnviada` é a última busca que ESTE campo escreveu na URL. Quando a URL muda por fora (o
  // item "Pedidos" da sidebar, o voltar do navegador), o campo acompanha; quando a mudança é o eco
  // do próprio debounce, não — senão a tecla digitada durante a ida e volta seria apagada.
  const buscaEnviada = useRef(query.search)
  useEffect(() => {
    const id = setTimeout(() => {
      buscaEnviada.current = searchInput
      setQuery(q => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 }))
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [searchInput, setQuery])

  useEffect(() => {
    if (query.search === buscaEnviada.current) return
    buscaEnviada.current = query.search
    setSearchInput(query.search)
  }, [query.search])

  const setFilters = useCallback((next: OrderFilters) => {
    setQuery(q => ({ ...q, filters: next, page: 1 }))
    setSelection(new Map())
  }, [setQuery])

  const filtrosAtivos = activeOrderFilterCount(query.filters, query.search)

  const limparTudo = useCallback(() => {
    // `PED-04` — limpa **tudo**, inclusive status, material e a visão. O botão antigo zerava quatro
    // dos sete eixos e nem aparecia quando os três que faltavam eram os únicos ligados.
    setSearchInput('')
    buscaEnviada.current = ''
    setQuery(q => ({ ...q, filters: { ...emptyOrderFilters(), view: 'tudo' }, search: '', page: 1 }))
    setSelection(new Map())
  }, [setQuery])

  const naFilaDeMaterial = query.filters.view === 'fila-material'
  const tiles = naFilaDeMaterial ? MATERIAL_TILES : QUEUE_TILES

  // Na fila, os quatro contadores viram os quatro ESTADOS, e as contagens saem das visões já lidas
  // pelo hook — nenhuma consulta a mais para desenhar a mesma informação de outro jeito.
  const contagemDosTiles = useMemo(() => {
    if (!naFilaDeMaterial) return tileCounts
    return Object.fromEntries(
      MATERIAL_TILES.map((tile, i) => [
        tile.id,
        rows.filter(r => r.material_status === MATERIAL_TILE_STATES[i]).length,
      ]),
    )
  }, [naFilaDeMaterial, tileCounts, rows])

  const toggleRow = (row: AdminOrderRow) => {
    setSelection(atual => {
      const next = new Map(atual)
      if (next.has(row.id)) next.delete(row.id)
      else next.set(row.id, row)
      return next
    })
  }

  const togglePagina = () => {
    setSelection(atual => {
      const todasNaPagina = rows.every(r => atual.has(r.id))
      if (todasNaPagina) return new Map()
      return new Map(rows.map(r => [r.id, r]))
    })
  }

  const selecionarTodosDoFiltro = async () => {
    setBusy(true)
    try {
      const todos = await fetchAllFiltered()
      setSelection(new Map(todos.map(r => [r.id, r])))
    } catch (e) {
      // `readAllPages` LANÇA quando a leitura trunca. Selecionar "os N do filtro" e receber menos
      // que N em silêncio seria agir sobre um conjunto que ninguém pediu.
      toast.error(e instanceof Error ? e.message : 'Não foi possível ler o filtro inteiro')
    } finally {
      setBusy(false)
    }
  }

  const selecionadas = [...selection.values()]

  /**
   * Feature `88` — os dois lotes (`AVS-19`, `AVS-20`, `CRG-10`, `CRG-11`).
   *
   * Uma leitura dos envios dos selecionados; a previsão de cada pedido no estado de destino; com algum
   * e-mail previsto, o portão do lote (uma pergunta para todos); sem nenhum, grava direto. Ao confirmar,
   * o diálogo fecha e o progresso aparece NA barra — é lá que a Adri clicou.
   */
  const acionarLote = async (tipo: TipoDeLote) => {
    const alvo = selecionadas.slice(0, BULK_LIMIT)
    if (alvo.length === 0) return
    setResumoDoLote(null)
    setBusy(true)
    let enviados: Map<string, Set<NotificationEvent>>
    try {
      enviados = await fetchSentEmails(alvo.map(r => r.id))
    } catch {
      gesto.informar('error', SENT_EMAILS_READ_FAILED)
      return
    } finally {
      setBusy(false)
    }

    const plano = planejarLote(tipo, alvo, notificacoes, enviados)
    const mudam = plano.filter(p => p.alvo)
    const comEmail = mudam.filter(p => p.aviso.send.length > 0)
    const previstos = new Set(comEmail.map(p => p.row.id))

    // `AVS-20` — nenhum e-mail sairia: grava sem diálogo, como um gesto de um pedido (`A-10`).
    if (comEmail.length === 0) {
      void correrLote(tipo, alvo, { perguntou: false, avisar: true, previstos })
      return
    }

    const ficam = plano.length - mudam.length
    const um = tipo === 'avancar' ? 'pedido' : 'recebimento'
    gesto.pedir({
      // Conserto do QA (paper cut): o título diz o mesmo número que o botão — os que MUDAM. Com "Avançar
      // 50" no título e "Avançar 48" no botão, a Adri não sabia qual dos dois ia acontecer.
      titulo: tipo === 'avancar'
        ? `Avançar ${mudam.length} ${mudam.length === 1 ? 'pedido' : 'pedidos'}`
        : `Registrar o material de ${mudam.length} ${mudam.length === 1 ? 'pedido' : 'pedidos'}`,
      mudanca: `${mudam.length} ${mudam.length === 1 ? 'muda' : 'mudam'}${
        ficam > 0
          ? ` · ${ficam} ${ficam === 1 ? 'fica' : 'ficam'} como ${ficam === 1 ? 'está' : 'estão'} (${
              tipo === 'avancar' ? 'já no fim do caminho' : 'material já registrado ou sem material'
            })`
          : ''
      }.`,
      confirmar: `${tipo === 'avancar' ? 'Avançar' : 'Registrar'} ${mudam.length} ${um}${mudam.length === 1 ? '' : 's'}`,
      gerundio: 'Preparando…',
      lote: { comEmail: comEmail.length },
      eventos: contarEventos(comEmail.map(p => p.aviso.send)),
      jaRecebeu: fraseJaRecebeu(mudam.map(p => p.aviso)),
      extra: (
        <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border p-2 text-sm" aria-label="O que muda">
          {mudam.map(p => (
            <li key={p.row.id} className="flex min-w-0 flex-wrap gap-x-2">
              <span className="font-medium">{formatOrderNumber(p.row.order_number)}</span>
              <span className="min-w-0 truncate">{p.row.customer_name}</span>
              <span className="text-muted-foreground">
                {tipo === 'avancar'
                  ? `${STATUS_LABELS[p.row.status] ?? p.row.status} → ${STATUS_LABELS[p.alvo] ?? p.alvo}`
                  : 'material recebido'}
                {p.aviso.send.length > 0 ? ' · e-mail' : p.aviso.alreadySent.length > 0 ? ' · já avisada' : ''}
              </span>
            </li>
          ))}
        </ul>
      ),
      // CRG-07, exceção do lote (declarada na spec, Verifier r1): o diálogo fecha ao confirmar, porque
      // o andamento aparece na barra de lote (CRG-10), que o diálogo cobriria; o desfecho vai no
      // resumo (CRG-11).
      executar: async (avisar) => {
        void correrLote(tipo, alvo, { perguntou: true, avisar, previstos })
        return null
      },
    })
  }

  const correrLote = async (
    tipo: TipoDeLote,
    alvo: AdminOrderRow[],
    { perguntou, avisar, previstos }: { perguntou: boolean; avisar: boolean; previstos: ReadonlySet<string> },
  ) => {
    const verbo = tipo === 'avancar' ? 'Avançando' : 'Registrando'
    const opcoes = {
      avisarCliente: perguntou ? avisar : undefined,
      previstos,
      onProgress: (feitos: number, total: number) => setProgresso({ verbo, feitos, total }),
    }
    const total = tipo === 'avancar' ? alvo.filter(r => NEXT_STATUS[r.status]).length : alvo.length
    setProgresso({ verbo, feitos: 0, total })
    gesto.anunciar(`${verbo} ${total} pedido${total === 1 ? '' : 's'}…`)

    let resultado: BulkOutcome
    try {
      resultado = tipo === 'avancar'
        // `updateStatus` tem a nota no terceiro lugar: a escolha vai no quarto, e só quando houve escolha.
        ? await runStatusBulk(alvo, (id, to, avisarCliente) =>
          avisarCliente === undefined ? updateStatus(id, to) : updateStatus(id, to, undefined, avisarCliente),
        opcoes)
        : await runMaterialBulk(alvo, 'material_recebido', (id, status, avisarCliente) =>
          (avisarCliente === undefined
            ? setMaterialStatus(id, status)
            : setMaterialStatus(id, status, avisarCliente)
          ).then(r => ({ ok: r.ok, reason: r.reason, emailSent: r.emailSent })),
        opcoes)
    } finally {
      setProgresso(null)
    }
    setSelection(new Map())

    // Recusa NÃO é erro: é o caso esperado quando outra aba já atualizou o pedido.
    const resumo = bulkSummary(resultado, {
      verbo: tipo === 'avancar' ? { um: 'avançou', varios: 'avançaram' } : undefined,
      aviso: { perguntou, avisar },
    })
    gesto.anunciar('')
    setResumoDoLote({ texto: resumo, falhou: resultado.failed > 0 })
    await refetch('revalidar')
  }

  /**
   * Gesto 10 — "Registrar recebimento" no cartão do celular (`AVS-21`). A mesma pergunta do pedido,
   * com o estado SÓ no cartão tocado e o desfecho em aviso — inclusive a recusa e a falha, que antes
   * eram ignoradas.
   */
  const registrarRecebimento = async (o: AdminOrderRow) => {
    // Conserto do QA (foco): a origem é guardada ANTES da leitura dos envios — durante ela o botão fica
    // desabilitado e o navegador já tirou o foco dele. Se o botão sumir, o foco vai ao cartão.
    const origem = document.activeElement
    const cartao = () => document.querySelector(`[data-cartao="${o.id}"]`)
    setLendoCartao(o.id)
    let enviados: ReadonlySet<NotificationEvent>
    try {
      enviados = (await fetchSentEmails([o.id])).get(o.id) ?? NADA_ENVIADO
    } catch {
      gesto.informar('error', SENT_EMAILS_READ_FAILED)
      gesto.devolverFocoDepois(origem, cartao, tituloDaPagina)
      return
    } finally {
      setLendoCartao(null)
    }
    const numero = formatOrderNumber(o.order_number)
    await gesto.acionar({
      chave: chaveDoCartao(o.id),
      origem,
      focoDepois: cartao,
      trigger: 'material_status_changed',
      depois: { ...o, material_status: 'material_recebido' },
      enviados,
      orderId: o.id,
      titulo: 'Registrar o material como recebido',
      mudanca: `O material de ${o.customer_name} (${numero}) passa a constar como recebido no ateliê.`,
      confirmar: 'Registrar recebimento',
      gerundio: 'Registrando recebimento…',
      sucesso: `${numero} · material recebido`,
      gravar: async (avisarCliente) => {
        const r = avisarCliente === undefined
          ? await setMaterialStatus(o.id, 'material_recebido')
          : await setMaterialStatus(o.id, 'material_recebido', avisarCliente)
        if (!r.ok) {
          return {
            erro: r.reason === 'rpc_failed'
              ? 'O recebimento não foi registrado. Nada foi alterado — tente de novo.'
              : 'O recebimento não foi registrado: o material deste pedido não está num estado que permita.',
          }
        }
        await refetch('revalidar')
        return { erro: null, emailSent: r.emailSent }
      },
    })
  }

  const exportar = async () => {
    setBusy(true)
    try {
      // `PED-05` — o FILTRO inteiro, e não a página. O botão promete o total; se a leitura truncar,
      // `readAllPages` lança e ninguém baixa um arquivo menor achando que é o completo.
      exportOrdersCsv(await fetchAllFiltered())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar o filtro')
    } finally {
      setBusy(false)
    }
  }

  const cobrarMaterial = () => {
    // `Out of Scope`: régua automática de cobrança é política de relacionamento num negócio
    // memorial, e é decisão da Adri. O que a tela oferece é **um clique com o texto pronto**.
    for (const row of selecionadas.slice(0, 5)) window.open(chargeMaterialUrl(row, row.customer_phone), '_blank')
    if (selecionadas.length > 5) {
      toast.message(`Abri as 5 primeiras. O navegador bloqueia mais que isso de uma vez.`)
    }
  }

  const sortBy = (key: string) => {
    setQuery(q => ({
      ...q,
      sort: {
        key: key as OrderSortKey,
        dir: q.sort.key === key && q.sort.dir === 'desc' ? 'asc' : 'desc',
      },
      page: 1,
    }))
  }

  const visivel = (id: Parameters<typeof isOrderColumnVisible>[1]) => isOrderColumnVisible(prefs, id)

  const columns: AdminColumn<AdminOrderRow>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={rows.length > 0 && rows.every(r => selection.has(r.id))}
          onCheckedChange={togglePagina}
          disabled={ocupado}
          aria-label="Selecionar a página"
        />
      ),
      cell: o => (
        <Checkbox
          checked={selection.has(o.id)}
          onCheckedChange={() => toggleRow(o)}
          disabled={ocupado}
          aria-label={`Selecionar pedido ${o.order_number}`}
        />
      ),
    },
    {
      key: 'queue',
      header: 'Pedido',
      sortable: true,
      cell: o => (
        <span className="block">
          <Link to={`/admin/pedidos/${o.id}`} state={voltarPara} className="font-medium hover:underline">
            {formatOrderNumber(o.order_number)}
          </Link>
          {/* A idade DO PEDIDO, sempre presente — todo pedido tem uma. O degrau vem da fila de
              material quando o pedido está nela; um pedido que não espera material nenhum ainda
              tem idade, e escondê-la deixava a coluna com um travessão sem explicação. */}
          <span className="block">
            <QueueAge age={rowQueueAge(o) ?? queueAge(o.created_at)} since={queueSince(o)} />
          </span>
        </span>
      ),
    },
  ]

  if (visivel('cliente')) {
    columns.push({
      key: 'customer',
      header: 'Cliente',
      sortable: true,
      cell: o => (
        <span className="block">
          {/* `PED-21` — a linha liga ao cliente. Antes não havia caminho de pedido para pessoa. */}
          {o.customer_id ? (
            <Link
              to={`/admin/clientes/${o.customer_id}`}
              className="font-medium text-primary hover:underline"
            >
              {o.customer_name}
            </Link>
          ) : (
            <span className="font-medium">{o.customer_name}</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {/* `PED-21` — a ordinal muda o tom de tudo: quem está na terceira compra já confiou
                duas vezes, e saber isso antes de escrever importa num negócio memorial. */}
            {purchaseOrdinalLabel(o.purchase_ordinal)
              ? `${purchaseOrdinalLabel(o.purchase_ordinal)} · ${o.customer_email}`
              : o.customer_email}
          </span>
        </span>
      ),
    })
  }

  if (visivel('valor')) {
    columns.push({
      key: 'total',
      header: 'Valor',
      align: 'right',
      sortable: true,
      cell: o => <span className="font-semibold">{formatPrice(o.total)}</span>,
    })
  }

  if (visivel('status')) {
    columns.push({
      key: 'status', header: 'Status', align: 'center',
      cell: o => <StatusBadge status={o.status} />,
    })
  }

  if (visivel('pagamento')) {
    columns.push({
      key: 'payment', header: 'Pagamento', align: 'center',
      cell: o => <PaymentStatusBadge status={o.payment_status} />,
    })
  }

  if (visivel('material')) {
    columns.push({
      key: 'material',
      header: 'Material',
      align: 'center',
      cell: o => {
        const naFila = rowQueueAge(o)
        return (
          <span className="block">
            <MaterialStatusBadge status={o.material_status} />
            {/* "há N dias" mora aqui, sob o selo do material: é a fila do MATERIAL que está
                parada, não o pedido. Só o terceiro degrau escreve isso. */}
            {naFila?.tier === 'stale' && (
              <span className="mt-0.5 block text-[11px] font-medium text-estrelinha-admin-amber">
                {queueAgeLabel(naFila)}
              </span>
            )}
            {o.material_tracking_code && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {o.material_tracking_code}
              </span>
            )}
          </span>
        )
      },
    })
  }

  if (visivel('rastreio')) {
    columns.push({
      key: 'tracking',
      header: 'Rastreio',
      cell: o =>
        o.tracking_code ? (
          <span className="font-mono text-xs">{o.tracking_code}</span>
        ) : o.status === 'shipped' ? (
          // Enviado sem código é falha silenciosa: o e-mail "sua joia foi postada" não saiu.
          <span className="text-xs font-medium text-estrelinha-admin-amber">sem código</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    })
  }

  columns.push({
    key: 'actions',
    header: 'Ações',
    align: 'center',
    cell: o => (
      <span className="inline-flex gap-1">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9">
          <Link to={`/admin/pedidos/${o.id}`} state={voltarPara} aria-label={`Abrir pedido ${o.order_number}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon" variant="ghost" className="h-9 w-9"
          aria-label={`Cobrar material de ${o.customer_name}`}
          onClick={() => window.open(chargeMaterialUrl(o, o.customer_phone), '_blank')}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </span>
    ),
  })

  const precisaDeAcao = viewCounts['precisa-acao'] ?? 0
  const idadeDoMaisAntigo = oldestWaitingAt ? rowQueueAge({
    created_at: oldestWaitingAt, material_received_at: null, material_status: 'aguardando_material',
  }) : null

  return (
    <div>
      <PageHeader
        title="Pedidos"
        // `CRG-12`: a releitura depois do lote ou de uma ação de linha mantém a tabela; o sinal é este
        // selo discreto, não a lista sumindo.
        titleAside={revalidando ? (
          <span role="status" className="inline-flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Atualizando…
          </span>
        ) : null}
        // O subtítulo é a única frase da tela que resume a fila. Diz o que cobra e há quanto tempo.
        //
        // O número é o da visão `Precisa de ação` — a UNIÃO dos três tiles acionáveis, contada pelo
        // servidor —, e **não a soma deles**. Somar contaria duas vezes quem está em dois tiles ao
        // mesmo tempo: um pedido pago que ainda espera o envelope aparece em "aguardando" e não
        // deveria aparecer em "a separar". Medido no navegador com 8 pedidos: a soma dizia 7, e a
        // aba logo abaixo dizia 4. Duas frases sobre a mesma coisa, discordando na mesma tela.
        // Conserto do QA: enquanto as contagens não chegam, a frase não afirma nada sobre a fila.
        subtitle={
          contando
            ? 'Contando o que espera por você…'
            : precisaDeAcao > 0
            ? `${precisaDeAcao} esperando alguma coisa sua${idadeDoMaisAntigo ? ` · o mais antigo ${queueAgeLabel(idadeDoMaisAntigo)}` : ''}`
            : 'Nada esperando você agora'
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px] md:min-h-0" onClick={exportar} disabled={ocupado || total === 0}>
              <Download className="mr-1 h-4 w-4" /> {exportLabel(total)}
            </Button>
            <Button
              size="sm"
              className="min-h-[44px] md:min-h-0"
              onClick={() => openPickSlips(selecionadas.length > 0 ? selecionadas : rows)}
              disabled={rows.length === 0 || ocupado}
            >
              <Printer className="mr-1 h-4 w-4" /> Folha de separação
            </Button>
          </span>
        }
      />

      <QueueTiles
        tiles={tiles}
        counts={contagemDosTiles}
        carregando={contando}
        oldestWaitingAt={oldestWaitingAt}
        filters={query.filters}
        onApply={setFilters}
      />

      {/* Visões. Rolam dentro do container — no mobile a trilha é que rola, nunca o body. */}
      <div className="-mx-1 mb-3 flex items-center gap-1 overflow-x-auto px-1" role="tablist">
        {ORDER_VIEWS.map(view => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={query.filters.view === view.id}
            onClick={() => setFilters({ ...query.filters, view: view.id })}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
              query.filters.view === view.id
                ? 'bg-estrelinha-admin-card font-medium shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {view.label}
            {!contando && <span className="text-xs tabular-nums opacity-70">{viewCounts[view.id] ?? 0}</span>}
          </button>
        ))}
      </div>

      {/* Busca e filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Número, cliente, e-mail ou rastreio..."
            className="h-11 pl-9"
            aria-label="Buscar pedidos"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-11', !query.filters.dateFrom && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1 h-4 w-4" />
              {query.filters.dateFrom ? format(new Date(query.filters.dateFrom), 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={query.filters.dateFrom ? new Date(query.filters.dateFrom) : undefined}
              onSelect={d => setFilters({ ...query.filters, dateFrom: d ? d.toISOString() : null })}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-11', !query.filters.dateTo && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1 h-4 w-4" />
              {query.filters.dateTo ? format(new Date(query.filters.dateTo), 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={query.filters.dateTo ? new Date(query.filters.dateTo) : undefined}
              onSelect={d => {
                if (!d) return setFilters({ ...query.filters, dateTo: null })
                const fim = new Date(d)
                fim.setHours(23, 59, 59, 999)
                setFilters({ ...query.filters, dateTo: fim.toISOString() })
              }}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>

        {/* Os dois eixos de pagamento são SEPARADOS e nomeados: `payment_status` (aprovado,
            pendente) e `payment_method` (pix, cartão). O filtro antigo misturava os dois num
            controle só rotulado "Pagamento", e por isso não dava para perguntar "quais Pix ainda
            não foram aprovados?" — que é justamente o quarto contador do topo. */}
        <Select
          value={query.filters.paymentStatuses[0] ?? 'all'}
          onValueChange={v =>
            setFilters({ ...query.filters, paymentStatuses: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="h-11 w-[170px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo pagamento</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Recusado</SelectItem>
            <SelectItem value="refunded">Estornado</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.filters.materialStatuses.length === 1 ? query.filters.materialStatuses[0] : 'all'}
          onValueChange={v =>
            setFilters({ ...query.filters, materialStatuses: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="h-11 w-[190px]"><SelectValue placeholder="Material" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo material</SelectItem>
            {MATERIAL_QUEUE_STATES.map(s => (
              <SelectItem key={s} value={s}>{MATERIAL_STATUS_LABELS[toMaterialStatus(s)]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-11">
              <Columns3 className="mr-1 h-4 w-4" /> Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Colunas</p>
            {ORDER_LIST_COLUMNS.map(col => (
              <label
                key={col.id}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={isOrderColumnVisible(prefs, col.id)}
                  disabled={col.fixed}
                  onCheckedChange={() => toggle(col.id)}
                />
                {col.label}
              </label>
            ))}
            <p className="mb-1 mt-3 text-xs font-medium uppercase text-muted-foreground">Densidade</p>
            <Select value={prefs.density} onValueChange={v => setDensity(v as 'confortavel' | 'compacta')}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confortavel">Confortável</SelectItem>
                <SelectItem value="compacta">Compacta</SelectItem>
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>
      </div>

      {filtrosAtivos > 0 && (
        <div className="mb-3">
          <OrderFilterChips
            filters={query.filters}
            search={query.search}
            onChange={setFilters}
            onClearSearch={() => setSearchInput('')}
            onClearAll={limparTudo}
            clearLabel={clearFiltersLabel(filtrosAtivos)}
          />
        </div>
      )}

      {selection.size > 0 && (
        <OrderBulkBar
          count={selection.size}
          total={total}
          busy={ocupado}
          progresso={progresso}
          onMaterialReceived={() => void acionarLote('material')}
          onAdvanceStatus={() => void acionarLote('avancar')}
          onPickSlips={() => openPickSlips(selecionadas)}
          onChargeMaterial={cobrarMaterial}
          onExport={() => exportOrdersCsv(selecionadas)}
          onSelectAll={selecionarTodosDoFiltro}
          onClear={() => setSelection(new Map())}
        />
      )}

      {resumoDoLote && (
        <div
          ref={caixaDoResumo}
          tabIndex={-1}
          role="status"
          aria-label="Resumo do lote"
          className={cn(
            'mb-3 flex flex-wrap items-start gap-2 rounded-xl border p-3 text-sm outline-none',
            resumoDoLote.falhou
              ? 'border-destructive/30 bg-destructive/5 text-destructive'
              : 'border-border bg-estrelinha-admin-card',
          )}
        >
          <span className="min-w-0 flex-1 break-words">{resumoDoLote.texto}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Dispensar o resumo do lote"
            // Conserto do reteste (`BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`): a região
            // some com o botão; sem isto o foco caía no <body> e o leitor recomeçava do topo.
            onClick={() => {
              flushSync(() => setResumoDoLote(null))
              devolverFoco(null, tituloDaPagina)
            }}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* `PED-08` — erro de leitura APARECE. Antes caía no estado vazio, e "Nenhum pedido
          encontrado" é a frase para "o filtro não casou nada", não para "o banco não respondeu". */}
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        // `CRG-13`: a primeira carga é esqueleto — tabela no computador, cartões no celular.
        <div aria-busy="true" aria-label="Carregando os pedidos" data-testid="orders-skeleton">
          <div className="hidden md:block"><TableSkeleton rows={8} cols={6} /></div>
          <div className="space-y-3 md:hidden">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      ) : (
        <>
          {/* Desktop: tabela. */}
          <div className={cn('hidden md:block', prefs.density === 'compacta' && '[&_td]:py-1 [&_th]:py-1')}>
            <AdminTable
              columns={columns}
              data={rows}
              rowKey={o => o.id}
              sortKey={query.sort.key}
              sortDir={query.sort.dir}
              onSort={sortBy}
              empty={{
                icon: ShoppingCart,
                message: error ? 'A lista não pôde ser carregada.' : 'Nenhum pedido neste filtro.',
                hint: filtrosAtivos > 0 ? 'Limpe os filtros para ver todos.' : undefined,
              }}
              footer={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{rangeLabel(query.page, query.pageSize, total)}</span>
                  <Select
                    value={String(query.pageSize)}
                    onValueChange={v => setQuery(q => ({ ...q, pageSize: Number(v), page: 1 }))}
                  >
                    <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ORDER_PAGE_SIZES.map(n => (
                        <SelectItem key={n} value={String(n)}>{n}/pág</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              }
            />
          </div>

          {/* Mobile: cartão com a ação primária do estado, em 44px e na largura inteira (D8). */}
          <ul className="space-y-3 md:hidden">
            {rows.map(o => {
              const resumo = rowSummary(o)
              const idade = rowQueueAge(o)

              return (
                <li key={o.id} data-cartao={o.id} className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* `min-h-[44px]` mesmo sendo texto: no cartao do celular este link e o
                          caminho para o pedido, e um alvo de 24px na bancada com o envelope na mao
                          erra. `flex items-center` mantem a linha onde estava (PED-23). */}
                      <Link
                        to={`/admin/pedidos/${o.id}`} state={voltarPara}
                        className="flex min-h-[44px] items-center truncate font-medium hover:underline"
                      >
                        {o.customer_name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatOrderNumber(o.order_number)}
                        {purchaseOrdinalLabel(o.purchase_ordinal)
                          ? ` · ${purchaseOrdinalLabel(o.purchase_ordinal)}`
                          : ''}{' '}
                        · {formatRelativeDate(o.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatPrice(o.total)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={o.status} />
                    <MaterialStatusBadge status={o.material_status} />
                    {idade && <QueueAge age={idade} since={queueSince(o)} />}
                  </div>

                  {resumo.blocker && (
                    <p className="mt-2 text-xs text-muted-foreground">{resumo.blocker}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {resumo.actionLabel ? (
                      <ActionButton
                        // `min-w-0` + texto que quebra: a 390/200 % o rótulo `nowrap` empurrava o
                        // WhatsApp para fora do cartão (conserto do reteste da `88`).
                        className="h-auto min-h-[44px] min-w-0 flex-1 whitespace-normal"
                        disabled={ocupado}
                        // O estado SÓ neste cartão (`AVS-21`): os outros ficam desabilitados, sem indicador.
                        pending={lendoCartao === o.id || gesto.pendente === chaveDoCartao(o.id)}
                        pendingLabel="Registrando…"
                        // Conserto do QA (`BUG-20261030-recebi-o-material-sem-o-pedido-no-nome`): numa
                        // lista de cartões, o nome diz de qual pedido é o botão.
                        aria-label={`${lendoCartao === o.id || gesto.pendente === chaveDoCartao(o.id) ? 'Registrando…' : resumo.actionLabel} — pedido ${formatOrderNumber(o.order_number)}, ${o.customer_name}`}
                        onClick={() => {
                          if (resumo.action === 'registrar-recebimento') void registrarRecebimento(o)
                          else navigate(`/admin/pedidos/${o.id}`, { state: voltarPara })
                        }}
                      >
                        {resumo.actionLabel}
                      </ActionButton>
                    ) : (
                      <Button asChild variant="outline" className="h-auto min-h-[44px] min-w-0 flex-1 whitespace-normal">
                        <Link to={`/admin/pedidos/${o.id}`} state={voltarPara}>Abrir pedido</Link>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 shrink-0"
                      aria-label={`Cobrar material de ${o.customer_name}`}
                      onClick={() => window.open(chargeMaterialUrl(o, o.customer_phone), '_blank')}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              )
            })}

            <li className="pt-1 text-center text-xs text-muted-foreground">
              {rangeLabel(query.page, query.pageSize, total)}
            </li>
          </ul>

          <Pagination
            page={query.page}
            totalPages={Math.max(1, Math.ceil(total / query.pageSize))}
            onPageChange={p => setQuery(q => ({ ...q, page: p }))}
          />
        </>
      )}

      {gesto.dialogo}
      {gesto.regiaoViva}
    </div>
  )
}

/** Nenhum envio conhecido — o `enviados` do hook, que a lista só lê ao acionar. */
const NADA_ENVIADO: ReadonlySet<NotificationEvent> = new Set()

type TipoDeLote = 'avancar' | 'material'

const chaveDoCartao = (id: string) => `cartao:${id}`

const SEM_AVISO: CustomerNotice = { send: [], alreadySent: [] }

/**
 * O plano do lote: para cada pedido, para onde vai (`null` = fica como está) e o que a cliente
 * receberia. A previsão é `customerNoticeFor` sobre o pedido no estado de DESTINO (`AVS-19`); quem diz
 * se o material pode ir a "recebido" é a máquina de estado de `core`.
 */
function planejarLote(
  tipo: TipoDeLote,
  alvo: AdminOrderRow[],
  settings: Parameters<typeof customerNoticeFor>[2],
  enviados: Map<string, Set<NotificationEvent>>,
): { row: AdminOrderRow; alvo: string | null; aviso: CustomerNotice }[] {
  const trigger: NotificationTrigger = tipo === 'avancar' ? 'order_status_changed' : 'material_status_changed'
  return alvo.map(row => {
    const destino = tipo === 'avancar'
      ? NEXT_STATUS[row.status] ?? null
      : materialTransitionRefusal(toMaterialStatus(row.material_status), 'material_recebido') === null
        ? 'material_recebido'
        : null
    if (!destino) return { row, alvo: null, aviso: SEM_AVISO }
    const depois = tipo === 'avancar' ? { ...row, status: destino } : { ...row, material_status: destino }
    return { row, alvo: destino, aviso: customerNoticeFor(trigger, depois, settings, enviados.get(row.id) ?? NADA_ENVIADO) }
  })
}

/** Os e-mails do lote, agrupados: cada evento com quantos pedidos o mandariam. */
function contarEventos(listas: NotificationEvent[][]): { event: NotificationEvent; quantos: number }[] {
  const contagem = new Map<NotificationEvent, number>()
  for (const lista of listas) for (const e of lista) contagem.set(e, (contagem.get(e) ?? 0) + 1)
  return [...contagem].map(([event, quantos]) => ({ event, quantos }))
}

/** "2 pedidos já receberam “Pedido postado” antes e não recebem de novo." — ou nada. */
function fraseJaRecebeu(avisos: CustomerNotice[]): string | null {
  const contagem = contarEventos(avisos.map(a => a.alreadySent))
  if (contagem.length === 0) return null
  return contagem
    .map(({ event, quantos }) =>
      quantos === 1
        ? `1 pedido já recebeu “${NOTIFICATION_EVENT_NAMES[event]}” antes e não recebe de novo.`
        : `${quantos} pedidos já receberam “${NOTIFICATION_EVENT_NAMES[event]}” antes e não recebem de novo.`,
    )
    .join(' ')
}

export default AdminOrdersPage
export { ORDER_STATUSES, STATUS_LABELS }
