import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@estrelinha/auth'
import { AUTH_RATE_LIMITED } from '@estrelinha/core/auth'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { MIN_PASSWORD_LENGTH } from '@estrelinha/core/constants'
import { passwordChangeRefusal } from '@estrelinha/core/admin-users'
import { AVISO_DE_ERRO, BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CAMPO, ROTULO } from '@/shared/ui/campo'
import { lerEstado, PASSOS_DA_RECUPERACAO, type EstadoDoPasso, type Passo } from '../model/passos'

/**
 * Recuperar o acesso, por CÓDIGO de 6 dígitos (feature 72, `MAF-12`).
 *
 * **O protótipo dizia que mandava um endereço para clicar, e estava errado**: o template de
 * recuperação em produção envia `{{ .Token }}`, um código. Prometer outra coisa faria a Adri esperar
 * por um e-mail diferente do que chega.
 *
 * Comportamento de referência: `apps/backoffice/src/features/account/ui/ForgotPasswordFlow.tsx`
 * (não importado — é outro app). Os três passos usam `resetPassword`, `verifyRecoveryCode` e
 * `updatePassword` do `@estrelinha/auth`, e a senha nova passa pela MESMA régua do painel
 * (`passwordChangeRefusal`) antes de qualquer chamada de rede.
 *
 * **Cada passo tem rota** (`MAF-24`, `../model/passos.ts`): o voltar do Android volta um passo, e do
 * primeiro volta ao Login — o voltar é o do navegador, nada é interceptado. O que o passo precisa
 * saber (o e-mail, o prazo do reenvio, o aviso) vem do `history.state` da entrada, nunca da URL. O
 * componente é remontado a cada entrada (`key` na página), então o estado local nasce dela.
 *
 * O desfecho NÃO mora aqui: o código abre uma sessão, e quem decide para onde ir quando o papel
 * resolver é o efeito do `LoginPage` — gravada a senha, a recuperação só devolve a ele (`/login`).
 */

/** O mesmo intervalo do GoTrue (`max_frequency = "60s"` no `config.toml`): reenviar antes falharia. */
export const REENVIO_SEGUNDOS = 60

const formatar = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const normalizar = (email: string) => email.trim().toLowerCase()

/** A conta de entradas empilhadas: só cresce a partir de uma conta conhecida. */
const mais1 = (n: number | undefined) => (n ? n + 1 : undefined)

