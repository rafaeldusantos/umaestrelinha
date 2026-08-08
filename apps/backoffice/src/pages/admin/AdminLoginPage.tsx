import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@estrelinha/supabase/client'
import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { Pin, LogIn } from 'lucide-react'

const AdminLoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [entrando, setEntrando] = useState(false)
  const navigate = useNavigate()
  const { user, isAdmin, loading: authLoading } = useAuthContext()

  /**
   * Quem navega é este efeito, **depois** de o papel resolver — não o `handleLogin`.
   *
   * `BUG-20260802-primeiro-login-do-admin-volta-para-a-tela`: navegar direto no sucesso do
   * `signInWithPassword` chegava em `/admin` antes de o `AuthProvider` saber que ela é admin, e o
   * `RequireAdmin` devolvia a lojista para cá — com o formulário vazio e sem mensagem. Ela digitava a
   * senha certa e parecia ter errado.
   *
   * Esperar `authLoading` fechar cobre os dois desfechos: admin entra, e conta sem permissão recebe
   * uma frase em vez de um vaivém silencioso.
   */
  useEffect(() => {
    if (!entrando || authLoading) return
    if (isAdmin) {
      navigate('/admin', { replace: true })
      return
    }
    if (user) {
      setError('Esta conta não tem acesso ao painel.')
      setEntrando(false)
      setLoading(false)
    }
  }, [entrando, authLoading, isAdmin, user, navigate])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('E-mail ou senha inválidos')
      setLoading(false)
      return
    }
    // Credencial aceita; o efeito acima leva para o painel quando o papel resolver.
    setEntrando(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-estrelinha-admin-bg p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-full gradient-cta flex items-center justify-center mx-auto mb-4">
            <Pin className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-estrelinha-admin-text">Admin Nanita</h1>
          <p className="text-sm text-estrelinha-admin-muted mt-1">Acesse o painel de gestão</p>
        </div>
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-estrelinha-admin-border p-6 space-y-4">
          {error && <p className="text-sm text-estrelinha-admin-pink bg-estrelinha-admin-pink/5 border border-estrelinha-admin-pink/20 rounded-lg p-3">{error}</p>}
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="mt-1" />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-xl gradient-cta text-white border-0 hover:brightness-110 hover:scale-[1.02] transition-all">
            <LogIn className="w-4 h-4 mr-2" /> {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default AdminLoginPage
