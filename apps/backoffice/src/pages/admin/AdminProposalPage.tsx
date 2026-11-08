// A página de uma proposta (feature 89, `LNK-01`..`LNK-03`, `LNK-05`, `LNK-06`, `HIS-01`, `DUP-01`).
//
// O que ela pode fazer depende do ESTADO, e quem decide é `proposalActions` (`core`): aberta edita e
// cancela; expirada só renova o prazo; concluída leva ao pedido; duplicar vale em qualquer estado.
// Nenhuma regra de estado é escrita aqui.
//
// O link vem do `get`: a function devolve o token da proposta aberta, e o cartão o mostra
// sempre — também ao reabrir. A proposta gravada sem a cifra do token (antes da chave, ou sem ela) não
// tem o link: o cartão oferece "Gerar link novo". Nada é guardado no navegador.
//
// Renovar gera link novo e mata o antigo NA HORA — a confirmação diz isso.
// Se os preços mudaram desde a montagem, a function recusa com `prices_changed` e o total relido; a
// Adri vê o número novo e confirma, e só então o link é renovado com os preços de hoje (`LNK-06`).
//
// **O foco depois de renovar ou cancelar** (QA da 89, `BUG-20261031-foco-cai-no-body-ao-renovar-ou-
// cancelar-proposta`): o botão fica desabilitado enquanto grava, e o navegador solta o foco no
// `<body>`. Renovar leva o foco ao link novo (é o que a Adri vai copiar); cancelar, ao título (os
// botões de ação somem); a falha devolve ao botão. O resultado é dito na região viva da página.

import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { PROPOSAL_STATE_LABELS, proposalActions, proposalRenewText } from '@estrelinha/core/proposals'
import { ActionButton, InfoBanner, OrderPageSkeleton, RecordPageHeader } from '@/shared/ui'
import { OrderAdminNoteCard } from '@/features/order-admin-note'
import { devolverFoco, tituloDaPagina } from '@/shared/lib/foco'
import {
  CANCELLED_ANNOUNCE,
  CANCEL_CONFIRM,
  PROPOSAL_DUPLICATE_PATH,
  PROPOSAL_EDIT_PATH,
  PROPOSALS_LIST_PATH,
  ProposalError,
  ProposalHistory,
  ProposalLinkCard,
  ProposalNoteCard,
  RENEWED_ANNOUNCE,
  RENEW_WARNING,
  formatDateTime,
  montarLink,
  useProposal,
  useProposalMutations,
  type LinkDaProposta,
} from '@/features/order-proposal'

const LINK_DE_ACAO =
  'inline-flex min-h-11 items-center rounded-md border border-input px-4 text-sm font-medium text-foreground hover:bg-muted'

