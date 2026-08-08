import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AuthPage from '../AuthPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { state, openSpy } = vi.hoisted(() => ({
  state: { isOpen: false },
  openSpy: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
  useAuthUiStore: (sel: any) => sel({ isOpen: state.isOpen, open: openSpy }),
}))

const renderPage = () => render(<MemoryRouter><AuthPage /></MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  state.isOpen = false
})

describe('AuthPage /entrar (AUTH-01)', () => {
  it('opens the auth overlay on mount (deep-link)', () => {
    renderPage()
    expect(openSpy).toHaveBeenCalled()
  })

  it('offers a reopen button when the overlay is closed', () => {
    state.isOpen = false
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar ou criar conta' }))
    expect(openSpy).toHaveBeenCalled()
  })

  it('hides the reopen button while the overlay is open', () => {
    state.isOpen = true
    renderPage()
    expect(screen.queryByRole('button', { name: 'Entrar ou criar conta' })).not.toBeInTheDocument()
  })
})
