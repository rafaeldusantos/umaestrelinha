// Feature `76` (`MAC-23`, `MAC-25`, G11) — a busca de clientes e o recorte "Voltaram" subiram para
// `@estrelinha/core/customers`, porque o app do ateliê os lê também. O painel REEXPORTA, e a régua é
// `toBe` (identidade), nunca `toEqual`: uma cópia colada com o mesmo valor passaria por igualdade
// estrutural e seria exatamente o segundo dono que a subida existe para impedir (o defeito 01).
//
// Mora em `app/__tests__` pelo mesmo motivo de `regrasDoPedidoNoCore.test.ts`: lê `entities` e o hook
// da lista, e de `entities` o import cruzado seria fronteira FSD ao contrário.
//
// A lista é LITERAL, um símbolo por linha: derivar de `Object.keys` provaria que o painel reexporta o
// que reexporta.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import * as core from '@estrelinha/core/customers'

type Chamada = [metodo: string, args: unknown[]]
const consultas: { tabela: string; cadeia: Chamada[] }[] = []

vi.mock('@estrelinha/supabase/client', () => {
  /** Builder que registra TODA chamada de método (Proxy): um método inventado entra na cadeia. */
  const builder = (tabela: string) => {
    const registro = { tabela, cadeia: [] as Chamada[] }
    consultas.push(registro)
    const proxy: object = new Proxy(
      {},
      {
        get(_alvo, prop) {
          if (prop === 'then') {
            const resposta = { data: [], error: null, count: 0 }
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
              Promise.resolve(resposta).then(resolve, reject)
          }
          return (...args: unknown[]) => {
            registro.cadeia.push([String(prop), args])
            return proxy
          }
        },
      },
    )
    return proxy
  }
  return { supabase: { from: (tabela: string) => builder(tabela) } }
})

import * as painel from '@/entities/customer/api/customerQuery'
import { useAdminCustomerList } from '@/entities/customer/api/useAdminCustomerList'

const PARES: [string, unknown, unknown][] = [
  ['customerQuery.buildCustomerSearchCondition', painel.buildCustomerSearchCondition, core.buildCustomerSearchCondition],
  ['customerQuery.CUSTOMER_SEARCH_COLUMNS', painel.CUSTOMER_SEARCH_COLUMNS, core.CUSTOMER_SEARCH_COLUMNS],
  ['customerQuery.CUSTOMER_SEARCH_DEBOUNCE_MS', painel.CUSTOMER_SEARCH_DEBOUNCE_MS, core.CUSTOMER_SEARCH_DEBOUNCE_MS],
]

beforeEach(() => {
  consultas.length = 0
})

describe('o painel reexporta a busca de clientes de core — identidade, não cópia (MAC-25)', () => {
  it('âncora: os três caminhos existem dos dois lados', () => {
    expect(PARES).toHaveLength(3)
    for (const [nome, p, d] of PARES) {
      expect(p, `${nome} existe no painel`).toBeDefined()
      expect(d, `${nome} existe em core`).toBeDefined()
    }
  })

  it.each(PARES)('%s é a mesma referência de core', (_nome, p, d) => {
    expect(p).toBe(d)
  })

  // `toBe` não distingue duas escritas de um PRIMITIVO (300 === 300): o debounce copiado passaria.
  // Para esse a régua é a fonte: o arquivo do painel não pode DECLARAR nenhum dos três.
  it('o arquivo do painel não declara nenhum dos três (a régua que alcança o primitivo)', () => {
    const fonte = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'entities', 'customer', 'api', 'customerQuery.ts'),
      'utf8',
    ).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n\r]*/g, '')
    expect(fonte).toContain("from '@estrelinha/core/customers'")
    for (const nome of PARES.map(([n]) => n.split('.')[1])) {
      expect(fonte, `${nome} não pode ser declarado no painel`).not.toMatch(new RegExp(`(?:const|function|let|var)\\s+${nome}(?![\\w])`))
    }
  })

  it('sensor: a régua de declaração acusa a cópia do debounce', () => {
    const declara = (f: string, nome: string) => new RegExp(`(?:const|function|let|var)\\s+${nome}(?![\\w])`).test(f)
    expect(declara('export const CUSTOMER_SEARCH_DEBOUNCE_MS = 300', 'CUSTOMER_SEARCH_DEBOUNCE_MS')).toBe(true)
    expect(declara("export { CUSTOMER_SEARCH_DEBOUNCE_MS } from '@estrelinha/core/customers'", 'CUSTOMER_SEARCH_DEBOUNCE_MS')).toBe(false)
  })

  it('sensor: uma cópia com os mesmos valores NÃO passaria na régua', () => {
    const copia = [...core.CUSTOMER_SEARCH_COLUMNS]
    expect(copia).toEqual([...core.CUSTOMER_SEARCH_COLUMNS])
    expect(copia).not.toBe(core.CUSTOMER_SEARCH_COLUMNS)
  })
})

describe('"Voltaram" do painel é o recorte "Compraram mais de uma vez" do app (MAC-23)', () => {
  /** O que `applyCustomerSlice(.., "recorrentes")` manda ao builder, registrado num dublê. */
  const cadeiaDoRecorte = (): Chamada[] => {
    const registro: Chamada[] = []
    const b = {
      gte(...args: unknown[]) {
        registro.push(['gte', args])
        return b
      },
    }
    core.applyCustomerSlice(b, 'recorrentes')
    return registro
  }

  it('a consulta da lista, com a visão `voltaram`, é select + a cadeia do recorte + order + range', async () => {
    const consulta = { ...painel.defaultCustomerQuery(), filters: { ...painel.emptyCustomerFilters(), view: 'voltaram' as const } }
    renderHook(() => useAdminCustomerList(consulta))
    await waitFor(() => expect(consultas.some((c) => c.cadeia.some(([m]) => m === 'order'))).toBe(true))
    const principal = consultas.find((c) => c.tabela === 'customer_list' && c.cadeia.some(([m]) => m === 'order'))
    expect(principal).toBeDefined()
    const nomes = principal.cadeia.map(([m]) => m)
    expect(nomes).toEqual(['select', 'gte', 'order', 'range'])
    expect(principal.cadeia.slice(1, -2)).toEqual(cadeiaDoRecorte())
    expect(cadeiaDoRecorte()).toEqual([['gte', ['orders_paid', 2]]])
  })

  it('o dublê ENXERGA a diferença: um recorte que chamasse outra coluna não seria igual', () => {
    const outra: Chamada[] = [['gte', ['orders_total', 2]]]
    expect(outra).not.toEqual(cadeiaDoRecorte())
  })

  it('as seis visões do painel continuam as mesmas, na ordem, com os rótulos de hoje', () => {
    expect(painel.CUSTOMER_VIEWS).toEqual([
      { id: 'todas', label: 'Todas' },
      { id: 'voltaram', label: 'Voltaram' },
      { id: 'confiaram-material', label: 'Confiaram material' },
      { id: 'uma-vez', label: 'Compraram uma vez só' },
      { id: 'sem-compra', label: 'Cadastro sem compra' },
      { id: 'duplicadas', label: 'Possíveis duplicadas' },
    ])
  })
})
