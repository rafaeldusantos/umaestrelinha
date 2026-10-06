// Feature 61 · AVS-03, AVS-05, AVS-06 — a escolha da cliente sobre cookies.
//
// Três consumidores no mesmo app — o aviso, o link do rodapé e o `track` de `shared/lib/analytics` —
// e por isso mora em `entities` (`AD-033`). O `track` está numa camada ABAIXO e não pode importar
// daqui: ele recebe a resposta por um leitor injetado (`setConsentReader`), registrado no fim deste
// arquivo.
//
// **O padrão sem resposta é medir** (legítimo interesse, `context.md`): `statistics: true` e o aviso
// aberto. Fechar no X ou aceitar responde o aviso; só "Salvar escolhas" com Estatísticas desligada
// recusa.
//
// **Persistência à mão, com `try/catch`, e não `persist` do zustand.** Em aba privada o
// `localStorage` pode lançar na leitura ou na escrita; a escolha precisa valer na sessão em curso
// mesmo assim, e o aviso reaparecer na visita seguinte (edge case da spec).

import { create } from 'zustand'
import { applyConsent, clearGaCookies, setConsentReader } from '@/shared/lib/analytics'

export const COOKIE_CONSENT_KEY = 'estrelinha-cookie-consent'

interface Persistido {
  v: 1
  notice: 'answered' | null
  statistics: boolean
}

function ler(): Persistido | null {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Persistido>
    if (p?.v !== 1) return null
    return {
      v: 1,
      notice: p.notice === 'answered' ? 'answered' : null,
      statistics: p.statistics !== false,
    }
  } catch {
    return null
  }
}

function gravar(p: Persistido): void {
  try {
    window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(p))
  } catch {
    // Aba privada: a escolha vale em memória, nesta sessão.
  }
}

interface CookieConsentState {
  notice: 'answered' | null
  statistics: boolean
  preferencesOpen: boolean
  /** "Aceitar" do aviso e "Aceitar todos" da folha: medição ligada, aviso respondido. */
  accept: () => void
  /** O X do aviso: responde o aviso sem mudar a escolha — fechar não é recusar (`AVS-03`). */
  dismiss: () => void
  /** "Salvar escolhas" da folha (`AVS-05`). */
  save: (statistics: boolean) => void
  openPreferences: () => void
  closePreferences: () => void
  /** Relê o armazenamento — para os testes e para uma aba que mudou de escolha em outra. */
  hydrate: () => void
}

const inicial = (): Pick<CookieConsentState, 'notice' | 'statistics'> => {
  const p = typeof window === 'undefined' ? null : ler()
  return { notice: p?.notice ?? null, statistics: p?.statistics ?? true }
}

export const useCookieConsentStore = create<CookieConsentState>()((set, get) => {
  const persistir = (patch: Pick<CookieConsentState, 'notice' | 'statistics'>) => {
    set(patch)
    gravar({ v: 1, notice: patch.notice, statistics: patch.statistics })
    applyConsent()
  }
  return {
    ...inicial(),
    preferencesOpen: false,
    accept: () => {
      persistir({ notice: 'answered', statistics: true })
      set({ preferencesOpen: false })
    },
    dismiss: () => persistir({ notice: 'answered', statistics: get().statistics }),
    save: statistics => {
      persistir({ notice: 'answered', statistics })
      set({ preferencesOpen: false })
      if (!statistics) clearGaCookies()
    },
    openPreferences: () => set({ preferencesOpen: true }),
    closePreferences: () => set({ preferencesOpen: false }),
    hydrate: () => set({ ...inicial(), preferencesOpen: false }),
  }
})

// O `track` pergunta aqui, a cada evento, se a cliente deixou medir.
setConsentReader(() => useCookieConsentStore.getState().statistics)

/** A forma que as telas consomem. */
export function useCookieConsent() {
  const s = useCookieConsentStore()
  return { ...s, noticeOpen: s.notice === null }
}
