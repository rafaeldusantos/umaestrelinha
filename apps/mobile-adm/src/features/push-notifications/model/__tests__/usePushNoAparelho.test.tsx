// Feature `79` · T19 — a máquina dos avisos neste aparelho (design §4.5; `MAN-10`..`MAN-16`, `MAN-36`,
// `MAN-41`). O navegador é o arnês de `@/test/push` (estados reais da plataforma) e a porta é o dublê
// por fila do mesmo arquivo. Os quatro eventos são escritos por extenso, nunca lidos da constante.
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { erroDaPorta, falhou, filaDaPorta, ok, portaFalsa, push } from '@/test/push'

import { usePushNoAparelho } from '../usePushNoAparelho'

vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)

const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']
const EXISTENTE = 'https://fcm.googleapis.com/fcm/send/p79-existente'
const RECUSA = Object.assign(new Error('acesso restrito ao painel'), { code: '42501' })

const montar = () => renderHook(() => usePushNoAparelho())
const assentar = () => act(async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
})

/** Monta ligado: inscrição existente que o servidor conhece, com os eventos dados. */
const montarLigado = async (events = OS_QUATRO) => {
  push.instalar({ permissao: 'granted', inscrito: true })
  filaDaPorta('lerStatus', ok({ subscribed: true, events }))
  const h = montar()
  await waitFor(() => expect(h.result.current.estado.tipo).toBe('ligado'))
  return h
}

describe('o estado ao abrir', () => {
  it.each<[string, Parameters<typeof push.instalar>[0] | null]>([
    ['nada instalado (o jsdom)', null],
    ['sem serviceWorker', { suporte: { serviceWorker: false } }],
    ['sem PushManager', { suporte: { pushManager: false } }],
    ['sem Notification', { suporte: { notification: false } }],
  ])('%s ⇒ sem-suporte, sem ir à porta (MAN-13)', async (_n, opcoes) => {
    if (opcoes) push.instalar(opcoes)
    const h = montar()
    await assentar()
    expect(h.result.current.estado).toEqual({ tipo: 'sem-suporte' })
    expect(portaFalsa.lerStatus).not.toHaveBeenCalled()
  })

  it('permissão negada ⇒ bloqueado, sem ler a inscrição nem a porta (MAN-12)', async () => {
    push.instalar({ permissao: 'denied', inscrito: true })
    const h = montar()
    await assentar()
    expect(h.result.current.estado).toEqual({ tipo: 'bloqueado' })
    expect(push.chamadas.getSubscription).toBe(0)
    expect(portaFalsa.lerStatus).not.toHaveBeenCalled()
  })

  it('sem inscrição no navegador ⇒ desligado, sem perguntar à porta', async () => {
    push.instalar()
    const h = montar()
    await waitFor(() => expect(h.result.current.estado).toEqual({ tipo: 'desligado' }))
    expect(portaFalsa.lerStatus).not.toHaveBeenCalled()
  })

  it('sem o worker instalado (o `ready` nunca resolveria) ⇒ desligado, sem pendurar em `verificando`', async () => {
    push.instalar({ semRegistro: true })
    const h = montar()
    await waitFor(() => expect(h.result.current.estado).toEqual({ tipo: 'desligado' }))
    expect(portaFalsa.lerStatus).not.toHaveBeenCalled()
  })

  it('inscrição que o servidor NÃO conhece ⇒ desligado (MAN-36)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', ok({ subscribed: false, events: [] }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado).toEqual({ tipo: 'desligado' }))
    expect(portaFalsa.lerStatus).toHaveBeenCalledWith(EXISTENTE)
  })

  it('inscrição conhecida ⇒ ligado, com os eventos do servidor e o endpoint', async () => {
    const h = await montarLigado(['owner_order_paid'])
    expect(h.result.current.estado).toEqual({ tipo: 'ligado', events: ['owner_order_paid'], endpoint: EXISTENTE })
  })

  it('MONTAR NÃO PEDE PERMISSÃO (MAN-10) — com e sem inscrição, com a permissão em default', async () => {
    push.instalar({ permissao: 'default' })
    const a = montar()
    await waitFor(() => expect(a.result.current.estado.tipo).toBe('desligado'))
    a.unmount()
    push.reset()
    push.instalar({ permissao: 'default', inscrito: true })
    filaDaPorta('lerStatus', ok({ subscribed: true, events: OS_QUATRO }))
    const b = montar()
    await waitFor(() => expect(b.result.current.estado.tipo).toBe('ligado'))
    expect(push.chamadas.requestPermission).toBe(0)
  })

  it('a leitura do status falhando ⇒ erro de leitura (nunca desligado nem ligado)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', falhou())
    const h = montar()
    await waitFor(() => expect(h.result.current.estado).toEqual({ tipo: 'erro', motivo: 'ler' }))
  })

  it('a recusa na leitura ao abrir fica em `recusa` (não vira erro)', async () => {
    push.instalar({ permissao: 'granted', inscrito: true })
    filaDaPorta('lerStatus', () => Promise.reject(RECUSA))
    const h = montar()
    await waitFor(() => expect(h.result.current.recusa).toBe(RECUSA))
    expect(h.result.current.estado.tipo).not.toBe('erro')
  })
})

