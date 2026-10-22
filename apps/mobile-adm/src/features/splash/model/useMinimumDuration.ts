import { useEffect, useState } from 'react'

/**
 * O piso da splash (feature 72, `MAF-06`): 600 ms desde a montagem, e NUNCA mais que isso.
 *
 * A splash existe para cobrir a resolução da sessão. O piso só impede que ela pisque quando a
 * sessão resolve em 50 ms — ele não segura a Adri esperando. O protótipo mostrava 2,4 s, e um tempo
 * fixo daquele tamanho é espera fabricada.
 */
export const SPLASH_MIN_MS = 600

/** `true` quando passaram `ms` milissegundos desde a montagem de quem chama. */
export const useMinimumDuration = (ms: number): boolean => {
  const [cumprido, setCumprido] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setCumprido(true), ms)
    return () => clearTimeout(id)
  }, [ms])

  return cumprido
}
