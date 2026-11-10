import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Paperclip, X } from 'lucide-react'

import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
  MANUAL_PAYMENT_NOTE_MAX,
  ORDER_STATUS_LABELS,
  RECEIPT_CONTENT_TYPES,
  canRecordManualPayment,
  formatOrderNumber,
  paidAtRefusal,
  receiptRefusal,
  type ManualPaymentMethod,
} from '@estrelinha/core/orders'
import { storeLocalInput, storeLocalToInstant } from '@estrelinha/core/time'
import {
  customerNoticeFor,
  NOTIFICATION_EVENT_NAMES,
  sentCustomerEvents,
} from '@estrelinha/core/notifications'
import { useNotificationSettings } from '@estrelinha/core/hooks/useStoreSettings'

import { useAdminOrder } from '@/entities/order/api/useAdminOrder'
import { registrarPagamento } from '@/features/manual-payment'
import { useGestoComAviso, type DesfechoDaGravacao } from '@/features/order-notice'
import { ActionButton, CharCounter, DateField, FieldGroup, FormCard, OrderPageSkeleton, RecordPageHeader } from '@/shared/ui'

/**
 * `/admin/pedidos/:id/pagamento` — registrar um pagamento feito por fora da loja (PIX direto,
 * transferência, dinheiro, maquininha). Editor é TELA, não modal: a rota sobrevive ao F5.
 *
 * Gravado, o pedido passa a se comportar em todo lugar como pago — o mesmo estado que o webhook
 * produz (`approved` + `paid_at`), pela RPC `record_manual_payment`, que aprova pelo mesmo corpo de
 * `apply_payment_approval`. A escrita é do dono de `core` (`recordManualPayment`); a tela recusa antes
 * da rede o que dá para recusar (os arquivos, a data) e pergunta, no portão da feature `88`, se a
 * cliente recebe o e-mail.
 *
 * A data e a hora são de Brasília (o campo não carrega fuso; a conversão é de `core/time`). Todos os
 * campos são opcionais: sem data, vale agora.
 */

/** O `accept` do campo de arquivo: os tipos aceitos e as extensões, para a câmera e a galeria do celular. */
const ACEITOS = [...RECEIPT_CONTENT_TYPES, '.heic', '.heif', '.pdf'].join(',')

/** A frase do pagamento aprovado enquanto o formulário estava aberto. */
const JA_PAGO =
  'O pagamento deste pedido foi aprovado enquanto você preenchia. Nada foi registrado, e os comprovantes não foram guardados.'

const AdminRecordPaymentPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [busca] = useSearchParams()
  const para = busca.get('para')
  const { user, customer } = useAuthContext()
  const { order, emails, emailsError, loading, error } = useAdminOrder(id)
  const notificacoes = useNotificationSettings()
  const enviados = useMemo(() => sentCustomerEvents(emails ?? []), [emails])
  const gesto = useGestoComAviso({ settings: notificacoes, enviados, enviadosIndisponiveis: emailsError === true })

  const agora = useMemo(() => storeLocalInput(new Date().toISOString()), [])
  const [meio, setMeio] = useState<ManualPaymentMethod | null>(null)
  const [dia, setDia] = useState(agora.slice(0, 10))
  const [hora, setHora] = useState(agora.slice(11, 16))
  const [nota, setNota] = useState('')
  const [arquivos, setArquivos] = useState<File[]>([])
  const [jaPago, setJaPago] = useState(false)

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
        <Button asChild variant="outline" className="mt-4 min-h-11">
          <Link to="/admin/pedidos">Voltar para Pedidos</Link>
        </Button>
      </div>
    )
  }

  const numero = formatOrderNumber(order.order_number)
  const voltar = `/admin/pedidos/${order.id}`
  const header = (
    <RecordPageHeader
      group="Vendas"
      parentLabel="Pedidos"
      crumb={numero}
      title="Registrar pagamento"
      subtitle={`Pedido ${numero} · ${order.customer_name}`}
      onBack={() => navigate(voltar)}
    />
  )

  if (!canRecordManualPayment(order)) {
    const motivo = order.status === 'cancelled'
      ? 'Pedido cancelado não recebe registro de pagamento.'
      : order.paid_at || order.payment_status === 'approved'
        ? 'Este pedido já está pago.'
        : 'O pagamento deste pedido foi estornado ou cancelado e não pode ser registrado.'
    return (
      <div>
        {header}
        <FormCard>
          <p className="text-sm">{motivo}</p>
          <Button asChild variant="outline" className="min-h-11">
            <Link to={voltar}>Voltar ao pedido</Link>
          </Button>
        </FormCard>
      </div>
    )
  }

  // O instante de Brasília. Sem dia, vale agora (o campo é opcional); dia sem hora, meio-dia não — a
  // hora vazia é recusada como data incompleta.
  const paidAt = dia ? storeLocalToInstant(`${dia}T${hora}`) : null
  const recusaDosArquivos = receiptRefusal(arquivos)
  const recusaDaData = dia ? paidAtRefusal(paidAt, order.created_at) : null
  const recusa = recusaDosArquivos ?? recusaDaData
  const ocupado = gesto.pendente !== null || gesto.ocupado

  const novoStatus = order.status === 'pending' ? 'paid' : order.status
  const depois = { ...order, payment_status: 'approved', paid_at: paidAt ?? new Date().toISOString(), status: novoStatus }
  // A previsão do aviso, a mesma do portão (`customerNoticeFor`): diz antes do clique o que a cliente
  // pode receber.
  const aviso = customerNoticeFor('payment_recorded', depois, notificacoes, enviados)

  const escolherArquivos = (lista: FileList | null) => {
    if (!lista) return
    // A cópia sai AGORA: `input.files` é uma lista viva, e limpar o campo logo depois a esvazia. O
    // React pode rodar o atualizador só no próximo render, quando ela já está vazia.
    const escolhidos = Array.from(lista)
    setArquivos((atuais) => [...atuais, ...escolhidos])
  }

  const gravar = async (avisarCliente: boolean | undefined): Promise<DesfechoDaGravacao> => {
    const r = await registrarPagamento({
      orderId: order.id,
      createdAt: order.created_at,
      method: meio,
      paidAt,
      note: nota,
      files: arquivos,
      authorName: customer?.name?.trim() || user?.email || null,
      ...(avisarCliente === undefined ? {} : { avisarCliente }),
    })
    switch (r.tipo) {
      case 'ok':
        return { erro: null, emailSent: r.emailSent, ...(r.avisoAnotado === false ? { avisoNaoAnotado: true } : {}) }
      case 'ja-pago':
        setJaPago(true)
        return { erro: JA_PAGO }
      case 'recusado':
        return { erro: r.motivo }
      case 'sem-papel':
        return { erro: 'Sua conta não tem acesso para registrar pagamento. Nada foi registrado.' }
      case 'falhou-envio':
        return { erro: 'Um comprovante não foi enviado. Nada foi registrado — tente de novo.' }
      default:
        return { erro: 'O pagamento não foi registrado. Nada foi alterado — tente de novo.' }
    }
  }

  const registrar = async () => {
    if (recusa) return
    const gravou = await gesto.acionar({
      chave: 'registrar-pagamento',
      trigger: 'payment_recorded',
      depois,
      orderId: order.id,
      titulo: 'Registrar o pagamento',
      mudanca: `O pedido ${numero} passa a constar como pago${novoStatus !== order.status ? ' e vai para Pago' : ''}.`,
      confirmar: 'Registrar pagamento',
      gerundio: 'Registrando pagamento…',
      sucesso: 'Pagamento registrado',
      gravar,
    })
    // O foco vai ao título do pedido quando ele carregar (o mesmo alvo do desfazer): esta tela some,
    // e o controle que confirmou some com ela.
    if (gravou) navigate(voltar, { state: { focarTitulo: true } })
  }

  return (
    <div>
      {header}

      {jaPago && (
        <div role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {JA_PAGO}{' '}
          <Link to={voltar} className="inline-flex min-h-11 items-center underline">Voltar ao pedido</Link>
        </div>
      )}

      <div className="grid max-w-2xl grid-cols-1 gap-4">
        <FormCard
          title="Pagamento feito por fora da loja"
          description="PIX direto, transferência, dinheiro ou maquininha. Todos os campos são opcionais."
        >
          {para && ORDER_STATUS_LABELS[para as keyof typeof ORDER_STATUS_LABELS] && para !== 'paid' && (
            <p className="rounded-lg bg-muted/40 p-2 text-sm">
              {`Depois de registrar, você volta ao pedido para levar o pedido a ${ORDER_STATUS_LABELS[para as keyof typeof ORDER_STATUS_LABELS]}.`}
            </p>
          )}

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-foreground">Meio</legend>
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {MANUAL_PAYMENT_METHODS.map((m) => (
                <label
                  key={m}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm has-[:checked]:border-primary"
                >
                  <input
                    type="radio"
                    name="meio"
                    value={m}
                    checked={meio === m}
                    onChange={() => setMeio(m)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="min-w-0">{MANUAL_PAYMENT_METHOD_LABELS.admin[m]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,10rem)]">
            <DateField
              label="Data do pagamento (Brasília)"
              value={dia}
              onChange={setDia}
              placeholder="Agora"
              triggerClassName="h-11"
              clearClassName="h-11 w-11 shrink-0"
            />
            <FieldGroup label="Hora do pagamento (Brasília)" htmlFor="hora-do-pagamento">
              <Input
                id="hora-do-pagamento"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="h-11"
              />
            </FieldGroup>
          </div>
          {recusaDaData && (
            <p role="alert" className="text-sm text-destructive">{recusaDaData}</p>
          )}

          <FieldGroup
            label="Observação"
            htmlFor="observacao-do-pagamento"
            hint="Só quem administra vê. A cliente não recebe."
            counter={<CharCounter value={nota} limit={MANUAL_PAYMENT_NOTE_MAX} />}
          >
            <Textarea
              id="observacao-do-pagamento"
              value={nota}
              maxLength={MANUAL_PAYMENT_NOTE_MAX}
              onChange={(e) => setNota(e.target.value)}
              rows={3}
            />
          </FieldGroup>

          <div className="space-y-1.5">
            <label
              htmlFor="comprovantes-do-pagamento"
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
              Comprovantes
            </label>
            <input
              id="comprovantes-do-pagamento"
              type="file"
              multiple
              accept={ACEITOS}
              className="sr-only"
              onChange={(e) => {
                escolherArquivos(e.target.files)
                e.target.value = ''
              }}
            />
            <p className="text-xs text-muted-foreground">Até 3 arquivos JPG, PNG, WebP, HEIC ou PDF, de até 10 MB cada.</p>
            {arquivos.length > 0 && (
              <ul className="space-y-1">
                {arquivos.map((a, i) => (
                  <li key={`${a.name}-${i}`} className="flex min-w-0 items-center gap-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{a.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 shrink-0"
                      aria-label={`Tirar ${a.name}`}
                      onClick={() => setArquivos((atuais) => atuais.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {recusaDosArquivos && (
              <p role="alert" className="text-sm text-destructive">{recusaDosArquivos}</p>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {aviso.send.length > 0
              ? `Ao registrar, você escolhe se a cliente recebe o e-mail “${NOTIFICATION_EVENT_NAMES[aviso.send[0]]}”.`
              : 'Nenhum e-mail sai para a cliente neste registro.'}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button asChild variant="outline" className="min-h-11">
              <Link to={voltar}>Cancelar</Link>
            </Button>
            <ActionButton
              alvo44
              disabled={Boolean(recusa) || ocupado}
              pending={gesto.pendente === 'registrar-pagamento'}
              pendingLabel="Registrando pagamento…"
              onClick={() => void registrar()}
            >
              Registrar pagamento
            </ActionButton>
          </div>
        </FormCard>
      </div>

      {gesto.dialogo}
      {gesto.regiaoViva}
    </div>
  )
}

export default AdminRecordPaymentPage
