import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { conferirPapel } from './lerComPapel'
import { recusa } from './recusa'

/**
 * A resposta de uma porta de edge function do app, já traduzida (feature `79`, levada para cá no
 * as portas dos avisos e dos pedidos montados traduzem do MESMO jeito; duas escritas da
 * tradução divergiriam, e a recusa falsa da `72` voltaria por uma delas).
 *
 * O status HTTP da function NÃO decide recusa: o 403 de `requireAdmin` sai também quando `has_role`
 * FALHA, e o erro do `invoke` não carrega `code: '42501'`. A regra:
 * - 2xx ⇒ `{ tipo: 'ok', dado }`;
 * - rede (`FunctionsFetchError`), relay ou `invoke` que rejeita ⇒ `{ tipo: 'falhou' }`, SEM perguntar o
 *   papel — rede nunca é recusa;
 * - 401 ou 403 ⇒ pergunta à MESMA RPC da leitura (`conferirPapel`): `42501` ⇒ LANÇA `recusa()` (o
 *   formato único do app); papel de pé ⇒ `falhou`; rede/5xx da conferência ⇒ `falhou`;
 * - outro 4xx com o slug no corpo ⇒ `{ tipo: 'erro', slug, status, … }`, para a tela escolher a frase;
 * - 5xx (ou 4xx sem slug legível) ⇒ `falhou`.
 *
 * O `invoke` do supabase-js NÃO rejeita: devolve `{ error }`. O status mora em `error.context` (o
 * `Response`) quando o erro é `FunctionsHttpError`, e o corpo em `error.context.json()`.
 */
export type RespostaDaPorta<T, E extends object = object> =
  | { tipo: 'ok'; dado: T }
  | ({ tipo: 'erro'; slug: string; status: number } & E)
  | { tipo: 'falhou'; erro?: unknown }

/**
 * Como uma porta lê o corpo de erro: o slug (e o que mais a tela precisar), ou `null` se o corpo não
 * diz. O padrão é o dos avisos: `{ error: '<slug>' }`.
 */
export type LeitorDoErro<E extends object> = (corpo: Record<string, unknown>) => ({ slug: string } & E) | null

const slugNoCampoError: LeitorDoErro<object> = (corpo) =>
  typeof corpo.error === 'string' && corpo.error !== '' ? { slug: corpo.error } : null

const FALHOU = (erro?: unknown): RespostaDaPorta<never> => ({ tipo: 'falhou', erro })

const corpoDe = async (resposta: Response): Promise<Record<string, unknown> | null> => {
  try {
    if (typeof resposta.json !== 'function') return null
    const corpo = (await resposta.json()) as unknown
    return corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Traduz o `{ data, error }` do `invoke`. Lança SÓ a recusa (`42501` de `conferirPapel`). */
export async function traduzir<T>(resultado: { data: unknown; error: unknown }): Promise<RespostaDaPorta<T>>
export async function traduzir<T, E extends object>(
  resultado: { data: unknown; error: unknown },
  lerErro: LeitorDoErro<E>,
): Promise<RespostaDaPorta<T, E>>
export async function traduzir<T, E extends object>(
  { data, error }: { data: unknown; error: unknown },
  lerErro: LeitorDoErro<E> = slugNoCampoError as LeitorDoErro<E>,
): Promise<RespostaDaPorta<T, E>> {
  if (!error) return { tipo: 'ok', dado: data as T }

  const e = error as { name?: unknown; context?: unknown }
  // Só o `FunctionsHttpError` carrega uma resposta da function. Rede (`FunctionsFetchError`), relay
  // e qualquer outra forma são falha, sem perguntar o papel.
  const resposta = e.context as Response | undefined
  if (e.name !== 'FunctionsHttpError' || typeof resposta?.status !== 'number') return FALHOU(error)
  const status = resposta.status

  if (status === 401 || status === 403) {
    try {
      await conferirPapel()
    } catch (conferencia) {
      if (isAccessDenied(conferencia)) throw recusa()
      return FALHOU(conferencia)
    }
    return FALHOU(error)
  }

  if (status >= 400 && status < 500) {
    const corpo = await corpoDe(resposta)
    const lido = corpo ? lerErro(corpo) : null
    if (lido) return { tipo: 'erro', status, ...lido }
  }
  return FALHOU(error)
}

/**
 * Chama o `invoke` e traduz — e o `invoke` que REJEITA (o client nunca deveria, mas um proxy ou um
 * dublê sem resposta rejeita) é falha, nunca exceção solta na tela.
 */
export const invocar = async (chamada: () => Promise<{ data: unknown; error: unknown }>): Promise<{ data: unknown; error: unknown }> => {
  try {
    return await chamada()
  } catch (erro) {
    return { data: null, error: erro }
  }
}
