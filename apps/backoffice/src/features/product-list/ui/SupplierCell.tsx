// Feature 80 (FOR-17) — a coluna Fornecedor da listagem: o nome e, havendo link, o atalho para a
// peça em nova aba. O ícone é o alvo (44px), e o nome fica fora dele: tocar no nome não abre nada.

import { ExternalLink } from 'lucide-react'
import { supplierLinkLabel } from '@estrelinha/core/suppliers'

interface Props {
  supplier: { name: string; url: string } | null | undefined
}

const SupplierCell = ({ supplier }: Props) => {
  if (!supplier) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-1 text-muted-foreground">
      <span className="truncate">{supplier.name}</span>
      {supplier.url !== '' && (
        <a
          href={supplier.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir a peça em ${supplier.name} (${supplierLinkLabel(supplier.url)}), em nova aba`}
          className="-my-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
        </a>
      )}
    </span>
  )
}

export default SupplierCell
