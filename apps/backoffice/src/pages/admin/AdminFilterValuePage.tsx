// `/admin/filtros/:groupId/valores/:valueId` — marcar peças num valor (feature 66, `FLT-15`..`FLT-20`).
//
// A tela junta três leituras e não decide nada sozinha: o catálogo de filtros (o nome do valor e as
// contagens), as marcações deste valor, e o catálogo de peças (com tags e categorias). Depois de
// gravar, relê as marcações E o catálogo de filtros — é o que faz a contagem do valor e a do grupo
// mudarem sem recarregar a página (`FLT-20`).

import { Link, useParams } from 'react-router-dom'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { EmptyState, PageHeader, TableSkeleton } from '@/shared/ui'
import { useAdminFilterCatalog, useValueMarks } from '@/entities/filter'
import { useProductMarkingPool } from '@/entities/product'
import { useAdminCategories } from '@/entities/category'
import { BulkAssignPanel } from '@/features/filter-bulk-assign'
import { pecasMarcadasLabel } from '@/features/filter-editor'

const AdminFilterValuePage = () => {
  const { groupId, valueId } = useParams<{ groupId: string; valueId: string }>()
  const catalogo = useAdminFilterCatalog()
  const marcas = useValueMarks(valueId)
  const pool = useProductMarkingPool()
  const { categories } = useAdminCategories()

  const grupo = catalogo.groups.find(g => g.id === groupId)
  const valor = grupo?.values.find(v => v.id === valueId)
  const voltarPara = grupo ? `/admin/filtros/${grupo.id}` : '/admin/filtros'

  if (catalogo.loading || marcas.loading || pool.carregando) return <TableSkeleton rows={8} cols={3} />

  if (!grupo || !valor) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        message="Este valor não existe mais."
        action={
          <Button asChild variant="outline" className="h-11">
            <Link to="/admin/filtros">Voltar aos filtros</Link>
          </Button>
        }
      />
    )
  }

  const depoisDeGravar = async (motivo: string | null) => {
    if (!motivo) await catalogo.fetchCatalog('revalidar')
    return motivo
  }

  const erroDeLeitura = catalogo.error ?? marcas.error ?? pool.erro

  return (
    <div>
      <PageHeader
        icon={SlidersHorizontal}
        title={valor.name}
        subtitle={`Filtros da loja › ${grupo.name} — marque as peças deste valor. Nada muda até você tocar no botão.`}
        actions={
          <>
            <span data-testid="contador-marcadas" className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
              {pecasMarcadasLabel(marcas.marked.size)}
            </span>
            <Button asChild variant="outline" className="h-11">
              <Link to={voltarPara}>Voltar a {grupo.name}</Link>
            </Button>
          </>
        }
      />
      {erroDeLeitura && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {erroDeLeitura}
        </p>
      )}
      <BulkAssignPanel
        valueName={valor.name}
        produtos={pool.produtos}
        categorias={categories}
        marcadas={marcas.marked}
        onMark={async ids => depoisDeGravar(await marcas.mark(ids))}
        onUnmark={async ids => depoisDeGravar(await marcas.unmark(ids))}
      />
    </div>
  )
}

export default AdminFilterValuePage
