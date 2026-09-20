// Um evento da seção Notificações — feature 53 (T10), redesenhado pela 56.
//
// ## O que a 56 mudou, e por quê
//
// O card era sempre aberto: os cinco campos, a prévia e o banner de aviso, para os quinze eventos ao
// mesmo tempo. Medido em navegador em 2026-09-20, a seção tinha **13.292px** de rolagem em 1440 e
// **13.592px** em 390 — ~16 telas para responder "quais destes quinze avisos eu quero ligar?", e
// nenhuma visão em que os quinze coubessem juntos.
//
// Agora ele tem dois estados. **Recolhido**: ícone, nome, interruptor — 44px de alvo e nada de
// campo no DOM. **Aberto**: o cabeçalho ganha a descrição de quando o evento dispara, um divisor, e
// abaixo os campos e a prévia.
//
// ## Três decisões de estrutura que valem mais que o CSS
//
// 1. **Qual card está aberto é estado do PAI** (`expanded`/`onToggleExpanded`), pelo mesmo motivo
//    que o preview já era: "no máximo um aberto" não se expressa dentro do card. Quinze `useState`
//    locais seriam quinze verdades e nenhum lugar onde a regra mora.
//
// 2. **O interruptor é IRMÃO do botão do cabeçalho, nunca filho.** Controle dentro de controle é
//    HTML inválido, e o clique no interruptor borbulharia para o botão — que é exatamente o que
//    `LEG-08` proíbe (acionar o interruptor não pode abrir nem fechar o card). A estrutura resolve;
//    nada de `stopPropagation`, que seria a mesma regra escrita de novo em JavaScript.
//
// 3. **O `ToggleField` saiu** (`LEG-15`). Ele desenha a própria moldura, e dentro da moldura do card
//    isso produzia caixa dentro de caixa. O cabeçalho passa a ser o botão e o `Switch`, lado a lado,
//    sem borda interna — e o alvo de toque do `Switch` continua vindo de `SWITCH_TAP_44`, a mesma
//    constante de `shared/ui`.
//
// Componente CONTROLADO pelo pai (`NotificationsTab`, T11): nenhum estado de servidor aqui, e o
// rascunho **nunca** foi dele — é isso que faz `LEG-07` (fechar não descarta a edição) ser
// propriedade da árvore em vez de promessa.

import { Link } from 'react-router-dom'
import { AlertCircle, AlertTriangle, ChevronDown, Eye, EyeOff, Plus, X } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { Textarea } from '@estrelinha/ui/textarea'
import { Button } from '@estrelinha/ui/button'
import { Switch } from '@estrelinha/ui/switch'
import { cn } from '@estrelinha/ui/lib/utils'
import { CharCounter, FieldGroup, InfoBanner, SWITCH_TAP_44 } from '@/shared/ui'
import {
  COPY_LIMITS,
  NOTIFICATION_EVENT_DESCRIPTIONS,
  NOTIFICATION_EVENT_ICONS,
  NOTIFICATION_EVENT_NAMES,
  type EmailFields,
  type EventChannelSettings,
  type NotificationEvent,
} from '@estrelinha/core/notifications'
import { EmailPreviewFrame, type EmailPreviewFrameProps } from './EmailPreviewFrame'
import { EVENT_ICON_COMPONENTS } from './eventIcons'

/**
 * Um aviso não bloqueante, com o caminho de conserto opcional ao lado (feature 55, `CFG-21`).
 *
 * O texto continua sendo `string` — e não um nó React — de propósito: um `<Link>` no meio da frase
 * a partiria em vários nós de DOM, e as asserções que já provam essas mensagens por
 * `getByText('a frase inteira')` parariam de casar. O link mora ao lado, no slot de ação do
 * `InfoBanner`.
 */
export interface EventWarning {
  text: string
  /** A seção de Configurações onde o ajuste se resolve. */
  action?: { to: string; label: string }
}

export interface EventCardProps {
  event: NotificationEvent
  value: EventChannelSettings<EmailFields>
  onFieldChange: (field: keyof EmailFields, value: string | string[]) => void
  onToggle: (enabled: boolean) => void
  /** `null` quando o texto passa em todas as réguas de `core` (variável, tom, tamanho, material). */
  refusal: string | null
  /** Avisos NÃO bloqueantes — material sem endereço (informativo, mesmo desligado) e os dois de `owner_*`. */
  warnings: EventWarning[]
  /**
   * Aberto ou recolhido. **Obrigatório** de propósito: um default silencioso faria cada chamador
   * novo herdar um estado que ninguém escolheu, e o `tsc` deixaria passar.
   */
  expanded: boolean
  onToggleExpanded: () => void
  onTogglePreview: () => void
  previewActive: boolean
  preview?: Pick<EmailPreviewFrameProps, 'loading' | 'error' | 'subject' | 'html' | 'text' | 'sample'>
}

