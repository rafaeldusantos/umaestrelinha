import { afterEach, describe, expect, it, vi } from 'vitest'
import { openPickSlips, PICK_SLIP_PREPARING, type PickSlipOrder } from '../lib/pickSlip'

/**
 * A janela da folha, sem navegador: a janela entra por injeção (`abrir`), e as imagens do documento
 * são objetos que disparam `load` quando o teste manda. O que precisa ser verdade é a ORDEM — a
 * janela abre no gesto, a impressão só sai depois das fotos — e o sinal devolvido a quem chamou.
 */

type Ouvinte = () => void
const imagem = (complete = false) => {
  const ouvintes: Record<string, Ouvinte[]> = {}
  return {
    complete,
    addEventListener: (tipo: string, fn: Ouvinte) => {
      ;(ouvintes[tipo] ??= []).push(fn)
    },
    disparar: (tipo: 'load' | 'error') => (ouvintes[tipo] ?? []).forEach(fn => fn()),
  }
}

const janelaFalsa = (imagens: ReturnType<typeof imagem>[] = []) => {
  const escrito: string[] = []
  const passos: string[] = []
  const w = {
    escrito,
    passos,
    document: {
      open: vi.fn(() => passos.push('open')),
      write: vi.fn((html: string) => {
        escrito.push(html)
        passos.push('write')
      }),
      close: vi.fn(() => passos.push('close-doc')),
      get images() {
        return imagens
      },
    },
    focus: vi.fn(),
    print: vi.fn(() => passos.push('print')),
    close: vi.fn(() => passos.push('close-window')),
  }
  return w
}

const pedido: PickSlipOrder = {
  id: 'o1', order_number: '1042', customer_name: 'Luciana Prado', created_at: '2026-11-07T14:32:00Z',
  items: [{ product_name: 'Anel', quantity: 1, image: 'https://x.invalid/a.jpg' }],
}

/** Uma promessa que o teste resolve quando quiser. */
const adiada = <T,>() => {
  let resolver!: (v: T) => void
  let rejeitar!: (e: unknown) => void
  const promessa = new Promise<T>((res, rej) => {
    resolver = res
    rejeitar = rej
  })
  return { promessa, resolver, rejeitar }
}

const microtarefas = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('openPickSlips — a janela abre no gesto e imprime depois das fotos', () => {
  it('abre a janela de forma síncrona e mostra "Preparando a folha…" antes da leitura voltar', () => {
    const w = janelaFalsa()
    const abrir = vi.fn(() => w as unknown as Window)
    const leitura = adiada<PickSlipOrder[]>()

    void openPickSlips(() => leitura.promessa, { abrir })

    // Nenhum `await` entre a chamada e a abertura: o popup não é bloqueado.
    expect(abrir).toHaveBeenCalledTimes(1)
    expect(w.escrito.join('')).toContain(PICK_SLIP_PREPARING)
    expect(w.print).not.toHaveBeenCalled()
  })

  it('print() só depois do `load` de todas as imagens do documento', async () => {
    const fotos = [imagem(), imagem()]
    const w = janelaFalsa(fotos)
    const r = openPickSlips(async () => [pedido], { abrir: () => w as unknown as Window })

    await microtarefas()
    expect(w.escrito.join('')).toContain('Pedido #1042')
    expect(w.print).not.toHaveBeenCalled()

    fotos[0].disparar('load')
    await microtarefas()
    expect(w.print).not.toHaveBeenCalled()

    fotos[1].disparar('error')
    expect(await r).toBe('aberta')
    expect(w.print).toHaveBeenCalledTimes(1)
    expect(w.passos.indexOf('print')).toBeGreaterThan(w.passos.lastIndexOf('write'))
  })

  it('imagem já carregada (`complete`) não segura a impressão', async () => {
    const w = janelaFalsa([imagem(true)])
    expect(await openPickSlips(async () => [pedido], { abrir: () => w as unknown as Window })).toBe('aberta')
    expect(w.print).toHaveBeenCalledTimes(1)
  })

  it('imagem que não responde não trava: imprime no teto de espera', async () => {
    vi.useFakeTimers()
    const w = janelaFalsa([imagem()])
    const r = openPickSlips(async () => [pedido], { abrir: () => w as unknown as Window, esperaMaxMs: 3000 })

    await vi.advanceTimersByTimeAsync(2999)
    expect(w.print).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(await r).toBe('aberta')
    expect(w.print).toHaveBeenCalledTimes(1)
  })

  it('popup bloqueado devolve o sinal, sem ler nada', async () => {
    const carregar = vi.fn(async () => [pedido])
    expect(await openPickSlips(carregar, { abrir: () => null })).toBe('bloqueada')
    expect(carregar).not.toHaveBeenCalled()
  })

  it('leitura que falha fecha a janela e devolve o sinal, sem imprimir', async () => {
    const w = janelaFalsa()
    const r = await openPickSlips(async () => {
      throw new Error('boom')
    }, { abrir: () => w as unknown as Window })
    expect(r).toBe('falhou')
    expect(w.close).toHaveBeenCalledTimes(1)
    expect(w.print).not.toHaveBeenCalled()
  })

  it('leitura sem nenhum pedido fecha a janela', async () => {
    const w = janelaFalsa()
    expect(await openPickSlips(async () => [], { abrir: () => w as unknown as Window })).toBe('vazia')
    expect(w.close).toHaveBeenCalledTimes(1)
    expect(w.print).not.toHaveBeenCalled()
  })

  it('aceita a lista já pronta (a lista de Pedidos, até a leitura dela mudar)', async () => {
    const w = janelaFalsa()
    expect(await openPickSlips([pedido], { abrir: () => w as unknown as Window })).toBe('aberta')
    expect(w.escrito.join('')).toContain('Pedido #1042')
    expect(w.print).toHaveBeenCalledTimes(1)
  })

  it('lista pronta vazia não abre janela', async () => {
    const abrir = vi.fn(() => janelaFalsa() as unknown as Window)
    expect(await openPickSlips([], { abrir })).toBe('vazia')
    expect(abrir).not.toHaveBeenCalled()
  })
})
