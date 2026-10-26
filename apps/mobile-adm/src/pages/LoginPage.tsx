import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { cn } from '@estrelinha/ui/lib/utils'
import { PASSOS_DA_RECUPERACAO } from '@/features/recovery'
import { AcessoNaoConferido } from '@/features/access-check'
import { AVISO_DE_ERRO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO } from '@/shared/ui/campo'
import TelaDeEntrada from '@/shared/ui/TelaDeEntrada'
import { destinoDepoisDoLogin } from '@/shared/lib/destinoDepoisDoLogin'

/** A frase do painel, palavra por palavra: a mesma conta recebe a mesma recusa nos dois apps. */
export const SEM_ACESSO = 'Esta conta não tem acesso ao painel.'

/** `MAF-26`: Entrar com um dos dois vazios é recusado aqui, sem ir à rede. */
export const CAMPOS_VAZIOS = 'Informe o e-mail e a senha.'

/**
 * Entrar no ateliê (feature 72, `MAF-08`..`MAF-11`).
 *
 * **Quem navega é o efeito, DEPOIS de o `AuthProvider` fechar o carregamento** — a regra de
 * `apps/backoffice/src/pages/admin/AdminLoginPage.tsx` (`BUG-20260802`). Navegar no sucesso do
 * `signIn` chegaria em `/` antes de o papel resolver, e o `RequireAdmin` devolveria a Adri para cá
 * com o formulário vazio. Aqui a decisão nem passa pelo `signIn`: ela é lida do contexto, e só quando
 * ele já sabe.
 *
 * - admin resolvido ⇒ a rota de origem que o `RequireAdmin` guardou no `state` (feature `79`,
 *   `MAN-21`: o aviso de pedido tocado com a sessão vencida volta ao pedido), só se for caminho do
 *   app (`destinoDepoisDoLogin`); senão a aba Início;
 * - conta com sessão e SEM o papel ⇒ a recusa com "Sair". Nenhuma leitura de dado da loja sai
 *   desta tela: as únicas consultas são as do próprio `AuthProvider` (o papel e o cadastro de quem
 *   entrou).
 * - papel NÃO CONFERIDO (`adminStatus === 'unknown'`, `MAF-23`) ⇒ "Não consegui conferir seu
 *   acesso." com "Tentar de novo". Nunca a recusa, nunca "Sair".
 *
 * "Esqueci minha senha" leva à rota `/recuperar` (`MAF-24`): com a recuperação fora desta tela, o
 * efeito não precisa mais esperar por ela — o passo da senha nova nem monta este componente.
 */
const LoginPage = () => {
  const { user, isAdmin, adminStatus, loading: authLoading, signIn, signOut } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (isAdmin) navigate(destinoDepoisDoLogin(location.state), { replace: true })
  }, [authLoading, isAdmin, navigate, location.state])

  // `!authLoading` aqui é o que decide numa TROCA de conta sem `SIGNED_OUT` no meio (outra aba da
  // mesma origem entrando com outra conta): o provider só grava `user` junto com o papel, então com
  // o papel da conta nova em voo `user` ainda é a ANTERIOR — e, se ela não era admin, a recusa dela
  // ficaria na tela por cima do login da nova. Só no primeiro login (sem sessão antes) o `user` em
  // voo é nulo e a cláusula é redundante. O caso "troca de conta SEM SIGNED_OUT" do
  // `LoginPage.test.tsx` a mede.
  //
  // `unknown` vem antes: com o papel não conferido, `isAdmin` é falso e a recusa seria desenhada —
  // a frase confiante e falsa da `BL-048`. Ele vale mesmo SEM `user`: a leitura da sessão salva que
  // não respondeu também é "não sei", e mandar ao formulário quem tem a sessão salva seria pior.
  const naoConferido = adminStatus === 'unknown'
  const recusada = !naoConferido && !authLoading && !!user && !isAdmin
  const ocupado = enviando || authLoading

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(null)
    // Só espaços conta como vazio, nos dois campos (`MAF-26`, precisão da Fase 6).
    if (!email.trim() || !senha.trim()) {
      setErro(CAMPOS_VAZIOS)
      return
    }
    setEnviando(true)
    const { error } = await signIn(email, senha)
    setEnviando(false)
    // O e-mail fica: só a senha é redigitada.
    if (error) setErro(error)
  }

  const sair = async () => {
    await signOut()
    setSenha('')
  }

  return (
    <TelaDeEntrada>
      {naoConferido ? (
        <AcessoNaoConferido />
      ) : recusada ? (
        <section className="mt-8 space-y-6">
          <h1 className="text-2xl">Entrar no ateliê</h1>
          <p role="alert" className={AVISO_DE_ERRO}>
            {SEM_ACESSO}
          </p>
          <Button type="button" onClick={sair} className={BOTAO_PRIMARIO}>
            Sair
          </Button>
        </section>
      ) : (
        <section className="mt-8">
          <h1 className="text-2xl">Entrar no ateliê</h1>
          <p className="mt-2 text-sm text-estrelinha-ink-soft">Pedidos, clientes e descontos da loja, no seu celular.</p>

          <form onSubmit={entrar} className="mt-8 space-y-5" noValidate>
            {erro && (
              <p role="alert" className={AVISO_DE_ERRO}>
                {erro}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="login-email" className={ROTULO}>
                E-mail
              </Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={CAMPO}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-senha" className={ROTULO}>
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="login-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  className={cn(CAMPO, 'pr-14')}
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha((v) => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={mostrarSenha}
                  className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-estrelinha-ink-soft"
                >
                  {mostrarSenha ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={ocupado} className={BOTAO_PRIMARIO}>
              {ocupado ? 'Entrando…' : 'Entrar'}
            </Button>
            <Button type="button" variant="ghost" onClick={() => navigate(PASSOS_DA_RECUPERACAO.email, { state: { profundidade: 1 } })} className={BOTAO_SECUNDARIO}>
              Esqueci minha senha
            </Button>
          </form>
        </section>
      )}
    </TelaDeEntrada>
  )
}

export default LoginPage
