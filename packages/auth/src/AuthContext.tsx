import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@estrelinha/supabase/client'
import { MIN_PASSWORD_LENGTH } from '@estrelinha/core/constants'
import { authErrorMessage } from '@estrelinha/core/auth'
import { passwordChangeRefusal } from '@estrelinha/core/admin-users'
import { stripPhone } from '@estrelinha/core/validators'
import type { User } from '@supabase/supabase-js'

export interface Customer {
  id: string
  user_id: string
  name: string
  email: string
  cpf?: string
  phone?: string
}

/**
 * O papel de quem está na sessão, em TRÊS estados (feature 72, `MAF-22`, fecha a `BL-048`).
 *
 * - `admin` — a consulta respondeu que sim;
 * - `not-admin` — a consulta respondeu que não, ou não há sessão;
 * - `unknown` — a consulta (ou a leitura da sessão) FALHOU ou não respondeu em
 *   `ADMIN_CHECK_TIMEOUT_MS`. Não é recusa: é "não sei". Quem lê este estado diz "Não consegui
 *   conferir seu acesso." e oferece `retryAdminCheck`, nunca a frase de conta sem acesso.
 *
 * `isAdmin` continua existindo e significa o mesmo para quem só o lê: `adminStatus === 'admin'`.
 */
export type AdminStatus = 'admin' | 'not-admin' | 'unknown'

/**
 * O teto da resolução do papel e da leitura inicial da sessão. Com a rede "conectada" e sem saída
 * (Wi-Fi sem internet), as duas podiam ficar penduradas para sempre — a splash do ateliê foi medida
 * 90 s parada. Na abertura o teto é UM só, contado da montagem do provider, para a sessão e o papel
 * juntos: quem espera não espera duas vezes.
 */
export const ADMIN_CHECK_TIMEOUT_MS = 8000

interface AuthContextType {
  user: User | null
  customer: Customer | null
  isAdmin: boolean
  adminStatus: AdminStatus
  /** Refaz a leitura da sessão e a consulta do papel (o "Tentar de novo" do estado `unknown`). */
  retryAdminCheck: () => Promise<void>
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signInWithGoogle: (redirectPath?: string) => Promise<void>
  signInWithOtp: (email: string) => Promise<{ error: string | null }>
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null; isNewUser: boolean }>
  updateDisplayName: (name: string) => Promise<{ error: string | null }>
  updateCustomerProfile: (profile: { name: string; phone: string }) => Promise<{ error: string | null }>
  patchCustomer: (patch: Partial<Customer>) => void
  resetPassword: (email: string) => Promise<{ error: string | null }>
  verifyRecoveryCode: (email: string, token: string) => Promise<{ error: string | null }>
  updatePassword: (password: string) => Promise<{ error: string | null }>
  changeOwnPassword: (current: string, next: string, confirm: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

/** `promessa`, ou `emFalta` se ela não resolver em `ms`. O temporizador sai junto com a resposta. */
function comTeto<T>(promessa: Promise<T>, ms: number, emFalta: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const id = setTimeout(() => resolve(emFalta), ms)
    promessa.then(
      (valor) => {
        clearTimeout(id)
        resolve(valor)
      },
      () => {
        clearTimeout(id)
        resolve(emFalta)
      },
    )
  })
}

/**
 * ⚠️ Falha NÃO é "não": até a `72` este booleano devolvia `false` no erro, e a dona com Wi-Fi sem
 * saída lia "Esta conta não tem acesso ao painel." sobre a própria conta (`BL-048`). Agora só a
 * resposta `null` do banco é `not-admin`; erro, exceção e silêncio são `unknown`.
 */
