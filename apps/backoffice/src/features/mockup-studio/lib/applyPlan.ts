// PMD-05 AC 6-8 — o que acontece com `images` quando o admin confirma.
//
// Esta é a única parte do estúdio com regra de verdade, e por isso é pura: fora do componente ela é
// testável sem canvas. A invariante que ela protege é a AC 8 — **nada** é gravado antes da ação
// primária. O estúdio compõe em memória; fechar sem aplicar é uma operação sem efeito.

import type { ProductImage } from '@nanapin/supabase/types'
import { buildAltText } from '@/features/product-form/lib/buildAltText'

/** Um render pronto: a URL já no Storage e o rótulo do mockup que o produziu. */
export interface RenderResult {
  url: string
  /** Nome do template — vira o sufixo do alt-text (`… · Na mão`). */
  label: string
}

export interface ApplyOpts {
  /** `append` mantém as fotos existentes; `replace` troca a galeria inteira. */
  mode: 'append' | 'replace'
  /** Põe o primeiro render na posição 0 — a principal da vitrine. */
  firstAsPrimary: boolean
  /** Preenche o `alt` de cada render pelo template puro de PMD-01 (A20). */
  generateAlt: boolean
  /** Nome do produto. Vazio ⇒ nenhum alt é gerado (nunca string vazia). */
  productName: string
}

/** Segundos por render, calibrado pelo exemplo do artboard: `4 renders … leva ~6 s`. */
const SECONDS_PER_RENDER = 1.5

/** O `~Ys` do rodapé (PMD-05 AC 7). */
export const estimateSeconds = (renderCount: number): number =>
  Math.round(renderCount * SECONDS_PER_RENDER)

export const applyPlan = (
  current: readonly ProductImage[],
  renders: readonly RenderResult[],
  opts: ApplyOpts,
): ProductImage[] => {
  if (renders.length === 0) return [...current]

  const added: ProductImage[] = renders.map(render => ({
    url: render.url,
    // O mesmo template de `PMD-01 AC 2` — não há um segundo gerador de alt no projeto.
    alt: opts.generateAlt ? buildAltText(opts.productName, render.label) : null,
    // PMD-03: é daqui que o selo `Mockup` da galeria vem.
    source: 'mockup',
  }))

  if (opts.mode === 'replace') return added

  // `firstAsPrimary` só tem efeito no anexar: no substituir o primeiro render já é o índice 0.
  return opts.firstAsPrimary ? [added[0], ...current, ...added.slice(1)] : [...current, ...added]
}
