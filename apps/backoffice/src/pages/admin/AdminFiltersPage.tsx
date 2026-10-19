// `/admin/filtros` e `/admin/filtros/:groupId` — os filtros da loja (feature 66, `FLT-01`..`FLT-10`).
//
// Lista de grupos à esquerda, o grupo aberto à direita — o molde de Configurações (feature 55):
// **o grupo aberto é a URL**, e no celular ela decide se aparece a lista ou o editor. No computador a
// rota-mãe abre o primeiro grupo, porque a lista já está à vista e repetir um índice ao lado seria a
// mesma lista duas vezes.
//
// Nenhuma regra é redigida aqui: limites, endereço e nome repetido são de `@estrelinha/core/filters`,
// chamados pelo hook do catálogo antes de qualquer gravação.

import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GripVertical, Plus, SlidersHorizontal, Trash2 } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
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
import { FILTER_GROUPS_MAX, groupLimitRefusal } from '@estrelinha/core/filters'
import { EmptyState, FormCard, PageHeader, SWITCH_TAP_44, TableSkeleton } from '@/shared/ui'
import { useAdminFilterCatalog, type AdminFilterGroup } from '@/entities/filter'
import {
  GroupForm,
  ValueList,
  marcacoesLabel,
  moverParaPosicao,
  perdaDoGrupo,
  valoresLabel,
} from '@/features/filter-editor'
import { useFila } from '@/features/filter-suggestions'

const FILTERS_ROOT = '/admin/filtros'

/**
 * FLT-01: a soma das marcações por valor — e desde a 67 (D2) das DUAS formas. A unidade é
 * "marcações" justamente porque a soma conta a mesma peça mais de uma vez; somar as por opção não
 * muda a natureza do número, só o deixa de mentir sobre quantas existem. É também o que a remoção do
 * grupo leva junto (`perdaDoGrupo`): a cascata apaga as duas.
 */
const marcacoesDoGrupo = (grupo: AdminFilterGroup): number =>
  grupo.values.reduce((soma, v) => soma + v.marked_count + (v.option_marked_count ?? 0), 0)

