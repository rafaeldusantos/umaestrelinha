// O pagamento registrado à mão, dentro do bloco Pagamento do pedido: o meio pelo nome (nunca o valor
// técnico), a data e a hora de Brasília, quem registrou, a observação e os comprovantes.
//
// O comprovante abre por URL assinada curta (`abrirComprovante`): o bucket é privado, e o link não
// fica na tela nem no histórico do navegador antes do clique.

import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import { manualPaymentAuthor, manualPaymentMethodLabel } from '@estrelinha/core/orders'
import { formatStoreDate, formatStoreHour } from '@estrelinha/core/time'
import type { ManualPaymentRecord } from '@/entities/order/api/useAdminOrder'
import { abrirComprovante } from '../api/abrirComprovante'

const TIPO: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
  'image/heic': 'HEIC',
  'image/heif': 'HEIC',
}

const baixa = (contentType: string): boolean => contentType === 'image/heic' || contentType === 'image/heif'

/** "08/11/2026 às 12h30", no fuso da loja. */
const dataDoPagamento = (iso: string): string => `${formatStoreDate(iso)} às ${formatStoreHour(iso)}`

/** "Desfeito em 08/11/2026 às 14h00 por Adri Muniz — motivo". */
const marcaDoDesfazer = (registro: ManualPaymentRecord): string => {
  const quem = registro.undone_by_name?.trim() ? ` por ${registro.undone_by_name.trim()}` : ''
  const motivo = registro.undone_reason?.trim() ? ` — ${registro.undone_reason.trim()}` : ''
  return `Desfeito em ${dataDoPagamento(registro.undone_at as string)}${quem}${motivo}`
}

/**
 * O registro vivo, ou um desfeito: desfazer não apaga o registro, e a observação e os comprovantes
 * continuam aqui, com quando, quem e por que foi desfeito.
 */
export const ManualPaymentDetails = ({ registro }: { registro: ManualPaymentRecord }) => {
  const comprovantes = registro.order_manual_payment_receipts ?? []
  const desfeito = Boolean(registro.undone_at)

  const abrir = async (path: string, contentType: string) => {
    const desfecho = await abrirComprovante(path, contentType)
    if (desfecho === 'bloqueada') toast.error('O navegador bloqueou a nova aba. Permita pop-ups para este painel e tente de novo.')
    if (desfecho === 'falhou') toast.error('Não consegui abrir o comprovante. Tente de novo.')
  }

  return (
    <div className="mt-3 border-t border-border pt-3" data-testid={desfeito ? 'registro-desfeito' : 'registro-manual'}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {desfeito ? 'Registro desfeito' : 'Registrado à mão'}
      </p>
      {desfeito && <p className="mt-1 break-words text-sm text-muted-foreground">{marcaDoDesfazer(registro)}</p>}
      <dl className="mt-1 space-y-1 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-muted-foreground">Meio</dt>
          <dd className="min-w-0 text-right">{manualPaymentMethodLabel(registro.method, 'admin')}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-muted-foreground">Pago em</dt>
          <dd>{dataDoPagamento(registro.paid_at)}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-muted-foreground">Registrado por</dt>
          {/* O autor pode ser um e-mail, uma palavra só: quebra em qualquer ponto, senão a 390/200 % ele
              passa da borda e o pedido inteiro rola de lado. */}
          <dd className="min-w-0 text-right [overflow-wrap:anywhere]">{manualPaymentAuthor(registro.created_by_name)}</dd>
        </div>
      </dl>
      {registro.note && (
        <p className="mt-2 whitespace-pre-line break-words rounded-lg bg-muted/40 p-2 text-sm">{registro.note}</p>
      )}
      {comprovantes.length > 0 && (
        <ul className="mt-2 space-y-1" aria-label="Comprovantes">
          {comprovantes.map((c, i) => {
            const tipo = TIPO[c.content_type] ?? 'arquivo'
            const verbo = baixa(c.content_type) ? 'Baixar' : 'Abrir'
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className="inline-flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm text-primary hover:bg-muted/40 hover:underline"
                  onClick={() => void abrir(c.path, c.content_type)}
                >
                  <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {`${verbo} comprovante ${i + 1} (${tipo})`}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
