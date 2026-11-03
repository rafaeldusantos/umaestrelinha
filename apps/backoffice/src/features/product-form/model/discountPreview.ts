// Compre Junto — a prévia do desconto ao levar junto, ao lado do campo de cada adicional.
//
// A conta é de `core` (`buyTogetherDiscountedPrice`, o dono único: a loja, a sacola e o servidor
// chamam a mesma). O que nasce aqui é só a FRASE do painel: por quanto a peça sai com esta joia, e,
// quando os preços das peças oferecidas divergem, a faixa do menor ao maior.

import { buyTogetherDiscountedPrice } from '@estrelinha/core/buy-together'
import { formatPrice } from '@estrelinha/core/formatters'

export interface PrecoDeVariacao {
  id: string
  preco: number | null
}

/**
 * Os preços cheios que a peça pode sair: os das variações ativas liberadas (vazio = todas as
 * ativas), sem as que não têm preço; sem grade com preço, o preço base.
 */
export const precosDaPeca = (
  precoBase: number,
  variacoes: readonly PrecoDeVariacao[],
  liberadas: readonly string[],
): number[] => {
  const comPreco = variacoes
    .filter(v => liberadas.length === 0 || liberadas.includes(v.id))
    .flatMap(v => (v.preco === null || !Number.isFinite(v.preco) ? [] : [v.preco]))
  if (comPreco.length > 0) return comPreco
  // Liberou variações e nenhuma tem preço: não há o que prever (a loja pula o adicional).
  if (liberadas.length > 0 && variacoes.length > 0) return []
  return [precoBase]
}

/**
 * A frase da prévia: `Fita sai a R$ 45,00 com esta joia.`, ou `… de R$ 40,50 a R$ 63,00 …` quando os
 * preços divergem. `null` sem percentual, sem preço, ou com o percentual recusado (a tela mostra a
 * recusa no lugar).
 */
export const discountPreviewLine = (
  sujeito: { nome: string; plural: boolean },
  precos: readonly number[],
  percent: number | null,
  recusado: boolean,
): string | null => {
  if (percent === null || recusado || precos.length === 0) return null
  const com = precos.map(p => buyTogetherDiscountedPrice(p, percent))
  const menor = Math.min(...com)
  const maior = Math.max(...com)
  const verbo = sujeito.plural ? 'saem' : 'sai'
  const valor = menor === maior ? `a ${formatPrice(menor)}` : `de ${formatPrice(menor)} a ${formatPrice(maior)}`
  return `${sujeito.nome} ${verbo} ${valor} com esta joia.`
}
