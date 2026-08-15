import { useEffect, useState } from 'react'
import { PackageOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  MATERIAL_STATUS_LABELS,
  materialSummary,
  materialTransitionRefusal,
  toMaterialStatus,
} from '@estrelinha/core/material'
import type { DbOrder, DbOrderItem } from '@estrelinha/supabase/types'

interface Props {
  order: DbOrder
  items: DbOrderItem[]
  onSetStatus: (id: string, status: string) => Promise<{ ok: boolean; reason: string | null; emailSent?: boolean }>
  onSetTracking: (id: string, code: string) => Promise<{ ok: boolean; reason: string | null }>
}

/**
 * O card de material no detalhe do pedido (`MAT-05`, `MAT-08`, `MAT-10`, `MAT-11`).
 *
 * É a tela que responde a pergunta que a operação faz o dia inteiro: **o que este pedido está
 * esperando, e já posso produzir?**
 *
 * Duas decisões que não são de layout:
 *
 * 1. **A recusa mostra o MOTIVO.** `materialTransitionRefusal` é a mesma regra que o `where` da RPC
 *    aplica — o TypeScript produz o texto, o banco aplica a guarda. Botão que some ou falha calada
 *    faz a Adri achar que clicou errado.
 * 2. **"a combinar", nunca lista vazia.** Um item que exige material sem dizer qual mostraria uma
 *    linha em branco, que se lê como "nenhum material" — exatamente o oposto.
 */
const OrderMaterialCard = ({ order, items, onSetStatus, onSetTracking }: Props) => {
  const status = toMaterialStatus(order.material_status)
  const [code, setCode] = useState(order.material_tracking_code ?? '')
  const [saving, setSaving] = useState<'status' | 'tracking' | null>(null)

  useEffect(() => {
    setCode(order.material_tracking_code ?? '')
  }, [order.id, order.material_tracking_code])

  // Pedido sem material não ganha card — nem vazio, nem "não se aplica".
  if (status === 'nao_aplicavel') return null

  const cancelado = order.status === 'cancelled'
  const recusaRecebido = materialTransitionRefusal(status, 'material_recebido')
  const recusaProducao = materialTransitionRefusal(status, 'em_producao')

  const transicionar = async (alvo: 'material_recebido' | 'em_producao') => {
    const recusa = alvo === 'material_recebido' ? recusaRecebido : recusaProducao
    if (recusa) {
      // O motivo vem da regra pura, ANTES da ida ao servidor. A RPC recusaria igual — esta é a
      // explicação, aquela é a guarda.
      toast.error(recusa)
      return
    }
    setSaving('status')
    const resultado = await onSetStatus(order.id, alvo)
    setSaving(null)

    if (!resultado.ok) {
      toast.error(
        materialTransitionRefusal(status, alvo) ??
          'Não foi possível mudar o estado do material. Tente de novo.',
      )
      return
    }
    // O toast NÃO alega e-mail enviado quando ele não saiu: falha de envio não reverte o estado
    // (`AD-008`), mas mentir sobre o aviso faria a Adri deixar de avisar por outro canal.
    toast.success(
      alvo === 'material_recebido'
        ? resultado.emailSent
          ? 'Material recebido — cliente avisada por e-mail'
          : 'Material recebido'
        : 'Pedido em produção',
    )
  }

  const salvarCodigo = async () => {
    setSaving('tracking')
    const resultado = await onSetTracking(order.id, code)
    setSaving(null)
    if (!resultado.ok) {
      toast.error('Não foi possível registrar o código de rastreio.')
      return
    }
    toast.success('Código de rastreio do material registrado')
  }

  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <PackageOpen className="w-4 h-4 text-primary shrink-0" />
          Material afetivo
        </p>
        <span className="text-xs font-semibold text-muted-foreground">
          {MATERIAL_STATUS_LABELS[status]}
        </span>
      </div>

      {/* MAT-05: o que cada linha exigiu vem do SNAPSHOT do pedido, não do cadastro de hoje. */}
      <ul className="space-y-1.5 text-sm">
        {items.filter(i => i.requires_material).map(item => (
          <li key={item.id} className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-foreground">{item.product_name}</span>
            <span className="text-muted-foreground">
              aguarda: {materialSummary(true, item.material_kinds ?? [])}
            </span>
          </li>
        ))}
        {items.every(i => !i.requires_material) && (
          <li className="text-muted-foreground">
            Nenhum item deste pedido declarou material no momento da compra.
          </li>
        )}
      </ul>

      {/* MAT-05: a gravação também é snapshot — sobrevive a uma mudança do limite no cadastro. */}
      {items.some(i => i.engraving_text) && (
        <ul className="space-y-1.5 border-t border-border pt-3 text-sm">
          {items.filter(i => i.engraving_text).map(item => (
            <li key={`grav-${item.id}`} className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-muted-foreground">Gravar em {item.product_name}:</span>
              <span className="font-medium text-foreground">“{item.engraving_text}”</span>
            </li>
          ))}
        </ul>
      )}

      {cancelado ? (
        <p className="border-t border-border pt-3 text-sm text-muted-foreground">
          Pedido cancelado — saiu da fila de material. Se o material já tiver chegado, devolva à
          cliente.
        </p>
      ) : (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="material-tracking-admin">
              Código de rastreio do envio da cliente
            </Label>
            <div className="flex gap-2">
              <Input
                id="material-tracking-admin"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="AA123456789BR"
                className="font-mono"
              />
              <Button
                variant="outline"
                disabled={saving !== null || code.trim() === ''}
                onClick={salvarCodigo}
              >
                Salvar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              É o caso de a cliente avisar pelo WhatsApp. Informar é opcional — dá para marcar o
              recebimento direto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              disabled={saving !== null || recusaRecebido !== null}
              title={recusaRecebido ?? undefined}
              onClick={() => transicionar('material_recebido')}
            >
              Marcar material como recebido
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving !== null || recusaProducao !== null}
              title={recusaProducao ?? undefined}
              onClick={() => transicionar('em_producao')}
            >
              Colocar em produção
            </Button>
          </div>

          {recusaRecebido && (
            <p className="text-xs text-muted-foreground">{recusaRecebido}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default OrderMaterialCard
