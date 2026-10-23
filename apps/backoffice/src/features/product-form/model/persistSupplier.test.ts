import { describe, expect, it } from 'vitest'
import { persistSupplier, type SupplierClient } from './persistSupplier'
import { productRowToForm } from './useProductForm'

// Feature 80 (FOR-11..13, FOR-15). O dublê REGISTRA cada chamada com tabela, operação, filtro e
// corpo: sem ele, "reaproveita o fornecedor" e "cria outro" produziriam a mesma tela no fim.

type Chamada = { table: string; op: string; payload?: unknown; filter?: [string, string]; onConflict?: string }

const dublê = (opts: { insertErro?: { message: string; code?: string }; upsertErro?: string } = {}) => {
  const chamadas: Chamada[] = []
  const client: SupplierClient = {
    from: table => ({
      insert: row => ({
        select: () => ({
          maybeSingle: async () => {
            chamadas.push({ table, op: 'insert', payload: row })
            return opts.insertErro ? { data: null, error: opts.insertErro } : { data: { id: 'novo-id' }, error: null }
          },
        }),
      }),
      upsert: async (row, options) => {
        chamadas.push({ table, op: 'upsert', payload: row, onConflict: options?.onConflict })
        return { error: opts.upsertErro ? { message: opts.upsertErro } : null }
      },
      delete: () => ({
        eq: async (column, value) => {
          chamadas.push({ table, op: 'delete', filter: [column, value] })
          return { error: null }
        },
      }),
    }),
  }
  return { client, chamadas }
}

const LISTA = [{ id: 'atelie', name: 'Ateliê Prata' }]
const semReleitura = async () => { throw new Error('não devia reler') }
const VAZIO = { name: '', url: '' }
const semData = (c: Chamada) => ({ ...c, payload: c.payload && { ...(c.payload as object), updated_at: undefined } })

