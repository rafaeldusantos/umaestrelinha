import { describe, expect, it } from 'vitest'
import { persistAddons, addonsRefusal, type AddonsClient } from './persistAddons'
import { addonsFromRow, type AddonDraft } from './addons'
import { productRowToForm } from './useProductForm'

// O Compre Junto gravado depois do produto. O dublê REGISTRA cada chamada (tabela, operação,
// filtros, corpo): "gravou só os adicionais desta joia" e "apagou os de outra" produzem a mesma
// tela no fim, e só o diário distingue.

type Chamada = { table: string; op: string; payload?: unknown; filters?: unknown[][]; onConflict?: string }

const dublê = (falhar: { delete?: string; upsert?: string; insert?: string } = {}) => {
  const chamadas: Chamada[] = []
  const client: AddonsClient = {
    from: table => ({
      insert: async rows => {
        chamadas.push({ table, op: 'insert', payload: rows })
        return { error: falhar.insert ? { message: falhar.insert } : null }
      },
      upsert: async (rows, options) => {
        chamadas.push({ table, op: 'upsert', payload: rows, onConflict: options?.onConflict })
        return { error: falhar.upsert ? { message: falhar.upsert } : null }
      },
      delete: () => ({
        eq: (column, value) => ({
          in: async (c, values) => {
            chamadas.push({ table, op: 'delete', filters: [['eq', column, value], ['in', c, values]] })
            return { error: falhar.delete ? { message: falhar.delete } : null }
          },
        }),
      }),
    }),
  }
  return { client, chamadas }
}

const produto = (key: string, alvo: string, extra: Partial<AddonDraft> = {}, id: string | null = null): AddonDraft => ({
  key,
  id,
  kind: 'product',
  targetProductId: alvo,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  ...extra,
})
const lista = (key: string, listId: string, extra: Partial<AddonDraft> = {}, id: string | null = null): AddonDraft => ({
  key,
  id,
  kind: 'list',
  targetProductId: null,
  listId,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  ...extra,
})

