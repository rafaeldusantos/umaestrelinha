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
})

/** O que a peça relida corrige na linha. Puro: o teste lê a mesma regra que a tela aplica. */
export const acertoDaLinha = (line: DraftLine, peca: PecaParaProposta): Partial<DraftLine> => {
  const comum: Partial<DraftLine> = {
    product_name: peca.nome || line.product_name,
    requires_material: peca.pedeMaterial,
    engraving_max: peca.limiteDeGravacao,
  }
  const medidas = (v: VariacaoDaPeca | null) => ({ ...peca.medidas, weight_kg: v?.peso ?? peca.medidas.weight_kg })

  if (peca.variacoes.length === 0) {
    return { ...comum, needsVariant: false, variant_id: null, variant_label: null, list_price: peca.precoBase, engraves: false, dimensions: medidas(null) }
  }
  const atual = line.variant_id ? peca.variacoes.find((v) => v.id === line.variant_id) ?? null : null
  // Uma linha só oferecível: entra sozinha — escolher a única opção é um clique sem decisão.
  const oferecivel = peca.variacoes.filter((v) => v.disponivel && v.preco !== null)
  const escolhida = atual ?? (line.variant_id === null && oferecivel.length === 1 ? oferecivel[0] : null)
  if (!escolhida) {
    return { ...comum, needsVariant: true, variant_id: null, variant_label: null, list_price: null, engraves: false, dimensions: medidas(null) }
  }
  return {
    ...comum,
    needsVariant: true,
    variant_id: escolhida.id,
    variant_label: escolhida.rotulo,
    list_price: escolhida.preco,
    engraves: escolhida.grava,
    dimensions: medidas(escolhida),
  }
}
