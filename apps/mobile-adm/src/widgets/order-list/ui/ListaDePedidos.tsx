import type { ReactNode } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { EMPTY_TITLE, emptyHint, listCountLine, type OrderSlice } from '@estrelinha/core/orders'
import { LinhaDoPedido, type JanelaDaLista, type LinhaDaLista } from '@/entities/order'
import { FalhaDoBloco, Traco } from '@/shared/ui/leitura'

import { useSentinela } from '@/shared/lib/useSentinela'

/** Quantas linhas de esqueleto a primeira leitura mostra. */
export const LINHAS_DE_ESQUELETO = 4

export interface ListaDePedidosProps {
  recorte: OrderSlice
  /** O termo JÁ debounced — o mesmo que está na chave da leitura. */
  termo: string
  janela: JanelaDaLista | undefined
  /** A leitura falhou e não há janela nenhuma (ou a leitura foi recusada). */
  falhou: boolean
  tentarDeNovo: () => void
  carregarMais: () => void
  carregandoMais: boolean
  proximaFalhou: boolean
  /**
   * Feature `75` (`MAA-36`): o que vai ao lado da linha, no MESMO `<li>` e FORA do `<Link>` (botão
   * dentro de link é interativo aninhado, Q5). Quem compõe é a página (`BotaoDaAcao`).
   */
  acaoDaLinha?: (linha: LinhaDaLista) => ReactNode
}

/**
 * A lista de pedidos (feature `74`, `MAP-08`, `MAP-09`, `MAP-13`, `MAP-15`, `MAP-34`, `MAP-35`,
 * `MAP-44`, `MAP-45`). Não lê nada: quem lê é a página (`useListaDePedidos`), e a lista desenha.
 *
 * **Quatro estados, exclusivos** (`L-063`): a FALHA sem dado ("Não consegui carregar.", nunca "Nada
 * por aqui." — que é recorte vazio, `MAP-34`); o ESQUELETO da primeira leitura (`aria-busy`,
 * `MAP-44`); o VAZIO ("Nada por aqui." e a dica de `emptyHint`, sem linha de contagem, `MAP-09`); e
 * o DADO, com a linha de contagem de `listCountLine` (`MAP-08`) — inclusive enquanto uma releitura
 * está no ar ou falhou (`MAP-35`).
 *
 * **O fim da lista**: a sentinela carrega a próxima página perto do fim (`MAP-13`) e se rearma (E4);
 * na falha da próxima, as linhas ficam e o fim oferece "Tentar de novo" (`MAP-35`); com `fim`, nada
 * — nem sentinela, nem esqueleto (`MAP-15`).
 */
const ListaDePedidos = ({
  recorte,
  termo,
  janela,
  falhou,
  tentarDeNovo,
  carregarMais,
  carregandoMais,
  proximaFalhou,
  acaoDaLinha,
}: ListaDePedidosProps) => {
  const temMais = !!janela && !janela.fim && janela.linhas.length > 0
  const sentinela = useSentinela<HTMLDivElement>({
    ativo: temMais && !carregandoMais && !proximaFalhou,
    aoCruzar: carregarMais,
    rearme: janela,
  })

  if (falhou && !janela) {
    return (
      <section aria-label="Pedidos" data-estado="falha">
        <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
      </section>
    )
  }

  if (!janela) {
    return (
      <section aria-label="Pedidos" aria-busy="true" data-estado="carregando" className="space-y-3">
        {Array.from({ length: LINHAS_DE_ESQUELETO }, (_, i) => (
          <Traco key={i} className="h-20 w-full" />
        ))}
      </section>
    )
  }

  if (janela.linhas.length === 0) {
    return (
      <section aria-label="Pedidos" data-estado="vazio" className="space-y-1 py-6 text-center">
        <p className="font-display text-lg text-estrelinha-ink">{EMPTY_TITLE}</p>
        <p className="text-sm text-estrelinha-ink-soft">{emptyHint(recorte, termo)}</p>
      </section>
    )
  }

  const contagem = listCountLine(janela.total, recorte, termo.trim() !== '')

  return (
    <section aria-label="Pedidos" data-estado="dado">
      {contagem && (
        <p data-testid="contagem" aria-live="polite" className="text-sm text-estrelinha-ink-soft">
          {contagem}
        </p>
      )}
      <ul className="mt-2 rounded-lg border border-estrelinha-line bg-estrelinha-surface px-4">
        {janela.linhas.map((l, i) => (
          <li key={l.id} className={cn(i > 0 && 'border-t border-estrelinha-line')}>
            <LinhaDoPedido linha={l} lidoEm={janela.lido_em} />
            {acaoDaLinha?.(l)}
          </li>
        ))}
      </ul>
      {proximaFalhou ? (
        <div data-testid="fim-com-falha" className="mt-2">
          <FalhaDoBloco tentarDeNovo={carregarMais} />
        </div>
      ) : temMais ? (
        <div className="mt-3" aria-busy={carregandoMais ? 'true' : undefined}>
          {carregandoMais && <Traco className="h-20 w-full" />}
          <div ref={sentinela} data-testid="sentinela" aria-hidden="true" className="h-px" />
        </div>
      ) : null}
    </section>
  )
}

export default ListaDePedidos
