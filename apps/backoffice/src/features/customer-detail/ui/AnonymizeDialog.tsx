import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  customerName: string
  ordersCount: number
  onConfirm: () => Promise<void>
}

/**
 * `CLI-13` / `D7` — o diálogo **escreve exatamente o que apaga e o que preserva**, antes de perguntar.
 *
 * O dado desta loja é sensível de um jeito que o de uma loja de acessório não é: nome, CPF,
 * telefone, endereço, e o registro de que a pessoa mandou as cinzas de alguém. Um diálogo genérico
 * de "tem certeza?" seria inadequado nos dois sentidos — não diz o suficiente para quem vai apagar,
 * e não protege quem está sendo apagada.
 *
 * **Os pedidos ficam, sem dono.** Pedido é registro fiscal: apagar a linha quebraria o faturamento.
 * O que sai é o vínculo — e as cópias do nome e do e-mail gravadas em `orders`, que é a parte que um
 * "anonimizar" ingênuo esqueceria, atendendo ao pedido de exclusão na aparência e não no fato.
 *
 * Exige digitar `ANONIMIZAR`: é irreversível e não tem desfazer, então o clique não pode ser o mesmo
 * gesto de qualquer outro botão da tela.
 */
const CONFIRMACAO = 'ANONIMIZAR'

const AnonymizeDialog = ({ open, onOpenChange, customerName, ordersCount, onConfirm }: Props) => {
  const [texto, setTexto] = useState('')
  const [saving, setSaving] = useState(false)

  const confirmar = async () => {
    if (texto.trim().toUpperCase() !== CONFIRMACAO) return
    setSaving(true)
    await onConfirm()
    setSaving(false)
    setTexto('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Anonimizar {customerName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <p className="font-medium text-destructive">O que isto APAGA, para sempre:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-destructive">
              <li>nome, e-mail, telefone e CPF — no cadastro e em cada pedido</li>
              <li>todos os endereços salvos</li>
              <li>as notas internas escritas sobre ela</li>
              <li>o vínculo com a conta de acesso</li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="font-medium">O que isto PRESERVA:</p>
            <p className="mt-1 text-muted-foreground">
              {ordersCount === 1 ? 'O pedido dela continua' : `Os ${ordersCount} pedidos dela continuam`}{' '}
              existindo, <strong>sem dono</strong> — com número, valores, itens e datas. Pedido é
              registro fiscal, e apagá-lo quebraria o faturamento da loja.
            </p>
          </div>

          <p className="text-muted-foreground">
            Não há como desfazer. Para confirmar, digite <strong>{CONFIRMACAO}</strong>:
          </p>

          <Input
            value={texto}
            onChange={e => setTexto(e.target.value)}
            placeholder={CONFIRMACAO}
            aria-label={`Digite ${CONFIRMACAO} para confirmar`}
            className="h-11"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={saving || texto.trim().toUpperCase() !== CONFIRMACAO}
          >
            {saving ? 'Anonimizando...' : 'Anonimizar cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AnonymizeDialog
