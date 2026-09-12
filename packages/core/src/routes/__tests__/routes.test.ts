import { describe, expect, it } from 'vitest'
import {
  INFRA_SLUGS,
  JEWELRY_CARE_PATH,
  FAQ_PATH,
  LEGACY_REDIRECTS,
  MATERIAL_GUIDE_PATH,
  NON_INDEXABLE_PATHS,
  SITEMAP_STATIC_PATHS,
  RESERVED_SLUGS,
  ROUTE_SLUGS,
  categoryPath,
  isReservedSlug,
  legacyRedirectTo,
  materialGuideHref,
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
  it('tem exatamente os 18 segmentos estáticos das rotas da loja', () => {
    // 13 até a feature 23; o 14º é `como-enviar-o-material`, da 22. O 15º é
    // `como-enviar-seu-material-de-dna`, da 31 — e o 14º **continua aqui**, agora como rota de
    // redirect: apagá-lo liberaria o slug para uma categoria, que engoliria o 301 das URLs já
    // compartilhadas. O 16º e o 17º são as duas políticas da 45. O ÍNDICE `politicas` que as
    // apontava foi removido em 2026-09-12 (decisão do usuário) e `cuidados-com-sua-joia-afetiva`
    // entrou no lugar dele, mantendo a contagem. **Esta contagem falhar quando uma rota entra é o
    // comportamento correto**: com categoria na raiz do domínio (`AD-018`), rota nova que não passe
    // por aqui encobre em silêncio uma categoria homônima.
    expect(ROUTE_SLUGS).toHaveLength(18)
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
    ['politicas-de-trocas-e-devolucoes'],
    ['politica-de-privacidade'],
    ['cuidados-com-sua-joia-afetiva'],
    ['como-enviar-o-material'],
    ['como-enviar-seu-material-de-dna'],
    ['conta'],
    ['favoritos'],
    ['entrar'],
    ['checkout'],
  ])('contém "%s"', slug => {
    expect(ROUTE_SLUGS).toContain(slug)
  })

  /**
   * `POL-01` — o plural e o singular são **do site em produção**, e a assimetria é o dado.
   *
   * Sem este caso, a próxima pessoa que passar por aqui "arruma" um dos dois para o outro, e a
   * arrumação é uma mudança de endereço: a URL que o Google indexou passa a responder 404, e nada no
   * repositório acusa — as duas páginas continuam abrindo, pelo endereço novo.
   */
  it('as duas políticas têm os slugs LITERAIS do site em produção — plural e singular', () => {
    expect(ROUTE_SLUGS).toContain('politicas-de-trocas-e-devolucoes')
    expect(ROUTE_SLUGS).toContain('politica-de-privacidade')
    expect(ROUTE_SLUGS).not.toContain('politica-de-trocas-e-devolucoes')
    expect(ROUTE_SLUGS).not.toContain('politicas-de-privacidade')
  })

  /**
   * `politicas` era o índice — e só o índice — e foi removido em 2026-09-12. A comparação continua
   * sendo de **segmento inteiro**: sem o índice reservado, nada muda para as duas páginas abaixo,
   * porque elas nunca dependeram dele para ficar reservadas.
   */
  it('a política de trocas continua reservada por segmento inteiro, mesmo sem o índice `politicas`', () => {
    expect(isReservedSlug('politicas-de-trocas-e-devolucoes')).toBe(true)
    expect(isReservedSlug('politicas')).toBe(false)
    expect(isReservedSlug('politicas-de-frete')).toBe(false)
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
  it('tem 21 entradas: 18 rotas + 3 de infraestrutura', () => {
    expect(RESERVED_SLUGS).toHaveLength(21)
  })

  it('não repete nenhuma entrada', () => {
    expect(new Set(RESERVED_SLUGS).size).toBe(21)
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
    ['cuidados-com-sua-joia-afetiva'],
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
      'cuidados-com-sua-joia-afetiva',
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
  it('tem exatamente 4 entradas', () => {
    // Três padrões `prefixo/:slug` da feature 23 + o caminho fixo do guia de material, da 31.
    expect(LEGACY_REDIRECTS).toHaveLength(4)
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

  it('o guia de material aponta para o endereço novo — caminho INTEIRO, sem `:slug`', () => {
    expect(LEGACY_REDIRECTS[3]).toEqual({
      from: '/como-enviar-o-material',
      to: '/como-enviar-seu-material-de-dna',
    })
  })

  it('`legacyRedirectTo` resolve o caminho fixo, e só ele', () => {
    // As duas metades. Sem a primeira, a URL que está no rodapé de todo e-mail já enviado vira 404
    // em `pnpm dev` e no vitest. Sem a segunda, `/como-enviar-o-material/x` casaria pelo prefixo e
    // produziria um destino com `:slug` literal dentro da URL.
    expect(legacyRedirectTo('/como-enviar-o-material')).toBe('/como-enviar-seu-material-de-dna')
    expect(legacyRedirectTo('/como-enviar-o-material/qualquer-coisa')).toBeNull()
  })

  it('`materialGuideHref` monta o guia com e sem âncora', () => {
    expect(materialGuideHref()).toBe(MATERIAL_GUIDE_PATH)
    expect(materialGuideHref('cinzas')).toBe(`${MATERIAL_GUIDE_PATH}#cinzas`)
    // Vazio e espaço em branco caem no guia sem âncora, e não numa URL terminada em `#`.
    expect(materialGuideHref('   ')).toBe(MATERIAL_GUIDE_PATH)
    expect(materialGuideHref(null)).toBe(MATERIAL_GUIDE_PATH)
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

describe('a classificação de rota do sitemap (SMP-04, SMP-24)', () => {
  it('as duas listas são disjuntas — uma rota não pode ser indexável e não-indexável', () => {
    // Sobreposição não quebraria nada: o gerador emitiria a URL e a lista de exclusão diria o
    // contrário, e a intenção ficaria indecidível para quem lesse depois.
    const foraDoSitemap = new Set(NON_INDEXABLE_PATHS.map((entry) => entry.path))
    for (const path of SITEMAP_STATIC_PATHS) {
      expect(foraDoSitemap.has(path)).toBe(false)
    }
  })

  it('todo caminho das duas listas é absoluto', () => {
    for (const path of [...SITEMAP_STATIC_PATHS, ...NON_INDEXABLE_PATHS.map((e) => e.path)]) {
      expect(path.startsWith('/')).toBe(true)
    }
  })

  it('nenhuma entrada se repete dentro da própria lista', () => {
    expect(new Set(SITEMAP_STATIC_PATHS).size).toBe(SITEMAP_STATIC_PATHS.length)
    const fora = NON_INDEXABLE_PATHS.map((e) => e.path)
    expect(new Set(fora).size).toBe(fora.length)
  })

  it('o guia de material entra pelo `MATERIAL_GUIDE_PATH`, não por literal repetido', () => {
    // O endereço do guia já mudou uma vez (feature 31). Uma segunda escrita dele aqui sairia do
    // lugar sem quebrar nada — e o sitemap passaria a anunciar uma URL que só responde 301.
    expect(SITEMAP_STATIC_PATHS).toContain(MATERIAL_GUIDE_PATH)
  })

  it('toda exclusão carrega motivo escrito', () => {
    // `reason` é dado, não comentário: exclusão sem motivo é decisão que ninguém consegue revisar.
    for (const entry of NON_INDEXABLE_PATHS) {
      expect(entry.reason.trim().length).toBeGreaterThan(10)
    }
  })

  it('nenhuma forma legada entra no sitemap — sitemap é lista de canônicas', () => {
    for (const entry of LEGACY_REDIRECTS) {
      expect(SITEMAP_STATIC_PATHS).not.toContain(entry.from)
    }
  })

  /**
   * `POL-03` — as duas políticas são anunciadas.
   *
   * Um item por caminho (`L-010`), e não um laço sobre a própria lista: a régua não pode ser o objeto
   * medido. Sem isto, uma das duas poderia sair de `SITEMAP_STATIC_PATHS` e a única coisa a acusar
   * seria a âncora de contagem abaixo — que quem remove a entrada também ajusta, sem pensar.
   */
  it.each([['/politicas-de-trocas-e-devolucoes'], ['/politica-de-privacidade']])(
    'a política em "%s" é anunciada no sitemap',
    (path) => {
      expect(SITEMAP_STATIC_PATHS).toContain(path)
    },
  )

  it('os cuidados com a joia entram pelo `JEWELRY_CARE_PATH`, não por literal repetido', () => {
    expect(SITEMAP_STATIC_PATHS).toContain(JEWELRY_CARE_PATH)
  })

  it('as perguntas frequentes entram pelo `FAQ_PATH`, não por literal repetido', () => {
    expect(SITEMAP_STATIC_PATHS).toContain(FAQ_PATH)
    expect(ROUTE_SLUGS).toContain('perguntas-frequentes')
  })

  // O slug é novo — a página não existe no site em produção —, então não há URL indexada a
  // preservar e ele NÃO entra em `LEGACY_REDIRECTS`. A asserção registra a decisão: se um endereço
  // de FAQ já divulgado aparecer depois, é lá que ele entra, e este caso vai cobrar a mudança.
  it('não há redirect legado apontando para as perguntas frequentes', () => {
    expect(LEGACY_REDIRECTS.some(r => r.to === FAQ_PATH)).toBe(false)
  })

  it('âncora de tamanho: 7 institucionais e 7 excluídas', () => {
    // Sem a âncora, esvaziar uma das listas tornaria as asserções acima verdadeiras por vacuidade.
    // As 7: raiz, Sobre, as duas políticas da feature 45, os cuidados com a joia, o guia de
    // material e as perguntas frequentes (feature 46). O índice `/politicas` que ocupava uma dessas
    // vagas foi removido em 2026-09-12.
    expect(SITEMAP_STATIC_PATHS).toHaveLength(7)
    expect(NON_INDEXABLE_PATHS).toHaveLength(7)
  })
})
