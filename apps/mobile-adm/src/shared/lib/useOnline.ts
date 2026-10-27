import { useEffect, useState } from 'react'

/**
 * Quanto tempo SEM REDE, contínuo, até o app ir para "Sem conexão" (feature `82`, Fase 5, T18 —
 * `BUG-20261026-queda-curta-de-rede-apaga-o-codigo`). Um lugar só: o `<App />` decide por aqui.
 *
 * SPEC_DEVIATION (`MAF-19` da `72`): antes, o primeiro `offline` desmontava a árvore inteira — no balcão
 * do correio, com 4G instável, uma piscada de 1 s fechava a folha e apagava o código que ela estava
 * digitando. Agora uma queda curta não desmonta nada (a escrita que sai sem rede cai em "Não consegui
 * salvar", com "Tentar de novo" onde há o que reenviar); passados 5 s, tudo é como a `72`.
 */
export const CARENCIA_SEM_CONEXAO_MS = 5000

/**
 * `navigator.onLine` como estado do React (feature 72, `MAF-19`/`MAF-21`), com a carência acima.
 *
 * - Lê o valor NA MONTAGEM, sem um primeiro quadro com o estado errado: o app aberto offline nasce na
 *   tela "Sem conexão", nunca no Login seguido de troca (a carência é só para a QUEDA com o app aberto).
 * - `offline` arma a contagem; no fim dela, se o navegador continua sem rede, o estado vira `false`.
 *   `online` desarma a contagem e volta na hora (`MAF-21`) — "contínuos": cair de novo recomeça do zero.
 */
export const useOnline = (): boolean => {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    let contagem: ReturnType<typeof setTimeout> | null = null
    const desarmar = () => {
      if (contagem !== null) clearTimeout(contagem)
      contagem = null
    }
    const aoVoltar = () => {
      desarmar()
      setOnline(true)
    }
    const aoCair = () => {
      if (contagem !== null) return
      contagem = setTimeout(() => {
        contagem = null
        if (!navigator.onLine) setOnline(false)
      }, CARENCIA_SEM_CONEXAO_MS)
    }
    window.addEventListener('online', aoVoltar)
    window.addEventListener('offline', aoCair)
    return () => {
      desarmar()
      window.removeEventListener('online', aoVoltar)
      window.removeEventListener('offline', aoCair)
    }
  }, [])

  return online
}
