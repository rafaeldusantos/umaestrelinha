import { describe, expect, it } from 'vitest'
import { productPath } from '../../routes/routes'
import {
  MAX_ADDITIONAL_IMAGES,
  offerDescription,
  offerImages,
  offerLink,
  pickCategoryProductCategory,
  representativeVariant,
  resolveOffer,
  variantByPublicId,
} from '../offer'

/**
 * `GSH-03` (AC 4) e `GSH-08` (AC 10) — a oferta montada.
 *
 * A peça usada nos testes é **real**: a oferta `1259936246` da conta `685367464`, medida em
 * 2026-08-16 contra o banco local.
 */

const ORIGEM = 'https://umaestrelinha.com.br'

const produto = {
  id: '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93',
  nuvemshop_id: 281745761,
  name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
  slug: 'pulseira-7-nos-ajustavel-protecao-kabbalah',
  description: '<p>Pulseira dos 7 n&oacute;s</p>',
  images: [{ url: 'https://cdn/p1.jpg' }, { url: 'https://cdn/p2.jpg' }],
  is_active: true,
  stock_policy: 'track' as const,
}

const variacao = {
  id: 'dd0e2171-4d3d-4e20-a868-21e5223bd917',
  nuvemshop_id: 1259936246,
  price: 19.9,
  compare_price: null,
  stock: 4,
  image_url: null,
  is_active: true,
}

describe('offerLink — GSH-03 AC 4', () => {
  it('é a canônica do produto mais a variação anunciada', () => {
    expect(offerLink(produto, variacao, ORIGEM)).toBe(
      'https://umaestrelinha.com.br/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246',
    )
  })

  it('o caminho vem de productPath — não é string montada aqui', () => {
    expect(offerLink(produto, variacao, ORIGEM)).toContain(productPath(produto.slug))
  })

  it('não tem barra final antes da query — o vercel.json declara trailingSlash false', () => {
    expect(offerLink(produto, variacao, ORIGEM)).not.toContain('/?variant=')
  })

  it('não carrega pf=mc, que é tag interna da Nuvemshop', () => {
    expect(offerLink(produto, variacao, ORIGEM)).not.toContain('pf=mc')
  })

  it('origem com barra final não produz barra dobrada', () => {
    expect(offerLink(produto, variacao, 'https://umaestrelinha.com.br/')).toBe(
      'https://umaestrelinha.com.br/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246',
    )
  })

  it('o variant do link é o MESMO valor do g:id da oferta', () => {
    const oferta = resolveOffer(produto, variacao, { origin: ORIGEM })
    expect(oferta.link).toContain(`?variant=${oferta.id}`)
  })
})

describe('offerDescription — GSH-08', () => {
  it('sai como texto: sem tag e com entidade decodificada', () => {
    expect(offerDescription(produto)).toBe('Pulseira dos 7 nós')
  })

  // O arranjo do HTML é o **medido no catálogo**: `<strong>pergunta</strong><br>resposta` dentro de
  // um `<p>`, que é como 617 dos 687 produtos escrevem o bloco. Sem o `<br>` não há par extraível, e
  // `stripFaqBlock` — corretamente — não remove nada.
  it('filtra o bloco de perguntas frequentes, como a loja filtra', () => {
    const comFaq = {
      ...produto,
      description:
        '<p>Peça artesanal</p><h3>Perguntas frequentes</h3><p><strong>Demora?</strong><br>Cerca de 20 dias.</p>',
    }
    const texto = offerDescription(comFaq)
    expect(texto).toContain('Peça artesanal')
    expect(texto).not.toContain('Perguntas frequentes')
    expect(texto).not.toContain('Cerca de 20 dias')
  })

  it('descrição vazia recua para o nome — g:description é obrigatório', () => {
    expect(offerDescription({ ...produto, description: '' })).toBe(produto.name)
  })

  it('descrição só com marcação recua para o nome', () => {
    expect(offerDescription({ ...produto, description: '<p></p><br/>' })).toBe(produto.name)
  })
})

describe('offerImages — GSH-08 AC 10', () => {
  it('usa a imagem da variação quando ela existe', () => {
    const { imageLink } = offerImages(produto, { ...variacao, image_url: 'https://cdn/v1.jpg' })
    expect(imageLink).toBe('https://cdn/v1.jpg')
  })

  it('recua para a primeira imagem do produto — 191 variações reais caem aqui', () => {
    expect(offerImages(produto, variacao).imageLink).toBe('https://cdn/p1.jpg')
  })

  it('a imagem principal não se repete nas adicionais', () => {
    const { imageLink, additionalImageLinks } = offerImages(produto, variacao)
    expect(additionalImageLinks).not.toContain(imageLink)
    expect(additionalImageLinks).toEqual(['https://cdn/p2.jpg'])
  })

  it('limita as adicionais ao teto do Google', () => {
    const muitas = {
      ...produto,
      images: Array.from({ length: 20 }, (_, i) => ({ url: `https://cdn/p${i}.jpg` })),
    }
    expect(offerImages(muitas, variacao).additionalImageLinks).toHaveLength(MAX_ADDITIONAL_IMAGES)
  })
})

