// O bloco "Filtros da loja" do produto — feature 66 (`FLT-11`..`FLT-14`).
//
// Um grupo por linha, na ordem do painel, e os valores como chips de seleção múltipla. O estado é do
// formulário (`filter_value_ids`), e quem grava é o save do produto (`persistProductRelations`), pelo
// diff — esta peça só escolhe.
//
// Grupo desligado APARECE, com o selo "Desligado na loja", e continua editável (`FLT-14`): desligar
// tirou o grupo da loja, não a curadoria — e a dona pode estar marcando as peças antes de ligar.

import { Link } from 'react-router-dom'
import { Check } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'
import { FormCard } from '@/shared/ui'
import { useAdminFilterCatalog } from '@/entities/filter'

interface Props {
  selected: readonly string[] | undefined
  onChange: (ids: string[]) => void
}

const FilterValuesCard = ({ selected, onChange }: Props) => {
  const { groups, loading, error } = useAdminFilterCatalog()
  // Rascunho restaurado de antes da feature 66 não tem o campo: tratado como nada marcado.
  const marcados = new Set(selected ?? [])

  const alternar = (id: string) => {
    const proxima = new Set(marcados)
    if (proxima.has(id)) proxima.delete(id)
    else proxima.add(id)
    onChange([...proxima])
  }

  return (
    <FormCard
      title="Filtros da loja"
      description="Em que filtros esta peça aparece. Salva junto com o produto."
      action={
        groups.length > 0 ? (
          <Link to="/admin/filtros" className="text-xs font-semibold text-primary hover:underline">
            Gerenciar filtros ›
          </Link>
        ) : undefined
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando os filtros…</p>
      ) : error ? (
        <p role="alert" className="text-sm text-destructive">
          Não foi possível carregar os filtros. As marcações desta peça não mudam ao salvar.
        </p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum filtro criado ainda.{' '}
          <Link to="/admin/filtros" className="font-semibold text-primary hover:underline">
            Criar os filtros da loja
          </Link>
        </p>
      ) : (
        <div className="divide-y divide-border">
          {groups.map(grupo => (
            <div
              key={grupo.id}
              role="group"
              aria-label={grupo.name}
              className="grid gap-2 py-3 first:pt-0 last:pb-0 sm:grid-cols-[160px_minmax(0,1fr)]"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{grupo.name}</p>
                {!grupo.is_active && (
                  <span className="mt-1 inline-block rounded-full bg-estrelinha-admin-amber/10 px-2 py-0.5 text-[11px] font-semibold text-estrelinha-admin-amber">
                    Desligado na loja
                  </span>
                )}
              </div>
              {grupo.values.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum valor neste grupo ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {grupo.values.map(valor => {
                    const ativo = marcados.has(valor.id)
                    return (
                      <button
                        key={valor.id}
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => alternar(valor.id)}
                        className={cn(
                          'inline-flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm',
                          ativo
                            ? 'border-primary bg-primary font-medium text-primary-foreground'
                            : 'border-border bg-card text-foreground hover:bg-muted',
                        )}
                      >
                        {ativo && <Check aria-hidden className="h-4 w-4" />}
                        {valor.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </FormCard>
  )
}

export default FilterValuesCard