describe('persistAddons', () => {
  it('sem mudança desde a carga, não escreve', async () => {
    const { client, chamadas } = dublê()
    const salvo = [produto('a', 'x', {}, 'ad1')]
    expect(await persistAddons(client, 'p1', salvo, salvo)).toBeNull()
    expect(chamadas).toEqual([])
  })

  it('grava só os adicionais desta joia: toda escrita leva o product_id dela', async () => {
    const { client, chamadas } = dublê()
    const salvo = [produto('a', 'x', {}, 'ad1'), produto('b', 'y', {}, 'ad2')]
    const proximo = [produto('b', 'y', { hiddenOnVariantIds: ['v1'] }, 'ad2'), lista('n', 'L1')]
    expect(await persistAddons(client, 'p1', proximo, salvo)).toBeNull()

    // 1) tira o que saiu, recortado pela joia; 2) atualiza o que ficou; 3) insere o novo
    expect(chamadas).toEqual([
      { table: 'product_buy_together', op: 'delete', filters: [['eq', 'product_id', 'p1'], ['in', 'id', ['ad1']]] },
      {
        table: 'product_buy_together',
        op: 'upsert',
        onConflict: 'id',
        payload: [
          {
            id: 'ad2',
            product_id: 'p1',
            position: 0,
            kind: 'product',
            target_product_id: 'y',
            list_id: null,
            target_variant_ids: [],
            hidden_on_variant_ids: ['v1'],
          },
        ],
      },
      {
        table: 'product_buy_together',
        op: 'insert',
        payload: [
          {
            product_id: 'p1',
            position: 1,
            kind: 'list',
            target_product_id: null,
            list_id: 'L1',
            target_variant_ids: [],
            hidden_on_variant_ids: [],
          },
        ],
      },
    ])
    // nenhuma escrita sem o recorte da joia, e nenhuma troca de dono
    for (const c of chamadas.filter(x => x.op !== 'delete')) {
      for (const linha of c.payload as Array<{ product_id: string }>) expect(linha.product_id).toBe('p1')
    }
  })

  it('nunca apaga tudo: o que a dona não tirou não entra no delete', async () => {
    const { client, chamadas } = dublê()
    const salvo = [produto('a', 'x', {}, 'ad1'), produto('b', 'y', {}, 'ad2')]
    await persistAddons(client, 'p1', [salvo[1], salvo[0]], salvo)
    expect(chamadas.map(c => c.op)).toEqual(['upsert'])
    const posicoes = (chamadas[0].payload as Array<{ id: string; position: number }>).map(r => [r.id, r.position])
    expect(posicoes).toEqual([['ad2', 0], ['ad1', 1]])
  })

  it('falha ao inserir o novo: o que a dona não tirou continua gravado (nada foi apagado a mais)', async () => {
    const { client, chamadas } = dublê({ insert: 'boom' })
    const salvo = [produto('a', 'x', {}, 'ad1')]
    const erro = await persistAddons(client, 'p1', [salvo[0], lista('n', 'L1')], salvo)
    expect(erro).toBe('boom')
    expect(chamadas.some(c => c.op === 'delete')).toBe(false)
  })

  it('falha no meio devolve a mensagem e para: o insert não roda depois de o upsert falhar', async () => {
    const { client, chamadas } = dublê({ upsert: 'sem permissão' })
    const salvo = [produto('a', 'x', {}, 'ad1')]
    const erro = await persistAddons(client, 'p1', [produto('a', 'x', { hiddenOnVariantIds: ['v'] }, 'ad1'), lista('n', 'L1')], salvo)
    expect(erro).toBe('sem permissão')
    expect(chamadas.map(c => c.op)).toEqual(['upsert'])
  })

  it('o tipo lista não carrega alvo nem variações liberadas; o tipo produto não carrega lista', async () => {
    const { client, chamadas } = dublê()
    await persistAddons(client, 'p1', [lista('n', 'L1', { targetVariantIds: ['sobra'] }), produto('m', 'x', { listId: 'sobra' })], [])
    const [linhas] = chamadas.map(c => c.payload as Array<Record<string, unknown>>)
    expect(linhas[0]).toMatchObject({ kind: 'list', target_product_id: null, list_id: 'L1', target_variant_ids: [] })
    expect(linhas[1]).toMatchObject({ kind: 'product', target_product_id: 'x', list_id: null })
  })

  it('adicional incompleto não é gravado', async () => {
    const { client, chamadas } = dublê()
    await persistAddons(client, 'p1', [lista('n', 'L1'), { ...lista('v', 'x'), listId: null }], [])
    expect((chamadas[0].payload as unknown[]).length).toBe(1)
  })

  it('a recusa vem antes de qualquer escrita: a 4ª, a própria joia e a peça repetida', async () => {
    const { client, chamadas } = dublê()
    const quatro = [lista('a', '1'), lista('b', '2'), lista('c', '3'), lista('d', '4')]
    expect(await persistAddons(client, 'p1', quatro, [])).toBe('Uma joia leva até 3 adicionais. Tire um para acrescentar outro.')
    expect(await persistAddons(client, 'p1', [produto('a', 'p1')], [])).toBe('Uma joia não pode ser adicional dela mesma.')
    expect(await persistAddons(client, 'p1', [produto('a', 'x'), produto('b', 'x')], [])).toBe(
      'Esta peça já é outro adicional desta joia.',
    )
    expect(chamadas).toEqual([])
  })
})

describe('addonsRefusal', () => {
  it('produto novo (sem id) não tem "a própria joia" para recusar', () => {
    expect(addonsRefusal(null, [produto('a', 'x')])).toBeNull()
  })
})

describe('a carga', () => {
  const linha = (id: string, position: number, extra: Record<string, unknown> = {}) => ({
    id,
    position,
    kind: 'product',
    target_product_id: `t-${id}`,
    list_id: null,
    target_variant_ids: null,
    hidden_on_variant_ids: ['v1'],
    ...extra,
  })

  it('ordena pela posição (o embed não garante) e normaliza ids ausentes', () => {
    const r = addonsFromRow({ product_buy_together: [linha('c', 2), linha('a', 0), linha('b', 1, { kind: 'list', target_product_id: null, list_id: 'L' })] })
    expect(r.map(a => [a.id, a.kind, a.listId])).toEqual([['a', 'product', null], ['b', 'list', 'L'], ['c', 'product', null]])
    expect(r[0].targetVariantIds).toEqual([])
    expect(r[0].hiddenOnVariantIds).toEqual(['v1'])
  })

  it('o formulário carrega os adicionais; a cópia os traz SEM id (gravar com o id atualizaria o original)', () => {
    const row = { id: 'p1', name: 'Anel', product_buy_together: [linha('a', 0)] }
    expect(productRowToForm(row).buy_together_addons[0].id).toBe('a')
    expect(productRowToForm(row, { asCopy: true }).buy_together_addons.map(a => a.id)).toEqual([null])
  })

  it('sem o embed, o formulário abre sem adicionais', () => {
    expect(productRowToForm({ id: 'p1', name: 'Anel' }).buy_together_addons).toEqual([])
  })
})
