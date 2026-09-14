import { describe, it, expect } from 'vitest'
import { resolveHomeSections, type ResolveContext, type ResolvedItem } from '../resolve'
import type { HomeSection, HomeSectionItem, HomeSectionType } from '../types'

/**
 * `resolveHomeSections` — `HOME-02`, `HOME-03`, `HOME-09` e `HOME-31`..`HOME-36`.
 *
 * A função responde à mesma pergunta pelos dois lados: a loja pergunta *o que desenhar*, o painel
 * pergunta *o que avisar que não vai desenhar*. Por isso o veredito vem com **motivo legível**, e não
 * com um booleano — motivo é texto de interface, e um booleano obrigaria cada tela a reconstruir a
 * frase.
 */

const secao = (
  id: string,
  type: HomeSectionType,
  position: number,
  extra: Partial<HomeSection> = {},
): HomeSection => ({ id, type, position, active: true, config: {}, ...extra })

const item = (id: string, position: number, extra: Partial<HomeSectionItem> = {}): HomeSectionItem => ({
  id,
  section_id: 'qualquer',
  position,
  category_id: null,
  product_id: null,
  href: null,
  image_url: null,
  image_mobile_url: null,
  alt: null,
  label_snapshot: null,
  ...extra,
})

const resolvido = (id: string, extra: Partial<ResolvedItem> = {}): ResolvedItem => ({
  id,
  categoryId: null,
  productId: null,
  slug: null,
  label: id,
  description: null,
  href: `/${id}`,
  imageUrl: null,
  imageMobileUrl: null,
  curated: false,
  ...extra,
})

/** Contexto de teste: a derivação e a validação do destino são de quem chama. */
const ctx = (over: Partial<ResolveContext> = {}): ResolveContext => ({
  resolveItem: i => resolvido(i.id, { curated: true }),
  derive: () => [],
  ...over,
})

const porId = (lista: ReturnType<typeof resolveHomeSections>, id: string) =>
  lista.find(r => r.section.id === id)!

describe('resolveHomeSections — seção inativa (HOME-03)', () => {
  it('não renderiza, e o motivo diz que está desligada', () => {
    const out = resolveHomeSections([secao('n', 'newsletter', 1, { active: false })], ctx())

    expect(porId(out, 'n').renders).toBe(false)
    expect(porId(out, 'n').hiddenReason).toBe('Desligada: não aparece na loja.')
  })

  it('continua na lista devolvida — o painel precisa dela para mostrar o motivo', () => {
    const out = resolveHomeSections([secao('n', 'newsletter', 1, { active: false })], ctx())
    expect(out).toHaveLength(1)
  })

  it('não produz item nenhum, mesmo com curadoria gravada', () => {
    const desligada = secao('b', 'banner_grid', 1, {
      active: false,
      items: [item('i1', 1, { category_id: 'c1' })],
    })
    const out = resolveHomeSections([desligada], ctx())
    expect(porId(out, 'b').renders).toBe(false)
  })
})

describe('resolveHomeSections — derivação x curadoria (HOME-31, HOME-32)', () => {
  it('sem itens, usa a derivação de hoje', () => {
    const out = resolveHomeSections(
      [secao('b', 'banner_grid', 1)],
      ctx({ derive: () => [resolvido('derivado-1'), resolvido('derivado-2')] }),
    )

    expect(porId(out, 'b').items.map(i => i.id)).toEqual(['derivado-1', 'derivado-2'])
    expect(porId(out, 'b').items.every(i => i.curated)).toBe(false)
  })

  it('com itens, usa a lista da dona na ordem dela e ignora a derivação', () => {
    const curada = secao('b', 'banner_grid', 1, {
      items: [item('i2', 2), item('i1', 1)],
    })
    const out = resolveHomeSections([curada], ctx({ derive: () => [resolvido('derivado')] }))

    expect(porId(out, 'b').items.map(i => i.id)).toEqual(['i1', 'i2'])
    expect(porId(out, 'b').items.every(i => i.curated)).toBe(true)
  })

  it('vaga que sobra fica vazia — não completa com o automático (HOME-34)', () => {
    // Duas escolhidas, uma fora do ar: sobra uma. Completar poria na Home item que ela não escolheu.
    const curada = secao('b', 'banner_grid', 1, { items: [item('viva', 1), item('morta', 2)] })
    const out = resolveHomeSections(
      [curada],
      ctx({
        resolveItem: i => (i.id === 'viva' ? resolvido('viva', { curated: true }) : null),
        derive: () => [resolvido('derivado')],
      }),
    )

    expect(porId(out, 'b').items.map(i => i.id)).toEqual(['viva'])
  })
})

