import { describe, expect, it } from 'vitest'
import { productPath } from '../../routes/routes.ts'
import { publicVariantId } from '../../shopping/identity.ts'
import { representativeVariant, resolveOffer } from '../../shopping/offer.ts'
import {
  indexableOptions,
  optionRepresentative,
  publicOptionMarks,
  resolveVariantPage,
  type OptionMarkRow,
} from '../variant.ts'

/**
 * Feature 68 — SVR-01..07 e SVR-20: a regra de quais opções da peça têm página própria.
 *
 * A fixture é a "Pingente Pata" da spec (Independent Test): três cores, só Prata 925 e Rosé marcadas,
 * e o eixo `Tamanho` TAMBÉM marcado — para provar que o segundo eixo não gera página.
 */

const ORIGEM = 'https://umaestrelinha.com.br'
const PRATA = 'Prata 925'
const OURO = 'Prata 925 Folheado a Ouro'
const ROSE = 'Prata 925 Folheado a Ouro Rose'

const marca = (option_name: string, option_value: string, value_id = 'v-1') => ({
  option_name,
  option_value,
  value_id,
})

const peca = {
  id: 'p-pata',
  nuvemshop_id: 300100200,
  name: 'Pingente Afetivo Pata com Cinzas de Cremação',
  slug: 'pingente-afetivo-pata-com-cinzas-de-cremacao',
  description: '<p>Pingente feito à mão.</p>',
  images: [{ url: 'https://cdn/pata.jpg' }],
  is_active: true,
  stock_policy: 'track' as const,
  options: [
    { name: 'Cor', values: [PRATA, OURO, ROSE], position: 0 },
    { name: 'Tamanho', values: ['P', 'M'], position: 1 },
  ],
  option_marks: [marca('Cor', PRATA, 'prata'), marca('Cor', ROSE, 'rose'), marca('Tamanho', 'P', 'pequeno')],
}

let seq = 0
const variacao = (cor: string, tamanho: string, position: number, extra: Record<string, unknown> = {}) => ({
  id: `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`,
  nuvemshop_id: 1300000000 + position,
  price: 120,
  compare_price: null,
  stock: 3,
  image_url: null,
  is_active: true,
  position,
  option_values: { Cor: cor, Tamanho: tamanho },
  ...extra,
})

const grade = [
  variacao(PRATA, 'P', 0),
  variacao(PRATA, 'M', 1),
  variacao(OURO, 'P', 2),
  variacao(OURO, 'M', 3),
  variacao(ROSE, 'P', 4),
  variacao(ROSE, 'M', 5),
]
const entrada = { product: peca, variants: grade }

