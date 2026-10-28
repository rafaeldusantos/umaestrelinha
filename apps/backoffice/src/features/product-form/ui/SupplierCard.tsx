// Feature 80 (FOR-05) — os fornecedores da peça, na aba Preços & variações, logo abaixo do preço:
// custo e fornecedor respondem à mesma pergunta ("de onde vem a peça e quanto custa").
//
// A mesma peça pode vir de mais de um fornecedor: cada linha é um fornecedor e o link da peça nele,
// e "Adicionar fornecedor" abre uma linha nova. A primeira linha mantém os ids de sempre
// (`supplier_name`, `supplier_url`), que são o alvo do foco das recusas.
//
// O selo "Só no painel" existe para a dona nunca ficar em dúvida se a cliente vê isto. É verdade
// por construção: as duas tabelas não têm leitura pública (ver a migration da feature 80).

import { Plus, X } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { SUPPLIER_URL_MAX } from '@estrelinha/core/suppliers'
import { FormCard } from '@/shared/ui'
import { SupplierNameField, type Supplier } from '@/entities/supplier'
import { EMPTY_SUPPLIER_ROW, supplierFieldId, type SupplierDraft } from '../model/persistSupplier'

interface Props {
  rows: SupplierDraft[]
  suppliers: Supplier[]
  onChange: (rows: SupplierDraft[]) => void
}

const SupplierCard = ({ rows, suppliers, onChange }: Props) => {
  const linhas = rows.length > 0 ? rows : [EMPTY_SUPPLIER_ROW]

  const mudar = (index: number, patch: Partial<SupplierDraft>) =>
    onChange(linhas.map((r, i) => (i === index ? { ...r, ...patch } : r)))

  const adicionar = () => {
    onChange([...linhas, { ...EMPTY_SUPPLIER_ROW }])
    const id = supplierFieldId('name', linhas.length)
    requestAnimationFrame(() => document.getElementById(id)?.focus())
  }

  const remover = (index: number) => onChange(linhas.filter((_, i) => i !== index))

  return (
    <FormCard
      title="Fornecedor"
      description="De quem vem a peça. O valor pago a ele vai no Custo, acima."
      action={
        <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          Só no painel
        </span>
      }
    >
      <ul className="space-y-4">
        {linhas.map((linha, i) => {
          const sufixo = i === 0 ? '' : ` ${i + 1}`
          const nomeId = supplierFieldId('name', i)
          const linkId = supplierFieldId('url', i)
          return (
            // O fio entre as linhas só no celular: lá nome e link empilham, e sem ele as linhas se
            // emendam. No computador cada linha já é uma fileira.
            <li key={i} className={`flex items-end gap-2${i > 0 ? ' border-t border-border pt-4 sm:border-t-0 sm:pt-0' : ''}`}>
              <div className="grid min-w-0 flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor={nomeId}>Nome do fornecedor{sufixo}</Label>
                  <SupplierNameField
                    id={nomeId}
                    dataField={nomeId}
                    value={linha.name}
                    onChange={name => mudar(i, { name })}
                    suppliers={suppliers}
                  />
                </div>
                <div className="min-w-0 space-y-1.5">
                  <Label htmlFor={linkId}>Link da peça{sufixo}</Label>
                  {/* `type="text"` + `inputMode="url"`, e não `type="url"`: a recusa é a da tela
                      (FOR-10), com a frase dela — a validação nativa do navegador falaria outra
                      língua e outra regra. */}
                  <Input
                    id={linkId}
                    data-field={linkId}
                    type="text"
                    inputMode="url"
                    autoComplete="off"
                    maxLength={SUPPLIER_URL_MAX}
                    placeholder="https://"
                    value={linha.url}
                    onChange={e => mudar(i, { url: e.target.value })}
                  />
                </div>
              </div>
              {linhas.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label={`Remover o fornecedor ${i + 1}`}
                  onClick={() => remover(i)}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <Button type="button" variant="ghost" size="sm" className="mt-2 -ml-2 h-11 text-primary" onClick={adicionar}>
        <Plus className="h-4 w-4" aria-hidden />
        Adicionar fornecedor
      </Button>
    </FormCard>
  )
}

export default SupplierCard
