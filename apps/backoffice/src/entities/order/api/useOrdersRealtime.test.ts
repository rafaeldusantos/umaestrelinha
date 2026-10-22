// Feature 71 · task 21 · `VIS-10 (d)` — o canal de pedidos tem UM dono.
//
// O Dashboard assina mudanças em `orders` para reler os números, e com o bloco "Movimento da loja"
// passam a ser DUAS releituras. A spec proíbe inscrição nova: o aviso de tempo real que o Dashboard
// já recebe é o mesmo, e quem o abre é este hook, chamado uma vez pela página.
//
// O que importa provar, e por que cada asserção é falsa no mundo errado:
// - **uma** chamada a `supabase.channel` por montagem, e nenhuma nova a cada render: com uma seta
//   inline no Dashboard, um efeito que dependesse de `onChange` desfaria e recriaria o canal a cada
//   render — a contagem de chamadas sobe;
// - o aviso chama o callback **mais recente**: um efeito com dependência vazia que capturasse o
//   `onChange` da primeira montagem chamaria a seta velha — a primeira seta seria a chamada;
// - desmontar remove **o mesmo** canal (`toBe`): remover um canal novo deixaria o antigo vivo.

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface CanalDuble {
  nome: string
  on: ReturnType<typeof vi.fn>
  subscribe: ReturnType<typeof vi.fn>
  /** O handler que o hook entregou ao `on` — é por ele que o "aviso" chega. */
  aviso: (() => void) | null
}

const { channel, removeChannel, canais } = vi.hoisted(() => {
  const canais: CanalDuble[] = []
  const channel = vi.fn((nome: string) => {
    const canal: CanalDuble = {
      nome,
      aviso: null,
      on: vi.fn(),
      subscribe: vi.fn(),
    }
    canal.on.mockImplementation((_tipo: string, _filtro: unknown, handler: () => void) => {
      canal.aviso = handler
      return canal
    })
    canal.subscribe.mockImplementation(() => canal)
    canais.push(canal)
    return canal
  })
  return { channel, removeChannel: vi.fn(), canais }
})

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { channel, removeChannel },
}))

import { useOrdersRealtime } from './useOrdersRealtime'

beforeEach(() => {
  channel.mockClear()
  removeChannel.mockClear()
  canais.length = 0
})

describe('useOrdersRealtime — o canal de pedidos do Dashboard', () => {
  it('abre UM canal `admin-orders-realtime`, ouvindo toda mudança em `public.orders`, e se inscreve', () => {
    renderHook(() => useOrdersRealtime(() => {}))

    expect(channel).toHaveBeenCalledTimes(1)
    expect(channel).toHaveBeenCalledWith('admin-orders-realtime')
    const [canal] = canais
    expect(canal.on).toHaveBeenCalledTimes(1)
    expect(canal.on.mock.calls[0][0]).toBe('postgres_changes')
    expect(canal.on.mock.calls[0][1]).toEqual({ event: '*', schema: 'public', table: 'orders' })
    expect(canal.subscribe).toHaveBeenCalledTimes(1)
  })

  it('re-render com uma SETA NOVA como `onChange` não recria o canal', () => {
    const { rerender } = renderHook(({ cb }) => useOrdersRealtime(cb), {
      initialProps: { cb: () => {} },
    })
    rerender({ cb: () => {} })
    rerender({ cb: () => {} })

    expect(channel).toHaveBeenCalledTimes(1)
    expect(removeChannel).not.toHaveBeenCalled()
  })

  it('o aviso chama o callback MAIS RECENTE, e só ele', () => {
    const primeiro = vi.fn()
    const segundo = vi.fn()
    const { rerender } = renderHook(({ cb }) => useOrdersRealtime(cb), {
      initialProps: { cb: primeiro },
    })
    rerender({ cb: segundo })

    canais[0].aviso!()

    expect(segundo).toHaveBeenCalledTimes(1)
    expect(primeiro).not.toHaveBeenCalled()
  })

  it('desmontar remove O MESMO canal que foi aberto', () => {
    const { unmount } = renderHook(() => useOrdersRealtime(() => {}))
    const aberto = canais[0]
    unmount()

    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(removeChannel.mock.calls[0][0]).toBe(aberto)
  })
})
