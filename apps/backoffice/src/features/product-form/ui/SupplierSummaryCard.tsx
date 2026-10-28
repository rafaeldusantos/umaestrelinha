// Feature 80 (FOR-16) — os fornecedores SALVOS, na coluna lateral, para a dona abrir a peça de
// qualquer aba do formulário. Lê o snapshot do banco, nunca o rascunho: o card diz o que está
// gravado, e editar o campo sem salvar não o muda.

import { ExternalLink, Truck } from 'lucide-react'
import { supplierLinkLabel } from '@estrelinha/core/suppliers'
import { FormCard } from '@/shared/ui'
import type { SupplierDraft } from '../model/persistSupplier'

interface Props {
  suppliers: SupplierDraft[]
}

const SupplierSummaryCard = ({ suppliers }: Props) => {
  const comNome = suppliers.filter(s => s.name.trim() !== '')
  if (comNome.length === 0) return null
  return (
    <FormCard title={comNome.length > 1 ? 'Fornecedores' : 'Fornecedor'}>
      <ul className="space-y-3 text-sm">
        {comNome.map((s, i) => (
          <li key={`${s.name}-${i}`} className="space-y-1">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Truck className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 break-words">{s.name}</span>
            </p>
            {s.url.trim() !== '' && (
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir a peça no fornecedor (${supplierLinkLabel(s.url)}), em nova aba`}
                className="flex min-h-11 items-center gap-2 break-all text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
              >
                <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0">{supplierLinkLabel(s.url)}</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </FormCard>
  )
}

export default SupplierSummaryCard
