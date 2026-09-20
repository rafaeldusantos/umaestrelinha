// O estado de carga que os cards de Configurações repetem — feature 55.
//
// **O `SettingsSaveButton` saiu daqui na feature 56.** Ele era a peça irmã desta, e a mesma string
// de classes estava escrita em três arquivos de Configurações — um deles sem o `h-11`, então já
// tinha divergido. `LEG-20` (largura cheia no celular) teria de ser escrita nas três. Ele mora agora
// em `shared/ui/SettingsSaveButton.tsx`, que é a camada que `features/notification-settings` também
// alcança: ela é **outra feature**, e import lateral entre features não é para ganhar habitante novo.
//
// Este ficou onde estava porque só as três seções de `features/settings` o usam — mudá-lo de casa
// seria movimento sem consumidor novo.
//
// O estado de carga mudou de ALCANCE na 55, e isso é de propósito. Antes ele trocava a tela inteira
// — cabeçalho incluso — por um spinner. Agora o rail é navegação, e piscá-lo a cada carga seria pior
// do que não tê-lo; a *Edge Case* da spec pede o carregando "antes de desenhar os cards", que é
// exatamente onde ele passa a ficar.

import { Loader2 } from 'lucide-react'

export const SettingsLoading = () => (
  <div
    data-testid="settings-carregando"
    className="flex h-64 items-center justify-center text-muted-foreground"
  >
    <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando configurações…
  </div>
)
