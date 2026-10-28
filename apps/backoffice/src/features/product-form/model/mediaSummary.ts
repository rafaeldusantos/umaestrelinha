// RES-03, RES-04, RES-09, ZOM-04 — o recorte das imagens do card Resumo, como regra pura.
//
// O Resumo mostra a primeira imagem como principal e, abaixo dela, no máximo sete miniaturas
// (imagens 2 a 8). Da 9ª em diante quem aparece é o ladrilho "+N", com N = total − 8. As duas
// constantes moram aqui, e não no componente, porque o teste precisa cravá-las contra o número da
// spec — no componente, o número viraria um literal solto na classe ou no `slice`.

import type { ProductImage } from '@estrelinha/supabase/types'

/** Quantas miniaturas cabem abaixo da principal (RES-04): as imagens 2 a 8. */
export const SUMMARY_THUMB_LIMIT = 7

/** O arrasto horizontal mínimo, em px, para o visualizador trocar de imagem (ZOM-04). */
export const SWIPE_PX = 48

export interface SummaryThumbs {
  /** `images[0]`, ou `null` quando o produto não tem imagem (RES-05). */
  main: ProductImage | null
  /** As miniaturas, na ordem: no máximo `SUMMARY_THUMB_LIMIT`. */
  thumbs: ProductImage[]
  /** Quantas ficam atrás do ladrilho "+N" (RES-09). `0` ⇒ o ladrilho não existe. */
  rest: number
}

export const summaryThumbs = (images: readonly ProductImage[]): SummaryThumbs => ({
  main: images[0] ?? null,
  thumbs: images.slice(1, 1 + SUMMARY_THUMB_LIMIT),
  rest: Math.max(0, images.length - (1 + SUMMARY_THUMB_LIMIT)),
})
