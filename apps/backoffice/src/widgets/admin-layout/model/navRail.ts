// A preferência do trilho — feature 47, revista em 2026-10-28.
//
// **O botão de recolher existe em TODA tela** (a 47 o oferecia só nas rotas de foco, `FOCO-07`).
// Isso obrigou a preferência a guardar a escolha nos dois sentidos: com o botão só nas rotas de foco,
// o único override possível era "expandido", e recolher podia apagar a chave; agora recolher em
// `/admin/produtos` precisa ser lembrado, e apagar a chave ali devolveria a sidebar aberta.
//
// **A ausência de valor continua significando "siga o padrão da rota"**: rota de foco abre
// recolhida, as demais abertas. Quem nunca mexeu continua acompanhando o padrão; quem escolheu, leva
// a escolha para todas as telas — é preferência de pessoa, não de visita nem de rota.
//
// A chave é **outra** e o módulo é **outro** (`FOCO-11`): `estrelinha.admin.nav-collapsed` continua
// sendo a preferência de quais grupos estão colapsados, e vale no estado expandido. São duas
// preferências, cada uma com o seu dono; lê-las juntas faria um botão mexer no que o outro guarda.

import { useCallback, useState } from 'react'

export const STORAGE_KEY = 'estrelinha.admin.nav-rail'

export type NavRailChoice = 'expandido' | 'recolhido'

/**
 * A escolha gravada, ou `null` (siga o padrão da rota).
 *
 * Só os dois valores exatos contam. Lixo gravado por versão antiga, por outra aba ou à mão cai no
 * padrão em vez de virar um terceiro estado — o mesmo descarte que `readCollapsed` faz.
 *
 * `try/catch` mudo porque `localStorage` **lança** em aba anônima com política de site e sob cota:
 * preferência de tela não pode derrubar a navegação inteira.
 */
export const readChoice = (storage: Storage): NavRailChoice | null => {
  try {
    const valor = storage.getItem(STORAGE_KEY)
    return valor === 'expandido' || valor === 'recolhido' ? valor : null
  } catch {
    return null
  }
}

/** Recolhido? A escolha gravada vence; sem ela, rota de foco recolhe e as demais não. */
export const isRailCollapsed = (choice: NavRailChoice | null, focus: boolean): boolean =>
  choice === null ? focus : choice === 'recolhido'

/** O estado do trilho, e o botão que alterna — oferecido em toda rota. */
export const useNavRail = (focus: boolean, storage: Storage = window.localStorage) => {
  const [choice, setChoice] = useState<NavRailChoice | null>(() => readChoice(storage))
  const recolhido = isRailCollapsed(choice, focus)

  const alternar = useCallback(() => {
    const proximo: NavRailChoice = recolhido ? 'expandido' : 'recolhido'
    try {
      storage.setItem(STORAGE_KEY, proximo)
    } catch {
      // Cota estourada ou storage bloqueado: o estado em memória ainda alterna, e a sessão segue.
    }
    setChoice(proximo)
  }, [recolhido, storage])

  return { recolhido, alternar }
}
