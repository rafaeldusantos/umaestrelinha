// A peça escolhida para uma proposta, com as variações que a Adri pode oferecer (feature 89, `MON-05`).
//
// O pool de produtos (`useProductPool`) responde "quais peças existem?" e é enxuto de propósito: não
// tem variação, estoque nem gravação. Esta leitura responde a pergunta seguinte — "desta peça, qual
// linha eu vendo?" — para UM produto, escolhido POR ID. Nunca por nome: a busca por nome tem um dono
// só (`AD-036`, `buscaDeProdutoComDonoUnico.test.ts`), e quem chega aqui já escolheu pela busca.
//
// O que ela traz é o que a linha da proposta precisa para ser montada E conferida antes de ir ao
// servidor:
//   - o preço CHEIO de cada linha (`price` da variação, ou `base_price` sem grade) — o mesmo que
//     `resolveItemPrice` usa na function `order-proposals`;
//   - estoque e política, para mostrar e para não oferecer a linha esgotada (`isVariantAvailable`);
//   - se a linha grava (`hasEngraving`) e o teto da peça (`engraving_max_chars`);
//   - se a peça pede material (`requiresMaterial`, `MON-06`);
//   - as medidas, para a prévia do frete (`toQuoteProducts`).
//
// **Só variação ativa** (`MON-05`): pedida ao banco com `is_active = true` E filtrada de novo aqui. O
// filtro do banco poupa a rede; o daqui é o que garante a regra se a consulta mudar — uma linha
// pausada oferecida à Adri seria recusada pelo servidor na gravação ("está pausada"), depois de ela
// montar a proposta inteira.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { isVariantAvailable, variantLabel } from '@estrelinha/core/pricing'
import { hasEngraving, requiresMaterial } from '@estrelinha/core/material'
import type { OptionValues, ProductOption, StockPolicy } from '@estrelinha/supabase/types'

/** As colunas da peça. Nomeadas, nunca `*` (a `description` é o grosso do catálogo e ninguém aqui a lê). */
export const PROPOSAL_PRODUCT_COLUMNS =
  'id, name, base_price, image_url, is_active, stock_policy, stock_total, requires_material, engraving_max_chars, options, weight_kg, width_cm, height_cm, length_cm'

/** As colunas da variação. */
export const PROPOSAL_VARIANT_COLUMNS =
  'id, product_id, price, option_values, image_url, is_active, stock, position, weight_kg'

export const PRODUCT_VARIANTS_KEY = ['products', 'variants'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
  /** Ativas, na ordem do cadastro. Vazio = peça sem grade (vende pelo preço base). */
  variacoes: VariacaoDaPeca[]
}

interface ErroDeLeitura {
  message?: string
}

const numeroOuNulo = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const politicaDe = (v: unknown): StockPolicy =>
  v === 'none' || v === 'backorder' ? v : 'track'

/**
 * Lê a peça e as variações ativas. **Falha** quando a leitura falha — nunca devolve uma peça sem
 * grade por engano: "sem variação" quer dizer "vende pelo preço base", e confundir as duas coisas
 * faria a proposta oferecer o preço errado.
 */
export const lerPecaParaProposta = async (
  productId: string,
  // `any` declarado num lugar só: os tipos gerados do supabase-js não são estruturais o bastante
  // para o dublê do teste, e é o dublê que torna o filtro `is_active` auditável.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any = supabase,
): Promise<PecaParaProposta | null> => {
  const { data: produto, error: erroProduto } = await client
    .from('products')
    .select(PROPOSAL_PRODUCT_COLUMNS)
    .eq('id', productId)
    .maybeSingle()
  if (erroProduto) {
    throw new Error((erroProduto as ErroDeLeitura).message || 'não foi possível ler a peça')
  }
  if (!produto) return null

  const { data: linhas, error: erroVariacoes } = await client
    .from('product_variants')
    .select(PROPOSAL_VARIANT_COLUMNS)
    .eq('product_id', productId)
    .eq('is_active', true)
    .order('position')
  if (erroVariacoes) {
    throw new Error((erroVariacoes as ErroDeLeitura).message || 'não foi possível ler as variações')
  }

  const opcoes: ProductOption[] = Array.isArray(produto.options) ? produto.options : []
  const politica = politicaDe(produto.stock_policy)

  const variacoes: VariacaoDaPeca[] = ((linhas ?? []) as Array<Record<string, unknown>>)
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
        imagem: (v.image_url as string | null) ?? null,
        valores,
        peso: numeroOuNulo(v.weight_kg),
      }
    })

  return {
    id: String(produto.id),
    nome: String(produto.name ?? ''),
    ativa: produto.is_active !== false,
    precoBase: Number(produto.base_price ?? 0),
    imagem: produto.image_url ?? null,
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

export interface PecaDaProposta {
  peca: PecaParaProposta | null
  carregando: boolean
  erro: string | null
  recarregar: () => void
}

/** A peça por id, cacheada por id. Sem id (ou id que não é uuid) a consulta não sai. */
export const useProductVariants = (productId: string | null | undefined): PecaDaProposta => {
  const id = productId && UUID.test(productId) ? productId : null
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...PRODUCT_VARIANTS_KEY, id],
    queryFn: () => lerPecaParaProposta(id as string),
    enabled: id !== null,
    staleTime: 60 * 1000,
  })

  return {
    peca: data ?? null,
    carregando: id !== null && isLoading,
    erro: error ? (error as Error).message || 'não foi possível ler a peça' : null,
    recarregar: () => {
      void refetch()
    },
  }
}
