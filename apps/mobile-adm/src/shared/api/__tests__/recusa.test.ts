// Feature `79` · T16 — a recusa do app tem UM formato, e ele é o que `isAccessDenied` reconhece.
import { describe, expect, it } from 'vitest'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { recusa } from '../recusa'

describe('recusa() — o formato único da recusa no app', () => {
  it('é reconhecida por isAccessDenied, com o código 42501', () => {
    const r = recusa()
    expect(isAccessDenied(r)).toBe(true)
    expect(r.code).toBe('42501')
    expect(r).toBeInstanceOf(Error)
  })

  it('cada chamada é um erro novo (nada compartilhado entre duas recusas)', () => {
    expect(recusa()).not.toBe(recusa())
  })
})
