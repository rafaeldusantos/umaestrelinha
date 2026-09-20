// O botão de salvar de Configurações — feature 56 (`LEG-20`), com um dono só.
//
// ## Por que ele mudou de casa
//
// A **mesma string de classes** estava escrita em três arquivos de Configurações:
// `features/settings/ui/settingsParts.tsx`, `features/notification-settings/ui/NotificationsTab.tsx`
// e `features/settings/ui/CheckoutSettingsCard.tsx` (esta sem o `h-11`, que é o piso de alvo de
// toque — as duas já tinham divergido).
//
// `LEG-20` pede largura cheia no celular. Escrita nos três, ela nasceria com duas chances de ficar
// para trás; e o próximo card de Configurações seria a quarta cópia.
//
// ## Por que `shared/ui` e não `features/settings`
//
// Porque um dos três chamadores é `features/notification-settings`, que é **outra feature** — o
// cabeçalho de `NotificationsSection` já registrava que import lateral entre features "não é para
// ganhar habitante novo". `shared/` é a camada que as duas alcançam.
//
// `SettingsLoading` **não** veio junto: só as três seções de `features/settings` o usam, e mudá-lo
// de casa seria movimento sem consumidor novo.

import { Loader2, Save } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'

interface Props {
  loading: boolean
  onClick: () => void
  /**
   * Um por card. Sem ele, dois cards na mesma seção deixam as asserções procurando o botão por
   * POSIÇÃO — e a posição muda quando um card entra no meio, sem nada avisar.
   */
  testId: string
  /**
   * Desabilitado por outro motivo que não a gravação em curso — a `NotificationsTab` desabilita
   * enquanto **algum** dos 15 textos viola uma régua de `core` (`!canSave`).
   *
   * Opcional e aditivo: os três chamadores anteriores a esta feature não passam nada e continuam
   * desabilitando só durante a gravação.
   */
  disabled?: boolean
}

export const SettingsSaveButton = ({ loading, onClick, testId, disabled }: Props) => (
  <div className="pt-2">
    <Button
      onClick={onClick}
      data-testid={testId}
      disabled={loading || disabled}
      /* `h-11` — o `<Button>` padrão é `h-10` (40px), abaixo do piso de alvo de toque, e este é um
         controle de seção que `CFG-14` nomeia.

         `w-full sm:w-auto` — `LEG-20`. No celular o botão é a última coisa da seção e divide a
         linha com nada; largura cheia dá o alvo mais generoso possível justamente onde o dedo é o
         ponteiro. A partir de `sm` ele volta a medir o próprio rótulo, porque uma faixa de 700px
         para "Salvar alterações" seria peso sem função. */
      className="h-11 w-full rounded-xl gradient-cta text-white transition-all hover:scale-[1.02] hover:brightness-110 motion-reduce:transition-none motion-reduce:hover:scale-100 sm:w-auto"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Save className="mr-2 h-4 w-4" aria-hidden />
      )}
      Salvar alterações
    </Button>
  </div>
)

export default SettingsSaveButton
