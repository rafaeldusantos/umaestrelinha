import { describe, expect, it } from 'vitest'

import { escapeSearchTerm } from '../../paging/pageMath.ts'
import {
  APP_CUSTOMER_SEARCH,
  CUSTOMER_SEARCH_COLUMNS,
  CUSTOMER_SEARCH_DEBOUNCE_MS,
  buildAppCustomerSearch,
  buildCustomerSearchCondition,
} from '../search.ts'

/** CÓPIA LITERAL da função do painel antes da `76` (`customerQuery.ts`). O que se compara é o byte. */
const COLUNAS_ANTIGAS = ['name', 'email', 'phone', 'cpf'] as const
const funcaoAntiga = (search: string): string | null => {
  const term = escapeSearchTerm(search)
  if (term === '') return null
  return COLUNAS_ANTIGAS.map((c) => `${c}.ilike.%${term}%`).join(',')
}

describe('sem opts: a saída é a de hoje do painel, caractere a caractere (MAC-25)', () => {
  const termos = ['maria', '  maria  ', 'Maria (Souza)', 'a,b', '', '   ', '()', '100%', 'a_b', 'a\\b', '"x"', '(51) 99812-4471', 'joão']
  it.each(termos)('termo %j', (t) => {
    expect(buildCustomerSearchCondition(t)).toBe(funcaoAntiga(t))
  })

  it('as colunas e o debounce são os de sempre', () => {
    expect([...CUSTOMER_SEARCH_COLUMNS]).toEqual(['name', 'email', 'phone', 'cpf'])
    expect(CUSTOMER_SEARCH_DEBOUNCE_MS).toBe(300)
  })

  it('saída por extenso', () => {
    expect(buildCustomerSearchCondition('Maria (S)')).toBe(
      'name.ilike.%Maria  S%,email.ilike.%Maria  S%,phone.ilike.%Maria  S%,cpf.ilike.%Maria  S%',
    )
  })
})

describe('o app: três colunas, valor entre aspas, literal (MAC-06)', () => {
  it('configuração', () => {
    expect(APP_CUSTOMER_SEARCH).toEqual({ columns: ['name', 'email', 'phone'], literal: true, phoneDigits: true })
  })

  it('termo simples', () => {
    expect(buildAppCustomerSearch('Maria')).toBe('name.ilike."%Maria%",email.ilike."%Maria%",phone.ilike."%Maria%"')
  })

  it('não busca CPF', () => {
    expect(buildAppCustomerSearch('Maria')).not.toContain('cpf')
  })

  it('( ) , ficam literais, nunca viram espaço', () => {
    expect(buildAppCustomerSearch('Ana (b, c)')).toBe(
      'name.ilike."%Ana (b, c)%",email.ilike."%Ana (b, c)%",phone.ilike."%Ana (b, c)%"',
    )
  })

  it('% _ \\ e " chegam como literais', () => {
    expect(buildAppCustomerSearch('100%')).toContain('name.ilike."%100\\\\%%"')
    expect(buildAppCustomerSearch('a_b')).toContain('name.ilike."%a\\\\_b%"')
    expect(buildAppCustomerSearch('a\\b')).toContain('name.ilike."%a\\\\\\\\b%"')
    expect(buildAppCustomerSearch('"x"')).toContain('name.ilike."%\\"x\\"%"')
  })

  it('o asterisco vira "_" (decisão do probe da T02: o PostgREST não deixa o * literal chegar)', () => {
    expect(buildAppCustomerSearch('star*x')).toBe(
      'name.ilike."%star_x%",email.ilike."%star_x%",phone.ilike."%star_x%"',
    )
  })

  it('termo vazio e só de espaços ⇒ null (sem busca)', () => {
    expect(buildAppCustomerSearch('')).toBeNull()
    expect(buildAppCustomerSearch('    ')).toBeNull()
    expect(buildAppCustomerSearch(undefined as unknown as string)).toBeNull()
  })

  it('o termo é aparado', () => {
    expect(buildAppCustomerSearch('  Maria ')).toBe(buildAppCustomerSearch('Maria'))
  })

  it('"()" é um termo válido no app (literal), e vazio no painel de hoje', () => {
    expect(buildAppCustomerSearch('()')).toContain('name.ilike."%()%"')
    expect(buildCustomerSearchCondition('()')).toBeNull()
  })
})

