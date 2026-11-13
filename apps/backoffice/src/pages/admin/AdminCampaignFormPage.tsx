// `/admin/campanhas/nova` e `/admin/campanhas/:id` — o cadastro da campanha de desconto.
//
// À esquerda Identificação, Vigência, Percentuais, Cores do selo e o interruptor; à direita a prévia
// do cartão de 173 px, que acompanha a rolagem no computador. Abaixo de 1024 px, uma coluna. A barra
// de salvar mora no pé.
//
// Toda recusa é de `@estrelinha/core/campaigns`, distribuída pelos campos por `checkDraft`; o Salvar
// fica desligado enquanto alguma vale. O banco tem a segunda linha de cada regra, e o erro dele volta
// na mesma frase (`saveCampaign`).

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@estrelinha/ui/alert-dialog'
import {
  CAMPAIGN_BADGE_MAX,
  CAMPAIGN_NAME_MAX,
  campaignDeleteRefusal,
  campaignPeriodLabel,
  campaignStatus,
  campaignStatusLine,
  highestPercent,
  type CampaignIdentity,
} from '@estrelinha/core/campaigns'
import { CharCounter, DateField, FieldGroup, FormCard, RecordPageHeader, SWITCH_TAP_44, ToggleField } from '@/shared/ui'
import {
  CampaignBadgeInline,
  CampaignCardPreview,
  CampaignStatusPill,
  campaignProductsHref,
  deleteCampaign,
  endCampaignNow,
  invalidateCampaigns,
  saveCampaign,
  useCampaignOrderCount,
  useCampaigns,
} from '@/entities/campaign'
import {
  ColorsCard,
  PercentsCard,
  checkDraft,
  draftFromCampaign,
  draftToInput,
  emptyCampaignDraft,
  nextBadgeText,
  type CampaignDraft,
} from '@/features/campaign-form'

const LIST = '/admin/campanhas'

const pecasMarcadas = (n: number): string =>
  n === 0 ? 'nenhuma peça marcada' : n === 1 ? '1 peça marcada' : `${n} peças marcadas`

