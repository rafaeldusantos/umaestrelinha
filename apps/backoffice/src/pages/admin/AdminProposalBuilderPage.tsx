// A montagem de um pedido pelo painel (feature 89, `MON-01`, `MON-11`, `MON-12`, `PRC-02`, `DUP-01`).
//
// Três rotas, uma tela:
//   - `/admin/pedidos/montar`              montar do zero;
//   - `/admin/pedidos/montar/:id`          editar uma proposta aberta (mesmo link, a versão sobe);
//   - `/admin/pedidos/montar?duplicar=<id>` duplicar (as peças e o desconto; a cliente se escolhe).
//
// A tela não conta dinheiro: o resumo é `priceDraft` (sobre `priceProposalDraft`, de `core`) e quem
// grava é a function `order-proposals`, que relê tudo do banco. Se o total que ela calcular diferir do
// que a tela mostrava, ela recusa com `prices_changed` e a frase do servidor (`PRC-02`) — e a tela
// relê as peças e as promoções, para o resumo passar a mostrar o que vale hoje. Nada é gravado com um
// valor que a Adri não viu.

import { useEffect, useMemo, useRef, useState } from 'react'
import { PROPOSAL_LINK_DAYS } from '@estrelinha/core/proposals'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ACTIVE_PROMOTIONS_KEY } from '@estrelinha/core/hooks/usePromotions'
import { proposalActions } from '@estrelinha/core/proposals'
import { ActionButton, InfoBanner, RecordPageHeader } from '@/shared/ui'
import { PRODUCT_VARIANTS_KEY } from '@/entities/product'
import {
  LINK_WITHOUT_STORE,
  AddressSection,
  NOT_EDITABLE,
  PROPOSAL_PAGE_PATH,
  PROPOSALS_LIST_PATH,
  VERSION_CONFLICT_TEXT,
  CouponField,
  CustomerSection,
  DiscountsSection,
  ItemsSection,
  ManualDiscountField,
  ProposalError,
  ProposalNoteField,
  SAVE_FAILED,
  ProposalSummary,
  ShippingPreview,
  draftFromProposal,
  montarLink,
  type LinkDaProposta,
  proposalKey,
  useProposal,
  useProposalDraft,
  useProposalMutations,
} from '@/features/order-proposal'

const AdminProposalBuilderPage = () => {
  const { id } = useParams<{ id: string }>()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const duplicarDe = id ? null : params.get('duplicar')
  const origem = id ?? duplicarDe ?? null
  const modo: 'criar' | 'editar' | 'duplicar' = id ? 'editar' : duplicarDe ? 'duplicar' : 'criar'

  const { data: lida, isLoading: lendo, error: erroDeLeitura, refetch } = useProposal(origem)
  const montagem = useProposalDraft()
  const { draft, pricing, refusal, reset } = montagem
  const { save } = useProposalMutations()
  const [falha, setFalha] = useState<string | null>(null)
  const [cupomAntigo, setCupomAntigo] = useState<string | null>(null)

  // O rascunho nasce da proposta UMA vez por versão lida (editar/duplicar). Depois disso é da Adri.
  const versaoCarregada = useRef<string | null>(null)
  useEffect(() => {
    if (!lida?.proposal || modo === 'criar') return
    const marca = `${lida.proposal.id}:${lida.proposal.version}`
    if (versaoCarregada.current === marca) return
    versaoCarregada.current = marca
    reset(draftFromProposal(lida.proposal, modo === 'editar' ? 'editar' : 'duplicar'))
    // O cupom volta só como CÓDIGO: a regra pode ter mudado, e é o servidor quem reconfere.
    setCupomAntigo(lida.proposal.coupon_code ?? null)
  }, [lida, modo, reset])

  // O preço travado de cada linha pronta, pela `key` — a linha mostra o total e o selo da promoção
  // sem fazer conta própria (o número é o de `priceProposalDraft`).
  const precos = useMemo(() => {
    const mapa: Record<string, { unitario: number; cheio: number }> = {}
    for (const l of pricing.price.lockedLines) mapa[l.line.key] = { unitario: l.unit_price, cheio: l.line.list_price }
    return mapa
  }, [pricing])
  const pecas = draft.lines.reduce((n, l) => n + l.quantity, 0)

  const editavel = modo !== 'editar' || !lida || proposalActions(lida.state).edit
  const versao = lida?.proposal?.version

  const reler = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: PRODUCT_VARIANTS_KEY }),
      qc.invalidateQueries({ queryKey: ACTIVE_PROMOTIONS_KEY }),
    ])
  }

  const gravar = async () => {
    if (refusal || save.isPending) return
    setFalha(null)
    try {
      const corpo = modo === 'editar' && id ? montagem.payload({ id, version: versao }) : montagem.payload()
      // `MON-04`: "Salvar no cadastro" vai no próprio `save` (`save_address`), e a RPC grava o
      // endereço na ficha na mesma transação. Uma gravação só: ou as duas coisas, ou nenhuma.
      const r = await save.mutateAsync(corpo)
      let aviso: string | null = null
      let link: LinkDaProposta | null = null
      if (r.token && r.expires_at) {
        const montado = montarLink(r.token)
        // Sem a loja configurada no painel o link não se monta, e a página da proposta tem de dizer por
        // quê — senão "gere um link novo" parece defeito. Montado, ele vai à página pela navegação:
        // com a cifra o `get` o devolve de novo; sem ela, é o único caminho até a tela.
        if (montado) link = { link: montado, expiresAt: r.expires_at }
        else aviso = LINK_WITHOUT_STORE
      }
      navigate(PROPOSAL_PAGE_PATH(r.id), { state: aviso || link ? { ...(aviso ? { aviso } : {}), ...(link ? { link } : {}) } : undefined })
    } catch (e) {
      const erro = e as ProposalError
      // a falha sem motivo próprio do servidor (a gravação que não aconteceu) diz que nada saiu.
      setFalha(erro?.code && erro.code !== 'save_failed' ? erro.message || SAVE_FAILED : SAVE_FAILED)
      if (erro?.code === 'prices_changed') await reler()
      if (erro?.code === 'version_conflict' && id) {
        // "Recarreguei": a versão relida é outra, então o efeito de carga remonta o rascunho dela.
        setFalha(VERSION_CONFLICT_TEXT)
        // A consulta está montada: invalidar já a relê (um `refetch` a mais seria a mesma leitura duas vezes).
        await qc.invalidateQueries({ queryKey: proposalKey(id) })
      }
    }
  }

  const titulo = modo === 'editar' ? `Editar ${lida?.proposal?.number ?? 'proposta'}` : 'Montar pedido'
  const botao = modo === 'editar' ? 'Salvar alterações' : 'Criar link do pedido'
  const voltar = () => navigate(modo === 'editar' && id ? PROPOSAL_PAGE_PATH(id) : PROPOSALS_LIST_PATH)

  if (origem && lendo) {
    return (
      <div role="status" aria-busy="true" className="p-6 text-sm text-muted-foreground">
        Lendo a proposta…
      </div>
    )
  }
  if (origem && erroDeLeitura && !lida) {
    return (
      <div className="space-y-3 p-6">
        <p role="alert" className="text-sm text-destructive">
          {(erroDeLeitura as Error).message || 'Não consegui ler a proposta.'}
        </p>
        <ActionButton variant="outline" alvo44 pendingLabel="Lendo…" onClick={() => refetch()}>
          Tentar de novo
        </ActionButton>
      </div>
    )
  }

  if (!editavel) {
    return (
      <div>
        <RecordPageHeader group="Vendas" parentLabel="Pedidos" crumb={titulo} title={titulo} onBack={voltar} />
        <InfoBanner action={id ? <Link className="min-h-11 inline-flex items-center text-sm font-medium text-primary underline" to={PROPOSAL_PAGE_PATH(id)}>Ver a proposta</Link> : null}>
          {NOT_EDITABLE}
        </InfoBanner>
      </div>
    )
  }

  const idDoMotivo = 'proposta-motivo'
  return (
    <div>
      <RecordPageHeader
        group="Vendas"
        parentLabel="Pedidos"
        crumb={titulo}
        title={modo === 'editar' ? `Editar pedido montado ${lida?.proposal?.number ?? ''}`.trim() : titulo}
        subtitle={
          modo === 'editar'
            ? 'O link continua o mesmo. Se a cliente estiver com a página aberta, ela vê a versão nova antes de concluir.'
            : modo === 'duplicar' && lida?.proposal
              ? `A partir de ${lida.proposal.number} · os preços são os de hoje`
              : 'Monte a sacola para a cliente. Ela recebe um link para conferir, escolher a entrega e pagar.'
        }
        onBack={voltar}
      />

      {falha && (
        <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {falha}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          <CustomerSection customer={draft.customer} onChange={montagem.setCustomer} />
          <AddressSection address={draft.address} customer={draft.customer} onChange={montagem.setAddress} />
          <ItemsSection
            lines={draft.lines}
            precos={precos}
            onAdd={montagem.addLine}
            onUpdate={montagem.updateLine}
            onRemove={montagem.removeLine}
          />
          {cupomAntigo && !draft.coupon && (
            <InfoBanner>{`O cupom ${cupomAntigo} estava aplicado. Aplique de novo para conferir se ele ainda vale.`}</InfoBanner>
          )}
          <DiscountsSection
            cupom={
              <CouponField
                coupon={draft.coupon}
                subtotal={pricing.price.subtotal + pricing.price.promotionDiscount}
                email={draft.customer.email}
                descartado={!!draft.coupon && !pricing.price.couponApplied}
                onApply={(c) => {
                  montagem.setCoupon(c)
                  setCupomAntigo(null)
                }}
                onRemove={() => montagem.setCoupon(null)}
              />
            }
            combinado={<ManualDiscountField manual={draft.manual} onChange={montagem.setManual} />}
          />
          <ProposalNoteField value={draft.adminNote} onChange={montagem.setAdminNote} />
        </div>

        <ProposalSummary
          pricing={pricing}
          pieces={pecas}
          couponCode={draft.coupon?.code ?? null}
          manualReason={draft.manual?.reason ?? null}
        >
          <ShippingPreview zip={draft.address.zip} lines={draft.lines} freeShipping={pricing.price.couponFreeShipping} />
          <div className="space-y-2 pt-1">
            <ActionButton
              className="h-12 w-full text-[15px]"
              alvo44
              pending={save.isPending}
              pendingLabel={modo === 'editar' ? 'Salvando…' : 'Criando o link…'}
              disabled={!!refusal}
              aria-describedby={refusal ? idDoMotivo : undefined}
              onClick={gravar}
            >
              {botao}
            </ActionButton>
            {refusal ? (
              <p id={idDoMotivo} data-testid="motivo-criar-link" className="text-center text-xs text-muted-foreground">
                {refusal}
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">Os preços ficam travados por {PROPOSAL_LINK_DAYS} dias.</p>
            )}
          </div>
        </ProposalSummary>
      </div>
    </div>
  )
}

export default AdminProposalBuilderPage
