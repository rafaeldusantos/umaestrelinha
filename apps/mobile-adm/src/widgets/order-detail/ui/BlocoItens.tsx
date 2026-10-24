import { formatPrice } from '@estrelinha/core/formatters'
import type { Bloco, ItemDoPedido } from '@/entities/order'
import { TITULO_DOS_ITENS_SEM_DADO, tituloDosItens } from '../model/titulos'
import { BlocoDoDetalhe, BlocoEmFalha } from './BlocoDoDetalhe'

/**
 * Os itens do pedido (feature `74`, `MAP-24`, `MAP-30`): cada um com o nome CONGELADO na compra
 * (`product_name` — um item importado da Nuvemshop, sem produto no catálogo, sai pelo nome do mesmo
 * jeito), a variação, "Gravação: …" quando há texto, e "quantidade × preço unitário".
 *
 * Com a leitura dos itens em falha, só este bloco diz "Não consegui carregar." — o resto do detalhe
 * segue (`MAP-30`), e "Tentar de novo" relê o detalhe inteiro (TE4).
 */
const BlocoItens = ({ itens, tentarDeNovo }: { itens: Bloco<ItemDoPedido[]>; tentarDeNovo: () => void }) => {
  if (itens.estado === 'falhou') return <BlocoEmFalha id="itens" titulo={TITULO_DOS_ITENS_SEM_DADO} tentarDeNovo={tentarDeNovo} />
  const lista = (itens as { estado: 'ok'; dado: ItemDoPedido[] }).dado ?? []
  return (
    <BlocoDoDetalhe id="itens" titulo={tituloDosItens(lista)}>
      <ul className="divide-y divide-estrelinha-line">
        {lista.map((i) => {
          const gravacao = i.engraving_text?.trim()
          return (
            <li key={i.id} data-testid="item-do-pedido" className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2 text-sm">
              <div className="min-w-[min(100%,8rem)] flex-1">
                <p className="font-medium [overflow-wrap:anywhere]">{i.product_name}</p>
                {i.variant_label && <p className="text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">{i.variant_label}</p>}
                {gravacao && <p className="text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">{`Gravação: ${gravacao}`}</p>}
              </div>
              <span data-parte="quantidade" className="ml-auto min-w-0 max-w-full text-right [overflow-wrap:anywhere]">
                {`${i.quantity} × ${formatPrice(i.unit_price)}`}
              </span>
            </li>
          )
        })}
      </ul>
    </BlocoDoDetalhe>
  )
}

export default BlocoItens
