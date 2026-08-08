// PMD-06 — a ponte entre a galeria e a grade.
//
// `product_variants.image_url` é uma **string**, não uma FK para `products.images`. Nada no banco
// impede o admin de apagar a foto e deixar a variação apontando para uma URL que não existe mais.
// A regra da spec ("a variação volta a usar a principal, sem referência quebrada") tem de ser
// aplicada por quem edita — aqui — e tolerada por quem lê, na loja.

import type { ProductImage, ProductVariant } from '@nanapin/supabase/types'

/**
 * Limpa o `image_url` das variações cuja imagem saiu da galeria.
 *
 * Devolve o **mesmo array** quando nada mudou: o formulário compara referências para decidir se
 * está sujo, e um array novo a cada render marcaria alterações que não existem.
 */
export const clearMissingVariantImages = (
  variants: readonly ProductVariant[],
  images: readonly ProductImage[],
): ProductVariant[] => {
  const available = new Set(images.map(img => img.url))
  const orphan = variants.some(v => v.image_url !== null && !available.has(v.image_url))
  if (!orphan) return variants as ProductVariant[]

  return variants.map(v =>
    v.image_url !== null && !available.has(v.image_url) ? { ...v, image_url: null } : v,
  )
}
