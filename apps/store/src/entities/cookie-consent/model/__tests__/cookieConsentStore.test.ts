import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Feature 61 · T13 — a escolha da cliente (`AVS-03`, `AVS-05`, `AVS-06` e o edge case do
 * `localStorage` que lança).
 *
 * `clearGaCookies` e o leitor de consentimento são dublados: o que se mede aqui é que a escolha
 * CHAMA a limpeza e que o `track` passa a ouvir esta store — o efeito nos cookies tem prova própria
 * em `shared/lib/analytics`.
 */
const { clearGaCookies, applyConsent, leitor } = vi.hoisted(() => ({
  clearGaCookies: vi.fn(),
  applyConsent: vi.fn(),
  leitor: { atual: null as null | (() => boolean) },
}))

vi.mock('@/shared/lib/analytics', () => ({
  clearGaCookies,
  applyConsent,
  setConsentReader: (r: () => boolean) => {
    leitor.atual = r
  },
}))

const CHAVE = 'estrelinha-cookie-consent'

/** Importa a store do zero, como uma visita nova: ela lê o armazenamento no carregamento. */
const visitaNova = async () => {
  vi.resetModules()
  const mod = await import('../cookieConsentStore')
  return mod
}

beforeEach(() => {
  window.localStorage.clear()
  clearGaCookies.mockClear()
  applyConsent.mockClear()
  vi.restoreAllMocks()
})

describe('sem resposta guardada', () => {
  it('aviso aberto e Estatísticas LIGADA — legítimo interesse mede desde a primeira página', async () => {
    const { useCookieConsentStore } = await visitaNova()
    const s = useCookieConsentStore.getState()
    expect(s.notice).toBeNull()
    expect(s.statistics).toBe(true)
  })

  it('a chave é `estrelinha-cookie-consent`', async () => {
    const { COOKIE_CONSENT_KEY } = await visitaNova()
    expect(COOKIE_CONSENT_KEY).toBe(CHAVE)
  })

  it('o `track` ouve esta store: o leitor registrado devolve a escolha atual', async () => {
    const { useCookieConsentStore } = await visitaNova()
    expect(leitor.atual!()).toBe(true)
    useCookieConsentStore.getState().save(false)
    expect(leitor.atual!()).toBe(false)
  })
})

describe('responder o aviso', () => {
  it('"Aceitar" fecha o aviso, mantém a medição e persiste — a visita seguinte não vê o aviso', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().accept()
    expect(useCookieConsentStore.getState().notice).toBe('answered')
    expect(JSON.parse(window.localStorage.getItem(CHAVE)!)).toEqual({
      v: 1,
      notice: 'answered',
      statistics: true,
    })
    const seguinte = await visitaNova()
    expect(seguinte.useCookieConsentStore.getState().notice).toBe('answered')
  })

  it('o X também fecha e persiste — e NÃO recusa', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().dismiss()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    expect(JSON.parse(window.localStorage.getItem(CHAVE)!)).toMatchObject({
      notice: 'answered',
      statistics: true,
    })
    expect(clearGaCookies).not.toHaveBeenCalled()
  })
})

describe('"Salvar escolhas" (AVS-05)', () => {
  it('com Estatísticas desligada: grava false, apaga os cookies do GA e vale na visita seguinte', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().openPreferences()
    useCookieConsentStore.getState().save(false)
    expect(useCookieConsentStore.getState().statistics).toBe(false)
    expect(useCookieConsentStore.getState().preferencesOpen).toBe(false)
    expect(clearGaCookies).toHaveBeenCalledTimes(1)
    expect(applyConsent).toHaveBeenCalled()
    const seguinte = await visitaNova()
    expect(seguinte.useCookieConsentStore.getState().statistics).toBe(false)
    expect(seguinte.useCookieConsentStore.getState().notice).toBe('answered')
  })

  it('com Estatísticas ligada: não apaga cookie nenhum', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().save(true)
    expect(clearGaCookies).not.toHaveBeenCalled()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
  })

  it('quem recusou e depois toca "Aceitar todos" volta a ser medida', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().save(false)
    useCookieConsentStore.getState().accept()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
  })
})

describe('localStorage que lança (aba privada)', () => {
  it('a escolha vale em memória, sem exceção — e a visita seguinte vê o aviso de novo', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const { useCookieConsentStore } = await visitaNova()
    expect(useCookieConsentStore.getState().notice).toBeNull()
    expect(() => useCookieConsentStore.getState().save(false)).not.toThrow()
    expect(useCookieConsentStore.getState().statistics).toBe(false)

    const seguinte = await visitaNova()
    expect(seguinte.useCookieConsentStore.getState().notice).toBeNull()
  })

  it('valor corrompido no armazenamento cai no padrão, sem lançar', async () => {
    window.localStorage.setItem(CHAVE, '{não é json')
    const { useCookieConsentStore } = await visitaNova()
    expect(useCookieConsentStore.getState().notice).toBeNull()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
  })
})
