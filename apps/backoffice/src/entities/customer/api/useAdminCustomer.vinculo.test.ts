// Feature `76` · conserto do QA · `BUG-20261024-painel-ficha-puxa-pedido-de-outra-pessoa-por-underscore`
// (`BL-052`, A10). A ficha do painel ligava a pessoa aos pedidos por `customer_email.ilike.<e-mail cru>`,
// e em `ilike` o `_` é curinga: a ficha de `VROSA_RJ@…` puxava o pedido de `VROSAXRJ@…`, ao lado de um
// "GASTOU" que só contava o dela. O vínculo agora é o do dono (`customerOrdersCondition`, `core`): id OU
// e-mail exato, entre aspas, sem curinga.
import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { customerOrdersCondition } from '@estrelinha/core/customers'

const ID = '10a34544-07e8-ebdc-8871-3cf972cd178d'
const EMAIL = 'P76VROSA_RJ@exemplo.invalid'

const { chamadas } = vi.hoisted(() => ({ chamadas: [] as { tabela: string; metodo: string; args: unknown[] }[] }))

vi.mock('@estrelinha/supabase/client', () => {
  const resultado = (tabela: string) => {
    if (tabela === 'customer_list') return { data: { id: ID, email: EMAIL, name: 'P76 Valéria Rosa' }, error: null }
    return { data: [], error: null }
  }
  const builder = (tabela: string): unknown =>
    new Proxy(() => {}, {
      get: (_, metodo: string) => {
        if (metodo === 'then') return (ok: (v: unknown) => unknown) => ok(resultado(tabela))
        return (...args: unknown[]) => {
          chamadas.push({ tabela, metodo, args })
          return builder(tabela)
        }
      },
    })
  return { supabase: { from: (tabela: string) => builder(tabela) } }
})

import { useAdminCustomer } from './useAdminCustomer'

describe('o vínculo da ficha do painel com os pedidos (A10)', () => {
  it('liga por id OU por e-mail EXATO — o `_` do e-mail não vira curinga', async () => {
    const { result } = renderHook(() => useAdminCustomer(ID))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const or = chamadas.find((c) => c.tabela === 'orders' && c.metodo === 'or')
    expect(or).toBeDefined()
    expect(or!.args[0]).toBe(customerOrdersCondition(ID, EMAIL))
    // A forma antiga, com o e-mail cru e sem aspas, não pode voltar.
    expect(or!.args[0]).not.toContain(`ilike.${EMAIL}`)
    // O `_` chega escapado para o LIKE (`\_`) e o `\` escapado para o PostgREST (`\\_`).
    expect(or!.args[0]).toContain('P76VROSA\\\\_RJ@exemplo.invalid')
  })
})