describe('resolveHomeSections — item que saiu do ar (HOME-34, HOME-36)', () => {
  it('item despublicado ou órfão é pulado e entra em `droppedCount`', () => {
    const curada = secao('b', 'banner_grid', 1, {
      items: [item('viva', 1), item('morta', 2), item('orfa', 3)],
    })
    const out = resolveHomeSections(
      [curada],
      ctx({ resolveItem: i => (i.id === 'viva' ? resolvido('viva', { curated: true }) : null) }),
    )

    expect(porId(out, 'b').items).toHaveLength(1)
    expect(porId(out, 'b').droppedCount).toBe(2)
    expect(porId(out, 'b').renders).toBe(true)
  })

  it('todos os escolhidos fora do ar ⇒ não renderiza, dizendo quantos eram', () => {
    const curada = secao('b', 'banner_grid', 1, { items: [item('a', 1), item('b', 2)] })
    const out = resolveHomeSections([curada], ctx({ resolveItem: () => null }))

    expect(porId(out, 'b').renders).toBe(false)
    expect(porId(out, 'b').hiddenReason).toBe(
      'Não vai aparecer: os 2 itens escolhidos saíram do ar.',
    )
    expect(porId(out, 'b').droppedCount).toBe(2)
  })

  it('com um só escolhido, a frase fica no singular', () => {
    const curada = secao('f', 'collection_feature', 1, { items: [item('a', 1)] })
    const out = resolveHomeSections([curada], ctx({ resolveItem: () => null }))

    expect(porId(out, 'f').hiddenReason).toBe('Não vai aparecer: o item escolhido saiu do ar.')
  })

  it('o motivo do escolhido fora do ar NÃO é confundido com o de fonte vazia', () => {
    // São problemas diferentes com remédios diferentes: um se resolve escolhendo outro item, o outro
    // subindo arte ou cadastrando coleção.
    const curada = secao('b', 'banner_grid', 1, { items: [item('a', 1)] })
    const vazia = secao('c', 'banner_grid', 2)
    const out = resolveHomeSections([curada, vazia], ctx({ resolveItem: () => null }))

    expect(porId(out, 'b').hiddenReason).not.toBe(porId(out, 'c').hiddenReason)
  })
})

describe('resolveHomeSections — catálogo vazio (HOME-09)', () => {
  const semFonte = ctx({ derive: () => [] })

  it('as seções que dependem do catálogo não renderizam, cada uma com o próprio motivo', () => {
    const out = resolveHomeSections(
      [
        secao('b', 'banner_grid', 1),
        secao('r', 'collection_rows', 2),
        secao('t', 'trending_tags', 3),
      ],
      semFonte,
    )

    expect(porId(out, 'b').renders).toBe(false)
    expect(porId(out, 'b').hiddenReason).toBe(
      'Não vai aparecer: esta grade não tem banner próprio e nenhuma coleção tem arte de banner.',
    )
    expect(porId(out, 'r').hiddenReason).toBe(
      'Não vai aparecer: o catálogo ainda não tem coleção para mostrar.',
    )
    expect(porId(out, 't').hiddenReason).toBe(
      'Não vai aparecer: o catálogo ainda não tem coleção para virar chip.',
    )
  })

  it('as seções que desenham do próprio `config` continuam renderizando', () => {
    // Hero, faixa de vantagens, faixa institucional e newsletter não dependem de catálogo — depois de
    // um `db reset` a Home não pode ficar em branco.
    const out = resolveHomeSections(
      [
        secao('h', 'hero', 1),
        secao('v', 'trust_bar', 2),
        secao('i', 'brand_statement', 3),
        secao('n', 'newsletter', 4),
      ],
      semFonte,
    )

    // O comprimento não é zelo: sem ele, uma lista vazia faria os dois `every` passarem por vácuo.
    expect(out).toHaveLength(4)
    expect(out.every(r => r.renders)).toBe(true)
    expect(out.every(r => r.hiddenReason === null)).toBe(true)
  })
})

