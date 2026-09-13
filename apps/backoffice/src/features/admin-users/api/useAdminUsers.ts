import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { adminUserRefusal } from '@estrelinha/core/admin-users'

/**
 * Quem tem acesso ao painel — leitura e as cinco escritas (`USR-20`, `USR-22`, `USR-26`).
 *
 * **Toda chamada passa pela edge function `admin-users`**, e não pelo PostgREST: `auth.users` não é
 * exposto, e criar/apagar conta exige a service role, que não pode chegar ao navegador. O client já
 * anexa o JWT da sessão; quem confere o papel é o handler.
 *
 * Molde: `features/faq-library/api/useAdminFaqs.ts`. As três propriedades que importam vêm de lá:
 * recusa como `string | null`, `error` de leitura **distinto** de lista vazia (`AD-014`), e
 * `refetch` depois de toda escrita bem-sucedida.
 */

export interface AdminUser {
  id: string
  email: string
  name: string
  created_at: string
  last_sign_in_at: string | null
  /** Quem está logada. Desabilita as duas ações destrutivas na própria linha. */
  is_self: boolean
}

export interface NovoAcesso {
  name: string
  email: string
  password: string
}

/**
 * Traduz o desfecho da function para o que a dona precisa **fazer**.
 *
 * `supabase.functions.invoke` devolve `error` para qualquer status ≥ 400 e joga o corpo fora — então
 * o motivo legível que o handler escreveu em `{ error }` **não chega por essa porta**. Ler o corpo
 * de `FunctionsHttpError` é o que preserva a frase; sem isso a Adri leria "Edge Function returned a
 * non-2xx status code" no lugar de "esta conta tem 7 pedidos no histórico".
 */
const motivoDaFalha = async (erro: unknown, fallback: string): Promise<string> => {
  const resposta = (erro as { context?: Response })?.context
  if (resposta && typeof resposta.json === 'function') {
    try {
      const corpo = await resposta.json()
      if (corpo?.error) return String(corpo.error)
    } catch {
      // Corpo ilegível (proxy, timeout): cai no fallback, que ao menos é uma frase em português.
    }
  }
  return fallback
}

/** Uma chamada à function. Devolve `null` no sucesso, ou o motivo da recusa. */
const chamar = async (
  action: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<string | null> => {
  const { error } = await supabase.functions.invoke(`admin-users?action=${action}`, { body })
  return error ? await motivoDaFalha(error, fallback) : null
}

export const useAdminUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  /**
   * Falha de leitura, para a tela poder dizer "quebrou" em vez de "está vazio".
   *
   * A tela de Coleções engolia o erro exatamente aqui e mostrou grade vazia por meses sobre uma
   * tabela que nunca existiu (`AD-014`). Aqui o colapso seria pior: "nenhum acesso cadastrado" é um
   * estado que, se fosse verdade, significaria que ninguém entra no painel.
   */
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: err } = await supabase.functions.invoke('admin-users?action=list', {
      method: 'GET',
    })

    if (err) {
      setError(await motivoDaFalha(err, 'Não foi possível ler quem tem acesso ao painel.'))
      setLoading(false)
      return
    }

    setUsers((data?.users ?? []) as AdminUser[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetch()
  }, [fetch])

  /**
   * Cria um acesso. A recusa local usa a **mesma** função que a function chama — a tela barra cedo
   * para a pessoa não perder o que digitou, e a porta barra porque a escrita pode não vir da tela.
   */
  const create = useCallback(
    async (novo: NovoAcesso): Promise<string | null> => {
      const recusa = adminUserRefusal(novo)
      if (recusa) return recusa

      const motivo = await chamar('create', { ...novo }, 'Não foi possível criar o acesso agora.')
      if (motivo) return motivo

      await fetch()
      return null
    },
    [fetch],
  )

  const update = useCallback(
    async (id: string, name: string, email: string): Promise<string | null> => {
      // `password` ausente de propósito: editar não troca senha.
      const recusa = adminUserRefusal({ name, email })
      if (recusa) return recusa

      const motivo = await chamar('update', { id, name, email }, 'Não foi possível salvar agora.')
      if (motivo) return motivo

      await fetch()
      return null
    },
    [fetch],
  )

  /** Tira o acesso; a conta e o histórico ficam. */
  const revoke = useCallback(
    async (id: string): Promise<string | null> => {
      const motivo = await chamar('revoke', { id }, 'Não foi possível remover o acesso agora.')
      if (motivo) return motivo

      await fetch()
      return null
    },
    [fetch],
  )

  /** Apaga a conta de vez. A function recusa quando há histórico, e o banco garante. */
  const remove = useCallback(
    async (id: string): Promise<string | null> => {
      const motivo = await chamar('delete', { id }, 'Não foi possível apagar a conta agora.')
      if (motivo) return motivo

      await fetch()
      return null
    },
    [fetch],
  )

  /**
   * Dispara o e-mail de recuperação. **Não** faz `refetch`: nada na listagem muda, e uma releitura
   * aqui só piscaria a tabela sem motivo.
   */
  const resetPassword = useCallback(
    async (id: string): Promise<string | null> =>
      await chamar('reset-password', { id }, 'Não conseguimos enviar o e-mail agora.'),
    [],
  )

  return { users, loading, error, refetch: fetch, create, update, revoke, remove, resetPassword }
}

