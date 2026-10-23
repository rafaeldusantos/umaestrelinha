// Feature 80 (FOR-05) — o fornecedor da peça, na aba Preços & variações, logo abaixo do preço:
// custo e fornecedor respondem à mesma pergunta ("de onde vem a peça e quanto custa").
//
// O selo "Só no painel" existe para a dona nunca ficar em dúvida se a cliente vê isto. É verdade
// por construção: as duas tabelas não têm leitura pública (ver a migration da feature 80).

import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { SUPPLIER_URL_MAX } from '@estrelinha/core/suppliers'
import { FormCard } from '@/shared/ui'
import { SupplierNameField, type Supplier } from '@/entities/supplier'

interface Props {
  name: string
  url: string
  suppliers: Supplier[]
  onNameChange: (name: string) => void
  onUrlChange: (url: string) => void
}

const SupplierCard = ({ name, url, suppliers, onNameChange, onUrlChange }: Props) => (
  <FormCard
    title="Fornecedor"
    description="De quem vem a peça. O valor pago a ele vai no Custo, acima."
    action={
      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
        Só no painel
      </span>
    }
  >
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="supplier_name">Nome do fornecedor</Label>
        <SupplierNameField
          id="supplier_name"
          dataField="supplier_name"
          value={name}
          onChange={onNameChange}
          suppliers={suppliers}
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor="supplier_url">Link da peça</Label>
        {/* `type="text"` + `inputMode="url"`, e não `type="url"`: a recusa é a da tela (FOR-10), com
            a frase dela — a validação nativa do navegador falaria outra língua e outra regra. */}
        <Input
          id="supplier_url"
          data-field="supplier_url"
          type="text"
          inputMode="url"
          autoComplete="off"
          maxLength={SUPPLIER_URL_MAX}
          placeholder="https://"
          value={url}
          onChange={e => onUrlChange(e.target.value)}
        />
      </div>
    </div>
  </FormCard>
)

export default SupplierCard
