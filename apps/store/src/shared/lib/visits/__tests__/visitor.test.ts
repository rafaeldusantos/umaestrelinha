import { isVisitorId } from '@estrelinha/core/visits'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  OPT_OUT_KEY,
  VISITOR_KEY,
  ensureVisitorId,
  forgetVisitorId,
  isOptedOut,
  readMarker,
  resetVisitCounterForTests,
  setOptOut,
} from '../visitor'

/**
 * O id do visitante (feature `71`) — `VIS-12`, `VIS-19`, `VIS-20`, e as duas escritas que a recusa
 * (`VIS-24`) e o "não contar" (`VIS-42`) vão chamar.
 *
 * Três regras que custam caro se quebrarem, e nada mais acusaria:
 *
 * 1. **Sem armazenamento, sem id — nem em memória** (`VIS-19`). Um id guardado só em memória
 *    nasceria de novo a cada carga de página, e cada página viraria uma visita.
 * 2. **A trava relê DENTRO dela** (`VIS-20`). Duas abas abertas juntas: a segunda espera a primeira
 *    gravar e usa o id dela. Sem a releitura, as duas criariam um cada, e o mesmo navegador contaria
 *    duas vezes no primeiro dia.
 * 3. **Esquecer apaga só o id** (`VIS-24`). O prazo fica: reaceitar no mesmo dia não conta de novo.
 */

const ID = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c'
const OUTRO = '9a8b7c6d-5e4f-4a3b-9c2d-1e0f2a3b4c5d'

const guardado = () => {
  const cru = localStorage.getItem(VISITOR_KEY)
  return cru === null ? null : JSON.parse(cru)
}

/** Uma trava dublada que SEGURA: o callback só roda quando o teste soltar. */
const travaQueSegura = () => {
  const pedidos: string[] = []
  let soltar: () => void = () => {}
  const solta = new Promise<void>((r) => (soltar = r))
  const locks = {
    request: vi.fn(async (nome: string, cb: () => Promise<unknown>) => {
      pedidos.push(nome)
      await solta
      return cb()
    }),
  }
  return { locks, pedidos, soltar: () => soltar() }
}

beforeEach(() => {
  localStorage.clear()
  resetVisitCounterForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('VIS-12 — o id nasce de `crypto.randomUUID` e é guardado no marcador', () => {
  it('cria um UUID v4, grava `{ v: 1, id, ate: null, em: null }` e o devolve', async () => {
    const id = await ensureVisitorId()

    expect(isVisitorId(id)).toBe(true)
    expect(guardado()).toEqual({ v: 1, id, ate: null, em: null })
  })

  it('o id vem de `crypto.randomUUID`, e não de outra fonte', async () => {
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(ID)

    expect(await ensureVisitorId()).toBe(ID)
    expect(uuid).toHaveBeenCalledTimes(1)
  })

  it('a segunda chamada devolve o MESMO id, sem criar outro', async () => {
    const primeiro = await ensureVisitorId()
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID')

    expect(await ensureVisitorId()).toBe(primeiro)
    expect(uuid).not.toHaveBeenCalled()
  })

  it('um marcador com prazo e sem id ganha id e CONSERVA o prazo', async () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: null, ate: 2_000, em: 1_000 }))
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(ID)

    expect(await ensureVisitorId()).toBe(ID)
    expect(guardado()).toEqual({ v: 1, id: ID, ate: 2_000, em: 1_000 })
  })

  it('um id guardado que não é UUID v4 é tratado como ausente: nasce um novo', async () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: 'abc', ate: null, em: null }))
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(ID)

    expect(await ensureVisitorId()).toBe(ID)
  })

  it('`randomUUID` que devolvesse algo fora de v4 não vira id', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
      '3f2b8c1e-9a4d-1b7e-8c21-5d6e7f8a9b0c' as `${string}-${string}-${string}-${string}-${string}`,
    )

    expect(await ensureVisitorId()).toBeNull()
    expect(guardado()).toBeNull()
  })
})

describe('VIS-19 — sem armazenamento ou sem `randomUUID`, não conta e não guarda id em memória', () => {
  it('`localStorage` que LANÇA na leitura ⇒ `null`, e a chamada seguinte continua `null`', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID')

    expect(await ensureVisitorId()).toBeNull()
    expect(await ensureVisitorId()).toBeNull()
    expect(uuid).not.toHaveBeenCalled()
  })

  it('`localStorage` que LANÇA na escrita ⇒ `null`, e nenhum id em memória', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(await ensureVisitorId()).toBeNull()
    // Se o primeiro id tivesse ficado em memória, a segunda chamada o devolveria.
    expect(await ensureVisitorId()).toBeNull()
  })

  it('escrita que NÃO CONFERE na releitura (aba privada que descarta) ⇒ `null`', async () => {
    // O `setItem` "funciona" e não guarda nada: é o Safari privado antigo, ou um bloqueador.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})

    expect(await ensureVisitorId()).toBeNull()
    expect(await ensureVisitorId()).toBeNull()
  })

  it('sem `crypto.randomUUID` ⇒ `null`, e nada é gravado', async () => {
    vi.stubGlobal('crypto', {})

    expect(await ensureVisitorId()).toBeNull()
    expect(guardado()).toBeNull()
  })

  it('sem `crypto.randomUUID`, nem um id JÁ guardado é devolvido — o navegador não conta', async () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: null, em: null }))
    vi.stubGlobal('crypto', {})

    expect(await ensureVisitorId()).toBeNull()
  })
})

