import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * Feature 69 · SSV-26 — o `index.ts` da function pede as colunas que decidem a primeira foto.
 *
 * `index.ts` é o arquivo que nenhuma ferramenta lê (`wiringResolve.test.ts`, `_shared`), e a falta
 * de uma coluna aqui não quebra nada: sem `stock`, toda linha de peça `track` parece esgotada, a
 * representante vira a primeira por posição, e a primeira `<image:loc>` deixa de ser o `og:image` da
 * página — com o documento válido e 200. Sem `images`, o sitemap sai sem foto nenhuma. Por isso as
 * duas listas são lidas do disco e conferidas coluna a coluna.
 */

const INDEX = join(dirname(fileURLToPath(import.meta.url)), '..', 'index.ts')

/** O valor da constante, com as partes concatenadas. `null` quando não acha — e o caso REPROVA. */
const colunas = (fonte: string, nome: string): string[] | null => {
  const m = new RegExp(`const ${nome}\\s*=\\s*([^\\n]*(?:\\n\\s*'[^']*'[^\\n]*)*)`).exec(fonte)
  if (!m) return null
  const partes = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]).join('')
  return partes === '' ? null : partes.split(',').map(c => c.trim())
}

describe('sitemap/index.ts — as colunas das fotos', () => {
  const fonte = readFileSync(INDEX, 'utf8')

  it('âncora: as duas constantes foram achadas e trazem as colunas de antes', () => {
    expect(colunas(fonte, 'COLUNAS_PRODUTO')).toEqual(expect.arrayContaining(['id', 'slug', 'updated_at']))
    expect(colunas(fonte, 'COLUNAS_VARIACAO')).toEqual(
      expect.arrayContaining(['id', 'product_id', 'price', 'is_active', 'position']),
    )
  })

  it('produtos: `images` e `stock_policy`', () => {
    expect(colunas(fonte, 'COLUNAS_PRODUTO')).toEqual(expect.arrayContaining(['images', 'stock_policy']))
  })

  it('variações: `image_url` e `stock`', () => {
    expect(colunas(fonte, 'COLUNAS_VARIACAO')).toEqual(expect.arrayContaining(['image_url', 'stock']))
  })

  it('sensor — a lista sem `stock` é acusada, e a constante ausente devolve null', () => {
    const mutante = fonte.replace(',image_url,stock', ',image_url')
    expect(mutante).not.toBe(fonte)
    expect(colunas(mutante, 'COLUNAS_VARIACAO')).not.toContain('stock')
    expect(colunas('const OUTRA = 1', 'COLUNAS_VARIACAO')).toBeNull()
  })
})
