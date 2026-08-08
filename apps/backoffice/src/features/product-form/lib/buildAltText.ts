// PMD-01 AC 2 — o alt-text que a ação `Gerar` produz.
//
// `AD-011` + A20: os artboards dizem "Gerar" e "Alt gerado automaticamente", **nunca** "com IA".
// Um alt derivado de nome + rótulo resolve acessibilidade e SEO, é determinístico e não arrasta
// provedor, chave, custo por chamada, latência no save nem fallback quando a API cai.
//
// Não tem dependência nenhuma de propósito: é o que a torna testável sem rede e o que a mantém
// fora do escopo de IA. O teste assere zero chamadas de `fetch`.

/** O separador entre produto e rótulo, como no exemplo do design. */
const SEPARATOR = ' · '

/**
 * @param productName Nome do produto. Vazio (rascunho sem nome) ⇒ `null`.
 * @param label Rótulo da variação ou do mockup. Opcional.
 * @returns `'Botton Sailor Moon — Lua Prateada · Na mão'`, ou `null` quando não há nome.
 *
 * Devolve `null` — e não string vazia — porque é isso que desabilita o botão `Gerar`:
 * alt vazio é pior que alt ausente, some do HTML mas conta como "preenchido" na UI.
 */
export const buildAltText = (productName: string, label?: string | null): string | null => {
  const name = productName.trim()
  if (name === '') return null

  const suffix = label?.trim()
  return suffix ? `${name}${SEPARATOR}${suffix}` : name
}
