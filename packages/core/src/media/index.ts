// Normalização de imagens de produto.
//
// `products.images` deixou de ser `text[]` e virou `jsonb [{url, alt, source}]` na migration
// 20260801120200 (feature 07 / T3). A conversão é destrutiva e existem 12 pontos de leitura que
// assumiam `string[]`.
//
// Este módulo existe para que a ordem de deploy não importe: banco novo com bundle velho, ou bundle
// novo com banco velho, os dois passam por aqui e saem no mesmo formato. Sem ele, a janela entre a
// migration e o deploy do front seria um catálogo sem imagem.
//
// Regra de ouro: NUNCA lança. Um produto com `images` corrompido perde as fotos, não a página.

import type { ProductImage, ImageSource } from '@estrelinha/supabase/types'

const VALID_SOURCES: readonly ImageSource[] = ['upload', 'mockup', 'import']

/** `source` desconhecido cai em `upload` — é o que a migration usou no backfill. */
const toSource = (value: unknown): ImageSource =>
  typeof value === 'string' && (VALID_SOURCES as readonly string[]).includes(value)
    ? (value as ImageSource)
    : 'upload'

/** `alt` só é string ou null. String vazia vira null: "sem alt" tem uma representação só. */
const toAlt = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value : null

const toImage = (entry: unknown): ProductImage | null => {
  // Forma antiga: a própria URL.
  if (typeof entry === 'string') {
    const url = entry.trim()
    return url === '' ? null : { url, alt: null, source: 'upload' }
  }

  // Forma nova: objeto. Sem `url` utilizável não há imagem — descartar é melhor que
  // devolver `{url: undefined}` e deixar um `<img src="undefined">` na tela.
  if (entry !== null && typeof entry === 'object') {
    const raw = (entry as Record<string, unknown>).url
    if (typeof raw !== 'string' || raw.trim() === '') return null
    return {
      url: raw.trim(),
      alt: toAlt((entry as Record<string, unknown>).alt),
      source: toSource((entry as Record<string, unknown>).source),
    }
  }

  return null
}

/**
 * Aceita `string[]`, `ProductImage[]`, `null`, `undefined` ou lixo, e devolve sempre
 * `ProductImage[]`. Entradas inválidas somem da lista; a função não lança.
 */
export const normalizeImages = (raw: unknown): ProductImage[] => {
  if (!Array.isArray(raw)) return []
  const out: ProductImage[] = []
  for (const entry of raw) {
    const image = toImage(entry)
    if (image) out.push(image)
  }
  return out
}

/** A primeira imagem válida — a "principal" da vitrine. `null` quando não há nenhuma. */
export const primaryImage = (raw: unknown): ProductImage | null =>
  normalizeImages(raw)[0] ?? null

// "Como se pede uma imagem" — o vizinho puro deste barrel.
//
// A EXTENSÃO `.ts` É OBRIGATÓRIA (regra da feature `33`): sem ela o módulo deixa de ser alcançável
// fora do Vite, e nada acusa — Vite e vitest resolvem as duas formas.
//
// As edge functions **não** passam por aqui: este arquivo importa `@estrelinha/supabase/types`, e o
// Deno morre nesse `import type` antes da primeira linha rodar. Elas importam
// `packages/core/src/media/rendition.ts` direto, por caminho relativo.
export * from './rendition.ts'
