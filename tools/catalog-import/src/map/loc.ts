/**
 * Campo localizado da Nuvemshop.
 *
 * Medido no catálogo real (2026-08-09): as 39 categorias e os 690 produtos trazem **apenas** `pt`.
 * O tipo aceita o mapa aberto e a string solta porque a API documenta os dois formatos, e porque
 * uma loja que ligue um segundo idioma passaria a devolver mais chaves sem aviso.
 *
 * O **array** não é hipótese: `images[].alt` volta ora como `{ pt: '...' }`, ora como `[]` — as duas
 * formas foram medidas no mesmo catálogo. `Object.values` cobre as duas sem ramo especial.
 */
export type Localized = Record<string, string> | string[] | string | null | undefined

/**
 * `pt` quando tem conteúdo; senão o primeiro idioma com conteúdo; senão `''`.
 *
 * O fallback é por **conteúdo** e não por presença de chave: `{ pt: '' }` é o que a origem devolve
 * em `description` e `seo_title` de praticamente todo o catálogo, e devolver `''` por "pt existe"
 * seria certo para descrição e errado para nome. Quem decide o que fazer com o vazio é o chamador.
 */
export const loc = (value: Localized): string => {
  if (!value) return ''
  if (typeof value === 'string') return value.trim() === '' ? '' : value

  if (!Array.isArray(value)) {
    const pt = value.pt
    if (typeof pt === 'string' && pt.trim() !== '') return pt
  }

  // `Object.values` cobre mapa e array com o mesmo passo — num array, devolve os elementos.
  const first = Object.values(value).find(v => typeof v === 'string' && v.trim() !== '')
  return first ?? ''
}
