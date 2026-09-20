// A seção Notificações inteira — feature 53 (T11), redesenhada pela 56.
//
// ## O que ela é dona
//
// Três estados locais, e os três existem aqui pelo MESMO motivo: nenhum deles se expressa dentro de
// um card.
//
// | Estado | A regra que ele carrega |
// | --- | --- |
// | `aberto` | no máximo **um** card aberto por vez (`LEG-06`) |
// | `preview` | no máximo **uma** prévia por vez — 15 `<iframe>` simultâneos era o desenho recusado |
// | `orderId` | o mesmo pedido vale para a prévia de **qualquer** card (`ABN-07`) |
//
// `LEG-10` (fechar o card fecha a prévia) cai de graça porque `abrir()` zera os dois na mesma
// função — não são dois `useEffect` se observando.
//
// `LEG-07` (fechar não descarta a edição) **já era verdade** e agora é medido: o rascunho é de
// `useNotificationsDraft`, e o card nunca o teve. Sem asserção, nada impediria a próxima feature de
// mover um campo para dentro do card e perder o texto ao recolher, com tudo verde.
//
// ## O cabeçalho da seção mora aqui desde a 56
//
// Ele era de `NotificationsSection` (widget), que existia **só** para desenhá-lo. `LEG-18` põe o
// campo "Pedido para a prévia" na mesma linha do título — e o campo é estado daqui. Dono da linha
// passou a ser quem tem o estado, e aquele arquivo foi apagado em vez de virar um invólucro vazio.
//
// ## O que NÃO mudou, e depende de não mudar
//
// `useNotificationsDraft` continua sendo o único dono do estado daqui, e `ABN-12` (trocar de seção
// descarta a edição não salva) continua sendo propriedade da ÁRVORE: a `AdminSettingsPage` monta só
// o painel da seção ativa, este componente remonta, e o rascunho volta a refletir o servidor. Se
// alguém trocar aquela montagem condicional por quatro painéis escondidos com CSS, é aqui que
// quebra — o rascunho sobrevive à troca, e nada acusa.

import { useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { useToast } from '@estrelinha/ui/hooks/use-toast'
import { FieldGroup, SettingsSaveButton } from '@/shared/ui'
import { useGeneralSettings, useMaterialSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { MATERIAL_INSTRUCTIONS_EVENT, type NotificationEvent } from '@estrelinha/core/notifications'

import { SETTINGS_SECTIONS, settingsSectionPath } from '@/shared/lib/settingsSections'

import { NOTIFICATION_SECTIONS, SECTION_LABELS, groupedEvents } from '../model/sections'
import { adminUrlLooksLocal, materialAddressMissing } from '../model/preconditions'
import { useNotificationsDraft } from '../model/useNotificationsDraft'
import { useNotificationConfigCheck } from '../api/checkNotificationConfig'
import { previewNotification, type PreviewNotificationResult } from '../api/previewNotification'
import { EventCard, type EventWarning } from './EventCard'

/**
 * A seção de Configurações onde o endereço do ateliê se resolve — feature 55 (`CFG-20`, `CFG-21`).
 *
 * Sai do registro, e não escrita aqui: o rótulo e o caminho têm um dono só, e uma cópia aqui
 * passaria a mandar a Adri para uma seção que mudou de nome.
 */
const SECAO_DO_MATERIAL = SETTINGS_SECTIONS.find((s) => s.slug === 'frete-e-material')!

/** ABN-08 — informativo, aparece mesmo com o evento desligado (o bloqueio de verdade é `refusalFor`). */
const MATERIAL_ADDRESS_WARNING = `O endereço do ateliê ainda não foi preenchido na seção ${SECAO_DO_MATERIAL.label} — o texto usa {{endereco_atelie}}, que sairia em branco.`

/** ABN-09 — os dois avisos "para você" têm textos DISTINTOS (spec, AC 9). */
const OWNER_EMAIL_MISSING_WARNING =
  'Nenhum e-mail cadastrado para você em Configurações → Dados da loja — este aviso não tem para onde ir.'
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
  /** `LEG-05` — nenhum card aberto na montagem. Os quinze cabem numa tela, e a Adri escolhe um. */
  const [aberto, setAberto] = useState<NotificationEvent | null>(null)
  // ABN-07 — "ver prévia" sem pedido usa o exemplo (sample: true); com um `order_id` real aqui, a
  // prévia reflete os dados daquele pedido. Campo de texto simples, sem busca (design.md, Tech
  // Decisions: "resolveria um problema que a spec não pede"), compartilhado pelos 15 cards — a Adri
  // digita uma vez e confere vários eventos contra o MESMO pedido.
  const [orderId, setOrderId] = useState('')

  const sections = groupedEvents()

  /**
   * `LEG-06` e `LEG-10` na mesma função, de propósito: trocar de card fecha o anterior **e** a
   * prévia dele. Escrito em dois lugares — um `useEffect` observando `aberto` para zerar `preview` —
   * as duas regras poderiam divergir, e a prévia de um card fechado continuaria no ar.
   */
  const alternarCard = (event: NotificationEvent) => {
    setAberto((atual) => (atual === event ? null : event))
    setPreview(null)
  }

  const warningsFor = (event: NotificationEvent): EventWarning[] => {
    const list: EventWarning[] = []
    if (event === MATERIAL_INSTRUCTIONS_EVENT && materialAddressMissing(material)) {
      // `CFG-21` — a mensagem não só nomeia a seção: ela leva até lá. O banner comporta link, e é
      // exatamente quando a Adri está travada que ela precisa do caminho, não da instrução.
      list.push({
        text: MATERIAL_ADDRESS_WARNING,
        action: {
          to: settingsSectionPath(SECAO_DO_MATERIAL.slug),
          label: 'Preencher',
        },
      })
    }
    // "Avisos para você" já É a lista de eventos de audiência `owner` (`sections.owner`, derivada
    // por `groupedEvents()` — `model/sections.ts`). Reusar em vez de uma segunda lista aqui evita
    // tanto o "defeito 01" (duas classificações que podem divergir) quanto literais de nome de
    // evento em `apps/**`, que `notificationSingleOwner.test.ts` (feature 42, suíte da loja) proíbe.
    if (sections.owner.includes(event)) {
      if (general.email.trim() === '') list.push({ text: OWNER_EMAIL_MISSING_WARNING })
      if (configCheck && adminUrlLooksLocal(configCheck.adminPublicUrl)) {
        list.push({ text: OWNER_ADMIN_URL_LOCAL_WARNING })
      }
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
    <div className="space-y-5" data-testid="notifications-tab">
      {/* `LEG-18` — título e campo na mesma linha a partir de `lg`; empilhados abaixo dela. As duas
          metades são CSS numa árvore só, nunca dois blocos alternados por largura de janela: dois
          blocos seriam dois campos, e o texto digitado num não existiria no outro. */}
      <div
        data-testid="notifications-header"
        className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6"
      >
        {/* `hidden lg:block` — achado em navegador real, em 390px: o cabeçalho de voltar do celular
            (`PageHeader` com `backTo`, na `AdminSettingsPage`) JÁ escreve "Notificações" e descreve a
            seção, então este bloco imprimia o nome da seção **duas vezes seguidas**, com duas
            descrições diferentes, antes do primeiro evento.

            É a mesma alternância que o resto da tela usa: no desktop o `PageHeader` diz
            "Configurações" e quem nomeia a seção é este título; no celular quem nomeia é o
            cabeçalho de voltar. Uma árvore só, decidida por classe `lg:` — medir a janela em
            JavaScript entregaria um primeiro quadro errado.

            O campo ao lado NÃO some junto: ele é controle, não título, e não tem duplicata. */}
        <div className="hidden min-w-0 lg:block">
          <h2 className="font-heading text-lg font-semibold text-foreground">Notificações</h2>
          <p className="text-sm text-muted-foreground">
            O que a loja e a cliente recebem por e-mail, evento a evento
          </p>
        </div>

        <div className="lg:w-[260px] lg:shrink-0">
          <FieldGroup
            label="Pedido para a prévia (opcional)"
            htmlFor="notifications-preview-order-id"
            hint="Cole o ID de um pedido real para ver os dados dele. Vazio usa um exemplo."
          >
            <Input
              id="notifications-preview-order-id"
              data-testid="notifications-preview-order-id"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              placeholder="ID do pedido (UUID)"
            />
          </FieldGroup>
        </div>
      </div>

      {NOTIFICATION_SECTIONS.map((section) => {
        const eventos = sections[section]

        return (
          <section key={section} data-testid={`notifications-section-${section}`} className="space-y-2.5">
            {/* `LEG-17` — a contagem é DERIVADA da lista. Cravada à mão, ela mente no dia em que a
                feature 43 acrescentar um evento, e mente em silêncio.
                A voz (11px, caixa alta, espaçada, tom de apoio) é a mesma do sobrescrito "SEÇÕES" do
                rail, ao lado — a tela reusando o que já tinha, em vez de inventar um terceiro nível
                de título. */}
            <div className="flex items-baseline justify-between gap-3 pt-1">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {SECTION_LABELS[section]}
              </h3>
              <span
                data-testid={`notifications-count-${section}`}
                className="shrink-0 text-xs text-muted-foreground"
              >
                {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
              </span>
            </div>

            <div className="space-y-2.5">
              {eventos.map((event) => {
                const activePreview = preview && preview.event === event ? preview : null
                const previewActive = activePreview !== null
                const previewLoading = activePreview?.loading ?? false
                const previewResult = activePreview?.result
                const previewError =
                  previewResult && 'error' in previewResult ? previewResult.error : undefined
                const previewData =
                  previewResult && !('error' in previewResult) ? previewResult : undefined

                return (
                  <EventCard
                    key={event}
                    event={event}
                    value={draftState.draft[event]}
                    onFieldChange={(field, fieldValue) => draftState.setField(event, field, fieldValue)}
                    onToggle={(enabled) => draftState.setEnabled(event, enabled)}
                    refusal={draftState.refusalFor(event)}
                    warnings={warningsFor(event)}
                    expanded={aberto === event}
                    onToggleExpanded={() => alternarCard(event)}
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
        )
      })}

      <div className="border-t border-border pt-2">
        <SettingsSaveButton
          testId="notifications-save"
          loading={draftState.isSaving}
          disabled={!draftState.canSave}
          onClick={() => void handleSave()}
        />
      </div>
    </div>
  )
}

export default NotificationsTab
