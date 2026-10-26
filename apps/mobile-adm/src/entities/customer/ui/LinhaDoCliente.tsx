import { Link } from 'react-router-dom'
import { formatPriceWhole } from '@estrelinha/core/formatters'

import { clienteHref } from '../model/clientesHref'
import { subtituloDaLinha } from '../model/frases'
import { nomeDoCliente } from '../model/identidade'
import type { LinhaDeCliente } from '../model/linha'
import Inicial from './Inicial'
import SeloEmAberto, { ROTULO_EM_ABERTO } from './SeloEmAberto'

/**
 * Uma linha da lista de clientes (feature `76`, `MAC-03`, `MAC-09`, `MAC-31`, `MAC-32`).
 *
 * - **Nada aqui decide**: o nome e a inicial são de `identidade`, o subtítulo de `subtituloDaLinha`
 *   (o tempo é contra o `lido_em` do SERVIDOR, nunca o relógio do aparelho) e o total de
 *   `formatPriceWhole`. O selo "Em aberto" lê `orders_open`, a coluna do recorte.
 * - **A linha inteira é o alvo** (44 px no mínimo) e navega com `state: { doApp: true }`: o "Voltar"
 *   da ficha sabe que veio de dentro do app e devolve à lista no mesmo recorte, busca e posição.
 * - **Tudo quebra, nada é cortado** (`MAC-32`): nome e e-mail longos com `[overflow-wrap:anywhere]`,
 *   o selo e o total sem `truncate`, sem `whitespace-nowrap` e sem `shrink-0` — com a fonte do
 *   sistema a 200 % descem para a linha de baixo (`flex-wrap`).
 * - **A inicial não toma o espaço do nome** (`BUG-20261024-linha-do-cliente-quebra-palavra-e-pilula-a-200`):
 *   a 200 % ela é grande e o texto ao lado ficava com ~155 px, partindo "Albuquerque" e a pílula. O
 *   bloco de texto tem piso de 12rem (limitado à linha): sem espaço, desce para baixo da inicial e ganha
 *   a largura inteira.
 */
/**
 * O nome acessível da linha (`BUG-20261024-linha-do-cliente-so-diz-o-nome`): o `aria-label` SUBSTITUI o
 * conteúdo, e só o nome escondia do leitor de tela o subtítulo, o total e o "Em aberto" — o que a linha
 * mostra para quem enxerga. Em vírgulas, sem o ponto médio que o leitor soletra.
 */
const nomeAcessivelDaLinha = (cliente: LinhaDeCliente, lidoEm: string): string =>
  [
    nomeDoCliente(cliente),
    subtituloDaLinha(cliente, lidoEm).replace(' · ', ', '),
    formatPriceWhole(cliente.total_spent),
    cliente.orders_open >= 1 ? ROTULO_EM_ABERTO.toLowerCase() : null,
  ]
    .filter(Boolean)
    .join(', ')

const LinhaDoCliente = ({ cliente, lidoEm }: { cliente: LinhaDeCliente; lidoEm: string }) => (
  <Link
    to={clienteHref(cliente.id)}
    state={{ doApp: true }}
    aria-label={nomeAcessivelDaLinha(cliente, lidoEm)}
    data-testid="linha-do-cliente"
    className="flex min-h-11 flex-wrap items-start gap-x-3 gap-y-2 py-3 text-estrelinha-ink"
  >
    <Inicial cliente={cliente} />
    <div className="flex min-w-[min(100%,12rem)] flex-1 flex-wrap items-start gap-x-3 gap-y-1">
      <div data-parte="esquerda" className="min-w-[min(100%,8rem)] flex-1">
        <div data-parte="nome" className="text-sm font-medium [overflow-wrap:anywhere]">
          {nomeDoCliente(cliente)}
        </div>
        <div data-parte="subtitulo" className="mt-0.5 text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">
          {subtituloDaLinha(cliente, lidoEm)}
        </div>
        {cliente.orders_open >= 1 && (
          <div data-parte="selo" className="mt-1.5">
            <SeloEmAberto />
          </div>
        )}
      </div>
      <span
        data-parte="total"
        className="ml-auto min-w-0 max-w-full text-right font-display text-sm font-bold text-estrelinha-primary [overflow-wrap:anywhere]"
      >
        {formatPriceWhole(cliente.total_spent)}
      </span>
    </div>
  </Link>
)

export default LinhaDoCliente
