// Feature 80 (FOR-07, FOR-08, FOR-11) — a sugestão do nome do fornecedor.
//
// A comparação é a dobra de busca do painel (`dobrarTexto`, dono único desde a feature 51): sem
// acento e sem diferença de maiúsculas. É a MESMA régua que decide se o nome digitado já existe —
// a sugestão que oferece "Criar" e o save que reaproveita o fornecedor não podem discordar, senão
// a tela ofereceria criar um fornecedor que o save fundiria com outro (ou o contrário).

import { dobrarTexto } from '@/shared/lib/texto'

export interface Supplier {
  id: string
  name: string
}

/** Quantas sugestões a lista mostra. */
export const SUPPLIER_SUGGESTION_LIMIT = 8

const chave = (nome: string): string => dobrarTexto(nome.trim().replace(/\s+/g, ' '))

/** O fornecedor cadastrado com este nome (sem acento e sem maiúsculas), ou `null`. */
export const findSupplierByName = (suppliers: Supplier[], name: string): Supplier | null => {
  const alvo = chave(name)
  if (alvo === '') return null
  return suppliers.find(s => chave(s.name) === alvo) ?? null
}

/**
 * As sugestões para o termo: os nomes que o CONTÊM, os que começam por ele primeiro, depois em
 * ordem alfabética. Termo vazio não sugere nada.
 */
export const suggestSuppliers = (
  suppliers: Supplier[],
  term: string,
  limit = SUPPLIER_SUGGESTION_LIMIT,
): Supplier[] => {
  const alvo = chave(term)
  if (alvo === '') return []
  return suppliers
    .map(s => ({ s, k: chave(s.name) }))
    .filter(({ k }) => k.includes(alvo))
    .sort((a, b) => Number(!a.k.startsWith(alvo)) - Number(!b.k.startsWith(alvo)) || a.k.localeCompare(b.k))
    .slice(0, limit)
    .map(({ s }) => s)
}

/** Oferecer "Criar ‘<nome>’"? Só quando há nome e nenhum fornecedor tem esse nome. */
export const canCreateSupplier = (suppliers: Supplier[], term: string): boolean =>
  chave(term) !== '' && findSupplierByName(suppliers, term) === null
