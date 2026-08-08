// A listagem de promoções (feature 17, board `Promoções — listagem (/admin/promocoes)`).
//
// O que esta tela resolve: até aqui o preço do kit (R$ 15 / 23 / 42 para 3 / 5 / 10) era constante
// dentro de um componente da home — não havia **nenhuma** forma de a dona da loja mudá-lo sem deploy.
//
// Molde: `AdminCouponsPage`. Mesmo `PageHeader`, mesmo `AdminTable`, mesmos selos — de propósito:
// promoção e cupom são as duas metades do grupo `Descontos` da sidebar, e telas irmãs que se parecem
// custam menos para aprender.
//
// Os números do topo (promoções ativas, desconto concedido, itens por pedido) são a T23 — o board os
// mostra, e eles pedem uma leitura de `orders` que esta task não faz.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Copy,
  Loader2,
  Pause,
  Pencil,
  Percent,
  Play,
  Plus,
  ShoppingBasket,
  Tag,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { Badge } from '@nanapin/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@nanapin/ui/alert-dialog'
import { toast } from '@nanapin/ui/hooks/use-toast'
import { formatPrice } from '@nanapin/core/formatters'
import {
  promotionCopyPayload,
  useAdminPromotions,
  useCreatePromotion,
  useDeletePromotion,
  usePromotionStats,
  useUpdatePromotion,
  type AdminPromotion,
} from '@nanapin/core/hooks/usePromotions'
import { useAdminCategories } from '@/entities/category'
import { validityLabel } from '@/shared/lib/vigencia'
import {
  AdminTable,
  EmptyState,
  PageHeader,
  StatCard,
  TableSkeleton,
  type AdminColumn,
} from '@/shared/ui'

/** `3 · 5 · 10 un` — as faixas já chegam ordenadas por `min_qty` (`useAdminPromotions`). */
const tierSteps = (promo: AdminPromotion) =>
  promo.tiers.length === 0 ? 'Sem faixas' : `${promo.tiers.map(t => t.min_qty).join(' · ')} un`

/**
 * `R$ 5,00 → R$ 4,20 /un` (ou `10% → 18% off`): o que a **primeira** faixa cobra e o que a **última**
 * cobra. Uma faixa só não tem seta — `R$ 5,00 → R$ 5,00` anunciaria uma progressão que não existe.
 */
const tierRange = (promo: AdminPromotion) => {
  if (promo.tiers.length === 0) return '—'
  const label = (value: number) =>
    promo.discount_kind === 'percent' ? `${value}%` : formatPrice(value)
  const suffix = promo.discount_kind === 'percent' ? 'off' : '/un'
  const first = promo.tiers[0].value
  const last = promo.tiers[promo.tiers.length - 1].value
  return first === last
    ? `${label(first)} ${suffix}`
    : `${label(first)} → ${label(last)} ${suffix}`
}

// `validityLabel` (`Sem fim` · `até 30/09` · `01/08 – 31/08` · `a partir de 01/08`) nasceu aqui e
// mudou para `shared/lib/vigencia` na feature 18: a listagem de cupons mostra o MESMO dado e falava
// outra língua ("Validade", "Sem prazo", só a data de fim).

/**
 * O status que a dona da loja lê — e ele tem quatro valores, não dois.
 *
 * `useAdminPromotions` devolve **tudo** de propósito (pausada, expirada, programada): é aqui que elas
 * podem ser reativadas ou editadas. Mostrar uma promoção expirada como "Ativa" só porque
 * `active = true` faria a tela mentir sobre o que a loja está praticando.
 */
type PromotionStatus = 'active' | 'paused' | 'expired' | 'scheduled'

const promotionStatus = (promo: AdminPromotion, now = new Date()): PromotionStatus => {
  if (!promo.active) return 'paused'
  if (promo.valid_until && new Date(promo.valid_until) < now) return 'expired'
  if (promo.valid_from && new Date(promo.valid_from) > now) return 'scheduled'
  return 'active'
}

/**
 * PRM-24 — o travessão dos cartões.
 *
 * `null` chega de `usePromotionStats` querendo dizer "não há o que medir", e é exatamente aí que o
 * cartão não pode escrever `R$ 0,00`: sem pedido pago na janela, zero de desconto concedido seria uma
 * afirmação sobre vendas que não houve.
 */
const EM_DASH = '—'

const grantedLabel = (value: number | null) => (value === null ? EM_DASH : formatPrice(value))

/** `4,5` — uma casa decimal, porque a média de unidades raramente é inteira. */
const perOrderLabel = (value: number | null) =>
  value === null
    ? EM_DASH
    : value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** `4,5 vs 2,0`; um travessão só quando **nenhum** dos dois lados tem amostra. */
const itemsPerOrderLabel = (withPromotion: number | null, withoutPromotion: number | null) =>
  withPromotion === null && withoutPromotion === null
    ? EM_DASH
    : `${perOrderLabel(withPromotion)} vs ${perOrderLabel(withoutPromotion)}`

