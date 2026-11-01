// O desconto combinado (feature 89, `MON-08`). Tipo (R$ ou %), valor e MOTIVO — obrigatório, até 120
// caracteres, interno: a cliente vê só "Desconto combinado" (`CON-03`). As recusas são de `core`
// (`manualDiscountRefusal`); a de A-12 ("O desconto não pode zerar o pedido.") depende do total e
// aparece no resumo.

import { useId } from 'react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { MANUAL_REASON_MAX, manualDiscountRefusal } from '@estrelinha/core/proposals'
import { CharCounter, MoneyInput } from '@/shared/ui'
import { toManualDraft, type DraftManual } from '../model/draft'
import { SEGMENTADO, SEGMENTO, SEGMENTO_DESLIGADO, SEGMENTO_LIGADO } from './estilos'

interface Props {
  manual: DraftManual | null
  onChange: (manual: DraftManual | null) => void
}

const ManualDiscountField = ({ manual, onChange }: Props) => {
  const base = useId()
  const recusa = manual ? manualDiscountRefusal(toManualDraft(manual)) : null
  const set = (patch: Partial<DraftManual>) => manual && onChange({ ...manual, ...patch })

  return (
    <div className="space-y-2">
      <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          className="h-[18px] w-[18px] shrink-0 accent-primary"
          checked={manual !== null}
          onChange={(e) => onChange(e.target.checked ? { kind: 'amount', value: null, reason: '' } : null)}
        />
        <span className="font-semibold">Desconto combinado</span>
      </label>

      {manual && (
        <div className="grid grid-cols-[auto_minmax(0,180px)] items-center gap-2.5">
          <div role="radiogroup" aria-label="Tipo do desconto" className={cn(SEGMENTADO, "w-fit")}>
            {(['amount', 'percent'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={manual.kind === kind}
                aria-label={kind === 'amount' ? 'Em reais' : 'Em percentual'}
                onClick={() => set({ kind, value: null })}
                className={cn(SEGMENTO, manual.kind === kind ? SEGMENTO_LIGADO : SEGMENTO_DESLIGADO)}
              >
                {kind === 'amount' ? 'R$' : '%'}
              </button>
            ))}
          </div>
          {manual.kind === 'amount' ? (
            <MoneyInput id={`${base}-valor`} aria-label="Valor do desconto" className="h-11" value={manual.value} onChange={(v) => set({ value: v })} />
          ) : (
            <Input
              id={`${base}-valor`}
              aria-label="Percentual do desconto"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              max="99.99"
              placeholder="10"
              className="h-11"
              value={manual.value ?? ''}
              onChange={(e) => set({ value: e.target.value === '' ? null : Number(e.target.value) })}
            />
          )}
          <div className="col-span-2 space-y-1.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <label htmlFor={`${base}-motivo`} className="text-sm font-medium text-foreground">
                Motivo
              </label>
              <span className="inline-flex items-baseline gap-1 text-[11px] text-muted-foreground">
                <CharCounter value={manual.reason} limit={MANUAL_REASON_MAX} /> · só você vê
              </span>
            </div>
            <Input
              id={`${base}-motivo`}
              className="h-11"
              maxLength={MANUAL_REASON_MAX}
              value={manual.reason}
              onChange={(e) => set({ reason: e.target.value })}
              placeholder="Ex.: combinado no WhatsApp, segunda peça"
            />
          </div>
          {recusa && (
            <p role="alert" data-testid="desconto-recusa" className="col-span-2 text-sm text-destructive">
              {recusa}
            </p>
          )}
          <p className="col-span-2 text-xs text-muted-foreground">A cliente vê “Desconto combinado”, sem o motivo.</p>
        </div>
      )}
    </div>
  )
}

export default ManualDiscountField
