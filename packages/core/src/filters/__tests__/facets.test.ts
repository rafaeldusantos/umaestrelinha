import { describe, expect, it } from 'vitest'
import { facetCounts, passesSelection, visibleGroups } from '../facets.ts'
import type { FilterCatalog, FilterSelection, FilterableProduct } from '../types.ts'
import type { FilterableVariant, OptionMark } from '../types.ts'

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

// -------------------------------------------------------------------------------------------
// Feature 67 — as variações. Tudo daqui para baixo é ACRÉSCIMO: os casos acima são da 66 e não
// mudaram uma linha, e são eles a régua de que a troca de algoritmo não mexeu em quem não tem
// marcação por opção.
// -------------------------------------------------------------------------------------------

type V67 = FilterableVariant & { price: number | null; stock: number }
type P67 = FilterableProduct<V67> & { id: string; price: number }

const va = (id: string, option_values: Record<string, string>, extra: Partial<V67> = {}): V67 => ({
  id,
  option_values,
  is_active: true,
  position: 0,
  price: null,
  stock: 1,
  ...extra,
})
const mk = (option_name: string, option_value: string, value_id: string): OptionMark => ({ option_name, option_value, value_id })

// q1: prata em pingente, ouro em anel (a variação cruzada da 67);
// q2: três variações de prata (letras), sem marcação na peça toda;
// q3: marcação por opção sem NENHUMA variação ativa com aquele texto;
// q4: prata na peça toda, pingente por opção.
const BASE67: P67[] = [
  {
    id: 'q1',
    price: 10,
    filter_value_ids: [],
    option_marks: [mk('Cor', 'Prata', 'prata'), mk('Cor', 'Dourado', 'ouro'), mk('Tipo', 'Pingente', 'pingente'), mk('Tipo', 'Anel', 'anel')],
    variants: [va('q1-pp', { Cor: 'Prata', Tipo: 'Pingente' }), va('q1-da', { Cor: 'Dourado', Tipo: 'Anel' }, { position: 1 })],
  },
  {
    id: 'q2',
    price: 20,
    filter_value_ids: [],
    option_marks: [mk('Cor', 'Prata', 'prata')],
    variants: ['A', 'B', 'C'].map((l, i) => va(`q2-${l}`, { Cor: 'Prata', Letra: l }, { position: i })),
  },
  {
    id: 'q3',
    price: 30,
    filter_value_ids: [],
    option_marks: [mk('Cor', 'Rosé', 'rose')],
    variants: [va('q3-off', { Cor: 'Rosé' }, { is_active: false }), va('q3-on', { Cor: 'Prata' })],
  },
  {
    id: 'q4',
    price: 40,
    filter_value_ids: ['prata'],
    option_marks: [mk('Tipo', 'Pingente', 'pingente')],
    variants: [va('q4-anel', { Tipo: 'Anel' }), va('q4-ping', { Tipo: 'Pingente' }, { position: 1 })],
  },
]

const passam67 = (sel: FilterSelection) => BASE67.filter(x => passesSelection(x, sel, CATALOGO)).map(x => x.id)

describe('passesSelection — VFL-09, delegando a matchProduct', () => {
  it('por opção: prata passa q1, q2 e q4 (este pela peça toda)', () => {
    expect(passam67({ acabamento: ['prata-925'] })).toEqual(['q1', 'q2', 'q4'])
  })

  it('prata + anel: q1 tem os dois, mas em variações diferentes, e NÃO passa', () => {
    expect(passam67({ acabamento: ['prata-925'], tipo: ['anel'] })).toEqual([])
  })

  it('prata + pingente: q1 (mesma variação) e q4 (prata na peça toda, pingente na opção)', () => {
    expect(passam67({ acabamento: ['prata-925'], tipo: ['pingente'] })).toEqual(['q1', 'q4'])
  })

  it('marcação por opção sem variação ativa não faz passar', () => {
    expect(passam67({ acabamento: ['rose'] })).toEqual([])
  })

  it('o filtro de sistema da variação entra quando passado', () => {
    const opts = { variantPass: (v: V67, p: P67) => (v.price ?? p.price) < 15 }
    expect(BASE67.filter(x => passesSelection(x, { acabamento: ['prata-925'] }, CATALOGO, opts)).map(x => x.id)).toEqual(['q1', 'q4'])
  })
})

describe('visibleGroups — a marcação por opção com variação ativa acende o valor', () => {
  it('rose (só em q3, sem variação ativa) não aparece; prata, ouro, anel e pingente aparecem', () => {
    const blocos = visibleGroups(CATALOGO, BASE67)
    expect(blocos.map(b => [b.group.slug, b.values.map(v => v.id)])).toEqual([
      ['acabamento', ['ouro', 'prata']],
      ['tipo', ['anel', 'pingente']],
    ])
  })

  it('a mesma peça, com a variação de rosé reativada, acende rosé', () => {
    const q3 = { ...BASE67[2], variants: [va('q3-on', { Cor: 'Rosé' })] }
    expect(visibleGroups(CATALOGO, [q3])[0].values.map(v => v.id)).toEqual(['rose'])
  })
})

