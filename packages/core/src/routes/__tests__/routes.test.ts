import { describe, expect, it } from 'vitest'
import {
  INFRA_SLUGS,
  LEGACY_REDIRECTS,
  RESERVED_SLUGS,
  ROUTE_SLUGS,
  categoryPath,
  isReservedSlug,
  legacyRedirectTo,
  productPath,
  reservedSlugRefusal,
} from '../routes'

/**
 * `URL-01`, `URL-02`, `URL-05`, `URL-06` — as regras de endereçamento como dado.
 *
 * As listas são asseridas **elemento a elemento, com literal escrito à mão** (lição `L-010`): uma AC
 * que enumera lista precisa de um item de verificação por elemento, e a régua nunca pode ser o objeto
 * medido — comparar `ROUTE_SLUGS` com um `map` derivado dele mesmo passaria com a lista vazia.
 */
describe('ROUTE_SLUGS — o primeiro segmento de toda rota declarada em App.tsx', () => {
  it('tem exatamente os 14 segmentos estáticos das rotas da loja', () => {
    // 13 até a feature 23; o 14º é `como-enviar-o-material`, da 22. **Esta contagem falhar quando
    // uma rota entra é o comportamento correto**: com categoria na raiz do domínio (`AD-018`), rota
    // nova que não passe por aqui encobre em silêncio uma categoria homônima.
    expect(ROUTE_SLUGS).toHaveLength(14)
  })

  it.each([
    ['produtos'],
    ['produto'],
    ['colecao'],
    ['categoria'],
    ['carrinho'],
    ['pedido'],
    ['busca'],
    ['sobre'],
    ['politicas'],
    ['como-enviar-o-material'],
    ['conta'],
    ['favoritos'],
    ['entrar'],
    ['checkout'],
  ])('contém "%s"', slug => {
    expect(ROUTE_SLUGS).toContain(slug)
  })
})

describe('INFRA_SLUGS — o que é do host/build e não aparece no App.tsx', () => {
  it('tem exatamente os 3 segmentos de infraestrutura', () => {
    expect(INFRA_SLUGS).toHaveLength(3)
  })

  it.each([['assets'], ['api'], ['_vercel']])('contém "%s"', slug => {
    expect(INFRA_SLUGS).toContain(slug)
  })

  it('nenhum deles é rota da loja — é por isso que a lista é separada', () => {
    for (const slug of ['assets', 'api', '_vercel']) {
      expect(ROUTE_SLUGS).not.toContain(slug)
    }
  })
})

describe('RESERVED_SLUGS — a união das duas, sem duplicata', () => {
  it('tem 17 entradas: 14 rotas + 3 de infraestrutura', () => {
    expect(RESERVED_SLUGS).toHaveLength(17)
  })

  it('não repete nenhuma entrada', () => {
    expect(new Set(RESERVED_SLUGS).size).toBe(17)
  })

  it.each([
    ['produtos'],
    ['produto'],
    ['colecao'],
    ['categoria'],
    ['carrinho'],
    ['pedido'],
    ['busca'],
    ['sobre'],
    ['politicas'],
    ['conta'],
    ['favoritos'],
    ['entrar'],
    ['checkout'],
    ['assets'],
    ['api'],
    ['_vercel'],
  ])('contém "%s"', slug => {
    expect(RESERVED_SLUGS).toContain(slug)
  })
})

describe('isReservedSlug', () => {
  it('reconhece um slug reservado', () => {
    expect(isReservedSlug('conta')).toBe(true)
  })

  it('deixa passar um slug de categoria real do catálogo', () => {
    expect(isReservedSlug('joias-afetivas')).toBe(false)
  })

  it('normaliza a caixa antes de comparar', () => {
    expect(isReservedSlug('CHECKOUT')).toBe(true)
    expect(isReservedSlug('Sobre')).toBe(true)
  })

  it('normaliza espaço nas bordas antes de comparar', () => {
    expect(isReservedSlug('  busca  ')).toBe(true)
  })

  it('slug vazio não é reservado', () => {
    expect(isReservedSlug('')).toBe(false)
    expect(isReservedSlug('   ')).toBe(false)
  })
})

