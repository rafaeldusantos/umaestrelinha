// Feature 47 — o estado da tela cheia.
//
// O que este arquivo trava: o `Escape` só age quando há o que fechar, o ouvinte **sai** do
// documento ao desmontar, e as classes do modo têm um dono só — os dois palcos as recebem daqui, e
// por isso não podem divergir.

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FULLSCREEN_CLASSES, useFullscreenStage } from './useFullscreenStage'

const teclar = (key: string) => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }))
  })
}

describe('useFullscreenStage — entrar e sair', () => {
  it('começa fora do modo cheio', () => {
    const { result } = renderHook(() => useFullscreenStage())

    expect(result.current.cheia).toBe(false)
    expect(result.current.classes).toBe('')
  })

  it('`entrar()` liga e `sair()` desliga', () => {
    const { result } = renderHook(() => useFullscreenStage())

    act(() => result.current.entrar())
    expect(result.current.cheia).toBe(true)

    act(() => result.current.sair())
    expect(result.current.cheia).toBe(false)
  })

  it('as classes do modo cheio saem daqui, e são as mesmas para os dois palcos', () => {
    const { result } = renderHook(() => useFullscreenStage())

    act(() => result.current.entrar())

    expect(result.current.classes).toBe(FULLSCREEN_CLASSES)
    // A moldura precisa cobrir a tela inteira e ficar acima do resto do painel; sem `inset-0` ela
    // ficaria presa no lugar do palco, que é o que a feature existe para deixar de fazer.
    expect(result.current.classes).toContain('fixed')
    expect(result.current.classes).toContain('inset-0')
    expect(result.current.classes).toContain('z-50')
  })
})

describe('useFullscreenStage — FOCO-19: o `Escape` sai, e só ele', () => {
  it('`Escape` com o modo ligado sai', () => {
    const { result } = renderHook(() => useFullscreenStage())
    act(() => result.current.entrar())

    teclar('Escape')

    expect(result.current.cheia).toBe(false)
  })

  it('`Escape` com o modo desligado NÃO faz nada — não há o que fechar', () => {
    const { result } = renderHook(() => useFullscreenStage())

    teclar('Escape')

    expect(result.current.cheia).toBe(false)
  })

  it('outra tecla não sai', () => {
    const { result } = renderHook(() => useFullscreenStage())
    act(() => result.current.entrar())

    teclar('Enter')
    teclar('a')
    teclar('Esc')

    expect(result.current.cheia).toBe(true)
  })

  it('desmontar com o modo LIGADO remove o ouvinte do documento', () => {
    // **A régua é "o ouvinte SAIU", não "nada lançou".** `not.toThrow()` é verdade nos dois mundos:
    // em React 18 um `setState` depois do unmount é um no-op silencioso, então o ouvinte vazado
    // passaria despercebido — foi este o mutante que sobreviveu à primeira escrita deste caso.
    // Medir a identidade do handler é o que discrimina: o `removeEventListener` tem de receber
    // **a mesma função** que o `addEventListener` recebeu.
    const registrados = new Set<EventListenerOrEventListenerObject>()
    const adicionar = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((tipo, ouvinte) => {
        if (tipo === 'keydown') registrados.add(ouvinte)
      })
    const remover = vi
      .spyOn(window, 'removeEventListener')
      .mockImplementation((tipo, ouvinte) => {
        if (tipo === 'keydown') registrados.delete(ouvinte)
      })

    try {
      const { result, unmount } = renderHook(() => useFullscreenStage())
      act(() => result.current.entrar())

      expect(adicionar).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(registrados.size).toBe(1)
      const oQueEntrou = [...registrados][0]

      unmount()

      expect(remover).toHaveBeenCalledWith('keydown', oQueEntrou)
      // O saldo é zero: nenhum ouvinte de tecla ficou pendurado na janela.
      expect(registrados.size).toBe(0)
    } finally {
      adicionar.mockRestore()
      remover.mockRestore()
    }
  })

  it('sair do modo pela tela também retira o ouvinte — ele só existe enquanto há o que fechar', () => {
    const registrados = new Set<EventListenerOrEventListenerObject>()
    const adicionar = vi
      .spyOn(window, 'addEventListener')
      .mockImplementation((tipo, ouvinte) => {
        if (tipo === 'keydown') registrados.add(ouvinte)
      })
    const remover = vi
      .spyOn(window, 'removeEventListener')
      .mockImplementation((tipo, ouvinte) => {
        if (tipo === 'keydown') registrados.delete(ouvinte)
      })

    try {
      const { result } = renderHook(() => useFullscreenStage())
      expect(registrados.size).toBe(0)

      act(() => result.current.entrar())
      expect(registrados.size).toBe(1)

      act(() => result.current.sair())

      // É o edge case "a tela cheia termina junto com a tela": navegar para outra rota desmonta o
      // palco, e um ouvinte global permanente por palco seria dois `keydown` no documento em toda
      // tela do painel, para nada.
      expect(registrados.size).toBe(0)
      expect(remover).toHaveBeenCalledWith('keydown', expect.any(Function))
    } finally {
      adicionar.mockRestore()
      remover.mockRestore()
    }
  })
})