describe('ativar (MAN-11, MAN-12, MAN-16)', () => {
  it('concedida ⇒ requestPermission → config → subscribe com a chave → inscrever ⇒ ligado com os quatro', async () => {
    push.instalar({ permissao: 'default', respostaDoPedido: 'granted' })
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BKEY-DA-PORTA' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))

    await act(() => h.result.current.ativar())

    expect(push.chamadas.subscribe).toEqual([{ userVisibleOnly: true, applicationServerKey: 'BKEY-DA-PORTA' }])
    const endpoint = push.inscricao!.endpoint
    expect(portaFalsa.inscrever).toHaveBeenCalledWith(endpoint, {
      p256dh: push.inscricao!.toJSON().keys!.p256dh,
      auth: push.inscricao!.toJSON().keys!.auth,
    })
    expect(h.result.current.estado).toEqual({ tipo: 'ligado', events: OS_QUATRO, endpoint })
    expect(push.chamadas.log).toEqual(['getRegistration', 'getSubscription', 'requestPermission', 'porta lerConfig', 'subscribe', 'porta inscrever'])
  })

  it('o estado é `ativando` enquanto o subscribe está no ar', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    const soltar = push.segurarSubscribe()
    let fim!: Promise<void>
    act(() => {
      fim = h.result.current.ativar()
    })
    await waitFor(() => expect(push.chamadas.subscribe).toHaveLength(1))
    expect(h.result.current.estado).toEqual({ tipo: 'ativando' })
    await act(async () => {
      soltar()
      await fim
    })
    expect(h.result.current.estado.tipo).toBe('ligado')
  })

  it('permissão NEGADA ⇒ bloqueado, nada pedido ao navegador nem à porta (MAN-12)', async () => {
    push.instalar({ respostaDoPedido: 'denied' })
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'bloqueado' })
    expect(push.chamadas.subscribe).toEqual([])
    expect(portaFalsa.lerConfig).not.toHaveBeenCalled()
    expect(portaFalsa.inscrever).not.toHaveBeenCalled()
  })

  it('pedido fechado sem resposta (default) ⇒ desligado, nada gravado', async () => {
    push.instalar({ respostaDoPedido: 'default' })
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
    expect(portaFalsa.inscrever).not.toHaveBeenCalled()
  })

  it('a porta falhando ao gravar ⇒ unsubscribe() no navegador e erro (MAN-16)', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', falhou())
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'erro', motivo: 'ativar' })
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(push.inscricao).toBeNull()
  })

  it('a porta recusando a gravação por validação (slug) ⇒ unsubscribe() e erro', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', erroDaPorta('endpoint_host_not_allowed', 400))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'erro', motivo: 'ativar' })
    expect(push.inscricao).toBeNull()
  })

  it('a config falhando (503 sem VAPID) ⇒ erro, e o navegador nem é inscrito', async () => {
    push.instalar()
    filaDaPorta('lerConfig', falhou())
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'erro', motivo: 'ativar' })
    expect(push.chamadas.subscribe).toEqual([])
  })

  it('o subscribe do navegador lançando ⇒ erro, e a porta não grava', async () => {
    push.instalar()
    push.falharSubscribe()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado).toEqual({ tipo: 'erro', motivo: 'ativar' })
    expect(portaFalsa.inscrever).not.toHaveBeenCalled()
  })

  it('a RECUSA da porta é relançada — com a inscrição do navegador desfeita, e sem virar erro', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', () => Promise.reject(RECUSA))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    let lancou: unknown = null
    await act(async () => {
      await h.result.current.ativar().catch((e: unknown) => (lancou = e))
    })
    expect(lancou).toBe(RECUSA)
    expect(push.inscricao).toBeNull()
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
  })

  it('toque duplo no MESMO tique ⇒ um requestPermission e um subscribe só', async () => {
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(async () => {
      const ativar = h.result.current.ativar
      await Promise.all([ativar(), ativar()])
    })
    expect(push.chamadas.requestPermission).toBe(1)
    expect(push.chamadas.subscribe).toHaveLength(1)
    expect(portaFalsa.inscrever).toHaveBeenCalledTimes(1)
    expect(h.result.current.estado.tipo).toBe('ligado')
  })

  it('depois de um erro, tocar de novo tenta de novo', async () => {
    push.instalar()
    filaDaPorta('lerConfig', falhou(), ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const h = montar()
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado.tipo).toBe('erro')
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado.tipo).toBe('ligado')
  })
})