const AdminPromotionsPage = () => {
  const navigate = useNavigate()
  const { data: promotions = [], isLoading } = useAdminPromotions()
  const { data: stats } = usePromotionStats()
  const { categories } = useAdminCategories()
  const deleteMut = useDeletePromotion()
  const updateMut = useUpdatePromotion()
  const createMut = useCreatePromotion()

  const [confirmDelete, setConfirmDelete] = useState<AdminPromotion | null>(null)

  /**
   * Feature 18: o editor é uma ROTA, não um estado desta tela.
   *
   * O que se ganha além do espaço: a URL do editor é compartilhável e sobrevive ao F5 — antes,
   * recarregar com a modal aberta voltava para a listagem e perdia o que estava sendo editado.
   */
  const openEditor = (promo: AdminPromotion | null) =>
    navigate(promo ? `/admin/promocoes/${promo.id}/editar` : '/admin/promocoes/nova')

  /**
   * PRM-21: pausar e reativar sem abrir o editor.
   *
   * O payload é deliberadamente mínimo, e cada campo está aqui por um motivo provado por probe:
   *
   * - `name` **precisa** ir. O corpo de `upsert_promotion` faz `name = payload->>'name'` sem
   *   `coalesce` e recusa nome vazio; `{ id, active: false }` volta com "A promoção precisa de um
   *   nome".
   * - `tiers` e `category_ids` **não podem** ir. A RPC trata chave ausente como "não mexer" e chave
   *   presente como "substituir" — mandar `[]` apagaria todas as faixas e todos os vínculos da
   *   promoção em silêncio.
   *
   * E nada de pedido entra aqui: pausar mexe em `promotions.active`, e só. Pedido já pago guarda o
   * total que praticou nas próprias colunas (`orders.total`, `orders.promotion_discount`) — o
   * `create-payment` relê a promoção, mas um pedido pago não passa mais por ele.
   */
  const toggleActive = async (promo: AdminPromotion) => {
    const pausing = promo.active
    try {
      await updateMut.mutateAsync({ id: promo.id, name: promo.name, active: !pausing })
      toast({
        title: pausing ? 'Promoção pausada.' : 'Promoção reativada.',
        description: pausing
          ? 'Pedidos novos deixam de receber o desconto. Pedidos já pagos ficam como estão.'
          : 'A loja volta a praticar as faixas no próximo carregamento.',
      })
    } catch (e) {
      toast({
        title: pausing ? 'Erro ao pausar promoção' : 'Erro ao reativar promoção',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  /**
   * PRM-22: duplicar.
   *
   * O payload é `promotionCopyPayload` — a regra da cópia mora em `@nanapin/core`, ao lado dos tipos
   * que ela mapeia, e não aqui: `active: false` e `is_kit_showcase: false` são consequência das
   * colunas (default `true` numa, índice único parcial na outra), não decisão de tela.
   */
  const duplicate = async (promo: AdminPromotion) => {
    try {
      await createMut.mutateAsync(promotionCopyPayload(promo))
      toast({
        title: 'Promoção duplicada.',
        description: `"${promo.name} (cópia)" nasceu pausada — ajuste e ative quando quiser.`,
      })
    } catch (e) {
      toast({
        title: 'Erro ao duplicar promoção',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  /**
   * "Ativas" é o que a loja está praticando agora — `active` **e** dentro da vigência, o mesmo
   * veredito da coluna Status. Contar `active = true` cru inflaria o cartão com campanhas expiradas e
   * programadas, que a tabela ao lado mostra como Expirada e Programada.
   */
  const activeCount = useMemo(
    () => promotions.filter(promo => promotionStatus(promo) === 'active').length,
    [promotions],
  )

  const categoryNames = useMemo(() => {
    const byId = new Map<string, string>()
    for (const category of categories) byId.set(category.id, category.name)
    return byId
  }, [categories])

  const columns: AdminColumn<AdminPromotion>[] = [
    {
      key: 'name',
      header: 'Promoção',
      cell: promo => {
        const paused = promotionStatus(promo) !== 'active'
        return (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  paused ? 'font-bold text-muted-foreground' : 'font-bold text-foreground'
                }
              >
                {promo.name}
              </span>
              {promo.is_kit_showcase && (
                <Badge variant="secondary" className="text-primary">
                  vitrine do kit
                </Badge>
              )}
            </div>
            {/* SPEC_DEVIATION: o board mostra "Pausada em 28/07" na linha pausada.
                Reason: não existe coluna `paused_at`; `updated_at` é a última escrita QUALQUER, e
                datar a pausa por ela mentiria depois de uma simples edição de nome. Que a promoção
                está pausada é dito pelo selo e pelo tom apagado da linha. */}
            <span className="text-xs text-muted-foreground">
              {promo.is_kit_showcase
                ? 'Monte seu kit lê esta regra'
                : 'Sem vitrine própria na loja'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: () => <span className="text-muted-foreground">Progressivo por qtd.</span>,
    },
    {
      key: 'scope',
      header: 'Escopo',
      cell: promo => {
        if (promo.scope === 'all') return <Badge variant="outline">Toda a loja</Badge>
        if (promo.categoryIds.length === 0) {
          // Estado legal e perigoso: sem vínculo a promoção não desconta de ninguém — e **nunca**
          // vira "toda a loja". A tela diz isso em vez de deixar a coluna vazia.
          return <span className="text-xs text-muted-foreground">Nenhuma categoria</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {promo.categoryIds.map(id => (
              <Badge key={id} variant="outline">
                {categoryNames.get(id) ?? 'Categoria removida'}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      key: 'tiers',
      header: 'Faixas',
      cell: promo => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-foreground">{tierSteps(promo)}</span>
          <span className="text-xs text-muted-foreground">{tierRange(promo)}</span>
        </div>
      ),
    },
    {
      key: 'validity',
      header: 'Vigência',
      cell: promo => (
        <span className="text-xs text-muted-foreground">
          {validityLabel(promo.valid_from, promo.valid_until)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: promo => {
        const status = promotionStatus(promo)
        if (status === 'paused') return <Badge variant="secondary">Pausada</Badge>
        if (status === 'expired') return <Badge variant="destructive">Expirada</Badge>
        if (status === 'scheduled') return <Badge variant="outline">Programada</Badge>
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20">
            Ativa
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      cell: promo => (
        <div className="flex justify-end gap-1">
          {/* O botão segue `promo.active` — a coluna —, não o selo derivado: uma promoção `active`
              mas expirada continua sendo algo que se pausa. */}
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${promo.active ? 'Pausar' : 'Reativar'} ${promo.name}`}
            onClick={() => toggleActive(promo)}
          >
            {promo.active ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Duplicar ${promo.name}`}
            onClick={() => duplicate(promo)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Editar ${promo.name}`}
            onClick={() => openEditor(promo)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Excluir ${promo.name}`}
            onClick={() => setConfirmDelete(promo)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Promoções"
        subtitle="Regras que descontam sozinhas, sem o cliente digitar código."
        icon={Percent}
        actions={
          <Button
            className="rounded-xl gradient-cta border-0 text-primary-foreground hover:brightness-110"
            onClick={() => openEditor(null)}
          >
            <Plus className="mr-2 h-4 w-4" /> Nova promoção
          </Button>
        }
      />

      {/* PRM-24. Os cartões ficam montados em qualquer estado — a altura deles não depende do valor,
          então carregar não empurra a tabela para baixo. Durante o carregamento da listagem o contador
          sai em `—`: um `0` piscando afirmaria que não há campanha vigente. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Promoções ativas"
          value={isLoading ? EM_DASH : activeCount}
          icon={Percent}
          accent="text-nana-violet"
          subtitle={isLoading ? undefined : `de ${promotions.length} cadastradas`}
        />
        <StatCard
          label="Desconto concedido"
          value={grantedLabel(stats.discountGranted)}
          icon={TrendingDown}
          accent="text-emerald-500"
          subtitle="pedidos pagos nos últimos 30 dias"
        />
        <StatCard
          label="Itens por pedido"
          value={itemsPerOrderLabel(stats.itemsWithPromotion, stats.itemsWithoutPromotion)}
          icon={ShoppingBasket}
          accent="text-nana-cyan"
          subtitle="com promoção vs sem promoção"
        />
      </div>

      {isLoading ? (
        // 7 colunas: o esqueleto tem a mesma largura de lane da tabela, então trocar um pelo outro
        // não empurra nada de lugar.
        <TableSkeleton cols={7} />
      ) : promotions.length === 0 ? (
        <EmptyState
          icon={Tag}
          message="Nenhuma promoção cadastrada."
          hint="Crie a regra do kit — faixas de 3, 5 e 10 unidades sobre Bottons — e a loja passa a praticar o preço no mesmo carregamento."
          action={
            <Button
              className="rounded-xl gradient-cta border-0 text-primary-foreground hover:brightness-110"
              onClick={() => openEditor(null)}
            >
              <Plus className="mr-2 h-4 w-4" /> Nova promoção
            </Button>
          }
        />
      ) : (
        <AdminTable
          columns={columns}
          data={promotions}
          rowKey={promo => promo.id}
          zebra={false}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir promoção?</AlertDialogTitle>
            <AlertDialogDescription>
              A promoção <strong>{confirmDelete?.name}</strong> será removida com as faixas e os
              vínculos de categoria. Pedidos já pagos mantêm o desconto que praticaram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return
                try {
                  await deleteMut.mutateAsync(confirmDelete.id)
                  toast({ title: 'Promoção excluída.' })
                } catch (e) {
                  toast({
                    title: 'Erro ao excluir promoção',
                    description: (e as Error).message,
                    variant: 'destructive',
                  })
                }
                setConfirmDelete(null)
              }}
            >
              {deleteMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default AdminPromotionsPage
