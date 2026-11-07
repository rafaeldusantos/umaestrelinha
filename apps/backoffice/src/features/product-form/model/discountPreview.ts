// Compre Junto — a prévia do desconto ao levar junto, ao lado do campo de cada adicional.
//
// A conta é de `core` (`buyTogetherDiscountedPrice`, o dono único: a loja, a sacola e o servidor
// chamam a mesma). O que nasce aqui é só a FRASE do painel: por quanto a peça sai com esta joia, e,
// quando os preços das peças oferecidas divergem, a faixa do menor ao maior.

import { buyTogetherDiscountedPrice, claimPieces } from '@estrelinha/core/buy-together'
import { formatPrice } from '@estrelinha/core/formatters'
import type { AddonDraft } from './addons'

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
 * As peças de uma lista que a loja mostra DENTRO deste adicional, nesta joia: as ativas, menos a
 * própria joia, e menos a peça que outro adicional dela já leva — a avulsa vence a lista, e entre
 * listas vale a ordem. A precedência é a de `core` (`claimPieces`), a mesma que a página do produto e
 * a sacola usam, para a prévia não anunciar um preço que a cliente não encontra.
 */
export const pecasDaListaNestaJoia = <P extends { productId: string; ativa: boolean }>(
  addons: readonly Pick<AddonDraft, 'key' | 'kind' | 'targetProductId' | 'listId'>[],
  listas: readonly { id: string; pecas: readonly P[] }[],
  mainProductId: string | null,
  key: string,
): P[] => {
  const candidatos = addons.map(a => ({
    addon: { id: a.key, kind: a.kind },
    pieces:
      a.kind === 'product'
        ? a.targetProductId
          ? [{ productId: a.targetProductId, peca: null as P | null }]
          : []
        : (listas.find(l => l.id === a.listId)?.pecas ?? [])
            .filter(p => p.ativa && p.productId !== mainProductId)
            .map(p => ({ productId: p.productId, peca: p as P | null })),
  }))
  return (claimPieces(candidatos).get(key) ?? []).flatMap(c => (c.peca ? [c.peca] : []))
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
