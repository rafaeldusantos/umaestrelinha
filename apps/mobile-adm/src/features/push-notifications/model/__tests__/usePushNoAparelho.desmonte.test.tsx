// Feature `79` · T19 — desmontar no meio de uma operação: ela TERMINA (a gravação que saiu tem volta),
// e nenhum `setState` corre depois do desmonte. O React 18 não avisa mais desse `setState` (virou
// no-op silencioso), então o arquivo embrulha o `useState` exportado do React e CONTA as chamadas de
// setter que acontecem depois do `unmount` — a régua precisa enxergar o que a plataforma esconde.
import { useState } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { filaDaPorta, ok, portaFalsa, push } from '@/test/push'

import { usePushNoAparelho } from '../usePushNoAparelho'

const registro = vi.hoisted(() => ({ desmontado: false, setsDepois: 0 }))

vi.mock('react', async (original) => {
  const R = await original<typeof import('react')>()
  const useState = <S,>(inicial: S | (() => S)) => {
    const [s, set] = R.useState(inicial)
    const contado = (v: S | ((p: S) => S)) => {
      if (registro.desmontado) registro.setsDepois++
      set(v)
    }
    return [s, contado] as const
  }
  return { ...R, default: { ...R, useState }, useState }
})
vi.mock('@/features/push-notifications/api/portaDeAvisos', async () => (await import('@/test/push')).portaFalsa)

const OS_QUATRO = ['owner_order_received', 'owner_order_paid', 'owner_payment_rejected', 'owner_material_incoming']

const comecar = () => {
  registro.desmontado = false
  registro.setsDepois = 0
}

describe('desmontar no meio ⇒ sem setState órfão', () => {
  it('no meio de ativar: a inscrição termina na porta, e nenhum setter corre depois', async () => {
    comecar()
    push.instalar()
    filaDaPorta('lerConfig', ok({ applicationServerKey: 'K' }))
    filaDaPorta('inscrever', ok({ events: OS_QUATRO }))
    const h = renderHook(() => usePushNoAparelho())
    await waitFor(() => expect(h.result.current.estado.tipo).toBe('desligado'))
    const soltar = push.segurarSubscribe()
    let fim!: Promise<void>
    act(() => {
      fim = h.result.current.ativar()
    })
    await waitFor(() => expect(push.chamadas.subscribe).toHaveLength(1))

    h.unmount()
    registro.desmontado = true
    soltar()
    await fim

    expect(portaFalsa.inscrever).toHaveBeenCalledTimes(1)
    expect(registro.setsDepois).toBe(0)
  })

  it('no meio da leitura de abertura: nenhum setter corre quando o status chega', async () => {
    comecar()
    push.instalar({ permissao: 'granted', inscrito: true })
    let responder!: () => void
    filaDaPorta('lerStatus', () => new Promise((r) => (responder = () => r(ok({ subscribed: true, events: OS_QUATRO })))))
    const h = renderHook(() => usePushNoAparelho())
    await waitFor(() => expect(portaFalsa.lerStatus).toHaveBeenCalledTimes(1))

    h.unmount()
    registro.desmontado = true
    responder()
    await act(async () => {
      for (let i = 0; i < 5; i++) await Promise.resolve()
    })

    expect(registro.setsDepois).toBe(0)
  })

  it('sensor: o embrulho CONTA um setter chamado depois do desmonte', () => {
    comecar()
    // O `useState` importado aqui é o EMBRULHADO (o mesmo que o hook recebe).
    const h = renderHook(() => useState(0)[1])
    const set = h.result.current
    h.unmount()
    registro.desmontado = true
    set(1)
    expect(registro.setsDepois).toBe(1)
  })
})
