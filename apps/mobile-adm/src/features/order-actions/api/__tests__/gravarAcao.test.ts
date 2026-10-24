// Feature `75` · T16 — a porta de escrita do app (design §3.4; `MAA-04`, `MAA-21`, `MAA-22`, `MAA-29`).
//
// `runAppAction` (o dono, `core/order-actions`) e `conferirPapel` (a pergunta "quem é você?") são
// dublados POR MÓDULO: o que se prova aqui é a TRADUÇÃO que a porta faz do desfecho do dono — e que o
// "zero linhas" nunca vira resultado sem antes perguntar ao banco se a conta ainda tem papel.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppActionOutcome, OrderWriteDeps } from '@estrelinha/core/order-actions'
import { isAccessDenied } from '@estrelinha/core/hooks/useStoreOverview'

import { fake } from '@/test/fakeSupabase'
import type { LinhaDaLista } from '@/entities/order'

import { gravarAcao } from '../gravarAcao'

const dono = vi.hoisted(() => ({
  runAppAction: vi.fn(),
  triggerOrderNotification: vi.fn(),
  conferirPapel: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))
vi.mock('@estrelinha/core/order-actions', () => ({
  runAppAction: dono.runAppAction,
  triggerOrderNotification: dono.triggerOrderNotification,
}))
vi.mock('@/entities/order', () => ({ conferirPapel: dono.conferirPapel }))

const LINHA = { id: 'o-1', status: 'paid', material_status: 'nao_aplicavel' } as unknown as LinhaDaLista
const PRIMARIA = { tipo: 'primaria' } as const
const RASTREIO = { tipo: 'rastreio', codigo: 'ab 123 456 br', origem: 'acao' } as const
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }

const devolve = (r: AppActionOutcome) => dono.runAppAction.mockResolvedValueOnce(r)

beforeEach(() => {
  fake.reset()
  dono.runAppAction.mockReset()
  dono.triggerOrderNotification.mockReset()
  dono.conferirPapel.mockReset()
})

describe('gravarAcao — o que o dono decide passa adiante', () => {
  it.each<[string, AppActionOutcome]>([
    ['ok', { tipo: 'ok', emailSent: true, materialMudou: false }],
    ['falhou', { tipo: 'falhou', erro: { message: 'Failed to fetch' } }],
    ['material-recusado', { tipo: 'material-recusado', reason: 'invalid_transition', status: 'em_producao', to: 'material_recebido' }],
    ['parcial com causa falhou', { tipo: 'parcial', etapa: 'rastreio', causa: 'falhou' }],
    ['parcial material com causa falhou', { tipo: 'parcial', etapa: 'material', causa: 'falhou' }],
  ])('%s ⇒ devolvido igual, SEM conferir o papel', async (_, desfecho) => {
    devolve(desfecho)
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual(desfecho)
    expect(dono.conferirPapel).not.toHaveBeenCalled()
  })

  it('a linha e o pedido chegam ao dono como vieram (uma chamada)', async () => {
    devolve({ tipo: 'ok', emailSent: false, materialMudou: false })
    await gravarAcao(LINHA, RASTREIO)
    expect(dono.runAppAction).toHaveBeenCalledTimes(1)
    expect(dono.runAppAction.mock.calls[0][1]).toBe(LINHA)
    expect(dono.runAppAction.mock.calls[0][2]).toBe(RASTREIO)
  })
})

describe('gravarAcao — a recusa LANÇA (MAA-04, MAA-21)', () => {
  it('`sem-papel` (o `not_admin` da RPC) ⇒ lança `{ code: "42501" }`, sem conferir de novo', async () => {
    devolve({ tipo: 'sem-papel' })
    const erro = await gravarAcao(LINHA, PRIMARIA).then(
      () => 'resolveu',
      (e: unknown) => e,
    )
    expect(erro).toMatchObject({ code: '42501' })
    expect(isAccessDenied(erro)).toBe(true)
    expect(dono.conferirPapel).not.toHaveBeenCalled()
  })
})