describe('telefone por dígitos (A14)', () => {
  const lit = (t: string) => `name.ilike."%${t}%",email.ilike."%${t}%",phone.ilike."%${t}%"`

  it('"(51) 99812-4471" acha o telefone gravado como 51998124471', () => {
    expect(buildAppCustomerSearch('(51) 99812-4471')).toBe(`${lit('(51) 99812-4471')},phone.ilike."%51998124471%"`)
  })

  it('só dígitos: a condição de telefone já é a literal, sem duplicar', () => {
    expect(buildAppCustomerSearch('51998124471')).toBe(lit('51998124471'))
    expect(buildAppCustomerSearch('99812')).toBe(lit('99812'))
  })

  it('"+55 51 99812-4471" busca pelos dois: com e sem o 55', () => {
    expect(buildAppCustomerSearch('+55 51 99812-4471')).toBe(
      `${lit('+55 51 99812-4471')},phone.ilike."%5551998124471%",phone.ilike."%51998124471%"`,
    )
  })

  it('"55" no começo mas curto (menos de 12 dígitos) NÃO é DDI', () => {
    expect(buildAppCustomerSearch('55 5199')).toBe(`${lit('55 5199')},phone.ilike."%555199%"`)
  })

  it('falso positivo: "joao2", "a1b2" e "ana 51" NÃO viram busca por telefone', () => {
    for (const t of ['joao2', 'a1b2', 'ana 51']) expect(buildAppCustomerSearch(t)).toBe(lit(t))
  })

  it('pontuação sem dígito (".", "-", "()") não vira telefone', () => {
    expect(buildAppCustomerSearch('-')).toBe(lit('-'))
    expect(buildAppCustomerSearch('+')).toBe(lit('+'))
  })

  it('só liga com phoneDigits: a busca literal sozinha não acrescenta', () => {
    expect(buildCustomerSearchCondition('51998124471', { columns: ['name'], literal: true })).toBe('name.ilike."%51998124471%"')
  })
})

