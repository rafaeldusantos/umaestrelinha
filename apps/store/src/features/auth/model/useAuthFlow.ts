import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '@nanapin/auth'
import { useAuthUiStore } from './authUiStore'

/**
 * Orchestrates the login flow: wires each step's action to the AuthContext
 * methods, drives step transitions and resolves the post-login destination
 * (returnTo, or /conta). The cart is preserved automatically by cartStore's
 * persist middleware — no action needed here.
 */
export function useAuthFlow() {
  const {
    signIn,
    signInWithGoogle,
    signInWithOtp,
    verifyOtp,
    updateDisplayName,
    resetPassword,
    verifyRecoveryCode,
    updatePassword,
  } = useAuthContext()
  const email = useAuthUiStore((s) => s.email)
  const returnTo = useAuthUiStore((s) => s.returnTo)
  const setEmail = useAuthUiStore((s) => s.setEmail)
  const goTo = useAuthUiStore((s) => s.goTo)
  const close = useAuthUiStore((s) => s.close)
  const navigate = useNavigate()

  const finish = () => {
    const dest = returnTo ?? '/conta'
    close()
    // Contextual open (returnTo === current route): just close, don't re-navigate.
    if (dest !== window.location.pathname) navigate(dest)
  }

  const sendCode = async (emailInput: string) => {
    setEmail(emailInput)
    const { error } = await signInWithOtp(emailInput)
    if (!error) goTo('code')
    return { error }
  }

  const submitCode = async (token: string) => {
    const { error, isNewUser } = await verifyOtp(email, token)
    if (error) return { error }
    if (isNewUser) goTo('name')
    else finish()
    return { error: null }
  }

  const submitName = async (name: string) => {
    const { error } = await updateDisplayName(name)
    if (!error) finish()
    return { error }
  }

  const loginWithPassword = async (emailInput: string, password: string) => {
    const { error } = await signIn(emailInput, password)
    if (!error) finish()
    return { error }
  }

  // Reset por código (não por link): o e-mail traz {{ .Token }}, o usuário digita
  // no reset-code e só então define a senha nova. Evita o acoplamento do PKCE ao
  // navegador que pediu o reset.
  const sendReset = async (emailInput: string) => {
    setEmail(emailInput)
    const { error } = await resetPassword(emailInput)
    if (!error) goTo('reset-code')
    return { error }
  }

  const submitResetCode = async (token: string) => {
    const { error } = await verifyRecoveryCode(email, token)
    if (!error) goTo('new-password')
    return { error }
  }

  const submitNewPassword = async (password: string) => {
    const { error } = await updatePassword(password)
    if (!error) finish()
    return { error }
  }

  const loginWithGoogle = () => signInWithGoogle(returnTo ?? '/conta')

  return {
    email,
    setEmail,
    goTo,
    sendCode,
    submitCode,
    submitName,
    loginWithPassword,
    sendReset,
    submitResetCode,
    submitNewPassword,
    loginWithGoogle,
  }
}
