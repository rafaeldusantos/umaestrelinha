// As duas peças que os cards de Configurações repetem — feature 55.
//
// O `SaveButton` é o MESMO que morava dentro da `AdminSettingsPage` e servia às seis abas que ela
// desenhava à mão; ele mudou de casa junto com elas. `CheckoutSettingsCard` e `NotificationsTab`
// continuam com os seus, porque unificar o salvamento está na tabela *Out of Scope* da spec: os dois
// têm recusa própria, e mexer nisso é refatorar código adjacente a dinheiro numa feature de
// navegação.
//
// O estado de carga mudou de ALCANCE, e isso é de propósito. Antes ele trocava a tela inteira —
// cabeçalho incluso — por um spinner. Agora o rail é navegação, e piscá-lo a cada carga seria pior
// do que não tê-lo; a *Edge Case* da spec pede o carregando "antes de desenhar os cards", que é
// exatamente onde ele passa a ficar.

import { Loader2, Save } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'

export const SettingsSaveButton = ({
  loading,
  onClick,
  testId,
}: {
  loading: boolean
  onClick: () => void
  /**
   * Um por card. Sem ele, dois cards na mesma seção deixam as asserções procurando o botão por
   * POSIÇÃO — e a posição muda quando um card entra no meio, sem nada avisar.
   */
  testId: string
}) => (
  <div className="pt-2">
    <Button
      onClick={onClick}
      data-testid={testId}
      disabled={loading}
      /* `h-11` — o `<Button>` padrão é `h-10` (40px), abaixo do piso de alvo de toque, e este é
         um controle de seção que `CFG-14` nomeia. O `NotificationsTab` já usava `h-11` no dele. */
      className="h-11 rounded-xl gradient-cta text-white transition-all hover:scale-[1.02] hover:brightness-110"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Save className="mr-2 h-4 w-4" />
      )}
      Salvar alterações
    </Button>
  </div>
)

export const SettingsLoading = () => (
  <div
    data-testid="settings-carregando"
    className="flex h-64 items-center justify-center text-muted-foreground"
  >
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações…
  </div>
)
