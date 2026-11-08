import { useQuery } from '@tanstack/react-query'
import { retryUnlessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import { readAllPages } from '@estrelinha/core/paging'
import { mapearPecaParaProposta, type LinhaDaPeca, type LinhaDaVariacao, type PecaParaProposta } from '@estrelinha/core/proposals'
import { supabase } from '@estrelinha/supabase/client'

import { lerComPapel } from '@/shared/api/lerComPapel'

/**
 * O catálogo da MONTAGEM de um pedido — as peças ativas com a capa e as variações ativas com estoque,
 * preço e foto. Lido UMA vez e guardado em memória durante a montagem: a busca filtra no aparelho, pela
 * regra de `@estrelinha/core/product-search`, e a folha da variação lê daqui.
 *
 * - **Toda leitura passa por `lerComPapel`**: a confirmação do papel sai junto, e a recusa vence.
 * - **Lê tudo, ou falha** (`readAllPages`): conta primeiro e pagina depois. Uma leitura cortada pelo
 *   teto do PostgREST seria um catálogo menor, e a busca diria que não existe uma peça que existe.
 *   Sem a contagem a leitura também falha — sem ela não há como saber se veio tudo.
 * - **As projeções são as do painel** (a capa é `images->0->>url`), e o mapeamento é o de `core`
 *   (`mapearPecaParaProposta`): a mesma peça, as mesmas variações e a mesma foto que o painel monta.
 * - Nada fica no aparelho além do cache do React Query (memória); a troca de conta o limpa.
 */

export const CATALOGO_DA_MONTAGEM_KEY = 'atelie-montagem-catalogo'

/** As colunas da peça. Nomeadas, nunca tudo (a descrição é o grosso do catálogo e ninguém aqui a lê). */
export const COLUNAS_DA_PECA =
  'id, name, base_price, image_url, capa:images->0->>url, is_active, stock_policy, stock_total, requires_material, engraving_max_chars, options, weight_kg, width_cm, height_cm, length_cm'

/** As colunas da variação. */
export const COLUNAS_DA_VARIACAO = 'id, product_id, price, option_values, image_url, is_active, stock, position, weight_kg'

const contagemDe = (count: number | null | undefined, oQue: string): number => {
  if (typeof count !== 'number') throw new Error(`a leitura de ${oQue} veio sem a contagem`)
  return count
}

const lerPecas = async (): Promise<LinhaDaPeca[]> => {
  const { count, error } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true)
  if (error) throw error
  return readAllPages<LinhaDaPeca>({
    total: contagemDe(count, 'peças'),
    label: 'peças do catálogo',
    readPage: async (de, ate) => {
      const { data, error: erro } = await supabase
        .from('products')
        .select(COLUNAS_DA_PECA)
        .eq('is_active', true)
        .order('name', { ascending: true })
        .order('id', { ascending: true })
        .range(de, ate)
      if (erro) throw erro
      return (data ?? []) as unknown as LinhaDaPeca[]
    },
  })
}

const lerVariacoes = async (): Promise<LinhaDaVariacao[]> => {
  const { count, error } = await supabase.from('product_variants').select('id', { count: 'exact', head: true }).eq('is_active', true)
  if (error) throw error
  return readAllPages<LinhaDaVariacao>({
    total: contagemDe(count, 'variações'),
    label: 'variações do catálogo',
    readPage: async (de, ate) => {
      const { data, error: erro } = await supabase
        .from('product_variants')
        .select(COLUNAS_DA_VARIACAO)
        .eq('is_active', true)
        .order('product_id', { ascending: true })
        .order('position', { ascending: true })
        .order('id', { ascending: true })
        .range(de, ate)
      if (erro) throw erro
      return (data ?? []) as unknown as LinhaDaVariacao[]
    },
  })
}

const lerCatalogo = async (): Promise<PecaParaProposta[]> => {
  const { resultado } = await lerComPapel(async () => {
    const [pecas, variacoes] = await Promise.all([lerPecas(), lerVariacoes()])
    return { pecas, variacoes }
  })
  const porPeca = new Map<string, LinhaDaVariacao[]>()
  for (const v of resultado.variacoes) {
    const id = String(v.product_id)
    const lista = porPeca.get(id)
    if (lista) lista.push(v)
    else porPeca.set(id, [v])
  }
  return resultado.pecas.map((p) => mapearPecaParaProposta(p, porPeca.get(String(p.id)) ?? []))
}

/** O catálogo da montagem: lido uma vez, enquanto a tela o pede. */
export const useCatalogoDaMontagem = (habilitado: boolean) =>
  useQuery({
    queryKey: [CATALOGO_DA_MONTAGEM_KEY],
    queryFn: lerCatalogo,
    enabled: habilitado,
    staleTime: Infinity,
    retry: retryUnlessDenied,
  })
