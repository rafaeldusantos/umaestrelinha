import { act, renderHook, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { supabase } from '@estrelinha/supabase/client'
import { fetchGuestOrder } from '@/entities/order/api/guestOrder'
import { rememberAccess } from '@/entities/order/model/orderAccess'

import { PAYMENT_TIMEOUT_MS } from '@/features/checkout/api/useCreatePayment'

import { GUEST_POLL_MS, PIX_SLOW_MS, usePixPayment } from '../usePixPayment'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * A máquina do PIX, sem UI — `PIX-P1-03`, `PIX-P1-04`, `PIX-P1-07`, `PIX-P2-01`..`PIX-P2-03`.
 *
 * O que estes casos medem é o que o desenho **não pode** decidir: quando a espera vira espera
 * longa, quando o código vira expirado, o que acontece com a aprovação que chega tarde, e que
 * regerar o código não cria um segundo pedido.
 */

const mutateAsync = vi.fn()
/**
 * O módulo REAL, com só a porta trocada.
 *
 * A diferença que importa é `PAYMENT_TIMEOUT_MS`: a régua dos 8 segundos se mede **contra o timeout
 * do dono**, e um número copiado para dentro do dublê seria o segundo dono dele — a régua passaria
 * a confirmar a si mesma, que é exatamente o defeito que ela existe para consertar.
 */
vi.mock('@/features/checkout/api/useCreatePayment', async () => {
  const real = await vi.importActual<typeof import('@/features/checkout/api/useCreatePayment')>(
    '@/features/checkout/api/useCreatePayment',
  )
  return { ...real, useCreatePayment: () => ({ mutateAsync, isPending: false }) }
})

// Canal Realtime mockado: captura o filtro e o callback do `postgres_changes`.
let realtimeHandler: ((payload: any) => void) | null = null
let realtimeConfig: any = null
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => {
      const ch: any = {}
      ch.on = vi.fn((_event: string, config: any, cb: (payload: any) => void) => {
        realtimeConfig = config
        realtimeHandler = cb
        return ch
      })
      ch.subscribe = vi.fn(() => ch)
      return ch
    }),
    removeChannel: vi.fn(),
  },
}))

// `CSC-05`: a espera da convidada vai pela MESMA porta que a confirmação usa. Mockada aqui para o
// teste controlar a resposta, nunca reimplementada.
vi.mock('@/entities/order/api/guestOrder', () => ({ fetchGuestOrder: vi.fn() }))

const codigoValido = (minutos = 30) => ({
  qr_code: 'PIX-COPIA-E-COLA',
  qr_code_base64: null,
  expires_at: new Date(Date.now() + minutos * 60_000).toISOString(),
})

const codigoVencido = () => ({
  qr_code: 'PIX-EXPIRADO',
  qr_code_base64: null,
  expires_at: new Date(Date.now() - 1000).toISOString(),
})

beforeEach(() => {
  mutateAsync.mockReset()
  vi.mocked(supabase.channel).mockClear()
  vi.mocked(supabase.removeChannel).mockClear()
  vi.mocked(fetchGuestOrder).mockReset().mockResolvedValue(null)
  globalThis.localStorage.clear()
  realtimeHandler = null
  realtimeConfig = null
})

describe('usePixPayment — pedir o código (PIX-P1-03, PIX-P1-04)', () => {
  it('pede o código do MESMO pedido ao montar, uma vez só', async () => {
    mutateAsync.mockResolvedValue(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'), { wrapper: StrictMode })

    await waitFor(() => expect(result.current.state.kind).toBe('ready'))
    expect(mutateAsync).toHaveBeenCalledTimes(1)
    expect(mutateAsync).toHaveBeenCalledWith({ order_id: 'order-1', method: 'pix' })
  })

  it('enquanto a resposta não chega, o estado é `generating` — nunca expirado', () => {
    // A ordem dos ramos: o contador nasce ausente, e um `<= 0` avaliado sobre ele diria "expirou"
    // antes de existir código nenhum.
    mutateAsync.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePixPayment('order-1'))

    expect(result.current.state).toEqual({ kind: 'generating', slow: false })
  })

  it('com o código, o estado carrega o copia-e-cola e o tempo que sobra', async () => {
    mutateAsync.mockResolvedValue(codigoValido(10))
    const { result } = renderHook(() => usePixPayment('order-1'))

    await waitFor(() => expect(result.current.state.kind).toBe('ready'))
    const state = result.current.state
    if (state.kind !== 'ready') throw new Error('estado inesperado')
    expect(state.qrCode).toBe('PIX-COPIA-E-COLA')
    expect(state.secondsLeft).toBeGreaterThan(500)
    expect(state.secondsLeft).toBeLessThanOrEqual(600)
  })
})

