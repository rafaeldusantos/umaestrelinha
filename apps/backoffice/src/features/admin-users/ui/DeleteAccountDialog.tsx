import { useEffect, useState } from 'react'
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
import { normalizeEmail } from '@estrelinha/core/admin-users'

interface Props {
  open: boolean
  email: string
  name: string
  onClose: () => void
  /** Remove só o acesso, preservando a conta. A saída que este diálogo oferece. */
  onRevoke: () => void
  /** Devolve o motivo da recusa, ou `null` quando apagou. */
  onConfirm: () => Promise<string | null>
}

/**
 * Apagar a conta de vez (`USR-35`).
 *
 * **A confirmação é digitar o e-mail**, e não um "tem certeza?". A diferença importa porque as duas
 * ações da linha ficam lado a lado e têm consequências opostas: `Remover do painel` é reversível com
 * um clique, `Apagar conta` destrói login, ficha de cliente e lista de desejos. Digitar o endereço
 * obriga a ler qual conta está na frente.
 *
 * A comparação passa por `normalizeEmail` — o mesmo dono que a function usa. Exigir a caixa exata
 * transformaria a confirmação num teste de digitação, e quem copia e cola do campo ao lado já leu o
 * endereço, que é o ponto.
 */
const DeleteAccountDialog = ({ open, email, name, onClose, onRevoke, onConfirm }: Props) => {
  const [digitado, setDigitado] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [apagando, setApagando] = useState(false)

  useEffect(() => {
    if (!open) return
    setDigitado('')
    setErro(null)
  }, [open, email])

  const confere = normalizeEmail(digitado) === normalizeEmail(email) && email !== ''

  const apagar = async () => {
    if (!confere) return

    setApagando(true)
    const motivo = await onConfirm()
    setApagando(false)

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
          <DialogTitle>Apagar a conta de {name || email}?</DialogTitle>
          <DialogDescription>
            A conta some do sistema, junto com a ficha de cliente e a lista de desejos dela. Não há
            como desfazer. Se você só quer tirar o acesso ao painel, use “Remover do painel”: a conta
            e todo o histórico ficam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apagar-confirmacao">
              Para confirmar, digite <span className="font-medium text-foreground">{email}</span>
            </Label>
            <Input
              id="apagar-confirmacao"
              value={digitado}
              onChange={e => setDigitado(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          {erro && (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="secondary" onClick={onRevoke}>
            Remover do painel
          </Button>
          <Button type="button" variant="destructive" onClick={apagar} disabled={!confere || apagando}>
            {apagando ? 'Apagando…' : 'Apagar conta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DeleteAccountDialog