describe('indexableOptions — SVR-01..03 (fixture "Pingente Pata")', () => {
  it('duas opções no eixo Cor, nenhuma em Tamanho', () => {
    const opcoes = indexableOptions(entrada)
    expect(opcoes.map(o => [o.axis, o.text])).toEqual([
      ['Cor', PRATA],
      ['Cor', ROSE],
    ])
  })

  it('SVR-05: o caminho de cada opção é o <g:link> que resolveOffer produz para a representante, sem a origem', () => {
    for (const o of indexableOptions(entrada)) {
      expect(`${ORIGEM}${o.path}`).toBe(resolveOffer(peca, o.variant, { origin: ORIGEM }).link)
      expect(o.path).toBe(`${productPath(peca.slug)}?variant=${publicVariantId(o.variant)}`)
    }
  })

  it('SVR-01: a ordem é a dos textos em options daquele eixo, não a das marcações', () => {
    const invertida = { ...peca, option_marks: [...peca.option_marks].reverse() }
    expect(indexableOptions({ product: invertida, variants: grade }).map(o => o.text)).toEqual([PRATA, ROSE])
  })

  it('SVR-01: a ordem é a de options.values MESMO quando a grade discorda dela', () => {
    // As duas fixtures acima têm `values` e grade na MESMA ordem, e por isso não distinguem "ordena
    // por values" de "ordena pela grade" (mutante M11 da verificação, rodada 1). Aqui a grade começa
    // pela Prata e `values` começa pela Rose: só a régua de SVR-01 devolve Rose primeiro.
    const roseAntes = { ...peca, options: [{ name: 'Cor', values: [ROSE, OURO, PRATA], position: 0 }, peca.options[1]] }
    expect(grade[0].option_values.Cor).toBe(PRATA)
    expect(indexableOptions({ product: roseAntes, variants: grade }).map(o => o.text)).toEqual([ROSE, PRATA])
  })

  it('texto da grade ausente de options.values vai ao fim, na ordem da grade', () => {
    const semRose = { ...peca, options: [{ name: 'Cor', values: [OURO, PRATA], position: 0 }, peca.options[1]] }
    expect(indexableOptions({ product: semRose, variants: grade }).map(o => o.text)).toEqual([PRATA, ROSE])
  })

  it('SVR-02: os eixos seguem options.position, não a ordem do array', () => {
    const tamanhoPrimeiro = {
      ...peca,
      options: [
        { name: 'Tamanho', values: ['P', 'M'], position: 0 },
        { name: 'Cor', values: [PRATA, OURO, ROSE], position: 1 },
      ].reverse(),
    }
    expect(indexableOptions({ product: tamanhoPrimeiro, variants: grade }).map(o => [o.axis, o.text])).toEqual([
      ['Tamanho', 'P'],
    ])
  })

  it('SVR-02: um eixo com um texto só entre as elegíveis não gera página — o próximo eixo marcado gera', () => {
    const umaCor = grade.filter(v => v.option_values.Cor === PRATA)
    expect(indexableOptions({ product: peca, variants: umaCor }).map(o => [o.axis, o.text])).toEqual([
      ['Tamanho', 'P'],
    ])
  })

  it('SVR-02: eixo sem marcação é pulado; o primeiro eixo COM marcação é o indexável', () => {
    const soTamanho = { ...peca, option_marks: [marca('Tamanho', 'M')] }
    expect(indexableOptions({ product: soTamanho, variants: grade }).map(o => [o.axis, o.text])).toEqual([
      ['Tamanho', 'M'],
    ])
  })

  it('SVR-03: comparação exata — caixa ou espaço diferente não é marcação', () => {
    const quase = { ...peca, option_marks: [marca('Cor', 'prata 925'), marca('Cor ', ROSE), marca('cor', OURO)] }
    expect(indexableOptions({ product: quase, variants: grade })).toEqual([])
  })

  it('edge case: texto marcado que só existe em variações inativas ou sem preço não tem página', () => {
    const roseFora = grade.map(v =>
      v.option_values.Cor !== ROSE ? v : v.option_values.Tamanho === 'P' ? { ...v, is_active: false } : { ...v, price: null },
    )
    expect(indexableOptions({ product: peca, variants: roseFora }).map(o => o.text)).toEqual([PRATA])
  })

  it('edge case: dois textos com o MESMO valor de filtro são duas páginas, com representantes distintas', () => {
    const minusculo = 'Prata 925 folheado a ouro'
    const grade2 = [...grade, variacao(minusculo, 'P', 6)]
    const p = {
      ...peca,
      options: [{ name: 'Cor', values: [PRATA, OURO, ROSE, minusculo], position: 0 }],
      option_marks: [marca('Cor', OURO, 'folheado'), marca('Cor', minusculo, 'folheado')],
    }
    const opcoes = indexableOptions({ product: p, variants: grade2 })
    expect(opcoes.map(o => o.text)).toEqual([OURO, minusculo])
    expect(opcoes[0].variant).not.toBe(opcoes[1].variant)
    expect(opcoes[0].path).not.toBe(opcoes[1].path)
  })

  it('várias marcações do mesmo texto (Prata 925 E Folheado) são uma opção só', () => {
    const dupla = { ...peca, option_marks: [marca('Cor', PRATA, 'a'), marca('Cor', PRATA, 'b')] }
    expect(indexableOptions({ product: dupla, variants: grade }).map(o => o.text)).toEqual([PRATA])
  })
})

