// "Desfazer registro" no bloco Pagamento: o botão e o diálogo do motivo. A página só o monta com um
// registro manual vivo e o pedido em Pago (`canUndoManualPayment`). O nome de quem desfaz vem da conta
// (o painel não lê `auth.users`), como no registro.

import { useState } from 'react'
import { toast } from 'sonner'
import { useAuthContext } from '@estrelinha/auth'
import { Button } from '@estrelinha/ui/button'
import { desfazerRegistro } from '../api/desfazerRegistro'
import { UndoManualPaymentDialog } from './UndoManualPaymentDialog'

const SEM_PAPEL = 'Sua conta não tem acesso de administração. Nada foi alterado.'
const FALHOU = 'O registro não foi desfeito. O motivo continua aqui — tente de novo.'

interface Props {
  orderId: string
  /** A releitura do pedido, depois de desfazer — ou de o banco recusar porque o pedido mudou. */
  onDone: () => void
}

export const UndoManualPaymentAction = ({ orderId, onDone }: Props) => {
  const { user, customer } = useAuthContext()
  const [aberto, setAberto] = useState(false)

  const confirmar = async (motivo: string): Promise<string | null> => {
    const r = await desfazerRegistro({
      orderId,
      reason: motivo,
      authorName: customer?.name?.trim() || user?.email || null,
    })
    if (r.tipo === 'ok') {
      toast.success('Registro desfeito. O pedido voltou a Pendente.')
      onDone()
      return null
    }
    if (r.tipo === 'recusado') {
      // A recusa do banco quer dizer que o pedido mudou desde a leitura (saiu de Pago, outra admin já
      // desfez): a tela relê, e a releitura costuma tirar esta ação — e o diálogo junto. Por isso a
      // frase vai num aviso da página, que sobrevive a isso, e o diálogo fecha.
      toast.error(r.motivo)
      onDone()
      return null
    }
    if (r.tipo === 'sem-papel') return SEM_PAPEL
    return FALHOU
  }

  return (
    <>
      <Button variant="outline" className="mt-2 min-h-11 w-full" onClick={() => setAberto(true)}>
        Desfazer registro
      </Button>
      <UndoManualPaymentDialog open={aberto} onOpenChange={setAberto} onConfirm={confirmar} />
    </>
  )
}
