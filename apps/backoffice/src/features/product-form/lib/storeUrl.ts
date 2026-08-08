// RFN-07 AC 8 — o link `Abrir ↗` da prévia.
//
// Fora do componente porque exportar função + componente do mesmo arquivo quebra o fast refresh.

/** A loja em que o link cai. Sem env definida o link não aparece — melhor que apontar para nada. */
const STORE_URL: string | undefined = import.meta.env.VITE_STORE_URL

export const storeUrlFor = (slug: string, base = STORE_URL): string | null =>
  base && slug ? `${base.replace(/\/$/, '')}/produto/${slug}` : null
