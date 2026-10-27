import type { ReactNode } from 'react'
import { formatPrice } from '@estrelinha/core/formatters'
import type { Bloco, ItemComFoto } from '@/entities/order'
import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import { TITULO_DOS_ITENS_SEM_DADO, tituloDosItens } from '../model/titulos'
import { FalhaDoBloco } from '@/shared/ui/leitura'
import { BlocoDoDetalhe } from './BlocoDoDetalhe'

/**
 * Os itens do pedido (feature `74`, `MAP-24`, `MAP-30`): cada um com o nome CONGELADO na compra
 * (`product_name` — um item importado da Nuvemshop, sem produto no catálogo, sai pelo nome do mesmo
 * jeito), a variação, "Gravação: …" quando há texto, e "quantidade × preço unitário".
 *
 * Com a leitura dos itens em falha, só este bloco diz "Não consegui carregar." — o resto do detalhe
 * segue (`MAP-30`), e "Tentar de novo" relê o detalhe inteiro (TE4).
 */
const BlocoItens = ({
  itens,
  tentarDeNovo,
  valores,
}: {
  itens: Bloco<ItemComFoto[]>
  tentarDeNovo: () => void
  /** Os valores do pedido, que fecham o cartão (protótipo). Vêm do PEDIDO, então ficam mesmo com os itens em falha. */
  valores?: ReactNode
}) => {
  if (itens.estado === 'falhou') {
    return (
      <BlocoDoDetalhe id="itens" titulo={TITULO_DOS_ITENS_SEM_DADO}>
        <FalhaDoBloco tentarDeNovo={tentarDeNovo} />
        {valores}
      </BlocoDoDetalhe>
    )
  }
  const lista = (itens as { estado: 'ok'; dado: ItemComFoto[] }).dado ?? []
  return (
    <BlocoDoDetalhe id="itens" titulo={tituloDosItens(lista)}>
      <ul className="space-y-3 pt-1">
        {lista.map((i) => {
          const gravacao = i.engraving_text?.trim()
          return (
            // O item do protótipo: a foto em retrato (56 × 70) e, ao lado, nome, variação, gravação e
            // "quantidade × preço" — tudo numa coluna, que embrulha sem empurrar a foto.
            <li key={i.id} data-testid="item-do-pedido" className="flex items-start gap-3 text-sm">
              <FotoDaPeca foto={i.foto} tamanho={56} altura={70} />
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold leading-snug [overflow-wrap:anywhere]">{i.product_name}</p>
                {i.variant_label && <p className="mt-0.5 text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">{i.variant_label}</p>}
                {gravacao && (
                  <p className="mt-0.5 text-[13px] [overflow-wrap:anywhere]">
                    Gravação: <em className="font-display">{gravacao}</em>
                  </p>
                )}
                <p data-parte="quantidade" className="mt-1 text-[13px] text-estrelinha-ink-soft [overflow-wrap:anywhere]">
                  {`${i.quantity} × ${formatPrice(i.unit_price)}`}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      {valores}
    </BlocoDoDetalhe>
  )
}

export default BlocoItens
