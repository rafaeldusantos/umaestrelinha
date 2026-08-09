// 23 · T17 — a gravação do redirect de categoria (`SEO-02`).
//
// Molde exato de `features/product-form/model/persistRedirect.ts`, inclusive a regra que não é
// óbvia (AC 9). O que muda é só a entidade: com `AD-018` a categoria mora na raiz do domínio, então
// renomear o slug dela mata endereço indexado do mesmo jeito que renomear o de um produto.
//
// **Não há toggle.** No produto, gravar o 301 é opção da tela (o aviso âmbar, `PFM-04` AC 10);
// aqui o inspetor não tem esse controle, então o redirect é consequência do rename e nada mais.

/** A fatia de `supabase-js` que esta função usa. Dublê pequeno = teste que prova o que importa. */
export interface CategoryRedirectClient {
  from: (table: string) => {
    upsert: (
      rows: unknown,
      options?: { onConflict?: string },
    ) => Promise<{ error: { message: string } | null }>
    delete: () => {
      eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>
    }
  }
}

export interface CategoryRedirectInput {
  categoryId: string
  /** O slug que estava no banco antes deste save. */
  previousSlug: string
  /** O slug que está sendo gravado agora. */
  nextSlug: string
}

export type CategoryRedirectResult =
  | { written: false; reason: 'unchanged' | 'empty' }
  | { written: true }
  | { written: false; reason: 'error'; message: string }

/**
 * Grava `category_redirects` quando faz sentido, e diz por que não gravou quando não faz.
 *
 * A regra herdada do molde é a que não é óbvia: se o slug NOVO já está em `category_redirects`
 * apontando para outra categoria, esse registro é **removido**. O slug ativo sempre vence o
 * redirect — senão a loja teria uma URL que é categoria e redirect ao mesmo tempo, e a resolução
 * dependeria da ordem da consulta. É a mesma precedência que `resolveCategoryRoute` aplica na
 * leitura (categoria viva > redirect > 404); as duas pontas têm de concordar.
 *
 * Slug reservado nunca chega aqui: a recusa é anterior ao save, nas duas superfícies do cadastro
 * (`URL-05`).
 */
export const persistCategoryRedirect = async (
  client: CategoryRedirectClient,
  { categoryId, previousSlug, nextSlug }: CategoryRedirectInput,
): Promise<CategoryRedirectResult> => {
  if (previousSlug === '' || nextSlug === '') return { written: false, reason: 'empty' }
  if (previousSlug === nextSlug) return { written: false, reason: 'unchanged' }

  // O slug que passa a ser ATIVO não pode continuar sendo redirect de ninguém.
  const conflict = await client.from('category_redirects').delete().eq('from_slug', nextSlug)
  if (conflict.error) return { written: false, reason: 'error', message: conflict.error.message }

  // `upsert` e não `insert`: a mesma categoria pode já ter passado por este slug antes (renomeou,
  // voltou atrás, renomeou de novo), e um `insert` estouraria a PK.
  const { error } = await client
    .from('category_redirects')
    .upsert([{ from_slug: previousSlug, category_id: categoryId }], { onConflict: 'from_slug' })
  if (error) return { written: false, reason: 'error', message: error.message }

  return { written: true }
}