describe('facetCounts — VFL-15, peças pela mesma regra', () => {
  it('a peça conta UMA vez, por mais variações que casem (q2 tem três de prata)', () => {
    expect(facetCounts(CATALOGO, [BASE67[1]], {}).prata).toBe(1)
  })

  it('sem seleção: cada valor conta as peças que o vendem, na peça toda ou por opção ativa', () => {
    expect(facetCounts(CATALOGO, BASE67, {})).toMatchObject({ prata: 3, ouro: 1, rose: 0, anel: 1, pingente: 2 })
  })

  it('faceta disjuntiva com a MESMA variação: com prata selecionado, anel conta 0 (q1 vende anel só em dourado)', () => {
    const c = facetCounts(CATALOGO, BASE67, { acabamento: ['prata-925'] })
    expect(c.anel).toBe(0)
    expect(c.pingente).toBe(2)
    // o próprio grupo continua contando sobre a base inteira
    expect(c.prata).toBe(3)
    expect(c.ouro).toBe(1)
  })

  it('sensor: o atalho da 66 ("uma falha só ⇒ conta no grupo que falhou") daria 1 para anel', () => {
    const atalho66 = BASE67.filter(p => {
      const soma = new Set([...p.filter_value_ids, ...(p.option_marks ?? []).map(x => x.value_id)])
      return soma.has('prata') && soma.has('anel')
    }).length
    expect(atalho66).toBe(1)
    expect(facetCounts(CATALOGO, BASE67, { acabamento: ['prata-925'] }).anel).not.toBe(atalho66)
  })

  it('o sistema da variação entra na conta: só variações abaixo de 15 contam', () => {
    const c = facetCounts(CATALOGO, BASE67, {}, {
      productPass: p => p.price < 15,
      variantPass: (v, p) => (v.price ?? p.price) < 15,
    })
    // q1 (10) entra; q2 (20), q4 (40) não; q3 não tem nada ativo marcado
    expect(c).toMatchObject({ prata: 1, ouro: 1, anel: 1, pingente: 1 })
  })

  it('a função da 66 continua aceita no quarto argumento, e vale para a variação também', () => {
    const c = facetCounts(CATALOGO, BASE67, {}, p => p.price < 15)
    expect(c).toMatchObject({ prata: 1, ouro: 1, anel: 1, pingente: 1 })
  })
})

describe('propriedade — sem `option_marks`, o algoritmo novo é o da 66', () => {
  /** O facetCounts da 66, guardado AQUI como referência — e só aqui. */
  const facetCounts66 = (catalog: FilterCatalog, base: readonly P[], selection: FilterSelection, systemPass: (x: P) => boolean) => {
    const ativos = new Set(catalog.groups.filter(g => g.is_active).map(g => g.id))
    const grupoDoValor = new Map<string, string>()
    const counts: Record<string, number> = {}
    for (const v of catalog.values) {
      if (!ativos.has(v.group_id)) continue
      grupoDoValor.set(v.id, v.group_id)
      counts[v.id] = 0
    }
    const selecao = new Map<string, Set<string>>()
    for (const [gs, vs] of Object.entries(selection)) {
      const g = catalog.groups.find(x => x.slug === gs && x.is_active)
      if (!g || !vs.length) continue
      const ids = new Set(catalog.values.filter(v => v.group_id === g.id && vs.includes(v.slug)).map(v => v.id))
      if (ids.size) selecao.set(g.id, ids)
    }
    for (const p of base) {
      if (!systemPass(p)) continue
      const falhos = [...selecao].filter(([, ids]) => !p.filter_value_ids.some(id => ids.has(id))).map(([g]) => g)
      if (falhos.length > 1) continue
      for (const id of new Set(p.filter_value_ids)) {
        const g = grupoDoValor.get(id)
        if (g === undefined) continue
        if (falhos.length === 0 || falhos[0] === g) counts[id] += 1
      }
    }
    return counts
  }

  /** Gerador determinístico (LCG): a mesma semente dá as mesmas fixtures em toda execução. */
  const gerador = (semente: number) => () => {
    semente = (semente * 1103515245 + 12345) % 2 ** 31
    return semente / 2 ** 31
  }

  const IDS = CATALOGO.values.map(v => v.id)
  const SLUGS: Record<string, string[]> = {
    acabamento: ['prata-925', 'ouro', 'rose', 'nao-existe'],
    tipo: ['anel', 'pingente'],
    desligado: ['x'],
    'para-quem': ['mae'],
  }

  it('200 bases × seleção aleatória: contagens e quem passa idênticos', () => {
    const r = gerador(67)
    let comparadas = 0
    for (let rodada = 0; rodada < 200; rodada++) {
      const base: P[] = Array.from({ length: 1 + Math.floor(r() * 12) }, (_, i) =>
        p(`g${i}`, Math.floor(r() * 100), ...IDS.filter(() => r() < 0.3)),
      )
      const sel: FilterSelection = {}
      for (const [g, vs] of Object.entries(SLUGS)) {
        const escolhidos = vs.filter(() => r() < 0.35)
        if (escolhidos.length) sel[g] = escolhidos
      }
      const corte = Math.floor(r() * 100)
      const sys = (x: P) => x.price >= corte
      expect(facetCounts(CATALOGO, base, sel, sys)).toEqual(facetCounts66(CATALOGO, base, sel, sys))
      comparadas++
    }
    // âncora: o laço rodou de verdade
    expect(comparadas).toBe(200)
  })

  it('sensor: a referência não é o algoritmo novo — com option_marks elas divergem', () => {
    const base = BASE67 as unknown as P[]
    const sel = { acabamento: ['prata-925'] }
    expect(facetCounts(CATALOGO, base, sel)).not.toEqual(facetCounts66(CATALOGO, base, sel, () => true))
  })
})
