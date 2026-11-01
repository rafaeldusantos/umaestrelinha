// A linha de peça da montagem, antes e depois de a peça ser relida (feature 89, `MON-05`, `MON-06`).
// Puro: o teste lê a mesma regra que a tela aplica.

import type { PecaParaProposta, ProdutoDoPool, VariacaoDaPeca } from '@/entities/product'
import { novaChave, type DraftLine } from './draft'

export const MATERIAL_TAG = 'Pede material da cliente'

/** A linha nova, antes de a peça ser relida: sem preço e sem saber se tem grade. */
export const linhaNova = (p: Pick<ProdutoDoPool, 'id' | 'name'>): DraftLine => ({
  key: novaChave(),
  product_id: p.id,
  product_name: p.name,
  needsVariant: true,
  variant_id: null,
  variant_label: null,
  list_price: null,
  quantity: 1,
  engraves: false,
  engraving_text: '',
  engraving_max: null,
  requires_material: false,
  dimensions: {},
  image_url: null,
  stock_cap: null,
})

/** O que a peça relida corrige na linha. Puro: o teste lê a mesma regra que a tela aplica. */
export const acertoDaLinha = (line: DraftLine, peca: PecaParaProposta): Partial<DraftLine> => {
  const comum: Partial<DraftLine> = {
    product_name: peca.nome || line.product_name,
    image_url: peca.imagem,
    requires_material: peca.pedeMaterial,
    engraving_max: peca.limiteDeGravacao,
  }
  const medidas = (v: VariacaoDaPeca | null) => ({ ...peca.medidas, weight_kg: v?.peso ?? peca.medidas.weight_kg })

  if (peca.variacoes.length === 0) {
    return { ...comum, needsVariant: false, variant_id: null, variant_label: null, list_price: peca.precoBase, engraves: false, dimensions: medidas(null), stock_cap: tetoDoEstoque(peca.politica, peca.estoqueTotal) }
  }
  const atual = line.variant_id ? peca.variacoes.find((v) => v.id === line.variant_id) ?? null : null
  // Uma linha só oferecível: entra sozinha — escolher a única opção é um clique sem decisão.
  const oferecivel = peca.variacoes.filter((v) => v.disponivel && v.preco !== null)
  const escolhida = atual ?? (line.variant_id === null && oferecivel.length === 1 ? oferecivel[0] : null)
  if (!escolhida) {
    return { ...comum, needsVariant: true, variant_id: null, variant_label: null, list_price: null, engraves: false, dimensions: medidas(null), stock_cap: null }
  }
  return {
    ...comum,
    needsVariant: true,
    variant_id: escolhida.id,
    variant_label: escolhida.rotulo,
    list_price: escolhida.preco,
    engraves: escolhida.grava,
    dimensions: medidas(escolhida),
    image_url: escolhida.imagem ?? peca.imagem,
    stock_cap: tetoDoEstoque(peca.politica, escolhida.estoque),
  }
}

/**
 * O teto do contador de quantidade: o estoque, quando a peça controla estoque (`track`); `null`
 * (só o teto da proposta) quando o estoque é livre. Mesma régua que a loja aplica no carrinho.
 */
export const tetoDoEstoque = (politica: PecaParaProposta['politica'], estoque: number): number | null =>
  politica === 'track' ? Math.max(1, estoque) : null

/** A linha pronta a partir da peça e da variação escolhidas na caixa "Acrescentar peça". */
export const linhaEscolhida = (
  peca: PecaParaProposta,
  variacao: VariacaoDaPeca | null,
  quantidade: number,
  gravacao: string,
): DraftLine => {
  const base: DraftLine = { ...linhaNova({ id: peca.id, name: peca.nome }), quantity: quantidade }
  const escolhida: DraftLine = { ...base, variant_id: variacao?.id ?? null }
  const acerto = acertoDaLinha(escolhida, peca)
  const linha = { ...escolhida, ...acerto }
  return { ...linha, engraving_text: linha.engraves ? gravacao : '' }
}
