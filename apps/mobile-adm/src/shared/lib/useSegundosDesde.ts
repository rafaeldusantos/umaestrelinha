import { useEffect, useState } from 'react'

/**
 * Os segundos desde `instante` (um `Date.now()` LOCAL — o `dataUpdatedAt` da query, a chegada da
 * resposta), relidos a cada 1 s (feature `83`, `LAV-07`). É uma DURAÇÃO medida no próprio aparelho,
 * nunca o relógio de parede contra o `lido_em` do servidor: um aparelho adiantado ou atrasado não muda
 * nada (`LAV-61`, molde de `turnDelayMs`).
 *
 * O ÚNICO arquivo do escopo de `aoVivoSemRelogioDoAparelho.test.ts` autorizado a ler `Date.now()`.
 */
export const useSegundosDesde = (instante: number): number => {
  const [agora, setAgora] = useState(() => Date.now())

  useEffect(() => {
    setAgora(Date.now())
    const relogio = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(relogio)
  }, [instante])

  // Antes de o efeito rodar para um `instante` novo, `agora` ainda é da leitura anterior: o piso em 0.
  return Math.max(0, (agora - instante) / 1000)
}
