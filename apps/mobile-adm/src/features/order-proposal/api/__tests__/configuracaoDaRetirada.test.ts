// A configuração da retirada da prévia do passo 4: lida de `store_settings` DENTRO de `lerComPapel` —
// a recusa do papel vence, e a resposta da tabela não sai daqui sem a confirmação.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fake } from '@/test/fakeSupabase'

import { lerConfiguracaoDaRetirada } from '../configuracaoDaRetirada'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ESCRITORIO = { street: 'Rua do Ateliê', number: '45', complement: 'sala 2', neighborhood: 'Moinhos', city: 'Porto Alegre', state: 'RS', zip: '90570000' }
const LINHAS = [
  { key: 'shipping', value: { pickup_enabled: false } },
  { key: 'material', value: ESCRITORIO },
]

beforeEach(() => {
  fake.reset()
  fake.responderRpc('atelie_clock', { lido_em: '2026-11-07T12:00:00Z' })
})

describe('lerConfiguracaoDaRetirada', () => {
  it('lê só as chaves shipping e material, e devolve o interruptor e o escritório', async () => {
    fake.responderTabela('store_settings', { data: LINHAS, error: null })
    const c = await lerConfiguracaoDaRetirada()
    expect(c.ligada).toBe(false)
    expect(c.escritorio).toMatchObject(ESCRITORIO)
    expect(fake.cadeiasDe('store_settings')).toEqual([
      [
        { metodo: 'select', args: ['key, value'] },
        { metodo: 'in', args: ['key', ['shipping', 'material']] },
      ],
    ])
  })

  it('sem as linhas: os defaults da loja (a retirada nasce ligada, o escritório vazio)', async () => {
    fake.responderTabela('store_settings', { data: [], error: null })
    const c = await lerConfiguracaoDaRetirada()
    expect(c.ligada).toBe(true)
    expect(c.escritorio.street ?? '').toBe('')
  })

  it('a conferência do papel em `42501`: lança a recusa, mesmo com a tabela respondendo', async () => {
    fake.responderTabela('store_settings', { data: LINHAS, error: null })
    fake.falharRpc('atelie_clock', { message: 'acesso restrito ao painel', code: '42501' })
    await expect(lerConfiguracaoDaRetirada()).rejects.toMatchObject({ code: '42501' })
  })

  it('a tabela em erro: lança o erro dela', async () => {
    fake.falharTabela('store_settings', { message: 'falhou' })
    await expect(lerConfiguracaoDaRetirada()).rejects.toMatchObject({ message: 'falhou' })
  })
})
