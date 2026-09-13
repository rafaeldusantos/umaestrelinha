import { useEffect, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@estrelinha/ui/dialog'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { MIN_PASSWORD_LENGTH } from '@estrelinha/core/constants'
import { adminUserRefusal } from '@estrelinha/core/admin-users'

export interface AcessoDraft {
  id?: string
  name: string
  email: string
}

interface Props {
  open: boolean
  /** `undefined` = criar; com `id` = editar. */
  draft?: AcessoDraft
  onClose: () => void
  /** Devolve o motivo da recusa, ou `null` quando gravou. */
  onSave: (name: string, email: string, password: string) => Promise<string | null>
}

/**
 * Criar e editar um acesso ao painel (`USR-04`, `USR-05`, `USR-06`, `USR-21`, `USR-28`, `USR-29`).
 *
 * **A recusa vem de `adminUserRefusal`, a mesma que o hook chama antes de enviar e que a edge
 * function repete do outro lado.** Três lugares, uma régua: o componente barra cedo para a dona não
 * perder o que digitou, o hook barra porque a tela pode mudar, e a function barra porque a escrita
 * pode não vir da tela.
 *
 * **Editar NÃO pede senha.** `adminUserRefusal` aceita `password` ausente exatamente para isso —
 * exigir aqui uma senha que a ação não usa forçaria uma segunda régua só para a edição, e é assim
 * que as duas passam a divergir.
 */
const AdminUserEditorDialog = ({ open, draft, onClose, onSave }: Props) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const editando = Boolean(draft?.id)

  useEffect(() => {
    if (!open) return
    setName(draft?.name ?? '')
    setEmail(draft?.email ?? '')
    setPassword('')
    setMostrarSenha(false)
    setErro(null)
  }, [open, draft])

  const salvar = async () => {
    // `password` só entra na régua quando esta ação define senha. Ausente ⇒ não é validada.
    const recusa = adminUserRefusal(editando ? { name, email } : { name, email, password })
    if (recusa) {
      setErro(recusa)
      return
    }

    setSalvando(true)
    const motivo = await onSave(name, email, password)
    setSalvando(false)

    if (motivo) {
      setErro(motivo)
      return
    }
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={aberto => !aberto && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar acesso' : 'Novo acesso ao painel'}</DialogTitle>
          <DialogDescription>
            {editando
              ? 'O nome e o e-mail valem para o painel e para a ficha de cliente desta pessoa.'
              : 'A pessoa entra no painel com este e-mail e a senha que você definir agora. Ela pode trocá-la depois em Minha conta.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="acesso-nome">Nome</Label>
            <Input
              id="acesso-nome"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ana Helena"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="acesso-email">E-mail</Label>
            <Input
              id="acesso-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ana@umaestrelinha.com.br"
            />
          </div>

          {!editando && (
            <div className="space-y-1.5">
              <Label htmlFor="acesso-senha">Senha inicial</Label>
              <div className="relative">
                <Input
                  id="acesso-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pr-12"
                />
                {/* `absolute` no próprio botão: nada de `TAP_44`, cujo `relative` apagaria a posição
                    na fusão do `twMerge` (ver `alvoDeToqueNaoRoubaPosicao.test.ts` na loja). */}
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Mínimo de {MIN_PASSWORD_LENGTH} caracteres. Combine com ela por onde preferir — o
                painel não envia esta senha por e-mail.
              </p>
            </div>
          )}

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Criar acesso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AdminUserEditorDialog
