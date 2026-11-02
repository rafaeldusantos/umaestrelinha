import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PRESENCE_KEY,
  PRESENCE_SOURCE_KEY,
  captureLandingSource,
  ensurePresenceId,
  forgetPresence,
  landingSource,
  resetPresenceForTests,
  savePresenceClock,
} from '../presence'
import { VISITOR_KEY } from '@/shared/lib/visits/visitor'

/**
 * O id e a origem da presença — o dono das duas chaves de armazenamento.
 *
 * O id é aleatório, por navegador e por dia: vale até o prazo que o SERVIDOR devolveu (a próxima
 * meia-noite de Brasília), convertido para o relógio local por duração. Ele não tem ligação com o id
 * do contador de visitas.
 */

const AGORA = 1_792_600_000_000
const marcador = () => JSON.parse(window.localStorage.getItem(PRESENCE_KEY) ?? 'null')

beforeEach(() => {
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetPresenceForTests()
  vi.spyOn(Date, 'now').mockReturnValue(AGORA)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ensurePresenceId', () => {
  it('cria um UUID v4 na primeira vez e o devolve igual nas seguintes', () => {
    const id = ensurePresenceId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
    expect(ensurePresenceId()).toBe(id)
    expect(marcador().id).toBe(id)
  })

  it('o id muda quando o prazo do servidor vence', () => {
    const id = ensurePresenceId()
    // O servidor disse: vale por mais 1 hora (relógio dele adiantado 10 min — conta a DURAÇÃO).
    savePresenceClock(AGORA + 600_000 + 3_600_000, AGORA + 600_000)
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_599_000)
    expect(ensurePresenceId()).toBe(id)
    vi.spyOn(Date, 'now').mockReturnValue(AGORA + 3_600_000)
    const novo = ensurePresenceId()
    expect(novo).not.toBe(id)
    expect(marcador().id).toBe(novo)
  })

  it('relógio que voltou para antes da gravação do prazo ⇒ id novo', () => {
    const id = ensurePresenceId()
    savePresenceClock(AGORA + 3_600_000, AGORA)
    vi.spyOn(Date, 'now').mockReturnValue(AGORA - 1)
    expect(ensurePresenceId()).not.toBe(id)
  })

  it('não é o id do contador de visitas, nem o lê', () => {
    const doContador = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: doContador, ate: null, em: null }))
    expect(ensurePresenceId()).not.toBe(doContador)
  })

  it('armazenamento que lança ⇒ `null`, e nada de id em memória', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(ensurePresenceId()).toBeNull()
  })
})

describe('savePresenceClock e forgetPresence', () => {
  it('uma resposta que chega depois da recusa não traz o id de volta', () => {
    ensurePresenceId()
    forgetPresence()
    savePresenceClock(AGORA + 3_600_000, AGORA)
    expect(window.localStorage.getItem(PRESENCE_KEY)).toBeNull()
  })

  it('forgetPresence apaga o id e a origem', () => {
    captureLandingSource('https://www.instagram.com/', '', 'umaestrelinha.com.br')
    ensurePresenceId()
    expect(landingSource()).toBe('instagram')
    forgetPresence()
    expect(window.localStorage.getItem(PRESENCE_KEY)).toBeNull()
    expect(window.sessionStorage.getItem(PRESENCE_SOURCE_KEY)).toBeNull()
  })
})

describe('a origem — calculada uma vez, no pouso', () => {
  it('é calculada no pouso e mantida nas páginas seguintes da aba', () => {
    captureLandingSource('https://l.instagram.com/', '?x=1', 'umaestrelinha.com.br')
    expect(landingSource()).toBe('instagram')
    // A página seguinte da SPA: o referrer do documento continua o mesmo, a query mudou.
    captureLandingSource('https://www.google.com/', '?utm_source=whatsapp', 'umaestrelinha.com.br')
    expect(landingSource()).toBe('instagram')
    expect(window.sessionStorage.getItem(PRESENCE_SOURCE_KEY)).toBe('instagram')
  })

  it('sem `sessionStorage`, a origem do pouso é mantida pela memória da aba', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    captureLandingSource('https://wa.me/5551', '', 'umaestrelinha.com.br')
    expect(landingSource()).toBe('whatsapp')
    captureLandingSource('https://www.google.com/', '', 'umaestrelinha.com.br')
    expect(landingSource()).toBe('whatsapp')
  })

  it('`utm_source` do endereço de pouso vence o referrer', () => {
    captureLandingSource('https://www.google.com/', '?utm_source=instagram&utm_medium=bio', 'umaestrelinha.com.br')
    expect(landingSource()).toBe('instagram')
  })

  it('referrer da própria loja não é origem ⇒ direto', () => {
    captureLandingSource('https://www.umaestrelinha.com.br/sobre', '', 'www.umaestrelinha.com.br')
    expect(landingSource()).toBe('direto')
  })

  it('sem pouso capturado, a origem é direto', () => {
    expect(landingSource()).toBe('direto')
  })

  it('só a FAIXA é guardada, nunca o referrer ou a URL', () => {
    captureLandingSource('https://www.instagram.com/p/abc?igsh=xyz', '?utm_source=instagram&fbclid=1', 'umaestrelinha.com.br')
    landingSource()
    const tudo = JSON.stringify({ ...window.localStorage, ...window.sessionStorage })
    expect(tudo).not.toContain('instagram.com')
    expect(tudo).not.toContain('fbclid')
  })
})
