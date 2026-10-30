import { useEffect, useState } from 'react'
import { PackageOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import {
  MATERIAL_CANCELLED_NOTE,
  MATERIAL_STATUS_LABELS,
  materialSummary,
  materialTransitionRefusal,
  toMaterialStatus,
} from '@estrelinha/core/material'
import type { DbOrder, DbOrderItem } from '@estrelinha/supabase/types'
import type { Gesto } from '@/features/order-notice'
import { ActionButton } from '@/shared/ui'

interface Props {
  order: DbOrder
  items: DbOrderItem[]
  /**
   * Feature `88`: `avisarCliente` é a caixa do diálogo de aviso. Ausente quando o gesto gravou sem
   * diálogo (nenhum e-mail à cliente previsto) — e então quem chama recebe só dois argumentos.
   */
  onSetStatus: (
    id: string,
    status: string,
    avisarCliente?: boolean,
  ) => Promise<{ ok: boolean; reason: string | null; emailSent?: boolean }>
  onSetTracking: (
    id: string,
    code: string,
    avisarCliente?: boolean,
  ) => Promise<{ ok: boolean; reason: string | null; emailSent?: boolean }>
  /**
   * O caminho do gesto (`useGestoComAviso`, da página): previsão, portão de aviso, uma gravação por vez
   * e a frase do desfecho. O card só descreve o gesto.
   */
  acionar: (g: Gesto) => Promise<boolean>
  /** A gravação em curso no pedido (`CRG-02`): com ela, todo botão do card fica desabilitado. */
  pendente?: string | null
}

/** As chaves das três gravações do card em `usePendingAction` — acendem o gerúndio do botão certo. */
const CHAVE_ENVELOPE = 'material:envelope'
const chaveDoStatus = (alvo: string) => `material:${alvo}`

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
const OrderMaterialCard = ({ order, items, onSetStatus, onSetTracking, acionar, pendente = null }: Props) => {
  const status = toMaterialStatus(order.material_status)
  const [code, setCode] = useState(order.material_tracking_code ?? '')
  const ocupado = pendente !== null

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
    const recebido = alvo === 'material_recebido'
    await acionar({
      chave: chaveDoStatus(alvo),
      trigger: 'material_status_changed',
      depois: { ...order, material_status: alvo },
      orderId: order.id,
      titulo: recebido ? 'Registrar o material como recebido' : 'Colocar em produção',
      mudanca: recebido
        ? `O material de ${order.customer_name} passa a constar como recebido no ateliê.`
        : 'O pedido passa a constar como em produção.',
      confirmar: recebido ? 'Registrar recebimento' : 'Colocar em produção',
      gerundio: recebido ? 'Registrando recebimento…' : 'Colocando em produção…',
      // O resultado NÃO alega e-mail enviado quando ele não saiu: falha de envio não reverte o estado
      // (`AD-008`), mas mentir sobre o aviso faria a Adri deixar de avisar por outro canal.
      sucesso: recebido ? 'Material recebido' : 'Pedido em produção',
      gravar: async (avisarCliente) => {
        const r = avisarCliente === undefined
          ? await onSetStatus(order.id, alvo)
          : await onSetStatus(order.id, alvo, avisarCliente)
        if (!r.ok) {
          return {
            erro:
              materialTransitionRefusal(status, alvo) ??
              'Não foi possível mudar o estado do material. Tente de novo.',
          }
        }
        return { erro: null, emailSent: r.emailSent }
      },
    })
  }

  const salvarCodigo = async () => {
    const codigo = code.trim()
    await acionar({
      chave: CHAVE_ENVELOPE,
      trigger: 'material_tracking_set',
      // A RPC `set_material_tracking` leva o pedido que espera o envelope a `material_enviado`.
      depois: {
        ...order,
        material_tracking_code: codigo,
        material_status: status === 'aguardando_material' ? 'material_enviado' : status,
      },
      orderId: order.id,
      titulo: 'Registrar o código do envelope',
      mudanca: `O código ${codigo}, da remessa que a cliente postou, fica no pedido.`,
      confirmar: 'Salvar código',
      gerundio: 'Salvando código…',
      sucesso: 'Código de rastreio do material registrado',
      // O campo NÃO é limpo em falha (`CRG-05`): o texto digitado continua aqui.
      gravar: async (avisarCliente) => {
        const r = avisarCliente === undefined
          ? await onSetTracking(order.id, code)
          : await onSetTracking(order.id, code, avisarCliente)
        if (!r.ok) return { erro: 'O código do envelope não foi salvo. Tente de novo.' }
        return { erro: null, emailSent: r.emailSent }
      },
    })
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
          {MATERIAL_CANCELLED_NOTE}
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
              <ActionButton
                variant="outline"
                disabled={ocupado || code.trim() === ''}
                pending={pendente === CHAVE_ENVELOPE}
                pendingLabel="Salvando código…"
                onClick={salvarCodigo}
              >
                Salvar
              </ActionButton>
            </div>
            <p className="text-xs text-muted-foreground">
              É o caso de a cliente avisar pelo WhatsApp. Informar é opcional — dá para marcar o
              recebimento direto.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ActionButton
              size="sm"
              disabled={ocupado || recusaRecebido !== null}
              pending={pendente === chaveDoStatus('material_recebido')}
              pendingLabel="Registrando recebimento…"
              title={recusaRecebido ?? undefined}
              onClick={() => transicionar('material_recebido')}
            >
              Marcar material como recebido
            </ActionButton>
            <ActionButton
              size="sm"
              variant="outline"
              disabled={ocupado || recusaProducao !== null}
              pending={pendente === chaveDoStatus('em_producao')}
              pendingLabel="Colocando em produção…"
              title={recusaProducao ?? undefined}
              onClick={() => transicionar('em_producao')}
            >
              Colocar em produção
            </ActionButton>
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
