import { useRef, useState } from 'react'
import { ArrowRight, Info } from 'lucide-react'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@estrelinha/ui/select'
import { ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { isPickupOrder } from '@estrelinha/core/shipping'
import { ActionButton } from '@/shared/ui'
import { nextStep } from '../model/nextStep'
import { gerundioDoStatus } from '../model/gerundio'
import type { DbOrder } from '@estrelinha/supabase/types'

interface Props {
  order: DbOrder
  /**
   * A mudança de status. A promessa termina quando o gesto termina — gravado, ou desistido no diálogo
   * de aviso —, e é isso que devolve o "Outro status" ao vazio (`AVS-05`).
   */
  onAdvance: (status: string, origem?: HTMLElement | null) => Promise<unknown>
  /** Alguma gravação está em curso no pedido (`CRG-02`): o botão e o seletor ficam desabilitados. */
  busy?: boolean
  /** O status que está sendo gravado agora — o botão dele mostra o gerúndio (`CRG-01`). */
  gravando?: string | null
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
const OrderNextStep = ({ order, onAdvance, busy = false, gravando = null }: Props) => {
  const passo = nextStep(order)
  const [outro, setOutro] = useState<string>('')
  const gatilho = useRef<HTMLButtonElement>(null)
  const retirada = isPickupOrder(order)

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
          {/* O seletor guarda a escolha enquanto o gesto corre (diálogo aberto ou gravação no ar) e
              volta ao vazio quando ele termina — gravado ou desistido (`AVS-05`). */}
          <Select
            value={outro}
            disabled={busy}
            onValueChange={async v => {
              setOutro(v)
              // Conserto do QA (foco): a opção escolhida some com a lista — o seletor é a ORIGEM do
              // gesto, e é a ele que o foco volta quando o diálogo fecha sem gravar.
              // A falha é de quem grava (o aviso de resultado); aqui só importa devolver o seletor ao
              // vazio, e uma rejeição solta num manipulador de evento viraria erro não tratado.
              await Promise.resolve(onAdvance(v, gatilho.current)).catch(() => undefined)
              setOutro('')
            }}
          >
            <SelectTrigger ref={gatilho} className="h-11 w-[150px]" aria-label="Outro status">
              <SelectValue placeholder="Outro status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUSES.filter(s => s !== order.status).map(s => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ActionButton
            alvo44
            variant={passo.blockedReason ? 'outline' : 'default'}
            disabled={busy}
            pending={gravando === passo.status}
            pendingLabel={gerundioDoStatus(passo.status, retirada)}
            onClick={e => onAdvance(passo.status!, e.currentTarget)}
          >
            {passo.blockedReason ? 'Avançar mesmo assim' : (passo.actionLabel ?? STATUS_LABELS[passo.status])}
            <ArrowRight className="ml-1 h-4 w-4" />
          </ActionButton>
        </div>
      </div>
    </section>
  )
}

export default OrderNextStep
