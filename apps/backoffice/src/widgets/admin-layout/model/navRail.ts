// A preferência do trilho — feature 47.
//
// **O que se guarda é o override, nunca o padrão.** Só o valor `'expandido'` vai para o
// `localStorage`; recolher de volta **apaga a chave**. É a lição de `navCollapse.ts` aplicada ao
// inverso: guardando o que DIFERE do padrão, a ausência de valor significa sempre "siga o padrão da
// rota" — e no dia em que o padrão mudar, ele muda para todo mundo que nunca mexeu.
//
// A chave é **outra** e o módulo é **outro** (`FOCO-11`): `estrelinha.admin.nav-collapsed` continua
// sendo a preferência de quais grupos estão colapsados, e vale no estado expandido. São duas
// preferências, cada uma com o seu dono; lê-las juntas faria um botão mexer no que o outro guarda.

import { useCallback, useState } from 'react'

export const STORAGE_KEY = 'estrelinha.admin.nav-rail'

/** O único valor que a chave aceita. Qualquer outro lê como ausente. */
const VALOR_EXPANDIDO = 'expandido'

/**
 * A pessoa pediu a navegação expandida?
 *
 * `true` **somente** com o valor exato. Lixo gravado por versão antiga, por outra aba ou à mão cai
 * no padrão em vez de virar um terceiro estado — o mesmo descarte que `readCollapsed` faz.
 *
 * `try/catch` mudo porque `localStorage` **lança** em aba anônima com política de site e sob cota:
 * preferência de tela não pode derrubar a navegação inteira.
 */
export const readExpanded = (storage: Storage): boolean => {
  try {
    return storage.getItem(STORAGE_KEY) === VALOR_EXPANDIDO
  } catch {
    return false
  }
}

/**
 * O estado do trilho.
 *
 * `recolhido = focus && !expandido` — fora de uma rota de foco a preferência continua guardada, mas
 * **não tem efeito**: `/admin/produtos` mostra a sidebar de sempre, sem nem oferecer o controle
 * (`FOCO-07`). É o que faz a preferência ser de pessoa, e não de visita.
 */
export const useNavRail = (focus: boolean, storage: Storage = window.localStorage) => {
  const [expandido, setExpandido] = useState<boolean>(() => readExpanded(storage))

  const alternar = useCallback(() => {
    setExpandido(atual => {
      const proximo = !atual
      try {
        if (proximo) storage.setItem(STORAGE_KEY, VALOR_EXPANDIDO)
        else storage.removeItem(STORAGE_KEY)
      } catch {
        // Cota estourada ou storage bloqueado: o estado em memória ainda alterna, e a sessão segue.
      }
      return proximo
    })
  }, [storage])

  return { recolhido: focus && !expandido, alternar }
}