const AdminFiltersPage = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const catalogo = useAdminFilterCatalog()
  const { groups, loading, error } = catalogo
  // Feature 67 (`VFL-28`): o total da fila, pela MESMA leitura que a fila usa — os dois números são o
  // mesmo por construção.
  const sugestoes = useFila(groups)

  const [criando, setCriando] = useState(false)
  const [removendo, setRemovendo] = useState<AdminFilterGroup | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [arrastando, setArrastando] = useState<string | null>(null)

  const grupoValido = groups.find(g => g.id === groupId) ?? null
  const grupoExibido = grupoValido ?? groups[0] ?? null
  /** No celular: há um editor aberto (grupo da URL ou grupo novo)? Então a lista sai da frente. */
  const editorNoCelular = !!grupoValido || criando
  const teto = groupLimitRefusal(groups.length)

  const alternarAtivo = async (grupo: AdminFilterGroup, ativo: boolean) => {
    setAviso(await catalogo.updateGroup(grupo.id, { is_active: ativo }))
  }

  const soltar = async (alvo: string) => {
    const de = arrastando
    setArrastando(null)
    if (!de || de === alvo) return
    setAviso(await catalogo.reorderGroups(moverParaPosicao(groups.map(g => g.id), de, alvo)))
  }

  const confirmarRemocao = async () => {
    const grupo = removendo
    setRemovendo(null)
    if (!grupo) return
    const motivo = await catalogo.deleteGroup(grupo.id)
    setAviso(motivo)
    if (!motivo) navigate(FILTERS_ROOT)
  }

  const novoGrupo = (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {groups.length > 0 && (
          <Button asChild variant="outline" className="h-11">
            <Link to={`${FILTERS_ROOT}/sugestoes`}>
              {sugestoes.carregando ? 'Sugestões' : `Sugestões (${sugestoes.total})`}
            </Link>
          </Button>
        )}
        <Button
          className="h-11"
          disabled={!!teto}
          onClick={() => {
            setCriando(true)
            setAviso(null)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo grupo
        </Button>
      </div>
      {teto && <p className="text-xs text-muted-foreground">{teto}</p>}
    </div>
  )

  const voltar = () => {
    setCriando(false)
    navigate(FILTERS_ROOT)
  }

  return (
    <div>
      {editorNoCelular && (
        <PageHeader
          className="lg:hidden"
          backTo={voltar}
          title={criando ? 'Novo grupo' : (grupoValido?.name ?? '')}
          subtitle="Filtros da loja"
        />
      )}
      <PageHeader
        className={cn(editorNoCelular && 'hidden lg:flex')}
        icon={SlidersHorizontal}
        title="Filtros da loja"
        subtitle="O que a cliente pode filtrar na categoria e na busca. As tags continuam só para você."
        actions={novoGrupo}
      />

      {error && (
        <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
          <span>{error}</span>
          <Button variant="outline" size="sm" className="h-11" onClick={() => catalogo.fetchCatalog('inicial')}>
            Tentar de novo
          </Button>
        </div>
      )}
      {aviso && (
        <p role="alert" className="mb-4 text-sm font-medium text-destructive">
          {aviso}
        </p>
      )}

      {loading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : groups.length === 0 && !criando ? (
        <EmptyState
          icon={SlidersHorizontal}
          message="Nenhum grupo de filtro ainda."
          hint="Crie um grupo (ex.: Acabamento), acrescente os valores e marque as peças. A loja só mostra o filtro quando alguma peça da coleção tem o valor."
          action={
            <Button className="h-11" onClick={() => setCriando(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Novo grupo
            </Button>
          }
        />
      ) : (
        <div className="lg:flex lg:items-start lg:gap-6">
          <div className={cn('space-y-4 lg:w-[400px] lg:shrink-0', editorNoCelular && 'hidden lg:block')}>
            <section aria-labelledby="grupos-titulo" className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-baseline justify-between gap-3 border-b border-border px-4 py-3">
                <h2 id="grupos-titulo" className="font-heading text-base font-semibold text-foreground">
                  Grupos
                </h2>
                <span className="text-xs text-muted-foreground" data-testid="contador-grupos">
                  {groups.length} de {FILTER_GROUPS_MAX}
                </span>
              </header>
              <ul className="divide-y divide-border">
                {groups.map(grupo => {
                  const aberto = grupoExibido?.id === grupo.id && !criando
                  return (
                    <li
                      key={grupo.id}
                      data-testid={`grupo-${grupo.id}`}
                      draggable
                      onDragStart={() => setArrastando(grupo.id)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => {
                        e.preventDefault()
                        void soltar(grupo.id)
                      }}
                      className={cn('flex items-center gap-2 px-3', aberto && 'lg:bg-muted')}
                    >
                      <GripVertical aria-hidden className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground" />
                      <Link
                        to={`${FILTERS_ROOT}/${grupo.id}`}
                        onClick={() => setCriando(false)}
                        aria-current={grupoValido?.id === grupo.id ? 'page' : undefined}
                        className="flex min-h-[60px] min-w-0 flex-1 flex-col justify-center py-2"
                      >
                        <span className="truncate text-sm font-medium text-foreground">{grupo.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {valoresLabel(grupo.values.length)} · {marcacoesLabel(marcacoesDoGrupo(grupo))}
                          {grupo.is_active ? '' : ' · desligado na loja'}
                        </span>
                      </Link>
                      <Switch
                        checked={grupo.is_active}
                        onCheckedChange={valor => void alternarAtivo(grupo, valor)}
                        aria-label={`Mostrar “${grupo.name}” na loja`}
                        className={SWITCH_TAP_44}
                      />
                    </li>
                  )
                })}
              </ul>
            </section>

            <aside className="rounded-2xl bg-muted p-4 text-sm text-foreground">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Como a loja lê</p>
              <p>
                Dentro de um grupo, marcar dois valores mostra peças com qualquer um deles. Entre grupos, a
                peça precisa ter um de cada.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Desligar um grupo tira ele da loja e guarda as marcações para quando voltar.
              </p>
            </aside>
          </div>

          <div
            data-testid="editor-do-grupo"
            className={cn('w-full min-w-0 space-y-4 lg:flex-1', !editorNoCelular && 'hidden lg:block')}
          >
            {criando ? (
              <FormCard title="Novo grupo" description="O nome vira o título do bloco no filtro da loja.">
                <GroupForm
                  onCancel={() => setCriando(false)}
                  onSave={async draft => {
                    const { error: motivo, id } = await catalogo.createGroup(draft)
                    if (motivo) return motivo
                    setCriando(false)
                    if (id) navigate(`${FILTERS_ROOT}/${id}`)
                    return null
                  }}
                />
              </FormCard>
            ) : (
              grupoExibido && (
                <>
                  <FormCard
                    title={grupoExibido.name}
                    description={grupoExibido.is_active ? 'Aparece na loja.' : 'Desligado na loja — as marcações ficam guardadas.'}
                    action={
                      <Button variant="outline" className="h-11" onClick={() => setRemovendo(grupoExibido)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remover grupo
                      </Button>
                    }
                  >
                    <GroupForm
                      key={grupoExibido.id}
                      initial={{ name: grupoExibido.name, slug: grupoExibido.slug }}
                      onSave={draft => catalogo.updateGroup(grupoExibido.id, draft)}
                    />
                  </FormCard>
                  <FormCard>
                    <ValueList
                      key={grupoExibido.id}
                      group={grupoExibido}
                      onCreate={draft => catalogo.createValue(grupoExibido.id, draft)}
                      onUpdate={(id, patch) => catalogo.updateValue(id, patch)}
                      onRemove={id => catalogo.deleteValue(id)}
                      onReorder={ids => catalogo.reorderValues(grupoExibido.id, ids)}
                      onUpdateTerms={(id, termos) => catalogo.updateValueTerms(id, termos)}
                    />
                  </FormCard>
                </>
              )
            )}
          </div>
        </div>
      )}

      <AlertDialog open={!!removendo} onOpenChange={aberto => !aberto && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover o grupo “{removendo?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {removendo ? perdaDoGrupo(removendo.values.length, marcacoesDoGrupo(removendo)) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Manter</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarRemocao()}>Remover grupo</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminFiltersPage
