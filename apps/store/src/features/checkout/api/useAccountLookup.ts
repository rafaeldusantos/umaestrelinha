// `IDN-01`/`IDN-09` — "este e-mail já tem conta?", perguntado uma vez por e-mail.
//
// ⚠️ **Desvio declarado do design**: ele previa React Query (`staleTime: Infinity`), e aqui a dedup
// é um cache de promessas em módulo. O motivo é do repositório, não preferência: `CheckoutPage` é
// montada **sem `QueryClientProvider`** nos testes, de propósito (está escrito no arquivo dela), e
// arrastar um provider para lá para memorizar um booleano é mais máquina do que a pergunta merece.
//
// O cache é de **promessa**, não de resultado: dois blur em sequência rápida no mesmo e-mail —
// que é o que acontece quando a pessoa corrige um caractere e volta — compartilham a MESMA
// requisição em voo, em vez de disparar duas e esperar a segunda.

import { useCallback } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { isValidEmail, normalizeEmail } from '@estrelinha/core/validators'

/** Chave: o e-mail **normalizado**. `A@B.com` e `a@b.com` são a mesma pergunta. */
const cache = new Map<string, Promise<boolean>>()

/** Só para teste: o cache é de módulo e sobreviveria entre casos. */
export function resetAccountLookupCache(): void {
  cache.clear()
}

async function perguntar(email: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('checkout?action=identify', {
      body: { email },
    })
    if (error) return false
    return (data as { registered?: boolean } | null)?.registered === true
  } catch {
    return false
  }
}

/**
 * `check(email)` responde se aquele e-mail já tem conta.
 *
 * **Falha e teto respondem `false`** (`IDN-09`), e isso é decisão: a recusa que decide é a do
 * servidor, em `create-order`. Responder `true` num erro desafiaria toda cliente nova e ninguém
 * compraria; responder `false` faz, no pior caso, a pessoa preencher a compra e ouvir o pedido de
 * código no fim — que é ruim, e só acontece para quem estourou o teto.
 *
 * **A resposta negativa NÃO é cacheada.** Ela pode ser um `false` de falha, e cacheá-lo prenderia a
 * pessoa no caminho de convidada pelo resto da sessão, mesmo depois de a rede voltar.
 */
export function useAccountLookup() {
  const check = useCallback(async (email: string): Promise<boolean> => {
    const chave = normalizeEmail(email)

    // E-mail sem formato válido não vira requisição: a régua é a MESMA de `isContactComplete`, e a
    // pessoa ainda está digitando quando o campo perde o foco no meio.
    if (!isValidEmail(chave)) return false

    const emVoo = cache.get(chave)
    if (emVoo) return emVoo

    const promessa = perguntar(chave)
    cache.set(chave, promessa)

    const resposta = await promessa
    if (!resposta) cache.delete(chave)
    return resposta
  }, [])

  return { check }
}
