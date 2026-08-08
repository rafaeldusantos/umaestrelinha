// A listagem de cupons (feature 18 / T11, board `Cupons — listagem padronizada (/admin/cupons)`).
//
// Ela e `AdminPromotionsPage` mostram o MESMO tipo de dado — um desconto com vigência e status — e
// falavam línguas diferentes. O que esta task alinhou, item por item:
//
//   * a coluna de datas era "Validade" e mostrava só o fim, com "Sem prazo"; agora é `Vigência`, com o
//     mesmo vocabulário e a mesma faixa (`shared/lib/vigencia`);
//   * `Expirado` e `Esgotado` saíam os dois em vermelho — a ação para cada um é diferente
//     (`features/coupon-list/model/couponStatus`);
//   * três métricas eram calculadas a cada render e **nunca renderizadas**; viraram os três cartões;
//   * o cupom não tinha como ser pausado nem duplicado, e a promoção tinha as duas (DSC-07, DSC-08);
//   * editar abria um dialog; agora navega, como tudo mais no admin.

import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Copy,
  DollarSign,
  Loader2,
  Pause,
  Pencil,
  Percent,
  Play,
  Plus,
  Tag,
  Ticket,
  Trash2,
  Truck,
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
import { cn } from '@nanapin/ui/lib/utils'
import {
  PageHeader,
  StatCard,
  AdminTable,
  EmptyState,
  TableSkeleton,
  type AdminColumn,
} from '@/shared/ui'
import {
  useAdminCoupons,
  useDeleteCoupon,
  useUpdateCoupon,
} from '@nanapin/core/hooks/useCoupons'
import type { Coupon, CouponType } from '@nanapin/supabase/types/coupon'
import { formatPrice } from '@nanapin/core/formatters'
import { validityLabel } from '@/shared/lib/vigencia'
import { couponStats, couponStatus, isExhausted } from '@/features/coupon-list'

const typeMeta: Record<CouponType, { label: string; icon: React.ElementType }> = {
  percent: { label: '% off', icon: Percent },
  fixed: { label: 'Valor fixo', icon: DollarSign },
  free_shipping: { label: 'Frete grátis', icon: Truck },
}

/**
 * As quatro paletas de status (DSC-06 AC 4).
 *
 * `Ativo` repete exatamente o par da listagem de promoções. `Esgotado` é âmbar e não vermelho: ele não
 * é um erro, é uma campanha que funcionou até o teto — e o remédio (subir o limite) é outro.
 */
