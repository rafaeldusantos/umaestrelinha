import { describe, expect, it } from 'vitest'
import {
  FILTER_GROUPS_MAX,
  FILTER_NAME_MAX,
  FILTER_SLUG_TAKEN_REFUSAL,
  FILTER_VALUES_MAX,
  RESERVED_FILTER_KEYS,
  filterSlug,
  groupLimitRefusal,
  groupRefusal,
  isReservedFilterKey,
  valueLimitRefusal,
  valueRefusal,
} from '../rules.ts'

// FLT-03..06 — as recusas do painel. Cada recusa tem caso próprio, e cada régua tem o inverso que
// passa: sem ele, uma função que recusasse tudo seria verde aqui.

const grupo = (id: string, name: string, slug: string) => ({ id, name, slug })
const OUTROS = [grupo('g1', 'Acabamento', 'acabamento'), grupo('g2', 'Tipo de joia', 'tipo-de-joia')]

describe('os números', () => {
  it('nome até 40, 12 grupos, 60 valores', () => {
    expect(FILTER_NAME_MAX).toBe(40)
    expect(FILTER_GROUPS_MAX).toBe(12)
    expect(FILTER_VALUES_MAX).toBe(60)
  })

  it('as chaves reservadas, por extenso', () => {
    expect([...RESERVED_FILTER_KEYS]).toEqual([
      'q',
      'ordem',
      'preco',
      'estoque',
      'desconto',
      'novidades',
      'pagina',
      'gclid',
      'fbclid',
    ])
  })
})

describe('isReservedFilterKey', () => {
  it.each([...RESERVED_FILTER_KEYS])('%s é reservada', k => {
    expect(isReservedFilterKey(k)).toBe(true)
  })

  it('todo prefixo utm_ é reservado', () => {
    expect(isReservedFilterKey('utm_source')).toBe(true)
    expect(isReservedFilterKey('utm_x')).toBe(true)
  })

  it('o inverso: um slug de grupo comum não é reservado, nem um que só CONTÉM a palavra', () => {
    expect(isReservedFilterKey('acabamento')).toBe(false)
    expect(isReservedFilterKey('preco-baixo')).toBe(false)
    expect(isReservedFilterKey('utm')).toBe(false)
    expect(isReservedFilterKey('xutm_a')).toBe(false)
  })
})