/**
 * **Os 8 segundos são um NÚMERO, e nenhum caso abaixo os mede.**
 *
 * Os casos de `PIX-P1-07` avançam o relógio em `PIX_SLOW_MS ± 100` **importando a própria
 * constante**: a régua é o objeto medido, e a suíte inteira é uma tautologia sobre o valor. Medido
 * na verificação independente: `PIX_SLOW_MS = 30000` deixa **cinco arquivos verdes**.
 *
 * E a consequência não é cosmética. O timeout de `useCreatePayment` é de 15s; acima dele a tela vai
 * do progresso silencioso **direto** para a de falha, e a linha "a espera continua e o pedido já
 * está guardado" — que é a AC inteira — nunca aparece para ninguém.
 */
describe('usePixPayment — a linha dos 8s é um número medido (PIX-P1-07)', () => {
  it('a espera passa a ser dita em voz alta aos 8000 ms — o literal da AC', () => {
    expect(PIX_SLOW_MS).toBe(8000)
  })

  it('ela cabe DENTRO do timeout do dono — acima dele, não apareceria nunca', () => {
    // Lido do dono (`useCreatePayment`), e não copiado: subir o timeout sem subir a linha, ou o
    // contrário, tem de reprovar aqui. Um número escrito neste arquivo seria o segundo dono.
    expect(PIX_SLOW_MS).toBeLessThan(PAYMENT_TIMEOUT_MS)
  })

  it('e ela é a METADE do timeout, que é de onde o 8000 sai', () => {
    // O `design.md` declara a relação ("metade do timeout de 15s"), e é ela que dá ao número um
    // motivo em vez de um gosto: cedo demais e a linha entra numa espera normal; tarde demais e ela
    // chega junto com o erro. A folga de 1s é o arredondamento de 7500 para 8000.
    expect(Math.abs(PIX_SLOW_MS - PAYMENT_TIMEOUT_MS / 2)).toBeLessThanOrEqual(1000)
  })
})

describe('usePixPayment — a espera longa (PIX-P1-07)', () => {
  const avancar = async (ms: number) => {
    await act(async () => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('`slow` é falso aos 7,9s e verdadeiro aos 8s', async () => {
    mutateAsync.mockReturnValue(new Promise(() => {}))
    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))

    await avancar(PIX_SLOW_MS - 100)
    expect(result.current.state).toEqual({ kind: 'generating', slow: false })

    await avancar(100)
    expect(result.current.state).toEqual({ kind: 'generating', slow: true })
    vi.useRealTimers()
  })

  it('a resposta que chega apaga a espera longa', async () => {
    // O par. Sem ele, um `slow` que nunca voltasse a ser falso passaria neste arquivo inteiro — e a
    // linha de espera ficaria pendurada por cima de um código já pronto.
    let resolver: (v: unknown) => void = () => {}
    mutateAsync.mockReturnValue(new Promise((res) => {
      resolver = res
    }))
    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))

    await avancar(PIX_SLOW_MS)
    expect(result.current.state).toEqual({ kind: 'generating', slow: true })

    await act(async () => {
      resolver(codigoValido())
    })
    expect(result.current.state.kind).toBe('ready')
    vi.useRealTimers()
  })

  it('a retentativa começa a contar de novo — não nasce dizendo que demora', async () => {
    // **A primeira tentativa precisa chegar a `slow` para este caso medir alguma coisa.** Escrito
    // com uma falha instantânea, ele era verdadeiro nos DOIS mundos: `slow` nunca tinha subido, e
    // apagar o reinício do relógio deixava o caso verde (mutante M1, achado pelo sensor). O defeito
    // real só existe na VOLTA — a segunda tentativa nasce dizendo que demora, com 0s de espera.
    let rejeitar: (e: unknown) => void = () => {}
    mutateAsync
      .mockReturnValueOnce(
        new Promise((_res, rej) => {
          rejeitar = rej
        }),
      )
      .mockReturnValueOnce(new Promise(() => {}))

    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))

    await avancar(PIX_SLOW_MS)
    expect(result.current.state).toEqual({ kind: 'generating', slow: true })

    await act(async () => {
      rejeitar(new Error('O banco não respondeu.'))
    })
    expect(result.current.state.kind).toBe('failed')

    act(() => result.current.generate())
    expect(result.current.state).toEqual({ kind: 'generating', slow: false })

    await avancar(PIX_SLOW_MS)
    expect(result.current.state).toEqual({ kind: 'generating', slow: true })
    vi.useRealTimers()
  })
})

