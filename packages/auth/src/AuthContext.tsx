import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@nanapin/supabase/client'
import { MIN_PASSWORD_LENGTH } from '@nanapin/core/constants'
import { authErrorMessage } from '@nanapin/core/auth'
import type { User } from '@supabase/supabase-js'

interface Customer {
  id: string
  user_id: string
  name: string
  email: string
  cpf?: string
  phone?: string
}

interface AuthContextType {
  user: User | null
  customer: Customer | null
  isAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  verifyRecoveryCode: (email: string, token: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

async function checkAdmin(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
    if (error) return false
    return !!data
  } catch {
    return false
  }
}

async function fetchCustomer(userId: string): Promise<Customer | null> {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return data as Customer
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  /** Id de quem já foi resolvido. Distingue "sessão nova" de refresh de token do mesmo usuário. */
  const resolvedFor = useRef<string | null>(null)

  /**
   * ⚠️ `loading` volta a `true` enquanto o papel e o cliente estão em voo. Sem isso, quem lê o contexto
   * decide sobre estado **obsoleto** — e era a causa de
   * `BUG-20260802-primeiro-login-do-admin-volta-para-a-tela`: no primeiro login, `RequireAdmin`
   * renderizava com `loading: false` (do `getSession()` inicial, sem sessão) e `isAdmin: false` (ainda
   * não resolvido), concluía "não é admin" e devolvia a lojista para o login. Na loja o mesmo furo abre
   * o overlay de auth logo depois de a cliente entrar, porque `user` ainda é `null`.
   *
   * O `resolvedFor` é o que impede o efeito colateral: refresh de token do MESMO usuário (que o GoTrue
   * dispara sozinho de tempo em tempo) não pisca `loading`, então `/conta` e `/checkout` não voltam para
   * "Carregando..." no meio da sessão. Só identidade nova paga o carregamento.
   */
  const loadUserData = async (u: User | null) => {
    if (u) {
      if (resolvedFor.current === u.id) {
        setUser(u)
        setLoading(false)
        return
      }
      setLoading(true)
      const [admin, cust] = await Promise.all([checkAdmin(u.id), fetchCustomer(u.id)])
      resolvedFor.current = u.id
      setUser(u)
      setIsAdmin(admin)
      setCustomer(cust)
    } else {
      resolvedFor.current = null
      setUser(null)
      setIsAdmin(false)
      setCustomer(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null)
    })

    // Listen for changes — never await inside this callback.
    //
    // ⚠️ O `setTimeout` é o que faz a regra acima valer de verdade. `loadUserData` chama
    // `supabase.from(...)`, e chamar o client de DENTRO do callback do `onAuthStateChange` é a
    // armadilha documentada do supabase-js: a requisição sai antes de a sessão nova estar acoplada ao
    // client, e o PostgREST responde **401**. `checkAdmin` engole o erro e devolve `false` — a lojista
    // era expulsa (e, depois da correção da navegação, ouvia "esta conta não tem acesso ao painel",
    // uma frase confiante e errada). Ver `BUG-20260802-primeiro-login-do-admin-volta-para-a-tela`.
    //
    // Sair do callback com `setTimeout(0)` resolve porque a leitura passa a acontecer depois de o
    // client ter guardado a sessão.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setTimeout(() => {
        loadUserData(u)
      }, 0)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Passa pelo mapper em vez de colapsar tudo em "E-mail ou senha inválidos": a credencial errada
  // continua dando essa mensagem (linha `invalid_credentials`), mas um 429 ou um 500 deixam de
  // acusar a pessoa de ter digitado errado quando o problema é nosso.
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: authErrorMessage(error) }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    })
    return { error: authErrorMessage(error) }
  }

  const signInWithGoogle = async (redirectPath?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}${redirectPath ?? '/conta'}` },
    })
  }

  const signInWithOtp = async (email: string) => {
    const normalized = email.trim().toLowerCase()
    const { error } = await supabase.auth.signInWithOtp({
      email: normalized,
      options: { shouldCreateUser: true },
    })
    return { error: authErrorMessage(error) }
  }

  const verifyOtp = async (email: string, token: string) => {
    const normalized = email.trim().toLowerCase()
    const cleanToken = token.replace(/\s/g, '')
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleanToken,
      type: 'email',
    })
    if (error) return { error: authErrorMessage(error), isNewUser: false }

    // New user = customer row exists with an empty name (created by the
    // handle_new_customer trigger on first sign-up).
    let isNewUser = false
    const userId = data?.user?.id
    if (userId) {
      const { data: cust } = await supabase
        .from('customers')
        .select('name')
        .eq('user_id', userId)
        .maybeSingle()
      isNewUser = !cust?.name || cust.name.trim() === ''
    }
    return { error: null, isNewUser }
  }

  const updateDisplayName = async (name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return { error: 'Informe seu nome' }
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) return { error: 'Sessão expirada. Entre novamente.' }
    const { error: custErr } = await supabase
      .from('customers')
      .update({ name: trimmed })
      .eq('user_id', current.id)
    // Erro do PostgREST, não do GoTrue — não passa pelo mapper de auth, que espera outra forma.
    // Antes vazava `permission denied for table customers` para a cliente.
    if (custErr) return { error: 'Não foi possível salvar seu nome agora. Tente de novo.' }
    await supabase.auth.updateUser({ data: { full_name: trimmed } })
    setCustomer((prev) => (prev ? { ...prev, name: trimmed } : prev))
    return { error: null }
  }

  // Envia o e-mail de recuperação. O template usa {{ .Token }} (código de 6
  // dígitos), então não há redirectTo: quem verifica é verifyRecoveryCode.
  const resetPassword = async (email: string) => {
    const normalized = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return { error: 'E-mail inválido' }
    const { error } = await supabase.auth.resetPasswordForEmail(normalized)
    return { error: authErrorMessage(error) }
  }

  // Troca o código de recuperação por uma sessão, habilitando updatePassword.
  const verifyRecoveryCode = async (email: string, token: string) => {
    const normalized = email.trim().toLowerCase()
    const cleanToken = token.replace(/\s/g, '')
    const { error } = await supabase.auth.verifyOtp({
      email: normalized,
      token: cleanToken,
      type: 'recovery',
    })
    return { error: authErrorMessage(error) }
  }

  const updatePassword = async (password: string) => {
    if (password.length < MIN_PASSWORD_LENGTH) {
      return { error: `A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres` }
    }
    const { error } = await supabase.auth.updateUser({ password })
    return { error: authErrorMessage(error) }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, customer, isAdmin, loading, signIn, signUp, signInWithGoogle, signInWithOtp, verifyOtp, updateDisplayName, resetPassword, verifyRecoveryCode, updatePassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
