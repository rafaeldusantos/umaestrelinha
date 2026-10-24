import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * A rolagem de cada entrada do histórico (feature `74`, G-A28): guardada por `location.key` num `Map`
 * em módulo — nada em storage —, gravada quando a página desmonta (ou a entrada troca).
 *
 * **A decisão é tomada UMA vez por entrada, na primeira renderização dela**, com o `pronto` daquele
 * instante (`pronto`: a lista já tem o que desenhar, ou seja, veio do cache em memória):
 *
 * - com cache, restaura a posição guardada — o voltar do Android não joga a Adri no topo de uma fila
 *   de 60;
 * - **sem cache, abre no topo** (G-A28), mesmo quando a leitura nova chega depois: a lista relida tem
 *   só a primeira página, e o `y` antigo cairia perto do fim de uma lista que não é a que ela rolou.
 *   É o caso de voltar depois que o `gcTime` apagou a lista inativa.
 *
 * Uma entrada nova (sem posição guardada) não mexe na rolagem.
 */
const posicoes = new Map<string, number>()

export const useRolagemRestaurada = (pronto: boolean): void => {
  const { key } = useLocation()
  const decididaPara = useRef<string | null>(null)
  // O `pronto` da renderização corrente; o efeito abaixo roda só quando a entrada troca, e por isso lê
  // o valor da PRIMEIRA renderização dela.
  const prontoAgora = useRef(pronto)
  prontoAgora.current = pronto

  useEffect(
    () => () => {
      posicoes.set(key, window.scrollY)
    },
    [key],
  )

  useEffect(() => {
    if (decididaPara.current === key) return
    decididaPara.current = key
    const y = posicoes.get(key)
    if (y === undefined) return
    // Só a primeira renderização de cada entrada decide: `pronto` virar verdadeiro depois (a leitura
    // nova chegou) não reabre a decisão.
    window.scrollTo(0, prontoAgora.current ? y : 0)
  }, [key])
}

/** Só para os testes: esquece as posições guardadas (o `Map` é do módulo). */
export const esquecerRolagens = () => posicoes.clear()
