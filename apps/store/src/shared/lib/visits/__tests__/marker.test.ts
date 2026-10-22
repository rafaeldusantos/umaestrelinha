import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  VISITOR_KEY,
  markerAllowsCall,
  readMarker,
  resetVisitCounterForTests,
  saveClock,
  visitCounterState,
  type VisitorMarker,
} from '../visitor'

/**
 * O marcador do visitante (feature `71`) — `VIS-16` e a forma de `VIS-12`.
 *
 * O marcador é uma OTIMIZAÇÃO: quem impede a duplicata é o servidor (`on conflict do nothing`). O
 * que ele evita é uma chamada por navegação. E a regra que importa é que ele guarda o prazo **no
 * relógio local, convertido por DURAÇÃO** (`Date.now() + (ate − agora)` do servidor): comparar o
 * `ate` do servidor com o `Date.now()` de um aparelho adiantado faria toda navegação das últimas
 * horas do dia virar um POST.
 *
 * O cliente nunca calcula que dia é — só quanto falta para o prazo que o servidor deu.
 */

// O instante do SERVIDOR: 21/10, 23h00 em Brasília (02h00Z do dia 22). A próxima 00:00 de Brasília
// é 03h00Z — falta 1 hora.
const AGORA_SERVIDOR = Date.UTC(2026, 9, 22, 2, 0, 0)
const ATE_SERVIDOR = Date.UTC(2026, 9, 22, 3, 0, 0)
const UMA_HORA = 60 * 60 * 1000

const ID = '3f2b8c1e-9a4d-4b7e-8c21-5d6e7f8a9b0c'

const gravar = (m: unknown) => localStorage.setItem(VISITOR_KEY, JSON.stringify(m))
const lido = (): VisitorMarker | null => {
  const r = readMarker()
  return r.estado === 'presente' ? r.marker : null
}

