import { useState } from 'react'
import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { MIN_PASSWORD_LENGTH } from '@estrelinha/core/constants'
import { passwordChangeRefusal } from '@estrelinha/core/admin-users'

/**
 * "Esqueci minha senha", dentro do `/admin/login` (`USR-39`..`USR-43`).
 *
 * **Existe porque o painel não tinha saída nenhuma para quem esquece a senha.** O template
 * `recovery.html` manda um código de 6 dígitos e diz "use o código abaixo **na loja**" — então, sem
 * esta tela, a ação "enviar link de redefinição" de `/admin/usuarios` terminaria mandando a lojista
 * para o login da vitrine.
 *
 * Os três passos consomem `resetPassword`, `verifyRecoveryCode` e `updatePassword` do `AuthContext`,
 * que **já existiam e não tinham nenhum chamador no painel**.
 *
 * O desfecho NÃO mora aqui: `verifyRecoveryCode` abre sessão, e quem decide para onde ir quando o
 * papel resolve é o efeito que já existe em `AdminLoginPage`. Uma segunda regra de "para onde ir
 * depois de entrar" seria a mesma divergência que esta feature combate em toda parte.
 */

type Passo = 'email' | 'codigo' | 'senha'

interface Props {
  /** Volta ao formulário de entrar, sem recarregar a página (`USR-43`). */
  onCancel: () => void
  /** Avisa a página que há sessão — ela decide o destino quando o papel resolver (`USR-42`). */
  onEntrou: () => void
}

const ForgotPasswordFlow = ({ onCancel, onEntrou }: Props) => {
  const { resetPassword, verifyRecoveryCode, updatePassword } = useAuthContext()

  const [passo, setPasso] = useState<Passo>('email')
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [recado, setRecado] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const limpar = () => {
    setErro(null)
    setRecado(null)
  }

  const pedirCodigo = async () => {
    limpar()
    setOcupado(true)
    const { error } = await resetPassword(email)
    setOcupado(false)

    if (error) {
      setErro(error)
      return
    }
    // Nomeia o endereço: sem isso, quem digitou errado fica esperando um e-mail que foi para outro
    // lugar, e não tem como perceber.
    setRecado(`Enviamos um código de 6 dígitos para ${email.trim().toLowerCase()}.`)
    setPasso('codigo')
  }

  const conferirCodigo = async () => {
    limpar()
    setOcupado(true)
    const { error } = await verifyRecoveryCode(email, codigo)
    setOcupado(false)

    if (error) {
      setErro(error)
      return
    }
    setPasso('senha')
  }

  const gravarSenha = async () => {
    limpar()
    // A MESMA régua da troca em `/admin/conta`, menos a comparação com a atual — que aqui não
    // existe, porque quem chegou até aqui é justamente quem não a sabe.
    const recusa = passwordChangeRefusal({ current: '', next: nova, confirm: confirma })
    if (recusa) {
      setErro(recusa)
      return
    }

    setOcupado(true)
    const { error } = await updatePassword(nova)
    setOcupado(false)

    if (error) {
      setErro(error)
      return
    }
    onEntrou()
  }

  return (
    <div className="bg-white rounded-2xl border border-estrelinha-admin-border p-6 space-y-4">
      <div>
        <h2 className="font-heading text-lg text-estrelinha-admin-text">Redefinir senha</h2>
        <p className="text-sm text-estrelinha-admin-muted mt-1">
          {passo === 'email' && 'Informe o e-mail da sua conta do painel.'}
          {passo === 'codigo' && 'Digite o código que enviamos. Ele vale por 10 minutos.'}
          {passo === 'senha' && 'Escolha a senha nova.'}
        </p>
      </div>

      {erro && (
        <p
          role="alert"
          className="text-sm text-estrelinha-admin-pink bg-estrelinha-admin-pink/5 border border-estrelinha-admin-pink/20 rounded-lg p-3"
        >
          {erro}
        </p>
      )}
      {recado && (
        <p role="status" className="text-sm text-estrelinha-admin-muted">
          {recado}
        </p>
      )}

      {passo === 'email' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="recuperar-email">E-mail</Label>
            <Input
              id="recuperar-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <Button type="button" onClick={pedirCodigo} disabled={ocupado} className="w-full rounded-xl">
            {ocupado ? 'Enviando…' : 'Enviar código'}
          </Button>
        </div>
      )}

      {passo === 'codigo' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="recuperar-codigo">Código</Label>
            <Input
              id="recuperar-codigo"
              inputMode="numeric"
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              className="mt-1"
              autoFocus
            />
          </div>
          <Button type="button" onClick={conferirCodigo} disabled={ocupado} className="w-full rounded-xl">
            {ocupado ? 'Conferindo…' : 'Conferir código'}
          </Button>
          {/* `USR-41`: pedir outro sem recarregar. Voltar ao passo do e-mail mantém o que foi
              digitado, então quem só errou o código não redigita o endereço. */}
          <Button type="button" variant="ghost" onClick={() => { limpar(); setPasso('email') }} className="w-full">
            Enviar outro código
          </Button>
        </div>
      )}

      {passo === 'senha' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="recuperar-nova">Senha nova</Label>
            <Input
              id="recuperar-nova"
              type="password"
              value={nova}
              onChange={e => setNova(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="recuperar-confirma">Repita a senha nova</Label>
            <Input
              id="recuperar-confirma"
              type="password"
              value={confirma}
              onChange={e => setConfirma(e.target.value)}
              className="mt-1"
              autoComplete="new-password"
            />
          </div>
          <p className="text-xs text-estrelinha-admin-muted">
            Mínimo de {MIN_PASSWORD_LENGTH} caracteres.
          </p>
          <Button type="button" onClick={gravarSenha} disabled={ocupado} className="w-full rounded-xl">
            {ocupado ? 'Salvando…' : 'Salvar e entrar'}
          </Button>
        </div>
      )}

      <Button type="button" variant="ghost" onClick={onCancel} className="w-full">
        Voltar para entrar
      </Button>
    </div>
  )
}

export default ForgotPasswordFlow
