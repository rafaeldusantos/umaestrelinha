// Disponibilidade do slug, verificada ENQUANTO se digita (PFM-03).
//
// O defeito 15: o slug duplicado só falhava no insert, quando o `UNIQUE` do banco estourava, e o
// admin recebia o toast genérico "Erro ao salvar produto" — sem saber qual campo, e depois de ter
// preenchido as 5 abas.
//
// O `UNIQUE` continua sendo a rede de segurança. Ele deixa de ser o MECANISMO.

import { useEffect, useState } from 'react'
import { supabase } from '@nanapin/supabase/client'

export type SlugStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'

export interface SlugAvailability {
  status: SlugStatus
  /** Sugestão de sufixo quando o slug está ocupado: `botton-sailor-moon-2`. */
  suggestion: string | null
}

/** `-2`, `-3`… O sufixo numérico é o que o admin espera e o que mantém a URL legível. */
export const suggestSlug = (slug: string, attempt = 2): string => {
  const base = slug.replace(/-\d+$/, '')
  return `${base}-${attempt}`
}

/**
 * @param slug      O slug digitado.
 * @param currentId Id do produto em edição — ele não colide consigo mesmo.
 * @param debounceMs 400 ms: rápido o bastante para parecer imediato, lento o bastante para não
 *                   consultar a cada tecla.
 */
export const useSlugAvailability = (
  slug: string,
  currentId?: string | null,
  debounceMs = 400,
): SlugAvailability => {
  const [status, setStatus] = useState<SlugStatus>('idle')
  const [suggestion, setSuggestion] = useState<string | null>(null)

  useEffect(() => {
    const value = slug.trim()
    if (value === '') {
      setStatus('idle')
      setSuggestion(null)
      return
    }
    // Slug com caractere fora de `[a-z0-9-]` não chega a ser uma URL — não vale consultar o banco.
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
      setStatus('invalid')
      setSuggestion(null)
      return
    }

    setStatus('checking')
    let cancelled = false
    const timer = setTimeout(async () => {
      let query = supabase.from('products').select('id').eq('slug', value)
      // Editando: o próprio produto não conta como colisão.
      if (currentId) query = query.neq('id', currentId)
      const { data, error } = await query.maybeSingle()
      if (cancelled) return

      if (error) {
        // `maybeSingle` devolve erro quando a consulta falha de verdade. Não dá para afirmar
        // "disponível" sem resposta — e afirmar isso é o que faria o save estourar no UNIQUE outra
        // vez, que é o defeito que este hook existe para matar.
        setStatus('error')
        setSuggestion(null)
        return
      }
      if (data) {
        setStatus('taken')
        setSuggestion(suggestSlug(value))
        return
      }
      setStatus('available')
      setSuggestion(null)
    }, debounceMs)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slug, currentId, debounceMs])

  return { status, suggestion }
}

/** O save é bloqueado quando o slug não pode existir. `error` NÃO bloqueia — ver abaixo. */
export const blocksSave = (status: SlugStatus): boolean =>
  status === 'taken' || status === 'invalid'
