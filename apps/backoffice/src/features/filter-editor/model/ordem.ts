// A ordem arrastada dos grupos e dos valores (feature 66).

/** Move `de` para a posição de `para`, devolvendo a lista nova de ids. */
export const moverParaPosicao = (ids: readonly string[], de: string, para: string): string[] => {
  const origem = ids.indexOf(de)
  const destino = ids.indexOf(para)
  if (origem === -1 || destino === -1 || origem === destino) return [...ids]
  const lista = [...ids]
  lista.splice(origem, 1)
  lista.splice(destino, 0, de)
  return lista
}