describe('indexableOptions — SVR-06 (lista vazia)', () => {
  it('peça sem eixo', () => {
    expect(indexableOptions({ product: { ...peca, options: [] }, variants: grade })).toEqual([])
    expect(indexableOptions({ product: { ...peca, options: null }, variants: grade })).toEqual([])
  })

  it('peça sem marcação (ausente, nula ou vazia)', () => {
    const { option_marks: _, ...semCampo } = peca
    expect(indexableOptions({ product: semCampo, variants: grade })).toEqual([])
    expect(indexableOptions({ product: { ...peca, option_marks: null }, variants: grade })).toEqual([])
    expect(indexableOptions({ product: { ...peca, option_marks: [] }, variants: grade })).toEqual([])
  })

  it('só marcação de grupo inativo (passada por publicOptionMarks)', () => {
    const linhas: OptionMarkRow[] = [
      { ...marca('Cor', PRATA), filter_values: { filter_groups: { is_active: false } } },
    ]
    expect(indexableOptions({ product: { ...peca, option_marks: publicOptionMarks(linhas) }, variants: grade })).toEqual([])
  })

  it('peça desativada: nenhuma variação é elegível', () => {
    expect(indexableOptions({ product: { ...peca, is_active: false }, variants: grade })).toEqual([])
  })
})

describe('optionRepresentative — SVR-04', () => {
  it('é a de menor position entre as elegíveis com o texto', () => {
    expect(optionRepresentative(entrada, 'Cor', ROSE)).toBe(grade[4])
  })

  it('o ESTOQUE não participa — onde representativeVariant escolheria outra', () => {
    const esgotada = grade.map(v => (v === grade[0] ? { ...v, stock: 0 } : v))
    const soPrata = esgotada.filter(v => v.option_values.Cor === PRATA)
    // A régua da peça prefere a com estoque (a M, position 1)...
    expect(representativeVariant(peca, soPrata)).toBe(soPrata[1])
    // ...a da opção fica na primeira da grade, esgotada ou não.
    expect(optionRepresentative({ product: peca, variants: esgotada }, 'Cor', PRATA)).toBe(esgotada[0])
    expect(indexableOptions({ product: peca, variants: esgotada })[0].variant).toBe(esgotada[0])
  })

  it('empate de position decide pelo publicVariantId crescente (código de caractere), na ordem que for', () => {
    const a = variacao(PRATA, 'P', 9, { nuvemshop_id: 1500 })
    const b = variacao(PRATA, 'M', 9, { nuvemshop_id: 1499 })
    for (const variants of [[a, b], [b, a]]) {
      expect(optionRepresentative({ product: peca, variants }, 'Cor', PRATA)).toBe(b)
    }
    // por código de caractere, '20' vem antes de '3' — a régua é de string, estável em qualquer runtime
    const c = variacao(PRATA, 'P', 9, { nuvemshop_id: 3 })
    const d = variacao(PRATA, 'M', 9, { nuvemshop_id: 20 })
    expect(optionRepresentative({ product: peca, variants: [c, d] }, 'Cor', PRATA)).toBe(d)
  })

  it('edge case: representante desativada ⇒ a próxima vira a representante', () => {
    const semPrimeira = grade.map(v => (v === grade[0] ? { ...v, is_active: false } : v))
    expect(optionRepresentative({ product: peca, variants: semPrimeira }, 'Cor', PRATA)).toBe(semPrimeira[1])
  })

  it('edge case: variação sem nuvemshop_id ⇒ o ?variant= canônico usa o UUID e continua igual ao <g:link>', () => {
    const local = grade.map(v => (v === grade[0] ? { ...v, nuvemshop_id: null } : v))
    const [prata] = indexableOptions({ product: peca, variants: local })
    expect(prata.path).toBe(`${productPath(peca.slug)}?variant=${grade[0].id}`)
    expect(`${ORIGEM}${prata.path}`).toBe(resolveOffer(peca, prata.variant, { origin: ORIGEM }).link)
  })
})

