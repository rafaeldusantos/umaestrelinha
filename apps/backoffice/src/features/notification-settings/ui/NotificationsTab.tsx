// Feature 53 (T11) — a aba inteira: as três seções derivadas (T03), um `EventCard` (T10) por evento,
// um preview ativo por vez (abrir um fecha o anterior — design.md, Risks & Concerns) e o
// `SaveButton` único da aba, no mesmo molde das outras 7 (`AdminSettingsPage.tsx`).
//
// `useNotificationsDraft` (T06) é o único dono do estado da aba: este componente só o consome. É
// isso que faz `ABN-12` (descartar edição não salva) funcionar de graça — o componente remonta ao
// trocar de aba (Radix desmonta `TabsContent` inativo), o hook nasce de novo, e o rascunho volta a
// refletir o servidor.

import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { FieldGroup } from '@/shared/ui'
import { useGeneralSettings, useMaterialSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { MATERIAL_INSTRUCTIONS_EVENT, type NotificationEvent } from '@estrelinha/core/notifications'

import { NOTIFICATION_SECTIONS, SECTION_LABELS, groupedEvents } from '../model/sections'
import { adminUrlLooksLocal, materialAddressMissing } from '../model/preconditions'
import { useNotificationsDraft } from '../model/useNotificationsDraft'
import { useNotificationConfigCheck } from '../api/checkNotificationConfig'
import { previewNotification, type PreviewNotificationResult } from '../api/previewNotification'
import { EventCard } from './EventCard'

/** ABN-08 — informativo, aparece mesmo com o evento desligado (o bloqueio de verdade é `refusalFor`). */
const MATERIAL_ADDRESS_WARNING =
  'O endereço do ateliê ainda não foi preenchido na aba Material — o texto usa {{endereco_atelie}}, que sairia em branco.'

/** ABN-09 — os dois avisos "para você" têm textos DISTINTOS (spec, AC 9). */
const OWNER_EMAIL_MISSING_WARNING =
  'Nenhum e-mail cadastrado para você em Configurações → Geral — este aviso não tem para onde ir.'
const OWNER_ADMIN_URL_LOCAL_WARNING =
  'O endereço do painel configurado no servidor não parece ser o de produção — o link {{link_pedido_admin}} pode sair quebrado.'

/**
 * NÃO é união discriminada por `loading: true | false` — com `strictNullChecks: false` esse tipo de
 * literal booleano **não estreita** (`CLAUDE.md` raiz, seção *Convenções*), e `activePreview.result`
 * ficaria inalcançável mesmo depois de checar `!activePreview.loading`. `result` opcional é o que
 * funciona no modo deste projeto.
 */
interface PreviewState {
  event: NotificationEvent
  loading: boolean
  result?: PreviewNotificationResult | { error: string }
}

export function NotificationsTab() {
  const draftState = useNotificationsDraft()
  const material = useMaterialSettings()
  const general = useGeneralSettings()
  const configCheck = useNotificationConfigCheck()
  const { toast } = useToast()
  const [preview, setPreview] = useState<PreviewState | null>(null)
  // ABN-07 — "ver prévia" sem pedido usa o exemplo (sample: true); com um `order_id` real aqui, a
  // prévia reflete os dados daquele pedido. Campo de texto simples, sem busca (design.md, Tech
  // Decisions: "resolveria um problema que a spec não pede"), compartilhado pelos 15 cards — a Adri
  // digita uma vez e confere vários eventos contra o MESMO pedido.
  const [orderId, setOrderId] = useState('')

  const sections = groupedEvents()

  const warningsFor = (event: NotificationEvent): string[] => {
    const list: string[] = []
    if (event === MATERIAL_INSTRUCTIONS_EVENT && materialAddressMissing(material)) {
      list.push(MATERIAL_ADDRESS_WARNING)
    }
    // "Avisos para você" já É a lista de eventos de audiência `owner` (`sections.owner`, derivada
    // por `groupedEvents()` — `model/sections.ts`). Reusar em vez de uma segunda lista aqui evita
    // tanto o "defeito 01" (duas classificações que podem divergir) quanto literais de nome de
    // evento em `apps/**`, que `notificationSingleOwner.test.ts` (feature 42, suíte da loja) proíbe.
    if (sections.owner.includes(event)) {
      if (general.email.trim() === '') list.push(OWNER_EMAIL_MISSING_WARNING)
      if (configCheck && adminUrlLooksLocal(configCheck.adminPublicUrl)) list.push(OWNER_ADMIN_URL_LOCAL_WARNING)
    }
    return list
  }

  const togglePreview = async (event: NotificationEvent) => {
    if (preview?.event === event) {
      setPreview(null)
      return
    }
    setPreview({ event, loading: true })
    const result = await previewNotification({
      event,
      draft: draftState.draft[event].fields,
      orderId: orderId.trim() || undefined,
    })
    // A resposta pode chegar depois de a Adri já ter trocado de card — só aplica se ainda for o
    // evento pedido.
    setPreview((atual) => (atual?.event === event ? { event, loading: false, result } : atual))
  }

  const handleSave = async () => {
    const ok = await draftState.save()
    if (!ok) {
      toast({
        title: 'Não foi possível salvar',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6" data-testid="notifications-tab">
      <FieldGroup
        label="Pedido para a prévia (opcional)"
        htmlFor="notifications-preview-order-id"
        hint="Cole o ID de um pedido real para ver os dados dele na prévia. Vazio usa um pedido de exemplo."
      >
        <Input
          id="notifications-preview-order-id"
          data-testid="notifications-preview-order-id"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="ID do pedido (UUID)"
          className="max-w-sm"
        />
      </FieldGroup>

      {NOTIFICATION_SECTIONS.map((section) => (
        <section key={section} data-testid={`notifications-section-${section}`} className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{SECTION_LABELS[section]}</h2>
          <div className="space-y-3">
            {sections[section].map((event) => {
              const activePreview = preview && preview.event === event ? preview : null
              const previewActive = activePreview !== null
              const previewLoading = activePreview?.loading ?? false
              const previewResult = activePreview?.result
              const previewError = previewResult && 'error' in previewResult ? previewResult.error : undefined
              const previewData = previewResult && !('error' in previewResult) ? previewResult : undefined

              return (
                <EventCard
                  key={event}
                  event={event}
                  value={draftState.draft[event]}
                  onFieldChange={(field, fieldValue) => draftState.setField(event, field, fieldValue)}
                  onToggle={(enabled) => draftState.setEnabled(event, enabled)}
                  refusal={draftState.refusalFor(event)}
                  warnings={warningsFor(event)}
                  onTogglePreview={() => void togglePreview(event)}
                  previewActive={previewActive}
                  preview={{
                    loading: previewLoading,
                    error: previewError,
                    subject: previewData?.subject,
                    html: previewData?.html,
                    text: previewData?.text,
                    sample: previewData?.sample,
                  }}
                />
              )
            })}
          </div>
        </section>
      ))}

      <div className="flex justify-end border-t border-border pt-4">
        <Button
          type="button"
          data-testid="notifications-save"
          onClick={() => void handleSave()}
          disabled={!draftState.canSave || draftState.isSaving}
          className="h-11 rounded-xl gradient-cta text-white transition-all hover:scale-[1.02] hover:brightness-110"
        >
          {draftState.isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Save className="mr-2 h-4 w-4" aria-hidden />
          )}
          Salvar alterações
        </Button>
      </div>
    </div>
  )
}

export default NotificationsTab
