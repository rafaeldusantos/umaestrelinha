// Feature 53 (T10) — um evento: rótulo, toggle, os 5 campos editáveis com contador contra
// `COPY_LIMITS`, a recusa inline (vinda de `refusalFor`, T06), o banner de aviso (material sem
// endereço / e-mail da dona vazio / link do painel não-produção) e o botão "ver prévia".
//
// Componente CONTROLADO pelo pai (`NotificationsTab`, T11): nenhum estado de servidor aqui, e o
// preview "ativo" também é estado do pai (`previewActive`/`previewLoading`/`previewResult`) — é o
// que permite um preview por vez em vez de 15 <iframe> simultâneos (design.md, Risks & Concerns).

import { Eye, EyeOff, Plus, X } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { Button } from '@estrelinha/ui/button'
import { FieldGroup, ToggleField } from '@/shared/ui'
import {
  COPY_LIMITS,
  NOTIFICATION_EVENT_LABELS,
  type EmailFields,
  type EventChannelSettings,
  type NotificationEvent,
} from '@estrelinha/core/notifications'
import { EmailPreviewFrame, type EmailPreviewFrameProps } from './EmailPreviewFrame'

export interface EventCardProps {
  event: NotificationEvent
  value: EventChannelSettings<EmailFields>
  onFieldChange: (field: keyof EmailFields, value: string | string[]) => void
  onToggle: (enabled: boolean) => void
  /** `null` quando o texto passa em todas as réguas de `core` (variável, tom, tamanho, material). */
  refusal: string | null
  /** Avisos NÃO bloqueantes — material sem endereço (informativo, mesmo desligado) e os dois de `owner_*`. */
  warnings: string[]
  onTogglePreview: () => void
  previewActive: boolean
  preview?: Pick<EmailPreviewFrameProps, 'loading' | 'error' | 'subject' | 'html' | 'text' | 'sample'>
}

const counterLabel = (value: string | undefined, limit: number) => `${(value ?? '').length}/${limit}`

/**
 * ABN-10 — medido em navegador real (390×844): o `Switch` do design system é `h-6 w-11` (24×44px),
 * abaixo do piso de 44px de altura. O molde é `TAP_44` da loja (pseudo-elemento que estende a área
 * CLICÁVEL sem mudar o desenho visual) — nunca importado (ele é de `apps/store`, e trazê-lo criaria
 * um segundo dono da medida). `switchClassName` é aditivo em `ToggleField`: só este card o usa.
 */
const TOGGLE_TOUCH_TARGET = "relative before:absolute before:content-[''] before:-top-[10px] before:-bottom-[10px] before:left-0 before:right-0"

export function EventCard({
  event,
  value,
  onFieldChange,
  onToggle,
  refusal,
  warnings,
  onTogglePreview,
  previewActive,
  preview,
}: EventCardProps) {
  const { fields } = value
  const extra = fields.extra ?? []

  const setExtraLine = (index: number, next: string) => {
    const linhas = [...extra]
    linhas[index] = next
    onFieldChange('extra', linhas)
  }

  const removeExtraLine = (index: number) => {
    onFieldChange(
      'extra',
      extra.filter((_, i) => i !== index),
    )
  }

  const addExtraLine = () => {
    if (extra.length >= COPY_LIMITS.extraLines) return
    onFieldChange('extra', [...extra, ''])
  }

  return (
    <div
      data-testid={`event-card-${event}`}
      className="space-y-4 rounded-xl border border-border p-4"
    >
      <ToggleField
        label={NOTIFICATION_EVENT_LABELS[event]}
        checked={value.enabled}
        onChange={onToggle}
        switchClassName={TOGGLE_TOUCH_TARGET}
      />

      {warnings.length > 0 && (
        <div
          data-testid={`event-warnings-${event}`}
          role="status"
          className="space-y-1 rounded-xl border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <FieldGroup label="Assunto" htmlFor={`${event}-subject`}>
        <Input
          id={`${event}-subject`}
          data-testid={`${event}-subject`}
          value={fields.subject}
          maxLength={COPY_LIMITS.subject + 40}
          onChange={(e) => onFieldChange('subject', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{counterLabel(fields.subject, COPY_LIMITS.subject)}</p>
      </FieldGroup>

      <FieldGroup label="Título" htmlFor={`${event}-heading`}>
        <Input
          id={`${event}-heading`}
          data-testid={`${event}-heading`}
          value={fields.heading}
          maxLength={COPY_LIMITS.heading + 40}
          onChange={(e) => onFieldChange('heading', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{counterLabel(fields.heading, COPY_LIMITS.heading)}</p>
      </FieldGroup>

      <FieldGroup label="Texto principal" htmlFor={`${event}-lead`}>
        <Textarea
          id={`${event}-lead`}
          data-testid={`${event}-lead`}
          rows={4}
          value={fields.lead}
          onChange={(e) => onFieldChange('lead', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{counterLabel(fields.lead, COPY_LIMITS.lead)}</p>
      </FieldGroup>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Observações extras</p>
        {extra.map((linha, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center gap-2">
              <Input
                aria-label={`Observação ${i + 1}`}
                data-testid={`${event}-extra-${i}`}
                value={linha}
                onChange={(e) => setExtraLine(i, e.target.value)}
              />
              <button
                type="button"
                aria-label={`Remover observação ${i + 1}`}
                data-testid={`${event}-extra-remove-${i}`}
                onClick={() => removeExtraLine(i)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{counterLabel(linha, COPY_LIMITS.extraLine)}</p>
          </div>
        ))}
        {extra.length < COPY_LIMITS.extraLines && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`${event}-extra-add`}
            onClick={addExtraLine}
            className="h-11"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Adicionar observação
          </Button>
        )}
      </div>

      <FieldGroup label="Rótulo do botão" htmlFor={`${event}-cta_label`}>
        <Input
          id={`${event}-cta_label`}
          data-testid={`${event}-cta_label`}
          value={fields.cta_label}
          maxLength={COPY_LIMITS.ctaLabel + 40}
          onChange={(e) => onFieldChange('cta_label', e.target.value)}
        />
        <p className="text-xs text-muted-foreground">{counterLabel(fields.cta_label, COPY_LIMITS.ctaLabel)}</p>
      </FieldGroup>

      {refusal && (
        <p role="alert" data-testid={`event-card-refusal-${event}`} className="text-xs font-medium text-destructive">
          {refusal}
        </p>
      )}

      <div className="space-y-3 border-t border-border pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`${event}-toggle-preview`}
          onClick={onTogglePreview}
          className="h-11"
        >
          {previewActive ? (
            <>
              <EyeOff className="mr-2 h-4 w-4" aria-hidden />
              Fechar prévia
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" aria-hidden />
              Ver prévia
            </>
          )}
        </Button>

        {previewActive && (
          <EmailPreviewFrame
            subject={preview?.subject}
            html={preview?.html}
            text={preview?.text}
            sample={preview?.sample}
            loading={preview?.loading}
            error={preview?.error}
          />
        )}
      </div>
    </div>
  )
}

export default EventCard
