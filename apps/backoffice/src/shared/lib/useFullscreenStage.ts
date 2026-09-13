// A tela cheia do palco da prévia — feature 47.
//
// **É um modo do palco, não uma segunda prévia.** O que muda é CSS na `<section>` que já existe:
// nada de portal, e por isso nada reparenta o `<iframe>`. Reparentar faria o React remontá-lo, o
// documento da loja recarregaria e o rascunho já entregue pela ponte se perderia — que é o defeito
// que `PRV-13` já custou uma vez.
//
// Mora em `shared/lib` porque os DOIS palcos precisam dela (`home-composition` e `store-menu`), e
// `features/` não importa de `features/`. Precedente literal: `BL-009`, quando `uploadImageBlob`
// fez o mesmo caminho pelo mesmo motivo.

import { useCallback, useEffect, useState } from 'react'

/**
 * As classes do modo cheio.
 *
 * Moram aqui para os dois palcos **não poderem divergir** na medida — que é exatamente a forma do
 * defeito que esta feature apagou em `previewFrame` (duas `FOLGA = 40`, uma em cada palco).
 */
export const FULLSCREEN_CLASSES = 'fixed inset-0 z-50 rounded-none border-0'

export const useFullscreenStage = () => {
  const [cheia, setCheia] = useState(false)

  const entrar = useCallback(() => setCheia(true), [])
  const sair = useCallback(() => setCheia(false), [])

  useEffect(() => {
    // O ouvinte só existe enquanto o modo está ligado: um listener global permanente por palco
    // significaria dois `keydown` no documento em toda tela do painel, para nada.
    if (!cheia) return

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setCheia(false)
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [cheia])

  return { cheia, entrar, sair, classes: cheia ? FULLSCREEN_CLASSES : '' }
}
