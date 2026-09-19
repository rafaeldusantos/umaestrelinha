// Seção **Notificações** — feature 55.
//
// É a única das quatro que mora no widget, e o motivo é de camada: ela monta `NotificationsTab`, que
// vive em `features/notification-settings`. As outras três moram em `features/settings` porque a de
// Vendas monta o `CheckoutSettingsCard` — mesmo slice. Um import lateral entre features é tolerado
// na transição da FSD deste repositório, mas não é para ganhar habitante novo.
//
// O componente da aba entra **sem props e sem invólucro que mude comportamento** (`CFG-07`): ele já
// é autocontido desde a feature 53, com o próprio rascunho, a própria recusa e o próprio
// salvamento. O que se acrescenta aqui é só o cabeçalho que as outras seções ganham do `FormCard` —
// e que esta não pode ganhar, porque o corpo dela já são quinze cards.

import { NotificationsTab } from '@/features/notification-settings'

export const NotificationsSection = () => (
  <div className="space-y-4">
    <div>
      <h2 className="font-heading text-lg font-semibold text-foreground">Notificações</h2>
      <p className="text-sm text-muted-foreground">
        O que a loja e a cliente recebem por e-mail, evento a evento
      </p>
    </div>

    <NotificationsTab />
  </div>
)

export default NotificationsSection
