// A observação na montagem do pedido. O texto que só quem administra lê: vai no save
// junto do resto, NÃO sobe a versão da proposta e a cliente nunca o recebe; quando ela conclui o
// link, a observação passa ao pedido.
//
// A regra é a de `core` (`adminNoteLength`, `adminNoteRefusal`): o texto aparado, contado por ponto
// de código, como o `check` do banco. Sem `maxLength` nativo, que contaria unidades de UTF-16 e
// cortaria antes do teto um texto com caractere fora do plano básico.

import { useId } from 'react'
import { Textarea } from '@estrelinha/ui/textarea'
import { ORDER_ADMIN_NOTE_MAX, adminNoteLength, adminNoteRefusal } from '@estrelinha/core/orders'
import { CharCounter, FormCard } from '@/shared/ui'

interface Props {
  value: string
  onChange: (value: string) => void
}

const ProposalNoteField = ({ value, onChange }: Props) => {
  const id = useId()
  const recusa = adminNoteRefusal(value)
  return (
    <FormCard title="Observação">
      <div className="space-y-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            Observação interna
          </label>
          <span className="inline-flex items-baseline gap-1 text-[11px] text-muted-foreground">
            <CharCounter value={value} count={adminNoteLength(value)} limit={ORDER_ADMIN_NOTE_MAX} /> · só você vê
          </span>
        </div>
        <Textarea
          id={id}
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ex.: embrulhar para presente, entregar até sexta"
          aria-describedby={recusa ? `${id}-recusa` : undefined}
          className="min-h-20 w-full min-w-0 text-sm"
        />
        {recusa && (
          <p id={`${id}-recusa`} role="alert" className="text-sm text-destructive">
            {recusa}
          </p>
        )}
        <p className="text-xs text-muted-foreground">A cliente não vê. Ela passa ao pedido quando a cliente concluir.</p>
      </div>
    </FormCard>
  )
}

export default ProposalNoteField