// Conserto do QA — `BUG-20261024-busca-nao-acha-colada-com-espaco-duplo-ou-nbsp` e
// `BUG-20261024-busca-nao-acha-email-colado-com-sinais`: o que se COLA de uma conversa ou de um
// cabeçalho de e-mail chega sujo. A limpeza é só do app (`buildAppCustomerSearch`); o painel (sem
// opts) segue caractere a caractere.
describe('o que se cola: limparTermoColado e a busca do app', () => {
  const nome = (s: string) => buildAppCustomerSearch(s)
  const UM_ESPACO = buildAppCustomerSearch('Marina Albuquerque')

  it('espaço duplo e espaço não separável (U+00A0) valem um espaço', () => {
    expect(nome('Marina  Albuquerque')).toBe(UM_ESPACO)
    expect(nome('Marina Albuquerque')).toBe(UM_ESPACO)
    expect(nome('Marina   \t Albuquerque')).toBe(UM_ESPACO)
    expect(nome('  Marina Albuquerque ')).toBe(UM_ESPACO)
  })

  it('caractere invisível (largura zero, BOM) some', () => {
    expect(nome('Mari​na Albuquerque﻿')).toBe(UM_ESPACO)
  })

  it.each(['\u200B', '\u200C', '\u200D', '\u2060', '\uFEFF'])('cada caractere invisível some, inclusive U+%#: %j', (c) => {
    expect(nome(`Mari${c}na Albuquerque${c}`)).toBe(UM_ESPACO)
  })

  it.each([
    'celular',
    'cel',
    'telefone',
    'tel',
    'fone',
    'whats app',
    'whatsapp',
    'whats',
    'zap',
    'wpp',
    'WPP',
    'Zap:',
  ])('cada rótulo da lista fechada cai antes do telefone: %j', (rotulo) => {
    const c = nome(`${rotulo} 51 99812-4471`)
    expect(c).toContain('phone.ilike."%51998124471%"')
    expect(c).not.toMatch(new RegExp(`%${rotulo.replace(':', '')}`, 'i'))
  })

  it.each(['!', '?', ':', ';', ')', ']', '>', '.', '!!', '?!'])('a pontuação final %j não entra no e-mail', (p) => {
    expect(nome(`p76.telefone@exemplo.invalid${p}`)).toBe(buildAppCustomerSearch('p76.telefone@exemplo.invalid'))
  })

  it('o e-mail entre aspas acha como o e-mail puro', () => {
    expect(nome('"p76.telefone@exemplo.invalid"')).toBe(buildAppCustomerSearch('p76.telefone@exemplo.invalid'))
    expect(nome("'p76.telefone@exemplo.invalid'")).toBe(buildAppCustomerSearch('p76.telefone@exemplo.invalid'))
  })

  it('o termo limpo continua literal: o que não é espaço não muda', () => {
    expect(UM_ESPACO).toBe(
      'name.ilike."%Marina Albuquerque%",email.ilike."%Marina Albuquerque%",phone.ilike."%Marina Albuquerque%"',
    )
  })

  const EMAIL = 'p76.telefone@exemplo.invalid'
  const DO_EMAIL = buildAppCustomerSearch(EMAIL)
  it.each([
    `<${EMAIL}>`,
    `Fulana <${EMAIL}>`,
    `"Fulana de Tal" <${EMAIL}>`,
    `mailto:${EMAIL}`,
    `MAILTO:${EMAIL}`,
    `${EMAIL}.`,
    `${EMAIL},`,
    `(${EMAIL})`,
    `E-mail: ${EMAIL}`,
    `fulana <${EMAIL}>`,
  ])('o e-mail dentro dos sinais acha como o e-mail puro: %j', (colado) => {
    expect(nome(colado)).toBe(DO_EMAIL)
  })

  it('o e-mail puro não muda', () => {
    expect(DO_EMAIL).toContain(`email.ilike."%${EMAIL}%"`)
  })

  it('um pedaço de e-mail sem domínio ou sem usuário NÃO é cortado', () => {
    expect(nome('maria@')).toContain('email.ilike."%maria@%"')
    expect(nome('@exemplo.invalid')).toContain('email.ilike."%@exemplo.invalid%"')
  })

  const DO_TELEFONE = buildAppCustomerSearch('(51) 99812-4471')
  it.each(['Cel: 51 99812-4471', 'Tel (51) 99812-4471', 'tel.: (51) 99812-4471', 'WhatsApp 51 99812-4471', 'Telefone: 51998124471', 'Fone - 51 99812-4471'])(
    'o rótulo do telefone cai: %j',
    (colado) => {
      const c = nome(colado)
      expect(c).toContain('phone.ilike."%51998124471%"')
      expect(c).not.toMatch(/Cel|Tel|Whats|Fone/i)
    },
  )

  it('o telefone puro não muda', () => {
    expect(DO_TELEFONE).toContain('phone.ilike."%51998124471%"')
  })

  it('um NOME que começa com palavra parecida com rótulo, ou com dígito no fim, NÃO perde o começo', () => {
    expect(nome('Telma Souza')).toContain('name.ilike."%Telma Souza%"')
    expect(nome('Marina 2')).toContain('name.ilike."%Marina 2%"')
    expect(nome('Cel Silva')).toContain('name.ilike."%Cel Silva%"')
  })

  it('o painel (sem opts) NÃO limpa nada: a saída continua a da função antiga', () => {
    const t = 'Marina  Albuquerque <a_b@x.y>'
    expect(buildCustomerSearchCondition(t)).toBe(funcaoAntiga(t))
  })
})
