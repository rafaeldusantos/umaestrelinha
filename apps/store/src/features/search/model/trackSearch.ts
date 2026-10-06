import { searchEvent } from '@estrelinha/core/analytics'
import { track } from '@/shared/lib/analytics'

/**
 * Feature 61 · EVT-09 — a busca ENVIADA, nunca a digitada.
 *
 * Chamada só nos três gestos de envio — o formulário do cabeçalho (`SearchDropdown`), o da busca em
 * tela cheia (`SearchOverlay`) e o Enter do campo da `SearchPage`. A `SearchPage` reescreve `?q=` a
 * cada tecla, então nada que olhe a URL serve de sinal de envio. Termo vazio não é busca:
 * `searchEvent` devolve `null` e o `track` o ignora.
 */
export function trackSearch(term: string): void {
  track(searchEvent({ term }))
}
