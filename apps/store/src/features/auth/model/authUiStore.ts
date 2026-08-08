import { create } from 'zustand'

export type AuthStep =
  | 'entry'
  | 'code'
  | 'name'
  | 'password'
  | 'reset'
  | 'reset-code'
  | 'new-password'

interface OpenOptions {
  returnTo?: string | null
  step?: AuthStep
}

interface AuthUiState {
  isOpen: boolean
  step: AuthStep
  email: string
  returnTo: string | null
  open: (opts?: OpenOptions) => void
  close: () => void
  goTo: (step: AuthStep) => void
  setEmail: (email: string) => void
}

export const useAuthUiStore = create<AuthUiState>((set) => ({
  isOpen: false,
  step: 'entry',
  email: '',
  returnTo: null,
  open: (opts) =>
    set({ isOpen: true, step: opts?.step ?? 'entry', returnTo: opts?.returnTo ?? null, email: '' }),
  close: () => set({ isOpen: false, step: 'entry', email: '', returnTo: null }),
  goTo: (step) => set({ step }),
  setEmail: (email) => set({ email }),
}))
