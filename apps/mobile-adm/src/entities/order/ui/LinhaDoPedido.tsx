import { Link } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { queueAgeLabel, toMaterialStatus } from '@estrelinha/core/material'
import {
  appPrimaryAction,
  formatOrderNumber,
  purchaseOrdinalLabel,
  rowQueueAge,
  rowSummary,
  type AppActionId,
} from '@estrelinha/core/orders'
import { relativeAge } from '@estrelinha/core/stats'

import type { LinhaDaLista } from '../model/linha'
import { nomeDaLinha } from '../model/nomeDaLinha'
import { pedidoHref } from '../model/pedidosHref'
import SituacaoDoPedido from './SituacaoDoPedido'

/**
 * A cor do ponto da frase (`MAP-17`): acento quando o material espera, alerta no enviado sem
 * rastreio, primário nos outros. Decidida pela AÇÃO que `core` já escolheu — nunca pelo status cru
 * (`MAP-49`). Desde a feature `75` (A14b) a ação é a de `appPrimaryAction`, a MESMA do botão do
 * cartão e do rodapé: `marcar-retirado` cai no primário. A frase continua de `rowSummary`.
 */
const PONTO_DA_ACAO: Partial<Record<AppActionId, string>> = {
  'registrar-recebimento': 'bg-estrelinha-accent',
  'salvar-rastreio': 'bg-estrelinha-alert',
}


/**
 * Uma linha da lista de pedidos (feature `74`, `MAP-16`..`MAP-19`, `MAP-42`, `MAP-43`).
 *
 * - **Nada aqui decide**: o número é de `formatOrderNumber`, o selo de `orderSituation` (público
 *   `atelie`), a ordinal de `purchaseOrdinalLabel`, o tempo de `relativeAge` contra o `lido_em` do
 *   SERVIDOR (o relógio do aparelho não muda o texto), o total de `formatPrice` e a frase de
 *   `rowSummary(row).blocker` — vazia em entregue e cancelado pela própria regra.
 * - **A idade só aparece esperando o envelope** (`MAP-17`): é o único estado que acumula espera, e é o
 *   rótulo do bloco da Início (`queueAgeLabel`).
 * - **Nenhum botão nem texto de ação DENTRO da linha** (`MAP-18`): a linha diz o que segura o pedido.
 *   `actionLabel` não é lido. Desde a feature `75` o botão da ação é IRMÃO desta linha no `<li>`
 *   (`BotaoDaAcao`, composto pela página) — nunca dentro do `<Link>` (Q5).
 * - **A linha inteira é o alvo** (`MAP-19`, `MAP-42`), com 44 px no mínimo, e navega com
 *   `state: { doApp: true }` (E7): o "Voltar" do detalhe sabe que veio de dentro do app.
 * - **Número e total quebram** em vez de estourar (`MAP-43`): nenhum `whitespace-nowrap` ou
 *   `truncate` neles; o nome tem piso em `rem` e a coluna da direita cede (a régua de Últimos pedidos).
 */
const LinhaDoPedido = ({ linha, lidoEm }: { linha: LinhaDaLista; lidoEm: string }) => {
  const resumo = rowSummary(linha)
  const acao = appPrimaryAction(linha).action
  const ordinal = purchaseOrdinalLabel(linha.purchase_ordinal)
  const tempo = relativeAge(linha.created_at, lidoEm)
  const esperaEnvelope = toMaterialStatus(linha.material_status) === 'aguardando_material'
  const idade = esperaEnvelope ? rowQueueAge(linha, new Date(lidoEm)) : null

  return (
    // O cartão do protótipo: o número e o selo na primeira linha; o nome com "1ª compra · há N dias" à
    // esquerda e o total à direita; e, se houver bloqueio, a frase abaixo de um fio, com a idade da
    // espera à direita (cor `wait`). O cartão em si é o `<li>` da lista; aqui é o link.
    <Link
      to={pedidoHref(linha.id)}
      state={{ doApp: true }}
      aria-label={nomeDaLinha(linha)}
      data-testid="linha-do-pedido"
      className="flex min-h-11 flex-col gap-2.5 text-estrelinha-ink"
    >
      <div data-parte="topo" className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span data-parte="numero" className="font-display text-[15px] font-bold [overflow-wrap:anywhere]">
          {formatOrderNumber(linha.order_number)}
        </span>
        <span className="ml-auto min-w-0 max-w-full">
          <SituacaoDoPedido pedido={linha} />
        </span>
      </div>
      <div data-parte="meio" className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div data-parte="esquerda" className="min-w-[min(100%,8rem)] flex-1">
          <div data-parte="cliente" className="text-base font-medium [overflow-wrap:anywhere]">
            {linha.customer_name || linha.customer_email}
          </div>
          <div data-parte="compra" className="mt-0.5 text-[13px] text-estrelinha-ink-soft">
            {ordinal ? `${ordinal} · ${tempo}` : tempo}
          </div>
        </div>
        <span
          data-parte="total"
          className="ml-auto min-w-0 max-w-full text-right font-display text-base font-bold text-estrelinha-primary [overflow-wrap:anywhere]"
        >
          {formatPrice(linha.total)}
        </span>
      </div>
      {resumo.blocker && (
        <div data-parte="frase" className="flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-estrelinha-line pt-2.5 text-[13px] text-estrelinha-ink">
          <span
            aria-hidden="true"
            data-ponto={acao}
            className={cn('h-[7px] w-[7px] shrink-0 rounded-full', PONTO_DA_ACAO[acao] ?? 'bg-estrelinha-primary')}
          />
          <span data-parte="motivo" className="min-w-0 flex-1 [overflow-wrap:anywhere]">{resumo.blocker}</span>
          {idade && (
            <span data-parte="idade" className="ml-auto whitespace-nowrap text-xs font-medium text-estrelinha-wait">
              {queueAgeLabel(idade)}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}

export default LinhaDoPedido
