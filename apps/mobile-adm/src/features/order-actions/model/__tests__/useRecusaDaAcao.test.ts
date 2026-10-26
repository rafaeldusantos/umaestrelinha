// Feature `75` · T23/T26 (R11) — a recusa que a porta lançou vale enquanto a leitura da página é a
// MESMA de quando ela chegou; uma releitura boa a apaga (senão a página ficaria presa na falha).
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useRecusaDaAcao } from '../useRecusaDaAcao'

const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })

describe('useRecusaDaAcao (R11)', () => {
  it('sem recusa ⇒ `null`', () => {
    const { result } = renderHook(() => useRecusaDaAcao(null, 100))
    expect(result.current).toBeNull()
  })

  it('a recusa vale com a MESMA leitura, e some quando a leitura muda (releitura boa)', () => {
    const { result, rerender } = renderHook(({ erro, lida }) => useRecusaDaAcao(erro, lida), {
      initialProps: { erro: RECUSA as unknown, lida: 100 },
    })
    expect(result.current).toBe(RECUSA)
    rerender({ erro: RECUSA, lida: 100 })
    expect(result.current).toBe(RECUSA)
    rerender({ erro: RECUSA, lida: 200 })
    expect(result.current).toBeNull()
  })

  it('uma recusa NOVA (outra identidade) depois da releitura volta a valer', () => {
    const { result, rerender } = renderHook(({ erro, lida }) => useRecusaDaAcao(erro, lida), {
      initialProps: { erro: RECUSA as unknown, lida: 100 },
    })
    rerender({ erro: RECUSA, lida: 200 })
    expect(result.current).toBeNull()
    const outra = Object.assign(new Error('de novo'), { code: '42501' })
    rerender({ erro: outra, lida: 200 })
    expect(result.current).toBe(outra)
  })
})
