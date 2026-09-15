// O pool de produtos do painel — a **única** leitura de "quais peças existem, para escolher uma"
// (feature 51, `BUS-11`, `BUS-12`, `BUS-13`, `BUS-16`, `BUS-20`).
//
// O que ele substitui: `useAdminProducts` fazia `select('*, categories(name)')` **sem cache nenhum**
// (`useState` + `useEffect`), uma vez por tela. São **3.217 KB** de JSON, dos quais 876 KB são
// `description` em HTML que seletor nenhum lê. A projeção abaixo são **~137 KB** — 25× menos — e ela
// desce **uma vez por sessão**, compartilhada entre as telas pela chave do React Query.
//
// E ele fecha um defeito que ainda não aconteceu: `useAdminProducts` não tem `range` nem `count`, e
// o PostgREST corta em 1.000 linhas **sem avisar**. São 702 produtos hoje — 298 de distância. Passado
// o teto, os seletores em memória simplesmente parariam de achar parte das peças, sem erro em lugar
// nenhum: exatamente o defeito que a feature 21 já pagou neste repositório (`BL-008`).

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { readAllPages } from '@estrelinha/core/paging'
import { supabase } from '@estrelinha/supabase/client'
import type { ProdutoDoPool } from '../lib/buscarProdutos'

/**
 * A projeção, nomeada e **sem `description`** (`BUS-11`).
 *
 * As quatro primeiras são exatamente o `EditorProduct` que a feature 50 declarou; `base_price` entra
 * porque o seletor do order bump mostra o preço hoje, e tirá-lo seria regressão de uma tela que esta
 * feature não foi chamada para piorar.
 */
export const PRODUCT_POOL_COLUMNS = 'id, name, slug, is_active, base_price'

/** A chave é o que faz duas telas serem **uma** requisição (`BUS-20`) — quem desduplica é o cache. */
export const PRODUCT_POOL_KEY = ['products', 'pool'] as const

/** Cinco minutos. Quem grava produto invalida (`BUS-16`); isto é a rede de baixo, não o mecanismo. */
export const PRODUCT_POOL_STALE_TIME = 5 * 60 * 1000

interface ErroDeLeitura {
  message?: string
}

interface PaginaDeProdutos {
  order(coluna: string): PaginaDeProdutos
  range(de: number, ate: number): PromiseLike<{ data: unknown[] | null; error: ErroDeLeitura | null }>
}

interface SeletorDeProdutos {
  select(
    colunas: string,
    opcoes: { count: 'exact'; head: true },
  ): PromiseLike<{ count: number | null; error: ErroDeLeitura | null }>
  select(colunas: string): PaginaDeProdutos
}

/**
 * O mínimo do client que esta leitura usa.
 *
 * **Injetável de propósito**: é o que torna `BUS-11` e `BUS-13` auditáveis sem mockar o módulo do
 * Supabase. Um dublê que devolvesse a resposta direto do `select` tornaria a projeção *inauditável*
 * — acrescentar `description` deixaria a suíte verde, e o painel voltaria a baixar 876 KB que
 * ninguém lê. A capacidade do dublê é parte da régua (lição da feature 49, em `create-order`).
 */
export interface ClienteDeLeitura {
  from(tabela: 'products'): SeletorDeProdutos
}

/**
 * O client real, com **um** cast declarado.
 *
 * Os tipos gerados do `supabase-js` são muito mais amplos que `ClienteDeLeitura` e não são
 * estruturalmente atribuíveis a ele; o cast mora aqui, num lugar só, em vez de espalhar `any` pela
 * função (que é o que a baseline de lint deste app já carrega demais).
 */
const clientePadrao = (): ClienteDeLeitura => supabase as unknown as ClienteDeLeitura

const mensagemDoErro = (erro: unknown, padrao: string): string => {
  const texto = (erro as { message?: string } | null)?.message
  return texto && texto.trim() !== '' ? texto : padrao
}

/**
 * Lê o catálogo inteiro, ou **falha** (`BUS-13`).
 *
 * **Conta primeiro, pagina depois.** O custo é uma requisição `head` (o servidor devolve só o
 * número, sem uma linha atravessar a rede), e o que ela compra é que a leitura truncada vira erro
 * em vez de virar um catálogo menor — que é indistinguível de uma loja que encolheu, e faria o
 * seletor dizer "nenhuma peça com X" sobre uma peça que existe.
 *
 * **A ordem é `name` E `id`.** `name` não é único neste catálogo, e sem o segundo critério o
 * PostgREST não garante a mesma sequência entre páginas: linhas repetiriam ou sumiriam **com a
 * contagem batendo**, que é justamente o modo de falha que `readAllPages` não pega.
 */
export const lerPoolDeProdutos = async (
  client: ClienteDeLeitura = clientePadrao(),
): Promise<ProdutoDoPool[]> => {
  const { count, error } = await client
    .from('products')
    .select('id', { count: 'exact', head: true })

  if (error) {
    throw new Error(mensagemDoErro(error, 'não foi possível contar o catálogo'))
  }

  const total = count ?? 0
  if (total === 0) return []

  return readAllPages<ProdutoDoPool>({
    total,
    label: 'catálogo de produtos',
    consequence: 'o seletor diria “nenhuma peça com X” sobre uma peça que existe',
    readPage: async (inicio, fim) => {
      const { data, error: erroDaPagina } = await client
        .from('products')
        .select(PRODUCT_POOL_COLUMNS)
        .order('name')
        .order('id')
        .range(inicio, fim)

      if (erroDaPagina) {
        throw new Error(mensagemDoErro(erroDaPagina, 'não foi possível carregar o catálogo'))
      }
      return (data ?? []) as ProdutoDoPool[]
    },
  })
}

export interface PoolDeProdutos {
  produtos: ProdutoDoPool[]
  carregando: boolean
  /** Texto legível, nunca objeto de erro — quem desenha só precisa dizer o que aconteceu. */
  erro: string | null
  recarregar: () => void
}

/**
 * O pool, cacheado e compartilhado.
 *
 * **`BUS-20` sai de graça**: duas telas com a mesma `queryKey` são uma requisição, porque quem
 * desduplica é o React Query — não um singleton escrito à mão, que teria de decidir sozinho quando
 * expirar.
 *
 * **A falha NÃO vira lista vazia** (`BUS-12`): `erro` preenchido e `produtos` vazio são estados
 * diferentes, e o campo de busca precisa distinguir "não carregou" de "não há peça" — a segunda
 * mandaria a dona procurar o problema no catálogo.
 */
export const useProductPool = (): PoolDeProdutos => {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: PRODUCT_POOL_KEY,
    queryFn: () => lerPoolDeProdutos(),
    staleTime: PRODUCT_POOL_STALE_TIME,
  })

  return {
    produtos: data ?? [],
    carregando: isPending,
    erro: error ? mensagemDoErro(error, 'não foi possível carregar o catálogo') : null,
    recarregar: () => {
      void refetch()
    },
  }
}

/**
 * Invalida o pool (`BUS-16`) — chamado por quem **grava** produto.
 *
 * O estado de hoje é pior em frescor, não melhor: `useAdminProducts` não tem cache **nem**
 * invalidação, e só recarrega na montagem. Uma peça criada noutra aba já não aparecia. É isto que
 * torna a troca uma melhora de frescor, e não só de peso.
 */
export const invalidarPoolDeProdutos = (qc: QueryClient): Promise<void> =>
  qc.invalidateQueries({ queryKey: PRODUCT_POOL_KEY })