describe('resolveVariantPage — SVR-07', () => {
  it('a representante resolve para opção', () => {
    const r = resolveVariantPage(entrada, String(grade[4].nuvemshop_id))
    expect(r.kind).toBe('option')
    if (r.kind === 'option') {
      expect(r.option.text).toBe(ROSE)
      expect(r.opened).toBe(grade[4])
    }
  })

  it('uma NÃO representante do texto indexável resolve para a MESMA opção, abrindo nela', () => {
    const r = resolveVariantPage(entrada, String(grade[5].nuvemshop_id))
    expect(r.kind).toBe('option')
    if (r.kind === 'option') {
      expect(r.option.variant).toBe(grade[4])
      expect(r.opened).toBe(grade[5])
    }
  })

  it('texto não indexável (cor sem marcação) ⇒ peça, abrindo na pedida', () => {
    expect(resolveVariantPage(entrada, String(grade[2].nuvemshop_id))).toEqual({ kind: 'product', opened: grade[2] })
  })

  it('texto marcado de um eixo que NÃO é o indexável (Tamanho P) ⇒ peça — o texto de Cor decide', () => {
    // grade[2] é Ouro/P: Tamanho P está marcado, mas o eixo indexável é Cor, e Ouro não é marcado
    expect(resolveVariantPage(entrada, String(grade[2].nuvemshop_id)).kind).toBe('product')
  })

  it.each([
    ['ausente', undefined],
    ['nulo', null],
    ['vazio', ''],
    ['só espaço', '   '],
    ['desconhecido', '999'],
  ])('%s ⇒ peça, sem variação aberta', (_n, param) => {
    expect(resolveVariantPage(entrada, param as string | null | undefined)).toEqual({ kind: 'product', opened: null })
  })

  it('de variação inelegível (inativa ou sem preço) ⇒ peça, sem variação aberta', () => {
    const inativa = grade.map(v => (v === grade[5] ? { ...v, is_active: false } : v))
    expect(resolveVariantPage({ product: peca, variants: inativa }, String(grade[5].nuvemshop_id))).toEqual({
      kind: 'product',
      opened: null,
    })
    const semPreco = grade.map(v => (v === grade[5] ? { ...v, price: null } : v))
    expect(resolveVariantPage({ product: peca, variants: semPreco }, String(grade[5].nuvemshop_id)).kind).toBe(
      'product',
    )
  })

  it('de outra peça ⇒ peça (o id não está nas variações desta)', () => {
    const outra = variacao(PRATA, 'P', 0, { nuvemshop_id: 777 })
    expect(resolveVariantPage(entrada, String(outra.nuvemshop_id))).toEqual({ kind: 'product', opened: null })
  })

  it('edge case: UUID de uma variação que tem nuvemshop_id abre nela, e a canônica é a do publicVariantId', () => {
    const r = resolveVariantPage(entrada, grade[5].id)
    expect(r.kind).toBe('option')
    if (r.kind === 'option') {
      expect(r.opened).toBe(grade[5])
      expect(r.option.path).toContain(`?variant=${grade[4].nuvemshop_id}`)
    }
  })

  it('edge case: ?variant= repetido ⇒ vale o primeiro (URLSearchParams.get)', () => {
    const q = new URLSearchParams(`variant=${grade[4].nuvemshop_id}&variant=${grade[2].nuvemshop_id}`)
    const r = resolveVariantPage(entrada, q.get('variant'))
    expect(r.kind).toBe('option')
  })

  it('peça sem opção indexável ⇒ toda variação elegível resolve para peça', () => {
    const r = resolveVariantPage({ product: { ...peca, option_marks: [] }, variants: grade }, String(grade[0].nuvemshop_id))
    expect(r).toEqual({ kind: 'product', opened: grade[0] })
  })
})

describe('publicOptionMarks — SVR-20 (a restrição da RLS para quem lê com a chave de serviço)', () => {
  const linha = (is_active: boolean | null | undefined, option_value = PRATA): OptionMarkRow => ({
    ...marca('Cor', option_value),
    filter_values: { filter_groups: { is_active } },
  })

  it('passa só a marcação de grupo ATIVO, sem o embed', () => {
    expect(publicOptionMarks([linha(true), linha(false, ROSE)])).toEqual([marca('Cor', PRATA)])
  })

  it('grupo ausente, nulo ou sem is_active não é ativo', () => {
    expect(
      publicOptionMarks([
        linha(null),
        linha(undefined),
        { ...marca('Cor', PRATA), filter_values: null },
        { ...marca('Cor', PRATA), filter_values: { filter_groups: null } },
        marca('Cor', PRATA),
      ]),
    ).toEqual([])
  })

  it('entrada nula ⇒ lista vazia', () => {
    expect(publicOptionMarks(null)).toEqual([])
  })

  it('grupo desligado tira a página da opção (o ramo de SVR-29 que depende do servidor)', () => {
    const p = { ...peca, option_marks: publicOptionMarks([linha(true), linha(false, ROSE)]) }
    expect(indexableOptions({ product: p, variants: grade }).map(o => o.text)).toEqual([PRATA])
    expect(resolveVariantPage({ product: p, variants: grade }, String(grade[4].nuvemshop_id)).kind).toBe('product')
  })
})