beforeEach(() => {
  localStorage.clear()
  resetVisitCounterForTests()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('readMarker — três estados, por discriminante de string', () => {
  it('nada guardado ⇒ `ausente`', () => {
    expect(readMarker()).toEqual({ estado: 'ausente' })
  })

  it('marcador válido ⇒ `presente`, com a forma `{ v: 1, id, ate, em }`', () => {
    gravar({ v: 1, id: ID, ate: 2_000, em: 1_000 })
    expect(readMarker()).toEqual({ estado: 'presente', marker: { v: 1, id: ID, ate: 2_000, em: 1_000 } })
  })

  it('marcador de recém-criado (`ate` e `em` nulos) é `presente`', () => {
    gravar({ v: 1, id: ID, ate: null, em: null })
    expect(lido()).toEqual({ v: 1, id: ID, ate: null, em: null })
  })

  it('o armazenamento que LANÇA na leitura ⇒ `indisponivel` (nunca `ausente`)', () => {
    // A diferença importa: `ausente` cria um id; `indisponivel` não conta nada (`VIS-19`).
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    expect(readMarker()).toEqual({ estado: 'indisponivel' })
  })

  it.each([
    ['JSON inválido', '{v:1'],
    ['versão diferente de 1', JSON.stringify({ v: 2, id: ID, ate: null, em: null })],
    ['sem versão', JSON.stringify({ id: ID, ate: null, em: null })],
    ['lista', JSON.stringify([1])],
    ['texto', JSON.stringify(ID)],
  ])('%s ⇒ `ausente`', (_nome, cru) => {
    localStorage.setItem(VISITOR_KEY, cru)
    expect(readMarker()).toEqual({ estado: 'ausente' })
  })

  it('id guardado que não é UUID v4 é lido como SEM id — o prazo continua valendo', () => {
    gravar({ v: 1, id: 'nao-e-uuid', ate: 2_000, em: 1_000 })
    expect(lido()).toEqual({ v: 1, id: null, ate: 2_000, em: 1_000 })
  })

  it('prazo que não é número é lido como nulo', () => {
    gravar({ v: 1, id: ID, ate: '2000', em: null })
    expect(lido()).toEqual({ v: 1, id: ID, ate: null, em: null })
  })
})

describe('markerAllowsCall — VIS-16', () => {
  const m = (ate: number | null, em: number | null): VisitorMarker => ({ v: 1, id: ID, ate, em })

  it('sem marcador ⇒ chama', () => {
    expect(markerAllowsCall(null, 1_000)).toBe(true)
  })

  it('marcador sem prazo (`ate`/`em` nulos) ⇒ chama', () => {
    expect(markerAllowsCall(m(null, null), 1_000)).toBe(true)
  })

  it('`em ≤ agora < ate` ⇒ NÃO chama — inclusive na borda `agora === em`', () => {
    expect(markerAllowsCall(m(2_000, 1_000), 1_000)).toBe(false)
    expect(markerAllowsCall(m(2_000, 1_000), 1_500)).toBe(false)
    expect(markerAllowsCall(m(2_000, 1_000), 1_999)).toBe(false)
  })

  it('`agora ≥ ate` (virou o dia) ⇒ chama — inclusive na borda `agora === ate`', () => {
    expect(markerAllowsCall(m(2_000, 1_000), 2_000)).toBe(true)
    expect(markerAllowsCall(m(2_000, 1_000), 9_000)).toBe(true)
  })

  it('`agora < em` (o relógio voltou) ⇒ chama', () => {
    expect(markerAllowsCall(m(2_000, 1_000), 999)).toBe(true)
  })
})

describe('saveClock — o prazo no relógio LOCAL, por duração', () => {
  it('grava `ate = Date.now() + (ate − agora)` do servidor e `em = Date.now()`', () => {
    const local = AGORA_SERVIDOR + 7 * 60 * 1000 // o aparelho 7 min adiantado
    vi.useFakeTimers({ now: local })
    gravar({ v: 1, id: ID, ate: null, em: null })

    saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)

    expect(lido()).toEqual({ v: 1, id: ID, ate: local + UMA_HORA, em: local })
  })

  it('relógio adiantado 2 h + 5 navegações depois de um 200 ⇒ no máximo 1 chamada', () => {
    // O aparelho diz 01h00 do dia 22 quando o servidor diz 23h00 do dia 21: comparado direto com o
    // `ate` do servidor (00h00), o aparelho já estaria "depois do prazo" e chamaria a cada página.
    let local = AGORA_SERVIDOR + 2 * UMA_HORA
    vi.useFakeTimers({ now: local })
    let chamadas = 0
    const navegar = () => {
      if (markerAllowsCall(lido(), Date.now())) {
        chamadas++
        // O servidor responde com o instante DELE, 2 h atrás do aparelho.
        saveClock(ATE_SERVIDOR, Date.now() - 2 * UMA_HORA)
      }
    }

    navegar() // a primeira — o 200
    for (let i = 0; i < 5; i++) {
      local += 3 * 60 * 1000
      vi.setSystemTime(local)
      navegar()
    }

    expect(chamadas).toBe(1)
  })

  it('o prazo vencido pelo relógio local volta a permitir UMA chamada (a virada do dia)', () => {
    vi.useFakeTimers({ now: AGORA_SERVIDOR })
    saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)
    vi.setSystemTime(AGORA_SERVIDOR + UMA_HORA)

    expect(markerAllowsCall(lido(), Date.now())).toBe(true)
  })

  it('sem marcador, cria um só com o prazo — sem id', () => {
    vi.useFakeTimers({ now: AGORA_SERVIDOR })
    saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)

    expect(lido()).toEqual({ v: 1, id: null, ate: ATE_SERVIDOR, em: AGORA_SERVIDOR })
  })

  it('mantém o id que o marcador tem no instante da escrita', () => {
    vi.useFakeTimers({ now: AGORA_SERVIDOR })
    gravar({ v: 1, id: ID, ate: null, em: null })
    saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)

    expect(lido()?.id).toBe(ID)
  })

  it('um id APAGADO durante o voo continua apagado depois de saveClock (VIS-24, VIS-42)', () => {
    // A resposta chega DEPOIS de uma recusa feita com a requisição no ar: o prazo é gravado, o
    // código não volta.
    vi.useFakeTimers({ now: AGORA_SERVIDOR })
    gravar({ v: 1, id: ID, ate: null, em: null })
    gravar({ v: 1, id: null, ate: null, em: null }) // a recusa, durante o voo
    saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)

    expect(lido()).toEqual({ v: 1, id: null, ate: ATE_SERVIDOR, em: AGORA_SERVIDOR })
  })

  it('prazo do servidor que não é número não grava nada', () => {
    gravar({ v: 1, id: ID, ate: null, em: null })
    saveClock(Number.NaN, AGORA_SERVIDOR)

    expect(lido()).toEqual({ v: 1, id: ID, ate: null, em: null })
  })

  it('armazenamento que lança na leitura: saveClock não escreve e não lança', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })

    expect(() => saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)).not.toThrow()
    expect(setItem).not.toHaveBeenCalled()
  })

  it('armazenamento que lança na escrita: saveClock não lança', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => saveClock(ATE_SERVIDOR, AGORA_SERVIDOR)).not.toThrow()
  })
})

describe('resetVisitCounterForTests', () => {
  it('devolve o estado de módulo ao de quem acabou de abrir a página', () => {
    visitCounterState.emVoo = true
    visitCounterState.falhas = 2

    resetVisitCounterForTests()

    expect(visitCounterState).toEqual({ emVoo: false, falhas: 0 })
  })
})
