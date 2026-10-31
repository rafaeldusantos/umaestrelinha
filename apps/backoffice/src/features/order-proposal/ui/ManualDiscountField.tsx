// O desconto combinado (feature 89, `MON-08`). Tipo (R$ ou %), valor e MOTIVO — obrigatório, até 120
// caracteres, interno: a cliente vê só "Desconto combinado" (`CON-03`). As recusas são de `core`
// (`manualDiscountRefusal`); a de A-12 ("O desconto não pode zerar o pedido.") depende do total e
// aparece no resumo.

import { useId } from 'react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { MANUAL_REASON_MAX, manualDiscountRefusal } from '@estrelinha/core/proposals'
import { CharCounter, FieldGroup, FormCard, MoneyInput } from '@/shared/ui'
import { toManualDraft, type DraftManual } from '../model/draft'

interface Props {
  manual: DraftManual | null
  onChange: (manual: DraftManual | null) => void
}

// `min-w-0`, `[overflow-wrap:anywhere]` e o `flex-wrap` do grupo: com a fonte do sistema a 200 % o par
// não cabia no cartão em 390 (prova em navegador da T27).
const SEGMENTO =
  'inline-flex min-h-11 min-w-0 flex-1 items-center justify-center rounded-lg border px-3 text-center text-sm font-medium [overflow-wrap:anywhere] transition-colors motion-reduce:transition-none'

const ManualDiscountField = ({ manual, onChange }: Props) => {
  const base = useId()

  if (!manual) {
    return (
      <FormCard title="Desconto combinado">
        <button
          type="button"
          onClick={() => onChange({ kind: 'amount', value: null, reason: '' })}
          className="min-h-11 rounded-lg border border-dashed border-input px-3 py-2 text-sm font-medium text-foreground transition-colors motion-reduce:transition-none hover:bg-muted/50"
        >
          Acrescentar desconto combinado
        </button>
      </FormCard>
    )
  }

  const recusa = manualDiscountRefusal(toManualDraft(manual))
  const set = (patch: Partial<DraftManual>) => onChange({ ...manual, ...patch })

  return (
    <FormCard
      title="Desconto combinado"
      action={
        <button
          type="button"
          onClick={() => onChange(null)}
          className="min-h-11 rounded-lg px-3 text-sm font-medium text-foreground transition-colors motion-reduce:transition-none hover:bg-muted"
        >
          Tirar desconto
        </button>
      }
    >
      <div role="group" aria-label="Tipo do desconto" className="flex flex-wrap gap-2">
        {(['amount', 'percent'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            aria-pressed={manual.kind === kind}
            onClick={() => set({ kind, value: null })}
            className={cn(SEGMENTO, manual.kind === kind ? 'border-primary bg-primary/10 text-foreground' : 'border-input text-muted-foreground hover:bg-muted/50')}
          >
            {kind === 'amount' ? 'Em reais' : 'Em percentual'}
          </button>
        ))}
      </div>

      {manual.kind === 'amount' ? (
        <FieldGroup label="Valor do desconto" htmlFor={`${base}-valor`}>
          <MoneyInput id={`${base}-valor`} className="h-11" value={manual.value} onChange={(v) => set({ value: v })} />
        </FieldGroup>
      ) : (
        <FieldGroup label="Percentual do desconto" htmlFor={`${base}-valor`} hint="De 0,01% a 99,99%.">
          <Input
            id={`${base}-valor`}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            max="99.99"
            className="h-11"
            value={manual.value ?? ''}
            onChange={(e) => set({ value: e.target.value === '' ? null : Number(e.target.value) })}
          />
        </FieldGroup>
      )}

      <FieldGroup
        label="Motivo"
        htmlFor={`${base}-motivo`}
        hint="Interno — a cliente vê só “Desconto combinado”."
        counter={<CharCounter value={manual.reason} limit={MANUAL_REASON_MAX} />}
      >
        <Input
          id={`${base}-motivo`}
          className="h-11"
          maxLength={MANUAL_REASON_MAX}
          value={manual.reason}
          onChange={(e) => set({ reason: e.target.value })}
          placeholder="ex.: combinado no WhatsApp"
        />
      </FieldGroup>

      {recusa && (
        <p role="alert" data-testid="desconto-recusa" className="text-sm text-destructive">
          {recusa}
        </p>
      )}
    </FormCard>
  )
}

export default ManualDiscountField
