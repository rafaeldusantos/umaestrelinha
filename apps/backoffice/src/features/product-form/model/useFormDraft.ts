// Rascunho automático do formulário e guarda de saída (PFM-13).
//
// O defeito 12 era simples e caro: um F5 no meio do cadastro perdia tudo. O produto tem ~30 campos,
// 5 abas e uma grade — refazer isso é o tipo de coisa que faz o lojista desistir de usar o painel.
//
// `sessionStorage` e não `localStorage`, pelo mesmo motivo do `checkoutStore` e do editor de mockup:
// rascunho é da sessão. Um rascunho de três semanas atrás oferecido na abertura é pior que nenhum.
//
// **Limitação declarada:** o app monta `BrowserRouter` (`app/App.tsx`), não um data router, então
// `useBlocker` do react-router **não existe** aqui — bloquear navegação interna de dentro deste hook
// é impossível sem trocar o router do backoffice inteiro, que é escopo de outra coisa. O que este
// hook entrega é (1) o `beforeunload` do navegador, que cobre F5, fechar aba e link externo, e
// (2) `confirmLeave()`, que as ações que saem da tela (Cancelar, voltar do cabeçalho) chamam antes
// de navegar. É onde a guarda de navegação interna de fato acontece.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ProductFormState } from './useProductForm'

export interface FormDraft {
  /** `Date.now()` de quando o rascunho foi gravado — alimenta o "há N s". */
  savedAt: number
  form: ProductFormState
}

const PREFIX = 'nanapin-product-draft'

/**
 * Uma chave por produto. Sem isso, abrir o produto B com rascunho pendente do produto A ofereceria
 * restaurar os dados errados — e o admin aceitaria, porque a oferta não diz de quem é.
 */
export const draftKey = (productId?: string | null): string => `${PREFIX}:${productId ?? 'novo'}`

/** Toda leitura/escrita passa por aqui: `sessionStorage` pode lançar (cota, modo privado, iframe). */
const withStorage = <T,>(fn: (storage: Storage) => T, fallback: T): T => {
  try {
    if (typeof window === 'undefined' || !window.sessionStorage) return fallback
    return fn(window.sessionStorage)
  } catch {
    // Silêncio deliberado (PFM-13 / edge case da spec): o formulário funciona sem rascunho. Um
    // throw aqui derrubaria a tela de cadastro por causa de um recurso de conveniência.
    return fallback
  }
}

export const readDraft = (productId?: string | null): FormDraft | null =>
  withStorage(storage => {
    const raw = storage.getItem(draftKey(productId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed === null ||
      typeof parsed !== 'object' ||
      typeof (parsed as FormDraft).savedAt !== 'number' ||
      typeof (parsed as FormDraft).form !== 'object'
    ) {
      return null
    }
    return parsed as FormDraft
  }, null)

/** `false` quando não deu para gravar — o chamador usa isso para não mentir "rascunho salvo". */
export const writeDraft = (
  productId: string | null | undefined,
  form: ProductFormState,
  savedAt: number,
): boolean =>
  withStorage(storage => {
    storage.setItem(draftKey(productId), JSON.stringify({ savedAt, form } satisfies FormDraft))
    return true
  }, false)

export const clearDraft = (productId?: string | null): void =>
  withStorage(storage => storage.removeItem(draftKey(productId)), undefined)

/** A mensagem da confirmação de saída. Nomeia a consequência, não pergunta "tem certeza?". */
export const LEAVE_MESSAGE =
  'Você tem alterações não salvas neste produto. Sair agora descarta o que não foi salvo.'

export interface UseFormDraftOptions {
  productId?: string | null
  form: ProductFormState
  isDirty: boolean
  /** Debounce da gravação. 1,5 s é o suficiente para não gravar a cada tecla. */
  debounceMs?: number
}

export interface UseFormDraftResult {
  /** Quando o último rascunho foi gravado. `null` = nada gravado nesta sessão. */
  savedAt: number | null
  /** Rascunho encontrado na abertura, à espera de decisão. `null` quando não há ou já foi tratado. */
  pendingDraft: FormDraft | null
  /** Recusa a oferta sem apagar — o admin pode mudar de ideia num reload. */
  dismissDraft: () => void
  /** Apaga o rascunho deste produto. Chamado no save bem-sucedido e no Descartar. */
  discard: () => void
  /**
   * `true` se pode sair. Com alterações pendentes, pergunta primeiro.
   * É a guarda de navegação **interna** — ver a limitação no topo do arquivo.
   */
  confirmLeave: () => boolean
}

export const useFormDraft = ({
  productId,
  form,
  isDirty,
  debounceMs = 1500,
}: UseFormDraftOptions): UseFormDraftResult => {
  const [savedAt, setSavedAt] = useState<number | null>(null)
  // A oferta é lida UMA vez, na montagem: reler depois ofereceria de volta o rascunho que o próprio
  // hook acabou de gravar.
  const [pendingDraft, setPendingDraft] = useState<FormDraft | null>(() => readDraft(productId))
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isDirty) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const now = Date.now()
      if (writeDraft(productId, form, now)) setSavedAt(now)
    }, debounceMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [form, isDirty, productId, debounceMs])

  // F5, fechar aba e link externo. O texto não é exibido pelos navegadores modernos — eles mostram
  // o próprio diálogo —, mas `preventDefault` é o que faz o diálogo aparecer.
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = LEAVE_MESSAGE
      return LEAVE_MESSAGE
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const discard = useCallback(() => {
    clearDraft(productId)
    setSavedAt(null)
    setPendingDraft(null)
  }, [productId])

  const dismissDraft = useCallback(() => setPendingDraft(null), [])

  const confirmLeave = useCallback(() => {
    if (!isDirty) return true
    // `window.confirm` e não um dialog próprio: a decisão é binária e bloqueante, e um dialog
    // assíncrono no meio de uma navegação abre a janela em que a rota já mudou.
    return window.confirm(LEAVE_MESSAGE)
  }, [isDirty])

  return { savedAt, pendingDraft, dismissDraft, discard, confirmLeave }
}