const AdminProposalPage = () => {
  const { id = '' } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const daMontagem = location.state as { aviso?: string; link?: LinkDaProposta } | null
  const avisoDaMontagem = daMontagem?.aviso ?? null
  const { data, isLoading, error, refetch } = useProposal(id)
  const { renew, cancel, logSent, note } = useProposalMutations()
  // O link que acabou de nascer nesta tela (renovar) ou na montagem (criar), para a proposta gravada
  // sem a cifra: o `get` não o devolve, e ele vive só enquanto a página está aberta.
  const [linkNovo, setLinkNovo] = useState<LinkDaProposta | null>(() => daMontagem?.link ?? null)
  const [falha, setFalha] = useState<string | null>(null)
  const [novoTotal, setNovoTotal] = useState<number | null>(null)
  const [anuncio, setAnuncio] = useState('')
  /** Para onde o foco vai depois do próximo render: o link novo, o título ou o botão de origem. */
  const [focoDepois, setFocoDepois] = useState<{ alvo: 'link' | 'titulo' | 'origem'; origem: Element | null } | null>(null)
  useEffect(() => {
    if (!focoDepois) return
    const { alvo, origem } = focoDepois
    const link = () => document.querySelector('[data-testid="link-da-proposta"]')
    if (alvo === 'link') devolverFoco(link(), tituloDaPagina)
    else if (alvo === 'titulo') devolverFoco(tituloDaPagina())
    else devolverFoco(origem, tituloDaPagina)
    setFocoDepois(null)
  }, [focoDepois])

  const voltar = () => navigate(PROPOSALS_LIST_PATH)

  if (isLoading) return <OrderPageSkeleton />
  if (error || !data?.proposal) {
    return (
      <div className="space-y-3 p-6">
        <p role="alert" className="text-sm text-destructive">
          {(error as Error | null)?.message || 'Não consegui ler a proposta.'}
        </p>
        <ActionButton variant="outline" alvo44 pendingLabel="Lendo…" onClick={() => refetch()}>
          Tentar de novo
        </ActionButton>
      </div>
    )
  }

  const p = data.proposal
  const estado = data.state
  const aberta = estado === 'open' || estado === 'viewed'
  // O link do `get` (o token decifrado pela function), montado com a origem da loja.
  const linkDoServidor = data.token ? montarLink(data.token) : null
  const linkVivo: LinkDaProposta | null = !aberta
    ? null
    : linkNovo ?? (linkDoServidor ? { link: linkDoServidor, expiresAt: p.expires_at } : null)
  const acoes = proposalActions(estado, { linkAvailable: !!data.token || !!linkNovo })

  const renovar = async (expectedTotal?: number) => {
    const origem = document.activeElement
    const confirmacao =
      estado === 'expired' ? proposalRenewText({ name: p.customer_name, expiresAt: p.expires_at, now: new Date() }) : RENEW_WARNING
    if (expectedTotal === undefined && !window.confirm(confirmacao)) return
    setFalha(null)
    setAnuncio('')
    try {
      const r = await renew.mutateAsync({ id: p.id, expectedTotal: expectedTotal ?? null })
      setNovoTotal(null)
      const montado = montarLink(r.token)
      if (montado) {
        setLinkNovo({ link: montado, expiresAt: r.expires_at })
        setAnuncio(RENEWED_ANNOUNCE)
        setFocoDepois({ alvo: 'link', origem })
      } else {
        setFalha('O link foi renovado, mas a loja não está configurada neste painel para montá-lo.')
      }
    } catch (e) {
      const erro = e as ProposalError
      setFalha(erro?.message || 'Não consegui renovar o link.')
      if (erro?.code === 'prices_changed' && erro.summary) setNovoTotal(erro.summary.items_total)
      setFocoDepois({ alvo: 'origem', origem })
    }
  }

  const cancelar = async () => {
    const origem = document.activeElement
    if (!window.confirm(CANCEL_CONFIRM)) return
    setFalha(null)
    setAnuncio('')
    try {
      await cancel.mutateAsync(p.id)
      setLinkNovo(null)
      setAnuncio(CANCELLED_ANNOUNCE)
      setFocoDepois({ alvo: 'titulo', origem })
    } catch (e) {
      setFalha((e as Error)?.message || 'Não consegui cancelar a proposta.')
      setFocoDepois({ alvo: 'origem', origem })
    }
  }

  return (
    <div>
      <RecordPageHeader
        group="Vendas"
        parentLabel="Pedidos"
        crumb={p.number}
        title={`Pedido montado ${p.number}`}
        badges={
          <span data-testid="estado-da-proposta" className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {PROPOSAL_STATE_LABELS[estado]}
          </span>
        }
        subtitle={`${p.customer_name} · ${p.customer_email} · criada em ${formatDateTime(p.created_at)}`}
        onBack={voltar}
        actions={
          <>
            {acoes.edit && (
              <Link className={LINK_DE_ACAO} to={PROPOSAL_EDIT_PATH(p.id)}>
                Editar
              </Link>
            )}
            {acoes.duplicate && (
              <Link className={LINK_DE_ACAO} to={PROPOSAL_DUPLICATE_PATH(p.id)}>
                Duplicar
              </Link>
            )}
            {acoes.viewOrder && p.order_id && (
              <Link className={LINK_DE_ACAO} to={`/admin/pedidos/${p.order_id}`}>
                Ver o pedido{p.order_number ? ` ${formatOrderNumber(p.order_number)}` : ''}
              </Link>
            )}
          </>
        }
      />

      <p data-testid="anuncio-da-proposta" aria-live="polite" className="sr-only">
        {anuncio}
      </p>

      {avisoDaMontagem && <InfoBanner className="mb-4">{avisoDaMontagem}</InfoBanner>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <ProposalLinkCard
            estado={aberta ? 'aberta' : estado === 'expired' ? 'expirada' : 'encerrada'}
            link={linkVivo}
            semLoja={aberta && !!data.token && !linkDoServidor && !linkNovo}
            expiresAt={p.expires_at}
            customerName={p.customer_name}
            customerPhone={p.customer_phone}
            renewLabel={acoes.renew ? acoes.renewLabel : null}
            gerando={renew.isPending}
            onGerar={() => renovar()}
            onEnviado={(canal) => logSent.mutateAsync({ id: p.id, channel: canal })}
          />

          {acoes.cancel && (
            <section aria-label="Ações da proposta" className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {acoes.cancel && (
                  <ActionButton
                    variant="outline"
                    alvo44
                    className="border-destructive/40 text-destructive"
                    pending={cancel.isPending}
                    pendingLabel="Cancelando…"
                    onClick={cancelar}
                  >
                    Cancelar proposta
                  </ActionButton>
                )}
              </div>
            </section>
          )}

          {falha && (
            <div className="space-y-2">
              <p role="alert" className="text-sm text-destructive">
                {falha}
              </p>
              {novoTotal !== null && (
                <ActionButton alvo44 pending={renew.isPending} pendingLabel="Renovando…" onClick={() => renovar(novoTotal)}>
                  Renovar com o total de {formatPrice(novoTotal)}
                </ActionButton>
              )}
            </div>
          )}

          <section aria-label="Peças" className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Peças</h2>
            <ul className="space-y-2">
              {p.items.map((i) => (
                <li key={`${i.position}-${i.product_id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                  <span className="min-w-0 break-words text-foreground">
                    {i.quantity}× {i.product_name}
                    {i.variant_label ? ` · ${i.variant_label}` : ''}
                    {i.engraving_text ? ` · gravação “${i.engraving_text}”` : ''}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPrice(i.unit_price * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* A observação: na proposta concluída a dona é a do PEDIDO — o mesmo card da página
              do pedido, com o `order_id`; antes disso, a da proposta, editável em qualquer status. */}
          {p.order_id ? (
            <OrderAdminNoteCard orderId={p.order_id} />
          ) : (
            <ProposalNoteCard note={p.admin_note ?? null} onSave={(adminNote) => note.mutateAsync({ id: p.id, adminNote })} />
          )}
        </div>

        <aside className="min-w-0 space-y-6">
          <section aria-label="Resumo" className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Resumo</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd>{formatPrice(p.subtotal)}</dd></div>
              {p.coupon_discount > 0 && (
                <div className="flex justify-between"><dt className="text-muted-foreground">Cupom {p.coupon_code}</dt><dd>− {formatPrice(p.coupon_discount)}</dd></div>
              )}
              {p.manual_discount > 0 && (
                <div className="flex flex-wrap justify-between gap-x-3"><dt className="text-muted-foreground">Desconto combinado{p.manual_discount_reason ? ` — ${p.manual_discount_reason}` : ''}</dt><dd className="shrink-0">− {formatPrice(p.manual_discount)}</dd></div>
              )}
              <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Total das peças</dt><dd>{formatPrice(p.items_total)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">A cliente escolhe a entrega no link.</p>
          </section>
          <ProposalHistory events={p.events ?? []} />
        </aside>
      </div>
    </div>
  )
}

export default AdminProposalPage
