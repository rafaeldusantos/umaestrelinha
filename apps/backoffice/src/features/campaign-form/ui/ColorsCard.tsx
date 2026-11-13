// As duas cores do selo: a da faixa e a de destaque, usadas cruzadas. A medida de contraste é a de
// `core` (`campaignColorsRefusal`/`campaignColorsApproval`), com a razão escrita na frase.

import { Input } from '@estrelinha/ui/input'
import { Button } from '@estrelinha/ui/button'
import { CAMPAIGN_COLOR_PRESETS, CAMPAIGN_HEX } from '@estrelinha/core/campaigns'
import { FormCard } from '@/shared/ui'

interface Props {
  band: string
  accent: string
  onChange: (next: { band: string; accent: string }) => void
  refusal: string | null
  approval: string | null
}

const CampoDeCor = ({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) => (
  <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="text-sm font-medium text-foreground">{label}</label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label={`${label} — seletor`}
        value={CAMPAIGN_HEX.test(value) ? value.toLowerCase() : '#000000'}
        onChange={e => onChange(e.target.value.toUpperCase())}
        className="h-11 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1"
      />
      <Input
        id={id}
        value={value}
        maxLength={7}
        onChange={e => onChange(e.target.value.toUpperCase())}
        className="h-11 min-w-0 font-mono uppercase"
      />
    </div>
  </div>
)

const ColorsCard = ({ band, accent, onChange, refusal, approval }: Props) => (
  <FormCard
    title="Cores do selo"
    description="O texto sai na cor de destaque sobre a faixa, e o percentual na cor da faixa sobre o destaque."
  >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <CampoDeCor id="campanha-cor-faixa" label="Cor da faixa" value={band} onChange={v => onChange({ band: v, accent })} />
      <CampoDeCor id="campanha-cor-destaque" label="Cor de destaque" value={accent} onChange={v => onChange({ band, accent: v })} />
    </div>

    {refusal ? (
      <p role="alert" data-testid="medida-de-contraste" className="text-sm text-destructive">{refusal}</p>
    ) : (
      approval && <p data-testid="medida-de-contraste" className="text-sm text-emerald-700">{approval}</p>
    )}

    <div className="flex flex-wrap gap-2">
      {CAMPAIGN_COLOR_PRESETS.map(p => (
        <Button
          key={p.label}
          type="button"
          variant="outline"
          className="h-11 gap-2"
          onClick={() => onChange({ band: p.band, accent: p.accent })}
        >
          <span aria-hidden="true" className="flex h-4 w-8 overflow-hidden rounded">
            <span className="h-full w-1/2" style={{ backgroundColor: p.band }} />
            <span className="h-full w-1/2" style={{ backgroundColor: p.accent }} />
          </span>
          {p.label}
        </Button>
      ))}
    </div>
  </FormCard>
)

export default ColorsCard