describe('reservedSlugRefusal — o motivo da recusa (URL-05)', () => {
  it('devolve `null` — e não um objeto — quando o slug é livre', () => {
    // `strictNullChecks: false` não estreita união discriminada por literal booleano (CLAUDE.md):
    // o veredito é `string | null`, que não tem ramo para esquecer.
    expect(reservedSlugRefusal('joias-afetivas')).toBeNull()
  })

  it('devolve uma string com motivo quando o slug encobriria uma rota', () => {
    const refusal = reservedSlugRefusal('sobre')
    expect(typeof refusal).toBe('string')
    expect(refusal).toContain('sobre')
  })

  it('a mensagem mostra a LISTA de palavras reservadas — a AC pede "com a lista visível"', () => {
    const refusal = reservedSlugRefusal('conta') ?? ''
    for (const slug of [
      'produtos',
      'produto',
      'colecao',
      'categoria',
      'carrinho',
      'pedido',
      'busca',
      'sobre',
      'politicas',
      'conta',
      'favoritos',
      'entrar',
      'checkout',
      'assets',
      'api',
      '_vercel',
    ]) {
      expect(refusal).toContain(slug)
    }
  })

  it('recusa também o slug digitado com caixa ou espaço diferentes', () => {
    expect(reservedSlugRefusal(' Conta ')).not.toBeNull()
  })

  it('slug vazio não é recusado aqui — quem cobra campo obrigatório é o formulário', () => {
    expect(reservedSlugRefusal('')).toBeNull()
  })
})

describe('productPath — o caminho canônico do produto (URL-01)', () => {
  it('monta `/produtos/<slug>`, o formato que a Nuvemshop publica', () => {
    expect(productPath('x')).toBe('/produtos/x')
  })

  it('preserva o slug real do catálogo', () => {
    expect(productPath('joia-de-leite-materno-lua')).toBe('/produtos/joia-de-leite-materno-lua')
  })
})

describe('categoryPath — a categoria na raiz do domínio (URL-03)', () => {
  it('raiz sai com um segmento', () => {
    expect(categoryPath('x')).toBe('/x')
  })

  it('filha sai com o pai na frente', () => {
    expect(categoryPath('x', 'pai')).toBe('/pai/x')
  })

  it('`parentSlug` nulo cai na forma de um segmento', () => {
    expect(categoryPath('x', null)).toBe('/x')
  })

  it('`parentSlug` vazio cai na forma de um segmento', () => {
    expect(categoryPath('x', '')).toBe('/x')
  })

  it('`parentSlug` só com espaço cai na forma de um segmento', () => {
    expect(categoryPath('x', '   ')).toBe('/x')
  })
})

describe('LEGACY_REDIRECTS — as formas legadas, em dado (URL-02, AC 3c)', () => {
  it('tem exatamente 3 entradas', () => {
    expect(LEGACY_REDIRECTS).toHaveLength(3)
  })

  it('o singular do produto aponta para o plural — nunca foi canônico', () => {
    expect(LEGACY_REDIRECTS[0]).toEqual({ from: '/produto/:slug', to: '/produtos/:slug' })
  })

  it('`/colecao/:slug` aponta para a raiz do domínio', () => {
    expect(LEGACY_REDIRECTS[1]).toEqual({ from: '/colecao/:slug', to: '/:slug' })
  })

  it('`/categoria/:slug` — forma que a Nuvemshop aceita — aponta para a raiz do domínio', () => {
    expect(LEGACY_REDIRECTS[2]).toEqual({ from: '/categoria/:slug', to: '/:slug' })
  })

  describe('legacyRedirectTo — o espelho que o roteador da loja usa', () => {
    it('`/produto/x` vai para `/produtos/x`', () => {
      expect(legacyRedirectTo('/produto/x')).toBe('/produtos/x')
    })

    it('`/colecao/x` vai para `/x`', () => {
      expect(legacyRedirectTo('/colecao/x')).toBe('/x')
    })

    it('`/categoria/x` vai para `/x`', () => {
      expect(legacyRedirectTo('/categoria/x')).toBe('/x')
    })

    it('caminho que não é legado devolve `null`', () => {
      expect(legacyRedirectTo('/joias-afetivas')).toBeNull()
      expect(legacyRedirectTo('/produtos/x')).toBeNull()
    })

    it('prefixo legado sem slug devolve `null` em vez de um caminho quebrado', () => {
      expect(legacyRedirectTo('/colecao')).toBeNull()
      expect(legacyRedirectTo('/colecao/')).toBeNull()
    })
  })

  it('todo `from` começa por um segmento que está em ROUTE_SLUGS', () => {
    // Sem isso a rota legada não teria como ser declarada no App.tsx nem protegida da colisão de
    // namespace que `AD-018` registra.
    for (const entry of LEGACY_REDIRECTS) {
      expect(ROUTE_SLUGS).toContain(entry.from.split('/')[1])
    }
  })
})
