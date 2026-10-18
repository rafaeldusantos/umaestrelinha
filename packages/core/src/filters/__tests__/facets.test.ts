import { describe, expect, it } from 'vitest'
import { facetCounts, passesSelection, visibleGroups } from '../facets.ts'
import type { FilterCatalog, FilterSelection, FilterableProduct } from '../types.ts'

// FLT-21..24, FLT-37, FLT-41 — a regra de quem passa e de quanto cada valor conta.
//
// A fixture é desenhada para que as leituras ERRADAS deem respostas diferentes da certa (`L-013`):
// "E dentro do grupo", "OU entre grupos" e "contagem com a própria seleção" produzem, cada uma, um
// número que nenhuma das outras produz.

const CATALOGO: FilterCatalog = {
  groups: [
    // fora de ordem de propósito: a régua é `sort_order`, não a ordem de chegada
    { id: 'G-tipo', name: 'Tipo de joia', slug: 'tipo', is_active: true, sort_order: 2 },
    { id: 'G-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 1 },
    { id: 'G-off', name: 'Desligado', slug: 'desligado', is_active: false, sort_order: 0 },
    { id: 'G-vazio', name: 'Para quem', slug: 'para-quem', is_active: true, sort_order: 3 },
  ],
  values: [
    { id: 'prata', group_id: 'G-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 1 },
    { id: 'ouro', group_id: 'G-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 0 },
    { id: 'rose', group_id: 'G-acab', name: 'Rosé', slug: 'rose', sort_order: 2 },
    { id: 'anel', group_id: 'G-tipo', name: 'Anel', slug: 'anel', sort_order: 0 },
    { id: 'pingente', group_id: 'G-tipo', name: 'Pingente', slug: 'pingente', sort_order: 1 },
    { id: 'off-v', group_id: 'G-off', name: 'X', slug: 'x', sort_order: 0 },
    { id: 'mae', group_id: 'G-vazio', name: 'Mãe', slug: 'mae', sort_order: 0 },
  ],
}

type P = FilterableProduct & { id: string; price: number }
const p = (id: string, price: number, ...vals: string[]): P => ({ id, price, filter_value_ids: vals })

// rose: valor que NENHUM produto tem; mae: grupo inteiro sem produto.
const BASE: P[] = [
  p('a', 10, 'prata', 'anel'),
  p('b', 20, 'ouro', 'anel'),
  p('c', 30, 'prata', 'pingente'),
  p('d', 40, 'prata', 'ouro', 'pingente', 'off-v'),
  p('e', 50, 'pingente'),
  p('f', 60),
]

const passam = (sel: FilterSelection) => BASE.filter(x => passesSelection(x, sel, CATALOGO)).map(x => x.id)

describe('passesSelection — FLT-23', () => {
  it('sem seleção, todos passam', () => {
    expect(passam({})).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

  it('OU dentro do grupo: prata OU ouro', () => {
    expect(passam({ acabamento: ['prata-925', 'ouro'] })).toEqual(['a', 'b', 'c', 'd'])
  })

  it('E entre grupos: (prata OU ouro) E pingente', () => {
    expect(passam({ acabamento: ['prata-925', 'ouro'], tipo: ['pingente'] })).toEqual(['c', 'd'])
  })

  it('sensor: a leitura "E dentro do grupo" reprova na MESMA régua', () => {
    const eDentro = (x: P, sel: FilterSelection) =>
      Object.entries(sel).every(([g, slugs]) => {
        const grupo = CATALOGO.groups.find(gr => gr.slug === g)!
        const ids = CATALOGO.values.filter(v => v.group_id === grupo.id && slugs.includes(v.slug)).map(v => v.id)
        return ids.every(id => x.filter_value_ids.includes(id))
      })
    const sel = { acabamento: ['prata-925', 'ouro'] }
    const ingenuo = BASE.filter(x => eDentro(x, sel)).map(x => x.id)
    expect(ingenuo).not.toEqual(passam(sel))
    expect(ingenuo).toEqual(['d'])
  })

  it('sensor: a leitura "OU entre grupos" também reprova', () => {
    const ouEntre = (x: P) => ['prata', 'pingente'].some(id => x.filter_value_ids.includes(id))
    expect(BASE.filter(ouEntre).map(x => x.id)).not.toEqual(passam({ acabamento: ['prata-925'], tipo: ['pingente'] }))
  })

  it('slug desconhecido (grupo ou valor) é ignorado, nunca zera a lista', () => {
    expect(passam({ cor: ['azul'] })).toHaveLength(6)
    expect(passam({ acabamento: ['nao-existe'] })).toHaveLength(6)
    expect(passam({ acabamento: ['nao-existe', 'ouro'] })).toEqual(['b', 'd'])
  })

  it('grupo inativo não filtra (FLT-09: some da loja)', () => {
    expect(passam({ desligado: ['x'] })).toHaveLength(6)
  })

  it('o slug é procurado no grupo CERTO: o mesmo slug em outro grupo não conta', () => {
    expect(passam({ tipo: ['ouro'] })).toHaveLength(6)
  })

  it('produto sem marcações não passa quando há seleção', () => {
    expect(passam({ tipo: ['anel'] })).toEqual(['a', 'b'])
  })
})

describe('visibleGroups — FLT-21, FLT-22, FLT-37, FLT-41', () => {
  it('só grupos ativos com valor presente, na ordem do painel; valores presentes, na ordem do painel', () => {
    const blocos = visibleGroups(CATALOGO, BASE)
    expect(blocos.map(b => b.group.slug)).toEqual(['acabamento', 'tipo'])
    expect(blocos[0].values.map(v => v.id)).toEqual(['ouro', 'prata'])
    expect(blocos[1].values.map(v => v.id)).toEqual(['anel', 'pingente'])
  })

  it('valor sem produto na base some (rose), e grupo sem nenhum some inteiro (para-quem)', () => {
    const blocos = visibleGroups(CATALOGO, BASE)
    expect(blocos.flatMap(b => b.values.map(v => v.id))).not.toContain('rose')
    expect(blocos.map(b => b.group.slug)).not.toContain('para-quem')
  })

  it('grupo inativo some mesmo com marcação na base', () => {
    expect(visibleGroups(CATALOGO, BASE).map(b => b.group.id)).not.toContain('G-off')
  })

  it('grupo escondido na categoria some; os outros ficam', () => {
    expect(visibleGroups(CATALOGO, BASE, ['G-acab']).map(b => b.group.slug)).toEqual(['tipo'])
  })

  it('a base decide: com outra base, outros valores', () => {
    const blocos = visibleGroups(CATALOGO, [BASE[1]])
    expect(blocos.map(b => [b.group.slug, b.values.map(v => v.id)])).toEqual([
      ['acabamento', ['ouro']],
      ['tipo', ['anel']],
    ])
  })

  it('base vazia: nenhum bloco', () => {
    expect(visibleGroups(CATALOGO, [])).toEqual([])
  })

  it('sem esconder (busca): todos os blocos com valor presente', () => {
    expect(visibleGroups(CATALOGO, BASE, [])).toHaveLength(2)
  })
})

describe('facetCounts — FLT-22, FLT-24', () => {
  it('sem seleção: contagem simples na base', () => {
    const c = facetCounts(CATALOGO, BASE, {})
    expect(c).toMatchObject({ prata: 3, ouro: 2, rose: 0, anel: 2, pingente: 3, mae: 0 })
  })

  it('valor de grupo inativo não entra na conta', () => {
    expect(facetCounts(CATALOGO, BASE, {})).not.toHaveProperty('off-v')
  })

  it('faceta disjuntiva: a seleção do próprio grupo não muda a conta dele; a do outro muda', () => {
    const c = facetCounts(CATALOGO, BASE, { acabamento: ['prata-925'] })
    // acabamento continua contando sobre a base inteira
    expect(c.prata).toBe(3)
    expect(c.ouro).toBe(2)
    // tipo conta só entre os de prata: a (anel), c e d (pingente)
    expect(c.anel).toBe(1)
    expect(c.pingente).toBe(2)
  })

  it('sensor: contar COM a própria seleção daria outro número para ouro', () => {
    const ingenuo = BASE.filter(x => passesSelection(x, { acabamento: ['prata-925'] }, CATALOGO)).filter(x =>
      x.filter_value_ids.includes('ouro'),
    ).length
    expect(ingenuo).toBe(1)
    expect(facetCounts(CATALOGO, BASE, { acabamento: ['prata-925'] }).ouro).not.toBe(ingenuo)
  })

  it('dois grupos com seleção: cada um conta com a seleção do OUTRO', () => {
    const c = facetCounts(CATALOGO, BASE, { acabamento: ['ouro'], tipo: ['anel'] })
    // acabamento, entre os anéis (a, b): prata 1, ouro 1
    expect(c.prata).toBe(1)
    expect(c.ouro).toBe(1)
    // tipo, entre os de ouro (b, d): anel 1, pingente 1
    expect(c.anel).toBe(1)
    expect(c.pingente).toBe(1)
  })

  it('(0) com seleção: valor presente na base que zera com o filtro do outro grupo', () => {
    const c = facetCounts(CATALOGO, BASE, { tipo: ['anel'] }, x => x.price <= 20)
    // a (prata, anel, 10) e b (ouro, anel, 20) passam o sistema; c e d não
    expect(c.prata).toBe(1)
    const semAnel = facetCounts(CATALOGO, BASE, { acabamento: ['ouro'] }, x => x.price >= 30)
    // ≥30 e ouro: só d (pingente) ⇒ anel cai a 0 embora esteja na base
    expect(semAnel.anel).toBe(0)
    expect(semAnel.pingente).toBe(1)
  })

  it('o filtro de sistema entra em toda contagem', () => {
    const c = facetCounts(CATALOGO, BASE, {}, x => x.price > 25)
    expect(c).toMatchObject({ prata: 2, ouro: 1, anel: 0, pingente: 3 })
  })

  it('marcação repetida no produto não conta em dobro', () => {
    const c = facetCounts(CATALOGO, [p('z', 1, 'prata', 'prata')], {})
    expect(c.prata).toBe(1)
  })
})