describe('o interruptor (MAN-14, MAN-41)', () => {
  it('otimista: a lista muda na hora, `gravando` é o evento, e a resposta da porta fecha', async () => {
    const h = await montarLigado()
    let soltar!: () => void
    filaDaPorta('gravarEventos', () => new Promise((r) => (soltar = () => r(ok({ events: ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'] })))))
    let fim!: Promise<void>
    act(() => {
      fim = h.result.current.alternar('owner_order_paid', false)
    })
    expect(h.result.current.estado).toMatchObject({ events: ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'] })
    expect(h.result.current.gravando).toBe('owner_order_paid')
    expect(portaFalsa.gravarEventos).toHaveBeenCalledWith(EXISTENTE, ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'])
    await act(async () => {
      soltar()
      await fim
    })
    expect(h.result.current.gravando).toBeNull()
    expect(h.result.current.falhaAoGravar).toBe(false)
    expect(h.result.current.estado).toMatchObject({ tipo: 'ligado', events: ['owner_order_received', 'owner_payment_rejected', 'owner_material_incoming'] })
  })

  it('ligar de novo devolve o evento na ordem da jornada', async () => {
    const h = await montarLigado(['owner_order_received', 'owner_material_incoming'])
    filaDaPorta('gravarEventos', ok({ events: ['owner_order_received', 'owner_order_paid', 'owner_material_incoming'] }))
    await act(() => h.result.current.alternar('owner_order_paid', true))
    expect(portaFalsa.gravarEventos).toHaveBeenCalledWith(EXISTENTE, ['owner_order_received', 'owner_order_paid', 'owner_material_incoming'])
  })

  it('a falha VOLTA a lista anterior e acende falhaAoGravar', async () => {
    const h = await montarLigado()
    filaDaPorta('gravarEventos', falhou())
    await act(() => h.result.current.alternar('owner_order_paid', false))
    expect(h.result.current.estado).toMatchObject({ tipo: 'ligado', events: OS_QUATRO })
    expect(h.result.current.falhaAoGravar).toBe(true)
    expect(h.result.current.gravando).toBeNull()
  })

  it('a recusa volta a lista e é relançada', async () => {
    const h = await montarLigado()
    filaDaPorta('gravarEventos', () => Promise.reject(RECUSA))
    let lancou: unknown = null
    await act(async () => {
      await h.result.current.alternar('owner_order_paid', false).catch((e: unknown) => (lancou = e))
    })
    expect(lancou).toBe(RECUSA)
    expect(h.result.current.estado).toMatchObject({ events: OS_QUATRO })
  })
})

describe('parar (MAN-15)', () => {
  it('desinscreve na porta e no navegador ⇒ desligado', async () => {
    const h = await montarLigado()
    filaDaPorta('desinscrever', ok({ ok: true }))
    await act(() => h.result.current.parar())
    expect(portaFalsa.desinscrever).toHaveBeenCalledWith(EXISTENTE)
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(push.inscricao).toBeNull()
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
  })

  it('a porta falhando ⇒ continua ligado, o navegador NÃO desinscreve, e falhaAoParar', async () => {
    const h = await montarLigado()
    filaDaPorta('desinscrever', falhou())
    await act(() => h.result.current.parar())
    expect(h.result.current.estado.tipo).toBe('ligado')
    expect(push.chamadas.unsubscribe).toBe(0)
    expect(h.result.current.falhaAoParar).toBe(true)
  })
})

describe('o aviso de teste (MAN-31..MAN-33) — T21', () => {
  it('sai pela porta com o endpoint DESTE aparelho; `testando` no ar, nenhuma falha no fim', async () => {
    const h = await montarLigado()
    let soltar!: () => void
    filaDaPorta('testar', () => new Promise((r) => (soltar = () => r(ok({ ok: true })))))
    let p!: Promise<void>
    act(() => {
      p = h.result.current.testar()
    })
    expect(h.result.current.testando).toBe(true)
    expect(portaFalsa.testar).toHaveBeenCalledWith(EXISTENTE)
    await act(async () => {
      soltar()
      await p
    })
    expect(h.result.current.testando).toBe(false)
    expect(h.result.current.falhaDoTeste).toBeNull()
  })

  it('o teto do servidor (slug `cooldown`) ⇒ `cooldown`, nunca `falhou` (MAN-33)', async () => {
    const h = await montarLigado()
    filaDaPorta('testar', erroDaPorta('cooldown', 429))
    await act(() => h.result.current.testar())
    expect(h.result.current.falhaDoTeste).toBe('cooldown')
  })

  it.each([
    ['falha de rede', falhou()],
    ['502 do serviço de push', erroDaPorta('push_failed', 502)],
  ])('%s ⇒ `falhou` (MAN-32)', async (_n, resposta) => {
    const h = await montarLigado()
    filaDaPorta('testar', resposta)
    await act(() => h.result.current.testar())
    expect(h.result.current.falhaDoTeste).toBe('falhou')
  })

  it('a recusa é relançada, e não vira falha', async () => {
    const h = await montarLigado()
    filaDaPorta('testar', () => Promise.reject(RECUSA))
    let lancou: unknown
    await act(async () => {
      await h.result.current.testar().catch((e: unknown) => (lancou = e))
    })
    expect(lancou).toBe(RECUSA)
    expect(h.result.current.falhaDoTeste).toBeNull()
  })

  it('o toque duplo no mesmo tique manda UM teste; e fora do `ligado` não sai nenhum', async () => {
    const h = await montarLigado()
    filaDaPorta('testar', ok({ ok: true }), ok({ ok: true }))
    await act(async () => {
      await Promise.all([h.result.current.testar(), h.result.current.testar()])
    })
    expect(portaFalsa.testar).toHaveBeenCalledTimes(1)

    push.reset()
    push.instalar()
    const d = montar()
    await waitFor(() => expect(d.result.current.estado).toEqual({ tipo: 'desligado' }))
    await act(() => d.result.current.testar())
    expect(portaFalsa.testar).not.toHaveBeenCalled()
  })

  it('um novo teste apaga a falha anterior', async () => {
    const h = await montarLigado()
    filaDaPorta('testar', falhou(), ok({ ok: true }))
    await act(() => h.result.current.testar())
    expect(h.result.current.falhaDoTeste).toBe('falhou')
    await act(() => h.result.current.testar())
    expect(h.result.current.falhaDoTeste).toBeNull()
  })
})

// BUG-20261025-teste-com-aparelho-descartado-deixa-a-tela-ligada (decisão do usuário, 2026-10-26: a
// opção 1). O servidor apagou a inscrição — `gone` (410: o serviço de push descartou o aparelho) ou
// `not_found` (404: a linha já não existe) — e a tela seguia "ligada", com todo toque dizendo "tente
// de novo". Agora o aparelho volta a `desligado`, desfaz a inscrição do navegador e acende
// `descartado`, que é a frase que explica a volta.
describe('o aparelho que o servidor não conhece mais (o 410 do teste)', () => {
  it.each([
    ['410 `gone` no aviso de teste', erroDaPorta('gone', 410)],
    ['404 `not_found` no aviso de teste', erroDaPorta('not_found', 404)],
  ])('%s ⇒ desligado, `descartado`, o navegador desinscrito, e nenhuma frase de "tente de novo"', async (_n, resposta) => {
    const h = await montarLigado()
    filaDaPorta('testar', resposta)
    await act(() => h.result.current.testar())
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
    expect(h.result.current.descartado).toBe(true)
    expect(h.result.current.falhaDoTeste).toBeNull()
    expect(h.result.current.testando).toBe(false)
    expect(push.chamadas.unsubscribe).toBe(1)
    expect(push.inscricao).toBeNull()
  })

  it('404 `not_found` num interruptor ⇒ o mesmo desfecho, sem `falhaAoGravar`', async () => {
    const h = await montarLigado()
    filaDaPorta('gravarEventos', erroDaPorta('not_found', 404))
    await act(() => h.result.current.alternar('owner_order_paid', false))
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
    expect(h.result.current.descartado).toBe(true)
    expect(h.result.current.falhaAoGravar).toBe(false)
    expect(h.result.current.gravando).toBeNull()
    expect(push.chamadas.unsubscribe).toBe(1)
  })

  it('o navegador que falha ao desinscrever não segura a tela em `ligado`', async () => {
    const h = await montarLigado()
    push.falharUnsubscribe()
    filaDaPorta('testar', erroDaPorta('gone', 410))
    await act(() => h.result.current.testar())
    expect(h.result.current.estado).toEqual({ tipo: 'desligado' })
    expect(h.result.current.descartado).toBe(true)
  })

  it('outro 4xx num interruptor continua sendo falha comum: a lista volta e segue ligado', async () => {
    const h = await montarLigado()
    filaDaPorta('gravarEventos', erroDaPorta('invalid_events', 400))
    await act(() => h.result.current.alternar('owner_order_paid', false))
    expect(h.result.current.estado).toMatchObject({ tipo: 'ligado', events: OS_QUATRO })
    expect(h.result.current.falhaAoGravar).toBe(true)
    expect(h.result.current.descartado).toBe(false)
    expect(push.chamadas.unsubscribe).toBe(0)
  })

  it('ativar de novo apaga `descartado` no toque', async () => {
    const h = await montarLigado()
    filaDaPorta('testar', erroDaPorta('gone', 410))
    await act(() => h.result.current.testar())
    expect(h.result.current.descartado).toBe(true)
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'BPchave' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    await act(() => h.result.current.ativar())
    expect(h.result.current.estado.tipo).toBe('ligado')
    expect(h.result.current.descartado).toBe(false)
  })

  it('ao abrir, nada está descartado', async () => {
    const h = await montarLigado()
    expect(h.result.current.descartado).toBe(false)
  })
})