export function EventCard({
  event,
  value,
  onFieldChange,
  onToggle,
  refusal,
  warnings,
  expanded,
  onToggleExpanded,
  onTogglePreview,
  previewActive,
  preview,
}: EventCardProps) {
  const { fields } = value
  const extra = fields.extra ?? []
  const nome = NOTIFICATION_EVENT_NAMES[event]
  const Icone = EVENT_ICON_COMPONENTS[NOTIFICATION_EVENT_ICONS[event]]
  const corpoId = `${event}-corpo`

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
      className="rounded-2xl border border-border bg-card p-3.5"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={corpoId}
          data-testid={`event-card-header-${event}`}
          onClick={onToggleExpanded}
          /* `min-h-11` — 44px de alvo (`LEG-21`). O `<button>` mede o próprio conteúdo, e o
             conteúdo mais alto aqui é o ícone de 34px: sem o piso explícito, o alvo nasceria 10px
             curto e nada acusaria (jsdom devolve 0 para toda medida de layout). */
          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            className={cn(
              'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-xl transition-colors motion-reduce:transition-none',
              /* O tom de destaque marca o card ABERTO, nunca o ligado — quem responde "está ligado?"
                 é o interruptor, do outro lado da linha, e dois sinais para a mesma pergunta é um a
                 mais. */
              expanded ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
            )}
          >
            <Icone className="h-4 w-4" aria-hidden />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-foreground">{nome}</span>
            {expanded && (
              <span className="block text-xs text-muted-foreground">
                {NOTIFICATION_EVENT_DESCRIPTIONS[event]}
              </span>
            )}
          </span>

          {/* `LEG-11` — o sinal de card travado, e ele existe SÓ recolhido.
              Recolher escondeu a recusa e o banner; sem este sinal, descobrir qual dos quinze está
              travado custaria abrir os quinze. O motivo inteiro vai no nome acessível, não um
              "atenção" genérico: quem usa leitor de tela recebe a mesma informação que quem abre.
              Aberto, o banner e a recusa inline já estão à vista — repetir seria dizer a mesma coisa
              duas vezes na mesma tela. */}
          {!expanded && refusal && (
            <span data-testid={`event-flag-refusal-${event}`} className="shrink-0 text-destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <span className="sr-only">{refusal}</span>
            </span>
          )}
          {!expanded && warnings.length > 0 && (
            <span
              data-testid={`event-flag-warning-${event}`}
              className="shrink-0 text-estrelinha-admin-amber"
            >
              <AlertTriangle className="h-4 w-4" aria-hidden />
              <span className="sr-only">{warnings.map((w) => w.text).join(' ')}</span>
            </span>
          )}

          <ChevronDown
            data-testid={`event-card-chevron-${event}`}
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
              expanded && 'rotate-180',
            )}
            aria-hidden
          />
        </button>

        {/* Irmão do botão, nunca filho — ver a decisão 2 no cabeçalho deste arquivo. */}
        <Switch
          aria-label={nome}
          checked={value.enabled}
          onCheckedChange={onToggle}
          className={SWITCH_TAP_44}
        />
      </div>

      {expanded && (
        <div id={corpoId} className="mt-3.5 space-y-4 border-t border-border pt-3.5">
          {warnings.length > 0 && (
            <InfoBanner
              data-testid={`event-warnings-${event}`}
              role="status"
              action={
                warnings.find((w) => w.action) && (
                  <Link
                    to={warnings.find((w) => w.action)!.action!.to}
                    data-testid={`event-warning-link-${event}`}
                    className="font-semibold underline underline-offset-2"
                  >
                    {warnings.find((w) => w.action)!.action!.label}
                  </Link>
                )
              }
            >
              {warnings.map((warning) => (
                <p key={warning.text}>{warning.text}</p>
              ))}
            </InfoBanner>
          )}

          <FieldGroup
            label="Assunto"
            htmlFor={`${event}-subject`}
            counter={<CharCounter value={fields.subject} limit={COPY_LIMITS.subject} />}
          >
            <Input
              id={`${event}-subject`}
              data-testid={`${event}-subject`}
              value={fields.subject}
              maxLength={COPY_LIMITS.subject + 40}
              onChange={(e) => onFieldChange('subject', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup
            label="Título"
            htmlFor={`${event}-heading`}
            counter={<CharCounter value={fields.heading} limit={COPY_LIMITS.heading} />}
          >
            <Input
              id={`${event}-heading`}
              data-testid={`${event}-heading`}
              value={fields.heading}
              maxLength={COPY_LIMITS.heading + 40}
              onChange={(e) => onFieldChange('heading', e.target.value)}
            />
          </FieldGroup>

          <FieldGroup
            label="Texto principal"
            htmlFor={`${event}-lead`}
            counter={<CharCounter value={fields.lead} limit={COPY_LIMITS.lead} />}
          >
            <Textarea
              id={`${event}-lead`}
              data-testid={`${event}-lead`}
              rows={4}
              value={fields.lead}
              onChange={(e) => onFieldChange('lead', e.target.value)}
            />
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
                <div className="flex justify-end">
                  <CharCounter value={linha} limit={COPY_LIMITS.extraLine} />
                </div>
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

          <FieldGroup
            label="Rótulo do botão"
            htmlFor={`${event}-cta_label`}
            counter={<CharCounter value={fields.cta_label} limit={COPY_LIMITS.ctaLabel} />}
          >
            <Input
              id={`${event}-cta_label`}
              data-testid={`${event}-cta_label`}
              value={fields.cta_label}
              maxLength={COPY_LIMITS.ctaLabel + 40}
              onChange={(e) => onFieldChange('cta_label', e.target.value)}
            />
          </FieldGroup>

          {refusal && (
            <p
              role="alert"
              data-testid={`event-card-refusal-${event}`}
              className="text-xs font-medium text-destructive"
            >
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
      )}
    </div>
  )
}

export default EventCard
