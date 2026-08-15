// RFN-07 AC 8 — o link `Abrir ↗` da prévia.
//
// Fora do componente porque exportar função + componente do mesmo arquivo quebra o fast refresh.

import { productPath } from '@estrelinha/core/routes'
// A env tem **um leitor** (feature 25, `shared/lib/storeOrigin`): a prévia real precisa da mesma
// `VITE_STORE_URL`, e dois `import.meta.env` do mesmo valor discordariam no dia em que um deles
// ganhasse normalização e o outro não.
import { STORE_URL } from '@/shared/lib/storeOrigin'

/**
 * O caminho vem de `productPath` (`URL-01`), e não de um literal: este link é aberto pela admin para
 * conferir o produto publicado. Um caminho legado aqui abriria o **redirect** — 301 no edge, um
 * salto a mais em dev — e o que ela veria na barra não seria o endereço que a loja publica.
 */
export const storeUrlFor = (slug: string, base = STORE_URL): string | null =>
  base && slug ? `${base.replace(/\/$/, '')}${productPath(slug)}` : null
