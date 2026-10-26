// Feature `74` · T11 — o dublê de IntersectionObserver (R7): instalado em todo teste, não dispara
// sozinho, e o observador desligado não recebe mais nada (E4 só é medível assim).
import { describe, expect, it, vi } from 'vitest'

import { ObservadorFalso, dispararInterseccao, observadoresDe } from '@/test/intersecao'

describe('IntersectionObserver falso', () => {
  it('está instalado no window e registra o rootMargin', () => {
    const o = new IntersectionObserver(() => {}, { rootMargin: '0px 0px 600px 0px' })
    expect(o).toBeInstanceOf(ObservadorFalso)
    expect((o as unknown as ObservadorFalso).rootMargin).toBe('0px 0px 600px 0px')
  })

  it('não dispara ao observar; dispara só quando o teste manda', () => {
    const cb = vi.fn()
    const alvo = document.createElement('div')
    new IntersectionObserver(cb).observe(alvo)
    expect(cb).not.toHaveBeenCalled()
    expect(dispararInterseccao(alvo)).toBe(1)
    expect(cb).toHaveBeenCalledTimes(1)
    expect(cb.mock.calls[0][0][0]).toMatchObject({ isIntersecting: true, target: alvo })
  })

  it('o observador desligado não recebe mais nada', () => {
    const cb = vi.fn()
    const alvo = document.createElement('div')
    const o = new IntersectionObserver(cb)
    o.observe(alvo)
    o.disconnect()
    expect(observadoresDe(alvo)).toEqual([])
    expect(dispararInterseccao(alvo)).toBe(0)
    expect(cb).not.toHaveBeenCalled()
  })

  it('cada teste começa sem observador nenhum', () => {
    expect(ObservadorFalso.todos).toEqual([])
  })
})