const AdminCampaignFormPage = () => {
  const { id = null } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { campaigns, loading, error } = useCampaigns()
  const { orders } = useCampaignOrderCount(id)

  const editing = id ? campaigns.find(c => c.id === id) ?? null : null
  const notFound = Boolean(id) && !loading && !error && editing === null

  const [draft, setDraft] = useState<CampaignDraft>(() => emptyCampaignDraft())
  const [inicial, setInicial] = useState<CampaignDraft | null>(id ? null : draft)
  const [nomeTocado, setNomeTocado] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erroAoSalvar, setErroAoSalvar] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<'encerrar' | 'apagar' | null>(null)

  // A campanha chega da lista: o rascunho nasce dela uma vez.
  useEffect(() => {
    if (!editing || inicial) return
    const vindo = draftFromCampaign(editing)
    setDraft(vindo)
    setInicial(vindo)
  }, [editing, inicial])

  const outras: CampaignIdentity[] = useMemo(
    () => campaigns.filter(c => c.id !== id).map(c => ({ id: c.id, name: c.name, starts_at: c.starts_at, ends_at: c.ends_at, active: c.active })),
    [campaigns, id],
  )
  const check = checkDraft(draft, id, outras)
  const agora = Date.now()
  const status = editing ? campaignStatus(editing, agora) : null

  const mudar = (parte: Partial<CampaignDraft>) => {
    setErroAoSalvar(null)
    setDraft(d => ({ ...d, ...parte }))
  }

  const salvar = async () => {
    if (!check.canSave || saving) return
    setSaving(true)
    setErroAoSalvar(null)
    try {
      await saveCampaign(draftToInput(draft, id, check), {
        others: outras,
        usage: editing?.usage ?? {},
        savedPercents: editing?.percents ?? [],
      })
      await invalidateCampaigns(queryClient)
      toast({ title: editing ? 'Campanha atualizada.' : 'Campanha criada.' })
      navigate(LIST)
    } catch (e) {
      setErroAoSalvar((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const encerrar = async () => {
    if (!editing) return
    try {
      await endCampaignNow(editing.id)
      await invalidateCampaigns(queryClient)
      toast({ title: 'Campanha encerrada.' })
      navigate(LIST)
    } catch (e) {
      toast({ title: 'Erro ao encerrar a campanha', description: (e as Error).message, variant: 'destructive' })
    }
  }

  const apagar = async () => {
    if (!editing) return
    try {
      await deleteCampaign(editing.id, orders ?? 0)
      await invalidateCampaigns(queryClient)
      toast({ title: 'Campanha apagada.' })
      navigate(LIST)
    } catch (e) {
      toast({ title: 'Erro ao apagar a campanha', description: (e as Error).message, variant: 'destructive' })
    }
  }

  if (id && loading) {
    return <div className="p-12 text-center text-muted-foreground">Carregando…</div>
  }

  if (id && error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        Não foi possível carregar a campanha. {error}
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="p-12 text-center">
        <p className="font-heading text-lg font-bold text-foreground">Campanha não encontrada</p>
        <p className="mt-1 text-sm text-muted-foreground">Ela pode ter sido apagada em outra aba.</p>
        <Button asChild className="mt-4 min-h-11 rounded-xl" variant="outline">
          <Link to={LIST}>Voltar para Campanhas</Link>
        </Button>
      </div>
    )
  }

  const recusaDeApagar = campaignDeleteRefusal(orders ?? 0)
  const seloAcima = draft.badgeText.trim().length > CAMPAIGN_BADGE_MAX

  return (
    <div className="min-w-0 pb-28">
      <RecordPageHeader
        group="Descontos"
        parentLabel="Campanhas"
        crumb={editing ? editing.name : 'Nova campanha'}
        title={editing ? editing.name : 'Nova campanha'}
        badges={status && <CampaignStatusPill status={status} />}
        subtitle={editing ? `${campaignPeriodLabel(editing)} · ${pecasMarcadas(editing.productCount)}` : undefined}
        onBack={() => navigate(LIST)}
        actions={
          editing && (
            <>
              <Button asChild variant="outline" className="min-h-11">
                <Link to={campaignProductsHref(editing.id)}>Ver as peças</Link>
              </Button>
              {status === 'em-vigencia' && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 border-destructive/40 text-destructive"
                  onClick={() => setConfirmar('encerrar')}
                >
                  Encerrar agora
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,300px)]">
        <div className="min-w-0 space-y-6">
          <FormCard title="Identificação">
            <FieldGroup
              label="Nome"
              htmlFor="campanha-nome"
              hint="Aparece no título da vitrine (/ofertas) e no bloco de ofertas da Home."
              counter={<CharCounter value={draft.name} limit={CAMPAIGN_NAME_MAX} espacado />}
            >
              <Input
                id="campanha-nome"
                value={draft.name}
                maxLength={CAMPAIGN_NAME_MAX}
                onChange={e => {
                  const nome = e.target.value
                  setNomeTocado(true)
                  mudar({ name: nome, badgeText: nextBadgeText(draft.name, nome, draft.badgeText) })
                }}
                className="h-11"
              />
            </FieldGroup>
            {nomeTocado && check.name && <p role="alert" className="text-sm text-destructive">{check.name}</p>}

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="campanha-selo" className="text-sm font-medium text-foreground">Texto do selo</label>
                <span data-testid="contador-do-selo" className={seloAcima ? '[&>span]:text-destructive' : undefined}>
                  <CharCounter value={draft.badgeText} limit={CAMPAIGN_BADGE_MAX} espacado count={draft.badgeText.trim().length} />
                </span>
              </div>
              <Input
                id="campanha-selo"
                value={draft.badgeText}
                aria-invalid={seloAcima || undefined}
                onChange={e => mudar({ badgeText: e.target.value })}
                className="h-11 uppercase"
              />
              {seloAcima ? (
                <p role="alert" className="text-sm text-destructive">{check.badge}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Sai em maiúsculas na faixa do cartão, ao lado do percentual. Veja a prévia ao lado.
                </p>
              )}
            </div>
          </FormCard>

          <FormCard title="Vigência">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,9rem)]">
              <DateField
                label="Começa em"
                value={draft.startDate}
                onChange={v => mudar({ startDate: v })}
                placeholder="Escolha o dia"
                triggerClassName="h-11"
                clearClassName="h-11 w-11 shrink-0"
              />
              <FieldGroup label="Hora do início" htmlFor="campanha-hora-inicio">
                <Input
                  id="campanha-hora-inicio"
                  type="time"
                  value={draft.startTime}
                  onChange={e => mudar({ startTime: e.target.value })}
                  className="h-11"
                />
              </FieldGroup>
              <DateField
                label="Termina em"
                value={draft.endDate}
                onChange={v => mudar({ endDate: v })}
                placeholder="Escolha o dia"
                triggerClassName="h-11"
                clearClassName="h-11 w-11 shrink-0"
              />
              <FieldGroup label="Hora do fim" htmlFor="campanha-hora-fim">
                <Input
                  id="campanha-hora-fim"
                  type="time"
                  value={draft.endTime}
                  onChange={e => mudar({ endTime: e.target.value })}
                  className="h-11"
                />
              </FieldGroup>
            </div>
            <p className="text-xs text-muted-foreground">
              Horário de Brasília. Fora desse intervalo nenhum desconto da campanha vale, mesmo com as peças marcadas.
            </p>
            {(check.window || check.overlap) && (
              <p role="alert" className="text-sm text-destructive">{check.window ?? check.overlap}</p>
            )}
          </FormCard>

          <PercentsCard
            percents={draft.percents}
            onChange={percents => mudar({ percents })}
            usage={editing?.usage ?? {}}
            campaignId={editing?.id ?? null}
            listRefusal={check.percents}
          />

          <ColorsCard
            band={draft.band}
            accent={draft.accent}
            onChange={cores => mudar(cores)}
            refusal={check.colors}
            approval={check.colorsOk}
          />

          <FormCard>
            <ToggleField
              label="Campanha ligada"
              description="Desligada, a campanha não vale na loja mesmo dentro da vigência. As marcações das peças ficam guardadas."
              checked={draft.active}
              onChange={active => mudar({ active })}
              switchClassName={SWITCH_TAP_44}
            />
          </FormCard>

          {editing && (
            <FormCard title="Apagar a campanha">
              {recusaDeApagar ? (
                <p className="text-sm text-muted-foreground">{recusaDeApagar}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum pedido usou esta campanha. Apagada, ela sai com as marcações das peças.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                className="min-h-11 text-destructive"
                disabled={orders === null || !!recusaDeApagar}
                onClick={() => setConfirmar('apagar')}
              >
                Apagar campanha
              </Button>
            </FormCard>
          )}
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-6" aria-label="Prévia do selo">
          <FormCard title="Prévia">
            <CampaignCardPreview
              text={draft.badgeText}
              band={draft.band}
              accent={draft.accent}
              percent={highestPercent(draft.percents)}
            />
            <p className="text-xs text-muted-foreground">Cartão do celular (173 px). Na página da peça e na sacola:</p>
            <CampaignBadgeInline
              text={draft.badgeText}
              band={draft.band}
              accent={draft.accent}
              percent={highestPercent(draft.percents) ?? 10}
            />
            {editing && (
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Estado: {campaignStatusLine(editing, agora)}</p>
                <p>Vitrine: /ofertas</p>
              </div>
            )}
          </FormCard>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 -mx-4 mt-6 border-t border-border bg-background/95 px-4 py-3">
        {erroAoSalvar && (
          <p role="alert" className="mb-2 text-sm text-destructive">{erroAoSalvar}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p data-testid="estado-do-salvar" className="text-sm text-muted-foreground">
            {check.canSave ? 'Pronta para salvar.' : 'Corrija o que está marcado para salvar.'}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(LIST)} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="min-h-11 gradient-cta border-0 text-primary-foreground"
              disabled={!check.canSave || saving}
              onClick={() => void salvar()}
            >
              {saving ? 'Salvando…' : 'Salvar campanha'}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmar !== null} onOpenChange={aberto => !aberto && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar === 'encerrar' ? 'Encerrar a campanha agora?' : 'Apagar a campanha?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar === 'encerrar'
                ? 'O fim passa a ser agora, e o desconto sai da loja na próxima página que a cliente abrir. As marcações das peças ficam guardadas.'
                : 'A campanha sai do painel junto com as marcações das peças. Não dá para desfazer.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11"
              onClick={() => {
                const acao = confirmar
                setConfirmar(null)
                void (acao === 'encerrar' ? encerrar() : apagar())
              }}
            >
              {confirmar === 'encerrar' ? 'Encerrar agora' : 'Apagar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminCampaignFormPage
