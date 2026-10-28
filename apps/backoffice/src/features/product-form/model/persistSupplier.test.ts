import { describe, expect, it } from 'vitest'
import {
  persistSuppliers,
  SUPPLIER_DUPLICATED,
  supplierFieldId,
  supplierRowsChanged,
  supplierRowsRefusal,
  supplierRowsToSave,
  type SupplierClient,
} from './persistSupplier'
import { productRowToForm } from './useProductForm'

// Feature 80 (FOR-11..13, FOR-15), com vários fornecedores por produto. O dublê REGISTRA cada
// chamada com tabela, operação, filtros e corpo: sem ele, "reaproveita o fornecedor" e "cria outro"
// produziriam a mesma tela no fim.

type Chamada = { table: string; op: string; payload?: unknown; filters?: string[][]; onConflict?: string }

const dublê = (opts: { insertErro?: { message: string; code?: string }; upsertErro?: string; deleteErro?: string } = {}) => {
  const chamadas: Chamada[] = []
  let novos = 0
  const client: SupplierClient = {
    from: table => ({
      insert: row => ({
        select: () => ({
          maybeSingle: async () => {
            chamadas.push({ table, op: 'insert', payload: row })
            return opts.insertErro
              ? { data: null, error: opts.insertErro }
              : { data: { id: `novo-${++novos}` }, error: null }
          },
        }),
      }),
      upsert: async (row, options) => {
        chamadas.push({ table, op: 'upsert', payload: row, onConflict: options?.onConflict })
        return { error: opts.upsertErro ? { message: opts.upsertErro } : null }
      },
      delete: () => ({
        eq: (column, value) => {
          const chamada: Chamada = { table, op: 'delete', filters: [['eq', column, value]] }
          chamadas.push(chamada)
          const resultado = { error: opts.deleteErro ? { message: opts.deleteErro } : null }
          return Object.assign(Promise.resolve(resultado), {
            not: (c: string, op: string, v: string) => {
              chamada.filters!.push(['not', c, op, v])
              return Promise.resolve(resultado)
            },
          })
        },
      }),
    }),
  }
  return { client, chamadas }
}

const LISTA = [
  { id: 'atelie', name: 'Ateliê Prata' },
  { id: 'resinas', name: 'Resinas do Sul' },
]
const semReleitura = async () => { throw new Error('não devia reler') }
const semData = (c: Chamada) => ({
  ...c,
  payload: Array.isArray(c.payload) ? c.payload.map(p => ({ ...p, updated_at: undefined })) : c.payload,
})

