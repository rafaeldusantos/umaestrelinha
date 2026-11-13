// `/admin/campanhas` — as campanhas de desconto: tabela no computador, cartões no celular.
//
// Cada linha mostra o selo (texto, cores e o maior percentual), o nome, a vigência, os percentuais,
// quantas peças estão marcadas e o estado. A linha abre a edição. O estado é de `core`
// (`campaignStatus`), calculado com o relógio desta tela.

import { Link } from 'react-router-dom'
import { ChevronRight, Plus, Tag } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { campaignPeriodLabel, campaignPiecesLabel, campaignStatus, highestPercent } from '@estrelinha/core/campaigns'
import { EmptyState, PageHeader, TableSkeleton } from '@/shared/ui'
import { CampaignBadgeInline, CampaignStatusPill, useCampaigns, type AdminCampaign } from '@/entities/campaign'

const NOVA = '/admin/campanhas/nova'
const editar = (c: AdminCampaign) => `/admin/campanhas/${c.id}`

const NOTA =
  'A campanha vale na loja só quando está ligada e dentro da vigência (horário de Brasília). Encerrada, ela fica aqui com as marcações das peças, sem efeito.'

const Percentuais = ({ percents }: { percents: number[] }) => (
  <span className="flex flex-wrap gap-1">
    {percents.map(p => (
      <span key={p} className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold tabular-nums">
        {p}%
      </span>
    ))}
  </span>
)

const Selo = ({ c }: { c: AdminCampaign }) => (
  <CampaignBadgeInline text={c.badge_text} band={c.band_color} accent={c.accent_color} percent={highestPercent(c.percents)} />
)

const BotaoNova = () => (
  <Button asChild className="min-h-11 rounded-xl gradient-cta border-0 text-primary-foreground hover:brightness-110">
    <Link to={NOVA}>
      <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Nova campanha
    </Link>
  </Button>
)

const AdminCampaignsPage = () => {
  const { campaigns, loading, error, refetch } = useCampaigns()
  const agora = Date.now()

  return (
    <div className="min-w-0 space-y-6">
      <nav aria-label="Trilha" className="hidden items-center gap-1 text-xs text-muted-foreground md:flex">
        <span>Descontos</span>
        <ChevronRight className="h-3 w-3" aria-hidden="true" />
        <span className="text-foreground">Campanhas</span>
      </nav>

      <PageHeader
        className="mb-0"
        title="Campanhas"
        subtitle="Descontos por percentual, com início e fim. Uma campanha em vigência por vez."
        actions={<BotaoNova />}
      />

      {loading ? (
        <TableSkeleton cols={6} />
      ) : error ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <p>Não foi possível carregar as campanhas. {error}</p>
          <Button variant="outline" className="mt-3 min-h-11" onClick={() => void refetch()}>
            Tentar de novo
          </Button>
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Tag}
          message="Nenhuma campanha ainda."
          hint="Crie a campanha com o nome, as datas e os percentuais; depois marque as peças no cadastro de cada uma."
          action={<BotaoNova />}
        />
      ) : (
        <>
          {/* Computador: a tabela. */}
          <div className="hidden overflow-hidden rounded-2xl border border-border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase text-muted-foreground">
                  <th className="p-4">Campanha</th>
                  <th className="p-4">Vigência</th>
                  <th className="p-4">Percentuais</th>
                  <th className="p-4 text-right">Peças</th>
                  <th className="p-4">Estado</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} data-testid="linha-da-campanha" className="border-b border-border last:border-0">
                    <td className="p-4">
                      <Link to={editar(c)} className="flex min-h-11 min-w-0 items-center gap-3 hover:underline">
                        <Selo c={c} />
                        <span className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{c.name}</span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-4 tabular-nums">{campaignPeriodLabel(c)}</td>
                    <td className="p-4"><Percentuais percents={c.percents} /></td>
                    <td className="p-4 text-right tabular-nums">{c.productCount}</td>
                    <td className="p-4"><CampaignStatusPill status={campaignStatus(c, agora)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: os cartões. */}
          <ul className="space-y-3 md:hidden">
            {campaigns.map(c => (
              <li key={c.id} data-testid="cartao-da-campanha">
                <Link
                  to={editar(c)}
                  className="block min-h-11 space-y-2 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-medium text-foreground [overflow-wrap:anywhere]">{c.name}</span>
                    <CampaignStatusPill status={campaignStatus(c, agora)} />
                  </span>
                  <span className="block text-xs text-muted-foreground tabular-nums">
                    {campaignPeriodLabel(c)} · {campaignPiecesLabel(c.productCount)}
                  </span>
                  <span className="flex flex-wrap items-center gap-2">
                    <Selo c={c} />
                    <Percentuais percents={c.percents} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground">{NOTA}</p>
    </div>
  )
}

export default AdminCampaignsPage
