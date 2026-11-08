// A foto de uma peça e a de uma linha do pedido montado. Folha SEM import: a montagem do painel, a
// do app do ateliê e a function `order-proposals` (que grava a foto do snapshot) leem daqui, e a
// cliente vê no link a mesma foto que a Adri viu ao montar.

/** O que se lê da peça para achar a capa: a primeira URL da galeria (`capa`) e a coluna antiga. */
export interface CapaDaPeca {
  /** `images->0->>url`, pedida pela leitura com esse apelido. */
  capa?: string | null
  image_url?: string | null
}

/** O que se lê da variação para achar a foto dela. */
export interface FotoDaVariacao {
  image_url?: string | null
}

const aparado = (valor: unknown): string => (typeof valor === 'string' ? valor.trim() : '')

/** A capa de uma peça: a primeira da galeria, senão a coluna antiga; sem as duas, `null`. */
export const capaDaLinha = (l: CapaDaPeca): string | null =>
  aparado(l?.capa) || aparado(l?.image_url) || null

/**
 * Qual foto vai na linha: a da variação escolhida; sem foto própria (ou sem variação), a capa da
 * peça — a primeira da galeria, senão a coluna antiga; sem nenhuma, `null`.
 */
export const fotoDaLinha = (
  variacao: FotoDaVariacao | null | undefined,
  peca: CapaDaPeca | null | undefined,
): string | null => aparado(variacao?.image_url) || (peca ? capaDaLinha(peca) : null)
