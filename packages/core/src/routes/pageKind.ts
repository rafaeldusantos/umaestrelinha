// O tipo de página que a presença guarda: joia, lista, sacola, checkout, guia ou outra.
//
// Delega a `classifyPath` (`core/page`) no que ele já sabe — produto e categoria — e resolve o
// endereço legado pelo destino do 301 (`legacyRedirectTo`), para `/produto/:slug` ser joia e
// `/como-enviar-o-material` ser guia sem uma segunda tabela de legados.
//
// Fica FORA do barril de `routes` de propósito: o barril é alcançado pelo grafo que o Deno resolve
// a partir de `core/menu`, `core/seo` e `core/sitemap`, com âncoras de contagem, e este arquivo
// puxaria `core/page/classify.ts` para dentro deles. Quem o usa importa o arquivo.
//
// Imports por ARQUIVO e com extensão explícita.

import { classifyPath } from '../page/classify.ts'
import { MATERIAL_GUIDE_PATH, PROPOSAL_PATH, legacyRedirectTo } from './routes.ts'
import type { PresencePageKind } from '../visits/presence.ts'

const CHECKOUT = '/checkout'
const SACOLA = '/carrinho'
const BUSCA = '/busca'
/** `/pedido/:id/pagamento` — o PIX de um pedido. A confirmação (`/pedido/:id`) é `outra`. */
const PAGAMENTO = /^\/pedido\/[^/]+\/pagamento$/i

/** O tipo de página e, quando é joia, o slug dela. */
export function presencePage(pathname: string): { kind: PresencePageKind; slug: string | null } {
  const caminho = legacyRedirectTo(pathname) ?? pathname
  const minusculo = caminho.toLowerCase()

  if (minusculo === SACOLA) return { kind: 'sacola', slug: null }
  if (minusculo === CHECKOUT || minusculo === PROPOSAL_PATH || PAGAMENTO.test(caminho)) {
    return { kind: 'checkout', slug: null }
  }
  if (minusculo === MATERIAL_GUIDE_PATH) return { kind: 'guia', slug: null }
  if (minusculo === BUSCA) return { kind: 'lista', slug: null }

  const c = classifyPath(caminho)
  if (c.kind === 'product') return { kind: 'joia', slug: c.slug }
  if (c.kind === 'category') return { kind: 'lista', slug: null }
  return { kind: 'outra', slug: null }
}

export function pageKind(pathname: string): PresencePageKind {
  return presencePage(pathname).kind
}
