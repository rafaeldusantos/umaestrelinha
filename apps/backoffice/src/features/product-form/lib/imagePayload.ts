// O que o formulário grava na coluna `products.images` (VAR-11 AC 4).
//
// A coluna virou `jsonb [{url, alt, source}]` na migration 20260801120200. O formulário, porém,
// controla uma lista de **URLs** — é o contrato do drag-and-drop, do `MockupStudioDialog` e do
// botão de remover, e a UI de `alt` só chega na feature 12. Esta função é a costura entre os dois:
// a ordem vem da lista de URLs, `alt` e `source` vêm do que já estava cadastrado.
//
// Sem ela, salvar qualquer campo do produto reescreveria `images` como `string[]` — desfazendo a
// migration no primeiro save — ou zeraria o `alt` de todas as fotos num save que nem tocou em
// imagem.

import type { ImageSource, ProductImage } from '@estrelinha/supabase/types'

const FALLBACK_SOURCE: ImageSource = 'upload'

/**
 * @param urls  As URLs na ordem que o admin arrastou. A primeira é a principal.
 * @param meta  `alt`/`source` conhecidos, indexados por URL.
 */
export const toImagePayload = (
  urls: readonly string[],
  meta: ReadonlyMap<string, ProductImage>,
): ProductImage[] =>
  urls.map(url => {
    const known = meta.get(url)
    // O `url` do payload é sempre o da lista, nunca o do mapa: se os dois divergissem, quem manda
    // é a ordem que o admin vê na tela.
    return known ? { ...known, url } : { url, alt: null, source: FALLBACK_SOURCE }
  })
