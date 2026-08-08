import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDraft,
  draftKey,
  LEAVE_MESSAGE,
  readDraft,
  useFormDraft,
  writeDraft,
} from './useFormDraft'
import { emptyProductForm, type ProductFormState } from './useProductForm'

// PFM-13 (P1.7 AC 6-9): rascunho por produto em `sessionStorage`, oferta de restauração, descarte no
// save, falha silenciosa quando o storage não dá, e guarda de saída só com alterações pendentes.

const form = (over: Partial<ProductFormState> = {}): ProductFormState => ({
  ...emptyProductForm(),
  name: 'Botton Sailor Moon',
  ...over,
})

beforeEach(() => {
  window.sessionStorage.clear()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('draftKey — uma chave por produto (AC 6)', () => {
  it('produtos diferentes têm chaves diferentes', () => {
    expect(draftKey('p1')).not.toBe(draftKey('p2'))
  })

  it('produto novo tem a sua própria chave, não a de um id vazio', () => {
    expect(draftKey(undefined)).toBe(draftKey(null))
    expect(draftKey(undefined)).not.toBe(draftKey('p1'))
  })
})

describe('readDraft / writeDraft / clearDraft', () => {
  it('grava e lê o rascunho do produto', () => {
    expect(writeDraft('p1', form({ name: 'Rascunho' }), 1000)).toBe(true)
    expect(readDraft('p1')).toEqual({ savedAt: 1000, form: form({ name: 'Rascunho' }) })
  })

  it('o rascunho de um produto não é visto por outro (AC 6)', () => {
    writeDraft('p1', form({ name: 'Do p1' }), 1000)
    expect(readDraft('p2')).toBeNull()
  })

  it('clearDraft apaga só o produto pedido', () => {
    writeDraft('p1', form(), 1000)
    writeDraft('p2', form(), 1000)

    clearDraft('p1')

    expect(readDraft('p1')).toBeNull()
    expect(readDraft('p2')).not.toBeNull()
  })

  it('conteúdo corrompido no storage devolve null em vez de explodir', () => {
    window.sessionStorage.setItem(draftKey('p1'), 'isto não é json')
    expect(readDraft('p1')).toBeNull()
  })

  it('JSON válido mas sem a forma de rascunho devolve null', () => {
    window.sessionStorage.setItem(draftKey('p1'), JSON.stringify({ qualquer: 'coisa' }))
    expect(readDraft('p1')).toBeNull()
  })

  // O spy vai em `Storage.prototype` e não na instância: em jsdom o `sessionStorage` é um Proxy, e
  // sobrescrever o método na instância não intercepta a chamada — o teste passaria por engano.
  it('storage que LANÇA na escrita devolve false, sem propagar (edge case da spec)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    expect(writeDraft('p1', form(), 1000)).toBe(false)
  })

  it('storage que LANÇA na leitura devolve null, sem propagar', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    expect(readDraft('p1')).toBeNull()
  })
})

describe('useFormDraft — gravação com debounce', () => {
  it('não grava nada enquanto o formulário está limpo', () => {
    renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))
    act(() => void vi.advanceTimersByTime(5000))

    expect(readDraft('p1')).toBeNull()
  })

  it('com alteração, grava depois do debounce e expõe o savedAt', () => {
    const { result } = renderHook(() =>
      useFormDraft({ productId: 'p1', form: form({ name: 'Editado' }), isDirty: true }),
    )
    expect(result.current.savedAt).toBeNull()

    act(() => void vi.advanceTimersByTime(1500))

    expect(result.current.savedAt).not.toBeNull()
    expect(readDraft('p1')?.form.name).toBe('Editado')
  })

  it('não grava antes do debounce fechar — uma tecla não é uma gravação', () => {
    renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: true }))
    act(() => void vi.advanceTimersByTime(1400))

    expect(readDraft('p1')).toBeNull()
  })

  it('storage indisponível: savedAt fica null e o hook não lança (AC: falha em silêncio)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    const { result } = renderHook(() =>
      useFormDraft({ productId: 'p1', form: form(), isDirty: true }),
    )
    act(() => void vi.advanceTimersByTime(1500))

    // Não dizer "rascunho salvo" quando não salvou é a metade que importa: o indicador não mente.
    expect(result.current.savedAt).toBeNull()
  })
})

describe('useFormDraft — oferta de restauração e descarte (AC 7-8)', () => {
  it('rascunho pendente na abertura é oferecido', () => {
    writeDraft('p1', form({ name: 'Rascunho anterior' }), 1000)

    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))

    expect(result.current.pendingDraft?.form.name).toBe('Rascunho anterior')
  })

  it('sem rascunho, nada é oferecido', () => {
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))
    expect(result.current.pendingDraft).toBeNull()
  })

  it('a oferta é lida uma vez: o rascunho que o próprio hook grava não volta como oferta', () => {
    const { result } = renderHook(() =>
      useFormDraft({ productId: 'p1', form: form({ name: 'Editado' }), isDirty: true }),
    )
    act(() => void vi.advanceTimersByTime(1500))

    expect(result.current.pendingDraft).toBeNull()
  })

  it('dismissDraft recusa a oferta SEM apagar — o admin pode mudar de ideia num reload', () => {
    writeDraft('p1', form({ name: 'Rascunho anterior' }), 1000)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))

    act(() => result.current.dismissDraft())

    expect(result.current.pendingDraft).toBeNull()
    expect(readDraft('p1')).not.toBeNull()
  })

  it('discard apaga o rascunho do produto — é o que o save bem-sucedido chama (AC 8)', () => {
    writeDraft('p1', form(), 1000)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))

    act(() => result.current.discard())

    expect(readDraft('p1')).toBeNull()
    expect(result.current.pendingDraft).toBeNull()
    expect(result.current.savedAt).toBeNull()
  })
})

describe('useFormDraft — guarda de saída (AC 9)', () => {
  it('formulário limpo: sai sem perguntar', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: false }))

    expect(result.current.confirmLeave()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
  })

  it('com alterações: pergunta, e o "cancelar" do admin impede a saída', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: true }))

    expect(result.current.confirmLeave()).toBe(false)
  })

  it('com alterações: o "sair" do admin libera', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: true }))

    expect(result.current.confirmLeave()).toBe(true)
  })

  it('a mensagem nomeia a consequência em vez de perguntar "tem certeza?"', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { result } = renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: true }))

    result.current.confirmLeave()

    expect(confirm).toHaveBeenCalledWith(LEAVE_MESSAGE)
    expect(LEAVE_MESSAGE).toContain('descarta')
  })

  it('beforeunload é registrado só com alterações pendentes', () => {
    const add = vi.spyOn(window, 'addEventListener')

    const { unmount } = renderHook(() =>
      useFormDraft({ productId: 'p1', form: form(), isDirty: false }),
    )
    expect(add.mock.calls.some(([type]) => type === 'beforeunload')).toBe(false)
    unmount()

    renderHook(() => useFormDraft({ productId: 'p1', form: form(), isDirty: true }))
    expect(add.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)
  })

  it('o listener de beforeunload sai no unmount — não sobra guarda em outra tela', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() =>
      useFormDraft({ productId: 'p1', form: form(), isDirty: true }),
    )

    unmount()

    expect(remove.mock.calls.some(([type]) => type === 'beforeunload')).toBe(true)
  })
})