describe('filterSlug', () => {
  it('kebab-case sem acento', () => {
    expect(filterSlug('Prata 925')).toBe('prata-925')
    expect(filterSlug('Folheado à ouro')).toBe('folheado-a-ouro')
    expect(filterSlug('Tipo de joia')).toBe('tipo-de-joia')
    expect(filterSlug('  Coração / Ç  ')).toBe('coracao-c')
    expect(filterSlug('Aço—Inoxidável!!')).toBe('aco-inoxidavel')
  })

  it('o que sai casa o formato do check do banco', () => {
    for (const nome of ['Prata 925', 'P', '18K', 'Ouro  branco', '--x--']) {
      expect(filterSlug(nome)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('nome sem letra nem número vira vazio (e a recusa cobra o endereço)', () => {
    expect(filterSlug('!!!')).toBe('')
  })
})

describe('groupRefusal — FLT-03 (nome)', () => {
  it('nome vazio', () => {
    expect(groupRefusal({ name: '   ', slug: 'x' }, OUTROS)).toBe('Dê um nome ao grupo.')
  })

  it('41 caracteres recusa, 40 passa', () => {
    expect(groupRefusal({ name: 'a'.repeat(41), slug: 'x' }, OUTROS)).toBe('O nome pode ter até 40 caracteres.')
    expect(groupRefusal({ name: 'a'.repeat(40), slug: 'x' }, OUTROS)).toBeNull()
  })

  it('conta por ponto de código, como o char_length do banco: 40 acentos passam', () => {
    expect(groupRefusal({ name: 'é'.repeat(40), slug: 'x' }, OUTROS)).toBeNull()
  })

  it('nome repetido sem diferenciar maiúscula e acento', () => {
    expect(groupRefusal({ name: 'ACABAMENTO', slug: 'outro' }, OUTROS)).toBe('Já existe um grupo com este nome.')
    expect(groupRefusal({ name: 'Típo  de Jóia', slug: 'outro' }, OUTROS)).toBe('Já existe um grupo com este nome.')
  })

  it('o inverso: o próprio grupo editado não colide consigo', () => {
    expect(groupRefusal({ id: 'g1', name: 'Acabamento', slug: 'acabamento' }, OUTROS)).toBeNull()
  })
})

describe('groupRefusal — FLT-04 (endereço)', () => {
  it.each([...RESERVED_FILTER_KEYS])('slug reservado %s', k => {
    expect(groupRefusal({ name: 'Novo', slug: k }, OUTROS)).toBe(FILTER_SLUG_TAKEN_REFUSAL)
  })

  it('utm_x recusa pelo motivo reservado, não pelo formato', () => {
    expect(groupRefusal({ name: 'Novo', slug: 'utm_x' }, OUTROS)).toBe(FILTER_SLUG_TAKEN_REFUSAL)
  })

  it('a frase é a da spec', () => {
    expect(FILTER_SLUG_TAKEN_REFUSAL).toBe('Este endereço já é usado pela loja.')
  })

  it('slug repetido de outro grupo', () => {
    expect(groupRefusal({ name: 'Novo', slug: 'acabamento' }, OUTROS)).toBe(FILTER_SLUG_TAKEN_REFUSAL)
  })

  it('slug fora do formato', () => {
    for (const slug of ['Prata', 'prata_925', 'prata--925', '-prata', 'prata-', 'prâta']) {
      expect(groupRefusal({ name: 'Novo', slug }, OUTROS)).toMatch(/só pode ter letras minúsculas/)
    }
  })

  it('slug vazio', () => {
    expect(groupRefusal({ name: 'Novo', slug: ' ' }, OUTROS)).toBe('Dê um endereço no filtro ao grupo.')
  })

  it('o inverso: um grupo novo válido passa', () => {
    expect(groupRefusal({ name: 'Para quem', slug: 'para-quem' }, OUTROS)).toBeNull()
  })
})

describe('FLT-05 — o teto de 12 grupos', () => {
  const onze = Array.from({ length: 11 }, (_, i) => grupo(`g${i}`, `G${i}`, `g${i}`))
  const doze = [...onze, grupo('g11', 'G11', 'g11')]

  it('com 11, o 12º passa; com 12, o 13º recusa', () => {
    expect(groupRefusal({ name: 'Novo', slug: 'novo' }, onze)).toBeNull()
    expect(groupRefusal({ name: 'Novo', slug: 'novo' }, doze)).toBe('A loja aceita até 12 grupos de filtro.')
  })

  it('o teto não recusa EDITAR um dos doze', () => {
    expect(groupRefusal({ id: 'g3', name: 'G3 renomeado', slug: 'g3' }, doze)).toBeNull()
  })

  it('groupLimitRefusal, para o botão "Novo grupo"', () => {
    expect(groupLimitRefusal(11)).toBeNull()
    expect(groupLimitRefusal(12)).toBe('A loja aceita até 12 grupos de filtro.')
  })
})

describe('valueRefusal — FLT-06', () => {
  const IRMAOS = [
    { id: 'v1', name: 'Prata 925', slug: 'prata-925' },
    { id: 'v2', name: 'Folheado a ouro', slug: 'folheado-a-ouro' },
  ]

  it('nome vazio e longo', () => {
    expect(valueRefusal({ name: '', slug: 'x' }, IRMAOS)).toBe('Dê um nome ao valor.')
    expect(valueRefusal({ name: 'a'.repeat(41), slug: 'x' }, IRMAOS)).toBe('O nome pode ter até 40 caracteres.')
  })

  it('nome repetido no grupo, sem maiúscula e acento', () => {
    expect(valueRefusal({ name: 'FOLHEADO À OURO', slug: 'outro' }, IRMAOS)).toBe(
      'Já existe um valor com este nome neste grupo.',
    )
  })

  it('slug repetido dentro do grupo', () => {
    expect(valueRefusal({ name: 'Outro', slug: 'prata-925' }, IRMAOS)).toBe(
      'Este endereço já é usado por outro valor deste grupo.',
    )
  })

  it('o slug do valor NÃO passa pela régua das reservadas — ele vai depois do `=`', () => {
    expect(valueRefusal({ name: 'Preço', slug: 'preco' }, IRMAOS)).toBeNull()
  })

  it('slug fora do formato', () => {
    expect(valueRefusal({ name: 'Outro', slug: 'Ouro_18k' }, IRMAOS)).toMatch(/só pode ter letras minúsculas/)
  })

  it('o 61º valor recusa, o 60º passa, editar um dos 60 passa', () => {
    const cinquentaENove = Array.from({ length: 59 }, (_, i) => ({ id: `v${i}`, name: `V${i}`, slug: `v${i}` }))
    const sessenta = [...cinquentaENove, { id: 'v59', name: 'V59', slug: 'v59' }]
    expect(valueRefusal({ name: 'Novo', slug: 'novo' }, cinquentaENove)).toBeNull()
    expect(valueRefusal({ name: 'Novo', slug: 'novo' }, sessenta)).toBe('Um grupo aceita até 60 valores.')
    expect(valueRefusal({ id: 'v7', name: 'V7b', slug: 'v7' }, sessenta)).toBeNull()
    expect(valueLimitRefusal(59)).toBeNull()
    expect(valueLimitRefusal(60)).toBe('Um grupo aceita até 60 valores.')
  })

  it('o inverso: valor novo válido passa, e o próprio valor editado não colide consigo', () => {
    expect(valueRefusal({ name: 'Ouro 18k', slug: 'ouro-18k' }, IRMAOS)).toBeNull()
    expect(valueRefusal({ id: 'v1', name: 'Prata 925', slug: 'prata-925' }, IRMAOS)).toBeNull()
  })
})
