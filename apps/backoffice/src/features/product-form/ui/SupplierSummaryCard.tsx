// Feature 80 (FOR-16) — o fornecedor SALVO, na coluna lateral, para a dona abrir a peça de
// qualquer aba do formulário. Lê o snapshot do banco, nunca o rascunho: o card diz o que está
// gravado, e editar o campo sem salvar não o muda.

import { ExternalLink, Truck } from 'lucide-react'
import { supplierLinkLabel } from '@estrelinha/core/suppliers'
import { FormCard } from '@/shared/ui'

interface Props {
  name: string
  url: string
}

const SupplierSummaryCard = ({ name, url }: Props) => {
  if (name.trim() === '') return null
  return (
    <FormCard title="Fornecedor">
      <div className="space-y-2 text-sm">
        <p className="flex items-center gap-2 font-medium text-foreground">
          <Truck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 break-words">{name}</span>
        </p>
        {url.trim() !== '' && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Abrir a peça no fornecedor (${supplierLinkLabel(url)}), em nova aba`}
            className="flex min-h-11 items-center gap-2 break-all text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
            <span className="min-w-0">{supplierLinkLabel(url)}</span>
          </a>
        )}
      </div>
    </FormCard>
  )
}

export default SupplierSummaryCard