const STATUS_BADGE: Record<string, { label: string; className?: string; variant?: 'secondary' | 'destructive' }> = {
  active: { label: 'Ativo', className: 'bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20' },
  inactive: { label: 'Inativo', variant: 'secondary' },
  expired: { label: 'Expirado', variant: 'destructive' },
  exhausted: { label: 'Esgotado', className: 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/20' },
}

const AdminCouponsPage = () => {
  const navigate = useNavigate()
  const { data: coupons = [], isLoading } = useAdminCoupons()
  const updateMut = useUpdateCoupon()
  const deleteMut = useDeleteCoupon()

  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null)

  const stats = useMemo(() => couponStats(coupons), [coupons])

  /**
   * DSC-07: pausar e reativar sem abrir o formulário.
   *
   * O patch é `{ id, active }` e NADA mais (AC 3). `useUpdateCoupon` manda para o `update` só o que
   * recebe, então acrescentar campos aqui seria reescrever com o que a tela tem em cache — e a tela
   * pode estar vendo uma versão velha do cupom.
   *
   * Nenhum pedido é tocado: pausar mexe em `coupons.active`. Pedido já feito guarda o desconto que
   * praticou nas próprias colunas.
   */
  const toggleActive = async (coupon: Coupon) => {
    const pausing = coupon.active
    try {
      await updateMut.mutateAsync({ id: coupon.id, active: !pausing })
      toast({
        title: pausing ? 'Cupom pausado.' : 'Cupom reativado.',
        description: pausing
          ? 'O checkout deixa de aceitar o código. Pedidos já feitos ficam como estão.'
          : 'O código volta a ser aceito no checkout.',
      })
    } catch (e) {
      toast({
        title: pausing ? 'Erro ao pausar cupom' : 'Erro ao reativar cupom',
        description: (e as Error).message,
        variant: 'destructive',
      })
    }
  }

  const columns: AdminColumn<Coupon>[] = [
    {
      key: 'code',
      header: 'Código',
      cell: coupon => {
        const status = couponStatus(coupon)
        return (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn(
                'font-mono font-bold',
                status === 'active' ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {coupon.code}
            </span>
            {coupon.description && (
              <span className="text-xs text-muted-foreground">{coupon.description}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'type',
      header: 'Tipo',
      cell: coupon => {
        const Icon = typeMeta[coupon.type].icon
        return (
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {typeMeta[coupon.type].label}
          </span>
        )
      },
    },
    {
      key: 'value',
      header: 'Valor',
      cell: coupon => (
        <>
          {coupon.type === 'percent' && `${coupon.value}%`}
          {coupon.type === 'fixed' && formatPrice(coupon.value)}
          {coupon.type === 'free_shipping' && '—'}
        </>
      ),
    },
    {
      key: 'min_order',
      header: 'Mín. pedido',
      cell: coupon => (coupon.min_order > 0 ? formatPrice(coupon.min_order) : '—'),
    },
    {
      key: 'uses',
      header: 'Usos',
      // AC 5: o teto batido é marcado no próprio valor. Sem isso, `40 / 40` e `12 / 40` têm o mesmo
      // peso visual, e é o primeiro que exige uma decisão.
      cell: coupon => (
        <span className={cn(isExhausted(coupon) && 'font-semibold text-amber-700')}>
          {coupon.used_count}
          {coupon.max_uses != null && ` / ${coupon.max_uses}`}
        </span>
      ),
    },
    {
      key: 'validity',
      header: 'Vigência',
      cell: coupon => (
        <span className="text-xs text-muted-foreground">
          {validityLabel(coupon.valid_from, coupon.valid_until)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: coupon => {
        const badge = STATUS_BADGE[couponStatus(coupon)]
        return (
          <Badge variant={badge.variant} className={badge.className}>
            {badge.label}
          </Badge>
        )
      },
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'right',
      // AC 6: a mesma ordem da listagem de promoções — pausar, duplicar, editar, excluir.
      cell: coupon => (
        <div className="flex justify-end gap-1">
          {/* O botão segue `coupon.active` — a coluna —, não o selo derivado: um cupom `active` mas
              expirado continua sendo algo que se pausa. */}
          <Button
            size="sm"
            variant="ghost"
            aria-label={`${coupon.active ? 'Pausar' : 'Reativar'} ${coupon.code}`}
            onClick={() => toggleActive(coupon)}
          >
            {coupon.active ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4 text-emerald-600" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Duplicar ${coupon.code}`}
            onClick={() => navigate(`/admin/cupons/novo?from=${coupon.id}`)}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Editar ${coupon.code}`}
            onClick={() => navigate(`/admin/cupons/${coupon.id}/editar`)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            aria-label={`Excluir ${coupon.code}`}
            onClick={() => setConfirmDelete(coupon)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ]

  const novoCupom = (
    <Button
      className="rounded-xl gradient-cta border-0 text-primary-foreground hover:brightness-110"
      onClick={() => navigate('/admin/cupons/novo')}
    >
      <Plus className="mr-2 h-4 w-4" /> Novo cupom
    </Button>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cupons"
        subtitle="Códigos que a cliente digita no checkout. Promoção é a outra metade."
        icon={Ticket}
        actions={novoCupom}
      />

      {/* Os cartões ficam montados em qualquer estado — a altura deles não depende do valor, então
          carregar não empurra a tabela. Durante o carregamento o contador sai em `—`: um `0` piscando
          afirmaria que não há cupom valendo. */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Cupons ativos"
          value={isLoading ? '—' : stats.active}
          icon={Ticket}
          accent="text-nana-violet"
          subtitle={isLoading ? undefined : `de ${stats.total} cadastrados`}
        />
        <StatCard
          label="Usos totais"
          value={isLoading ? '—' : stats.totalUses}
          icon={Tag}
          accent="text-emerald-500"
          subtitle="desde o cadastro de cada cupom"
        />
        <StatCard
          label="Pedem decisão"
          value={isLoading ? '—' : stats.needsAttention}
          icon={AlertTriangle}
          accent="text-amber-500"
          subtitle="expirados ou esgotados"
        />
      </div>

      {isLoading ? (
        <TableSkeleton cols={8} />
      ) : coupons.length === 0 ? (
        <EmptyState
          icon={Tag}
          message="Nenhum cupom cadastrado."
          hint="Crie o primeiro código — ele passa a ser aceito no checkout assim que você salvar."
          action={novoCupom}
        />
      ) : (
        <AdminTable columns={columns} data={coupons} rowKey={coupon => coupon.id} zebra={false} />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={v => !v && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cupom?</AlertDialogTitle>
            <AlertDialogDescription>
              O cupom <strong>{confirmDelete?.code}</strong> será removido permanentemente. Pedidos que
              já o usaram mantêm o desconto que praticaram.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDelete) return
                try {
                  await deleteMut.mutateAsync(confirmDelete.id)
                  toast({ title: 'Cupom excluído.' })
                } catch (e) {
                  toast({
                    title: 'Erro ao excluir cupom',
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

export default AdminCouponsPage
