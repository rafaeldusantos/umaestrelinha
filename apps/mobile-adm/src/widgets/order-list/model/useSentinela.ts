import { useEffect, useRef, useState } from 'react'

/**
 * Quanto ANTES do fim a próxima página começa a carregar (`MAP-13`: "perto do fim, sem botão"): a
 * sentinela conta como visível 600 px antes de entrar na tela — umas seis linhas no celular.
 */
export const MARGEM_DA_SENTINELA = '0px 0px 600px 0px'

/**
 * A sentinela do fim da lista (feature `74`, `MAP-13`, emenda E4 do Design).
 *
 * **Ela se REARMA.** O `IntersectionObserver` só avisa quando a interseção MUDA: depois de um anexar
 * descartado (E3) ou de uma página que chegou com a sentinela ainda visível, nada mais dispararia, e a
 * lista pararia no meio sem botão e sem erro. Por isso o observador é desligado e criado de novo
 * sempre que `ativo` ou `rearme` mudam — e o observador novo avisa na observação inicial (é o
 * comportamento do navegador), então, se a sentinela já está visível, a próxima página sai.
 *
 * `ativo` é falso enquanto uma página está no ar, no fim e na falha da próxima: nada observa.
 * Devolve o `ref` de callback para o elemento da sentinela.
 */
export const useSentinela = <E extends Element>({
  ativo,
  aoCruzar,
  rearme,
}: {
  ativo: boolean
  aoCruzar: () => void
  /** Um valor que muda a cada leitura (a janela): mudar rearma o observador. */
  rearme: unknown
}) => {
  const [alvo, setAlvo] = useState<E | null>(null)
  const atual = useRef(aoCruzar)
  atual.current = aoCruzar

  useEffect(() => {
    if (!ativo || !alvo || typeof IntersectionObserver === 'undefined') return
    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) atual.current()
      },
      { rootMargin: MARGEM_DA_SENTINELA },
    )
    observador.observe(alvo)
    return () => observador.disconnect()
  }, [ativo, alvo, rearme])

  return setAlvo
}