describe('resolveOffer — a oferta medida', () => {
  it('reproduz o id e o item_group_id que o Merchant Center já indexou', () => {
    const oferta = resolveOffer(produto, variacao, { origin: ORIGEM })
    expect(oferta.id).toBe('1259936246')
    expect(oferta.itemGroupId).toBe('281745761')
  })

  it('anuncia o preço da linha e a disponibilidade dela', () => {
    const oferta = resolveOffer(produto, variacao, { origin: ORIGEM })
    expect(oferta.price).toBe(19.9)
    expect(oferta.salePrice).toBeNull()
    expect(oferta.availability).toBe('in_stock')
  })

  it('condition é sempre new', () => {
    expect(resolveOffer(produto, variacao, { origin: ORIGEM }).condition).toBe('new')
  })

  it('identifier_exists nulo herda o padrão da loja: sem identificador', () => {
    expect(resolveOffer(produto, variacao, { origin: ORIGEM }).identifierExists).toBe(false)
  })

  it('identifier_exists true no produto sobrescreve o padrão', () => {
    const comGtin = { ...produto, identifier_exists: true }
    expect(resolveOffer(comGtin, variacao, { origin: ORIGEM }).identifierExists).toBe(true)
  })

  it('a categoria do produto vence o default da loja', () => {
    const oferta = resolveOffer(
      { ...produto, google_product_category: 'Apparel & Accessories > Jewelry > Bracelets' },
      variacao,
      { origin: ORIGEM, defaultProductCategory: 'Apparel & Accessories > Jewelry' },
    )
    expect(oferta.googleProductCategory).toBe(
      'Apparel & Accessories > Jewelry > Bracelets',
    )
  })

  it('sem categoria no produto, usa o default da loja', () => {
    const oferta = resolveOffer(produto, variacao, {
      origin: ORIGEM,
      defaultProductCategory: 'Apparel & Accessories > Jewelry',
    })
    expect(oferta.googleProductCategory).toBe('Apparel & Accessories > Jewelry')
  })

  it('campo de identificação vazio vira null, nunca string vazia', () => {
    const oferta = resolveOffer({ ...produto, brand: '', mpn: '' }, variacao, { origin: ORIGEM })
    expect(oferta.brand).toBeNull()
    expect(oferta.mpn).toBeNull()
  })

  it('campo de identificação preenchido chega na oferta', () => {
    const oferta = resolveOffer(
      { ...produto, brand: 'Uma Estrelinha', mpn: 'UE-7NOS', age_group: 'adult', gender: 'unisex' },
      variacao,
      { origin: ORIGEM },
    )
    expect(oferta.brand).toBe('Uma Estrelinha')
    expect(oferta.mpn).toBe('UE-7NOS')
    expect(oferta.ageGroup).toBe('adult')
    expect(oferta.gender).toBe('unisex')
  })
})

describe('variantByPublicId — as duas formas resolvem a mesma linha (GSH-10 AC 2)', () => {
  const linhas = [
    { ...variacao, id: 'uuid-a', nuvemshop_id: 1259936246 },
    { ...variacao, id: 'uuid-b', nuvemshop_id: 1259936247, price: 24.9 },
  ]

  it('casa por nuvemshop_id', () => {
    expect(variantByPublicId(linhas, '1259936247')?.id).toBe('uuid-b')
  })

  it('casa por UUID, mesmo quando a linha TEM nuvemshop_id', () => {
    expect(variantByPublicId(linhas, 'uuid-b')?.id).toBe('uuid-b')
  })

  it('as duas formas devolvem a MESMA linha', () => {
    expect(variantByPublicId(linhas, '1259936247')).toBe(variantByPublicId(linhas, 'uuid-b'))
  })

  it('id desconhecido devolve null', () => {
    expect(variantByPublicId(linhas, '42')).toBeNull()
  })

  it('vazio, nulo e indefinido devolvem null', () => {
    expect(variantByPublicId(linhas, '')).toBeNull()
    expect(variantByPublicId(linhas, null)).toBeNull()
    expect(variantByPublicId(linhas, undefined)).toBeNull()
  })
})

