import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { MIN_PASSWORD_LENGTH } from '@estrelinha/core/constants'
import { FormCard } from '@/shared/ui'

/**
 * Trocar a própria senha (`USR-09`..`USR-12`, `USR-23`, `USR-24`).
 *
 * **A senha atual é exigida**, e o GoTrue não exige. Sem ela, qualquer pessoa numa máquina
 * destravada assume a conta da dona — e o custo de pedir é um campo.
 *
 * **Este componente NÃO valida nada** — ele coleta, chama `changeOwnPassword` e mostra o que voltar.
 * A régua (`passwordChangeRefusal`) roda dentro do `AuthContext`, **antes de qualquer rede**: sem
 * isso, cada confirmação errada queimaria o `sign_in_sign_ups` do GoTrue e a pessoa ficaria
 * bloqueada justamente enquanto tenta trocar a senha.
 */

interface CampoSenhaProps {
  id: string
  rotulo: string
  valor: string
  onChange: (valor: string) => void
  autoComplete: string
}

const CampoSenha = ({ id, rotulo, valor, onChange, autoComplete }: CampoSenhaProps) => {
  const [visivel, setVisivel] = useState(false)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visivel ? 'text' : 'password'}
          value={valor}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          className="pr-12"
        />
        {/* `absolute` no próprio botão, sem `TAP_44`: o `relative` daquele auxiliar apaga a posição
            na fusão do `twMerge`. O alvo de 44px vem de `w-11 h-full`. */}
        <button
          type="button"
          onClick={() => setVisivel(v => !v)}
          aria-label={`${visivel ? 'Ocultar' : 'Mostrar'} ${rotulo.toLowerCase()}`}
          className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
        >
          {visivel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

const ChangePasswordCard = () => {
  const { changeOwnPassword } = useAuthContext()

  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [pronto, setPronto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  const salvar = async () => {
    setErro(null)
    setPronto(false)

    // **A régua NÃO é chamada aqui, e a ausência é deliberada** (achado da verificação independente
    // da feature 48). `changeOwnPassword` já chama `passwordChangeRefusal` antes de qualquer rede —
    // então uma segunda chamada neste componente não compra nada e cria um segundo dono: com as
    // duas, remover **qualquer uma** deixava a suíte verde, porque elas se mascaravam. Duas cópias
    // que não podem ser testadas separadamente são piores que uma.
    //
    // `ForgotPasswordFlow` chama a régua direto, e ali ela é carga: `updatePassword` não confere
    // nada.
    setSalvando(true)
    const { error } = await changeOwnPassword(atual, nova, confirma)
    setSalvando(false)

    if (error) {
      setErro(error)
      return
    }

    setAtual('')
    setNova('')
    setConfirma('')
    setPronto(true)
  }

  return (
    <FormCard title="Senha" description="Troque sua senha de acesso ao painel.">
      <div className="space-y-4 max-w-md">
        <CampoSenha
          id="senha-atual"
          rotulo="Senha atual"
          valor={atual}
          onChange={setAtual}
          autoComplete="current-password"
        />
        <CampoSenha
          id="senha-nova"
          rotulo="Senha nova"
          valor={nova}
          onChange={setNova}
          autoComplete="new-password"
        />
        <CampoSenha
          id="senha-confirma"
          rotulo="Repita a senha nova"
          valor={confirma}
          onChange={setConfirma}
          autoComplete="new-password"
        />

        <p className="text-xs text-muted-foreground">
          Mínimo de {MIN_PASSWORD_LENGTH} caracteres. Você continua conectada depois de trocar.
        </p>

        {erro && (
          <p role="alert" className="text-sm text-destructive">
            {erro}
          </p>
        )}
        {pronto && (
          <p role="status" className="text-sm text-estrelinha-admin-emerald">
            Senha alterada. Use a nova da próxima vez que entrar.
          </p>
        )}

        <Button type="button" onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Trocar senha'}
        </Button>
      </div>
    </FormCard>
  )
}

export default ChangePasswordCard
