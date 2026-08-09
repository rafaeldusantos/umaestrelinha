import { describe, expect, it } from 'vitest'

import products from '../../__fixtures__/products.json' with { type: 'json' }
import type { RawProduct } from '../../nuvemshop/types.ts'
import { extensionOf, planImages, storagePath, toWebpUrl } from '../image.ts'

const reais = products as RawProduct[]
const bySlug = (slug: string) => reais.find(p => (p.handle as { pt: string }).pt === slug)!

const CDN = 'https://acdn-us.mitiendanube.com/stores/005/943/282/products'

describe('toWebpUrl — a rendição que corta 89% dos bytes (CAT-03)', () => {
  it('troca .png por .webp', () => {
    expect(toWebpUrl(`${CDN}/foto-1024-1024.png`)).toBe(`${CDN}/foto-1024-1024.webp`)
  })

  it('troca .jpg por .webp', () => {
    expect(toWebpUrl(`${CDN}/foto-1024-1024.jpg`)).toBe(`${CDN}/foto-1024-1024.webp`)
  })

  it('preserva a query string', () => {
    expect(toWebpUrl(`${CDN}/foto.png?v=2`)).toBe(`${CDN}/foto.webp?v=2`)
  })

  it('aceita extensão em maiúscula', () => {
    expect(toWebpUrl(`${CDN}/foto.PNG`)).toBe(`${CDN}/foto.webp`)
  })

  it('não inventa extensão em URL que não tem', () => {
    expect(toWebpUrl(`${CDN}/foto`)).toBe(`${CDN}/foto`)
  })

  it('não confunde ponto do domínio com extensão', () => {
    expect(toWebpUrl('https://acdn-us.mitiendanube.com/foto')).toBe('https://acdn-us.mitiendanube.com/foto')
  })

  it('aplica às 43 imagens reais sem gerar URL inválida', () => {
    const todas = reais.flatMap(planImages)
    expect(todas).toHaveLength(43)
    for (const plan of todas) {
      expect(plan.webpUrl.endsWith('.webp'), plan.webpUrl).toBe(true)
      expect(plan.webpUrl.startsWith('https://')).toBe(true)
    }
  })
})

describe('storagePath — caminho determinístico (CAT-03)', () => {
  it('devolve o mesmo caminho em duas chamadas com a mesma entrada', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    expect(planImages(p).map(i => i.storageBase)).toEqual(planImages(p).map(i => i.storageBase))
  })

  it('usa produto e imagem da origem, sem UUID nem timestamp', () => {
    const plan = planImages(bySlug('corrente-singapura-em-prata-925'))[0]
    expect(plan.storageBase).toBe(`nuvemshop/${plan.product_nuvemshop_id}/${plan.nuvemshop_id}`)
    expect(plan.storageBase).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
  })

  it('fecha com .webp quando a rendição WebP serviu', () => {
    const plan = planImages(bySlug('corrente-singapura-em-prata-925'))[0]
    expect(storagePath(plan, plan.webpUrl)).toBe(`${plan.storageBase}.webp`)
  })

  it('fecha com a extensão do ORIGINAL quando caiu no fallback', () => {
    // Gravar bytes PNG num arquivo chamado `.webp` seria um nome que mente sobre o conteúdo.
    const plan = planImages(bySlug('corrente-singapura-em-prata-925'))[0]
    expect(storagePath(plan, plan.originalUrl)).toBe(`${plan.storageBase}.png`)
  })

  it('gera caminho único para cada uma das 43 imagens reais', () => {
    const caminhos = reais.flatMap(planImages).map(i => i.storageBase)
    expect(new Set(caminhos).size).toBe(caminhos.length)
  })
})

describe('planImages — alt (AD-011)', () => {
  it('usa o alt da origem quando a vendedora escreveu um', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const comAlt = {
      ...p,
      images: [{ ...p.images[0], alt: { pt: 'Corrente singapura em prata 925 no pescoço' } }],
    } as RawProduct
    expect(planImages(comAlt)[0].alt).toBe('Corrente singapura em prata 925 no pescoço')
  })

  it('aceita o alt da origem na forma de array, que é a outra forma que a API usa', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const comAlt = { ...p, images: [{ ...p.images[0], alt: ['Alt em array'] }] } as RawProduct
    expect(planImages(comAlt)[0].alt).toBe('Alt em array')
  })

  it('usa o nome do produto na primeira imagem quando a origem não tem alt', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    expect(planImages(p)[0].alt).toBe((p.name as { pt: string }).pt)
  })

  it('numera as demais como "<nome> — foto N", começando em 2', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const nome = (p.name as { pt: string }).pt
    const plans = planImages(p)
    expect(plans.length).toBeGreaterThan(1)
    expect(plans[1].alt).toBe(`${nome} — foto 2`)
    expect(plans[2].alt).toBe(`${nome} — foto 3`)
  })

  it('nenhuma das 43 imagens reais fica sem alt', () => {
    for (const plan of reais.flatMap(planImages)) {
      expect(plan.alt.trim(), `imagem ${plan.nuvemshop_id}`).not.toBe('')
    }
  })
})

describe('planImages — ordem', () => {
  it('ordena por position, e a numeração do alt segue essa ordem', () => {
    const p = bySlug('corrente-singapura-em-prata-925')
    const embaralhado = { ...p, images: [...p.images].reverse() } as RawProduct
    const plans = planImages(embaralhado)
    expect(plans.map(i => i.position)).toEqual([...plans.map(i => i.position)].sort((a, b) => a - b))
    expect(plans[0].alt).toBe((p.name as { pt: string }).pt)
  })

  it('devolve lista vazia para produto sem imagem', () => {
    expect(planImages(bySlug('pingente-figa-colecao-fragmentos'))).toEqual([])
  })
})

describe('extensionOf', () => {
  it('devolve a extensão em minúscula, com o ponto', () => {
    expect(extensionOf(`${CDN}/foto.PNG`)).toBe('.png')
    expect(extensionOf(`${CDN}/foto.webp?v=1`)).toBe('.webp')
  })

  it('devolve vazio quando não há extensão no último segmento', () => {
    expect(extensionOf(`${CDN}/foto`)).toBe('')
  })
})
