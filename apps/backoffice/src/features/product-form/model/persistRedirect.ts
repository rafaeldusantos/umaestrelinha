// Gravação do 301 no save (PFM-04 AC 7, 9, 10).
//
// A resolução do redirect na loja é `PST-07` e já existe (07/T20). Aqui fica só a **escrita**: o
// slug antigo passa a apontar para o produto.

import type { PersistClient } from './persistProduct'

export interface RedirectInput {
  productId: string
  /** O slug que estava no banco antes deste save. */
  previousSlug: string
  /** O slug que está sendo gravado agora. */
  nextSlug: string
  /** Toggle do aviso âmbar. Desligado ⇒ nenhum registro (AC 10). */
  enabled: boolean
}

export type RedirectResult =
  | { written: false; reason: 'disabled' | 'unchanged' | 'empty' }
  | { written: true }
  | { written: false; reason: 'error'; message: string }

/**
 * Grava `product_redirects` quando faz sentido, e diz por que não gravou quando não faz.
 *
 * A regra do AC 9 é a que não é óbvia: se o slug NOVO já está em `product_redirects` apontando para
 * outro produto, esse registro é **removido**. O slug ativo sempre vence o redirect — senão a loja
 * teria uma URL que é produto e redirect ao mesmo tempo, e a resolução dependeria da ordem da
 * consulta.
 */
export const persistRedirect = async (
  client: PersistClient,
  { productId, previousSlug, nextSlug, enabled }: RedirectInput,
): Promise<RedirectResult> => {
  if (!enabled) return { written: false, reason: 'disabled' }
  if (previousSlug === '' || nextSlug === '') return { written: false, reason: 'empty' }
  if (previousSlug === nextSlug) return { written: false, reason: 'unchanged' }

  // AC 9: o slug que passa a ser ATIVO não pode continuar sendo redirect de ninguém.
  const conflict = await client
    .from('product_redirects')
    .delete()
    .eq('from_slug', nextSlug)
    .in('from_slug', [nextSlug])
  if (conflict.error) return { written: false, reason: 'error', message: conflict.error.message }

  // `upsert` e não `insert`: o mesmo slug antigo pode já ter sido registrado num save anterior
  // (renomeou, voltou atrás, renomeou de novo), e um `insert` estouraria a PK.
  const { error } = await client
    .from('product_redirects')
    .upsert([{ from_slug: previousSlug, product_id: productId }], { onConflict: 'from_slug' })
  if (error) return { written: false, reason: 'error', message: error.message }

  return { written: true }
}
