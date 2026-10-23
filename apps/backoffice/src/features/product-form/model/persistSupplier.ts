// Feature 80 (FOR-11..14) — a gravação do fornecedor da peça, depois de o produto existir.
//
// Fora de `persistProductRelations` de propósito: aquela função é o diff das tabelas N:N do
// produto, e esta precisa RESOLVER um fornecedor (reaproveitar o de mesmo nome ou criar) antes de
// gravar o vínculo. Para no primeiro erro, como o resto do save: `supabase-js` não abre transação
// entre chamadas.

import { findSupplierByName, type Supplier } from '@/entities/supplier'

type Erro = { message: string; code?: string } | null

/** A fatia de `supabase-js` que esta função usa. Dublê pequeno = teste que prova o que importa. */
export interface SupplierClient {
  from: (table: string) => {
    insert: (row: unknown) => {
      select: (columns: string) => { maybeSingle: () => Promise<{ data: { id: string } | null; error: Erro }> }
    }
    upsert: (row: unknown, options?: { onConflict?: string }) => Promise<{ error: Erro }>
    delete: () => { eq: (column: string, value: string) => Promise<{ error: Erro }> }
  }
}

/** O fornecedor como o formulário o tem: nome e link, já aparados na comparação. */
export interface SupplierDraft {
  name: string
  url: string
}

const aparar = (d: SupplierDraft): SupplierDraft => ({ name: d.name.trim().replace(/\s+/g, ' '), url: d.url.trim() })

/** O que mudou desde a carga? Sem mudança, o save não escreve (FOR-13). */
export const supplierChanged = (next: SupplierDraft, saved: SupplierDraft): boolean => {
  const a = aparar(next)
  const b = aparar(saved)
  return a.name !== b.name || a.url !== b.url
}

/**
 * Grava o fornecedor do produto. Devolve `null` quando deu certo (ou não havia o que gravar), e a
 * mensagem do erro quando não deu — `string | null`, e não união por booleano, porque
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
export const persistSupplier = async (
  client: SupplierClient,
  productId: string,
  next: SupplierDraft,
  saved: SupplierDraft,
  suppliers: Supplier[],
  reread: () => Promise<Supplier[]>,
): Promise<string | null> => {
  if (!supplierChanged(next, saved)) return null
  const { name, url } = aparar(next)

  // FOR-12: nome vazio apaga o vínculo. O fornecedor continua cadastrado para outros produtos.
  if (name === '') {
    const { error } = await client.from('product_suppliers').delete().eq('product_id', productId)
    return error ? error.message : null
  }

  let supplierId = findSupplierByName(suppliers, name)?.id ?? null
  if (!supplierId) {
    let atual: Supplier[]
    try {
      atual = await reread()
    } catch (e) {
      return e instanceof Error ? e.message : 'Não foi possível conferir os fornecedores cadastrados'
    }
    supplierId = findSupplierByName(atual, name)?.id ?? null
  }
  if (!supplierId) {
    const { data, error } = await client.from('suppliers').insert({ name }).select('id').maybeSingle()
    if (data?.id) {
      supplierId = data.id
    } else if (error?.code === '23505') {
      // Corrida: outro save criou o mesmo nome depois de a lista ter sido lida. Relê a lista e
      // procura pela MESMA régua da sugestão — um `ilike` aqui seria uma segunda comparação de nome.
      let lista: Supplier[]
      try {
        lista = await reread()
      } catch (e) {
        return e instanceof Error ? e.message : error.message
      }
      const existente = findSupplierByName(lista, name)
      if (!existente) return error.message
      supplierId = existente.id
    } else {
      return error?.message ?? 'O fornecedor não foi criado'
    }
  }

  const { error } = await client.from('product_suppliers').upsert(
    { product_id: productId, supplier_id: supplierId, url: url === '' ? null : url, updated_at: new Date().toISOString() },
    { onConflict: 'product_id' },
  )
  return error ? error.message : null
}
