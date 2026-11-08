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
import { mapearPecaParaProposta, type LinhaDaPeca, type PecaParaProposta } from '@estrelinha/core/proposals'

// O mapeamento da peça (variações, estoque, foto com recuo para a capa) tem um dono em `core`, lido
// também pelo app do ateliê; os tipos são reexportados daqui para os chamadores do painel.
export type { MedidasDaPeca, PecaParaProposta, VariacaoDaPeca } from '@estrelinha/core/proposals'

/** As colunas da peça. Nomeadas, nunca `*` (a `description` é o grosso do catálogo e ninguém aqui a lê). */
export const PROPOSAL_PRODUCT_COLUMNS =
  'id, name, base_price, image_url, capa:images->0->>url, is_active, stock_policy, stock_total, requires_material, engraving_max_chars, options, weight_kg, width_cm, height_cm, length_cm'

/** As colunas da variação. */
export const PROPOSAL_VARIANT_COLUMNS =
  'id, product_id, price, option_values, image_url, is_active, stock, position, weight_kg'

export const PRODUCT_VARIANTS_KEY = ['products', 'variants'] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ErroDeLeitura {
  message?: string
}

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

  return mapearPecaParaProposta(produto as LinhaDaPeca, (linhas ?? []) as Array<Record<string, unknown>>)
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
