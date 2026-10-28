// Os fornecedores de um produto, como o embed `product_suppliers(url, position, suppliers(name))`
// os devolve. Um dono só, lido pelo formulário e pela listagem: os dois precisam da mesma ordem.
//
// Desde a migration `20261031120000` a chave do vínculo é o par (produto, fornecedor), então o
// PostgREST devolve ARRAY. O objeto (a forma de antes, um-para-um) continua aceito.

export interface SupplierLink {
  name: string
  url: string
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const supplierLinksOfRow = (row: any): SupplierLink[] => {
  const cru = row?.product_suppliers
  const lista: any[] = Array.isArray(cru) ? cru : cru ? [cru] : []
  return lista
    .map((l, i) => ({ l, ordem: typeof l?.position === 'number' ? l.position : i }))
    .sort((a, b) => a.ordem - b.ordem)
    .map(({ l }) => ({
      name: typeof l?.suppliers?.name === 'string' ? l.suppliers.name : '',
      url: typeof l?.url === 'string' ? l.url : '',
    }))
    .filter(s => s.name !== '')
}
/* eslint-enable @typescript-eslint/no-explicit-any */
