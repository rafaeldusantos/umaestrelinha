import { supabase } from '@estrelinha/supabase/client'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'
import type { PushEvent } from '@estrelinha/core/notifications'

import { conferirPapel } from '@/shared/api/lerComPapel'
import { recusa } from '@/shared/api/recusa'

/**
 * A porta dos avisos no celular (feature `79`, design §4.5; `MAN-11`, `MAN-14`..`MAN-16`, `MAN-23`,
 * `MAN-31`..`MAN-33`, `MAN-36`).
 *
 * **O único arquivo do app que chama `functions.invoke`**, e só a edge function `atelie-avisos`
 * (`escritaSoPelaPorta.test.ts`, pela AST). A tabela das inscrições não tem policy para papel nenhum
 * de cliente (A16): toda leitura e escrita passa pela porta do servidor, que confere `has_role`.
 *
 * SPEC_DEVIATION (precisão — §4.5 diz "só com o nome literal `'atelie-avisos'`"): o supabase-js não
 * tem opção de query no `invoke`, e a function lê a ação de `?action=`; o nome passado é o literal
 * `'atelie-avisos?action=<ação>'`, um por função (o molde do painel com `melhor-envio` e
 * `send-notification`). O guarda aceita SÓ essa forma, com uma das seis ações.
 *
 * **A tradução de erro** (molde de `gravarAcao.ts`, `L-047`, `BL-048`). O status HTTP da function
 * NÃO decide recusa: o 403 de `requireAdmin` sai também quando `has_role` FALHA, e lê-lo como "não é
 * admin" traria de volta a recusa falsa que a `72` fechou. E o erro do `invoke` não carrega
 * `code: '42501'`. A regra:
 * - 2xx ⇒ `{ tipo: 'ok', dado }`;
 * - rede (`FunctionsFetchError`) ou relay ⇒ `{ tipo: 'falhou' }`, SEM perguntar o papel — rede nunca
 *   é recusa;
 * - 401 ou 403 ⇒ pergunta à MESMA RPC da leitura (`conferirPapel`): `42501` ⇒ LANÇA `recusa()` (o
 *   formato único do app); papel de pé ⇒ `falhou`; rede/5xx da conferência ⇒ `falhou`;
 * - outro 4xx com o slug no corpo (`cooldown`, `not_found`, `gone`, `invalid_endpoint`…) ⇒
 *   `{ tipo: 'erro', slug, status }`, para a tela escolher a frase;
 * - 5xx (ou 4xx sem slug legível) ⇒ `falhou`.
 *
 * O `invoke` do supabase-js NÃO rejeita: devolve `{ error }`. O status mora em `error.context` (o
 * `Response`) quando o erro é `FunctionsHttpError`, e o slug em `error.context.json()`.
 */
export type RespostaDaPorta<T> = { tipo: 'ok'; dado: T } | { tipo: 'erro'; slug: string; status: number } | { tipo: 'falhou'; erro?: unknown }

export interface ChavesDaInscricao {
  p256dh: string
  auth: string
}

const FALHOU = (erro?: unknown): RespostaDaPorta<never> => ({ tipo: 'falhou', erro })

/** O slug do corpo de um erro HTTP (`{ error: '<slug>' }`), ou `null` se não há um legível. */
const slugDe = async (resposta: Response): Promise<string | null> => {
  try {
    if (typeof resposta.json !== 'function') return null
    const corpo = (await resposta.json()) as { error?: unknown } | null
    return typeof corpo?.error === 'string' && corpo.error !== '' ? corpo.error : null
  } catch {
    return null
  }
}

const traduzir = async <T>({ data, error }: { data: unknown; error: unknown }): Promise<RespostaDaPorta<T>> => {
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
    const slug = await slugDe(resposta)
    if (slug) return { tipo: 'erro', slug, status }
  }
  return FALHOU(error)
}

/** A chave pública VAPID, lida do MESMO secret que assina (não há cópia dela numa env do app). */
export const lerConfig = async () =>
  traduzir<{ applicationServerKey: string }>(await supabase.functions.invoke('atelie-avisos?action=config', { body: {} }))

/** Este navegador está inscrito, para esta conta? (`MAN-36`) */
export const lerStatus = async (endpoint: string) =>
  traduzir<{ subscribed: boolean; events: PushEvent[] }>(
    await supabase.functions.invoke('atelie-avisos?action=status', { body: { endpoint } }),
  )

/** Grava a inscrição deste navegador na conta (`MAN-11`, `MAN-27`, `MAN-28`). */
export const inscrever = async (endpoint: string, keys: ChavesDaInscricao) =>
  traduzir<{ events: PushEvent[] }>(
    await supabase.functions.invoke('atelie-avisos?action=subscribe', {
      body: { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    }),
  )

/** Os interruptores deste aparelho (`MAN-14`). */
export const gravarEventos = async (endpoint: string, events: PushEvent[]) =>
  traduzir<{ events: PushEvent[] }>(await supabase.functions.invoke('atelie-avisos?action=events', { body: { endpoint, events } }))

/** Apaga a inscrição deste navegador no servidor (`MAN-15`, `MAN-30`). Ausente também é `ok`. */
export const desinscrever = async (endpoint: string) =>
  traduzir<{ ok: true }>(await supabase.functions.invoke('atelie-avisos?action=unsubscribe', { body: { endpoint } }))

/** O aviso de teste, só para este aparelho (`MAN-31`..`MAN-33`). */
export const testar = async (endpoint: string) =>
  traduzir<{ ok: true }>(await supabase.functions.invoke('atelie-avisos?action=test', { body: { endpoint } }))
