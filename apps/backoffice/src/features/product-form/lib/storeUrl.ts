// RFN-07 AC 8 — o link `Abrir ↗` da prévia.
//
// Fora do componente porque exportar função + componente do mesmo arquivo quebra o fast refresh.

import { productPath } from '@estrelinha/core/routes'

/** A loja em que o link cai. Sem env definida o link não aparece — melhor que apontar para nada. */
const STORE_URL: string | undefined = import.meta.env.VITE_STORE_URL

/**
 * O caminho vem de `productPath` (`URL-01`), e não de um literal: este link é aberto pela admin para
 * conferir o produto publicado. Um caminho legado aqui abriria o **redirect** — 301 no edge, um
 * salto a mais em dev — e o que ela veria na barra não seria o endereço que a loja publica.
 */
export const storeUrlFor = (slug: string, base = STORE_URL): string | null =>
  base && slug ? `${base.replace(/\/$/, '')}${productPath(slug)}` : null
