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

// Feature 71: a chave do contador é IMPORTADA do dono (`visitanteComDonoUnico.test.ts`).
import { VISITOR_KEY } from '@/shared/lib/visits/visitor'

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

/*
 * Feature 71 — a escolha da cliente e o contador de visitas (`VIS-24`, `VIS-25`).
 *
 * O marcador é o de verdade (`shared/lib/visits/visitor.ts`, sem dublê): o que se mede é o que fica
 * no armazenamento depois da recusa, não que uma função foi chamada.
 */
describe('VIS-24 — recusar apaga o código do contador, e só o código', () => {
  const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
  const gravarMarcador = () =>
    window.localStorage.setItem(VISITOR_KEY, JSON.stringify({ v: 1, id: ID, ate: 2000, em: 1000 }))
  const marcador = () => JSON.parse(window.localStorage.getItem(VISITOR_KEY)!)

  it('"Salvar escolhas" com Estatísticas DESLIGADA: id nulo, prazo intacto', async () => {
    gravarMarcador()
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().save(false)
    expect(marcador()).toEqual({ v: 1, id: null, ate: 2000, em: 1000 })
  })

  it('com Estatísticas LIGADA o marcador não é tocado', async () => {
    gravarMarcador()
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().save(true)
    expect(marcador()).toEqual({ v: 1, id: ID, ate: 2000, em: 1000 })
  })

  it('"Aceitar" e o X também não tocam o marcador', async () => {
    gravarMarcador()
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().accept()
    useCookieConsentStore.getState().dismiss()
    expect(marcador()).toEqual({ v: 1, id: ID, ate: 2000, em: 1000 })
  })
})

describe('VIS-25 — syncFromStorage relê a escolha feita em outra aba', () => {
  const gravarEscolha = (statistics: boolean) =>
    window.localStorage.setItem(CHAVE, JSON.stringify({ v: 1, notice: 'answered', statistics }))

  it('a recusa gravada por outra aba, SEM evento nenhum, passa a valer nesta', async () => {
    const { useCookieConsentStore } = await visitaNova()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
    gravarEscolha(false)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
    expect(useCookieConsentStore.getState().notice).toBe('answered')
  })

  it('o aceite gravado por outra aba também passa a valer (registro válido é aplicado)', async () => {
    gravarEscolha(false)
    const { useCookieConsentStore } = await visitaNova()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
    gravarEscolha(true)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(true)
  })

  it('armazenamento AUSENTE mantém a memória — não volta ao padrão "aceito"', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.setState({ statistics: false, notice: 'answered' })
    window.localStorage.removeItem(CHAVE)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
    expect(useCookieConsentStore.getState().notice).toBe('answered')
  })

  it('registro corrompido mantém a memória', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.setState({ statistics: false })
    window.localStorage.setItem(CHAVE, '{não é json')
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })

  it('aba privada antiga: setItem que lança + recusa + syncFromStorage ⇒ a recusa continua', async () => {
    const { useCookieConsentStore } = await visitaNova()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    useCookieConsentStore.getState().save(false)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })

  it('leitura que lança + recusa em memória ⇒ a recusa continua', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().save(false)
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError')
    })
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })

  it('setItem que lança com um ACEITE ANTIGO gravado: a recusa em memória não é desfeita por ele', async () => {
    // O armazenamento lê, mas não grava mais (cota cheia): o registro que está lá é anterior à
    // recusa, e aplicá-lo traria "aceito" de volta.
    gravarEscolha(true)
    const { useCookieConsentStore } = await visitaNova()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    useCookieConsentStore.getState().save(false)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().statistics).toBe(false)
  })

  it('não fecha a folha de preferências aberta', async () => {
    const { useCookieConsentStore } = await visitaNova()
    useCookieConsentStore.getState().openPreferences()
    gravarEscolha(false)
    useCookieConsentStore.getState().syncFromStorage()
    expect(useCookieConsentStore.getState().preferencesOpen).toBe(true)
  })
})