describe('resolveHomeSections — o aninhamento da faixa institucional', () => {
  const faixa = (position: number) =>
    secao('i', 'brand_statement', position, { config: { interlude_after: 0 } })

  it('entra dentro da seção de fileiras imediatamente anterior', () => {
    const out = resolveHomeSections(
      [secao('r', 'collection_rows', 1), faixa(2)],
      ctx({ derive: () => [resolvido('colecao')] }),
    )

    expect(porId(out, 'i').nestedUnder).toEqual({ sectionId: 'r', afterRow: 0 })
    expect(porId(out, 'i').renders).toBe(true)
  })

  it('SEM fileiras antes dela, renderiza sozinha no próprio lugar — nunca some', () => {
    // O caso não óbvio, e o que ele protege é perda de conteúdo em silêncio numa Home reordenada.
    const out = resolveHomeSections([faixa(1), secao('r', 'collection_rows', 2)], ctx())

    expect(porId(out, 'i').renders).toBe(true)
    expect(porId(out, 'i').nestedUnder).toBeNull()
  })

  it('fileiras que NÃO renderizaram não recebem a faixa — ela cai de volta para si mesma', () => {
    // Catálogo vazio: a seção de fileiras some, e a faixa não pode sumir junto.
    const out = resolveHomeSections(
      [secao('r', 'collection_rows', 1), faixa(2)],
      ctx({ derive: () => [] }),
    )

    expect(porId(out, 'r').renders).toBe(false)
    expect(porId(out, 'i').renders).toBe(true)
    expect(porId(out, 'i').nestedUnder).toBeNull()
  })

  it('sem `interlude_after`, a faixa é irmã das outras seções', () => {
    const out = resolveHomeSections(
      [secao('r', 'collection_rows', 1), secao('i', 'brand_statement', 2)],
      ctx({ derive: () => [resolvido('colecao')] }),
    )

    expect(porId(out, 'i').nestedUnder).toBeNull()
    expect(porId(out, 'i').renders).toBe(true)
  })
})

