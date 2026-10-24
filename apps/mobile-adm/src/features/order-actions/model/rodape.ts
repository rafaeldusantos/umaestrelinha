import { useSyncExternalStore } from 'react'

import { ALTURA_MINIMA_DO_RODAPE, VAR_ALTURA_DO_RODAPE } from '@/shared/ui/alturas'

/**
 * Há um rodapé de ação montado? (feature `75`, `MAA-31`; design §3.6.)
 *
 * O host da confirmação (`AvisoDaAcao`, no layout) sobe acima do rodapé só quando há rodapé — e os dois
 * moram em lugares diferentes da árvore (o layout × a página do pedido). Um contador em MÓDULO, no
 * molde de `travas.ts`, liga os dois sem prop nem contexto.
 *
 * A ALTURA do rodapé vai à variável CSS da raiz do documento (`--altura-do-rodape`): ele a mede, e a
 * reserva do detalhe e o aviso a leem. Sem rodapé, a variável sai — e as leituras caem no piso.
 */
let montados = 0
const ouvintes = new Set<() => void>()
const avisar = () => ouvintes.forEach((f) => f())
const assinar = (f: () => void) => {
  ouvintes.add(f)
  return () => {
    ouvintes.delete(f)
  }
}

/** O rodapé entrou: conta, e publica o piso até ele se medir. Devolve a saída. */
export const registrarRodape = (): (() => void) => {
  montados += 1
  if (montados === 1) document.documentElement.style.setProperty(VAR_ALTURA_DO_RODAPE, ALTURA_MINIMA_DO_RODAPE)
  avisar()
  return () => {
    montados = Math.max(0, montados - 1)
    if (montados === 0) document.documentElement.style.removeProperty(VAR_ALTURA_DO_RODAPE)
    avisar()
  }
}

/** A altura medida do rodapé, em px (a fonte do sistema e a frase de erro a mudam). */
export const publicarAlturaDoRodape = (px: number): void => {
  if (montados === 0 || !(px > 0)) return
  document.documentElement.style.setProperty(VAR_ALTURA_DO_RODAPE, `${Math.ceil(px)}px`)
}

export const useHaRodape = (): boolean => useSyncExternalStore(assinar, () => montados > 0)