describe('persistSuppliers', () => {
  it('FOR-11 — nome que já existe (outra caixa, sem acento) REAPROVEITA; depois apaga os que saíram', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: ' atelie PRATA ', url: ' https://x.com/peca ' }], [], LISTA, semReleitura)
    expect(erro).toBeNull()
    expect(chamadas.map(semData)).toEqual([
      {
        table: 'product_suppliers',
        op: 'upsert',
        payload: [{ product_id: 'p1', supplier_id: 'atelie', url: 'https://x.com/peca', position: 0, updated_at: undefined }],
        onConflict: 'product_id,supplier_id',
      },
      {
        table: 'product_suppliers',
        op: 'delete',
        filters: [['eq', 'product_id', 'p1'], ['not', 'supplier_id', 'in', '(atelie)']],
      },
    ])
  })

  it('vários fornecedores: um vínculo por linha, na ordem, com o link de cada um', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(
      client,
      'p1',
      [
        { name: 'Resinas do Sul', url: 'https://r.com/1' },
        { name: 'Ateliê Prata', url: '' },
        { name: '', url: '' },
      ],
      [{ name: 'Ateliê Prata', url: '' }],
      LISTA,
      semReleitura,
    )
    expect(erro).toBeNull()
    expect(semData(chamadas[0]).payload).toEqual([
      { product_id: 'p1', supplier_id: 'resinas', url: 'https://r.com/1', position: 0, updated_at: undefined },
      { product_id: 'p1', supplier_id: 'atelie', url: null, position: 1, updated_at: undefined },
    ])
    expect(chamadas[1].filters).toEqual([['eq', 'product_id', 'p1'], ['not', 'supplier_id', 'in', '(resinas,atelie)']])
  })

  it('FOR-11 — nome novo CRIA o fornecedor (aparado) e vincula com o id que o banco devolveu', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: '  Prata   Fina ', url: '' }], [], LISTA, async () => LISTA)
    expect(erro).toBeNull()
    expect(chamadas[0]).toEqual({ table: 'suppliers', op: 'insert', payload: { name: 'Prata Fina' } })
    expect((chamadas[1].payload as { supplier_id: string }[])[0].supplier_id).toBe('novo-1')
  })

  it('dois nomes novos: relê UMA vez e cria os dois', async () => {
    const { client, chamadas } = dublê()
    let leituras = 0
    const erro = await persistSuppliers(client, 'p1', [{ name: 'A', url: '' }, { name: 'B', url: '' }], [], [], async () => {
      leituras++
      return []
    })
    expect(erro).toBeNull()
    expect(leituras).toBe(1)
    expect(chamadas.map(c => `${c.table}:${c.op}`)).toEqual(['suppliers:insert', 'suppliers:insert', 'product_suppliers:upsert', 'product_suppliers:delete'])
  })

  it('FOR-11 — a lista da TELA ainda vazia (não carregou): relê antes de criar e reaproveita, sem duplicar por acento', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: 'Atelie Prata', url: '' }], [], [], async () => LISTA)
    expect(erro).toBeNull()
    expect(chamadas.map(c => `${c.table}:${c.op}`)).toEqual(['product_suppliers:upsert', 'product_suppliers:delete'])
    expect((chamadas[0].payload as { supplier_id: string }[])[0].supplier_id).toBe('atelie')
  })

  it('a releitura que falha antes de criar devolve o erro e não grava nada', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: 'Novo', url: '' }], [], [], async () => {
      throw new Error('sem rede')
    })
    expect(erro).toBe('sem rede')
    expect(chamadas).toEqual([])
  })

  it('FOR-11 — a corrida do nome único (23505) relê a lista e reaproveita pelo MESMO casamento sem acento', async () => {
    const { client, chamadas } = dublê({ insertErro: { message: 'duplicate', code: '23505' } })
    let leituras = 0
    const releitura = async () => (++leituras === 1 ? [] : [{ id: 'outro-id', name: 'PRATA FINA' }])
    const erro = await persistSuppliers(client, 'p1', [{ name: 'Prata Fina', url: '' }], [], [], releitura)
    expect(erro).toBeNull()
    expect((chamadas[1].payload as { supplier_id: string }[])[0].supplier_id).toBe('outro-id')
  })

  it('a corrida sem achar o nome na releitura devolve o erro do banco, e não grava o vínculo', async () => {
    const { client, chamadas } = dublê({ insertErro: { message: 'duplicate key', code: '23505' } })
    const erro = await persistSuppliers(client, 'p1', [{ name: 'Prata Fina', url: '' }], [], [], async () => [])
    expect(erro).toBe('duplicate key')
    expect(chamadas.map(c => c.table)).toEqual(['suppliers'])
  })

  it('duas linhas que caem no MESMO fornecedor são recusadas, sem gravar o vínculo', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: 'Ateliê Prata', url: '' }, { name: 'atelie prata', url: '' }], [], LISTA, semReleitura)
    expect(erro).toBe(SUPPLIER_DUPLICATED)
    expect(chamadas).toEqual([])
  })

  it('FOR-12 — sem linha nenhuma, apaga os vínculos do produto, e só eles', async () => {
    const { client, chamadas } = dublê()
    const erro = await persistSuppliers(client, 'p1', [{ name: '  ', url: '' }], [{ name: 'Ateliê Prata', url: 'https://x.com' }], LISTA, semReleitura)
    expect(erro).toBeNull()
    expect(chamadas).toEqual([{ table: 'product_suppliers', op: 'delete', filters: [['eq', 'product_id', 'p1']] }])
  })

  it('FOR-13 — sem mudança desde a carga (nem com espaço sobrando, nem com linha vazia), nenhuma escrita', async () => {
    const { client, chamadas } = dublê()
    const salvo = [{ name: 'Ateliê Prata', url: 'https://x.com/peca' }]
    expect(await persistSuppliers(client, 'p1', [{ name: ' Ateliê Prata', url: 'https://x.com/peca ' }, { name: '', url: '' }], salvo, LISTA, semReleitura)).toBeNull()
    expect(await persistSuppliers(client, 'p1', [{ name: '', url: '' }], [], LISTA, semReleitura)).toBeNull()
    expect(chamadas).toEqual([])
  })

  it('trocar a ordem é mudança', () => {
    const a = { name: 'A', url: '' }
    const b = { name: 'B', url: '' }
    expect(supplierRowsChanged([b, a], [a, b])).toBe(true)
    expect(supplierRowsChanged([a, b], [a, b])).toBe(false)
  })

  it('FOR-14 — o erro da gravação volta como mensagem, e nada é apagado', async () => {
    const { client, chamadas } = dublê({ upsertErro: 'permission denied' })
    expect(await persistSuppliers(client, 'p1', [{ name: 'Ateliê Prata', url: '' }], [], LISTA, semReleitura)).toBe('permission denied')
    expect(chamadas.map(c => c.op)).toEqual(['upsert'])
  })

  it('o erro ao apagar os que saíram volta como mensagem', async () => {
    const { client } = dublê({ deleteErro: 'falhou' })
    expect(await persistSuppliers(client, 'p1', [{ name: 'Ateliê Prata', url: '' }], [], LISTA, semReleitura)).toBe('falhou')
  })
})

