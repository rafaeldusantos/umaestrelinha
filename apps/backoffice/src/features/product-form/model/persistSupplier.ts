// Feature 80 (FOR-11..14) — a gravação dos fornecedores da peça, depois de o produto existir.
// Desde a migration `20261031120000`, o produto pode ter VÁRIOS: cada linha é um fornecedor com o
// link da peça nele, na ordem em que a dona os listou. Desde a `20261101120000` a chave é
// (produto, posição), e o MESMO fornecedor pode repetir em linhas diferentes — a mesma peça
// comprada dele por mais de um anúncio, cada um com o seu link.
//
// Fora de `persistProductRelations` de propósito: aquela função é o diff das tabelas N:N do
// produto, e esta precisa RESOLVER cada fornecedor (reaproveitar o de mesmo nome ou criar) antes de
// gravar o vínculo. Para no primeiro erro, como o resto do save: `supabase-js` não abre transação
// entre chamadas — por isso grava os vínculos ANTES de apagar os que saíram, e uma falha no meio
// nunca deixa o produto sem fornecedor nenhum.

import { SUPPLIER_REFUSALS, supplierRefusal } from '@estrelinha/core/suppliers'
import { findSupplierByName, type Supplier } from '@/entities/supplier'

type Erro = { message: string; code?: string } | null
type Resultado = PromiseLike<{ error: Erro }>

/** A fatia de `supabase-js` que esta função usa. Dublê pequeno = teste que prova o que importa. */
export interface SupplierClient {
  from: (table: string) => {
    insert: (row: unknown) => {
      select: (columns: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: Erro }> }
    }
    upsert: (row: unknown, options?: { onConflict?: string }) => Resultado
    delete: () => {
      eq: (column: string, value: string) => Resultado & {
        gte: (column: string, value: number) => Resultado
      }
    }
  }
}

/** Uma linha de fornecedor como o formulário a tem: nome e link. */
export interface SupplierDraft {
  name: string
  url: string
}

export const EMPTY_SUPPLIER_ROW: SupplierDraft = { name: '', url: '' }

/** O id do campo da linha `index` — o mesmo que o `data-field`, para o foco da recusa achá-lo. */
export const supplierFieldId = (field: 'name' | 'url', index: number): string =>
  `supplier_${field}${index === 0 ? '' : `_${index + 1}`}`

const aparar = (d: SupplierDraft): SupplierDraft => ({ name: d.name.trim().replace(/\s+/g, ' '), url: d.url.trim() })

/** As linhas que valem: aparadas, sem as vazias (nome e link em branco é linha que não existe). */
export const supplierRowsToSave = (rows: SupplierDraft[]): SupplierDraft[] =>
  rows.map(aparar).filter(r => r.name !== '' || r.url !== '')

/** O que mudou desde a carga? Sem mudança, o save não escreve (FOR-13). A ordem conta. */
export const supplierRowsChanged = (next: SupplierDraft[], saved: SupplierDraft[]): boolean => {
  const a = supplierRowsToSave(next)
  const b = supplierRowsToSave(saved)
  return a.length !== b.length || a.some((r, i) => r.name !== b[i].name || r.url !== b[i].url)
}

/**
 * A recusa das linhas, antes de qualquer gravação: a régua de `core` em cada linha. O mesmo
 * fornecedor em duas linhas NÃO é recusado — cada linha é uma vaga própria (`20261101120000`).
 * `index` é a linha nas `rows` como a tela as mostra, para o foco ir nela. `null` = pode gravar.
 */
export const supplierRowsRefusal = (
  rows: SupplierDraft[],
): { index: number; field: 'name' | 'url'; message: string } | null => {
  for (let i = 0; i < rows.length; i++) {
    const message = supplierRefusal(rows[i].name, rows[i].url)
    if (message) {
      const doNome = message === SUPPLIER_REFUSALS.nameMissing || message === SUPPLIER_REFUSALS.nameTooLong
      return { index: i, field: doNome ? 'name' : 'url', message }
    }
  }
  return null
}

/**
 * Grava os fornecedores do produto. Devolve `null` quando deu certo (ou não havia o que gravar), e
 * a mensagem do erro quando não deu — `string | null`, e não união por booleano, porque
 * `strictNullChecks` está desligado.
 *
 * `suppliers` é a lista que a sugestão mostrou: o fornecedor de mesmo nome (sem acento e sem
 * maiúsculas) é REAPROVEITADO, que é a mesma régua que decidiu não oferecer "Criar".
 *
 * `reread` relê a lista do banco. Ela é chamada ANTES de criar: a lista da tela pode não ter
 * terminado de carregar (save rápido, rede lenta), e criar sem conferir faria "Atelie Prata" nascer
 * ao lado de "Ateliê Prata" — o índice único só segura a duplicata exata, não a de acento. E de novo
 * na corrida (23505), quando outro save criou o mesmo nome entre a releitura e o `insert`.
 */
export const persistSuppliers = async (
  client: SupplierClient,
  productId: string,
  next: SupplierDraft[],
  saved: SupplierDraft[],
  suppliers: Supplier[],
  reread: () => Promise<Supplier[]>,
): Promise<string | null> => {
  if (!supplierRowsChanged(next, saved)) return null
  const rows = supplierRowsToSave(next)

  // FOR-12: sem linha nenhuma, apaga os vínculos. Os fornecedores continuam cadastrados.
  if (rows.length === 0) {
    const { error } = await client.from('product_suppliers').delete().eq('product_id', productId)
    return error ? error.message : null
  }

  let conhecidos = suppliers
  let relido = false
  const ids: string[] = []
  for (const { name } of rows) {
    let supplierId = findSupplierByName(conhecidos, name)?.id ?? null
    if (!supplierId && !relido) {
      try {
        conhecidos = await reread()
        relido = true
      } catch (e) {
        return e instanceof Error ? e.message : 'Não foi possível conferir os fornecedores cadastrados'
      }
      supplierId = findSupplierByName(conhecidos, name)?.id ?? null
    }
    if (!supplierId) {
      const { data, error } = await client.from('suppliers').insert({ name }).select('id').maybeSingle()
      if (data?.id) {
        supplierId = data.id
        conhecidos = [...conhecidos, { id: data.id, name }]
      } else if (error?.code === '23505') {
        // Corrida: outro save criou o mesmo nome depois de a lista ter sido lida. Relê a lista e
        // procura pela MESMA régua da sugestão — um `ilike` aqui seria uma segunda comparação de nome.
        try {
          conhecidos = await reread()
        } catch (e) {
          return e instanceof Error ? e.message : error.message
        }
        const existente = findSupplierByName(conhecidos, name)
        if (!existente) return error.message
        supplierId = existente.id
      } else {
        return error?.message ?? 'O fornecedor não foi criado'
      }
    }
    ids.push(supplierId)
  }

  const agora = new Date().toISOString()
  const { error } = await client.from('product_suppliers').upsert(
    rows.map((r, i) => ({
      product_id: productId,
      supplier_id: ids[i],
      url: r.url === '' ? null : r.url,
      position: i,
      updated_at: agora,
    })),
    { onConflict: 'product_id,position' },
  )
  if (error) return error.message

  // As vagas que sobraram de uma lista mais longa. Depois do `upsert`: falhar aqui deixa um
  // fornecedor a mais, nunca a menos.
  const { error: erroApagar } = await client
    .from('product_suppliers')
    .delete()
    .eq('product_id', productId)
    .gte('position', rows.length)
  return erroApagar ? erroApagar.message : null
}
