import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthUiStore } from '../authUiStore'

const reset = () => useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })

describe('authUiStore (AUTH-01)', () => {
  beforeEach(reset)

  it('opens on the entry step with the given returnTo', () => {
    useAuthUiStore.getState().open({ returnTo: '/checkout' })
    const s = useAuthUiStore.getState()
    expect(s.isOpen).toBe(true)
    expect(s.step).toBe('entry')
    expect(s.returnTo).toBe('/checkout')
  })

  it('defaults returnTo to null when opened without options', () => {
    useAuthUiStore.getState().open()
    const s = useAuthUiStore.getState()
    expect(s.isOpen).toBe(true)
    expect(s.returnTo).toBeNull()
  })

  it('close resets open state, step, email and returnTo', () => {
    useAuthUiStore.getState().open({ returnTo: '/conta' })
    useAuthUiStore.getState().setEmail('maria@email.com')
    useAuthUiStore.getState().goTo('code')
    useAuthUiStore.getState().close()
    const s = useAuthUiStore.getState()
    expect(s.isOpen).toBe(false)
    expect(s.step).toBe('entry')
    expect(s.email).toBe('')
    expect(s.returnTo).toBeNull()
  })

  it('goTo changes only the step', () => {
    useAuthUiStore.getState().open({ returnTo: '/checkout' })
    useAuthUiStore.getState().goTo('code')
    const s = useAuthUiStore.getState()
    expect(s.step).toBe('code')
    expect(s.returnTo).toBe('/checkout')
    expect(s.isOpen).toBe(true)
  })

  it('setEmail stores the email and open() clears it again', () => {
    useAuthUiStore.getState().setEmail('maria@email.com')
    expect(useAuthUiStore.getState().email).toBe('maria@email.com')
    useAuthUiStore.getState().open()
    expect(useAuthUiStore.getState().email).toBe('')
  })
})
