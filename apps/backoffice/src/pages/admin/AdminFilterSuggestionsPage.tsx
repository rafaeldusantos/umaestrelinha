// `/admin/filtros/sugestoes` — a fila de sugestões de marcação (feature 67, `VFL-18`..`VFL-27`).
//
// A tela junta três leituras e não decide nada sozinha: o catálogo de filtros, o pool da marcação
// (com as variações e as duas marcações) e as recusas. Quem decide o que sugerir é `core`
// (`suggestMarks`), pela `useFila` — a mesma que dá o "Sugestões (N)" de `/admin/filtros`.
//
// Os dois vazios dizem coisas diferentes (`VFL-26`): sem grupo de filtro nenhum não há o que sugerir
// e a saída é criar os grupos; com grupos e nada sobrando, a curadoria está em dia.

import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'
import { EmptyState, PageHeader, TableSkeleton } from '@/shared/ui'
import { useAdminFilterCatalog } from '@/entities/filter'
import { SuggestionQueue, useFila } from '@/features/filter-suggestions'

const AdminFilterSuggestionsPage = () => {
  const catalogo = useAdminFilterCatalog()
  const { fila, produtos, total, carregando, erro } = useFila(catalogo.groups)
  const [params, setParams] = useSearchParams()
  const motivoAberto = fila.find(g => g.key === params.get('motivo')) ?? null

  const voltarParaLista = () =>
    setParams(atual => {
      const p = new URLSearchParams(atual)
      p.delete('motivo')
      return p
    })

  const pendentes = (
    <>
      <span data-testid="total-pendente" className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
        {total === 1 ? '1 pendente' : `${total} pendentes`}
      </span>
      <Button asChild variant="outline" className="h-11">
        <Link to="/admin/filtros">Voltar aos filtros</Link>
      </Button>
    </>
  )

  return (
    <div>
      {motivoAberto && (
        <PageHeader
          className="lg:hidden"
          backTo={voltarParaLista}
          title={
            motivoAberto.source === 'option'
              ? `${motivoAberto.option_name} = “${motivoAberto.evidence}”`
              : motivoAberto.reason
          }
          subtitle="Sugestões"
        />
      )}
      <PageHeader
        className={cn(motivoAberto && 'hidden lg:flex')}
        icon={SlidersHorizontal}
        title="Sugestões"
        subtitle="Filtros da loja › Sugestões — o que o nome, as tags e as opções das peças já dizem. Nada é marcado até você aprovar."
        actions={pendentes}
      />

      {(catalogo.error ?? erro) && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {catalogo.error ?? erro}
        </p>
      )}

      {catalogo.loading || carregando ? (
        <TableSkeleton rows={6} cols={2} />
      ) : catalogo.groups.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          message="Nenhum grupo de filtro ainda."
          hint="As sugestões aparecem depois que você cria os grupos e os valores."
          action={
            <Button asChild className="h-11">
              <Link to="/admin/filtros">Criar os filtros da loja</Link>
            </Button>
          }
        />
      ) : fila.length === 0 ? (
        <EmptyState
          icon={SlidersHorizontal}
          message="Nenhuma sugestão pendente"
          hint="Tudo o que o nome, as tags e as opções das peças sugerem já foi marcado ou recusado."
        />
      ) : (
        <SuggestionQueue
          grupos={catalogo.groups}
          fila={fila}
          produtos={produtos}
          onGravou={() => catalogo.fetchCatalog('revalidar')}
        />
      )}
    </div>
  )
}

export default AdminFilterSuggestionsPage
