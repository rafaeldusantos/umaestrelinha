import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download, Mail, MessageCircle, MessageSquare, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@estrelinha/core/formatters'
import {
  MATERIAL_KIND_LABELS, MATERIAL_STATUS_LABELS, queueAgeLabel, toMaterialStatus,
} from '@estrelinha/core/material'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'

import { useAdminCustomer, type CustomerOrderRow } from '@/entities/customer/api/useAdminCustomer'
import { lastPurchaseLabel } from '@/entities/customer/api/customerQuery'
import { rowQueueAge } from '@/entities/order/api/orderQuery'
import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import AnonymizeDialog from '@/features/customer-detail/ui/AnonymizeDialog'
import { RecordPageHeader } from '@/shared/ui'

/**
 * `/admin/clientes/:id` — a ficha da cliente (`CLI-08`..`CLI-13`).
 *
 * Substitui `CustomerDetailDialog`, pela mesma régua que tirou o pedido do modal: sobrevive ao F5 e
 * vira link. Funciona igual para cadastro e para convidada — o id da convidada é derivado do e-mail
 * pela view `customer_directory` e é estável.
 *
 * ---------------------------------------------------------------------------------------------
 * PRIVACIDADE É BLOCO DE TELA, NÃO ITEM DE MENU ESCONDIDO (D7)
 * ---------------------------------------------------------------------------------------------
 * O dado desta loja é sensível de um jeito que o de uma loja de acessório não é. O bloco
 * `PRIVACIDADE` diz isso em texto e oferece os dois caminhos que a LGPD pede: exportar tudo, e
 * anonimizar. Enterrá-los num menu de três pontinhos trataria um direito como uma ação avançada.
 */
/**
 * A segunda linha de cada pedido na ficha — `CLI-11`.
 *
 * **O pedido em aberto diz o que o segura, e em âmbar.** Os concluídos dizem quando saíram e por
 * qual código. É a diferença entre um histórico que se lê e um que se audita: quem abre a ficha de
 * alguém quer ver, de relance, se há algo pendente com aquela pessoa.
 */
const ordemSegurando = (o: CustomerOrderRow): { texto: string; alerta: boolean } => {
  const material = toMaterialStatus(o.material_status)
  const idade = rowQueueAge({
    created_at: o.created_at,
    material_received_at:
      (o as { material_received_at?: string | null }).material_received_at ?? null,
    material_status: o.material_status ?? 'nao_aplicavel',
  })

  if (o.status === 'cancelled') return { texto: 'Cancelado', alerta: false }

  if (o.status === 'delivered') {
    return {
      texto: o.tracking_code ? `Entregue · ${o.tracking_code}` : 'Entregue',
      alerta: false,
    }
  }

  if (material !== 'nao_aplicavel' && material !== 'em_producao') {
    const rotulo = MATERIAL_STATUS_LABELS[material]
    return {
      texto: idade?.tier === 'stale' ? `${rotulo} · ${queueAgeLabel(idade)}` : rotulo,
      alerta: idade?.tier === 'stale',
    }
  }

  if (o.status === 'shipped') {
    return o.tracking_code
      ? { texto: `Enviado · ${o.tracking_code}`, alerta: false }
      : // Enviado sem código é falha silenciosa: a cliente não recebeu o aviso de postagem.
        { texto: 'Enviado sem código — a cliente não foi avisada', alerta: true }
  }

  if (o.status === 'pending') {
    return {
      texto: o.payment_method === 'pix' ? 'Pix aguardando' : 'Pagamento pendente',
      alerta: false,
    }
  }

  return { texto: STATUS_LABELS[o.status] ?? o.status, alerta: false }
}

const AdminClientPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { customer, orders, addresses, notes, loading, error, addNote, anonymize } =
    useAdminCustomer(id)

  const [nota, setNota] = useState('')
  const [busy, setBusy] = useState(false)
  const [anonOpen, setAnonOpen] = useState(false)

  if (loading) return <div className="p-12 text-center text-muted-foreground">Carregando...</div>

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="p-12 text-center">
        <p className="text-muted-foreground">Esta cliente não existe (ou foi anonimizada).</p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/admin/clientes">Voltar para Clientes</Link>
        </Button>
      </div>
    )
  }

  /** `Nota` do cabeçalho leva ao campo de nota interna, e o foca. */
  const focarNota = () => {
    const campo = document.querySelector<HTMLInputElement>('[aria-label="Nova nota sobre a cliente"]')
    campo?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    campo?.focus({ preventScroll: true })
  }

  const copiar = (valor: string, oQue: string) => {
    navigator.clipboard.writeText(valor)
    toast.success(`${oQue} copiado`)
  }

  const enderecoTexto = (a: typeof addresses[number]) =>
    [
      `${a.street}, ${a.number}${a.complement ? ` — ${a.complement}` : ''}`,
      `${a.neighborhood} · ${a.city}/${a.state}`,
      `CEP ${a.cep}`,
    ].join('\n')

  const exportarTudo = () => {
    // `CLI-13` — "exportar tudo o que a loja tem da pessoa". É JSON e não CSV de propósito: o que se
    // entrega num pedido de acesso é o registro completo, com pedidos e endereços aninhados, e não
    // uma planilha achatada que perde a estrutura.
    const dump = { cliente: customer, pedidos: orders, enderecos: addresses, notas_internas: notes }
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `dados_${customer.email.replace(/[^a-z0-9]/gi, '_')}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const nome = customer.name?.trim() || '(sem nome)'

  return (
    <div>
      <RecordPageHeader
        group="Vendas"
        parentLabel="Clientes"
        crumb={nome}
        title={nome}
        badges={
          <>
            {customer.orders_paid >= 2 && (
              <span className="rounded-full border border-estrelinha-admin-violet/20 bg-estrelinha-admin-violet/10 px-2.5 py-0.5 text-[11px] font-semibold text-estrelinha-admin-violet">
                Voltou {customer.orders_paid} vezes
              </span>
            )}
            {customer.material_kinds.length > 0 && (
              <span className="rounded-full border border-estrelinha-admin-amber/20 bg-estrelinha-admin-amber/10 px-2.5 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber">
                Confiou{' '}
                {customer.material_kinds
                  .map(k => MATERIAL_KIND_LABELS[k as keyof typeof MATERIAL_KIND_LABELS] ?? k)
                  .join(' e ')}
              </span>
            )}
            {customer.same_email_count > 1 && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-semibold">
                {customer.same_email_count} cadastros com este e-mail
              </span>
            )}
          </>
        }
        subtitle={`${customer.has_account ? 'Conta' : 'Convidada'} desde ${
          customer.created_at ? new Date(customer.created_at).toLocaleDateString('pt-BR') : '—'
        }`}
        onBack={() => navigate('/admin/clientes')}
        actions={
          <>
            {customer.phone && (
              <Button
                variant="outline" size="sm" className="min-h-[44px] md:min-h-0"
                onClick={() => window.open(`https://wa.me/55${customer.phone!.replace(/\D/g, '')}`, '_blank')}
              >
                <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
              </Button>
            )}
            <Button
              variant="outline" size="sm" className="min-h-[44px] md:min-h-0"
              onClick={() => window.open(`mailto:${customer.email}`)}
            >
              <Mail className="mr-1 h-4 w-4" /> E-mail
            </Button>
            <Button
              variant="outline" size="sm" className="min-h-[44px] md:min-h-0"
              onClick={focarNota}
            >
              <MessageSquare className="mr-1 h-4 w-4" /> Nota
            </Button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-4">
          {/* `CLI-11` — a ficha liga aos pedidos, e cada linha abre a rota do pedido. */}
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">Pedidos · {orders.length}</h2>
              <span className="text-xs text-muted-foreground">
                Cancelados e não pagos não contam no gasto
              </span>
            </div>

            {orders.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Ainda não comprou nada.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {orders.map(o => {
                  const segura = ordemSegurando(o)
                  return (
                    <li key={o.id} className="flex items-center gap-3.5 py-3.5">
                      {/* Faixa 1 — número e dia, empilhados. Largura fixa para os números ficarem
                          numa coluna só: é por eles que se procura um pedido específico. */}
                      <span className="flex w-[74px] shrink-0 flex-col">
                        <Link
                          to={`/admin/pedidos/${o.id}`}
                          // 44px no celular: abrir o pedido é a ação da linha, e a densidade da
                          // prancha (16px) é de mouse.
                          className="inline-flex min-h-[44px] items-center text-xs font-semibold text-primary hover:underline md:min-h-0"
                        >
                          #{o.order_number}
                        </Link>
                        <span className="text-[11px] text-estrelinha-admin-text-secondary">
                          {new Date(o.created_at).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </span>
                      </span>

                      {/* Faixa 2 — O QUE ela levou, e o que aquele pedido está esperando. É a
                          pergunta que se faz olhando o histórico de alguém; selo de material solto
                          não responde "o que era a peça". */}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-xs">
                          {/* Leitura defensiva: o hook sempre preenche, mas uma ficha inteira em
                              branco por causa da forma de um campo é caro demais para economizar
                              um `?.` aqui. */}
                          {o.item_names?.length ? o.item_names.join(' + ') : '—'}
                        </span>
                        <span
                          className={cn(
                            'truncate text-[11px]',
                            segura.alerta
                              ? 'font-semibold text-estrelinha-admin-amber'
                              : 'text-estrelinha-admin-text-secondary',
                          )}
                        >
                          {segura.texto}
                        </span>
                      </span>

                      <span className="flex w-24 shrink-0 justify-center">
                        <StatusBadge status={o.status} />
                      </span>

                      <span className="w-[110px] shrink-0 text-right text-sm font-semibold">
                        {formatPrice(o.total)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* `CLI-10` — notas internas, e a tela DECLARA que a cliente nunca vê. */}
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="font-heading text-lg font-semibold">Notas sobre esta cliente</h2>
              <span className="text-xs text-muted-foreground">
                Só a Adri vê · nunca aparece na loja
              </span>
            </div>

            <div className="mb-4 flex gap-2">
              <Input
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Anotar algo que ajuda a atender melhor..."
                className="h-11"
                aria-label="Nova nota sobre a cliente"
              />
              <Button
                className="h-11"
                disabled={busy || nota.trim() === ''}
                onClick={async () => {
                  setBusy(true)
                  const erro = await addNote(nota.trim())
                  setBusy(false)
                  if (erro) {
                    toast.error(erro)
                    return
                  }
                  setNota('')
                }}
              >
                Anotar
              </Button>
            </div>

            {notes.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma nota ainda.</p>
            ) : (
              <ul className="space-y-3">
                {notes.map(n => (
                  <li key={n.id} className="border-l-2 border-border pl-3">
                    <p className="text-sm">{n.note}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(n.created_at).toLocaleString('pt-BR')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Resumo
            </h2>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Gastou</p>
                <p className="text-lg font-semibold">{formatPrice(customer.total_spent)}</p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] uppercase text-muted-foreground">Ticket</p>
                <p className="text-lg font-semibold">
                  {customer.avg_ticket !== null ? formatPrice(customer.avg_ticket) : '—'}
                </p>
              </div>
            </div>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Primeira compra</dt>
                <dd>{customer.first_order_at ? new Date(customer.first_order_at).toLocaleDateString('pt-BR') : '—'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Última compra</dt>
                <dd>{lastPurchaseLabel(customer).text}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Pedidos pagos</dt>
                <dd>{customer.orders_paid} de {customer.orders_total}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Contato e endereços
            </h2>
            <p className="text-sm">{customer.email}</p>
            {customer.phone && <p className="text-sm">{customer.phone}</p>}
            {customer.cpf && <p className="text-sm text-muted-foreground">CPF {customer.cpf}</p>}

            {/* `CLI-09` — `addresses` existe desde a migration inicial e o painel NUNCA a leu. */}
            {addresses.length === 0 ? (
              <p className="mt-3 text-xs text-muted-foreground">Sem endereço salvo.</p>
            ) : (
              addresses.map(a => (
                <div key={a.id} className="mt-3 border-t border-border pt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {a.label ?? 'Endereço'}
                      {a.is_default && ' · padrão'}
                    </h3>
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] items-center text-xs text-primary hover:underline md:min-h-0"
                      onClick={() => copiar(enderecoTexto(a), 'Endereço')}
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm">{enderecoTexto(a)}</p>
                </div>
              ))
            )}
          </section>

          <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5" /> Privacidade
            </h2>
            <p className="text-sm text-muted-foreground">
              Ela confiou nome, CPF, telefone, endereço
              {customer.material_kinds.length > 0 ? ' e um material de alguém que perdeu' : ''}. Se
              pedir, isto tem de sair daqui.
            </p>

            <Button variant="outline" className="mt-3 min-h-[44px] w-full" onClick={exportarTudo}>
              <Download className="mr-1 h-4 w-4" /> Exportar tudo o que temos dela
            </Button>

            <Button
              variant="outline"
              className="mt-2 min-h-[44px] w-full text-destructive"
              onClick={() => setAnonOpen(true)}
            >
              <ShieldAlert className="mr-1 h-4 w-4" /> Anonimizar cadastro
            </Button>

            <p className="mt-2 text-xs text-muted-foreground">
              Anonimizar apaga nome, e-mail, telefone, CPF e endereços — no cadastro e nos pedidos.
              Os pedidos ficam, sem dono, porque são registro fiscal.
            </p>
          </section>
        </aside>
      </div>

      <AnonymizeDialog
        open={anonOpen}
        onOpenChange={setAnonOpen}
        customerName={nome}
        ordersCount={orders.length}
        onConfirm={async () => {
          const r = await anonymize()
          if (!r.ok) {
            toast.error(`Não foi possível anonimizar (${r.reason ?? 'erro'})`)
            return
          }
          toast.success(`Cadastro anonimizado · ${r.ordersPreserved} pedido(s) preservados sem dono`)
          navigate('/admin/clientes')
        }}
      />
    </div>
  )
}

export default AdminClientPage