describe('gravarAcao — zero linhas é PERGUNTA (MAA-21, MAA-22)', () => {
  it('`nenhuma-linha` + papel recusado (42501) ⇒ LANÇA a recusa, com UMA conferência', async () => {
    devolve({ tipo: 'nenhuma-linha' })
    dono.conferirPapel.mockRejectedValueOnce(RECUSA)
    const erro = await gravarAcao(LINHA, PRIMARIA).catch((e: unknown) => e)
    expect(erro).toBe(RECUSA)
    expect(isAccessDenied(erro)).toBe(true)
    expect(dono.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('`nenhuma-linha` + papel de pé ⇒ `{ tipo: "mudou" }`, com UMA conferência', async () => {
    devolve({ tipo: 'nenhuma-linha' })
    dono.conferirPapel.mockResolvedValueOnce(undefined)
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual({ tipo: 'mudou' })
    expect(dono.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('`nenhuma-linha` + conferência SEM REDE ⇒ `falhou` (rede nunca é recusa), nunca lança', async () => {
    devolve({ tipo: 'nenhuma-linha' })
    const rede = new TypeError('Failed to fetch')
    dono.conferirPapel.mockRejectedValueOnce(rede)
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual({ tipo: 'falhou', erro: rede })
  })

  it('`nenhuma-linha` + conferência com 5xx (outro código) ⇒ `falhou`', async () => {
    devolve({ tipo: 'nenhuma-linha' })
    const boom = { message: 'boom', code: 'XX000' }
    dono.conferirPapel.mockRejectedValueOnce(boom)
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual({ tipo: 'falhou', erro: boom })
  })

  it.each(['rastreio', 'material'] as const)('`parcial %s` com causa `nenhuma-linha` + papel de pé ⇒ o MESMO parcial, depois de UMA conferência', async (etapa) => {
    const parcial: AppActionOutcome = { tipo: 'parcial', etapa, causa: 'nenhuma-linha' }
    devolve(parcial)
    dono.conferirPapel.mockResolvedValueOnce(undefined)
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual(parcial)
    expect(dono.conferirPapel).toHaveBeenCalledTimes(1)
  })

  it('`parcial` com causa `nenhuma-linha` + papel recusado ⇒ LANÇA a recusa', async () => {
    devolve({ tipo: 'parcial', etapa: 'rastreio', causa: 'nenhuma-linha' })
    dono.conferirPapel.mockRejectedValueOnce(RECUSA)
    await expect(gravarAcao(LINHA, PRIMARIA)).rejects.toBe(RECUSA)
  })

  it('`parcial` com causa `nenhuma-linha` + conferência sem rede ⇒ ainda o parcial (rede nunca é recusa)', async () => {
    const parcial: AppActionOutcome = { tipo: 'parcial', etapa: 'rastreio', causa: 'nenhuma-linha' }
    devolve(parcial)
    dono.conferirPapel.mockRejectedValueOnce(new TypeError('Failed to fetch'))
    await expect(gravarAcao(LINHA, PRIMARIA)).resolves.toEqual(parcial)
  })
})

describe('gravarAcao — as dependências entregues ao dono', () => {
  it('`deps.client` é o client do app, e `deps.notify` chama `triggerOrderNotification` COM ELE', async () => {
    devolve({ tipo: 'ok', emailSent: true, materialMudou: false })
    await gravarAcao(LINHA, PRIMARIA)
    const deps = dono.runAppAction.mock.calls[0][0] as OrderWriteDeps
    expect(deps.client).toBe(fake.client)

    dono.triggerOrderNotification.mockResolvedValueOnce(true)
    await expect(deps.notify('o-1', 'order_status_changed')).resolves.toBe(true)
    expect(dono.triggerOrderNotification).toHaveBeenCalledWith(fake.client, 'o-1', 'order_status_changed')
  })
})