const RecoveryFlow = ({ passo }: { passo: Passo }) => {
  const { resetPassword, verifyRecoveryCode, updatePassword } = useAuthContext()
  const navigate = useNavigate()
  const location = useLocation()
  const estado = lerEstado(location.state)
  const [email, setEmail] = useState(estado.email ?? '')
  const [codigo, setCodigo] = useState('')
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  // A espera é um PRAZO (quando o reenvio libera), e o relógio só redesenha: contar segundos
  // decrementando um estado atrasaria a cada render perdido.
  const liberaEm = estado.liberaEm ?? 0
  const [agora, setAgora] = useState(() => Date.now())
  const espera = Math.max(0, Math.ceil((liberaEm - agora) / 1000))

  useEffect(() => {
    if (liberaEm <= Date.now()) return
    const id = setInterval(() => setAgora(Date.now()), 1000)
    return () => clearInterval(id)
  }, [liberaEm])

  // Um passo do meio sem o estado da entrada (aberto direto, ou a aba morta e reaberta) não tem o
  // que mostrar: volta ao primeiro.
  const semEstado = (passo === 'codigo' && !estado.email) || (passo === 'senha' && !(estado.email && estado.conferido))
  if (semEstado) return <Navigate to={PASSOS_DA_RECUPERACAO.email} replace />

  /**
   * Pede o código. O 429 do reenvio cedo demais (`MAF-25`) NÃO é falha: um código já foi enviado há
   * pouco e está no e-mail dela. O app segue para o passo do código dizendo isso, com o reenvio
   * contando — antes ela ficava no passo do e-mail sem onde digitar o código que tinha na mão
   * (`BUG-20261022-codigo-recebido-sem-onde-digitar`).
   */
  const pedirCodigo = async (destino: string): Promise<EstadoDoPasso | null> => {
    setErro(null)
    setOcupado(true)
    const { error } = await resetPassword(destino)
    setOcupado(false)
    const jaEnviado = error === AUTH_RATE_LIMITED
    if (error && !jaEnviado) {
      setErro(error)
      return null
    }
    return {
      email: normalizar(destino),
      liberaEm: Date.now() + REENVIO_SEGUNDOS * 1000,
      aviso: jaEnviado ? 'ja-enviado' : 'enviado',
    }
  }

  const enviarCodigo = async () => {
    const proximo = await pedirCodigo(email)
    if (!proximo) return
    // O passo do e-mail guarda o endereço na PRÓPRIA entrada: voltar a ele o mostra preenchido.
    navigate(PASSOS_DA_RECUPERACAO.email, { replace: true, state: { email: proximo.email, profundidade: estado.profundidade } })
    navigate(PASSOS_DA_RECUPERACAO.codigo, { state: { ...proximo, profundidade: mais1(estado.profundidade) } })
  }

  const reenviar = async () => {
    const proximo = await pedirCodigo(estado.email ?? '')
    if (!proximo) return
    navigate(PASSOS_DA_RECUPERACAO.codigo, { replace: true, state: { ...proximo, profundidade: estado.profundidade } })
  }

  const conferirCodigo = async () => {
    setErro(null)
    const limpo = codigo.replace(/\s/g, '')
    if (!/^\d{6}$/.test(limpo)) {
      setErro('O código tem 6 dígitos.')
      return
    }
    setOcupado(true)
    const { error } = await verifyRecoveryCode(estado.email ?? '', limpo)
    setOcupado(false)
    if (error) {
      setErro(error)
      return
    }
    navigate(PASSOS_DA_RECUPERACAO.senha, {
      state: { email: estado.email, conferido: true, profundidade: mais1(estado.profundidade) } satisfies EstadoDoPasso,
    })
  }

  const gravarSenha = async () => {
    setErro(null)
    // A régua do painel, sem a comparação com a atual — quem chegou aqui é quem não a sabe.
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
    // A sessão está aberta: o efeito do `LoginPage` decide (Início, ou a recusa de conta sem papel).
    // Volta EXATAMENTE os passos empilhados, até a entrada do Login: os passos saem da pilha, e o
    // voltar da Início não reabre um código já usado. Sem a conta (passo aberto direto), troca só a
    // entrada desta tela, como antes.
    if (estado.profundidade) navigate(-estado.profundidade)
    else navigate('/login', { replace: true })
  }

  const recado =
    passo === 'codigo' && estado.email
      ? estado.aviso === 'ja-enviado'
        ? `Já enviamos um código há pouco para ${estado.email}.`
        : `Enviamos um código de 6 dígitos para ${estado.email}.`
      : null

  return (
    <section className="mt-8 space-y-5">
      <div>
        <h1 className="text-2xl">Recuperar acesso</h1>
        <p className="mt-2 text-sm text-estrelinha-ink-soft">
          {passo === 'email' && 'Informe o e-mail da sua conta. Enviamos um código de 6 dígitos para você criar uma senha nova.'}
          {passo === 'codigo' && 'Digite o código de 6 dígitos que enviamos. Ele vale por 10 minutos.'}
          {passo === 'senha' && 'Escolha a senha nova.'}
        </p>
      </div>

      {erro && (
        <p role="alert" className={AVISO_DE_ERRO}>
          {erro}
        </p>
      )}
      {recado && (
        <p role="status" className="text-sm text-estrelinha-ink-soft">
          {recado}
        </p>
      )}

      {passo === 'email' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recuperar-email" className={ROTULO}>
              E-mail
            </Label>
            <Input
              id="recuperar-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={CAMPO}
            />
          </div>
          <Button type="button" onClick={enviarCodigo} disabled={ocupado} className={BOTAO_PRIMARIO}>
            {ocupado ? 'Enviando…' : 'Enviar código'}
          </Button>
        </div>
      )}

      {passo === 'codigo' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recuperar-codigo" className={ROTULO}>
              Código
            </Label>
            <Input
              id="recuperar-codigo"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={codigo}
              // Só dígitos, no máximo seis: o código colado do e-mail vem com espaço ou quebra de
              // linha, e um `maxLength` cortaria o texto CRU antes desta limpeza
              // (BUG-20261022-codigo-colado-com-espaco-recusado).
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={CAMPO}
            />
          </div>
          <Button type="button" onClick={conferirCodigo} disabled={ocupado} className={BOTAO_PRIMARIO}>
            {ocupado ? 'Conferindo…' : 'Conferir código'}
          </Button>
          <Button type="button" variant="ghost" onClick={reenviar} disabled={espera > 0 || ocupado} className={BOTAO_SECUNDARIO}>
            {espera > 0 ? `Reenviar em ${formatar(espera)}` : 'Reenviar código'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              navigate(PASSOS_DA_RECUPERACAO.email, {
                state: { email: estado.email, profundidade: mais1(estado.profundidade) } satisfies EstadoDoPasso,
              })
            }
            className={BOTAO_SECUNDARIO}
          >
            Trocar o e-mail
          </Button>
        </div>
      )}

      {passo === 'senha' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recuperar-nova" className={ROTULO}>
              Senha nova
            </Label>
            <Input
              id="recuperar-nova"
              type="password"
              autoComplete="new-password"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              className={CAMPO}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recuperar-confirma" className={ROTULO}>
              Repita a senha nova
            </Label>
            <Input
              id="recuperar-confirma"
              type="password"
              autoComplete="new-password"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              className={CAMPO}
            />
          </div>
          <p className="text-xs text-estrelinha-ink-soft">Mínimo de {MIN_PASSWORD_LENGTH} caracteres.</p>
          <Button type="button" onClick={gravarSenha} disabled={ocupado} className={BOTAO_PRIMARIO}>
            {ocupado ? 'Salvando…' : 'Salvar e entrar'}
          </Button>
        </div>
      )}

      <Button type="button" variant="ghost" onClick={() => navigate('/login')} className={BOTAO_SECUNDARIO}>
        Voltar para entrar
      </Button>
    </section>
  )
}

export default RecoveryFlow
