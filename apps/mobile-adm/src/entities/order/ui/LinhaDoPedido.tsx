import { Link } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { queueAgeLabel, toMaterialStatus } from '@estrelinha/core/material'
import { formatOrderNumber, purchaseOrdinalLabel, rowQueueAge, rowSummary, type PrimaryActionId } from '@estrelinha/core/orders'
import { relativeAge } from '@estrelinha/core/stats'

import type { LinhaDaLista } from '../model/linha'
import { pedidoHref } from '../model/pedidosHref'
import SituacaoDoPedido from './SituacaoDoPedido'

/**
 * A cor do ponto da frase (`MAP-17`): acento quando o material espera, alerta no enviado sem
 * rastreio, primário nos outros. Decidida pela AÇÃO que `rowSummary` (`core`) já escolheu — nunca
 * pelo status cru (`MAP-49`): o app não reescreve "o que segura este pedido".
 */
const PONTO_DA_ACAO: Partial<Record<PrimaryActionId, string>> = {
  'registrar-recebimento': 'bg-estrelinha-accent',
  'salvar-rastreio': 'bg-estrelinha-alert',
}

/** O nome acessível da linha (`MAP-19`): "Pedido #0244, Marina Duarte". */
const nomeDaLinha = (l: Pick<LinhaDaLista, 'order_number' | 'customer_name' | 'customer_email'>): string =>
  `Pedido ${formatOrderNumber(l.order_number)}, ${l.customer_name || l.customer_email}`

/**
 * Uma linha da lista de pedidos (feature `74`, `MAP-16`..`MAP-19`, `MAP-42`, `MAP-43`).
 *
 * - **Nada aqui decide**: o número é de `formatOrderNumber`, o selo de `orderSituation` (público
 *   `atelie`), a ordinal de `purchaseOrdinalLabel`, o tempo de `relativeAge` contra o `lido_em` do
 *   SERVIDOR (o relógio do aparelho não muda o texto), o total de `formatPrice` e a frase de
 *   `rowSummary(row).blocker` — vazia em entregue e cancelado pela própria regra.
 * - **A idade só aparece esperando o envelope** (`MAP-17`): é o único estado que acumula espera, e é o
 *   rótulo do bloco da Início (`queueAgeLabel`).
 * - **Nenhum botão nem texto de ação** (`MAP-18`): a linha diz o que segura o pedido; o que fazer é do
 *   detalhe. `actionLabel` não é lido.
 * - **A linha inteira é o alvo** (`MAP-19`, `MAP-42`), com 44 px no mínimo, e navega com
 *   `state: { doApp: true }` (E7): o "Voltar" do detalhe sabe que veio de dentro do app.
 * - **Número e total quebram** em vez de estourar (`MAP-43`): nenhum `whitespace-nowrap` ou
 *   `truncate` neles; o nome tem piso em `rem` e a coluna da direita cede (a régua de Últimos pedidos).
 */
const LinhaDoPedido = ({ linha, lidoEm }: { linha: LinhaDaLista; lidoEm: string }) => {
  const resumo = rowSummary(linha)
  const ordinal = purchaseOrdinalLabel(linha.purchase_ordinal)
  const tempo = relativeAge(linha.created_at, lidoEm)
  const esperaEnvelope = toMaterialStatus(linha.material_status) === 'aguardando_material'
  const idade = esperaEnvelope ? rowQueueAge(linha, new Date(lidoEm)) : null

  return (
    <Link
      to={pedidoHref(linha.id)}
      state={{ doApp: true }}
      aria-label={nomeDaLinha(linha)}
      data-testid="linha-do-pedido"
      className="flex min-h-11 flex-wrap items-start gap-x-3 gap-y-1 py-3 text-estrelinha-ink"
    >
      <div data-parte="esquerda" className="min-w-[min(100%,8rem)] flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span data-parte="numero" className="font-display text-sm font-bold [overflow-wrap:anywhere]">
            {formatOrderNumber(linha.order_number)}
          </span>
          <SituacaoDoPedido pedido={linha} />
        </div>
        <div data-parte="cliente" className="mt-1 text-sm font-medium [overflow-wrap:anywhere]">
          {linha.customer_name || linha.customer_email}
        </div>
        <div data-parte="compra" className="mt-0.5 text-xs text-estrelinha-ink-soft">
          {ordinal ? `${ordinal} · ${tempo}` : tempo}
        </div>
        {resumo.blocker && (
          <div data-parte="frase" className="mt-1 flex items-center gap-1.5 text-xs text-estrelinha-ink">
            <span
              aria-hidden="true"
              data-ponto={resumo.action}
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full', PONTO_DA_ACAO[resumo.action] ?? 'bg-estrelinha-primary')}
            />
            <span className="min-w-0">
              {resumo.blocker}
              {idade && <span data-parte="idade">{` · ${queueAgeLabel(idade)}`}</span>}
            </span>
          </div>
        )}
      </div>
      <span
        data-parte="total"
        className="ml-auto min-w-0 max-w-full text-right font-display text-sm font-bold text-estrelinha-primary [overflow-wrap:anywhere]"
      >
        {formatPrice(linha.total)}
      </span>
    </Link>
  )
}

export default LinhaDoPedido