describe('VIS-20 — a trava `navigator.locks`, com releitura DENTRO dela', () => {
  it('pede a trava pelo nome da chave', async () => {
    const t = travaQueSegura()
    vi.stubGlobal('navigator', { ...navigator, locks: t.locks })

    const promessa = ensureVisitorId()
    t.soltar()
    await promessa

    expect(t.pedidos).toEqual([VISITOR_KEY])
  })

  it('outra aba grava um id enquanto esta espera a trava ⇒ esta usa ESSE id, e `randomUUID` não roda', async () => {
    const t = travaQueSegura()
    vi.stubGlobal('navigator', { ...navigator, locks: t.locks })
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID')

    const promessa = ensureVisitorId()
    // A outra aba, que pegou a trava primeiro, grava o id dela.
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: OUTRO, ate: null, em: null }))
    t.soltar()

    expect(await promessa).toBe(OUTRO)
    expect(uuid).toHaveBeenCalledTimes(0)
    expect(guardado()).toEqual({ v: 1, id: OUTRO, ate: null, em: null })
  })

  it('a criação acontece DENTRO da trava: antes de soltar, nada foi gravado', async () => {
    const t = travaQueSegura()
    vi.stubGlobal('navigator', { ...navigator, locks: t.locks })

    const promessa = ensureVisitorId()
    await Promise.resolve()
    expect(guardado()).toBeNull()
    t.soltar()

    expect(isVisitorId(await promessa)).toBe(true)
  })

  it('sem `navigator.locks`, cria sem trava', async () => {
    expect((navigator as Navigator & { locks?: unknown }).locks).toBeUndefined()

    expect(isVisitorId(await ensureVisitorId())).toBe(true)
  })
})

describe('VIS-24/VIS-42 — a decisão refeita DENTRO da trava, antes de criar (conserto G4 da verificação r1)', () => {
  it('a decisão é perguntada DEPOIS de a trava soltar, nunca antes', async () => {
    const t = travaQueSegura()
    vi.stubGlobal('navigator', { ...navigator, locks: t.locks })
    const podeSeguir = vi.fn(() => true)

    const promessa = ensureVisitorId(podeSeguir)
    await Promise.resolve()
    expect(podeSeguir).not.toHaveBeenCalled()
    t.soltar()

    expect(isVisitorId(await promessa)).toBe(true)
    expect(podeSeguir).toHaveBeenCalledTimes(1)
  })

  it('recusa que chega enquanto a trava espera ⇒ `null`, nada gravado e `randomUUID` não roda', async () => {
    const t = travaQueSegura()
    vi.stubGlobal('navigator', { ...navigator, locks: t.locks })
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID')
    let recusou = false

    const promessa = ensureVisitorId(() => !recusou)
    recusou = true // a cliente recusou Estatísticas com a trava ainda no ar
    t.soltar()

    expect(await promessa).toBeNull()
    expect(uuid).not.toHaveBeenCalled()
    expect(guardado()).toBeNull()
  })

  it('recusada com o marcador já gravado (id apagado, prazo mantido) ⇒ `null`, e o marcador não muda', async () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: null, ate: 500, em: 100 }))

    expect(await ensureVisitorId(() => false)).toBeNull()
    expect(guardado()).toEqual({ v: 1, id: null, ate: 500, em: 100 })
  })

  it('sem `navigator.locks`, a mesma decisão vale: recusada ⇒ `null` e nada gravado', async () => {
    expect((navigator as Navigator & { locks?: unknown }).locks).toBeUndefined()

    expect(await ensureVisitorId(() => false)).toBeNull()
    expect(guardado()).toBeNull()
  })

  it('sensor: liberada, o mesmo caminho cria e grava', async () => {
    const id = await ensureVisitorId(() => true)
    expect(isVisitorId(id)).toBe(true)
    expect(guardado()).toEqual({ v: 1, id, ate: null, em: null })
  })
})

describe('forgetVisitorId — apaga o id e mantém o prazo (VIS-24)', () => {
  it('apaga só o `id`; `ate` e `em` ficam', () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: 2_000, em: 1_000 }))

    forgetVisitorId()

    expect(guardado()).toEqual({ v: 1, id: null, ate: 2_000, em: 1_000 })
  })

  it('sem marcador, não cria nada', () => {
    forgetVisitorId()
    expect(guardado()).toBeNull()
  })

  it('armazenamento que lança: não lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(() => forgetVisitorId()).not.toThrow()
  })

  it('depois de esquecer, `readMarker` lê o marcador sem id', () => {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: 2_000, em: 1_000 }))
    forgetVisitorId()

    expect(readMarker()).toEqual({ estado: 'presente', marker: { v: 1, id: null, ate: 2_000, em: 1_000 } })
  })
})

describe('a marca de não contar (VIS-42)', () => {
  it('`setOptOut(true)` grava `\'1\'`; `isOptedOut` passa a ser `true`', () => {
    setOptOut(true)

    expect(localStorage.getItem(OPT_OUT_KEY)).toBe('1')
    expect(isOptedOut()).toBe(true)
  })

  it('`setOptOut(false)` APAGA a chave (não grava `\'0\'`)', () => {
    setOptOut(true)
    setOptOut(false)

    expect(localStorage.getItem(OPT_OUT_KEY)).toBeNull()
    expect(isOptedOut()).toBe(false)
  })

  it('só `\'1\'` é marca: outro valor guardado não tira ninguém da contagem', () => {
    localStorage.setItem(OPT_OUT_KEY, 'true')
    expect(isOptedOut()).toBe(false)
  })

  it('armazenamento que lança: `isOptedOut` é `false` e nada lança', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(isOptedOut()).toBe(false)
    expect(() => setOptOut(true)).not.toThrow()
  })

  it('as duas chaves são diferentes', () => {
    expect(OPT_OUT_KEY).not.toBe(VISITOR_KEY)
  })
})