describe('persistSupplier', () => {
  it('FOR-11 — nome que já existe (outra caixa, sem acento) REAPROVEITA o fornecedor', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSupplier(client, 'p1', { name: ' atelie PRATA ', url: ' https://x.com/peca ' }, VAZIO, LISTA, semReleitura)
    expect(erro).toBeNull()
    expect(chamadas.map(semData)).toEqual([
      {
        table: 'product_suppliers',
        op: 'upsert',
        payload: { product_id: 'p1', supplier_id: 'atelie', url: 'https://x.com/peca', updated_at: undefined },
        onConflict: 'product_id',
      },
    ])
  })

  it('FOR-11 — nome novo CRIA o fornecedor (aparado) e vincula com o id que o banco devolveu', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSupplier(client, 'p1', { name: '  Resinas   do Sul ', url: '' }, VAZIO, LISTA, async () => LISTA)
    expect(erro).toBeNull()
    expect(chamadas[0]).toEqual({ table: 'suppliers', op: 'insert', payload: { name: 'Resinas do Sul' } })
    expect(semData(chamadas[1])).toEqual({
      table: 'product_suppliers',
      op: 'upsert',
      payload: { product_id: 'p1', supplier_id: 'novo-id', url: null, updated_at: undefined },
      onConflict: 'product_id',
    })
    expect(chamadas).toHaveLength(2)
  })

  it('FOR-11 — a lista da TELA ainda vazia (não carregou): relê antes de criar e reaproveita, sem duplicar por acento', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSupplier(client, 'p1', { name: 'Atelie Prata', url: '' }, VAZIO, [], async () => LISTA)
    expect(erro).toBeNull()
    expect(chamadas.map(c => `${c.table}:${c.op}`)).toEqual(['product_suppliers:upsert'])
    expect((chamadas[0].payload as { supplier_id: string }).supplier_id).toBe('atelie')
  })

  it('a releitura que falha antes de criar devolve o erro e não grava nada', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSupplier(client, 'p1', { name: 'Novo', url: '' }, VAZIO, [], async () => {
      throw new Error('sem rede')
    })
    expect(erro).toBe('sem rede')
    expect(chamadas).toEqual([])
  })

  it('FOR-11 — a corrida do nome único (23505) relê a lista e reaproveita pelo MESMO casamento sem acento', async () => {
    const { client, chamadas } = dublê({ insertErro: { message: 'duplicate', code: '23505' } })
    // A primeira releitura (antes do insert) ainda não vê o nome; a segunda (depois do 23505) vê.
    let leituras = 0
    const releitura = async () => (++leituras === 1 ? [] : [{ id: 'outro-id', name: 'PRATA FINA' }])
    const erro = await persistSupplier(client, 'p1', { name: 'Prata Fina', url: '' }, VAZIO, [], releitura)
    expect(erro).toBeNull()
    expect(chamadas.map(c => `${c.table}:${c.op}`)).toEqual(['suppliers:insert', 'product_suppliers:upsert'])
    expect((chamadas[1].payload as { supplier_id: string }).supplier_id).toBe('outro-id')
  })

  it('a corrida sem achar o nome na releitura devolve o erro do banco, e não grava o vínculo', async () => {
    const { client, chamadas } = dublê({ insertErro: { message: 'duplicate key', code: '23505' } })
    const erro = await persistSupplier(client, 'p1', { name: 'Prata Fina', url: '' }, VAZIO, [], async () => [])
    expect(erro).toBe('duplicate key')
    expect(chamadas.map(c => c.table)).toEqual(['suppliers'])
  })

  it('FOR-12 — nome vazio apaga o vínculo do produto, e só ele', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSupplier(client, 'p1', { name: '  ', url: '' }, { name: 'Ateliê Prata', url: 'https://x.com' }, LISTA, semReleitura)
    expect(erro).toBeNull()
    expect(chamadas).toEqual([{ table: 'product_suppliers', op: 'delete', filter: ['product_id', 'p1'] }])
  })

  it('FOR-13 — sem mudança desde a carga (nem com espaço sobrando), nenhuma escrita', async () => {
    const { client, chamadas } = dublê()
    const salvo = { name: 'Ateliê Prata', url: 'https://x.com/peca' }
    expect(await persistSupplier(client, 'p1', { name: ' Ateliê Prata', url: 'https://x.com/peca ' }, salvo, LISTA, semReleitura)).toBeNull()
    expect(await persistSupplier(client, 'p1', VAZIO, VAZIO, LISTA, semReleitura)).toBeNull()
    expect(chamadas).toEqual([])
  })

  it('trocar só o link regrava o vínculo', async () => {
    const { client, chamadas } = dublê()
    await persistSupplier(client, 'p1', { name: 'Ateliê Prata', url: 'https://x.com/nova' }, { name: 'Ateliê Prata', url: 'https://x.com/velha' }, LISTA, semReleitura)
    expect(chamadas).toHaveLength(1)
    expect((chamadas[0].payload as { url: string }).url).toBe('https://x.com/nova')
  })

  it('FOR-14 — o erro da gravação volta como mensagem', async () => {
    const { client } = dublê({ upsertErro: 'permission denied' })
    expect(await persistSupplier(client, 'p1', { name: 'Ateliê Prata', url: '' }, VAZIO, LISTA, semReleitura)).toBe('permission denied')
  })
})

describe('a carga do fornecedor (productRowToForm)', () => {
  const linha = { id: 'p1', name: 'Anel', product_suppliers: { url: 'https://x.com/peca', suppliers: { name: 'Ateliê Prata' } } }

  it('o embed um-para-um vira os dois campos', () => {
    const form = productRowToForm(linha)
    expect(form.supplier_name).toBe('Ateliê Prata')
    expect(form.supplier_url).toBe('https://x.com/peca')
  })

  it('sem fornecedor, os dois vazios', () => {
    const form = productRowToForm({ id: 'p1', name: 'Anel', product_suppliers: null })
    expect([form.supplier_name, form.supplier_url]).toEqual(['', ''])
  })

  it('FOR-15 — duplicar traz o nome e o link do original', () => {
    const form = productRowToForm(linha, { asCopy: true })
    expect([form.supplier_name, form.supplier_url]).toEqual(['Ateliê Prata', 'https://x.com/peca'])
  })
})
