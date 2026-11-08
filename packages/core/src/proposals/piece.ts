// A peça escolhida para um pedido montado, com as variações que a Adri pode oferecer. Só a parte
// PURA: recebe a linha da peça e as das variações já lidas do banco, e devolve a peça da proposta.
// A leitura fica em quem chama (o painel, o app do ateliê), cada um com o client dele.
//
// O que ela monta é o que a linha da proposta precisa para ser montada E conferida antes de ir ao
// servidor: o preço CHEIO de cada linha (`price` da variação, ou `base_price` sem grade), estoque e
// política (`isVariantAvailable`), se a linha grava (`hasEngraving`) e o teto da peça, se a peça pede
// material (`requiresMaterial`), as medidas (para a prévia do frete) e a foto de cada variação, pela
// regra da linha (`fotoDaLinha`).
//
// **Só variação ativa**: quem lê pede ao banco `is_active = true`, e aqui ela é filtrada de novo. O
// filtro do banco poupa a rede; o daqui é o que garante a regra se a consulta mudar — uma linha
// pausada oferecida à Adri seria recusada pelo servidor na gravação, depois de ela montar tudo.

import { isVariantAvailable, variantLabel } from '../pricing/index.ts'
import type { OptionValues, ProductOption, StockPolicy } from '../pricing/types.ts'
import { hasEngraving, requiresMaterial } from '../material/material.ts'
import { capaDaLinha, fotoDaLinha } from './photo.ts'

export interface MedidasDaPeca {
  weight_kg: number | null
  width_cm: number | null
  height_cm: number | null
  length_cm: number | null
}

/** Uma variação oferecível — ativa, com o rótulo já montado. */
export interface VariacaoDaPeca {
  id: string
  /** `4,5 cm · Fosco`, pela ordem dos eixos da peça (`variantLabel`). */
  rotulo: string
  /** O preço cheio da linha; `null` quando a variação está sem preço (o servidor recusaria). */
  preco: number | null
  estoque: number
  /** Pode ser vendida agora (`isVariantAvailable` com a política da peça). */
  disponivel: boolean
  /** A linha grava? Só ela mostra o campo de gravação. */
  grava: boolean
  imagem: string | null
  valores: OptionValues
  peso: number | null
}

export interface PecaParaProposta {
  id: string
  nome: string
  ativa: boolean
  precoBase: number
  imagem: string | null
  politica: StockPolicy
  estoqueTotal: number
  pedeMaterial: boolean
  limiteDeGravacao: number | null
  medidas: MedidasDaPeca
  /** Ativas, na ordem recebida. Vazio = peça sem grade (vende pelo preço base). */
  variacoes: VariacaoDaPeca[]
}

/** A linha da peça como a leitura a devolve (com `capa` = `images->0->>url`). */
export interface LinhaDaPeca {
  id: unknown
  name?: unknown
  base_price?: unknown
  image_url?: string | null
  capa?: string | null
  is_active?: unknown
  stock_policy?: unknown
  stock_total?: unknown
  requires_material?: boolean | null
  engraving_max_chars?: unknown
  options?: unknown
  weight_kg?: unknown
  width_cm?: unknown
  height_cm?: unknown
  length_cm?: unknown
}

/** A linha de variação como a leitura a devolve. */
export type LinhaDaVariacao = Record<string, unknown>

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const politicaDe = (v: unknown): StockPolicy => (v === 'none' || v === 'backorder' ? v : 'track')

/** A peça da proposta a partir das linhas lidas. As variações pausadas ficam de fora. */
export const mapearPecaParaProposta = (
  produto: LinhaDaPeca,
  linhas: readonly LinhaDaVariacao[] | null | undefined,
): PecaParaProposta => {
  // A capa da peça: a primeira da galeria, senão a coluna antiga (o catálogo importado só tem a
  // galeria). A variação sem foto própria mostra a capa — é a peça que a Adri está escolhendo.
  const capa = capaDaLinha(produto)
  const opcoes: ProductOption[] = Array.isArray(produto.options) ? (produto.options as ProductOption[]) : []
  const politica = politicaDe(produto.stock_policy)

  const variacoes: VariacaoDaPeca[] = (linhas ?? [])
    .filter((v) => v.is_active === true)
    .map((v) => {
      const valores = (v.option_values ?? {}) as OptionValues
      const estoque = Number(v.stock ?? 0) || 0
      return {
        id: String(v.id),
        rotulo: variantLabel(opcoes, valores) || 'Variação sem nome',
        preco: numeroOuNulo(v.price),
        estoque,
        disponivel: isVariantAvailable({ stock: estoque, is_active: true }, politica),
        grava: hasEngraving(valores),
        imagem: fotoDaLinha({ image_url: v.image_url as string | null }, produto),
        valores,
        peso: numeroOuNulo(v.weight_kg),
      }
    })

  return {
    id: String(produto.id),
    nome: String(produto.name ?? ''),
    ativa: produto.is_active !== false,
    precoBase: Number(produto.base_price ?? 0),
    imagem: capa,
    politica,
    estoqueTotal: Number(produto.stock_total ?? 0) || 0,
    pedeMaterial: requiresMaterial(produto),
    limiteDeGravacao: numeroOuNulo(produto.engraving_max_chars),
    medidas: {
      weight_kg: numeroOuNulo(produto.weight_kg),
      width_cm: numeroOuNulo(produto.width_cm),
      height_cm: numeroOuNulo(produto.height_cm),
      length_cm: numeroOuNulo(produto.length_cm),
    },
    variacoes,
  }
}

/** O texto do estoque de uma linha — a frase que a tela escreve e o teste lê. */
export const textoDoEstoque = (v: { estoque: number; disponivel: boolean }, politica: StockPolicy): string => {
  if (politica !== 'track') return 'Estoque livre'
  if (!v.disponivel) return 'Sem estoque'
  return v.estoque === 1 ? '1 em estoque' : `${v.estoque} em estoque`
}
