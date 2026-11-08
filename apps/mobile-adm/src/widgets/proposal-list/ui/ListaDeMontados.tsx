import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'

import { pedidoMontadoHref } from '@/entities/order'
import {
  LISTA_VAZIA,
  SeloDoMontado,
  cabecalhoDaLista,
  metaDoCartao,
  pecasDoCartao,
  type ListaDeMontados as Lista,
} from '@/features/order-proposal'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'

export interface ListaDeMontadosProps {
  dado: Lista | undefined
  /** A leitura falhou (ou foi recusada) e não há dado. */
  falhou: boolean
  tentarDeNovo: () => void
}

/**
 * A visão "Montados" da aba Pedidos: os pedidos montados, os mais recentes primeiro,
 * um cartão por pedido — número `P-0042` e selo; a cliente com a meta do estado; o total dos itens à
 * direita; as peças "Nome · variação" juntas por " · ".
 *
 * - A meta conta o tempo contra o relógio do SERVIDOR (`agora` da lista), nunca o do aparelho.
 * - Os estados de leitura são os da lista de Pedidos: esqueleto (`aria-busy`), falha com "Tentar de
 *   novo" (nenhum zero) e vazio.
 * - O cartão inteiro é o link (44 px no mínimo), com `state: { doApp: true }` — o voltar do pedido
 *   montado volta para cá.
 */
const ListaDeMontados = ({ dado, falhou, tentarDeNovo }: ListaDeMontadosProps) => {
  if (falhou && !dado) {
    return (
      <section aria-label="Pedidos montados" data-estado="falha">
        <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
      </section>
    )
  }

  if (!dado) {
    return (
      <section aria-label="Pedidos montados" aria-busy="true" data-estado="carregando" className="space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Traco key={i} className="h-20 w-full" />
        ))}
      </section>
    )
  }

  if (dado.proposals.length === 0) {
    return (
      <section aria-label="Pedidos montados" data-estado="vazio" className="py-6 text-center">
        <p className="font-display text-lg text-estrelinha-ink">{LISTA_VAZIA}</p>
      </section>
    )
  }

  return (
    <section aria-label="Pedidos montados" data-estado="dado">
      <p data-testid="contagem-de-montados" className="text-[13px] text-estrelinha-ink-soft">
        {cabecalhoDaLista(dado.proposals.length)}
      </p>
      <ul className="mt-2.5 space-y-3">
        {dado.proposals.map((m) => (
          <li key={m.id} className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4">
            <Link
              to={pedidoMontadoHref(m.id)}
              state={{ doApp: true }}
              data-testid="cartao-do-montado"
              className="flex min-h-11 flex-col gap-2 text-estrelinha-ink"
            >
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                <span className="font-display text-[15px] font-bold [overflow-wrap:anywhere]">{m.number}</span>
                <span className="ml-auto min-w-0 max-w-full">
                  <SeloDoMontado estado={m.state} />
                </span>
              </div>
              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
                <div className="min-w-[min(100%,8rem)] flex-1">
                  <div className="text-base font-medium [overflow-wrap:anywhere]">{m.customer_name || m.customer_email}</div>
                  <div data-parte="meta" className="text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                    {metaDoCartao(m, dado.agora)}
                  </div>
                </div>
                <span className="ml-auto min-w-0 max-w-full font-medium tabular-nums [overflow-wrap:anywhere]">
                  {formatPrice(m.items_total)}
                </span>
              </div>
              {m.lines_count > 0 && (
                <p data-parte="pecas" className="border-t border-estrelinha-line pt-2 text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                  {pecasDoCartao(m.lines, m.lines_count)}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default ListaDeMontados