async function checkAdmin(userId: string): Promise<AdminStatus> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle()
    if (error) return 'unknown'
    return data ? 'admin' : 'not-admin'
  } catch {
    return 'unknown'
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
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('not-admin')
  const isAdmin = adminStatus === 'admin'
  const [loading, setLoading] = useState(true)
  /**
   * Id de quem está NA TELA (o `user` já gravado). É o que separa as duas espécies de resolução
   * (feature 72, conserto r2 da Fase 6): a de uma IDENTIDADE (a primeira, a troca de conta, a saída)
   * paga `loading`; a REPERGUNTA do papel ou do cadastro de quem já está presente nunca mexe nele.
   */
  const presente = useRef<string | null>(null)
  /** Id cujo papel foi CONFERIDO (`admin` ou `not-admin`). `unknown` não conta: volta a perguntar. */
  const papelDe = useRef<string | null>(null)
  /** Id cujo cadastro (`customers`) chegou. `null` (falhou, estourou o teto) volta a ser pedido. */
  const cadastroDe = useRef<string | null>(null)
  /** Id cuja resolução está em voo: a segunda chamada para o mesmo id não abre um segundo teto. */
  const emVoo = useRef<string | null>(null)
  /** Quando a abertura começou; `null` depois da primeira resolução. O teto da abertura é UM só. */
  const inicioDaAbertura = useRef<number | null>(Date.now())
  /**
   * A GERAÇÃO da resolução vigente (feature 72, verificação da Fase 6). Toda resolução que começa —
   * a leitura da sessão, a do papel de uma identidade nova, a saída — ganha um número, e toda
   * conclusão (sucesso, falha ou teto) só grava o estado se o número dela ainda for o vigente.
   *
   * Sem isso havia duas corridas: a resposta do papel chegando DEPOIS de a sessão cair promovia a
   * admin a conta que já tinha saído (P1, existia antes desta feature, e o painel também a tinha); e
   * o teto de um "Tentar de novo" apagava, 8 s depois, um `admin` que outra leitura já tinha conferido
   * (P3).
   */
  const geracao = useRef(0)
  /**
   * Quantas vezes a IDENTIDADE começou a ser resolvida (um usuário novo, ou a saída). A resposta de
   * uma leitura da sessão vale enquanto nenhuma identidade nova começou depois de ela sair: um
   * "Tentar de novo" não a torna velha (as duas leem a mesma sessão), um logout torna.
   */
  const identidade = useRef(0)

  const tetoRestante = () =>
    inicioDaAbertura.current === null
      ? ADMIN_CHECK_TIMEOUT_MS
      : Math.max(0, inicioDaAbertura.current + ADMIN_CHECK_TIMEOUT_MS - Date.now())

  /**
   * ⚠️ `loading` volta a `true` enquanto o papel e o cliente de uma IDENTIDADE NOVA estão em voo. Sem
   * isso, quem lê o contexto decide sobre estado **obsoleto** — e era a causa de
   * `BUG-20260802-primeiro-login-do-admin-volta-para-a-tela`: no primeiro login, `RequireAdmin`
   * renderizava com `loading: false` (do `getSession()` inicial, sem sessão) e `isAdmin: false` (ainda
   * não resolvido), concluía "não é admin" e devolvia a lojista para o login. Na loja o mesmo furo abre
   * o overlay de auth logo depois de a cliente entrar, porque `user` ainda é `null`.
   *
   * ⚠️ **`loading` só muda na primeira resolução e na troca de identidade** (feature 72, conserto r2
   * da Fase 6). A loja DEPENDE disso: `CheckoutPage` e `AccountPage` desenham "Carregando..." no lugar
   * da página enquanto `loading` é verdadeiro, e piscá-lo desmonta a página — o Brick do cartão e o
   * que a cliente já preencheu vão junto. O supabase-js emite `SIGNED_IN` a cada volta da aba
   * (`_recoverAndRefresh`) e `TOKEN_REFRESHED` de tempo em tempo; para o MESMO usuário já presente,
   * esses eventos só REPERGUNTAM o que falta (o papel que ficou `unknown`, o cadastro que não chegou),
   * e a repergunta nunca toca em `loading`. A única exceção é quem já o pôs em `true` de propósito —
   * o "Tentar de novo" —, e a repergunta o devolve a `false` ao terminar.
   */
  const loadUserData = async (u: User | null) => {
    if (u) {
      const mesmo = presente.current === u.id
      const faltaPapel = papelDe.current !== u.id
      const faltaCadastro = cadastroDe.current !== u.id
      if (mesmo && !faltaPapel && !faltaCadastro) {
        setUser(u)
        setLoading(false)
        return
      }
      // Uma resolução deste mesmo usuário já está em voo: a segunda não abre um segundo teto nem
      // repete a consulta (na abertura o client real entrega o mesmo usuário por `getSession` e por
      // `INITIAL_SESSION`).
      if (emVoo.current === u.id) return
      emVoo.current = u.id
      const minha = ++geracao.current
      if (!mesmo) {
        identidade.current += 1
        setLoading(true)
      }
      const teto = tetoRestante()
      const pedirPapel = !mesmo || faltaPapel
      const pedirCadastro = !mesmo || faltaCadastro
      const [admin, cust] = await Promise.all([
        pedirPapel ? comTeto(checkAdmin(u.id), teto, 'unknown' as AdminStatus) : Promise.resolve(null),
        pedirCadastro ? comTeto(fetchCustomer(u.id), teto, null) : Promise.resolve(undefined),
      ])
      // A sessão mudou (saiu, trocou de conta, outro "Tentar de novo") enquanto a resposta vinha:
      // ela é de uma resolução velha e é descartada — nunca promove a admin quem já saiu.
      if (minha !== geracao.current) return
      emVoo.current = null
      presente.current = u.id
      setUser(u)
      if (admin !== null) {
        // "Não sei" não fica guardado como conferido: o próximo evento de auth do mesmo usuário
        // (a volta da aba, um refresh de token) volta a perguntar — sem mexer em `loading`.
        papelDe.current = admin === 'unknown' ? null : u.id
        setAdminStatus(admin)
      }
      if (cust !== undefined) {
        // O cadastro que estourou o teto também volta a ser pedido no próximo evento.
        cadastroDe.current = cust ? u.id : null
        setCustomer(cust)
      }
    } else {
      geracao.current += 1
      identidade.current += 1
      presente.current = null
      papelDe.current = null
      cadastroDe.current = null
      emVoo.current = null
      setUser(null)
      setAdminStatus('not-admin')
      setCustomer(null)
    }
    inicioDaAbertura.current = null
    setLoading(false)
  }

  /**
   * Lê a sessão salva, com teto. Pendurada (o `getSession` renova o token pela rede quando ele
   * venceu), ela vira `unknown` no fim do teto — nunca uma splash eterna, e nunca "sem sessão",
   * que mandaria ao Login quem tem a sessão salva.
   */
  const lerSessao = () => {
    const minha = ++geracao.current
    const identidadeNaSaida = identidade.current
    let respondeu = false
    /** "Não sei", gravado só se esta leitura ainda for a resolução vigente. */
    const naoSei = () => {
      if (minha !== geracao.current) return
      inicioDaAbertura.current = null
      setAdminStatus('unknown')
      setLoading(false)
    }
    const id = setTimeout(() => {
      if (respondeu) return
      naoSei()
    }, tetoRestante())
    const falhou = () => {
      respondeu = true
      clearTimeout(id)
      naoSei()
    }
    let leitura: ReturnType<typeof supabase.auth.getSession>
    try {
      leitura = supabase.auth.getSession()
    } catch {
      // A exceção lançada na hora é falha como as outras duas formas (`MAF-22`).
      falhou()
      return Promise.resolve()
    }
    return Promise.resolve(leitura).then(
      ({ data, error }) => {
        // `{ error }` é falha, nunca "sem sessão": "sem sessão" mandaria ao Login quem tem a sessão
        // salva, e na recusa quem está no meio de entrar.
        if (error) return falhou()
        respondeu = true
        clearTimeout(id)
        // Uma identidade nova começou depois de esta leitura sair (logout, outra conta): ela é velha.
        if (identidade.current !== identidadeNaSaida) return
        return loadUserData(data?.session?.user ?? null)
      },
      falhou,
    )
  }

  /** O "Tentar de novo": relê a sessão e pergunta o papel de novo, com um teto inteiro. */
  const retryAdminCheck = async () => {
    papelDe.current = null
    cadastroDe.current = null
    emVoo.current = null
    setLoading(true)
    await lerSessao()
  }

  useEffect(() => {
    // Get initial session
    lerSessao()

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
    //
    // ⚠️ `INITIAL_SESSION` SEM sessão é ignorado (feature 72, conserto r2 da Fase 6, `MAF-22`/`MAF-23`).
    // O supabase-js o emite nos DOIS casos — sessão ausente do storage E leitura que falhou
    // (`_emitInitialSession` cai no `catch` e chama o ouvinte com `null`) —, e o evento não diz qual.
    // Quem diz é a nossa própria leitura (`lerSessao`): `{ error }` é `unknown`, sessão ausente é
    // "sem sessão". Obedecer ao evento mandava ao Login, ~40 s depois, quem tem a sessão salva e só
    // estava sem rede. O logout de verdade continua chegando: `SIGNED_OUT`, ou `getSession` sem sessão.
    //
    // E o `INITIAL_SESSION` COM sessão vale pela mesma régua da leitura: se uma identidade nova
    // começou depois da inscrição (a nossa leitura já resolveu, alguém entrou ou saiu), ele é velho —
    // é a mesma sessão que `lerSessao` já entregou, ou uma que já não é a da tela.
    const identidadeNaInscricao = identidade.current
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) return
      const u = session?.user ?? null
      setTimeout(() => {
        if (event === 'INITIAL_SESSION' && identidade.current !== identidadeNaInscricao) return
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

  /**
   * "Meus dados" (feature 59, `DAD-02`): grava nome e WhatsApp em `customers` e o nome também em
   * `user_metadata.full_name` — o mesmo caminho de `updateDisplayName`.
   *
   * Fino de propósito: a régua (nome ≥ 2, WhatsApp de 10–11 dígitos) mora em
   * `apps/store/src/features/edit-profile/model/profileRefusal.ts`, que tem runner — este pacote
   * não tem. O telefone vai só com dígitos, como o caixa grava.
   *
   * ⚠️ Checa as linhas afetadas: `.update()` não lança quando a RLS nega, devolve zero linhas sem
   * `error` (o mesmo defeito que `useSaveCustomerCpf` documenta). Sem o `.select()`, a tela voltaria
   * ao modo leitura dizendo que salvou o que o banco recusou.
   */
  const updateCustomerProfile = async ({ name, phone }: { name: string; phone: string }) => {
    const nome = name.trim()
    const digitos = stripPhone(phone)
    const { data: { user: current } } = await supabase.auth.getUser()
    if (!current) return { error: 'Sessão expirada. Entre novamente.' }
    const { data, error } = await supabase
      .from('customers')
      .update({ name: nome, phone: digitos })
      .eq('user_id', current.id)
      .select()
    if (error || !data || data.length === 0) {
      return { error: 'Não foi possível salvar agora. Tente de novo.' }
    }
    await supabase.auth.updateUser({ data: { full_name: nome } })
    setCustomer((prev) => (prev ? { ...prev, name: nome, phone: digitos } : prev))
    return { error: null }
  }

  /**
   * Acerta o cliente do contexto depois de uma gravação feita FORA dele — hoje, o CPF preenchido uma
   * vez em "Meus dados" (`useSaveCustomerCpf`). Sem isso a tela seguiria mostrando o campo vazio até
   * recarregar a página.
   */
  const patchCustomer = (patch: Partial<Customer>) => {
    setCustomer((prev) => (prev ? { ...prev, ...patch } : prev))
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

  /**
   * Troca a senha de quem está logada, **provando a senha atual** (`USR-09`..`USR-12`, `USR-23`).
   *
   * Três passos, nesta ordem, e a ordem é a regra:
   *
   *   1. `passwordChangeRefusal` — recusa local, **zero rede**. Sem ela, cada tentativa errada de
   *      confirmação gastaria uma ida ao GoTrue e a pessoa acabaria bloqueada por rate limit
   *      (`sign_in_sign_ups`) justamente enquanto tenta trocar a própria senha.
   *   2. `signInWithPassword` — é o que prova a senha atual. O GoTrue **não** exige isso em
   *      `updateUser`, e sem a prova qualquer pessoa numa máquina destravada assume a conta da dona.
   *   3. `updateUser` — a troca.
   *
   * O passo 2 substitui a sessão por outra **do mesmo usuário**: `presente.current === u.id` no
   * efeito acima, então `loading` não pisca e ninguém é deslogado. E errar a senha atual **não**
   * derruba a sessão existente — o supabase-js não a limpa num `signInWithPassword` que falha.
   */
  const changeOwnPassword = async (current: string, next: string, confirm: string) => {
    const recusa = passwordChangeRefusal({ current, next, confirm })
    if (recusa) return { error: recusa }

    const { data: { user: atual } } = await supabase.auth.getUser()
    const email = atual?.email
    if (!email) return { error: 'Sessão expirada. Entre novamente.' }

    const { error: credencial } = await supabase.auth.signInWithPassword({ email, password: current })
    if (credencial) return { error: authErrorMessage(credencial) }

    const { error } = await supabase.auth.updateUser({ password: next })
    return { error: authErrorMessage(error) }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, customer, isAdmin, adminStatus, retryAdminCheck, loading, signIn, signUp, signInWithGoogle, signInWithOtp, verifyOtp, updateDisplayName, updateCustomerProfile, patchCustomer, resetPassword, verifyRecoveryCode, updatePassword, changeOwnPassword, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}
