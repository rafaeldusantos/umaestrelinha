// Feature `76` · T11 — `lerComPapel` e `conferirPapel` subiram para `shared/api` (o app de Clientes
// precisa das mesmas duas). O slice de pedidos não os reexporta mais: a porta de escrita da `75` e os
// hooks importam do dono, e uma segunda porta pelo slice seria um segundo caminho para a mesma função.
import { describe, expect, it } from 'vitest'

import * as slice from '@/entities/order'
import { conferirPapel, lerComPapel } from '@/shared/api/lerComPapel'

describe('lerComPapel e conferirPapel moram em `shared/api` (feature 76)', () => {
  it('o dono exporta as duas funções', () => {
    expect(typeof conferirPapel).toBe('function')
    expect(typeof lerComPapel).toBe('function')
  })

  it('o slice de pedidos não reexporta nenhuma das duas', () => {
    expect('conferirPapel' in slice).toBe(false)
    expect('lerComPapel' in slice).toBe(false)
  })
})
