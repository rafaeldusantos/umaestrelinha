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
