// Feature 61 · `ANL-05`/`ANL-06`/`ANL-07` — a chave secreta do Measurement Protocol, vista do painel.
//
// **O painel nunca lê a chave, e nunca toca a tabela onde ela mora.** `public.analytics_secrets` não
// tem policy nenhuma (`AD-047`): só a service role a alcança, e a service role não chega ao
// navegador (`AD-034`). Toda conversa passa pela edge function `google-analytics`, que exige admin e
// devolve **só o estado** — se existe e quando foi gravada. O valor faz uma viagem só, de ida.
//
// `chaveDeServidorForaDoNavegador.test.ts` (suíte da loja) recusa qualquer arquivo de `apps/**` que
// nomeie a chave de serviço; este arquivo depende disso para continuar verdadeiro.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'

export interface AnalyticsSecretStatus {
  secret_configured: boolean
  /** ISO. `null` quando a chave nunca foi gravada. */
  secret_updated_at: string | null
}

/** A chave do cache. Uma só, para quem lê e quem invalida não divergirem. */
export const ANALYTICS_SECRET_STATUS_KEY = ['google-analytics', 'secret-status'] as const

/**
 * Traduz o desfecho da function para a frase que a dona lê.
 *
 * `functions.invoke` devolve `error` para qualquer status ≥ 400 e **descarta o corpo** — a frase que
 * o handler escreveu em `{ error }` só chega lendo o `context` do `FunctionsHttpError`. É o mesmo
 * cuidado de `useAdminUsers.ts`: sem ele a tela diria "Edge Function returned a non-2xx status
 * code" no lugar de "a chave não pode ter espaços".
 */
const motivoDaFalha = async (erro: unknown, fallback: string): Promise<string> => {
  const resposta = (erro as { context?: Response })?.context
  if (resposta && typeof resposta.json === 'function') {
    try {
      const corpo = await resposta.json()
      if (corpo?.error) return String(corpo.error)
    } catch {
      // Corpo ilegível (proxy, timeout): o fallback ao menos é uma frase em português.
    }
  }
  return fallback
}

const lerEstado = async (): Promise<AnalyticsSecretStatus> => {
  const { data, error } = await supabase.functions.invoke('google-analytics?action=status', {
    method: 'GET',
  })
  if (error) {
    throw new Error(await motivoDaFalha(error, 'Não foi possível conferir a chave secreta agora.'))
  }
  return {
    secret_configured: data?.secret_configured === true,
    secret_updated_at: typeof data?.secret_updated_at === 'string' ? data.secret_updated_at : null,
  }
}

/**
 * O estado da chave. **Erro de leitura é erro**, nunca "não guardada": a tela que dissesse "a
 * chave não está guardada" por causa de uma falha de rede mandaria a dona criar outra chave no
 * Google sem necessidade.
 */
export const useAnalyticsSecretStatus = () =>
  useQuery({
    queryKey: ANALYTICS_SECRET_STATUS_KEY,
    queryFn: lerEstado,
    staleTime: 1000 * 60,
  })

/**
 * Grava a chave. Devolve `null` no sucesso ou o motivo da recusa — o formato `string | null` de todo
 * veredito do repositório (`strictNullChecks: false`).
 *
 * No sucesso **invalida o estado**: é a releitura que faz a tela passar a dizer "Guardada no
 * servidor" com a data que o servidor gravou, e não uma data inventada aqui.
 */
export const useSaveAnalyticsSecret = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (secret: string): Promise<string | null> => {
      const { error } = await supabase.functions.invoke('google-analytics?action=save-secret', {
        body: { secret },
      })
      if (error) return motivoDaFalha(error, 'Não foi possível guardar a chave agora.')
      await queryClient.invalidateQueries({ queryKey: ANALYTICS_SECRET_STATUS_KEY })
      return null
    },
  })

  return { save: mutation.mutateAsync, saving: mutation.isPending }
}
