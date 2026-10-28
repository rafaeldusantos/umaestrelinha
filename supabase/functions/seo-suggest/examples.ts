// Feature 84 (T06, A5, `SIA-21`) — os exemplos de tom e as leituras do contexto da sugestão.
//
// Os exemplos são o SEO que a própria Adri já curou: primeiro os "Produtos relacionados" do
// formulário; se sobrarem menos de 3, completa com produtos ATIVOS da mesma categoria, mais recentes
// primeiro. Até 5. Nenhum ⇒ a sugestão segue sem exemplos.
//
// As colunas de cada leitura são LITERAIS e mínimas (`SIA-21`): nada de custo, fornecedor, estoque
// ou cliente. O handler injeta o client service-role; nada aqui importa pacote.

/** Uma linha de produto, no que o exemplo usa. */
export interface ExampleRow {
  id: string
  name: string
  seo_title: string | null
  seo_description: string | null
}

export interface Example {
  name: string
  title: string
  description: string
}

/** As colunas pedidas em `products`. Exportadas para o teste comparar por igualdade. */
export const EXAMPLE_COLUMNS = 'id,name,seo_title,seo_description'

/**
 * A leitura por categoria filtra pelo vínculo N:N com um embed `!inner` sob alias — o molde de
 * `mapProduct.ts` da loja. O embed traz só `category_id`.
 */
export const SAME_CATEGORY_COLUMNS = `${EXAMPLE_COLUMNS},filtro:product_categories!inner(category_id)`

/** Quantas peças da mesma categoria a leitura traz (sobra para descontar as sem SEO e a própria). */
export const SAME_CATEGORY_READ_LIMIT = 8

/** Abaixo disto, os relacionados não bastam e a mesma categoria completa. */
const MIN_RELATED = 3

const curado = (r: ExampleRow | null | undefined): boolean =>
  !!r && typeof r.seo_title === 'string' && r.seo_title.trim() !== ''

/**
 * A régua de A5, pura. `related` na ordem do formulário; `sameCategory` já na ordem de recência.
 * Nunca repete, nunca o próprio produto, só com `seo_title` curado, no máximo `max`.
 */
export function pickExamples(
  related: readonly ExampleRow[],
  sameCategory: readonly ExampleRow[],
  productId: string | null,
  max = 5,
): Example[] {
  const vistos = new Set<string>()
  const saida: Example[] = []

  const tentar = (r: ExampleRow) => {
    if (saida.length >= max) return
    if (!curado(r) || r.id === productId || vistos.has(r.id)) return
    vistos.add(r.id)
    saida.push({
      name: String(r.name ?? ''),
      title: (r.seo_title as string).trim(),
      description: String(r.seo_description ?? '').trim(),
    })
  }

  related.forEach(tentar)
  if (saida.length < MIN_RELATED) sameCategory.forEach(tentar)
  return saida
}

export interface ContextInput {
  productId: string | null
  categoryIds: string[]
  relatedIds: string[]
}

export interface SuggestionContext {
  categoryNames: string[]
  examples: Example[]
  /** As leituras que falharam — só o nome, para o log. A sugestão segue sem elas. */
  readErrors: string[]
}

/**
 * As três leituras. Falha de leitura NÃO derruba a sugestão: o contexto vem sem aquela parte, e o
 * nome da leitura vai para `readErrors` (o handler registra no log).
 */
export async function loadContext(supabase: any, input: ContextInput): Promise<SuggestionContext> {
  const readErrors: string[] = []

  let categoryNames: string[] = []
  if (input.categoryIds.length > 0) {
    const { data, error } = await supabase.from('categories').select('id,name').in('id', input.categoryIds)
    if (error) readErrors.push('categories')
    else {
      const porId = new Map<string, string>(
        ((data ?? []) as Array<{ id: string; name: string }>).map((c) => [c.id, String(c.name ?? '')]),
      )
      categoryNames = input.categoryIds.map((id) => porId.get(id)).filter((n): n is string => !!n)
    }
  }

  let related: ExampleRow[] = []
  if (input.relatedIds.length > 0) {
    const { data, error } = await supabase.from('products').select(EXAMPLE_COLUMNS).in('id', input.relatedIds)
    if (error) readErrors.push('related')
    else {
      // Na ordem do formulário, não na do banco.
      const porId = new Map<string, ExampleRow>(((data ?? []) as ExampleRow[]).map((r) => [r.id, r]))
      related = input.relatedIds.map((id) => porId.get(id)).filter((r): r is ExampleRow => !!r)
    }
  }

  let sameCategory: ExampleRow[] = []
  const curadosRelacionados = pickExamples(related, [], input.productId).length
  if (curadosRelacionados < MIN_RELATED && input.categoryIds.length > 0) {
    const { data, error } = await supabase
      .from('products')
      .select(SAME_CATEGORY_COLUMNS)
      .in('filtro.category_id', input.categoryIds)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(SAME_CATEGORY_READ_LIMIT)
    if (error) readErrors.push('same_category')
    else sameCategory = (data ?? []) as ExampleRow[]
  }

  return { categoryNames, examples: pickExamples(related, sameCategory, input.productId), readErrors }
}
