// Feature `74` · T12 — `lerComPapel` sobre o dublê (`MAP-36`, `MAP-37`, `MAP-38`, emenda E2). A
// prova contra o supabase-js real está ao lado, em `lerComPapelComClientReal.test.ts`.
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { fake, type RespostaRpc } from '@/test/fakeSupabase'

import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { conferirPapel, lerComPapel } from '../lerComPapel'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'TypeError: Failed to fetch' }
const LINHAS_DA_CLIENTE = [{ id: 'pedido-dela' }]

beforeEach(() => fake.reset())

describe('lerComPapel — a recusa vence', () => {
  it('RPC 42501 + consulta com linhas ⇒ lança o 42501, e as linhas nunca saem', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    const consulta = vi.fn(async () => LINHAS_DA_CLIENTE)
    let saiu: unknown = 'nada'
    const erro = await lerComPapel(consulta).then((r) => (saiu = r), (e: unknown) => e)
    expect(erro).toEqual(RECUSA)
    expect(saiu).toBe('nada')
    expect(consulta).toHaveBeenCalledTimes(1)
  })

  it('RPC 42501 + consulta que REJEITA por rede ⇒ ainda o 42501 (não "não consegui carregar")', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    await expect(lerComPapel(async () => Promise.reject(new TypeError('Failed to fetch')))).rejects.toEqual(RECUSA)
  })

  it('RPC 42501 + consulta que lança SÍNCRONO ⇒ ainda o 42501', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    const consulta = (() => {
      throw new TypeError('quebrou ao montar')
    }) as unknown as () => Promise<unknown>
    await expect(lerComPapel(consulta)).rejects.toEqual(RECUSA)
  })

  it('a RPC que rejeita (o fetch lança) decide o erro, mesmo com a consulta boa', async () => {
    const falha = new TypeError('Failed to fetch')
    fake.aoChamarRpc('atelie_clock', () => Promise.reject(falha))
    await expect(lerComPapel(async () => LINHAS_DA_CLIENTE)).rejects.toBe(falha)
  })
})

describe('lerComPapel — rede não é recusa (MAP-38)', () => {
  it('RPC com erro de rede ⇒ lança um erro SEM o código de recusa', async () => {
    fake.falharRpc('atelie_clock', REDE)
    const erro = (await lerComPapel(async () => LINHAS_DA_CLIENTE).catch((e: unknown) => e)) as { code?: string; message: string }
    expect(erro.message).toBe('TypeError: Failed to fetch')
    expect(erro.code).toBeUndefined()
  })

  it('RPC ok + consulta falha ⇒ o erro DA CONSULTA', async () => {
    fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
    const daConsulta = { message: 'boom', code: 'PGRST301' }
    await expect(lerComPapel(async () => Promise.reject(daConsulta))).rejects.toBe(daConsulta)
  })

  it('RPC 200 sem `lido_em` não é confirmação: falha de leitura, nunca o dado', async () => {
    fake.responderRpc('atelie_clock', null)
    const erro = (await lerComPapel(async () => LINHAS_DA_CLIENTE).catch((e: unknown) => e)) as Error
    expect(erro.message).toBe('atelie_clock respondeu sem lido_em')
  })
})

describe('lerComPapel — o caminho bom', () => {
  it('RPC ok + consulta ok ⇒ o resultado e o instante do banco', async () => {
    fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
    await expect(lerComPapel(async () => LINHAS_DA_CLIENTE)).resolves.toEqual({ resultado: LINHAS_DA_CLIENTE, lido_em: LIDO_EM })
  })

  it('a RPC é chamada pelo nome literal, sem argumento, UMA vez por leitura', async () => {
    fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
    await lerComPapel(async () => 1)
    expect(fake.chamadasDe('atelie_clock')).toEqual([{ nome: 'atelie_clock', args: [] }])
  })

  it('a RPC e a consulta saem EM PARALELO: a consulta começa antes de a RPC responder', async () => {
    let soltar: (r: RespostaRpc) => void = () => {}
    fake.aoChamarRpc('atelie_clock', () => new Promise<RespostaRpc>((r) => (soltar = r)))
    const consulta = vi.fn(async () => 'dado')
    const promessa = lerComPapel(consulta)
    await Promise.resolve()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
    expect(consulta).toHaveBeenCalledTimes(1)
    soltar({ data: { lido_em: LIDO_EM }, error: null })
    await expect(promessa).resolves.toEqual({ resultado: 'dado', lido_em: LIDO_EM })
  })

  it('a consulta que resolve antes NÃO sai sem a RPC: enquanto ela não responde, nada é devolvido', async () => {
    fake.pendurarRpc('atelie_clock')
    let saiu = false
    void lerComPapel(async () => 'dado').then(() => (saiu = true))
    for (let i = 0; i < 20; i++) await Promise.resolve()
    expect(saiu).toBe(false)
  })
})

// Feature `75` · T15 — `conferirPapel`: a pergunta "quem é você?" depois de uma escrita que não mudou
// linha nenhuma (`MAA-21`, `MAA-23`, A3). A mesma RPC da leitura, chamada pelo mesmo literal.
describe('conferirPapel (feature 75)', () => {
  it('42501 ⇒ LANÇA a recusa, com o código que `isAccessDenied` reconhece', async () => {
    fake.falharRpc('atelie_clock', RECUSA)
    const erro = await conferirPapel().then(
      () => 'resolveu',
      (e: unknown) => e,
    )
    expect(erro).toEqual({ message: 'acesso restrito ao painel', code: '42501' })
    expect(isAccessDenied(erro)).toBe(true)
  })

  it('resposta boa ⇒ resolve, com UMA chamada à RPC pelo nome literal e sem argumento', async () => {
    fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
    await expect(conferirPapel()).resolves.toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toEqual([{ nome: 'atelie_clock', args: [] }])
  })

  it('rede como `{ error }` sem código ⇒ lança erro que NÃO é recusa (rede nunca é recusa)', async () => {
    fake.falharRpc('atelie_clock', REDE)
    const erro = await conferirPapel().catch((e: unknown) => e)
    expect(erro).toEqual(REDE)
    expect(isAccessDenied(erro)).toBe(false)
  })

  it('5xx (um `{ error }` com outro código) ⇒ lança erro que NÃO é recusa', async () => {
    fake.falharRpc('atelie_clock', { message: 'boom', code: 'XX000' })
    const erro = await conferirPapel().catch((e: unknown) => e)
    expect(erro).toEqual({ message: 'boom', code: 'XX000' })
    expect(isAccessDenied(erro)).toBe(false)
  })

  it('a RPC que REJEITA (o fetch lança) ⇒ o mesmo erro, que NÃO é recusa', async () => {
    const falha = new TypeError('Failed to fetch')
    fake.aoChamarRpc('atelie_clock', () => Promise.reject(falha))
    const erro = await conferirPapel().catch((e: unknown) => e)
    expect(erro).toBe(falha)
    expect(isAccessDenied(erro)).toBe(false)
  })

  it('200 sem `lido_em` não confirma: lança erro que NÃO é recusa', async () => {
    fake.responderRpc('atelie_clock', null)
    const erro = (await conferirPapel().catch((e: unknown) => e)) as Error
    expect(erro).toBeInstanceOf(Error)
    expect(erro.message).toBe('atelie_clock respondeu sem lido_em')
    expect(isAccessDenied(erro)).toBe(false)
  })
})
