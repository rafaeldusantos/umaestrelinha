import { useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@estrelinha/ui/select'
import { ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { nextStep } from '../model/nextStep'
import type { DbOrder } from '@estrelinha/supabase/types'

interface Props {
  order: DbOrder
  onAdvance: (status: string) => Promise<void>
  busy?: boolean
}

/**
 * `PED-29` — o bloco que diz o próximo passo, o que o segura, e **avança mesmo assim**.
 *
 * Nunca desabilita o botão por causa da pendência: a operação real tem exceções legítimas (a Adri
 * combinou de mandar antes; o material chegou em mãos e ninguém registrou), e um botão apagado não
 * ensina nada — quem olha não sabe se falta dado, falta permissão, ou a tela travou.
 *
 * O `Select` ao lado existe para os saltos que a máquina não prevê. Ele não é o caminho normal, e
 * por isso é secundário: o caminho normal é um botão só.
 */
const OrderNextStep = ({ order, onAdvance, busy = false }: Props) => {
  const passo = nextStep(order)
  const [outro, setOutro] = useState<string>('')

  if (!passo.status) {
    return (
      <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
        <p className="text-sm text-muted-foreground">{passo.label}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-base font-semibold">{passo.label}</h2>
          {passo.blockedReason && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {passo.blockedReason}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={outro}
            onValueChange={async v => {
              setOutro('')
              await onAdvance(v)
            }}
          >
            <SelectTrigger className="h-11 w-[150px]">
              <SelectValue placeholder="Outro status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            className="min-h-[44px]"
            variant={passo.blockedReason ? 'outline' : 'default'}
            disabled={busy}
            onClick={() => onAdvance(passo.status!)}
          >
            {passo.blockedReason ? 'Avançar mesmo assim' : STATUS_LABELS[passo.status]}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}

export default OrderNextStep
