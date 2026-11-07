// Compre Junto — a prévia do desconto ao levar junto, ao lado do campo de cada adicional.
//
// A conta é de `core` (`buyTogetherDiscountedPrice`, o dono único: a loja, a sacola e o servidor
// chamam a mesma). O que nasce aqui é só a FRASE do painel: por quanto a peça sai com esta joia, e,
// quando os preços das peças oferecidas divergem, a faixa do menor ao maior.

import { buyTogetherDiscountedPrice, resolveAddons, type PieceProduct } from '@estrelinha/core/buy-together'
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

/** O que a prévia lê de uma peça da lista: a forma de `resolveAddons` e o preço da peça sem grade. */
export interface PecaDaListaParaPrevia {
  productId: string
  ativa: boolean
  /** As variações que a dona liberou para a peça nesta lista; vazio = todas. */
  variantIds: readonly string[]
  precoBase: number
  produto: PieceProduct | null
}

/**
 * Os preços cheios que a loja oferece DENTRO deste adicional de lista, nesta joia. Quem decide o que
 * sobra é `resolveAddons` (`core/buy-together`), a mesma regra que a página do produto chama: pula a
 * peça fora do ar, a sem variação à venda, a variação não liberada ou esgotada, a própria joia e a
 * peça que outro adicional dela já leva (a avulsa vence a lista; entre listas vale a ordem). Assim a
 * prévia não anuncia um preço que a cliente não encontra.
 *
 * A variação do principal não entra (`mainVariantId: null`): a prévia é da joia, não de uma linha
 * dela. A peça avulsa só disputa a peça de uma lista quando a peça está na lista, e então a forma
 * dela vem da própria lista.
 */
export const precosDaListaNestaJoia = (
  addons: readonly Pick<
    AddonDraft,
    'key' | 'kind' | 'targetProductId' | 'listId' | 'targetVariantIds' | 'hiddenOnVariantIds'
  >[],
  listas: readonly { id: string; name: string; pecas: readonly PecaDaListaParaPrevia[] }[],
  mainProductId: string | null,
  key: string,
): number[] => {
  const pecas = new Map<string, PecaDaListaParaPrevia>()
  for (const l of listas) for (const p of l.pecas) if (!pecas.has(p.productId)) pecas.set(p.productId, p)
  // Fora do ar a loja nem recebe a peça (a RLS de `products` a esconde): ela não chega à regra.
  const products = [...pecas.values()].flatMap(p => (p.ativa && p.produto ? [p.produto] : []))
  const resolvido = resolveAddons({
    mainProductId: mainProductId ?? '',
    mainVariantId: null,
    addons: addons.map((a, position) => ({
      id: a.key,
      position,
      kind: a.kind,
      targetProductId: a.targetProductId,
      listId: a.listId,
      targetVariantIds: a.targetVariantIds,
      hiddenOnVariantIds: a.hiddenOnVariantIds,
    })),
    lists: listas.map(l => ({
      id: l.id,
      name: l.name,
      items: l.pecas.map((p, position) => ({ productId: p.productId, position, variantIds: p.variantIds })),
    })),
    products,
  }).find(a => a.id === key)
  if (!resolvido) return []
  return resolvido.pieces.flatMap(r => {
    const peca = pecas.get(r.productId)
    if (!peca?.produto) return []
    if (r.simple) return [peca.precoBase]
    const precoDe = new Map(peca.produto.variants.map(v => [v.id, v.price]))
    return r.variantIds.flatMap(id => {
      const preco = precoDe.get(id)
      return preco === null || preco === undefined ? [] : [preco]
    })
  })
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
