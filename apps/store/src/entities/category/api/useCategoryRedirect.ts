import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

/**
 * O `category_id` que `category_redirects` guarda para um slug antigo, ou `null` (`SEO-02`).
 *
 * **A consulta só sai depois de o slug falhar** — mesmo princípio de `useProduct`, onde a leitura de
 * `product_redirects` vem depois da busca por slug. A diferença é de mecânica, não de regra: aqui o
 * "falhou" não é o resultado de uma consulta anterior no mesmo `queryFn`, e sim o veredito de
 * `resolveCategoryRoute` sobre a árvore que a loja **já** carregou. Por isso a guarda é o `enabled`,
 * que quem chama liga só quando o slug não é categoria viva. Sem ele, toda abertura de categoria —
 * e elas agora moram na raiz do domínio — pagaria uma leitura extra para nada.
 *
 * Devolve o id e não a categoria: quem sabe montar a canônica do destino é `resolveCategoryRoute`,
 * que já tem a árvore na mão. Buscar a categoria aqui seria uma terceira ida ao banco para responder
 * o que o cache tem.
 */
export const useCategoryRedirect = (slug: string, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['category-redirect', slug],
    queryFn: async (): Promise<string | null> => {
      const { data } = await supabase
        .from('category_redirects')
        .select('category_id')
        .eq('from_slug', slug)
        .maybeSingle()
      return (data as { category_id?: string } | null)?.category_id ?? null
    },
    enabled: !!slug && (options?.enabled ?? true),
  })
