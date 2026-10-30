// "Na loja / Fora da loja" na coluna lateral do produto, com o botão que troca o estado NA HORA.
//
// Não é um campo do formulário — é uma AÇÃO, como a coluna Ações da listagem. O switch "Ativo" saiu
// na T25 porque dava ao `is_active` dois donos dentro do mesmo save (o switch e o botão do
// cabeçalho). Desde 2026-10-30 este é o ÚNICO dono: o "Salvar" do cabeçalho grava o `is_active` que
// já está no formulário, sem mudá-lo.

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { toast } from '@estrelinha/ui/hooks/use-toast'
import { setProductActive } from '@/entities/product'

interface Props {
  /** `null` para produto novo ou duplicado: ainda não existe no banco. */
  productId: string | null
  active: boolean
  /** Ativar passa pelo checklist "Pronto para publicar"; desativar, nunca. */
  canActivate: boolean
  /** Edições pendentes não vão junto — a frase avisa. */
  isDirty: boolean
  onChanged: (active: boolean) => void
}

const ProductActiveControl = ({ productId, active, canActivate, isDirty, onChanged }: Props) => {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  if (!productId) {
    return (
      <p className="text-xs text-muted-foreground">
        O produto é criado como rascunho, fora da loja. Depois de salvo, use <strong>Ativar</strong> aqui
        para colocá-lo na loja.
      </p>
    )
  }

  const toggle = async () => {
    const next = !active
    setBusy(true)
    const error = await setProductActive(productId, next, queryClient)
    setBusy(false)
    if (error) {
      toast({ title: next ? 'Não foi possível ativar' : 'Não foi possível desativar', description: error, variant: 'destructive' })
      return
    }
    onChanged(next)
    toast({ title: next ? 'Produto ativado — já aparece na loja' : 'Produto desativado — saiu da loja' })
  }

  const blocked = !active && !canActivate

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${
            active ? 'border-green-200 bg-green-50 text-green-800' : 'border-border bg-muted text-muted-foreground'
          }`}
        >
          {active ? 'Ativo na loja' : 'Desativado'}
        </span>
        <Button
          type="button"
          variant="outline"
          className="h-11"
          disabled={busy || blocked}
          onClick={toggle}
        >
          {active ? <EyeOff className="mr-1.5 h-4 w-4" /> : <Eye className="mr-1.5 h-4 w-4" />}
          {busy ? 'Gravando…' : active ? 'Desativar' : 'Ativar'}
        </Button>
      </div>
      {blocked && (
        <p className="text-xs text-muted-foreground">
          Para ativar, resolva o que falta em <strong>Pronto para publicar</strong>.
        </p>
      )}
      {isDirty && !blocked && (
        <p className="text-xs text-muted-foreground">
          Muda só a visibilidade na loja. As alterações não salvas continuam aqui.
        </p>
      )}
    </div>
  )
}

export default ProductActiveControl