describe('resolveHomeSections — a ordem e o limite', () => {
  it('devolve na ordem da Home, não na ordem do array', () => {
    const out = resolveHomeSections(
      [secao('n', 'newsletter', 3), secao('h', 'hero', 1), secao('v', 'trust_bar', 2)],
      ctx(),
    )

    expect(out.map(r => r.section.id)).toEqual(['h', 'v', 'n'])
  })

  it('respeita o limite da seção na derivação (HOME-42)', () => {
    const out = resolveHomeSections(
      [secao('t', 'trending_tags', 1, { config: { limit: 2 } })],
      ctx({ derive: () => [resolvido('a'), resolvido('b'), resolvido('c')] }),
    )

    expect(porId(out, 't').items.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('respeita o limite também na curadoria', () => {
    const curada = secao('t', 'trending_tags', 1, {
      config: { limit: 2 },
      items: [item('a', 1), item('b', 2), item('c', 3)],
    })
    const out = resolveHomeSections([curada], ctx())

    expect(porId(out, 't').items.map(i => i.id)).toEqual(['a', 'b'])
  })
})

// ---------------------------------------------------------------------------
// BNR-28, BNR-29, BNR-49 — o banner principal
// ---------------------------------------------------------------------------

describe('resolveHomeSections — banner principal (BNR-28, BNR-29)', () => {
  it('seção ligada e SEM slide não renderiza, e diz por quê', () => {
    // O motivo é do domínio e não da tela: `HOME-09` pede que a linha do painel explique, e uma
    // frase escrita no componente divergiria da que a loja usa para decidir.
    const [r] = resolveHomeSections([secao('c', 'hero_carousel', 1)], ctx())

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Não vai aparecer: nenhum banner enviado.')
  })

  it('seção com slides renderiza, na ordem da dona', () => {
    const secoes = [
      secao('c', 'hero_carousel', 1, {
        items: [item('b', 1, { category_id: 'x' }), item('a', 0, { category_id: 'y' })],
      }),
    ]
    const [r] = resolveHomeSections(secoes, ctx())

    expect(r.renders).toBe(true)
    expect(r.items.map(i => i.id)).toEqual(['a', 'b'])
  })

  it('slide com destino fora do ar é PULADO, e os outros desenham (BNR-28)', () => {
    const secoes = [
      secao('c', 'hero_carousel', 1, {
        items: [item('a', 0, { category_id: 'x' }), item('morto', 1, { category_id: 'y' })],
      }),
    ]
    const [r] = resolveHomeSections(
      secoes,
      ctx({ resolveItem: i => (i.id === 'morto' ? null : resolvido(i.id, { curated: true })) }),
    )

    expect(r.renders).toBe(true)
    expect(r.items.map(i => i.id)).toEqual(['a'])
    expect(r.droppedCount).toBe(1)
  })

  it('TODOS os slides fora do ar: não renderiza, e o motivo conta quantos eram', () => {
    const secoes = [
      secao('c', 'hero_carousel', 1, {
        items: [item('a', 0, { category_id: 'x' }), item('b', 1, { category_id: 'y' })],
      }),
    ]
    const [r] = resolveHomeSections(secoes, ctx({ resolveItem: () => null }))

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Não vai aparecer: os 2 itens escolhidos saíram do ar.')
    expect(r.droppedCount).toBe(2)
  })

  it('seção desligada diz que está desligada, e não que falta banner', () => {
    // Os dois motivos mandariam a dona para lugares diferentes: um pede upload, o outro pede um
    // clique no interruptor.
    const secoes = [
      secao('c', 'hero_carousel', 1, { active: false, items: [item('a', 0, { category_id: 'x' })] }),
    ]
    const [r] = resolveHomeSections(secoes, ctx())

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Desligada: não aparece na loja.')
  })

  it('a arte de celular do item resolvido chega intacta ao desenho', () => {
    const secoes = [
      secao('c', 'hero_carousel', 1, { items: [item('a', 0, { category_id: 'x' })] }),
    ]
    const [r] = resolveHomeSections(
      secoes,
      ctx({
        resolveItem: i =>
          resolvido(i.id, { curated: true, imageUrl: '/d.jpg', imageMobileUrl: '/m.jpg' }),
      }),
    )

    expect(r.items[0].imageUrl).toBe('/d.jpg')
    expect(r.items[0].imageMobileUrl).toBe('/m.jpg')
  })

  it('duas seções de banner convivem — o tipo é repetível (BNR-03)', () => {
    const secoes = [
      secao('c1', 'hero_carousel', 1, { items: [item('a', 0, { category_id: 'x' })] }),
      secao('c2', 'hero_carousel', 2, { items: [item('b', 0, { category_id: 'y' })] }),
    ]
    const resolvidas = resolveHomeSections(secoes, ctx())

    expect(resolvidas.filter(r => r.renders)).toHaveLength(2)
  })
})

/**
 * O bloco **Produtos em destaque** — `DST-20`.
 *
 * Ele só existe por curadoria: não há fonte automática, e é decisão de escopo (uma fonte ao lado da
 * lista seria o segundo dono de "quais produtos aparecem aqui"). Por isso os dois motivos de não
 * aparecer são **diferentes**, e a distinção é o que a AC cobra: "nenhum escolhido" pede um clique
 * no seletor; "os escolhidos saíram do ar" pede olhar o catálogo. Um motivo genérico mandaria a dona
 * para o lugar errado.
 */
describe('resolveHomeSections — produtos em destaque (DST-20)', () => {
  it('ativa e sem item escolhido: não renderiza, e o motivo fala da ESCOLHA', () => {
    const [r] = resolveHomeSections([secao('d', 'product_carousel', 1)], ctx())

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Não vai aparecer: nenhum produto escolhido.')
  })

  it('o motivo NÃO fala de fonte — a dona não configura fonte nenhuma neste bloco', () => {
    // Vizinha da asserção acima, e não substituta: a frase anterior dizia "a fonte não devolveu
    // nenhum produto", e mandava procurar um campo que não existe em tela nenhuma.
    const [r] = resolveHomeSections([secao('d', 'product_carousel', 1)], ctx())
    expect(r.hiddenReason).not.toContain('fonte')
  })

  it('TRÊS escolhidos e os três fora do ar: o motivo conta quantos eram, e `droppedCount` é 3', () => {
    const secoes = [
      secao('d', 'product_carousel', 1, {
        items: [
          item('a', 0, { product_id: 'p1' }),
          item('b', 1, { product_id: 'p2' }),
          item('c', 2, { product_id: 'p3' }),
        ],
      }),
    ]
    const [r] = resolveHomeSections(secoes, ctx({ resolveItem: () => null }))

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Não vai aparecer: os 3 itens escolhidos saíram do ar.')
    expect(r.droppedCount).toBe(3)
  })

  it('desligada COM itens diz que está desligada — a precedência não muda', () => {
    // O edge case da spec: o motivo de estar desligada vence o de estar vazia. Os dois motivos
    // mandariam a dona para lugares diferentes — um pede um clique no interruptor, o outro pede
    // curadoria.
    const secoes = [
      secao('d', 'product_carousel', 1, {
        active: false,
        items: [item('a', 0, { product_id: 'p1' })],
      }),
    ]
    const [r] = resolveHomeSections(secoes, ctx())

    expect(r.renders).toBe(false)
    expect(r.hiddenReason).toBe('Desligada: não aparece na loja.')
  })

  it('escolhido que saiu do ar é PULADO, e os outros desenham', () => {
    const secoes = [
      secao('d', 'product_carousel', 1, {
        items: [item('a', 0, { product_id: 'p1' }), item('morto', 1, { product_id: 'p2' })],
      }),
    ]
    const [r] = resolveHomeSections(
      secoes,
      ctx({ resolveItem: i => (i.id === 'morto' ? null : resolvido(i.id, { curated: true })) }),
    )

    expect(r.renders).toBe(true)
    expect(r.items.map(i => i.id)).toEqual(['a'])
    expect(r.droppedCount).toBe(1)
  })

  it('dois blocos convivem na mesma Home — o tipo é repetível', () => {
    const secoes = [
      secao('d1', 'product_carousel', 1, { items: [item('a', 0, { product_id: 'p1' })] }),
      secao('d2', 'product_carousel', 2, { items: [item('b', 0, { product_id: 'p2' })] }),
    ]
    const resolvidas = resolveHomeSections(secoes, ctx())

    expect(resolvidas.filter(r => r.renders)).toHaveLength(2)
  })
})
