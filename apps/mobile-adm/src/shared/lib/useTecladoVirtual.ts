import { useEffect, useState } from 'react'

/**
 * Quanto o teclado virtual cobre do fim da tela, em px (feature `75`, `MAA-32`, design §3.9, Q4).
 *
 * `index.html` não tem `interactive-widget`, e no Chrome Android ≥ 108 o teclado SOBREPÕE o conteúdo
 * `fixed` em vez de encolher a página; no iOS Safari ele nunca redimensiona o layout viewport. Os dois
 * encolhem o `visualViewport`, e a diferença `innerHeight − (height + offsetTop)` (piso 0) é o que a
 * folha do rastreio soma ao próprio `bottom` — só ela. O viewport do app NÃO muda: mudar faria a barra
 * de abas subir na busca de Pedidos e no Login.
 *
 * Sem `visualViewport` (navegador antigo, jsdom) ⇒ 0.
 */
const medir = (): number => {
  const vv = typeof window === 'undefined' ? undefined : window.visualViewport
  if (!vv) return 0
  return Math.max(0, Math.round(window.innerHeight - (vv.height + vv.offsetTop)))
}

export const useTecladoVirtual = (): number => {
  const [deslocamento, setDeslocamento] = useState(medir)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const aoMudar = () => setDeslocamento(medir())
    vv.addEventListener('resize', aoMudar)
    vv.addEventListener('scroll', aoMudar)
    aoMudar()
    return () => {
      vv.removeEventListener('resize', aoMudar)
      vv.removeEventListener('scroll', aoMudar)
    }
  }, [])

  return deslocamento
}