describe('usePixPayment — o código vence, o pedido não (PIX-P2-01, PIX-P2-02)', () => {
  it('código com validade vencida vira `expired`', async () => {
    mutateAsync.mockResolvedValue(codigoVencido())
    const { result } = renderHook(() => usePixPayment('order-1'))

    await waitFor(() => expect(result.current.state).toEqual({ kind: 'expired' }))
  })

  it('`generate` pede outro código para o MESMO `orderId` — nunca um segundo pedido', async () => {
    mutateAsync.mockResolvedValueOnce(codigoVencido()).mockResolvedValueOnce(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('expired'))

    act(() => result.current.generate())
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))

    expect(mutateAsync).toHaveBeenCalledTimes(2)
    expect(mutateAsync.mock.calls.every(([arg]) => arg.order_id === 'order-1')).toBe(true)
    expect(mutateAsync.mock.calls.every(([arg]) => arg.method === 'pix')).toBe(true)
  })
})

describe('usePixPayment — a falha é do banco (PIX-P2-03)', () => {
  it('erro na geração vira `failed` com a mensagem que veio', async () => {
    mutateAsync.mockRejectedValue(new Error('O pagamento demorou demais para responder.'))
    const { result } = renderHook(() => usePixPayment('order-1'))

    await waitFor(() =>
      expect(result.current.state).toEqual({
        kind: 'failed',
        message: 'O pagamento demorou demais para responder.',
      }),
    )
  })

  it('a falha vence o "gerando" — senão a tela de erro nunca apareceria', async () => {
    // `generating` já voltou a ser falso quando o erro chega, mas o código continua ausente: sem
    // este ramo antes, o estado seria espera para sempre — a assinatura do `BUG-20260728`.
    mutateAsync.mockRejectedValue(new Error('falhou'))
    const { result } = renderHook(() => usePixPayment('order-1'))

    await waitFor(() => expect(result.current.state.kind).toBe('failed'))
    expect(result.current.state.kind).not.toBe('generating')
  })

  it('tentar de novo depois da falha limpa o erro', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('failed'))

    act(() => result.current.generate())
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))
  })
})

describe('usePixPayment — a aprovação (PAY-13, CSC-05, PIX-P2-04)', () => {
  it('assina o Realtime na linha do pedido', async () => {
    mutateAsync.mockResolvedValue(codigoValido())
    renderHook(() => usePixPayment('order-1'))

    await waitFor(() => expect(realtimeConfig).not.toBeNull())
    expect(realtimeConfig).toEqual({
      event: 'UPDATE',
      schema: 'public',
      table: 'orders',
      filter: 'id=eq.order-1',
    })
  })

  it('`approved` no Realtime vira `approved`; `pending` não', async () => {
    mutateAsync.mockResolvedValue(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))

    act(() => realtimeHandler!({ new: { payment_status: 'pending' } }))
    expect(result.current.state.kind).toBe('ready')

    act(() => realtimeHandler!({ new: { payment_status: 'approved' } }))
    expect(result.current.state).toEqual({ kind: 'approved' })
  })

  it('remove o canal no desmonte', async () => {
    mutateAsync.mockResolvedValue(codigoValido())
    const { result, unmount } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))

    unmount()
    expect(supabase.removeChannel).toHaveBeenCalled()
  })

  it('COM token, a convidada pergunta a cada 5s pela porta da confirmação', async () => {
    rememberAccess('order-1', 'tok-abc')
    mutateAsync.mockResolvedValue(codigoValido())
    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS)
    })

    expect(fetchGuestOrder).toHaveBeenCalledWith('order-1', 'tok-abc')
    expect(result.current.state.kind).not.toBe('approved')
    vi.useRealTimers()
  })

  it('a pergunta que volta aprovada vira `approved`', async () => {
    rememberAccess('order-1', 'tok-abc')
    vi.mocked(fetchGuestOrder).mockResolvedValue({ payment_status: 'approved' } as never)
    mutateAsync.mockResolvedValue(codigoValido())
    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS)
    })

    expect(result.current.state).toEqual({ kind: 'approved' })
    vi.useRealTimers()
  })

  it('a pergunta que volta PENDENTE não aprova nada', async () => {
    // O par do caso acima, e sem ele a régua não mede nada: um efeito que aprovasse a cada volta
    // levaria a cliente à confirmação de um PIX que ela não pagou. O sensor pegou isso —
    // `if (pedido)` no lugar da comparação com `approved` **sobrevivia** ao arquivo inteiro,
    // porque o único caso com resposta não aprovada devolvia ausência, não "pendente".
    rememberAccess('order-1', 'tok-abc')
    vi.mocked(fetchGuestOrder).mockResolvedValue({ payment_status: 'pending' } as never)
    mutateAsync.mockResolvedValue(codigoValido())
    vi.useFakeTimers()
    const { result } = renderHook(() => usePixPayment('order-1'))
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS * 3)
    })

    expect(fetchGuestOrder).toHaveBeenCalled()
    expect(result.current.state.kind).not.toBe('approved')
    vi.useRealTimers()
  })

  it('SEM token não pergunta — quem tem sessão segue pelo Realtime', async () => {
    // O par inverso. Perguntar para todo mundo seria uma requisição a cada 5s por cliente logada,
    // para um caminho que já funciona.
    mutateAsync.mockResolvedValue(codigoValido())
    vi.useFakeTimers()
    renderHook(() => usePixPayment('order-1'))
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS * 3)
    })

    expect(fetchGuestOrder).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('a pergunta para no desmonte', async () => {
    // Em React 18 o `setState` depois do desmonte é no-op silencioso, então "não lançou" não prova
    // nada: o que prende o vazamento é a CONTAGEM de perguntas parar de subir (lição da `47`).
    rememberAccess('order-1', 'tok-abc')
    mutateAsync.mockResolvedValue(codigoValido())
    vi.useFakeTimers()
    const { unmount } = renderHook(() => usePixPayment('order-1'))
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS)
    })
    const antes = vi.mocked(fetchGuestOrder).mock.calls.length
    unmount()
    await act(async () => {
      vi.advanceTimersByTime(GUEST_POLL_MS * 4)
    })

    expect(vi.mocked(fetchGuestOrder).mock.calls.length).toBe(antes)
    vi.useRealTimers()
  })

  it('aprovado VENCE expirado — quem pagou no último segundo não vê um erro', async () => {
    // Borda da spec: "a aprovação que chega com a tela em expirado ou em falha segue para a
    // confirmação do mesmo jeito". É a ordem dos ramos, e ela não se prova pelo caminho feliz.
    mutateAsync.mockResolvedValue(codigoVencido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('expired'))

    act(() => realtimeHandler!({ new: { payment_status: 'approved' } }))
    expect(result.current.state).toEqual({ kind: 'approved' })
  })

  it('aprovado VENCE falha — o mesmo, com o banco fora do ar', async () => {
    mutateAsync.mockRejectedValue(new Error('falhou'))
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('failed'))

    act(() => realtimeHandler!({ new: { payment_status: 'approved' } }))
    expect(result.current.state).toEqual({ kind: 'approved' })
  })
})

describe('usePixPayment — copiar o código', () => {
  it('copia o copia-e-cola e acende o `copied`', async () => {
    const writeText = vi.fn()
    Object.assign(navigator, { clipboard: { writeText } })
    mutateAsync.mockResolvedValue(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))

    expect(result.current.copied).toBe(false)
    act(() => result.current.copy())

    expect(writeText).toHaveBeenCalledWith('PIX-COPIA-E-COLA')
    expect(result.current.copied).toBe(true)
  })

  it('sem código, copiar não faz nada — nem chama a área de transferência', async () => {
    const writeText = vi.fn()
    Object.assign(navigator, { clipboard: { writeText } })
    mutateAsync.mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => usePixPayment('order-1'))

    act(() => result.current.copy())

    expect(writeText).not.toHaveBeenCalled()
    expect(result.current.copied).toBe(false)
  })

  it('área de transferência indisponível não derruba a tela do pagamento', async () => {
    // Em contexto inseguro `navigator.clipboard` não existe. Um throw aqui deixaria a cliente sem
    // saída exatamente na hora de pagar — e o código continua na tela para copiar à mão.
    Object.assign(navigator, { clipboard: undefined })
    mutateAsync.mockResolvedValue(codigoValido())
    const { result } = renderHook(() => usePixPayment('order-1'))
    await waitFor(() => expect(result.current.state.kind).toBe('ready'))

    expect(() => act(() => result.current.copy())).not.toThrow()
    expect(result.current.copied).toBe(true)
  })
})
