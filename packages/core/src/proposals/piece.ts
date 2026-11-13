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
import { isCampaignLive } from '../campaigns/live.ts'
import { campaignUnitPrice } from '../campaigns/price.ts'
import type { Instant } from '../campaigns/types.ts'

export interface MedidasDaPeca {
  weight_kg: number | null
  width_cm: number | null
  height_cm: number | null
  length_cm: number | null
}

/**
 * A campanha em vigência numa linha (variação, ou a peça sem grade) — só quando ela BAIXA o preço
 * dessa linha. `percent` e `compare_price` são o que entra em `resolveOrderPricing`
 * (`PricingItem.campaign`); `preco` é o preço por unidade com a campanha (`campaignUnitPrice`), o que a
 * montagem mostra. Quem cobra é sempre `resolveOrderPricing`, a partir do preço de tabela.
 */
export interface CampanhaDaLinha {
  percent: number
  compare_price: number | null
  preco: number
}

/** A campanha em vigência marcada na peça: o nome e o percentual dela. */
export interface CampanhaDaPeca {
  nome: string
  percentual: number
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
  /** A campanha em vigência nesta linha, quando ela baixa o preço; `null` fora dela. */
  campanha: CampanhaDaLinha | null
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
  /** A campanha em vigência marcada na peça, ou `null`. */
  campanha: CampanhaDaPeca | null
  /** A campanha sobre o preço base (a peça sem grade), quando ela baixa o preço; `null` fora dela. */
  campanhaBase: CampanhaDaLinha | null
}

/** A linha da peça como a leitura a devolve (com `capa` = `images->0->>url`). */
export interface LinhaDaPeca {
  id: unknown
  name?: unknown
  base_price?: unknown
  /** O "de" da peça, quando existe. */
  original_price?: unknown
  /**
   * O embed `product_campaigns(percent, campaigns(id, name, starts_at, ends_at, active))`: as marcações
   * da peça, com a vigência de cada campanha. Quem decide qual vale agora é `isCampaignLive`.
   */
  product_campaigns?: unknown
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

/**
 * A campanha em vigência agora entre as marcações da peça (o embed `product_campaigns`), ou `null`.
 * O relógio é de quem chama — o do banco no app do ateliê (`lido_em`), o do painel no painel; o
 * servidor confere de novo, pelo relógio da function, ao gravar.
 */
export const campanhaVivaDaPeca = (marcas: unknown, agora: Instant | null | undefined): CampanhaDaPeca | null => {
  if (agora === null || agora === undefined || !Array.isArray(marcas)) return null
  for (const m of marcas as Array<Record<string, unknown>>) {
    const c = m?.campaigns as Record<string, unknown> | null | undefined
    const percentual = Number(m?.percent)
    if (!c || !(Number.isFinite(percentual) && percentual > 0)) continue
    const janela = { starts_at: String(c.starts_at ?? ''), ends_at: String(c.ends_at ?? ''), active: c.active === true }
    if (isCampaignLive(janela, agora)) return { nome: String(c.name ?? ''), percentual }
  }
  return null
}

/** A campanha numa linha de preço `preco` e "de" `compare`, ou `null` quando ela não baixa o preço. */
const campanhaDaLinha = (
  campanha: CampanhaDaPeca | null,
  preco: number | null,
  compare: number | null,
): CampanhaDaLinha | null => {
  if (!campanha || preco === null) return null
  const c = campaignUnitPrice(preco, compare, campanha.percentual)
  return c.discounted ? { percent: campanha.percentual, compare_price: compare, preco: c.charged } : null
}

const politicaDe = (v: unknown): StockPolicy => (v === 'none' || v === 'backorder' ? v : 'track')

/** A peça da proposta a partir das linhas lidas. As variações pausadas ficam de fora. */
export const mapearPecaParaProposta = (
  produto: LinhaDaPeca,
  linhas: readonly LinhaDaVariacao[] | null | undefined,
  /** O instante em que a campanha é conferida; ausente, nenhuma campanha entra. */
  agora: Instant | null = null,
): PecaParaProposta => {
  const campanha = campanhaVivaDaPeca(produto.product_campaigns, agora)
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
      const preco = numeroOuNulo(v.price)
      return {
        id: String(v.id),
        rotulo: variantLabel(opcoes, valores) || 'Variação sem nome',
        preco,
        estoque,
        disponivel: isVariantAvailable({ stock: estoque, is_active: true }, politica),
        grava: hasEngraving(valores),
        imagem: fotoDaLinha({ image_url: v.image_url as string | null }, produto),
        valores,
        peso: numeroOuNulo(v.weight_kg),
        campanha: campanhaDaLinha(campanha, preco, numeroOuNulo(v.compare_price)),
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
    campanha,
    campanhaBase: campanhaDaLinha(campanha, numeroOuNulo(produto.base_price), numeroOuNulo(produto.original_price)),
  }
}

/** O texto do estoque de uma linha — a frase que a tela escreve e o teste lê. */
export const textoDoEstoque = (v: { estoque: number; disponivel: boolean }, politica: StockPolicy): string => {
  if (politica !== 'track') return 'Estoque livre'
  if (!v.disponivel) return 'Sem estoque'
  return v.estoque === 1 ? '1 em estoque' : `${v.estoque} em estoque`
}
