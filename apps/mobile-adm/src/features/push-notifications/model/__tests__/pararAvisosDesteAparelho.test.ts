// Feature `79` · T20 — parar os avisos deste aparelho (design §4.5; `MAN-15`, `MAN-30`): a porta
// PRIMEIRO, o navegador depois, e o navegador nunca finge que parou quando a porta falhou.
import { describe, expect, it, vi } from 'vitest'

import { falhou, filaDaPorta, ok, portaFalsa, push } from '@/test/push'

import { pararAvisosDesteAparelho } from '../pararAvisosDesteAparelho'

vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)

const EXISTENTE = 'https://fcm.googleapis.com/fcm/send/p79-existente'
const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })

const semChamadaAPorta = () => {
  for (const f of Object.values(portaFalsa)) expect(f).not.toHaveBeenCalled()
}

describe('pararAvisosDesteAparelho', () => {
  it('sem inscrição no navegador ⇒ sem-inscricao, e ZERO chamadas à porta', async () => {
    push.instalar()
    await expect(pararAvisosDesteAparelho()).resolves.toBe('sem-inscricao')
    semChamadaAPorta()
  })

  it('sem suporte (o jsdom puro) ⇒ sem-inscricao, zero chamadas', async () => {
    await expect(pararAvisosDesteAparelho()).resolves.toBe('sem-inscricao')
    semChamadaAPorta()
  })

  it('sem o worker instalado ⇒ sem-inscricao, sem pendurar no `ready`', async () => {
    push.instalar({ semRegistro: true })
    await expect(pararAvisosDesteAparelho()).resolves.toBe('sem-inscricao')
    semChamadaAPorta()
  })

  it('com inscrição e a porta ok ⇒ desinscrever(endpoint) e DEPOIS unsubscribe() ⇒ parado', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', ok({ ok: true }))
    await expect(pararAvisosDesteAparelho()).resolves.toBe('parado')
    expect(portaFalsa.desinscrever).toHaveBeenCalledWith(EXISTENTE)
    expect(push.inscricao).toBeNull()
    expect(push.chamadas.log.filter((c) => c === 'porta desinscrever' || c === 'unsubscribe')).toEqual(['porta desinscrever', 'unsubscribe'])
  })

  it.each<[string, unknown]>([
    ['falhou', falhou()],
    ['erro com slug', { tipo: 'erro', slug: 'db_error', status: 400 }],
  ])('a porta %s ⇒ falhou, e o unsubscribe() do navegador NÃO é chamado', async (_n, resposta) => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', resposta)
    await expect(pararAvisosDesteAparelho()).resolves.toBe('falhou')
    expect(push.chamadas.unsubscribe).toBe(0)
    expect(push.inscricao?.endpoint).toBe(EXISTENTE)
  })

  it('a recusa da porta é relançada, e o navegador continua inscrito', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('desinscrever', () => Promise.reject(RECUSA))
    await expect(pararAvisosDesteAparelho()).rejects.toBe(RECUSA)
    expect(push.chamadas.unsubscribe).toBe(0)
  })

  it('o unsubscribe() do navegador que falha depois da porta ok não desfaz o `parado`', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    push.falharUnsubscribe()
    filaDaPorta('desinscrever', ok({ ok: true }))
    await expect(pararAvisosDesteAparelho()).resolves.toBe('parado')
  })
})
