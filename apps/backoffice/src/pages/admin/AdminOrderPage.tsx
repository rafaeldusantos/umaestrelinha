import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Copy, ExternalLink, ImageOff, MessageSquare, Printer, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber, itemPhoto } from '@estrelinha/core/orders'
import { queueAgeLabel } from '@estrelinha/core/material'
import { isPickupOrder, PICKUP_METHOD_NAME } from '@estrelinha/core/shipping'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'

import { useAdminOrder } from '@/entities/order/api/useAdminOrder'
import { useAdminOrders, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { resendNotification, resendNotificationOutcome } from '@/entities/order/api/notifyOrder'
import {
  customerNoticeFor,
  EVENT_AUDIENCE,
  eventsForTrigger,
  isNotificationEvent,
  NOTIFICATION_EVENT_NAMES,
  sentCustomerEvents,
  type NotificationEvent,
} from '@estrelinha/core/notifications'
import { useNotificationSettings } from '@estrelinha/core/hooks/useStoreSettings'
import {
  PAYMENT_STATUS_LABELS, rowQueueAge, type AdminOrderRow,
} from '@/entities/order/api/orderQuery'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import MaterialStatusBadge from '@/entities/order/ui/MaterialStatusBadge'
import PickupLocation from '@/entities/order/ui/PickupLocation'
import OrderMaterialCard from '@/features/order-management/ui/OrderMaterialCard'
import MelhorEnvioTab from '@/features/order-management/ui/MelhorEnvioTab'
import OrderCancelDialog from '@/features/order-management/ui/OrderCancelDialog'
import OrderNextStep from '@/features/order-detail/ui/OrderNextStep'
import OrderHistory from '@/features/order-detail/ui/OrderHistory'
import { buildHistory } from '@/features/order-detail/model/history'
import { gerundioDoStatus } from '@/features/order-detail/model/gerundio'
import { abrirPrevia, fraseDoResultado, OUTRA_GRAVACAO, useGestoComAviso } from '@/features/order-notice'
import { openPickSlips, type PickSlipOrder } from '@/features/pick-slip'
import { chargeMaterialUrl } from '@/features/order-list/model/chargeMaterial'
import { ActionButton, OrderPageSkeleton, RecordPageHeader } from '@/shared/ui'
import { SENT_EMAILS_READ_FAILED } from '@/entities/order/api/sentEmails'
import { devolverFoco, tituloDaPagina } from '@/shared/lib/foco'

/**
 * `/admin/pedidos/:id` — o pedido como **rota** (`PED-24`).
 *
 * ---------------------------------------------------------------------------------------------
 * POR QUE O MODAL SAIU
 * ---------------------------------------------------------------------------------------------
 * `Editor é TELA, não modal` já era a regra escrita deste painel — cupom, promoção e produto se
 * cadastram em rota própria desde a feature 18 —, e o pedido era a exceção justamente onde ela
 * custava mais: é o registro mais complexo do painel, com cinco abas, e **não sobrevivia ao F5**.
 * Também não virava link: não havia como mandar "olha este pedido" para ninguém.
 *
 * ---------------------------------------------------------------------------------------------
 * A ORDEM DOS BLOCOS É A ORDEM DA OPERAÇÃO, NÃO A DO ESQUEMA (D3)
 * ---------------------------------------------------------------------------------------------
 *   1. **O que este pedido espera** — a máquina do material. Primeiro porque enquanto o envelope
 *      não chega, nada mais importa.
 *   2. **Próximo passo** — a mudança de status, dizendo o que a segura, sem bloquear.
 *   3. **Itens** — com gravação, que é o que vai para a bancada.
 *   4. **Histórico** — status, e-mails e notas num fluxo só.
 *
 * ---------------------------------------------------------------------------------------------
 * OS DOIS RASTREIOS NUNCA SE CRUZAM (PED-26)
 * ---------------------------------------------------------------------------------------------
 * `material_tracking_code` é a remessa **DE ENTRADA** (cliente → ateliê) e só aparece dentro do
 * bloco de material. `tracking_code` é a **DE SAÍDA** (ateliê → cliente), mora só no bloco de
 * entrega, e é rotulado `RASTREIO DA JOIA (SAÍDA)`. Trocar os dois faria "postamos sua joia" sair
 * com o código do envelope que a cliente mandou — e o `CLAUDE.md` do backoffice já avisa que esse
 * erro é caro. Desenho ambíguo é o caminho mais curto para cometê-lo.
 */
const listaDeVolta = (state: unknown): string => {
  const alvo = (state as { voltarPara?: unknown } | null)?.voltarPara
  return typeof alvo === 'string' && /^\/admin\/pedidos(\?|$)/.test(alvo) ? alvo : '/admin/pedidos'
}

const AdminOrderPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // A lista entrega o próprio endereço ao abrir o pedido (`orderListHref`), e o voltar reabre a lista
  // no mesmo filtro e na mesma página. Só caminho da própria lista é aceito; chegando de outro lugar
  // (link colado, ficha da cliente), volta para a lista sem filtro, como antes.
  const voltarPara = listaDeVolta(useLocation().state)
  const {
    order, customer, items, itemsError, productRefs, history, notes, emails, emailsError, loading, error, staleError, reload,
  } = useAdminOrder(id)
  const {
    updateStatus, cancelOrder, addTrackingCode, addNote, setMaterialStatus, setMaterialTracking,
  } = useAdminOrders()

  // Feature `88`: a previsão do aviso (`A-01`) lê as configurações de notificação (os padrões enquanto
  // a leitura não chega — os mesmos do motor) e o que a cliente JÁ recebeu deste pedido.
  const notificacoes = useNotificationSettings()
  const enviados = useMemo(() => sentCustomerEvents(emails ?? []), [emails])
  // Um caminho para todo gesto que pode avisar a cliente: portão, uma gravação por vez, a frase do
  // desfecho e a região viva (`AVS-01`, `CRG-01`, `CRG-02`, `CRG-09`).
  // Conserto do QA (`A-14`): com a leitura dos envios falhando, o gesto que dependeria da previsão é
  // recusado — a mesma frase do lote e do cartão.
  const gesto = useGestoComAviso({ settings: notificacoes, enviados, enviadosIndisponiveis: emailsError === true })
  const { pendente } = gesto
  const busy = pendente !== null || gesto.ocupado

  const [tracking, setTracking] = useState('')
  const [carrier, setCarrier] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  // Conserto do QA (foco): o "Tentar de novo" da faixa some quando a releitura volta — o foco vai ao
  // título do pedido, depois do commit.
  const [focarTitulo, setFocarTitulo] = useState(false)
  useEffect(() => {
    if (!focarTitulo) return
    // A faixa que ficou (a releitura falhou de novo) mantém o foco no próprio botão.
    devolverFoco(document.activeElement, tituloDaPagina)
    setFocarTitulo(false)
  }, [focarTitulo, staleError])

  // `CRG-06`: a primeira carga é o esqueleto com a grade do pedido. Uma releitura depois de gravar
  // (`'revalidar'`) nunca liga `loading` — a página não pisca (`CRG-03`).
  if (loading) return <OrderPageSkeleton />

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Este pedido não existe (ou foi removido).</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to={voltarPara}>Voltar para Pedidos</Link>
        </Button>
      </div>
    )
  }

  const idade = rowQueueAge({
    created_at: order.created_at,
    material_received_at: (order as { material_received_at?: string | null }).material_received_at ?? null,
    material_status: order.material_status ?? 'nao_aplicavel',
  })

  const eventos = buildHistory(history, emails, notes)
  const numero = formatOrderNumber(order.order_number)
  const rotulo = (s: string) => STATUS_LABELS[s] ?? s

  /** A releitura depois de gravar: sem "Carregando...", sem perder rolagem nem campo digitado. */
  const revalidar = () => reload('revalidar')

  // Gestos 1 e 2 — o Próximo passo e o "Outro status".
  const mudarStatus = (status: string, origem?: HTMLElement | null) =>
    gesto.acionar({
      ...(origem ? { origem } : {}),
      chave: `status:${status}`,
      trigger: 'order_status_changed',
      depois: { ...order, status },
      orderId: order.id,
      titulo: `Mudar para ${rotulo(status)}`,
      mudanca: `O pedido ${numero} passa de ${rotulo(order.status)} para ${rotulo(status)}.`,
      confirmar: `Mudar para ${rotulo(status)}`,
      gerundio: gerundioDoStatus(status, retirada),
      sucesso: `Status: ${rotulo(status)}`,
      gravar: async (avisarCliente) => {
        const r = avisarCliente === undefined
          ? await updateStatus(order.id, status)
          : await updateStatus(order.id, status, undefined, avisarCliente)
        if (r.error) return { erro: 'Não foi possível mudar o status. Nada foi alterado — tente de novo.' }
        await revalidar()
        return { erro: null, emailSent: r.emailSent }
      },
    })

  // Gesto 3 — o rastreio de saída. Em falha, o código e a transportadora ficam nos campos (`CRG-05`).
  const salvarRastreioDeSaida = async () => {
    const codigo = tracking.trim()
    if (!codigo) return
    await gesto.acionar({
      chave: 'rastreio',
      trigger: 'order_status_changed',
      depois: { ...order, tracking_code: codigo },
      orderId: order.id,
      titulo: 'Salvar o rastreio da joia',
      mudanca: `O código ${codigo} fica no pedido ${numero}, que está como ${rotulo(order.status)}.`,
      confirmar: 'Salvar rastreio',
      gerundio: 'Salvando rastreio…',
      sucesso: 'Rastreio salvo',
      gravar: async (avisarCliente) => {
        const r = avisarCliente === undefined
          ? await addTrackingCode(order.id, codigo, carrier.trim())
          : await addTrackingCode(order.id, codigo, carrier.trim(), avisarCliente)
        if (r.error) return { erro: 'O rastreio não foi salvo. Nada foi alterado — tente de novo.' }
        setTracking('')
        await revalidar()
        return { erro: null, emailSent: r.emailSent }
      },
    })
  }

  // Gesto 7 — o cancelamento. A previsão é a mesma régua, sobre o pedido cancelado (`AVS-08`).
  const depoisDoCancelamento = { ...order, status: 'cancelled' }
  const avisoDoCancelamento = customerNoticeFor('order_status_changed', depoisDoCancelamento, notificacoes, enviados)
  const eventosDoCancelamento = eventsForTrigger('order_status_changed', depoisDoCancelamento).filter(
    (e) => EVENT_AUDIENCE[e] === 'customer',
  )

  const cancelar = async (motivo: string, avisarCliente: boolean | undefined): Promise<string | null> => {
    // `A-14`: sem saber o que já saiu, a caixa do cancelamento pergunta às cegas — recusa, dentro do
    // diálogo (o alerta dele é o anúncio).
    if (emailsError && avisoDoCancelamento.send.length > 0) return SENT_EMAILS_READ_FAILED
    const r = await gesto.rodar('cancelar', 'Cancelando…', () =>
      avisarCliente === undefined
        ? cancelOrder(order.id, motivo)
        : cancelOrder(order.id, motivo, avisarCliente),
    )
    if (r === undefined) return OUTRA_GRAVACAO
    // A falha fica no alerta do diálogo: ele é o anúncio (um só).
    if (r.error) return 'O pedido não foi cancelado. O motivo continua aqui — tente de novo.'
    // `AVS-07` (T23): o desfecho REAL. Com a caixa desmarcada, a frase vem da caixa (o motor responde
    // `sent: true` também pelo aviso à dona); com ela marcada, do `emailSent` que o motor devolveu.
    const frase = avisarCliente === undefined
      ? fraseDoResultado('Pedido cancelado', {
          perguntou: false,
          avisar: true,
          emailSent: r.emailSent === true,
          jaEnviados: avisoDoCancelamento.alreadySent,
        })
      : avisarCliente === true && r.emailSent !== true
        ? 'O e-mail não saiu — o pedido foi cancelado'
        : fraseDoResultado('Pedido cancelado', {
            perguntou: true,
            avisar: avisarCliente,
            emailSent: r.emailSent === true,
            jaEnviados: avisoDoCancelamento.alreadySent,
          })
    gesto.informar('success', frase)
    await revalidar()
    return null
  }

  // A nota interna. Em falha o texto fica no campo (`CRG-05`).
  const anotar = async (nota: string): Promise<boolean> => {
    const erro = await gesto.rodar('nota', 'Salvando nota…', () => addNote(order.id, nota))
    if (erro === undefined) return false
    if (erro) {
      gesto.informar('error', 'A nota não foi salva. Tente de novo.')
      return false
    }
    gesto.anunciar('Nota salva')
    await revalidar()
    return true
  }

  // "Reenviar" (linha de falha) e o avião (linha pulada, `AVS-13`): a mesma porta, `action=send`.
  const enviarEmail = async (type: string, channel: string, linhaId: string) => {
    const linha = eventos.find((e) => e.id === linhaId)
    const nomeDoEmail = isNotificationEvent(type) ? NOTIFICATION_EVENT_NAMES[type] : type

    if (linha?.emailSkipped) {
      const r = await gesto.rodar(`email:${linhaId}`, 'Enviando…', () =>
        resendNotificationOutcome(order.id, type as NotificationEvent, channel as 'email'),
      )
      if (r === undefined) return
      // `A-13`: o desfecho com a frase — e a linha continua `skipped` em todos menos o primeiro.
      const frase =
        r === 'enviado'
          ? `E-mail “${nomeDoEmail}” enviado`
          : r === 'desligado'
            ? 'Este e-mail está desligado em Configurações → Notificações.'
            : r === 'estado'
              ? 'O pedido não está mais no estado deste e-mail.'
              : `O e-mail “${nomeDoEmail}” não saiu. Tente de novo.`
      gesto.informar(r === 'enviado' ? 'success' : 'error', frase)
      await revalidar()
      return
    }

    // `AD-008`: o envio é contido. `resendNotification` devolve booleano e NUNCA lança — a falha não
    // reverte estado nenhum, só informa. Aqui o nome da MENSAGEM é o certo: reenviar é repetir uma
    // mensagem específica, não anunciar um fato novo (`AD-032`).
    const saiu = await gesto.rodar(`email:${linhaId}`, 'Reenviando…', () =>
      resendNotification(order.id, type as NotificationEvent, channel as 'email'),
    )
    if (saiu === undefined) return
    gesto.informar(saiu ? 'success' : 'error', saiu ? 'E-mail reenviado' : 'O reenvio não saiu. O estado do pedido não mudou.')
    await revalidar()
  }

  /** `Nota interna` do cabeçalho leva ao campo do histórico, e o foca. */
  const focarNotaInterna = () => {
    const campo = document.querySelector<HTMLInputElement>('[aria-label="Nova nota interna"]')
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    campo?.focus({ preventScroll: true })
  }

  const copiar = (valor: string, oQue: string) => {
    navigator.clipboard.writeText(valor)
    toast.success(`${oQue} copiado`)
  }

  // RET-14 (feature 63): pedido de retirada no escritório — sem postagem, sem rastreio de saída.
  const retirada = isPickupOrder(order)

  const enderecoLinhas = [
    [order.address_street, order.address_number].filter(Boolean).join(', '),
    order.address_complement,
    [order.address_neighborhood, order.address_city, order.address_state].filter(Boolean).join(' · '),
    order.address_zip ? `CEP ${order.address_zip}` : null,
  ].filter(Boolean) as string[]

  return (
    <div>
      <RecordPageHeader
        group="Vendas"
        parentLabel="Pedidos"
        crumb={formatOrderNumber(order.order_number)}
        title={`Pedido ${formatOrderNumber(order.order_number)}`}
        // Os selos EM LINHA com o título: "Pedido #1042, que está pago e aguardando material" é uma
        // frase só. Numa linha separada eles viravam legenda solta, longe do que qualificam.
        badges={
          <>
            <StatusBadge status={order.status} />
            <MaterialStatusBadge status={order.material_status} />
          </>
        }
        subtitle={
          <>
            {order.customer_name} · feito em {new Date(order.created_at).toLocaleString('pt-BR')}
            {idade && ` · ${queueAgeLabel(idade)}`}
          </>
        }
        onBack={() => navigate(voltarPara)}
        actions={
          <>
            <Button
              variant="outline" size="sm" className="min-h-[44px] md:min-h-0"
              onClick={() => openPickSlips([{ ...(order as unknown as PickSlipOrder), items }])}
            >
              <Printer className="mr-1 h-4 w-4" /> Folha de separação
            </Button>
            {/* Leva ao campo de nota do histórico em vez de abrir um modal: a nota nasce no fluxo
                onde ela vai ser lida depois, e não numa caixa que some. */}
            <Button
              variant="outline" size="sm" className="min-h-[44px] md:min-h-0"
              onClick={focarNotaInterna}
            >
              <MessageSquare className="mr-1 h-4 w-4" /> Nota interna
            </Button>
            <Button
              variant="outline" size="sm"
              className="min-h-[44px] border-destructive/40 text-destructive md:min-h-0"
              disabled={busy}
              onClick={() => setCancelOpen(true)}
            >
              Cancelar pedido
            </Button>
          </>
        }
      />

      {/* `CRG-04`: a releitura depois de gravar falhou. O pedido que estava na tela FICA. */}
      {staleError && (
        <div
          role="alert"
          className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span className="min-w-0 flex-1">
            Não consegui atualizar o pedido. O que está na tela pode estar desatualizado.
          </span>
          <ActionButton
            variant="outline"
            size="sm"
            alvo44
            pendingLabel="Atualizando…"
            onClick={async () => {
              await reload('revalidar')
              setFocarTitulo(true)
            }}
          >
            Tentar de novo
          </ActionButton>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* `grid-cols-1` (que é `minmax(0, 1fr)`) também no celular — conserto do reteste da `88`: sem
            trilha explícita a coluna implícita é `auto` e, a 390/200 %, tomava 373 px numa tela de 294.
            `minmax(0, 1fr)` e não `1fr`: sem ele o mínimo automático da coluna é o min-content do
            conteúdo, e uma tabela de itens larga estoura a grade — foi o defeito que pôs a página de
            produto da loja rolando na horizontal no celular. Vale aqui pela mesma razão. */}
        <div className="min-w-0 space-y-4">
          {/* 1 · O que este pedido espera. O rastreio DE ENTRADA vive aqui dentro, e só aqui. */}
          <OrderMaterialCard
            order={order}
            items={items}
            onSetStatus={async (oid, status, avisarCliente) => {
              const r = avisarCliente === undefined
                ? await setMaterialStatus(oid, status)
                : await setMaterialStatus(oid, status, avisarCliente)
              await revalidar()
              return r
            }}
            onSetTracking={async (oid, code, avisarCliente) => {
              const r = avisarCliente === undefined
                ? await setMaterialTracking(oid, code)
                : await setMaterialTracking(oid, code, avisarCliente)
              await revalidar()
              return r
            }}
            acionar={gesto.acionar}
            pendente={pendente}
          />

          {/* 2 · Próximo passo */}
          <OrderNextStep
            order={order}
            busy={busy}
            gravando={pendente?.startsWith('status:') ? pendente.slice('status:'.length) : null}
            onAdvance={mudarStatus}
          />

          {/* O recado da cliente (PED-11). Existia no banco desde o primeiro dia e nunca chegou a
              tela nenhuma. Rotulado com a ORIGEM, e visualmente distinto da nota interna — são
              coisas opostas: uma a cliente escreveu, a outra ela nunca vê. */}
          {order.notes && (
            <section className="rounded-xl border-l-4 border-l-estrelinha-admin-violet border-y border-r border-border bg-estrelinha-admin-card p-4">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Recado da cliente
              </h2>
              <p className="mt-1 text-sm">{order.notes}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Escrito por ela no checkout — não é nota interna.
              </p>
            </section>
          )}

          {/* 3 · Itens */}
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">
                {itemsError
                  ? 'Itens'
                  : `Itens · ${items.reduce((soma, i) => soma + i.quantity, 0)} peças`}
              </h2>
              <span className="text-xs text-muted-foreground">
                Preços congelados no momento da compra
              </span>
            </div>

            {/* Leitura que falhou NUNCA vira lista vazia: "0 peças" num pedido pago é falso, e é o
                conteúdo que vai para a bancada. */}
            {itemsError && (
              <div
                role="alert"
                className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {itemsError}
              </div>
            )}

            {!itemsError && items.length === 0 && (
              // Zero itens sem erro de leitura é uma ANOMALIA, não um estado normal: o checkout
              // sempre grava os itens. Dizer isso é mais útil que uma lista vazia silenciosa.
              <p className="rounded-lg border border-estrelinha-admin-amber/20 bg-estrelinha-admin-amber/10 p-3 text-sm text-estrelinha-admin-amber">
                Este pedido não tem itens gravados. Não é um estado esperado — todo pedido feito pela
                loja grava os seus itens. Vale conferir antes de separar ou imprimir.
              </p>
            )}

            <ul className="divide-y divide-border">
              {items.map(item => {
                const produto = productRefs[item.product_id] ?? null
                // O snapshot VENCE sempre: `order_items.product_image` é a foto do momento da
                // compra, e trocar a imagem no cadastro não pode mudar o que a bancada vai separar.
                // A capa de hoje só entra onde o snapshot está AUSENTE — que é o caso dos 59 itens
                // vindos da Nuvemshop, cujo CSV não traz imagem nenhuma. Foto aproximada é melhor
                // que moldura vazia; foto trocada por cima do snapshot seria pior que as duas.
                const foto = itemPhoto(item.product_image, produto?.image)
                // O destino é o CADASTRO, não a vitrine: quem abre isto está separando um pedido e
                // precisa de estoque, variação, material exigido e limite de gravação — coisas que
                // a página da loja não mostra. E não depende de `VITE_STORE_URL`: o painel sempre
                // sabe o próprio endereço.
                //
                // Item ÓRFÃO do import (`product_id` = `nuvemshop:…`, 35 dos 59 de hoje) não tem
                // cadastro para abrir. `productRefs` só tem quem casou com o catálogo, e por isso é
                // ele — e não `item.product_id` — que decide se há link: um `/admin/produtos/<id
                // órfão>/editar` abriria a tela de edição em cima de um produto que não existe.
                const adminHref = produto ? `/admin/produtos/${produto.id}/editar` : null

                return (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3.5 gap-y-1 py-3.5">
                  {/* Caixa de 46 com `shrink-0`: a moldura existe MESMO sem imagem, senão a linha
                      sem foto desalinha da linha com foto, e as duas ficam num lugar diferente. */}
                  <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-border bg-estrelinha-admin-elevated">
                    {foto ? (
                      <img
                        src={foto}
                        alt={item.product_name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        // Imagem quebrada some e devolve a moldura vazia — um ícone de imagem
                        // quebrada não diz nada a quem está separando o pedido.
                        onError={e => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <ImageOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>

                  {/* Conserto do reteste da `88` (fonte a 200 % em 390): o nome tem piso de 6rem (ou o que
                      sobra ao lado da foto) — quando não cabe com a quantidade e o preço, ESTES descem
                      para a linha de baixo, alinhados à direita. No computador a linha é uma só. */}
                  <div className="min-w-[min(6rem,calc(100%_-_46px_-_0.875rem))] flex-1">
                    {adminHref ? (
                      // Nova aba de propósito: a conferência do produto não pode fazer perder o
                      // pedido que está aberto — nem o rascunho de nota, nem o campo de rastreio
                      // meio digitado. `<Link target="_blank">` deixa o navegador abrir a aba.
                      <Link
                        to={adminHref}
                        target="_blank"
                        className="inline-flex items-start gap-1 text-sm font-semibold hover:text-estrelinha-admin-violet hover:underline"
                      >
                        {item.product_name}
                        <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="sr-only">— abrir o cadastro do produto, em nova aba</span>
                      </Link>
                    ) : (
                      <p className="text-sm font-semibold">{item.product_name}</p>
                    )}
                    <p className="text-xs text-estrelinha-admin-text-secondary">
                      {[item.variant_label, item.engraving_text ? null : 'sem gravação']
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </p>
                    {item.engraving_text && (
                      // A gravação é o que NÃO dá para desfazer depois de gravado, então tem cor.
                      <p className="text-xs font-medium text-estrelinha-admin-amber">
                        Gravação: “{item.engraving_text}” · {item.engraving_text.length} caracteres
                      </p>
                    )}
                  </div>

                  {/* Faixas de largura FIXA: sem elas, `un` e preço mudam de coluna a cada linha,
                      conforme o comprimento do nome — e a leitura vertical de quantidade some. */}
                  <span className="ml-auto flex shrink-0 items-center gap-3.5">
                    <span className="min-w-[60px] shrink-0 whitespace-nowrap text-center text-xs text-estrelinha-admin-text-secondary">
                      {item.quantity} un
                    </span>
                    {/* `min-w` e não `w`: com a fonte grande o valor cresce além de 110 e saía cortado. */}
                    <span className="min-w-[110px] shrink-0 whitespace-nowrap text-right text-sm font-semibold">
                      {formatPrice(item.unit_price)}
                    </span>
                  </span>
                </li>
                )
              })}
            </ul>
          </section>

          {/* 4 · Histórico único */}
          <OrderHistory
            events={eventos}
            busy={busy}
            reenviando={pendente?.startsWith('email:') ? pendente.slice('email:'.length) : null}
            anotando={pendente === 'nota'}
            onAddNote={anotar}
            onResendEmail={enviarEmail}
            emailsError={emailsError === true}
            onRetryEmails={() => reload('revalidar')}
          />

          {/* O Melhor Envio migra de ABA para BLOCO, sem alteração interna (D9). */}
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-3 flex items-center gap-2 font-heading text-lg font-semibold">
              <Truck className="h-4 w-4" /> Melhor Envio
            </h2>
            <MelhorEnvioTab order={order} items={items} onUpdate={() => reload('revalidar')} />
          </section>
        </div>

        {/* Aside de 330 — a mesma largura dos formulários de cupom e produto. A moldura é uma só. */}
        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Cliente
              </h2>
              {order.customer_id && (
                <Link
                  to={`/admin/clientes/${order.customer_id}`}
                  className="inline-flex min-h-[44px] items-center text-xs text-primary hover:underline md:min-h-0"
                >
                  Ver ficha
                </Link>
              )}
            </div>
            <p className="font-medium">{order.customer_name}</p>
            <p className="text-sm text-muted-foreground">{order.customer_email}</p>

            {/* `D3` — o que ela já confiou à loja, ao lado de quem ela é. É o contexto que muda
                como se escreve para alguém na terceira compra. */}
            {customer && customer.orders_paid > 0 && (
              // Conserto do reteste da `88`: `auto-fit` com piso de 8rem e não `grid-cols-2` — a 390/200 %
              // o valor gasto passava da caixa de 106 px. No aside do computador cabem as duas colunas.
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(min(100%,8rem),1fr))] gap-2">
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Compras</p>
                  <p className="text-lg font-semibold">{customer.orders_paid}</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Gastou</p>
                  <p className="text-lg font-semibold">{formatPrice(customer.total_spent)}</p>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Entrega
              </h2>
              {enderecoLinhas.length > 0 && (
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center text-xs text-primary hover:underline md:min-h-0"
                  onClick={() => copiar(enderecoLinhas.join('\n'), 'Endereço')}
                >
                  Copiar endereço
                </button>
              )}
            </div>

            {retirada && (
              <div className="mb-3 rounded-lg bg-muted/40 p-2" data-testid="entrega-retirada">
                <p className="text-sm font-medium">{PICKUP_METHOD_NAME}</p>
                <PickupLocation className="text-sm text-muted-foreground" />
              </div>
            )}

            {enderecoLinhas.length > 0 ? (
              <p className="text-sm">
                {enderecoLinhas.map(linha => (
                  <span key={linha} className="block">{linha}</span>
                ))}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Sem endereço no pedido.</p>
            )}

            {/* O rastreio DE SAÍDA, rotulado com a direção. O de entrada está no bloco de material,
                e os dois nunca aparecem lado a lado.

                Pedido de retirada não tem saída pelo correio (RET-14): o bloco inteiro some, senão
                "Salvar rastreio" levaria um pedido que a cliente busca no escritório a "enviado". */}
            {!retirada && (
              <h3 className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Rastreio da joia (saída)
              </h3>
            )}

            {retirada ? null : order.tracking_code ? (
              <p className="mt-1 flex items-center gap-2 font-mono text-sm">
                {order.tracking_code}
                <Button
                  size="icon" variant="ghost" className="h-9 w-9"
                  aria-label="Copiar rastreio da joia"
                  onClick={() => copiar(order.tracking_code!, 'Rastreio')}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </p>
            ) : (
              <div className="mt-1 space-y-2">
                <Input
                  value={tracking}
                  onChange={e => setTracking(e.target.value)}
                  placeholder="Ainda não postado"
                  className="h-11"
                  aria-label="Código de rastreio da joia"
                />
                <Input
                  value={carrier}
                  onChange={e => setCarrier(e.target.value)}
                  placeholder="Transportadora"
                  className="h-11"
                  aria-label="Transportadora"
                />
                <ActionButton
                  className="min-h-[44px] w-full"
                  disabled={busy || !tracking.trim()}
                  pending={pendente === 'rastreio'}
                  pendingLabel="Salvando rastreio…"
                  onClick={salvarRastreioDeSaida}
                >
                  Salvar rastreio
                </ActionButton>
                <p className="text-xs text-muted-foreground">
                  O e-mail “sua joia foi postada” só sai quando este código for salvo.
                </p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Pagamento
            </h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              {order.discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Desconto</dt><dd>− {formatPrice(order.discount)}</dd></div>
              )}
              {order.pix_discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Desconto Pix</dt><dd>− {formatPrice(order.pix_discount)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted-foreground">Frete</dt><dd>{order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'Grátis'}</dd></div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
              <div className="flex justify-between pt-2"><dt className="text-muted-foreground">Método</dt><dd>{order.payment_method}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Situação</dt><dd>{PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}</dd></div>
              {order.paid_at && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Pago em</dt><dd>{new Date(order.paid_at).toLocaleString('pt-BR')}</dd></div>
              )}
            </dl>
          </section>
        </aside>
      </div>

      <OrderCancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        orderNumber={order.order_number}
        aviso={avisoDoCancelamento}
        eventosDaCliente={eventosDoCancelamento}
        cliente={order.customer_email}
        onVerEmail={(e) => void abrirPrevia(e, order.id)}
        onConfirm={cancelar}
      />

      {/* Uma vez na página: o diálogo de aviso e a região viva que anuncia gerúndio e resultado. */}
      {gesto.dialogo}
      {gesto.regiaoViva}
    </div>
  )
}

export default AdminOrderPage