describe('supplierRowsRefusal', () => {
  it('linhas certas e linhas vazias passam', () => {
    expect(supplierRowsRefusal([{ name: '', url: '' }])).toBeNull()
    expect(supplierRowsRefusal([{ name: 'A', url: 'https://a.com' }, { name: 'B', url: '' }, { name: '', url: '' }])).toBeNull()
  })

  it('aponta a linha e o campo da recusa de `core`', () => {
    expect(supplierRowsRefusal([{ name: 'A', url: '' }, { name: '', url: 'https://b.com' }])).toEqual({
      index: 1, field: 'name', message: 'Informe o nome do fornecedor da peça',
    })
    expect(supplierRowsRefusal([{ name: 'A', url: 'a.com' }])).toEqual({
      index: 0, field: 'url', message: 'O link da peça precisa começar com http:// ou https://',
    })
  })

  it('o mesmo fornecedor duas vezes (sem acento e sem maiúsculas) aponta a segunda linha', () => {
    expect(supplierRowsRefusal([{ name: 'Ateliê Prata', url: '' }, { name: 'B', url: '' }, { name: ' ATELIE prata', url: '' }])).toEqual({
      index: 2, field: 'name', message: SUPPLIER_DUPLICATED,
    })
  })

  it('o id do campo da linha: a primeira com os ids de sempre', () => {
    expect(supplierFieldId('name', 0)).toBe('supplier_name')
    expect(supplierFieldId('url', 0)).toBe('supplier_url')
    expect(supplierFieldId('name', 1)).toBe('supplier_name_2')
  })

  it('supplierRowsToSave apara e tira as linhas vazias', () => {
    expect(supplierRowsToSave([{ name: ' A  B ', url: ' x ' }, { name: ' ', url: '' }])).toEqual([{ name: 'A B', url: 'x' }])
  })
})

describe('a carga dos fornecedores (productRowToForm)', () => {
  const linha = { id: 'p1', name: 'Anel', product_suppliers: { url: 'https://x.com/peca', suppliers: { name: 'Ateliê Prata' } } }

  it('o embed um-para-um (forma antiga) vira uma linha', () => {
    expect(productRowToForm(linha).supplier_rows).toEqual([{ name: 'Ateliê Prata', url: 'https://x.com/peca' }])
  })

  it('o embed em array vira as linhas, na ordem de `position`', () => {
    const form = productRowToForm({
      id: 'p1',
      name: 'Anel',
      product_suppliers: [
        { url: null, position: 1, suppliers: { name: 'B' } },
        { url: 'https://a.com', position: 0, suppliers: { name: 'A' } },
      ],
    })
    expect(form.supplier_rows).toEqual([{ name: 'A', url: 'https://a.com' }, { name: 'B', url: '' }])
  })

  it('sem fornecedor, uma linha vazia onde digitar', () => {
    expect(productRowToForm({ id: 'p1', name: 'Anel', product_suppliers: null }).supplier_rows).toEqual([{ name: '', url: '' }])
    expect(productRowToForm({ id: 'p1', name: 'Anel', product_suppliers: [] }).supplier_rows).toEqual([{ name: '', url: '' }])
  })

  it('FOR-15 — duplicar traz os fornecedores do original', () => {
    expect(productRowToForm(linha, { asCopy: true }).supplier_rows).toEqual([{ name: 'Ateliê Prata', url: 'https://x.com/peca' }])
  })
})