describe('representativeVariant — quando a URL não indica variação', () => {
  const p = { ...produto }
  const linha = (over: Record<string, unknown>) => ({ ...variacao, ...over })

  it('escolhe a primeira por position', () => {
    const vs = [linha({ id: 'b', position: 1 }), linha({ id: 'a', position: 0 })]
    expect(representativeVariant(p, vs)?.id).toBe('a')
  })

  it('pula a esgotada e pega a próxima disponível', () => {
    const vs = [linha({ id: 'a', position: 0, stock: 0 }), linha({ id: 'b', position: 1, stock: 3 })]
    expect(representativeVariant(p, vs)?.id).toBe('b')
  })

  it('com a grade toda esgotada, devolve a primeira', () => {
    const vs = [linha({ id: 'a', position: 0, stock: 0 }), linha({ id: 'b', position: 1, stock: 0 })]
    expect(representativeVariant(p, vs)?.id).toBe('a')
  })

  it('ignora linha inelegível — inativa ou sem preço', () => {
    const vs = [
      linha({ id: 'a', position: 0, is_active: false }),
      linha({ id: 'b', position: 1, price: null }),
      linha({ id: 'c', position: 2 }),
    ]
    expect(representativeVariant(p, vs)?.id).toBe('c')
  })

  it('sem nenhuma linha elegível devolve null — a página não declara oferta', () => {
    expect(representativeVariant(p, [linha({ price: null })])).toBeNull()
  })

  it('produto inativo não tem representante', () => {
    expect(representativeVariant({ ...p, is_active: false }, [linha({})])).toBeNull()
  })
})

describe('GSH-23 — a precedência da taxonomia do Google', () => {
  const ctx = (over: Record<string, unknown> = {}) => ({ origin: ORIGEM, ...over })
  const cat = (v: string | null) => resolveOffer(produto, variacao, ctx({ categoryProductCategory: v }))

  it('o produto vence a categoria', () => {
    const oferta = resolveOffer({ ...produto, google_product_category: 'DO PRODUTO' }, variacao, {
      origin: ORIGEM,
      categoryProductCategory: 'DA CATEGORIA',
      defaultProductCategory: 'DA LOJA',
    })
    expect(oferta.googleProductCategory).toBe('DO PRODUTO')
  })

  it('a categoria vence o padrão da loja', () => {
    const oferta = resolveOffer(produto, variacao, {
      origin: ORIGEM,
      categoryProductCategory: 'DA CATEGORIA',
      defaultProductCategory: 'DA LOJA',
    })
    expect(oferta.googleProductCategory).toBe('DA CATEGORIA')
  })

  it('sem produto nem categoria, vale o padrão da loja', () => {
    const oferta = resolveOffer(produto, variacao, {
      origin: ORIGEM,
      defaultProductCategory: 'DA LOJA',
    })
    expect(oferta.googleProductCategory).toBe('DA LOJA')
  })

  it('sem nenhum dos três, a tag não é emitida', () => {
    expect(cat(null).googleProductCategory).toBeNull()
  })
})

describe('pickCategoryProductCategory — qual categoria empresta a taxonomia', () => {
  const c = (name: string, sort_order: number, google_product_category: string | null) => ({
    name,
    sort_order,
    google_product_category,
  })

  it('sem categoria com valor, devolve null', () => {
    expect(pickCategoryProductCategory([c('A', 0, null), c('B', 1, null)])).toBeNull()
  })

  it('lista vazia devolve null', () => {
    expect(pickCategoryProductCategory([])).toBeNull()
  })

  it('pula as sem valor e usa a que tem', () => {
    expect(pickCategoryProductCategory([c('A', 0, null), c('B', 1, 'X')])).toBe('X')
  })

  it('menor sort_order vence — a mesma régua do selo do card', () => {
    expect(pickCategoryProductCategory([c('B', 5, 'CINCO'), c('A', 1, 'UM')])).toBe('UM')
  })

  it('empate em sort_order desempata por nome — sem isso a taxonomia mudaria sozinha', () => {
    expect(pickCategoryProductCategory([c('Zebra', 0, 'Z'), c('Alfa', 0, 'A')])).toBe('A')
  })

  it('string vazia não conta como valor', () => {
    expect(pickCategoryProductCategory([c('A', 0, ''), c('B', 1, 'X')])).toBe('X')
  })

  it('a ordem de entrada não influencia o resultado', () => {
    const cats = [c('B', 5, 'CINCO'), c('A', 1, 'UM'), c('C', 9, 'NOVE')]
    expect(pickCategoryProductCategory(cats)).toBe(pickCategoryProductCategory([...cats].reverse()))
  })
})
