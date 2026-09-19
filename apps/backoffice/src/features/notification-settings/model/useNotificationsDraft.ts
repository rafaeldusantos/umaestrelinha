// Feature 53 (T06) — o estado da aba INTEIRA, não por card (`ABN-13`: `useUpdateSettings` faz
// `upsert` da chave inteira, então salvar precisa sempre carregar os 15 eventos).
//
// `refusalFor` delega 100% para `notificationDraftRefusal` (T01, `core/notifications`) — nenhuma
// cópia local da composição variável→tom→tamanho. O único acréscimo é o gate de material (T04),
// que é regra de UM consumidor (esta aba) e por isso não migrou para `core`.

import { useEffect, useRef, useState } from 'react'
import {
  MATERIAL_INSTRUCTIONS_EVENT,
  NOTIFICATION_EVENTS,
  notificationDraftRefusal,
  resolveAllEventSettings,
  type EmailFields,
  type EventChannelSettings,
  type NotificationEvent,
} from '@estrelinha/core/notifications'
import {
  useMaterialSettings,
  useNotificationSettings,
  useUpdateSettings,
} from '@estrelinha/core/hooks/useStoreSettings'

import { materialAddressMissing } from './preconditions'
import { buildNotificationsValue } from './notificationsWrite'

export type NotificationsDraft = Record<NotificationEvent, EventChannelSettings<EmailFields>>

export interface UseNotificationsDraft {
  draft: NotificationsDraft
  setField: (event: NotificationEvent, field: keyof EmailFields, value: string | string[]) => void
  setEnabled: (event: NotificationEvent, value: boolean) => void
  refusalFor: (event: NotificationEvent) => string | null
  canSave: boolean
  isSaving: boolean
  isDirty: boolean
  save: () => Promise<boolean>
}

/** ABN-08 — a mensagem nomeia o campo ausente e aponta para a aba onde ele se resolve (molde de `FRG-12`). */
const MATERIAL_ADDRESS_REFUSAL =
  'O endereço do ateliê está vazio — preencha o logradouro na aba Material antes de ligar este aviso.'

export function useNotificationsDraft(): UseNotificationsDraft {
  const notifications = useNotificationSettings()
  const material = useMaterialSettings()
  const update = useUpdateSettings()

  const [draft, setDraft] = useState<NotificationsDraft>(() => resolveAllEventSettings(notifications, 'email'))
  const [isDirty, setIsDirty] = useState(false)
  // Ref porque o efeito abaixo não pode depender de `isDirty` sem se disparar a cada edição — só
  // precisa da checagem no instante em que `notifications` muda.
  const isDirtyRef = useRef(false)

  useEffect(() => {
    // Não pisa em edição pendente: se um refetch (staleTime) chegar no meio de a Adri digitando, o
    // rascunho dela não pode sumir. A próxima ABERTURA da aba (remonte, sem isDirty) volta a
    // refletir o servidor — é o que faz `ABN-12` (descartar sem salvar) funcionar de graça: o
    // componente remonta, este hook nasce de novo, `isDirtyRef` começa `false`.
    if (isDirtyRef.current) return
    setDraft(resolveAllEventSettings(notifications, 'email'))
  }, [notifications])

  const setField = (event: NotificationEvent, field: keyof EmailFields, value: string | string[]) => {
    isDirtyRef.current = true
    setIsDirty(true)
    setDraft((prev) => ({
      ...prev,
      [event]: { ...prev[event], fields: { ...prev[event].fields, [field]: value } },
    }))
  }

  const setEnabled = (event: NotificationEvent, value: boolean) => {
    isDirtyRef.current = true
    setIsDirty(true)
    setDraft((prev) => ({ ...prev, [event]: { ...prev[event], enabled: value } }))
  }

  const refusalFor = (event: NotificationEvent): string | null => {
    const composicao = notificationDraftRefusal(event, 'email', draft[event].fields)
    if (composicao) return composicao

    if (event === MATERIAL_INSTRUCTIONS_EVENT && draft[event].enabled && materialAddressMissing(material)) {
      return MATERIAL_ADDRESS_REFUSAL
    }

    return null
  }

  const canSave = NOTIFICATION_EVENTS.every((event) => refusalFor(event) === null)

  const save = async (): Promise<boolean> => {
    if (!canSave) return false
    const value = buildNotificationsValue(draft, notifications.post_delivery_days)
    try {
      await update.mutateAsync({ key: 'notifications', value })
      isDirtyRef.current = false
      setIsDirty(false)
      return true
    } catch {
      return false
    }
  }

  return {
    draft,
    setField,
    setEnabled,
    refusalFor,
    canSave,
    isSaving: update.isPending,
    isDirty,
    save,
  }
}
